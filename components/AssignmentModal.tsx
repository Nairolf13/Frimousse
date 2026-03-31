import { useEffect, useState } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';

const API_URL = import.meta.env.VITE_API_URL;

interface Child {
  id: string;
  name: string;
  nannyIds?: string[];
  childNannies?: Array<{ nanny?: { id: string; name?: string } }>;
}
interface Nanny {
  id: string;
  name: string;
}
export interface AssignmentEntry {
  date: string;
  childId: string;
  nannyId: string;
}
interface AssignmentFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AssignmentEntry | AssignmentEntry[]) => void;
  initial?: { date: string; childId: string; nannyId: string };
}

export default function AssignmentModal({ open, onClose, onSave, initial }: AssignmentFormProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [nannies, setNannies] = useState<Nanny[]>([]);

  // Edit mode: single assignment
  const [form, setForm] = useState(initial || { date: '', childId: '', nannyId: '' });

  // Multi-select mode (creation only)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [selectedNannyId, setSelectedNannyId] = useState('');
  const [manualDates, setManualDates] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const { t } = useI18n();

  const isEdit = !!initial?.childId;

  useEffect(() => {
    if (open) {
      fetchWithRefresh(`${API_URL}/children`, { credentials: 'include' })
        .then(res => res.json())
        .then(setChildren);
      fetchWithRefresh(`${API_URL}/nannies`, { credentials: 'include' })
        .then(res => res.json())
        .then(setNannies);
      if (isEdit) {
        setForm(initial || { date: '', childId: '', nannyId: '' });
      } else {
        setSelectedChildIds([]);
        setSelectedNannyId('');
        setManualDates([]);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nannies visible selon enfants sélectionnés (union des nounous assignées)
  const visibleNannies: Nanny[] = (() => {
    if (isEdit) {
      const selectedChild = children.find(c => c.id === form.childId);
      if (!selectedChild) return nannies;
      let ids: Set<string> | null = null;
      if (Array.isArray(selectedChild.nannyIds) && selectedChild.nannyIds.length > 0) {
        ids = new Set(selectedChild.nannyIds);
      } else if (Array.isArray(selectedChild.childNannies) && selectedChild.childNannies.length > 0) {
        const arr = selectedChild.childNannies.map(cn => cn?.nanny?.id).filter(Boolean) as string[];
        if (arr.length > 0) ids = new Set(arr);
      }
      return ids ? nannies.filter(n => ids!.has(n.id)) : nannies;
    }
    if (selectedChildIds.length === 0) return nannies;
    const union = new Set<string>();
    for (const cid of selectedChildIds) {
      const child = children.find(c => c.id === cid);
      if (!child) continue;
      if (Array.isArray(child.nannyIds) && child.nannyIds.length > 0) {
        child.nannyIds.forEach(id => union.add(id));
      } else if (Array.isArray(child.childNannies) && child.childNannies.length > 0) {
        child.childNannies.forEach(cn => { if (cn?.nanny?.id) union.add(cn.nanny.id); });
      }
    }
    return union.size > 0 ? nannies.filter(n => union.has(n.id)) : nannies;
  })();

  // Clear nanny if no longer visible
  useEffect(() => {
    if (!isEdit && selectedNannyId && visibleNannies.length > 0 && !visibleNannies.find(n => n.id === selectedNannyId)) {
      setSelectedNannyId('');
    }
  }, [selectedChildIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate all dates in range (skip weekends) in local calendar day.
  function formatLocalDate(date: Date): string {
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  const selectedDates = manualDates;
  const canSubmitMulti = selectedChildIds.length > 0 && selectedNannyId && selectedDates.length > 0;
  const canSubmitEdit = form.date && form.childId && form.nannyId;

  function toggleChild(id: string) {
    setSelectedChildIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) {
      onSave(form);
      return;
    }
    const entries: AssignmentEntry[] = [];
    for (const date of selectedDates) {
      for (const childId of selectedChildIds) {
        entries.push({ date, childId, nannyId: selectedNannyId });
      }
    }
    onSave(entries);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
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
              {isEdit ? t('assignment.modal.title.edit') : t('assignment.modal.title.add')}
            </h2>
            {!isEdit && selectedDates.length > 0 && selectedChildIds.length > 0 && (
              <p className="text-xs text-[#0b5566] font-medium mt-0.5">
                {selectedChildIds.length} enfant{selectedChildIds.length > 1 ? 's' : ''} · {selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''} · {selectedChildIds.length * selectedDates.length} affectation{selectedChildIds.length * selectedDates.length > 1 ? 's' : ''}
              </p>
            )}
            {!isEdit && !(selectedDates.length > 0 && selectedChildIds.length > 0) && (
              <p className="text-xs text-gray-400 mt-0.5">Sélectionnez des enfants, jours et une nounou</p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex-1 px-5 py-4 space-y-4">

            {isEdit ? (
              /* ── MODE ÉDITION (un seul assignment) ── */
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('assignment.modal.date')} <span className="text-red-400">*</span>
                  </label>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      required
                      className="block w-full px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('assignment.modal.child')} <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.childId}
                      onChange={e => setForm(f => ({ ...f, childId: e.target.value }))}
                      required
                      className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 focus:border-[#0b5566] transition"
                    >
                      <option value="">{t('assignment.modal.select')}</option>
                      {children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('assignment.modal.nanny')} <span className="text-red-400">*</span>
                  </label>
                  {visibleNannies.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">{form.childId ? 'Aucune nounou assignée à cet enfant.' : "Sélectionnez d'abord un enfant."}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {visibleNannies.map(nanny => {
                        const selected = form.nannyId === nanny.id;
                        return (
                          <button key={nanny.id} type="button" onClick={() => setForm(f => ({ ...f, nannyId: nanny.id }))}
                            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${selected ? 'bg-[#0b5566] text-white border-[#0b5566] shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-[#0b5566] hover:text-[#0b5566]'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${selected ? 'bg-white/20 text-white' : 'bg-[#e6f4f7] text-[#0b5566]'}`}>{nanny.name.charAt(0).toUpperCase()}</div>
                              <span className="truncate">{nanny.name}</span>
                            </div>
                            {selected && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── MODE CRÉATION MULTIPLE ── */
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Sélection de jours <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                      className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                    >Préc.</button>
                    <span>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(calendarMonth)}</span>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                      className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                    >Suiv.</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-500 text-center mb-1">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, index) => <div key={`${d}-${index}`}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-xs mb-1">
                    {(() => {
                      const grid: Array<string | null> = [];
                      const year = calendarMonth.getFullYear();
                      const month = calendarMonth.getMonth();
                      const firstDay = new Date(year, month, 1);
                      const startWeekday = firstDay.getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      for (let i = 0; i < startWeekday; i += 1) grid.push(null);
                      for (let d = 1; d <= daysInMonth; d += 1) grid.push(formatLocalDate(new Date(year, month, d)));
                      while (grid.length % 7 !== 0) grid.push(null);
                      return grid.map((date, idx) => {
                        if (!date) { return <div key={`${calendarMonth.toISOString()}-empty-${idx}`} className="h-9 rounded-lg" />; }
                        const selected = manualDates.includes(date);
                        return (
                          <button
                            key={date}
                            type="button"
                            onClick={() => {
                              setManualDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date].sort());
                            }}
                            className={`h-9 rounded-lg text-center ${selected ? 'bg-[#0b5566] text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                          >
                            {Number(date.split('-')[2])}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  {manualDates.length > 0 ? (
                    <p className="text-xs text-gray-400">{manualDates.length} jour{manualDates.length > 1 ? 's' : ''} sélectionné{manualDates.length > 1 ? 's' : ''}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Aucun jour sélectionné</p>
                  )}
                </div>

                {/* Enfants (multi-sélection) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('assignment.modal.child')} <span className="text-red-400">*</span>
                    {selectedChildIds.length > 0 && <span className="ml-1.5 text-[#0b5566] normal-case font-bold">({selectedChildIds.length} sélectionné{selectedChildIds.length > 1 ? 's' : ''})</span>}
                  </label>
                  {children.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Aucun enfant disponible.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {children.map(child => {
                        const selected = selectedChildIds.includes(child.id);
                        return (
                          <button key={child.id} type="button" onClick={() => toggleChild(child.id)}
                            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${selected ? 'bg-[#0b5566] text-white border-[#0b5566] shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-[#0b5566] hover:text-[#0b5566]'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${selected ? 'bg-white/20 text-white' : 'bg-[#e6f4f7] text-[#0b5566]'}`}>{child.name.charAt(0).toUpperCase()}</div>
                              <span className="truncate">{child.name}</span>
                            </div>
                            {selected && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Nounou */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('assignment.modal.nanny')} <span className="text-red-400">*</span>
                  </label>
                  {visibleNannies.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">{selectedChildIds.length === 0 ? "Sélectionnez d'abord un enfant." : 'Aucune nounou assignée à ces enfants.'}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {visibleNannies.map(nanny => {
                        const selected = selectedNannyId === nanny.id;
                        return (
                          <button key={nanny.id} type="button" onClick={() => setSelectedNannyId(nanny.id)}
                            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${selected ? 'bg-[#0b5566] text-white border-[#0b5566] shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-[#0b5566] hover:text-[#0b5566]'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${selected ? 'bg-white/20 text-white' : 'bg-[#e6f4f7] text-[#0b5566]'}`}>{nanny.name.charAt(0).toUpperCase()}</div>
                              <span className="truncate">{nanny.name}</span>
                            </div>
                            {selected && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isEdit ? !canSubmitEdit : !canSubmitMulti}
              className="flex-[2] py-2.5 rounded-xl bg-[#0b5566] text-white text-sm font-bold shadow hover:bg-[#08323a] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEdit
                ? (t('global.edit') || t('global.save'))
                : canSubmitMulti
                  ? `Ajouter ${selectedChildIds.length * selectedDates.length} affectation${selectedChildIds.length * selectedDates.length > 1 ? 's' : ''}`
                  : t('global.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
