import React, { useEffect, useState } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import ParentCard from '../components/ParentCard';
import ChildOptionsModal from '../components/ChildOptionsModal';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';


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
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [centerFilter, setCenterFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminData>(null);
  const [parentBilling, setParentBilling] = useState<Record<string, number>>({});
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
            try {
              const now = new Date();
              const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              // single aggregated call
              const billRes = await fetchWithRefresh(`api/parent/billing?month=${month}`, { credentials: 'include' });
              if (billRes.ok) {
                const billJson = await billRes.json();
                // billJson is expected to be { [parentId]: total }
                setParentBilling(billJson || {});
              } else {
                if (import.meta.env.DEV) console.error('Failed to fetch aggregated parent billing', await billRes.text());
              }
            } catch (e) {
              if (import.meta.env.DEV) console.error('Error fetching aggregated parent billing', e);
            }
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
          try {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const billRes = await fetchWithRefresh(`api/parent/billing?month=${month}${centerFilter ? `&centerId=${encodeURIComponent(centerFilter)}` : ''}`, { credentials: 'include' });
            if (billRes.ok) {
              const billJson = await billRes.json();
              setParentBilling(billJson || {});
            }
          } catch {
            // ignore billing computation errors for parent view
          }
        }
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('ParentDashboard load error', err);
        else console.error('ParentDashboard load error', err instanceof Error ? err.message : String(err));
        if (err instanceof Error) setError(err.message);
        else setError('Erreur');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authUser, user, centerFilter]);

  // If super-admin, load centers for filter
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

      // Build a parent object for the connected parent user so we can reuse ParentCard UI
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

  if (loading) return <div className="p-6">{t('loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{t('global.error') || 'Erreur'}: {error}</div>;


  if (isAdminView(authUser)) {
  const stats: AdminStats = adminData?.stats ?? { parentsCount: 0, childrenCount: 0, presentToday: 0 };
  const parents: Parent[] = adminData?.parents ?? [];
    return (
      <div className={`relative z-0 min-h-screen bg-[#fcfcff] p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
        {/* inline successMessage banner will show inside forms when needed */}
        <div className="max-w-7xl mx-auto w-full">
          {/* successMessage banner removed from top to render in the same place as Children (below form) */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 w-full">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight" style={{ color: '#0b5566' }}>{t('page.parent')}</h1>
              <div className="text-base md:text-lg font-medium mb-4 md:mb-6" style={{ color: '#08323a' }}>{t('page.parent.description')}</div>
            </div>
            <div className="flex gap-2 items-center">
              {(user && typeof user.role === 'string' && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase().includes('super') || user.nannyId == null)) && (
                <button onClick={() => { setAdding(true); setFormError(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', address: '', postalCode: '', city: '', region: '', country: '' }); }} className={`bg-[#0b5566] text-white font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-[#08323a] transition min-h-[44px] md:h-[60px] flex items-center ${isShortLandscape ? '-translate-x-3' : ''}`} style={{transform: isShortLandscape ? 'translateX(-12px)' : undefined}}>{t('parent.add')}</button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:items-start gap-3 mb-6 w-full">
            <div className="w-full">
              <div className="flex gap-2 items-center flex-wrap w-full">
                <div className="bg-white rounded-xl shadow px-3 py-2 md:px-4 md:py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px] min-h-[44px] md:h-[60px] justify-center flex-shrink-0">
                  <div className="text-xs text-gray-400">{t('stats.total')}</div>
                  <div className="text-lg font-bold text-gray-900">{stats.parentsCount}</div>
                </div>
                <div className="bg-white rounded-xl shadow px-3 py-2 md:px-4 md:py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px] min-h-[44px] md:h-[60px] justify-center flex-shrink-0">
                  <div className="text-xs text-gray-400">{t('stats.active')}</div>
                  <div className="text-lg font-bold text-gray-900">{parents.filter(p => p.children && p.children.length > 0).length}</div>
                </div>
                <div className="bg-white rounded-xl shadow px-3 py-2 md:px-4 md:py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px] min-h-[44px] md:h-[60px] justify-center flex-shrink-0">
                  <div className="text-xs text-gray-400">{t('stats.new')}</div>
                  <div className="text-lg font-bold text-gray-900">{parents.filter(p => {
                    if (!p.createdAt) return false;
                    const created = new Date(p.createdAt);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - created.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 30;
                  }).length}</div>
                </div>
              </div>
              {/* moved super-admin center filter next to the search input for desktop */}
            </div>
            <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-center md:justify-end gap-2">
              {user && typeof user.role === 'string' && user.role === 'super-admin' && (
                <select value={centerFilter || ''} onChange={e => setCenterFilter(e.target.value || null)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-sm md:text-base w-full md:w-auto min-h-[44px]">
                  <option value="">Tous les centres</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <input type="text" placeholder={t('children.search_placeholder')} className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-sm md:text-base w-full md:w-64 min-h-[44px]" />
            </div>
          </div>

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
              // If a password is provided, ensure it satisfies the policy
              if (form.password && !passwordValid) {
                setFormError('Le mot de passe ne respecte pas les règles requises');
                return;
              }
                try {
                  const url = editingParent ? `api/parent/${editingParent.id}` : `api/parent`;
                  const method = editingParent ? 'PUT' : 'POST';

                  // admin check and safer user info extraction
                  const isAdmin = user && typeof user.role === 'string' && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase().includes('super'));
                  const userInfoLocal = user as UserInfo | null;
                  const isEditingOwnParent = Boolean(editingParent && userInfoLocal && String((userInfoLocal.parentId ?? userInfoLocal.id ?? '')) === String(editingParent.id));

                  // build a safe send payload object
                  const sendPayload: Record<string, unknown> = {
                    name: `${form.firstName} ${form.lastName}`,
                    email: form.email,
                  };
                  if (form.phone) sendPayload.phone = form.phone;
                  // include address fields when provided
                  if (form.address) sendPayload.address = form.address;
                  if (form.postalCode) sendPayload.postalCode = form.postalCode;
                  if (form.city) sendPayload.city = form.city;
                  if (form.region) sendPayload.region = form.region;
                  if (form.country) sendPayload.country = form.country;

                  // If editing and admin provided password for another parent, map to newPassword and show modal
                  if (editingParent && form.password && (isAdmin && !isEditingOwnParent)) {
                    // construct a properly typed pending payload
                    const pendingPayload: { name: string; email: string; phone?: string; newPassword?: string } = {
                      name: String(sendPayload.name),
                      email: String(sendPayload.email),
                    };
                    if (sendPayload.phone) pendingPayload.phone = String(sendPayload.phone);
                    pendingPayload.newPassword = form.password;
                    setPendingSave({ payload: pendingPayload, parentId: editingParent.id });
                    setAdminResetModal({ open: true, parentId: editingParent.id, password: form.password });
                    return;
                  }

                  // otherwise include password/newPassword directly depending on context
                  if (form.password) {
                    if (editingParent && (isAdmin || isEditingOwnParent)) {
                      // admin or self editing -> send as newPassword
                      (sendPayload as Record<string, unknown>)['newPassword'] = form.password;
                    } else if (!editingParent) {
                      // creating a parent -> include password
                      (sendPayload as Record<string, unknown>)['password'] = form.password;
                    }
                  }

                  const res = await fetchWithRefresh(url, {
                    method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(sendPayload)
                  });
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
                const reload = await fetchWithRefresh(`api/parent/admin`, { credentials: 'include' });
                const reloadText = await reload.text();
                let json: unknown = null;
                try { json = reloadText ? JSON.parse(reloadText) : null; } catch { json = reloadText; }
                setAdminData(json as AdminData);
                setAdding(false);
                setEditingParent(null);
                // clear form and errors
                setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', address: '', postalCode: '', city: '', region: '', country: '' });
              } catch (err: unknown) {
                console.error('Add parent failed', err);
                const msg = err instanceof Error ? err.message : 'Erreur';
                setFormError(msg);
              }
            }} className="mb-6 bg-white rounded-2xl shadow p-4 md:p-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col">
                <label htmlFor="parent-firstName" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.firstName')} <span className="text-red-500">*</span></label>
                <input id="parent-firstName" name="firstName" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder={t('parent.form.firstName')} required className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="parent-lastName" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.lastName')} <span className="text-red-500">*</span></label>
                <input id="parent-lastName" name="lastName" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder={t('parent.form.lastName')} required className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="parent-email" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.email')} <span className="text-red-500">*</span></label>
                <input id="parent-email" name="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={t('parent.form.email')} required className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="parent-phone" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.phone')} <span className="text-red-500">*</span></label>
                <input id="parent-phone" name="phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('parent.form.phone')} className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full" />
              </div>
              <div id="parent-form-address" className="relative flex flex-col">
                <label htmlFor="parent-address" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.address')} <span className="text-red-500">*</span></label>
                <input id="parent-address" name="address" value={form.address} onChange={e => { setForm({ ...form, address: e.target.value }); setOpenAddress(true); }} onFocus={() => setOpenAddress(true)} placeholder={t('parent.form.address') || 'Adresse'} className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full" autoComplete="off" />
                {geodataError && <div className="text-sm text-red-500 mt-1">{geodataError}</div>}
                {openAddress && placeSuggestions && placeSuggestions.length > 0 && (
                  <div className="absolute z-50 bg-white shadow rounded mt-1 w-full max-h-40 overflow-auto border">
                    {placeSuggestions.map((p, i) => (
                      <div key={i} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => selectPlace(p)}>
                        <div className="font-medium">{(p.house_number ? `${p.house_number} ` : '') + (p.street || p.name || '')}</div>
                        <div className="text-xs text-gray-500">{[p.postcode, p.city, p.state, p.country].filter(Boolean).join(' • ')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <label htmlFor="parent-postalCode" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.postalCode') || 'Code postal'} <span className="text-red-500">*</span></label>
                <input id="parent-postalCode" name="postalCode" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} placeholder={t('parent.form.postalCode') || 'Code postal'} className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="parent-city" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.city') || 'Ville'} <span className="text-red-500">*</span></label>
                <input id="parent-city" name="city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder={t('parent.form.city') || 'Ville'} className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="parent-region" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.region') || 'Région'} <span className="text-red-500">*</span></label>
                <input id="parent-region" name="region" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder={t('parent.form.region') || 'Région'} className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="parent-country" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.country') || 'Pays'} <span className="text-red-500">*</span></label>
                <input id="parent-country" name="country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder={t('parent.form.country') || 'Pays'} className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="parent-password" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.password.placeholder')}</label>
                <div className="relative w-full">
                  <input id="parent-password" name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={t('parent.form.password.placeholder')} className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full pr-10" />
                  <button type="button" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 flex items-center justify-center text-sm text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)} aria-label={showPw ? t('common.hide_password') : t('common.show_password')}>{showPw ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div className="flex flex-col">
                <label htmlFor="parent-confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">{t('parent.form.confirmPassword.placeholder')}</label>
                <div className="relative w-full">
                  <input id="parent-confirmPassword" name="confirmPassword" type={showPw ? 'text' : 'password'} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder={t('parent.form.confirmPassword.placeholder')} className="border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-base w-full pr-10" />
                  <button type="button" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 flex items-center justify-center text-sm text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)} aria-label={showPw ? t('common.hide_password') : t('common.show_password')}>{showPw ? '🙈' : '👁️'}</button>
                </div>
              </div>
                {/* Password rules live feedback for admins creating/editing parents */}
                {(adding || editingParent) && (
                  <div className="md:col-span-2 lg:col-span-3 w-full mb-2">
                    <div className="text-sm font-medium text-[#08323a] mb-2">Le mot de passe doit contenir :</div>
                    <ul className="text-sm space-y-1">
                      <li className={`flex items-center gap-2 ${hasUpper ? 'text-green-600' : 'text-red-600'}`}>
                        <svg className={`w-4 h-4 ${hasUpper ? 'text-green-600' : 'text-red-600'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span>Une lettre majuscule (A-Z)</span>
                      </li>
                      <li className={`flex items-center gap-2 ${hasDigit ? 'text-green-600' : 'text-red-600'}`}>
                        <svg className={`w-4 h-4 ${hasDigit ? 'text-green-600' : 'text-red-600'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span>Un chiffre (0-9)</span>
                      </li>
                      <li className={`flex items-center gap-2 ${hasSpecial ? 'text-green-600' : 'text-red-600'}`}>
                        <svg className={`w-4 h-4 ${hasSpecial ? 'text-green-600' : 'text-red-600'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span>Un caractère spécial (ex. !@#$%)</span>
                      </li>
                      <li className={`flex items-center gap-2 ${hasLength ? 'text-green-600' : 'text-red-600'}`}>
                        <svg className={`w-4 h-4 ${hasLength ? 'text-green-600' : 'text-red-600'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span>Au moins {minLength} caractères</span>
                      </li>
                    </ul>
                    {!passwordValid && <div className="text-xs text-red-600 mt-2">Le mot de passe doit respecter toutes les règles ci-dessus.</div>}
                  </div>
                )}

                <div className="md:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 w-full">
                <div className="flex gap-2">
                  <button type="submit" className="bg-[#0b5566] text-white px-4 py-2 rounded hover:bg-[#08323a] transition">{editingParent ? t('parent.form.submit.save') : t('parent.form.submit.add')}</button>
                  <button type="button" onClick={() => { setAdding(false); setEditingParent(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', address: '', postalCode: '', city: '', region: '', country: '' }); setFormError(null); }} className="bg-gray-300 px-4 py-2 rounded">{t('parent.form.cancel')}</button>
                </div>
                <div className="text-sm text-gray-500 text-right">{t('parent.form.required_note')} <span className="text-red-500">*</span></div>
              </div>
              {formError && <div className="text-red-600 md:col-span-2">{formError}</div>}
            </form>
          )}

          {/* Inline success banner for parent actions (placed like in Children.tsx) */}
          {successMessage && (
            <div className="mb-4 text-[#0b5566] font-semibold text-center bg-[#a9ddf2] border border-[#fcdcdf] rounded-lg py-2">{successMessage}</div>
          )}

          <div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr items-stretch w-full">
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
                          onChildClick={(child) => { setSelectedChild(child); setShowChildModal(true); }}
                          onEdit={async (par) => {
                            // prefill with available fields immediately
                            setEditingParent(par);
                            setAdding(false);
                            setFormError(null);
                            setForm({ firstName: par.firstName || '', lastName: par.lastName || '', email: par.email || '', phone: par.phone || '', address: '', postalCode: '', city: '', region: '', country: '', password: '', confirmPassword: '' });
                            window.scrollTo({ top: 0, behavior: 'smooth' });

                            // If email or phone are missing in the summary payload, fetch full details
                            try {
                              if ((!par.email || !par.phone) && par.id) {
                                const res = await fetchWithRefresh(`api/parent/${par.id}`, { credentials: 'include' });
                                if (res.ok) {
                                  const full = await res.json();
                                  // Some backends return { parent: {...} } or the parent object directly; handle both
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
                              // ignore fetch errors; keep what we have
                              if (import.meta.env.DEV) console.error('Failed to fetch parent details', err);
                            }
                          }}
                          onDelete={(id) => { setDeletingParentId(id); }}
                        />
                      );
                });
              })()}
            </div>
          </div>
          {deletingParentId && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
                <div className="text-lg font-semibold mb-4 text-gray-900">{t('modal.delete.title')}</div>
                <div className="text-sm text-gray-600 mb-4">{t('parent.delete.confirm_body')}</div>
                <div className="flex gap-3">
                  <button onClick={() => setDeletingParentId(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2">{t('modal.cancel')}</button>
                  <button onClick={async () => {
                    try {
                      const res = await fetchWithRefresh(`api/parent/${deletingParentId}`, { method: 'DELETE', credentials: 'include' });
                      const respText = await res.text();
                      let respBody: Record<string, unknown> | null = null;
                      try { respBody = respText ? JSON.parse(respText) : null; } catch { respBody = respText as unknown as Record<string, unknown>; }
                      if (!res.ok) {
                        const message = respBody && typeof respBody === 'object' && ('message' in respBody || 'error' in respBody)
                          ? (respBody.message || respBody.error)
                          : (typeof respBody === 'string' ? respBody : 'Erreur suppression');
                        throw new Error(String(message));
                      }
                      const reload = await fetchWithRefresh(`api/parent/admin`, { credentials: 'include' });
                      const text = await reload.text();
                      let json: unknown = null;
                      try { json = text ? JSON.parse(text) : null; } catch { json = text; }
                      setAdminData(json as AdminData);
                      setDeletingParentId(null);
                      const sm = 'Parent supprimé.';
                      setSuccessMessage(sm);
                      if (successTimer.current) { window.clearTimeout(successTimer.current); successTimer.current = null; }
                      successTimer.current = window.setTimeout(() => { setSuccessMessage(null); successTimer.current = null; }, 3500) as unknown as number;
                    } catch (err) {
                      console.error('Delete parent failed', err);
                      const msg = err instanceof Error ? ('Suppression échouée: ' + err.message) : 'Suppression échouée';
                      setFormError(msg);
                      setDeletingParentId(null);
                    }
                  }} className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2">{t('children.action.delete')}</button>
                </div>
              </div>
            </div>
          )}
          {showChildModal && <ChildOptionsModal child={selectedChild} onClose={() => { setShowChildModal(false); setSelectedChild(null); }} />}
          {/* Admin password reset modal for parents */}
          {adminResetModal && adminResetModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-2">Confirmer la réinitialisation du mot de passe</h3>
                <p className="mb-4">Vous allez réinitialiser le mot de passe de ce parent. Voulez-vous continuer ?</p>
                <div className="flex gap-3">
                  <button onClick={() => { setPendingSave(null); setAdminResetModal(null); }} className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2">Annuler</button>
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
                  }} className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2">Confirmer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Parent view (their children)
    return (
    <div className={`min-h-screen bg-[#fcfcff] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      {/* parent view uses inline successMessage banner, not top-right toasts */}
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
        <h1 className="text-2xl font-semibold mb-4">Espace Parent</h1>
      {parentForCard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ParentCard
            parent={parentForCard}
            color={'bg-white'}
            parentDue={parentBilling[String(parentForCard.id)] || 0}
            onChildClick={(child) => { setSelectedChild(child); setShowChildModal(true); }}
            onEdit={undefined}
            onDelete={undefined}
            annualPerChild={15}
          />
        </div>
      ) : children.length === 0 ? (
        <div>Aucun enfant trouvé.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map(child => (
            <div key={child.id} className="p-4 border rounded shadow-sm" style={{ borderColor: '#fcdcdf' }}>
              <div className="flex justify-between items-center">
                <div>
                  <button type="button" className="font-medium cursor-pointer text-[#08323a] hover:text-[#0b5566] text-left" onClick={(e) => { e.stopPropagation(); if (import.meta.env.DEV) console.debug('[ParentDashboard] child click', child); setSelectedChild(child); setShowChildModal(true); }}>{child.name}</button>
                  <div className="text-sm text-gray-500">Groupe: {child.group}</div>
                </div>
                <div className="flex space-x-2">
                  <button className="btn bg-[#a9ddf2] text-[#0b5566] hover:bg-[#f7f4d7]" onClick={() => navigate(`/parent/child/${child.id}/schedule`)}>
                    Planning
                  </button>
                  <button className="btn bg-[#a9ddf2] text-[#0b5566] hover:bg-[#f7f4d7]" onClick={() => navigate(`/parent/child/${child.id}/reports`)}>
                    Rapports
                  </button>
                </div>
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
