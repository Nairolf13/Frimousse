import { useEffect, useState } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const meta = import.meta as { env?: { VITE_API_URL?: string } };
const API_URL = meta?.env?.VITE_API_URL ?? '/api';

type Detail = { childName: string; daysPresent: number; ratePerDay: number; subtotal: number };
type RecordType = { id: string; parent: { id?: string; firstName?: string; lastName?: string; email?: string | null; phone?: string | null } | null; total: number; details: Detail[]; createdAt?: string | null; paid?: boolean; invoiceNumber?: string };

export default function PaymentHistoryPage() {
  const { t, locale } = useI18n();
  const [isShortLandscape, setIsShortLandscape] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-height: 600px) and (orientation: landscape)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange); else mql.addListener(onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => { try { if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange); else mql.removeListener(onChange); } catch { /* ignore */ } window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange); };
  }, []);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [data, setData] = useState<RecordType[]>([]);
  const [loading, setLoading] = useState(false);
  const [parentFilter, setParentFilter] = useState<string>(''); 
  const [error, setError] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>('');
  const { user } = useAuth();

  function showModal(message: string) {
    setModalMessage(message);
    setModalVisible(true);
  }

  const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    fetchWithRefresh(`${API_URL}/payment-history/${year}/${month}`, { credentials: 'include' })
      .then(async res => {
        const ct = res.headers.get('content-type') || '';
        if (!res.ok) {
          let text;
          try { text = await res.clone().text(); } catch (e) { text = String(e); }
          throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
        }
        if (!ct.includes('application/json')) {
          const text = await res.text();
          throw new Error('Unexpected non-JSON response from API: ' + text.slice(0, 200));
        }
        return res.json();
      })
      .then(d => { if (mounted) setData(Array.isArray(d) ? d : []); })
      .catch(err => { console.error('Failed to fetch payment history', err); if (mounted) setData([]); if (mounted) setError(String(err.message || err)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [year, month]);


  const parents = Array.from(new Map(
    data.filter(r => r.parent && r.parent.id).map(r => [r.parent!.id!, r.parent!])
  ).values());
  const filtered = data.filter(r => {
    if (parentFilter) {
      if (!r.parent || r.parent.id !== parentFilter) return false;
    }
    return true;
  });

  const totalRevenue = data.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const familiesActive = data.length;
  // Nombre de paiements en attente : seules les entrées non marquées payées ET avec un montant strictement > 0
  const unpaidCount = data.filter(r => (Number(r.total) || 0) > 0 && !r.paid).length;

  function downloadCSVForAll() {
    const rows: string[] = [];
    rows.push(['Parent','Email','Phone','Child','Days','Rate','Subtotal','Total'].join(','));
    data.forEach(r => {
      const parentName = r.parent ? `${r.parent.firstName || ''} ${r.parent.lastName || ''}`.trim() : '';
      const email = r.parent?.email || '';
      const phone = r.parent?.phone || '';
      (r.details || []).forEach(d => {
        rows.push([`"${parentName}"`,`"${email}"`,`"${phone}"`,`"${d.childName}"`,String(d.daysPresent),String(d.ratePerDay),String(d.subtotal),String(r.total)].join(','));
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${year}-${String(month).padStart(2,'0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  

  async function downloadInvoice(paymentId: string, filename?: string) {
    try {
      setLoading(true);
      const res = await fetchWithRefresh(`${API_URL}/payment-history/invoice/${paymentId}`, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
          // For 403 we show a friendly modal message to the user instead of raw server text
          if (res.status === 403) {
          // Try to extract a clean message from JSON or plain text.
          let friendly = t('payments.errors.invoice_not_ready');
          if (text && text.trim().length > 0) {
            const t = text.trim();
            try {
              const parsed = JSON.parse(t);
              if (parsed && typeof parsed === 'object') {
                if (typeof parsed.message === 'string' && parsed.message.trim()) {
                  friendly = parsed.message.trim();
                } else if (typeof parsed.error === 'string' && parsed.error.trim()) {
                  friendly = parsed.error.trim();
                } else {
                  // pick first string value inside object if available
                  const firstString = Object.values(parsed).find(v => typeof v === 'string' && v.trim());
                  if (typeof firstString === 'string') friendly = firstString.trim();
                }
              } else if (t.length < 500) {
                friendly = t;
              }
            } catch {
              // not JSON, use trimmed text if reasonable length
              if (t.length < 500) friendly = t;
            }
          }
          showModal(friendly);
          return;
        }
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/pdf')) {
        const text = await res.text().catch(() => '');
        throw new Error('Unexpected response when fetching invoice: ' + text);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `invoice-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Invoice download failed', err);
      const isErrWithMessage = (e: unknown): e is { message: string } => {
        if (!e || typeof e !== 'object') return false;
        const rec = e as Record<string, unknown>;
        return 'message' in rec && typeof rec['message'] === 'string';
      };
      const msg = ((): string => {
        if (!err) return '';
        if (typeof err === 'string') return err;
        if (isErrWithMessage(err)) return err.message;
        try { return JSON.stringify(err); } catch { return String(err); }
      })();
  // Use the app modal instead of a native alert for nicer UX
  showModal(msg || t('payments.errors.invoice_download'));
    } finally {
      setLoading(false);
    }
  }

  async function sendInvoice(paymentId: string) {
    try {
      setLoading(true);
      const res = await fetchWithRefresh(`${API_URL}/payment-history/${paymentId}/send`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        let text = await res.text().catch(() => '');
        try { const j = JSON.parse(text || '{}'); if (j && j.message) text = j.message; } catch { /* ignore */ }
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = await res.json().catch(() => ({}));
      showModal(json && json.message ? String(json.message) : t('payments.invoice_sent', 'Facture envoyée'));
    } catch (err: unknown) {
      console.error('Failed to send invoice', err);
      let msg = 'Erreur';
      if (err instanceof Error) msg = err.message;
      else if (typeof err === 'string') msg = err;
      else {
        try { msg = JSON.stringify(err); } catch { msg = String(err || 'Erreur'); }
      }
      showModal(msg || t('payments.errors.invoice_download'));
    } finally {
      setLoading(false);
    }
  }

  async function togglePaid(id: string, paid: boolean) {
    // optimistic update
  setData(d => d.map(r => r.id === id ? { ...r, paid } : r));
    try {
      const res = await fetch(`${API_URL}/payment-history/${id}/paid`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid })
      });
      if (!res.ok) {
        throw new Error('Failed to update');
      }
      const json = await res.json();
      // replace with server record if provided
      if (json && json.record) {
        setData(d => d.map(r => r.id === id ? json.record : r));
      }
    } catch (err) {
      console.error('Failed to toggle paid', err);
      // revert optimistic
      setData(d => d.map(r => r.id === id ? { ...r, paid: !paid } : r));
      showModal('Erreur lors de la mise à jour du statut de paiement.');
    }
  }


  return (
    <div className={`relative z-0 min-h-screen bg-[#fcfcff] p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight" style={{ color: '#0b5566' }}>{t('page.payments')}</h1>
            <div className="text-base md:text-lg font-medium mb-4 md:mb-6" style={{ color: '#08323a' }}>{t('page.payments.description')}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              <div className="flex gap-2 items-center flex-wrap justify-center md:justify-start w-full md:w-auto">
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border p-2 rounded w-36">
                  {monthNames.map((name, idx) => <option key={idx} value={idx + 1}>{name}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="border p-2 rounded w-36">
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex flex-1 w-full">
                <select value={parentFilter} onChange={e => setParentFilter(e.target.value)} className="border p-2 rounded w-full md:w-64">
                  <option value="">{t('payments.filter.all_parents')}</option>
                  {parents.map((p, idx) => {
                    const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '—';
                    return <option key={p?.id || idx} value={p?.id || ''}>{name}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:space-x-2">
              <button onClick={async () => {
                if (!parentFilter) { showModal(t('payments.errors.select_parent')); return; }
                const rec = data.find(r => r.parent && r.parent.id === parentFilter);
                if (!rec) { showModal(t('payments.errors.no_record_parent')); return; }
                await downloadInvoice(rec.id, `facture-${year}-${String(month).padStart(2,'0')}-${rec.parent?.lastName || rec.id}.pdf`);
              }} className="bg-blue-500 text-white px-4 py-2 rounded w-full md:w-32 text-center">{t('payments.download_invoice')}</button>
              <button onClick={downloadCSVForAll} className="bg-green-500 text-white px-4 py-2 rounded w-full md:w-32 text-center">{t('payments.export_csv')}</button>
              <button onClick={() => window.print()} className="bg-red-500 text-white px-4 py-2 rounded w-full md:w-32 text-center">{t('payments.print')}</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
            <div className="text-sm text-gray-500">{t('payments.card.month_revenue')}</div>
            <div className="text-2xl font-bold mt-1">{new Intl.NumberFormat(locale || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(totalRevenue)}</div>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
            <div className="text-sm text-gray-500">{t('payments.card.families_active')}</div>
            <div className="text-2xl font-bold mt-1">{familiesActive}</div>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
            <div className="text-sm text-gray-500">{t('payments.card.unpaid')}</div>
            <div className="text-2xl font-bold mt-1">{unpaidCount}</div>
          </div>
        </div>

        <div className="grid gap-4">
            {modalVisible && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={() => setModalVisible(false)} />
                <div role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc" className="relative max-w-md w-full bg-white rounded-lg shadow-lg p-6 mx-4">
                  <h3 id="modal-title" className="text-lg font-semibold text-gray-900">Information</h3>
                  <p id="modal-desc" className="mt-3 text-sm text-gray-700">{modalMessage}</p>
                  <div className="mt-6 flex justify-end">
                    <button onClick={() => setModalVisible(false)} className="px-4 py-2 bg-green-600 text-white rounded">OK</button>
                  </div>
                </div>
              </div>
            )}
          {error && <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded">{error}</div>}
          {loading && <div>{t('loading')}</div>}
          {!loading && filtered.length === 0 && <div className="text-gray-500">{t('payments.history.empty')}</div>}
          {filtered.map(rec => (
            <div key={rec.id} className="rounded-lg overflow-hidden shadow">
              {/* Family header gradient */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 md:p-6 bg-gradient-to-r from-green-50 to-green-100 gap-4">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">{(rec.parent ? `${rec.parent.firstName || ''}`.slice(0,1) + (rec.parent?.lastName || '').slice(0,1) : '--').toUpperCase()}</div>
                   <div>
                     <div className="text-lg font-bold text-gray-900">{rec.parent ? `${rec.parent.firstName || ''} ${rec.parent.lastName || ''}`.trim() : t('common.none')}</div>
                     <div className="text-sm text-gray-500">{rec.parent?.email ?? ''}{rec.parent?.phone ? ` • ${rec.parent?.phone}` : ''}</div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="flex items-center justify-end gap-2">
                     <div className="text-xs text-gray-500">
                       {rec.invoiceNumber ? <span className="mr-2 font-medium">{rec.invoiceNumber}</span> : null}
                       {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('fr-FR') : ''}
                     </div>
                     { rec.paid ? <div className="text-sm text-green-700 font-semibold bg-green-100 px-3 py-1 rounded-full">{t('payments.status.paid')}</div> : <div className="text-sm text-gray-500">{t('payments.status.unpaid')}</div> }
                     {user && (user.role === 'admin' || (user.role && user.role.toLowerCase().includes('super'))) && (
                       <button onClick={() => togglePaid(rec.id, !rec.paid)} className="text-sm px-2 py-1 bg-blue-500 text-white rounded">{rec.paid ? t('payments.actions.mark_unpaid') : t('payments.actions.mark_paid')}</button>
                     )}
                   </div>
                 </div>
               </div>

               {/* Detail by child header */}
               <div className="px-6 py-4 bg-white border-t">
                 <div className="text-sm text-gray-600 font-medium mb-3">{t('payments.detail.header', { month: new Date(year, month-1).toLocaleString(locale || 'fr-FR', { month: 'long', year: 'numeric' }) })}</div>
                 <div className="space-y-3">
                   {Array.isArray(rec.details) && rec.details.length > 0 ? rec.details.map((d, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center font-bold">{(d.childName || '').slice(0,1).toUpperCase()}</div>
                        <div>
                          <div className="font-semibold text-gray-800">{d.childName}</div>
                          <div className="text-xs text-gray-400">{/* age/group not available */}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                    <div className="text-gray-500"><span className="inline-block mr-2">📅</span>{d.daysPresent} {t('payments.days')}</div>
                    <div className="text-green-600 font-semibold mt-1">{d.daysPresent} × {new Intl.NumberFormat(locale || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(d.ratePerDay)} = {new Intl.NumberFormat(locale || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(d.subtotal)}</div>
                      </div>
                    </div>
                   )) : (
                     <div className="text-gray-500">{t('payments.no_child_this_month')}</div>
                   )}
                 </div>
               </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 md:p-6 bg-gradient-to-r from-green-50 to-green-100 gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{t('payments.family.total_label')}</div>
                  <div className="text-xs text-gray-500">{Array.isArray(rec.details) ? t('payments.family.summary', { n: String(rec.details.length), days: String(rec.details.reduce((s,d)=>s+(d.daysPresent||0),0)) }) : ''}</div>
                </div>
                <div className="flex items-center gap-4 flex-col md:flex-row w-full md:w-auto">
                  <div className="text-2xl font-extrabold text-green-700">{new Intl.NumberFormat(locale || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(rec.total))}</div>
                  <div className="w-full md:w-auto flex justify-center md:justify-end">
                    <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => sendInvoice(rec.id)} className="px-4 py-2 bg-blue-500 text-white rounded text-sm w-full md:w-auto text-center">{t('assistant.send.button', 'Envoyer')}</button>
                      <a href="#" onClick={e => { e.preventDefault(); downloadInvoice(rec.id, `facture-${year}-${String(month).padStart(2,'0')}-${rec.parent?.lastName || rec.id}.pdf`); }} className="px-4 py-2 bg-green-600 text-white rounded text-sm w-full md:w-auto text-center">{rec.invoiceNumber ? `${t('payments.download_invoice')} (${rec.invoiceNumber})` : t('payments.download_invoice')}</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
