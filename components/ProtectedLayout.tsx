import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useNavigate, useOutlet } from 'react-router-dom';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

export default function ProtectedLayout() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const outlet = useOutlet();
  // tutorial/welcome modal disabled by default

  useEffect(() => {
    // Use relative path so cookies are sent correctly in dev (Vite proxy) and in prod the same origin is used
    fetchWithRefresh('/api/user/me', { credentials: 'include' })
      .then(res => setAuthenticated(res.ok))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && !authenticated) {
      navigate('/login', { replace: true });
    }
    if (!loading && authenticated) {
      // mark welcome as shown to prevent tutorial modal from appearing
  try { localStorage.setItem('welcomeShown', '1'); } catch { /* ignore */ }
    }
  }, [loading, authenticated, navigate]);

  if (loading) return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  if (!authenticated) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
  <main className="flex-1 bg-gray-50 p-6 max-w-full overflow-x-hidden box-border">
  {/* Welcome/tutorial modal disabled */}
        {outlet}
      </main>
    </div>
  );
}
