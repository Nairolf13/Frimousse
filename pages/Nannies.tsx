import React from 'react';
import NannyCalendar from '../components/NannyCalendar';


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
}

const emptyForm: Omit<Nanny, 'id' | 'assignedChildren'> = {
  name: '',
  availability: 'Disponible',
  experience: 0,
  specializations: [],
  status: 'Disponible',
};

const avatarEmojis = ['🦁', '🐻', '🐱', '🐶', '🦊', '🐼', '🐵', '🐯'];

export default function Nannies() {
  const [nannies, setNannies] = useState<Nanny[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [planningNanny, setPlanningNanny] = useState<Nanny|null>(null);
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');

  const fetchNannies = () => {
    setLoading(true);
    fetch('/api/nannies', { credentials: 'include' })
      .then(res => res.json())
      .then(setNannies)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNannies();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        experience: Number(form.experience),
      };
      const res = await fetch(editingId ? `/api/nannies/${editingId}` : '/api/nannies', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
      setForm(emptyForm);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette nounou ?')) return;
    try {
      const res = await fetch(`/api/nannies/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      fetchNannies();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    }
  };

  // Stats
  const totalNannies = nannies.length;
  const availableToday = nannies.filter(n => n.status === 'Disponible').length;
  const onLeave = nannies.filter(n => n.status === 'En congé').length;
  const avgExperience = totalNannies ? (nannies.reduce((acc, n) => acc + n.experience, 0) / totalNannies).toFixed(1) : '0';

  // Filtres et recherche
  const filtered = nannies.filter(n =>
    (!search || n.name.toLowerCase().includes(search.toLowerCase())) &&
    (!availabilityFilter || n.status === availabilityFilter) &&
    (!experienceFilter || (experienceFilter === 'junior' ? n.experience < 3 : n.experience >= 3))
  );

  return (
    <div className="min-h-screen bg-[#fcfcff] p-4 md:pl-64 w-full">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header + stats */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 w-full">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">Gestion des nannies</h1>
            <div className="text-gray-400 text-base">Gérez les profils, plannings, qualifications et affectations des intervenants.</div>
          </div>
          <div className="flex gap-2 items-center self-end">
            <button className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 font-semibold shadow hover:bg-gray-100 transition">Exporter</button>
            <button
              type="button"
              onClick={() => { setForm(emptyForm); setEditingId(null); setAdding(true); }}
              className="bg-green-500 text-black font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-green-600 transition"
            >
              Ajouter une nounou
            </button>
          </div>
        </div>

        {/* Filtres, recherche, stats */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 w-full">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom..." className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-base w-full md:w-64" />
          <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-base">
            <option value="">Toute disponibilité</option>
            <option value="Disponible">Disponible</option>
            <option value="En congé">En congé</option>
          </select>
          <select value={experienceFilter} onChange={e => setExperienceFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-base">
            <option value="">Toute expérience</option>
            <option value="junior">Junior (-3 ans)</option>
            <option value="senior">Senior (3+ ans)</option>
          </select>
          <div className="flex-1"></div>
          <div className="flex gap-2">
            <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px]">
              <div className="text-xs text-gray-400">Total</div>
              <div className="text-lg font-bold text-gray-900">{totalNannies}</div>
            </div>
            <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px]">
              <div className="text-xs text-gray-400">Disponibles</div>
              <div className="text-lg font-bold text-gray-900">{availableToday}</div>
            </div>
            <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px]">
              <div className="text-xs text-gray-400">En congé</div>
              <div className="text-lg font-bold text-gray-900">{onLeave}</div>
            </div>
            <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px]">
              <div className="text-xs text-gray-400">Exp. moyenne</div>
              <div className="text-lg font-bold text-gray-900">{avgExperience} ans</div>
            </div>
          </div>
        </div>

        {/* Formulaire d'ajout/édition (modal style, inline pour démo) */}
        {(adding || editingId) && (
          <form onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow p-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" required className="border rounded px-3 py-2" />
            <select name="availability" value={form.availability} onChange={handleChange} required className="border rounded px-3 py-2">
              <option value="Disponible">Disponible</option>
              <option value="En_congé">En congé</option>
              <option value="Maladie">Maladie</option>
            </select>
            <input name="experience" type="number" value={form.experience} onChange={handleChange} placeholder="Expérience (années)" required className="border rounded px-3 py-2" />
            <input name="specializations" value={form.specializations?.join(', ')} onChange={e => setForm({ ...form, specializations: e.target.value.split(',').map(s => s.trim()) })} placeholder="Spécialisations (séparées par virgule)" className="border rounded px-3 py-2 md:col-span-2" />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-green-500 text-black px-4 py-2 rounded hover:bg-green-600 transition">
                {editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); setAdding(false); }} className="bg-gray-300 px-4 py-2 rounded">Annuler</button>
            </div>
            {error && <div className="text-red-600 md:col-span-2">{error}</div>}
          </form>
        )}

        {/* Cartes intervenants */}
        {loading ? (
          <div>Chargement...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
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
              return (
                <div
                  key={nanny.id}
                  className={`rounded-2xl shadow-lg ${color} flex flex-col items-center min-h-[300px] p-0 relative overflow-hidden`}
                  style={{ height: '100%' }}
                >
                  {/* Avatar centré, badge expérience en haut à droite, statut en badge rond */}
                  <div className="w-full flex flex-col items-center relative pt-6 pb-2">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow border-2 border-gray-100 mb-2">{avatar}</div>
                    <span
                      className={`absolute right-4 top-4 text-xs font-bold px-3 py-1 rounded-full shadow border ${
                        nanny.availability === 'Disponible'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : nanny.availability === 'En_congé'
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }`}
                    >
                      {nanny.availability === 'En_congé' ? 'En congé' : nanny.availability}
                    </span>
                    <span className="mt-1 text-xs font-bold bg-white text-green-600 px-3 py-1 rounded-full shadow border border-green-100">{nanny.experience} ans</span>
                  </div>
                  {/* Nom centré + disponibilité */}
                  <div className="flex flex-col items-center mb-2">
                    <span className="font-semibold text-lg text-gray-900">{nanny.name}</span>
                  </div>
                  {/* Spécialisations en badges, centrées */}
                  {nanny.specializations && nanny.specializations.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-2 w-full px-4">
                      {nanny.specializations.map((spec, i) => (
                        <span key={i} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold border border-purple-200">{spec}</span>
                      ))}
                    </div>
                  )}
                  {/* Enfants assignés, badges ludiques, centrés */}
                  <div className="text-sm text-gray-700 mb-2 w-full flex flex-col items-center">
                    <span className="block font-medium mb-1">
                      Affectations du jour
                      <span className="inline-block bg-white text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-gray-200 ml-1">
                        {nanny.assignedChildren.length}
                      </span>
                    </span>
                    {nanny.assignedChildren.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 w-full px-4">
                        {nanny.assignedChildren.map(child => (
                          <span key={child.id} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold border border-gray-200">{child.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Actions en bas, centrées, ludiques */}
                  <div className="flex justify-center gap-2 mt-auto mb-4 w-full">
                    <button onClick={() => setPlanningNanny(nanny)} className="bg-cyan-100 text-cyan-700 px-4 py-1 rounded-full font-semibold border border-cyan-200 shadow-sm hover:bg-cyan-200 transition">Voir planning</button>
                    <button onClick={() => handleEdit(nanny)} className="bg-yellow-100 text-yellow-700 px-4 py-1 rounded-full font-semibold border border-yellow-200 shadow-sm hover:bg-yellow-200 transition">Éditer</button>
                    <button onClick={() => handleDelete(nanny.id)} className="bg-red-100 text-red-600 px-4 py-1 rounded-full font-semibold border border-red-200 shadow-sm hover:bg-red-200 transition">Supprimer</button>
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
