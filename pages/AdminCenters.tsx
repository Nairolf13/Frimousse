import { useEffect, useState } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

type Center = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  region?: string;
  country?: string;
  email?: string;
  phone?: string;
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
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    region: '',
    country: '',
    email: '',
    phone: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<Center | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        const res = await fetchWithRefresh(`${API_URL}/centers`, { credentials: 'include' });
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

  const openEditModal = (center: Center) => {
    setEditingCenter(center);
    setEditForm({
      name: center.name || '',
      address: center.address || '',
      city: center.city || '',
      postalCode: center.postalCode || '',
      region: center.region || '',
      country: center.country || '',
      email: center.email || '',
      phone: center.phone || ''
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditingCenter(null);
    setEditForm({
      name: '',
      address: '',
      city: '',
      postalCode: '',
      region: '',
      country: '',
      email: '',
      phone: ''
    });
    setShowEditModal(false);
  };

  const handleUpdateCenter = async () => {
    if (!editingCenter || !editForm.name.trim()) return;

    try {
      const res = await fetchWithRefresh(`${API_URL}/centers/${editingCenter.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!res.ok) throw new Error('Erreur lors de la mise à jour');

      await res.json();
      setCenters(prev => prev.map(c => c.id === editingCenter.id ? { ...c, ...editForm } : c));
      closeEditModal();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la mise à jour');
    }
  };

  const openDeleteModal = (center: Center) => {
    setCenterToDelete(center);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setCenterToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteCenter = async () => {
    if (!centerToDelete) return;

    setDeleting(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/centers/${centerToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      setCenters(prev => prev.filter(c => c.id !== centerToDelete.id));
      closeDeleteModal();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

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
                    <div className="flex items-start justify-between mb-3">
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

                    {/* Informations du centre */}
                    {(center.email || center.phone || center.address || center.city) && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                        {center.email && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {center.email}
                          </div>
                        )}
                        {center.phone && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {center.phone}
                          </div>
                        )}
                        {(center.address || center.city) && (
                          <div className="flex items-start gap-2 text-gray-700">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              {center.address && <div>{center.address}</div>}
                              {(center.postalCode || center.city) && (
                                <div>{center.postalCode} {center.city}</div>
                              )}
                              {center.region && <div>{center.region}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(center)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                        Modifier
                      </button>
                      <button
                        onClick={() => openDeleteModal(center)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                        Supprimer
                      </button>
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
                        <th className="py-3 px-4">Centre</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Adresse</th>
                        <th className="py-3 px-4">Statistiques</th>
                        <th className="py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {centers.map(center => (
                        <tr key={center.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <HiOutlineOfficeBuilding className="w-5 h-5 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">{center.name}</div>
                                <div className="text-xs text-gray-500">Créé le {new Date(center.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {center.email && (
                              <div className="flex items-center gap-1 mb-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs">{center.email}</span>
                              </div>
                            )}
                            {center.phone && (
                              <div className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-xs">{center.phone}</span>
                              </div>
                            )}
                            {!center.email && !center.phone && (
                              <span className="text-xs text-gray-400">Non renseigné</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700">
                            {center.address || center.city ? (
                              <div className="text-xs">
                                {center.address && <div>{center.address}</div>}
                                {(center.postalCode || center.city) && (
                                  <div>{center.postalCode} {center.city}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Non renseignée</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm">
                            <div className="flex flex-wrap gap-3">
                              <div className="flex items-center gap-1">
                                <HiOutlineUsers className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-700">{center._count.users}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <HiOutlineUserGroup className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-700">{center._count.parents}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <HiOutlineHeart className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-700">{center._count.children}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <HiOutlineCalendar className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-700">{center._count.nannies}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(center)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <HiOutlinePencil className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(center)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <HiOutlineTrash className="w-5 h-5" />
                              </button>
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

      {/* Modal de modification */}
      {showEditModal && editingCenter && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Modifier le centre</h2>
            
            {/* Section informations principales */}
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <HiOutlineOfficeBuilding className="w-4 h-4" />
                  Informations du centre
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du centre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nom du centre"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="contact@centre.fr"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section adresse */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Adresse
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse complète
                    </label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="123 rue Example"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code postal
                      </label>
                      <input
                        type="text"
                        value={editForm.postalCode}
                        onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="75001"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Paris"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Région
                      </label>
                      <input
                        type="text"
                        value={editForm.region}
                        onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Île-de-France"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pays
                      </label>
                      <input
                        type="text"
                        value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="France"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateCenter}
                disabled={!editForm.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enregistrer
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteModal && centerToDelete && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Supprimer le centre</h2>
            
            <p className="text-gray-700 mb-2">
              Êtes-vous sûr de vouloir supprimer le centre <strong>{centerToDelete.name}</strong> ?
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Attention : Cette action est irréversible et supprimera :
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 ml-4">
                <li>• {centerToDelete._count.users} utilisateurs</li>
                <li>• {centerToDelete._count.parents} parents</li>
                <li>• {centerToDelete._count.children} enfants</li>
                <li>• {centerToDelete._count.nannies} nounous</li>
                <li>• Toutes les données associées</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteCenter}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}