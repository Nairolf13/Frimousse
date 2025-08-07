import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    name: 'Découverte',
    price: '0€',
  description: 'Pour tester Frimousse sans engagement (15 jours max)',
    features: [
      'Jusqu’à 10 enfants',
      'Gestion de base des plannings',
      'Support par email',
      'Accès web responsive',
    ],
    cta: 'Commencer gratuitement',
    highlight: false,
  },
  {
    name: 'Essentiel',
    price: '29€ / mois',
    description: 'Pour les MAM, micro-crèches et petites structures',
    features: [
      'Jusqu’à 40 enfants',
      'Gestion avancée des plannings',
      'Exports PDF/Excel',
      'Notifications email',
      'Support prioritaire',
    ],
    cta: 'Choisir Essentiel',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '59€ / mois',
    description: 'Pour crèches, garderies, centres de loisirs',
    features: [
      'Enfants illimités',
      'Tous modules inclus',
      'Gestion RH & facturation',
      'Notifications SMS',
      'Personnalisation logo/couleurs',
      'Support téléphonique',
    ],
    cta: 'Choisir Pro',
    highlight: true,
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white p-0 m-0">
      <Helmet>
        <title>Tarifs | Frimousse Association</title>
        <meta name="description" content="Découvrez les tarifs de Frimousse pour crèches associatives, micro-crèches, garderies, centres de loisirs et MAM. Abonnement mensuel, offre gratuite, options modulaires." />
        <meta property="og:title" content="Tarifs | Frimousse Association" />
        <meta property="og:description" content="Grille tarifaire transparente pour toutes les structures d’accueil d’enfants. Test gratuit, forfaits adaptés à chaque besoin." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://frimousse-asso.fr/tarifs" />
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
          <div className="max-w-4xl mx-auto text-center">
            <button
              onClick={() => navigate('/')} 
              className="mb-8 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
              aria-label="Retour à l'accueil"
            >
              ← Retour à l'accueil
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-green-700 mb-6">Tarifs</h1>
            <p className="text-gray-700 text-base sm:text-lg mb-10">
              Des forfaits simples et transparents, adaptés à toutes les structures d’accueil d’enfants : crèches associatives, micro-crèches, garderies, centres de loisirs, MAM…
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border shadow p-6 flex flex-col items-center bg-white ${plan.highlight ? 'border-green-600 shadow-lg' : 'border-gray-100'} h-full min-h-[440px]`}
                  style={{height: '100%'}}
                >
                  <h2 className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-green-700' : 'text-gray-800'}`}>{plan.name}</h2>
                  <div className="text-3xl font-extrabold mb-2">{plan.price}</div>
                  <div className="mb-4 text-gray-600 text-center">{plan.description}</div>
                  <div className="flex-1 w-full flex flex-col">
                    <ul className="mb-6 text-left space-y-2 text-gray-700 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2"><span className="text-green-600">✔</span> {f}</li>
                      ))}
                    </ul>
                  </div>
                  <button className={`mt-auto px-4 py-2 rounded font-semibold transition ${plan.highlight ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{plan.cta}</button>
                </div>
              ))}
            </div>
            <div className="mt-10 text-gray-600 text-sm">
              <p>Tarifs hors taxes. Sans engagement. Options sur devis : formation, migration de données, modules personnalisés.</p>
              <p className="mt-2">Pour les réseaux, fédérations ou structures multi-sites, contactez-nous pour une offre sur-mesure.</p>
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
