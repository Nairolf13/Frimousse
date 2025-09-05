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
  haute: 'bg-[#ffeaea] border-[#ffdddd]',
  moyenne: 'bg-[#fff7e6] border-[#fff1d6]',
  basse: 'bg-[#a9ddf2] border-[#cfeef9]',
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
      const dateOnly = dateStr.split(/[T ]/)[0];
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
    } catch {
      return `${dateStr}${timeStr ? ' à ' + timeStr : ''}`;
    }
  };

  useEffect(() => {
    if (!childId) return;
    const load = async () => {
      try {
        const res = await parentService.getChildReports(childId);
        if (Array.isArray(res)) {
          setReports(res.filter(r => r && typeof r === 'object' && 'id' in r));
        } else {
          setReports([]);
        }
      } catch {
        // noop
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
        setChildName(child && typeof child === 'object' && 'name' in child ? (child as { name?: string }).name || null : null);
      } catch {
        // noop
      }
    })();
  }, [childId]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center py-4 px-2 md:py-8 md:px-4 md:ml-64">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 w-full">
            <div className="self-start md:self-auto">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-[#a9ddf2] text-[#0b5566] hover:bg-[#cfeef9] cursor-pointer" onClick={() => navigate(-1)}>
                <span className="text-lg">←</span>
                <span className="font-medium">Retour</span>
              </button>
            </div>
            <div className="flex-1 text-center min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 tracking-tight truncate">Rapports de {childName ?? "l'enfant"}</h1>
              <div className="text-base sm:text-lg text-gray-500 font-medium mb-2 sm:mb-4">Consultez les rapports liés à cet enfant.</div>
            </div>
            <div className="w-24 md:w-32" />
          </div>

          <div className="flex flex-col gap-4 md:gap-6">
            {loading ? (
              <div>Chargement...</div>
            ) : reports.length === 0 ? (
              <div>Aucun rapport trouvé.</div>
            ) : (
              reports.map(report => (
                <div key={report.id} className={`rounded-xl shadow border-2 ${priorityStyles[report.priority] || ''} overflow-hidden w-full`} style={{ minWidth: 0 }}>
                  <div className={`flex flex-col md:flex-row items-start md:items-center justify-between px-4 py-2 md:px-6`} style={{ background: report.priority === 'haute' ? '#ffeaea' : report.priority === 'moyenne' ? '#fff7e6' : '#a9ddf2' }}>
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-0 min-w-0">
                      <span className={`px-2 py-1 rounded-lg font-bold text-xs truncate`} style={{ background: report.type === 'incident' ? '#ffeaea' : report.type === 'comportement' ? '#fff7e6' : '#a9ddf2', color: report.type === 'incident' ? '#7a2a2a' : report.type === 'comportement' ? '#856400' : '#08323a' }}>{typeLabel[report.type] || report.type}</span>
                      <span className={`px-2 py-1 rounded-lg font-bold text-xs`} style={{ background: report.priority === 'haute' ? '#dc2626' : report.priority === 'moyenne' ? '#f59e0b' : '#0b5566', color: '#ffffff' }}>{report.priority?.toUpperCase()}</span>
                      <span className="font-bold text-xs md:text-sm ml-1 truncate" style={{ color: '#08323a' }}>{report.nanny?.name ?? '—'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 md:mt-0 md:ml-4 whitespace-nowrap">{formatReportDate(report.date, report.time)}</div>
                  </div>
                  <div className="px-4 py-3 md:px-6 md:py-4">
                    <div className="font-bold text-gray-700 mb-1 text-sm md:text-base">Résumé</div>
                    <div className="text-gray-700 text-sm md:text-base mb-2 line-clamp-3">{report.summary}</div>
                    <div className="text-sm text-gray-500 mt-2 line-clamp-4">{report.details}</div>
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
