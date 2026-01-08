import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../src/lib/useI18n';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Supabase client config for direct uploads (read from Vite env)
const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const VITE_SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'PrivacyPictures';
import { useAuth } from '../src/context/AuthContext';
import type { User as AuthUser } from '../src/context/AuthContext';
import { getCached, setCached, DEFAULT_TTL } from '../src/utils/apiCache';
import { publishRateLimit, subscribeRateLimit } from '../src/utils/rateLimitSync';

type Media = { id: string; url: string; thumbnailUrl?: string };
type Comment = { id?: string; authorName: string; authorId?: string; timeAgo: string; text: string };
type Post = { id: string; text?: string; createdAt: string; author?: { name?: string }; authorId?: string; medias?: Media[]; likes?: number; commentsCount?: number; shares?: number; comments?: Comment[] };

import FeedImage from '../src/components/FeedImage';
import ChildSelector from '../components/ChildSelector';
import FeedLightbox from '../src/components/FeedLightbox';
import type { Media as LightboxMedia } from '../src/components/FeedLightbox';

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-white"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4"></circle>
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
    </svg>
  );
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function CommentBox({ postId, onSubmit }: { postId: string; onSubmit: (postId: string, text: string) => Promise<void> }) {
  const [val, setVal] = useState('');
  const { t } = useI18n();

  return (
    <form onSubmit={e => { e.preventDefault(); if (val.trim()) { onSubmit(postId, val.trim()); setVal(''); } }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <input value={val} onChange={e => setVal(e.target.value)} placeholder={t('feed.write_comment', 'Écrire un commentaire...')} className="flex-1 border rounded px-2 py-2 sm:px-3 sm:py-2 text-sm" />
      <button type="submit" className="text-indigo-600 px-3 py-2 text-sm sm:text-base whitespace-nowrap w-full sm:w-auto">{t('feed.send', 'Envoyer')}</button>
    </form>
  );
}

export default function Feed() {
  const { t } = useI18n();
  const [isShortLandscape, setIsShortLandscape] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-height: 600px) and (orientation: landscape)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange); else mql.addListener(onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => { try { if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange); else mql.removeListener(onChange); } catch { /* ignore */ } window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange); };
  }, []);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [availableChildren, setAvailableChildren] = useState<{ id: string; name: string; allowed?: boolean }[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [consentMap, setConsentMap] = useState<Record<string, boolean>>({});
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState<string>('');
  const [errorModalMessage, setErrorModalMessage] = useState<string>('');
  const [lackingNames, setLackingNames] = useState<string[]>([]);
  const [showIdentifyWarning, setShowIdentifyWarning] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [noChildSelected, setNoChildSelected] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [centerFilter, setCenterFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [likers, setLikers] = useState<{ id: string; name: string }[]>([]);
  const pressTimerRef = useRef<number | null>(null);
  const [likesModalPos, setLikesModalPos] = useState<{ top: number; left: number; width: number } | null>(null);
  // filter removed - not used anymore
  const { user } = useAuth();
  // AuthContext's User may include extra runtime fields (id, centerId) returned by the API
  const currentUser = user as (AuthUser & { id?: string; centerId?: string }) | null;
  const [centerName, setCenterName] = useState<string | null>(null);
  const centerRateLimitUntilRef = useRef<number>(0);
  useEffect(() => {
    const unsub = subscribeRateLimit((rec) => {
      if (!rec || !rec.key) return;
      if (rec.key === `/api/centers/${currentUser?.centerId}`) {
        centerRateLimitUntilRef.current = Math.max(centerRateLimitUntilRef.current, rec.until || 0);
      }
    });
    return () => unsub();
  }, [currentUser]);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentsModalPosition, setCommentsModalPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const openCommentsModal = (postId: string) => {
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth < 768;
      
      // Ajuster la largeur selon l'appareil
      const modalWidth = isMobile ? 280 : 400; // Mobile: 280px, Desktop: 400px
      const modalHeight = 500; // Hauteur approximative de la modal
      
      // Calculer la position pour centrer la modal verticalement dans la viewport visible
      const top = (window.innerHeight / 2) - (modalHeight / 2) + window.scrollY;
      
      // Sur mobile : petit décalage vers la gauche, sur desktop : décalage vers la gauche
      const offset = isMobile ? -48 : -250;
      const left = (viewportWidth / 2) - (modalWidth / 2) + offset;
      
      setCommentsModalPosition({ top, left, width: modalWidth });
      setOpenCommentsFor(postId);
    }
  };
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsForPost, setCommentsForPost] = useState<Record<string, Comment[]>>({});

  // palette used for posts (soft pastels similar to children cards)
  const postBgPalette = [
    'bg-[#fff1f0]', // soft red/pink
    'bg-[#f0f9ff]', // soft blue
    'bg-[#fffbeb]', // soft yellow
    'bg-[#f0fff4]', // soft green
    'bg-[#fff7ed]', // soft orange
  ];

  async function loadComments(postId: string) {
    setCommentsLoading(true);
    try {
      const res = await fetchWithRefresh(`api/feed/${postId}/comments`);
      if (!res.ok) {
        setCommentsForPost(prev => ({ ...prev, [postId]: [] }));
        return;
      }
      const body = await res.json();
  const mapped: Comment[] = (body.comments || []).map((c: { id: string; authorName: string; authorId?: string; createdAt: string; text: string }) => ({ id: c.id, authorName: c.authorName, authorId: c.authorId, timeAgo: timeAgo(c.createdAt), text: c.text }));
      setCommentsForPost(prev => ({ ...prev, [postId]: mapped }));
    } catch (e) {
      const err = e as unknown;
      if (import.meta.env.DEV) console.error('Failed to load comments', err);
      else console.error('Failed to load comments', err instanceof Error ? err.message : String(err));
      setCommentsForPost(prev => ({ ...prev, [postId]: [] }));
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    async function loadPostsWithCache() {
      const cacheKey = `/api/feed${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
      const cached = getCached<{ posts: Post[] }>(cacheKey);
      if (cached) {
        setPosts(cached.posts || []);
        return;
      }
      try {
        const url = `/api/feed${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
        const res = await fetchWithRefresh(url);
        if (!res || !res.ok) return;
        const body = await res.json();
        setPosts(body.posts || []);
        setCached(cacheKey, { posts: body.posts || [] }, DEFAULT_TTL);
      } catch (e) {
        if (import.meta.env.DEV) console.error('Failed to load feed (cached)', e);
      }
    }

    loadPostsWithCache();
  }, [centerFilter]);

  // Reload when center filter changes
  useEffect(() => {
    const load = async () => {
      const cacheKey = `/api/feed${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
      try {
        const url = `/api/feed${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
        const res = await fetchWithRefresh(url);
        if (!res || !res.ok) return;
        const body = await res.json();
        setPosts(body.posts || []);
        setCached(cacheKey, { posts: body.posts || [] }, DEFAULT_TTL);
      } catch (e) {
        if (import.meta.env.DEV) console.error('Failed to load feed for center filter', e);
      }
    };
    load();
  }, [centerFilter]);

  // load center name when AuthContext user is available ( mirrors Sidebar behaviour )
  useEffect(() => {
    let mounted = true;
    async function loadCenter() {
      try {
        const centerId = currentUser?.centerId;
        if (centerId) {
          // Respect client-side rate-limit suppression if set
          const now = Date.now();
          if (centerRateLimitUntilRef.current > now) {
            if (import.meta.env.DEV) console.warn('Skipping centers fetch due to client rate-limit until', new Date(centerRateLimitUntilRef.current).toISOString());
            return;
          }

          const cacheKey = `/api/centers/${centerId}`;
          const cached = getCached<{ name?: string }>(cacheKey);
          if (cached) {
            setCenterName(cached.name || null);
            return;
          }

          const res = await fetch(`api/centers/${centerId}`, { credentials: 'include' });
          if (!mounted) return;
          if (res.status === 429) {
            // parse Retry-After and set suppression window (and publish to other tabs)
            const ra = res.headers.get('Retry-After');
            const retry = ra ? parseInt(ra, 10) : NaN;
            const waitMs = !Number.isNaN(retry) ? retry * 1000 : 10_000;
            centerRateLimitUntilRef.current = Math.max(centerRateLimitUntilRef.current, Date.now() + waitMs);
            publishRateLimit(`/api/centers/${centerId}`, centerRateLimitUntilRef.current);
            if (import.meta.env.DEV) console.warn('Centers request rate-limited, suppressing until', new Date(centerRateLimitUntilRef.current).toISOString());
            return;
          }
          if (res.ok) {
            const data = await res.json();
            setCenterName(data.name || null);
            setCached(cacheKey, { name: data.name || null }, DEFAULT_TTL);
            return;
          }
        }
      }
      catch {
        // ignore
      }
      if (mounted) setCenterName(null);
    }
    loadCenter();
    return () => { mounted = false; };
  }, [currentUser]);

  // If super-admin, load centers for filter
  useEffect(() => {
    let mounted = true;
    const loadCenters = async () => {
      if (!currentUser || currentUser.role !== 'super-admin') return;
      try {
        const res = await fetchWithRefresh('/api/centers', { credentials: 'include' });
        if (!res || !res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data)) setCenters(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      } catch (e) {
        if (import.meta.env.DEV) console.error('Failed to load centers for filter', e);
      }
    };
    loadCenters();
    return () => { mounted = false; };
  }, [currentUser]);

  useEffect(() => {
    const p = files.map(f => URL.createObjectURL(f));
  setPreviews(p);
  if (files.length === 0) setShowIdentifyWarning(false);
    return () => p.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  // When files are attached, fetch list of children available to the user and consent summary for each
  useEffect(() => {
    let mounted = true;
    async function loadChildrenAndConsents() {
      try {
        if (files.length === 0) {
          setAvailableChildren([]);
          setSelectedChildIds([]);
          setNoChildSelected(false);
          setConsentMap({});
          return;
        }
        const res = await fetchWithRefresh('api/children', { credentials: 'include' });
        if (!res.ok) return;
        const children = await res.json();
  type ChildShort = { id: string; name: string };
  const mapped: ChildShort[] = Array.isArray(children) ? (children as ChildShort[]).map((c) => ({ id: c.id, name: c.name })) : [];
  if (!mounted) return;
  setAvailableChildren(mapped);
  // initialize consentMap with defaults (false) so UI can render immediately without a separate loading message
  const initMap: Record<string, boolean> = {};
  mapped.forEach(c => { initMap[c.id] = false; });
  setConsentMap(initMap);

  // fetch consent summary for all children in a single batch request
        try {
          const ids = mapped.map(c => c.id);
          if (ids.length > 0) {
            const r = await fetchWithRefresh('api/children/batch/photo-consent-summary', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids })
            });
            if (r.ok) {
              const body = await r.json();
              const cm: Record<string, boolean> = {};
              ids.forEach(id => { cm[id] = !!(body && body[id] && body[id].allowed); });
              setConsentMap(cm);
            }
          }
        } catch (e) {
          console.error('Failed to fetch batch photo consents', e);
        }
      } catch (e) {
        const err = e as unknown;
        if (import.meta.env.DEV) console.error('Failed to load children/consents', err);
        else console.error('Failed to load children/consents', err instanceof Error ? err.message : String(err));
      }
    }
    loadChildrenAndConsents();
    return () => { mounted = false; };
  }, [files]);

  

  const toggleLike = useCallback(async (postId: string) => {
    try {
      const res = await fetchWithRefresh(`api/feed/${postId}/like`, { method: 'POST' });
      if (!res.ok) return;
      const body = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + (body.liked ? 1 : -1) } : p));
    } catch (e) {
      const err = e as unknown;
      if (import.meta.env.DEV) console.error('Like failed', err);
      else console.error('Like failed', err instanceof Error ? err.message : String(err));
    }
  }, [setPosts]);

  const loadLikers = useCallback(async (postId: string) => {
    try {
      const res = await fetchWithRefresh(`api/feed/${postId}/likes`);
      if (!res.ok) return setLikers([]);
      const body = await res.json();
      setLikers(body.users || []);
    } catch (e) {
      const err = e as unknown;
      if (import.meta.env.DEV) console.error('Failed to load likers', err);
      else console.error('Failed to load likers', err instanceof Error ? err.message : String(err));
      setLikers([]);
    }
  }, [setLikers]);

  const startPress = useCallback((postId: string) => {
    // start long-press timer (600ms)
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    pressTimerRef.current = window.setTimeout(async () => {
      await loadLikers(postId);
      // compute modal position like comments modal
      try {
        const el = document.getElementById(`post-${postId}`);
        if (el) {
          const viewportWidth = window.innerWidth;
          const isMobile = viewportWidth < 768;
          
          // Ajuster la largeur selon l'appareil (comme pour les commentaires)
          const modalWidth = isMobile ? 280 : 400;
          const modalHeight = 500; // Hauteur approximative de la modal
          
          // Calculer la position pour centrer la modal verticalement dans la viewport visible
          const top = (window.innerHeight / 2) - (modalHeight / 2) + window.scrollY;
          
          // Sur mobile : petit décalage vers la gauche, sur desktop : décalage vers la gauche
          const offset = isMobile ? -48 : -300;
          const left = (viewportWidth / 2) - (modalWidth / 2) + offset;
          
          setLikesModalPos({ top, left, width: modalWidth });
        } else {
          setLikesModalPos(null);
        }
      } catch {
        setLikesModalPos(null);
      }
      setLikesModalOpen(true);
      pressTimerRef.current = null;
    }, 600);
  }, [loadLikers, setLikesModalPos, setLikesModalOpen]);

  const endPressShort = useCallback((postId: string) => {
    // if timer still exists, treat as short press
    if (pressTimerRef.current) {
  clearTimeout(pressTimerRef.current);
  pressTimerRef.current = null;
      // short press: toggle like
      toggleLike(postId);
    }
  }, [toggleLike]);

  const cancelPress = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // Update modal positions when window resizes
  useEffect(() => {
    const handleResize = () => {
      // Force immediate recalculation without debounce for better responsiveness
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const isMobile = viewportWidth < 768;

      // Use same dimensions as initial calculation
      const modalWidth = isMobile ? 280 : 400;
      const modalHeight = 500;

      // Ensure modal stays within viewport bounds
      const maxLeft = viewportWidth - modalWidth - 20; // 20px margin
      const minLeft = 20; // 20px margin

      // Recalculate comments modal position if open
      if (openCommentsFor) {
        const centerY = viewportHeight / 2;
        const centerX = viewportWidth / 2;

        const top = centerY - (modalHeight / 2) + currentScrollY;
        let left = centerX - (modalWidth / 2) + (isMobile ? -48 : -300);

        // Constrain to viewport
        left = Math.max(minLeft, Math.min(maxLeft, left));

        setCommentsModalPosition({ top, left, width: modalWidth });
      }

      // Recalculate likes modal position if open
      if (likesModalOpen && likesModalPos) {
        const centerY = viewportHeight / 2;
        const centerX = viewportWidth / 2;

        const top = centerY - (modalHeight / 2) + currentScrollY;
        let left = centerX - (modalWidth / 2) + (isMobile ? -48 : -300);

        // Constrain to viewport
        left = Math.max(minLeft, Math.min(maxLeft, left));

        setLikesModalPos({ top, left, width: modalWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    // Also listen for scroll events to keep modals positioned correctly
    const handleScroll = () => {
      if (openCommentsFor || (likesModalOpen && likesModalPos)) {
        handleResize();
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Global event listeners for like button interactions (especially for mobile simulator)
    const handleGlobalPointerDown = (e: Event) => {
      const target = e.target as HTMLElement;
      const postId = target.closest('[data-post-id]')?.getAttribute('data-post-id');
      if (postId) {
        startPress(postId);
      }
    };

    const handleGlobalPointerUp = (e: Event) => {
      const target = e.target as HTMLElement;
      const postId = target.closest('[data-post-id]')?.getAttribute('data-post-id');
      if (postId) {
        endPressShort(postId);
      }
    };

    // Add global listeners with capture phase to ensure they work in mobile simulator
    document.addEventListener('mousedown', handleGlobalPointerDown, true);
    document.addEventListener('mouseup', handleGlobalPointerUp, true);
    document.addEventListener('touchstart', handleGlobalPointerDown, { capture: true, passive: false });
    document.addEventListener('touchend', handleGlobalPointerUp, { capture: true, passive: false });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleGlobalPointerDown, true);
      document.removeEventListener('mouseup', handleGlobalPointerUp, true);
      document.removeEventListener('touchstart', handleGlobalPointerDown, true);
      document.removeEventListener('touchend', handleGlobalPointerUp, true);
    };
  }, [openCommentsFor, likesModalOpen, likesModalPos, startPress, endPressShort]);

  async function addComment(postId: string, text: string) {
    try {
      const res = await fetchWithRefresh(`api/feed/${postId}/comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!res.ok) {
  const b = await res.json().catch(() => ({}));
  const serverMsg = (b && b.message) ? String(b.message) : '';
  showError('Impossible d\'envoyer le commentaire', mapServerMessage(serverMsg, 400));
        return;
      }
      const created = await res.json();
  const newComment = { id: created.id, authorName: created.authorName, authorId: created.authorId, timeAgo: timeAgo(created.createdAt), text: created.text };
  setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1, comments: p.comments ? [ newComment, ...p.comments ] : [newComment] } : p));
  // also update commentsForPost if modal is open for this post
  setCommentsForPost(prev => ({ ...prev, [postId]: prev[postId] ? [newComment, ...prev[postId]] : [newComment] }));
    } catch (e) {
      console.error('Add comment failed', e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text && files.length === 0) return;
    setLoading(true);
    // show upload indicator when files are present
    if (files.length > 0) setUploading(true);
    try {
      // Require either 'Pas d'enfant' or at least one tagged child when images attached
      if (!noChildSelected && selectedChildIds.length === 0 && files.length > 0) {
        // show a short inline warning asking the user to identify children
        setShowIdentifyWarning(true);
        setLoading(false);
        return;
      }

      // Prevent publish when any selected child lacks consent and show modal
      const lacking = selectedChildIds.filter(id => !consentMap[id]);
      if (lacking.length > 0) {
        const names = availableChildren.filter(c => lacking.includes(c.id)).map(c => c.name);
        setLackingNames(names);
        setShowConsentModal(true);
        setLoading(false);
        return;
      }

      // Validate files client-side before attempting upload (prevent proxy/network errors)
      if (files.length > 0) {
        const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
        const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
        const PER_FILE_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB
        const TOTAL_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB

        const formatBytes = (bytes: number) => {
          if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
          return `${Math.round(bytes / (1024 * 1024))} MB`;
        };

        let totalSize = 0;
        for (const f of files) {
          totalSize += f.size;
          const isImage = f.type.startsWith('image/');
          const isVideo = f.type.startsWith('video/');
          if (!isImage && !isVideo) return showError('Fichier non supporté', `Le fichier ${f.name} n'est pas un image/vidéo supporté.`);
          if (isVideo && !ALLOWED_VIDEO.includes(f.type)) return showError('Format vidéo non supporté', `Le format de ${f.name} (${f.type}) n'est pas pris en charge. Formats acceptés: mp4, webm, mov.`);
          if (isImage && !ALLOWED_IMAGE.includes(f.type) && !f.type.startsWith('image/')) return showError('Format image non supporté', `Le format de ${f.name} (${f.type}) n'est pas pris en charge.`);
          if (f.size > PER_FILE_LIMIT) return showError('Fichier trop volumineux', `Le fichier ${f.name} est trop volumineux (${formatBytes(f.size)}). Taille max par fichier: ${formatBytes(PER_FILE_LIMIT)}.`);
        }
  if (totalSize > TOTAL_LIMIT) return showError('Taille totale trop importante', `La taille totale des fichiers (${formatBytes(totalSize)}) dépasse la limite de ${formatBytes(TOTAL_LIMIT)}.`);
      }

  // If files are large or videos, use direct-to-Supabase upload flow to avoid proxy limits.
  const shouldDirect = files.some(f => f.size > 8 * 1024 * 1024 || f.type.startsWith('video/'));
  if (files.length > 0 && shouldDirect && VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY) {
        // 1) create post without files
  const createFd = new FormData();
  createFd.append('text', text || '');
  const createRes = await fetchWithRefresh('api/feed', { method: 'POST', body: createFd });
        if (!createRes.ok) {
          const body = await createRes.json().catch(() => ({}));
          return showError('Échec de la publication', mapServerMessage(body.message || '', createRes.status));
        }
        const created = await createRes.json();
        // push created post immediately (will be updated as media finalize)
        setPosts(prev => [created, ...prev]);

        // init supabase client with anon key for direct browser upload
        const supabaseClient = createSupabaseClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

        // For each file: sign -> upload -> finalize
        for (const f of files) {
          try {
            const signRes = await fetchWithRefresh('api/uploads/supabase/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: f.name, contentType: f.type, prefix: 'feed' }) });
            if (!signRes.ok) {
              const b = await signRes.json().catch(() => ({}));
              console.error('Sign failed', b);
              continue;
            }
            const signBody = await signRes.json();
            const storagePath = signBody.storagePath;
            const bucket = signBody.bucket || VITE_SUPABASE_BUCKET;

            const { error: upErr } = await supabaseClient.storage.from(bucket).upload(storagePath, f, { contentType: f.type, upsert: false });
            if (upErr) {
              console.error('Direct upload error', upErr);
              continue;
            }

            // finalize so backend can create DB rows
            const finRes = await fetchWithRefresh('api/uploads/supabase/finalize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storagePath, postId: created.id, size: f.size, originalName: f.name, taggedChildIds: selectedChildIds || [], noChildSelected: !!noChildSelected }) });
            if (!finRes.ok) {
              const b = await finRes.json().catch(() => ({}));
              const serverMsg = (b && b.message) ? String(b.message) : '';
              // Surface error to the user and continue with other files
              showError('Échec de la finalisation', mapServerMessage(serverMsg, finRes.status));
              continue;
            }
            const finBody = await finRes.json();
            const newMedias = finBody.medias || [];
            // update UI post with returned medias
            setPosts(prev => prev.map(p => p.id === created.id ? { ...p, medias: (p.medias || []).concat(newMedias) } : p));
          } catch (e) {
            console.error('Direct upload loop error', e);
            continue;
          }
        }

        // finished
        setText(''); setFiles([]); setShowIdentifyWarning(false);
        return;
      }

      // fallback: server upload (multipart)
      const fd = new FormData();
      fd.append('text', text);
      for (const f of files) fd.append('images', f, f.name);
      if (selectedChildIds && selectedChildIds.length) {
        for (const cid of selectedChildIds) fd.append('taggedChildIds[]', cid);
      }
      // include explicit flag when user selected 'no child' so backend can validate
      if (noChildSelected) fd.append('noChildSelected', '1');

      const res = await fetchWithRefresh('api/feed', { method: 'POST', body: fd });
      if (res.ok) {
        const created = await res.json();
        setPosts(prev => [created, ...prev]);
        setText(''); setFiles([]); setShowIdentifyWarning(false);
      } else {
        const body = await res.json().catch(() => ({}));
        const serverMsg = (body && body.message) ? String(body.message) : '';
        showError('Échec de la publication', mapServerMessage(serverMsg, res.status));
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau', 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }

  function showError(title: string, message: string) {
    setErrorModalTitle(title);
    setErrorModalMessage(message);
    setErrorModalOpen(true);
  }

  function mapServerMessage(raw: string, status: number) {
    const s = (raw || '').toLowerCase();
    // Map common backend messages to friendly French messages
    if (!raw) {
      if (status === 401) return "Vous devez être connecté pour effectuer cette action.";
      if (status === 403) return "Vous n'êtes pas autorisé à effectuer cette action.";
      if (status === 503) return "Le service de stockage est temporairement indisponible. Réessayez plus tard.";
      if (status === 400) return "Requête invalide. Vérifiez vos données et réessayez.";
      return "Une erreur est survenue lors de la publication. Réessayez.";
    }
    if (s.includes('storage backend not configured') || s.includes('supabase not configured') || s.includes('storage backend not configured on server')) return 'Le stockage des images n\'est pas configuré sur le serveur. Contactez l\'administrateur.';
    if (s.includes('image processing not available') || s.includes('sharp not available')) return 'Le serveur ne peut pas traiter les images pour le moment (dépendance manquante). Réessayez plus tard.';
    if (s.includes('too many files') || s.includes('trop de fichiers')) return 'Trop d\'images : le maximum est de 6.';
    if (s.includes('photo consent absent') || s.includes('consent')) return 'Le consentement photo est manquant pour un ou plusieurs enfants identifiés.';
    if (s.includes('failed to upload any media')) return 'Échec du chargement des images. Aucun fichier n\'a été sauvegardé.';
    if (s.includes('forbidden')) return 'Vous n\'avez pas la permission d\'effectuer cette action.';
    if (s.includes('unauthorized') || status === 401) return 'Vous devez vous connecter pour publier.';
    if (status >= 500) return 'Erreur serveur lors de la publication. Réessayez plus tard.';
    // default fallback
    return raw;
  }

  return (
    <div className={`relative z-0 min-h-screen bg-[#fcfcff] p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full max-w-full overflow-x-hidden box-border`}>
      <div className="max-w-7xl mx-auto w-full max-w-full px-2 sm:px-4 md:px-6 overflow-x-hidden box-border children-responsive-row">
          <div className="max-w-4xl mx-auto w-full">
            <div className="mb-6 p-0">
              <div className="bg-white/30 backdrop-blur-sm rounded-3xl p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 w-full">
          <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight" style={{ color: '#0b5566' }}>{t('page.feed')}</h1>
              <div className="text-base md:text-lg font-medium mb-4 md:mb-6" style={{ color: '#08323a' }}>{centerName ? `• ${centerName}` : t('feed.center_news')}</div>
            </div>
        </div>

        {currentUser && currentUser.role === 'super-admin' && (
          <div className="mb-4">
            <label className="text-sm font-medium mr-2">Filtrer par centre:</label>
            <select value={centerFilter || ''} onChange={e => setCenterFilter(e.target.value || null)} className="border rounded px-2 py-1">
              <option value="">Tous les centres</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Composer */}
  <form onSubmit={handleSubmit} className="bg-[#f0f9ff] rounded-2xl shadow p-3 md:p-6 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="text-xs sm:text-sm font-semibold text-gray-700">{currentUser?.name || 'Utilisateur'}</div>
              <div className="text-xs text-gray-400 mb-2">{centerName ? `• ${centerName}` : ''}</div>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('feed.composer_placeholder')} className="w-full border rounded p-2 sm:p-3 bg-gray-50 min-h-[60px] sm:min-h-[80px] text-sm sm:text-base" />
              <div className="flex flex-col sm:flex-row items-center justify-between mt-3 gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 w-full sm:w-auto">
                  {/* Camera capture input (opens device camera on supported mobile) */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        if (uploading) return;
                        const input = e.currentTarget as HTMLInputElement;
                        const newFiles = Array.from(input.files || []);
                        if (newFiles.length === 0) return;
                        setFiles(prev => [...prev, ...newFiles]);
                        // reset so the same file can be selected/captured again
                        input.value = '';
                      }}
                    />
                    <span className="inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">📷 {uploading ? <Spinner size={18} /> : t('feed.photo')}</span>
                  </label>
                  {/* Gallery input (choose existing images) */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={e => {
                        if (uploading) return;
                        const input = e.currentTarget as HTMLInputElement;
                        const newFiles = Array.from(input.files || []);
                        if (newFiles.length === 0) return;
                        setFiles(prev => [...prev, ...newFiles]);
                        input.value = '';
                      }}
                    />
                    <span className="inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs sm:text-sm">🖼 {uploading ? <Spinner size={18} /> : t('feed.gallery')}</span>
                  </label>
                  <span className="text-xs text-gray-400">{files.length === 0 ? t('feed.no_images') : `${files.length} ${t('feed.images')}`}</span>
                </div>
                {/* Tagging UI: responsive — dropdown on desktop, full-screen modal on mobile */}
                <div className="w-full sm:w-auto mt-2 flex justify-center sm:justify-start">
                  {files.length > 0 && (
                    <div className="relative w-full sm:w-auto">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => setShowTagMenu(prev => !prev)}
                          aria-haspopup="true"
                          aria-expanded={showTagMenu}
                          aria-label={t('feed.identify')}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-3 sm:py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 text-sm w-full sm:w-auto shadow-sm"
                        >
                          {t('feed.identify')}
                          {selectedChildIds.length > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">{selectedChildIds.length}</span>
                          )}
                        </button>
                      </div>

                      {/* Reusable child selector (desktop dropdown + mobile modal) */}
                      <ChildSelector
                        open={showTagMenu}
                        onClose={() => setShowTagMenu(false)}
                        availableChildren={availableChildren}
                        selectedChildIds={selectedChildIds}
                        setSelectedChildIds={setSelectedChildIds}
                        noChildSelected={noChildSelected}
                        setNoChildSelected={setNoChildSelected}
                        consentMap={consentMap}
                        title={t('feed.tag_children')}
                        confirmLabel={t('common.confirm')}
                      />
                    </div>
                  )}
                </div>
                <button type="submit" disabled={loading || uploading || (selectedChildIds.length > 0 && selectedChildIds.some(id => !consentMap[id]))} className="bg-indigo-600 text-white px-4 py-2 rounded-full w-full sm:w-auto max-w-full flex items-center justify-center gap-2">{(loading || uploading) ? <><Spinner size={20} /> <span>Envoi...</span></> : 'Publier'}</button>
              </div>
              {/* If the user tried to publish without tagging children when required, show an inline warning */}
              {showIdentifyWarning && (
                <div className="mt-2 text-sm text-red-600 text-center sm:text-left" role="alert" aria-live="assertive">Veuillez identifier les enfants.</div>
              )}
              {/* If any selected child lacks consent, show an explanatory message and disable publish */}
              {selectedChildIds.length > 0 && Object.keys(consentMap).length > 0 && (
                (() => {
                  const lacking = selectedChildIds.filter(id => !consentMap[id]);
                  if (lacking.length === 0) return null;
                  const names = availableChildren.filter(c => lacking.includes(c.id)).map(c => c.name).join(', ');
                  return <div className="mt-2 text-sm text-red-600">Impossible de publier: autorisation photo manquante pour {names}.</div>;
                })()
              )}
              {/* Consent modal */}
              {showConsentModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 ring-1 ring-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">🚫</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">Autorisation photo manquante</h3>
                        <p className="mt-2 text-sm text-gray-600">Vous n'avez pas l'autorisation des parents pour publier des photos des enfants suivants :</p>
                        <ul className="mt-3 list-disc list-inside text-sm text-gray-800">
                          {lackingNames.map((n) => <li key={n}>{n}</li>)}
                        </ul>
                        <p className="mt-3 text-sm text-gray-600">Veuillez retirer ces enfants de la sélection ou contacter les parents pour obtenir leur autorisation.</p>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button onClick={() => setShowConsentModal(false)} className="px-4 py-2 bg-gray-100 rounded-md mr-2">Fermer</button>
                      <button onClick={() => { setShowConsentModal(false); }} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Retour</button>
                    </div>
                  </div>
                </div>
              )}
              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {previews.map((p, i) => (
                        <div key={i} className="w-full h-16 sm:h-20 md:h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center relative">
                          {/* determine if this preview is video by checking files[i].type */}
                          {files[i] && files[i].type && files[i].type.startsWith('video/') ? (
                            <video src={p} className="w-full h-full object-contain" controls />
                          ) : (
                            <img src={p} className="w-full h-full object-contain" />
                          )}
                          <button
                            type="button"
                            aria-label={`Retirer le fichier ${i + 1}`}
                            onClick={() => {
                              // remove file at index i
                              setFiles(prev => {
                                const next = prev.slice();
                                next.splice(i, 1);
                                return next;
                              });
                              setPreviews(prev => {
                                const next = prev.slice();
                                // revoke URL to free memory
                                try { URL.revokeObjectURL(next[i]); } catch { /* ignore */ }
                                next.splice(i, 1);
                                return next;
                              });
                            }}
                            className="absolute top-1 right-1 bg-white/90 text-red-600 rounded-full p-1 shadow hover:bg-white"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Posts list */}
        <div className="space-y-6">
          {posts.map((post, idx) => (
            <article id={`post-${post.id}`} key={post.id} className={`${postBgPalette[idx % postBgPalette.length]} rounded-2xl border border-gray-100 shadow-sm p-3 md:p-6 w-full mx-auto`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4 items-center text-center sm:text-left">
                <div className="flex-1">
                  <PostItem post={post} bgClass={postBgPalette[idx % postBgPalette.length]} currentUser={currentUser} onUpdatePost={async (id, newText) => {
                      setPosts(prev => prev.map(p => p.id === id ? { ...p, text: newText } : p));
                    }} onDeletePost={async (id) => {
                      setPosts(prev => prev.filter(p => p.id !== id));
                    }} onMediasChange={(id, medias) => {
                      setPosts(prev => prev.map(p => p.id === id ? { ...p, medias } : p));
                    }} />

                  {/* media rendering moved inside PostItem to allow inline edit/delete */}

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center items-center justify-center text-sm text-gray-500 gap-2">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <button
                        data-post-id={post.id}
                        onPointerDown={() => startPress(post.id)}
                        onPointerUp={() => endPressShort(post.id)}
                        onPointerLeave={() => cancelPress()}
                        onContextMenu={(e) => { e.preventDefault(); }}
                        className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base select-none"
                      >
                        ❤️ <span>{post.likes ?? 0}</span>
                      </button>
                      <button onClick={async () => { openCommentsModal(post.id); await loadComments(post.id); }} className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">💬 <span>{post.commentsCount ?? 0}</span></button>
                    </div>
                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                      <CommentBox postId={post.id} onSubmit={addComment} />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {likesModalOpen && (
            <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm p-4">
              {/* position the modal element absolutely at the computed coords; if no coords, center it */}
              <div 
                className="bg-white rounded-xl shadow-xl max-h-[90vh] overflow-hidden ring-1 ring-indigo-50"
                style={likesModalPos ? { 
                  position: 'absolute', 
                  top: likesModalPos.top, 
                  left: likesModalPos.left, 
                  width: likesModalPos.width,
                  transform: 'none'
                } : { 
                  position: 'absolute',
                  left: '50%', 
                  top: '50%', 
                  transform: 'translate(-50%, -50%)' 
                }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-700">Personnes qui ont aimé</h3>
                    <div className="text-sm text-indigo-600">{likers.length} personne{likers.length > 1 ? 's' : ''}</div>
                  </div>
                  <button onClick={() => { setLikesModalOpen(false); setLikers([]); setLikesModalPos(null); }} aria-label="Fermer" className="text-indigo-600 hover:text-indigo-800 rounded-md p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 8.586L15.95 2.636a1 1 0 111.414 1.414L11.414 10l5.95 5.95a1 1 0 01-1.414 1.414L10 11.414l-5.95 5.95A1 1 0 012.636 15.95L8.586 10 2.636 4.05A1 1 0 014.05 2.636L10 8.586z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 overflow-auto max-h-[80vh]">
                  {likers.length === 0 ? <div className="text-center text-gray-500 py-8">Aucun like trouvé</div> : (
                    <ul className="space-y-2">
                      {likers.map(u => <li key={u.id} className="text-sm text-gray-800">{u.name}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
  {openCommentsFor && (
          <CommentsModal
            position={commentsModalPosition}
            onClose={() => { setOpenCommentsFor(null); setCommentsModalPosition(null); }}
            comments={commentsForPost[openCommentsFor] || []}
            loading={commentsLoading}
            currentUser={currentUser}
            onUpdateComment={async (commentId: string, newText: string) => {
              setCommentsForPost((prev: Record<string, Comment[]>) => ({ ...prev, [openCommentsFor as string]: prev[openCommentsFor as string]?.map(cm => cm.id === commentId ? { ...cm, text: newText } : cm) || [] }));
              setPosts((prev: Post[]) => prev.map(p => p.id === openCommentsFor ? { ...p, comments: p.comments ? p.comments.map(cm => cm.id === commentId ? { ...cm, text: newText } : cm) : p.comments } : p));
            }}
            onDeleteComment={async (commentId: string) => {
              setCommentsForPost((prev: Record<string, Comment[]>) => ({ ...prev, [openCommentsFor as string]: prev[openCommentsFor as string]?.filter(cm => cm.id !== commentId) || [] }));
              setPosts((prev: Post[]) => prev.map(p => p.id === openCommentsFor ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1), comments: p.comments ? p.comments.filter(cm => cm.id !== commentId) : p.comments } : p));
            }}
          />
        )}
        </div>
              </div>
            </div>
          </div>

          {/* Error modal (shows friendly messages for publish/upload failures) */}
          {errorModalOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setErrorModalOpen(false)} />
              <div role="dialog" aria-modal="true" className="bg-white rounded-lg shadow-xl p-6 z-70 max-w-lg w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900">{errorModalTitle || 'Erreur'}</h3>
                <div className="mt-3 text-sm text-gray-700 whitespace-pre-line">{errorModalMessage}</div>
                <div className="mt-4 flex justify-end">
                  <button onClick={() => setErrorModalOpen(false)} className="px-4 py-2 bg-indigo-600 text-white rounded">OK</button>
                </div>
              </div>
            </div>
          )}

    </div>
  );
}

function CommentsModal({ onClose, comments, loading, currentUser, onUpdateComment, onDeleteComment, position }: { onClose: () => void; comments: Comment[]; loading?: boolean; currentUser: (AuthUser & { id?: string; role?: string }) | null; onUpdateComment: (commentId: string, newText: string) => Promise<void>; onDeleteComment: (commentId: string) => Promise<void>; position?: { top: number; left: number; width: number } | null; }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div 
        className="bg-white rounded-xl shadow-xl max-h-[90vh] overflow-hidden ring-1 ring-indigo-50"
        style={position ? { 
          position: 'absolute', 
          top: position.top, 
          left: position.left, 
          width: position.width,
          transform: 'none'
        } : { 
          position: 'absolute',
          left: '50%', 
          top: '50%', 
          transform: 'translate(-50%, -50%)' 
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-indigo-700">Commentaires</h3>
            <div className="text-sm text-indigo-600">{comments.length} commentaire{comments.length > 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-indigo-600 hover:text-indigo-800 rounded-md p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 8.586L15.95 2.636a1 1 0 111.414 1.414L11.414 10l5.95 5.95a1 1 0 01-1.414 1.414L10 11.414l-5.95 5.95A1 1 0 012.636 15.95L8.586 10 2.636 4.05A1 1 0 014.05 2.636L10 8.586z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">Chargement des commentaires…</div>
        ) : (
          <div className="p-4 overflow-auto max-h-[80vh]">
            {comments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Aucun commentaire pour l'instant</div>
            ) : (
              <div className="space-y-4">
                {comments.map(c => (
                  <CommentItem key={c.id || (c.authorName + c.timeAgo + c.text)} comment={c} currentUser={currentUser} onUpdate={onUpdateComment} onDelete={onDeleteComment} />
                ))}
              </div>
            )}
          </div>
        )}
        {/* Footer area - close button duplicated for easier UX on mobile */}
        <div className="px-5 py-3 border-t text-right bg-white">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-full shadow hover:bg-indigo-700">Fermer</button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, currentUser, onUpdate, onDelete }: { comment: Comment; currentUser: (AuthUser & { id?: string; role?: string }) | null; onUpdate: (commentId: string, newText: string) => Promise<void>; onDelete: (commentId: string) => Promise<void>; }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(comment.text);

  async function save() {
    if (!comment.id) return;
    const trimmed = val.trim();
    if (!trimmed) return alert('Le commentaire ne peut pas être vide');
    try {
      const res = await fetchWithRefresh(`api/feed/comments/${comment.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: trimmed }) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        return alert(b.message || 'Échec de la modification');
      }
  await onUpdate(comment.id as string, trimmed);
      setEditing(false);
      setMenuOpen(false);
    } catch (e) {
      console.error('Failed to edit comment', e);
      alert('Erreur réseau');
    }
  }

  // deletion is handled via showConfirm -> doDelete

  const role = currentUser?.role || '';
  const canEdit = !!currentUser && (currentUser.id === comment.authorId || ['admin', 'super-admin'].includes(role));

  const [showConfirm, setShowConfirm] = useState(false);

  async function doDelete() {
    if (!comment.id) return;
    try {
      const res = await fetchWithRefresh(`api/feed/comments/${comment.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        return alert(b.message || 'Échec de la suppression');
      }
      setShowConfirm(false);
      await onDelete(comment.id as string);
    } catch (e) {
      console.error('Failed to delete comment', e);
      alert('Erreur réseau');
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">{comment.authorName}</div>
            <div className="text-xs text-gray-400">{comment.timeAgo}</div>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(s => !s)} className="text-gray-400 hover:text-gray-600 px-2">⋯</button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                <div className="absolute right-0 top-full mt-1 z-50 bg-white w-48 rounded-lg shadow-lg ring-1 ring-gray-100" onClick={e => e.stopPropagation()}>
                  <div className="px-2 py-1">
                    {canEdit && (
                      <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h6M11 12h6M11 19h6M5 5h.01M5 12h.01M5 19h.01"/></svg>
                        Modifier
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => { setMenuOpen(false); setShowConfirm(true); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 9a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4 0a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zM4 6a1 1 0 011-1h10l-.6 9.6A2 2 0 0112.4 17H7.6a2 2 0 01-1.99-1.99L5 5zM9 3a1 1 0 00-1 1v1h4V4a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {!editing ? (
          <div className="mt-2 bg-gray-100 border border-gray-100 rounded-lg p-3 text-sm text-gray-800 shadow-sm break-words">
              {comment.text}
            </div>
        ) : (
          <div className="mt-2">
            <textarea autoFocus onMouseDown={e => e.stopPropagation()} value={val} onChange={e => setVal(e.target.value)} className="w-full border rounded p-2 text-sm min-h-[64px]" />
            <div className="mt-2 flex gap-2 justify-end">
              <button type="button" onClick={() => { setEditing(false); setVal(comment.text); }} className="px-3 py-1 rounded bg-gray-100">Annuler</button>
              <button onClick={save} className="px-3 py-1 rounded bg-indigo-600 text-white">Sauvegarder</button>
            </div>
          </div>
        )}
      </div>
      {showConfirm && (
        <ConfirmationModal
          title="Supprimer le commentaire"
          description='Voulez-vous vraiment supprimer ce commentaire ?'
          onCancel={() => setShowConfirm(false)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}

function ConfirmationModal({ title, description, onCancel, onConfirm }: { title: string; description: string; onCancel: () => void; onConfirm: () => Promise<void> | void }) {
  const [loading, setLoading] = useState(false);
  async function confirmHandler() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md ring-1 ring-indigo-50">
        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800 text-center break-words">{title}</h3>
          <p className="text-sm text-gray-600 mt-2 text-center break-words whitespace-normal">
            {description}
          </p>
        </div>
        <div className="px-6 py-3 flex flex-col sm:flex-row justify-center gap-3 border-t">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded bg-gray-100">Annuler</button>
          <button onClick={confirmHandler} disabled={loading} className="px-4 py-2 rounded bg-red-600 text-white">{loading ? 'Suppression...' : 'Supprimer'}</button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function PostItem({ post, bgClass, currentUser, onUpdatePost, onDeletePost, onMediasChange }: { post: Post; bgClass?: string; currentUser: (AuthUser & { id?: string; role?: string }) | null; onUpdatePost: (postId: string, newText: string) => Promise<void>; onDeletePost: (postId: string) => Promise<void>; onMediasChange?: (postId: string, medias: Media[]) => void; }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(post.text || '');
  const [showConfirm, setShowConfirm] = useState(false);

  const role = currentUser?.role || '';
  const canEdit = !!currentUser && (currentUser.id === post.authorId || ['admin', 'super-admin'].includes(role));

  const { t } = useI18n();

  const mediaCount = post.medias ? post.medias.length : 0;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const createdMediaIdsRef = useRef<string[]>([]);
  const [availableChildrenLocal, setAvailableChildrenLocal] = useState<{ id: string; name: string }[]>([]);
  const [selectedChildIdsLocal, setSelectedChildIdsLocal] = useState<string[]>([]);
  const [consentMapLocal, setConsentMapLocal] = useState<Record<string, boolean>>({});
  const [consentLoadedLocal, setConsentLoadedLocal] = useState(false);
  const [noChildSelectedLocal, setNoChildSelectedLocal] = useState(false);
  const [showTagMenuLocal, setShowTagMenuLocal] = useState(false);
  const [uploadingLocal, setUploadingLocal] = useState(false);
  const [showIdentifyWarningLocal, setShowIdentifyWarningLocal] = useState(false);
  const [stagedFilesLocal, setStagedFilesLocal] = useState<File[]>([]);
  const [stagedPreviewsLocal, setStagedPreviewsLocal] = useState<string[]>([]);

  // Fetch children & consents when entering edit mode or on demand
  async function fetchLocalChildren() {
    let mounted = true;
    try {
      const res = await fetchWithRefresh('api/children', { credentials: 'include' });
      if (!res.ok) return;
      const children = await res.json();
      const mapped = Array.isArray(children) ? (children as { id: string; name: string }[]).map(c => ({ id: c.id, name: c.name })) : [];
      if (!mounted) return;
      setAvailableChildrenLocal(mapped);
      // set initial local consent map to false for all children so UI doesn't show a loading line
      const initLocal: Record<string, boolean> = {};
      mapped.forEach(c => { initLocal[c.id] = false; });
      setConsentMapLocal(initLocal);
      setConsentLoadedLocal(false);

      try {
        const ids = mapped.map(c => c.id);
        const res = await fetchWithRefresh('api/children/batch/photo-consent-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ids }),
        });

        if (!res.ok) {
          // fallback: mark all as false
          const cm: Record<string, boolean> = {};
          mapped.forEach(c => { cm[c.id] = false; });
          if (mounted) {
            setConsentMapLocal(cm);
            setConsentLoadedLocal(true);
          }
        } else {
          const body = await res.json();
          const cm: Record<string, boolean> = {};
          mapped.forEach(c => {
            const item = body && body[c.id];
            const allowedRaw = item && item.allowed;
            const allowed = allowedRaw === true || allowedRaw === 'true' || allowedRaw === 1 || allowedRaw === '1';
            cm[c.id] = !!allowed;
          });
          if (mounted) {
            setConsentMapLocal(cm);
            setConsentLoadedLocal(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch batch photo consents', err);
        // on error, mark all as false to be safe
        const cm: Record<string, boolean> = {};
        mapped.forEach(c => { cm[c.id] = false; });
        if (mounted) {
          setConsentMapLocal(cm);
          setConsentLoadedLocal(true);
        }
      }
    } catch (e) {
      console.error('Failed to load children/consents for PostItem', e);
    }
    return () => { mounted = false; };
  }

  useEffect(() => {
    if (editing && availableChildrenLocal.length === 0) {
      fetchLocalChildren();
    }
  }, [editing, availableChildrenLocal.length]);

  // lightbox state for slideshow
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function openLightbox(i: number) {
    setLightboxIndex(i);
    setLightboxOpen(true);
  }
  function closeLightbox() {
    setLightboxOpen(false);
  }
  function nextLightbox() {
    if (!post.medias || post.medias.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % post.medias.length);
  }
  function prevLightbox() {
    if (!post.medias || post.medias.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + post.medias.length) % post.medias.length);
  }

  // keyboard navigation + prevent body scroll when lightbox is open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') return closeLightbox();
      if (!post.medias || post.medias.length === 0) return;
      if (e.key === 'ArrowLeft') return setLightboxIndex((i) => (i - 1 + post.medias!.length) % post.medias!.length);
      if (e.key === 'ArrowRight') return setLightboxIndex((i) => (i + 1) % post.medias!.length);
    }

    if (lightboxOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, post.medias]);

  async function save() {
    const trimmed = val.trim();
    try {
      const res = await fetchWithRefresh(`api/feed/${post.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: trimmed }) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(b.message || 'Échec de la modification');
        return false;
      }
      await onUpdatePost(post.id, trimmed);
      // only close editor here if caller desires; return success so caller can decide about staged files
      setMenuOpen(false);
      setEditing(false);
      return true;
    } catch (e) {
      console.error('Failed to edit post', e);
      alert('Erreur réseau');
      return false;
    }
  }

  async function doDelete() {
    try {
      const res = await fetchWithRefresh(`api/feed/${post.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        return alert(b.message || 'Échec de la suppression');
      }
      setShowConfirm(false);
      await onDeletePost(post.id);
    } catch (e) {
      console.error('Failed to delete post', e);
      alert('Erreur réseau');
    }
  }

  // Media handlers
  async function handleUploadImages(files: FileList | null) {
    setUploadingLocal(true);
    // create an AbortController for this upload operation so user can cancel via Annuler
    const controller = new AbortController();
    uploadAbortRef.current = controller;
  const createdMediaIds: string[] = [];
  createdMediaIdsRef.current = createdMediaIds;
    // ensure tagging/consent sanity before uploading
    if (!noChildSelectedLocal && selectedChildIdsLocal.length === 0 && files && files.length > 0) {
      // require identification when attaching files
      uploadAbortRef.current = null;
      setUploadingLocal(false);
      return alert('Veuillez identifier les enfants ou cocher "Pas d\'enfant" avant d\'ajouter des fichiers.');
    }
    // prevent upload when any selected child lacks consent
    const lacking = selectedChildIdsLocal.filter(id => !consentMapLocal[id]);
    if (lacking.length > 0) {
      const names = availableChildrenLocal.filter(c => lacking.includes(c.id)).map(c => c.name).join(', ');
      return alert(`Impossible d'envoyer : autorisation photo manquante pour ${names}.`);
    }
    if (!files || files.length === 0) return;
    const currentCount = (post.medias || []).length;
    const maxAllowed = 6;
    const remaining = Math.max(0, maxAllowed - currentCount);
    if (remaining === 0) {
      return alert(`Vous avez déjà ${currentCount} fichiers. Le maximum est ${maxAllowed}.`);
    }
    const fileArray = Array.from(files);
    if (fileArray.length > remaining) {
      alert(`Vous pouvez ajouter seulement ${remaining} fichier(s) supplémentaires. Seules les ${remaining} premières seront prises.`);
    }
    // Client-side validation to avoid sending huge files that may be rejected by the proxy/server
    const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
    const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    const PER_FILE_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB (server multipart limit)
    const TOTAL_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB (server multipart aggregate)

    const formatBytes = (bytes: number) => {
      if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      return `${Math.round(bytes / (1024 * 1024))} MB`;
    };

    const toUpload = fileArray.slice(0, remaining);
    let totalSize = 0;
    // Determine if at least one file would be uploaded directly (video or large)
    const anyDirectCandidate = toUpload.some(ff => ff.size > 8 * 1024 * 1024 || ff.type.startsWith('video/'));
    for (const f of toUpload) {
      totalSize += f.size;
      const isImage = f.type.startsWith('image/');
      const isVideo = f.type.startsWith('video/');
      if (!isImage && !isVideo) {
        return alert(`Type de fichier non supporté: ${f.name}`);
      }
      if (isVideo && !ALLOWED_VIDEO.includes(f.type)) {
        return alert(`Format vidéo non supporté: ${f.name} (${f.type}). Formats acceptés: mp4, webm, mov.`);
      }
      if (isImage && !ALLOWED_IMAGE.includes(f.type) && !f.type.startsWith('image/')) {
        return alert(`Format d'image non supporté: ${f.name} (${f.type})`);
      }
      // If file exceeds server per-file limit but we have direct upload available and file is a direct candidate, allow it.
      const isDirectCandidate = (f.size > 8 * 1024 * 1024) || f.type.startsWith('video/');
      if (f.size > PER_FILE_LIMIT && !(isDirectCandidate && VITE_SUPABASE_ANON_KEY)) {
  return alert(`Le fichier ${f.name} est trop volumineux (${formatBytes(f.size)}). Taille max par fichier via le serveur: ${formatBytes(PER_FILE_LIMIT)}.`);
      }
    }
    // If total size exceeds server aggregate limit and no direct upload is possible, reject.
    if (totalSize > TOTAL_LIMIT && !(anyDirectCandidate && VITE_SUPABASE_ANON_KEY)) {
  return alert(`La taille totale des fichiers sélectionnés est trop importante (${formatBytes(totalSize)}). Limite via le serveur: ${formatBytes(TOTAL_LIMIT)}.`);
    }

    // If any file is a direct candidate (video or >8MB) and we have anon key, use direct upload
  const anyDirect = toUpload.some(f => f.size > 8 * 1024 * 1024 || f.type.startsWith('video/')) && VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY;

    if (anyDirect) {
      const supabaseClient = createSupabaseClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
      for (const f of toUpload) {
          try {
          const signRes = await fetchWithRefresh('api/uploads/supabase/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: f.name, contentType: f.type, prefix: 'feed' }) });
          if (!signRes.ok) {
            const b = await signRes.json().catch(() => ({}));
            console.error('Sign failed', b);
            continue;
          }
          // if abort was requested after sign, stop
          if (controller.signal.aborted) {
            uploadAbortRef.current = null;
            setUploadingLocal(false);
            return;
          }
          const signBody = await signRes.json();
          const storagePath = signBody.storagePath;
          const bucket = signBody.bucket || VITE_SUPABASE_BUCKET;
          // perform direct upload
          const { error: upErr } = await supabaseClient.storage.from(bucket).upload(storagePath, f, { contentType: f.type, upsert: false });
          if (upErr) {
            console.error('Direct upload error', upErr);
            continue;
          }

          // if abort requested after upload but before finalize, try to cleanup the uploaded object and stop
          if (controller.signal.aborted) {
            try {
              await supabaseClient.storage.from(bucket).remove([storagePath]);
            } catch (e) {
              console.warn('Failed to cleanup partially uploaded object', e);
            }
            uploadAbortRef.current = null;
            setUploadingLocal(false);
            return;
          }

          const finRes = await fetchWithRefresh('api/uploads/supabase/finalize', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storagePath, postId: post.id, size: f.size, originalName: f.name, taggedChildIds: selectedChildIdsLocal || [], noChildSelected: !!noChildSelectedLocal }) });
          if (!finRes.ok) {
            const b = await finRes.json().catch(() => ({}));
            const serverMsg = (b && b.message) ? String(b.message) : '';
            // PostItem runs outside the Feed showError scope — notify user during edit
            alert('Échec de la finalisation: ' + serverMsg);
            continue;
          }
          const finBody = await finRes.json();
          const newMedias: Media[] = finBody.medias || [];
          // record created media ids so we can cleanup if the user cancels during the session
          (newMedias || []).forEach(m => { if (m && m.id) createdMediaIds.push(m.id); });
          if (onMediasChange) onMediasChange(post.id, (post.medias || []).concat(newMedias));
          } catch (err) {
            if (err instanceof Error && (err as Error).name === 'AbortError') {
              // user cancelled – attempt to cleanup any medias we already created in this session
              try {
                for (const mid of createdMediaIds) {
                  await fetchWithRefresh(`api/feed/${post.id}/media/${mid}`, { method: 'DELETE' });
                }
              } catch (e) {
                console.warn('Failed to cleanup created medias after abort', e);
              }
              uploadAbortRef.current = null;
              setUploadingLocal(false);
              return;
            }
            console.error('Direct upload loop error', err);
          }
      }
      setUploadingLocal(false);
      uploadAbortRef.current = null;
      return;
    }

    // fallback to server multipart upload (subject to server per-file limits)
    const fd = new FormData();
    for (const f of toUpload) fd.append('images', f, f.name);
    if (selectedChildIdsLocal && selectedChildIdsLocal.length) {
      for (const cid of selectedChildIdsLocal) fd.append('taggedChildIds[]', cid);
    }
    if (noChildSelectedLocal) fd.append('noChildSelected', '1');
    try {
      const res = await fetchWithRefresh(`api/feed/${post.id}/media`, { method: 'POST', signal: controller.signal, body: fd });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        uploadAbortRef.current = null;
        setUploadingLocal(false);
        return alert(b.message || 'Échec de l\'upload');
      }
      const body = await res.json();
      const newMedias: Media[] = body.medias || [];
      (newMedias || []).forEach(m => { if (m && m.id) createdMediaIds.push(m.id); });
      if (onMediasChange) onMediasChange(post.id, (post.medias || []).concat(newMedias));
      uploadAbortRef.current = null;
      setUploadingLocal(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // cancelled by user
        uploadAbortRef.current = null;
        setUploadingLocal(false);
        return;
      }
      console.error('Upload failed', err);
      uploadAbortRef.current = null;
      setUploadingLocal(false);
      alert('Erreur réseau');
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    try {
      const res = await fetchWithRefresh(`api/feed/${post.id}/media/${mediaId}`, { method: 'DELETE' });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        return alert(b.message || 'Échec suppression media');
      }
      const remaining = (post.medias || []).filter(m => m.id !== mediaId);
      if (onMediasChange) onMediasChange(post.id, remaining);
    } catch (e) {
      console.error('Delete media failed', e);
      alert('Erreur réseau');
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-800 text-sm sm:text-base">{post.author?.name || 'Utilisateur'}</div>
          <div className="text-xs text-gray-400">Il y a {timeAgo(post.createdAt)}</div>
        </div>
        <div className="relative">
          {canEdit && (
            <button onClick={() => setMenuOpen(s => !s)} className="text-gray-400 hover:text-gray-600 px-2">⋯</button>
          )}
          {menuOpen && canEdit && (
            <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-10 overflow-hidden">
              <div className="px-2 py-1">
                {canEdit && (
                  <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h6M11 12h6M11 19h6M5 5h.01M5 12h.01M5 19h.01"/></svg>
                    Modifier
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => { setMenuOpen(false); setShowConfirm(true); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 9a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4 0a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zM4 6a1 1 0 011-1h10l-.6 9.6A2 2 0 0112.4 17H7.6a2 2 0 01-1.99-1.99L5 5zM9 3a1 1 0 00-1 1v1h4V4a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  {/* post text moved below medias for better visual order */}
      {/* medias display + controls */}
      {mediaCount > 0 && (
        <div className="mt-3">
          <div className="w-full overflow-hidden rounded-lg border border-gray-200">
            <div className={`grid gap-2 ${ (post.medias || []).length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {(post.medias || []).slice(0, 4).map((m, idx) => {
            const isLastVisible = idx === 3 && (post.medias || []).length > 4;
            // enforce aspect ratio per tile so images can't overflow their box
            const tileClass = (post.medias || []).length === 1 ? 'aspect-[16/9]' : 'aspect-[4/3]';
            return (
              <div key={m.id} className={`relative w-full ${tileClass} ${bgClass || 'bg-gray-100'} rounded overflow-hidden`}>
                <div className="w-full h-full">
                  <FeedImage src={m.url} thumb={m.thumbnailUrl} alt={post.text ? post.text.slice(0, 80) : 'photo'} onOpen={() => openLightbox(idx)} />
                  {isLastVisible && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openLightbox(idx)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openLightbox(idx); }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-lg font-semibold cursor-pointer z-20"
                      aria-label={`Afficher ${ (post.medias || []).length - 4 } images supplémentaires en plein écran`}
                    >+{(post.medias || []).length - 4}</div>
                  )}
                </div>
                {canEdit && editing && (
                  <button onClick={() => handleDeleteMedia(m.id)} className="absolute top-2 right-2 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
                )}
              </div>
            );
          })}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / slideshow (portal) */}
      {post.medias && post.medias.length > 0 && (
        <FeedLightbox
          open={lightboxOpen}
          medias={post.medias as LightboxMedia[]}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevLightbox}
          onNext={nextLightbox}
        />
      )}
      {canEdit && editing && (
        <div className="mt-3">
            <div className="inline-flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => {
                if (uploadingLocal) return;
                const input = e.currentTarget as HTMLInputElement;
                const newFiles = Array.from(input.files || []);
                if (newFiles.length === 0) return;
                // Stage files locally — will be uploaded on 'Sauvegarder'
                setStagedFilesLocal(prev => [...prev, ...newFiles]);
                const newPreviews = newFiles.map(f => URL.createObjectURL(f));
                setStagedPreviewsLocal(prev => [...prev, ...newPreviews]);
                input.value = '';
              }} />
              <button type="button" onClick={() => { if (!uploadingLocal) fileInputRef.current?.click(); }} disabled={uploadingLocal} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm flex items-center gap-2">{uploadingLocal ? <Spinner size={20} /> : 'Ajouter des fichiers (images/vidéos, max 6)'}</button>
            </div>
            {/* Staged previews for files chosen during edit */}
            {stagedPreviewsLocal.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stagedPreviewsLocal.map((p, i) => (
                  <div key={i} className="w-full h-16 sm:h-20 md:h-24 bg-gray-100 rounded overflow-hidden relative flex items-center justify-center">
                    {stagedFilesLocal[i] && stagedFilesLocal[i].type && stagedFilesLocal[i].type.startsWith('video/') ? (
                      <video src={p} className="w-full h-full object-contain" controls />
                    ) : (
                      <img src={p} className="w-full h-full object-contain" />
                    )}
                    <button type="button" aria-label={`Retirer le fichier ${i + 1}`} onClick={() => {
                      // remove file and preview at index i
                      setStagedFilesLocal(prev => { const next = prev.slice(); next.splice(i, 1); return next; });
                      setStagedPreviewsLocal(prev => { const next = prev.slice(); try { URL.revokeObjectURL(next[i]); } catch { /* ignore revoke errors */ } next.splice(i, 1); return next; });
                    }} className="absolute top-1 right-1 bg-white/90 text-red-600 rounded-full p-1 shadow hover:bg-white">✕</button>
                  </div>
                ))}
              </div>
            )}
            {/* Tagging UI for PostItem edit mode */}
            <div className="mt-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={async () => {
                      // ensure consents are loaded before opening selector to avoid stale init values
                      if (!consentLoadedLocal && availableChildrenLocal.length === 0) {
                        await fetchLocalChildren();
                      } else if (!consentLoadedLocal) {
                        // if children present but consents still loading, wait for them
                        await fetchLocalChildren();
                      }
                      setShowTagMenuLocal(prev => !prev);
                    }}
                    aria-haspopup="true"
                    aria-expanded={showTagMenuLocal}
                    aria-label={t('feed.identify')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-3 sm:py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 text-sm w-full sm:w-auto shadow-sm"
                  >
                    {t('feed.identify')}
                    {selectedChildIdsLocal.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">{selectedChildIdsLocal.length}</span>
                    )}
                  </button>
                </div>

                <ChildSelector
                  open={showTagMenuLocal}
                  onClose={() => setShowTagMenuLocal(false)}
                  availableChildren={availableChildrenLocal}
                  selectedChildIds={selectedChildIdsLocal}
                  setSelectedChildIds={setSelectedChildIdsLocal}
                  noChildSelected={noChildSelectedLocal}
                  setNoChildSelected={setNoChildSelectedLocal}
                  consentMap={consentMapLocal}
                  title={t('feed.tag_children')}
                  confirmLabel={t('common.confirm')}
                />
              </div>
            </div>
        </div>
      )}
      {/* post text (separate box so length doesn't affect images) */}
      {!editing ? (
        <div className="mt-3">
          <div className={`border border-gray-200 rounded-lg p-3 ${bgClass || 'bg-white'} text-gray-800 break-words text-sm sm:text-base`}>
            {post.text}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <div className={`border border-gray-200 rounded-lg p-2 ${bgClass || 'bg-white'}`}>
            <textarea autoFocus onMouseDown={e => e.stopPropagation()} value={val} onChange={e => setVal(e.target.value)} className="w-full border rounded p-2 text-sm min-h-[80px]" />
            <div className="mt-2 flex gap-2 justify-end">
              <button type="button" onClick={() => {
                (async () => {
                  // if an upload is in progress, abort it
                  try {
                    if (uploadAbortRef.current) {
                      uploadAbortRef.current.abort();
                      uploadAbortRef.current = null;
                    }
                    // cleanup any medias created so far in this editing session
                    if (createdMediaIdsRef.current && createdMediaIdsRef.current.length > 0) {
                      try {
                        for (const mid of createdMediaIdsRef.current) {
                          await fetchWithRefresh(`api/feed/${post.id}/media/${mid}`, { method: 'DELETE' });
                        }
                      } catch (e) {
                        console.warn('Failed to cleanup created medias on cancel', e);
                      }
                      createdMediaIdsRef.current = [];
                    }
                  } catch {
                    // ignore
                  }
                  // revoke and clear any staged previews/files
                  try { stagedPreviewsLocal.forEach(url => URL.revokeObjectURL(url)); } catch { /* ignore cleanup errors */ }
                  setStagedPreviewsLocal([]);
                  setStagedFilesLocal([]);
                  setEditing(false);
                  setVal(post.text || '');
                })();
              }} className="px-3 py-1 rounded bg-gray-100">Annuler</button>
              <button type="button" onClick={async () => {
                // If there are staged files, require identification before saving
                if (stagedFilesLocal.length > 0) {
                  if (!noChildSelectedLocal && selectedChildIdsLocal.length === 0) {
                    // keep editor open and show warning to identify children
                    setShowIdentifyWarningLocal(true);
                    return;
                  }
                  // check consents
                  const lacking = selectedChildIdsLocal.filter(id => !consentMapLocal[id]);
                  if (lacking.length > 0) {
                    const names = availableChildrenLocal.filter(c => lacking.includes(c.id)).map(c => c.name);
                    alert(`Autorisation photo manquante pour: ${names.join(', ')}`);
                    return;
                  }
                }

                const ok = await save();
                if (!ok) return;

                if (stagedFilesLocal.length > 0) {
                  const dt = new DataTransfer();
                  stagedFilesLocal.forEach(f => dt.items.add(f));
                  await handleUploadImages(dt.files);
                  try { stagedPreviewsLocal.forEach(url => URL.revokeObjectURL(url)); } catch { /* ignore cleanup errors */ }
                  setStagedPreviewsLocal([]);
                  setStagedFilesLocal([]);
                }
              }} className="px-3 py-1 rounded bg-indigo-600 text-white">Sauvegarder</button>
            </div>
            {showIdentifyWarningLocal && (
              <div className="mt-2 text-sm text-red-600">Veuillez identifier les enfants ou cocher "Pas d'enfant" avant de sauvegarder les images.</div>
            )}
          </div>
        </div>
      )}
      {showConfirm && (
        <ConfirmationModal
          title="Supprimer la publication"
          description="Voulez-vous vraiment supprimer cette publication ?"
          onCancel={() => setShowConfirm(false)}
          onConfirm={doDelete}
        />
      )}
    </>
  );
}
