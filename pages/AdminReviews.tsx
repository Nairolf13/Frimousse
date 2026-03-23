import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

type Review = {
  id: string;
  authorName?: string | null;
  content: string;
  rating?: number | null;
  approved: boolean;
  centerId?: string | null;
  createdAt: string;
};

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const [newUnapprovedCount, setNewUnapprovedCount] = useState(0);
  const baselineUnapprovedRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
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

  const load = useCallback(async (status: 'all' | 'pending' | 'approved' = filter, pageNum = page) => {
    setLoading(true);
    try {
      const take = 10;
      const url = `/api/reviews/admin?status=${encodeURIComponent(status)}&limit=${take}&page=${pageNum}`;
      const res = await fetchWithRefresh(url, { credentials: 'include' });
      const json = await res.json();
      setReviews(Array.isArray(json.reviews) ? json.reviews : []);
      setTotalCount(typeof json.totalCount === 'number' ? json.totalCount : null);
    } catch (e) {
      console.error('Failed to load reviews', e);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { void load(filter); }, [filter, load]);

  // Poll for new unapproved reviews and show a small banner when new ones arrive.
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetchWithRefresh(`/api/reviews/admin?status=${encodeURIComponent(filter)}`, { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        const list: Review[] = Array.isArray(json.reviews) ? json.reviews : json;
        const unapproved = list.filter(r => !r.approved).length;
        const baseline = baselineUnapprovedRef.current;
        if (baseline === null) {
          baselineUnapprovedRef.current = unapproved;
          return;
        }
        if (unapproved > baseline) {
          setNewUnapprovedCount(unapproved - baseline);
          setShowNewBanner(true);
        }
        // don't update baseline here — baseline updates when admin refreshes / views
      } catch {
        // ignore polling errors
      }
    };

    // start immediate check after a small delay so initial load can set baseline
    const start = window.setTimeout(() => { void check(); }, 1500);
    pollRef.current = window.setInterval(() => { void check(); }, 30_000);
    return () => {
      clearTimeout(start);
      if (pollRef.current != null) clearInterval(pollRef.current);
    };
  }, [filter]);


  const toggleApprove = async (id: string, approved: boolean) => {
    try {
      const res = await fetchWithRefresh(`/api/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved: !approved }) });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setReviews(r => r.map(x => x.id === id ? (json.review || x) : x));
      setToast(!approved ? 'Avis approuvé.' : 'Avis retiré.');
      window.setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
      alert('Impossible de modifier l\'avis');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return;
    try {
      const res = await fetchWithRefresh(`/api/reviews/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      setReviews(r => r.filter(x => x.id !== id));
      setToast('Avis supprimé.');
      window.setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
      alert('Impossible de supprimer l\'avis');
    }
  };

  return (
    <div className={`min-h-screen bg-[#f4f7fa] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
        {toast && (
          <div className="fixed right-6 top-6 z-50">
            <div className="bg-green-600 text-white px-4 py-2 rounded shadow">{toast}</div>
          </div>
        )}
        <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
              </div>
              <div className="pt-0.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">Gestion des avis</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Seuls les administrateurs peuvent approuver ou supprimer les avis.</p>
              </div>
            </div>
          </div>

          {showNewBanner ? (
            <div className="mb-4 p-3 rounded bg-blue-50 border border-blue-100 flex items-center justify-between">
              <div className="text-sm text-blue-700">{newUnapprovedCount} nouvel{newUnapprovedCount > 1 ? 's' : ''} avis en attente</div>
              <div className="flex items-center gap-2">
                <button onClick={async () => { await load(); baselineUnapprovedRef.current = reviews.filter(r => !r.approved).length; setShowNewBanner(false); }} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Voir</button>
                <button onClick={() => { baselineUnapprovedRef.current = reviews.filter(r => !r.approved).length; setShowNewBanner(false); }} className="px-3 py-1 rounded bg-transparent border border-gray-200 text-sm">Ignorer</button>
              </div>
            </div>
          ) : null}

          {loading ? <div className="bg-white rounded-2xl shadow p-8 flex items-center justify-center gap-3 text-gray-400"><svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12a8 8 0 018-8"/><path d="M12 4v4m0 12v4M4 12H0m24 0h-4"/></svg>Chargement…</div> : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm text-gray-600">Filtrer :</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-[#0b5566] text-white' : 'bg-white border'}`}>Tous</button>
                  <button onClick={() => setFilter('pending')} className={`px-3 py-1 rounded text-sm ${filter === 'pending' ? 'bg-[#0b5566] text-white' : 'bg-white border'}`}>En attente</button>
                  <button onClick={() => setFilter('approved')} className={`px-3 py-1 rounded text-sm ${filter === 'approved' ? 'bg-[#0b5566] text-white' : 'bg-white border'}`}>Publiés</button>
                </div>
              </div>
              {reviews.length === 0 ? <div className="text-gray-500">Aucun avis.</div> : reviews.map(r => (
                <div key={r.id} className="bg-white p-4 rounded shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{r.authorName || 'Anonyme'}</div>
                      <div className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleApprove(r.id, r.approved)} className={`px-3 py-1 rounded text-sm ${r.approved ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {r.approved ? 'Rejeter' : 'Approuver'}
                      </button>
                      <button onClick={() => remove(r.id)} className="px-3 py-1 rounded bg-red-100 text-red-700 text-sm">Supprimer</button>
                    </div>
                  </div>
                  <div className="mt-3 text-gray-800 whitespace-pre-wrap">{r.content}</div>
                  {typeof r.rating === 'number' && <div className="mt-2 text-sm text-gray-500">Note: {r.rating}/5</div>}
                </div>
              ))}
              {/* Pagination controls */}
              {totalCount !== null && totalCount > 10 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button disabled={page === 1} onClick={() => { const p = Math.max(1, page - 1); setPage(p); void load(filter, p); }} className="px-3 py-1 border rounded">Préc.</button>
                  <div className="text-sm text-gray-600">Page {page} / {Math.ceil((totalCount || 0) / 10)}</div>
                  <button disabled={page >= Math.ceil((totalCount || 0) / 10)} onClick={() => { const p = page + 1; setPage(p); void load(filter, p); }} className="px-3 py-1 border rounded">Suiv.</button>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
