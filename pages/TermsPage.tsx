import SEO from '../components/SEO';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0">
      <SEO
        title={"Conditions générales d'utilisation | Frimousse Association"}
        description={"CGU Frimousse : règles d'utilisation, responsabilités, droits et obligations des utilisateurs et de l'éditeur de l'application."}
        url={"https://frimousse-asso.fr/cgu"}
      />
      <header className="w-full py-6 bg-white border-b border-[#fcdcdf]">
          <div className="max-w-4xl mx-auto flex items-center gap-4 px-6">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
              <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
            </div>
            <div className="w-full text-left">
              <span className="font-bold text-base text-[#08323a]">Les Frimousses</span>
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
            <h1 className="text-3xl font-bold text-[#0b5566] mb-6">Conditions générales d'utilisation</h1>
            <p className="mb-4 text-[#08323a]">Dernière mise à jour : 7 août 2025</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">1. Objet</h2>
            <p className="mb-4 text-[#08323a]">Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de l'application Frimousse par les utilisateurs (associations, familles, intervenants).</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">2. Accès au service</h2>
            <p className="mb-4 text-[#08323a]">L'accès à Frimousse nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes et à les mettre à jour.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">3. Propriété intellectuelle</h2>
            <p className="mb-4 text-[#08323a]">L'ensemble des contenus, marques, logos, interfaces et logiciels sont la propriété exclusive de l'association Les petites Frimousse. Toute reproduction ou utilisation non autorisée est interdite.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">4. Responsabilités</h2>
            <ul className="list-disc list-inside text-[#08323a] mb-4">
              <li>L’éditeur s’efforce d’assurer la disponibilité et la sécurité du service, mais ne peut garantir l’absence totale d’erreurs ou d’interruptions.</li>
              <li>L’utilisateur est responsable de la confidentialité de ses identifiants et de l’usage de son compte.</li>
              <li>L’éditeur ne saurait être tenu responsable des dommages indirects ou pertes de données résultant de l’utilisation de l’application.</li>
            </ul>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">5. Données personnelles</h2>
            <p className="mb-4 text-[#08323a]">Les données sont traitées conformément à la politique de confidentialité et au RGPD.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">6. Modifications</h2>
            <p className="mb-4 text-[#08323a]">L'éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des changements importants.</p>
            <h2 className="font-bold text-lg text-[#0b5566] mt-8 mb-2">7. Loi applicable</h2>
            <p className="mb-4 text-[#08323a]">Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux compétents seront ceux du siège de l'association.</p>
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
