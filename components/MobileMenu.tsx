import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineBell, HiOutlineChatAlt, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar, HiOutlineDocumentText, HiOutlineCog, HiOutlineMenu, HiOutlineX, HiOutlineCurrencyDollar, HiOutlineOfficeBuilding, HiOutlineCreditCard } from 'react-icons/hi';
import { FaRobot } from 'react-icons/fa';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';
import { getCached, setCached, DEFAULT_TTL } from '../src/utils/apiCache';
import { useNotificationsContext } from '../src/context/notificationsContext';

function getNavLinks(user: { role?: string | null; nannyId?: string | null; plan?: string | null; subscriptionStatus?: string | null } | null, t: (k: string, p?: Record<string, string>) => string) {
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
      ...((user?.plan || '').toLowerCase() === 'pro' || (user?.subscriptionStatus || '').toLowerCase() === 'trialing' || user?.role === 'super-admin' ? [{ to: '/assistant', label: t('nav.assistant'), icon: <FaRobot className="w-5 h-5 mr-3" /> }] : []),
      { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
      { to: '/settings', label: t('nav.settings'), icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
    ];
  }
  // (admin)
  return [
    { to: '/dashboard', label: t('nav.dashboard'), icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
    { to: '/feed', label: t('nav.feed'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    { to: '/notifications', label: t('nav.notifications'), icon: <HiOutlineBell className="w-5 h-5 mr-3" /> },
    ...(user && (typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [
      { to: '/admin/centers', label: 'Centres', icon: <HiOutlineOfficeBuilding className="w-5 h-5 mr-3" /> },
      { to: '/admin/support', label: 'Support', icon: <HiOutlineChatAlt className="w-5 h-5 mr-3" /> }
    ] : []),
    { to: '/children', label: t('nav.children'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/parent', label: t('nav.parents'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/nannies', label: t('nav.nannies'), icon: <HiOutlineHeart className="w-5 h-5 mr-3" /> },
    { to: '/activites', label: t('nav.activities'), icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
    { to: '/reports', label: t('nav.reports'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    ...((user?.plan || '').toLowerCase() === 'pro' || (user && typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/assistant', label: t('nav.assistant'), icon: <FaRobot className="w-5 h-5 mr-3" /> }] : []),
    { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
    ...(user && (typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/admin/reviews', label: t('nav.reviews'), icon: <HiOutlineChatAlt className="w-5 h-5 mr-3" /> }] : []),
    ...(user && (typeof user.role === 'string' && (user.role === 'admin' || user.role.toLowerCase().includes('super'))) ? [{ to: '/subscription', label: 'Mon abonnement', icon: <HiOutlineCreditCard className="w-5 h-5 mr-3" /> }] : []),
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
      className="fixed top-3 right-3 z-60 bg-white rounded-full p-1.5 shadow-md border border-gray-200"
      onClick={onOpen}
      aria-label={t('menu.open')}
    >
      <HiOutlineMenu className="w-5 h-5 text-gray-700" />
    </button>
  );
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Ferme le menu dès que la navigation est effective (nouvelle page chargée)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  const { user } = useAuth();
  const { t } = useI18n();

  // Ouvre le menu quand le tutoriel en a besoin sur mobile
  useEffect(() => {
    const handler = () => setOpen(true);
    const closeHandler = () => setOpen(false);
    window.addEventListener('tutorial:open-mobile-menu', handler);
    window.addEventListener('tutorial:close-mobile-menu', closeHandler);
    return () => {
      window.removeEventListener('tutorial:open-mobile-menu', handler);
      window.removeEventListener('tutorial:close-mobile-menu', closeHandler);
    };
  }, []);
  const [centerName, setCenterName] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { unreadReviews } = useNotificationsContext();
  const [supportCount, setSupportCount] = useState<number>(0);
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

  useEffect(() => {
    let mounted = true;
    async function loadSupport() {
      try {
        if (!user || typeof (user as { role?: string }).role !== 'string' || !(user as { role?: string }).role!.toLowerCase().includes('super')) return;
        const res = await fetchWithRefresh('/api/support/admin/tickets/unread-count', { credentials: 'include' });
        if (!res || !res.ok || !mounted) return;
        const data = await res.json();
        if (data && typeof data.unread === 'number') setSupportCount(data.unread);
      } catch { /* ignore */ }
    }
    loadSupport();
    const handler = () => loadSupport();
    window.addEventListener('notifications:changed', handler as EventListener);
    return () => { mounted = false; window.removeEventListener('notifications:changed', handler as EventListener); };
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
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col" style={{ WebkitOverflowScrolling: 'touch', visibility: open ? 'visible' : 'hidden', pointerEvents: open ? 'auto' : 'none', opacity: open ? 1 : 0 }}>
          <div className="flex items-center gap-3 px-6 pt-7 pb-5">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-brand-50 flex items-center justify-center ring-1 ring-brand-100 shadow-sm">
              <img src="/imgs/ChatGPT-Image-4-mars-2026_-20_32_24-removebg-preview.webp" alt="Logo Frimousse" className="w-8 h-8 object-contain" />
            </div>
            <span data-tour="sidebar-logo" className="font-extrabold text-lg text-gray-900">{displayCenterName(centerName)}</span>
            <button
              className="ml-auto bg-gray-100 rounded-xl p-2.5 border border-gray-200 hover:bg-gray-200 transition-colors"
              onClick={() => setOpen(false)}
              aria-label={t('menu.close')}
            >
              <HiOutlineX className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="mx-4 mb-2 border-t border-gray-100"></div>
          <nav className="flex-1 px-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <ul className="space-y-0.5" style={{ paddingBottom: '96px' }}>
              {getNavLinks(user, t).map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-150 text-base ${location.pathname === link.to ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                    onClick={(e) => { e.preventDefault(); navigate(link.to); }}
                  >
                    {link.icon}
                    <span className="flex-1">{link.label}</span>
                    {link.to === '/notifications' && unreadCount > 0 ? (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-[#0b5566] text-white">{unreadCount}</span>
                    ) : null}
                    {link.to === '/admin/reviews' && (unreadReviews ?? 0) > 0 ? (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-[#0b5566] text-white">{unreadReviews}</span>
                    ) : null}
                    {link.to === '/admin/support' && supportCount > 0 ? (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-[#0b5566] text-white">{supportCount}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mx-4 border-t border-gray-100"></div>
          <div className="flex items-center gap-3 px-5 py-5">
            <div>
              <div className="font-semibold text-gray-900 leading-tight text-sm">{user?.name || 'Utilisateur'}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role ? user.role.replace('_', ' ') : 'Utilisateur'}</div>
            </div>
          </div>
        </div>
    </>
  );
}
