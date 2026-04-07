import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';
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
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL ?? '/api';
  const [isShortLandscape, setIsShortLandscape] = useState(false);
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
  const monthNames = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2020, i, 1)));
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 768px) and (max-height: 600px)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange); else mql.addListener(onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => { try { if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange); else mql.removeListener(onChange); } catch { /* ignore */ } window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange); };
  }, []);


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
      alert(t('admin.emaillogs.open_invoice_failed'));
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
      alert(t('admin.emaillogs.download_invoice_failed'));
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
      alert(t('admin.emaillogs.resend_failed', { msg }));
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
      alert(t('admin.emaillogs.export_failed'));
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
        label: t('emaillogs.status.sent'),
        badge: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
        icon: <HiOutlineCheck className="w-4 h-4 mr-2" />
      };
    }
    if (s === 'pending' || s === 'processing' || s === 'in_progress' || s === 'queued') {
      return {
        label: t('emaillogs.status.pending'),
        badge: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
        icon: <HiOutlineClock className="w-4 h-4 mr-2" />
      };
    }
    // default to error
    return {
      label: t('emaillogs.status.error'),
        badge: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      icon: <HiOutlineExclamationCircle className="w-4 h-4 mr-2" />
    };
  };

  // expanded state removed — mobile cards now show full info with actions

  return (
    <div className={`min-h-screen bg-surface p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">

        {/* Titre principal */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div className="pt-0.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary dark:text-accent">{t('settings.title')}</h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">{t('settings.description')}</p>
          </div>
        </div>

        {/* Flèche retour + nom de la sous-page */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-card shadow border border-border-default text-secondary hover:text-accent hover:border-accent transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h2 className="text-lg font-bold text-primary dark:text-accent">{t('admin.emaillogs.title')}</h2>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card rounded-2xl shadow-sm border border-border-default p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-input flex items-center justify-center flex-shrink-0">
              <HiOutlineDocumentText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-primary">{loading ? '…' : (total ?? logs.length)}</div>
              <div className="text-xs text-muted">{t('admin.emaillogs.stat.total')}</div>
            </div>
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border-default p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
              <HiOutlineCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-primary">{loading ? '…' : logs.filter(l => l.status === 'sent').length}</div>
              <div className="text-xs text-muted">{t('admin.emaillogs.stat.sent')}</div>
            </div>
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border-default p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
              <HiOutlineExclamationCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-primary">{loading ? '…' : logs.filter(l => l.status !== 'sent' && l.status !== 'pending').length}</div>
              <div className="text-xs text-muted">{t('admin.emaillogs.stat.errors')}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm px-4 py-3">
            <HiOutlineExclamationCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Filtres */}
        <div className="bg-card rounded-2xl shadow-sm border border-border-default p-4 mb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Recherche */}
              <div className="flex items-center gap-2 bg-input border border-border-default rounded-xl px-3 py-2.5 flex-1 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition">
                <HiOutlineSearch className="w-4 h-4 text-muted flex-shrink-0" />
                <input aria-label="search" value={query} onChange={e => setQuery(e.target.value)} className="bg-transparent text-sm text-primary placeholder-muted outline-none w-full" placeholder={t('admin.emaillogs.search_placeholder')} />
                {query && <button onClick={() => setQuery('')} className="text-muted hover:text-secondary flex-shrink-0">✕</button>}
              </div>
              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => exportCsv()} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow transition">
                  <HiOutlineDownload className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('admin.emaillogs.export_csv')}</span>
                </button>
                <button onClick={() => { setPage(1); setQuery(''); setSelectedMonth(defaultMonth); }} className="p-2.5 border border-border-default rounded-xl hover:bg-input transition" title={t('admin.emaillogs.refresh')}>
                  <HiOutlineRefresh className={`w-4 h-4 text-secondary ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Mois / Année */}
              <div className="flex gap-2 flex-1">
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="flex-1 border border-border-default rounded-xl px-3 py-2 text-sm text-primary bg-input focus:outline-none focus:ring-2 focus:ring-accent/20 capitalize">
                  {monthNames.map((mName, idx) => <option key={mName} value={idx + 1} className="capitalize">{mName}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-border-default rounded-xl px-3 py-2 text-sm text-primary bg-input focus:outline-none focus:ring-2 focus:ring-accent/20">
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {/* Destinataire */}
              <select value={recipientFilter} onChange={e => setRecipientFilter(e.target.value)} className="flex-1 border border-border-default rounded-xl px-3 py-2 text-sm text-primary bg-input focus:outline-none focus:ring-2 focus:ring-accent/20">
                <option value="">{t('admin.emaillogs.all_recipients')}</option>
                {Array.from(new Set(logs.flatMap(l => {
                  try { const p = JSON.parse(l.recipients || '[]'); return Array.isArray(p) ? p.map(String) : [String(p)]; } catch { return (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean); }
                }))).map((r, idx) => <option key={idx} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {(() => {
            const v = logs.filter(l => {
              let recips: string[] = [];
              try { const parsed = JSON.parse(l.recipients || '[]'); recips = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]; }
              catch { recips = (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean); }
              if (recipientFilter && !recips.includes(recipientFilter)) return false;
              if (query) { const q = query.toLowerCase(); if (!(String(l.subject || '').toLowerCase().includes(q) || recips.join(' ').toLowerCase().includes(q))) return false; }
              return true;
            });
            if (v.length === 0) return (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
                <div className="w-14 h-14 rounded-2xl bg-input flex items-center justify-center">
                  <HiOutlineDocumentText className="w-7 h-7 text-muted" />
                </div>
                <p className="text-sm">{t('admin.emaillogs.empty')}</p>
              </div>
            );
            return v.map(l => {
              let recips: string[] = [];
              try { const parsed = JSON.parse(l.recipients || '[]'); recips = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]; }
              catch { recips = (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean); }
              const s = getStatusInfo(l.status);
              const statusIsSent = l.status === 'sent';
              const statusIsError = l.status !== 'sent' && l.status !== 'pending';
              return (
                <div key={l.id} className={`bg-card rounded-2xl shadow-sm border-l-4 ${statusIsSent ? 'border-l-emerald-400' : statusIsError ? 'border-l-red-400' : 'border-l-amber-400'} border border-border-default p-4`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${statusIsSent ? 'bg-emerald-50' : statusIsError ? 'bg-red-50' : 'bg-amber-50'}`}>
                        <HiOutlineDocumentText className={`w-5 h-5 ${statusIsSent ? 'text-emerald-500' : statusIsError ? 'text-red-400' : 'text-amber-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{l.subject || t('payments.download_invoice')}</p>
                        <p className="text-xs text-muted mt-0.5">{new Date(l.createdAt).toLocaleDateString()} · {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.badge}`}>{s.icon}<span>{s.label}</span></div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {recips.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-secondary bg-input rounded-lg px-3 py-1.5">
                        <svg className="w-3 h-3 text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        <span className="truncate">{r}</span>
                      </div>
                    ))}
                    {l.paymentHistory && (() => {
                      const ph = l.paymentHistory;
                      const invoiceDate = ph.createdAt ? new Date(ph.createdAt) : new Date();
                      return (
                        <div className="flex items-center gap-2 text-xs text-accent bg-accent/10 rounded-lg px-3 py-1.5 font-medium">
                          <HiOutlineDocumentText className="w-3 h-3 flex-shrink-0" />
                          FA-{invoiceDate.getFullYear()}-{String(ph.id).slice(0,6)}
                          {ph.total != null && <span className="ml-auto font-bold">{ph.total.toFixed(2)} €</span>}
                        </div>
                      );
                    })()}
                    {l.errorText && (
                      <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-1.5">
                        <HiOutlineExclamationCircle className="w-3 h-3 flex-shrink-0" />{l.errorText}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border-default">
                    {statusIsSent ? (
                      <>
                        <button onClick={() => l.paymentHistory && openInvoice(l.paymentHistory!.id)} disabled={!l.paymentHistory} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border-default text-xs font-semibold text-secondary hover:bg-input transition ${!l.paymentHistory ? 'opacity-40 cursor-not-allowed' : ''}`}>
                          <HiOutlineEye className="w-4 h-4" /> Voir
                        </button>
                        <button onClick={() => l.paymentHistory && downloadInvoice(l.paymentHistory!.id, `facture-${l.paymentHistory!.id}.pdf`)} disabled={!l.paymentHistory} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border-default text-xs font-semibold text-secondary hover:bg-input transition ${!l.paymentHistory ? 'opacity-40 cursor-not-allowed' : ''}`}>
                          <HiOutlineDownload className="w-4 h-4" /> Télécharger
                        </button>
                      </>
                    ) : (
                      <button onClick={() => resendEmail(l.id)} disabled={!!resending[l.id] || !!(l.paymentHistory && (disabledAfterResend[l.paymentHistory.id] || hasSentForPayment(l.paymentHistory.id)))} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition ${resending[l.id] ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <HiOutlineRefresh className={`w-4 h-4 ${resending[l.id] ? 'animate-spin' : ''}`} /> Renvoyer
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block bg-card rounded-2xl shadow-sm border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-input border-b border-border-default">
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-3 px-5">{t('emaillogs.table.subject')}</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-3 px-5">{t('emaillogs.table.date')}</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-3 px-5">{t('emaillogs.table.recipients')}</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-3 px-5">{t('emaillogs.table.invoice_number')}</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-3 px-5">{t('emaillogs.table.status')}</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-3 px-5">{t('emaillogs.table.error')}</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-3 px-5">{t('emaillogs.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {(() => {
                  const v = logs.filter(l => {
                    let recips: string[] = [];
                    try { const parsed = JSON.parse(l.recipients || '[]'); recips = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]; }
                    catch { recips = (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean); }
                    if (recipientFilter && !recips.includes(recipientFilter)) return false;
                    if (query) { const q = query.toLowerCase(); if (!(String(l.subject || '').toLowerCase().includes(q) || recips.join(' ').toLowerCase().includes(q))) return false; }
                    return true;
                  });
                  if (v.length === 0) return (
                    <tr><td colSpan={7} className="py-16 text-center text-muted text-sm">Aucun email trouvé</td></tr>
                  );
                  return v.map(l => {
                    let recips: string[] = [];
                    try { const parsed = JSON.parse(l.recipients || '[]'); recips = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]; }
                    catch { recips = (l.recipients || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean); }
                    const firstRecip = recips[0] || '';
                    const statusIsSent = l.status === 'sent';
                    const s = getStatusInfo(l.status);
                    return (
                      <tr key={l.id} className="hover:bg-input transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-input flex items-center justify-center flex-shrink-0">
                              <HiOutlineDocumentText className="w-4 h-4 text-accent" />
                            </div>
                            <span className="text-sm font-medium text-primary">{l.subject || t('payments.download_invoice')}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="text-sm text-primary">{new Date(l.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs text-muted">{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="py-3.5 px-5 max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusIsSent ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className="text-sm text-primary truncate">{firstRecip}</span>
                          </div>
                          {recips[1] && <div className="text-xs text-muted ml-3.5 truncate">{recips.slice(1).join(', ')}</div>}
                        </td>
                        <td className="py-3.5 px-5">
                          {l.paymentHistory ? (() => {
                            const ph = l.paymentHistory;
                            const invoiceDate = ph.createdAt ? new Date(ph.createdAt) : new Date();
                            return <span className="text-sm font-medium text-accent">FA-{invoiceDate.getFullYear()}-{String(ph.id).slice(0,6)}</span>;
                          })() : <span className="text-muted">—</span>}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.badge}`}>{s.icon}<span>{s.label}</span></div>
                        </td>
                        <td className="py-3.5 px-5 max-w-[160px]">
                          {l.errorText ? <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-2 py-1 rounded-lg">{l.errorText}</span> : <span className="text-muted">—</span>}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-1.5">
                            {statusIsSent ? (
                              <>
                                <button title={t('admin.emaillogs.view_invoice')} disabled={!l.paymentHistory} onClick={() => l.paymentHistory && openInvoice(l.paymentHistory.id)} className={`p-2 rounded-lg border border-border-default text-secondary hover:bg-input transition ${!l.paymentHistory ? 'opacity-40 cursor-not-allowed' : ''}`}><HiOutlineEye className="w-4 h-4" /></button>
                                <button title={t('admin.emaillogs.download')} disabled={!l.paymentHistory} onClick={() => l.paymentHistory && downloadInvoice(l.paymentHistory.id, `facture-${l.paymentHistory.id}.pdf`)} className={`p-2 rounded-lg border border-border-default text-secondary hover:bg-input transition ${!l.paymentHistory ? 'opacity-40 cursor-not-allowed' : ''}`}><HiOutlineDownload className="w-4 h-4" /></button>
                              </>
                            ) : (
                              <button title={t('admin.emaillogs.resend')} onClick={() => resendEmail(l.id)} disabled={!!resending[l.id] || !!(l.paymentHistory && (disabledAfterResend[l.paymentHistory.id] || hasSentForPayment(l.paymentHistory.id)))} className={`p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 transition ${resending[l.id] ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <HiOutlineRefresh className={`w-4 h-4 ${resending[l.id] ? 'animate-spin' : ''}`} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border-default bg-input">
            <p className="text-sm text-muted">
              {t('admin.emaillogs.displaying', {
                from: total ? `${(page - 1) * limit + 1}` : (logs.length ? '1' : '—'),
                to: total ? `${Math.min(page * limit, total)}` : (logs.length ? `${logs.length}` : '—'),
                total: String(total ?? '—')
              })}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={!hasPrev} className="px-3 py-1.5 text-sm border border-border-default rounded-xl text-secondary hover:bg-card transition disabled:opacity-40">{t('emaillogs.pagination.prev')}</button>
              <span className="w-8 h-8 flex items-center justify-center bg-accent text-white text-sm font-bold rounded-lg">{page}</span>
              <button onClick={() => hasNext && setPage(page + 1)} disabled={!hasNext} className="px-3 py-1.5 text-sm border border-border-default rounded-xl text-secondary hover:bg-card transition disabled:opacity-40">{t('emaillogs.pagination.next')}</button>
            </div>
          </div>
        </div>

      </div>

      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg border border-border-default">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-primary">{t('admin.emaillogs.choose_month')}</div>
              <button className="text-muted" onClick={() => setShowCalendarModal(false)}>✕</button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-primary">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(calendarDate)}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="px-2 py-1 border border-border-default rounded text-secondary">‹</button>
                  <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="px-2 py-1 border border-border-default rounded text-secondary">›</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-2">
                {getMonthGrid(calendarDate).flat().slice(0,7).map((d, i) => (
                  <div key={i}>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getMonthGrid(calendarDate).flat().map((d, idx) => {
                  const isCurrentMonth = d.getMonth() === calendarDate.getMonth();
                  return (
                    <button key={idx} onClick={() => handleSelectDay(d)} className={`p-2 rounded ${isCurrentMonth ? 'bg-input hover:bg-card-hover' : 'bg-card opacity-60'} transition`}>
                      <div className="text-sm text-primary">{d.getDate()}</div>
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
