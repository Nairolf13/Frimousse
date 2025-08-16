import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import parentService from '../services/parent';

type Nanny = { id: string; name: string };
type Schedule = { id: string; date: string; startTime?: string; endTime?: string; name?: string; comment?: string | null; nannies?: Nanny[] };

export default function ParentChildSchedule() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    const load = async () => {
      try {
        const res = await parentService.getChildSchedule(childId);
        setSchedules(res || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [childId]);

  return (
    <div className="p-6">
      <button className="mb-4 btn" onClick={() => navigate(-1)}>Retour</button>
      <h2 className="text-xl font-semibold mb-4">Planning de l'enfant</h2>
      {loading ? (
        <div>Chargement...</div>
      ) : schedules.length === 0 ? (
        <div>Aucun planning trouvé.</div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => (
            <div key={s.id} className="p-3 border rounded">
              <div className="font-medium">{s.name || 'Séance'}</div>
              <div className="text-sm text-gray-600">{new Date(s.date).toLocaleDateString()} {s.startTime ? `• ${s.startTime} - ${s.endTime ?? ''}` : ''}</div>
              {s.nannies && s.nannies.length > 0 && (
                <div className="text-sm text-gray-700 mt-2">Nounous: {s.nannies.map(n => n.name).join(', ')}</div>
              )}
              {s.comment && <div className="text-sm text-gray-500 mt-2">{s.comment}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
