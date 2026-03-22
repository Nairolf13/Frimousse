import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';

const API_URL = import.meta.env.VITE_API_URL;

// Helper: broadcast a payment-history update so any open history view reloads
interface PaymentHistoryPayload {
  year?: number;
  month?: number;
}

function notifyPaymentHistory(year?: number, month?: number) {
  const payload: PaymentHistoryPayload = {};
  if (typeof year === 'number' && typeof month === 'number') {
    payload.year = year;
    payload.month = month;
  }
  try {
    const Win = window as unknown as { BroadcastChannel?: typeof BroadcastChannel };
    if (Win.BroadcastChannel) {
      const bc = new Win.BroadcastChannel('__frimousse_payment_history__');
      bc.postMessage(payload);
      bc.close();
    }
  } catch (err) {
    console.error('broadcast paymentHistory notification failed', err);
  }
  try { localStorage.setItem('__frimousse_payment_history__', JSON.stringify(payload)); } catch (err) {
    console.error('storing paymentHistory payload failed', err);
  }
  try { window.dispatchEvent(new CustomEvent('paymentHistory:changed', { detail: payload })); } catch (err) {
    console.error('dispatching paymentHistory event failed', err);
  }
}


import { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
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

// weekday short labels will be generated from locale

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

function getWeekDates(date: Date) {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function NannyCalendar({ nannyId, centerId }: { nannyId?: string | null; centerId?: string | null }) {
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [showForm, setShowForm] = useState<{ date: string } | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // modal for viewing assignments on a day and deleting multiple
  const [dayModal, setDayModal] = useState<{ date: string; assigns: Assignment[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    const url = `${API_URL}/children${centerId ? `?centerId=${encodeURIComponent(centerId)}` : ''}`;
    fetchWithRefresh(url, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setChildren(Array.isArray(data) ? data : [])).catch(() => setChildren([]));
  }, [centerId]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const params = new URLSearchParams();
    if (nannyId) params.set('nannyId', nannyId);
    if (centerId) params.set('centerId', centerId);
    params.set('start', first.toISOString());
    params.set('end', last.toISOString());
    fetchWithRefresh(`${API_URL}/assignments?${params.toString()}`, { credentials: 'include' })
      .then(res => res.json())
      .then(setAssignments).catch(() => setAssignments([]));
  }, [nannyId, currentDate, centerId]);

  const monthGrid = getMonthGrid(currentDate);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(currentDate);
  const shortWeekDays = Array.from({ length: 7 }).map((_, i) => {
    // compute a date for each weekday starting Monday
    const d = getWeekDates(new Date())[i];
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  });

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
  <div className="text-lg md:text-2xl font-bold text-gray-900 capitalize">{monthLabel}</div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg></button>
          <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-500"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
        </div>
      </div>
      <div className="block w-full">
        <div className="grid grid-cols-7 gap-0">
          {shortWeekDays.map((day, i) => (
            <div key={i} className="text-center text-gray-700 font-bold text-xs py-2 border-b-2 border-gray-300 uppercase tracking-wide">{day}</div>
          ))}
          {monthGrid.flat().map((day, idx) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dayStr = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
        const assigns = assignments.filter(a => {
          const matchesDate = a.date.split('T')[0] === dayStr;
          const matchesNanny = nannyId ? (a.nanny && a.nanny.id === nannyId) : true;
          return matchesDate && matchesNanny;
        });
            return (
              <div
                key={idx}
                className={
                  "align-top p-1 h-full flex flex-col " +
                  (isToday ? 'border-2 border-brand-500 rounded-xl ' : 'border border-gray-300 ') +
                  (isCurrentMonth ? 'bg-white' : 'bg-gray-100 opacity-60') +
                  " relative cursor-pointer"
                }
                onClick={() => {
                  if (assigns.length > 0) {
                    setDayModal({ date: dayStr, assigns });
                    setSelectedIds([]);
                    setError('');
                    setSuccess('');
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={"text-xs font-bold cursor-pointer " + (isCurrentMonth ? 'text-gray-900' : 'text-gray-400')}>{day.getDate()}</span>
                  <button
                    className="text-brand-500 hover:text-brand-700 text-lg font-bold"
                    title={t('children.add')}
                    onClick={e => { e.stopPropagation(); setShowForm({ date: dayStr }); setSelectedChild(''); setError(''); }}
                  >+
                  </button>
                </div>
                  {assigns.length === 0 ? (
                  <div className="text-gray-300 text-xs">—</div>
                ) : (
                  assigns.slice(0, 2).map((a, j) => (
                    <div
                      key={a.id}
                      className={"flex items-center gap-1 mb-1 px-1 py-1 rounded-lg " + (j === 0 ? 'bg-brand-200/60' : 'bg-cream-100') + " shadow-sm group cursor-pointer"}
                      onClick={() => {
                        // open modal showing all assignments for this day
                        setDayModal({ date: dayStr, assigns });
                        setSelectedIds([]);
                        setError('');
                        setSuccess('');
                      }}
                    >
                      <span className={"w-2 h-2 rounded-full " + (j === 0 ? 'bg-brand-700' : 'bg-amber-600')}></span>
                      <span className="font-semibold text-gray-800 text-[11px] group-hover:underline hover:text-red-600 truncate max-w-[70px]" title={a.child.name}>{a.child.name}</span>
                    </div>
                  ))
                )}
                {assigns.length > 2 && (
                  <div className="text-xs text-gray-500 truncate max-w-[64px] sm:max-w-none">+{assigns.length - 2} autres</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    {showForm && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#0b5566]">Ajouter une affectation</h2>
                <p className="text-xs text-gray-400 leading-none mt-0.5">
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(showForm.date))}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setShowForm(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition text-xl leading-none">×</button>
          </div>
          {/* Body */}
          <form
            className="px-5 py-5 space-y-4"
            onSubmit={async e => {
              e.preventDefault();
              setError('');
              setSuccess('');
              if (!selectedChild) { setError('Sélectionnez un enfant'); return; }
              const assignsForDay = assignments.filter(a => a.date.split('T')[0] === showForm.date && a.nanny.id === nannyId);
              if (assignsForDay.some(a => a.child.id === selectedChild)) {
                setError('Cet enfant est déjà assigné ce jour-là');
                return;
              }
              const [year, month, day] = showForm.date.split('-');
              const isoDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
              const res = await fetch(`${API_URL}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ date: isoDate, childId: selectedChild, nannyId }),
              });
              if (!res.ok) { setError("Erreur lors de l'ajout"); return; }
              setSuccess('Enfant ajouté au planning !');
              setTimeout(() => { setShowForm(null); setSelectedChild(''); setSuccess(''); }, 1200);
              const yearNow = currentDate.getFullYear();
              const monthNow = currentDate.getMonth();
              const first = new Date(yearNow, monthNow, 1);
              const last = new Date(yearNow, monthNow + 1, 0);
              fetch(`${API_URL}/assignments?nannyId=${nannyId}&start=${first.toISOString()}&end=${last.toISOString()}`, { credentials: 'include' })
                .then(res => res.json()).then(setAssignments);
              notifyPaymentHistory();
            }}
          >
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Enfant <span className="text-red-400">*</span></label>
              {children.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucun enfant disponible.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {children.map(child => {
                    const selected = selectedChild === child.id;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => setSelectedChild(child.id)}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                          selected ? 'bg-[#0b5566] text-white border-[#0b5566] shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-[#0b5566] hover:text-[#0b5566]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${selected ? 'bg-white/20 text-white' : 'bg-[#e6f4f7] text-[#0b5566]'}`}>
                            {child.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{child.name}</span>
                        </div>
                        {selected && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            {success && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>{success}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Annuler</button>
              <button type="submit" disabled={!selectedChild} className="flex-[2] py-2.5 rounded-xl bg-[#0b5566] text-white text-sm font-bold shadow hover:bg-[#08323a] transition disabled:opacity-40 disabled:cursor-not-allowed">Ajouter</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {dayModal && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setDayModal(null); setSelectedIds([]); }}>
        <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Drag handle (mobile only) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-[#e6f4f7] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#0b5566]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {t('children.present_on', {
                  date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(dayModal.date))
                })}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{dayModal.assigns.length} enfant{dayModal.assigns.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => { setDayModal(null); setSelectedIds([]); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {!(user && user.role === 'nanny') ? (
              <>
                {dayModal.assigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <p className="text-sm text-gray-500">{t('children.none_on_date', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(dayModal.date)) })}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayModal.assigns.map(a => {
                      const isSelected = selectedIds.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setSelectedIds(prev =>
                              isSelected ? prev.filter(id => id !== a.id) : [...prev, a.id]
                            );
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                            isSelected ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${isSelected ? 'bg-red-100 text-red-600' : 'bg-[#e6f4f7] text-[#0b5566]'}`}>
                              {a.child.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className={`font-semibold text-sm truncate ${isSelected ? 'text-red-700' : 'text-gray-800'}`}>{a.child.name}</div>
                              <div className="text-xs text-gray-400 truncate">{a.nanny.name}</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'}`}>
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                {success && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>{success}</p>}
              </>
            ) : (
              <div className="space-y-2">
                {dayModal.assigns.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white">
                    <div className="w-9 h-9 rounded-xl bg-[#e6f4f7] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#0b5566]">
                      {a.child.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{a.child.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!(user && user.role === 'nanny') && dayModal.assigns.length > 0 && (
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setDayModal(null); setSelectedIds([]); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                className="flex-[2] py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold shadow hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={async () => {
                  if (selectedIds.length === 0) return;
                  try {
                    const res = await fetchWithRefresh(`${API_URL}/assignments`, {
                      method: 'DELETE',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ids: selectedIds }),
                    });
                    if (res.ok) {
                      const count = selectedIds.length;
                      setAssignments(prev => prev.filter(a => !selectedIds.includes(a.id)));
                      setDayModal(null);
                      setSelectedIds([]);
                      setSuccess(t('children.delete_selected_success', { n: count.toString() }) as unknown as string);
                      notifyPaymentHistory();
                    } else {
                      setError('Erreur lors de la suppression');
                    }
                  } catch (err) {
                    console.error(err);
                    setError('Erreur lors de la suppression');
                  }
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                {t('children.delete_selected')}{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
}
