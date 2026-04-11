import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineBell, HiOutlineChatAlt, HiOutlineChatAlt2, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar, HiOutlineDocumentText, HiOutlineCog, HiOutlineMenu, HiOutlineX, HiOutlineCurrencyDollar, HiOutlineOfficeBuilding, HiOutlineCreditCard, HiOutlineSun, HiOutlineMoon, HiOutlineExclamationCircle } from 'react-icons/hi';
import { useTheme } from '../hooks/useTheme';
import { FaRobot } from 'react-icons/fa';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';
import { getCached, setCached, DEFAULT_TTL } from '../src/utils/apiCache';
import { useNotificationsContext } from '../src/context/notificationsContext';

function getNavLinks(user: { role?: string | null; nannyId?: string | null; plan?: string | null; subscriptionStatus?: string | null } | null, t: (k: string, p?: Record<string, string> | string) => string) {
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
      ...((user?.plan || '').toLowerCase() === 'pro' || (user?.subscriptionStatus || '').toLowerCase() === 'trialing' || (user && typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/messages', label: t('nav.messages', 'Messages'), icon: <HiOutlineChatAlt2 className="w-5 h-5 mr-3" /> }] : []),
      { to: '/presence-sheets', label: t('nav.presenceSheets', 'Feuilles de présence'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
      { to: '/settings', label: t('nav.settings'), icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
    ];
  }
  // Nanny
  if (user && user.nannyId && user.role !== 'admin' && !(typeof user.role === 'string' && user.role.toLowerCase().includes('super'))) {
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
      ...((user?.plan || '').toLowerCase() === 'pro' || (user?.subscriptionStatus || '').toLowerCase() === 'trialing' || user?.role === 'super-admin' ? [{ to: '/messages', label: t('nav.messages', 'Messages'), icon: <HiOutlineChatAlt2 className="w-5 h-5 mr-3" /> }] : []),
      { to: '/presence-sheets', label: t('nav.presenceSheets', 'Feuilles de présence'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
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
      { to: '/admin/centers', label: t('nav.centers', 'Centres'), icon: <HiOutlineOfficeBuilding className="w-5 h-5 mr-3" /> },
      { to: '/admin/support', label: t('nav.support', 'Support'), icon: <HiOutlineChatAlt className="w-5 h-5 mr-3" /> },
      { to: '/admin/announcements', label: t('nav.announcements', 'Annonces'), icon: <HiOutlineBell className="w-5 h-5 mr-3" /> },
      { to: '/admin/not-found-logs', label: t('nav.notfoundlogs', 'Pages 404'), icon: <HiOutlineExclamationCircle className="w-5 h-5 mr-3" /> },
    ] : []),
    { to: '/children', label: t('nav.children'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/parent', label: t('nav.parents'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/nannies', label: t('nav.nannies'), icon: <HiOutlineHeart className="w-5 h-5 mr-3" /> },
    { to: '/activites', label: t('nav.activities'), icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
    { to: '/reports', label: t('nav.reports'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    ...((user?.plan || '').toLowerCase() === 'pro' || (user && typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/assistant', label: t('nav.assistant'), icon: <FaRobot className="w-5 h-5 mr-3" /> }] : []),
    ...((user?.plan || '').toLowerCase() === 'pro' || (user?.subscriptionStatus || '').toLowerCase() === 'trialing' || (user && typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/messages', label: t('nav.messages', 'Messages'), icon: <HiOutlineChatAlt2 className="w-5 h-5 mr-3" /> }] : []),
    { to: '/presence-sheets', label: t('nav.presenceSheets', 'Feuilles de présence'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
    ...(user && (typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/admin/reviews', label: t('nav.reviews', 'Avis'), icon: <HiOutlineChatAlt className="w-5 h-5 mr-3" /> }] : []),
    ...(user && (typeof user.role === 'string' && (user.role === 'admin' || user.role.toLowerCase().includes('super'))) ? [{ to: '/subscription', label: t('nav.subscription', 'Mon abonnement'), icon: <HiOutlineCreditCard className="w-5 h-5 mr-3" /> }] : []),
    { to: '/settings', label: t('nav.settings'), icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
  ];
}

function ThemeToggleButton() {
  const { resolved, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
      className="flex-shrink-0 p-1.5 rounded-lg text-muted hover:text-primary hover:bg-input transition"
      title={resolved === 'dark' ? 'Mode clair' : 'Mode sombre'}
    >
      {resolved === 'dark' ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
    </button>
  );
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
      className="fixed top-3 right-3 z-60 bg-card rounded-full p-1.5 shadow-md border border-border-default"
      onClick={onOpen}
      aria-label={t('menu.open')}
    >
      <HiOutlineMenu className="w-5 h-5 text-primary" />
    </button>
  );
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Ferme le menu dès que la navigation est effective (nouvelle page chargée)
  // sauf si un tutoriel garde le menu ouvert (tutorialKeepOpenRef.current = true)
  useEffect(() => {
    if (tutorialKeepOpenRef.current) return;
    setOpen(false);
  }, [location]);
  const { user } = useAuth();
  const { t } = useI18n();

  // Ouvre le menu quand le tutoriel en a besoin sur mobile
  // tutorialKeepOpen empêche le menu de se fermer lors d'un changement de route pendant un tuto
  const tutorialKeepOpenRef = useRef(false);
  useEffect(() => {
    const openHandler = () => { tutorialKeepOpenRef.current = true; setOpen(true); };
    const closeHandler = () => { tutorialKeepOpenRef.current = false; setOpen(false); };
    window.addEventListener('tutorial:open-mobile-menu', openHandler);
    window.addEventListener('tutorial:close-mobile-menu', closeHandler);
    return () => {
      window.removeEventListener('tutorial:open-mobile-menu', openHandler);
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

          const res = await fetch(`/api/centers/${centerId}`, { credentials: 'include' });
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

  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent<{ name: string }>).detail?.name ?? null;
      setCenterName(name);
      const centerId = user?.centerId;
      if (centerId) setCached(`/api/centers/${centerId}`, { name }, DEFAULT_TTL);
    };
    window.addEventListener('center:nameUpdated', handler);
    return () => window.removeEventListener('center:nameUpdated', handler);
  }, [user?.centerId]);

  function displayCenterName(name: string | null) {
    if (!name) return '...';
    const trimmed = name.trim();
    if (trimmed.length === 0) return '...';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return (
    <>
      {/* show button on small screens, and also on short landscape (e.g. mobile landscape)
          but hide the floating burger when the overlay menu is open (so it doesn't remain fixed) */}
      {!open && <MobileMenuButton showOnMd={true} onOpen={() => setOpen(true)} />}
      <div className="fixed inset-0 z-[9999] bg-card flex flex-col" style={{ WebkitOverflowScrolling: 'touch', visibility: open ? 'visible' : 'hidden', pointerEvents: open ? 'auto' : 'none', opacity: open ? 1 : 0 }}>
          <div className="flex items-center gap-3 px-6 pt-7 pb-5">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-brand-50 flex items-center justify-center ring-1 ring-brand-100 shadow-sm">
              <img src="/imgs/FrimousseLogo.webp" alt="Logo Frimousse" className="w-8 h-8 object-contain" />
            </div>
            <span data-tour="sidebar-logo" className="font-extrabold text-lg text-primary">{displayCenterName(centerName)}</span>
            <button
              className="ml-auto bg-card-hover rounded-xl p-2.5 border border-border-default hover:bg-input transition-colors"
              onClick={() => setOpen(false)}
              aria-label={t('menu.close')}
            >
              <HiOutlineX className="w-5 h-5 text-secondary" />
            </button>
          </div>
          <div className="mx-4 mb-2 border-t border-border-default"></div>
          <nav className="flex-1 px-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <ul className="space-y-0.5" style={{ paddingBottom: '96px' }}>
              {getNavLinks(user ?? null, t).map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    data-tour={`nav-${link.to.replace(/^\//, '').replace(/\//g, '-') || 'dashboard'}`}
                    className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-150 text-base ${location.pathname === link.to ? 'bg-accent-light text-accent font-semibold' : 'text-secondary hover:bg-input'}`}
                    onClick={(e) => { e.preventDefault(); if (!tutorialKeepOpenRef.current) setOpen(false); navigate(link.to); }}
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
          <div className="mx-4 border-t border-border-default"></div>
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#e6f4f7] flex items-center justify-center text-sm font-semibold text-[#0b5566] flex-shrink-0">
              {(user as { avatarUrl?: string } | null)?.avatarUrl ? (
                <img src={(user as { avatarUrl?: string }).avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (user?.name || 'U').split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-primary leading-tight text-sm">{user?.name || 'Utilisateur'}</div>
              <div className="text-xs text-muted capitalize">{user?.role ? user.role.replace('_', ' ') : 'Utilisateur'}</div>
            </div>
            <ThemeToggleButton />
          </div>
        </div>
    </>
  );
}
