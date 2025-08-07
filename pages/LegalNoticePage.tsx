import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function LegalNoticePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white p-0 m-0">
      <Helmet>
        <title>Mentions légales | Frimousse Association</title>
        <meta name="description" content="Mentions légales de Frimousse : éditeur, hébergeur, propriété intellectuelle, contact, conformité légale." />
      </Helmet>
      <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-2 px-4">
          <div className="flex items-center gap-2">
            <span className="bg-green-100 rounded-full p-1"><span className="text-xl">🧒</span></span>
            <div className="w-full text-center">
              <span className="font-bold text-base text-gray-800">Les petites Frimousse</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">
        <section className="w-full py-12 px-6 bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto text-left">
            <button
              onClick={() => navigate(-1)}
              className="mb-8 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
              aria-label="Retour"
            >
              ← Retour
            </button>
            <h1 className="text-3xl font-bold text-green-700 mb-6">Mentions légales</h1>
            <p className="mb-4 text-gray-700">Dernière mise à jour : 7 août 2025</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">1. Éditeur du site</h2>
            <p className="mb-4 text-gray-700">Association Les petites Frimousse<br />12 rue de l’Enfance, 75000 Paris<br />SIREN : 123 456 789<br />Email : contact@frimousse-asso.fr</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">2. Directeur de la publication</h2>
            <p className="mb-4 text-gray-700">Mme/M. Florian Bricchi, Président(e) de l’association</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">3. Hébergement</h2>
            <p className="mb-4 text-gray-700">OVH SAS<br />2 rue Kellermann, 59100 Roubaix, France<br />www.ovh.com</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">4. Propriété intellectuelle</h2>
            <p className="mb-4 text-gray-700">L’ensemble du contenu du site et de l’application (textes, images, logos, code) est protégé par le droit d’auteur. Toute reproduction ou utilisation non autorisée est interdite.</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">5. Données personnelles</h2>
            <p className="mb-4 text-gray-700">Les données sont traitées conformément à la politique de confidentialité et au RGPD.</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">6. Contact</h2>
            <p className="mb-4 text-gray-700">Pour toute question ou réclamation, contactez : contact@frimousse-asso.fr</p>
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
