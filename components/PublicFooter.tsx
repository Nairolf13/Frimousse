import { Link } from 'react-router-dom';

interface PublicFooterProps {
  /** "full" = 4-column footer (Landing). "compact" = single row (interior pages). */
  variant?: 'full' | 'compact';
}

export default function PublicFooter({ variant = 'compact' }: PublicFooterProps) {
  if (variant === 'compact') {
    return (
      <footer className="bg-brand-800 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img loading="lazy" src="/imgs/LogoFrimousse.webp" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-sm">Les Frimousses</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/70">
            <Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link to="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link to="/cgu" className="hover:text-white transition-colors">CGU</Link>
          </div>
          <div className="text-sm text-white/50">© Les Frimousses {new Date().getFullYear()}</div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-brand-800 text-white py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img loading="lazy" src="/imgs/LogoFrimousse.webp" alt="Logo" className="w-10 h-10 object-contain" />
              <span className="font-extrabold text-lg">Les Frimousses</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed max-w-xs">Gestion professionnelle et moderne pour les associations. Pensé avec bienveillance pour les enfants et les familles.</p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-white/60 mb-4">Liens utiles</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/about" className="text-white/80 hover:text-white transition-colors">À propos</Link></li>
              <li><Link to="/fonctionnalites" className="text-white/80 hover:text-white transition-colors">Fonctionnalités</Link></li>
              <li><Link to="/tarifs" className="text-white/80 hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link to="/support" className="text-white/80 hover:text-white transition-colors">Support</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-white/60 mb-4">Légal</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/mentions-legales" className="text-white/80 hover:text-white transition-colors">Mentions légales</Link></li>
              <li><Link to="/confidentialite" className="text-white/80 hover:text-white transition-colors">Confidentialité</Link></li>
              <li><Link to="/cgu" className="text-white/80 hover:text-white transition-colors">CGU</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-white/60 mb-4">Contact</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="text-white/80">bricchi.florian@outlook.com</li>
              <li className="text-white/80">+33 6 47 48 67 34</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-white/50">© Les Frimousses {new Date().getFullYear()}. Tous droits réservés.</div>
        </div>
      </div>
    </footer>
  );
}
