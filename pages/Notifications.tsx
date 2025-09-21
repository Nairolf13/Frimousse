import { useEffect, useState } from 'react';
import type { NotificationItem } from '../components/NotificationsList';
import NotificationsList from '../components/NotificationsList';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';

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
    loadStats();
    const handler = () => { loadStats(); load(page); };
    window.addEventListener('notifications:changed', handler as EventListener);
    return () => window.removeEventListener('notifications:changed', handler as EventListener);
  }, [page]);

  useEffect(() => { load(1); }, []);

  const { t } = useI18n();

  return (
    <div className={`min-h-screen bg-[#f7f8fa] w-full flex flex-col items-center ${!isShortLandscape ? 'md:pl-64' : ''} px-2 md:px-8 py-8`}>
      <div className="w-full max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1 tracking-tight" style={{ color: '#0b5566' }}>{t('page.notifications.title')}</h1>
          <div className="text-base md:text-lg font-medium mb-4 md:mb-6" style={{ color: '#08323a' }}>{t('page.notifications.desc')}</div>
        </div>

        {/* Stats chips + mark-all button (responsive) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <div className="flex gap-2 items-center mb-3 sm:mb-0 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex-shrink-0 px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg border border-red-200 bg-red-50 text-red-700 font-semibold text-sm sm:text-base">{stats.unread}<div className="text-[10px] sm:text-xs text-red-500">{t('notifications.stats.unread')}</div></div>
            <div className="flex-shrink-0 px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-semibold text-sm sm:text-base">{stats.today}<div className="text-[10px] sm:text-xs text-blue-500">{t('notifications.stats.today')}</div></div>
            <div className="flex-shrink-0 px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg border border-green-200 bg-green-50 text-green-700 font-semibold text-sm sm:text-base">{stats.week}<div className="text-[10px] sm:text-xs text-green-500">{t('notifications.stats.week')}</div></div>
          </div>
          <div className="flex justify-center sm:justify-end">
            <button
              onClick={async () => {
                try {
                  await fetchWithRefresh('/api/notifications/mark-all-read', { method: 'PUT', credentials: 'include' });
                  loadStats();
                  load(1);
                  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('notifications:changed'));
                } catch (e) {
                  console.error('Failed to mark all read', e);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full shadow-sm w-full sm:w-auto"
              title={t('notifications.mark_all')}
            >
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-medium">{t('notifications.mark_all')}</span>
            </button>
          </div>
        </div>

        <NotificationsList
          items={items}
          loading={loading}
          onRefresh={() => load(page)}
          onDeleted={() => load(page)}
        />

      </div>
    </div>
  );
}
