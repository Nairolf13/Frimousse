import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import parentService from '../services/parent';

type Nanny = { id: string; name: string };
type Report = { id: string; priority: string; type: string; status: string; summary: string; details: string; date: string; time?: string; nanny?: Nanny | null };

const typeLabel: Record<string, string> = {
  incident: 'INCIDENT',
  comportement: 'COMPORTEMENT',
  soin: 'SOINS'
};

const priorityStyles: Record<string, string> = {
  haute: 'bg-red-50 border-red-100',
  moyenne: 'bg-yellow-50 border-yellow-100',
  basse: 'bg-green-50 border-green-100',
};

export default function ParentChildReports() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState<string | null>(null);

  const formatReportDate = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return '';
    try {
      let dateOnly = dateStr.split(/[T ]/)[0];
      let iso = dateOnly;

      let normalizedTime: string | null = null;
      if (timeStr) {
        const t = timeStr.includes('h') ? timeStr.replace(/h/, ':').replace(/[^0-9:]/g, '') : timeStr;
        const parts = t.split(':');
        const hh = (parts[0] || '00').padStart(2, '0');
        const mm = (parts[1] || '00').padStart(2, '0');
        normalizedTime = `${hh}:${mm}:00`;
      } else {
        const rest = dateStr.includes('T') ? dateStr.split('T')[1] : (dateStr.includes(' ') ? dateStr.split(' ')[1] : undefined);
        if (rest) {
          const parts = rest.split(':');
          const hh = (parts[0] || '00').padStart(2, '0');
          const mm = (parts[1] || '00').padStart(2, '0');
          normalizedTime = `${hh}:${mm}:00`;
        }
      }

      iso = normalizedTime ? `${dateOnly}T${normalizedTime}` : `${dateOnly}T00:00:00`;

      const d = new Date(iso);
      if (isNaN(d.getTime())) return `${dateStr}${timeStr ? ' à ' + timeStr : ''}`;

      const datePart = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      if (!normalizedTime) return datePart;

      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${datePart} à ${hours}h${minutes}`;
    } catch (err) {
      return `${dateStr}${timeStr ? ' à ' + timeStr : ''}`;
    }
  };

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

  useEffect(() => {
    if (!childId) return;
    (async () => {
      try {
        const child = await parentService.getChild(childId);
        setChildName(child?.name || null);
      } catch (err) {
        console.error('Failed to load child name', err);
      }
    })();
  }, [childId]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center py-4 px-2 md:py-8 md:px-2 md:ml-64">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button className="mb-4 btn cursor-pointer flex items-center gap-2" onClick={() => navigate(-1)}>
                <span className="text-lg">←</span>
                <span>Retour</span>
              </button>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">Rapports de {childName ?? "l'enfant"}</h1>
              <div className="text-base md:text-lg text-gray-500 font-medium mb-4 md:mb-6">Consultez les rapports liés à cet enfant.</div>
            </div>
            <div style={{ width: 120 }} />
          </div>

          <div className="flex flex-col gap-4 md:gap-6">
            {loading ? (
              <div>Chargement...</div>
            ) : reports.length === 0 ? (
              <div>Aucun rapport trouvé.</div>
            ) : (
              reports.map(report => (
                <div key={report.id} className={`rounded-xl shadow border-2 ${priorityStyles[report.priority] || ''} p-0 overflow-hidden`} style={{ minWidth: 0 }}>
                  <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 md:px-6 py-2 ${report.priority === 'haute' ? 'bg-red-50' : report.priority === 'moyenne' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                    <div className="flex items-center gap-2 md:gap-3 mb-2 sm:mb-0">
                      <span className={`px-2 md:px-3 py-1 rounded-lg font-bold text-xs ${report.type === 'incident' ? 'bg-red-100 text-red-700' : report.type === 'comportement' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{typeLabel[report.type] || report.type}</span>
                      <span className={`px-2 md:px-3 py-1 rounded-lg font-bold text-xs ${report.priority === 'haute' ? 'bg-red-500 text-white' : report.priority === 'moyenne' ? 'bg-yellow-400 text-white' : 'bg-green-400 text-white'}`}>{report.priority?.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-700 text-xs md:text-sm ml-1">{report.nanny?.name ?? '—'}</span>
                    </div>
                  </div>
                  <div className="px-4 md:px-6 pb-4">
                    <div className="font-bold text-gray-700 mb-1 text-sm md:text-base">Résumé</div>
                    <div className="text-gray-700 text-sm md:text-base mb-2">{report.summary}</div>
                    <div className="text-sm text-gray-500 mt-2">{report.details}</div>
                    <div className="flex flex-col items-end mt-4">
                      <span className="text-xs text-gray-500">{formatReportDate(report.date, report.time)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
