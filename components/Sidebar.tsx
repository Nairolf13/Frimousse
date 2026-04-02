import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import type { User as AuthUser } from '../src/context/AuthContext';
import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import AvatarCropper from './AvatarCropper';
import { useI18n } from '../src/lib/useI18n';
import { HiOutlineViewGrid, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar, HiOutlineDocumentText, HiOutlineCog, HiOutlineBell, HiOutlineCurrencyDollar, HiOutlineChatAlt, HiOutlineOfficeBuilding, HiOutlineCreditCard, HiOutlineChatAlt2 } from 'react-icons/hi';
import { FaRobot } from 'react-icons/fa';
import MobileMenu from './MobileMenu';
// caching and rate-limit managed by hooks
import { useNotificationsContext } from '../src/context/notificationsContext';
import { useCenterInfo } from '../src/hooks/useCenterInfo';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';


function getNavLinks(user: AuthUser | null, t: (k: string, p?: Record<string, string> | string) => string) {
  // Parents should see a limited set of links
  if (user && user.role === 'parent') {
    return [
      { to: '/dashboard', label: t('nav.dashboard'), icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
      { to: '/feed', label: t('nav.feed'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/notifications', label: t('nav.notifications'), icon: <HiOutlineBell className="w-5 h-5 mr-3" /> },
      { to: '/children', label: t('nav.children_my'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/parent', label: t('nav.parents'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/reports', label: t('nav.reports'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/activites', label: t('nav.activities'), icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
      ...((user?.plan || '').toLowerCase() === 'pro' || (user?.subscriptionStatus || '').toLowerCase() === 'trialing' || (user && typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/messages', label: t('nav.messages'), icon: <HiOutlineChatAlt2 className="w-5 h-5 mr-3" /> }] : []),
      { to: '/presence-sheets', label: t('nav.presenceSheets'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
      { to: '/settings', label: t('nav.settings'), icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
    ];
  }

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
      ...((user?.plan || '').toLowerCase() === 'pro' || (user?.subscriptionStatus || '').toLowerCase() === 'trialing' || user?.role === 'super-admin' ? [{ to: '/messages', label: t('nav.messages'), icon: <HiOutlineChatAlt2 className="w-5 h-5 mr-3" /> }] : []),
      { to: '/presence-sheets', label: t('nav.presenceSheets'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
      { to: '/settings', label: t('nav.settings'), icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
    ];
  }
  return [
    { to: '/dashboard', label: t('nav.dashboard'), icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
    { to: '/feed', label: t('nav.feed'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    { to: '/notifications', label: t('nav.notifications'), icon: <HiOutlineBell className="w-5 h-5 mr-3" /> },
    // Admin links regroupés
    ...(user && (typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [
      { to: '/admin/centers', label: t('nav.centers', 'Centres'), icon: <HiOutlineOfficeBuilding className="w-5 h-5 mr-3" /> },
      { to: '/admin/support', label: t('nav.support', 'Support'), icon: <HiOutlineChatAlt className="w-5 h-5 mr-3" /> },
      { to: '/admin/announcements', label: t('nav.announcements', 'Annonces'), icon: <HiOutlineBell className="w-5 h-5 mr-3" /> },
    ] : []),
    { to: '/children', label: t('nav.children'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/parent', label: t('nav.parents'), icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/nannies', label: t('nav.nannies'), icon: <HiOutlineHeart className="w-5 h-5 mr-3" /> },
    { to: '/activites', label: t('nav.activities'), icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
    { to: '/reports', label: t('nav.reports'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    ...((user?.plan || '').toLowerCase() === 'pro' || (user?.subscriptionStatus || '').toLowerCase() === 'trialing' || (user && typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/assistant', label: t('nav.assistant'), icon: <FaRobot className="w-5 h-5 mr-3" /> }] : []),
    ...((user?.plan || '').toLowerCase() === 'pro' || (user?.subscriptionStatus || '').toLowerCase() === 'trialing' || (user && typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/messages', label: t('nav.messages'), icon: <HiOutlineChatAlt2 className="w-5 h-5 mr-3" /> }] : []),
    { to: '/presence-sheets', label: t('nav.presenceSheets'), icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    { to: '/payment-history', label: t('nav.payments'), icon: <HiOutlineCurrencyDollar className="w-5 h-5 mr-3" /> },
    ...(user && (typeof user.role === 'string' && user.role.toLowerCase().includes('super')) ? [{ to: '/admin/reviews', label: t('nav.reviews', 'Avis'), icon: <HiOutlineChatAlt className="w-5 h-5 mr-3" /> }] : []),
    ...(user && (typeof user.role === 'string' && (user.role === 'admin' || user.role.toLowerCase().includes('super'))) ? [{ to: '/subscription', label: t('nav.subscription', 'Mon abonnement'), icon: <HiOutlineCreditCard className="w-5 h-5 mr-3" /> }] : []),
    { to: '/settings', label: t('nav.settings'), icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
  ];
}

export default function Sidebar() {
  const location = useLocation();
  const { user, setUser } = useAuth();
  const { t } = useI18n();
  const [supportCount, setSupportCount] = useState<number | null>(null);
  const [isShortLandscape, setIsShortLandscape] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  
  // consume the global notifications context (single-tab polling)
  const { unreadCount, unreadReviews } = useNotificationsContext();
  const centerId = user && (user as { centerId?: string }).centerId;
  const { center } = useCenterInfo(centerId ?? null);
  const [centerName, setCenterName] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const loadSupportCount = async () => {
      try {
        if (!user || typeof user.role !== 'string' || !user.role.toLowerCase().includes('super')) return;
        const res = await fetchWithRefresh('/api/support/admin/tickets/unread-count', { credentials: 'include' });
        if (!res || !res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (data && typeof data.unread === 'number') setSupportCount(data.unread);
      } catch (e) {
        console.error('Failed to load support ticket count', e);
      }
    };
    // debounce multiple triggers (avoid repeated refreshes when notificationsContext polls)
    const timer = setTimeout(() => { loadSupportCount(); }, 250);
    return () => { mounted = false; clearTimeout(timer); };
  }, [user, unreadCount]);

  // Écouter l'événement custom pour rafraîchir le compteur quand un ticket est marqué comme lu
  useEffect(() => {
    const refreshSupportCount = async () => {
      try {
        if (!user || typeof user.role !== 'string' || !user.role.toLowerCase().includes('super')) return;
        const res = await fetchWithRefresh('/api/support/admin/tickets/unread-count', { credentials: 'include' });
        if (!res || !res.ok) return;
        const data = await res.json();
        if (data && typeof data.unread === 'number') setSupportCount(data.unread);
      } catch (e) {
        console.error('Failed to refresh support count', e);
      }
    };
    window.addEventListener('support-tickets-updated', refreshSupportCount);
    return () => window.removeEventListener('support-tickets-updated', refreshSupportCount);
  }, [user]);

  // Note: We don't mark tickets as read just by visiting /admin/support
  // Tickets are marked as read only when admin opens a specific user's conversation

  useEffect(() => {
    setCenterName(center?.name ?? null);
  }, [center]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 768px) and (max-height: 600px)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    // modern API
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
    } else if (typeof mql.addListener === 'function') {
      // legacy
      mql.addListener(onChange);
    }
    const onResize = () => onChange();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', onChange);
      } else if (typeof mql.removeListener === 'function') {
        mql.removeListener(onChange);
      }
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const uploadAvatar = async (file: File) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetchWithRefresh('/api/user/me/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Avatar upload failed', text);
        return;
      }
      const json = await res.json();
      if (json && json.avatarUrl && user) {
        setUser({ ...user, avatarUrl: json.avatarUrl });
      }
    } catch (e) {
      console.error('Error uploading avatar', e);
    } finally {
      setAvatarUploading(false);
    }
  };

  const onAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setCropModalOpen(true);
  };

  const closeCropModal = () => {
    setCropModalOpen(false);
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
  };

  function displayCenterName(name: string | null) {
    if (!name) return 'Frimousse';
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Frimousse';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  let userName = 'Utilisateur';
  let userRole = 'Utilisateur';
  if (user && user.name) {
    userName = user.name;
  }
  if (user && user.role) {
    userRole = user.role;
  }
  return (
    <>
      <MobileMenu />
      {!isShortLandscape && (
        <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 bg-white/95 backdrop-blur-sm shadow-lg flex-col p-0 border-r border-gray-100/80 z-30">
         <div className="flex items-center gap-3 px-6 pt-7 pb-5">
          <div className="w-14 h-14 flex items-center justify-center">
            <img src="/imgs/FrimousseLogo.webp" alt="Logo Frimousse" className="w-12 h-12 object-contain" />
          </div>
         <div className="flex flex-col">
           <span data-tour="sidebar-logo" className="font-extrabold text-lg text-gray-900 leading-tight">{displayCenterName(centerName)}</span>
           <span className="text-xs text-gray-400 font-medium">Gestion crèche</span>
         </div>
        </div>
        <div className="mx-4 mb-3 border-t border-gray-100"></div>
        <nav className="flex-1 px-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {getNavLinks(user, t).map(link => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  data-tour={`nav-${link.to.replace(/^\//, '').replace(/\//g, '-') || 'dashboard'}`}
                  className={`flex items-center px-3 py-2.5 rounded-xl font-medium transition-all duration-150 text-sm ${location.pathname === link.to ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  {link.icon}
                  <span className="flex-1">{link.label}</span>
                  {link.to === '/notifications' && unreadCount > 0 ? (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-[#0b5566] text-white">{unreadCount}</span>
                  ) : null}
                  {link.to === '/admin/support' && typeof supportCount === 'number' && supportCount > 0 ? (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-[#0b5566] text-white">{supportCount}</span>
                  ) : null}
                  {link.to === '/admin/reviews' && typeof unreadReviews === 'number' && unreadReviews > 0 ? (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-[#0b5566] text-white">{unreadReviews}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mx-4 border-t border-gray-100"></div>
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#e6f4f7] flex items-center justify-center text-sm font-semibold text-[#0b5566]">{
              user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userName.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
              )
            }</div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-white border border-gray-200 text-xs text-[#0b5566] flex items-center justify-center shadow-sm hover:bg-gray-50"
              title="Modifier la photo de profil"
            >
              {avatarUploading ? '...' : '✎'}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onAvatarFileChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 leading-tight text-sm truncate">{userName}</div>
            <div className="text-xs text-gray-400 capitalize">{userRole}</div>
          </div>
        </div>
        {cropModalOpen && cropImageSrc && (
          <AvatarCropper
            imageSrc={cropImageSrc}
            onCancel={closeCropModal}
            onApply={(croppedFile) => {
              closeCropModal();
              uploadAvatar(croppedFile);
            }}
          />
        )}
        </aside>
      )}
    </>
  );
}
