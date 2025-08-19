import { createContext, useContext } from 'react';

export interface User {
  id?: string;
  name: string;
  role: string;
  nannyId?: string;
  parentId?: string;
  centerId?: string | null;
}

export const AuthContext = createContext<{ user: User | null }>({ user: null });

export function useAuth() {
  return useContext(AuthContext);
}
