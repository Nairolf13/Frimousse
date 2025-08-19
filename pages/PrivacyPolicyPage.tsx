import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  return (
  <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0">
      <Helmet>
        <title>Politique de confidentialité | Frimousse Association</title>
        <meta name="description" content="Politique de confidentialité de Frimousse : protection des données, RGPD, droits des utilisateurs, sécurité et gestion des informations personnelles." />
      </Helmet>
      <header className="w-full bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2] border-b border-[#fcdcdf] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
              <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
            </div>
            <div className="w-full text-center">
              <span className="font-bold text-base text-[#08323a]">Les Frimousses</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">
        <section className="w-full py-12 px-6 bg-white border-b border-[#fcdcdf]">
          <div className="max-w-3xl mx-auto text-left">
            <button
              onClick={() => navigate(-1)}
              className="mb-8 px-4 py-2 rounded bg-[#0b5566] text-white hover:opacity-95 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2"
              aria-label="Retour"
            >
              ← Retour
            </button>
            <h1 className="text-3xl font-bold text-[#0b5566] mb-6">Politique de confidentialité</h1>
            <p className="mb-4 text-[#08323a]">Dernière mise à jour : 7 août 2025</p>
            <p className="mb-4 text-[#08323a]">Cette politique de confidentialité décrit comment Frimousse collecte, utilise, protège et partage vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD) et à la législation française.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">1. Responsable du traitement</h2>
            <p className="mb-4 text-[#08323a]">L’association Les petites Frimousse, 12 rue de l’Enfance, 75000 Paris, est responsable du traitement des données collectées via l’application Frimousse.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">2. Données collectées</h2>
            <ul className="list-disc list-inside text-[#08323a] mb-4">
              <li>Données d’identification : nom, prénom, email, téléphone, adresse</li>
              <li>Données relatives aux enfants : identité, santé, autorisations parentales</li>
              <li>Données de connexion et d’utilisation de l’application</li>
            </ul>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">3. Finalités du traitement</h2>
            <ul className="list-disc list-inside text-[#08323a] mb-4">
              <li>Gestion des inscriptions, plannings, présences et activités</li>
              <li>Communication avec les familles et intervenants</li>
              <li>Respect des obligations légales et réglementaires</li>
              <li>Sécurité et amélioration du service</li>
            </ul>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">4. Partage des données</h2>
            <p className="mb-4 text-[#08323a]">Les données ne sont jamais vendues. Elles peuvent être partagées avec : les membres autorisés de l’association, les prestataires techniques (hébergement, maintenance), les autorités compétentes en cas d’obligation légale.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">5. Sécurité</h2>
            <p className="mb-4 text-[#08323a]">Frimousse met en œuvre des mesures techniques et organisationnelles pour protéger vos données : accès restreint, chiffrement, sauvegardes régulières, audits de sécurité.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">6. Vos droits</h2>
            <ul className="list-disc list-inside text-[#08323a] mb-4">
              <li>Droit d’accès, de rectification, d’opposition, d’effacement</li>
              <li>Droit à la portabilité et à la limitation du traitement</li>
              <li>Exercice des droits : contact@frimousse-asso.fr</li>
            </ul>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">7. Cookies</h2>
            <p className="mb-4 text-[#08323a]">L’application utilise des cookies techniques nécessaires à son fonctionnement. Aucun cookie publicitaire n’est utilisé.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">8. Modifications</h2>
            <p className="mb-4 text-[#08323a]">Frimousse se réserve le droit de modifier la présente politique. Les utilisateurs seront informés de toute modification importante.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">9. Réclamations</h2>
            <p className="mb-4 text-[#08323a]">En cas de litige, vous pouvez contacter la CNIL (www.cnil.fr).</p>
          </div>
        </section>
        <div className="max-w-4xl mx-auto text-center mt-10 mb-8">
          <button
            onClick={() => navigate('/')} 
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            aria-label="Retour à l'accueil (bas de page)"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </main>
    </div>
  );
}
