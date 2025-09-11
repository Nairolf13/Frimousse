import { useEffect, useState, useRef } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useAuth } from '../src/context/AuthContext';
import type { User as AuthUser } from '../src/context/AuthContext';

type Media = { id: string; url: string; thumbnailUrl?: string };
type Comment = { id?: string; authorName: string; authorId?: string; timeAgo: string; text: string };
type Post = { id: string; text?: string; createdAt: string; author?: { name?: string }; authorId?: string; medias?: Media[]; likes?: number; commentsCount?: number; shares?: number; comments?: Comment[] };

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
  return (
    <form onSubmit={e => { e.preventDefault(); if (val.trim()) { onSubmit(postId, val.trim()); setVal(''); } }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Écrire un commentaire..." className="flex-1 border rounded px-2 py-2 sm:px-3 sm:py-2 text-sm" />
      <button type="submit" className="text-indigo-600 px-3 py-2 text-sm sm:text-base whitespace-nowrap w-full sm:w-auto">Envoyer</button>
    </form>
  );
}

export default function Feed() {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
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
  const [loading, setLoading] = useState(false);
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [likers, setLikers] = useState<{ id: string; name: string }[]>([]);
  const pressTimerRef = useRef<number | null>(null);
  const [likesModalPos, setLikesModalPos] = useState<{ x: number; y: number } | null>(null);
  const postRefs = useRef<Record<string, HTMLElement | null>>({});
  // filter removed - not used anymore
  const { user } = useAuth();
  // AuthContext's User may include extra runtime fields (id, centerId) returned by the API
  const currentUser = user as (AuthUser & { id?: string; centerId?: string }) | null;
  const [centerName, setCenterName] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
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
    loadPosts();
  }, []);

  // load center name when AuthContext user is available ( mirrors Sidebar behaviour )
  useEffect(() => {
    let mounted = true;
    async function loadCenter() {
      try {
        const centerId = currentUser?.centerId;
        if (centerId) {
          const res = await fetch(`api/centers/${centerId}`, { credentials: 'include' });
          if (!mounted) return;
          if (res.ok) {
            const data = await res.json();
            setCenterName(data.name || null);
            return;
          }
        }
      } catch {
        // ignore
      }
      if (mounted) setCenterName(null);
    }
    loadCenter();
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
        // fetch consent summary for each child in parallel
        const consentResults = await Promise.all(mapped.map(async (c) => {
          try {
            const r = await fetchWithRefresh(`api/children/${c.id}/photo-consent-summary`, { credentials: 'include' });
            if (!r.ok) return { id: c.id, allowed: false };
            const b = await r.json();
            return { id: c.id, allowed: !!b.allowed };
          } catch {
              return { id: c.id, allowed: false };
            }
        }));
        const cm: Record<string, boolean> = {};
        consentResults.forEach(r => { cm[r.id] = !!r.allowed; });
        setConsentMap(cm);
      } catch (e) {
        const err = e as unknown;
        if (import.meta.env.DEV) console.error('Failed to load children/consents', err);
        else console.error('Failed to load children/consents', err instanceof Error ? err.message : String(err));
      }
    }
    loadChildrenAndConsents();
    return () => { mounted = false; };
  }, [files]);

  async function loadPosts() {
    try {
      const res = await fetchWithRefresh('api/feed');
      if (!res.ok) return;
      const body = await res.json();
      setPosts(body.posts || []);
    } catch (e) {
      const err = e as unknown;
      if (import.meta.env.DEV) console.error('Failed to load feed', err);
      else console.error('Failed to load feed', err instanceof Error ? err.message : String(err));
    }
  }

  async function toggleLike(postId: string) {
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
  }

  async function loadLikers(postId: string) {
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
  }

  function startPress(postId: string) {
    // start long-press timer (600ms)
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    pressTimerRef.current = window.setTimeout(async () => {
      await loadLikers(postId);
      // compute post center position and open modal there
      try {
        const el = postRefs.current[postId];
        if (el) {
          const rect = el.getBoundingClientRect();
          // center point of the post in viewport coords
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          // clamp within viewport with some padding so modal doesn't touch edges
          const padding = 80;
          const top = Math.min(Math.max(cy, padding), window.innerHeight - padding);
          const left = Math.min(Math.max(cx, 16), window.innerWidth - 16);
          setLikesModalPos({ x: left, y: top });
        } else {
          setLikesModalPos(null);
        }
      } catch {
        setLikesModalPos(null);
      }
      setLikesModalOpen(true);
      pressTimerRef.current = null;
    }, 600);
  }

  function endPressShort(postId: string) {
    // if timer still exists, treat as short press
    if (pressTimerRef.current) {
  clearTimeout(pressTimerRef.current);
  pressTimerRef.current = null;
      // short press: toggle like
      toggleLike(postId);
    }
  }

  function cancelPress() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

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

      // Server-only upload: always POST FormData to api/feed (safer for private photos)
      if (files.length > 0) {
        const fd = new FormData();
        fd.append('text', text);
        for (const f of files) fd.append('images', f, f.name);
        if (selectedChildIds && selectedChildIds.length) {
          for (const cid of selectedChildIds) fd.append('taggedChildIds[]', cid);
        }

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
      } else {
        // Fallback server upload when no anon key available or no files
        const fd = new FormData();
        fd.append('text', text);
        for (const f of files) fd.append('images', f, f.name);
        // include tagged children when present
        if (selectedChildIds && selectedChildIds.length) {
          for (const cid of selectedChildIds) fd.append('taggedChildIds[]', cid);
        }

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
      }
    } catch (err) {
      console.error(err);
      showError('Erreur réseau', 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
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
    <div className="relative z-0 min-h-screen bg-[#fcfcff] p-4 md:pl-64 w-full max-w-full overflow-x-hidden box-border">
      <div className="max-w-7xl mx-auto w-full max-w-full px-2 sm:px-4 md:px-6 overflow-x-hidden box-border children-responsive-row">
          <div className="max-w-4xl mx-auto w-full">
            <div className="mb-6 p-0">
              <div className="bg-white/30 backdrop-blur-sm rounded-3xl p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 w-full">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1 text-left">Fil d'Actualité</h1>
            <div className="text-gray-400 text-base text-left">{centerName ? `• ${centerName}` : "Actualités de votre centre"}</div>
          </div>
        </div>

        {/* Composer */}
  <form onSubmit={handleSubmit} className="bg-[#f0f9ff] rounded-2xl shadow p-3 md:p-6 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="text-xs sm:text-sm font-semibold text-gray-700">{currentUser?.name || 'Utilisateur'}</div>
              <div className="text-xs text-gray-400 mb-2">{centerName ? `• ${centerName}` : ''}</div>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Que voulez-vous partager aujourd'hui ?" className="w-full border rounded p-2 sm:p-3 bg-gray-50 min-h-[60px] sm:min-h-[80px] text-sm sm:text-base" />
              <div className="flex flex-col sm:flex-row items-center justify-between mt-3 gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 w-full sm:w-auto">
                  {/* Camera capture input (opens device camera on supported mobile) */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const input = e.currentTarget as HTMLInputElement;
                        const newFiles = Array.from(input.files || []);
                        if (newFiles.length === 0) return;
                        setFiles(prev => [...prev, ...newFiles]);
                        // reset so the same file can be selected/captured again
                        input.value = '';
                      }}
                    />
                    <span className="inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">📷 Photo</span>
                  </label>
                  {/* Gallery input (choose existing images) */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const input = e.currentTarget as HTMLInputElement;
                        const newFiles = Array.from(input.files || []);
                        if (newFiles.length === 0) return;
                        setFiles(prev => [...prev, ...newFiles]);
                        input.value = '';
                      }}
                    />
                    <span className="inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs sm:text-sm">🖼 Galerie</span>
                  </label>
                  <span className="text-xs text-gray-400">{files.length === 0 ? 'Aucune image sélectionnée' : `${files.length} image(s)`}</span>
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
                          aria-label="Identifier"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-3 sm:py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 text-sm w-full sm:w-auto shadow-sm"
                        >
                          Identifier
                          {selectedChildIds.length > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">{selectedChildIds.length}</span>
                          )}
                        </button>
                      </div>

                      {/* Desktop dropdown (visible on sm+) */}
                      <div className="hidden sm:block">
                        {showTagMenu && (
                          <div className="absolute z-40 mt-2 w-64 bg-white border rounded shadow-lg p-3 max-h-56 overflow-auto">
                            <div className="text-sm font-semibold mb-2">Sélectionner des enfants</div>
                            {availableChildren.length === 0 ? (
                              <div className="text-sm text-gray-500">Aucun enfant disponible</div>
                            ) : (
                              <div className="grid gap-2">
                                {/* 'Pas d'enfant' option at top */}
                                            <label className="flex items-center gap-2 text-sm">
                                              <input type="checkbox" checked={noChildSelected} onChange={(e) => {
                                                if (e.target.checked) {
                                                  setNoChildSelected(true);
                                                  setSelectedChildIds([]);
                                                } else {
                                                  setNoChildSelected(false);
                                                }
                                                setShowIdentifyWarning(false);
                                              }} />
                                              <span className="font-medium">Pas d'enfant</span>
                                            </label>
                                {availableChildren.map(c => {
                                  const allowed = consentMap[c.id] ?? false;
                                  const checked = selectedChildIds.includes(c.id);
                                  return (
                                    <label key={c.id} className="flex items-center gap-2 text-sm">
                                      <input type="checkbox" checked={checked} onChange={(e) => {
                                        // selecting a real child disables 'Pas d'enfant'
                                        if (e.target.checked) {
                                          setNoChildSelected(false);
                                          setSelectedChildIds(prev => [...prev, c.id]);
                                        } else setSelectedChildIds(prev => prev.filter(id => id !== c.id));
                                        setShowIdentifyWarning(false);
                                      }} disabled={noChildSelected} />
                                      <span className="truncate">{c.name}</span>
                                      {!allowed && <span className="text-xs text-red-500 ml-2">(pas d'autorisation)</span>}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            <div className="mt-3 flex justify-end">
                              <button onClick={() => setShowTagMenu(false)} className="px-3 py-1 bg-gray-100 rounded text-sm">Fermer</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mobile modal (visible on small screens) */}
                      {showTagMenu && (
                        <div className="sm:hidden fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 pt-10">
                          <div className="mx-4 w-full max-w-md bg-white rounded-xl p-4 max-h-[85vh] overflow-auto shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-lg font-semibold">Taguer des enfants</div>
                              <button onClick={() => setShowTagMenu(false)} className="text-gray-600">Fermer</button>
                            </div>
                              {availableChildren.length === 0 ? (
                                <div className="text-sm text-gray-500">Aucun enfant disponible</div>
                              ) : (
                                <div className="space-y-2">
                                  {/* top: Pas d'enfant */}
                                  <label className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-base p-2 border rounded">
                                    <div className="flex items-center gap-2 min-w-0">
                                          <input type="checkbox" checked={noChildSelected} onChange={(e) => {
                                        if (e.target.checked) {
                                          setNoChildSelected(true);
                                          setSelectedChildIds([]);
                                        } else setNoChildSelected(false);
                                        setShowIdentifyWarning(false);
                                      }} />
                                      <span className="break-words font-medium">Pas d'enfant</span>
                                    </div>
                                    <span className="text-xs text-gray-500 sm:ml-2">Cocher si aucune personne identifiable</span>
                                  </label>
                                  {availableChildren.map(c => {
                                    const allowed = consentMap[c.id] ?? false;
                                    const checked = selectedChildIds.includes(c.id);
                                    return (
                                      <label key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-base p-2 border rounded">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <input type="checkbox" checked={checked} disabled={noChildSelected} onChange={(e) => {
                                            if (e.target.checked) {
                                              setNoChildSelected(false);
                                              setSelectedChildIds(prev => [...prev, c.id]);
                                            } else setSelectedChildIds(prev => prev.filter(id => id !== c.id));
                                            setShowIdentifyWarning(false);
                                          }} />
                                          <span className="break-words">{c.name}</span>
                                        </div>
                                        {!allowed && <span className="text-xs text-red-500 sm:ml-2">Pas d'autorisation</span>}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            <div className="mt-4">
                              <button onClick={() => setShowTagMenu(false)} className="w-full px-4 py-2 bg-indigo-600 text-white rounded">Valider</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button disabled={loading || (selectedChildIds.length > 0 && selectedChildIds.some(id => !consentMap[id]))} className="bg-indigo-600 text-white px-4 py-2 rounded-full w-full sm:w-auto max-w-full">{loading ? 'Envoi...' : 'Publier'}</button>
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
                        <div key={i} className="w-full h-16 sm:h-20 md:h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          <img src={p} className="w-full h-full object-contain" />
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
            <article key={post.id} className={`${postBgPalette[idx % postBgPalette.length]} rounded-2xl border border-gray-100 shadow-sm p-3 md:p-6 w-full mx-auto`}>
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
                        onPointerDown={() => startPress(post.id)}
                        onPointerUp={() => endPressShort(post.id)}
                        onPointerLeave={() => cancelPress()}
                        onContextMenu={(e) => { e.preventDefault(); }}
                        className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                      >
                        ❤️ <span>{post.likes ?? 0}</span>
                      </button>
                      <button onClick={async () => { setOpenCommentsFor(post.id); await loadComments(post.id); }} className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">💬 <span>{post.commentsCount ?? 0}</span></button>
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
            <div className="fixed inset-0 z-60 bg-black/40" onClick={() => { setLikesModalOpen(false); setLikers([]); setLikesModalPos(null); }}>
              {/* position the modal element absolutely at the computed coords; if no coords, center it */}
              <div style={likesModalPos ? { left: likesModalPos.x - 160, top: likesModalPos.y - 80 } : undefined} className={`absolute ${likesModalPos ? '' : 'inset-0 flex items-center justify-center'}`} onClick={e => e.stopPropagation()}>
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4" style={likesModalPos ? { position: 'absolute' } : undefined}>
                  <h3 className="text-lg font-semibold mb-3">Personnes qui ont aimé</h3>
                  <div className="max-h-60 overflow-auto">
                    {likers.length === 0 ? <div className="text-sm text-gray-500">Aucun like trouvé</div> : (
                      <ul className="space-y-2">
                        {likers.map(u => <li key={u.id} className="text-sm text-gray-800">{u.name}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="mt-4 text-right">
                    <button onClick={() => { setLikesModalOpen(false); setLikers([]); setLikesModalPos(null); }} className="px-3 py-1 rounded bg-indigo-600 text-white">Fermer</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
  {openCommentsFor && (
          <CommentsModal
            onClose={() => setOpenCommentsFor(null)}
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

function CommentsModal({ onClose, comments, loading, currentUser, onUpdateComment, onDeleteComment }: { onClose: () => void; comments: Comment[]; loading?: boolean; currentUser: (AuthUser & { id?: string; role?: string }) | null; onUpdateComment: (commentId: string, newText: string) => Promise<void>; onDeleteComment: (commentId: string) => Promise<void>; }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full sm:w-[720px] max-h-[90vh] overflow-hidden ring-1 ring-indigo-50">
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
              <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMenuOpen(false)}>
                <div className="bg-white w-72 rounded-lg shadow-lg ring-1 ring-gray-100" onClick={e => e.stopPropagation()}>
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
              </div>
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
              <button onClick={() => { setEditing(false); setVal(comment.text); }} className="px-3 py-1 rounded bg-gray-100">Annuler</button>
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

  return (
    <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md ring-1 ring-indigo-50">
        <div className="px-6 py-4">
          <h4 className="text-lg font-semibold text-gray-800 text-center break-words">{title}</h4>
          <p className="text-sm text-gray-600 mt-2 text-center break-words whitespace-normal">
            {description}
          </p>
        </div>
        <div className="px-6 py-3 flex flex-col sm:flex-row justify-center gap-3 border-t">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-100">Annuler</button>
          <button onClick={confirmHandler} disabled={loading} className="px-4 py-2 rounded bg-red-600 text-white">{loading ? 'Suppression...' : 'Supprimer'}</button>
        </div>
      </div>
    </div>
  );
}

function PostItem({ post, bgClass, currentUser, onUpdatePost, onDeletePost, onMediasChange }: { post: Post; bgClass?: string; currentUser: (AuthUser & { id?: string; role?: string }) | null; onUpdatePost: (postId: string, newText: string) => Promise<void>; onDeletePost: (postId: string) => Promise<void>; onMediasChange?: (postId: string, medias: Media[]) => void; }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(post.text || '');
  const [showConfirm, setShowConfirm] = useState(false);

  const role = currentUser?.role || '';
  const canEdit = !!currentUser && (currentUser.id === post.authorId || ['admin', 'super-admin'].includes(role));

  const mediaCount = post.medias ? post.medias.length : 0;

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

  async function save() {
    const trimmed = val.trim();
    if (!trimmed) return alert('Le post ne peut pas être vide');
    try {
      const res = await fetchWithRefresh(`api/feed/${post.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: trimmed }) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        return alert(b.message || 'Échec de la modification');
      }
      await onUpdatePost(post.id, trimmed);
      setEditing(false);
      setMenuOpen(false);
    } catch (e) {
      console.error('Failed to edit post', e);
      alert('Erreur réseau');
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
    if (!files || files.length === 0) return;
    const currentCount = (post.medias || []).length;
    const maxAllowed = 6;
    const remaining = Math.max(0, maxAllowed - currentCount);
    if (remaining === 0) {
      return alert(`Vous avez déjà ${currentCount} images. Le maximum est ${maxAllowed}.`);
    }
    const fileArray = Array.from(files);
    if (fileArray.length > remaining) {
      alert(`Vous pouvez ajouter seulement ${remaining} image(s) supplémentaires. Seules les ${remaining} premières seront prises.`);
    }
    const fd = new FormData();
    for (const f of fileArray.slice(0, remaining)) fd.append('images', f, f.name);
    try {
      const res = await fetchWithRefresh(`api/feed/${post.id}/media`, { method: 'POST', body: fd });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        return alert(b.message || 'Échec de l\'upload');
      }
      const body = await res.json();
      const newMedias: Media[] = body.medias || [];
      if (onMediasChange) onMediasChange(post.id, (post.medias || []).concat(newMedias));
    } catch (e) {
      console.error('Upload failed', e);
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
                <button type="button" onClick={() => openLightbox(idx)} className={`w-full h-full block`}>
                  <img src={m.url} alt={post.text ? post.text.slice(0, 80) : 'photo'} className={`w-full h-full object-contain`} />
                  {isLastVisible && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-lg font-semibold">+{(post.medias || []).length - 4}</div>
                  )}
                </button>
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

      {/* Lightbox / slideshow */}
      {lightboxOpen && post.medias && post.medias.length > 0 && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4" onClick={closeLightbox}>
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={prevLightbox} aria-label="Précédent" className="absolute left-2 sm:left-6 text-white bg-black/30 hover:bg-black/40 rounded-full p-2">‹</button>
            <img src={post.medias[lightboxIndex].url} className="max-w-full max-h-[85vh] object-contain rounded" />
            <button onClick={nextLightbox} aria-label="Suivant" className="absolute right-2 sm:right-6 text-white bg-black/30 hover:bg-black/40 rounded-full p-2">›</button>
            <button onClick={closeLightbox} aria-label="Fermer" className="absolute top-2 right-2 text-white bg-black/30 rounded-full p-2">✕</button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/30 px-3 py-1 rounded">{lightboxIndex + 1} / {post.medias.length}</div>
          </div>
        </div>
      )}
      {canEdit && editing && (
        <div className="mt-3">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleUploadImages(e.target.files)} />
            <span className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">Ajouter des images (max 6)</span>
          </label>
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
              <button onClick={() => { setEditing(false); setVal(post.text || ''); }} className="px-3 py-1 rounded bg-gray-100">Annuler</button>
              <button onClick={save} className="px-3 py-1 rounded bg-indigo-600 text-white">Sauvegarder</button>
            </div>
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
