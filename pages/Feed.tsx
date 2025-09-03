import { useEffect, useState } from 'react';
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
    <form onSubmit={e => { e.preventDefault(); if (val.trim()) { onSubmit(postId, val.trim()); setVal(''); } }} className="flex items-center gap-2">
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Écrire un commentaire..." className="flex-1 border rounded px-3 py-2 text-sm" />
      <button type="submit" className="text-indigo-600 px-3 py-2">Envoyer</button>
    </form>
  );
}

export default function Feed() {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PHOTOS' | 'ACTIVITIES'>('ALL');
  const { user } = useAuth();
  // AuthContext's User may include extra runtime fields (id, centerId) returned by the API
  const currentUser = user as (AuthUser & { id?: string; centerId?: string }) | null;
  const [centerName, setCenterName] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsForPost, setCommentsForPost] = useState<Record<string, Comment[]>>({});

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
      console.error('Failed to load comments', e);
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
    return () => p.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  async function loadPosts() {
    try {
      const res = await fetchWithRefresh('api/feed');
      if (!res.ok) return;
      const body = await res.json();
      setPosts(body.posts || []);
    } catch (e) {
      console.error('Failed to load feed', e);
    }
  }

  async function toggleLike(postId: string) {
    try {
      const res = await fetchWithRefresh(`api/feed/${postId}/like`, { method: 'POST' });
      if (!res.ok) return;
      const body = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + (body.liked ? 1 : -1) } : p));
    } catch (e) {
      console.error('Like failed', e);
    }
  }

  async function addComment(postId: string, text: string) {
    try {
      const res = await fetchWithRefresh(`api/feed/${postId}/comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(b.message || 'Erreur commentaire');
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
      const fd = new FormData();
      fd.append('text', text);
      for (const f of files) fd.append('images', f, f.name);

      const res = await fetchWithRefresh('api/feed', { method: 'POST', body: fd });
      if (res.ok) {
        const created = await res.json();
        setPosts(prev => [created, ...prev]);
        setText('');
        setFiles([]);
      } else {
        const body = await res.json().catch(() => ({}));
        alert(body.message || 'Erreur lors de la publication');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-0 min-h-screen bg-[#fcfcff] p-4 md:pl-64 w-full">
      <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg> Fil d'Actualité</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setFilter('ALL')} className={`px-3 py-1 rounded-full ${filter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Tout</button>
            <button onClick={() => setFilter('PHOTOS')} className={`px-3 py-1 rounded-full ${filter === 'PHOTOS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Photos</button>
            <button onClick={() => setFilter('ACTIVITIES')} className={`px-3 py-1 rounded-full ${filter === 'ACTIVITIES' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Activités</button>
          </div>
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-4 mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 flex-shrink-0">{currentUser ? (currentUser.name || 'U').split(' ').map(s => s[0]).join('').toUpperCase().slice(0,2) : 'U'}</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-700">{currentUser?.name || 'Utilisateur'}</div>
              <div className="text-xs text-gray-400 mb-2">{centerName ? `• ${centerName}` : ''}</div>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Partagez un moment avec les enfants..." className="w-full border rounded p-3 bg-gray-50 min-h-[80px]" />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
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
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">📷 Photo</span>
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
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">🖼 Galerie</span>
                  </label>
                  <span className="text-xs text-gray-400">{files.length === 0 ? 'Aucune image sélectionnée' : `${files.length} image(s)`}</span>
                </div>
                <button disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-full">{loading ? 'Envoi...' : 'Publier'}</button>
              </div>
              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {previews.map((p, i) => (
                    <div key={i} className="w-full h-28 sm:h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
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
          {posts.map(post => (
            <article key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">{(post.author?.name || 'U').split(' ').map(s => s[0]).join('').slice(0,2)}</div>
                <div className="flex-1">
                  <PostItem post={post} currentUser={currentUser} onUpdatePost={async (id, newText) => {
                      setPosts(prev => prev.map(p => p.id === id ? { ...p, text: newText } : p));
                    }} onDeletePost={async (id) => {
                      setPosts(prev => prev.filter(p => p.id !== id));
                    }} onMediasChange={(id, medias) => {
                      setPosts(prev => prev.map(p => p.id === id ? { ...p, medias } : p));
                    }} />

                  {/* media rendering moved inside PostItem to allow inline edit/delete */}

                  <div className="mt-4 flex items-center justify-start text-sm text-gray-500">
                    <div className="flex items-center gap-6">
                      <button onClick={() => toggleLike(post.id)} className="flex items-center gap-2">❤️ <span>{post.likes ?? 0}</span></button>
                      <button onClick={async () => { setOpenCommentsFor(post.id); await loadComments(post.id); }} className="flex items-center gap-2">💬 <span>{post.commentsCount ?? 0}</span></button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <CommentBox postId={post.id} onSubmit={addComment} />
                  </div>
                </div>
              </div>
            </article>
          ))}
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
      </main>
    </div>
  );
}

function CommentsModal({ onClose, comments, loading, currentUser, onUpdateComment, onDeleteComment }: { onClose: () => void; comments: Comment[]; loading?: boolean; currentUser: (AuthUser & { id?: string; role?: string }) | null; onUpdateComment: (commentId: string, newText: string) => Promise<void>; onDeleteComment: (commentId: string) => Promise<void>; }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:w-[720px] max-h-[80vh] overflow-hidden ring-1 ring-indigo-50">
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
          <div className="p-4 overflow-auto max-h-[70vh]">
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
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center font-semibold shadow-sm">
          {String(comment.authorName || 'U').split(' ').map(s => s[0]).join('').toUpperCase().slice(0,2)}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">{comment.authorName}</div>
            <div className="text-xs text-gray-400">{comment.timeAgo}</div>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(s => !s)} className="text-gray-400 hover:text-gray-600 px-2 rounded bg-white hover:bg-gray-50 border border-transparent hover:border-gray-100">⋯</button>
            {menuOpen && (
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
        {!editing ? (
          <div className="mt-2 bg-white border border-gray-100 rounded-lg p-3 text-sm text-gray-800 shadow-sm">
            {comment.text}
          </div>
        ) : (
          <div className="mt-2">
            <textarea value={val} onChange={e => setVal(e.target.value)} className="w-full border rounded p-2 text-sm min-h-[64px]" />
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
          description="Voulez-vous vraiment supprimer ce commentaire ? Cette action est irréversible."
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
          <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        </div>
        <div className="px-6 py-3 flex justify-end gap-3 border-t">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-100">Annuler</button>
          <button onClick={confirmHandler} disabled={loading} className="px-4 py-2 rounded bg-red-600 text-white">{loading ? 'Suppression...' : 'Supprimer'}</button>
        </div>
      </div>
    </div>
  );
}

function PostItem({ post, currentUser, onUpdatePost, onDeletePost, onMediasChange }: { post: Post; currentUser: (AuthUser & { id?: string; role?: string }) | null; onUpdatePost: (postId: string, newText: string) => Promise<void>; onDeletePost: (postId: string) => Promise<void>; onMediasChange?: (postId: string, medias: Media[]) => void; }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(post.text || '');
  const [showConfirm, setShowConfirm] = useState(false);

  const role = currentUser?.role || '';
  const canEdit = !!currentUser && (currentUser.id === post.authorId || ['admin', 'super-admin'].includes(role));

  const mediaCount = post.medias ? post.medias.length : 0;

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
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('images', f, f.name);
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
          <div className="font-semibold text-gray-800">{post.author?.name || 'Utilisateur'}</div>
          <div className="text-xs text-gray-400">Il y a {timeAgo(post.createdAt)}</div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(s => !s)} className="text-gray-400 hover:text-gray-600 px-2 rounded bg-white hover:bg-gray-50 border border-transparent hover:border-gray-100">⋯</button>
          {menuOpen && (
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
      {!editing ? (
        <div className="mt-3 text-gray-800">{post.text}</div>
      ) : (
        <div className="mt-3">
          <textarea value={val} onChange={e => setVal(e.target.value)} className="w-full border rounded p-2 text-sm min-h-[80px]" />
          <div className="mt-2 flex gap-2 justify-end">
            <button onClick={() => { setEditing(false); setVal(post.text || ''); }} className="px-3 py-1 rounded bg-gray-100">Annuler</button>
            <button onClick={save} className="px-3 py-1 rounded bg-indigo-600 text-white">Sauvegarder</button>
          </div>
        </div>
      )}
      {/* medias display + controls */}
      {mediaCount > 0 && (
        <div className={`mt-3 grid gap-2 ${mediaCount === 1 ? 'grid-cols-1' : mediaCount === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {post.medias!.map(m => (
            <div key={m.id} className={`relative w-full ${mediaCount === 1 ? 'h-64 sm:h-80' : mediaCount === 2 ? 'h-56 sm:h-64' : 'h-48 sm:h-56'} bg-gray-100 rounded overflow-hidden flex items-center justify-center`}>
              {/* Use original media URL (not thumbnail) and show full image without cropping */}
              <img src={m.url} alt={post.text ? post.text.slice(0, 80) : 'photo'} className="max-w-full max-h-full object-contain" />
              {canEdit && editing && (
                <button onClick={() => handleDeleteMedia(m.id)} className="absolute top-2 right-2 bg-white rounded-full p-1 text-red-600 shadow">✕</button>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && editing && (
        <div className="mt-3">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleUploadImages(e.target.files)} />
            <span className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">Ajouter des images</span>
          </label>
        </div>
      )}
      {showConfirm && (
        <ConfirmationModal
          title="Supprimer la publication"
          description="Voulez-vous vraiment supprimer cette publication ? Cette action est irréversible."
          onCancel={() => setShowConfirm(false)}
          onConfirm={doDelete}
        />
      )}
    </>
  );
}
