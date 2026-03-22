import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL;

interface Activity {
  id: string;
  date: string; 
  startTime: string; 
  endTime: string; 
  name: string;
  comment?: string;
  nannyIds?: string[];
  nannies?: Nanny[];
}

interface Nanny {
  id: string;
  name: string;
}

interface Center {
  id: string;
  name: string;
}

// weekday labels are computed dynamically using the current locale

function getWeekDates(date: Date) {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}


export default function WeeklyActivityCalendar() {
  const cardColors = [
    { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
    { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-700' },
    { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700' },
    { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700' },
    { bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-700' },
    { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700' },
  ];
  function getActivityVisuals(name: string, idx: number) {
    let emoji = '✨';
    if (/art|dessin|peinture|atelier/i.test(name)) emoji = '🎨';
    else if (/parc|jardin|potager|plante/i.test(name)) emoji = '🌱';
    else if (/zoo|animal|ferme/i.test(name)) emoji = '🦁';
    else if (/repas|déjeuner|dîner|goûter|restauration/i.test(name)) emoji = '🍽️';
    else if (/lecture|histoire|conte|livre/i.test(name)) emoji = '📖';
    else if (/musique|danse|chant|eveil|chanson/i.test(name)) emoji = '🎵';
    else if (/extérieur|jeux|sport|parc|cour/i.test(name)) emoji = '🏃';
    else if (/libre|autonome/i.test(name)) emoji = '🎮';
    const color = cardColors[idx % cardColors.length];
    return { emoji, ...color };
  }
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [adding, setAdding] = useState(false);
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [centerFilter, setCenterFilter] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '07:00',
    endTime: '08:00',
    name: '',
    comment: '',
    nannyIds: [] as string[],
    showNannyDropdown: false,
  });
  const [nannies, setNannies] = useState<Nanny[]>([]);

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const location = useLocation();
  useEffect(() => {
    setAdding(false);
    setModalOpen(false);
    setSelectedActivity(null);
  }, [location.pathname]);

  useEffect(() => {
    if (adding || modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [adding, modalOpen]);

  const { user } = useAuth();

  useEffect(() => {
    const url = `${API_URL}/nannies${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : ''}`;
    fetchWithRefresh(url, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setNannies(data)).catch(() => setNannies([]));
  }, [centerFilter]);

  // If super-admin, load centers for filter
  useEffect(() => {
    let mounted = true;
    const u = (user as { role?: string | null } | null);
    if (!u || u.role !== 'super-admin') return;
    (async () => {
      try {
        const res = await fetchWithRefresh(`${API_URL}/centers`, { credentials: 'include' });
        if (!res || !res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        const centersData = json.data || json.centers || json;
        if (Array.isArray(centersData)) setCenters(centersData.map((c: Center) => ({ id: c.id, name: c.name })));
      } catch (e) {
        console.error('Failed to load centers for filter', e);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const dateParam = currentDate.toISOString().split('T')[0];
    const url = `${API_URL}/schedules${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}&date=${encodeURIComponent(dateParam)}` : `?date=${encodeURIComponent(dateParam)}`}`;
    fetchWithRefresh(url, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setActivities(data)).catch(() => setActivities([]));
  }, [currentDate, centerFilter]);


  const handleAddActivity = async () => {
    if (!form.name || !form.startTime || !form.endTime || form.nannyIds.length === 0 || !form.date) return;

    // Suppression de la vérification de date passée - permettre l'ajout sur toutes les dates
    // const selectedDate = new Date(form.date);
    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
    // if (selectedDate < today) {
    //   alert('Vous ne pouvez pas ajouter ou modifier une activité sur une date passée.');
    //   return;
    // }

    let res;
    if (selectedActivity) {
      res = await fetchWithRefresh(`${API_URL}/schedules/${selectedActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          name: form.name,
          nannyIds: form.nannyIds,
          comment: form.comment,
        })
      });
    } else {
      res = await fetchWithRefresh(`${API_URL}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          name: form.name,
          nannyIds: form.nannyIds,
          comment: form.comment,
        })
      });
    }
    if (!res.ok) {
      const text = await res.text();
      if (import.meta.env.DEV) {
        console.error('Erreur API:', res.status, text);
      } else {
        console.error('Erreur API:', res.status, String(text));
      }
      alert('Erreur lors de la sauvegarde de l\'activité: ' + text);
      return;
    }
    const dateParam = currentDate.toISOString().split('T')[0];
    const schedulesUrl = `${API_URL}/schedules${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}&date=${encodeURIComponent(dateParam)}` : `?date=${encodeURIComponent(dateParam)}`}`;
    await fetchWithRefresh(schedulesUrl, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setActivities(data));
    setForm({ date: new Date().toISOString().split('T')[0], startTime: '07:00', endTime: '08:00', name: '', comment: '', nannyIds: [], showNannyDropdown: false });
    setAdding(false);
    setSelectedActivity(null);
  };

  function handleActivityCardClick(activity: Activity) {
    setSelectedActivity(activity);
    setModalOpen(true);
  }

  async function handleDeleteActivity(id: string) {
    setModalOpen(false);
    setSelectedActivity(null);
    await fetchWithRefresh(`${API_URL}/schedules/${id}`, { method: 'DELETE', credentials: 'include' });
    const dateParam = currentDate.toISOString().split('T')[0];
    const schedulesUrl = `${API_URL}/schedules${centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}&date=${encodeURIComponent(dateParam)}` : `?date=${encodeURIComponent(dateParam)}`}`;
    await fetchWithRefresh(schedulesUrl, { credentials: 'include' })
      .then(res => res.json())
      .then((data) => setActivities(data));
  }

  function handleEditActivity(activity: Activity) {
    setModalOpen(false);
    setAdding(true);
    setForm({
      date: activity.date ? activity.date.split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: activity.startTime,
      endTime: activity.endTime,
      name: activity.name,
      comment: activity.comment || '',
      nannyIds: activity.nannies && activity.nannies.length > 0
        ? activity.nannies.map(n => n.id)
        : (activity.nannyIds || []),
      showNannyDropdown: false,
    });
  }

  const weekDates = getWeekDates(currentDate);
  const { locale, t } = useI18n();
  const weekdayLabels = weekDates.map(d => ({
    label: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d),
    short: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d),
  }));

  const weekLabel = `${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(weekDates[0])} - ${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(weekDates[6])}`;

  const isParent = !!user && String(user.role || '').toLowerCase() === 'parent';

  return (
    <div className="overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('activities.title')}</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{weekLabel}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2 mt-2 md:mt-0">
              {user && (user as { role?: string | null }).role === 'super-admin' && (
              <div className="w-full md:w-auto mb-2 md:mb-0 md:mr-2">
                  <select value={centerFilter || ''} onChange={e => setCenterFilter(e.target.value || null)} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 shadow-sm text-sm w-full md:w-auto min-h-[44px]">
                  <option value="">Tous les centres</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 text-xl transition flex-shrink-0">&#60;</button>
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 text-xl transition flex-shrink-0">&#62;</button>
              {!isParent && (
                <button onClick={() => setAdding(true)} className="bg-[#0b5566] text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-[#08323a] transition text-base flex-1 md:flex-none md:ml-2">{t('activities.add')}</button>
              )}
            </div>
          </div>
        </div>
        <div className="hidden lg:block max-w-5xl mx-auto">
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full border-separate border-spacing-0 bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 rounded-2xl shadow-xl border border-blue-100" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th className="font-bold text-xs md:text-base p-2 md:p-3 border-b w-16 md:w-20" style={{ background: '#f7f4d7', color: '#08323a', borderColor: '#cfeef9' }}>{t('activities.table.hour')}</th>
                  {weekDates.map((date, i) => (
                    <th key={i} className="font-bold p-2 md:p-3 text-center border-b" style={{ width: '12.5%', background: '#f7f4d7', color: '#08323a', borderColor: '#cfeef9' }}>
                      <div className="text-xs md:text-base">{weekdayLabels[i].label}</div>
                      <div className="text-[10px] md:text-xs text-gray-400">{new Intl.DateTimeFormat(locale).format(date)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const cellHidden: boolean[][] = Array.from({ length: 13 }, () => Array(7).fill(false));
                  return [...Array(13)].map((_, slotIdx) => {
                    const hour = 7 + slotIdx;
                    const timeLabel = `${hour}h`;
                    return (
                      <tr key={timeLabel}>
                        <td className="p-2 w-16 md:w-20 text-xs md:text-base font-bold border-t border-b border-gray-100 bg-gray-50 text-gray-500">{timeLabel}</td>
                        {weekDates.map((date, dayIdx) => {
                          if (cellHidden[slotIdx][dayIdx]) return null;
                          const dateStr = date.toISOString().split('T')[0];
                          const activitiesAtSlot = activities.filter(a => {
                            const activityDate = a.date.split('T')[0];
                            const [startH] = a.startTime.split(':').map(Number);
                            return activityDate === dateStr && startH === hour; // Montrer toutes les activités qui commencent pendant cette heure
                          });
                          if (activitiesAtSlot.length > 0) {
                            const dayActivities = activities.filter(a => a.date.split('T')[0] === dateStr);
                            return activitiesAtSlot.map((activity) => {
                              const activityDayIdx = dayActivities.findIndex(a => a.id === activity.id);
                              const [startH] = activity.startTime.split(':').map(Number);
                              const [endH, endM] = activity.endTime.split(':').map(Number);
                              const startIdx = startH - 7;
                              let endIdx = endH - 7;
                              if (endM > 0 || endM === 0) endIdx += 1; 
                              const span = Math.max(1, endIdx - startIdx);
                              for (let i = startIdx + 1; i < startIdx + span; i++) {
                                if (i < 13) cellHidden[i][dayIdx] = true;
                              }
                              const visuals = getActivityVisuals(activity.name, activityDayIdx);
                              return (
                                <td
                                  key={activity.id}
                                  rowSpan={span}
                                  className={`align-top p-0 h-full bg-gradient-to-br from-white via-${visuals.bg.replace('bg-','')} to-${visuals.bg.replace('bg-','')} border-l-4 ${visuals.border} rounded-2xl shadow-lg cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-2xl duration-200 overflow-hidden`}
                                  style={{ verticalAlign: 'top', fontFamily: 'Inter, Arial, sans-serif' }}
                                  onClick={() => handleActivityCardClick(activity)}
                                  tabIndex={0}
                                >
                                  <div className="flex flex-col gap-2 h-full rounded-2xl px-4 py-3" style={{ minHeight: '90px', position: 'relative' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-2xl drop-shadow-sm">{visuals.emoji}</span>
                                      <span className={`font-semibold text-lg ${visuals.text} tracking-tight truncate`}>{activity.name}</span>
                                    </div>
                                  </div>
                                </td>
                              );
                            });
                          } else {
                            return <td key={dayIdx} className="p-2 border-t border-b border-gray-100"></td>;
                          }
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
        <div className="block lg:hidden">
          <div className="flex flex-col gap-6">
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const dayActivities = activities.filter(a => a.date.split('T')[0] === dateStr);
              const slots = [
                {
                  label: t('activities.slot.morning'),
                  color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                  emoji: '🌞',
                  start: 7,
                  end: 12,
                },
                {
                  label: t('activities.slot.afternoon'),
                  color: 'bg-blue-50 border-blue-200 text-blue-800',
                  emoji: '🌤️',
                  start: 12,
                  end: 19,
                },
              ];
              return (
                <div key={i} className="bg-white rounded-2xl shadow border border-gray-100 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-base text-gray-700">{weekdayLabels[i].label}</span>
                    <span className="text-xs text-gray-400">{new Intl.DateTimeFormat(locale).format(date)}</span>
                  </div>
                  {dayActivities.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">{t('activities.none')}</div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {slots.map(slot => {
                        const slotActivities = dayActivities.filter(a => {
                          const start = parseInt(a.startTime);
                          return start >= slot.start && start < slot.end;
                        }).sort((a, b) => parseInt(a.startTime) - parseInt(b.startTime));
                        if (slotActivities.length === 0) return null;
                        return (
                          <div key={slot.label}>
                            <div className={`flex items-center gap-2 mb-2`}>
                              <span className="text-lg">{slot.emoji}</span>
                              <span className={`font-semibold text-xs px-2 py-1 rounded bg-white/60 border border-gray-200 ${slot.color}`}>{slot.label}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {slotActivities.map((activity, idx) => {
                                const visuals = getActivityVisuals(activity.name, idx);
                                return (
                                  <div
                                    key={activity.id}
                                    className={`rounded-xl shadow border flex flex-col gap-1 ${visuals.bg} ${visuals.border} px-2 py-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 overflow-hidden`}
                                    onClick={() => handleActivityCardClick(activity)}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`font-bold text-base mb-1 ${visuals.text} truncate`}>{activity.name}</span>
                                      <span className="text-xs text-gray-600">{activity.startTime} - {activity.endTime}</span>
                                    </div>
                                    {activity.comment && (
                                      <span className="block text-sm text-gray-700 bg-gray-50 rounded px-2 py-1 mb-1 w-full whitespace-pre-line">{activity.comment}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {modalOpen && selectedActivity && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getActivityVisuals(selectedActivity.name, 0).emoji}</span>
                  <div>
                    <h2 className="text-lg font-extrabold text-[#0b5566] leading-tight">{selectedActivity.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedActivity.date ? selectedActivity.date.split('T')[0] : ''}</p>
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition text-xl leading-none">×</button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Horaires */}
                <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-[#0b5566]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span className="font-semibold">{selectedActivity.startTime}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold">{selectedActivity.endTime}</span>
                  </div>
                </div>

                {/* Commentaire */}
                {selectedActivity.comment && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">{t('label.comment')}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{selectedActivity.comment}</p>
                  </div>
                )}

                {/* Nounous */}
                {(() => {
                  const resolvedNannies = selectedActivity.nannies && selectedActivity.nannies.length > 0
                    ? selectedActivity.nannies
                    : (selectedActivity.nannyIds || []).map(id => nannies.find(n => String(n.id) === String(id))).filter(Boolean) as Nanny[];
                  if (resolvedNannies.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {resolvedNannies.length > 1 ? `${resolvedNannies.length} Nounous assignées` : 'Nounou assignée'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {resolvedNannies.map(nanny => (
                          <span key={nanny.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#e6f4f7] text-[#0b5566] border border-[#cfeef9]">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                            {nanny.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer actions */}
              {!isParent && (
                <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                    onClick={() => handleEditActivity(selectedActivity)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Modifier
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
                    onClick={() => handleDeleteActivity(selectedActivity.id)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">

            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-3 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0b5566] leading-tight">{selectedActivity ? t('activities.modal.edit') : t('activities.modal.add')}</h2>
                  <p className="text-xs text-gray-400 leading-none mt-0.5 hidden sm:block">Planifiez une activité pour la semaine</p>
                </div>
              </div>
              <button onClick={() => { setAdding(false); setSelectedActivity(null); }} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition text-xl leading-none flex-shrink-0">×</button>
            </div>

            {/* Body scrollable */}
            <form id="activity-form" className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4" onSubmit={e => { e.preventDefault(); handleAddActivity(); }}>

              {/* Nom de l'activité */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t('label.activityName') || 'Nom de l\'activité'} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Atelier peinture, Lecture, Jeux libres…"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566] transition"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date <span className="text-red-400">*</span></label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm text-gray-800 focus:outline-none bg-white"
                    required
                  />
                </div>
              </div>

              {/* Horaires — 2 colonnes égales */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('label.start')} <span className="text-red-400">*</span></label>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <input type="time" min="07:00" max="19:00" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full px-3 py-2.5 text-sm text-gray-800 focus:outline-none bg-white" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('label.end')} <span className="text-red-400">*</span></label>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <input type="time" min="07:00" max="19:00" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full px-3 py-2.5 text-sm text-gray-800 focus:outline-none bg-white" required />
                  </div>
                </div>
              </div>

              {/* Commentaire */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t('label.comment.optional') || 'Commentaire'} <span className="text-gray-400 font-normal normal-case text-xs">(optionnel)</span>
                </label>
                <textarea
                  placeholder="Matériel nécessaire, consignes particulières…"
                  value={form.comment}
                  onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566] transition resize-none"
                />
              </div>

              {/* Nounous assignées */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nounous assignées <span className="text-red-400">*</span>
                  </label>
                  {form.nannyIds.length > 0 && (
                    <span className="text-xs font-semibold text-[#0b5566] bg-[#e6f4f7] px-2 py-0.5 rounded-full">
                      {form.nannyIds.length} sélectionnée{form.nannyIds.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {nannies.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucune nounou disponible.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {nannies.map(n => {
                      const selected = form.nannyIds.includes(n.id);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            nannyIds: selected
                              ? f.nannyIds.filter(id => id !== n.id)
                              : [...f.nannyIds, n.id]
                          }))}
                          className={`flex items-center justify-between gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                            selected
                              ? 'bg-[#0b5566] text-white border-[#0b5566] shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-[#0b5566] hover:text-[#0b5566]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${selected ? 'bg-white/20 text-white' : 'bg-[#e6f4f7] text-[#0b5566]'}`}>
                              {n.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{n.name}</span>
                          </div>
                          {selected && (
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.nannyIds.length > 1 && (
                  <div className="mt-2 flex items-center gap-1.5 bg-[#e6f4f7] rounded-xl px-3 py-2">
                    <svg className="w-4 h-4 text-[#0b5566] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>
                    <p className="text-xs text-[#0b5566] font-medium">Activité de groupe — {form.nannyIds.length} nounous assignées</p>
                  </div>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setAdding(false); setSelectedActivity(null); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                {t('global.cancel') ?? 'Annuler'}
              </button>
              <button
                type="submit"
                form="activity-form"
                disabled={!form.name || !form.date || !form.startTime || !form.endTime || form.nannyIds.length === 0}
                className="flex-2 flex-grow-[2] py-3 rounded-xl bg-[#0b5566] text-white text-sm font-bold shadow hover:bg-[#08323a] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selectedActivity ? (t('activities.modal.edit') ?? 'Modifier') : (t('activities.modal.add') ?? 'Ajouter')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
