import { useEffect, useState } from 'react';
import NannyCalendar from '../components/NannyCalendar';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

export default function MonPlanning() {
  const [nannyId, setNannyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nannies, setNannies] = useState<Array<{ id: string; name: string }>>([]);

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
    <div className="min-h-screen bg-[#f7f4d7] flex flex-col md:flex-row">
      <main className="flex-1 flex flex-col items-center py-4 px-2 md:py-8 md:px-2 md:ml-64">
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow p-4 md:p-10 min-h-[600px] md:min-h-[700px] flex flex-col" style={{ border: '1px solid #fcdcdf' }}>
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#0b5566]">Mon planning</h1>
            {isAdmin && nannies.length > 0 && (
              <div className="mb-4 flex justify-center">
                <label className="mr-2 self-center">Voir le planning de :</label>
                <select value={nannyId || ''} onChange={e => setNannyId(e.target.value)} className="border rounded px-2 py-1">
                  {nannies.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-4 rounded-lg" style={{ background: '#a9ddf2' }}>
                <NannyCalendar nannyId={nannyId} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
