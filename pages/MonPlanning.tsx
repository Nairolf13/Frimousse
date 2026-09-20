import { useEffect, useState } from 'react';
import NannyCalendar from '../components/NannyCalendar';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import PageLoader from '../components/PageLoader';
import { useI18n } from '../src/lib/useI18n';

const API_URL = import.meta.env.VITE_API_URL;

type TodayAssignment = { child: { name: string } };
type DaySummaryPopup = { day: 'today' | 'tomorrow'; children: string[] } | null;

export default function MonPlanning() {
  const { t } = useI18n();
  const [nannyId, setNannyId] = useState<string | null>(null);
  const [nannyFirstName, setNannyFirstName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nannies, setNannies] = useState<Array<{ id: string; name: string }>>([]);
  const [dayPopup, setDayPopup] = useState<DaySummaryPopup>(null);
  const [exportMonth, setExportMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [exporting, setExporting] = useState(false);
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

  // Fetch a nanny's assignments for a single calendar day and show a
  // once-per-day popup naming who they'll be looking after, unless it was
  // already shown for that (nannyId, day) pair.
  async function checkDayPopup(nannyId: string, dayOffset: 0 | 1) {
    const target = new Date();
    target.setDate(target.getDate() + dayOffset);
    const start = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const end = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59);
    const dayKey = start.toISOString().split('T')[0];
    const storageKey = `planning-day-popup-${nannyId}-${dayKey}`;
    let alreadyShown = false;
    try { alreadyShown = window.localStorage.getItem(storageKey) === '1'; } catch { /* ignore */ }
    if (alreadyShown) return;
    try {
      const params = new URLSearchParams({ nannyId, start: start.toISOString(), end: end.toISOString() });
      const r = await fetchWithRefresh(`api/assignments?${params.toString()}`);
      if (!r.ok) return;
      const data = await r.json();
      const names: string[] = Array.isArray(data) ? (data as TodayAssignment[]).map(a => a.child.name) : [];
      setDayPopup({ day: dayOffset === 0 ? 'today' : 'tomorrow', children: names });
      try { window.localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
    } catch (e) {
      console.error('Failed to load assignments for day-popup summary', e);
    }
  }

  useEffect(() => {
    fetchWithRefresh('api/me')
      .then(res => res.json())
      .then(async (user) => {
        if (user.role === 'nanny' && user.nannyId) {
          setNannyId(user.nannyId);
          // Names are stored "Lastname Firstname" — use the last word so
          // the popup reads naturally with the first name.
          const parts = String(user.name || '').trim().split(/\s+/).filter(Boolean);
          setNannyFirstName(parts.length > 0 ? parts[parts.length - 1] : '');
          await checkDayPopup(user.nannyId, 0);
          return;
        }

        if (user.role === 'admin' || user.role === 'super-admin') {
          setIsAdmin(true);
          try {
            const r = await fetchWithRefresh('api/nannies');
            if (r.ok) {
              const list = await r.json();
              type NannyFromApi = { id?: string; name?: string };
              const simplified = Array.isArray(list)
                ? (list as NannyFromApi[]).map((n: NannyFromApi) => ({ id: String(n.id ?? ''), name: String(n.name ?? '') }))
                : [];
              setNannies(simplified);
              if (simplified.length > 0) { setNannyId(simplified[0].id); }
            }
          } catch (e) {
            console.error('Failed to load nannies for admin', e);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // After 19:30, also show a "here's who you'll have tomorrow" popup (once
  // per day) — checked on mount and again every minute so it can still fire
  // for a nanny who keeps the tab open across the 19:30 mark.
  useEffect(() => {
    if (!nannyId) return;
    const check = () => { if (new Date().getHours() >= 19 && new Date().getMinutes() >= 30) checkDayPopup(nannyId, 1); };
    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
  }, [nannyId]);

  if (loading) return <PageLoader title="Mon planning" icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>} />;
  if (!nannyId) {
    if (isAdmin) return <div className="p-8 text-center text-red-500">Aucune nounou trouvée pour votre structure.</div>;
    return <div className="p-8 text-center text-red-500">Accès réservé aux nounous.</div>;
  }

  // Keep the "who you're looking after" line to a single readable sentence —
  // a nanny rarely has more than a handful of kids in one day, but cap it
  // anyway so it can never overflow the popup.
  const MAX_NAMED = 3;
  function buildDaySummary(names: string[], day: 'today' | 'tomorrow'): string {
    const noneKey = day === 'today' ? 'planning.summary.none' : 'planning.summary.none_tomorrow';
    const entryKey = day === 'today' ? 'planning.summary.entry' : 'planning.summary.entry_tomorrow';
    const overflowKey = day === 'today' ? 'planning.summary.entry_overflow' : 'planning.summary.entry_overflow_tomorrow';
    if (names.length === 0) return t(noneKey, day === 'today' ? "Aucune garde prévue aujourd'hui." : "Aucune garde prévue demain.");
    if (names.length <= MAX_NAMED) {
      return t(entryKey, day === 'today' ? "Aujourd'hui, vous vous occupez de {names}" : "Demain, vous vous occuperez de {names}").replace('{names}', names.join(', '));
    }
    const shown = names.slice(0, MAX_NAMED).join(', ');
    const remaining = names.length - MAX_NAMED;
    return t(overflowKey, day === 'today' ? "Aujourd'hui, vous vous occupez de {names} et {count} autre(s)" : "Demain, vous vous occuperez de {names} et {count} autre(s)").replace('{names}', shown).replace('{count}', String(remaining));
  }
  const greeting = new Date().getHours() < 18 ? t('dashboard.greeting.day', 'Bonjour') : t('dashboard.greeting.evening', 'Bonsoir');

  return (
    <div className={`min-h-screen bg-surface p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      {dayPopup && !isAdmin && (
        <div role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setDayPopup(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-scale-in">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h2 className="text-lg font-bold text-primary mb-1">{nannyFirstName ? `${greeting} ${nannyFirstName}` : greeting}</h2>
            <p className="text-sm text-secondary">{buildDaySummary(dayPopup.children, dayPopup.day)}</p>
            <button onClick={() => setDayPopup(null)} className="mt-5 w-full bg-brand-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-600 transition-colors">
              {t('common.ok', 'OK')}
            </button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 w-full">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight text-brand-500">Mon planning</h1>
              <div className="text-sm md:text-base font-medium text-brand-700/60">Gérez vos affectations</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
              {isAdmin && nannies.length > 0 && (
                <>
                  <label className="text-sm text-secondary font-medium">Voir le planning de :</label>
                  <select value={nannyId || ''} onChange={e => { setNannyId(e.target.value); }} className="border border-border-default rounded-xl px-3 py-2.5 text-primary bg-card shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300">
                    {nannies.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </>
              )}
              <input
                type="month"
                value={exportMonth}
                onChange={e => setExportMonth(e.target.value)}
                className="border border-border-default rounded-xl px-3 py-2 text-primary bg-card shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <button
                disabled={exporting || !nannyId}
                onClick={async () => {
                  if (!nannyId || exporting) return;
                  setExporting(true);
                  try {
                    const res = await fetch(`${API_URL}/nannies/${nannyId}/export-planning?month=${exportMonth}`, { credentials: 'include' });
                    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'Erreur export PDF'); return; }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `planning_${exportMonth}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch { alert('Erreur lors de la génération du PDF'); }
                  finally { setExporting(false); }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b5566] text-white text-sm font-semibold shadow hover:opacity-90 transition disabled:opacity-50"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3"/></svg>
                {exporting ? 'Export...' : 'Exporter PDF'}
              </button>
            </div>
          </div>
          <div className="bg-card rounded-2xl shadow-sm p-4 md:p-6 border border-border-default w-full" data-tour="planning-calendar">
            <NannyCalendar nannyId={nannyId} />
          </div>
      </div>
    </div>
  );
}
