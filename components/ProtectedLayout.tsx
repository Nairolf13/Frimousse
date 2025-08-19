import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useNavigate, useOutlet } from 'react-router-dom';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import WelcomeModal from '../src/components/WelcomeModal';

const API_URL = import.meta.env.VITE_API_URL;

export default function ProtectedLayout() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const outlet = useOutlet();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/api/user/me`, { credentials: 'include' })
      .then(res => setAuthenticated(res.ok))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && !authenticated) {
      navigate('/login', { replace: true });
    }
    if (!loading && authenticated) {
      const shown = localStorage.getItem('welcomeShown');
      if (!shown) setShowWelcome(true);
    }
  }, [loading, authenticated, navigate]);

  if (loading) return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  if (!authenticated) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-6">
  {showWelcome && <WelcomeModal onClose={() => { localStorage.setItem('welcomeShown', '1'); setShowWelcome(false); }} />}
        {outlet}
      </main>
    </div>
  );
}
