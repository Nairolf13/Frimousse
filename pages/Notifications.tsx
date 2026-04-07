import { useEffect, useState } from 'react';
import type { NotificationItem } from '../components/NotificationsList';
import NotificationsList from '../components/NotificationsList';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';
import ConfirmDialog from '../components/ConfirmDialog';

export default function NotificationsPage() {
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
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(p = 1) {
    setLoading(true);
    try {
      const res = await fetchWithRefresh(`/api/notifications?page=${p}`, { credentials: 'include' });
      const json = await res.json();
      setItems(json.items || []);
      setPage(json.page || p);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  const [stats, setStats] = useState({ unread: 0, today: 0, week: 0 });

  async function loadStats() {
    try {
      const res = await fetchWithRefresh('/api/notifications/stats', { credentials: 'include' });
      const json = await res.json();
      setStats({ unread: json.unread || 0, today: json.today || 0, week: json.week || 0 });
    } catch (e) {
      console.error('Failed to load notification stats', e);
    }
  }

  useEffect(() => {
    // when the user opens the Notifications page: mark as viewed locally and on the server
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('notifications:viewed'));
    }
    // mark-all-read on the server so the unread count won't reappear after the next poll
    (async () => {
      try {
        await fetchWithRefresh('/api/notifications/mark-all-read', { method: 'PUT', credentials: 'include' });
        // notify other components (MobileMenu, Sidebar) to refresh their unread count
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('notifications:changed'));
        }
      } catch (e) {
        // ignore errors — we still load stats which will reflect server state
        console.error('mark-all-read on mount failed', e);
      }
    })();
    loadStats();
    const handler = () => { loadStats(); load(page); };
    window.addEventListener('notifications:changed', handler as EventListener);
    return () => window.removeEventListener('notifications:changed', handler as EventListener);
  }, [page]);

  useEffect(() => { load(1); }, []);

  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  return (
    <div className={`min-h-screen bg-surface p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('page.notifications.title')}</h1>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">{t('page.notifications.desc')}</p>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  await fetchWithRefresh('/api/notifications/mark-all-read', { method: 'PUT', credentials: 'include' });
                  loadStats();
                  load(1);
                  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('notifications:changed'));
                    window.dispatchEvent(new CustomEvent('notifications:viewed'));
                  }
                } catch (e) {
                  console.error('Failed to mark all read', e);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border-default text-primary rounded-xl text-sm font-medium hover:bg-input transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 text-secondary" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('notifications.mark_all')}
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 dark:bg-red-900 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('notifications.delete_all')}
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card rounded-2xl shadow-md border border-border-default p-4">
            <div className="text-xs text-muted font-medium mb-1">{t('notifications.stats.unread')}</div>
            <div className={`text-2xl font-extrabold ${stats.unread > 0 ? 'text-red-500' : 'text-primary'}`}>{stats.unread}</div>
          </div>
          <div className="bg-card rounded-2xl shadow-md border border-border-default p-4">
            <div className="text-xs text-muted font-medium mb-1">{t('notifications.stats.today')}</div>
            <div className="text-2xl font-extrabold text-[#0b5566]">{stats.today}</div>
          </div>
          <div className="bg-card rounded-2xl shadow-md border border-border-default p-4">
            <div className="text-xs text-muted font-medium mb-1">{t('notifications.stats.week')}</div>
            <div className="text-2xl font-extrabold text-primary">{stats.week}</div>
          </div>
        </div>

        <NotificationsList
          items={items}
          loading={loading}
          onRefresh={() => load(page)}
          onDeleted={() => load(page)}
        />

        <ConfirmDialog
          open={confirmOpen}
          title={t('notifications.confirm_delete.title')}
          body={t('notifications.confirm_delete_all')}
          confirmLabel={t('notifications.confirm_delete.confirm')}
          cancelLabel={t('notifications.confirm_delete.cancel')}
          loading={confirmLoading}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => {
            try {
              setConfirmLoading(true);
              const res = await fetchWithRefresh('/api/notifications', { method: 'DELETE', credentials: 'include' });
              if (!res.ok) throw new Error('Delete failed');
              setConfirmOpen(false);
              loadStats();
              load(1);
                if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                  window.dispatchEvent(new CustomEvent('notifications:changed'));
                  window.dispatchEvent(new CustomEvent('notifications:viewed'));
                }
            } catch (e) {
              console.error('Failed to delete all notifications', e);
              alert(t('notifications.delete_all_failed') || 'Échec de la suppression');
            } finally {
              setConfirmLoading(false);
            }
          }}
        />

      </div>
    </div>
  );
}
