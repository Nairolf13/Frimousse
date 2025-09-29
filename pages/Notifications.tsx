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
      } catch (e) {
        // ignore errors — we still load stats which will reflect server state
        console.debug('mark-all-read on mount failed', e);
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
    <div className={`min-h-screen bg-[#f7f8fa] w-full flex flex-col items-center ${!isShortLandscape ? 'md:pl-64' : ''} px-2 md:px-8 py-8`}>
      <div className="w-full max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight" style={{ color: '#0b5566' }}>{t('page.notifications.title')}</h1>
          <div className="text-base md:text-lg font-medium mb-4 md:mb-6" style={{ color: '#08323a' }}>{t('page.notifications.desc')}</div>
        </div>

  {/* Stats chips + mark-all button (responsive) */}
  <div className="flex flex-col items-start sm:items-start justify-start mb-6">
          <div className="flex gap-2 items-center mb-3 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex-shrink-0 px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg border border-red-200 bg-red-50 text-red-700 font-semibold text-sm sm:text-base">{stats.unread}<div className="text-[10px] sm:text-xs text-red-500">{t('notifications.stats.unread')}</div></div>
            <div className="flex-shrink-0 px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-semibold text-sm sm:text-base">{stats.today}<div className="text-[10px] sm:text-xs text-blue-500">{t('notifications.stats.today')}</div></div>
            <div className="flex-shrink-0 px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg border border-green-200 bg-green-50 text-green-700 font-semibold text-sm sm:text-base">{stats.week}<div className="text-[10px] sm:text-xs text-green-500">{t('notifications.stats.week')}</div></div>
          </div>
          <div className="w-full sm:w-auto mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-start">
            {/* Actions below badges: stacked on mobile, inline from sm+ */}
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
              className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full shadow-sm w-auto text-sm"
              title={t('notifications.mark_all')}
              style={{pointerEvents: 'auto'}}
            >
              <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-medium">{t('notifications.mark_all')}</span>
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-full shadow-sm w-auto sm:ml-2 text-sm"
              title={t('notifications.delete_all')}
              style={{pointerEvents: 'auto'}}
            >
              <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-medium">{t('notifications.delete_all')}</span>
            </button>
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
