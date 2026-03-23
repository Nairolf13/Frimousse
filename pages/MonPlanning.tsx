import { useEffect, useState } from 'react';
import NannyCalendar from '../components/NannyCalendar';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import PageLoader from '../components/PageLoader';

const API_URL = import.meta.env.VITE_API_URL;

export default function MonPlanning() {
  const [nannyId, setNannyId] = useState<string | null>(null);
  const [nannyName, setNannyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nannies, setNannies] = useState<Array<{ id: string; name: string }>>([]);
  const [exportMonth, setExportMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [exporting, setExporting] = useState(false);
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
          setNannyName(user.name || '');
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
              if (simplified.length > 0) { setNannyId(simplified[0].id); setNannyName(simplified[0].name); }
            }
          } catch (e) {
            console.error('Failed to load nannies for admin', e);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader title="Mon planning" icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>} />;
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
            <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
              {isAdmin && nannies.length > 0 && (
                <>
                  <label className="text-sm text-gray-600 font-medium">Voir le planning de :</label>
                  <select value={nannyId || ''} onChange={e => { const n = nannies.find(x => x.id === e.target.value); setNannyId(e.target.value); setNannyName(n?.name || ''); }} className="border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300">
                    {nannies.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </>
              )}
              <input
                type="month"
                value={exportMonth}
                onChange={e => setExportMonth(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <button
                disabled={exporting || !nannyId}
                onClick={async () => {
                  if (!nannyId || exporting) return;
                  setExporting(true);
                  try {
                    const res = await fetch(`${API_URL}/nannies/${nannyId}/export-planning?month=${exportMonth}`, { credentials: 'include' });
                    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Erreur export PDF'); return; }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `planning_${exportMonth}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch { alert('Erreur lors de la génération du PDF'); }
                  finally { setExporting(false); }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b5566] text-white text-sm font-semibold shadow hover:opacity-90 transition disabled:opacity-50"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3"/></svg>
                {exporting ? 'Export...' : 'Exporter PDF'}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100 w-full">
            <NannyCalendar nannyId={nannyId} />
          </div>
      </div>
    </div>
  );
}
