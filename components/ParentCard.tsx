import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useI18n } from '../src/lib/useI18n';

import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useAuth } from '../src/context/AuthContext';
import { useCenterSettings } from '../src/context/CenterSettingsContext';

type ChildRef = { child: { id: string; name: string; group?: string; prescriptionUrl?: string | null } };

type Parent = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  children?: ChildRef[];
};

import InvoiceAdjustmentModal from './InvoiceAdjustmentModal';
import parentService from '../services/parent';

export default function ParentCard({ parent, color, parentDue, onChildClick, onEdit, onDelete, onAdjustmentSaved }: { parent: Parent; color?: string; parentDue?: number; onChildClick?: (child: { id: string; name: string; group?: string }) => void; onEdit?: (p: Parent) => void; onDelete?: (id: string) => void; onAdjustmentSaved?: () => void }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const initials = ((parent.firstName && parent.lastName) ? `${parent.firstName[0] || ''}${parent.lastName[0] || ''}` : (parent.name || 'U')).toUpperCase().slice(0,2);
  const [isDeleting, setIsDeleting] = useState(false);
  const { settings: centerSettings } = useCenterSettings();
  const annualPerChild = centerSettings.childCotisationAmount;
  const API_URL = import.meta.env.VITE_API_URL;

  // map childId -> { url?, loading }
  const [prescriptions, setPrescriptions] = useState<Record<string, { url?: string | null; loading?: boolean }>>({});
  const [prescriptionModal, setPrescriptionModal] = useState<{ open: boolean; url?: string | null; childName?: string | null }>({ open: false, url: null, childName: null });
  // Do not prefetch prescriptions for all children to avoid unnecessary 404/403 calls.
  // We'll fetch on-demand via `openPrescription` when the user clicks.

  const { user } = useAuth();
  const uLike = user as unknown as { role?: string | null; parentId?: string | null } | null;
  const isCurrentParent = !!(uLike && typeof uLike.role === 'string' && uLike.role === 'parent' && uLike.parentId === parent.id);
  const isAdminUser = !!(uLike && typeof uLike.role === 'string' && (uLike.role.toLowerCase().includes('admin') || uLike.role.toLowerCase().includes('super')));

  const [showAdjModal, setShowAdjModal] = useState(false);
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const [hasAdjustment, setHasAdjustment] = useState(false);
  const [adjustmentSum, setAdjustmentSum] = useState(0);

  // load adjustment state when component mounts or parent/month changes
  useEffect(() => {
    const load = async () => {
      try {
        const adj = await parentService.getAdjustments(parent.id, currentMonth);
        const sum = (adj || []).reduce((a, x) => a + (x.amount || 0), 0);
        setAdjustmentSum(sum);
        setHasAdjustment(sum > 0);
      } catch (e) {
        console.error('failed to load adjustments for parent card', e);
      }
    };
    load();
  }, [parent.id, currentMonth]);

  // try to tolerate different backend field names for phone/email
  const parentRecord = parent as Record<string, unknown>;
  const phoneVal = String(parentRecord['phone'] ?? parentRecord['telephone'] ?? parentRecord['tel'] ?? parentRecord['mobile'] ?? '');
  const emailVal = String(parentRecord['email'] ?? parentRecord['mail'] ?? parentRecord['emailAddress'] ?? '');
  const addressVal = String(parentRecord['address'] ?? '');
  const postalCodeVal = String(parentRecord['postalCode'] ?? '');
  const cityVal = String(parentRecord['city'] ?? '');
  // do not display region/country in the card per UX request
  if (import.meta.env.DEV && !phoneVal && !emailVal) {
    // helpful debug when admin summary lacks contact fields
  }

  const uploadPrescription = async (childId: string, file: File | null) => {
    if (!file) return;
    setPrescriptions(prev => ({ ...prev, [childId]: { ...(prev[childId] || {}), loading: true } }));
    try {
      const fd = new FormData();
      fd.append('prescription', file);
      const res = await fetchWithRefresh(`${API_URL}/children/${childId}/prescription`, { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const body = await res.json();
      setPrescriptions(prev => ({ ...prev, [childId]: { url: body.url || null, loading: false } }));
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Upload error', err);
      else console.error('Upload error', err instanceof Error ? err.message : String(err));
      setPrescriptions(prev => ({ ...prev, [childId]: { url: null, loading: false } }));
      alert('Échec de l\'upload de l\'ordonnance.');
    }
  };

  const deletePrescription = async (childId: string) => {
    if (!confirm('Supprimer l\'ordonnance pour cet enfant ?')) return;
    setPrescriptions(prev => ({ ...prev, [childId]: { ...(prev[childId] || {}), loading: true } }));
    try {
      const res = await fetchWithRefresh(`${API_URL}/children/${childId}/prescription`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
      setPrescriptions(prev => ({ ...prev, [childId]: { url: null, loading: false } }));
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Delete error', err);
      else console.error('Delete error', err instanceof Error ? err.message : String(err));
      setPrescriptions(prev => ({ ...prev, [childId]: { ...(prev[childId] || {}), loading: false } }));
      alert('Échec de la suppression de l\'ordonnance.');
    }
  };

  // fetch prescription URL; return url or null (do not open a new tab)
  const openPrescription = async (childId: string): Promise<string | null> => {
    setPrescriptions(prev => ({ ...prev, [childId]: { ...(prev[childId] || {}), loading: true } }));
    try {
      const res = await fetchWithRefresh(`${API_URL}/children/${childId}/prescription`, { credentials: 'include' });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(b.message || 'Aucune ordonnance disponible');
        setPrescriptions(prev => ({ ...prev, [childId]: { url: null, loading: false } }));
        return null;
      }
      const body = await res.json();
      setPrescriptions(prev => ({ ...prev, [childId]: { url: body.url || null, loading: false } }));
      return body.url || null;
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Failed to open prescription', err);
      else console.error('Failed to open prescription', err instanceof Error ? err.message : String(err));
      setPrescriptions(prev => ({ ...prev, [childId]: { ...(prev[childId] || {}), loading: false } }));
      alert('Erreur lors de la récupération de l\'ordonnance');
      return null;
    }
  };

  return (
    <>
    <div className={`rounded-2xl shadow-sm border border-white/60 ${color || 'bg-white'} relative flex flex-col h-full ${hasAdjustment ? 'ring-2 ring-yellow-400' : ''}`} style={{ minHeight: 420 }}>
      {/* Face avant */}
      <div className={`flex flex-col h-full ${isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

        {/* Header carte */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-black/5">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-extrabold text-white flex-shrink-0 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>
            {parent.avatarUrl ? (
              <img src={parent.avatarUrl} alt={`${parent.firstName || parent.name || 'Utilisateur'} avatar`} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 truncate text-base leading-tight">
              {(parent.firstName || parent.lastName) ? `${parent.firstName || ''} ${parent.lastName || ''}`.trim() : (parent.name || '—')}
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white text-emerald-700 px-2.5 py-1 rounded-full shadow-sm border border-emerald-100">
              {(() => {
                const childCount = parent.children ? parent.children.length : 0;
                return t('parent.children.count', '{n} enfant(s)').replace('{n}', String(childCount));
              })()}
            </span>
          </div>
        </div>

        {/* Infos contact */}
        <div className="px-5 py-3 space-y-1.5 border-b border-black/5">
          <div className="flex items-center gap-2 text-sm">
            <svg className={`w-3.5 h-3.5 flex-shrink-0 ${phoneVal ? 'text-[#0b5566]' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            {phoneVal ? <a href={`tel:${phoneVal.replace(/\s+/g, '')}`} className="text-[#0b5566] hover:underline truncate touch-manipulation">{phoneVal}</a> : <span className="text-gray-400 text-xs">—</span>}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className={`w-3.5 h-3.5 flex-shrink-0 ${emailVal ? 'text-[#0b5566]' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            {emailVal ? <a href={`mailto:${emailVal}`} className="text-[#0b5566] hover:underline truncate touch-manipulation">{emailVal}</a> : <span className="text-gray-400 text-xs">—</span>}
          </div>
          <div className="flex items-start gap-2 text-sm">
            <svg className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${addressVal ? 'text-[#0b5566]' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <div className="leading-snug min-w-0">
              {addressVal ? <div className="truncate text-gray-700">{addressVal}</div> : <span className="text-gray-400 text-xs">—</span>}
              {(postalCodeVal || cityVal) && <div className="truncate text-gray-500 text-xs">{[postalCodeVal, cityVal].filter(Boolean).join(' ')}</div>}
            </div>
          </div>
        </div>

        {/* Enfants */}
        <div className="px-5 py-3 flex-1 overflow-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {t('parent.children.label', 'Enfants')}
          </div>
          <div className="flex flex-wrap gap-2 min-h-[100px]">
            {(parent.children || []).map(c => (
              <div key={c.child.id} className="bg-white/80 rounded-xl p-2.5 border border-white shadow-sm w-[7.5rem] flex flex-col justify-between gap-1">
                <button
                  onClick={() => { if (onChildClick) { onChildClick(c.child); } else navigate(`/parent/child/${c.child.id}/reports`); }}
                  className="text-left text-sm font-semibold text-[#0b5566] hover:underline truncate block"
                  aria-label={`Voir les rapports de ${c.child.name}`}>
                  <span className="truncate block">{c.child.name}</span>
                  {c.child.group ? <span className="text-xs text-gray-400 font-normal">({c.child.group})</span> : null}
                </button>
                <div className="min-h-[18px] flex items-center">
                  {(() => {
                    const known = (c.child as { prescriptionUrl?: string | null }).prescriptionUrl || (prescriptions[c.child.id] && prescriptions[c.child.id].url);
                    const shouldShow = isCurrentParent || !!known;
                    if (!shouldShow) return <div className="w-full h-4" aria-hidden />;
                    return (
                      <button onClick={async () => {
                        const knownUrl = (prescriptions[c.child.id] && prescriptions[c.child.id].url) || (c.child as { prescriptionUrl?: string | null }).prescriptionUrl;
                        let url = knownUrl || null;
                        if (!url) url = await openPrescription(c.child.id);
                        if (url) setPrescriptionModal({ open: true, url, childName: c.child.name });
                      }} className="text-xs text-emerald-700 hover:underline">{t('children.prescription.view_button')}</button>
                    );
                  })()}
                </div>
                {isCurrentParent && (
                  <div className="flex items-center gap-1">
                    <input id={`presc-${c.child.id}`} type="file" accept="image/*,.pdf" className="hidden" onChange={async (e) => {
                      const f = e.target.files ? e.target.files[0] : null;
                      await uploadPrescription(c.child.id, f);
                      (e.target as HTMLInputElement).value = '';
                    }} />
                    <label htmlFor={`presc-${c.child.id}`} className="text-xs bg-[#0b5566] text-white px-1.5 py-0.5 rounded-lg cursor-pointer">{t('parent.prescription.upload')}</label>
                    {prescriptions[c.child.id] && prescriptions[c.child.id].url ? (
                      <button onClick={() => deletePrescription(c.child.id)} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-lg">{t('parent.prescription.delete')}</button>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer cotisation + actions */}
        <div className="px-5 pb-5 pt-3 border-t border-black/5">
          {(annualPerChild > 0 || centerSettings.dailyRate > 0) && (
          <div className="bg-white/60 rounded-xl px-3 py-2.5 mb-3 text-center">
            {centerSettings.dailyRate > 0 && (
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <span className="text-xs text-gray-500">{t('parent.cotisation.this_month')} :</span>
                <span className="font-extrabold text-[#0b5566] text-base">{(parentDue || 0)} €</span>
                {hasAdjustment && <span title={t('adjustment.exists')} className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" />}
              </div>
            )}
            {centerSettings.dailyRate > 0 && adjustmentSum > 0 && <div className="text-xs text-yellow-600">{t('adjustment.label')} {adjustmentSum.toFixed(2)} €</div>}
            {annualPerChild > 0 && <div className="text-xs text-gray-400 mt-0.5">{t('parent.cotisation.annual_total')} : <span className="font-bold text-gray-700">{((parent.children?.length || 0) * annualPerChild)} €</span></div>}
          </div>
          )}
          {isAdminUser && (annualPerChild > 0 || centerSettings.dailyRate > 0) && (
            <div className="text-center mb-2">
              <button className="text-xs font-semibold text-[#0b5566] hover:underline" onClick={() => setShowAdjModal(true)}>{t('adjustment.button')}</button>
            </div>
          )}
          <div className="flex justify-center gap-2">
            {onEdit && (
              <button onClick={() => { if (onEdit) onEdit(parent); }} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 hover:text-[#0b5566] hover:border-[#0b5566]/30 rounded-xl shadow-sm touch-manipulation transition text-xs font-medium" title={t('children.action.edit')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg>
                {t('children.action.edit')}
              </button>
            )}
            {onDelete && (
              <button onClick={() => setIsDeleting(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 hover:text-red-500 hover:border-red-200 rounded-xl shadow-sm touch-manipulation transition text-xs font-medium" title={t('children.action.delete')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                {t('children.action.delete')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Face arrière (confirmation suppression) */}
      {isDeleting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-2xl shadow-xl p-8 z-10">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </div>
          <div className="text-lg font-bold mb-1 text-gray-900 text-center">{t('modal.delete.title')}</div>
          <div className="text-sm text-gray-500 mb-6 text-center">{t('parent.delete.confirm_body')}</div>
          <div className="flex gap-3 w-full">
            <button onClick={() => setIsDeleting(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition">{t('modal.cancel')}</button>
            <button onClick={() => { if (onDelete) onDelete(String(parent.id)); }} className="flex-1 bg-red-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition">{t('children.action.delete')}</button>
          </div>
        </div>
      )}
    </div>
      {/* Prescription preview modal */}
      {prescriptionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-2xl relative mx-4">
            <button onClick={() => setPrescriptionModal({ open: false, url: null })} className="absolute top-3 right-3 text-gray-500">×</button>
            <div className="text-lg font-bold mb-2">Ordonnance de {prescriptionModal.childName || 'cet enfant'}</div>
            <div className="w-full h-[50vh] sm:h-[70vh] flex items-center justify-center overflow-auto">
              {prescriptionModal.url && prescriptionModal.url.endsWith('.pdf') ? (
                <iframe src={prescriptionModal.url ?? undefined} className="w-full h-full" title="Ordonnance PDF" />
              ) : (
                <img src={prescriptionModal.url || ''} alt="Ordonnance" className="h-full w-auto object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
      {showAdjModal && (
        <InvoiceAdjustmentModal
          parentId={parent.id}
          month={currentMonth}
          onClose={() => setShowAdjModal(false)}
          onSaved={async () => { setShowAdjModal(false); if (onAdjustmentSaved) onAdjustmentSaved();
              try {
                const adj = await parentService.getAdjustments(parent.id, currentMonth);
                const sum = (adj || []).reduce((a, x) => a + (x.amount || 0), 0);
                setAdjustmentSum(sum);
                setHasAdjustment(sum > 0);
              } catch (e) {
                console.error('refresh badge', e);
              }
            }}
        />
      )}
    </>
  );
}
