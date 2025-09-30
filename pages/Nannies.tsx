import React from 'react';
import { useI18n } from '../src/lib/useI18n';
import '../styles/filter-responsive.css';
import NannyCalendar from '../components/NannyCalendar';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';


const API_URL = import.meta.env.VITE_API_URL;


function PlanningModal({ nanny, onClose }: { nanny: Nanny; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
        <h2 className="text-xl font-bold mb-4 text-center">{t('nanny.planning.of', { name: nanny.name })}</h2>
        <NannyCalendar nannyId={nanny.id} />
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { getCached, setCached } from '../src/utils/apiCache';

interface Child {
  id: string;
  name: string;
}

interface Nanny {
  id: string;
  name: string;
  availability: string;
  experience: number;
  assignedChildren: Child[];
  specializations?: string[];
  status?: 'Disponible' | 'En congé';
  contact?: string;
  email?: string;
  cotisationPaidUntil?: string | null;
  birthDate?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

const emptyForm: Omit<Nanny, 'id' | 'assignedChildren'> & { email?: string; password?: string } = {
  name: '',
  availability: 'Disponible',
  // keep runtime empty so placeholder shows; cast to satisfy TS (Nanny.experience is number)
  experience: '' as unknown as number,
  specializations: [],
  status: 'Disponible',
  contact: '',
  email: '',
  password: '',
  birthDate: undefined,
  address: '',
  postalCode: '',
  city: '',
  region: '',
  country: '',
};

export default function Nannies() {
  const { t } = useI18n();
  const { user } = useAuth();
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
  const [nannies, setNannies] = useState<Nanny[]>([]);
  const [cotisationStatus, setCotisationStatus] = useState<Record<string, { paidUntil: string | null; loading: boolean }>>({});
  const [cotisationAmounts, setCotisationAmounts] = useState<Record<string, number>>({});
  interface Assignment {
    id: string;
    date: string;
    nanny: Nanny;
    child: Child;
  }
  
    const [assignments, setAssignments] = useState<Assignment[]>([]); 
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  // --- geodata/autocomplete (copied from ParentDashboard/RegisterPage)
  type GeodataPlace = { house_number?: string | null; street?: string | null; city?: string | null; state?: string | null; country?: string | null; postcode?: string | null; name?: string };
  const [placeSuggestions, setPlaceSuggestions] = useState<GeodataPlace[]>([]);
  const [openAddress, setOpenAddress] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const searchTimer = React.useRef<number | null>(null);

  const fetchGeodata = React.useCallback(async (query: string) => {
    if (rateLimitedUntil && Date.now() < rateLimitedUntil) return;
    if (!query || query.length < 3) { setPlaceSuggestions([]); return; }
    try {
      const res = await fetch(`/api/geodata/positionstack?q=${encodeURIComponent(query)}&limit=12`);
      if (res.status === 422) {
        setPlaceSuggestions([]);
        return;
      }
      if (res.status === 429) {
        const cooldownMs = 60_000;
        setRateLimitedUntil(Date.now() + cooldownMs);
        setPlaceSuggestions([]);
        return;
      }
      if (!res.ok) { setPlaceSuggestions([]); return; }
      const data = (await res.json()) as GeodataPlace[];
      const arr = data || [];
      const addresses = arr.filter((p) => !!(p.house_number || p.street));
      setPlaceSuggestions(addresses);
    } catch (err) {
      console.error('geodata fetch error', err);
      setPlaceSuggestions([]);
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
      const addrEl = document.querySelector('#nanny-form-address');
      if (addrEl && addrEl.contains(target)) return;
      setOpenAddress(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
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
  const [showPw, setShowPw] = useState(false);
  const [birthInputType, setBirthInputType] = useState<'text' | 'date'>('text');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [error, setError] = useState('');
  const [planningNanny, setPlanningNanny] = useState<Nanny|null>(null);
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');

  const fetchCotisation = async (nannyId: string) => {
    setCotisationStatus(s => ({ ...s, [nannyId]: { ...s[nannyId], loading: true } }));
    try {
      const res = await fetchWithRefresh(`${API_URL}/nannies/${nannyId}/cotisation`, { credentials: 'include' });
      const data = await res.json();
      setCotisationStatus(s => ({ ...s, [nannyId]: { paidUntil: data.cotisationPaidUntil, loading: false } }));
      if (data.lastCotisationAmount) {
        setCotisationAmounts(prev => ({ ...prev, [nannyId]: Number(data.lastCotisationAmount) }));
      }
    } catch {
      setCotisationStatus(s => ({ ...s, [nannyId]: { paidUntil: null, loading: false } }));
    }
  };

  const [messages, setMessages] = useState<Record<string, { text: string; type: 'success' | 'error' } | null>>({});
  const [confirmPayment, setConfirmPayment] = useState<{ nannyId: string; amount: number } | null>(null);
  // Admin password-reset modal state
  const [adminResetModal, setAdminResetModal] = useState<{ open: boolean; nannyId?: string; password?: string } | null>(null);
  const [pendingSave, setPendingSave] = useState<{ payload: Partial<typeof emptyForm> & { experience?: number; newPassword?: string }; editingId?: string | null } | null>(null);

  const payCotisation = async (nannyId: string, amount?: number) => {
    setCotisationStatus(s => ({ ...s, [nannyId]: { ...s[nannyId], loading: true } }));
    try {
      const body = amount ? JSON.stringify({ amount }) : undefined;
      const res = await fetchWithRefresh(`${API_URL}/nannies/${nannyId}/cotisation`, { method: 'PUT', credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : undefined, body });
      const data = await res.json();
      setCotisationStatus(s => ({ ...s, [nannyId]: { paidUntil: data.cotisationPaidUntil, loading: false } }));
  setMessages(m => ({ ...m, [nannyId]: { text: t('nanny.payment.success'), type: 'success' } }));
      if (data.lastCotisationAmount) setCotisationAmounts(prev => ({ ...prev, [nannyId]: Number(data.lastCotisationAmount) }));
      setTimeout(() => setMessages(m => ({ ...m, [nannyId]: null })), 3000);
      await fetchCotisation(nannyId);
      } catch {
      setCotisationStatus(s => ({ ...s, [nannyId]: { paidUntil: null, loading: false } }));
  setMessages(m => ({ ...m, [nannyId]: { text: t('nanny.payment.error'), type: 'error' } }));
      setTimeout(() => setMessages(m => ({ ...m, [nannyId]: null })), 4000);
    }
  };

  const requestPay = (nannyId: string) => {
    const amount = cotisationAmounts[nannyId] || 10;
    setConfirmPayment({ nannyId, amount });
  };

  const confirmPay = async () => {
    if (!confirmPayment) return;
    const { nannyId, amount } = confirmPayment;
    setConfirmPayment(null);
    await payCotisation(nannyId, amount);
  };

  const fetchNannies = React.useCallback(() => {
    setLoading(true);
    const cacheKeyNannies = `${API_URL}/nannies`;
    const cached = getCached<Nanny[]>(cacheKeyNannies);
    if (cached) {
      setNannies(cached);
      const amounts: Record<string, number> = {};
      cached.forEach(n => { amounts[n.id] = 10; fetchCotisation(n.id); });
      setCotisationAmounts(amounts);
      setLoading(false);
      return;
    }
    fetchWithRefresh(`${API_URL}/nannies`, { credentials: 'include' })
      .then(res => res.json())
      .then((nannies: Nanny[]) => {
  setNannies(nannies);
  const amounts: Record<string, number> = {};
  nannies.forEach(n => { amounts[n.id] = 10; fetchCotisation(n.id); });
  setCotisationAmounts(amounts);
  setCached(cacheKeyNannies, nannies);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNannies();
    fetchWithRefresh(`${API_URL}/assignments`, { credentials: 'include' })
      .then(res => res.json())
      .then(setAssignments);
  }, [fetchNannies]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password && form.password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      const payload: Partial<typeof emptyForm> & { experience?: number; newPassword?: string } = {
        ...form,
        experience: Number(form.experience),
      };
      if (payload.birthDate === null || payload.birthDate === '') delete payload.birthDate;
      if (!payload.email) delete payload.email;
      const isAdmin = user && typeof user.role === 'string' && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase().includes('super'));
      if (!payload.password) delete payload.password;
      const isEditingOwnNanny = editingId && user && (String(user.nannyId) === String(editingId));

      if (editingId && (isAdmin || isEditingOwnNanny) && form.password) {
        (payload as Partial<typeof emptyForm> & { newPassword?: string }).newPassword = form.password;
        delete (payload as Partial<typeof emptyForm> & { password?: string }).password;

        if (isAdmin && !isEditingOwnNanny) {
          setPendingSave({ payload, editingId });
          setAdminResetModal({ open: true, nannyId: editingId, password: form.password });
          return;
        }
      } else {
        if (!isAdmin && !isEditingOwnNanny) delete (payload as Partial<typeof emptyForm> & { newPassword?: string }).newPassword;
      }

      await performSave(payload, editingId);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    }
  };

  const performSave = async (payload: Partial<typeof emptyForm> & { experience?: number; newPassword?: string }, editingId?: string | null) => {
    try {
      const res = await fetchWithRefresh(editingId ? `${API_URL}/nannies/${editingId}` : `${API_URL}/nannies`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.status === 402) {
        try {
          const body = await res.json().catch(() => ({}));
          setError(body && body.error ? String(body.error) : 'Limite atteinte pour votre plan.');
        } catch {
          setError('Limite atteinte pour votre plan.');
        }
        return;
      }
      if (res.status === 409) {
        try {
          const body = await res.json().catch(() => ({}));
          const msg = body && (body.message || body.error) ? String(body.message || body.error) : 'Un utilisateur avec cet email existe déjà.';
          setError(msg);
        } catch {
          setError('Un utilisateur avec cet email existe déjà.');
        }
        return;
      }
      if (!res.ok) {
        try {
          const body = await res.json().catch(() => ({}));
          const msg = body && (body.message || body.error) ? String(body.message || body.error) : 'Erreur lors de la sauvegarde';
          setError(msg);
        } catch {
          setError('Erreur lors de la sauvegarde');
        }
        return;
      }
      setForm(emptyForm);
      setConfirmPassword('');
      setEditingId(null);
      fetchNannies();
      if (editingId) {
        setMessages(m => ({ ...m, [editingId]: { text: 'Mise à jour effectuée', type: 'success' } }));
        setTimeout(() => setMessages(m => ({ ...m, [editingId]: null })), 3000);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    }
  };

  const confirmAdminReset = async () => {
    if (!pendingSave) return;
    await performSave(pendingSave.payload, pendingSave.editingId);
    setPendingSave(null);
    setAdminResetModal(null);
  };

  const cancelAdminReset = () => {
    setPendingSave(null);
    setAdminResetModal(null);
  };

  const handleEdit = (nanny: Nanny) => {
    setForm({
      name: nanny.name,
      availability: nanny.availability,
      experience: nanny.experience,
      specializations: nanny.specializations || [],
      status: nanny.status || 'Disponible',
      contact: nanny.contact,
      email: nanny.email,
      birthDate: nanny.birthDate,
      address: nanny.address || '',
      postalCode: nanny.postalCode || '',
      city: nanny.city || '',
      region: nanny.region || '',
      country: nanny.country || '',
      password: '',
    });
    setEditingId(nanny.id);
    setAdding(false);
    setConfirmPassword('');
    setShowPw(false);
    // scroll to the form so the user doesn't have to manually scroll
    // timeout lets React render the form before we attempt to scroll
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // small offset so form header isn't flush to top (optional)
        window.scrollBy({ top: -12, left: 0, behavior: 'smooth' });
        const firstInput = formRef.current.querySelector<HTMLInputElement>('input[name="name"]');
        firstInput?.focus();
      }
    }, 80);
  };

  const [deleteId, setDeleteId] = useState<string|null>(null);
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetchWithRefresh(`${API_URL}/nannies/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      setDeleteId(null);
      fetchNannies();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    }
  };

  // Determine visible nannies depending on role: admins see all, nannies see their own card and any nanny who shares children
  const isNannyUser = user && typeof user.role === 'string' && user.role.toLowerCase() === 'nanny';
  const isAdmin = user && typeof user.role === 'string' && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('super'));
  const visibleNannies = React.useMemo(() => {
    if (!isNannyUser) return nannies;
    const meId = user && (user.nannyId || user.id);
    if (!meId) return [];
  // Children assigned to me
  const myChildIds = new Set(assignments.filter(a => a.nanny && String(a.nanny.id) === String(meId)).map(a => a.child.id));
  // Nanny IDs assigned to any of my children
  const relatedNannyIds = new Set(assignments.filter(a => myChildIds.has(a.child.id)).map(a => a.nanny.id));
  relatedNannyIds.add(meId);
  return nannies.filter(n => relatedNannyIds.has(n.id));
  }, [nannies, assignments, user, isNannyUser]);

  const totalNannies = visibleNannies.length;
  const availableToday = visibleNannies.filter(n => n.availability === 'Disponible').length;
  const onLeave = visibleNannies.filter(n => n.availability === 'En_congé' || n.availability === 'En congé').length;

  const filtered = nannies.filter(n =>
    (!search || n.name.toLowerCase().includes(search.toLowerCase())) &&
    (!availabilityFilter ||
      (availabilityFilter === 'Disponible' && n.availability === 'Disponible') ||
      (availabilityFilter === 'En congé' && (n.availability === 'En_congé' || n.availability === 'En congé')) ||
      availabilityFilter === '') &&
    (!experienceFilter || (experienceFilter === 'junior' ? n.experience < 3 : n.experience >= 3))
  );

  // remove desktop left padding when device is short landscape so page occupies full width
  return (
    <div className={`min-h-screen bg-[#fcfcff] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight" style={{ color: '#0b5566' }}>{t('page.nannies')}</h1>
            <div className="text-base md:text-lg font-medium mb-4 md:mb-6" style={{ color: '#08323a' }}>{t('page.nannies.description')}</div>
          </div>
          <div className="flex gap-2 items-center self-start md:ml-auto">
            {(user && typeof user.role === 'string' && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('super'))) && (
                <button
                type="button"
                onClick={() => { setForm(emptyForm); setEditingId(null); setAdding(true); }}
                className={`bg-[#0b5566] text-white font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-[#08323a] transition min-h-[44px] md:h-[60px] ${isShortLandscape ? '-translate-x-3' : ''}`}
                style={{transform: isShortLandscape ? 'translateX(-12px)' : undefined}}
              >
                {t('nanny.add')}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 w-full lg:flex-row lg:items-center lg:gap-4 lg:mb-6 lg:w-full md:max-w-md md:w-full">
          
          <div className="flex gap-2 flex-wrap justify-start w-full">
            <div className="bg-white rounded-xl shadow px-3 md:px-4 py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px] min-h-[44px] md:h-auto">
              <div className="text-xs text-gray-400">{t('stats.total')}</div>
              <div className="text-base md:text-lg font-bold text-[#0b5566]">{totalNannies}</div>
            </div>
            <div className="bg-white rounded-xl shadow px-3 md:px-4 py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px] min-h-[44px] md:h-auto">
              <div className="text-xs text-gray-400">{t('nanny.available_label')}</div>
              <div className="text-base md:text-lg font-bold text-[#0b5566]">{availableToday}</div>
            </div>
            <div className="bg-white rounded-xl shadow px-3 md:px-4 py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px] min-h-[44px] md:h-auto">
              <div className="text-xs text-gray-400">{t('nanny.on_leave_label')}</div>
              <div className="text-base md:text-lg font-bold text-[#0b5566]">{onLeave}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-6 w-full filter-responsive">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('nanny.search_placeholder')} className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-base w-full md:w-64" />
          <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)} className="border rounded px-3 py-2 text-xs md:text-base bg-white text-gray-700 shadow-sm w-full md:w-auto">
            <option value="">{t('nanny.filter.any')}</option>
            <option value="Disponible">{t('nanny.filter.disponible')}</option>
            <option value="En congé">{t('nanny.filter.en_conge')}</option>
          </select>
          <select value={experienceFilter} onChange={e => setExperienceFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-xs md:text-base w-full md:w-auto">
            <option value="">{t('nanny.filter.experience_any')}</option>
            <option value="junior">{t('nanny.filter.experience_junior')}</option>
            <option value="senior">{t('nanny.filter.experience_senior')}</option>
          </select>
          <div className="flex-1"></div>
        </div>

        {(adding || editingId) && (
          <form ref={formRef} onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow p-4 md:p-6 grid gap-4 md:grid-cols-3 lg:grid-cols-3">
            {/* Shared input class ensures consistent widths and appearance */}
            <input name="name" value={form.name} onChange={handleChange} placeholder={t('nanny.form.name')} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
            <select name="availability" value={form.availability} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]">
              <option value="Disponible">{t('nanny.availability.available')}</option>
              <option value="En_congé">{t('nanny.availability.on_leave')}</option>
              <option value="Maladie">{t('nanny.availability.sick')}</option>
            </select>
              <div id="nanny-form-address" className="md:col-span-2">
                <label className="block text-left font-medium text-[#08323a]">
                  <div className="relative">
                    <input name="address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('parent.form.address')} className="mt-1 h-11 w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" onFocus={() => setOpenAddress(true)} />
                    {openAddress && placeSuggestions.length > 0 && (
                      <ul className="absolute z-20 left-0 right-0 bg-white border mt-1 max-h-56 overflow-auto rounded shadow">
                        {placeSuggestions.map((p, idx) => {
                          const summary = [p.house_number && `${p.house_number} ${p.street}`, p.street || p.name, p.postcode, p.state, p.country].filter(Boolean).join(', ');
                          const label = p.name || (p.house_number ? `${p.house_number} ${p.street}` : p.street || '');
                          return (
                            <li key={idx} role="button" tabIndex={0} onClick={() => { selectPlace(p); }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                              <div className="text-sm font-medium">{label}</div>
                              <div className="text-xs text-gray-500">{summary}</div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </label>
              </div>
              <label className="block text-left font-medium">
                <span className="sr-only">{t('parent.form.postalCode')}</span>
                <input name="postalCode" value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder={t('parent.form.postalCode')} className="mt-1 h-11 w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
              </label>
              <input name="city" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t('parent.form.city')} className="h-11 w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
              <input name="region" value={form.region || ''} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder={t('parent.form.region') || 'Région'} className="h-11 w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
              <input name="country" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder={t('parent.form.country') || 'Pays'} className="h-11 w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
            <input name="experience" type="number" value={form.experience || ''} onChange={handleChange} placeholder={t('nanny.form.experience') || 'Expérience'} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
            {/* Display formatted dd/mm/yyyy when not editing; keep ISO value for type=date */}
            <input
              name="birthDate"
              type={birthInputType}
              value={birthInputType === 'date' ? (form.birthDate || '') : (form.birthDate ? ((): string => {
                // robustly format any parsable date as DD/MM/YYYY
                try {
                  const d = new Date(String(form.birthDate));
                  if (!isNaN(d.getTime())) {
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const yyyy = String(d.getFullYear());
                    return `${dd}/${mm}/${yyyy}`;
                  }
                } catch (e) {
                  void e;
                }
                return String(form.birthDate);
              })() : '')}
              onChange={handleChange}
              placeholder={t('nanny.form.birthDate') || 'Date de naissance'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]"
              onFocus={() => setBirthInputType('date')}
              onBlur={() => setBirthInputType('text')}
              readOnly={birthInputType === 'text'}
            />
            <input name="specializations" value={form.specializations?.join(', ')} onChange={e => setForm({ ...form, specializations: e.target.value.split(',').map(s => s.trim()) })} placeholder={t('nanny.form.specializations')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base md:col-span-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
            <input name="contact" type="tel" value={form.contact || ''} onChange={handleChange} placeholder={t('nanny.form.contact')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
            <input name="email" type="email" value={form.email || ''} onChange={handleChange} placeholder={t('nanny.form.email')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
            <div className="relative md:col-span-1">
              <input name="password" autoComplete="new-password" type={showPw ? "text" : "password"} value={form.password || ''} onChange={handleChange} placeholder={t('nanny.form.password')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base pr-10 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
              <button type="button" tabIndex={-1} className="absolute right-2 top-2 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>{showPw ? "🙈" : "👁️"}</button>
            </div>
            <div className="relative md:col-span-1">
              <input name="confirmPassword" autoComplete="new-password" type={showPw ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('nanny.form.confirmPassword')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base pr-10 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
              <button type="button" tabIndex={-1} className="absolute right-2 top-2 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>{showPw ? "🙈" : "👁️"}</button>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-[#0b5566] text-white px-4 py-2 rounded hover:bg-[#08323a] transition">
                {editingId ? t('global.save') : t('global.add')}
              </button>
              <button type="button" onClick={() => { setForm(emptyForm); setConfirmPassword(''); setEditingId(null); setAdding(false); }} className="bg-gray-300 px-4 py-2 rounded">{t('global.cancel')}</button>
            </div>
            {error && <div className="text-red-600 md:col-span-2">{error}</div>}
          </form>
        )}

        {loading ? (
          <div>Chargement...</div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full children-responsive-grid">
            {filtered
              .filter(n => visibleNannies.some(v => String(v.id) === String(n.id)))
              .map((nanny, idx) => {
              const cotisation = cotisationStatus[nanny.id];
              const daysRemaining = cotisation && cotisation.paidUntil ? Math.max(0, Math.ceil((new Date(cotisation.paidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
              const cardColors = [
                'bg-blue-50',
                'bg-yellow-50',
                'bg-purple-50',
                'bg-green-50',
                'bg-pink-50',
                'bg-orange-50',
              ];
              const color = cardColors[idx % cardColors.length];
              const isDeleting = deleteId === nanny.id;
              const todayStr = new Date().toISOString().split('T')[0];
              const assignedTodayCount = assignments.filter(a => a.nanny && a.nanny.id === nanny.id && a.date.split('T')[0] === todayStr).length;
              const isPaymentModalOpen = confirmPayment?.nannyId === nanny.id;
              // Normalize availability and compute label + classes for colored pill
              const _availRaw = String(nanny.availability || '').toLowerCase();
              const availabilityLabel = (nanny.availability === 'En_congé' || nanny.availability === 'En congé')
                ? t('nanny.availability.on_leave')
                : (nanny.availability === 'Disponible' ? t('nanny.availability.available') : t('nanny.availability.sick'));
              let availabilityClasses = 'px-2 py-1 rounded-full text-xs font-medium ';
              if (_availRaw.includes('dispon')) {
                availabilityClasses += 'bg-green-100 text-green-800 border border-green-200';
              } else if (_availRaw.includes('malad') || _availRaw.includes('cong')) {
                availabilityClasses += 'bg-red-100 text-red-700 border border-red-200';
              } else {
                availabilityClasses += 'bg-white border border-gray-200 text-gray-600';
              }
              return (
                <div
                  key={nanny.id}
                  className={`rounded-2xl shadow ${color} relative flex flex-col min-h-[440px] h-full transition-transform duration-500 perspective-1000 overflow-hidden`}
                  style={{ height: '100%', perspective: '1000px' }}
                >
                  {/* availability badge moved into header below name */}
                  <div
                    className={`w-full h-full transition-transform duration-500 ${isDeleting ? 'rotate-y-180' : ''}`}
                    style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
                  >
                    <div
                      className={`absolute inset-0 w-full h-full p-3 sm:p-4 md:p-6 flex flex-col items-center ${isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-transparent`}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                        <div className="w-full pt-2 sm:pt-3 text-center">
                          <div className="flex items-center justify-center">
                            <h3 className="font-semibold text-lg sm:text-xl text-[#08323a] truncate max-w-[220px] -mt-1 -translate-y-0.5" title={nanny.name} style={{transform: 'translateY(-2px)'}}>{nanny.name}</h3>
                          </div>
                          <div className="mt-2 flex items-center justify-center gap-4 text-sm text-gray-600">
                            <span className={availabilityClasses}>
                              {availabilityLabel}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium">{`${nanny.experience} ${nanny.experience === 1 ? 'an' : 'ans'} exp`}</span>
                            {nanny.birthDate ? (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap" title={t('label.birthDate')}>
                                🎂 {new Date(nanny.birthDate).toLocaleDateString('fr-FR')}
                              </span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap" title={t('label.birthDate')}>
                                🎂 {t('children.birthDate.undefined')}
                              </span>
                            )}
                          </div>
                        </div>
                      {/* birthday now shown in header pill; detailed date removed to avoid duplication */}
                      <div className="mt-4 flex flex-col gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4">
                        <span className="flex items-start gap-2 w-full justify-start">
                          <span aria-hidden className={`inline-block ${nanny.address ? '' : 'text-gray-300'}`}>📍</span>
                          <div className="leading-snug">
                            {nanny.address ? <div className="truncate">{nanny.address}</div> : <div className="text-gray-300">—</div>}
                            {(nanny.postalCode || nanny.city) ? <div className="truncate">{[nanny.postalCode, nanny.city].filter(Boolean).join(' ')}</div> : <div className="text-gray-300">—</div>}
                          </div>
                        </span>
                        <span className="flex items-center gap-2 w-full justify-start">
                          <span className="w-5 text-center text-sm sm:text-base" role="img" aria-label="Email">✉️</span>
                          {nanny.email ? (
                            <a href={`mailto:${nanny.email}`} className="text-blue-700 underline text-xs sm:text-sm break-words max-w-full sm:max-w-none" aria-label={`Envoyer un mail à ${nanny.name}`}>{nanny.email}</a>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">—</span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 w-full justify-start">
                          <span aria-hidden className={`inline-block ${nanny.contact ? '' : 'text-gray-300'}`}>📞</span>
                          {nanny.contact ? (
                            <a href={`tel:${nanny.contact}`} className="text-blue-700 underline text-xs sm:text-sm break-words max-w-full sm:max-w-none" aria-label={`Appeler ${nanny.name}`}>{nanny.contact}</a>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">—</span>
                          )}
                        </span>
                      </div>
                      {nanny.specializations && nanny.specializations.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mb-2 w-full px-2 sm:px-4">
                          {nanny.specializations.map((spec, i) => (
                            <span key={i} className="bg-purple-100 text-purple-700 px-1 sm:px-2 py-1 rounded-full text-xs font-semibold border border-purple-200 truncate max-w-[80px] sm:max-w-none">{spec}</span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs sm:text-sm text-gray-700 mb-2 w-full flex flex-col items-center">
                        <span className="block font-medium mb-1 text-center">
                          {t('nanny.assignments_today')}
                          <span className="inline-block bg-white text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-gray-200 ml-1">
                            {assignedTodayCount}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mt-auto mb-4 w-full min-w-0 items-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-gray-700">{t('nanny.cotisation.label')}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-2">
                              {cotisation?.loading ? (
                                <span className="text-sm text-gray-500">{t('loading')}</span>
                              ) : daysRemaining > 0 ? (
                                <span className="text-base font-bold text-[#08323a]">{(cotisationAmounts[nanny.id] ?? 10)}€</span>
                              ) : isAdmin ? (
                                <input
                                  type="number"
                                  className="w-20 px-2 py-1 border rounded text-sm"
                                  value={cotisationAmounts[nanny.id] ?? 10}
                                  onChange={(e) => setCotisationAmounts(prev => ({ ...prev, [nanny.id]: Number(e.target.value) }))}
                                />
                              ) : (
                                <span className="text-base font-bold text-[#08323a]">10€</span>
                              )}

                              {cotisation?.loading ? (
                                <span className="text-gray-400 text-xl">…</span>
                              ) : daysRemaining > 0 ? (
                                <span className="text-[#0b5566] text-xl">✔️</span>
                              ) : (
                                <span className="text-red-500 text-xl">❌</span>
                              )}
                            </div>

                            {/* Pay button placed to the right of the amount/input and status icon */}
                            {daysRemaining <= 0 && isAdmin && (
                              <button
                                className="ml-2 text-[#0b5566] text-xs font-semibold px-3 py-1 rounded bg-[#a9ddf2] hover:bg-[#f7f4d7] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={cotisation?.loading || isPaymentModalOpen}
                                onClick={() => requestPay(nanny.id)}
                              >
                                {cotisation?.loading ? t('nanny.payment.loading') : isPaymentModalOpen ? t('nanny.payment.confirming') : t('nanny.payment.pay')}
                              </button>
                            )}
                          </div>

                          <span className="text-xs text-gray-500 text-center mt-1">
                            {cotisation ? (
                              cotisation.loading ? t('loading') : (
                                cotisation.paidUntil ? (daysRemaining > 0 ? t('nanny.cotisation.days_remaining', { n: String(daysRemaining) }) : t('nanny.cotisation.renew')) : t('nanny.cotisation.renew')
                              )
                            ) : '—'}
                          </span>

                          {daysRemaining <= 0 && messages[nanny.id] && (
                            <div className={`mt-1 text-xs ${messages[nanny.id]?.type === 'success' ? 'text-[#0b5566]' : 'text-red-600'}`}>
                              {messages[nanny.id]?.text}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setPlanningNanny(nanny)}
                              className="bg-white border border-gray-200 text-gray-500 hover:text-[#08323a] rounded-full p-2 shadow-sm"
                              title={t('nanny.planning.button')}
                              aria-label={t('nanny.planning.button') as string}
                            >
                              {/* Calendar icon */}
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-current"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            </button>
                            <button
                              onClick={() => handleEdit(nanny)}
                              className="bg-white border border-gray-200 text-gray-500 hover:text-[#08323a] rounded-full p-2 shadow-sm"
                              title={t('children.action.edit')}
                            >
                              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg>
                            </button>
                            <button
                                onClick={() => setDeleteId(nanny.id)}
                                className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full p-2 shadow-sm"
                                title={t('children.action.delete')}
                              >
                              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-white rounded-2xl shadow-xl p-8 ${isDeleting ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <div className="text-red-500 text-4xl mb-2">🗑️</div>
                      <div className="text-lg font-semibold mb-2 text-gray-900 text-center">{t('modal.delete.title')}</div>
                      <div className="text-gray-500 mb-6 text-center">{t('nanny.delete.confirm_body')}</div>
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={() => setDeleteId(null)}
                          className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition"
                        >{t('modal.cancel')}</button>
                        <button
                          onClick={handleDelete}
                          className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-red-600 transition shadow"
                        >{t('children.action.delete')}</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {confirmPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">{t('nanny.payment.confirm_title')}</h3>
            <p className="mb-4">{t('nanny.payment.confirm_body', { amount: String(confirmPayment.amount) })}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPayment(null)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2"
              >{t('modal.cancel')}</button>
              <button
                onClick={confirmPay}
                className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2"
              >{t('common.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {planningNanny && (
        <PlanningModal nanny={planningNanny} onClose={() => setPlanningNanny(null)} />
      )}
      {/* Admin password reset confirmation modal */}
      {adminResetModal && adminResetModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">{t('parent.reset.confirm_title')}</h3>
            <p className="mb-4">{t('parent.reset.confirm_body')}</p>
            <div className="flex gap-3">
              <button onClick={cancelAdminReset} className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2">{t('modal.cancel')}</button>
              <button onClick={confirmAdminReset} className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2">{t('parent.reset.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
