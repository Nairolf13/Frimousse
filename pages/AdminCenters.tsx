import { useEffect, useState } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar } from 'react-icons/hi';

type Center = {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    users: number;
    parents: number;
    children: number;
    nannies: number;
  };
};

export default function AdminCenters() {
  const API_URL = import.meta.env.VITE_API_URL ?? '/api';
  const [isShortLandscape, setIsShortLandscape] = useState(false);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 768px) and (max-height: 600px)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange); else mql.addListener(onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => { try { if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange); else mql.removeListener(onChange); } catch { /* ignore */ } window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange); };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithRefresh(`${API_URL}/admin/centers`, { credentials: 'include' });
        if (!mounted) return;
        if (res.status === 403) {
          setError('Accès refusé — administrateur requis.');
          setCenters([]);
          return;
        }
        if (!res.ok) throw new Error('Erreur serveur');
        const json = await res.json();
        setCenters(Array.isArray(json.data) ? json.data : []);
      } catch (e: unknown) {
        if (typeof e === 'object' && e !== null && 'name' in e && (e as { name?: unknown }).name === 'AbortError') return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setCenters([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [API_URL]);

  return (
    <div className={`relative z-0 min-h-screen bg-gray-50 p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <main className="flex-1 flex flex-col items-center py-4 px-2 md:py-8 md:px-4">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight" style={{ color: '#0b5566' }}>Centres</h1>
              <div className="text-base md:text-lg font-medium mb-4 md:mb-6" style={{ color: '#08323a' }}>Liste de tous les centres créés</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded">{error}</div>
          )}

          {loading && <div className="mb-4">Chargement...</div>}

          {!loading && !error && (
            <>
              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-4">
                {centers.map(center => (
                  <div key={center.id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#eef9ff] flex items-center justify-center text-[#0b5566] font-semibold">
                          <HiOutlineOfficeBuilding className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">{center.name}</div>
                          <div className="text-sm text-gray-500">Créé le {new Date(center.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <HiOutlineUsers className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{center._count.users} utilisateurs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiOutlineUserGroup className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{center._count.parents} parents</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiOutlineHeart className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{center._count.children} enfants</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiOutlineCalendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{center._count.nannies} nounous</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop/tablet: table layout */}
              <div className="hidden md:block bg-white rounded-2xl shadow p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="text-left text-sm text-gray-500 border-b">
                      <tr>
                        <th className="py-3 px-4">Nom</th>
                        <th className="py-3 px-4">Créé le</th>
                        <th className="py-3 px-4">Utilisateurs</th>
                        <th className="py-3 px-4">Parents</th>
                        <th className="py-3 px-4">Enfants</th>
                        <th className="py-3 px-4">Nounous</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {centers.map(center => (
                        <tr key={center.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <HiOutlineOfficeBuilding className="w-5 h-5 text-gray-400" />
                              {center.name}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {new Date(center.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <HiOutlineUsers className="w-4 h-4 text-gray-400" />
                              {center._count.users}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <HiOutlineUserGroup className="w-4 h-4 text-gray-400" />
                              {center._count.parents}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <HiOutlineHeart className="w-4 h-4 text-gray-400" />
                              {center._count.children}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <HiOutlineCalendar className="w-4 h-4 text-gray-400" />
                              {center._count.nannies}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {centers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">Aucun centre trouvé.</div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}