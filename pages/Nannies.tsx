import React from 'react';
import '../styles/filter-responsive.css';
import NannyCalendar from '../components/NannyCalendar';
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

import { useEffect, useState } from 'react';

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
}

const emptyForm: Omit<Nanny, 'id' | 'assignedChildren'> & { email?: string; password?: string } = {
  name: '',
  availability: 'Disponible',
  experience: 0,
  specializations: [],
  status: 'Disponible',
  contact: '',
  email: '',
  password: '',
};

const avatarEmojis = ['🦁', '🐻', '🐱', '🐶', '🦊', '🐼', '🐵', '🐯'];

export default function Nannies() {
  const [nannies, setNannies] = useState<Nanny[]>([]);
  interface Assignment {
    id: string;
    date: string;
    nanny: Nanny;
    child: Child;
  }
  
    const [assignments, setAssignments] = useState<Assignment[]>([]); 
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showPw, setShowPw] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [planningNanny, setPlanningNanny] = useState<Nanny|null>(null);
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');

  const fetchNannies = () => {
    setLoading(true);
    fetchWithRefresh(`${API_URL}/api/nannies`, { credentials: 'include' })
      .then(res => res.json())
      .then(setNannies)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNannies();
    fetchWithRefresh(`${API_URL}/api/assignments`, { credentials: 'include' })
      .then(res => res.json())
      .then(setAssignments);
  }, []);

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
      const payload = {
        ...form,
        experience: Number(form.experience),
      };
      if (!payload.email) delete payload.email;
      if (!payload.password) delete payload.password;
      const res = await fetch(editingId ? `${API_URL}/api/nannies/${editingId}` : `${API_URL}/api/nannies`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
      setForm(emptyForm);
      setConfirmPassword('');
      setEditingId(null);
      fetchNannies();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    }
  };

  const handleEdit = (nanny: Nanny) => {
    setForm({ name: nanny.name, availability: nanny.availability, experience: nanny.experience, specializations: nanny.specializations || [], status: nanny.status || 'Disponible' });
    setEditingId(nanny.id);
  };

  const [deleteId, setDeleteId] = useState<string|null>(null);
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetchWithRefresh(`${API_URL}/api/nannies/${deleteId}`, {
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

  const totalNannies = nannies.length;
  const availableToday = nannies.filter(n => n.availability === 'Disponible').length;
  const onLeave = nannies.filter(n => n.availability === 'En_congé' || n.availability === 'En congé').length;

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
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">Gestion des nannies</h1>
            <div className="text-gray-400 text-sm md:text-base">Gérez les profils, plannings, qualifications et affectations des intervenants.</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 w-full lg:flex-row lg:items-center lg:gap-4 lg:mb-6 lg:w-full md:max-w-md md:w-full">
          <div className="flex gap-2 items-center mb-2 md:mb-0">
            <button
              type="button"
              onClick={() => { setForm(emptyForm); setEditingId(null); setAdding(true); }}
              className="bg-green-500 text-black font-semibold rounded-lg px-4 md:px-5 py-2 md:py-4 text-xs md:text-base shadow hover:bg-green-600 transition flex items-center h-[56px] md:h-[60px]"
            >
              Ajouter une nounou
            </button>
          </div>
          <div className="flex gap-2 flex-wrap justify-start w-full">
            <div className="bg-white rounded-xl shadow px-3 md:px-4 py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px]">
              <div className="text-xs text-gray-400">Total</div>
              <div className="text-base md:text-lg font-bold text-gray-900">{totalNannies}</div>
            </div>
            <div className="bg-white rounded-xl shadow px-3 md:px-4 py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px]">
              <div className="text-xs text-gray-400">Disponibles</div>
              <div className="text-base md:text-lg font-bold text-gray-900">{availableToday}</div>
            </div>
            <div className="bg-white rounded-xl shadow px-3 md:px-4 py-2 flex flex-col items-center min-w-[80px] md:min-w-[90px]">
              <div className="text-xs text-gray-400">En congé</div>
              <div className="text-base md:text-lg font-bold text-gray-900">{onLeave}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-6 w-full filter-responsive">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom..." className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-xs md:text-base w-full md:w-64" />
          <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-xs md:text-base w-full md:w-auto">
            <option value="">Toute disponibilité</option>
            <option value="Disponible">Disponible</option>
            <option value="En congé">En congé</option>
          </select>
          <select value={experienceFilter} onChange={e => setExperienceFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-xs md:text-base w-full md:w-auto">
            <option value="">Toute expérience</option>
            <option value="junior">Junior (-3 ans)</option>
            <option value="senior">Senior (3+ ans)</option>
          </select>
          <div className="flex-1"></div>
        </div>

        {(adding || editingId) && (
          <form onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow p-4 md:p-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" required className="border rounded px-3 py-2 text-xs md:text-base" />
            <select name="availability" value={form.availability} onChange={handleChange} required className="border rounded px-3 py-2 text-xs md:text-base">
              <option value="Disponible">Disponible</option>
              <option value="En_congé">En congé</option>
              <option value="Maladie">Maladie</option>
            </select>
            <input name="experience" type="number" value={form.experience} onChange={handleChange} placeholder="Expérience (années)" required className="border rounded px-3 py-2 text-xs md:text-base" />
            <input name="specializations" value={form.specializations?.join(', ')} onChange={e => setForm({ ...form, specializations: e.target.value.split(',').map(s => s.trim()) })} placeholder="Spécialisations (séparées par virgule)" className="border rounded px-3 py-2 text-xs md:text-base md:col-span-2" />
            <input name="contact" type="tel" value={form.contact || ''} onChange={handleChange} placeholder="Téléphone" className="border rounded px-3 py-2 text-xs md:text-base" />
            <input name="email" type="email" value={form.email || ''} onChange={handleChange} placeholder="Email " className="border rounded px-3 py-2 text-xs md:text-base" />
            <div className="relative md:col-span-1">
              <input name="password" type={showPw ? "text" : "password"} value={form.password || ''} onChange={handleChange} placeholder="Mot de passe" className="border rounded px-3 py-2 text-xs md:text-base w-full pr-10" />
              <button type="button" tabIndex={-1} className="absolute right-2 top-2 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>{showPw ? "🙈" : "👁️"}</button>
            </div>
            <div className="relative md:col-span-1">
              <input name="confirmPassword" type={showPw ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" className="border rounded px-3 py-2 text-xs md:text-base w-full pr-10" />
              <button type="button" tabIndex={-1} className="absolute right-2 top-2 text-gray-400 hover:text-gray-700" onClick={() => setShowPw(v => !v)}>{showPw ? "🙈" : "👁️"}</button>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-green-500 text-black px-4 py-2 rounded hover:bg-green-600 transition text-xs md:text-base">
                {editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => { setForm(emptyForm); setConfirmPassword(''); setEditingId(null); setAdding(false); }} className="bg-gray-300 px-4 py-2 rounded text-xs md:text-base">Annuler</button>
            </div>
            {error && <div className="text-red-600 md:col-span-2">{error}</div>}
          </form>
        )}

        {loading ? (
          <div>Chargement...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 w-full">
            {filtered.map((nanny, idx) => {
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
              return (
                <div
                  key={nanny.id}
                  className={`rounded-2xl shadow-lg ${color} relative flex flex-col min-h-[320px] h-full transition-transform duration-500 perspective-1000 max-w-xs w-full`}
                  style={{ height: '100%', perspective: '1000px' }}
                >
                  <span
                    className={`absolute text-xs font-bold px-3 py-1 rounded-full shadow border whitespace-nowrap
                      ${nanny.availability === 'Disponible'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : nanny.availability === 'En_congé'
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        : 'bg-red-100 text-red-700 border-red-200'}
                      right-4 top-4
                      `}
                    style={{zIndex:2}}
                  >
                    {nanny.availability === 'En_congé' ? 'En congé' : nanny.availability}
                  </span>
                  <div
                    className={`w-full h-full transition-transform duration-500 ${isDeleting ? 'rotate-y-180' : ''}`}
                    style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
                  >
                    <div
                      className={`absolute inset-0 w-full h-full p-0 flex flex-col items-center ${isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-transparent`}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="w-full flex flex-col items-center relative pt-6 pb-2">
                        <div className="relative w-16 h-16 mb-2 flex items-center justify-center">
                          <span className="rounded-full bg-white flex items-center justify-center text-3xl shadow border-2 border-gray-100 w-16 h-16">{avatar}</span>
                        </div>
                        <span className="mt-1 text-xs font-bold bg-white text-green-600 px-3 py-1 rounded-full shadow border border-green-100">{nanny.experience} ans</span>
                      </div>
                      <div className="flex flex-col items-center mb-2">
                        <span className="font-semibold text-base md:text-lg text-gray-900">{nanny.name}</span>
                        <div className="flex flex-col gap-1 items-center mt-1 w-full">
                          <span className="flex items-center gap-2 w-full justify-center">
                            <span role="img" aria-label="Téléphone">📞</span>
                            {nanny.contact ? (
                              <a href={`tel:${nanny.contact}`} className="text-blue-700 underline text-xs md:text-sm" aria-label={`Appeler ${nanny.name}`}>{nanny.contact}</a>
                            ) : (
                              <span className="text-gray-400 text-xs md:text-sm">—</span>
                            )}
                          </span>
                          <span className="flex items-center gap-2 w-full justify-center">
                            <span role="img" aria-label="Email">✉️</span>
                            {nanny.email ? (
                              <a href={`mailto:${nanny.email}`} className="text-blue-700 underline text-xs md:text-sm" aria-label={`Envoyer un mail à ${nanny.name}`}>{nanny.email}</a>
                            ) : (
                              <span className="text-gray-400 text-xs md:text-sm">—</span>
                            )}
                          </span>
                        </div>
                      </div>
                      {nanny.specializations && nanny.specializations.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mb-2 w-full px-4">
                          {nanny.specializations.map((spec, i) => (
                            <span key={i} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold border border-purple-200">{spec}</span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs md:text-sm text-gray-700 mb-2 w-full flex flex-col items-center">
                        {(() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const assignedToday = assignments.filter(a =>
                            a.nanny && a.nanny.id === nanny.id && a.date.split('T')[0] === todayStr
                          );
                          return (
                            <span className="block font-medium mb-1">
                              Affectations aujourd'hui
                              <span className="inline-block bg-white text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-gray-200 ml-1">
                                {assignedToday.length}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex flex-row flex-wrap justify-center gap-2 mt-auto mb-4 w-full min-w-0">
                        <button
                          onClick={() => setPlanningNanny(nanny)}
                          className="w-[90px] min-w-[80px] max-w-[100px] bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full font-semibold border border-cyan-200 shadow-sm hover:bg-cyan-200 transition text-xs text-center"
                        >Planning</button>
                        <button
                          onClick={() => handleEdit(nanny)}
                          className="w-[90px] min-w-[80px] max-w-[100px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold border border-yellow-200 shadow-sm hover:bg-yellow-200 transition text-xs text-center"
                        >Éditer</button>
                        <button
                          onClick={() => setDeleteId(nanny.id)}
                          className="w-[90px] min-w-[80px] max-w-[100px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold border border-red-200 shadow-sm hover:bg-red-200 transition text-xs text-center"
                        >Supprimer</button>
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
      {planningNanny && (
        <PlanningModal nanny={planningNanny} onClose={() => setPlanningNanny(null)} />
      )}
    </div>
  );
}
