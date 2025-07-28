
import { useEffect, useState } from 'react';

interface Child {
  id: string;
  name: string;
  age: number;
  parentName: string;
  parentContact: string;
  allergies?: string;
  group?: string;
  present?: boolean;
  newThisMonth?: boolean;
}

const emptyForm: Omit<Child, 'id'> = {
  name: '',
  age: 0,
  parentName: '',
  parentContact: '',
  allergies: '',
  group: '',
  present: true,
  newThisMonth: false,
};

const groupLabels = [
  { key: 'A', label: 'Groupe A (3-4 ans)' },
  { key: 'B', label: 'Groupe B (4-5 ans)' },
];

const emojiByGroup = {
  A: '👶',
  B: '🧒',
};

export default function Children() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sort, setSort] = useState('name');

  const fetchChildren = () => {
    setLoading(true);
    fetch('/api/children', { credentials: 'include' })
      .then(res => res.json())
      .then(setChildren)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(editingId ? `/api/children/${editingId}` : '/api/children', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
      setForm(emptyForm);
      setEditingId(null);
      fetchChildren();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    }
  };

  const handleEdit = (child: Child) => {
    setForm({ ...child });
    setEditingId(child.id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet enfant ?')) return;
    try {
      const res = await fetch(`/api/children/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      fetchChildren();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur');
      }
    }
  };

  // Statistiques
  const totalChildren = children.length;
  const groupA = children.filter(c => c.group === 'A').length;
  const groupB = children.filter(c => c.group === 'B').length;
  const presentToday = children.filter(c => c.present).length;
  const newThisMonth = children.filter(c => c.newThisMonth).length;

  // Filtres et tri
  let filtered = children.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.parentName.toLowerCase().includes(search.toLowerCase())) &&
    (!groupFilter || c.group === groupFilter)
  );
  if (sort === 'name') filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'age') filtered = filtered.sort((a, b) => a.age - b.age);

  // Couleurs de carte
  const cardColors = [
    'bg-blue-50',
    'bg-yellow-50',
    'bg-purple-50',
    'bg-green-50',
    'bg-pink-50',
    'bg-orange-50',
  ];

  return (
    <div className="relative z-0 min-h-screen bg-[#fcfcff] p-0 md:pl-64">
      <div className="max-w-7xl mx-auto w-full">
      {/* Header + stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">Gestion des enfants</h1>
          <div className="text-gray-400 text-base">Gérez les profils, informations médicales et contacts d'urgence.</div>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 items-center self-end">
          <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="hidden" tabIndex={-1}></button>
          <button type="submit" className="bg-green-500 text-black font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-green-600 transition">
            {editingId ? 'Modifier' : 'Ajouter un enfant'}
          </button>
        </form>
      </div>

      {/* Filtres, recherche, stats */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, parent..." className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-base w-full md:w-64" />
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-base">
          <option value="">Tous les groupes</option>
          {groupLabels.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-base">
          <option value="name">Nom A-Z</option>
          <option value="age">Âge croissant</option>
        </select>
        <div className="flex-1"></div>
        <div className="flex gap-2">
          <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px]">
            <div className="text-xs text-gray-400">Total</div>
            <div className="text-lg font-bold text-gray-900">{totalChildren}</div>
          </div>
          <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px]">
            <div className="text-xs text-gray-400">Groupe A</div>
            <div className="text-lg font-bold text-gray-900">{groupA}</div>
          </div>
          <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px]">
            <div className="text-xs text-gray-400">Groupe B</div>
            <div className="text-lg font-bold text-gray-900">{groupB}</div>
          </div>
          <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px]">
            <div className="text-xs text-gray-400">Présents</div>
            <div className="text-lg font-bold text-gray-900">{presentToday}</div>
          </div>
          <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px]">
            <div className="text-xs text-gray-400">Nouveaux</div>
            <div className="text-lg font-bold text-gray-900">{newThisMonth}</div>
          </div>
        </div>
      </div>

      {/* Formulaire d'ajout/édition (modal style, inline pour démo) */}
      {editingId || form.name ? (
        <form onSubmit={handleSubmit} className="mb-6 bg-white rounded-2xl shadow p-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" required className="border rounded px-3 py-2" />
          <input name="age" type="number" value={form.age} onChange={handleChange} placeholder="Âge" required className="border rounded px-3 py-2" />
          <select name="group" value={form.group} onChange={handleChange} required className="border rounded px-3 py-2">
            <option value="">Groupe</option>
            {groupLabels.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <input name="parentName" value={form.parentName} onChange={handleChange} placeholder="Nom du parent" required className="border rounded px-3 py-2" />
          <input name="parentContact" value={form.parentContact} onChange={handleChange} placeholder="Contact parent" required className="border rounded px-3 py-2" />
          <input name="allergies" value={form.allergies} onChange={handleChange} placeholder="Allergies (optionnel)" className="border rounded px-3 py-2 md:col-span-2" />
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-green-500 text-black px-4 py-2 rounded hover:bg-green-600 transition">
              {editingId ? 'Modifier' : 'Ajouter'}
            </button>
            <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="bg-gray-300 px-4 py-2 rounded">Annuler</button>
          </div>
          {error && <div className="text-red-600 md:col-span-2">{error}</div>}
        </form>
      ) : null}

      {/* Cartes enfants */}
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((child, idx) => {
            const color = cardColors[idx % cardColors.length];
            const emoji = emojiByGroup[child.group as 'A' | 'B'] || '👦';
            return (
              <div key={child.id} className={`rounded-2xl shadow p-5 ${color} relative flex flex-col min-h-[210px]`}>
                {/* Avatar + badge âge */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-2xl shadow border border-gray-100">{emoji}</div>
                  <span className="ml-auto text-xs font-bold bg-white text-green-600 px-3 py-1 rounded-full shadow border border-green-100">{child.age} ans</span>
                </div>
                {/* Nom + groupe */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-lg text-gray-900">{child.name}</span>
                  {child.group && <span className="text-xs font-medium text-gray-500">{groupLabels.find(g => g.key === child.group)?.label}</span>}
                </div>
                {/* Parent + contact */}
                <div className="text-sm text-gray-700 mb-1">
                  <span className="block">👤 Parent : {child.parentName}</span>
                  <span className="block">✉️ {child.parentContact}</span>
                </div>
                {/* Allergies */}
                {child.allergies && (
                  <div className="text-xs text-yellow-700 flex items-center gap-1 mb-1"><span>⚠️ Allergies :</span> <span className="font-medium">{child.allergies}</span></div>
                )}
                {/* Statut présence */}
                <div className="flex items-center gap-2 mt-auto">
                  {child.present ? (
                    <span className="text-green-600 text-xs font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>Présent aujourd'hui</span>
                  ) : (
                    <span className="text-red-500 text-xs font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>Absent aujourd'hui</span>
                  )}
                  {child.newThisMonth && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Nouveau</span>
                  )}
                </div>
                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-1">
                  <button onClick={() => handleEdit(child)} className="bg-white border border-gray-200 text-gray-500 hover:text-yellow-500 rounded-full p-2 shadow-sm" title="Éditer"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg></button>
                  <button onClick={() => handleDelete(child.id)} className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full p-2 shadow-sm" title="Supprimer"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
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
