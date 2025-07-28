interface Nanny {
  id: string;
  name: string;
  availability: string;
}
import { useEffect, useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AssignmentModal from '../components/AssignmentModal';

interface Assignment {
  id: string;
  date: string; // ISO string
  child: { id: string; name: string };
  nanny: { id: string; name: string };
}

interface AssignmentForm {
  date: string;
  childId: string;
  nannyId: string;
}

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user && user.nannyId) {
      navigate('/mon-planning', { replace: true });
    }
  }, [user, navigate]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [activeCaregivers, setActiveCaregivers] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<AssignmentForm | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchAssignments = (start?: Date, end?: Date) => {
    let url = '/api/assignments';
    if (start && end) {
      url += `?start=${start.toISOString()}&end=${end.toISOString()}`;
    }
    fetch(url, { credentials: 'include' })
      .then(res => res.json())
      .then(setAssignments);
  };

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    fetchAssignments(first, last);

    fetch('/api/children', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setChildrenCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setChildrenCount(0));

    fetch('/api/nannies', { credentials: 'include' })
      .then(res => res.json())
      .then((data: Nanny[]) => {
        if (Array.isArray(data)) {
          setActiveCaregivers(data.filter((n: Nanny) => n.availability === 'Disponible').length);
        } else {
          setActiveCaregivers(0);
        }
      })
      .catch(() => setActiveCaregivers(0));
  }, [currentDate]);

  const totalChildren = childrenCount;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const presentToday = Array.from(
    new Set(
      assignments
        .filter(a => a.date.split('T')[0] === todayStr)
        .map(a => a.child.id)
    )
  ).length;
  // Moyenne hebdomadaire dynamique :
  let weeklyAverage = 0;
  if (totalChildren > 0) {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        last7Days.push(d.toISOString().split('T')[0]);
      }
    }
    const dailyRates = last7Days.map(dateStr => {
      const present = new Set(assignments.filter(a => a.date.split('T')[0] === dateStr).map(a => a.child.id)).size;
      return (present / totalChildren) * 100;
    });
    weeklyAverage = dailyRates.length > 0 ? Math.round(dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length) : 0;
  }

  const monthGrid = getMonthGrid(currentDate);

  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };
  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleQuickAdd = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString().split('T')[0];
    setModalInitial({ date: localDate, childId: '', nannyId: '' });
    setModalOpen(true);
  };

  const [saveError, setSaveError] = useState<string | null>(null);
  const handleSave = async (data: AssignmentForm) => {
    setSaveError(null);
    const duplicate = assignments.some(a =>
      a.child.id === data.childId &&
      a.date.split('T')[0] === data.date &&
      (!selectedId || a.id !== selectedId)
    );
    if (duplicate) {
      setSaveError("Cet enfant est déjà affecté ce jour-là.");
      return;
    }
    if (selectedId) {
      await fetch(`/api/assignments/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
    }
    setModalOpen(false);
    setSelectedId(null);
    setModalInitial(null);
    const month = getMonthGrid(currentDate);
    const first = month[0][0];
    const last = month[month.length - 1][6];
    fetchAssignments(first, last);
  };

  const handleDelete = async () => {
    if (selectedId && window.confirm('Supprimer cette affectation ?')) {
      await fetch(`/api/assignments/${selectedId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setModalOpen(false);
      setSelectedId(null);
      setModalInitial(null);
      const month = getMonthGrid(currentDate);
      const first = month[0][0];
      const last = month[month.length - 1][6];
      fetchAssignments(first, last);
    }
  };

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#fcfcff] w-full">
      <div className="p-2 sm:p-4 md:p-8 md:pl-64 w-full max-w-full flex flex-col">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 w-full">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1 text-left">Tableau de bord</h1>
          <div className="text-gray-400 text-base text-left">Bienvenue ! Voici ce qui se passe aujourd'hui.</div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-end">
          <input type="date" value={currentDate.toISOString().split('T')[0]} onChange={e => setCurrentDate(new Date(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-base w-[120px] sm:w-auto" />
          <button onClick={() => handleQuickAdd(new Date())} className="bg-green-500 text-black font-semibold rounded-lg px-4 py-2 text-base shadow hover:bg-green-600 transition whitespace-nowrap">+ Ajouter</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 mb-8 w-full max-w-full mx-auto 
        md:grid-cols-2 md:w-auto
        xl:grid-cols-4">
        <div className="bg-white rounded-2xl shadow p-3 md:p-6 flex flex-col items-start gap-2 border border-[#f3f3fa] w-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{totalChildren}</span>
            <span className="bg-blue-50 text-blue-500 rounded-full p-2"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a7.5 7.5 0 0 1 13 0"/></svg></span>
          </div>
          <div className="text-gray-500 font-medium text-sm sm:text-base">Enfants inscrits</div>
          <div className="text-green-500 text-xs sm:text-sm font-semibold flex items-center gap-1">+12% depuis le mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-3 md:p-6 flex flex-col items-start gap-2 border border-[#f3f3fa] w-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{presentToday}</span>
            <span className="bg-green-50 text-green-500 rounded-full p-2"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>
          </div>
          <div className="text-gray-500 font-medium text-sm sm:text-base">Présents aujourd'hui</div>
          <div className="text-green-500 text-xs sm:text-sm font-semibold flex items-center gap-1">Taux de présence 75%</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-3 md:p-6 flex flex-col items-start gap-2 border border-[#f3f3fa] w-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{activeCaregivers}</span>
            <span className="bg-yellow-50 text-yellow-500 rounded-full p-2"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21C7 21 2 17 2 12V7a5 5 0 0 1 10 0v5c0 5-5 9-10 9z"/></svg></span>
          </div>
          <div className="text-gray-500 font-medium text-sm sm:text-base">Intervenants actifs</div>
          <div className="text-gray-400 text-xs sm:text-sm font-medium flex items-center gap-1">— Pas de changement</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-3 md:p-6 flex flex-col items-start gap-2 border border-[#f3f3fa] w-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{weeklyAverage}%</span>
            <span className="bg-purple-50 text-purple-500 rounded-full p-2"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 17l4-4 4 4"/></svg></span>
          </div>
          <div className="text-gray-500 font-medium text-sm sm:text-base">Moyenne hebdomadaire</div>
          <div className="text-green-500 text-xs sm:text-sm font-semibold flex items-center gap-1">+5% depuis la semaine dernière</div>
        </div>
      </div>

      {/* Custom Calendar */}
      <div className="bg-white rounded-2xl shadow p-2 sm:p-4 md:p-6 border border-[#f3f3fa] w-full max-w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 gap-2">
          <div className="text-lg md:text-2xl font-bold text-gray-900">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg></button>
            <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
          </div>
        </div>
        {/* Table calendrier : grid en mobile, table classique en sm+ */}
        <div className="block sm:hidden w-full">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-gray-500 font-semibold text-xs py-1">{day}</div>
            ))}
            {monthGrid.flat().map((day, idx) => {
              const assigns = assignments.filter(a => {
                const date = new Date(a.date);
                return (
                  date.getFullYear() === day.getFullYear() &&
                  date.getMonth() === day.getMonth() &&
                  date.getDate() === day.getDate()
                );
              });
              const isToday = day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              return (
                <div key={idx} className={
                  "align-top p-1 h-full flex flex-col " +
                  (isToday ? 'border-2 border-green-400 rounded-xl ' : 'border border-gray-100 ') +
                  (isCurrentMonth ? 'bg-[#f8f8fc]' : 'bg-gray-50 opacity-60') +
                  " relative"
                }>
                  <div className="flex items-center justify-between mb-1">
                    <span className={"text-xs font-bold " + (isCurrentMonth ? 'text-gray-700' : 'text-gray-400')}>{day.getDate()}</span>
                    <button onClick={() => handleQuickAdd(day)} className="text-green-500 hover:text-green-700 text-lg font-bold">+</button>
                  </div>
                  {assigns.length === 0 ? (
                    <div className="text-gray-300 text-xs">—</div>
                  ) : (
                    assigns.map((a, j) => (
                      <div key={a.id} className={"flex items-center gap-1 mb-1 px-1 py-1 rounded-lg " + (j === 0 ? 'bg-green-50' : 'bg-yellow-50') + " shadow-sm group"}>
                        <span className={"w-2 h-2 rounded-full " + (j === 0 ? 'bg-green-400' : 'bg-yellow-400')}></span>
                        <span
                          className="font-semibold text-gray-800 text-xs group-hover:underline cursor-pointer hover:text-red-600"
                          title="Supprimer cette affectation"
                          onClick={() => {
                            if (window.confirm('Supprimer cette affectation pour cet enfant ?')) {
                              fetch(`/api/assignments/${a.id}`, {
                                method: 'DELETE',
                                credentials: 'include',
                              }).then(() => {
                                const month = getMonthGrid(currentDate);
                                const first = month[0][0];
                                const last = month[month.length - 1][6];
                                fetchAssignments(first, last);
                              });
                            }
                          }}
                        >
                          {a.child.name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="hidden sm:block w-full overflow-x-auto">
          <table className="min-w-[420px] md:min-w-[600px] xl:min-w-[700px] bg-white rounded-lg w-full max-w-full">
            <thead>
              <tr>
                {weekDays.map((day, i) => (
                  <th key={i} className="p-2 text-center text-gray-500 font-semibold text-base">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid.map((week, wIdx) => (
                <tr key={wIdx}>
                  {week.map((day, dIdx) => {
                    const assigns = assignments.filter(a => {
                      const date = new Date(a.date);
                      return (
                        date.getFullYear() === day.getFullYear() &&
                        date.getMonth() === day.getMonth() &&
                        date.getDate() === day.getDate()
                      );
                    });
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    return (
                      <td key={dIdx} className={
                        "align-top p-2 h-28 " +
                        (isToday ? 'border-2 border-green-400 rounded-xl ' : 'border border-gray-100 ') +
                        (isCurrentMonth ? 'bg-[#f8f8fc]' : 'bg-gray-50 opacity-60') +
                        " relative"
                      }>
                        <div className="flex items-center justify-between mb-1">
                          <span className={"text-xs font-bold " + (isCurrentMonth ? 'text-gray-700' : 'text-gray-400')}>{day.getDate()}</span>
                          <button onClick={() => handleQuickAdd(day)} className="text-green-500 hover:text-green-700 text-lg font-bold">+</button>
                        </div>
                        {assigns.length === 0 ? (
                          <div className="text-gray-300 text-sm">—</div>
                        ) : (
                          assigns.map((a, j) => (
                            <div key={a.id} className={"flex items-center gap-2 mb-2 px-2 py-1 rounded-lg " + (j === 0 ? 'bg-green-50' : 'bg-yellow-50') + " shadow-sm group"}>
                              <span className={"w-2 h-2 rounded-full " + (j === 0 ? 'bg-green-400' : 'bg-yellow-400')}></span>
                              <span
                                className="font-semibold text-gray-800 text-sm group-hover:underline cursor-pointer hover:text-red-600"
                                title="Supprimer cette affectation"
                                onClick={() => {
                                  if (window.confirm('Supprimer cette affectation pour cet enfant ?')) {
                                    fetch(`/api/assignments/${a.id}`, {
                                      method: 'DELETE',
                                      credentials: 'include',
                                    }).then(() => {
                                      const month = getMonthGrid(currentDate);
                                      const first = month[0][0];
                                      const last = month[month.length - 1][6];
                                      fetchAssignments(first, last);
                                    });
                                  }
                                }}
                              >
                                {a.child.name}
                              </span>
                            </div>
                          ))
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {saveError && (
        <div className="text-red-600 font-semibold mb-2">{saveError}</div>
      )}
      {/* Flou de fond personnalisé pour le modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-white/40 backdrop-blur-sm transition-all"></div>
      )}
      <AssignmentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedId(null); setModalInitial(null); setSaveError(null); }}
        onSave={handleSave}
        initial={modalInitial || undefined}
      />
      {selectedId && modalOpen && (
        <button onClick={handleDelete} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">Supprimer l’affectation</button>
      )}
      </div>
    </div>
  );
}
