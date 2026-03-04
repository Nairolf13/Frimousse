import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Conditions générales d'utilisation | Frimousse Association"}
        description={"CGU Frimousse : règles d'utilisation, responsabilités, droits et obligations des utilisateurs et de l'éditeur de l'application."}
        url={"https://lesfrimousses.com/cgu"}
      />
      <PublicNavbar />
      <main className="flex-1 w-full">
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-brand-300/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-white/15 px-4 py-1.5 rounded-full mb-6 border border-white/20">CGU</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold !text-[#ffffff] leading-[1.1] tracking-tight mb-6">
              Conditions générales d'utilisation
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Règles d'utilisation, responsabilités, droits et obligations des utilisateurs et de l'éditeur de l'application.
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
              <h2 className="text-2xl font-bold text-brand-700 mb-6 text-center">Conditions générales d'utilisation</h2>
              <p className="mb-4 text-gray-700 text-center">Dernière mise à jour : 7 août 2025</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">1. Objet</h3>
              <p className="mb-4 text-gray-700">Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de l'application Frimousse par les utilisateurs (associations, familles, intervenants).</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">2. Accès au service</h3>
              <p className="mb-4 text-gray-700">L'accès à Frimousse nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes et à les mettre à jour.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">3. Propriété intellectuelle</h3>
              <p className="mb-4 text-gray-700">L'ensemble des contenus, marques, logos, interfaces et logiciels sont la propriété exclusive de Les Frimousse. Toute reproduction ou utilisation non autorisée est interdite.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">4. Responsabilités</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>L’éditeur s’efforce d’assurer la disponibilité et la sécurité du service, mais ne peut garantir l’absence totale d’erreurs ou d’interruptions.</li>
                <li>L’utilisateur est responsable de la confidentialité de ses identifiants et de l’usage de son compte.</li>
                <li>L’éditeur ne saurait être tenu responsable des dommages indirects ou pertes de données résultant de l’utilisation de l’application.</li>
              </ul>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">5. Données personnelles</h3>
              <p className="mb-4 text-gray-700">Les données sont traitées conformément à la politique de confidentialité et au RGPD.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">6. Modifications</h3>
              <p className="mb-4 text-gray-700">L'éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des changements importants.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">7. Loi applicable</h3>
              <p className="mb-4 text-gray-700">Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux compétents seront ceux du siège de l'association.</p>
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
