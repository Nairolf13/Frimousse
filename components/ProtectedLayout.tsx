import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useNavigate, useOutlet } from 'react-router-dom';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import useBirthdayCheck from '../src/hooks/useBirthdayCheck';
import BirthdayModal from './BirthdayModal';

export default function ProtectedLayout() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const outlet = useOutlet();
  // tutorial/welcome modal disabled by default
  // Keep a stateful centerId (initialize from localStorage) so we can update it
  // after we fetch /api/user/me. This ensures the birthday check runs for any
  // authenticated user that belongs to the same center as the child.
  const [centerId, setCenterId] = useState<string | undefined>(() => {
    try {
      const raw = localStorage.getItem('currentCenterId');
      return raw ?? undefined;
    } catch {
      return undefined;
    }
  });

  // Only check birthdays after we've confirmed the user is authenticated and we have a centerId
  const { birthdays } = useBirthdayCheck(authenticated ? centerId : undefined);

  const [showBirthday, setShowBirthday] = useState(false);

  useEffect(() => {
    if (!birthdays || birthdays.length === 0 || !centerId) return;
    const key = `birthday_seen:${centerId}:${new Date().toISOString().slice(0,10)}`;
    let seen = false;
    try { seen = !!localStorage.getItem(key); } catch { seen = false; }
    if (!seen) setShowBirthday(true);
  }, [birthdays, centerId, setShowBirthday]);

  useEffect(() => {
    // Use relative path so cookies are sent correctly in dev (Vite proxy) and in prod the same origin is used
    let mounted = true;
    (async () => {
      try {
        const res = await fetchWithRefresh('/api/user/me', { credentials: 'include' });
        if (!mounted) return;
        if (!res.ok) {
          setAuthenticated(false);
          return;
        }
        const data = await res.json();
        setAuthenticated(true);
        try {
          if (data && data.centerId) {
            try { localStorage.setItem('currentCenterId', String(data.centerId)); } catch { /* ignore */ }
            setCenterId(String(data.centerId));
          }
        } catch { /* ignore parse errors */ }
      } catch {
        setAuthenticated(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
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
      <BirthdayModal items={birthdays} open={showBirthday} onClose={() => setShowBirthday(false)} centerId={centerId} />
    </div>
  );
}
