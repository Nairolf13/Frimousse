import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useNavigate } from 'react-router-dom';

export default function LegalNoticePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Mentions légales | Frimousse Association"}
        description={"Mentions légales de Frimousse : éditeur, hébergeur, propriété intellectuelle, contact, conformité légale."}
        url={"https://lesfrimousses.com/mentions-legales"}
      />
      <PublicNavbar />
      <main className="flex-1 w-full">
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-brand-300/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-white/15 px-4 py-1.5 rounded-full mb-6 border border-white/20">Mentions légales</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold !text-[#ffffff] leading-[1.1] tracking-tight mb-6">
              Mentions légales
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Éditeur, hébergeur, propriété intellectuelle, contact, conformité légale.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 120V60C240 15 480 0 720 25C960 50 1200 80 1440 50V120H0Z" fill="white"/></svg>
          </div>
        </section>
        {/* ── Card ── */}
        <section className="py-20 md:py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
              <h2 className="text-2xl font-bold text-brand-700 mb-6 text-center">Mentions légales</h2>
              <p className="mb-4 text-gray-700 text-center">Dernière mise à jour : 7 août 2025</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">1. Éditeur du site</h3>
              <p className="mb-4 text-gray-700">Association Les petites Frimousse<br />12 rue de l’Enfance, 75000 Paris<br />SIREN : 123 456 789<br />Email : contact@frimousse-asso.fr</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">2. Directeur de la publication</h3>
              <p className="mb-4 text-gray-700">Mme/M. Florian Bricchi, Président(e) de l’association</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">3. Hébergement</h3>
              <p className="mb-4 text-gray-700">OVH SAS<br />2 rue Kellermann, 59100 Roubaix, France<br />www.ovh.com</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">4. Propriété intellectuelle</h3>
              <p className="mb-4 text-gray-700">L’ensemble du contenu du site et de l’application (textes, images, logos, code) est protégé par le droit d’auteur. Toute reproduction ou utilisation non autorisée est interdite.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">5. Données personnelles</h3>
              <p className="mb-4 text-gray-700">Les données sont traitées conformément à la politique de confidentialité et au RGPD.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">6. Contact</h3>
              <p className="mb-4 text-gray-700">Pour toute question ou réclamation, contactez : contact@frimousse-asso.fr</p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => navigate(-1)}
                  className="group bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3"
                  aria-label="Retour"
                >
                  ← Retour
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="!text-[#ffffff] border-2 border-brand-500 hover:border-brand-600 px-8 py-4 rounded-2xl font-bold text-lg transition-all bg-brand-500 hover:bg-brand-600"
                  aria-label="Retour à l'accueil (bas de page)"
                >
                  Accueil
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
