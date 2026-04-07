import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const meta = import.meta as { env?: { VITE_API_URL?: string } };
const API_URL = meta?.env?.VITE_API_URL ?? '/api';

type Detail = { childName: string; childPhotoUrl?: string | null; daysPresent: number; ratePerDay: number; subtotal: number };
type RecordType = { id: string; parent: { id?: string; firstName?: string; lastName?: string; email?: string | null; phone?: string | null; user?: { avatarUrl?: string | null } | null } | null; total: number; details: Detail[]; createdAt?: string | null; paid?: boolean; invoiceNumber?: string; adjustment?: number };
type NannyGroup = {
  nanny: { id: string; name?: string | null; avatarUrl?: string | null };
  payments: Array<{ id: string; amount: number; createdAt?: string | null; parent?: { firstName?: string | null; lastName?: string | null; email?: string | null }; invoiceNumber?: string | null; adjustment?: number }>;
  total: number;
};

export default function PaymentHistoryPage() {
  const { t, locale } = useI18n();
  const [viewMode, setViewMode] = useState<'by-family' | 'by-nanny'>('by-family');
  const [nannyGroups, setNannyGroups] = useState<NannyGroup[] | null>(null);
  const [loadingNannyGroups, setLoadingNannyGroups] = useState(false);
  const [nannyGroupsError, setNannyGroupsError] = useState<string>('');
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

  // Prevent page layout shift when modal is visible by locking body scroll
  useEffect(() => {
    try {
      const prev = document.body.style.overflow;
      if (modalVisible) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = prev || '';
      }
      return () => { document.body.style.overflow = prev || ''; };
    } catch { /* ignore */ }
  }, [modalVisible]);

  const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const fmt = (amount: number) => new Intl.NumberFormat(locale || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  // Extracted fetch so we can call it from polling / events
  const safeMessage = useCallback((e: unknown) => {
    if (!e) return '';
    if (typeof e === 'string') return e;
    if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as Record<string, unknown>).message === 'string') return (e as Record<string, unknown>).message as string;
    try { return JSON.stringify(e); } catch { return String(e); }
  }, []);

  const loadData = useCallback(async (showSpinner = true) => {
    // remember scroll position so we can restore it after refresh
    const prevScroll = typeof window !== 'undefined' ? window.scrollY : 0;
    let mounted = true;
    if (showSpinner) setLoading(true);
    setError('');
    // safeMessage is defined below and used across loaders
    try {
      const res = await fetchWithRefresh(`${API_URL}/payment-history/${year}/${month}`, { credentials: 'include' });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        let text = '';
        try { text = await res.clone().text(); } catch { text = ''; }
        if (res.status === 402) { if (mounted) setLoading(false); return; }
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
      }
      if (!ct.includes('application/json')) {
        const text = await res.text().catch(() => '');
        throw new Error('Unexpected non-JSON response from API: ' + String(text).slice(0, 200));
      }
      const d = await res.json();
      if (mounted) {
        const newData = Array.isArray(d) ? d : [];
        setData(newData);
      }
    } catch (err) {
      console.error('Failed to fetch payment history', err);
      setData([]);
      setError(safeMessage(err));
    } finally {
      if (showSpinner) setLoading(false);
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => window.scrollTo(0, prevScroll));
      }
    }
    return () => { mounted = false; };
  }, [year, month, safeMessage]);

  const loadNannyGroups = useCallback(async (showSpinner = true) => {
    if (viewMode !== 'by-nanny') return;
    // store scroll position; group fetch usually leaves you low on the page
    const prevScroll = typeof window !== 'undefined' ? window.scrollY : 0;
    let mounted = true;
    if (showSpinner) setLoadingNannyGroups(true);
    setNannyGroupsError('');
    // capture current array for comparison below
      try {
      const res = await fetchWithRefresh(`${API_URL}/payment-history/${year}/${month}/group-by-nanny`, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        if (res.status === 402) { if (mounted) setLoadingNannyGroups(false); return; }
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await res.text().catch(() => '');
        throw new Error('Unexpected non-JSON response: ' + text.slice(0, 200));
      }
      const d = await res.json();
      if (mounted) {
        const newData = Array.isArray(d) ? d : [];
        setNannyGroups(newData);
      }
    } catch (err) {
      console.error('Failed to fetch nanny groups', err);
      if (mounted) setNannyGroupsError(safeMessage(err));
    } finally {
      if (showSpinner && mounted) setLoadingNannyGroups(false);
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => window.scrollTo(0, prevScroll));
      }
    }
    return () => { mounted = false; };
  }, [viewMode, year, month, safeMessage]);

  useEffect(() => {
    // Initial load + keep page in sync for current month using polling and cross-tab notifications
    // Initial load
    loadData(true);
    // If the user is viewing by-nanny, also load the grouped-by-nanny data
    if (viewMode === 'by-nanny') {
      loadNannyGroups(true);
    }

    // Handler to refresh data when we receive a notification
    const onNotify = (ev?: MessageEvent | Event) => {
      try {
        const payload = (ev as MessageEvent)?.data ?? (ev as CustomEvent)?.detail ?? null;
        const detailYear = payload && typeof payload.year !== 'undefined' ? Number(payload.year) : null;
        const detailMonth = payload && typeof payload.month !== 'undefined' ? Number(payload.month) : null;
        if (detailYear && detailMonth) {
          if (detailYear === year && detailMonth === month) {
            loadData(false);
            if (viewMode === 'by-nanny') loadNannyGroups(false);
          }
        } else {
          // generic notification: reload if viewing the month in question (especially useful for current month)
          loadData(false);
          if (viewMode === 'by-nanny') loadNannyGroups(false);
        }
      } catch { /* ignore */ }
    };

    // BroadcastChannel for cross-tab messaging (preferred)
    let bc: BroadcastChannel | null = null;
    try {
      const Win = window as unknown as { BroadcastChannel?: typeof BroadcastChannel };
      if (typeof window !== 'undefined' && Win.BroadcastChannel) {
        bc = new Win.BroadcastChannel('__frimousse_payment_history__');
        bc.onmessage = onNotify as (ev: MessageEvent) => void;
      }
  } catch { bc = null; }

    // Listen for custom events in same tab
    window.addEventListener('paymentHistory:changed', onNotify as EventListener);

    // Fallback: listen to storage events so other tabs can signal via localStorage
    const onStorage = (e: StorageEvent) => { if (e.key === '__frimousse_payment_history__') onNotify(); };
    window.addEventListener('storage', onStorage);

    // declare variables used in cleanup, even if polling is disabled
    // these don't change anymore since polling is disabled, so use const
    const pollInterval: number | null = null;
    const beatIv: number | null = null;

    // polling disabled - rely on cross-tab notifications only
    // (removing polling avoids excess traffic when many users are connected)
    /*
    const now = new Date();
    // if you ever want polling back, un-comment leader election above
    if (year === now.getFullYear() && month === now.getMonth() + 1) {
      pollInterval = window.setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        loadData(false);
        if (viewMode === 'by-nanny') loadNannyGroups(false);
      }, 30_000);
    }
    */

    return () => {
      try { if (bc) bc.close(); } catch (closeErr) { console.error('Failed to close paymentHistory BroadcastChannel', closeErr); }
      window.removeEventListener('paymentHistory:changed', onNotify as EventListener);
      window.removeEventListener('storage', onStorage);
      if (pollInterval) clearInterval(pollInterval);
      if (beatIv) clearInterval(beatIv);
    };
  }, [year, month, viewMode, loadData, loadNannyGroups]);


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

  // Helper renderers to keep JSX flatter and avoid deep nesting
  const FamilyList = () => {
    if (loading) return <div className="text-muted text-sm py-8 text-center">{t('loading')}</div>;
    if (!loading && filtered.length === 0) return <div className="text-muted text-sm py-8 text-center">{t('payments.history.empty')}</div>;
    return <>
      {filtered.map(rec => {
        const initials = (rec.parent ? `${rec.parent.firstName || ''}`.slice(0,1) + (rec.parent?.lastName || '').slice(0,1) : '--').toUpperCase();
        const parentName = rec.parent ? `${rec.parent.firstName || ''} ${rec.parent.lastName || ''}`.trim() : t('common.none');
        return (
          <div key={rec.id} className="bg-card rounded-2xl shadow-md border border-border-default overflow-hidden mb-4">
            {/* Card header */}
            <div className="bg-gradient-to-r from-[#0b5566] to-[#08323a] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-card/20 text-white flex items-center justify-center font-bold text-base flex-shrink-0">
                  {rec.parent?.user?.avatarUrl
                    ? <img src={rec.parent.user.avatarUrl} alt={parentName} className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white text-base leading-tight truncate">{parentName}</div>
                  <div className="text-xs text-white/70 mt-0.5 truncate">{rec.parent?.email ?? ''}{rec.parent?.phone ? ` • ${rec.parent?.phone}` : ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {rec.invoiceNumber && <span className="text-xs text-white/60 font-medium">{rec.invoiceNumber}</span>}
                {rec.createdAt && <span className="text-xs text-white/60">{new Date(rec.createdAt).toLocaleDateString('fr-FR')}</span>}
                {rec.paid
                  ? <span className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-9500 text-white px-2.5 py-1 rounded-full">{t('payments.status.paid')}</span>
                  : <span className="text-xs font-semibold bg-card/20 text-white px-2.5 py-1 rounded-full">{t('payments.status.unpaid')}</span>
                }
                {user && (user.role === 'admin' || (user.role && user.role.toLowerCase().includes('super'))) && (
                  <button onClick={() => togglePaid(rec.id, !rec.paid)} className="text-xs px-2.5 py-1 bg-card/20 hover:bg-card/30 text-white rounded-full transition-colors">
                    {rec.paid ? t('payments.actions.mark_unpaid') : t('payments.actions.mark_paid')}
                  </button>
                )}
              </div>
            </div>

            {/* Child details */}
            <div className="px-5 py-4">
              <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t('payments.detail.header', { month: new Date(year, month-1).toLocaleString(locale || 'fr-FR', { month: 'long', year: 'numeric' }) })}</div>
              <div className="space-y-2">
                {(() => {
                  const visible = Array.isArray(rec.details)
                    ? rec.details.filter(d => !(d.daysPresent === 0 && d.ratePerDay === 0 && (d.childName||'').toLowerCase().includes('réduction')))
                    : [];
                  if (visible.length > 0) {
                    return visible.map((d, idx) => (
                      <div key={idx} className="bg-input rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {d.childPhotoUrl
                              ? <img src={d.childPhotoUrl} alt={d.childName} className="w-full h-full object-cover" />
                              : (d.childName || '').slice(0,1).toUpperCase()}
                          </div>
                          <span className="font-semibold text-primary text-sm">{d.childName}</span>
                        </div>
                        <div className="text-right text-sm">
                          <span className="text-secondary">{d.daysPresent} {t('payments.days')}</span>
                          <span className="mx-2 text-muted">·</span>
                          <span className="text-emerald-600 font-semibold">{d.daysPresent} × {fmt(d.ratePerDay)} = {fmt(d.subtotal)}</span>
                        </div>
                      </div>
                    ));
                  }
                  return <div className="text-muted text-sm">{t('payments.no_child_this_month')}</div>;
                })()}
              </div>
            </div>

            {/* Card footer */}
            <div className="px-5 py-4 bg-input border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted font-medium">{t('payments.family.total_label')}</div>
                {Array.isArray(rec.details) && (() => {
                  const vis = rec.details.filter(d => !(d.daysPresent === 0 && d.ratePerDay === 0 && (d.childName||'').toLowerCase().includes('réduction')));
                  const days = vis.reduce((s,d) => s + (d.daysPresent||0), 0);
                  return <div className="text-xs text-muted mt-0.5">{t('payments.family.summary', { n: String(vis.length), days: String(days) })}</div>;
                })()}
                <div className="text-2xl font-extrabold text-[#0b5566] mt-1">
                  {fmt(Number(rec.total))}
                  {Number(rec.adjustment || 0) > 0 && (
                    <span className="ml-2 text-sm font-normal text-amber-600">{t('adjustment.label')} {fmt(Number(rec.adjustment))}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <a href="#" onClick={e => { e.preventDefault(); downloadInvoice(rec.id, `facture-${year}-${String(month).padStart(2,'0')}-${rec.parent?.lastName || rec.id}.pdf`); }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#0b5566] to-[#08323a] !text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity no-underline">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  {rec.invoiceNumber ? `${t('payments.download_invoice')} (${rec.invoiceNumber})` : t('payments.download_invoice')}
                </a>
                <button type="button" onClick={() => { if (!rec.parent?.email) { showModal(t('payments.errors.no_email') || 'Aucune adresse e-mail trouvée'); return; } sendInvoice(rec.id, rec.parent?.firstName || rec.parent?.email || ''); }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 border border-border-default bg-card text-primary rounded-xl text-sm font-medium hover:bg-input transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {t('payments.send_invoice') || 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </>;
  };

  const NannyList = () => {
    if (loadingNannyGroups) return <div className="text-muted text-sm py-8 text-center">{t('loading')}</div>;
    if (nannyGroupsError) return <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">{nannyGroupsError}</div>;
    if (!Array.isArray(nannyGroups) || nannyGroups.length === 0) return <div className="text-muted text-sm py-8 text-center">{t('payments.history.empty')}</div>;
    return <>
      {nannyGroups.map((g: NannyGroup) => {
        const initials = (g.nanny?.name || '').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '—';
        return (
          <div key={String(g.nanny?.id || Math.random())} className="bg-card rounded-2xl shadow-md border border-border-default overflow-hidden mb-4">
            {/* Nanny card header */}
            <div className="bg-gradient-to-r from-violet-600 to-violet-800 px-5 py-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-card/20 text-white flex items-center justify-center font-bold text-base flex-shrink-0">
                {g.nanny?.avatarUrl ? (
                  <img src={g.nanny.avatarUrl} alt={`${g.nanny.name || 'Nounou'} avatar`} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-base leading-tight">{g.nanny?.name || '—'}</div>
                <div className="text-xs text-white/70 mt-0.5">{(g.payments || []).length} {t('payments.by_nanny.payments') || 'paiements'}</div>
              </div>
              <div className="text-xl font-extrabold text-white">{fmt(Number(g.total || 0))}</div>
            </div>

            {/* Payment rows */}
            <div className="px-5 py-4">
              {(g.payments || []).length === 0 ? (
                <div className="text-muted text-sm">{t('payments.history.empty')}</div>
              ) : (
                <div className="space-y-2">
                  {(g.payments || []).map((p) => (
                    <div key={p.id} className="bg-input rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-primary text-sm">{p.parent ? `${p.parent.firstName || ''} ${p.parent.lastName || ''}`.trim() : t('common.none')}</div>
                        <div className="text-xs text-muted mt-0.5">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : ''}
                          {p.invoiceNumber ? ` • ${p.invoiceNumber}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap justify-end">
                        <span className="font-bold text-[#0b5566]">{fmt(Number(p.amount || 0))}</span>
                        {Number(p.adjustment || 0) > 0 && (
                          <span className="text-xs text-amber-600">{t('adjustment.label')} {fmt(Number(p.adjustment))}</span>
                        )}
                        <button type="button" onClick={() => downloadInvoice(p.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white rounded-xl text-xs font-medium hover:opacity-90 transition-opacity">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          {t('payments.download_invoice') || 'Télécharger'}
                        </button>
                        <button type="button" onClick={() => sendInvoice(p.id, p.parent?.firstName || p.parent?.email || '')}
                          className="flex items-center gap-1 px-3 py-1.5 border border-border-default bg-card text-primary rounded-xl text-xs font-medium hover:bg-input transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          {t('payments.send_invoice') || 'Envoyer'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>;
  };



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

  async function sendInvoice(paymentId: string, recipientName?: string) {
    try {
      setLoading(true);
      const res = await fetchWithRefresh(`${API_URL}/payment-history/invoice/${paymentId}/send`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      const j = await res.json().catch(() => null);
      // Prefer a friendly success message including recipient name when available
      let msg = '';
      if (recipientName) {
        msg = t('payments.send_success_to', { name: recipientName }) || `Email envoyé à ${recipientName}`;
      } else if (j && j.message) {
        msg = j.message;
      } else {
        msg = t('payments.send_success') || 'Email envoyé';
      }
      showModal(msg);
    } catch (err) {
      console.error('Send invoice failed', err);
      setModalMessage(safeMessage(err) || t('payments.send_failed') || 'Échec de l\'envoi');
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  }

  async function togglePaid(id: string, paid: boolean) {
    const savedScroll = window.scrollY;
    // optimistic update
    setData(d => d.map(r => r.id === id ? { ...r, paid } : r));
    requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' as ScrollBehavior }));
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
      // Notify other tabs/windows that payment history changed for this year/month
      try {
        const payload = { year, month, ts: Date.now() };
        // BroadcastChannel (preferred)
        try {
          const Win = window as unknown as { BroadcastChannel?: typeof BroadcastChannel };
          if (Win.BroadcastChannel) {
            const bc = new Win.BroadcastChannel('__frimousse_payment_history__');
            bc.postMessage(payload);
            bc.close();
          }
        } catch (bcErr) {
          // ignore BroadcastChannel errors
          console.error('BroadcastChannel send failed', bcErr);
        }

        // localStorage fallback to trigger storage events
        try {
          localStorage.setItem('__frimousse_payment_history__', JSON.stringify(payload));
        } catch (lsErr) {
          // ignore localStorage errors (private mode etc.)
          console.error('localStorage publish failed', lsErr);
        }

        // Same-tab custom event for immediate listeners
        try {
          window.dispatchEvent(new CustomEvent('paymentHistory:changed', { detail: payload }));
        } catch {
          // ignore
        }
      } catch (notifyErr) {
        // never fail the main flow if notify fails
        console.error('Failed to notify other tabs of payment history change', notifyErr);
      }
      // If we're currently viewing nanny grouped data, refresh it locally so the change is visible immediately
      try {
        if (viewMode === 'by-nanny') {
          await loadNannyGroups();
          requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' as ScrollBehavior }));
        }
      } catch (ngErr) {
        console.error('Failed to reload nanny groups after togglePaid', ngErr);
      }
    } catch (err) {
      console.error('Failed to toggle paid', err);
      // revert optimistic
      setData(d => d.map(r => r.id === id ? { ...r, paid: !paid } : r));
      requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' as ScrollBehavior }));
      showModal('Erreur lors de la mise à jour du statut de paiement.');
    }
  }


  return (
    <div className={`min-h-screen bg-surface p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('page.payments')}</h1>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">{t('page.payments.description')}</p>
            </div>
          </div>
        </div>

        {/* Filters card */}
        <div className="bg-card rounded-2xl shadow-md border border-border-default p-5 mb-5">
          {/* View toggle — hidden for parents */}
          {user?.role !== 'parent' && (
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setViewMode('by-family')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${viewMode === 'by-family' ? 'bg-[#0b5566] text-white shadow-sm' : 'bg-card-hover text-secondary hover:bg-border-default'}`}>
                {t('payments.view.by_family') || 'Par famille'}
              </button>
              <button type="button" onClick={() => setViewMode('by-nanny')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${viewMode === 'by-nanny' ? 'bg-[#0b5566] text-white shadow-sm' : 'bg-card-hover text-secondary hover:bg-border-default'}`}>
                {t('payments.view.by_nanny') || 'Par nounou'}
              </button>
            </div>
          )}

          {/* Month/year + parent filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border border-border-default px-3 py-2 rounded-xl text-sm bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 w-full sm:w-auto">
              {monthNames.map((name, idx) => <option key={idx} value={idx + 1}>{name}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-border-default px-3 py-2 rounded-xl text-sm bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 w-full sm:w-auto">
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {user?.role !== 'parent' && (
              <select value={parentFilter} onChange={e => setParentFilter(e.target.value)} className="border border-border-default px-3 py-2 rounded-xl text-sm bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 flex-1 min-w-0">
                <option value="">{t('payments.filter.all_parents')}</option>
                {parents.map((p, idx) => {
                  const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '—';
                  return <option key={p?.id || idx} value={p?.id || ''}>{name}</option>;
                })}
              </select>
            )}
          </div>

          {/* Action buttons — hidden for parents */}
          {user?.role !== 'parent' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={async () => {
                if (!parentFilter) { showModal(t('payments.errors.select_parent')); return; }
                const rec = data.find(r => r.parent && r.parent.id === parentFilter);
                if (!rec) { showModal(t('payments.errors.no_record_parent')); return; }
                await downloadInvoice(rec.id, `facture-${year}-${String(month).padStart(2,'0')}-${rec.parent?.lastName || rec.id}.pdf`);
              }} className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {t('payments.download_invoice')}
              </button>
              <button onClick={downloadCSVForAll} className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {t('payments.export_csv')}
              </button>
              <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-4 py-2 border border-border-default bg-card text-primary rounded-xl text-sm font-medium hover:bg-input transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                {t('payments.print')}
              </button>
            </div>
          )}
        </div>

        {/* KPI cards — hidden for parents */}
        {user?.role !== 'parent' && <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card rounded-2xl shadow-md border border-border-default p-4">
            <div className="text-xs text-muted font-medium mb-1">{t('payments.card.month_revenue')}</div>
            <div className="text-xl font-extrabold text-[#0b5566]">{fmt(totalRevenue)}</div>
          </div>
          <div className="bg-card rounded-2xl shadow-md border border-border-default p-4">
            <div className="text-xs text-muted font-medium mb-1">{t('payments.card.families_active')}</div>
            <div className="text-xl font-extrabold text-primary">{familiesActive}</div>
          </div>
          <div className="bg-card rounded-2xl shadow-md border border-border-default p-4">
            <div className="text-xs text-muted font-medium mb-1">{t('payments.card.unpaid')}</div>
            <div className={`text-xl font-extrabold ${unpaidCount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{unpaidCount}</div>
          </div>
        </div>}

        {/* Modal */}
        {modalVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalVisible(false)} />
            <div role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc" className="relative max-w-md w-full bg-card rounded-2xl shadow-xl p-6 mx-4">
              <h3 id="modal-title" className="text-base font-bold text-primary">Information</h3>
              <p id="modal-desc" className="mt-3 text-sm text-secondary">{modalMessage}</p>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setModalVisible(false)} className="px-5 py-2 bg-gradient-to-r from-[#0b5566] to-[#08323a] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">OK</button>
              </div>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm mb-4">{error}</div>}

        {/* Render selected view */}
        <div className="grid gap-0">
          {viewMode === 'by-family' ? <FamilyList /> : <NannyList />}
        </div>
      </div>
    </div>
  );
}
