import { useEffect, useState, useCallback } from 'react';
import AssignmentDetailModal from '../components/AssignmentDetailModal';
import ActivityDetailModal from '../components/ActivityDetailModal';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

type Assignment = {
  id: string;
  date: string;
  child: { id: string; name: string };
  nanny?: { id: string; name: string } | null;
};

function getMonthGrid(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const end = new Date(last);
  end.setDate(last.getDate() + (7 - end.getDay() === 7 ? 0 : 7 - end.getDay()));
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function toLocalYMD(d: Date | string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export default function ParentChildSchedule() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [activityModalData, setActivityModalData] = useState<{ activities: any[] } | null>(null);
  const [childName, setChildName] = useState<string | null>(null);

  const API_URL = (() => {
    try {
      const meta = import.meta as unknown as { env?: { VITE_API_URL?: string } };
      return (meta.env && meta.env.VITE_API_URL) ? meta.env.VITE_API_URL : 'http://localhost:4000';
    } catch {
      return 'http://localhost:4000';
    }
  })();

  const fetchAssignments = useCallback(async (start?: Date, end?: Date) => {
    let url = `${API_URL}/api/assignments`;
    const params: string[] = [];
    if (start && end) {
      params.push(`start=${start.toISOString()}`);
      params.push(`end=${end.toISOString()}`);
    }
    if (params.length) url += `?${params.join('&')}`;
    const res = await fetchWithRefresh(url, { credentials: 'include' });
    return res.ok ? res.json() : [];
  }, [API_URL]);

  useEffect(() => {
    if (!childId) return;
    (async () => {
      try {
        const res = await fetchWithRefresh(`${API_URL}/api/children`, { credentials: 'include' });
        const data = await res.json();
        const found = Array.isArray(data) ? data.find((c: any) => String(c.id) === String(childId)) : null;
        setChildName(found ? (found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim()) : null);
      } catch (err) {
        console.error('Failed to load child name', err);
      }
    })();
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    (async () => {
      try {
        const data: Assignment[] = await fetchAssignments(first, last);
        const filtered = Array.isArray(data) ? data.filter(a => a.child && a.child.id === childId) : [];
        setAssignments(filtered);
      } catch (err) {
        console.error('Failed to load assignments for child', err);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [childId, currentDate, fetchAssignments]);

  const monthGrid = getMonthGrid(currentDate);

  const handlePrevMonth = () => { const prev = new Date(currentDate); prev.setMonth(prev.getMonth() - 1); setCurrentDate(prev); };
  const handleNextMonth = () => { const next = new Date(currentDate); next.setMonth(next.getMonth() + 1); setCurrentDate(next); };

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="relative z-0 min-h-screen bg-[#fcfcff] p-4 md:pl-64 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button className="mr-2 btn cursor-pointer flex items-center gap-2" onClick={() => navigate(-1)}>
              <span className="text-lg">←</span>
              <span>Retour</span>
            </button>
          </div>
          <div className="flex-1 text-center">
            <div className="text-2xl font-semibold">Planning de {childName ?? "l'enfant"}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white">‹</button>
            <div className="text-lg font-bold">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
            <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white">›</button>
          </div>
        </div>

          {selectedAssignment && (
            <AssignmentDetailModal assignment={selectedAssignment} onClose={() => setSelectedAssignment(null)} />
          )}
          {activityModalData && (
            <ActivityDetailModal activities={activityModalData.activities} onClose={() => setActivityModalData(null)} />
          )}
        {loading ? (
          <div>Chargement...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="hidden sm:block w-full">
              <table className="w-full table-fixed bg-white rounded-lg">
                <thead>
                  <tr>
                    {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
                      <th key={d} className="p-2 text-center text-gray-500 font-semibold text-base">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthGrid.map((week, wIdx) => (
                    <tr key={wIdx}>
                      {week.map((day, dIdx) => {
                        const dayAssignments = assignments.filter(a => {
                          const date = toLocalYMD(a.date);
                          return date === toLocalYMD(day);
                        });
                        const isToday = day.toDateString() === new Date().toDateString();
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        return (
                          <td key={dIdx} className={"align-top p-2 h-28 " + (isToday ? 'border-2 border-green-400 rounded-xl ' : 'border border-gray-100 ') + (isCurrentMonth ? 'bg-[#f8f8fc]' : 'bg-gray-50 opacity-60') + " relative"}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={"text-xs font-bold " + (isCurrentMonth ? 'text-gray-700' : 'text-gray-400')}>{day.getDate()}</span>
                            </div>
                            {dayAssignments.length === 0 ? (
                              <div className="text-gray-300 text-sm">—</div>
                            ) : (
                              <div className="space-y-2">
                                {dayAssignments.map(a => (
                                  <div key={a.id} className="bg-green-50 rounded px-2 py-1 text-gray-800 text-sm shadow-sm">
                                      {a.nanny ? (
                                        <button className="font-semibold" onClick={async () => {
                                          // fetch schedules for nanny and filter by date
                                          try {
                                            const nannyId = a.nanny!.id;
                                            const dateYmd = toLocalYMD(a.date);
                                            const res = await fetch(`${API_URL}/api/nannies/${encodeURIComponent(nannyId)}/schedules`);
                                            const data = await res.json();
                                            const filtered = Array.isArray(data) ? data.filter((s: any) => s.date.split('T')[0] === dateYmd) : [];
                                            setActivityModalData({ activities: filtered });
                                          } catch (err) {
                                            console.error('Failed to fetch activities', err);
                                            setActivityModalData({ activities: [] });
                                          }
                                        }}>{a.nanny.name}</button>
                                      ) : 'Affectation'}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="block sm:hidden">
              <div className="grid grid-cols-7 gap-1">
                {monthGrid.flat().map((day, idx) => {
                  const dayAssignments = assignments.filter(a => toLocalYMD(a.date) === toLocalYMD(day));
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  return (
                    <div key={idx} className={(isCurrentMonth ? 'bg-white' : 'bg-gray-50 opacity-60') + ' p-1 rounded'}>
                      <div className="text-xs font-bold mb-1">{day.getDate()}</div>
                      {dayAssignments.length === 0 ? <div className="text-gray-300 text-xs">—</div> : (
                        dayAssignments.map(a => <div key={a.id} className="text-sm bg-green-50 rounded px-2 py-1">{a.nanny ? <button onClick={async () => {
                          try {
                            const nannyId = a.nanny!.id;
                            const dateYmd = toLocalYMD(a.date);
                            const res = await fetch(`${API_URL}/api/nannies/${encodeURIComponent(nannyId)}/schedules`);
                            const data = await res.json();
                            const filtered = Array.isArray(data) ? data.filter((s: any) => s.date.split('T')[0] === dateYmd) : [];
                            setActivityModalData({ activities: filtered });
                          } catch (err) {
                            console.error('Failed to fetch activities', err);
                            setActivityModalData({ activities: [] });
                          }
                        }} className="font-semibold">{a.nanny.name}</button> : 'Affectation'}</div>)
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
