import { useEffect, useState } from 'react';

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
      fetch('/api/children', { credentials: 'include' })
        .then(res => res.json())
        .then(setChildren);
      fetch('/api/nannies', { credentials: 'include' })
        .then(res => res.json())
        .then(setNannies);
      setForm(initial || { date: '', childId: '', nannyId: '' });
    }
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500">✕</button>
        <h2 className="text-xl font-bold mb-4">{initial ? 'Ajouter':'Modifier'} au plannig</h2>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="grid gap-3">
          <label>Date
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="border rounded px-3 py-2 w-full" />
          </label>
          <label>Enfant
            <select value={form.childId} onChange={e => setForm(f => ({ ...f, childId: e.target.value }))} required className="border rounded px-3 py-2 w-full">
              <option value="">Sélectionner</option>
              {children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}
            </select>
          </label>
          <label>Nounou
            <select value={form.nannyId} onChange={e => setForm(f => ({ ...f, nannyId: e.target.value }))} required className="border rounded px-3 py-2 w-full">
              <option value="">Sélectionner</option>
              {nannies.map(nanny => <option key={nanny.id} value={nanny.id}>{nanny.name}</option>)}
            </select>
          </label>
          <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">{initial ? 'Modifier' : 'Ajouter'}</button>
        </form>
      </div>
    </div>
  );
}
