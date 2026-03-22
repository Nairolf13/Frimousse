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
    buyButtonId: null,
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
        title={"Tarifs Frimousse | Prix logiciel de gestion creche et micro-creche"}
        description={"Tarifs Frimousse : essai gratuit 15 jours, plan Essentiel a 29,99 euros/mois, plan Pro a 59,99 euros/mois. Sans engagement. Application de gestion pour creches, micro-creches, MAM et garderies."}
        url={"https://lesfrimousses.com/tarifs"}
        image={"https://lesfrimousses.com/imgs/LogoFrimousse.webp"}
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'Tarifs', url: 'https://lesfrimousses.com/tarifs' }]}
        tags={["tarif creche logiciel", "prix application garde enfant", "abonnement gestion micro-creche"]}
        ldJson={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Frimousse",
          "description": "Application de gestion pour creches, micro-creches et MAM",
          "brand": { "@type": "Brand", "name": "Frimousse" },
          "offers": [
            { "@type": "Offer", "name": "Decouverte", "price": "0", "priceCurrency": "EUR", "description": "Essai gratuit 15 jours" },
            { "@type": "Offer", "name": "Essentiel", "price": "29.99", "priceCurrency": "EUR", "description": "Jusqu'a 10 enfants" },
            { "@type": "Offer", "name": "Pro", "price": "59.99", "priceCurrency": "EUR", "description": "Enfants illimites" }
          ]
        }}
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
                    {plan.buyButtonId ? (
                      <div style={{ marginBottom: '5px', position: 'relative' }}>
                        {/* @ts-expect-error stripe-buy-button is a custom HTML element */}
                        <stripe-buy-button
                          buy-button-id={plan.buyButtonId}
                          publishable-key={import.meta.env.VITE_STRIPE_PUBLISHABLE}
                        />
                        <div
                          title="Paiement temporairement indisponible"
                          style={{ position: 'absolute', inset: 0, borderRadius: '8px', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <span style={{ fontSize: '11px', color: '#555', fontWeight: 600, textAlign: 'center', padding: '0 8px' }}>Bientôt disponible</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgb(12, 85, 102)', borderRadius: '7px', width: '290px', padding: '24px 12px', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '13px' }}>
                        <div style={{ color: '#fff', textAlign: 'center', marginBottom: '38px' }}>
                          <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '2px', marginTop: '-8px', color: '#ffffff', textAlign: 'center' }}>Frimousse - DÉCOUVERTE</div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1, color: '#ffffff' }}>0 €</span>
                            <span style={{ fontSize: '12px', paddingTop: '8px', color: '#ffffff' }}>gratuit</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/register')}
                          style={{ width: '100%', padding: '11px 16px', borderRadius: '6px', background: 'hsl(195deg, 66.67%, 96.47%)', color: 'rgb(82, 89, 92)', border: 'none', fontSize: '15px', fontWeight: 500, cursor: 'pointer', marginBottom: '8px', letterSpacing: '0.01em' }}
                        >
                          {plan.cta}
                        </button>
                        <p style={{ color: '#ffffff', fontSize: '12px', textAlign: 'center', margin: 0 }}>Moyens de paiement pris en charge:</p>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                          <img src="/imgs/card-amex.svg" alt="Amex" style={{ height: '16px', width: 'auto', objectFit: 'contain' }} />
                          <svg height="16" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg"><rect width="38" height="24" rx="3" fill="#252525"/><circle cx="15" cy="12" r="7" fill="#EB001B"/><circle cx="23" cy="12" r="7" fill="#F79E1B"/><path d="M19 6.8a7 7 0 0 1 0 10.4A7 7 0 0 1 19 6.8z" fill="#FF5F00"/></svg>
                          <svg height="16" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg"><rect width="38" height="24" rx="3" fill="#fff"/><path d="M28.3 10.1H28c-.4 1-.7 1.5-1 3h1.9c-.3-1.5-.3-2.2-.6-3zm2.9 5.9h-1.7c-.1 0-.1 0-.2-.1l-.2-.9-.1-.2h-2.4c-.1 0-.2 0-.2.2l-.3.9c0 .1-.1.1-.1.1h-2.1l.2-.5L27 8.7c0-.5.3-.7.8-.7h1.5c.1 0 .2 0 .2.2l1.4 6.5c.1.4.2.7.2 1.1.1.1.1.1.1.2zm-13.4-.3l.4-1.8c.1 0 .2.1.2.1.7.3 1.4.5 2.1.4.2 0 .5-.1.7-.2.5-.2.5-.7.1-1.1-.2-.2-.5-.3-.8-.5-.4-.2-.8-.4-1.1-.7-1.2-1-.8-2.4-.1-3.1.6-.4.9-.8 1.7-.8 1.2 0 2.5 0 3.1.2h.1c-.1.6-.2 1.1-.4 1.7-.5-.2-1-.4-1.5-.4-.3 0-.6 0-.9.1-.2 0-.3.1-.4.2-.2.2-.2.5 0 .7l.5.4c.4.2.8.4 1.1.6.5.3 1 .8 1.1 1.4.2.9-.1 1.7-.9 2.3-.5.4-.7.6-1.4.6-1.4 0-2.5.1-3.4-.2-.1.2-.1.2-.2.1zm-3.1.3c.1-.7.1-.7.2-1 .5-2.2 1-4.5 1.4-6.7.1-.2.1-.3.3-.3H18c-.2 1.2-.4 2.1-.7 3.2-.3 1.5-.6 3-1 4.5 0 .2-.1.2-.3.2M5 8.2c0-.1.2-.2.3-.2h3.4c.5 0 .9.3 1 .8l.9 4.4c0 .1 0 .1.1.2 0-.1.1-.1.1-.1l2.1-5.1c-.1-.1 0-.2.1-.2h2.1c0 .1 0 .1-.1.2l-3.1 7.3c-.1.2-.1.3-.2.4-.1.1-.3 0-.5 0H9.7c-.1 0-.2 0-.2-.2L7.9 9.5c-.2-.2-.5-.5-.9-.6-.6-.3-1.7-.5-1.9-.5L5 8.2z" fill="#142688"/></svg>
                          <svg height="16" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg"><rect width="38" height="24" rx="3" fill="#fff"/><path d="M18.093 11.976v3.2h-1.018v-7.9h2.691a2.447 2.447 0 0 1 1.747.692 2.28 2.28 0 0 1 .725 1.714 2.28 2.28 0 0 1-.725 1.714 2.414 2.414 0 0 1-1.747.678l-1.673.002zm0-3.732v2.788h1.698c.414 0 .808-.166 1.09-.46a1.558 1.558 0 0 0-.012-2.186 1.52 1.52 0 0 0-1.078-.448l-1.698.306zm6.484 1.39c.755 0 1.35.202 1.784.605.435.404.652.955.652 1.654v3.344h-.97v-.753h-.045c-.42.62-1.1.93-1.85.93a2.38 2.38 0 0 1-1.638-.57 1.809 1.809 0 0 1-.666-1.422c0-.6.227-1.077.68-1.43.454-.352 1.06-.528 1.82-.528.647 0 1.18.118 1.598.355v-.25a1.23 1.23 0 0 0-.45-.966 1.624 1.624 0 0 0-1.092-.39c-.633 0-1.134.267-1.503.8l-.893-.562c.49-.706 1.22-1.06 2.173-1.06v.043zm-1.32 4.08c0 .28.128.54.35.706.22.166.495.256.776.256.42 0 .823-.167 1.12-.46.298-.294.467-.695.467-1.113-.294-.234-.705-.352-1.233-.352-.384 0-.705.094-.964.282a.856.856 0 0 0-.516.68zm8.376-3.92l-3.392 7.8h-1.05l1.257-2.72-2.228-5.08h1.11l1.603 3.873 1.59-3.873h1.11z" fill="#3C4043"/><path d="M13.8 11.02a5.538 5.538 0 0 0-.08-.92H9v1.74h2.7a2.4 2.4 0 0 1-1 1.58v1.3h1.62a5.01 5.01 0 0 0 1.48-3.7z" fill="#4285F4"/><path d="M9 15.8c1.35 0 2.49-.45 3.32-1.22l-1.62-1.26a3.15 3.15 0 0 1-1.7.48 3.13 3.13 0 0 1-2.94-2.16H4.4v1.3A5 5 0 0 0 9 15.8z" fill="#34A853"/><path d="M6.06 11.64A3.12 3.12 0 0 1 5.9 10.6c0-.36.06-.71.16-1.04V8.26H4.4A5.02 5.02 0 0 0 4 10.6c0 .81.19 1.57.4 2.34l1.66-1.3z" fill="#FBBC04"/><path d="M9 7.44a2.7 2.7 0 0 1 1.92.75l1.43-1.43A4.8 4.8 0 0 0 9 5.4a5 5 0 0 0-4.6 2.86l1.66 1.3A3.13 3.13 0 0 1 9 7.44z" fill="#EA4335"/></svg>
                          <img src="/imgs/card-paypal.svg" alt="PayPal" style={{ height: '16px', width: 'auto', objectFit: 'contain' }} />
                        </div>
                      </div>
                    )}
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
