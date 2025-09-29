import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center py-4 px-2 md:py-8 md:px-4 md:ml-64">
        {toast && (
          <div className="fixed right-6 top-6 z-50">
            <div className="bg-green-600 text-white px-4 py-2 rounded shadow">{toast}</div>
          </div>
        )}
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 w-full">
            <div className="self-start md:self-auto">
              <h1 className="text-2xl font-bold">Gestion des avis</h1>
            </div>
            <div className="flex-1 text-center min-w-0">
              <p className="text-sm text-gray-600">Seuls les administrateurs peuvent approuver ou supprimer les avis.</p>
            </div>
            <div className="w-24 md:w-32" />
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

          {loading ? <div>Chargement...</div> : (
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
      </main>
    </div>
  );
}
