import { Helmet } from 'react-helmet-async';
import { useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
// Stripe Checkout redirect only: no Elements or inline card collection


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
    cta: 'Essai gratuit',
    highlight: false,
    buyButtonId: null,
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
  buyButtonId: 'buy_btn_1Ru88bExeKKlzm3U232ITaMN', 
  productId: 'prod_SpdCOBUbbne4oo',
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
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<null | { type: 'success' | 'error' | 'info'; text: string }>(null);
  const [userRoleLoading, setUserRoleLoading] = useState(true);

  useEffect(() => {
    setUserRoleLoading(true);
    fetch('api/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUserRole(data?.role || null))
      .catch(() => setUserRole(null))
      .finally(() => setUserRoleLoading(false));
    // if prefillEmail present, optionally set a message
    if (prefillEmailFromQs) setGlobalMessage({ type: 'info', text: `Continuer l'abonnement pour ${prefillEmailFromQs}` });
  }, [prefillEmailFromQs, subscribeTokenFromQs]);

  async function startDiscovery(planKey: string) {
    // show discovery chooser so user chooses Essentiel or Pro
    setPendingPlan(planKey);
  }

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

  // New: Discovery choice modal (if user clicks Découverte) - asks to choose Essentiel or Pro
  function DiscoveryChooser({ onClose }: { onClose: () => void }) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded p-6 w-full max-w-md">
          <h3 className="text-lg font-bold mb-4">Choisir un abonnement après l'essai</h3>
          <p className="mb-4 text-sm text-gray-700">L'essai Découverte démarre pendant 15 jours. Choisissez ensuite l'abonnement auquel vous souhaitez souscrire :</p>
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2 border rounded" onClick={() => { onClose(); startDirect('decouverte', 'essentiel'); }}>Essentiel — 29,99€ / mois</button>
            <button className="flex-1 px-4 py-2 border rounded bg-[#0b5566] text-white" onClick={() => { onClose(); startDirect('decouverte', 'pro'); }}>Pro — 59,99€ / mois</button>
          </div>
          <div className="mt-4 text-right">
            <button className="px-3 py-1 text-sm" onClick={onClose}>Annuler</button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0">
      <Helmet>
        <title>Tarifs | Frimousse Association</title>
        <meta name="description" content="Découvrez les tarifs de Frimousse pour crèches associatives, micro-crèches, garderies, centres de loisirs et MAM. Abonnement mensuel, offre gratuite, options modulaires." />
        <meta property="og:title" content="Tarifs | Frimousse Association" />
        <meta property="og:description" content="Grille tarifaire transparente pour toutes les structures d’accueil d’enfants. Test gratuit, forfaits adaptés à chaque besoin." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://frimousse-asso.fr/tarifs" />
        <meta property="og:image" content="/frimousse-cover.png" />
  <script async src="https://js.stripe.com/v3/buy-button.js"></script>
      </Helmet>
      <header className="w-full bg-gradient-to-r from-[#a9ddf2] to-[#f7f4d7] border-b border-[#fcdcdf] sticky top-0 z-10">
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
        {/* Global message banner */}
        {globalMessage && (
          <div className={`max-w-4xl mx-auto mt-6 p-3 rounded ${globalMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : globalMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`} role="status">
            {globalMessage.text}
          </div>
        )}
        <section className="w-full py-12 px-6 bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto text-center">
            <button
              onClick={() => navigate('/')} 
              className="mb-8 px-4 py-2 rounded bg-[#0b5566] text-white hover:opacity-95 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2"
              aria-label="Retour à l'accueil"
            >
              ← Retour à l'accueil
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0b5566] mb-6">Tarifs</h1>
            <p className="text-gray-700 text-base sm:text-lg mb-10">
              Des forfaits simples et transparents, adaptés à toutes les structures d’accueil d’enfants : crèches associatives, micro-crèches, garderies, centres de loisirs, MAM…
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch w-full">
              {plans.map((plan, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border shadow p-6 flex flex-col items-center bg-[#f7f4d7] ${plan.highlight ? 'border-[#0b5566] shadow-lg' : 'border-[#fcdcdf]'} h-full min-w-0 w-full max-w-md mx-auto md:max-w-[420px] md:w-full md:h-auto min-h-[380px] md:min-h-[420px]`}
                  style={{width: '100%', maxWidth: '420px', margin: '0 auto'}}
                >
                  <h2 className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-[#0b5566]' : 'text-[#08323a]'}`}>{plan.name}</h2>
                  <div className="text-3xl font-extrabold mb-2">{plan.price}</div>
                  <div className="mb-4 text-[#08323a] text-center">{plan.description}</div>
                  <div className="flex-1 w-full flex flex-col">
                    <ul className="mb-6 text-left space-y-2 text-[#08323a] flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2"><span className="text-[#0b5566]">✔</span> {f}</li>
                      ))}
                    </ul>
                  </div>
                  {plan.buyButtonId ? (
                    // Use our controlled Checkout flow instead of embedded buy-button
                    <div className="w-full flex justify-center mt-4">
                      <button
                        className="w-full max-w-xs h-11 px-4 font-semibold transition shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2 flex items-center justify-center cursor-pointer rounded"
                        type="button"
                        style={{ backgroundColor: '#0b5566', color: '#fff' }}
                        onClick={() => {
                          if (userRoleLoading) return setGlobalMessage({ type: 'info', text: 'Chargement en cours…' });
                          if (userRole === 'super-admin') return setGlobalMessage({ type: 'info', text: "Compte administrateur — l'abonnement n'est pas requis." });
                          // For Essentiel/Pro use direct mode (30 days trial)
                          return startDirect(plan.name.toLowerCase());
                        }}
                      >
                        {plan.cta}
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex justify-center mt-4">
                      <button
                        className="w-full max-w-xs h-11 px-4 font-semibold transition shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2 flex items-center justify-center cursor-pointer rounded"
                        type="button"
                        style={{ backgroundColor: '#0b5566', color: '#fff' }}
                        onClick={() => {
                          if (userRoleLoading) return setGlobalMessage({ type: 'info', text: 'Chargement en cours…' });
                          if (userRole === 'super-admin') return setGlobalMessage({ type: 'info', text: "Compte administrateur — l'abonnement n'est pas requis." });
                          // Découverte plan has cta 'Essai gratuit' and price '0€'
                          if (plan.name === 'Découverte') return startDiscovery('decouverte');
                          // For Essentiel/Pro use direct mode (30 days trial)
                          return startDirect(plan.name.toLowerCase());
                        }}
                      >
                        <span className="Text Text-color--default Text-fontWeight--500 Text--truncate" data-testid="hosted-buy-button-text">
                          {plan.cta}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-10 text-gray-600 text-sm">
              <p>Tarifs hors taxes. Sans engagement. Options sur devis : formation, migration de données, modules personnalisés.</p>
              <p className="mt-2">Pour les réseaux, fédérations ou structures multi-sites, contactez-nous pour une offre sur-mesure.</p>
            </div>
          </div>
        </section>
        {pendingPlan === 'decouverte' && (
          <DiscoveryChooser onClose={() => setPendingPlan(null)} />
        )}
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
