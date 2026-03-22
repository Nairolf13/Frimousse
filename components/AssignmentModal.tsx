import { useEffect, useState } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';

const API_URL = import.meta.env.VITE_API_URL;

interface Child {
  id: string;
  name: string;
  // optional list of assigned nanny ids coming from the API
  nannyIds?: string[];
  // backend may return childNannies: [{ nanny: { id, name } }]
  childNannies?: Array<{ nanny?: { id: string; name?: string } }>;
}
interface Nanny {
  id: string;
  name: string;
}
interface AssignmentFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { date: string; childId: string; nannyId: string }) => void;
  initial?: { date: string; childId: string; nannyId: string };
}

export default function AssignmentModal({ open, onClose, onSave, initial }: AssignmentFormProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [nannies, setNannies] = useState<Nanny[]>([]);
  const [form, setForm] = useState(initial || { date: '', childId: '', nannyId: '' });

  useEffect(() => {
    if (open) {
      fetchWithRefresh(`${API_URL}/children`, { credentials: 'include' })
        .then(res => res.json())
        .then(setChildren);
      fetchWithRefresh(`${API_URL}/nannies`, { credentials: 'include' })
        .then(res => res.json())
        .then(setNannies);
      setForm(initial || { date: '', childId: '', nannyId: '' });
    }
  }, [open, initial]);

  // When a child is selected, prefer showing only the nannies assigned to that child.
  const selectedChild = children.find(c => c.id === form.childId);
  // Support both shapes: nannyIds (simple array) or childNannies (array of { nanny })
  let visibleNannyIds: Set<string> | null = null;
  if (selectedChild) {
    if (Array.isArray(selectedChild.nannyIds) && selectedChild.nannyIds.length > 0) {
      visibleNannyIds = new Set(selectedChild.nannyIds);
    } else if (Array.isArray(selectedChild.childNannies) && selectedChild.childNannies.length > 0) {
      const ids = selectedChild.childNannies.map(cn => cn && cn.nanny && cn.nanny.id).filter(Boolean) as string[];
      if (ids.length > 0) visibleNannyIds = new Set(ids);
    }
  }
  const visibleNannies = visibleNannyIds ? nannies.filter(n => visibleNannyIds!.has(n.id)) : nannies;

  // If the currently selected nanny is not in the visible list, clear it.
  useEffect(() => {
    if (!form.nannyId) return;
    const selChild = children.find(c => c.id === form.childId);
    let isVisible = true;
    if (selChild) {
      if (Array.isArray(selChild.nannyIds)) isVisible = selChild.nannyIds.includes(form.nannyId);
      else if (Array.isArray(selChild.childNannies)) {
        const ids = selChild.childNannies.map(cn => cn && cn.nanny && cn.nanny.id).filter(Boolean) as string[];
        isVisible = ids.includes(form.nannyId);
      }
    }
    if (!isVisible) setForm(f => ({ ...f, nannyId: '' }));
  }, [form.childId, form.nannyId, children]);

  const { t } = useI18n();

  if (!open) return null;

  const isEdit = !!initial?.childId;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Drag handle (mobile) */}
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
            <p className="text-xs text-gray-400 mt-0.5">Remplissez les informations ci-dessous</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex-1 px-5 py-4 space-y-4">
            {/* Date */}
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
                  style={{ boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Enfant */}
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

            {/* Nounou */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('assignment.modal.nanny')} <span className="text-red-400">*</span>
              </label>
              {visibleNannies.length === 0 ? (
                <p className="text-sm text-gray-400 italic">{form.childId ? 'Aucune nounou assignée à cet enfant.' : 'Sélectionnez d\'abord un enfant.'}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {visibleNannies.map(nanny => {
                    const selected = form.nannyId === nanny.id;
                    return (
                      <button
                        key={nanny.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, nannyId: nanny.id }))}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                          selected ? 'bg-[#0b5566] text-white border-[#0b5566] shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-[#0b5566] hover:text-[#0b5566]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${selected ? 'bg-white/20 text-white' : 'bg-[#e6f4f7] text-[#0b5566]'}`}>
                            {nanny.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{nanny.name}</span>
                        </div>
                        {selected && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!form.date || !form.childId || !form.nannyId}
              className="flex-[2] py-2.5 rounded-xl bg-[#0b5566] text-white text-sm font-bold shadow hover:bg-[#08323a] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEdit ? (t('global.edit') || t('global.save')) : t('global.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
