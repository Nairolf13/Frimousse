import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function SupportPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white p-0 m-0">
      <Helmet>
        <title>Support | Frimousse Association</title>
        <meta name="description" content="Besoin d’aide sur Frimousse ? Contact, guides, assistance technique, documentation et ressources pour les associations, crèches, MAM, garderies." />
        <meta property="og:title" content="Support | Frimousse Association" />
        <meta property="og:description" content="Trouvez de l’aide, contactez le support, accédez à la documentation et aux ressources pour bien utiliser Frimousse." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://frimousse-asso.fr/support" />
        <meta property="og:image" content="/frimousse-cover.png" />
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
          <div className="max-w-3xl mx-auto text-center">
            <button
              onClick={() => navigate('/')} 
              className="mb-8 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
              aria-label="Retour à l'accueil"
            >
              ← Retour à l'accueil
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-green-700 mb-6">Support & Aide</h1>
            <p className="text-gray-700 text-base sm:text-lg mb-8">
              Retrouvez ici toutes les ressources pour bien utiliser Frimousse, obtenir de l’aide ou contacter notre équipe.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div>
                <h2 className="font-bold text-lg mb-2 text-green-700">Contact support</h2>
                <ul className="text-gray-600 space-y-2">
                  <li>Email : <a href="mailto:support@frimousse-asso.fr" className="text-green-700 underline">support@frimousse-asso.fr</a></li>
                  <li>Téléphone : <a href="tel:+33123456789" className="text-green-700 underline">+33 1 23 45 67 89</a></li>
                  <li>Formulaire : <a href="mailto:support@frimousse-asso.fr" className="text-green-700 underline">Envoyer un message</a></li>
                </ul>
                <div className="mt-6">
                  <h3 className="font-semibold text-green-700 mb-1">Support premium</h3>
                  <p className="text-gray-600 text-sm">Assistance prioritaire pour les abonnés Essentiel & Pro (jours ouvrés, 9h-18h).</p>
                </div>
              </div>
              <div>
                <h2 className="font-bold text-lg mb-2 text-green-700">Guides & documentation</h2>
                <ul className="text-gray-600 space-y-2">
                  <li><a href="/guide-demarrage" className="underline text-green-700">Guide de démarrage rapide</a></li>
                  <li><a href="/guide-ajouter-enfant" className="underline text-green-700">Ajouter un enfant</a></li>
                  <li><a href="/guide-planning" className="underline text-green-700">Gérer un planning</a></li>
                  <li><a href="/guide-export-rapport" className="underline text-green-700">Exporter un rapport</a></li>
                  <li><a href="/guide-securite" className="underline text-green-700">Sécurité & RGPD</a></li>
                </ul>
                <div className="mt-6">
                  <h3 className="font-semibold text-green-700 mb-1">Communauté</h3>
                  <p className="text-gray-600 text-sm">Rejoignez notre <a href="#" className="underline text-green-700">groupe d’entraide</a> pour échanger avec d’autres utilisateurs.</p>
                </div>
              </div>
            </div>
            <div className="mt-12 text-gray-600 text-sm text-left max-w-2xl mx-auto">
              <h2 className="font-bold text-green-700 mb-2">Autres ressources utiles</h2>
              <ul className="list-disc list-inside space-y-1">
                <li><a href="/confidentialite" className="underline text-green-700">Politique de confidentialité</a></li>
                <li><a href="/cgu" className="underline text-green-700">Conditions générales d’utilisation</a></li>
                <li><a href="/mentions-legales" className="underline text-green-700">Mentions légales</a></li>
              </ul>
            </div>
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
