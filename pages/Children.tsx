import { fetchWithRefresh } from '../utils/fetchWithRefresh';
const API_URL = import.meta.env.VITE_API_URL;

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface Billing {
  days: number;
  amount: number;
}

import { useEffect, useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import '../styles/filter-responsive.css';
import '../styles/children-responsive.css';

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
  const [billings, setBillings] = useState<Record<string, Billing>>({});
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [parentsList, setParentsList] = useState<{ id: string; name: string; email?: string | null; phone?: string | null }[]>([]);
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
  const { user } = useAuth();

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
      const [childrenRes, assignmentsRes] = await Promise.all([
        fetchWithRefresh(`${API_URL}/api/children`, { credentials: 'include' }),
        fetchWithRefresh(`${API_URL}/api/assignments?start=${today}&end=${today}`, { credentials: 'include' })
      ]);
      const childrenDataRaw = await childrenRes.json();
      const assignmentsData: Assignment[] = await assignmentsRes.json();
      const presentIds = new Set(assignmentsData.map((a) => a.child.id));

      // Normalize children: if backend returns parents relation, derive parentName/contact/mail for UI
      const childrenData: Child[] = Array.isArray(childrenDataRaw) ? childrenDataRaw.map((c: Record<string, unknown>) => {
        const base = { ...c } as Record<string, unknown>;
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
        };
        return typedChild;
      }) : [];
  setChildren(childrenData);
  // initialize default cotisation amount to 15 for each child
  const amounts: Record<string, number | undefined> = {};
  childrenData.forEach(c => { amounts[c.id] = 15; });
  setCotisationAmounts(amounts);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
    const fetchParents = async () => {
      try {
        const res = await fetchWithRefresh(`${API_URL}/api/parent/admin`, { credentials: 'include' });
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
    const fetchBillings = async () => {
      try {
        const todayMonth = getCurrentMonth();
        const childrenRes = await fetchWithRefresh(`${API_URL}/api/children`, { credentials: 'include' });
        const childrenData: Child[] = await childrenRes.json();
        const billingData: Record<string, Billing> = {};
        await Promise.all(childrenData.map(async (child) => {
          const res = await fetchWithRefresh(`${API_URL}/api/children/${child.id}/billing?month=${todayMonth}`, { credentials: 'include' });
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
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetchWithRefresh(editingId ? `${API_URL}/api/children/${editingId}` : `${API_URL}/api/children`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
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
      const res = await fetchWithRefresh(`${API_URL}/api/children/${deleteId}`, {
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
    <div className="relative z-0 min-h-screen bg-[#fcfcff] p-4 md:pl-64 w-full">
      <div className="max-w-7xl mx-auto w-full children-responsive-row">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 w-full children-responsive-header">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">Gestion des enfants</h1>
            <div className="text-gray-400 text-base">Gérez les profils, informations médicales et contacts d'urgence.</div>
          </div>
          <div className="flex gap-2 items-center self-end children-responsive-btn">
            <button
              type="button"
              onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null); setError(''); }}
              className="bg-green-500 text-black font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-green-600 transition h-[60px] min-h-[60px] flex items-center"
            >
              Ajouter un enfant
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 w-full filter-responsive-row children-responsive-filters">
          <div className="flex flex-col md:flex-row gap-3 w-full children-responsive-filters-inner">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, parent..." className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-base w-full md:w-64" />
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-base">
              <option value="">Tous les groupes</option>
              {groupLabels.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-base">
              <option value="name">Nom A-Z</option>
              <option value="age">Âge croissant</option>
            </select>
          </div>
          <div className="flex gap-2 items-center children-responsive-indicators">
            <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px] h-[60px] justify-center">
              <div className="text-xs text-gray-400">Total</div>
              <div className="text-lg font-bold text-gray-900">{totalChildren}</div>
            </div>
            <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px] h-[60px] justify-center">
              <div className="text-xs text-gray-400">Présents</div>
              <div className="text-lg font-bold text-gray-900">{presentToday}</div>
            </div>
          </div>
        </div>

      {(showForm || editingId) && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow p-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" required className="border rounded px-3 py-2" />
          <input name="age" type="number" value={form.age} onChange={handleChange} placeholder="Âge" required className="border rounded px-3 py-2" />
          <select name="sexe" value={form.sexe} onChange={handleChange} required className="border rounded px-3 py-2">
            <option value="masculin">Garçon</option>
            <option value="feminin">Fille</option>
          </select>
          <select name="group" value={form.group} onChange={handleChange} required className="border rounded px-3 py-2">
            <option value="">Groupe</option>
            {groupLabels.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <div className="relative w-full">
            <input name="parentName" value={form.parentName} onChange={(e) => {
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
            }} onFocus={() => setShowParentsDropdown(true)} onBlur={() => {
              // hide dropdown on blur after a short delay to allow click handlers
              setTimeout(() => setShowParentsDropdown(false), 150);
            }} placeholder="Nom du parent" required className="border rounded px-3 py-2 w-full" />

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
          <input name="parentContact" value={form.parentContact} onChange={handleChange} placeholder="Téléphone parent" required className="border rounded px-3 py-2" />
          <input name="parentMail" type="email" value={form.parentMail} onChange={handleChange} placeholder="Email parent" required className="border rounded px-3 py-2" />
          <input name="allergies" value={form.allergies} onChange={handleChange} placeholder="Allergies (optionnel)" className="border rounded px-3 py-2 md:col-span-2" />
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-green-500 text-black px-4 py-2 rounded hover:bg-green-600 transition">
              {editingId ? 'Modifier' : 'Ajouter'}
            </button>
            <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(false); setError(''); }} className="bg-gray-300 px-4 py-2 rounded">Annuler</button>
          </div>
          {error && <div className="text-red-600 md:col-span-2">{error}</div>}
        </form>
      )}
      {successMsg && (
        <div className="mb-4 text-green-600 font-semibold text-center bg-green-50 border border-green-200 rounded-lg py-2">{successMsg}</div>
      )}

      {loading ? (
        <div>Chargement...</div>
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
              await fetchWithRefresh(`/api/children/${child.id}`, {
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
              await fetchChildren();
              setCotisationLoadingId(null);
            };
            return (
              <div
                key={child.id}
                className={`rounded-2xl shadow ${color} relative flex flex-col min-h-[320px] h-full transition-transform duration-500 perspective-1000`}
                style={{height:'100%', perspective: '1000px'}}
              >
                <div
                  className={`w-full h-full transition-transform duration-500 ${isDeleting ? 'rotate-y-180' : ''}`}
                  style={{transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%'}}
                >
                  <div
                    className={`absolute inset-0 w-full h-full p-5 flex flex-col ${isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-transparent`}
                    style={{backfaceVisibility: 'hidden'}}
                  >
                    <div className="flex items-center gap-3 mb-2 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-2xl shadow border border-gray-100">{emoji}</div>
                      <span className="font-semibold text-lg text-gray-900 ml-2 truncate max-w-[120px] min-w-0" title={child.name}>{child.name}</span>
                      <span className="ml-auto text-xs font-bold bg-white text-green-600 px-3 py-1 rounded-full shadow border border-green-100 whitespace-nowrap">{child.age} ans</span>
                      <span className="ml-2 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap" title="Sexe">{child.sexe === 'masculin' ? 'Garçon' : 'Fille'}</span>
                    </div>
                    <span className="block text-xs text-yellow-700 flex items-center gap-1 mb-2">
                      <span>⚠️ Allergies :</span>
                      <span className="font-medium">{child.allergies ? child.allergies : <span className="text-gray-400">Aucune</span>}</span>
                    </span>
                  
                    <div className="flex flex-col gap-3 text-sm text-gray-700 mb-4">
                      <span className="block">👤 Parent : {child.parentName}</span>
                      <span className="block">📞 <a href={`tel:${child.parentContact}`} className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" title="Appeler le parent">{child.parentContact}</a></span>
                      <span className="block">✉️ <a href={`mailto:${child.parentMail}`} className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" title="Envoyer un mail au parent">{child.parentMail}</a></span>
                      <div className="flex flex-col gap-2 mt-2 mb-0" style={{marginBottom: 0}}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">Cotisation annuelle&nbsp;:</span>
                          {daysRemaining > 0 ? (
                            <span className="text-base font-bold text-green-700">{(cotisationAmounts[child.id] ?? 15)}€</span>
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
                            <span className="text-green-500 text-xl">✔️</span>
                          ) : (
                            cotisationLoadingId === child.id ? (
                              <span className="text-gray-400 text-xs ml-2 animate-pulse">Mise à jour...</span>
                            ) : (
                              <button onClick={handleCotisation} className="text-blue-500 text-xs font-semibold px-2 py-1 rounded bg-blue-100 hover:bg-green-100 transition" title="Payer la cotisation">Payer</button>
                            )
                          )}
                          <span className="text-xs text-gray-500 ml-2">{countdown}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">À payer ce mois-ci&nbsp;:</span>
                          <span className="text-base font-bold text-blue-700">{billing ? `${billing.amount}€` : '...'}</span>
                          <span className="text-xs text-gray-500">({billing ? `${billing.days} jour${billing.days > 1 ? 's' : ''}` : 'calcul...'})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-between mt-2">
                      <div className="flex items-center gap-2">
                        {child.present ? (
                          <span className="text-green-600 text-xs font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>Présent aujourd'hui</span>
                        ) : (
                          <span className="text-red-500 text-xs font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>Absent aujourd'hui</span>
                        )}
                        {child.newThisMonth && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Nouveau</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(child)} className="bg-white border border-gray-200 text-gray-500 hover:text-yellow-500 rounded-full p-2 shadow-sm" title="Éditer"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg></button>
                        <button onClick={() => setDeleteId(child.id)} className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full p-2 shadow-sm" title="Supprimer"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-white rounded-2xl shadow-xl p-8 ${isDeleting ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    style={{backfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}}
                  >
                    <div className="text-red-500 text-4xl mb-2">🗑️</div>
                    <div className="text-lg font-semibold mb-2 text-gray-900 text-center">Confirmer la suppression</div>
                    <div className="text-gray-500 mb-6 text-center">Voulez-vous vraiment supprimer cet enfant ? <br/>Cette action est irréversible.</div>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setDeleteId(null)}
                        className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition"
                        disabled={deleteLoading}
                      >Annuler</button>
                      <button
                        onClick={handleDelete}
                        className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-red-600 transition shadow"
                        disabled={deleteLoading}
                      >{deleteLoading ? 'Suppression...' : 'Supprimer'}</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
