import { useState, useEffect } from 'react';
interface Child {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  date: string; // ISO string
  child: { id: string; name: string };
  nanny: { id: string; name: string };
}

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

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

export default function NannyCalendar({ nannyId }: { nannyId: string }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [showForm, setShowForm] = useState<{ date: string } | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [error, setError] = useState('');
  // Fetch children list
  useEffect(() => {
    fetch('/api/children', { credentials: 'include' })
      .then(res => res.json())
      .then(setChildren);
  }, []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    fetch(`/api/assignments?nannyId=${nannyId}&start=${first.toISOString()}&end=${last.toISOString()}`, { credentials: 'include' })
      .then(res => res.json())
      .then(setAssignments);
  }, [nannyId, currentDate]);

  const monthGrid = getMonthGrid(currentDate);
  const monthLabel = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 gap-2">
        <div className="text-lg md:text-2xl font-bold text-gray-900">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg></button>
          <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
        </div>
      </div>
      <div className="block w-full">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => (
            <div key={i} className="text-center text-gray-500 font-semibold text-xs py-1">{day}</div>
          ))}
          {monthGrid.flat().map((day, idx) => {
            const assigns = assignments.filter(a => {
              const date = new Date(a.date);
              return (
                a.nanny.id === nannyId &&
                date.getFullYear() === day.getFullYear() &&
                date.getMonth() === day.getMonth() &&
                date.getDate() === day.getDate()
              );
            });
            const isToday = day.toDateString() === new Date().toDateString();
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            // Format YYYY-MM-DD sans décalage horaire (UTC)
            const pad = (n: number) => n.toString().padStart(2, '0');
            const dayStr = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
            return (
              <div key={idx} className={
                "align-top p-1 h-full flex flex-col " +
                (isToday ? 'border-2 border-green-400 rounded-xl ' : 'border border-gray-100 ') +
                (isCurrentMonth ? 'bg-[#f8f8fc]' : 'bg-gray-50 opacity-60') +
                " relative"
              }>
                <div className="flex items-center justify-between mb-1">
                  <span className={"text-xs font-bold " + (isCurrentMonth ? 'text-gray-700' : 'text-gray-400')}>{day.getDate()}</span>
                  <button
                    className="text-green-500 hover:text-green-700 text-lg font-bold px-1"
                    title="Ajouter un enfant à ce jour"
                    onClick={() => { setShowForm({ date: dayStr }); setSelectedChild(''); setError(''); }}
                  >+
                  </button>
                </div>
                {assigns.length === 0 ? (
                  <div className="text-gray-300 text-xs">—</div>
                ) : (
                  assigns.map((a) => (
                    <div key={a.id} className={"flex items-center gap-1 mb-1 px-1 py-1 rounded-lg bg-blue-50 shadow-sm group"}>
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      <span className="font-semibold text-gray-800 text-xs group-hover:underline cursor-pointer">{a.child.name}</span>
                    </div>
                  ))
                )}
                {/* Rien ici, la modal globale est en dehors de la grille */}
              </div>
            );
          })}
        </div>
      </div>
    {/* Modal globale d'ajout d'affectation */}
    {showForm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <form
          className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs flex flex-col items-center relative"
          onSubmit={async e => {
            e.preventDefault();
            setError('');
            if (!selectedChild) { setError('Sélectionnez un enfant'); return; }
            // Vérifie si déjà assigné ce jour-là
            const assignsForDay = assignments.filter(a => a.date.split('T')[0] === showForm.date && a.nanny.id === nannyId);
            if (assignsForDay.some(a => a.child.id === selectedChild)) {
              setError('Cet enfant est déjà assigné ce jour-là');
              return;
            }
            // Envoyer la date en UTC (sans décalage local)
            const [year, month, day] = showForm.date.split('-');
            const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
            const utcStr = utcDate.toISOString().split('T')[0];
            const res = await fetch('/api/assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ date: utcStr, childId: selectedChild, nannyId }),
            });
            if (!res.ok) {
              setError('Erreur lors de l\'ajout');
              return;
            }
            setShowForm(null);
            setSelectedChild('');
            // Rafraîchir les assignments
            const yearNow = currentDate.getFullYear();
            const monthNow = currentDate.getMonth();
            const first = new Date(yearNow, monthNow, 1);
            const last = new Date(yearNow, monthNow + 1, 0);
            fetch(`/api/assignments?nannyId=${nannyId}&start=${first.toISOString()}&end=${last.toISOString()}`,
              { credentials: 'include' })
              .then(res => res.json())
              .then(setAssignments);
          }}
        >
          <button type="button" onClick={() => setShowForm(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
          <h2 className="text-lg font-bold mb-4 text-center">Ajouter une affectation</h2>
          <select
            value={selectedChild}
            onChange={e => setSelectedChild(e.target.value)}
            className="border rounded px-2 py-1 mb-2 w-full"
            required
          >
            <option value="">Sélectionner un enfant</option>
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
          <div className="flex gap-2 w-full">
            <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded w-full">Ajouter</button>
            <button type="button" className="bg-gray-300 px-3 py-1 rounded w-full" onClick={() => setShowForm(null)}>Annuler</button>
          </div>
          {error && <div className="text-red-600 text-xs mt-2 text-center w-full">{error}</div>}
        </form>
      </div>
    )}
    </div>
  );
}
