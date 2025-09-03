import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function SupportPage() {
  const navigate = useNavigate();
  return (
  <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0">
      <Helmet>
        <title>Support | Frimousse Association</title>
        <meta name="description" content="Besoin d’aide sur Frimousse ? Contact, guides, assistance technique, documentation et ressources pour les associations, crèches, MAM, garderies." />
        <meta property="og:title" content="Support | Frimousse Association" />
        <meta property="og:description" content="Trouvez de l’aide, contactez le support, accédez à la documentation et aux ressources pour bien utiliser Frimousse." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://frimousse-asso.fr/support" />
        <meta property="og:image" content="/frimousse-cover.png" />
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
          <div className="max-w-6xl mx-auto text-center">
            <button
              onClick={() => navigate('/')} 
              className="mb-8 px-4 py-2 rounded bg-[#0b5566] text-white hover:opacity-95 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2"
              aria-label="Retour à l'accueil"
            >
              ← Retour à l'accueil
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0b5566] mb-6">Support & Aide</h1>
            <p className="text-gray-700 text-base sm:text-lg mb-8">
              Retrouvez ici toutes les ressources pour bien utiliser Frimousse, obtenir de l’aide ou contacter notre équipe.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch text-left">
              <div className="bg-white rounded-2xl shadow p-6 border border-[#fcdcdf] h-full flex flex-col">
                <h2 className="font-bold text-lg mb-3 text-[#0b5566]">Contact support</h2>
                <ul className="text-[#08323a] space-y-3 flex-1">
                  <li>Email : <a href="mailto:bricchi.florian@outlook.com" className="text-[#0b5566] underline">bricchi.florian@outlook.com</a></li>
                  <li>Téléphone : <a href="tel:+33647486734" className="text-[#0b5566] underline">+33 6 47 48 67 34</a></li>
                </ul>
                <div className="mt-6 bg-[#f7f4d7] rounded-lg p-4 border border-[#fcdcdf]">
                  <h3 className="font-semibold text-[#0b5566] mb-1">Support premium</h3>
                  <p className="text-[#08323a] text-sm">Assistance prioritaire pour les abonnés Essentiel & Pro (jours ouvrés, 9h-18h).</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow p-6 border border-[#fcdcdf] h-full flex flex-col">
                <h2 className="font-bold text-lg mb-3 text-[#0b5566]">Guides & documentation</h2>
                <ul className="text-[#08323a] space-y-3 flex-1">
                  <li><a href="/guide-demarrage" className="underline text-[#0b5566]">Guide de démarrage rapide</a></li>
                  <li><a href="/guide-ajouter-enfant" className="underline text-[#0b5566]">Ajouter un enfant</a></li>
                  <li><a href="/guide-planning" className="underline text-[#0b5566]">Gérer un planning</a></li>
                  <li><a href="/guide-export-rapport" className="underline text-[#0b5566]">Exporter un rapport</a></li>
                  <li><a href="/guide-securite" className="underline text-[#0b5566]">Sécurité & RGPD</a></li>
                </ul>
                <div className="mt-6 bg-[#f7f4d7] rounded-lg p-4 border border-[#fcdcdf]">
                  <h3 className="font-semibold text-[#0b5566] mb-1">Communauté</h3>
                  <p className="text-[#08323a] text-sm">Rejoignez notre <a href="#" className="underline text-[#0b5566]">groupe d’entraide</a> pour échanger avec d’autres utilisateurs.</p>
                </div>
              </div>
            </div>
            <div className="mt-12 text-gray-600 text-sm max-w-2xl mx-auto">
              <h2 className="font-bold text-[#0b5566] mb-4 text-center">Autres ressources utiles</h2>
              <nav className="flex flex-wrap justify-center items-center gap-6 text-[#08323a]">
                <a href="/confidentialite" className="underline text-[#0b5566]">Politique de confidentialité</a>
                <a href="/cgu" className="underline text-[#0b5566]">Conditions générales d’utilisation</a>
                <a href="/mentions-legales" className="underline text-[#0b5566]">Mentions légales</a>
              </nav>
            </div>
          </div>
        </section>
        <div className="max-w-6xl mx-auto flex justify-center mt-10 mb-12">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-full bg-[#0b5566] text-white hover:opacity-95 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2"
            aria-label="Retour à l'accueil (bas de page)"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </main>
    </div>
  );
}
