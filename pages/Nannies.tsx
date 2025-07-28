
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
  availability: '',
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
  const [error, setError] = useState('');
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
      const res = await fetch(editingId ? `/api/nannies/${editingId}` : '/api/nannies', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
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
    <div className="min-h-screen bg-[#fcfcff] p-0 pl-0 md:pl-[252px]">
      <div className="max-w-7xl mx-auto">
        {/* Header + stats */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">Gestion des intervenants</h1>
            <div className="text-gray-400 text-base">Gérez les profils, plannings, qualifications et affectations des intervenants.</div>
          </div>
          <div className="flex gap-2 items-center self-end">
            <button className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 font-semibold shadow hover:bg-gray-100 transition">Exporter</button>
            <form onSubmit={handleSubmit} className="inline">
              <button type="submit" className="bg-green-500 text-black font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-green-600 transition">
                {editingId ? 'Modifier' : 'Ajouter un intervenant'}
              </button>
            </form>
          </div>
        </div>

        {/* Filtres, recherche, stats */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
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
        {editingId || form.name ? (
          <form onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow p-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" required className="border rounded px-3 py-2" />
            <input name="availability" value={form.availability} onChange={handleChange} placeholder="Disponibilité" required className="border rounded px-3 py-2" />
            <input name="experience" type="number" value={form.experience} onChange={handleChange} placeholder="Expérience (années)" required className="border rounded px-3 py-2" />
            <input name="specializations" value={form.specializations?.join(', ')} onChange={e => setForm({ ...form, specializations: e.target.value.split(',').map(s => s.trim()) })} placeholder="Spécialisations (séparées par virgule)" className="border rounded px-3 py-2 md:col-span-2" />
            <select name="status" value={form.status} onChange={handleChange} className="border rounded px-3 py-2">
              <option value="Disponible">Disponible</option>
              <option value="En congé">En congé</option>
            </select>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-green-500 text-black px-4 py-2 rounded hover:bg-green-600 transition">
                {editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="bg-gray-300 px-4 py-2 rounded">Annuler</button>
            </div>
            {error && <div className="text-red-600 md:col-span-2">{error}</div>}
          </form>
        ) : null}

        {/* Cartes intervenants */}
        {loading ? (
          <div>Chargement...</div>
        ) : (
          <div className="flex flex-col gap-6">
            {filtered.map((nanny, idx) => {
              const avatar = avatarEmojis[idx % avatarEmojis.length];
              return (
                <div key={nanny.id} className="bg-white rounded-2xl shadow p-6 flex flex-col md:flex-row md:items-center gap-6 border border-[#f3f3fa]">
                  {/* Avatar + nom + expérience */}
                  <div className="flex items-center gap-4 min-w-[180px]">
                    <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center text-4xl shadow border border-gray-100">{avatar}</div>
                    <div>
                      <div className="font-bold text-lg text-gray-900">{nanny.name}</div>
                      <div className="text-xs text-gray-500 font-medium">{nanny.experience} ans d'expérience</div>
                    </div>
                  </div>
                  {/* Contact + dispo */}
                  <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex flex-col gap-1 min-w-[180px]">
                      <div className="text-sm text-gray-700 flex items-center gap-2"><span className="font-medium">Disponibilité :</span> {nanny.availability}</div>
                      <div className="text-sm text-gray-700 flex items-center gap-2"><span className="font-medium">Statut :</span> <span className={nanny.status === 'Disponible' ? 'text-green-600' : 'text-red-500'}>{nanny.status}</span></div>
                    </div>
                    {/* Spécialisations */}
                    <div className="flex flex-wrap gap-2">
                      {nanny.specializations?.map((spec, i) => (
                        <span key={i} className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold border border-purple-100">{spec}</span>
                      ))}
                    </div>
                  </div>
                  {/* Enfants assignés */}
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 font-medium mb-1">Affectations du jour ({nanny.assignedChildren.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {nanny.assignedChildren.map(child => (
                        <span key={child.id} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold border border-gray-200">{child.name}</span>
                      ))}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-2 min-w-[120px] items-end">
                    <button className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-semibold border border-blue-100 mb-1">Voir profil</button>
                    <button onClick={() => handleEdit(nanny)} className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full font-semibold border border-yellow-100">Éditer</button>
                    <button onClick={() => handleDelete(nanny.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded-full font-semibold border border-red-100">Supprimer</button>
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
