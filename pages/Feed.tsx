import React, { useEffect, useState, useRef, useCallback } from 'react';
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
type Comment = { id?: string; authorName: string; authorId?: string; timeAgo: string; text: string; parentId?: string | null };
type Post = { id: string; text?: string; createdAt: string; author?: { name?: string }; authorId?: string; medias?: Media[]; likes?: number; hasLiked?: boolean; commentsCount?: number; shares?: number; comments?: Comment[] };

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

function CommentBox({ postId, onSubmit, authorName }: { postId: string; onSubmit: (postId: string, text: string) => Promise<void>; authorName?: string }) {
  const [val, setVal] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { t } = useI18n();

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  const initial = authorName ? authorName.charAt(0).toUpperCase() : '?';

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (val.trim()) { onSubmit(postId, val.trim()); setVal(''); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; } setFocused(false); } }}
      className="flex items-start gap-2.5 pt-3 border-t border-gray-100"
    >
      <div className="w-8 h-8 rounded-full bg-[#e6f4f7] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#0b5566] mt-0.5">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <textarea
          ref={textareaRef}
          value={val}
          rows={1}
          onChange={e => { setVal(e.target.value); autoResize(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => { if (!val.trim()) setFocused(false); }}
          placeholder={t('feed.write_comment', 'Écrire un commentaire...')}
          className="w-full resize-none bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 leading-relaxed overflow-hidden"
          style={{ fontSize: '16px', minHeight: '24px' }}
        />
        {focused && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">{val.length > 0 ? `${val.length} caractère${val.length > 1 ? 's' : ''}` : ''}</span>
            <button
              type="submit"
              disabled={!val.trim()}
              className="px-4 py-1.5 rounded-full bg-[#0b5566] text-white text-xs font-bold disabled:opacity-40 hover:bg-[#08323a] transition-colors"
            >
              {t('feed.send', 'Publier')}
            </button>
          </div>
        )}
      </div>
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
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
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

  

  const likingRef = React.useRef<Set<string>>(new Set());
  const toggleLike = useCallback(async (postId: string) => {
    if (likingRef.current.has(postId)) return; // prevent spam
    likingRef.current.add(postId);
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const wasLiked = !!p.hasLiked;
      return { ...p, hasLiked: !wasLiked, likes: (p.likes || 0) + (wasLiked ? -1 : 1) };
    }));
    try {
      const res = await fetchWithRefresh(`api/feed/${postId}/like`, { method: 'POST' });
      if (!res.ok) {
        // Revert on error
        setPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          const wasLiked = !!p.hasLiked;
          return { ...p, hasLiked: !wasLiked, likes: (p.likes || 0) + (wasLiked ? -1 : 1) };
        }));
      }
    } catch (e) {
      // Revert on error
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const wasLiked = !!p.hasLiked;
        return { ...p, hasLiked: !wasLiked, likes: (p.likes || 0) + (wasLiked ? -1 : 1) };
      }));
      const err = e as unknown;
      if (import.meta.env.DEV) console.error('Like failed', err);
      else console.error('Like failed', err instanceof Error ? err.message : String(err));
    } finally {
      likingRef.current.delete(postId);
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

  async function addComment(postId: string, text: string, parentId?: string) {
    try {
      const body: Record<string, string> = { text };
      if (parentId) body.parentId = parentId;
      const res = await fetchWithRefresh(`api/feed/${postId}/comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        const serverMsg = (b && b.message) ? String(b.message) : '';
        showError('Impossible d\'envoyer le commentaire', mapServerMessage(serverMsg, 400));
        return;
      }
      const created = await res.json();
      const newComment: Comment = { id: created.id, authorName: created.authorName, authorId: created.authorId, timeAgo: timeAgo(created.createdAt), text: created.text, parentId: created.parentId || null };
      if (!parentId) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1, comments: p.comments ? [newComment, ...p.comments] : [newComment] } : p));
      }
      setCommentsForPost(prev => ({ ...prev, [postId]: prev[postId] ? [...prev[postId], newComment] : [newComment] }));
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
    <div className={`min-h-screen bg-[#f4f7fa] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('page.feed')}</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{centerName ? centerName : t('feed.center_news')}</p>
            </div>
          </div>
        </div>

        {/* Super-admin center filter */}
        {currentUser && currentUser.role === 'super-admin' && (
          <div className="mb-4">
            <select value={centerFilter || ''} onChange={e => setCenterFilter(e.target.value || null)} className="border border-gray-200 px-3 py-2 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 w-full sm:w-auto">
              <option value="">Tous les centres</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(currentUser?.name || 'U').slice(0,1).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">{currentUser?.name || 'Utilisateur'}</div>
              {centerName && <div className="text-xs text-gray-400">{centerName}</div>}
            </div>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('feed.composer_placeholder')} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 min-h-[80px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 resize-none" />
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Camera */}
            <label className="cursor-pointer">
              <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={e => { if (uploading) return; const input = e.currentTarget as HTMLInputElement; const newFiles = Array.from(input.files || []); if (newFiles.length === 0) return; setFiles(prev => [...prev, ...newFiles]); input.value = ''; }} />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {uploading ? <Spinner size={16} /> : t('feed.photo')}
              </span>
            </label>
            {/* Gallery */}
            <label className="cursor-pointer">
              <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => { if (uploading) return; const input = e.currentTarget as HTMLInputElement; const newFiles = Array.from(input.files || []); if (newFiles.length === 0) return; setFiles(prev => [...prev, ...newFiles]); input.value = ''; }} />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {uploading ? <Spinner size={16} /> : t('feed.gallery')}
              </span>
            </label>
            {files.length > 0 && <span className="text-xs text-gray-400">{files.length} {t('feed.images')}</span>}
            {/* Tagging button */}
            {files.length > 0 && (
              <div className="relative">
                <button type="button" onClick={() => setShowTagMenu(prev => !prev)} aria-haspopup="true" aria-expanded={showTagMenu} aria-label={t('feed.identify')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b5566]/10 text-[#0b5566] hover:bg-[#0b5566]/20 text-sm font-medium transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {t('feed.identify')}
                  {selectedChildIds.length > 0 && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-[#0b5566] text-white">{selectedChildIds.length}</span>}
                </button>
                <ChildSelector open={showTagMenu} onClose={() => setShowTagMenu(false)} availableChildren={availableChildren} selectedChildIds={selectedChildIds} setSelectedChildIds={setSelectedChildIds} noChildSelected={noChildSelected} setNoChildSelected={setNoChildSelected} consentMap={consentMap} title={t('feed.tag_children')} confirmLabel={t('common.confirm')} />
              </div>
            )}
            <button type="submit" disabled={loading || uploading || (selectedChildIds.length > 0 && selectedChildIds.some(id => !consentMap[id]))} className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {(loading || uploading) ? <><Spinner size={16} /><span>Envoi...</span></> : 'Publier'}
            </button>
          </div>
          {showIdentifyWarning && <div className="mt-2 text-xs text-red-500" role="alert">Veuillez identifier les enfants.</div>}
          {selectedChildIds.length > 0 && Object.keys(consentMap).length > 0 && (() => {
            const lacking = selectedChildIds.filter(id => !consentMap[id]);
            if (lacking.length === 0) return null;
            const names = availableChildren.filter(c => lacking.includes(c.id)).map(c => c.name).join(', ');
            return <div className="mt-2 text-xs text-red-500">Impossible de publier: autorisation manquante pour {names}.</div>;
          })()}
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                  {files[i]?.type?.startsWith('video/') ? <video src={p} className="w-full h-full object-cover" /> : <img src={p} className="w-full h-full object-cover" />}
                  <button type="button" aria-label={`Retirer ${i + 1}`} onClick={() => { setFiles(prev => { const n = prev.slice(); n.splice(i,1); return n; }); setPreviews(prev => { const n = prev.slice(); try { URL.revokeObjectURL(n[i]); } catch { /**/ } n.splice(i,1); return n; }); }} className="absolute top-1 right-1 w-5 h-5 bg-white/90 text-red-600 rounded-full flex items-center justify-center text-xs shadow hover:bg-white">✕</button>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Consent modal */}
        {showConsentModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Autorisation photo manquante</h3>
                  <p className="mt-1 text-sm text-gray-600">Vous n'avez pas l'autorisation des parents pour publier des photos des enfants suivants :</p>
                  <ul className="mt-2 list-disc list-inside text-sm text-gray-800">{lackingNames.map(n => <li key={n}>{n}</li>)}</ul>
                  <p className="mt-2 text-sm text-gray-500">Veuillez retirer ces enfants ou contacter les parents.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowConsentModal(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium">Fermer</button>
                <button onClick={() => setShowConsentModal(false)} className="px-4 py-2 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white rounded-xl text-sm font-medium">Retour</button>
              </div>
            </div>
          </div>
        )}

        {/* Month navigation */}
        {(() => {
          const allMonths = Array.from(new Set(posts.map(p => {
            const d = new Date(p.createdAt);
            return `${d.getFullYear()}-${d.getMonth()}`;
          }))).sort((a, b) => b.localeCompare(a)).map(key => {
            const [y, m] = key.split('-').map(Number);
            return { year: y, month: m };
          });
          const filteredPosts = posts.filter(p => {
            const d = new Date(p.createdAt);
            return d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month;
          });
          const currentIdx = allMonths.findIndex(m => m.year === selectedMonth.year && m.month === selectedMonth.month);
          const hasPrev = currentIdx < allMonths.length - 1;
          const hasNext = currentIdx > 0;
          const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(selectedMonth.year, selectedMonth.month, 1));

          return (
            <>
              <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                <button
                  onClick={() => hasPrev && setSelectedMonth(allMonths[currentIdx + 1])}
                  disabled={!hasPrev}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="text-center">
                  <span className="text-sm font-bold text-gray-800 capitalize">{monthLabel}</span>
                  <span className="ml-2 text-xs text-gray-400">{filteredPosts.length} publication{filteredPosts.length !== 1 ? 's' : ''}</span>
                </div>
                <button
                  onClick={() => hasNext && setSelectedMonth(allMonths[currentIdx - 1])}
                  disabled={!hasNext}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              {/* Posts list */}
              <div className="space-y-4">
                {filteredPosts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-gray-100">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Aucune publication ce mois-ci</p>
                  </div>
                )}
                {filteredPosts.map((post, idx) => (
            <article id={`post-${post.id}`} key={post.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="p-4">
                <PostItem post={post} bgClass={postBgPalette[idx % postBgPalette.length]} currentUser={currentUser}
                  onUpdatePost={async (id, newText) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text: newText } : p))}
                  onDeletePost={async (id) => setPosts(prev => prev.filter(p => p.id !== id))}
                  onMediasChange={(id, medias) => setPosts(prev => prev.map(p => p.id === id ? { ...p, medias } : p))} />
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-4">
                  <button data-post-id={post.id} onPointerDown={() => startPress(post.id)} onPointerUp={() => endPressShort(post.id)} onPointerLeave={() => cancelPress()} onContextMenu={e => e.preventDefault()} className={`flex items-center gap-1.5 text-sm transition-colors select-none ${post.hasLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                    <svg className="w-4 h-4" fill={post.hasLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    <span>{post.likes ?? 0}</span>
                  </button>
                  <button onClick={async () => { openCommentsModal(post.id); await loadComments(post.id); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0b5566] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span>{post.commentsCount ?? 0}</span>
                  </button>
                </div>
                <CommentBox postId={post.id} onSubmit={addComment} authorName={currentUser?.name ?? currentUser?.email ?? undefined} />
              </div>
            </article>
                ))}
              </div>
            </>
          );
        })()}

        {/* Likes modal — bottom sheet */}
        {likesModalOpen && (
          <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setLikesModalOpen(false); setLikers([]); setLikesModalPos(null); }}>
            <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">J'aime</h3>
                    <p className="text-xs text-gray-400">{likers.length} personne{likers.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button onClick={() => { setLikesModalOpen(false); setLikers([]); setLikesModalPos(null); }} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-auto px-6 py-4">
                {likers.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg>
                    </div>
                    <p className="text-sm text-gray-400">Aucun j'aime pour le moment</p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {likers.map(u => (
                      <li key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {(u.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{u.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {openCommentsFor && (
          <CommentsModal
            position={commentsModalPosition}
            onClose={() => { setOpenCommentsFor(null); setCommentsModalPosition(null); }}
            comments={commentsForPost[openCommentsFor] || []}
            loading={commentsLoading}
            currentUser={currentUser ? { ...currentUser, email: currentUser.email ?? undefined } : null}
            onAddComment={async (text: string, parentId?: string) => { await addComment(openCommentsFor as string, text, parentId); }}
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

      {/* Error modal */}
      {errorModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setErrorModalOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-base font-bold text-gray-900">{errorModalTitle || 'Erreur'}</h3>
            <div className="mt-3 text-sm text-gray-600 whitespace-pre-line">{errorModalMessage}</div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setErrorModalOpen(false)} className="px-5 py-2 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentsModal({ onClose, comments, loading, currentUser, onAddComment, onUpdateComment, onDeleteComment }: { onClose: () => void; comments: Comment[]; loading?: boolean; currentUser: (AuthUser & { id?: string; role?: string; name?: string; email?: string; centerId?: string }) | null; onAddComment: (text: string, parentId?: string) => Promise<void>; onUpdateComment: (commentId: string, newText: string) => Promise<void>; onDeleteComment: (commentId: string) => Promise<void>; position?: { top: number; left: number; width: number } | null; }) {
  const [val, setVal] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  const authorInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : '?';

  // Separate top-level comments from replies
  const topLevel = comments.filter(c => !c.parentId);
  const repliesMap = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Commentaires</h3>
            <div className="text-xs text-gray-400">{comments.length} commentaire{comments.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-sm text-gray-400">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4"/></svg>
              Chargement…
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">Aucun commentaire</p>
              <p className="text-xs text-gray-400 mt-0.5">Soyez le premier à commenter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topLevel.map(c => (
                <div key={c.id || (c.authorName + c.timeAgo + c.text)}>
                  <CommentItem comment={c} currentUser={currentUser} onUpdate={onUpdateComment} onDelete={onDeleteComment} onReply={onAddComment} authorInitial={authorInitial} />
                  {repliesMap[c.id!] && repliesMap[c.id!].length > 0 && (
                    <div className="ml-10 mt-2 space-y-3 border-l-2 border-gray-100 pl-3">
                      {repliesMap[c.id!].map(r => (
                        <CommentItem key={r.id || (r.authorName + r.timeAgo + r.text)} comment={r} currentUser={currentUser} onUpdate={onUpdateComment} onDelete={onDeleteComment} isReply />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply box */}
        <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#e6f4f7] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#0b5566] mt-0.5">
              {authorInitial}
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={val}
                rows={1}
                onChange={e => { setVal(e.target.value); autoResize(); }}
                onFocus={() => setFocused(true)}
                onBlur={() => { if (!val.trim()) setFocused(false); }}
                placeholder="Ajouter un commentaire…"
                className="w-full resize-none bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 leading-relaxed overflow-hidden"
                style={{ fontSize: '16px', minHeight: '24px' }}
              />
              {focused && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{val.length > 0 ? `${val.length} caractère${val.length > 1 ? 's' : ''}` : ''}</span>
                  <button
                    type="button"
                    disabled={!val.trim()}
                    onClick={async () => {
                      if (!val.trim()) return;
                      await onAddComment(val.trim());
                      setVal('');
                      if (textareaRef.current) textareaRef.current.style.height = 'auto';
                      setFocused(false);
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#0b5566] text-white text-xs font-bold disabled:opacity-40 hover:bg-[#08323a] transition-colors"
                  >
                    Publier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, currentUser, onUpdate, onDelete, onReply, authorInitial, isReply }: { comment: Comment; currentUser: (AuthUser & { id?: string; role?: string }) | null; onUpdate: (commentId: string, newText: string) => Promise<void>; onDelete: (commentId: string) => Promise<void>; onReply?: (text: string, parentId?: string) => Promise<void>; authorInitial?: string; isReply?: boolean; }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(comment.text);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyVal, setReplyVal] = useState('');
  const replyRef = React.useRef<HTMLTextAreaElement>(null);

  function autoResizeReply() {
    const el = replyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  async function submitReply() {
    if (!replyVal.trim() || !onReply || !comment.id) return;
    await onReply(replyVal.trim(), comment.id);
    setReplyVal('');
    setReplyOpen(false);
  }

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

  const avatarSize = isReply ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs';

  return (
    <div className={`flex items-start gap-2 ${isReply ? 'gap-1.5' : ''}`}>
      <div className={`${avatarSize} rounded-full bg-[#e6f4f7] flex items-center justify-center font-bold text-[#0b5566] flex-shrink-0 mt-0.5`}>
        {(comment.authorName || 'U').slice(0,1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-gray-800">{comment.authorName}</span>
            <span className="text-xs text-gray-400 ml-2">{comment.timeAgo}</span>
          </div>
          {canEdit && (
            <div className="relative flex-shrink-0">
              <button onClick={() => setMenuOpen(s => !s)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-base leading-none">⋯</button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white w-40 rounded-xl shadow-lg border border-gray-100" onClick={e => e.stopPropagation()}>
                    <div className="p-1">
                      <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Modifier
                      </button>
                      <button onClick={() => { setMenuOpen(false); setShowConfirm(true); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-red-500 rounded-lg hover:bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 9a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4 0a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zM4 6a1 1 0 011-1h10l-.6 9.6A2 2 0 0112.4 17H7.6a2 2 0 01-1.99-1.99L5 5zM9 3a1 1 0 00-1 1v1h4V4a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                        Supprimer
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!editing ? (
          <div className="mt-1 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 break-words">{comment.text}</div>
        ) : (
          <div className="mt-1">
            <textarea autoFocus onMouseDown={e => e.stopPropagation()} value={val} onChange={e => setVal(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2 text-sm min-h-[64px] focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20" style={{ fontSize: '16px' }} />
            <div className="mt-2 flex gap-2 justify-end">
              <button type="button" onClick={() => { setEditing(false); setVal(comment.text); }} className="px-3 py-1.5 rounded-xl bg-gray-100 text-xs font-medium">Annuler</button>
              <button onClick={save} className="px-3 py-1.5 rounded-xl bg-[#0b5566] text-white text-xs font-medium">Sauvegarder</button>
            </div>
          </div>
        )}

        {/* Reply button — only on top-level comments */}
        {!isReply && onReply && !editing && (
          <button
            onClick={() => { setReplyOpen(o => !o); setTimeout(() => replyRef.current?.focus(), 50); }}
            className="mt-1.5 text-xs text-gray-400 hover:text-[#0b5566] font-medium transition-colors"
          >
            Répondre
          </button>
        )}

        {/* Inline reply box */}
        {replyOpen && (
          <div className="mt-2 flex items-start gap-2">
            <div className={`w-6 h-6 rounded-full bg-[#e6f4f7] flex items-center justify-center text-[10px] font-bold text-[#0b5566] flex-shrink-0 mt-0.5`}>
              {authorInitial || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                ref={replyRef}
                value={replyVal}
                rows={1}
                onChange={e => { setReplyVal(e.target.value); autoResizeReply(); }}
                placeholder={`Répondre à ${comment.authorName}…`}
                className="w-full resize-none bg-transparent border-none outline-none text-xs text-gray-800 placeholder-gray-400 leading-relaxed overflow-hidden"
                style={{ fontSize: '16px', minHeight: '20px' }}
              />
              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                <button onClick={() => { setReplyOpen(false); setReplyVal(''); }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Annuler</button>
                <button
                  onClick={submitReply}
                  disabled={!replyVal.trim()}
                  className="px-3 py-1 rounded-full bg-[#0b5566] text-white text-xs font-bold disabled:opacity-40 hover:bg-[#08323a] transition-colors"
                >
                  Publier
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showConfirm && <ConfirmationModal title="Supprimer le commentaire" description='Voulez-vous vraiment supprimer ce commentaire ?' onCancel={() => setShowConfirm(false)} onConfirm={doDelete} />}
    </div>
  );
}

function ConfirmationModal({ title, description, onCancel, onConfirm }: { title: string; description: string; onCancel: () => void; onConfirm: () => Promise<void> | void }) {
  const [loading, setLoading] = useState(false);
  async function confirmHandler() {
    setLoading(true);
    try { await onConfirm(); } finally { setLoading(false); }
  }

  const modal = (
    <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5">
          <h3 className="text-base font-bold text-gray-900 text-center break-words">{title}</h3>
          <p className="text-sm text-gray-500 mt-2 text-center break-words whitespace-normal">{description}</p>
        </div>
        <div className="px-6 py-4 flex flex-col sm:flex-row justify-center gap-2 border-t">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-medium hover:bg-gray-200 transition-colors">Annuler</button>
          <button onClick={confirmHandler} disabled={loading} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50">{loading ? 'Suppression...' : 'Supprimer'}</button>
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {(post.author?.name || 'U').slice(0,1).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-sm leading-tight">{post.author?.name || 'Utilisateur'}</div>
            <div className="text-xs text-gray-400">Il y a {timeAgo(post.createdAt)}</div>
          </div>
        </div>
        <div className="relative">
          {canEdit && (
            <button onClick={() => setMenuOpen(s => !s)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 text-lg leading-none">⋯</button>
          )}
          {menuOpen && canEdit && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
              <div className="p-1">
                <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Modifier
                </button>
                <button onClick={() => { setMenuOpen(false); setShowConfirm(true); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-500 rounded-lg hover:bg-gray-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 9a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4 0a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zM4 6a1 1 0 011-1h10l-.6 9.6A2 2 0 0112.4 17H7.6a2 2 0 01-1.99-1.99L5 5zM9 3a1 1 0 00-1 1v1h4V4a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                  Supprimer
                </button>
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
              <button type="button" onClick={() => { if (!uploadingLocal) fileInputRef.current?.click(); }} disabled={uploadingLocal} className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-medium flex items-center gap-2 transition-colors">{uploadingLocal ? <Spinner size={16} /> : 'Ajouter des fichiers (images/vidéos, max 6)'}</button>
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
                    className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b5566]/10 text-[#0b5566] hover:bg-[#0b5566]/20 text-sm font-medium transition-colors w-full sm:w-auto"
                  >
                    {t('feed.identify')}
                    {selectedChildIdsLocal.length > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-[#0b5566] text-white">{selectedChildIdsLocal.length}</span>
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
          <div className="text-gray-800 break-words text-sm leading-relaxed">{post.text}</div>
        </div>
      ) : (
        <div className="mt-3">
          <div className="border border-gray-200 rounded-xl p-3">
            <textarea autoFocus onMouseDown={e => e.stopPropagation()} value={val} onChange={e => setVal(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20" />
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
              }} className="px-3 py-1.5 rounded-xl bg-gray-100 text-xs font-medium hover:bg-gray-200 transition-colors">Annuler</button>
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
              }} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white text-xs font-medium hover:opacity-90 transition-opacity">Sauvegarder</button>
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
