import { fetchWithRefresh } from '../utils/fetchWithRefresh';
const API_URL = import.meta.env.VITE_API_URL;

function computeAge(birthDate?: string, fallbackAge?: number): number {
  if (birthDate) {
    try {
      const bd = new Date(birthDate);
      if (!Number.isNaN(bd.getTime())) {
        return Math.floor((Date.now() - bd.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      }
    } catch { /* fallthrough */ }
  }
  return fallbackAge ?? 0;
}

function getPrescriptionUrl(child: unknown): string | undefined {
  if (!child || typeof child !== 'object') return undefined;
  const c = child as Record<string, unknown>;
  const v = c['prescriptionUrl'] ?? c['prescription_url'];
  return typeof v === 'string' ? v : undefined;
}

// normalize raw API child object into local Child shape
function normalizeChild(raw: unknown): Child {
  const base = { ...(raw as Record<string, unknown>) } as Record<string, unknown>;
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
    present: Boolean(base['present'] ?? false),
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
    photoUrl: base['photoUrl'] ? String(base['photoUrl']) : undefined,
  };
  return typedChild;
}

interface Billing {
  days: number;
  amount: number;
}

import { useEffect, useState, useRef, useCallback } from 'react';
import { getCached, setCached, invalidate } from '../src/utils/apiCache';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
import { useCenterSettings } from '../src/context/CenterSettingsContext';
import '../styles/filter-responsive.css';
import '../styles/children-responsive.css';
import AvatarCropper from '../components/AvatarCropper';

function PhotoConsentToggle({ childId, initialConsent, onChange }: { childId: string; initialConsent?: boolean | null; onChange?: (newVal: boolean) => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const API_URL = import.meta.env.VITE_API_URL;
  const [consent, setConsent] = useState<boolean | null>(initialConsent ?? null);
  const [loading, setLoading] = useState(false);

  const isAdmin = user && typeof user.role === 'string' && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase().includes('super'));
  const isParent = user && user.role === 'parent';

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
    // parents need their own value; admins rely on initialConsent that was
    // populated by the batch endpoint in the parent component
    if (user && isParent) load();
    return () => { mounted = false; };
  }, [childId, user, API_URL, isParent]);

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
      const newVal = !!body.consent;
      setConsent(newVal);
      if (onChange) onChange(newVal);
    } catch (e: unknown) {
      if (import.meta.env.DEV) console.error('Failed to toggle consent', e);
      else console.error('Failed to toggle consent', e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  if (!user || (!isParent && !isAdmin)) return null; // only parents/admins see the toggle
  if (consent === null) return <div className="text-sm text-gray-500">{t('children.photo_consent.loading')}</div>;
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={toggle} disabled={loading} />
        <span className="text-sm">{t('children.photo_consent.toggle_label')}</span>
      </label>
      <span className="text-xs text-gray-400">{consent ? t('children.photo_consent.allowed') : t('children.photo_consent.denied')}</span>
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
  photoUrl?: string;
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
  const successTimer = useRef<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [cotisationLoadingId, setCotisationLoadingId] = useState<string | null>(null);
  const [photoConsentMap, setPhotoConsentMap] = useState<Record<string, boolean>>({});
  const [prescriptionModal, setPrescriptionModal] = useState<{ open: boolean; url?: string | null; childName?: string | null }>({ open: false, url: null, childName: null });
  const [emptyPrescriptionModal, setEmptyPrescriptionModal] = useState<{ open: boolean; childName?: string | null }>({ open: false, childName: null });
  const [photoUploadingId, setPhotoUploadingId] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoUploadTargetId = useRef<string | null>(null);
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [centerFilter, setCenterFilter] = useState<string | null>(null);
  

  

  const { user } = useAuth();
  const { settings: centerSettings, settingsVersion } = useCenterSettings();
  const defaultChildCotisation = centerSettings.childCotisationAmount;
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

  const fetchBillings = useCallback(async () => {
    try {
      const todayMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const cacheKeyChildren = `${API_URL}/children${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
      const cachedChildren = getCached<unknown[]>(cacheKeyChildren);
      const childrenData: Child[] = cachedChildren ? (cachedChildren as unknown as Child[]) : (await fetchWithRefresh(`${API_URL}/children${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`, { credentials: 'include' }).then(r => r.json()));
      const billingData: Record<string, Billing> = {};
      const ids = childrenData.map(c => c.id);
      if (ids.length > 0) {
        try {
          const res = await fetchWithRefresh(`${API_URL}/children/batch/billing?month=${todayMonth}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          });
          if (res.ok) {
            const body = await res.json();
            ids.forEach(id => {
              const b = body && body[id];
              if (b && typeof b.amount === 'number') billingData[id] = { days: Number(b.days || 0), amount: Number(b.amount || 0) };
            });
          }
        } catch (e) {
          console.error('Batch billing fetch failed', e);
        }
      }
      setBillings(billingData);
    } catch {
      setBillings({});
    }
  }, [centerFilter]);

  const fetchChildren = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
  const cacheKeyChildren = `${API_URL}/children${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
  const cachedChildren = getCached<unknown[]>(cacheKeyChildren);
  let childrenDataRaw: unknown[] | null = cachedChildren ?? null;
      const assignmentsPromise = fetchWithRefresh(`${API_URL}/assignments?start=${today}&end=${today}`, { credentials: 'include' });
      if (!childrenDataRaw) {
        const childrenRes = await fetchWithRefresh(`${API_URL}/children${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`, { credentials: 'include' });
        childrenDataRaw = await childrenRes.json();
        // cache children list for short TTL
        setCached(cacheKeyChildren, childrenDataRaw);
      }
      const assignmentsRes = await assignmentsPromise;
      
      const assignmentsData: Assignment[] = await assignmentsRes.json();
      const presentIdsSet = new Set(assignmentsData.map((a) => a.child.id));

      // Normalize children and apply present flags from today's assignments
      const childrenData: Child[] = Array.isArray(childrenDataRaw) ? (childrenDataRaw as unknown[]).map((c: unknown) => {
        const nc = normalizeChild(c);
        if (presentIdsSet.has(nc.id)) nc.present = true;
        return nc;
      }) : [];
  setChildren(childrenData);
  // keep the shared cache in sync after a fresh load
  try {
    const cacheKeyChildren = `${API_URL}/children${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
    setCached(cacheKeyChildren, childrenData);
  } catch {
    // noop
  }
      // fetch photo consent summary for all children in a single batch request
      try {
        const ids = childrenData.map(c => c.id);
        if (ids.length > 0) {
          const r = await fetchWithRefresh(`${API_URL}/children/batch/photo-consent-summary`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          });
          if (r.ok) {
            const body = await r.json();
            const pcm: Record<string, boolean> = {};
            ids.forEach(id => { pcm[id] = !!(body && body[id] && body[id].allowed); });
            setPhotoConsentMap(pcm);
          } else {
            setPhotoConsentMap({});
          }
        } else {
          setPhotoConsentMap({});
        }
      } catch (e) {
        console.error('Error fetching batch photo consent summaries', e);
        setPhotoConsentMap({});
      }
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [centerFilter]);

  useEffect(() => {
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
    fetchBillings();
  }, [user, centerFilter, fetchBillings, settingsVersion]);

  // reload children when center filter changes
  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

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
        // API now returns { data: [...] }
        const centersData = json.data || json.centers || json;
        if (Array.isArray(centersData)) {
          setCenters(centersData.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        } else {
          console.error('Unexpected /api/centers response shape', json);
        }
      } catch (e) {
        console.error('Failed to load centers for filter', e);
      }
    };
    loadCenters();
    return () => { mounted = false; };
  }, [user]);

  // cleanup any pending timers when component unmounts
  useEffect(() => {
    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
        successTimer.current = null;
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const wasEditing = Boolean(editingId);

    // helpers and optimistic variables need to live at top level of handleSubmit
    let optimisticId: string | null = null;
    const cleanupOptimistic = () => {
      if (optimisticId) {
        setChildren(prev => prev.filter(c => c.id !== optimisticId));
        try {
          const cacheKeyChildren = `${API_URL}/children${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
          const existing = getCached<Child[]>(cacheKeyChildren) || [];
          setCached(cacheKeyChildren, existing.filter(c => c.id !== optimisticId));
        } catch {
          /* ignore cache error */
        }
        optimisticId = null;
      }
    };

    try {
      // Build payload and omit parentId if not set to allow creating a child without a parent
        // compute age from birthDate if provided, otherwise fall back to form.age
        let computedAge = form.age;
        try {
          if (form.birthDate) {
            const bd = new Date(form.birthDate);
            if (!Number.isNaN(bd.getTime())) {
              const diff = Date.now() - bd.getTime();
              computedAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
            }
          }
        } catch {
          // leave computedAge as-is
        }

        // Client-side validation for required fields
        if (!form.name || !form.name.trim()) {
          setError("Le nom est requis");
          return;
        }
        if (!form.birthDate) {
          setError("La date de naissance est requise");
          return;
        }
        if (!form.sexe) {
          setError("Le sexe est requis");
          return;
        }
        // when creating a new child (not editing), ensure at least one nanny is assigned
        if (!editingId && (!Array.isArray(form.nannyIds) || form.nannyIds.length === 0)) {
          setError("Veuillez assigner au moins une nounou");
          return;
        }

        const payload: Record<string, unknown> = {
          name: form.name,
          // age intentionally omitted: backend will compute from birthDate
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

      if (!editingId) {
        optimisticId = `optimistic-${Date.now()}`;
        const optimisticChild: Child = {
          id: optimisticId,
          name: form.name,
          age: computedAge,
          sexe: form.sexe,
          parentName: form.parentName || '',
          parentContact: form.parentContact || '',
          parentMail: form.parentMail || '',
          parentId: form.parentId || undefined,
          allergies: form.allergies || undefined,
          group: form.group || undefined,
          present: form.present,
          newThisMonth: true,
          birthDate: form.birthDate || undefined,
          nannyIds: Array.isArray(form.nannyIds) ? form.nannyIds : [],
        };
        setChildren(prev => [optimisticChild, ...prev]);
      }

      let res;
      try {
        res = await fetchWithRefresh(editingId ? `${API_URL}/children/${editingId}` : `${API_URL}/children`, {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          cleanupOptimistic();
          throw new Error('Erreur lors de la sauvegarde');
        }
      } catch (err: unknown) {
        cleanupOptimistic();
        throw err;
      }
      const saved = await res.json().catch(() => null);
      // optimistic update: if server returns the saved child, integrate it directly
      if (saved) {
        try {
          const newChild = normalizeChild(saved);
          setChildren(prev => {
            if (wasEditing) return prev.map(c => c.id === newChild.id ? newChild : c);
            // replace optimistic child if present
            if (optimisticId) {
              return prev.map(c => c.id === optimisticId ? newChild : c);
            }
            return [newChild, ...prev];
          });
          // invalidate cache then refetch to get clean server state
          try {
            const cacheKeyChildren = `${API_URL}/children${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
            invalidate(cacheKeyChildren);
          } catch {
            // ignore cache errors
          }
          optimisticId = null;
          fetchChildren();
        } catch {
          fetchChildren();
        }
      } else {
        fetchChildren();
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      // show success message and ensure previous timers are cleared so messages don't overlap
      if (successTimer.current) {
        clearTimeout(successTimer.current);
        successTimer.current = null;
      }
      const sm = wasEditing ? t('children.form.added_success') : t('children.form.added_success');
      setSuccessMsg(sm);
      if (successTimer.current) { clearTimeout(successTimer.current); successTimer.current = null; }
      successTimer.current = window.setTimeout(() => { setSuccessMsg(''); successTimer.current = null; }, 2500) as unknown as number;
    } catch (err: unknown) {
      // remove any optimistic entry if we failed
      try { cleanupOptimistic(); } catch { /* ignore */ };
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
      if (!res.ok) {
        let serverMsg = 'Erreur lors de la suppression';
        try {
          const body = await res.json();
          if (body) serverMsg = body.code ? t(body.code) : (body.error || body.message || JSON.stringify(body));
        } catch {
          // ignore parse errors
        }
        if (import.meta.env.DEV) console.error('Delete child failed', res.status, serverMsg);
        throw new Error(serverMsg);
      }
  // remove from UI immediately
  const deletedChild = children.find(c => c.id === deleteId);
  const deletedName = deletedChild ? deletedChild.name : "l'enfant";
  setChildren(prev => prev.filter(c => c.id !== deleteId));
  // update shared cache to remove deleted child
    try {
      const cacheKeyChildren = `${API_URL}/children${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
      const existing = getCached<Child[]>(cacheKeyChildren) ?? [];
      setCached(cacheKeyChildren, existing.filter(c => c.id !== deleteId));
    } catch {
      // ignore cache issues
    }
  setDeleteId(null);
  // show success message banner and clear any previous timer
  if (successTimer.current) {
    clearTimeout(successTimer.current);
    successTimer.current = null;
  }
  const sm = t('children.form.deleted_success');
  setSuccessMsg(sm.replace('{name}', deletedName));
  successTimer.current = window.setTimeout(() => { setSuccessMsg(''); successTimer.current = null; }, 2500) as unknown as number;
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
  if (sort === 'age') filtered = filtered.sort((a, b) => computeAge(a.birthDate, a.age) - computeAge(b.birthDate, b.age));

  const inputCls = "border border-gray-200 rounded-xl px-3 py-2 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566] transition w-full";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setCropModalOpen(true);
  };

  const closeCropModal = () => {
    setCropModalOpen(false);
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
  };

  const onCropApply = async (croppedFile: File) => {
    const childId = photoUploadTargetId.current;
    closeCropModal();
    if (!childId) return;
    setPhotoUploadingId(childId);
    try {
      const fd = new FormData();
      fd.append('photo', croppedFile);
      const res = await fetchWithRefresh(`${API_URL}/children/${childId}/photo`, { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setChildren(prev => prev.map(c => c.id === childId ? { ...c, photoUrl: data.photoUrl } : c));
    } catch (err) {
      console.error('Failed to upload child photo', err);
    } finally {
      setPhotoUploadingId(null);
      photoUploadTargetId.current = null;
    }
  };

  return (
    <div className={`min-h-screen bg-[#f4f7fa] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoFileChange} />
      {cropModalOpen && cropImageSrc && (
        <AvatarCropper imageSrc={cropImageSrc} onCancel={closeCropModal} onApply={onCropApply} />
      )}
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4 children-responsive-row">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('page.children.title')}</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('page.children.description')}</p>
            </div>
          </div>
          {isAdminUser && (
            <button
              type="button"
              data-tour="btn-add-child"
              onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null); setError(''); }}
              className="w-full sm:w-auto px-3 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white text-xs sm:text-sm font-semibold rounded-xl shadow hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              {t('children.add')}
            </button>
          )}
        </div>

        {/* KPI badges */}
        <div className="grid grid-cols-3 gap-3 mb-5 w-full sm:w-auto sm:flex sm:flex-row sm:gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 flex flex-col items-center justify-center">
            <div className="text-[10px] sm:text-xs text-gray-400 font-medium">{t('children.total')}</div>
            <div className="text-lg font-extrabold text-[#0b5566]">{totalChildren}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 flex flex-col items-center justify-center">
            <div className="text-[10px] sm:text-xs text-gray-400 font-medium">{t('children.present')}</div>
            <div className="text-lg font-extrabold text-emerald-600">{presentToday}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 flex flex-col items-center justify-center">
            <div className="text-[10px] sm:text-xs text-gray-400 font-medium">{t('children.new_badge')}</div>
            <div className="text-lg font-extrabold text-amber-500">{children.filter(c => c.newThisMonth).length}</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 w-full">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('children.search_placeholder')} className="border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-gray-700 bg-white shadow-sm text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 focus:border-[#0b5566] transition" />
          </div>
          {user && (user as { role?: string | null }).role === 'super-admin' && (
            <select value={centerFilter || ''} onChange={e => setCenterFilter(e.target.value || null)} className="border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 min-h-[40px]">
              <option value="">{t('messages.center.all', 'Tous les centres')}</option>
              {centers.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          )}
          <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 min-h-[40px]">
            <option value="">{t('children.group.all')}</option>
            {groupLabels.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 min-h-[40px]">
            <option value="name">{t('children.sort.name')}</option>
            <option value="age">{t('children.sort.age')}</option>
          </select>
        </div>

      {(showForm || editingId) && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow-md border border-gray-100">
          {/* Form header */}
          <div className="px-6 py-4 bg-gradient-to-r from-[#0b5566] to-[#08323a] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <h2 className="text-white font-semibold text-base">{editingId ? t('children.form.edit') : t('children.add')}</h2>
          </div>
          <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col">
            <label htmlFor="child-name" className={labelCls}>{t('children.form.name_label')} <span className="text-red-500">*</span></label>
            <input id="child-name" name="name" value={form.name} onChange={handleChange} placeholder={t('children.form.name')} required className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label htmlFor="child-birthDate" className={labelCls}>{t('children.form.birthDate_label')} <span className="text-red-500">*</span></label>
            <input id="child-birthDate" name="birthDate" type="date" value={form.birthDate || ''} onChange={handleChange} required className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label htmlFor="child-sexe" className={labelCls}>{t('children.form.sexe_label')} <span className="text-red-500">*</span></label>
            <select id="child-sexe" name="sexe" value={form.sexe} onChange={handleChange} required className={inputCls}>
              <option value="masculin">{t('children.form.sexe.m')}</option>
              <option value="feminin">{t('children.form.sexe.f')}</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="child-group" className={labelCls}>{t('children.form.group_label')}</label>
            <select id="child-group" name="group" value={form.group} onChange={handleChange} required className={inputCls}>
              <option value="">{t('children.form.group_placeholder')}</option>
              {groupLabels.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </div>
          <div className="relative w-full flex flex-col">
            <label htmlFor="parent-name" className={labelCls}>{t('children.form.parentName_label')}</label>
            <input
              id="parent-name"
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
              className="border border-gray-200 rounded-lg px-3 py-2 w-full"
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
          <div className="flex flex-col">
            <label htmlFor="parent-contact" className={labelCls}>{t('children.form.parentPhone_label')}</label>
            <input id="parent-contact" name="parentContact" value={form.parentContact} onChange={handleChange} placeholder={t('children.form.parentPhone_placeholder')} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label htmlFor="parent-mail" className={labelCls}>{t('children.form.parentEmail_label')}</label>
            <input id="parent-mail" name="parentMail" type="email" value={form.parentMail} onChange={handleChange} placeholder={t('children.form.parentEmail_placeholder')} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label htmlFor="child-allergies" className={labelCls}>{t('children.form.allergies_label')}</label>
            <input id="child-allergies" name="allergies" value={form.allergies} onChange={handleChange} placeholder={t('children.form.allergies_placeholder')} className={inputCls} />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className={labelCls}>{t('children.nannies.label')} <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
              {nanniesList.length === 0 ? (
                <div className="text-sm text-gray-500">{t('children.nannies.none')}</div>
                ) : nanniesList.map(n => {
                const checked = Array.isArray(form.nannyIds) && form.nannyIds.includes(n.id);
                return (
                  <label key={n.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white rounded-lg px-2 py-1 transition">
                    <input id={`nanny-${n.id}`} type="checkbox" value={n.id} checked={checked} onChange={(e) => {
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
                    }} className="accent-[#0b5566]" />
                    <span className="text-gray-700">{n.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          </div>
          {/* Form footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="text-xs text-gray-400">{t('children.form.required_note')} <span className="text-red-500">*</span></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(false); setError(''); }} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition text-sm font-medium">{t('global.cancel')}</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white font-semibold hover:opacity-90 transition text-sm shadow">
                {editingId ? t('children.form.edit') : t('children.add')}
              </button>
            </div>
          </div>
          {error && <div className="px-6 py-3 text-red-600 text-sm bg-red-50 border-t border-red-100">{error}</div>}
        </form>
      )}
      {successMsg && (
        <div className="mb-4 text-[#0b5566] font-semibold text-center bg-[#a9ddf2] border border-[#fcdcdf] rounded-lg py-2">{successMsg}</div>
      )}

      {loading ? (
        <div>{t('children.loading')}</div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full children-responsive-grid">
          {filtered.map((child, idx) => {
            const billing = billings[child.id];
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
              const amount = defaultChildCotisation;
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
              } catch (err: unknown) {
                if (import.meta.env.DEV) console.error('Error while updating cotisation', err);
                else console.error('Error while updating cotisation', err instanceof Error ? err.message : String(err));
              } finally {
                setCotisationLoadingId(null);
              }
            };
            const gradients = [
              'from-[#0b5566] to-[#0a7c97]',
              'from-violet-600 to-purple-500',
              'from-rose-500 to-pink-400',
              'from-emerald-600 to-teal-500',
              'from-amber-500 to-orange-400',
              'from-sky-600 to-blue-500',
            ];
            const gradient = gradients[idx % gradients.length];
            const initials = child.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div key={child.id} className="relative bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col overflow-hidden">
                {/* Delete overlay */}
                {isDeleting && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 rounded-2xl p-8">
                    <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                      <svg width="28" height="28" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </div>
                    <div className="text-base font-semibold text-gray-900 text-center mb-1">{t('children.delete.confirm_title')}</div>
                    <div className="text-sm text-gray-500 mb-6 text-center">{t('children.delete.confirm_body')}</div>
                    <div className="flex gap-3 w-full">
                      <button onClick={() => setDeleteId(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 font-medium hover:bg-gray-200 transition text-sm" disabled={deleteLoading}>{t('modal.cancel')}</button>
                      <button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-xl px-4 py-2 font-medium hover:bg-red-600 transition shadow text-sm" disabled={deleteLoading}>{deleteLoading ? t('children.deleting') : t('children.action.delete')}</button>
                    </div>
                  </div>
                )}

                {/* Card header with gradient avatar */}
                <div className={`px-5 pt-5 pb-4 bg-gradient-to-r ${gradient} flex items-center gap-3`}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAdminUser && user?.role !== 'nanny') return;
                      photoUploadTargetId.current = child.id;
                      photoInputRef.current?.click();
                    }}
                    className="relative w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden group focus:outline-none"
                    title={isAdminUser || user?.role === 'nanny' ? t('children.photo.upload_hint', 'Changer la photo') : undefined}
                  >
                    {child.photoUrl ? (
                      <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">{initials}</span>
                    )}
                    {(isAdminUser || user?.role === 'nanny') && (
                      <>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {photoUploadingId === child.id ? (
                            <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          ) : (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          )}
                        </div>
                        {photoUploadingId !== child.id && (
                          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          </div>
                        )}
                      </>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base truncate">{child.name}</span>
                      {child.present ? (
                        <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">{t('children.presence.present_today')}</span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-red-400/30 text-white px-2 py-0.5 rounded-full">{t('children.presence.absent_today')}</span>
                      )}
                      {child.newThisMonth && (
                        <span className="text-[10px] font-semibold bg-amber-300/30 text-white px-2 py-0.5 rounded-full">{t('children.new_badge')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-white/80 font-medium">{computeAge(child.birthDate, child.age)} ans</span>
                      <span className="text-white/40">·</span>
                      <span className="text-xs text-white/80">{child.sexe === 'masculin' ? t('children.form.sexe.m') : t('children.form.sexe.f')}</span>
                      {child.birthDate && (
                        <>
                          <span className="text-white/40">·</span>
                          <span className="text-xs text-white/80">{new Date(child.birthDate).toLocaleDateString('fr-FR')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="flex-1 flex flex-col p-5 gap-4">

                  {/* Allergies */}
                  {child.allergies ? (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <svg className="text-amber-500 flex-shrink-0 mt-0.5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <span className="text-xs text-amber-700 font-medium">{t('children.allergies.label')} {child.allergies}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                      {t('children.allergies.none')}
                    </div>
                  )}

                  {/* Parent info */}
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="text-gray-400 flex-shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <span className="font-medium truncate">{child.parentName || <span className="text-gray-400 italic">—</span>}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="text-gray-400 flex-shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {child.parentContact ? (
                        <a href={`tel:${child.parentContact}`} className="text-[#0b5566] hover:underline transition">{child.parentContact}</a>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="text-gray-400 flex-shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      {child.parentMail ? (
                        <a href={`mailto:${child.parentMail}`} className="text-[#0b5566] hover:underline transition truncate">{child.parentMail}</a>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </div>
                  </div>

                  {/* Cotisation */}
                  {(defaultChildCotisation > 0 || centerSettings.dailyRate > 0) && (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                    {defaultChildCotisation > 0 && (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('children.cotisation.label')}</span>
                          {cotisationOk ? (
                            <span className="ml-auto text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                              {countdown}
                            </span>
                          ) : (
                            <span className="ml-auto text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{countdown || t('children.cotisation.pay')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {daysRemaining > 0 ? (
                            <span className="text-xl font-extrabold text-[#0b5566]">{defaultChildCotisation}€</span>
                          ) : (
                            <span className="text-xl font-extrabold text-gray-700">{defaultChildCotisation}€</span>
                          )}
                          {!cotisationOk && (
                            cotisationLoadingId === child.id ? (
                              <span className="text-gray-400 text-xs animate-pulse ml-1">{t('children.loading')}</span>
                            ) : !isNannyUser ? (
                              <button onClick={handleCotisation} className="text-[#0b5566] text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0b5566]/10 hover:bg-[#0b5566]/20 transition" title={t('children.cotisation.pay')}>{t('children.cotisation.pay')}</button>
                            ) : null
                          )}
                        </div>
                      </>
                    )}
                    {centerSettings.dailyRate > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>{t('children.cotisation.this_month')}</span>
                        <span className="font-bold text-gray-700 ml-1">{billing ? `${billing.amount}€` : '...'}</span>
                        <span className="text-gray-400">({billing ? `${billing.days} jour${billing.days > 1 ? 's' : ''}` : 'calcul...'})</span>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Photo consent */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {typeof photoConsentMap[child.id] === 'boolean' ? (
                        photoConsentMap[child.id] ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">{t('children.photo_consent.yes')}</span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">{t('children.photo_consent.no')}</span>
                        )
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t('children.photo_consent.unknown')}</span>
                      )}
                    </div>
                    {Array.isArray(child.nannyIds) && child.nannyIds.length > 0 ? (
                      <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1 bg-indigo-50 text-indigo-600 flex-shrink-0">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <span className="font-medium truncate max-w-[120px]">{child.nannyIds.map(id => nanniesList.find(n => n.id === id)?.name || '').filter(Boolean).join(', ')}</span>
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{t('children.not_assigned')}</span>
                    )}
                  </div>

                  {/* Photo consent toggle */}
                  {user && (
                    (user.role === 'parent' && child.parentId === (user.parentId || undefined))
                    || isAdminUser
                  ) && (
                    <PhotoConsentToggle
                      childId={child.id}
                      initialConsent={photoConsentMap[child.id] ?? null}
                      onChange={(val) => setPhotoConsentMap(prev => ({ ...prev, [child.id]: val }))}
                    />
                  )}
                </div>

                {/* Card footer actions */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const known = getPrescriptionUrl(child);
                      let url = known || null;
                      if (!url) {
                        try {
                          const res = await fetchWithRefresh(`${API_URL}/children/${child.id}/prescription`, { credentials: 'include' });
                          if (!res.ok) { setEmptyPrescriptionModal({ open: true, childName: child.name }); return; }
                          const body = await res.json();
                          url = body.url || null;
                          if (!url) { setEmptyPrescriptionModal({ open: true, childName: child.name }); return; }
                        } catch (e) {
                          console.error('Failed to fetch prescription', e);
                          setEmptyPrescriptionModal({ open: true, childName: child.name }); return;
                        }
                      }
                      if (url) setPrescriptionModal({ open: true, url, childName: child.name });
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#0b5566] transition px-2 py-1.5 rounded-lg hover:bg-white"
                    title={t('children.prescription.view_button')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/></svg>
                    {t('children.prescription.view_button')}
                  </button>
                  {(user && (user.role === 'admin' || user.role === 'super-admin' || user.nannyId)) && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button onClick={() => handleEdit(child)} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#0b5566] transition px-2 py-1.5 rounded-lg hover:bg-white" title={t('children.action.edit')}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg>
                        {t('children.action.edit')}
                      </button>
                      <button onClick={() => setDeleteId(child.id)} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50" title={t('children.action.delete')}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        {t('children.action.delete')}
                      </button>
                    </div>
                  )}
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
