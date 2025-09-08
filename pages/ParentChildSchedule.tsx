import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../src/context/AuthContext';
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
  const { user } = useAuth();
  const { childId } = useParams();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  type LocalActivity = { id: string; date: string; startTime?: string | null; endTime?: string | null; name?: string | null; comment?: string | null; nannies?: { id: string; name: string }[]; nannyId?: string | null };
  type ActivityModal = { id: string; date: string; startTime: string; endTime: string; name: string; comment?: string | null; nannies?: { id: string; name: string }[] };
  const [activityModalData, setActivityModalData] = useState<{ activities: ActivityModal[] } | null>(null);
  const getStringFrom = (obj: Record<string, unknown>, keys: string[]) => {
    for (const k of keys) {
      if (typeof obj[k] === 'string') return obj[k] as string;
    }
    return '';
  };
  const toModalActivities = (arr: LocalActivity[] | null): ActivityModal[] => {
    if (!arr) return [];
  return arr.map(a => {
      const raw = a as unknown as Record<string, unknown>;
      return {
        id: a.id,
        date: a.date,
        startTime: getStringFrom(raw, ['startTime', 'start']),
        endTime: getStringFrom(raw, ['endTime', 'end']),
    name: typeof a.name === 'string' ? a.name : '',
        comment: typeof a.comment === 'string' ? a.comment : null,
        nannies: Array.isArray(a.nannies) ? a.nannies : undefined,
      };
    });
  };
  const [childName, setChildName] = useState<string | null>(null);

  const fetchAssignments = useCallback(async (start?: Date, end?: Date) => {
    let url = `/api/assignments`;
    const params: string[] = [];
    if (start && end) {
      params.push(`start=${start.toISOString()}`);
      params.push(`end=${end.toISOString()}`);
    }
  if (params.length) url += `?${params.join('&')}`;
  const res = await fetchWithRefresh(url, { credentials: 'include' });
    return res.ok ? res.json() : [];
  }, []);

  useEffect(() => {
    if (!childId) return;
        (async () => {
      try {
        const res = await fetchWithRefresh(`/api/children`, { credentials: 'include' });
        const data = await res.json();
  const found = Array.isArray(data) ? data.find((c: unknown) => { const obj = c as Record<string, unknown>; return String(obj.id) === String(childId); }) : null;
        setChildName(found ? (found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim()) : null);
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Failed to load child name', err);
        else console.error('Failed to load child name', err instanceof Error ? err.message : String(err));
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
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Failed to load assignments for child', err);
        else console.error('Failed to load assignments for child', err instanceof Error ? err.message : String(err));
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [childId, currentDate, fetchAssignments]);

  const monthGrid = getMonthGrid(currentDate);

  const handlePrevMonth = () => { const prev = new Date(currentDate); prev.setMonth(prev.getMonth() - 1); setCurrentDate(prev); };
  const handleNextMonth = () => { const next = new Date(currentDate); next.setMonth(next.getMonth() + 1); setCurrentDate(next); };

  const handleQuickAdd = (_date: Date) => {
    // Don't allow parents to add
    if (user && user.role === 'parent') return;
    // Open activity modal with a placeholder activity for the selected date
    const placeholder = { id: 'placeholder', date: _date.toISOString(), startTime: '', endTime: '', name: `Sélection: ${_date.toLocaleDateString()}`, comment: '' } as ActivityModal;
    setActivityModalData({ activities: [placeholder] });
  };

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="relative z-0 min-h-screen bg-[#fcfcff] p-4 md:pl-64 w-full">
      <div className="max-w-7xl mx-auto w-full">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 w-full">
          <div>
            <button className="mr-2 cursor-pointer flex items-center gap-2 bg-[#a9ddf2] text-[#0b5566] px-3 py-1 rounded" onClick={() => navigate(-1)}>
              <span className="text-lg">←</span>
              <span>Retour</span>
            </button>
          </div>
          <div className="flex-1 text-center">
            <div className="text-2xl font-semibold">Planning de {childName ?? "l'enfant"}</div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-end">
            <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500">‹</button>
            <div className="text-lg font-bold text-[#0b5566]">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
            <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500">›</button>
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
          <div className="bg-white rounded-2xl shadow p-4" style={{ border: '1px solid #fcdcdf' }}>
            <div className="hidden sm:block w-full">
              <table className="w-full table-fixed bg-white rounded-lg" style={{ borderCollapse: 'separate', borderSpacing: 0, border: '1px solid transparent' }}>
                <thead>
                  <tr>
                    {['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map(d => (
                      <th key={d} className="p-2 text-center font-semibold text-base" style={{ color: '#08323a' }}>{d}</th>
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
                          <td key={dIdx} className={"align-top p-2 h-28 " + (isToday ? 'border-2 border-[#a9ddf2] rounded-xl ' : 'border border-gray-100 ') + (isCurrentMonth ? 'bg-[#f8f8fc]' : 'bg-gray-50 opacity-60') + " relative"}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={"text-xs font-bold " + (isCurrentMonth ? '' : 'text-gray-400')} style={isCurrentMonth ? { color: '#08323a' } : undefined}>{day.getDate()}</span>
                            </div>
                            {dayAssignments.length === 0 ? (
                              <div className="text-gray-300 text-sm">—</div>
                            ) : (
                              <div className="space-y-2">
                                {dayAssignments.map(a => (
                                  <div key={a.id} className="rounded px-2 py-1 text-sm shadow-sm" style={{ background: '#a9ddf2', color: '#08323a' }}>
                                      {a.nanny ? (
                                        <button className="font-semibold" style={{ color: '#0b5566' }} onClick={async () => {
                                          try {
                                            const nannyId = a.nanny!.id;
                                            const dateYmd = toLocalYMD(a.date);
                                            const res = await fetchWithRefresh(`/api/nannies/${encodeURIComponent(nannyId)}/schedules`, { credentials: 'include' });
                                            const data = await res.json();
                                            const filtered = Array.isArray(data)
                                              ? data.filter((s: unknown) => {
                                                  const obj = s as Record<string, unknown>;
                                                  const date = typeof obj.date === 'string' ? toLocalYMD(obj.date) : '';
                                                  return date === dateYmd;
                                                }) as LocalActivity[]
                                              : [];
                                            setActivityModalData({ activities: toModalActivities(filtered) });
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
            <div className="block sm:hidden w-full overflow-x-auto">
              <div className="grid grid-cols-7 gap-1 w-full">
                {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d, i) => (
                  <div key={i} className="text-center text-gray-500 font-semibold text-xs py-1">{d}</div>
                ))}
                {monthGrid.flat().map((day, idx) => {
                  const assigns = assignments.filter(a => toLocalYMD(a.date) === toLocalYMD(day));
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  return (
                    <div key={idx} className={
                      "box-border align-top p-1 h-full flex flex-col " +
                      (isToday ? 'border-2 border-[#0b5566] rounded-xl ' : 'border border-gray-100 ') +
                      (isCurrentMonth ? 'bg-[#f8f8fc]' : 'bg-gray-50 opacity-60') +
                      " relative"
                    }>
                      <div className="flex items-center justify-between mb-1">
                        <span className={"text-xs font-bold " + (isCurrentMonth ? 'text-gray-700' : 'text-gray-400')}>{day.getDate()}</span>
                        {!(user && user.role === 'parent') && (
                          <button onClick={() => handleQuickAdd(day)} className="text-[#0b5566] hover:text-[#08323a] text-lg font-bold">+</button>
                        )}
                      </div>
                      {assigns.length === 0 ? (
                        <div className="text-gray-300 text-xs">—</div>
                      ) : (
                        assigns.slice(0, 2).map((a, j) => (
                          <div key={a.id} className={"flex items-center gap-2 mb-1 px-1 py-1 rounded-lg " + (j === 0 ? 'bg-[#a9ddf2]' : 'bg-[#fff7e6]') + " shadow-sm group"}>
                            <span className={"w-2 h-2 rounded-full " + (j === 0 ? 'bg-[#08323a]' : 'bg-[#856400]')}></span>
                            <span
                              className="font-semibold text-gray-800 text-[11px] group-hover:underline cursor-pointer truncate max-w-[70px]"
                              title={a.child.name}
                            >
                              {a.child.name}
                            </span>
                          </div>
                        ))
                      )}
                      {assigns.length > 2 && (
                        <div className="text-gray-400 text-xs italic truncate max-w-[70px] overflow-hidden whitespace-nowrap">...et {assigns.length - 2} autres</div>
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
