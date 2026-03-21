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
}

export const AuthContext = createContext<{ user: User | null; setUser: (user: User | null) => void }>({ user: null, setUser: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}
