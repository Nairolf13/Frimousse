import React, { useEffect, useState } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { useCenterSettings } from '../src/context/CenterSettingsContext';
import ParentCard from '../components/ParentCard';
import ChildOptionsModal from '../components/ChildOptionsModal';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import PageLoader from '../components/PageLoader';


type Child = { id: string; name: string; group?: string };
type Parent = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null; children?: { child: Child }[]; createdAt?: string | null };
type AdminStats = { parentsCount: number; childrenCount: number; presentToday: number };
type AdminData = { stats: AdminStats; parents: Parent[] } | null;
type AuthUser = { role?: string | null; nannyId?: string | null } | null;
// more detailed user shape used in this page
type UserInfo = {
  id?: string | null;
  parentId?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  nannyId?: string | null;
} | null;

const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
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
  const authUser = user as AuthUser;
  const isAdminView = (u: AuthUser) => {
    if (!u) return false;
    const r = (u.role || '').toLowerCase();
    return r === 'admin' || !!u.nannyId || r.includes('super');
  };
  const { settingsVersion } = useCenterSettings();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [centerFilter, setCenterFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminData>(null);
  const [parentBilling, setParentBilling] = useState<Record<string, number>>({});
  // helper to reload aggregated billing totals for the current month (filter applied)
  const refreshBilling = React.useCallback(async () => {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const url = `api/parent/billing?month=${month}` + (centerFilter ? `&centerId=${encodeURIComponent(centerFilter)}` : '');
      const billRes = await fetchWithRefresh(url, { credentials: 'include' });
      if (billRes.ok) {
        const billJson = await billRes.json();
        setParentBilling(billJson || {});
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Error refreshing billing', e);
    }
  }, [centerFilter]);

  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showChildModal, setShowChildModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [deletingParentId, setDeletingParentId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', address: '', postalCode: '', city: '', region: '', country: '' });
  // --- geodata/autocomplete (copied from RegisterPage for address suggestions) ---
  type GeodataPlace = { house_number?: string | null; street?: string | null; city?: string | null; state?: string | null; country?: string | null; postcode?: string | null; name?: string };
  const [placeSuggestions, setPlaceSuggestions] = useState<GeodataPlace[]>([]);
  const [openAddress, setOpenAddress] = useState(false);
  const [geodataError, setGeodataError] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const searchTimer = React.useRef<number | null>(null);

  const fetchGeodata = React.useCallback(async (query: string) => {
    // respect server-side rate-limits cooldown
    if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
      return;
    }
    // positionstack requires at least 3 characters
    if (!query || query.length < 3) { setPlaceSuggestions([]); setGeodataError(null); return; }
    try {
      setGeodataError(null);
      const res = await fetch(`/api/geodata/positionstack?q=${encodeURIComponent(query)}&limit=12`);
      if (res.status === 422) {
        // validation error from API (query too short or invalid)
        setPlaceSuggestions([]);
        setGeodataError('Tapez au moins 3 caractères pour obtenir des suggestions');
        return;
      }
      if (res.status === 429) {
        // rate limit reached: apply a cooldown on client (60s)
        const cooldownMs = 60_000;
        setRateLimitedUntil(Date.now() + cooldownMs);
        setPlaceSuggestions([]);
        setGeodataError('Trop de requêtes vers le service d’adresses — réessayez dans 1 minute');
        return;
      }
      if (!res.ok) { setPlaceSuggestions([]); setGeodataError('Impossible de récupérer les suggestions'); return; }
      const data = (await res.json()) as GeodataPlace[];
      const arr = data || [];
      const addresses = arr.filter((p) => !!(p.house_number || p.street));
      setPlaceSuggestions(addresses);
    } catch (err) {
      console.error('geodata fetch error', err);
      setPlaceSuggestions([]);
      setGeodataError('Erreur réseau lors de la recherche d’adresse');
    }
  }, [rateLimitedUntil]);

  React.useEffect(() => {
    const q = (form.address || form.city || '').trim();
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      const bias = form.city ? ` ${form.city}` : '';
      fetchGeodata(`${q}${bias}`.trim());
    }, 600);
    return () => { if (searchTimer.current) window.clearTimeout(searchTimer.current); };
  }, [form.address, form.city, fetchGeodata]);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!target) return;
      const addrEl = document.querySelector('#parent-form-address');
      if (addrEl && addrEl.contains(target)) return;
      setOpenAddress(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // cleanup success timer on unmount
  React.useEffect(() => {
    return () => {
      if (successTimer.current) {
        window.clearTimeout(successTimer.current);
        successTimer.current = null;
      }
    };
  }, []);

  const selectPlace = (p: GeodataPlace) => {
    const house = p.house_number ? String(p.house_number).trim() : '';
    const road = p.street ? String(p.street).trim() : '';
    const streetPart = (house ? `${house} ${road}`.trim() : (road || ''));
    const displayStreet = streetPart || p.name || '';
    const userTyped = String(form.address || '').trim();
    let composed = displayStreet;
    if (!house) {
      const m = userTyped.match(/^(\d+)\s+(.+)$/);
      if (m && m[1]) {
        const typedNum = m[1];
        if (!displayStreet.startsWith(typedNum + ' ')) composed = `${typedNum} ${displayStreet}`.trim();
      }
    }
    setForm({ ...form, address: composed, city: p.city || '', postalCode: p.postcode || '', region: p.state || '', country: p.country || '' });
    setPlaceSuggestions([]);
    setOpenAddress(false);
  };
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimer = React.useRef<number | null>(null);
  const [adminResetModal, setAdminResetModal] = useState<{ open: boolean; parentId?: string; password?: string } | null>(null);
  const [pendingSave, setPendingSave] = useState<{ payload: { name: string; email: string; phone?: string; password?: string; newPassword?: string }; parentId?: string | null } | null>(null);
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  // Password validation rules (same as RegisterPage)
  const uppercaseRe = /[A-ZÀ-ÖØ-Ý]/; // include accented uppercase letters
  const digitRe = /\d/;
  const specialRe = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;
  const minLength = 8;
  const hasUpper = uppercaseRe.test(form.password || '');
  const hasDigit = digitRe.test(form.password || '');
  const hasSpecial = specialRe.test(form.password || '');
  const hasLength = (form.password || '').length >= minLength;
  const passwordValid = hasUpper && hasDigit && hasSpecial && hasLength;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isAdminView(authUser)) {
          const res = await fetchWithRefresh(`api/parent/admin${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`, { credentials: 'include' });
          const text = await res.text();
          let json: unknown = null;
          try { json = text ? JSON.parse(text) : null; } catch { json = text; }
          if (!res.ok) {
            // If the user isn't authorized to access the admin endpoint, fall back to the parent view
            if (res.status === 403) {
              const res2 = await fetchWithRefresh(`api/parent/children`, { credentials: 'include' });
              const text2 = await res2.text();
              let json2: unknown = null;
              try { json2 = text2 ? JSON.parse(text2) : null; } catch { json2 = text2; }
              if (!res2.ok) {
                const message2 = typeof json2 === 'string' ? json2 : (json2 && typeof json2 === 'object' && 'error' in (json2 as Record<string, unknown>) ? String((json2 as Record<string, unknown>).error) : 'Erreur serveur');
                throw new Error(message2);
              }
              setChildren(json2 as Child[]);
              setLoading(false);
              return;
            }
            const message = typeof json === 'string' ? json : (json && typeof json === 'object' && 'error' in (json as Record<string, unknown>) ? String((json as Record<string, unknown>).error) : 'Erreur serveur');
            throw new Error(message);
          }
          setAdminData(json as AdminData);
            // load billing totals for the current month
            await refreshBilling();
        } else {
          const res = await fetchWithRefresh(`api/parent/children`, { credentials: 'include' });
          const text = await res.text();
          let json: unknown = null;
          try { json = text ? JSON.parse(text) : null; } catch { json = text; }
          if (!res.ok) {
            const message = typeof json === 'string' ? json : (json && typeof json === 'object' && 'error' in (json as Record<string, unknown>) ? String((json as Record<string, unknown>).error) : 'Erreur serveur');
            throw new Error(message);
          }
          const childrenList = (json as Child[]) || [];
          setChildren(childrenList);
          // Compute billing for the connected parent so ParentCard shows the correct amount
          // for parent view we reuse the same helper
          try {
            await refreshBilling();
          } catch {
            // ignore billing computation errors for parent view
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // 402 is handled globally by UpgradeModalProvider — no need to show an inline error
        if (msg.includes('402') || msg.toLowerCase().includes('essai') || msg.toLowerCase().includes('abonnement')) {
          setLoading(false);
          return;
        }
        if (import.meta.env.DEV) console.error('ParentDashboard load error', err);
        else console.error('ParentDashboard load error', err instanceof Error ? err.message : String(err));
        if (err instanceof Error) setError(err.message);
        else setError('Erreur');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authUser, user, centerFilter, refreshBilling, settingsVersion]);

  useEffect(() => {
    let mounted = true;
    const loadCenters = async () => {
      const u = user as { role?: string | null } | null;
      if (!u || u.role !== 'super-admin') return;
      try {
        const res = await fetchWithRefresh(`api/centers`, { credentials: 'include' });
        if (!res || !res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        const centersData = json.data || json.centers || json;
        if (Array.isArray(centersData)) {
          setCenters(centersData.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        }
      } catch (e) {
        console.error('Failed to load centers for filter', e);
      }
    };
    loadCenters();
    return () => { mounted = false; };
  }, [user]);

      const userInfo = (user as UserInfo) ?? null;
      const parentForCard: Parent | null = userInfo ? {
        id: (userInfo.parentId ?? userInfo.id ?? 'me') as string,
        name: (userInfo.name ?? `${(userInfo.firstName ?? '')} ${(userInfo.lastName ?? '')}`.trim()) ?? null,
        firstName: userInfo.firstName ?? null,
        lastName: userInfo.lastName ?? null,
        email: userInfo.email ?? null,
        phone: userInfo.phone ?? null,
        children: children.map(c => ({ child: c }))
      } : null;

  if (loading) return <PageLoader title={t('page.parent')} description={t('page.parent.description')} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />;
  if (error) return <div className="p-6 text-red-600">{t('global.error') || 'Erreur'}: {error}</div>;


  const inputCls = "border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566] bg-white";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1";

  if (isAdminView(authUser)) {
  const stats: AdminStats = adminData?.stats ?? { parentsCount: 0, childrenCount: 0, presentToday: 0 };
  const parents: Parent[] = adminData?.parents ?? [];
    return (
      <div className={`min-h-screen bg-[#f4f7fa] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
        <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <div className="pt-0.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('page.parent')}</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('page.parent.description')}</p>
              </div>
            </div>
            {(user && typeof user.role === 'string' && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase().includes('super') || user.nannyId == null)) && (
              <button
                data-tour="btn-add-parent"
                onClick={() => { setAdding(true); setFormError(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', address: '', postalCode: '', city: '', region: '', country: '' }); }}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-sm hover:opacity-90 transition flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                <span>{t('parent.add')}</span>
              </button>
            )}
          </div>

          {/* KPI + filtres */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
            <div className="grid grid-cols-3 gap-3 w-full lg:w-auto lg:flex lg:flex-row">
              {[
                { label: t('stats.total'), value: stats.parentsCount, color: 'text-[#0b5566] bg-[#eef9ff]' },
                { label: t('stats.active'), value: parents.filter(p => p.children && p.children.length > 0).length, color: 'text-emerald-700 bg-emerald-50' },
                { label: t('stats.new'), value: parents.filter(p => { if (!p.createdAt) return false; const d = Math.ceil(Math.abs(new Date().getTime() - new Date(p.createdAt).getTime()) / (1000*60*60*24)); return d <= 30; }).length, color: 'text-violet-700 bg-violet-50' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 lg:min-w-[100px]">
                  <div className={`text-xl font-extrabold ${kpi.color.split(' ')[0]}`}>{kpi.value}</div>
                  <div className="text-xs text-gray-500 leading-tight">{kpi.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 lg:ml-auto">
              {user && typeof user.role === 'string' && user.role === 'super-admin' && (
                <select value={centerFilter || ''} onChange={e => setCenterFilter(e.target.value || null)} className="border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 shadow-sm text-sm w-full sm:w-auto min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30">
                  <option value="">{t('messages.center.all', 'Tous les centres')}</option>
                  {centers.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              )}
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input type="text" placeholder={t('children.search_placeholder')} className="border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-gray-700 bg-white shadow-sm text-sm w-full sm:w-64 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30" />
              </div>
            </div>
          </div>

          {/* Formulaire ajout/édition */}
          {(adding || editingParent) && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setFormError(null);
              if (!form.firstName || !form.lastName || !form.email) {
                setFormError('Les champs Prénom, Nom et Email sont requis');
                return;
              }
              if ((form.password || form.confirmPassword) && form.password !== form.confirmPassword) {
                setFormError("Les mots de passe ne correspondent pas");
                return;
              }
              if (form.password && !passwordValid) {
                setFormError('Le mot de passe ne respecte pas les règles requises');
                return;
              }
                try {
                  const url = editingParent ? `api/parent/${editingParent.id}` : `api/parent`;
                  const method = editingParent ? 'PUT' : 'POST';
                  const isAdmin = user && typeof user.role === 'string' && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase().includes('super'));
                  const userInfoLocal = user as UserInfo | null;
                  const isEditingOwnParent = Boolean(editingParent && userInfoLocal && String((userInfoLocal.parentId ?? userInfoLocal.id ?? '')) === String(editingParent.id));
                  const sendPayload: Record<string, unknown> = { name: `${form.firstName} ${form.lastName}`, email: form.email };
                  if (form.phone) sendPayload.phone = form.phone;
                  if (form.address) sendPayload.address = form.address;
                  if (form.postalCode) sendPayload.postalCode = form.postalCode;
                  if (form.city) sendPayload.city = form.city;
                  if (form.region) sendPayload.region = form.region;
                  if (form.country) sendPayload.country = form.country;
                  if (editingParent && form.password && (isAdmin && !isEditingOwnParent)) {
                    const pendingPayload: { name: string; email: string; phone?: string; newPassword?: string } = { name: String(sendPayload.name), email: String(sendPayload.email) };
                    if (sendPayload.phone) pendingPayload.phone = String(sendPayload.phone);
                    pendingPayload.newPassword = form.password;
                    setPendingSave({ payload: pendingPayload, parentId: editingParent.id });
                    setAdminResetModal({ open: true, parentId: editingParent.id, password: form.password });
                    return;
                  }
                  if (form.password) {
                    if (editingParent && (isAdmin || isEditingOwnParent)) { (sendPayload as Record<string, unknown>)['newPassword'] = form.password; }
                    else if (!editingParent) { (sendPayload as Record<string, unknown>)['password'] = form.password; }
                  }
                  const res = await fetchWithRefresh(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(sendPayload) });
                  let resBody: unknown = null;
                  try { resBody = await res.json(); } catch { /* noop */ }
                  if (!res.ok) {
                    const bodyText = typeof resBody === 'object' && resBody !== null && 'message' in (resBody as Record<string, unknown>) ? String((resBody as Record<string, unknown>).message) : (await res.text());
                    throw new Error(bodyText || 'Erreur création parent');
                  }
                  const smsg = form.password ? (editingParent ? 'Parent modifié.' : 'Parent créé avec mot de passe.') : (editingParent ? 'Parent modifié.' : 'Parent créé — une invitation a été envoyée.');
                  setSuccessMessage(smsg);
                  if (successTimer.current) { window.clearTimeout(successTimer.current); successTimer.current = null; }
                  successTimer.current = window.setTimeout(() => { setSuccessMessage(null); successTimer.current = null; }, 3500) as unknown as number;
                  // Optimistic update: insert/update parent immediately in local state
                  if (editingParent) {
                    setAdminData(prev => prev ? {
                      ...prev,
                      parents: prev.parents.map(p => p.id === editingParent.id ? { ...p, name: `${form.firstName} ${form.lastName}`, email: form.email, phone: form.phone || p.phone } : p)
                    } : prev);
                  } else if (resBody && typeof resBody === 'object' && resBody !== null) {
                    // Backend wraps creation response as { parent, user, isNewUser }
                    const raw = resBody as Record<string, unknown>;
                    const created = (raw.parent && typeof raw.parent === 'object' ? raw.parent : ('id' in raw ? raw : null)) as Parent | null;
                    if (!created) { fetchWithRefresh('api/parent/admin', { credentials: 'include' }).then(r => r.json()).then(j => { if (j) setAdminData(j as AdminData); }).catch(() => {}); }
                    if (!created) { setAdding(false); setEditingParent(null); return; }
                    setAdminData(prev => prev ? {
                      ...prev,
                      parents: [created, ...prev.parents],
                      stats: { ...prev.stats, parentsCount: prev.stats.parentsCount + 1 }
                    } : prev);
                  }
                  setAdding(false);
                  setEditingParent(null);
                  setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', address: '', postalCode: '', city: '', region: '', country: '' });
                  // Reload in background to sync with server
                  fetchWithRefresh(`api/parent/admin`, { credentials: 'include' })
                    .then(r => r.text())
                    .then(text => { try { const j = text ? JSON.parse(text) : null; if (j) setAdminData(j as AdminData); } catch { /* ignore */ } })
                    .catch(() => { /* ignore */ });
              } catch (err: unknown) {
                console.error('Add parent failed', err);
                const msg = err instanceof Error ? err.message : 'Erreur';
                setFormError(msg);
              }
            }} className="mb-6 bg-white rounded-2xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">{editingParent ? t('parent.form.submit.save') : t('parent.add')}</h2>
                <button type="button" onClick={() => { setAdding(false); setEditingParent(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', address: '', postalCode: '', city: '', region: '', country: '' }); setFormError(null); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Identité */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label htmlFor="parent-firstName" className={labelCls}>{t('parent.form.firstName')} <span className="text-red-500">*</span></label><input id="parent-firstName" name="firstName" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder={t('parent.form.firstName')} required className={inputCls} /></div>
                  <div><label htmlFor="parent-lastName" className={labelCls}>{t('parent.form.lastName')} <span className="text-red-500">*</span></label><input id="parent-lastName" name="lastName" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder={t('parent.form.lastName')} required className={inputCls} /></div>
                  <div><label htmlFor="parent-phone" className={labelCls}>{t('parent.form.phone')}</label><input id="parent-phone" name="phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('parent.form.phone')} className={inputCls} /></div>
                </div>
                {/* Email */}
                <div className="sm:col-span-2 lg:col-span-1"><label htmlFor="parent-email" className={labelCls}>{t('parent.form.email')} <span className="text-red-500">*</span></label><input id="parent-email" name="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={t('parent.form.email')} required className={inputCls} /></div>
                {/* Adresse */}
                <div id="parent-form-address" className="relative md:col-span-2">
                  <label htmlFor="parent-address" className={labelCls}>{t('parent.form.address')}</label>
                  <input id="parent-address" name="address" value={form.address} onChange={e => { setForm({ ...form, address: e.target.value }); setOpenAddress(true); }} onFocus={() => setOpenAddress(true)} placeholder={t('parent.form.address') || 'Adresse'} className={inputCls} autoComplete="off" />
                  {geodataError && <div className="text-xs text-red-500 mt-1">{geodataError}</div>}
                  {openAddress && placeSuggestions && placeSuggestions.length > 0 && (
                    <div className="absolute z-50 bg-white shadow-lg rounded-xl mt-1 w-full max-h-48 overflow-auto border border-gray-100">
                      {placeSuggestions.map((p, i) => (
                        <div key={i} className="px-3 py-2.5 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0" onClick={() => selectPlace(p)}>
                          <div className="font-medium text-gray-800">{(p.house_number ? `${p.house_number} ` : '') + (p.street || p.name || '')}</div>
                          <div className="text-xs text-gray-400">{[p.postcode, p.city, p.state, p.country].filter(Boolean).join(' • ')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div><label htmlFor="parent-postalCode" className={labelCls}>{t('parent.form.postalCode') || 'Code postal'}</label><input id="parent-postalCode" name="postalCode" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} placeholder="75001" className={inputCls} /></div>
                <div><label htmlFor="parent-city" className={labelCls}>{t('parent.form.city') || 'Ville'}</label><input id="parent-city" name="city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Paris" className={inputCls} /></div>
                <div><label htmlFor="parent-region" className={labelCls}>{t('parent.form.region') || 'Région'}</label><input id="parent-region" name="region" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="Île-de-France" className={inputCls} /></div>
                <div><label htmlFor="parent-country" className={labelCls}>{t('parent.form.country') || 'Pays'}</label><input id="parent-country" name="country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="France" className={inputCls} /></div>
                {/* Message si l'email saisi est celui du compte admin connecté */}
                {form.email && user?.email && form.email.toLowerCase() === user.email.toLowerCase() && (
                  <div className="sm:col-span-2 lg:col-span-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>Vous utilisez votre propre email. <strong>Il n'est pas nécessaire de saisir un mot de passe</strong> — vous vous connecterez toujours avec votre compte administrateur.</span>
                  </div>
                )}

                {/* Mot de passe — masqué si l'email correspond au compte admin connecté */}
                {!(form.email && user?.email && form.email.toLowerCase() === user.email.toLowerCase()) && (<>
                <div>
                  <label htmlFor="parent-password" className={labelCls}>{t('parent.form.password.placeholder')}</label>
                  <div className="relative"><input id="parent-password" name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={t('parent.form.password.placeholder')} className={inputCls + ' pr-10'} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>{showPw ? '🙈' : '👁️'}</button></div>
                </div>
                <div>
                  <label htmlFor="parent-confirmPassword" className={labelCls}>{t('parent.form.confirmPassword.placeholder')}</label>
                  <div className="relative"><input id="parent-confirmPassword" name="confirmPassword" type={showPw ? 'text' : 'password'} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder={t('parent.form.confirmPassword.placeholder')} className={inputCls + ' pr-10'} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>{showPw ? '🙈' : '👁️'}</button></div>
                </div>
                </>)}
                {/* Règles mot de passe */}
                {(adding || editingParent) && !(form.email && user?.email && form.email.toLowerCase() === user.email.toLowerCase()) && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('parent.password.requirements.title', 'Le mot de passe doit contenir :')}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { ok: hasUpper, label: t('parent.password.requirements.upper', '1 majuscule') },
                        { ok: hasDigit, label: t('parent.password.requirements.digit', '1 chiffre') },
                        { ok: hasSpecial, label: t('parent.password.requirements.special', '1 caractère spécial') },
                        { ok: hasLength, label: t('parent.password.requirements.length', '{min}+ caractères').replace('{min}', String(minLength)) },
                      ].map(r => (
                        <div key={r.label} className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5 ${r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {r.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
                <div className="text-xs text-gray-400">{t('parent.form.required_note')} <span className="text-red-500">*</span></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setAdding(false); setEditingParent(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', address: '', postalCode: '', city: '', region: '', country: '' }); setFormError(null); }} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-medium">{t('parent.form.cancel')}</button>
                  <button type="submit" className="px-5 py-2 text-white rounded-xl transition text-sm font-semibold hover:opacity-90" style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>{editingParent ? t('parent.form.submit.save') : t('parent.form.submit.add')}</button>
                </div>
              </div>
              {formError && <div className="mx-5 mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</div>}
            </form>
          )}

          {/* Bannière succès */}
          {successMessage && (
            <div className="mb-4 flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              {successMessage}
            </div>
          )}

          {/* Grille des cartes parents */}
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr items-stretch w-full">
            {(() => {
              const cardColors = ['bg-blue-50','bg-yellow-50','bg-purple-50','bg-[#a9ddf2]','bg-pink-50','bg-orange-50'];
              return parents.map((p, idx) => {
                const color = cardColors[idx % cardColors.length];
                return (
                  <ParentCard
                    key={p.id}
                    parent={p}
                    color={color}
                    parentDue={parentBilling[String(p.id)] || 0}
                    onAdjustmentSaved={refreshBilling}
                    onChildClick={(child) => { setSelectedChild(child); setShowChildModal(true); }}
                    onEdit={async (par) => {
                      setEditingParent(par);
                      setAdding(false);
                      setFormError(null);
                      setForm({ firstName: par.firstName || '', lastName: par.lastName || '', email: par.email || '', phone: par.phone || '', address: '', postalCode: '', city: '', region: '', country: '', password: '', confirmPassword: '' });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      try {
                        if ((!par.email || !par.phone) && par.id) {
                          const res = await fetchWithRefresh(`api/parent/${par.id}`, { credentials: 'include' });
                          if (res.ok) {
                            const full = await res.json();
                            const parentObj = full && typeof full === 'object' && 'parent' in (full as Record<string, unknown>) ? (full as Record<string, unknown>)['parent'] as Record<string, unknown> : full as Record<string, unknown>;
                            if (parentObj) {
                              setForm({
                                firstName: String((parentObj as Record<string, unknown>)['firstName'] ?? (parentObj as Record<string, unknown>)['name'] ?? ''),
                                lastName: String((parentObj as Record<string, unknown>)['lastName'] ?? ''),
                                email: String((parentObj as Record<string, unknown>)['email'] ?? ''),
                                phone: String((parentObj as Record<string, unknown>)['phone'] ?? ''),
                                address: String((parentObj as Record<string, unknown>)['address'] ?? ''),
                                postalCode: String((parentObj as Record<string, unknown>)['postalCode'] ?? ''),
                                city: String((parentObj as Record<string, unknown>)['city'] ?? ''),
                                region: String((parentObj as Record<string, unknown>)['region'] ?? ''),
                                country: String((parentObj as Record<string, unknown>)['country'] ?? ''),
                                password: '',
                                confirmPassword: ''
                              });
                            }
                          }
                        }
                      } catch (err) {
                        if (import.meta.env.DEV) console.error('Failed to fetch parent details', err);
                      }
                    }}
                    onDelete={(id) => { setDeletingParentId(id); }}
                  />
                );
              });
            })()}
          </div>

          {/* Modal suppression parent */}
          {deletingParentId && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{t('modal.delete.title')}</h2>
                </div>
                <p className="text-sm text-gray-600 mb-5">{t('parent.delete.confirm_body')}</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeletingParentId(null)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition">{t('modal.cancel')}</button>
                  <button onClick={async () => {
                    try {
                      const res = await fetchWithRefresh(`api/parent/${deletingParentId}`, { method: 'DELETE', credentials: 'include' });
                      const respText = await res.text();
                      let respBody: Record<string, unknown> | null = null;
                      try { respBody = respText ? JSON.parse(respText) : null; } catch { respBody = respText as unknown as Record<string, unknown>; }
                      if (!res.ok) {
                        const message = respBody && typeof respBody === 'object' && ('message' in respBody || 'error' in respBody) ? (respBody.message || respBody.error) : (typeof respBody === 'string' ? respBody : 'Erreur suppression');
                        throw new Error(String(message));
                      }
                      const reload = await fetchWithRefresh(`api/parent/admin`, { credentials: 'include' });
                      const text = await reload.text();
                      let json: unknown = null;
                      try { json = text ? JSON.parse(text) : null; } catch { json = text; }
                      setAdminData(json as AdminData);
                      setDeletingParentId(null);
                      setSuccessMessage('Parent supprimé.');
                      if (successTimer.current) { window.clearTimeout(successTimer.current); successTimer.current = null; }
                      successTimer.current = window.setTimeout(() => { setSuccessMessage(null); successTimer.current = null; }, 3500) as unknown as number;
                    } catch (err) {
                      console.error('Delete parent failed', err);
                      setFormError(err instanceof Error ? ('Suppression échouée: ' + err.message) : 'Suppression échouée');
                      setDeletingParentId(null);
                    }
                  }} className="flex-1 bg-red-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition">{t('children.action.delete')}</button>
                </div>
              </div>
            </div>
          )}

          {showChildModal && <ChildOptionsModal child={selectedChild} onClose={() => { setShowChildModal(false); setSelectedChild(null); }} />}

          {/* Modal reset mot de passe */}
          {adminResetModal && adminResetModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold mb-2 text-gray-900">Confirmer la réinitialisation du mot de passe</h3>
                <p className="text-sm text-gray-600 mb-5">Vous allez réinitialiser le mot de passe de ce parent. Voulez-vous continuer ?</p>
                <div className="flex gap-3">
                  <button onClick={() => { setPendingSave(null); setAdminResetModal(null); }} className="flex-1 border border-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
                  <button onClick={async () => {
                    if (!pendingSave) return;
                    try {
                      const res = await fetchWithRefresh(`api/parent/${pendingSave.parentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(pendingSave.payload) });
                      if (!res.ok) throw new Error('Erreur lors de la mise à jour');
                      const reload = await fetchWithRefresh(`api/parent/admin`, { credentials: 'include' });
                      const text = await reload.text();
                      let json: unknown = null;
                      try { json = text ? JSON.parse(text) : null; } catch { json = text; }
                      setAdminData(json as AdminData);
                      setPendingSave(null);
                      setAdminResetModal(null);
                      setEditingParent(null);
                      setAdding(false);
                      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', address: '', postalCode: '', city: '', region: '', country: '' });
                    } catch (err) {
                      console.error('Parent reset failed', err);
                      setPendingSave(null);
                      setAdminResetModal(null);
                      setFormError('La réinitialisation a échoué');
                    }
                  }} className="flex-1 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition" style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>Confirmer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vue parent (ses enfants)
  return (
    <div className={`min-h-screen bg-[#f4f7fb] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#0b5566' }}>Espace Parent</h1>
            <p className="text-sm text-gray-500">Vos informations et vos enfants</p>
          </div>
        </div>

        {parentForCard ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ParentCard
              parent={parentForCard}
              color={'bg-white'}
              parentDue={parentBilling[String(parentForCard.id)] || 0}
              onAdjustmentSaved={refreshBilling}
              onChildClick={(child) => { setSelectedChild(child); setShowChildModal(true); }}
              onEdit={undefined}
              onDelete={undefined}
            />
          </div>
        ) : children.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
            Aucun enfant trouvé.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {children.map(child => (
              <div key={child.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3">
                <div>
                  <button type="button" className="font-semibold text-gray-900 hover:text-[#0b5566] text-left transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedChild(child); setShowChildModal(true); }}>{child.name}</button>
                  <div className="text-xs text-gray-400 mt-0.5">Groupe : {child.group}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#eef9ff] text-[#0b5566] hover:bg-[#d9f2fb] transition" onClick={() => navigate(`/parent/child/${child.id}/schedule`)}>Planning</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#eef9ff] text-[#0b5566] hover:bg-[#d9f2fb] transition" onClick={() => navigate(`/parent/child/${child.id}/reports`)}>Rapports</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showChildModal && <ChildOptionsModal child={selectedChild} onClose={() => { setShowChildModal(false); setSelectedChild(null); }} />}
    </div>
  );
};

export default ParentDashboard;
