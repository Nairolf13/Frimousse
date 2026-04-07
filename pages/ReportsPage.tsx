import { useState, useEffect } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { getCached, setCached, DEFAULT_TTL } from '../src/utils/apiCache';

const API_URL = import.meta.env.VITE_API_URL;

const childGroups = [
  { key: 'G1', label: 'children.group.G1' },
  { key: 'G2', label: 'children.group.G2' },
  { key: 'G3', label: 'children.group.G3' },
  { key: 'G4', label: 'children.group.G4' },
  { key: 'G5', label: 'children.group.G5' },
  { key: 'G6', label: 'children.group.G6' },
];
const nannyRoles = [
  { key: 'Nounou_Senior', label: 'nanny.role.senior' },
  { key: 'Responsable', label: 'nanny.role.manager' },
  { key: 'Stagiaire', label: 'nanny.role.trainee' },
  { key: 'Remplacante', label: 'nanny.role.substitute' },
  { key: 'Autre', label: 'nanny.role.other' },
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


const priorityLabel = {
  haute: 'reports.priority.haute',
  moyenne: 'reports.priority.moyenne',
  basse: 'reports.priority.basse',
};
const typeLabel = {
  incident: 'reports.type.incident',
  comportement: 'reports.type.comportement',
  soin: 'reports.type.soin',
};

export default function ReportsPage() {

  const { user } = useAuth();
  const { t, locale } = useI18n();

  useEffect(() => {
    let mounted = true;
    const cacheKeyChildren = `${API_URL}/children`;
    const cacheKeyNannies = `${API_URL}/nannies`;
    async function loadLists() {
      try {
        const cachedChildren = getCached<{id:string,name:string,age:number,group:string}[]>(cacheKeyChildren);
        const cachedNannies = getCached<{id:string,name:string,role:string}[]>(cacheKeyNannies);
        if (cachedChildren) setChildrenList(cachedChildren);
        if (cachedNannies) setNanniesList(cachedNannies);

        // Fetch in parallel but avoid overwriting already set state if unmounted
        const promises: Promise<Response>[] = [];
        if (!cachedChildren) promises.push(fetchWithRefresh(`${API_URL}/children`));
        else promises.push(Promise.resolve(new Response(JSON.stringify(cachedChildren))));
        if (!cachedNannies) promises.push(fetchWithRefresh(`${API_URL}/nannies`));
        else promises.push(Promise.resolve(new Response(JSON.stringify(cachedNannies))));

        const [childrenRes, nanniesRes] = await Promise.all(promises);
        if (!mounted) return;
        try {
          const childrenData = await childrenRes.json();
          setChildrenList(Array.isArray(childrenData) ? childrenData : []);
          setCached(cacheKeyChildren, Array.isArray(childrenData) ? childrenData : [], DEFAULT_TTL);
        } catch { setChildrenList([]); }
        try {
          const nanniesData = await nanniesRes.json();
          setNanniesList(Array.isArray(nanniesData) ? nanniesData : []);
          setCached(cacheKeyNannies, Array.isArray(nanniesData) ? nanniesData : [], DEFAULT_TTL);
        } catch { setNanniesList([]); }
      } catch {
        if (mounted) { setChildrenList([]); setNanniesList([]); }
      }
    }
    loadLists();
    return () => { mounted = false; };
  }, []);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/reports`)
      .then(res => res.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]));
  }, []);
  const getNannyRoleLabel = (role?: string) => {
    if (!role) return '';
    const roleItem = nannyRoles.find(r => r.key === role);
    if (roleItem) return t(roleItem.label);
    // if already a localized value or fallback
    return t(`nanny.role.${role.toLowerCase().replace(/ /g, '')}`, role);
  };

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
  const [editingReport, setEditingReport] = useState<Report | null>(null);
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

  // When a child is selected, prefer showing only the nannies assigned to that child
  type ChildWithNannies = { id: string; name: string; age: number; group: string; nannyIds?: string[] };
  const selectedChild = childrenList.find(c => c.id === form.childId) as ChildWithNannies | undefined;
  const visibleNannies = (selectedChild && Array.isArray(selectedChild.nannyIds) && selectedChild.nannyIds.length > 0)
    ? nanniesList.filter(n => selectedChild.nannyIds!.includes(n.id))
    : nanniesList;

  // If the currently selected nanny is no longer visible for the chosen child, clear it
  useEffect(() => {
    if (!form.nannyId) return;
    const ok = visibleNannies.some(n => n.id === form.nannyId);
    if (!ok) setForm(f => ({ ...f, nannyId: '', nannyName: '', nannyRole: '' }));
  }, [form.childId, form.nannyId, visibleNannies]);

  const [isShortLandscape, setIsShortLandscape] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-height: 600px) and (orientation: landscape)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange); else mql.addListener(onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => { try { if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange); else mql.removeListener(onChange); } catch { /* ignore */ } window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange); };
  }, []);

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/children`)
      .then(res => res.json())
      .then(data => setChildrenList(Array.isArray(data) ? data : []))
      .catch(() => setChildrenList([]));
    fetchWithRefresh(`${API_URL}/nannies`)
      .then(res => res.json())
      .then(data => setNanniesList(Array.isArray(data) ? data : []))
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
    await fetchWithRefresh(`${API_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    fetchWithRefresh(`${API_URL}/reports`)
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(() => setReports([]));
    setModalOpen(false);
  setEditingReport(null);
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

  const inputCls = 'border border-border-default rounded-xl px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 bg-card';

  return (
    <div className={`min-h-screen bg-surface p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('page.reports')}</h1>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">{t('page.reports.description')}</p>
            </div>
          </div>
          {!(user && user.role === 'parent') && (
            <button className="flex items-center gap-2 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:opacity-90 transition text-sm w-full sm:w-auto justify-center" onClick={() => {
              setEditingReport(null);
              setForm({ priority: 'moyenne', type: 'incident', status: 'en_attente', childId: '', childName: '', childAge: 3, childGroup: '', nannyId: '', nannyName: '', nannyRole: '', summary: '', details: '', date: new Date().toISOString().split('T')[0], time: '14:00', duration: '', childrenInvolved: '' });
              setModalOpen(true);
            }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t('reports.new')}
            </button>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-2 md:grid-cols-4">
          <div className="bg-card rounded-2xl shadow-md border border-border-default p-4">
            <div className="text-xs text-muted font-medium mb-1">{t('reports.card.total')}</div>
            <div className="text-2xl font-extrabold text-[#0b5566]">{total}</div>
          </div>
          <div className="bg-card rounded-2xl shadow-md border border-border-default p-4">
            <div className="text-xs text-muted font-medium mb-1">{t('reports.card.week')}</div>
            <div className="text-2xl font-extrabold text-primary">{week}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl shadow-md border border-border-default p-4 mb-5 flex flex-col sm:flex-row gap-3 flex-wrap">
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${filterLast30Days ? 'bg-[#0b5566]/10 border-[#0b5566]/30 text-[#0b5566]' : 'bg-input border-border-default text-secondary hover:bg-card-hover'}`}
            onClick={e => { e.preventDefault(); setFilterLast30Days(v => !v); }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {t('reports.filter.last30')}
          </button>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-border-default rounded-xl px-3 py-2 text-sm bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20">
            <option value="">{t('reports.filter.allTypes')}</option>
            <option value="incident">{t('reports.type.incident')}</option>
            <option value="comportement">{t('reports.type.comportement')}</option>
            <option value="soin">{t('reports.type.soin')}</option>
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder={t('reports.search.placeholder')} value={searchText} onChange={e => setSearchText(e.target.value)} className="border border-border-default rounded-xl pl-9 pr-3 py-2 text-sm bg-card w-full focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20" />
          </div>
        </div>

        {/* Report cards */}
        <div className="flex flex-col gap-4">
          {filteredReports.map(report => {
            const childInitials = report.child?.initials || (report.child?.name ? report.child.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '');
            const nannyInitials = report.nanny?.initials || (report.nanny?.name ? report.nanny.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '');
            const typeBg = report.type === 'incident' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : report.type === 'comportement' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' : 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300';
            const priorityBg = report.priority === 'haute' ? 'bg-red-50 dark:bg-red-9500 text-white' : report.priority === 'moyenne' ? 'bg-amber-400 text-white' : 'bg-[#0b5566] text-white';
            const borderColor = report.priority === 'haute' ? 'border-l-red-400' : report.priority === 'moyenne' ? 'border-l-amber-400' : 'border-l-[#0b5566]';
            return (
              <div key={report.id} className={`bg-card rounded-2xl shadow-md border border-border-default border-l-4 ${borderColor} overflow-hidden`}>
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg font-semibold text-xs ${typeBg}`}>{t(typeLabel[report.type as keyof typeof typeLabel] || report.type)}</span>
                    <span className={`px-2.5 py-1 rounded-lg font-semibold text-xs ${priorityBg}`}>{t(priorityLabel[report.priority as keyof typeof priorityLabel] || report.priority)}</span>
                  </div>
                  <button aria-label="Modifier" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-card-hover text-muted text-lg" onClick={() => {
                    setEditingReport(report);
                    setForm({
                      priority: (report.priority as 'haute' | 'moyenne' | 'basse') || 'moyenne',
                      type: (report.type as 'incident' | 'comportement' | 'soin') || 'incident',
                      status: (report.status as 'en_attente' | 'traite' | 'resolu') || 'en_attente',
                      childId: report.child?.id || '', childName: report.child?.name || '', childAge: report.child?.age || 3, childGroup: report.child?.group || '',
                      nannyId: report.nanny?.id || '', nannyName: report.nanny?.name || '', nannyRole: report.nanny?.role || '',
                      summary: report.summary || '', details: report.details || '',
                      date: report.date ? new Date(report.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                      time: report.time || '14:00', duration: report.duration || '',
                      childrenInvolved: report.childrenInvolved ? String(report.childrenInvolved) : '',
                    });
                    setModalOpen(true);
                  }}>⋮</button>
                </div>

                {/* Card body */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-sm flex-shrink-0">{childInitials}</div>
                    <div>
                      <div className="font-semibold text-primary text-sm leading-tight">{report.child?.name}</div>
                      <div className="text-xs text-muted">{report.child?.group}</div>
                    </div>
                    <div className="mx-2 text-muted">·</div>
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm flex-shrink-0">{nannyInitials}</div>
                    <div>
                      <div className="font-semibold text-primary text-sm leading-tight">{report.nanny?.name}</div>
<div className="text-xs text-muted">{getNannyRoleLabel(report.nanny?.role)}</div>
                    </div>
                  </div>

                  <div className="bg-input rounded-xl px-4 py-3 text-sm text-primary leading-relaxed mb-3">
                    {report.summary}
                  </div>

                  {report.type === 'comportement' && (
                    <div className="flex gap-4 text-xs text-secondary mb-3">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {t('reports.card.duration')} : {report.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {t('reports.card.childrenInvolved', { n: String(report.childrenInvolved ?? 0) })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{t('reports.by', 'Par')} <span className="font-semibold text-secondary">{report.nanny?.name}</span></span>
                    <span>
                      {(() => {
                        try {
                          const dateObj = new Date(report.date);
                          if (!isNaN(dateObj.getTime())) {
                            const dateStr = dateObj.toLocaleDateString(locale || 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                            const heure = report.time ? report.time.slice(0,5).replace(':', 'h') : '';
                            return `${dateStr}${heure ? ' ' + t('common.at') + ' ' + heure : ''}`;
                          }
                        } catch { /**/ }
                        return `${report.date}${report.time ? ' à ' + report.time : ''}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredReports.length === 0 && (
            <div className="text-center text-muted py-16 text-sm">Aucun rapport trouvé.</div>
          )}
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-[#0b5566] to-[#08323a] px-6 py-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">{editingReport ? t('reports.modal.title.edit') : t('reports.modal.title.new')}</h2>
                <button onClick={() => { setModalOpen(false); setEditingReport(null); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-card/20 text-white hover:bg-card/30 transition text-lg leading-none">×</button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <form className="space-y-3" onSubmit={async (e) => {
                  if (editingReport) {
                    e.preventDefault();
                    const payload = { priority: form.priority, type: form.type, status: form.status, childId: form.childId, nannyId: form.nannyId, summary: form.summary, details: form.details, date: form.date, time: form.time, duration: form.type === 'comportement' ? form.duration : undefined, childrenInvolved: form.type === 'comportement' ? Number(form.childrenInvolved) || undefined : undefined };
                    await fetchWithRefresh(`${API_URL}/reports/${editingReport.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    fetchWithRefresh(`${API_URL}/reports`).then(res => res.json()).then(data => setReports(data)).catch(() => setReports([]));
                    setModalOpen(false); setEditingReport(null);
                  } else {
                    await handleAddReport(e);
                  }
                }}>
                  <div className="flex gap-2">
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as 'haute' | 'moyenne' | 'basse' }))} className={inputCls}>
                      <option value="haute">{t('reports.priority.haute')}</option>
                      <option value="moyenne">{t('reports.priority.moyenne')}</option>
                      <option value="basse">{t('reports.priority.basse')}</option>
                    </select>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'incident' | 'comportement' | 'soin' }))} className={inputCls}>
                      <option value="incident">{t('reports.type.incident')}</option>
                      <option value="comportement">{t('reports.type.comportement')}</option>
                      <option value="soin">{t('reports.type.soin')}</option>
                    </select>
                  </div>
                  <select value={form.childId} onChange={e => { const selected = childrenList.find(c => c.id === e.target.value); setForm(f => ({ ...f, childId: selected ? selected.id : '', childName: selected ? selected.name : '', childAge: selected ? Number(selected.age) : 3, childGroup: selected ? selected.group : '' })); }} className={inputCls} required>
                    <option value="">{t('reports.field.child')}</option>
                    {childrenList.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input type="number" min={1} max={18} placeholder={t('label.age') || 'Âge'} value={form.childAge} onChange={e => setForm(f => ({ ...f, childAge: Number(e.target.value) }))} className={inputCls} required />
                    <select value={form.childGroup} onChange={e => setForm(f => ({ ...f, childGroup: e.target.value }))} className={inputCls} required>
                      <option value="">{t('reports.field.group')}</option>
                      {childGroups.map(g => <option key={g.key} value={g.key}>{t(g.label)}</option>)}
                    </select>
                  </div>
                  <select value={form.nannyId} onChange={e => { const selected = nanniesList.find(n => n.id === e.target.value); setForm(f => ({ ...f, nannyId: selected ? selected.id : '', nannyName: selected ? selected.name : '', nannyRole: selected ? selected.role : '' })); }} className={inputCls} required>
                    <option value="">{t('reports.field.nanny')}</option>
                    {visibleNannies.map(nanny => <option key={nanny.id} value={nanny.id}>{nanny.name}</option>)}
                  </select>
                  <select value={form.nannyRole} onChange={e => setForm(f => ({ ...f, nannyRole: e.target.value }))} className={inputCls} required>
                    <option value="">{t('reports.field.role')}</option>
                    {nannyRoles.map(role => <option key={role.key} value={role.key}>{t(role.label)}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} required />
                    <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className={inputCls} required />
                  </div>
                  <textarea placeholder={t('reports.field.summary')} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className={`${inputCls} min-h-[80px] resize-none`} required />
                  {form.type === 'comportement' && (
                    <div className="flex gap-2">
                      <input type="text" placeholder={t('reports.field.duration') || 'Durée'} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className={inputCls} />
                      <input type="number" min={1} placeholder={t('reports.field.childrenInvolved') || 'Nb enfants'} value={form.childrenInvolved} onChange={e => setForm(f => ({ ...f, childrenInvolved: e.target.value }))} className={inputCls} />
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition">{editingReport ? t('reports.save') : t('reports.create')}</button>
                    {editingReport && (
                      <button type="button" onClick={async () => {
                        if (!editingReport) return;
                        await fetchWithRefresh(`${API_URL}/reports/${editingReport.id}`, { method: 'DELETE' });
                        fetchWithRefresh(`${API_URL}/reports`).then(res => res.json()).then(data => setReports(data)).catch(() => setReports([]));
                        setModalOpen(false); setEditingReport(null);
                      }} className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 border border-red-200 dark:border-red-800 text-sm font-semibold hover:bg-red-100 dark:bg-red-900 transition">{t('reports.delete')}</button>
                    )}
                    <button type="button" onClick={() => { setModalOpen(false); setEditingReport(null); }} className="px-4 py-2.5 rounded-xl bg-card-hover text-primary text-sm font-medium hover:bg-border-default transition">{t('reports.cancel')}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
