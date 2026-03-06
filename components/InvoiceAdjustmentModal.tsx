import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../src/lib/useI18n';
import parentService from '../services/parent';

interface Adjustment {
  id: string;
  amount: number;
  comment?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
}

interface Props {
  parentId: string;
  month?: string; // YYYY-MM, defaults to current
  onClose: () => void;
  onSaved?: () => void;
}

export default function InvoiceAdjustmentModal({ parentId, month, onClose, onSaved }: Props) {
  const { t, locale } = useI18n();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const showModal = (msg: string) => {
    setModalMessage(msg);
    setModalVisible(true);
  };

  const currentMonth = month || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  })();

  // notify page components that payment history changed for this month
  const notifyPaymentHistory = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const payload = { year: y, month: m };
    try {
      const Win = window as unknown as { BroadcastChannel?: typeof BroadcastChannel };
      if (Win.BroadcastChannel) {
        const bc = new Win.BroadcastChannel('__frimousse_payment_history__');
        bc.postMessage(payload);
        bc.close();
      }
    } catch {}
    try { localStorage.setItem('__frimousse_payment_history__', JSON.stringify(payload)); } catch {}
    try { window.dispatchEvent(new CustomEvent('paymentHistory:changed', { detail: payload })); } catch {}
  };

  // human‑readable month for display (e.g. "mars 2026")
  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    if (!y || !m) return ym;
    try {
      const d = new Date(y, m - 1);
      return d.toLocaleString(locale, { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await parentService.getAdjustments(parentId, currentMonth);
      setAdjustments(data || []);
    } catch (e) {
      console.error('Failed to load adjustments', e);
      showModal(t('adjustment.load_error'));
    }
    setLoading(false);
  }, [parentId, currentMonth, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    const amt = parseFloat(amount.replace(',', '.'));
    if (!amt || amt <= 0) {
      showModal(t('adjustment.invalid_amount'));
      return;
    }
    setSaving(true);
    try {
      await parentService.createAdjustment(parentId, currentMonth, amt, comment);
      setAmount('');
      setComment('');
      await load();
      notifyPaymentHistory();
      if (onSaved) onSaved();
    } catch (e) {
      console.error('save adjustment error', e);
      showModal(t('adjustment.save_error'));
    }
    setSaving(false);
  };

  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    // perform after user confirmed
    try {
      await parentService.deleteAdjustment(parentId, id);
      await load();
      notifyPaymentHistory();
      if (onSaved) onSaved();
    } catch (e) {
      console.error('delete adjustment', e);
      showModal(t('adjustment.delete_error'));
    }
  };

  const confirmDelete = (id: string) => {
    setDeletePendingId(id);
  };

  return createPortal(
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm backdrop-brightness-75 flex items-center justify-center z-50" style={{WebkitBackdropFilter: 'blur(6px)'}}>
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-bold mb-4">{t('adjustment.title', { month: formatMonth(currentMonth) })}</h2>
        {loading ? (
          <div>{t('adjustment.loading')}</div>
        ) : (
          <div className="space-y-4">
            {adjustments.length > 0 ? (
              <ul className="space-y-2 max-h-40 overflow-auto">
                {adjustments.map(adj => (
                  <li key={adj.id} className="flex justify-between items-center">
                    <div>
                      {adj.amount.toFixed(2)}€{adj.comment ? ` – ${adj.comment}` : ''}
                    </div>
                    <button className="text-red-500 text-sm" onClick={() => confirmDelete(adj.id)}>{t('adjustment.delete')}</button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">{t('adjustment.none')}</div>
            )}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium">
                {t('adjustment.amount')} (€)
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1" />
              </label>
              <label className="block text-sm font-medium mt-2">
                {t('adjustment.comment')} ({t('adjustment.optional')})
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1" />
              </label>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 border rounded">{t('adjustment.cancel')}</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">{saving ? t('adjustment.saving') : t('adjustment.save')}</button>
              </div>
            </div>
          </div>
        )}
        {modalVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setModalVisible(false)} />
            <div role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc" className="relative max-w-md w-full bg-white rounded-lg shadow-lg p-6 mx-4">
              <h3 id="modal-title" className="text-lg font-semibold text-gray-900">{t('common.info') || 'Information'}</h3>
              <p id="modal-desc" className="mt-3 text-sm text-gray-700">{modalMessage}</p>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setModalVisible(false)} className="px-4 py-2 bg-green-600 text-white rounded">OK</button>
              </div>
            </div>
          </div>
        )}
        {deletePendingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeletePendingId(null)} />
            <div role="dialog" aria-modal="true" className="relative max-w-md w-full bg-white rounded-lg shadow-lg p-6 mx-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('common.confirm') || 'Confirm'}</h3>
              <p className="mt-3 text-sm text-gray-700">{t('adjustment.confirm_delete')}</p>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setDeletePendingId(null)} className="px-4 py-2 border rounded">{t('global.cancel') || 'Cancel'}</button>
                <button onClick={async () => {
                    if (deletePendingId) {
                      await handleDelete(deletePendingId);
                    }
                    setDeletePendingId(null);
                  }} className="px-4 py-2 bg-red-600 text-white rounded">{t('global.delete') || 'Delete'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
