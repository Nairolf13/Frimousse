import { useEffect } from 'react';

type Activity = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  comment?: string | null;
  nannies?: { id: string; name: string }[];
};

export default function ActivityDetailModal({ activities, onClose }: { activities: Activity[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!activities || activities.length === 0) {
    return (
      <div className="fixed inset-0 z-60 bg-white/40 backdrop-blur-[2px] flex items-center justify-center" role="dialog" aria-modal="true">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative border border-gray-100">
          <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" aria-label="Fermer">✕</button>
          <h3 className="text-lg font-semibold mb-2">Aucune activité prévue</h3>
          <p className="text-sm text-gray-600">Il n'y a pas d'activité planifiée par la nounou pour ce jour.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-60 bg-white/40 backdrop-blur-[2px] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-2xl relative border border-gray-100">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" aria-label="Fermer">✕</button>
        <h3 className="text-xl font-semibold mb-4">Activités prévues</h3>
        <div className="space-y-4">
          {activities.map(act => (
            <div key={act.id} className="p-4 rounded-xl border bg-blue-50 border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg">{act.name}</div>
                <div className="text-sm text-gray-600">{act.date.split('T')[0]} • {act.startTime} - {act.endTime}</div>
              </div>
              {act.comment && <div className="text-sm text-gray-700 mb-2">{act.comment}</div>}
              {act.nannies && act.nannies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {act.nannies.map(n => (
                    <span key={n.id} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">{n.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
