
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { HiOutlineViewGrid, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar, HiOutlineDocumentText, HiOutlineCog } from 'react-icons/hi';
import MobileMenu from './MobileMenu';

const navLinks = [
  { to: '/dashboard', label: 'Accueil', icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
  { to: '/children', label: 'Enfants', icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
  { to: '/nannies', label: 'Nounous', icon: <HiOutlineHeart className="w-5 h-5 mr-3" /> },
  { to: '/schedule', label: 'Planning', icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
  { to: '/reports', label: 'Rapports', icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
  { to: '/settings', label: 'Paramètres', icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
];

export default function Sidebar() {
  const location = useLocation();
  // Récupère l'utilisateur connecté via le contexte
  const { user } = useAuth();
  // Affichage robuste du nom et des initiales
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
      {/* Menu mobile visible uniquement sur mobile */}
      <MobileMenu />
      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 bg-white shadow-lg flex-col p-0 border-r border-gray-100 z-30">
        {/* Logo et titre */}
        <div className="flex items-center gap-3 px-6 pt-8 pb-6">
          <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center text-2xl">
            <span role="img" aria-label="maison">🏡</span>
          </div>
          <span className="font-extrabold text-xl text-gray-900">Frimousse</span>
        </div>
        {/* Navigation */}
        <nav className="flex-1 px-2">
          <ul className="space-y-1">
            {navLinks.map(link => (
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
        {/* Profil utilisateur en bas */}
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
