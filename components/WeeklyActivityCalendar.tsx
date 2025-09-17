import { useState, useEffect } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
import Select from 'react-select';
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

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/nannies`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setNannies(data));
  }, []);

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/schedules`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setActivities(data));
  }, [currentDate]);


  const handleAddActivity = async () => {
    if (!form.name || !form.startTime || !form.endTime || form.nannyIds.length === 0 || !form.date) return;

    // Vérifier que la date n'est pas dans le passé
    const selectedDate = new Date(form.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      alert('Vous ne pouvez pas ajouter ou modifier une activité sur une date passée.');
      return;
    }

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
    await fetchWithRefresh(`${API_URL}/schedules`, { credentials: 'include' })
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
    await fetchWithRefresh(`${API_URL}/schedules`, { credentials: 'include' })
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

  const { user } = useAuth();
  const isParent = !!user && String(user.role || '').toLowerCase() === 'parent';

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">{t('activities.title')}</h1>
            <div className="text-lg text-gray-500 font-medium">{weekLabel}</div>
          </div>
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 text-xl transition">&#60;</button>
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 text-xl transition">&#62;</button>
            {!isParent && (
              <button onClick={() => setAdding(true)} className="bg-[#0b5566] text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-[#08323a] transition text-base ml-2">{t('activities.add')}</button>
            )}
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
                            const [startH, startM] = a.startTime.split(':').map(Number);
                            return activityDate === dateStr && startH === hour && startM === 0;
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative border-4 border-pink-100 flex flex-col items-center gap-6 animate-fade-in">
              <button onClick={() => setModalOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
              <div className="flex flex-col items-center gap-2 mb-4">
                <span className="text-3xl">{getActivityVisuals(selectedActivity.name, 0).emoji}</span>
                <span className="font-extrabold text-xl text-pink-700 mb-2">{selectedActivity.name}</span>
              </div>
              <div className="w-full flex flex-col gap-2 mb-2">
                <div className="flex gap-2 text-gray-700 text-base"><span className="font-semibold">{t('assignment.modal.date')}:</span> <span>{selectedActivity.date ? selectedActivity.date.split('T')[0] : ''}</span></div>
                <div className="flex gap-2 text-gray-700 text-base"><span className="font-semibold">{t('label.start')}:</span> <span>{selectedActivity.startTime}</span></div>
                <div className="flex gap-2 text-gray-700 text-base"><span className="font-semibold">{t('label.end')}:</span> <span>{selectedActivity.endTime}</span></div>
                {selectedActivity.comment && (
                  <div className="flex gap-2 text-gray-700 text-base"><span className="font-semibold">{t('label.comment')}:</span> <span>{selectedActivity.comment}</span></div>
                )}
                {(selectedActivity.nannies && selectedActivity.nannies.length > 0) ? (
                  <div className="flex flex-col gap-2 text-gray-700 text-base">
                    <span className="font-semibold">{t('activities.modal.nannies_label')}:</span>
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                      {selectedActivity.nannies.map(nanny => (
                        <span key={nanny.id} className="px-3 py-1 rounded-full font-semibold text-sm shadow flex items-center justify-center text-center min-w-[80px]" style={{ background: '#a9ddf2', color: '#08323a', border: '1px solid #cfeef9' }}>
                          {nanny.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (selectedActivity.nannyIds && selectedActivity.nannyIds.length > 0) ? (
                  <div className="flex flex-col gap-2 text-gray-700 text-base">
                    <span className="font-semibold">{t('activities.modal.nannies_label')}:</span>
                    {nannies.length === 0 && (
                      <span className="text-red-500">{t('activities.modal.no_nannies_loaded')}</span>
                    )}
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                      {selectedActivity.nannyIds.map(id => {
                        const nanny = nannies.find(n => String(n.id) === String(id));
                        return (
                          <span key={id} className="px-3 py-1 rounded-full font-semibold text-sm shadow flex items-center justify-center text-center min-w-[80px]" style={{ background: '#a9ddf2', color: '#08323a', border: '1px solid #cfeef9' }}>
                            {nanny ? nanny.name : `ID: ${id}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
                <div className="flex flex-col gap-4 w-full mt-2">
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-lg shadow transition-transform hover:scale-105 active:scale-95"
                  onClick={() => handleEditActivity(selectedActivity)}
                  style={{ background: '#a9ddf2', color: '#08323a', border: '1px solid #cfeef9' }}
                >
                  <span className="text-2xl">✏️</span> Modifier
                </button>
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-lg shadow transition-transform hover:scale-105 active:scale-95"
                  onClick={() => handleDeleteActivity(selectedActivity.id)}
                  style={{ background: '#fcdcdf', color: '#7a2a2a', border: '1px solid #fbd5d8' }}
                >
                  <span className="text-2xl">🗑️</span> Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <div className="rounded-2xl shadow-2xl p-8 w-full max-w-md relative bg-white border border-gray-100">
            <button onClick={() => setAdding(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
            <h2 className="text-2xl font-extrabold mb-4 text-center" style={{ color: '#0b5566' }}>{selectedActivity ? t('activities.modal.edit') : t('activities.modal.add')}</h2>
            <form className="space-y-4 mb-2" onSubmit={e => { e.preventDefault(); handleAddActivity(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#a9ddf2]"
                    style={{ borderColor: '#cfeef9' }}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('label.start')}</label>
          <input type="time" min="07:00" max="19:00" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#a9ddf2]" style={{ borderColor: '#cfeef9' }} required />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('label.end')}</label>
          <input type="time" min="07:00" max="19:00" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#a9ddf2]" style={{ borderColor: '#cfeef9' }} required />
                  </div>
                </div>
              </div>
              <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('label.activityName') || 'Nom de l\'activité'}</label>
  <input type="text" placeholder={t('label.activityName') || 'Nom de l\'activité'} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#a9ddf2]" style={{ borderColor: '#cfeef9' }} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('label.comment.optional') || 'Commentaire (optionnel)'}</label>
                <input type="text" placeholder={t('label.comment') || 'Commentaire'} value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} className="border border-blue-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nannies assignées</label>
                <Select
                  isMulti
                  options={nannies.map(n => ({ value: n.id, label: n.name }))}
                  value={nannies.filter(n => form.nannyIds.includes(n.id)).map(n => ({ value: n.id, label: n.name }))}
                  onChange={selected => {
                    setForm(f => ({ ...f, nannyIds: selected ? (selected as { value: string; label: string }[]).map(s => s.value) : [] }));
                  }}
                  placeholder={t('children.nannies.label')}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({ ...base, borderColor: '#bfdbfe', minHeight: '3rem', boxShadow: 'none' }),
                    multiValue: (base) => ({ ...base, backgroundColor: '#dbeafe', color: '#1d4ed8' }),
                    option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? '#dbeafe' : '#fff', color: '#1d4ed8' }),
                  }}
                />
              </div>
                <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-[#0b5566] text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-[#08323a] transition">{selectedActivity ? t('activities.modal.edit') ?? 'Modifier' : t('activities.modal.add') ?? 'Ajouter'}</button>
                <button type="button" onClick={() => setAdding(false)} className="flex-1 bg-gray-300 px-4 py-2 rounded-lg font-bold">{t('global.cancel') ?? 'Annuler'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
