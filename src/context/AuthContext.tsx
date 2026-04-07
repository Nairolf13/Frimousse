import { createContext, useContext } from 'react';

export interface User {
  id?: string;
  email?: string | null;
  name: string;
  role: string;
  nannyId?: string;
  parentId?: string;
  centerId?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  tutorialSeen?: boolean;
  tutorialCompleted?: string[];
  cookieConsent?: string | null;
  language?: string | null;
  theme?: 'light' | 'dark' | 'system' | null;
  profileCompleted?: boolean;
  avatarUrl?: string | null;
}

// undefined = still loading, null = not authenticated, User = authenticated
export const AuthContext = createContext<{ user: User | null | undefined; setUser: (user: User | null | undefined) => void }>({ user: undefined, setUser: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}
