// React import not required with new JSX runtime
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../src/lib/useI18n';

export type NotificationItem = {
  id: string;
  title?: string;
  body?: string | null;
  data?: unknown;
  read: boolean;
  createdAt: string | Date;
};

type Props = {
  items?: NotificationItem[];
  loading?: boolean;
  onRefresh?: () => void;
  onDeleted?: () => void;
};

const SWIPE_THRESHOLD = 60; // px needed to reveal the delete button
const DELETE_REVEAL = 72; // px width of the delete button

function SwipeableItem({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  const startXRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [swiped, setSwiped] = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx > 0 && !swiped) return; // ignore right swipe when closed
    if (dx < 0) {
      // swiping left: clamp between 0 and DELETE_REVEAL
      const raw = swiped ? DELETE_REVEAL + (-dx) : -dx;
      setOffset(Math.min(raw, DELETE_REVEAL));
    } else if (swiped) {
      // swiping back right when already open
      const raw = DELETE_REVEAL - dx;
      setOffset(Math.max(0, raw));
    }
  }

  function onTouchEnd() {
    startXRef.current = null;
    if (offset >= SWIPE_THRESHOLD) {
      setOffset(DELETE_REVEAL);
      setSwiped(true);
    } else {
      setOffset(0);
      setSwiped(false);
    }
  }

  function close() {
    setOffset(0);
    setSwiped(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Red delete button revealed behind */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-r-2xl"
        style={{ width: DELETE_REVEAL }}
      >
        <button
          onClick={() => { close(); onDelete(); }}
          className="flex flex-col items-center justify-center w-full h-full text-white gap-1"
          aria-label={t('notifications.swipe_delete', 'Supprimer')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[10px] font-semibold">{t('notifications.swipe_delete', 'Supprimer')}</span>
        </button>
      </div>
      {/* Swipeable content */}
      <div
        style={{ transform: `translateX(-${offset}px)`, transition: offset === 0 || offset === DELETE_REVEAL ? 'transform 0.2s ease' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (swiped) close(); }}
      >
        {children}
      </div>
    </div>
  );
}

function getNotificationLink(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  // Two possible shapes depending on how the notification was created:
  // 1. Direct: { type: 'presence_sheet', ... }  (e.g. presenceSheets route)
  // 2. Wrapped: { title, body, data: { type: 'message', conversationId, url } }  (e.g. pushNotifications.notifyUsers)
  const inner = data.data && typeof data.data === 'object' ? data.data as Record<string, unknown> : null;
  const type = (data.type as string | undefined) ?? (inner?.type as string | undefined);
  const convId = (inner?.conversationId as string | undefined) ?? (data.conversationId as string | undefined);
  switch (type) {
    case 'presence_sheet': return '/presence-sheets';
    case 'report': return '/reports';
    case 'activity': return '/activites';
    case 'message': return convId ? `/messages?convId=${convId}` : '/messages';
    case 'support': return '/settings';
    case 'payment': return '/payment-history';
    default: return null;
  }
}

export default function NotificationsList({ items = [], loading = false, onRefresh = () => {}, onDeleted = () => {} }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { t } = useI18n();
  const navigate = useNavigate();

  function relativeTime(dateLike: string | Date) {
    const d = new Date(String(dateLike));
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return t('time.now');
    if (mins < 60) return t('time.minutes', { n: String(mins) });
    const hours = Math.round(mins / 60);
    if (hours < 24) return t('time.hours', { n: String(hours) });
    const days = Math.round(hours / 24);
    return t('time.days', { n: String(days) });
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
  onRefresh();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('notifications:changed', { detail: { action: 'read', id } }));
    }
  }
  async function markUnread(id: string) {
    await fetch(`/api/notifications/${id}/unread`, { method: 'PUT', credentials: 'include' });
  onRefresh();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('notifications:changed', { detail: { action: 'unread', id } }));
    }
  }
  // open confirm modal
  function del(id: string) {
    setDeletingId(id);
  }

  // called when user confirms deletion in modal
  async function confirmDelete(id: string) {
    try {
      setDeleteLoading(true);
      await fetch(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
      onDeleted();
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('notifications:changed', { detail: { action: 'delete', id } }));
      }
    } catch (e) {
      console.error('Failed to delete notification', e);
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  }

  if (loading) return <div className="text-gray-600">{t('notifications.loading')}</div>;
  if (!items || items.length === 0) return <div className="text-gray-500">{t('notifications.none')}</div>;

  const cardColors = [
    'bg-blue-50',
    'bg-yellow-50',
    'bg-purple-50',
    'bg-green-50',
    'bg-pink-50',
    'bg-orange-50',
  ];

  return (
    <>
    <ul className="space-y-4">
      {items.map((n: NotificationItem, idx: number) => {
  const maybeData = n.data && typeof n.data === 'object' ? n.data as Record<string, unknown> : null;
  const nestedData = maybeData && maybeData.data && typeof maybeData.data === 'object' ? maybeData.data as Record<string, unknown> : null;
  const dtype = (nestedData && typeof nestedData.type === 'string') ? (nestedData.type as string) : ((maybeData && typeof maybeData.type === 'string') ? (maybeData.type as string) : '');
  const defaultTitle = t('notifications.review.created', 'New review to moderate');
  const defaultBody = t('notifications.review.created.description', 'A new user review is waiting for approval');
  const payloadTitle = maybeData && typeof maybeData.title === 'string' ? maybeData.title : '';
  const payloadBody = maybeData && typeof maybeData.body === 'string' ? maybeData.body : '';
  const title = (dtype === 'review.created')
    ? defaultTitle
    : (n.title || payloadTitle || '');
  const body = (dtype === 'review.created')
    ? (n.body || payloadBody || defaultBody)
    : (n.body || payloadBody || '');
        const map: Record<string, string> = {
          activity: 'bg-emerald-500',
          message: 'bg-sky-500',
          reminder: 'bg-amber-500',
          report: 'bg-violet-500',
          system: 'bg-red-500'
        };
  const bg = map[dtype] || 'bg-indigo-500';
        const tags = maybeData && Array.isArray(maybeData.tags) ? (maybeData.tags as string[]) : [];

        function renderIcon(type: string, small = false) {
          const size = small ? 16 : 20;
          const props: Record<string, string | number> = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };
          switch (type) {
            case 'activity':
              return (
                <svg {...props}><path d="M12 2v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="16" r="4" fill="currentColor"/></svg>
              );
            case 'message':
              return (
                <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              );
            case 'reminder':
              return (
                <svg {...props}><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 3h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              );
            case 'report':
              return (
                <svg {...props}><path d="M3 7h18M6 11h12M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              );
            case 'system':
              return (
                <svg {...props}><path d="M12 9v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 17h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              );
            default:
              return (
                <svg {...props}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor"/><path d="M12 7v6l4 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              );
          }
        }

        const iconCls = n.read ? 'bg-gray-100 text-gray-500' : `${bg} text-white`;

        const notifLink = getNotificationLink(maybeData);

        return (
          <li key={n.id}>
          <SwipeableItem onDelete={() => del(n.id)}>
          <div
            className={`rounded-2xl p-4 pb-12 sm:pb-6 relative ${cardColors[idx % cardColors.length]} border border-blue-50 shadow-sm ${notifLink ? 'cursor-pointer' : ''}`}
            onClick={notifLink ? () => { if (!n.read) markRead(n.id); navigate(notifLink); } : undefined}
          >
            {/* mobile top: icon left, time right */}
            <div className="w-full flex items-center justify-between sm:hidden">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-lg ${iconCls} flex items-center justify-center text-base font-bold`}>{renderIcon(dtype, true)}</div>
              </div>
              <div className="text-xs text-gray-500">{relativeTime(n.createdAt)}</div>
            </div>

            {/* desktop row */}
            <div className="hidden sm:flex items-start gap-3">
              <div className="w-12 flex-shrink-0">
                <div className={`w-12 h-12 rounded-lg ${iconCls} flex items-center justify-center text-xl font-bold`}>{renderIcon(dtype, false)}</div>
              </div>

              <div className="flex-1 px-3">
                <div className="text-sm font-semibold" title={title}>{title}</div>
                {body ? <div className="text-sm text-gray-600 mt-1 break-words">{body}</div> : null}
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tg) => (
                      <span key={tg} className="text-xs px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-100">{tg}</span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col items-end">
                <div className="text-xs text-gray-500">{relativeTime(n.createdAt)}</div>
                <div className="hidden sm:flex mt-3 gap-2">
                  {(() => {
                    const isRead = !!n.read;
                    const btnCls = isRead ? 'px-3 py-2 rounded-full bg-gray-100 text-gray-600 border border-gray-100' : 'px-3 py-2 rounded-full bg-blue-600 text-white border border-blue-600';
                    return (
                      <button onClick={() => isRead ? markUnread(n.id) : markRead(n.id)} className={btnCls} title={isRead ? t('notifications.mark_unread') : t('notifications.mark_read')}>
                        {isRead ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 1 0-9 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 3l6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 12l4 4L18 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                      </button>
                    );
                  })()}
                  <button onClick={() => del(n.id)} className="px-3 py-2 rounded-full bg-red-50 text-red-600 border border-red-100">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* mobile content below icon */}
            <div className="sm:hidden mt-3">
              <div className="text-sm font-semibold" title={n.title}>{n.title}</div>
              {n.body ? <div className="text-sm text-gray-600 mt-1 break-words">{n.body}</div> : null}
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tg) => (
                    <span key={tg} className="text-xs px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-100">{tg}</span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* mobile: only mark read/unread button, delete is via swipe */}
            <div className="sm:hidden absolute right-4 bottom-4 flex items-center gap-2">
              {(() => {
                const isRead = !!n.read;
                const btnCls = isRead ? 'px-3 py-2 rounded-full bg-gray-100 text-gray-600 border border-gray-100' : 'px-3 py-2 rounded-full bg-blue-600 text-white border border-blue-600';
                return (
                  <button onClick={() => isRead ? markUnread(n.id) : markRead(n.id)} className={btnCls} title={isRead ? t('notifications.mark_unread') : t('notifications.mark_read')}>
                    {isRead ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 1 0-9 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 3l6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 12l4 4L18 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
          </SwipeableItem>
          </li>
        );
      })}
    </ul>
    <DeleteModal id={deletingId} open={!!deletingId} onCancel={() => setDeletingId(null)} onConfirm={confirmDelete} loading={deleteLoading} />
    </>
  );
}

function DeleteModal({ id, open, onCancel, onConfirm, loading }: { id: string | null; open: boolean; onCancel: () => void; onConfirm: (id: string) => void; loading: boolean; }) {
  const { t } = useI18n();
  if (!open || !id) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative">
        <button onClick={onCancel} className="absolute top-3 right-3 text-gray-500">×</button>
  <div className="text-red-500 text-4xl mb-2 mt-2 flex justify-center">🗑️</div>
        <div className="text-lg font-semibold mb-2 text-gray-900 text-center">{t('notifications.confirm_delete.title')}</div>
        <div className="text-gray-500 mb-6 text-center">{t('notifications.confirm_delete.body')}</div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition" disabled={loading}>{t('notifications.confirm_delete.cancel')}</button>
          <button onClick={() => onConfirm(id)} className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-red-600 transition shadow" disabled={loading}>{loading ? t('notifications.deleting') : t('notifications.confirm_delete.confirm')}</button>
        </div>
      </div>
    </div>
  );
}

export { DeleteModal };
