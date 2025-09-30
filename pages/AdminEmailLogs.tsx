import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { HiOutlineCheck, HiOutlineClock, HiOutlineExclamationCircle, HiOutlineEye, HiOutlineDownload, HiOutlineRefresh, HiOutlineDocumentText, HiOutlineSearch } from 'react-icons/hi';

type EmailLog = {
  id: string;
  createdAt: string;
  recipients: string;
  subject: string | null;
  status: string;
  errorText: string | null;
  bypassOptOut: boolean;
  paymentHistory: { id: string; month?: number; year?: number; total?: number; createdAt?: string } | null;
};

// shortRecipients removed — desktop now shows parsed recipients and mobile shows full chips

function timeAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `il y a ${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `il y a ${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    return `il y a ${d}j`;
  } catch {
    return '';
  }
}

// month grid helpers (copied/adapted from NannyCalendar)
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
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}


export default function AdminEmailLogs() {
  const API_URL = import.meta.env.VITE_API_URL ?? '/api';
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState<Record<string, boolean>>({});
  const [disabledAfterResend, setDisabledAfterResend] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  // default to current month in YYYY-MM
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  // month/year controls (like PaymentHistory)
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const [recipientFilter, setRecipientFilter] = useState('');

  // no native month picker used; selection handled by month/year selects and modal

  // Calendar modal state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const handleSelectDay = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
    setShowCalendarModal(false);
  };

  // debounce query so we don't fetch on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  // when debounced query or month changes, reset to first page
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, selectedMonth]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('limit', '50');
        params.set('page', String(page));
        if (debouncedQuery) params.set('q', debouncedQuery);
        if (selectedMonth) params.set('month', selectedMonth);
        const res = await fetchWithRefresh(`/api/admin/emaillogs?${params.toString()}`, { credentials: 'include', signal: controller.signal });
        if (!mounted) return;
        if (res.status === 403) {
          setError('Accès refusé — administrateur requis.');
          setLogs([]);
          setTotal(null);
          return;
        }
        if (!res.ok) throw new Error('Erreur serveur');
        const json = await res.json();
        setLogs(Array.isArray(json.data) ? json.data : []);
        setTotal(json.meta && typeof json.meta.total === 'number' ? json.meta.total : null);
      } catch (e: unknown) {
        // Detect fetch abort in a type-safe manner
  if (typeof e === 'object' && e !== null && 'name' in e && (e as { name?: unknown }).name === 'AbortError') return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; controller.abort(); };
  }, [page, debouncedQuery, selectedMonth]);

  // keep selectedMonth in sync when month/year selects change
  useEffect(() => {
    setSelectedMonth(`${year}-${pad(month)}`);
  }, [month, year]);

  async function openInvoice(paymentId: string) {
    if (!paymentId) return;
    try {
      const res = await fetchWithRefresh(`${API_URL}/payment-history/invoice/${paymentId}`, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Erreur lors de la récupération du PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // revoke after a minute
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (e) {
      console.error('Failed to open invoice', e);
      alert('Impossible d\'ouvrir la facture.');
    }
  }

  async function downloadInvoice(paymentId: string, filename?: string) {
    if (!paymentId) return;
    try {
      const res = await fetchWithRefresh(`${API_URL}/payment-history/invoice/${paymentId}`, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Erreur lors du téléchargement');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `invoice-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (e) {
      console.error('Failed to download invoice', e);
      alert('Impossible de télécharger la facture.');
    }
  }

  async function resendEmail(logId: string) {
    if (!logId) return;
    try {
      setResending(s => ({ ...s, [logId]: true }));
      // Optimistic: mark loading state per log could be added; for simplicity, refetch page after
      const res = await fetchWithRefresh(`/api/admin/emaillogs/${logId}/resend`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setResending(s => { const c = { ...s }; delete c[logId]; return c; });
        throw new Error(text || 'Failed to resend');
      }
      // Refresh current page of logs
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('page', String(page));
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (selectedMonth) params.set('month', selectedMonth);
      const fresh = await fetchWithRefresh(`/api/admin/emaillogs?${params.toString()}`, { credentials: 'include' });
      if (fresh.ok) {
        const json = await fresh.json();
        setLogs(Array.isArray(json.data) ? json.data : []);
        setTotal(json.meta && typeof json.meta.total === 'number' ? json.meta.total : null);
        // mark related paymentHistory as disabled for further resends
        try {
          let phId: string | null = null;
          if (Array.isArray(json.data)) {
            const found = (json.data as EmailLog[]).find((it: EmailLog) => it && it.id === logId);
            if (found && found.paymentHistory) phId = found.paymentHistory.id;
          }
          if (!phId) {
            const original = logs.find(l => l.id === logId);
            phId = original && original.paymentHistory ? original.paymentHistory.id : null;
          }
          if (phId) setDisabledAfterResend(s => ({ ...s, [phId]: true }));
        } catch (err) {
          console.error('Unable to mark disabledAfterResend', err);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Erreur lors du renvoi : ' + msg);
    } finally {
      setResending(s => { const c = { ...s }; delete c[logId]; return c; });
      setLoading(false);
    }
  }

  // Helpers to parse recipients and filter logs (used for export)
  function parseRecipientsField(recipientsField: string): string[] {
    try {
      const parsed = JSON.parse(recipientsField || '[]');
      if (Array.isArray(parsed)) return parsed.map(String);
      return [String(parsed)];
    } catch {
      return (recipientsField || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    }
  }

  function getFilteredLogs(): EmailLog[] {
    return logs.filter(l => {
      const recips: string[] = parseRecipientsField(l.recipients || '');
      if (recipientFilter && !recips.includes(recipientFilter)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(String(l.subject || '').toLowerCase().includes(q) || recips.join(' ').toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }

  function csvEscape(value: unknown) {
    if (value == null) return '';
    const s = String(value);
    return `"${s.replace(/"/g, '""')}"`;
  }

  function hasSentForPayment(paymentHistoryId: string) {
    if (!paymentHistoryId) return false;
    return logs.some(l => l.paymentHistory && l.paymentHistory.id === paymentHistoryId && String(l.status).toLowerCase() === 'sent');
  }

  function exportCsv() {
    try {
      const rows: string[][] = [];
      const header = ['createdAt', 'subject', 'recipients', 'invoiceNumber', 'paymentHistoryId', 'total', 'status', 'errorText'];
      rows.push(header);
      const filtered = getFilteredLogs();
      for (const l of filtered) {
        const recips = parseRecipientsField(l.recipients || '').join('; ');
        let invoiceNumber = '';
        let paymentHistoryId = '';
        let total = '';
        if (l.paymentHistory) {
          paymentHistoryId = l.paymentHistory.id;
          const invoiceDate = l.paymentHistory.createdAt ? new Date(l.paymentHistory.createdAt) : new Date();
          invoiceNumber = `FA-${invoiceDate.getFullYear()}-${String(l.paymentHistory.id).slice(0,6)}`;
          if (typeof l.paymentHistory.total === 'number') total = l.paymentHistory.total.toFixed(2);
        }
        rows.push([
          csvEscape(new Date(l.createdAt).toISOString()),
          csvEscape(l.subject || ''),
          csvEscape(recips),
          csvEscape(invoiceNumber),
          csvEscape(paymentHistoryId),
          csvEscape(total),
          csvEscape(l.status),
          csvEscape(l.errorText || '')
        ]);
      }
      const csvContent = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emaillogs-${selectedMonth || 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (e) {
      console.error('Export CSV failed', e);
      alert('Impossible d\'exporter les logs.');
    }
  }

  // pagination helpers
  const limit = 50;
  const totalPages = total && total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const hasPrev = page > 1;
  const hasNext = total !== null ? page < totalPages : logs.length === limit;

  // status helpers
  const getStatusInfo = (status: string | undefined) => {
    // normalize
    const s = String(status || '').toLowerCase();
    if (s === 'sent' || s === 'ok' || s === 'delivered') {
      return {
        label: 'Envoyé',
        badge: 'bg-green-100 text-green-800',
        icon: <HiOutlineCheck className="w-4 h-4 mr-2" />
      };
    }
    if (s === 'pending' || s === 'processing' || s === 'in_progress' || s === 'queued') {
      return {
        label: 'En cours',
        badge: 'bg-yellow-100 text-yellow-800',
        icon: <HiOutlineClock className="w-4 h-4 mr-2" />
      };
    }
    // default to error
    return {
      label: 'Erreur',
      badge: 'bg-red-100 text-red-800',
      icon: <HiOutlineExclamationCircle className="w-4 h-4 mr-2" />
    };
  };

  // expanded state removed — mobile cards now show full info with actions

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <Sidebar />
  <main className="flex-1 flex flex-col items-center pt-16 pb-12 px-3 md:pt-8 md:pb-8 md:px-4 md:ml-64 box-border">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Journal des emails</h1>
            <div className="text-sm text-gray-500">Total&nbsp;: {total ?? '—'}</div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded">{error}</div>
          )}

          <>
            {loading && <div className="mb-4">Chargement...</div>}
              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-4">
                {/** compute visible logs applying recipient and query filters */}
                {(() => {
                  const v = logs.filter(l => {
                    // recipients
                    let recips: string[] = [];
                    try {
                      const parsed = JSON.parse(l.recipients || '[]');
                      if (Array.isArray(parsed)) recips = parsed.map(String);
                      else recips = [String(parsed)];
                    } catch {
                      recips = (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
                    }
                    if (recipientFilter && !recips.includes(recipientFilter)) return false;
                    if (query) {
                      const q = query.toLowerCase();
                      if (!(String(l.subject || '').toLowerCase().includes(q) || recips.join(' ').toLowerCase().includes(q))) return false;
                    }
                    return true;
                  });
                  return v.map(l => {
                  let recips: string[] = [];
                  try {
                    const parsed = JSON.parse(l.recipients || '[]');
                    if (Array.isArray(parsed)) recips = parsed.map(String);
                    else recips = [String(parsed)];
                  } catch {
                    recips = (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
                  }
                  const primaryDot = l.status === 'sent' ? 'bg-green-500' : 'bg-red-500';
                          return (
                            <div key={l.id} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#eef9ff] flex items-center justify-center text-[#0b5566] font-semibold"><HiOutlineDocumentText className="w-5 h-5" /></div>
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="text-lg font-bold text-gray-900">{l.subject || 'Facture'}</div>
                              {(() => {
                                const s = getStatusInfo(l.status);
                                return (
                                  <div className={`ml-2 text-sm font-medium px-2 py-1 rounded-full ${s.badge} flex items-center`}>{s.icon}<span>{s.label}</span></div>
                                );
                              })()}
                            </div>
                            {/* redundant subject line removed — title already shows the subject */}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs text-gray-400">Date d'envoi</div>
                        <div className="text-sm text-gray-800 font-medium">{new Date(l.createdAt).toLocaleString()}</div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs text-gray-400">Destinataires</div>
                        <div className="mt-2 flex flex-col gap-2">
                          {recips.length ? recips.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-md px-3 py-2">
                              <span className={`${primaryDot} w-2 h-2 rounded-full block`} />
                              <span className="text-sm text-gray-800 break-words">{r}</span>
                            </div>
                          )) : (
                            <div className="text-sm text-gray-600">—</div>
                          )}
                        </div>
                      </div>

                      {l.errorText ? (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md text-red-700">
                          <div className="flex items-start gap-3">
                            <div className="text-xl">⚠️</div>
                            <div>
                              <div className="font-semibold">Erreur d'envoi</div>
                              <div className="text-sm mt-1">{l.errorText}</div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 flex items-center justify-center gap-3">
                        {l.status === 'sent' ? (
                          <>
                            <button
                              onClick={() => l.paymentHistory && openInvoice(l.paymentHistory.id)}
                              disabled={!l.paymentHistory}
                              aria-label="Voir la facture"
                              className={`w-10 h-10 flex items-center justify-center rounded-full border text-gray-600 ${!l.paymentHistory ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <HiOutlineEye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => l.paymentHistory && downloadInvoice(l.paymentHistory.id, `facture-${l.paymentHistory ? l.paymentHistory.id : l.id}.pdf`)}
                              disabled={!l.paymentHistory}
                              title="Télécharger"
                              className={`w-10 h-10 flex items-center justify-center rounded-full border text-gray-600 ${!l.paymentHistory ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <HiOutlineDownload className="w-5 h-5" />
                            </button>
                          </>
                          ) : (
                          <button
                            title="Renvoyer"
                            onClick={() => resendEmail(l.id)}
                            disabled={!!resending[l.id] || !!(l.paymentHistory && (disabledAfterResend[l.paymentHistory.id] || hasSentForPayment(l.paymentHistory.id)))}
                            className={`w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white ${resending[l.id] || (l.paymentHistory && (disabledAfterResend[l.paymentHistory.id] || hasSentForPayment(l.paymentHistory.id))) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <HiOutlineRefresh className="w-5 h-5" />
                          </button>
                        )}
                        <button title="Plus" className="w-10 h-10 flex items-center justify-center rounded-full border text-gray-600">•••</button>
                      </div>

                      <div className="mt-3 text-xs text-gray-400 text-center">Dernière tentative {timeAgo(l.createdAt)}</div>
                    </div>
                  );
                  });
                })()}
              </div>

              {/* Desktop/tablet: gestion des factures layout */}
              <div className="hidden md:block">
                <div className="bg-white rounded-2xl shadow p-6">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex-1 flex items-center gap-4">
                      <h2 className="text-xl font-semibold">Gestion des Factures</h2>
                      <div className="flex items-center bg-gray-50 rounded-md px-3 py-2 gap-3">
                        <HiOutlineSearch className="w-4 h-4 text-gray-400" />
                        <input aria-label="search" value={query} onChange={e => setQuery(e.target.value)} className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none" placeholder="Rechercher par sujet, destinataire..." />
                      </div>
                      <div className="ml-2 flex items-center gap-2">
                        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                          {monthNames.map((mName, idx) => <option key={mName} value={idx + 1}>{mName}</option>)}
                        </select>
                        <select value={year} onChange={e => setYear(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="ml-2">
                          <select value={recipientFilter} onChange={e => setRecipientFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
                            <option value="">Tous les destinataires</option>
                            {Array.from(new Set(logs.flatMap(l => {
                              try { const p = JSON.parse(l.recipients || '[]'); return Array.isArray(p) ? p.map(String) : [String(p)]; } catch { return (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean); }
                            }))).map((r, idx) => <option key={idx} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => exportCsv()} className="flex items-center gap-2 bg-green-500 text-white rounded px-3 py-2 text-sm" aria-label="export">
                        <HiOutlineDocumentText className="w-4 h-4" />
                        Exporter
                      </button>
                      <button className="p-2 border rounded" aria-label="refresh" onClick={() => { setPage(1); setQuery(''); setSelectedMonth(''); }}>
                        <HiOutlineRefresh className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="text-left text-sm text-gray-500 border-b">
                        <tr>
                          <th className="py-3 px-4">Sujet</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Destinataires</th>
                          <th className="py-3 px-4">N° Facture</th>
                          <th className="py-3 px-4">Statut</th>
                          <th className="py-3 px-4">Erreur</th>
                          <th className="py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(() => {
                          const v = logs.filter(l => {
                            let recips: string[] = [];
                            try {
                              const parsed = JSON.parse(l.recipients || '[]');
                              if (Array.isArray(parsed)) recips = parsed.map(String);
                              else recips = [String(parsed)];
                            } catch {
                              recips = (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
                            }
                            if (recipientFilter && !recips.includes(recipientFilter)) return false;
                            if (query) {
                              const q = query.toLowerCase();
                              if (!(String(l.subject || '').toLowerCase().includes(q) || recips.join(' ').toLowerCase().includes(q))) return false;
                            }
                            return true;
                          });
                          return v.map(l => {
                          // recipients first line
                          let recips: string[] = [];
                          try {
                            const parsed = JSON.parse(l.recipients || '[]');
                            if (Array.isArray(parsed)) recips = parsed.map(String);
                            else recips = [String(parsed)];
                          } catch {
                            recips = (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
                          }
                          const firstRecip = recips[0] || '';
                          const statusIsSent = l.status === 'sent';
                          return (
                            <tr key={l.id} className="hover:bg-gray-50 align-top">
                              <td className="py-4 px-4 w-1/3">
                                <div className="text-sm font-medium text-gray-900">{l.subject || 'Facture mensuelle'}</div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-700">
                                <div>{new Date(l.createdAt).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-700 max-w-xs">
                                <div className="flex items-center gap-3">
                                  <span className={`w-2 h-2 rounded-full ${statusIsSent ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <div className="flex flex-col">
                                    <div className="text-sm text-gray-800">{firstRecip}</div>
                                    {recips[1] && <div className="text-xs text-gray-400">{recips.slice(1, 2).join(', ')}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-blue-600">
                                {l.paymentHistory ? (
                                  <div>
                                    {(() => {
                                      const ph = l.paymentHistory;
                                      if (!ph) return null;
                                      const invoiceDate = ph.createdAt ? new Date(ph.createdAt) : new Date();
                                      const invoiceNumber = `FA-${invoiceDate.getFullYear()}-${String(ph.id).slice(0,6)}`;
                                      return (
                                        <>
                                          <div className="font-medium">{invoiceNumber}</div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="py-4 px-4">
                                {(() => {
                                  const s = getStatusInfo(l.status);
                                  return <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${s.badge}`}>{s.icon}<span>{s.label}</span></div>;
                                })()}
                              </td>
                              <td className="py-4 px-4 text-sm text-red-600 max-w-xs">{l.errorText ? <div className="font-medium">{l.errorText}</div> : '-'}</td>
                              <td className="py-4 px-4 text-sm">
                                <div className="flex items-center gap-2">
                                  {statusIsSent ? (
                                    <>
                                      <button title="Voir" disabled={!l.paymentHistory} onClick={() => l.paymentHistory && openInvoice(l.paymentHistory.id)} className={`p-2 rounded border text-gray-600 ${!l.paymentHistory ? 'opacity-50 cursor-not-allowed' : ''}`}><HiOutlineEye className="w-4 h-4" /></button>
                                      <button title="Télécharger" disabled={!l.paymentHistory} onClick={() => l.paymentHistory && downloadInvoice(l.paymentHistory.id, `facture-${l.paymentHistory ? l.paymentHistory.id : l.id}.pdf`)} className={`p-2 rounded border text-gray-600 ${!l.paymentHistory ? 'opacity-50 cursor-not-allowed' : ''}`}><HiOutlineDownload className="w-4 h-4" /></button>
                                    </>
                                  ) : (
                                    <button
                                      title="Renvoyer"
                                      onClick={() => resendEmail(l.id)}
                                      disabled={!!resending[l.id] || !!(l.paymentHistory && (disabledAfterResend[l.paymentHistory.id] || hasSentForPayment(l.paymentHistory.id)))}
                                      className={`p-2 rounded bg-red-500 text-white ${resending[l.id] || (l.paymentHistory && (disabledAfterResend[l.paymentHistory.id] || hasSentForPayment(l.paymentHistory.id))) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                      <HiOutlineRefresh className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button title="Plus" className="p-2 rounded border text-gray-600">•••</button>
                                </div>
                              </td>
                            </tr>
                          );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                    <div className="mt-6 bg-gray-50 rounded p-6 text-center">
                    <div className="text-sm text-gray-600">Affichage de {total ? `${(page - 1) * limit + 1} à ${Math.min(page * limit, total)}` : (logs.length ? `1 à ${logs.length}` : '—')} sur {total ?? '—'} résultats</div>
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <button className="px-3 py-1 border rounded" onClick={() => setPage(Math.max(1, page - 1))} disabled={!hasPrev}>Précédent</button>
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full border">{page}</div>
                      <button className="px-3 py-1 border rounded" onClick={() => hasNext && setPage(page + 1)} disabled={!hasNext}>Suivant</button>
                    </div>
                  </div>
                </div>
              </div>
            </>
        </div>
      </main>
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Choisir un mois</div>
              <button className="text-gray-500" onClick={() => setShowCalendarModal(false)}>✕</button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(calendarDate)}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="px-2 py-1 border rounded">‹</button>
                  <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="px-2 py-1 border rounded">›</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                {getMonthGrid(calendarDate).flat().slice(0,7).map((d, i) => (
                  <div key={i}>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d)}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getMonthGrid(calendarDate).flat().map((d, idx) => {
                  const isCurrentMonth = d.getMonth() === calendarDate.getMonth();
                  return (
                    <button key={idx} onClick={() => handleSelectDay(d)} className={`p-2 rounded ${isCurrentMonth ? 'bg-[#f8f8fc]' : 'bg-gray-50 opacity-60'}`}>
                      <div className="text-sm text-gray-800">{d.getDate()}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
