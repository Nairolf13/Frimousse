import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';



const plans = [
  {
    name: 'Découverte',
    price: '0€',
    description: 'Pour tester Frimousse sans engagement (15 jours max)',
    features: [
      "Jusqu'à 2 enfants",
      "Jusqu'à 2 nounous",
      "Jusqu'à 2 parents",
      "Jusqu'à 2 rapports",
      'Support par email',
    ],
    cta: 'Essai gratuit',
    highlight: false,
    buyButtonId: 'buy_btn_1TD0WfExeKKlzm3Un3W2jlnN',
  },
  {
    name: 'Essentiel',
    price: '29,99€ / mois',
    description: 'Pour les MAM, micro-crèches et petites structures',
    features: [
      "Jusqu'à 10 enfants",
      "Jusqu'à 10 nounous",
      "Jusqu'à 10 parents",
      "Jusqu'à 10 rapports",
      'Support par email',
      '7 jours d\'essai gratuit',
      'Annulation à tout moment',
    ],
    cta: 'Choisir Essentiel',
    highlight: false,
    buyButtonId: 'buy_btn_1TCnIxExeKKlzm3Usl5rSHd6',
    productId: 'prod_SpdCOBUbbne4oo',
  },
  {
    name: 'Pro',
    price: '59,99€ / mois',
    description: 'Pour crèches, garderies, centres de loisirs',
    features: [
      'Enfants, nounous et parents illimités',
      'Rapports illimités',
      'Facturations détaillées',
      'Assistant IA',
      'Support prioritaire',
      '7 jours d\'essai gratuit',
      'Annulation à tout moment',
    ],
    cta: 'Choisir Pro',
    highlight: true,
    buyButtonId: 'buy_btn_1TCnKPExeKKlzm3UzKRMp1NZ',
    productId: 'prod_SpdCOBUbbne4oo',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('');
  const subscribeTokenFromQs = search.get('subscribeToken');
  const prefillEmailFromQs = search.get('prefillEmail');
  const [globalMessage, setGlobalMessage] = useState<null | { type: 'success' | 'error' | 'info'; text: string }>(null);

  useEffect(() => {
    if (prefillEmailFromQs) setGlobalMessage({ type: 'info', text: `Continuer l'abonnement pour ${prefillEmailFromQs}` });
  }, [prefillEmailFromQs, subscribeTokenFromQs]);


  // No modal state to close; discovery chooser uses setPendingPlan(null)

  // No inline card collection: Checkout handles payment. CardModal removed.

  // Discovery chooser removed — Découverte now redirects to registration


  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Tarifs | Frimousse Association"}
        description={"Découvrez les tarifs de Frimousse pour crèches associatives, micro-crèches, garderies, centres de loisirs et MAM. Abonnement mensuel, offre gratuite, options modulaires."}
        url={"https://frimousse-asso.fr/tarifs"}
        image={"/frimousse-cover.png"}
      />
      <script async src="https://js.stripe.com/v3/buy-button.js"></script>

      <PublicNavbar />

      <main className="flex-1 w-full">
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-brand-300/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-white/15 px-4 py-1.5 rounded-full mb-6 border border-white/20">Tarifs</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold !text-[#ffffff] leading-[1.1] tracking-tight mb-6">
              Des forfaits simples,
              <br />
              <span className="bg-gradient-to-r from-brand-200 via-brand-100 to-cream-100 bg-clip-text text-transparent">transparents et adaptés</span>
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Crèches associatives, micro-crèches, garderies, centres de loisirs, MAM… Trouvez l'offre qui correspond à votre structure.
            </p>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 120V60C240 15 480 0 720 25C960 50 1200 80 1440 50V120H0Z" fill="white"/></svg>
          </div>
        </section>

        {/* ── Global message ── */}
        {globalMessage && (
          <div className="max-w-4xl mx-auto mt-6 px-6">
            <div className={`p-4 rounded-2xl text-sm font-medium ${globalMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : globalMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`} role="status">
              {globalMessage.text}
            </div>
          </div>
        )}

        {/* ── Pricing Cards ── */}
        <section className="py-16 md:py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {plans.map((plan, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-3xl border-2 p-8 flex flex-col transition-all duration-300 ${
                    plan.highlight
                      ? 'border-brand-500 bg-brand-50/40 shadow-xl shadow-brand-200/30 z-10'
                      : 'border-gray-200 bg-white hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/30 hover:-translate-y-1'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-brand-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md">Populaire</span>
                    </div>
                  )}

                  <div className="mb-6 min-h-[64px]">
                    <h2 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-brand-600' : 'text-gray-900'}`}>{plan.name}</h2>
                    <p className="text-gray-500 text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-8 min-h-[56px]">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price.split('/')[0]}</span>
                    {plan.price.includes('/') && <span className="text-gray-400 text-base font-medium ml-1">/ {plan.price.split('/ ')[1]}</span>}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                        <div className="w-5 h-5 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="w-full flex flex-col items-center" style={{ minHeight: '220px' }}>
                    <div style={idx === 0 ? { marginBottom: '5px' } : undefined}>
                      {/* @ts-expect-error stripe-buy-button is a custom HTML element */}
                      <stripe-buy-button
                        buy-button-id={plan.buyButtonId}
                        publishable-key={import.meta.env.VITE_STRIPE_PUBLISHABLE}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center text-gray-400 text-sm space-y-1">
              <p>Tarifs HT. 29,99 €/mois pour Essentiel, 59,99 €/mois pour Pro. 7 jours d'essai gratuit. Sans engagement, annulation à tout moment. Options sur devis : formation, migration de données, modules personnalisés.</p>
              <p>Pour les réseaux, fédérations ou structures multi-sites, contactez-nous pour une offre sur-mesure.</p>
            </div>
          </div>
        </section>

        {/* ── FAQ / CTA ── */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Une question ?</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Besoin d'aide pour choisir ?</h2>
            <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">Notre équipe est disponible pour vous guider vers l'offre la plus adaptée à votre structure.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/support" className="bg-brand-500 text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-sm hover:bg-brand-600 hover:shadow-md transition-all inline-flex items-center gap-2" style={{ color: '#ffffff' }}>
                Contacter le support
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
              </a>
              <button onClick={() => navigate('/')} className="text-gray-600 border-2 border-gray-200 hover:border-gray-300 px-8 py-3.5 rounded-2xl font-bold text-base transition-all hover:bg-gray-50">
                ← Retour à l'accueil
              </button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
