
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import type { User as AuthUser } from '../src/context/AuthContext';
import { useEffect, useState } from 'react';
import { HiOutlineViewGrid, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar, HiOutlineDocumentText, HiOutlineCog } from 'react-icons/hi';
import MobileMenu from './MobileMenu';


function getNavLinks(user: AuthUser | null) {
  // Parents should see a limited set of links
  if (user && user.role === 'parent') {
    return [
      { to: '/dashboard', label: 'Accueil', icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
      { to: '/feed', label: 'Fil d\'actualité', icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/children', label: 'Mes enfants', icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/parent', label: 'Parents', icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/reports', label: 'Rapports', icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/activites', label: 'Planning d\'activités', icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
      { to: '/settings', label: 'Paramètres', icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
    ];
  }

  if (user && user.nannyId) {
    return [
      { to: '/dashboard', label: 'Accueil', icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
      { to: '/feed', label: 'Fil d\'actualité', icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/children', label: 'Enfants', icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/parent', label: 'Parents', icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
      { to: '/activites', label: 'Planning d\'activités', icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
      { to: '/reports', label: 'Rapports', icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
      { to: '/settings', label: 'Paramètres', icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },

    ];
  }
  return [
    { to: '/dashboard', label: 'Accueil', icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
    { to: '/feed', label: 'Fil d\'actualité', icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    { to: '/children', label: 'Enfants', icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/parent', label: 'Parents', icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
    { to: '/nannies', label: 'Nounous', icon: <HiOutlineHeart className="w-5 h-5 mr-3" /> },
    { to: '/activites', label: 'Planning d\'activités', icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
    { to: '/reports', label: 'Rapports', icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
    { to: '/settings', label: 'Paramètres', icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
  ];
}

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [centerName, setCenterName] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    async function loadCenter() {
      try {
        if (user && user.centerId) {
          const res = await fetch(`/api/centers/${user.centerId}`, { credentials: 'include' });
          if (!mounted) return;
          if (res.ok) {
            const data = await res.json();
            setCenterName(data.name || null);
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
  let userName = 'Utilisateur';
  let userRole = 'Utilisateur';
  let userInitials = 'UT';
  if (user && user.name) {
    userName = user.name;
    userInitials = user.name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (user && user.role) {
    userRole = user.role;
  }
  return (
    <>
      <MobileMenu />
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 bg-white shadow-lg flex-col p-0 border-r border-gray-100 z-30">
         <div className="flex items-center gap-3 px-6 pt-8 pb-6">
          <div className="w-20 h-16 rounded-full overflow-hidden bg-white flex items-center justify-center">
            <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
          </div>
         <span className="font-extrabold text-xl text-gray-900">{displayCenterName(centerName)}</span>
        </div>
        <nav className="flex-1 px-2">
          <ul className="space-y-1">
            {getNavLinks(user).map(link => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition text-base ${location.pathname === link.to ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex items-center gap-3 px-6 py-6">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-base font-bold text-blue-700 border border-blue-100">{userInitials}</div>
          <div>
            <div className="font-semibold text-gray-900 leading-tight">{userName}</div>
            <div className="text-xs text-gray-400">{userRole}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
