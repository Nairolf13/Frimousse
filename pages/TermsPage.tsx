import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white p-0 m-0">
      <Helmet>
        <title>Conditions générales d’utilisation | Frimousse Association</title>
        <meta name="description" content="CGU Frimousse : règles d’utilisation, responsabilités, droits et obligations des utilisateurs et de l’éditeur de l’application." />
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
            <h1 className="text-3xl font-bold text-green-700 mb-6">Conditions générales d’utilisation</h1>
            <p className="mb-4 text-gray-700">Dernière mise à jour : 7 août 2025</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">1. Objet</h2>
            <p className="mb-4 text-gray-700">Les présentes conditions générales d’utilisation (CGU) régissent l’accès et l’utilisation de l’application Frimousse par les utilisateurs (associations, familles, intervenants).</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">2. Accès au service</h2>
            <p className="mb-4 text-gray-700">L’accès à Frimousse nécessite la création d’un compte. L’utilisateur s’engage à fournir des informations exactes et à les mettre à jour.</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">3. Propriété intellectuelle</h2>
            <p className="mb-4 text-gray-700">L’ensemble des contenus, marques, logos, interfaces et logiciels sont la propriété exclusive de l’association Les petites Frimousse. Toute reproduction ou utilisation non autorisée est interdite.</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">4. Responsabilités</h2>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>L’éditeur s’efforce d’assurer la disponibilité et la sécurité du service, mais ne peut garantir l’absence totale d’erreurs ou d’interruptions.</li>
              <li>L’utilisateur est responsable de la confidentialité de ses identifiants et de l’usage de son compte.</li>
              <li>L’éditeur ne saurait être tenu responsable des dommages indirects ou pertes de données résultant de l’utilisation de l’application.</li>
            </ul>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">5. Données personnelles</h2>
            <p className="mb-4 text-gray-700">Les données sont traitées conformément à la politique de confidentialité et au RGPD.</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">6. Modifications</h2>
            <p className="mb-4 text-gray-700">L’éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des changements importants.</p>
            <h2 className="font-bold text-lg text-green-700 mt-8 mb-2">7. Loi applicable</h2>
            <p className="mb-4 text-gray-700">Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux compétents seront ceux du siège de l’association.</p>
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
