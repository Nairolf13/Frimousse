import AppRoutes from '../routes';

import { useEffect, useState } from 'react';
import { AuthContext } from './context/AuthContext';
import type { User } from './context/AuthContext';

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
    <AuthContext.Provider value={{ user }}>
      <AppRoutes />
    </AuthContext.Provider>
  );
}

export default App
