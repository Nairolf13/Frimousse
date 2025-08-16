import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

type Child = { id: string; name: string } | null;

export default function ChildOptionsModal({ child, onClose }: { child: Child; onClose: () => void }) {
  const navigate = useNavigate();
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!child) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => primaryRef.current?.focus(), 0);
    return () => document.removeEventListener('keydown', onKey);
  }, [child, onClose]);

  if (!child) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-[2px] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="child-options-title">
      <div className="bg-blue-50 rounded-2xl shadow-lg p-6 w-full max-w-md relative border border-blue-100">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" aria-label="Fermer">✕</button>
        <h3 id="child-options-title" className="text-xl font-semibold mb-2 text-gray-900">{child.name}</h3>
        <p className="text-sm text-gray-600 mb-4">Que voulez-vous faire pour cet enfant ?</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            ref={primaryRef}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 text-gray-800"
            onClick={() => { onClose(); navigate(`/parent/child/${child.id}/schedule`); }}
          >
            Voir le planning
          </button>
          <button
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl px-4 py-2 hover:from-blue-700 hover:to-blue-600"
            onClick={() => { onClose(); navigate(`/parent/child/${child.id}/reports`); }}
          >
            Voir les rapports
          </button>
        </div>

        
      </div>
    </div>
  );
}
