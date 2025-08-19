import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineUserGroup, HiOutlineHeart, HiOutlineCalendar, HiOutlineDocumentText, HiOutlineCog, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { useAuth } from '../src/context/AuthContext';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: <HiOutlineViewGrid className="w-5 h-5 mr-3" /> },
  { to: '/children', label: 'Enfants', icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
  { to: '/parent', label: 'Parents', icon: <HiOutlineUserGroup className="w-5 h-5 mr-3" /> },
  { to: '/nannies', label: 'Nounous', icon: <HiOutlineHeart className="w-5 h-5 mr-3" /> },
  { to: '/activites', label: 'Planning', icon: <HiOutlineCalendar className="w-5 h-5 mr-3" /> },
  { to: '/reports', label: 'Rapports', icon: <HiOutlineDocumentText className="w-5 h-5 mr-3" /> },
  { to: '/settings', label: 'Paramètres', icon: <HiOutlineCog className="w-5 h-5 mr-3" /> },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <button
        className="fixed top-4 right-4 z-40 md:hidden bg-white rounded-full p-2 shadow-lg border border-gray-200"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <HiOutlineMenu className="w-7 h-7 text-gray-700" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-3 px-6 pt-8 pb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white flex items-center justify-center">
              <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-xl text-gray-900">{displayCenterName(centerName)}</span>
            <button
              className="ml-auto bg-gray-100 rounded-full p-2 border border-gray-200"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
            >
              <HiOutlineX className="w-6 h-6 text-gray-700" />
            </button>
          </div>
          <nav className="flex-1 px-2">
            <ul className="space-y-1">
              {navLinks.map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`flex items-center px-4 py-3 rounded-lg font-medium transition text-lg ${location.pathname === link.to ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => setOpen(false)}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto flex items-center gap-3 px-6 py-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-base font-bold text-blue-700 border border-blue-100">MD</div>
            <div>
              <div className="font-semibold text-gray-900 leading-tight">Marie Dubois</div>
              <div className="text-xs text-gray-400">Administratrice</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
