import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useNavigate, useOutlet } from 'react-router-dom';
import useBirthdayCheck from '../src/hooks/useBirthdayCheck';
import BirthdayModal from './BirthdayModal';
import { TutorialProvider } from '../src/context/TutorialContext';
import TutorialOverlay from './TutorialOverlay';
import TutorialMenu from './TutorialMenu';
import { useAuth } from '../src/context/AuthContext';
import AnnouncementBanner from './AnnouncementBanner';

export default function ProtectedLayout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutlet();

  const centerId = user?.centerId ?? (() => {
    try { return localStorage.getItem('currentCenterId') ?? undefined; } catch { return undefined; }
  })();

  const { birthdays } = useBirthdayCheck(user ? centerId : undefined);
  const [showBirthday, setShowBirthday] = useState(false);

  useEffect(() => {
    if (!birthdays || birthdays.length === 0 || !centerId) return;
    const key = `birthday_seen:${centerId}:${new Date().toISOString().slice(0,10)}`;
    let seen = false;
    try { seen = !!localStorage.getItem(key); } catch { seen = false; }
    if (!seen) setShowBirthday(true);
  }, [birthdays, centerId]);

  useEffect(() => {
    if (user?.centerId) {
      try { localStorage.setItem('currentCenterId', String(user.centerId)); } catch { /* ignore */ }
    }
  }, [user?.centerId]);

  useEffect(() => {
    const handler = () => {
      setUser(null);
      navigate('/login', { replace: true, state: { sessionExpired: true } });
    };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, [navigate, setUser]);

  useEffect(() => {
    const handler = () => {
      navigate('/trial-expired', { replace: true });
    };
    window.addEventListener('subscription:required', handler);
    return () => window.removeEventListener('subscription:required', handler);
  }, [navigate]);

  useEffect(() => {
    if (user === undefined) return; // still loading in App.tsx
    if (!user) {
      navigate('/login', { replace: true });
    } else if (user.profileCompleted === false) {
      navigate('/complete-profile', { replace: true });
    } else {
      try { localStorage.setItem('welcomeShown', '1'); } catch { /* ignore */ }
    }
  }, [user, navigate]);

  // Still loading — App.tsx hasn't resolved /api/user/me yet
  if (user === undefined) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
          <img src="/imgs/FrimousseLogo.webp" alt="Logo Frimousse" className="w-16 h-16 object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-300 animate-bounce [animation-delay:0ms]"></div>
          <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:150ms]"></div>
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:300ms]"></div>
        </div>
      </div>
    </div>
  );
  if (!user) return null;


  return (
    <TutorialProvider>
      <AnnouncementBanner />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-[#f4f7fa] pt-12 md:pt-0 max-w-full overflow-x-hidden box-border">
          {outlet}
        </main>
        <BirthdayModal items={birthdays} open={showBirthday} onClose={() => setShowBirthday(false)} centerId={centerId} />
        <TutorialOverlay />
        <TutorialMenu />
      </div>
    </TutorialProvider>
  );
}
