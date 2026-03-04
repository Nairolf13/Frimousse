import { useEffect, useState } from 'react';
import NannyCalendar from '../components/NannyCalendar';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

export default function MonPlanning() {
  const [nannyId, setNannyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nannies, setNannies] = useState<Array<{ id: string; name: string }>>([]);
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

  useEffect(() => {
    fetchWithRefresh('api/me')
      .then(res => res.json())
      .then(async (user) => {
        if (user.role === 'nanny' && user.nannyId) {
          setNannyId(user.nannyId);
          return;
        }

        if (user.role === 'admin' || user.role === 'super-admin') {
          setIsAdmin(true);
          try {
            const r = await fetchWithRefresh('api/nannies');
            if (r.ok) {
              const list = await r.json();
              type NannyFromApi = { id?: string; name?: string };
              const simplified = Array.isArray(list)
                ? (list as NannyFromApi[]).map((n: NannyFromApi) => ({ id: String(n.id ?? ''), name: String(n.name ?? '') }))
                : [];
              setNannies(simplified);
              if (simplified.length > 0) setNannyId(simplified[0].id);
            }
          } catch (e) {
            console.error('Failed to load nannies for admin', e);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-[#0b5566]">Chargement...</div>;
  if (!nannyId) {
    if (isAdmin) return <div className="p-8 text-center text-red-500">Aucune nounou trouvée pour votre structure.</div>;
    return <div className="p-8 text-center text-red-500">Accès réservé aux nounous.</div>;
  }

  return (
    <div className={`min-h-screen bg-[#fcfcff] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 w-full">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight text-brand-500">Mon planning</h1>
              <div className="text-sm md:text-base font-medium text-brand-700/60">Gérez vos affectations</div>
            </div>
            {isAdmin && nannies.length > 0 && (
              <div className="flex items-center gap-2 self-start md:self-end">
                <label className="text-sm text-gray-600 font-medium">Voir le planning de :</label>
                <select value={nannyId || ''} onChange={e => setNannyId(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300">
                  {nannies.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100 w-full">
            <NannyCalendar nannyId={nannyId} />
          </div>
      </div>
    </div>
  );
}
