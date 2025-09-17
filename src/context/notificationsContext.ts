import { createContext, useContext } from 'react';

export type NotificationsContextValue = {
  unreadCount: number;
  refresh: () => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext must be used within NotificationsProvider');
  return ctx;
}

export default NotificationsContext;
