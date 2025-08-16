import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import parentService from '../services/parent';

type Nanny = { id: string; name: string };
type Report = { id: string; priority: string; type: string; status: string; summary: string; details: string; date: string; nanny?: Nanny | null };

export default function ParentChildReports() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    const load = async () => {
      try {
        const res = await parentService.getChildReports(childId);
        setReports(res || []);
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
      <h2 className="text-xl font-semibold mb-4">Rapports de l'enfant</h2>
      {loading ? (
        <div>Chargement...</div>
      ) : reports.length === 0 ? (
        <div>Aucun rapport trouvé.</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="p-3 border rounded">
              <div className="font-medium">{r.type} — {r.priority}</div>
              <div className="text-sm text-gray-600">{new Date(r.date).toLocaleDateString()}</div>
              {r.nanny && <div className="text-sm text-gray-700">Par: {r.nanny.name}</div>}
              <div className="mt-2 text-sm text-gray-800">{r.summary}</div>
              <div className="text-sm text-gray-500 mt-2">{r.details}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
