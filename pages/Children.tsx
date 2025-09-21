import { fetchWithRefresh } from '../utils/fetchWithRefresh';
const API_URL = import.meta.env.VITE_API_URL;

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function getPrescriptionUrl(child: unknown): string | undefined {
  if (!child || typeof child !== 'object') return undefined;
  const c = child as Record<string, unknown>;
  const v = c['prescriptionUrl'] ?? c['prescription_url'];
  return typeof v === 'string' ? v : undefined;
}

interface Billing {
  days: number;
  amount: number;
}

import { useEffect, useState } from 'react';
import { getCached, setCached } from '../src/utils/apiCache';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
import '../styles/filter-responsive.css';
import '../styles/children-responsive.css';

function PhotoConsentToggle({ childId }: { childId: string }) {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;
  const [consent, setConsent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/children/${childId}/photo-consent`, { credentials: 'include' });
        if (!mounted) return;
        if (!res.ok) return setConsent(false);
        const body = await res.json();
        setConsent(!!body.consent);
    } catch (e: unknown) {
      if (import.meta.env.DEV) console.error('Failed to load photo consent', e);
      else console.error('Failed to load photo consent', e instanceof Error ? e.message : String(e));
      }
    }
    if (user && user.role === 'parent') load();
    return () => { mounted = false; };
  }, [childId, user, API_URL]);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/children/${childId}/photo-consent`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: !consent }) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(b.message || 'Erreur lors de la mise à jour du consentement');
        return;
      }
      const body = await res.json();
      setConsent(!!body.consent);
    } catch (e: unknown) {
      if (import.meta.env.DEV) console.error('Failed to toggle consent', e);
      else console.error('Failed to toggle consent', e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  if (!user || user.role !== 'parent') return null;
  if (consent === null) return <div className="text-sm text-gray-500">Chargement du consentement...</div>;
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={toggle} disabled={loading} />
        <span className="text-sm">Autoriser les photos</span>
      </label>
      <span className="text-xs text-gray-400">{consent ? 'Autorisé' : 'Non autorisé'}</span>
    </div>
  );
}

interface Child {
  id: string;
  name: string;
  age: number;
  sexe: 'masculin' | 'feminin';
  parentName: string;
  parentContact: string;
  parentMail: string;
  parentId?: string | null;
  allergies?: string;
  group?: string;
  present?: boolean;
  newThisMonth?: boolean;
  cotisationPaidUntil?: string;
  birthDate?: string;
  nannyIds?: string[];
}

interface Assignment {
  child: Child;
}

const emptyForm: Omit<Child, 'id'> = {
  name: '',
  age: 0,
  sexe: 'masculin',
  parentName: '',
  parentContact: '',
  parentMail: '',
  parentId: undefined,
  allergies: '',
  group: '',
  present: true,
  newThisMonth: false,
  birthDate: undefined,
  nannyIds: [],
};

const groupLabels = [
  { key: 'G1', label: 'Groupe 1 (0-1 ans)', min: 0, max: 1 },
  { key: 'G2', label: 'Groupe 2 (1-2 ans)', min: 1, max: 2 },
  { key: 'G3', label: 'Groupe 3 (2-3 ans)', min: 2, max: 3 },
  { key: 'G4', label: 'Groupe 4 (3-4 ans)', min: 3, max: 4 },
  { key: 'G5', label: 'Groupe 5 (4-5 ans)', min: 4, max: 5 },
  { key: 'G6', label: 'Groupe 6 (5-6 ans)', min: 5, max: 6 },
];

const emojiBySexe = {
  masculin: '👦',
  feminin: '👧',
};

export default function Children() {
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
  const { t } = useI18n();
  const [billings, setBillings] = useState<Record<string, Billing>>({});
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [parentsList, setParentsList] = useState<{ id: string; name: string; email?: string | null; phone?: string | null }[]>([]);
  const [nanniesList, setNanniesList] = useState<{ id: string; name: string }[]>([]);
  const [showParentsDropdown, setShowParentsDropdown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sort, setSort] = useState('name');
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [cotisationLoadingId, setCotisationLoadingId] = useState<string | null>(null);
  const [cotisationAmounts, setCotisationAmounts] = useState<Record<string, number | undefined>>({});
  const [photoConsentMap, setPhotoConsentMap] = useState<Record<string, boolean>>({});
  const [prescriptionModal, setPrescriptionModal] = useState<{ open: boolean; url?: string | null; childName?: string | null }>({ open: false, url: null, childName: null });
  const [emptyPrescriptionModal, setEmptyPrescriptionModal] = useState<{ open: boolean; childName?: string | null }>({ open: false, childName: null });
  

  

  const { user } = useAuth();
  const isAdminUser = !!(user && typeof user.role === 'string' && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase().includes('super') || user.role.toLowerCase() === 'administrator'));
  type UserLike = { role?: string | null; nannyId?: string | null } | null;
  const uLike = user as unknown as UserLike;
  const isNannyUser = !!(uLike && ((typeof uLike.role === 'string' && uLike.role.toLowerCase() === 'nanny') || !!uLike.nannyId));

  function handleEdit(child: Child) {
    setForm({
      ...emptyForm,
      ...child,
      group: child.group || '',
    });
    setEditingId(child.id);
    setError('');
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
  const cacheKeyChildren = `${API_URL}/children`;
  const cachedChildren = getCached<unknown[]>(cacheKeyChildren);
  let childrenDataRaw: unknown[] | null = cachedChildren ?? null;
      const assignmentsPromise = fetchWithRefresh(`${API_URL}/assignments?start=${today}&end=${today}`, { credentials: 'include' });
      if (!childrenDataRaw) {
        const childrenRes = await fetchWithRefresh(`${API_URL}/children`, { credentials: 'include' });
        childrenDataRaw = await childrenRes.json();
        // cache children list for short TTL
        setCached(cacheKeyChildren, childrenDataRaw);
      }
      const assignmentsRes = await assignmentsPromise;
      
      const assignmentsData: Assignment[] = await assignmentsRes.json();
      const presentIds = new Set(assignmentsData.map((a) => a.child.id));

      // Normalize children: if backend returns parents relation, derive parentName/contact/mail for UI
      const childrenData: Child[] = Array.isArray(childrenDataRaw) ? (childrenDataRaw as unknown[]).map((c: unknown) => {
        const base = { ...(c as Record<string, unknown>) } as Record<string, unknown>;
        // If parents relation present, use the first linked parent for display
        const parentsArr = Array.isArray(base['parents']) ? (base['parents'] as unknown as Array<Record<string, unknown>>) : undefined;
        if (parentsArr && parentsArr.length > 0 && parentsArr[0] && (parentsArr[0] as Record<string, unknown>)['parent']) {
          const p = (parentsArr[0] as Record<string, unknown>)['parent'] as Record<string, unknown>;
          const parentName = `${String(p['firstName'] ?? '')} ${String(p['lastName'] ?? '')}`.trim();
          base['parentName'] = parentName || String(base['parentName'] ?? '');
          base['parentContact'] = (p['phone'] as string) ?? String(base['parentContact'] ?? '');
          base['parentMail'] = (p['email'] as string) ?? String(base['parentMail'] ?? '');
          base['parentId'] = String(p['id'] ?? base['parentId'] ?? '');
        }
        const typedChild: Child = {
          id: String(base['id'] ?? ''),
          name: String(base['name'] ?? ''),
          age: Number(base['age'] ?? 0),
          sexe: (base['sexe'] === 'feminin' ? 'feminin' : 'masculin'),
          parentName: String(base['parentName'] ?? ''),
          parentContact: String(base['parentContact'] ?? ''),
          parentMail: String(base['parentMail'] ?? ''),
          parentId: base['parentId'] ? String(base['parentId']) : undefined,
          allergies: base['allergies'] ? String(base['allergies']) : undefined,
          group: base['group'] ? String(base['group']) : undefined,
          present: presentIds.has(String(base['id'] ?? '')),
          newThisMonth: Boolean(base['newThisMonth'] ?? false),
          cotisationPaidUntil: base['cotisationPaidUntil'] ? String(base['cotisationPaidUntil']) : undefined,
          birthDate: base['birthDate'] ? String(base['birthDate']) : undefined,
          nannyIds: Array.isArray(base['childNannies']) ? (base['childNannies'] as Array<Record<string, unknown>>).map((cn) => {
            if (!cn || typeof cn !== 'object') return '';
            const nannyObj = cn['nanny'] as Record<string, unknown> | undefined;
            if (nannyObj && nannyObj['id']) return String(nannyObj['id']);
            if (cn['nannyId']) return String(cn['nannyId']);
            return '';
          }).filter(Boolean) : [],
        };
        return typedChild;
      }) : [];
  setChildren(childrenData);
  // initialize default cotisation amount to 15 for each child
  const amounts: Record<string, number | undefined> = {};
  childrenData.forEach(c => { amounts[c.id] = 15; });
  setCotisationAmounts(amounts);
  // fetch photo consent summary for each child (parallel)
      try {
        const consentResults = await Promise.all(childrenData.map(async (c) => {
          try {
            const r = await fetchWithRefresh(`${API_URL}/children/${c.id}/photo-consent-summary`, { credentials: 'include' });
            if (!r.ok) return { id: c.id, allowed: false };
            const b = await r.json();
            return { id: c.id, allowed: !!b.allowed };
          } catch {
            return { id: c.id, allowed: false };
          }
        }));
        const pcm: Record<string, boolean> = {};
        consentResults.forEach(r => { pcm[r.id] = !!r.allowed; });
        setPhotoConsentMap(pcm);
      } catch {
        setPhotoConsentMap({});
      }
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    fetchChildren();
  const fetchParents = async () => {
      try {
        // Only admins or staff (nanny) should request the admin parent list
  const u = user as { role?: string | null; nannyId?: string | null } | null;
  const isAdmin = (u && typeof u.role === 'string' && (u.role.toLowerCase() === 'admin' || u.role.toLowerCase().includes('super')));
  const isNanny = !!(u && u.nannyId);
        if (!isAdmin && !isNanny) {
          // parents shouldn't request the admin endpoint — provide empty list silently
          setParentsList([]);
          return;
        }
        const res = await fetchWithRefresh(`${API_URL}/parent/admin`, { credentials: 'include' });
        if (!res.ok) return setParentsList([]);
        const data = await res.json() as { parents?: Array<Record<string, unknown>> } | null;
        const parents = Array.isArray(data?.parents) ? data.parents.map((p) => {
          const id = String(p.id ?? '');
          const rawName = p.name ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`;
          const name = String(rawName).trim() || id;
          const email = typeof p.email === 'string' ? p.email : undefined;
          const phone = typeof p.phone === 'string' ? p.phone : undefined;
          return { id, name, email, phone };
        }) : [];
        setParentsList(parents);
      } catch {
        setParentsList([]);
      }
    };
    fetchParents();
    const fetchNannies = async () => {
      try {
    const cacheKeyNannies = `${API_URL}/nannies`;
    const cachedNannies = getCached<{ id: string; name: string }[]>(cacheKeyNannies);
    if (cachedNannies) {
      setNanniesList(cachedNannies);
    } else {
      const res = await fetchWithRefresh(`${API_URL}/nannies`, { credentials: 'include' });
      if (!res.ok) return setNanniesList([]);
      const data = await res.json();
      // map and cache
      const mapped = Array.isArray(data) ? (data as unknown[]).map(d => {
        const nr = d as { id?: string | null; name?: string | null };
        return { id: String(nr.id ?? ''), name: String(nr.name ?? '') };
      }) : [];
      setNanniesList(mapped);
      setCached(cacheKeyNannies, mapped);
    }
      } catch {
        setNanniesList([]);
      }
    };
    fetchNannies();
    const fetchBillings = async () => {
      try {
        const todayMonth = getCurrentMonth();
        // try to reuse cached children list
  const cacheKeyChildren = `${API_URL}/children`;
  const cachedChildren = getCached<unknown[]>(cacheKeyChildren);
  const childrenData: Child[] = cachedChildren ? (cachedChildren as unknown as Child[]) : (await fetchWithRefresh(`${API_URL}/children`, { credentials: 'include' }).then(r => r.json()));
        const billingData: Record<string, Billing> = {};
        await Promise.all(childrenData.map(async (child) => {
          const res = await fetchWithRefresh(`${API_URL}/children/${child.id}/billing?month=${todayMonth}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            billingData[child.id] = { days: data.days, amount: data.amount };
          }
        }));
        setBillings(billingData);
      } catch {
        setBillings({});
      }
    };
    fetchBillings();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Build payload and omit parentId if not set to allow creating a child without a parent
      const payload: Record<string, unknown> = {
        name: form.name,
        age: form.age,
        sexe: form.sexe,
        parentName: form.parentName || undefined,
        parentContact: form.parentContact || undefined,
        parentMail: form.parentMail || undefined,
        allergies: form.allergies || undefined,
        group: form.group || undefined,
        present: form.present,
        birthDate: form.birthDate || undefined,
        nannyIds: Array.isArray(form.nannyIds) ? form.nannyIds : undefined,
      };
      if (form.parentId) payload.parentId = form.parentId;

      const res = await fetchWithRefresh(editingId ? `${API_URL}/children/${editingId}` : `${API_URL}/children`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      setSuccessMsg("L'enfant a bien été ajouté !");
      fetchChildren();
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/children/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      setDeleteId(null);
      fetchChildren();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalChildren = children.length;
  const presentToday = children.filter(c => c.present).length;

  let filtered = children.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.parentName.toLowerCase().includes(search.toLowerCase());
    let matchGroup = true;
    if (groupFilter) {
      const group = groupLabels.find(g => g.key === groupFilter);
      if (group) {
        matchGroup = (c.group === group.key) || (!c.group && c.age >= group.min && c.age < group.max);
      }
    }
    return matchSearch && matchGroup;
  });
  if (sort === 'name') filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'age') filtered = filtered.sort((a, b) => a.age - b.age);

  const cardColors = [
    'bg-blue-50',
    'bg-yellow-50',
    'bg-purple-50',
    'bg-green-50',
    'bg-pink-50',
    'bg-orange-50',
  ];

  return (
    <div className={`relative z-0 min-h-screen bg-[#fcfcff] p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full children-responsive-row">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 w-full children-responsive-header">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{t('page.children.title')}</h1>
            <div className="text-gray-400 text-base">{t('page.children.description')}</div>
          </div>
          <div className="flex gap-2 items-center">
            {isAdminUser && (
              <button
                type="button"
                onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null); setError(''); }}
                className={`bg-[#0b5566] text-white font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-[#08323a] transition min-h-[44px] md:h-[60px] flex items-center ${isShortLandscape ? '-translate-x-3' : ''}`}
                style={{transform: isShortLandscape ? 'translateX(-12px)' : undefined}}
              >
                {t('children.add')}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:items-start gap-3 mb-6 w-full">
          <div className="w-full">
            <div className="flex gap-2 items-center flex-wrap w-full">
              <div className="bg-white rounded-xl shadow px-3 py-2 md:px-4 md:py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px] min-h-[44px] md:h-[60px] justify-center flex-shrink-0">
                <div className="text-xs text-gray-400">{t('children.total')}</div>
                <div className="text-lg font-bold text-gray-900">{totalChildren}</div>
              </div>
              <div className="bg-white rounded-xl shadow px-3 py-2 md:px-4 md:py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px] min-h-[44px] md:h-[60px] justify-center flex-shrink-0">
                <div className="text-xs text-gray-400">{t('children.present')}</div>
                <div className="text-lg font-bold text-gray-900">{presentToday}</div>
              </div>
              <div className="bg-white rounded-xl shadow px-3 py-2 md:px-4 md:py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px] min-h-[44px] md:h-[60px] justify-center flex-shrink-0">
                <div className="text-xs text-gray-400">{t('children.new_badge')}</div>
                <div className="text-lg font-bold text-gray-900">{children.filter(c => c.newThisMonth).length}</div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('children.search_placeholder')} className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-sm md:text-base w-full md:w-64 min-h-[44px]" />
              <div className="flex gap-2">
                <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-sm">
                  <option value="">{t('children.group.all')}</option>
                  {groupLabels.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                </select>
                <select value={sort} onChange={e => setSort(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-sm">
                  <option value="name">{t('children.sort.name')}</option>
                  <option value="age">{t('children.sort.age')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      {(showForm || editingId) && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow p-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <input name="name" value={form.name} onChange={handleChange} placeholder={t('children.form.name')} required className="border rounded px-3 py-2" />
          <input name="age" type="number" value={form.age} onChange={handleChange} placeholder={t('children.form.age')} required className="border rounded px-3 py-2" />
          <input name="birthDate" type="date" value={form.birthDate || ''} onChange={handleChange} placeholder={t('children.form.birthDate')} className="border rounded px-3 py-2" />
          <select name="sexe" value={form.sexe} onChange={handleChange} required className="border rounded px-3 py-2">
            <option value="masculin">{t('children.form.sexe.m')}</option>
            <option value="feminin">{t('children.form.sexe.f')}</option>
          </select>
          <select name="group" value={form.group} onChange={handleChange} required className="border rounded px-3 py-2">
            <option value="">{t('children.form.group_placeholder')}</option>
            {groupLabels.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <div className="relative w-full">
            <input
              name="parentName"
              value={form.parentName}
              onChange={(e) => {
                const val = e.target.value;
                setForm(f => ({ ...f, parentName: val }));
                // only autofill when the entered value exactly matches a parent name
                const lower = val.toLowerCase();
                const exact = parentsList.find(p => p.name.toLowerCase() === lower);
                if (exact) {
                  setForm(f => ({ ...f, parentMail: exact.email || '', parentContact: exact.phone || '', parentId: exact.id }));
                } else {
                  setForm(f => ({ ...f, parentId: undefined }));
                }
                setShowParentsDropdown(true);
              }}
              onFocus={() => setShowParentsDropdown(true)}
              onBlur={() => {
                // hide dropdown on blur after a short delay to allow click handlers
                setTimeout(() => setShowParentsDropdown(false), 150);
              }}
              placeholder={t('children.form.parent_placeholder')}
              className="border rounded px-3 py-2 w-full"
            />

            {showParentsDropdown && (() => {
              const lower = form.parentName.trim().toLowerCase();
              const filtered = lower ? parentsList.filter(p => p.name.toLowerCase().includes(lower)) : parentsList;
              if (filtered.length === 0) return null;
              return (
                <ul className="absolute left-0 right-0 bg-white border rounded shadow max-h-56 overflow-auto z-50 mt-1">
                  {filtered.slice(0, 12).map(p => (
                    <li key={p.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm" onMouseDown={(ev) => {
                      // select before blur
                      ev.preventDefault();
                      setForm(f => ({ ...f, parentName: p.name, parentMail: p.email || '', parentContact: p.phone || '', parentId: p.id }));
                      setShowParentsDropdown(false);
                    }}>{p.name}</li>
                  ))}
                </ul>
              );
            })()}
          </div>
          <input name="parentContact" value={form.parentContact} onChange={handleChange} placeholder={t('children.form.parentPhone_placeholder')} className="border rounded px-3 py-2" />
          <input name="parentMail" type="email" value={form.parentMail} onChange={handleChange} placeholder={t('children.form.parentEmail_placeholder')} className="border rounded px-3 py-2" />
          {/* Nannies multi-select */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('children.nannies.label')}</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto border rounded p-2 bg-gray-50">
              {nanniesList.length === 0 ? (
                <div className="text-sm text-gray-500">{t('children.nannies.none')}</div>
              ) : nanniesList.map(n => {
                const checked = Array.isArray(form.nannyIds) && form.nannyIds.includes(n.id);
                return (
                  <label key={n.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" value={n.id} checked={checked} onChange={(e) => {
                      const val = e.target.value;
                      setForm(prev => {
                        const prevIds = Array.isArray(prev.nannyIds) ? [...prev.nannyIds] : [];
                        if (e.target.checked) {
                          if (!prevIds.includes(val)) prevIds.push(val);
                        } else {
                          const idx = prevIds.indexOf(val);
                          if (idx >= 0) prevIds.splice(idx, 1);
                        }
                        return { ...prev, nannyIds: prevIds } as typeof prev;
                      });
                    }} />
                    <span>{n.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <input name="allergies" value={form.allergies} onChange={handleChange} placeholder={t('children.form.allergies_placeholder')} className="border rounded px-3 py-2 md:col-span-2" />
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-[#0b5566] text-white px-4 py-2 rounded hover:bg-[#08323a] transition">
              {editingId ? t('children.form.edit') : t('children.add')}
            </button>
            <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(false); setError(''); }} className="bg-gray-300 px-4 py-2 rounded">{t('global.cancel')}</button>
          </div>
          {error && <div className="text-red-600 md:col-span-2">{error}</div>}
        </form>
      )}
      {successMsg && (
        <div className="mb-4 text-[#0b5566] font-semibold text-center bg-[#a9ddf2] border border-[#fcdcdf] rounded-lg py-2">{t('children.form.added_success')}</div>
      )}

      {loading ? (
        <div>{t('children.loading')}</div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full children-responsive-grid">
          {filtered.map((child, idx) => {
            const billing = billings[child.id];
            const color = cardColors[idx % cardColors.length];
            const emoji = emojiBySexe[child.sexe] || '👦';
            const isDeleting = deleteId === child.id;
            const now = new Date();
            const paidUntil = child.cotisationPaidUntil ? new Date(child.cotisationPaidUntil) : null;
            const daysRemaining = paidUntil ? Math.max(0, Math.floor((paidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
            const cotisationOk = daysRemaining > 0;
            let countdown = '';
            if (paidUntil) {
              const diff = paidUntil.getTime() - now.getTime();
              if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                countdown = days > 365 ? 'Cotisation à jour' : `${days} jours restants`;
              } else {
                countdown = 'Cotisation à renouveler';
              }
            }
            const handleCotisation = async () => {
              setCotisationLoadingId(child.id);
              const amount = cotisationAmounts[child.id] ?? 15;
              try {
                const res = await fetchWithRefresh(`${API_URL}/children/${child.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    name: child.name,
                    age: child.age,
                    sexe: child.sexe,
                    parentName: child.parentName,
                    parentContact: child.parentContact,
                    allergies: child.allergies || '',
                    payCotisation: true,
                    amount
                  })
                });
                if (!res.ok) {
                  if (import.meta.env.DEV) console.error('Failed to update cotisation', res.status);
                  else console.error('Failed to update cotisation', String(res.status));
                } else {
                  await fetchChildren();
                }
              } catch (err) {
                if (import.meta.env.DEV) console.error('Error while updating cotisation', err);
                else console.error('Error while updating cotisation', err instanceof Error ? err.message : String(err));
              } finally {
                setCotisationLoadingId(null);
              }
            };
            return (
              <div
                key={child.id}
                className={`rounded-2xl shadow ${color} relative flex flex-col min-h-[520px] md:min-h-[540px] h-full transition-transform duration-500 perspective-1000 overflow-hidden`}
                style={{height:'100%', perspective: '1000px'}}
              >
                <div
                  className={`w-full h-full transition-transform duration-500 ${isDeleting ? 'rotate-y-180' : ''}`}
                  style={{transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%'}}
                >
                  <div
                    className={`absolute inset-0 w-full h-full p-5 pb-20 md:pb-28 flex flex-col ${isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-transparent`}
                    style={{backfaceVisibility: 'hidden'}}
                  >
                      <div className="flex items-center gap-3 mb-2 min-w-0">
                      <div className="w-full min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-2xl shadow border border-gray-100">{emoji}</div>
                          <span className="font-semibold text-lg text-gray-900 truncate" title={child.name}>{child.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-bold bg-white text-[#08323a] px-3 py-1 rounded-full shadow border border-[#a9ddf2] whitespace-nowrap">{child.age} ans</span>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap" title="Sexe">{child.sexe === 'masculin' ? t('children.form.sexe.m') : t('children.form.sexe.f')}</span>
                          {child.birthDate ? (
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap" title={t('label.birthDate')}>
                              🎂 {new Date(child.birthDate).toLocaleDateString(undefined)}
                            </span>
                          ) : (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap" title={t('label.birthDate')}>
                              🎂 {t('children.birthDate.undefined')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="block text-xs text-yellow-700 flex items-center gap-1 mb-2">
                      <span>⚠️ {t('children.allergies.label')}</span>
                      <span className="font-medium">{child.allergies ? child.allergies : <span className="text-gray-400">{t('children.allergies.none')}</span>}</span>
                    </span>
                  
                    <div className="flex flex-col gap-3 text-sm text-gray-700 mb-4">
                      <span className="block">👤 {t('children.parent.label')} {child.parentName}</span>
                      <span className="block">📞 <a href={`tel:${child.parentContact}`} className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" title={t('children.call_parent_title')}>{child.parentContact}</a></span>
                      <span className="block">✉️ <a href={`mailto:${child.parentMail}`} className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" title={t('children.email_parent_title')}>{child.parentMail}</a></span>
                      <div className="flex flex-col gap-2 mt-2 mb-0" style={{marginBottom: 0}}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">{t('children.cotisation.label')}&nbsp;:</span>
                          {daysRemaining > 0 ? (
                            <span className="text-base font-bold text-[#08323a]">{(cotisationAmounts[child.id] ?? 15)}€</span>
                          ) : user && (user.role === 'admin' || user.role === 'super-admin') ? (
                            <input
                              type="number"
                              min={0}
                              className="w-24 px-2 py-1 border rounded text-sm"
                              value={cotisationAmounts[child.id] ?? ''}
                              placeholder="€"
                              onChange={(e) => setCotisationAmounts(prev => ({ ...prev, [child.id]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                            />
                          ) : (
                            <span className="text-base font-bold text-green-700">{(cotisationAmounts[child.id] ?? 15)}€</span>
                          )}
                          {cotisationOk ? (
                            <span className="text-[#0b5566] text-xl">✔️</span>
                          ) : (
                            cotisationLoadingId === child.id ? (
                              <span className="text-gray-400 text-xs ml-2 animate-pulse">{t('children.loading')}</span>
                            ) : (
                              !isNannyUser ? (
                                <button onClick={handleCotisation} className="text-[#0b5566] text-xs font-semibold px-2 py-1 rounded bg-[#a9ddf2] hover:bg-[#f7f4d7] transition" title={t('children.cotisation.pay')}>{t('children.cotisation.pay')}</button>
                              ) : (
                                <span className="text-xs text-gray-400 ml-2">—</span>
                              )
                            )
                          )}
                          <span className="text-xs text-gray-500 ml-2">{countdown}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">{t('children.cotisation.this_month')}&nbsp;:</span>
                          <span className="text-base font-bold text-[#08323a]">{billing ? `${billing.amount}€` : '...'}</span>
                          <span className="text-xs text-gray-500">({billing ? `${billing.days} jour${billing.days > 1 ? 's' : ''}` : 'calcul...'})</span>
                        </div>
                      </div>
                      {/* Photo consent toggle for parents */}
                      {user && user.role === 'parent' && child.parentId === (user.parentId || undefined) && (
                        <div className="mt-3">
                          <PhotoConsentToggle childId={child.id} />
                        </div>
                      )}
                      {/* Photo consent status badge (for admin/staff view) */}
                      <div className="mt-2">
                        {typeof photoConsentMap[child.id] === 'boolean' ? (
                          photoConsentMap[child.id] ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{t('children.photo_consent.yes')}</span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">{t('children.photo_consent.no')}</span>
                          )
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t('children.photo_consent.unknown')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-between mt-2">
                      <div className="flex items-center gap-2">
                        {child.present ? (
                          <span className="text-[#08323a] text-xs font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a9ddf2] inline-block"></span>{t('children.presence.present_today')}</span>
                        ) : (
                                        <span className="text-red-500 text-xs font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>{t('children.presence.absent_today')}</span>
                        )}
                                      {child.newThisMonth && (
                                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">{t('children.new_badge')}</span>
                                      )}
                                      {/* Assigned nanny names (static badge) */}
                                      {Array.isArray(child.nannyIds) && child.nannyIds.length > 0 ? (
                                        <span className="ml-2 text-xs px-2 py-1 rounded-full flex items-center gap-2 bg-indigo-100 text-indigo-700 flex-shrink-0">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                          <span className="font-medium truncate max-w-[160px]">{t('children.assigned', { names: child.nannyIds.map(id => nanniesList.find(n => n.id === id)?.name || '').filter(Boolean).join(', ') })}</span>
                                        </span>
                                      ) : (
                                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t('children.not_assigned')}</span>
                                      )}
                      </div>
                      <div />
                    </div>
                      {/* admin select removed - keep badge/dropdown only */}
                  </div>
                  {/* Bottom centered action buttons */}
                  <div className="absolute left-0 right-0 bottom-4 flex justify-center z-10">
                    <div className="flex gap-2">
                      {/* Voir ordonnance visible for everyone on the child card */}
                      <button onClick={async () => {
                        const known = getPrescriptionUrl(child);
                        let url = known || null;
                        if (!url) {
                          try {
                            const res = await fetchWithRefresh(`${API_URL}/children/${child.id}/prescription`, { credentials: 'include' });
                            if (!res.ok) {
                              // show a friendly modal instead of alert
                              setEmptyPrescriptionModal({ open: true, childName: child.name });
                              return;
                            }
                            const body = await res.json();
                            url = body.url || null;
                            if (!url) {
                              setEmptyPrescriptionModal({ open: true, childName: child.name });
                              return;
                            }
                          } catch (e) {
                            console.error('Failed to fetch prescription', e);
                            setEmptyPrescriptionModal({ open: true, childName: child.name });
                            return;
                          }
                        }
                        if (url) setPrescriptionModal({ open: true, url, childName: child.name });
                        }} className="bg-white border border-gray-200 text-gray-500 hover:text-green-700 rounded-full p-2 shadow-sm" title={t('children.prescription.view_button')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/></svg>
                      </button>
                      {(user && (user.role === 'admin' || user.role === 'super-admin' || user.nannyId)) ? (
                        <>
                          <button onClick={() => handleEdit(child)} className="bg-white border border-gray-200 text-gray-500 hover:text-[#08323a] rounded-full p-2 shadow-sm" title={t('children.action.edit')}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg></button>
                          <button onClick={() => setDeleteId(child.id)} className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full p-2 shadow-sm" title={t('children.action.delete')}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-white rounded-2xl shadow-xl p-8 ${isDeleting ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    style={{backfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}}
                  >
                    <div className="text-red-500 text-4xl mb-2">🗑️</div>
                    <div className="text-lg font-semibold mb-2 text-gray-900 text-center">{t('children.delete.confirm_title')}</div>
                    <div className="text-gray-500 mb-6 text-center">{t('children.delete.confirm_body')}</div>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setDeleteId(null)}
                        className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition"
                        disabled={deleteLoading}
                      >{t('modal.cancel')}</button>
                      <button
                        onClick={handleDelete}
                        className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-red-600 transition shadow"
                        disabled={deleteLoading}
                      >{deleteLoading ? t('children.deleting') : t('children.action.delete')}</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
          {/* Prescription modal */}
          {prescriptionModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-3xl relative mx-4">
                <button onClick={() => setPrescriptionModal({ open: false, url: null })} className="absolute top-3 right-3 text-gray-500">×</button>
                    <div className="text-lg font-bold mb-2">Ordonnance de {prescriptionModal.childName || "cet enfant"}</div>
                <div className="w-full h-[50vh] sm:h-[70vh] flex items-center justify-center overflow-auto">
                  {prescriptionModal.url && prescriptionModal.url.endsWith('.pdf') ? (
                    <iframe src={prescriptionModal.url} className="w-full h-full" title="Ordonnance PDF" />
                  ) : (
                    <img src={prescriptionModal.url || ''} alt="Ordonnance" className="h-full w-auto object-contain" />
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Empty prescription modal */}
          {emptyPrescriptionModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative">
                <button onClick={() => setEmptyPrescriptionModal({ open: false, childName: null })} className="absolute top-3 right-3 text-gray-500">×</button>
                <div className="text-lg font-bold mb-2">{t('children.prescription.noneTitle')}</div>
                <div className="text-gray-600 mb-4">{t('children.prescription.noneMessage', { name: emptyPrescriptionModal.childName || t('children.thisChild') })}</div>
                <div className="flex justify-end">
                  <button onClick={() => setEmptyPrescriptionModal({ open: false, childName: null })} className="px-4 py-2 bg-[#0b5566] text-white rounded-lg">{t('common.ok')}</button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
