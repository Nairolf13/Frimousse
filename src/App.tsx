import AppRoutes from '../routes';
import { useEffect, useState } from 'react';
import { AuthContext } from './context/AuthContext';
import type { User } from './context/AuthContext';
import { HelmetProvider } from 'react-helmet-async';

function App() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
      })
      .catch(() => {
        setUser(null);
      });
  }, []);
  return (
    <HelmetProvider>
      <AuthContext.Provider value={{ user }}>
        <AppRoutes />
      </AuthContext.Provider>
    </HelmetProvider>
  );
}

export default App
