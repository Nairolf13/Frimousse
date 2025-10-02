import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useI18n } from '../src/lib/useI18n';

import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useAuth } from '../src/context/AuthContext';

type ChildRef = { child: { id: string; name: string; group?: string; prescriptionUrl?: string | null } };

type Parent = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  children?: ChildRef[];
};

export default function ParentCard({ parent, color, parentDue, onChildClick, onEdit, onDelete, annualPerChild }: { parent: Parent; color?: string; parentDue?: number; onChildClick?: (child: { id: string; name: string; group?: string }) => void; onEdit?: (p: Parent) => void; onDelete?: (id: string) => void; annualPerChild?: number }) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const initials = ((parent.firstName && parent.lastName) ? `${parent.firstName[0] || ''}${parent.lastName[0] || ''}` : (parent.name || 'U')).toUpperCase().slice(0,2);
  const [isDeleting, setIsDeleting] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  // map childId -> { url?, loading }
  const [prescriptions, setPrescriptions] = useState<Record<string, { url?: string | null; loading?: boolean }>>({});
  const [prescriptionModal, setPrescriptionModal] = useState<{ open: boolean; url?: string | null; childName?: string | null }>({ open: false, url: null, childName: null });
  // Do not prefetch prescriptions for all children to avoid unnecessary 404/403 calls.
  // We'll fetch on-demand via `openPrescription` when the user clicks.

  const { user } = useAuth();
  const uLike = user as unknown as { role?: string | null; parentId?: string | null } | null;
  const isCurrentParent = !!(uLike && typeof uLike.role === 'string' && uLike.role === 'parent' && uLike.parentId === parent.id);

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
    console.debug('ParentCard: missing phone/email for parent', parent);
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
    <div className={`rounded-2xl shadow ${color || 'bg-white'} relative flex flex-col min-h-[420px] h-full transition-transform duration-500 perspective-1000`} style={{height:'100%', perspective: '1000px'}}>
      <div className={`w-full h-full transition-transform duration-500 ${isDeleting ? 'rotate-y-180' : ''}`} style={{transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%'}}>
  <div className={`absolute inset-0 w-full h-full p-5 flex flex-col ${isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-transparent`} style={{backfaceVisibility: 'hidden', overflow: 'hidden'}}>
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-2xl shadow border border-gray-100 font-bold text-purple-700">{initials}</div>
            <div className="truncate flex-1">
              <div className="font-semibold text-lg text-gray-900 truncate">{(parent.firstName || parent.lastName) ? `${parent.firstName || ''} ${parent.lastName || ''}`.trim() : (parent.name || '—')}</div>
            </div>
              <div className="ml-auto text-xs font-bold bg-white text-green-600 px-3 py-1 rounded-full shadow border border-green-100">
                {(() => {
                  const childCount = parent.children ? parent.children.length : 0;
                  if (locale === 'en') return `${childCount} ${childCount === 1 ? 'child' : 'children'}`;
                  // default to French rules
                  return `${childCount} ${childCount > 1 ? 'enfants' : 'enfant'}`;
                })()}
              </div>
          </div>

          <div className="text-sm text-gray-700 mb-4">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-gray-600 truncate flex items-center gap-2">
                <span aria-hidden className={`inline-block ${phoneVal ? '' : 'text-gray-300'}`}>📞</span>
                {phoneVal ? (
                  <a href={`tel:${phoneVal.replace(/\s+/g, '')}`} className="text-blue-600 hover:underline touch-manipulation" title={t('parent.form.phone')}>{phoneVal}</a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              <div className="text-sm text-gray-600 truncate flex items-center gap-2">
                <span aria-hidden className={`inline-block ${emailVal ? '' : 'text-gray-300'}`}>✉️</span>
                {emailVal ? (
                  <a href={`mailto:${emailVal}`} className="text-blue-600 hover:underline touch-manipulation" title={t('parent.form.email')}>{emailVal}</a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              <div className="text-sm text-gray-600 truncate flex items-start gap-2">
                <span aria-hidden className={`inline-block ${addressVal ? '' : 'text-gray-300'}`}>📍</span>
                <div className="leading-snug">
                  {addressVal ? <div className="truncate">{addressVal}</div> : <div className="text-gray-300">—</div>}
                  {(postalCodeVal || cityVal) ? <div className="truncate">{[postalCodeVal, cityVal].filter(Boolean).join(' ')}</div> : <div className="text-gray-300">—</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3 flex-1 overflow-auto">
            <div className="text-sm font-medium text-gray-700 mb-2">{(() => {
              const childCount = parent.children ? parent.children.length : 0;
              // singular for 0 or 1, plural for >1
              if (locale === 'en') return childCount <= 1 ? 'Child' : 'Children';
              return childCount <= 1 ? 'Enfant' : 'Enfants';
            })()}</div>
            <div className="flex flex-wrap gap-2 min-h-[120px]">
              {(parent.children || []).map(c => (
                <div key={c.child.id} className="bg-white rounded p-2 border w-32 h-20 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="w-20 min-w-[5rem]">{/* compact width for name/group/prescription */}
                      <button
                        onClick={() => { if (onChildClick) { onChildClick(c.child); } else navigate(`/parent/child/${c.child.id}/reports`); }}
                        className="text-left text-sm font-medium text-blue-700 hover:underline w-full text-ellipsis overflow-hidden block"
                        aria-label={`Voir les rapports de ${c.child.name}`}>
                        <div className="truncate">
                          <div className="truncate flex items-baseline gap-1">
                            <span className="truncate">{c.child.name}</span>
                            {c.child.group ? <span className="text-xs text-gray-500">({c.child.group})</span> : null}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                  {/* Voir l'ordonnance placé sous le groupe — espace réservé pour éviter le décalage entre cartes */}
                  <div className="mt-1 min-h-[18px] flex items-center">
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
                        }} className="text-xs text-green-700">{t('children.prescription.view_button')}</button>
                      );
                    })()}
                  </div>
                  <div className="mt-0 flex items-center gap-1 justify-end">
                    {isCurrentParent ? (
                      <>
                        <input id={`presc-${c.child.id}`} type="file" accept="image/*,.pdf" className="hidden" onChange={async (e) => {
                          const f = e.target.files ? e.target.files[0] : null;
                          await uploadPrescription(c.child.id, f);
                          // reset input
                          (e.target as HTMLInputElement).value = '';
                        }} />
                        <label htmlFor={`presc-${c.child.id}`} className="text-xs bg-[#0b5566] text-white px-2 py-1 rounded cursor-pointer">{t('parent.prescription.upload')}</label>
                        {prescriptions[c.child.id] && prescriptions[c.child.id].url ? (
                          <button onClick={() => deletePrescription(c.child.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{t('parent.prescription.delete')}</button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end">
            <div className="text-sm text-gray-700 mb-3 text-center">
              <div className="mb-1">{t('parent.cotisation.this_month')}: <span className="font-bold text-blue-700">{(parentDue || 0)}€</span></div>
              <div className="text-xs">{t('parent.cotisation.annual_total')}: <span className="font-bold text-gray-900">{((parent.children?.length || 0) * (annualPerChild ?? 15))}€</span></div>
            </div>
            <div className="flex justify-center gap-2">
              <button onClick={() => { if (onEdit) onEdit(parent); }} className="bg-white border border-gray-200 text-gray-500 hover:text-yellow-500 rounded-full p-2 shadow-sm touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center" title={t('children.action.edit')}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg>
              </button>
              <button onClick={() => setIsDeleting(true)} className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full p-2 shadow-sm touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center" title={t('children.action.delete')}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-white rounded-2xl shadow-xl p-8 ${isDeleting ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{backfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}}>
          <div className="text-red-500 text-4xl mb-2">🗑️</div>
          <div className="text-lg font-semibold mb-2 text-gray-900 text-center">{t('modal.delete.title')}</div>
          <div className="text-gray-500 mb-6 text-center">{t('parent.delete.confirm_body')}</div>
            <div className="flex gap-3 w-full">
            <button onClick={() => setIsDeleting(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition">{t('modal.cancel')}</button>
            <button onClick={() => { if (onDelete) onDelete(String(parent.id)); }} className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-red-600 transition">{t('children.action.delete')}</button>
          </div>
        </div>
      </div>
      {/* Prescription preview modal */}
      {prescriptionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-2xl relative mx-4">
            <button onClick={() => setPrescriptionModal({ open: false, url: null })} className="absolute top-3 right-3 text-gray-500">×</button>
            <div className="text-lg font-bold mb-2">Ordonnance de {prescriptionModal.childName || 'cet enfant'}</div>
            <div className="w-full h-[50vh] sm:h-[70vh] flex items-center justify-center overflow-auto">
              {prescriptionModal.url && prescriptionModal.url.endsWith('.pdf') ? (
                <iframe src={prescriptionModal.url} className="w-full h-full" title="Ordonnance PDF" />
              ) : (
                <img src={prescriptionModal.url || ''} alt="Ordonnance" className="h-full w-auto object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
