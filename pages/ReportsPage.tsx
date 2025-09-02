import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL;

const childGroups = [
  { key: 'G1', label: 'Groupe 1 (0-1 ans)' },
  { key: 'G2', label: 'Groupe 2 (1-2 ans)' },
  { key: 'G3', label: 'Groupe 3 (2-3 ans)' },
  { key: 'G4', label: 'Groupe 4 (3-4 ans)' },
  { key: 'G5', label: 'Groupe 5 (4-5 ans)' },
  { key: 'G6', label: 'Groupe 6 (5-6 ans)' },
];
const nannyRoles = [
  { key: 'Nounou_Senior', label: 'Nounou Senior' },
  { key: 'Responsable', label: 'Responsable' },
  { key: 'Stagiaire', label: 'Stagiaire' },
  { key: 'Remplacante', label: 'Remplaçante' },
  { key: 'Autre', label: 'Autre' },
];

interface Report {
  id: string;
  priority: string;
  type: string;
  status: string;
  child: {
    id: string;
    name: string;
    age: number;
    group: string;
    initials?: string;
  };
  nanny: {
    id: string;
    name: string;
    role: string;
    initials?: string;
  };
  summary: string;
  details: string;
  date: string;
  time: string;
  duration?: string;
  childrenInvolved?: number;
}


const priorityStyles = {
  haute: 'bg-[#ffeaea] border-[#ffdddd]',
  moyenne: 'bg-[#fff7e6] border-[#fff1d6]',
  basse: 'bg-[#a9ddf2] border-[#cfeef9]',
};
const priorityLabel = {
  haute: 'PRIORITÉ HAUTE',
  moyenne: 'MOYENNE',
  basse: 'BASSE',
};
const typeLabel = {
  incident: 'INCIDENT',
  comportement: 'COMPORTEMENT',
  soin: 'SOINS',
};

export default function ReportsPage() {

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/api/children`)
      .then(res => res.json())
      .then(data => setChildrenList(data))
      .catch(() => setChildrenList([]));
    fetchWithRefresh(`${API_URL}/api/nannies`)
      .then(res => res.json())
      .then(data => setNanniesList(data))
      .catch(() => setNanniesList([]));
  }, []);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/api/reports`)
      .then(res => res.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]));
  }, []);
  const total = reports.length;
  const week = reports.filter(r => {
    if (!r.date) return false;
    const reportDate = new Date(r.date);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0,0,0,0);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return reportDate >= startOfWeek && reportDate <= endOfWeek;
  }).length;

  const [filterLast30Days, setFilterLast30Days] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [searchText, setSearchText] = useState('');

  const filteredReports = reports.filter(r => {
    let ok = true;
    if (filterLast30Days) {
      if (!r.date) return false;
      const reportDate = new Date(r.date);
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      ok = ok && reportDate >= thirtyDaysAgo && reportDate <= now;
    }
    if (filterType) {
      ok = ok && r.type === filterType;
    }
    if (searchText.trim()) {
      const txt = searchText.trim().toLowerCase();
      ok = ok && !!(
        (r.child?.name && r.child.name.toLowerCase().includes(txt)) ||
        (r.summary && r.summary.toLowerCase().includes(txt)) ||
        (r.details && r.details.toLowerCase().includes(txt))
      );
    }
    return ok;
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    priority: 'moyenne' as 'haute' | 'moyenne' | 'basse',
    type: 'incident' as 'incident' | 'comportement' | 'soin',
    status: 'en_attente' as 'en_attente' | 'traite' | 'resolu',
    childId: '',
    childName: '',
    childAge: 3,
    childGroup: '',
    nannyId: '',
    nannyName: '',
    nannyRole: '',
    summary: '',
    details: '',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    duration: '',
    childrenInvolved: '',
  });

  const [childrenList, setChildrenList] = useState<{id: string, name: string, age: number, group: string}[]>([]);
  const [nanniesList, setNanniesList] = useState<{id: string, name: string, role: string}[]>([]);

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/api/children`)
      .then(res => res.json())
      .then(data => setChildrenList(data))
      .catch(() => setChildrenList([]));
    fetchWithRefresh(`${API_URL}/api/nannies`)
      .then(res => res.json())
      .then(data => setNanniesList(data))
      .catch(() => setNanniesList([]));
  }, []);

  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      priority: form.priority,
      type: form.type,
      status: form.status,
      childId: form.childId,
      nannyId: form.nannyId,
      summary: form.summary,
      details: form.details,
      date: form.date,
      time: form.time,
      duration: form.type === 'comportement' ? form.duration : undefined,
      childrenInvolved: form.type === 'comportement' ? Number(form.childrenInvolved) || undefined : undefined,
    };
    await fetchWithRefresh(`${API_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    fetchWithRefresh(`${API_URL}/api/reports`)
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(() => setReports([]));
    setModalOpen(false);
    setForm({
      priority: 'moyenne',
      type: 'incident',
      status: 'en_attente',
      childId: '',
      childName: '',
      childAge: 3,
      childGroup: '',
      nannyId: '',
      nannyName: '',
      nannyRole: '',
      summary: '',
      details: '',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      duration: '',
      childrenInvolved: '',
    });
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center py-4 px-2 md:py-8 md:px-2 md:ml-64">
        <div className="w-full max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight" style={{ color: '#0b5566' }}>Rapports d'Incidents</h1>
          <div className="text-base md:text-lg font-medium mb-4 md:mb-6" style={{ color: '#08323a' }}>Consultez tous les signalements des nounous concernant les incidents, comportements et observations quotidiennes des enfants.</div>
          <div className="flex flex-col md:flex-row flex-wrap gap-2 mb-4 md:mb-6 items-stretch md:items-center">
            <div className="flex gap-2 flex-wrap">
              <button
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base font-medium ${filterLast30Days ? 'bg-[#a9ddf2] border-[#fcdcdf] text-[#0b5566]' : 'bg-white border-gray-100 text-gray-500'}`}
                onClick={e => {e.preventDefault(); setFilterLast30Days(v => !v);}}
              >
                <span>📅</span> 30 derniers jours
              </button>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 md:px-4 py-2 rounded-lg border border-gray-100 bg-white text-sm md:text-base font-medium"
              >
                <option value="">Tous les types</option>
                <option value="incident">Incident</option>
                <option value="comportement">Comportement</option>
                <option value="soin">Soin</option>
              </select>
              <input
                type="text"
                placeholder="Rechercher par nom d'enfant"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="px-3 md:px-4 py-2 rounded-lg border border-gray-100 bg-white text-sm md:text-base w-full md:w-64"
              />
            </div>
            <button className="bg-[#0b5566] text-white px-4 md:px-5 py-2 rounded-lg font-bold shadow hover:bg-[#08323a] transition text-sm md:text-base mt-2 md:mt-0 md:ml-2 w-full md:w-auto" onClick={() => setModalOpen(true)}>Nouveau Rapport</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 md:p-4 flex flex-col items-center">
              <div className="text-2xl md:text-3xl font-extrabold" style={{ color: '#0b5566' }}>{total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Rapports</div>
            </div>
            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 md:p-4 flex flex-col items-center">
              <div className="text-xl md:text-2xl font-extrabold" style={{ color: '#08323a' }}>{week}</div>
              <div className="text-xs text-gray-500 mt-1">Cette Semaine</div>
            </div>
          </div>
        <div className="flex flex-col gap-4 md:gap-6">
          {filteredReports.map(report => {
            const childInitials = report.child?.initials || (report.child?.name ? report.child.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '');
            const nannyInitials = report.nanny?.initials || (report.nanny?.name ? report.nanny.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '');
              return (
              <div key={report.id} className={`rounded-xl shadow border-2 ${priorityStyles[report.priority as keyof typeof priorityStyles] || ''} p-0 overflow-hidden`} style={{ minWidth: 0 }}>
                <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 md:px-6 py-2`}> 
                  <div className="flex items-center gap-2 md:gap-3 mb-2 sm:mb-0">
                    <span className={`px-2 md:px-3 py-1 rounded-lg font-bold text-xs`} style={{ background: report.type === 'incident' ? '#ffeaea' : report.type === 'comportement' ? '#fff7e6' : '#a9ddf2', color: report.type === 'incident' ? '#7a2a2a' : report.type === 'comportement' ? '#856400' : '#08323a' }}>{typeLabel[report.type as keyof typeof typeLabel] || report.type}</span>
                    <span className={`px-2 md:px-3 py-1 rounded-lg font-bold text-xs`} style={{ background: report.priority === 'haute' ? '#dc2626' : report.priority === 'moyenne' ? '#f59e0b' : '#0b5566', color: '#ffffff' }}>{priorityLabel[report.priority as keyof typeof priorityLabel] || report.priority}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold border" style={{ background: '#a9ddf2', color: '#08323a', borderColor: '#cfeef9' }}>{childInitials}</span>
                    <span className="font-bold text-xs md:text-sm ml-1" style={{ color: '#08323a' }}>{report.child?.name}</span>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold border" style={{ background: '#fff7e6', color: '#856400', borderColor: '#fff1d6' }}>{nannyInitials}</span>
                    <span className="font-bold text-xs md:text-sm ml-1" style={{ color: '#856400' }}>{report.nanny?.name}</span>
                  </div>
                </div>
                <div className="px-4 md:px-6 pb-4">
                  <div className="font-bold text-gray-700 mb-1 text-sm md:text-base">{report.type === 'incident' ? 'Résumé du Rapport' : report.type === 'comportement' ? 'Observation Comportementale' : 'Observation de Soin'}</div>
                  <div className="text-gray-700 text-sm md:text-base mb-2">{report.summary}</div>
                  {report.type === 'comportement' && (
                    <div className="flex gap-4 md:gap-6 items-center text-xs text-gray-500 mt-2 flex-wrap">
                      <span className="flex items-center gap-1"><span>⏱️</span> Durée : {report.duration}</span>
                      <span className="flex items-center gap-1"><span>👧</span> {report.childrenInvolved} enfants impliqués</span>
                    </div>
                  )}
                  <div className="flex flex-col items-end mt-4">
                    <span className="text-xs italic" style={{ color: '#08323a' }}>
                      Rapport établi par <span className="font-bold" style={{ color: '#856400' }}>{report.nanny?.name}</span> concernant <span className="font-bold" style={{ color: '#08323a' }}>{report.child?.name}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {(() => {
                        let dateObj;
                        try {
                          dateObj = new Date(report.date);
                        } catch {
                          dateObj = null;
                        }
                        if (dateObj && !isNaN(dateObj.getTime())) {
                          const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
                          const dateStr = dateObj.toLocaleDateString('fr-FR', options);
                          const heure = report.time ? report.time.slice(0,5).replace(':', 'h') : '';
                          return `${dateStr}${heure ? ' à ' + heure : ''}`;
                        }
                        return `${report.date}${report.time ? ' à ' + report.time : ''}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {modalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative flex flex-col gap-6 animate-fade-in" style={{ border: '4px solid #fcdcdf' }}>
              <button onClick={() => setModalOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
              <h2 className="text-2xl font-extrabold mb-2 text-center" style={{ color: '#0b5566' }}>Nouveau Rapport</h2>
              <form className="space-y-3" onSubmit={handleAddReport}>
                <div className="flex gap-2">
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as 'haute' | 'moyenne' | 'basse' }))} className="border rounded px-3 py-2 w-1/2">
                    <option value="haute">Priorité Haute</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="basse">Basse</option>
                  </select>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'incident' | 'comportement' | 'soin' }))} className="border rounded px-3 py-2 w-1/2">
                    <option value="incident">Incident</option>
                    <option value="comportement">Comportement</option>
                    <option value="soin">Soin</option>
                  </select>
                </div>
                <select value={form.childId} onChange={e => {
                  const selected = childrenList.find(c => c.id === e.target.value);
                  setForm(f => ({
                    ...f,
                    childId: selected ? selected.id : '',
                    childName: selected ? selected.name : '',
                    childAge: selected ? Number(selected.age) : 3,
                    childGroup: selected ? selected.group : '',
                  }));
                }} className="border rounded px-3 py-2 w-full" required>
                  <option value="">Sélectionner l'enfant</option>
                  {childrenList.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input type="number" min={1} max={18} placeholder="Âge" value={form.childAge} onChange={e => setForm(f => ({ ...f, childAge: Number(e.target.value) }))} className="border rounded px-3 py-2 w-1/2" required />
                  <select value={form.childGroup} onChange={e => setForm(f => ({ ...f, childGroup: e.target.value }))} className="border rounded px-3 py-2 w-1/2" required>
                    <option value="">Sélectionner le groupe</option>
                    {childGroups.map(g => (
                      <option key={g.key} value={g.key}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <select value={form.nannyId} onChange={e => {
                  const selected = nanniesList.find(n => n.id === e.target.value);
                  setForm(f => ({
                    ...f,
                    nannyId: selected ? selected.id : '',
                    nannyName: selected ? selected.name : '',
                    nannyRole: selected ? selected.role : '',
                  }));
                }} className="border rounded px-3 py-2 w-full" required>
                  <option value="">Sélectionner la nounou</option>
                  {nanniesList.map(nanny => (
                    <option key={nanny.id} value={nanny.id}>{nanny.name}</option>
                  ))}
                </select>
                <select value={form.nannyRole} onChange={e => setForm(f => ({ ...f, nannyRole: e.target.value }))} className="border rounded px-3 py-2 w-full" required>
                  <option value="">Sélectionner le rôle</option>
                  {nannyRoles.map(role => (
                    <option key={role.key} value={role.key}>{role.label}</option>
                  ))}
                </select>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="border rounded px-3 py-2 w-full" required />
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="border rounded px-3 py-2 w-full" required />
                <textarea placeholder="Résumé du rapport" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className="border rounded px-3 py-2 w-full" required />
                {form.type === 'comportement' && (
                  <div className="flex gap-2">
                    <input type="text" placeholder="Durée" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="border rounded px-3 py-2 w-1/2" />
                    <input type="number" min={1} placeholder="Nb enfants impliqués" value={form.childrenInvolved} onChange={e => setForm(f => ({ ...f, childrenInvolved: e.target.value }))} className="border rounded px-3 py-2 w-1/2" />
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="bg-[#0b5566] text-white px-4 py-2 rounded hover:bg-[#08323a] transition">Créer</button>
                  <button type="button" onClick={() => setModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded">Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
