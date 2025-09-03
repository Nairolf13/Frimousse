import { useEffect, useState } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL;

interface Child {
  id: string;
  name: string;
}
interface Nanny {
  id: string;
  name: string;
}
interface AssignmentFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { date: string; childId: string; nannyId: string }) => void;
  initial?: { date: string; childId: string; nannyId: string };
}

export default function AssignmentModal({ open, onClose, onSave, initial }: AssignmentFormProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [nannies, setNannies] = useState<Nanny[]>([]);
  const [form, setForm] = useState(initial || { date: '', childId: '', nannyId: '' });

  useEffect(() => {
    if (open) {
      fetchWithRefresh(`${API_URL}/children`, { credentials: 'include' })
        .then(res => res.json())
        .then(setChildren);
      fetchWithRefresh(`${API_URL}/nannies`, { credentials: 'include' })
        .then(res => res.json())
        .then(setNannies);
      setForm(initial || { date: '', childId: '', nannyId: '' });
    }
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-[#08323a]">✕</button>
        <h2 className="text-xl font-bold mb-4 text-[#08323a]">{initial ? 'Ajouter':'Modifier'} au plannig</h2>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="grid gap-3">
          <label className="text-[#08323a] font-medium">Date
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="border border-gray-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
          </label>
          <label className="text-[#08323a] font-medium">Enfant
            <select value={form.childId} onChange={e => setForm(f => ({ ...f, childId: e.target.value }))} required className="border border-gray-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]">
              <option value="">Sélectionner</option>
              {children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}
            </select>
          </label>
          <label className="text-[#08323a] font-medium">Nounou
            <select value={form.nannyId} onChange={e => setForm(f => ({ ...f, nannyId: e.target.value }))} required className="border border-gray-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]">
              <option value="">Sélectionner</option>
              {nannies.map(nanny => <option key={nanny.id} value={nanny.id}>{nanny.name}</option>)}
            </select>
          </label>
          <button type="submit" className="bg-[#0b5566] text-white py-2 rounded hover:bg-[#08323a] transition font-semibold">{initial ? 'Ajouter' : 'Modifier'}</button>
        </form>
      </div>
    </div>
  );
}
