import WeeklyActivityCalendar from '../components/WeeklyActivityCalendar';
import { useEffect, useState } from 'react';

export default function Activites() {
  const [isShortLandscape, setIsShortLandscape] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-height: 600px) and (orientation: landscape)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange); else mql.addListener(onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => { try { if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange); else mql.removeListener(onChange); } catch { /* ignore */ } window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange); };
  }, []);

  return (
    <div className={`min-h-screen bg-[#f7f8fa] w-full flex flex-col items-center ${!isShortLandscape ? 'md:pl-64' : ''} px-2 md:px-8 py-8`}>
      <div className="w-full max-w-6xl mx-auto">
        <WeeklyActivityCalendar />
      </div>
    </div>
  );
}
