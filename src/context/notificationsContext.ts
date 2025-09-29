import { createContext, useContext } from 'react';


export type NotificationsContextValue = {
  // unread count for regular notifications (messages, system alerts, ...)
  unreadCount: number;
  // unread pending reviews count (for admins)
  unreadReviews?: number;
  // refresh notifications
  refresh: () => Promise<void>;
  // refresh reviews (optional)
  refreshReviews?: () => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext must be used within NotificationsProvider');
  return ctx;
}

export default NotificationsContext;
