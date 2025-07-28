import { useEffect, useState } from 'react';
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
// Pour le design, on n'affiche pas les heures, juste les jours et les enfants présents


// Renvoie tous les jours du mois courant, groupés par semaine (lundi-dimanche)
function getMonthGrid(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Premier jour du mois
  const first = new Date(year, month, 1);
  // Dernier jour du mois
  const last = new Date(year, month + 1, 0);
  // Premier lundi avant ou égal au 1er
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  // Dernier dimanche après ou égal au dernier
  const end = new Date(last);
  end.setDate(last.getDate() + (7 - end.getDay() === 7 ? 0 : 7 - end.getDay()));
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  // Découpe en semaines
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}


export default function Dashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<AssignmentForm | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch assignments for the current visible month
  const fetchAssignments = (start?: Date, end?: Date) => {
    let url = '/api/assignments';
    if (start && end) {
      url += `?start=${start.toISOString()}&end=${end.toISOString()}`;
    }
    fetch(url, { credentials: 'include' })
      .then(res => res.json())
      .then(setAssignments);
  };

  // On mount, fetch for current month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    fetchAssignments(first, last);
  }, [currentDate]);

  // Stats mock (à remplacer par des vraies données)
  const totalChildren = 24;
  const presentToday = 18;
  const activeCaregivers = 8;
  const weeklyAverage = 92;

  // Générer la grille du mois courant (semaines x jours)
  const monthGrid = getMonthGrid(currentDate);

  // Navigation mois
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

  // Ajout rapide (ouvre le modal sur le jour sélectionné)
  const handleQuickAdd = (date: Date) => {
    setModalInitial({ date: date.toISOString().split('T')[0], childId: '', nannyId: '' });
    setModalOpen(true);
  };

  // Edition d'une affectation
  const handleEdit = (a: Assignment) => {
    setModalInitial({ date: a.date.split('T')[0], childId: a.child.id, nannyId: a.nanny.id });
    setSelectedId(a.id);
    setModalOpen(true);
  };

  const handleSave = async (data: AssignmentForm) => {
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
    // On prend le premier et dernier jour du mois affiché
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

  // Format date pour l'entête
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#fcfcff] p-0 md:p-6 pl-0 md:pl-64">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-1">Tableau de bord</h1>
          <div className="text-gray-400 text-base">Bienvenue ! Voici ce qui se passe aujourd'hui.</div>
        </div>
        <div className="flex items-center gap-2 self-end">
          <input type="date" value={currentDate.toISOString().split('T')[0]} onChange={e => setCurrentDate(new Date(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-base" />
          <button onClick={() => handleQuickAdd(new Date())} className="bg-green-500 text-black font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-green-600 transition">+ Ajouter</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-start gap-2 border border-[#f3f3fa]">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{totalChildren}</span>
            <span className="bg-blue-50 text-blue-500 rounded-full p-2"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a7.5 7.5 0 0 1 13 0"/></svg></span>
          </div>
          <div className="text-gray-500 font-medium">Enfants inscrits</div>
          <div className="text-green-500 text-sm font-semibold flex items-center gap-1">+12% depuis le mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-start gap-2 border border-[#f3f3fa]">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{presentToday}</span>
            <span className="bg-green-50 text-green-500 rounded-full p-2"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>
          </div>
          <div className="text-gray-500 font-medium">Présents aujourd'hui</div>
          <div className="text-green-500 text-sm font-semibold flex items-center gap-1">Taux de présence 75%</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-start gap-2 border border-[#f3f3fa]">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{activeCaregivers}</span>
            <span className="bg-yellow-50 text-yellow-500 rounded-full p-2"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21C7 21 2 17 2 12V7a5 5 0 0 1 10 0v5c0 5-5 9-10 9z"/></svg></span>
          </div>
          <div className="text-gray-500 font-medium">Intervenants actifs</div>
          <div className="text-gray-400 text-sm font-medium flex items-center gap-1">— Pas de changement</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-start gap-2 border border-[#f3f3fa]">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{weeklyAverage}%</span>
            <span className="bg-purple-50 text-purple-500 rounded-full p-2"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 17l4-4 4 4"/></svg></span>
          </div>
          <div className="text-gray-500 font-medium">Moyenne hebdomadaire</div>
          <div className="text-green-500 text-sm font-semibold flex items-center gap-1">+5% depuis la semaine dernière</div>
        </div>
      </div>

      {/* Custom Calendar */}
      <div className="bg-white rounded-2xl shadow p-6 border border-[#f3f3fa]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-bold text-gray-900">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg></button>
            <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg">
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
                        "align-top p-2 min-w-[120px] h-28 " +
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
                            <div key={a.id} className={"flex items-center gap-2 mb-2 px-2 py-1 rounded-lg " + (j === 0 ? 'bg-green-50' : 'bg-yellow-50') + " shadow-sm cursor-pointer group"} onClick={() => handleEdit(a)}>
                              <span className={"w-2 h-2 rounded-full " + (j === 0 ? 'bg-green-400' : 'bg-yellow-400')}></span>
                              <span className="font-semibold text-gray-800 text-sm group-hover:underline">{a.child.name}</span>
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

      <AssignmentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedId(null); setModalInitial(null); }}
        onSave={handleSave}
        initial={modalInitial || undefined}
      />
      {selectedId && modalOpen && (
        <button onClick={handleDelete} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">Supprimer l’affectation</button>
      )}
    </div>
  );
}
