import { useEffect, useState } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar, HiOutlinePencil, HiOutlineTrash, HiOutlineDocumentReport } from 'react-icons/hi';

type Subscription = {
  plan: string;
  status: string;
  trialEnd?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

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
  adminName?: string | null;
  adminId?: string | null;
  adminCreatedAt?: string | null;
  createdAt: string;
  subscription?: Subscription | null;
  _count: {
    users: number;
    parents: number;
    children: number;
    nannies: number;
    reports: number;
  };
};

function SubBadge({ sub }: { sub: Subscription | null | undefined }) {
  const { t } = useI18n();
  if (!sub) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">{t('centers.subbadge.no_subscription', 'Aucun abonnement')}</span>;
  const statusMap: Record<string, { label: string; color: string }> = {
    active:   { label: t('subscription.status.active', 'Actif'),     color: 'bg-emerald-100 text-emerald-700' },
    trialing: { label: t('subscription.status.trialing', 'Essai'),     color: 'bg-blue-100 text-blue-700' },
    canceled: { label: t('subscription.status.canceled', 'Annulé'),    color: 'bg-red-100 text-red-700' },
    past_due: { label: t('subscription.status.past_due', 'Paiement en retard'),    color: 'bg-orange-100 text-orange-700' },
    unpaid:   { label: t('subscription.status.unpaid', 'Impayé'),    color: 'bg-orange-100 text-orange-700' },
    inactive: { label: t('subscription.status.inactive', 'Inactif'),   color: 'bg-gray-100 text-gray-500' },
  };
  const s = statusMap[sub.status] ?? { label: sub.status, color: 'bg-gray-100 text-gray-500' };
  const planLabel = sub.plan === 'pro' ? 'Pro' : sub.plan === 'essentiel' ? 'Essentiel' : sub.plan === 'decouverte' ? 'Découverte' : sub.plan;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>
      <span className="text-xs text-gray-500 font-medium">{planLabel}</span>
      {sub.cancelAtPeriodEnd && <span className="text-xs text-orange-500">(résiliation prévue)</span>}
    </div>
  );
}

export default function AdminCenters() {
  const API_URL = import.meta.env.VITE_API_URL ?? '/api';
  const { t } = useI18n();
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
  const [subForm, setSubForm] = useState({ plan: 'essentiel', status: 'active', currentPeriodEnd: '' });
  const [subSaving, setSubSaving] = useState(false);
  const [subSuccess, setSubSuccess] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

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
    setSubForm({
      plan: center.subscription?.plan || 'essentiel',
      status: center.subscription?.status === 'trialing' ? 'trialing' : 'active',
      currentPeriodEnd: center.subscription?.currentPeriodEnd
        ? new Date(center.subscription.currentPeriodEnd).toISOString().slice(0, 10)
        : ''
    });
    setSubSuccess(null);
    setSubError(null);
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

  const handleUpdateSubscription = async () => {
    if (!editingCenter) return;
    setSubSaving(true);
    setSubSuccess(null);
    setSubError(null);
    try {
      const res = await fetchWithRefresh(`${API_URL}/centers/${editingCenter.id}/subscription`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: subForm.plan,
          status: subForm.status,
          currentPeriodEnd: subForm.currentPeriodEnd || null,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSubError(err.error || 'Erreur lors de la mise à jour');
        return;
      }
      const updated = await res.json();
      setCenters(prev => prev.map(c => c.id === editingCenter.id ? {
        ...c,
        subscription: {
          plan: updated.plan,
          status: updated.status,
          currentPeriodEnd: updated.currentPeriodEnd,
        }
      } : c));
      setSubSuccess('Abonnement mis à jour avec succès');
    } catch {
      setSubError('Erreur réseau');
    } finally {
      setSubSaving(false);
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

  const totalUsers = centers.reduce((s, c) => s + c._count.users, 0);
  const totalChildren = centers.reduce((s, c) => s + c._count.children, 0);
  const totalNannies = centers.reduce((s, c) => s + c._count.nannies, 0);
  const totalReports = centers.reduce((s, c) => s + (c._count.reports ?? 0), 0);

  return (
    <div className={`min-h-screen bg-[#f4f7fa] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <HiOutlineOfficeBuilding className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('page.centers.title', 'Centres')}</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('page.centers.subtitle', { count: String(centers.length) })}</p>
            </div>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#0b5566] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPI bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: t('centers.kpi.users', 'Utilisateurs'), value: totalUsers, icon: <HiOutlineUsers className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
                { label: t('centers.kpi.children', 'Enfants'), value: totalChildren, icon: <HiOutlineHeart className="w-5 h-5" />, color: 'text-pink-600 bg-pink-50' },
                { label: t('centers.kpi.nannies', 'Nounous'), value: totalNannies, icon: <HiOutlineCalendar className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50' },
                { label: t('centers.kpi.reports', 'Rapports'), value: totalReports, icon: <HiOutlineDocumentReport className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.color}`}>{kpi.icon}</div>
                  <div>
                    <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                    <div className="text-xs text-gray-500">{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {centers.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
                <HiOutlineOfficeBuilding className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Aucun centre trouvé</p>
              </div>
            )}

            {/* Mobile cards */}
            <div className="md:hidden space-y-4">
              {centers.map(center => (
                <div key={center.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="px-4 pt-4 pb-3 border-b border-gray-50 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>
                        <HiOutlineOfficeBuilding className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{center.name}</div>
                        <div className="text-xs text-gray-400">Créé le {new Date(center.createdAt).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                    <SubBadge sub={center.subscription} />
                  </div>

                  <div className="px-4 py-3 space-y-3">
                    {/* Admin */}
                    {center.adminName && (
                      <div className="flex items-center gap-2 text-sm">
                        <HiOutlineUserGroup className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">{center.adminName}</span>
                        <span className="text-xs text-gray-400">— admin</span>
                      </div>
                    )}
                    {/* Contact */}
                    {center.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <a href={`mailto:${center.email}`} className="hover:underline truncate">{center.email}</a>
                      </div>
                    )}
                    {center.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        {center.phone}
                      </div>
                    )}
                    {(center.address || center.city) && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span>{[center.address, center.postalCode && center.city ? `${center.postalCode} ${center.city}` : center.city].filter(Boolean).join(', ')}</span>
                      </div>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[
                        { icon: <HiOutlineUsers className="w-3.5 h-3.5" />, val: center._count.users, label: t('centers.row.users', 'Utilisateurs') },
                        { icon: <HiOutlineUserGroup className="w-3.5 h-3.5" />, val: center._count.parents, label: t('centers.row.parents', 'Parents') },
                        { icon: <HiOutlineHeart className="w-3.5 h-3.5" />, val: center._count.children, label: t('centers.row.children', 'Enfants') },
                        { icon: <HiOutlineCalendar className="w-3.5 h-3.5" />, val: center._count.nannies, label: t('centers.row.nannies', 'Nounous') },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
                          <div className="flex justify-center text-gray-400 mb-0.5">{s.icon}</div>
                          <div className="text-sm font-bold text-gray-800">{s.val}</div>
                          <div className="text-[10px] text-gray-400">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => openEditModal(center)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-[#eef9ff] text-[#0b5566] hover:bg-[#d9f2fb] transition-colors">
                        <HiOutlinePencil className="w-4 h-4" /> {t('global.edit', 'Modifier')}
                      </button>
                      <button onClick={() => openDeleteModal(center)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                        <HiOutlineTrash className="w-4 h-4" /> {t('global.delete', 'Supprimer')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-5">{t('centers.table.center', 'Centre')}</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-5">{t('centers.table.admin', 'Admin')}</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-5">{t('centers.table.contact_address', 'Contact & Adresse')}</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-5">{t('centers.table.subscription', 'Abonnement')}</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-5">{t('centers.table.stats', 'Statistiques')}</th>
                      <th className="py-3 px-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {centers.map(center => (
                      <tr key={center.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Centre */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>
                              <HiOutlineOfficeBuilding className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{center.name}</div>
                              <div className="text-xs text-gray-400">{t('centers.row.created', 'Créé le')} {new Date(center.createdAt).toLocaleDateString('fr-FR')}</div>
                            </div>
                          </div>
                        </td>
                        {/* Admin */}
                        <td className="py-4 px-5">
                          {center.adminName ? (
                            <div>
                              <div className="text-sm font-medium text-gray-800">{center.adminName}</div>
                              {center.adminCreatedAt && (
                                <div className="text-xs text-gray-400">{t('centers.row.admin_since', 'Inscrit le')} {new Date(center.adminCreatedAt).toLocaleDateString('fr-FR')}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">{t('centers.row.no_admin', 'Aucun admin')}</span>
                          )}
                        </td>
                        {/* Contact & adresse */}
                        <td className="py-4 px-5 max-w-[200px]">
                          <div className="space-y-1">
                            {center.email ? (
                              <a href={`mailto:${center.email}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#0b5566] hover:underline">
                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <span className="truncate">{center.email}</span>
                              </a>
                            ) : null}
                            {center.phone ? (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                {center.phone}
                              </div>
                            ) : null}
                            {(center.address || center.city) ? (
                              <div className="flex items-start gap-1.5 text-xs text-gray-600">
                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span>{[center.address, center.postalCode && center.city ? `${center.postalCode} ${center.city}` : center.city, center.region].filter(Boolean).join(', ')}</span>
                              </div>
                            ) : null}
                            {!center.email && !center.phone && !center.address && !center.city && (
                              <span className="text-xs text-gray-400 italic">{t('centers.row.not_specified', 'Non renseigné')}</span>
                            )}
                          </div>
                        </td>
                        {/* Abonnement */}
                        <td className="py-4 px-5">
                          <SubBadge sub={center.subscription} />
                          {center.subscription?.currentPeriodEnd && (
                            <div className="text-xs text-gray-400 mt-1">
                              {t('centers.row.expires_on', 'Expire le')} {new Date(center.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                          {center.subscription?.status === 'trialing' && center.subscription?.trialEnd && (
                            <div className="text-xs text-blue-500 mt-1">
                              {t('centers.row.trial_until', 'Essai jusqu\'au')} {new Date(center.subscription.trialEnd).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </td>
                        {/* Stats */}
                        <td className="py-4 px-5">
                          <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-1 text-xs text-gray-600" title={t('centers.table.users', 'Utilisateurs')}>
                              <HiOutlineUsers className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{center._count.users}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600" title={t('centers.table.parents', 'Parents')}>
                              <HiOutlineUserGroup className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{center._count.parents}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600" title={t('centers.table.children', 'Enfants')}>
                              <HiOutlineHeart className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{center._count.children}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600" title={t('centers.table.nannies', 'Nounous')}>
                              <HiOutlineCalendar className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{center._count.nannies}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600" title={t('centers.table.reports', 'Rapports')}>
                              <HiOutlineDocumentReport className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{center._count.reports ?? 0}</span>
                            </div>
                          </div>
                        </td>
                        {/* Actions */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditModal(center)} className="p-2 text-[#0b5566] hover:bg-[#eef9ff] rounded-lg transition-colors" title={t('global.edit', 'Modifier')}>
                              <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => openDeleteModal(center)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={t('global.delete', 'Supprimer')}>
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal modification */}
      {showEditModal && editingCenter && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Modifier le centre</h2>
              <button onClick={closeEditModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Infos centre */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><HiOutlineOfficeBuilding className="w-4 h-4" /> Informations du centre</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du centre <span className="text-red-500">*</span></label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566]" placeholder="Nom du centre" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566]" placeholder="contact@centre.fr" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566]" placeholder="06 12 34 56 78" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Adresse */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Adresse
                </h3>
                <div className="space-y-3">
                  <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566]" placeholder="Adresse complète" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <input type="text" value={editForm.postalCode} onChange={e => setEditForm({ ...editForm, postalCode: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566]" placeholder="Code postal" />
                    <input type="text" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} className="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566]" placeholder="Ville" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" value={editForm.region} onChange={e => setEditForm({ ...editForm, region: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566]" placeholder="Région" />
                    <input type="text" value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566]" placeholder="Pays" />
                  </div>
                </div>
              </div>
              {/* Abonnement */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  Abonnement
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                      <select value={subForm.plan} onChange={e => setSubForm(f => ({ ...f, plan: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 focus:border-[#0b5566]">
                        <option value="essentiel">Essentiel</option>
                        <option value="pro">Pro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
                      <select value={subForm.status} onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 focus:border-[#0b5566]">
                        <option value="active">Actif</option>
                        <option value="trialing">Essai</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin</label>
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <input type="date" value={subForm.currentPeriodEnd} onChange={e => setSubForm(f => ({ ...f, currentPeriodEnd: e.target.value }))} className="block w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20" style={{ boxSizing: 'border-box' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Laissez vide pour une durée indéterminée.</p>
                  </div>
                  {subSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>{subSuccess}</p>}
                  {subError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{subError}</p>}
                  <button onClick={handleUpdateSubscription} disabled={subSaving} className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors" style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>
                    {subSaving ? 'Enregistrement…' : 'Appliquer l\'abonnement'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeEditModal} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">Annuler</button>
              <button onClick={handleUpdateCenter} disabled={!editForm.name.trim()} className="flex-1 px-4 py-2.5 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {showDeleteModal && centerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Supprimer le centre</h2>
            </div>
            <p className="text-gray-600 text-sm mb-3">Êtes-vous sûr de vouloir supprimer <strong>{centerToDelete.name}</strong> ?</p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-5 text-sm text-red-700">
              <p className="font-semibold mb-1">Cette action est irréversible et supprimera :</p>
              <ul className="space-y-0.5 ml-2">
                <li>• {centerToDelete._count.users} utilisateurs</li>
                <li>• {centerToDelete._count.parents} parents</li>
                <li>• {centerToDelete._count.children} enfants</li>
                <li>• {centerToDelete._count.nannies} nounous</li>
                <li>• Toutes les données associées</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={closeDeleteModal} disabled={deleting} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50">Annuler</button>
              <button onClick={handleDeleteCenter} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}