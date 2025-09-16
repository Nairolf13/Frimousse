import React from 'react';
import '../styles/filter-responsive.css';
import NannyCalendar from '../components/NannyCalendar';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';


const API_URL = import.meta.env.VITE_API_URL;


function PlanningModal({ nanny, onClose }: { nanny: Nanny; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
        <h2 className="text-xl font-bold mb-4 text-center">Planning de {nanny.name}</h2>
        <NannyCalendar nannyId={nanny.id} />
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useGetNanniesQuery, useCreateNannyMutation, useUpdateNannyMutation, useDeleteNannyMutation, usePayCotisationMutation } from '../src/features/nannies/nanniesApi';

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
}

type CreateNannyPayload = Partial<{
  name: string;
  availability: string;
  experience: number;
  specializations: string[];
  status: string;
  contact: string;
  email: string;
  birthDate?: string | null;
  password?: string;
}>;

const emptyForm: Omit<Nanny, 'id' | 'assignedChildren'> & { email?: string; password?: string } = {
  name: '',
  availability: 'Disponible',
  experience: 0,
  specializations: [],
  status: 'Disponible',
  contact: '',
  email: '',
  password: '',
  birthDate: undefined,
};

const avatarEmojis = ['🦁', '🐻', '🐱', '🐶', '🦊', '🐼', '🐵', '🐯'];

export default function Nannies() {
  const { user } = useAuth();
  const { data: nanniesRaw = [], isLoading: nanniesLoading, refetch: refetchNannies } = useGetNanniesQuery();
  const nannies: Nanny[] = (nanniesRaw as unknown) as Nanny[];
  const [cotisationStatus, setCotisationStatus] = useState<Record<string, { paidUntil: string | null; loading: boolean }>>({});
  const [cotisationAmounts, setCotisationAmounts] = useState<Record<string, number>>({});
  interface Assignment {
    id: string;
    date: string;
    nanny: Nanny;
    child: Child;
  }
  
    const [assignments, setAssignments] = useState<Assignment[]>([]); 
  // loading state replaced by RTK Query's isLoading (nanniesLoading)
  const [form, setForm] = useState(emptyForm);
  const [showPw, setShowPw] = useState(false);
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
      const data = await res.json().catch(() => ({}));
      setCotisationStatus(s => ({ ...s, [nannyId]: { paidUntil: data.cotisationPaidUntil ?? null, loading: false } }));
      if (data.lastCotisationAmount) setCotisationAmounts(prev => ({ ...prev, [nannyId]: Number(data.lastCotisationAmount) }));
    } catch {
      setCotisationStatus(s => ({ ...s, [nannyId]: { paidUntil: null, loading: false } }));
    }
  };

  const [messages, setMessages] = useState<Record<string, { text: string; type: 'success' | 'error' } | null>>({});
  const [confirmPayment, setConfirmPayment] = useState<{ nannyId: string; amount: number } | null>(null);
  // Admin password-reset modal state
  const [adminResetModal, setAdminResetModal] = useState<{ open: boolean; nannyId?: string; password?: string } | null>(null);
  const [pendingSave, setPendingSave] = useState<{ payload: Partial<typeof emptyForm> & { experience?: number; newPassword?: string }; editingId?: string | null } | null>(null);

  const [payCotisation] = usePayCotisationMutation();

  const requestPay = (nannyId: string) => {
    const amount = cotisationAmounts[nannyId] || 10;
    setConfirmPayment({ nannyId, amount });
  };

  const confirmPay = async () => {
    if (!confirmPayment) return;
    const { nannyId, amount } = confirmPayment;
    setConfirmPayment(null);
    setCotisationStatus(s => ({ ...s, [nannyId]: { ...s[nannyId], loading: true } }));
    try {
      const resp = await payCotisation({ id: nannyId, amount }).unwrap();
      setCotisationStatus(s => ({ ...s, [nannyId]: { paidUntil: resp.cotisationPaidUntil ?? null, loading: false } }));
      setMessages(m => ({ ...m, [nannyId]: { text: 'Paiement enregistré', type: 'success' } }));
      if (resp.lastCotisationAmount) setCotisationAmounts(prev => ({ ...prev, [nannyId]: Number(resp.lastCotisationAmount) }));
      setTimeout(() => setMessages(m => ({ ...m, [nannyId]: null })), 3000);
    } catch {
      setCotisationStatus(s => ({ ...s, [nannyId]: { paidUntil: null, loading: false } }));
      setMessages(m => ({ ...m, [nannyId]: { text: 'Erreur lors du paiement', type: 'error' } }));
      setTimeout(() => setMessages(m => ({ ...m, [nannyId]: null })), 4000);
    }
  };

  const [createNanny] = useCreateNannyMutation();
  const [updateNanny] = useUpdateNannyMutation();
  const [deleteNannyMutation] = useDeleteNannyMutation();

  useEffect(() => {
    // nannies are provided by RTK Query; fetch cotisations for each when available
    nannies.forEach(n => { setCotisationAmounts(a => ({ ...a, [n.id]: 10 })); fetchCotisation(n.id); });
    fetchWithRefresh(`${API_URL}/assignments`, { credentials: 'include' })
      .then(res => res.json())
      .then(setAssignments);
  }, [nannies]);

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
      if (editingId) {
        await updateNanny({ id: editingId, body: payload }).unwrap();
      } else {
        const { newPassword, ...rest } = payload as unknown as Record<string, unknown>;
        const createBody: CreateNannyPayload = { ...(rest as CreateNannyPayload) };
        if (newPassword && typeof newPassword === 'string') createBody.password = newPassword;
        await createNanny(createBody).unwrap();
      }
      setForm(emptyForm);
      setConfirmPassword('');
      setEditingId(null);
      refetchNannies();
      if (editingId) {
        setMessages(m => ({ ...m, [editingId]: { text: 'Mise à jour effectuée', type: 'success' } }));
        setTimeout(() => setMessages(m => ({ ...m, [editingId]: null })), 3000);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      if (typeof err === 'object' && err !== null && 'status' in err) {
        const maybe = err as { status?: number | string };
        if (maybe.status === 402) { setError('Limite atteinte pour votre plan.'); return; }
        if (maybe.status === 409) { setError('Un utilisateur avec cet email existe déjà.'); return; }
      }
      setError('Erreur');
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
    setForm({ name: nanny.name, availability: nanny.availability, experience: nanny.experience, specializations: nanny.specializations || [], status: nanny.status || 'Disponible', contact: nanny.contact, email: nanny.email, birthDate: nanny.birthDate });
    setEditingId(nanny.id);
    setAdding(false);
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
      await deleteNannyMutation(deleteId).unwrap();
      setDeleteId(null);
      refetchNannies();
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

  // metrics derived from visibleNannies (kept for potential UI but not used elsewhere)
  // const totalNannies = visibleNannies.length;
  // const availableToday = visibleNannies.filter(n => n.availability === 'Disponible').length;
  // const onLeave = visibleNannies.filter(n => n.availability === 'En_congé' || n.availability === 'En congé').length;

  const filtered = nannies.filter(n =>
    (!search || n.name.toLowerCase().includes(search.toLowerCase())) &&
    (!availabilityFilter ||
      (availabilityFilter === 'Disponible' && n.availability === 'Disponible') ||
      (availabilityFilter === 'En congé' && (n.availability === 'En_congé' || n.availability === 'En congé')) ||
      availabilityFilter === '') &&
    (!experienceFilter || (experienceFilter === 'junior' ? n.experience < 3 : n.experience >= 3))
  );

  return (

    <div className="min-h-screen bg-[#fcfcff] p-2 sm:p-4 md:pl-64 w-full">
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 w-full">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">Gestion des nounous</h1>
            <div className="text-gray-400 text-base">Gérez les profils, plannings, qualifications et affectations des intervenants.</div>
          </div>
          <div className="flex gap-2 items-center self-start md:ml-auto">
            {(user && typeof user.role === 'string' && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('super'))) && (
              <button
                type="button"
                onClick={() => { setForm(emptyForm); setEditingId(null); setAdding(true); }}
                className="bg-[#0b5566] text-white font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-[#08323a] transition min-h-[44px] md:h-[60px]"
              >
                Ajouter une nounou
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-6 w-full filter-responsive">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom..." className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-base w-full md:w-64" />
          <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)} className="border rounded px-3 py-2 text-xs md:text-base bg-white text-gray-700 shadow-sm w-full md:w-auto">
            <option value="">Toute disponibilité</option>
            <option value="Disponible">Disponible</option>
            <option value="En congé">En congé</option>
          </select>
          <select value={experienceFilter} onChange={e => setExperienceFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-xs md:text-base w-full md:w-auto">
            <option value="">Toute expérience</option>
            <option value="junior">Junior (-3 ans)</option>
            <option value="senior">Senior (3+ ans)</option>
          </select>
          <div className="flex-1" />
        </div>
        {(adding || editingId) && (
          <form ref={formRef} onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow p-4 md:p-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" required className="border rounded px-3 py-2 text-base" />
            <select name="availability" value={form.availability} onChange={handleChange} required className="border rounded px-3 py-2 text-xs md:text-base">
              <option value="Disponible">Disponible</option>
              <option value="En_congé">En congé</option>
              <option value="Maladie">Maladie</option>
            </select>
            <input name="experience" type="number" value={form.experience} onChange={handleChange} placeholder="Expérience (années)" required className="border rounded px-3 py-2 text-base" />
            <input name="birthDate" type="date" value={form.birthDate || ''} onChange={handleChange} placeholder="Date de naissance" className="border rounded px-3 py-2 text-base" />
            <input name="specializations" value={form.specializations?.join(', ')} onChange={e => setForm({ ...form, specializations: e.target.value.split(',').map(s => s.trim()) })} placeholder="Spécialisations (séparées par virgule)" className="border rounded px-3 py-2 text-base md:col-span-2" />
            <input name="contact" type="tel" value={form.contact || ''} onChange={handleChange} placeholder="Téléphone" className="border rounded px-3 py-2 text-base" />
            <input name="email" type="email" value={form.email || ''} onChange={handleChange} placeholder="Email " className="border rounded px-3 py-2 text-base" />
            <div className="relative md:col-span-1">
              <input name="password" type={showPw ? "text" : "password"} value={form.password || ''} onChange={handleChange} placeholder="Mot de passe" className="border rounded px-3 py-2 text-base w-full pr-10" />
              <button type="button" tabIndex={-1} className="absolute right-2 top-2 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>{showPw ? "🙈" : "👁️"}</button>
            </div>
            <div className="relative md:col-span-1">
              <input name="confirmPassword" type={showPw ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" className="border rounded px-3 py-2 text-base w-full pr-10" />
              <button type="button" tabIndex={-1} className="absolute right-2 top-2 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>{showPw ? "🙈" : "👁️"}</button>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-[#0b5566] text-white px-4 py-2 rounded hover:bg-[#08323a] transition">
                {editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => { setForm(emptyForm); setConfirmPassword(''); setEditingId(null); setAdding(false); }} className="bg-gray-300 px-4 py-2 rounded">Annuler</button>
            </div>
            {error && <div className="text-red-600 md:col-span-2">{error}</div>}
          </form>
        )}

        {nanniesLoading ? (
          <div>Chargement...</div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full children-responsive-grid">
            {filtered
              .filter(n => visibleNannies.some(v => String(v.id) === String(n.id)))
              .map((nanny, idx) => {
              const cotisation = cotisationStatus[nanny.id];
              const daysRemaining = cotisation && cotisation.paidUntil ? Math.max(0, Math.ceil((new Date(cotisation.paidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
              const avatar = avatarEmojis[idx % avatarEmojis.length];
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
              return (
                <div
                  key={nanny.id}
                  className={`rounded-2xl shadow ${color} relative flex flex-col min-h-[440px] h-full transition-transform duration-500 perspective-1000 overflow-hidden`}
                  style={{ height: '100%', perspective: '1000px' }}
                >
                  <span
                    className={`absolute text-xs font-bold px-3 py-1 rounded-full shadow border whitespace-nowrap transform left-1/2 -translate-x-1/2 top-3`}
                    style={{zIndex:2, background: nanny.availability === 'Disponible' ? '#a9ddf2' : nanny.availability === 'En_congé' ? '#fff4d6' : '#ffeaea', color: nanny.availability === 'Disponible' ? '#08323a' : nanny.availability === 'En_congé' ? '#856400' : '#7a2a2a', borderColor: nanny.availability === 'Disponible' ? '#a9ddf2' : nanny.availability === 'En_congé' ? '#fff4d6' : '#ffeaea'}}
                  >
                    {nanny.availability === 'En_congé' ? 'En congé' : nanny.availability}
                  </span>
                  <div
                    className={`w-full h-full transition-transform duration-500 ${isDeleting ? 'rotate-y-180' : ''}`}
                    style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
                  >
                    <div
                      className={`absolute inset-0 w-full h-full p-3 sm:p-4 md:p-6 flex flex-col items-center ${isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-transparent`}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 min-w-0 pt-8 sm:pt-10 md:pt-12 pb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center text-lg sm:text-2xl shadow border border-gray-100">{avatar}</div>
                        <span className="font-semibold text-base sm:text-lg text-[#08323a] ml-1 sm:ml-2 max-w-full sm:max-w-[120px] sm:truncate min-w-0" title={nanny.name}>{nanny.name}</span>
                        <span className="ml-auto text-xs font-bold bg-white text-[#08323a] px-2 sm:px-3 py-1 rounded-full shadow border border-[#a9ddf2] whitespace-nowrap">{nanny.experience} ans</span>
                      </div>
                      {nanny.birthDate && (
                        <div className="text-xs sm:text-sm text-gray-600 mb-1 text-center">
                          Né(e) le {new Date(nanny.birthDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      )}
                      <div className="flex flex-col gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4">
                        <span className="flex items-center gap-2 w-full justify-center">
                          <span role="img" aria-label="Téléphone" className="text-sm sm:text-base">📞</span>
                          {nanny.contact ? (
                            <a href={`tel:${nanny.contact}`} className="text-blue-700 underline text-xs sm:text-sm break-words max-w-full sm:max-w-none" aria-label={`Appeler ${nanny.name}`}>{nanny.contact}</a>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">—</span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 w-full justify-center">
                          <span role="img" aria-label="Email" className="text-sm sm:text-base">✉️</span>
                          {nanny.email ? (
                            <a href={`mailto:${nanny.email}`} className="text-blue-700 underline text-xs sm:text-sm break-words max-w-full sm:max-w-none" aria-label={`Envoyer un mail à ${nanny.name}`}>{nanny.email}</a>
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
                          Affectations aujourd'hui
                          <span className="inline-block bg-white text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-gray-200 ml-1">
                            {assignedTodayCount}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mt-auto mb-4 w-full min-w-0">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">Cotisation mensuel :</span>
                          {cotisation?.loading ? (
                            <span className="text-sm text-gray-500">Chargement...</span>
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
                          {daysRemaining <= 0 && isAdmin && (
                            <button
                              className="text-[#0b5566] text-xs font-semibold px-2 py-1 rounded bg-[#a9ddf2] hover:bg-[#f7f4d7] transition ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={cotisation?.loading || isPaymentModalOpen}
                              onClick={() => requestPay(nanny.id)}
                            >
                              {cotisation?.loading ? "Paiement..." : isPaymentModalOpen ? "Confirmation..." : "Payer"}
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-500 text-center">
                            {cotisation ? (
                              cotisation.loading ? 'Chargement...' : (
                                cotisation.paidUntil ? (daysRemaining > 0 ? `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restants` : 'Cotisation à renouveler') : 'Cotisation à renouveler'
                              )
                            ) : '—'}
                          </span>
                          {daysRemaining <= 0 && messages[nanny.id] && (
                            <div className={`mt-1 text-xs ${messages[nanny.id]?.type === 'success' ? 'text-[#0b5566]' : 'text-red-600'}`}>
                              {messages[nanny.id]?.text}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-2 mt-2">
                          <button
                            onClick={() => setPlanningNanny(nanny)}
                            className="w-[120px] min-w-[100px] bg-[#a9ddf2] text-[#0b5566] px-3 py-2 rounded-full font-semibold border border-[#a9ddf2] shadow-sm hover:bg-[#f7f4d7] transition text-xs text-center mx-auto"
                          >Planning</button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(nanny)}
                              className="bg-white border border-gray-200 text-gray-500 hover:text-[#08323a] rounded-full p-2 shadow-sm"
                              title="Éditer"
                            >
                              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg>
                            </button>
                            <button
                              onClick={() => setDeleteId(nanny.id)}
                              className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full p-2 shadow-sm"
                              title="Supprimer"
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
                      <div className="text-lg font-semibold mb-2 text-gray-900 text-center">Confirmer la suppression</div>
                      <div className="text-gray-500 mb-6 text-center">Voulez-vous vraiment supprimer cette nounou ? <br/>Cette action est irréversible.</div>
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={() => setDeleteId(null)}
                          className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition"
                        >Annuler</button>
                        <button
                          onClick={handleDelete}
                          className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-red-600 transition shadow"
                        >Supprimer</button>
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
            <h3 className="text-lg font-bold mb-2">Confirmer le paiement</h3>
            <p className="mb-4">Voulez-vous enregistrer le paiement de <span className="font-semibold">{confirmPayment.amount}€</span> pour cette nounou ?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPayment(null)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2"
              >Annuler</button>
              <button
                onClick={confirmPay}
                className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2"
              >Confirmer</button>
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
            <h3 className="text-lg font-bold mb-2">Confirmer la réinitialisation du mot de passe</h3>
            <p className="mb-4">Vous allez réinitialiser le mot de passe de cette nounou. Voulez-vous continuer ?</p>
            <div className="flex gap-3">
              <button onClick={cancelAdminReset} className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2">Annuler</button>
              <button onClick={confirmAdminReset} className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
