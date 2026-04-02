import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Politique de confidentialité | Frimousse Association"}
        description={"Politique de confidentialité de Frimousse : protection des données, RGPD, droits des utilisateurs, sécurité et gestion des informations personnelles."}
        url={"https://lesfrimousses.com/confidentialite"}
      />
      <PublicNavbar />
      <main className="flex-1 w-full">
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-brand-300/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-white/15 px-4 py-1.5 rounded-full mb-6 border border-white/20">RGPD</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold !text-[#ffffff] leading-[1.1] tracking-tight mb-6">
              Politique de confidentialité
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Protection des données, RGPD, droits des utilisateurs, sécurité et gestion des informations personnelles.
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
              <h2 className="text-2xl font-bold text-brand-700 mb-6 text-center">Politique de confidentialité</h2>
              <p className="mb-4 text-gray-700 text-center">Dernière mise à jour : 7 août 2025</p>
              <p className="mb-4 text-gray-700">Cette politique de confidentialité décrit comment Frimousse collecte, utilise, protège et partage vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD) et à la législation française.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">1. Responsable du traitement</h3>
              <p className="mb-4 text-gray-700">L’application Les Frimousse, 19 chemin de la gélatine, 13400 Aubagne, est responsable du traitement des données collectées via l’application Les Frimousse.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">2. Données collectées</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Données d’identification : nom, prénom, email, téléphone, adresse</li>
                <li>Données relatives aux enfants : identité, santé, autorisations parentales</li>
                <li>Données de connexion et d’utilisation de l’application</li>
              </ul>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">3. Finalités du traitement</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Gestion des inscriptions, plannings, présences et activités</li>
                <li>Communication avec les familles et intervenants</li>
                <li>Respect des obligations légales et réglementaires</li>
                <li>Sécurité et amélioration du service</li>
              </ul>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">4. Partage des données</h3>
              <p className="mb-4 text-gray-700">Les données ne sont jamais vendues. Elles peuvent être partagées avec : les membres autorisés de l’association, les prestataires techniques (hébergement, maintenance), les autorités compétentes en cas d’obligation légale.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">5. Sécurité</h3>
              <p className="mb-4 text-gray-700">Frimousse met en œuvre des mesures techniques et organisationnelles pour protéger vos données : accès restreint, chiffrement, sauvegardes régulières.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">6. Vos droits</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Droit d’accès, de rectification, d’opposition, d’effacement</li>
                <li>Droit à la portabilité et à la limitation du traitement</li>
                <li>Exercice des droits : contact@frimousse-asso.fr</li>
              </ul>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">7. Cookies</h3>
              <p className="mb-4 text-gray-700">L’application utilise des cookies techniques nécessaires à son fonctionnement. Aucun cookie publicitaire n’est utilisé.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">8. Modifications</h3>
              <p className="mb-4 text-gray-700">Frimousse se réserve le droit de modifier la présente politique. Les utilisateurs seront informés de toute modification importante.</p>
              <h3 className="font-bold text-lg text-brand-700 mt-8 mb-2">9. Réclamations</h3>
              <p className="mb-4 text-gray-700">En cas de litige, vous pouvez contacter la CNIL (www.cnil.fr).</p>
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
