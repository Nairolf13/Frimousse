import React from 'react';
import { useI18n } from '../src/lib/useI18n';
import '../styles/filter-responsive.css';
import NannyCalendar from '../components/NannyCalendar';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';


const API_URL = import.meta.env.VITE_API_URL;


function PlanningModal({ nanny, onClose, centerId }: { nanny: Nanny; onClose: () => void; centerId?: string | null }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
        <h2 className="text-xl font-bold mb-4 text-center">{t('nanny.planning.of', { name: nanny.name })}</h2>
        <NannyCalendar nannyId={nanny.id} centerId={centerId} />
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
  const [cotisationParentsTotals, setCotisationParentsTotals] = useState<Record<string, number>>({});
  interface Assignment {
    id: string;
    date: string;
    nanny: Nanny;
    child: Child;
  }
  
    const [assignments, setAssignments] = useState<Assignment[]>([]); 
  const [loading, setLoading] = useState(true);
    const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
    const [centerFilter, setCenterFilter] = useState<string | null>(null);
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
    } catch (err: unknown) {
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
  // Password validation rules (same as ParentDashboard)
  const uppercaseRe = /[A-ZÀ-ÖØ-Ý]/; // include accented uppercase letters
  const digitRe = /\d/;
  const specialRe = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;
  const minLength = 8;
  const hasUpper = uppercaseRe.test(String(form.password || ''));
  const hasDigit = digitRe.test(String(form.password || ''));
  const hasSpecial = specialRe.test(String(form.password || ''));
  const hasLength = String(form.password || '').length >= minLength;
  const passwordValid = hasUpper && hasDigit && hasSpecial && hasLength;
  const [birthInputType, setBirthInputType] = useState<'text' | 'date'>('text');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const optimisticIdRef = useRef<string | null>(null);
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

  const fetchParentsTotalForNanny = async (nannyId: string) => {
    try {
      const res = await fetchWithRefresh(`${API_URL}/nannies/${nannyId}/cotisation-total`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data.totalMonthly === 'number') {
        setCotisationParentsTotals(prev => ({ ...prev, [nannyId]: Number(data.totalMonthly) }));
      }
    } catch {
      // ignore
    }
  };

  const [messages, setMessages] = useState<Record<string, { text: string; type: 'success' | 'error' } | null>>({});
  const [confirmPayment, setConfirmPayment] = useState<{ nannyId: string; amount: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimer = useRef<number | null>(null);
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
    const cacheKeyNannies = `${API_URL}/nannies${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
    const cached = getCached<Nanny[]>(cacheKeyNannies);
    if (cached) {
        setNannies(cached);
        // Attempt to fetch enriched details in a single batch call; fall back to per-nanny logic if that fails
        (async () => {
          try {
            const res = await fetchWithRefresh(`${API_URL}/nannies/batch/details`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: cached.map(c => c.id) }) });
            if (res.ok) {
              const enriched = await res.json();
              // enriched is array of nanny objects with totalMonthly
              setNannies(enriched);
              const amounts: Record<string, number> = {};
              const cotStatus: Record<string, { paidUntil: string | null; loading: boolean }> = {};
              const parentsTotals: Record<string, number> = {};
              (enriched || []).forEach((n: Nanny & { totalMonthly?: number; lastCotisationAmount?: number }) => {
                amounts[n.id] = Number(n.lastCotisationAmount) || 10;
                cotStatus[n.id] = { paidUntil: n.cotisationPaidUntil || null, loading: false };
                parentsTotals[n.id] = Number(n.totalMonthly || 0);
              });
              setCotisationAmounts(amounts);
              setCotisationStatus(cotStatus);
              setCotisationParentsTotals(parentsTotals);
              try { setCached(cacheKeyNannies, enriched); } catch { /* ignore cache errors */ }
              setLoading(false);
              return;
            }
          } catch {
            // ignore and fall back to existing cached list
          }
          // fallback defaults when batch details fail
          const amounts: Record<string, number> = {};
          const cotStatus: Record<string, { paidUntil: string | null; loading: boolean }> = {};
          (cached || []).forEach(n => { amounts[n.id] = 10; cotStatus[n.id] = { paidUntil: n.cotisationPaidUntil || null, loading: false }; });
          setCotisationAmounts(amounts);
          setCotisationStatus(cotStatus);
          setLoading(false);
        })();
        return;
      }
    (async () => {
      try {
        const res = await fetchWithRefresh(`${API_URL}/nannies/batch/details${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (!res.ok) throw new Error('Failed to load nannies');
        const enriched = await res.json();
        setNannies(enriched);
        const amounts: Record<string, number> = {};
        const cotStatus: Record<string, { paidUntil: string | null; loading: boolean }> = {};
        const parentsTotals: Record<string, number> = {};
        (enriched || []).forEach((n: Nanny & { totalMonthly?: number; lastCotisationAmount?: number }) => {
          amounts[n.id] = Number(n.lastCotisationAmount) || 10;
          cotStatus[n.id] = { paidUntil: n.cotisationPaidUntil || null, loading: false };
          parentsTotals[n.id] = Number(n.totalMonthly || 0);
        });
        setCotisationAmounts(amounts);
        setCotisationStatus(cotStatus);
        setCotisationParentsTotals(parentsTotals);
        try { setCached(cacheKeyNannies, enriched); } catch { /* ignore cache errors */ }
      } catch (err: unknown) {
        console.error('Failed to fetch nannies batch details', err);
        // fallback: simple list fetch
        try {
          const res = await fetchWithRefresh(`${API_URL}/nannies${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`, { credentials: 'include' });
          const nannies = await res.json();
          setNannies(nannies);
          const amounts: Record<string, number> = {};
          const cotStatus: Record<string, { paidUntil: string | null; loading: boolean }> = {};
          (nannies || []).forEach((n: Nanny) => { amounts[n.id] = 10; cotStatus[n.id] = { paidUntil: n.cotisationPaidUntil || null, loading: false }; });
          setCotisationAmounts(amounts);
          setCotisationStatus(cotStatus);
          try { setCached(cacheKeyNannies, nannies); } catch { /* ignore */ }
        } catch (e) {
          console.error('Failed to fetch nannies list fallback', e);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [centerFilter]);

  useEffect(() => {
    // initial load
    fetchNannies();
    fetchWithRefresh(`${API_URL}/assignments`, { credentials: 'include' })
      .then(res => res.json())
      .then(setAssignments);
    return () => {
      if (successTimer.current) { window.clearTimeout(successTimer.current); successTimer.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If super-admin, load centers for filter
  useEffect(() => {
    let mounted = true;
    const loadCenters = async () => {
      const u = user as { role?: string | null } | null;
      if (!u || u.role !== 'super-admin') return;
      try {
        const res = await fetchWithRefresh(`${API_URL}/centers`, { credentials: 'include' });
        if (!res || !res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        const centersData = json.data || json.centers || json;
        if (Array.isArray(centersData)) setCenters(centersData.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      } catch (e) {
        console.error('Failed to load centers for filter', e);
      }
    };
    loadCenters();
    return () => { mounted = false; };
  }, [user]);

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
    // If a password is provided, ensure it satisfies the policy
    if (form.password && !passwordValid) {
      setError('Le mot de passe ne respecte pas les règles requises');
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

      // optimistic UI: insert a temporary nanny when creating a new one
      let optimisticId: string | null = null;
      if (!editingId) {
        // If creating, ensure the email is not already used by another nanny (case-insensitive)
        if (payload.email) {
          const emailLower = String(payload.email).trim().toLowerCase();
          const exists = (nannies || []).some(n => n.email && String(n.email).trim().toLowerCase() === emailLower);
          if (exists) {
            setError('Une utilisateur avec cet email existe déjà.');
            return;
          }
        }
        optimisticId = `optimistic-${Date.now()}`;
        optimisticIdRef.current = optimisticId;
        const optimisticNanny: Nanny = {
          id: optimisticId,
          name: form.name || '',
          availability: form.availability || 'Disponible',
          experience: Number(form.experience) || 0,
          assignedChildren: [],
          specializations: form.specializations || [],
          status: form.status || 'Disponible',
          contact: form.contact || '',
          email: form.email || '',
          cotisationPaidUntil: null,
          birthDate: form.birthDate || undefined,
          address: form.address || '',
          postalCode: form.postalCode || '',
          city: form.city || '',
          region: form.region || '',
          country: form.country || '',
        };
        setNannies(prev => [optimisticNanny, ...prev]);
        try {
          const cacheKey = `${API_URL}/nannies${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
          const existing = getCached<Nanny[]>(cacheKey) || [];
          setCached(cacheKey, [optimisticNanny, ...existing]);
        } catch (err) { void err; }
      }

      await performSave(payload, editingId);
    } catch (err: unknown) {
      // if something threw we need to cleanup optimistic entry as well
      const optId = optimisticIdRef.current;
      if (optId) {
        setNannies(prev => prev.filter(n => String(n.id) !== String(optId)));
        try {
          const cacheKey = `${API_URL}/nannies${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
          const existing = getCached<Nanny[]>(cacheKey) || [];
          setCached(cacheKey, existing.filter(n => String(n.id) !== String(optId)));
        } catch {
            /* ignore cache error */
          }
        optimisticIdRef.current = null;
      }

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    }
  };

  const performSave = async (payload: Partial<typeof emptyForm> & { experience?: number; newPassword?: string }, editingId?: string | null) => {
    // helper to wipe any optimistic row we previously inserted
    const cleanupOptimistic = () => {
      const optId = optimisticIdRef.current;
      if (optId) {
        setNannies(prev => prev.filter(n => String(n.id) !== String(optId)));
        try {
          const cacheKey = `${API_URL}/nannies${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
          const existing = getCached<Nanny[]>(cacheKey) || [];
          setCached(cacheKey, existing.filter(n => String(n.id) !== String(optId)));
        } catch {
            /* ignore cache error */
          }
        optimisticIdRef.current = null;
      }
    };

    try {
      const res = await fetchWithRefresh(editingId ? `${API_URL}/nannies/${editingId}` : `${API_URL}/nannies`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.status === 402) {
        cleanupOptimistic();
        try {
          const body = await res.json().catch(() => ({}));
          setError(body && body.error ? String(body.error) : 'Limite atteinte pour votre plan.');
        } catch {
          setError('Limite atteinte pour votre plan.');
        }
        return;
      }
      if (res.status === 409) {
        cleanupOptimistic();
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
        cleanupOptimistic();
        try {
          const body = await res.json().catch(() => ({}));
          const msg = body && (body.message || body.error) ? String(body.message || body.error) : 'Erreur lors de la sauvegarde';
          setError(msg);
        } catch {
          setError('Erreur lors de la sauvegarde');
        }
        return;
      }
      // Attempt to parse saved nanny from response
      let savedNanny: Nanny | null = null;
      try {
        savedNanny = await res.json();
      } catch {
        savedNanny = null;
      }

      // Reset form state and close add form
      setForm(emptyForm);
      setConfirmPassword('');
      setEditingId(null);
      setAdding(false);

      if (editingId) {
        // Update local list with edited nanny if available
        if (savedNanny) {
          setNannies(prev => prev.map(n => (String(n.id) === String(editingId) ? savedNanny as Nanny : n)));
          try { const cacheKey = `${API_URL}/nannies${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`; setCached(cacheKey, getCached<Nanny[]>(cacheKey)?.map(n => (String(n.id) === String(editingId) ? savedNanny as Nanny : n)) ); } catch (err) { void err; }
        }
        setMessages(m => ({ ...m, [editingId]: { text: 'Mise à jour effectuée', type: 'success' } }));
        setTimeout(() => setMessages(m => ({ ...m, [editingId]: null })), 3000);
        // show general inline success banner
        setSuccessMessage(t('nanny.update_success') || 'Mise à jour effectuée');
        if (successTimer.current) { window.clearTimeout(successTimer.current); successTimer.current = null; }
        successTimer.current = window.setTimeout(() => { setSuccessMessage(null); successTimer.current = null; }, 3500) as unknown as number;
      }
      else {
        // creation path: insert new nanny into local state so UI updates immediately
        // If the response includes an id, try to insert the created nanny (and fetch full record if partial).
        if (savedNanny && (savedNanny as Nanny).id) {
          let fullNanny: Nanny | null = savedNanny as Nanny;
          // If the created object seems partial (missing key display fields), try to fetch the full object
          const looksPartial = !fullNanny.name || !fullNanny.email || fullNanny.experience === undefined || fullNanny.experience === null;
          if (looksPartial && (savedNanny as Nanny).id) {
            try {
              const id = (savedNanny as Nanny).id;
              const getRes = await fetchWithRefresh(`${API_URL}/nannies/${id}`, { credentials: 'include' });
              if (getRes.ok) {
                const fetched = await getRes.json().catch(() => null);
                if (fetched) fullNanny = fetched as Nanny;
              }
            } catch (err) { void err; }
          }

          // Insert or replace the (possibly fetched) full nanny.
          // If we previously inserted an optimistic nanny, replace that entry so the UI shows the real saved data.
          setNannies(prev => {
            try {
              const optId = optimisticIdRef.current;
              if (optId) {
                const replaced = prev.map(n => (String(n.id) === String(optId) ? (fullNanny as Nanny) : n));
                return replaced;
              }
            } catch (err) { void err; }
            return [fullNanny as Nanny, ...prev];
          });
          try {
            const cacheKey = `${API_URL}/nannies${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
            const existing = getCached<Nanny[]>(cacheKey) || [];
            const optId = optimisticIdRef.current;
            if (optId) {
              const replaced = existing.map(n => (String(n.id) === String(optId) ? (fullNanny as Nanny) : n));
              setCached(cacheKey, replaced);
            } else {
              setCached(cacheKey, [fullNanny as Nanny, ...existing]);
            }
          } catch (err) { void err; }

          // fetch additional data for the new nanny (cotisation & parents totals)
          try { if (fullNanny && fullNanny.id) { fetchCotisation(fullNanny.id); fetchParentsTotalForNanny(fullNanny.id); } } catch (err) { void err; }

          // clear optimistic id so future saves don't try to replace it
          optimisticIdRef.current = null;

          // show inline success banner for creation (we inserted/replaced the full nanny)
          setSuccessMessage(t('nanny.added_success') || 'Nounou ajoutée.');
          if (successTimer.current) { window.clearTimeout(successTimer.current); successTimer.current = null; }
          successTimer.current = window.setTimeout(() => { setSuccessMessage(null); successTimer.current = null; }, 3500) as unknown as number;

        } else {
          // fallback: refresh full list if response did not include created object or id
          fetchNannies();
          // show inline success banner
          setSuccessMessage(t('nanny.added_success') || 'Nounou ajoutée.');
          if (successTimer.current) { window.clearTimeout(successTimer.current); successTimer.current = null; }
          successTimer.current = window.setTimeout(() => { setSuccessMessage(null); successTimer.current = null; }, 3500) as unknown as number;
        }
        // creation path: show inline success banner
        setSuccessMessage(t('nanny.added_success') || 'Nounou ajoutée.');
        if (successTimer.current) { window.clearTimeout(successTimer.current); successTimer.current = null; }
        successTimer.current = window.setTimeout(() => { setSuccessMessage(null); successTimer.current = null; }, 3500) as unknown as number;
        // make sure our local list is in sync with server in case the response lacked
        // some fields or the cache was stale; we already updated the cache above and
        // inserted/replaced the nanny in state, so a full refetch isn't usually
        // necessary. If the cache update failed, the next user action (filter change,
        // deletion, etc.) will trigger a network fetch.
        // fetchNannies();  // disabled to avoid wiping optimistic update
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
      // Remove the deleted nanny from local state so UI updates immediately
      setNannies(prev => prev.filter(n => String(n.id) !== String(deleteId)));
      // Also clear cached nannies so subsequent fetches reflect deletion
  try { setCached(`${API_URL}/nannies${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`, undefined); } catch { /* ignore cache errors */ }
      // refetch to ensure related data (cotisations, totals) are up to date
      fetchNannies();
      // show inline success banner
      setSuccessMessage(t('nanny.delete_success') || 'Nounou supprimée.');
      if (successTimer.current) { window.clearTimeout(successTimer.current); successTimer.current = null; }
      successTimer.current = window.setTimeout(() => { setSuccessMessage(null); successTimer.current = null; }, 3500) as unknown as number;
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

  const inputCls = "border border-gray-200 rounded-xl px-3 py-2 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566] transition w-full";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  // remove desktop left padding when device is short landscape so page occupies full width
  return (
    <div className={`min-h-screen bg-[#f4f7fa] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('page.nannies')}</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('page.nannies.description')}</p>
            </div>
          </div>
          {(user && typeof user.role === 'string' && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('super'))) && (
            <button
              type="button"
              onClick={() => { setForm(emptyForm); setEditingId(null); setAdding(true); }}
              className="w-full sm:w-auto px-3 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white text-xs sm:text-sm font-semibold rounded-xl shadow hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              {t('nanny.add')}
            </button>
          )}
        </div>

        {/* KPI badges */}
        <div className="grid grid-cols-3 gap-3 mb-5 w-full sm:w-auto sm:flex sm:flex-row sm:gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 flex flex-col items-center justify-center">
            <div className="text-[10px] sm:text-xs text-gray-400 font-medium">{t('stats.total')}</div>
            <div className="text-lg font-extrabold text-[#0b5566]">{totalNannies}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 flex flex-col items-center justify-center">
            <div className="text-[10px] sm:text-xs text-gray-400 font-medium">{t('nanny.available_label')}</div>
            <div className="text-lg font-extrabold text-emerald-600">{availableToday}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 flex flex-col items-center justify-center">
            <div className="text-[10px] sm:text-xs text-gray-400 font-medium">{t('nanny.on_leave_label')}</div>
            <div className="text-lg font-extrabold text-amber-500">{onLeave}</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 w-full">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('nanny.search_placeholder')} className="border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-gray-700 bg-white shadow-sm text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 focus:border-[#0b5566] transition" />
          </div>
          {user && typeof user.role === 'string' && user.role === 'super-admin' && (
            <select value={centerFilter || ''} onChange={e => setCenterFilter(e.target.value || null)} className="border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 min-h-[40px]">
              <option value="">Tous les centres</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 min-h-[40px]">
            <option value="">{t('nanny.filter.any')}</option>
            <option value="Disponible">{t('nanny.filter.disponible')}</option>
            <option value="En congé">{t('nanny.filter.en_conge')}</option>
          </select>
          <select value={experienceFilter} onChange={e => setExperienceFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 min-h-[40px]">
            <option value="">{t('nanny.filter.experience_any')}</option>
            <option value="junior">{t('nanny.filter.experience_junior')}</option>
            <option value="senior">{t('nanny.filter.experience_senior')}</option>
          </select>
        </div>

        {/* Form */}
        {(adding || editingId) && (
          <form ref={formRef} onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            {/* Form header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#0b5566] to-[#08323a] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <h2 className="text-white font-semibold text-base">{editingId ? t('global.save') : t('nanny.add')}</h2>
            </div>
            <div className="p-6 grid gap-4 md:grid-cols-2">
            {/* Name */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('nanny.form.name')} <span className="text-red-500">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} placeholder={t('nanny.form.name')} required className={inputCls} />
            </div>

            {/* Availability */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('nanny.form.availability') || t('nanny.availability.available')} <span className="text-red-500">*</span></label>
              <select name="availability" value={form.availability} onChange={handleChange} required className={inputCls}>
                <option value="Disponible">{t('nanny.availability.available')}</option>
                <option value="En_congé">{t('nanny.availability.on_leave')}</option>
                <option value="Maladie">{t('nanny.availability.sick')}</option>
              </select>
            </div>

            {/* Address */}
            <div id="nanny-form-address" className="md:col-span-2">
              <label className={labelCls}>{t('parent.form.address')} <span className="text-red-500">*</span></label>
              <div className="relative">
                <input name="address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('parent.form.address')} className={inputCls} onFocus={() => setOpenAddress(true)} />
                {openAddress && placeSuggestions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 mt-1 max-h-56 overflow-auto rounded-xl shadow-lg">
                    {placeSuggestions.map((p, idx) => {
                      const summary = [p.house_number && `${p.house_number} ${p.street}`, p.street || p.name, p.postcode, p.state, p.country].filter(Boolean).join(', ');
                      const label = p.name || (p.house_number ? `${p.house_number} ${p.street}` : p.street || '');
                      return (
                        <li key={idx} role="button" tabIndex={0} onClick={() => { selectPlace(p); }} className="px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <div className="text-sm font-medium text-gray-800">{label}</div>
                          <div className="text-xs text-gray-500">{summary}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Postal code */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('parent.form.postalCode')} <span className="text-red-500">*</span></label>
              <input name="postalCode" value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder={t('parent.form.postalCode')} className={inputCls} />
            </div>

            {/* City */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('parent.form.city')} <span className="text-red-500">*</span></label>
              <input name="city" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t('parent.form.city')} className={inputCls} />
            </div>

            {/* Region */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('parent.form.region') || 'Région'} <span className="text-red-500">*</span></label>
              <input name="region" value={form.region || ''} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder={t('parent.form.region') || 'Région'} className={inputCls} />
            </div>

            {/* Country */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('parent.form.country') || 'Pays'} <span className="text-red-500">*</span></label>
              <input name="country" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder={t('parent.form.country') || 'Pays'} className={inputCls} />
            </div>

            {/* Experience */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('nanny.form.experience')} <span className="text-red-500">*</span></label>
              <input name="experience" type="number" value={form.experience || ''} onChange={handleChange} placeholder={t('nanny.form.experience') || 'Expérience'} required className={inputCls} />
            </div>

            {/* Birth date */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('nanny.form.birthDate') || 'Date de naissance'} <span className="text-red-500">*</span></label>
              <input
                name="birthDate"
                type={birthInputType}
                value={birthInputType === 'date' ? (form.birthDate || '') : (form.birthDate ? ((): string => {
                  try {
                    const d = new Date(String(form.birthDate));
                    if (!isNaN(d.getTime())) {
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const yyyy = String(d.getFullYear());
                      return `${dd}/${mm}/${yyyy}`;
                    }
                  } catch (e) { void e; }
                  return String(form.birthDate);
                })() : '')}
                onChange={handleChange}
                placeholder={t('nanny.form.birthDate') || 'Date de naissance'}
                className={inputCls}
                onFocus={() => setBirthInputType('date')}
                onBlur={() => setBirthInputType('text')}
                readOnly={birthInputType === 'text'}
              />
            </div>

            {/* Specializations */}
            <div className="md:col-span-2 flex flex-col">
              <label className={labelCls}>{t('nanny.form.specializations')}</label>
              <input name="specializations" value={form.specializations?.join(', ')} onChange={e => setForm({ ...form, specializations: e.target.value.split(',').map(s => s.trim()) })} placeholder={t('nanny.form.specializations')} className={inputCls} />
            </div>

            {/* Contact */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('nanny.form.contact')} <span className="text-red-500">*</span></label>
              <input name="contact" type="tel" value={form.contact || ''} onChange={handleChange} placeholder={t('nanny.form.contact')} className={inputCls} />
            </div>

            {/* Email */}
            <div className="flex flex-col">
              <label className={labelCls}>{t('nanny.form.email')} <span className="text-red-500">*</span></label>
              <input name="email" type="email" value={form.email || ''} onChange={handleChange} placeholder={t('nanny.form.email')} className={inputCls} />
            </div>

            {/* Password */}
            <div className="relative flex flex-col">
              <label className={labelCls}>{t('nanny.form.password')}</label>
              <input name="password" autoComplete="new-password" type={showPw ? "text" : "password"} value={form.password || ''} onChange={handleChange} placeholder={t('nanny.form.password')} className={`${inputCls} pr-10`} />
              <button type="button" tabIndex={-1} className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>
                {showPw ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>

            {/* Confirm password */}
            <div className="relative flex flex-col">
              <label className={labelCls}>{t('nanny.form.confirmPassword')}</label>
              <input name="confirmPassword" autoComplete="new-password" type={showPw ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('nanny.form.confirmPassword')} className={`${inputCls} pr-10`} />
              <button type="button" tabIndex={-1} className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>
                {showPw ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>

            {/* Password rules */}
            {(adding || editingId) && (
              <div className="md:col-span-2">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { ok: hasUpper, label: 'Une majuscule (A-Z)' },
                    { ok: hasDigit, label: 'Un chiffre (0-9)' },
                    { ok: hasSpecial, label: 'Un caractère spécial' },
                    { ok: hasLength, label: `${minLength} caractères min.` },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points={ok ? "20 6 9 17 4 12" : "18 6 6 18M6 6l12 12"}/></svg>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>

            {/* Form footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="text-xs text-gray-400">{t('children.form.required_note')} <span className="text-red-500">*</span></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setForm(emptyForm); setConfirmPassword(''); setEditingId(null); setAdding(false); }} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition text-sm font-medium">{t('global.cancel')}</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white font-semibold hover:opacity-90 transition text-sm shadow">
                  {editingId ? t('global.save') : t('global.add')}
                </button>
              </div>
            </div>
            {error && <div className="px-6 py-3 text-red-600 text-sm bg-red-50 border-t border-red-100">{error}</div>}
          </form>
        )}

        {/* Success banner */}
        {successMessage && (
          <div className="mb-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <span className="font-medium text-sm">{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="text-gray-500 text-sm py-8 text-center">Chargement...</div>
        ) : (
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
            {filtered
              .filter(n => visibleNannies.some(v => String(v.id) === String(n.id)))
              .map((nanny, idx) => {
              const cotisation = cotisationStatus[nanny.id];
              const daysRemaining = cotisation && cotisation.paidUntil ? Math.max(0, Math.ceil((new Date(cotisation.paidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
              const isDeleting = deleteId === nanny.id;
              const todayStr = new Date().toISOString().split('T')[0];
              const assignedTodayCount = assignments.filter(a => a.nanny && a.nanny.id === nanny.id && a.date.split('T')[0] === todayStr).length;
              const isPaymentModalOpen = confirmPayment?.nannyId === nanny.id;
              const _availRaw = String(nanny.availability || '').toLowerCase();
              const availabilityLabel = (nanny.availability === 'En_congé' || nanny.availability === 'En congé')
                ? t('nanny.availability.on_leave')
                : (nanny.availability === 'Disponible' ? t('nanny.availability.available') : t('nanny.availability.sick'));
              const availabilityClasses = _availRaw.includes('dispon')
                ? 'bg-emerald-100 text-emerald-700'
                : (_availRaw.includes('malad') || _availRaw.includes('cong'))
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600';

              const gradients = [
                'from-[#0b5566] to-[#0a7c97]',
                'from-violet-600 to-purple-500',
                'from-rose-500 to-pink-400',
                'from-emerald-600 to-teal-500',
                'from-amber-500 to-orange-400',
                'from-sky-600 to-blue-500',
              ];
              const gradient = gradients[idx % gradients.length];
              const initials = nanny.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

              return (
                <div key={nanny.id} className="relative bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col overflow-hidden">
                  {/* Delete overlay */}
                  {isDeleting && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 rounded-2xl p-8">
                      <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                        <svg width="28" height="28" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </div>
                      <div className="text-base font-semibold text-gray-900 text-center mb-1">{t('modal.delete.title')}</div>
                      <div className="text-sm text-gray-500 mb-6 text-center">{t('nanny.delete.confirm_body')}</div>
                      <div className="flex gap-3 w-full">
                        <button onClick={() => setDeleteId(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 font-medium hover:bg-gray-200 transition text-sm">{t('modal.cancel')}</button>
                        <button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-xl px-4 py-2 font-medium hover:bg-red-600 transition shadow text-sm">{t('children.action.delete')}</button>
                      </div>
                    </div>
                  )}

                  {/* Card header */}
                  <div
                    className={`px-5 pt-5 pb-4 bg-gradient-to-r ${gradient} flex items-center gap-3 cursor-pointer`}
                    onClick={() => setPlanningNanny(nanny)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPlanningNanny(nanny); } }}
                    aria-label={`Voir le planning de ${nanny.name}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-base truncate">{nanny.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white`}>{availabilityLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-white/80">{nanny.experience} {nanny.experience === 1 ? 'an' : 'ans'} exp.</span>
                        {nanny.birthDate && (
                          <>
                            <span className="text-white/40">·</span>
                            <span className="text-xs text-white/80">{new Date(nanny.birthDate).toLocaleDateString('fr-FR')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-white/60 flex-shrink-0">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex-1 flex flex-col p-5 gap-4">

                    {/* Contact info */}
                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
                      {(nanny.address || nanny.city) && (
                        <div className="flex items-start gap-2 text-sm text-gray-700">
                          <svg className="text-gray-400 flex-shrink-0 mt-0.5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <div className="leading-snug">
                            {nanny.address && <div className="truncate">{nanny.address}</div>}
                            {(nanny.postalCode || nanny.city) && <div className="text-gray-500 text-xs">{[nanny.postalCode, nanny.city].filter(Boolean).join(' ')}</div>}
                          </div>
                        </div>
                      )}
                      {nanny.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="text-gray-400 flex-shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          <a href={`mailto:${nanny.email}`} onClick={(e) => e.stopPropagation()} className="text-[#0b5566] hover:underline truncate">{nanny.email}</a>
                        </div>
                      )}
                      {nanny.contact && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="text-gray-400 flex-shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          <a href={`tel:${nanny.contact}`} onClick={(e) => e.stopPropagation()} className="text-[#0b5566] hover:underline">{nanny.contact}</a>
                        </div>
                      )}
                    </div>

                    {/* Specializations */}
                    {nanny.specializations && nanny.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {nanny.specializations.map((spec, i) => (
                          <span key={i} className="bg-violet-50 text-violet-700 px-2 py-1 rounded-lg text-xs font-medium border border-violet-100">{spec}</span>
                        ))}
                      </div>
                    )}

                    {/* Today assignments + availability */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${availabilityClasses}`}>{availabilityLabel}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                        {t('nanny.assignments_today')} <span className="font-bold text-gray-700">{assignedTodayCount}</span>
                      </span>
                    </div>

                    {/* Cotisation */}
                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('nanny.cotisation.label')}</span>
                        {cotisation && !cotisation.loading && (
                          daysRemaining > 0 ? (
                            <span className="ml-auto text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                              {t('nanny.cotisation.days_remaining', { n: String(daysRemaining) })}
                            </span>
                          ) : (
                            <span className="ml-auto text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center justify-center">{t('nanny.cotisation.renew')}</span>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {cotisation?.loading ? (
                          <span className="text-sm text-gray-400 animate-pulse">{t('loading')}</span>
                        ) : daysRemaining > 0 ? (
                          <span className="text-xl font-extrabold text-[#0b5566]">{(cotisationAmounts[nanny.id] ?? 10)}€</span>
                        ) : isAdmin ? (
                          <input
                            type="number"
                            className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20"
                            value={cotisationAmounts[nanny.id] ?? 10}
                            onChange={(e) => setCotisationAmounts(prev => ({ ...prev, [nanny.id]: Number(e.target.value) }))}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-xl font-extrabold text-gray-700">10€</span>
                        )}
                        {daysRemaining <= 0 && isAdmin && (
                          <button
                            className="text-[#0b5566] text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0b5566]/10 hover:bg-[#0b5566]/20 transition disabled:opacity-50"
                            disabled={cotisation?.loading || isPaymentModalOpen}
                            onClick={(e) => { e.stopPropagation(); requestPay(nanny.id); }}
                          >
                            {cotisation?.loading ? t('nanny.payment.loading') : isPaymentModalOpen ? t('nanny.payment.confirming') : t('nanny.payment.pay')}
                          </button>
                        )}
                        {messages[nanny.id] && (
                          <span className={`text-xs ml-1 ${messages[nanny.id]?.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{messages[nanny.id]?.text}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>{t('nanny.cotisation.total_parents') || 'Total parents mensuel'}</span>
                        <span className="font-bold text-gray-700 ml-1">{(cotisationParentsTotals[nanny.id] ?? 0)}€</span>
                      </div>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPlanningNanny(nanny); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#0b5566] transition px-2 py-1.5 rounded-lg hover:bg-white"
                      title={t('nanny.planning.button')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {t('nanny.planning.button')}
                    </button>
                    <div className="flex items-center gap-1 ml-auto">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(nanny); }} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#0b5566] transition px-2 py-1.5 rounded-lg hover:bg-white" title={t('children.action.edit')}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg>
                        {t('children.action.edit')}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(nanny.id); }} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50" title={t('children.action.delete')}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        {t('children.action.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment confirm modal */}
      {confirmPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4 mx-auto">
              <svg width="24" height="24" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </div>
            <h3 className="text-base font-bold mb-1 text-center text-gray-900">{t('nanny.payment.confirm_title')}</h3>
            <p className="mb-5 text-sm text-gray-500 text-center">{t('nanny.payment.confirm_body', { amount: String(confirmPayment.amount) })}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPayment(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-200 transition">{t('modal.cancel')}</button>
              <button onClick={confirmPay} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90 transition shadow">{t('common.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {planningNanny && (
        <PlanningModal nanny={planningNanny} onClose={() => setPlanningNanny(null)} centerId={centerFilter} />
      )}

      {/* Admin password reset modal */}
      {adminResetModal && adminResetModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 border border-gray-100">
            <h3 className="text-base font-bold mb-2 text-gray-900">{t('parent.reset.confirm_title')}</h3>
            <p className="mb-5 text-sm text-gray-500">{t('parent.reset.confirm_body')}</p>
            <div className="flex gap-3">
              <button onClick={cancelAdminReset} className="flex-1 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-200 transition">{t('modal.cancel')}</button>
              <button onClick={confirmAdminReset} className="flex-1 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90 transition shadow">{t('parent.reset.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
