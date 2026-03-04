import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const NAV_LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/fonctionnalites', label: 'Fonctionnalités' },
  { to: '/tarifs', label: 'Tarifs' },
  { to: '/support', label: 'Support' },
  { to: '/about', label: 'À propos' },
];

type PublicNavbarProps = {
  variant?: string;
};

export default function PublicNavbar({ variant = "dark" }: PublicNavbarProps) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = variant === "dark";

  /* ── style tokens ── */
  const barBg = isDark
    ? 'bg-brand-900/70 border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.25)]'
    : 'bg-white/80 border-gray-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)]';


  const logoText = isDark ? 'text-white' : 'text-brand-700';

  const linkBase = isDark
    ? '!text-[#ffffff] hover:bg-white/15'
    : 'text-gray-600 hover:text-brand-600 hover:bg-gray-50';

  const linkActive = isDark
    ? '!text-[#ffffff] bg-white/20'
    : 'text-brand-600 bg-brand-50';

  const authLink = isDark
    ? '!text-[#ffffff] hover:bg-white/15'
    : 'text-gray-600 hover:text-brand-600 hover:bg-gray-50';

  const ctaBtn = isDark
    ? 'bg-white text-brand-700 hover:shadow-lg hover:shadow-white/20 hover:scale-[1.03] active:scale-[0.98]'
    : 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm hover:shadow-md';

  const hamburgerColor = isDark ? 'text-white' : 'text-gray-700';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 sm:pt-5">
        <div className={`max-w-6xl mx-auto backdrop-blur-2xl rounded-full border px-5 sm:px-8 py-0 flex items-center justify-between ${barBg}`} style={{minHeight: 64, height: 64}}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 group pl-0 sm:pl-2">
            <div className="flex items-center justify-center transition-all mt-1 sm:-ml-4">
              <img loading="lazy" src="/imgs/ChatGPT-Image-4-mars-2026_-20_32_24-removebg-preview.webp" alt="Logo Frimousse" className="w-12 h-12 object-contain" />
            </div>
            <span className={`font-bold text-[15px] hidden sm:inline tracking-tight ${logoText}`}>Les frimousses</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const isActive = link.to === '/' ? pathname === '/' : pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-all ${isActive ? linkActive : linkBase}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Auth buttons + hamburger */}
          <div className="flex items-center gap-2">
            <Link to="/login" className={`text-sm font-bold px-4 py-2 rounded-full transition-all hidden sm:inline-flex ${authLink}`}>Connexion</Link>
            <Link to="/register" className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${ctaBtn}`}>Essai gratuit</Link>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className={`lg:hidden ml-1 p-2 rounded-full hover:bg-white/10 transition-colors ${hamburgerColor}`}
              aria-label="Menu"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute top-20 left-4 right-4 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 animate-in slide-in-from-top-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map(link => {
                const isActive = link.to === '/' ? pathname === '/' : pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`text-base font-semibold px-4 py-3 rounded-xl transition-all ${isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
            <hr className="my-4 border-gray-100" />
            <div className="flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-center text-base font-semibold text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all">Connexion</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="text-center text-base font-bold bg-brand-500 text-white px-4 py-3 rounded-xl hover:bg-brand-600 transition-all">Essai gratuit</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
