import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

export default function SupportPage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Support et aide | Frimousse - Application de gestion creche"}
        description={"Besoin d'aide sur Frimousse ? Guides, assistance technique, documentation et FAQ pour les creches, micro-creches, MAM et garderies. Support reactif par email."}
        url={"https://lesfrimousses.com/support"}
        image={"https://lesfrimousses.com/imgs/LogoFrimousse.webp"}
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'Support', url: 'https://lesfrimousses.com/support' }]}
      />

      <PublicNavbar />

      <main className="flex-1 w-full">
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-brand-300/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-white/15 px-4 py-1.5 rounded-full mb-6 border border-white/20">Support</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold !text-[#ffffff] leading-[1.1] tracking-tight mb-6">
              Comment pouvons-nous
              <br />
              <span className="bg-gradient-to-r from-brand-200 via-brand-100 to-cream-100 bg-clip-text text-transparent">vous aider ?</span>
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Retrouvez toutes les ressources pour bien utiliser Frimousse, obtenir de l'aide ou contacter notre équipe.
            </p>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 120V60C240 15 480 0 720 25C960 50 1200 80 1440 50V120H0Z" fill="white"/></svg>
          </div>
        </section>

        {/* ── Contact & Guides ── */}
        <section className="py-20 md:py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contact card */}
              <div className="group p-8 rounded-3xl border border-gray-100 hover:border-brand-200 bg-white hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-6">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contactez-nous</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Email</p>
                      <a href="mailto:bricchi.florian@outlook.com" className="text-brand-600 font-semibold hover:underline">bricchi.florian@outlook.com</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Téléphone</p>
                      <a href="tel:+33647486734" className="text-brand-600 font-semibold hover:underline">+33 6 47 48 67 34</a>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/></svg>
                    <div>
                      <p className="font-semibold text-amber-800 text-sm">Support premium</p>
                      <p className="text-amber-700 text-xs mt-0.5">Assistance prioritaire pour les abonnés Essentiel & Pro (jours ouvrés, 9h-18h).</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guides card */}
              <div className="group p-8 rounded-3xl border border-gray-100 hover:border-brand-200 bg-white hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Guides & Documentation</h2>
                <div className="space-y-2">
                  {[
                    { to: '/guide-demarrage', label: 'Guide de démarrage rapide', icon: '\u{1F680}' },
                    { to: '/guide-ajouter-enfant', label: 'Ajouter un enfant', icon: '\u{1F476}' },
                    { to: '/guide-planning', label: 'Gérer un planning', icon: '\u{1F4C5}' },
                    { to: '/guide-export-rapport', label: 'Voir les rapports', icon: '\u{1F4CA}' },
                    { to: '/guide-securite', label: 'Sécurité & RGPD', icon: '\u{1F512}' },
                  ].map(guide => (
                    <Link
                      key={guide.to}
                      to={guide.to}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group/link"
                    >
                      <span className="text-lg">{guide.icon}</span>
                      <span className="text-[15px] font-medium text-gray-700 group-hover/link:text-brand-600 transition-colors">{guide.label}</span>
                      <svg className="w-4 h-4 text-gray-300 group-hover/link:text-brand-400 ml-auto transition-all group-hover/link:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
                    </Link>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-2xl bg-brand-50 border border-brand-100">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg>
                    <div>
                      <p className="font-semibold text-brand-800 text-sm">Communauté</p>
                      <p className="text-brand-600 text-xs mt-0.5">Échangez avec d'autres utilisateurs et partagez vos bonnes pratiques.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal links */}
            <div className="mt-16 text-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Ressources complémentaires</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { to: '/confidentialite', label: 'Politique de confidentialité' },
                  { to: '/cgu', label: 'CGU' },
                  { to: '/mentions-legales', label: 'Mentions légales' },
                ].map(link => (
                  <Link key={link.to} to={link.to} className="px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:border-brand-200 hover:text-brand-600 hover:bg-brand-50 transition-all">{link.label}</Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-6 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-brand-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-brand-300/15 rounded-full blur-[80px]" />
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold !text-[#ffffff] tracking-tight mb-6">Prêt à démarrer ?</h2>
            <p className="!text-[#ffffff] text-lg mb-10 max-w-xl mx-auto leading-relaxed">Créez votre compte gratuitement et découvrez toutes les fonctionnalités de Frimousse.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register" className="group bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3">
                Essayer gratuitement
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
              </Link>
              <Link to="/" className="!text-[#ffffff] border-2 border-white/25 hover:border-white/50 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-white/10">
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
