import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineBell, HiOutlineChatAlt, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar, HiOutlineDocumentText, HiOutlineCog, HiOutlineMenu, HiOutlineX, HiOutlineCurrencyDollar, HiOutlineOfficeBuilding } from 'react-icons/hi';
import { FaRobot } from 'react-icons/fa';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';
import { getCached, setCached, DEFAULT_TTL } from '../src/utils/apiCache';

function getNavLinks(user: { role?: string | null; nannyId?: string | null } | null, t: (k: string, p?: Record<string, string>) => string) {
  // Parents 
  if (user && user.role === 'parent') {
    return [
      { to: '/dashboard', label: t('nav.dashboard'), icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
      { to: '/feed', label: t('nav.feed'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/notifications', label: t('nav.notifications'), icon: <HiOutlineBell className="w-5 h-5 mr-3" /> },
      { to: '/children', label: t('nav.children_my'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/parent', label: t('nav.parents'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/reports', label: t('nav.reports'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/activites', label: t('nav.activities'), icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
      { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
      { to: '/settings', label: t('nav.settings'), icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
    ];
  }
  // Nanny 
  if (user && user.nannyId) {
    return [
      { to: '/dashboard', label: t('nav.dashboard'), icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
      { to: '/feed', label: t('nav.feed'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/notifications', label: t('nav.notifications'), icon: <HiOutlineBell className="w-5 h-5 mr-3" /> },
      { to: '/children', label: t('nav.children'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/parent', label: t('nav.parents'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/nannies', label: t('nav.nannies'), icon: <HiOutlineHeart className="w-5 h-5 mr-3" /> },
      { to: '/activites', label: t('nav.activities'), icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
      { to: '/reports', label: t('nav.reports'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/assistant', label: t('nav.assistant'), icon: <FaRobot className="w-5 h-5 mr-3" /> },
      { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
      { to: '/settings', label: t('nav.settings'), icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
    ];
  }
  // (admin)
  return [
    { to: '/dashboard', label: t('nav.dashboard'), icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
    { to: '/feed', label: t('nav.feed'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    { to: '/notifications', label: t('nav.notifications'), icon: <HiOutlineBell className="w-5 h-5 mr-3" /> },
    ...(user && (typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/admin/centers', label: 'Centres', icon: <HiOutlineOfficeBuilding className="w-5 h-5 mr-3" /> }] : []),
    { to: '/children', label: t('nav.children'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/parent', label: t('nav.parents'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/nannies', label: t('nav.nannies'), icon: <HiOutlineHeart className="w-5 h-5 mr-3" /> },
    { to: '/activites', label: t('nav.activities'), icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
    { to: '/reports', label: t('nav.reports'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    { to: '/assistant', label: t('nav.assistant'), icon: <FaRobot className="w-5 h-5 mr-3" /> },
    { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
    ...(user && (typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/admin/reviews', label: t('nav.reviews'), icon: <HiOutlineChatAlt className="w-5 h-5 mr-3" /> }] : []),
    { to: '/settings', label: t('nav.settings'), icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
  ];
}

function MobileMenuButton({ showOnMd = false, onOpen }: { showOnMd?: boolean; onOpen: () => void }) {
  const [show, setShow] = useState(false);
  const { t } = useI18n();
  useEffect(() => {
    try {
      if (typeof window === 'undefined') { setShow(true); return; }
      const mqlSmall = window.matchMedia('(max-width: 767px)');
      const mqlShortLandscape = window.matchMedia('(max-height: 600px) and (orientation: landscape)');

      const computeShortLandscape = () => {
        try {
          // prefer a robust check: orientation + a reasonable viewport height threshold
          const orientLandscape = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(orientation: landscape)').matches;
          const h = typeof window !== 'undefined' ? window.innerHeight : Infinity;
          return orientLandscape && h <= 700;
        } catch {
          return mqlShortLandscape.matches;
        }
      };

      const update = () => setShow(mqlSmall.matches || (showOnMd && computeShortLandscape()));
      update();

      // listen to media query changes and also resize/orientation as fallback
      if (typeof mqlSmall.addEventListener === 'function') mqlSmall.addEventListener('change', update); else mqlSmall.addListener(update);
      if (typeof mqlShortLandscape.addEventListener === 'function') mqlShortLandscape.addEventListener('change', update); else mqlShortLandscape.addListener(update);
      window.addEventListener('resize', update);
      window.addEventListener('orientationchange', update);

      return () => {
        try { if (typeof mqlSmall.removeEventListener === 'function') mqlSmall.removeEventListener('change', update); else mqlSmall.removeListener(update); } catch { /* ignore */ }
        try { if (typeof mqlShortLandscape.removeEventListener === 'function') mqlShortLandscape.removeEventListener('change', update); else mqlShortLandscape.removeListener(update); } catch { /* ignore */ }
        try { window.removeEventListener('resize', update); } catch { /* ignore */ }
        try { window.removeEventListener('orientationchange', update); } catch { /* ignore */ }
      };
    } catch {
      setShow(true);
    }
  }, [showOnMd]);
  if (!show) return null;
  return (
    <button
      className="fixed top-4 right-4 z-60 bg-white rounded-full p-2 shadow-lg border border-gray-200"
      onClick={onOpen}
      aria-label={t('menu.open')}
    >
      <HiOutlineMenu className="w-7 h-7 text-gray-700" />
    </button>
  );
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useI18n();
  const [centerName, setCenterName] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const centerRateLimitUntilRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
  
    try {
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 768px)').matches) {
        return;
      }
    } catch {
      // ignore matchMedia errors in exotic environments
    }

    async function loadUnread() {
      try {
        // Avoid calling notifications API when unauthenticated to prevent 401s
        if (!user) return setUnreadCount(0);
        const res = await fetchWithRefresh('/api/notifications/unread-count', { credentials: 'include' });
        if (!mounted) return;
        if (!res.ok) return setUnreadCount(0);
        const j = await res.json();
        setUnreadCount(Number(j.unread) || 0);
      } catch {
        if (mounted) setUnreadCount(0);
      }
    }
    loadUnread();
    const iv = setInterval(loadUnread, 30000);
    function onChange() { loadUnread(); }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('notifications:changed', onChange as EventListener);
    }
    return () => { mounted = false; clearInterval(iv); if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') { window.removeEventListener('notifications:changed', onChange as EventListener); } };
  }, [user]);

  // lock page scroll when mobile menu is open so touch scroll targets the menu
  useEffect(() => {
    try {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    } catch {
      // ignore in non-browser environments
    }
    return () => { try { document.body.style.overflow = ''; } catch { /* ignore */ } };
  }, [open]);

  useEffect(() => {
    let mounted = true;
    async function loadCenter() {
      try {
  const centerId = user?.centerId;
        if (centerId) {
          const now = Date.now();
          if (centerRateLimitUntilRef.current > now) {
            if (import.meta.env.DEV) console.warn('Skipping centers fetch due to client rate-limit until', new Date(centerRateLimitUntilRef.current).toISOString());
            return;
          }

          const cacheKey = `/api/centers/${centerId}`;
          const cached = getCached<{ name?: string }>(cacheKey);
          if (cached) {
            setCenterName(cached.name || null);
            return;
          }

          const res = await fetch(`/centers/${centerId}`, { credentials: 'include' });
          if (!mounted) return;
          if (res.status === 429) {
            const ra = res.headers.get('Retry-After');
            const retry = ra ? parseInt(ra, 10) : NaN;
            const waitMs = !Number.isNaN(retry) ? retry * 1000 : 10_000;
            centerRateLimitUntilRef.current = Date.now() + waitMs;
            if (import.meta.env.DEV) console.warn('Centers request rate-limited, suppressing until', new Date(centerRateLimitUntilRef.current).toISOString());
            return;
          }
          if (res.ok) {
            const data = await res.json();
            setCenterName(data.name || null);
            setCached(cacheKey, { name: data.name || null }, DEFAULT_TTL);
            return;
          }
        }
      } catch {
        // ignore network errors
      }
      if (mounted) setCenterName(null);
    }
    loadCenter();
    return () => { mounted = false; };
  }, [user]);

  function displayCenterName(name: string | null) {
    if (!name) return 'Frimousse';
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Frimousse';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return (
    <>
      {/* show button on small screens, and also on short landscape (e.g. mobile landscape)
          but hide the floating burger when the overlay menu is open (so it doesn't remain fixed) */}
      {!open && <MobileMenuButton showOnMd={true} onOpen={() => setOpen(true)} />}
      {open && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex items-center gap-3 px-6 pt-8 pb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white flex items-center justify-center">
              <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-xl text-gray-900">{displayCenterName(centerName)}</span>
            <button
              className="ml-auto bg-gray-100 rounded-full p-2 border border-gray-200"
              onClick={() => setOpen(false)}
              aria-label={t('menu.close')}
            >
              <HiOutlineX className="w-6 h-6 text-gray-700" />
            </button>
          </div>
          <nav className="flex-1 px-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <ul className="space-y-1" style={{ paddingBottom: '96px' }}>
              {getNavLinks(user, t).map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`flex items-center px-4 py-3 rounded-lg font-medium transition text-lg ${location.pathname === link.to ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => setOpen(false)}
                  >
                    {link.icon}
                    <span className="flex-1">{link.label}</span>
                    {link.to === '/notifications' && unreadCount > 0 ? (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">{unreadCount}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto flex items-center gap-3 px-6 py-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-base font-bold text-blue-700 border border-blue-100">
              {user ? (user.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </div>
            <div>
              <div className="font-semibold text-gray-900 leading-tight">{user?.name || 'Utilisateur'}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role ? user.role.replace('_', ' ') : 'Utilisateur'}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
