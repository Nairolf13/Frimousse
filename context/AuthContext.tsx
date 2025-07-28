import { createContext, useContext } from 'react';

export interface User {
  name: string;
  role: string;
}

export const AuthContext = createContext<{ user: User | null }>({ user: null });

export function useAuth() {
  return useContext(AuthContext);
}
