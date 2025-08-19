import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function LegalNoticePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0">
      <Helmet>
        <title>Mentions légales | Frimousse Association</title>
        <meta name="description" content="Mentions légales de Frimousse : éditeur, hébergeur, propriété intellectuelle, contact, conformité légale." />
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
            <h1 className="text-3xl font-bold text-[#0b5566] mb-6">Mentions légales</h1>
            <p className="mb-4 text-[#08323a]">Dernière mise à jour : 7 août 2025</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">1. Éditeur du site</h2>
            <p className="mb-4 text-[#08323a]">Association Les petites Frimousse<br />12 rue de l’Enfance, 75000 Paris<br />SIREN : 123 456 789<br />Email : contact@frimousse-asso.fr</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">2. Directeur de la publication</h2>
            <p className="mb-4 text-[#08323a]">Mme/M. Florian Bricchi, Président(e) de l’association</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">3. Hébergement</h2>
            <p className="mb-4 text-[#08323a]">OVH SAS<br />2 rue Kellermann, 59100 Roubaix, France<br />www.ovh.com</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">4. Propriété intellectuelle</h2>
            <p className="mb-4 text-[#08323a]">L’ensemble du contenu du site et de l’application (textes, images, logos, code) est protégé par le droit d’auteur. Toute reproduction ou utilisation non autorisée est interdite.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">5. Données personnelles</h2>
            <p className="mb-4 text-[#08323a]">Les données sont traitées conformément à la politique de confidentialité et au RGPD.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">6. Contact</h2>
            <p className="mb-4 text-[#08323a]">Pour toute question ou réclamation, contactez : contact@frimousse-asso.fr</p>
          </div>
        </section>
        <div className="max-w-4xl mx-auto text-center mt-10 mb-8">
          <button
            onClick={() => navigate('/')} 
            className="px-4 py-2 rounded bg-[#0b5566] text-white hover:opacity-95 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2"
            aria-label="Retour à l'accueil (bas de page)"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </main>
    </div>
  );
}
