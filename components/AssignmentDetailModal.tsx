import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type Assignment = {
  id: string;
  date: string;
  child: { id: string; name: string };
  nanny?: { id: string; name: string } | null;
};

function formatLocal(dt: string) {
  try {
    const d = new Date(dt);
  return d.toLocaleDateString(undefined, { dateStyle: 'full' });
  } catch {
    return dt;
  }
}

export default function AssignmentDetailModal({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-60 bg-white/40 backdrop-blur-[2px] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative border border-gray-100">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-[#08323a]" aria-label="Fermer">✕</button>
        <h3 className="text-lg font-semibold mb-2 text-[#08323a]">Détail de l'activité</h3>
        <div className="text-sm text-[#08323a] mb-3">
          <div><strong>Enfant :</strong> {assignment.child?.name ?? '—'}</div>
          <div><strong>Date :</strong> {formatLocal(assignment.date)}</div>
          <div><strong>Nounou :</strong> {assignment.nanny?.name ?? '—'}</div>
        </div>

        <div className="flex gap-2 mt-4">
          <button className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 text-[#0b5566]" onClick={onClose}>Fermer</button>
          <button className="flex-1 bg-[#0b5566] text-white rounded-xl px-4 py-2 hover:bg-[#08323a]" onClick={() => { onClose(); navigate(`/assignments/${assignment.id}`); }}>Voir l'affectation</button>
        </div>
      </div>
    </div>
  );
}
