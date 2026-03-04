import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
// Stripe Checkout redirect only: no Elements or inline card collection


const plans = [
  {
    name: 'Découverte',
    price: '0€',
    description: 'Pour tester Frimousse sans engagement (15 jours max)',
    features: [
      'Limite sur la création de compte',
      'Support par email',
      'Accès web responsive',
    ],
    cta: 'Essai gratuit',
    highlight: false,
    buyButtonId: null,
  },
  {
    name: 'Essentiel',
    price: '29€ / mois',
    description: 'Pour les MAM, micro-crèches et petites structures',
    features: [
      'Jusqu’à 10 enfants',
      'Notifications email',
      'Support par email',
    ],
    cta: 'Choisir Essentiel',
    highlight: false,
  buyButtonId: 'buy_btn_1Ru88bExeKKlzm3U232ITaMN', 
  productId: 'prod_SpdCOBUbbne4oo',
  },
  {
    name: 'Pro',
    price: '59€ / mois',
    description: 'Pour crèches, garderies, centres de loisirs',
    features: [
      'Création de comptes illimités',
      'facturations détaillées',
      'Assistant IA',
      'Support prioritaire',
    ],
    cta: 'Choisir Pro',
    highlight: true,
    buyButtonId: 'buy_btn_1Ru84HExeKKlzm3UMPmR820n', 
    productId: 'prod_SpdCOBUbbne4oo',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('');
  const subscribeTokenFromQs = search.get('subscribeToken');
  const prefillEmailFromQs = search.get('prefillEmail');
  const [userRole, setUserRole] = useState<string | null>(null);
  // removed pending discovery modal state (Découverte now redirects to /register)
  const [globalMessage, setGlobalMessage] = useState<null | { type: 'success' | 'error' | 'info'; text: string }>(null);
  const [userRoleLoading, setUserRoleLoading] = useState(true);
  const [paidInfoShown, setPaidInfoShown] = useState<string | null>(null);

  useEffect(() => {
    setUserRoleLoading(true);
    fetch('api/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUserRole(data?.role || null))
      .catch(() => setUserRole(null))
      .finally(() => setUserRoleLoading(false));
    if (prefillEmailFromQs) setGlobalMessage({ type: 'info', text: `Continuer l'abonnement pour ${prefillEmailFromQs}` });
  }, [prefillEmailFromQs, subscribeTokenFromQs]);

  // startDiscovery removed: Découverte redirects to /register

  async function startDirect(planKey: string, selPlan?: string) {
    try {
      const effectivePlan = planKey;
      const endpoint = subscribeTokenFromQs ? '/subscriptions/create-checkout-with-token' : '/subscriptions/create-checkout';
      const body: { plan: string; mode: 'direct' | 'discovery'; selectedPlan?: string; subscribeToken?: string } = { plan: effectivePlan, mode: 'direct' };
      if (selPlan) body.selectedPlan = selPlan;
      if (subscribeTokenFromQs) body.subscribeToken = subscribeTokenFromQs;
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: subscribeTokenFromQs ? 'omit' : 'include', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Impossible de créer la session de paiement');
      window.location.href = data.url;
    } catch (err) {
      const message = err && (err as Error).message ? (err as Error).message : String(err);
      setGlobalMessage({ type: 'error', text: message || 'Erreur lors de la création de l’abonnement.' });
    } finally {
      // nothing to cleanup
    }
  }

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
                      ? 'border-brand-500 bg-brand-50/40 shadow-xl shadow-brand-200/30 scale-[1.03] md:scale-105 z-10'
                      : 'border-gray-200 bg-white hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/30 hover:-translate-y-1'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-brand-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md">Populaire</span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h2 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-brand-600' : 'text-gray-900'}`}>{plan.name}</h2>
                    <p className="text-gray-500 text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-8">
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

                  {plan.buyButtonId ? (
                    <div className="w-full flex flex-col items-center">
                      {paidInfoShown === plan.name && (
                        <div className="w-full mb-3 flex items-start justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <p className="text-sm text-amber-800">Les abonnements payants ne sont pas encore disponibles — contactez-nous pour plus de renseignements.</p>
                          <button aria-label="Fermer" onClick={() => setPaidInfoShown(null)} className="text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      )}
                      <button
                        className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all cursor-not-allowed bg-gray-100 text-gray-400 border border-gray-200"
                        type="button"
                        aria-disabled="true"
                        title="Les abonnements payants ne sont pas encore disponibles."
                        onClick={() => setPaidInfoShown(plan.name)}
                      >
                        {plan.cta}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98] bg-brand-500 text-white hover:bg-brand-600"
                      type="button"
                      onClick={() => {
                        if (userRoleLoading) return setGlobalMessage({ type: 'info', text: 'Chargement en cours…' });
                        if (plan.name === 'Découverte') {
                          if (userRole) return setGlobalMessage({ type: 'info', text: 'Vous êtes déjà connecté.' });
                          return navigate('/register');
                        }
                        if (userRole === 'super-admin') return setGlobalMessage({ type: 'info', text: "Compte administrateur — l'abonnement n'est pas requis." });
                        return startDirect(plan.name.toLowerCase());
                      }}
                    >
                      {plan.cta}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-14 text-center text-gray-400 text-sm space-y-1">
              <p>Tarifs hors taxes. Sans engagement. Options sur devis : formation, migration de données, modules personnalisés.</p>
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
              <a href="/support" className="bg-brand-500 text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-sm hover:bg-brand-600 hover:shadow-md transition-all inline-flex items-center gap-2">
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
