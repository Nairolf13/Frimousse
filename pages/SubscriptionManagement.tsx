import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useLocation } from 'react-router-dom';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineClock, HiOutlineXCircle, HiOutlineCreditCard, HiOutlineArrowUp, HiOutlineRefresh } from 'react-icons/hi';
import { useI18n } from '../src/lib/useI18n';

type Subscription = {
  id: string;
  plan: string;
  status: string;
  trialEnd?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  stripeSubscriptionId?: string | null;
};

function usePlanData(t: (k: string, fallback?: string) => string) {
  const PLAN_LABELS: Record<string, string> = {
    decouverte: t('plan.decouverte', 'Découverte'),
    essentiel: t('plan.essentiel', 'Essentiel'),
    pro: t('plan.pro', 'Pro'),
  };
  const PLAN_PRICES: Record<string, string> = {
    essentiel: t('plan.price.essentiel', '29,99 €/mois'),
    pro: t('plan.price.pro', '59,99 €/mois'),
  };
  const PLAN_FEATURES: Record<string, string[]> = {
    decouverte: [t('plan.feature.decouverte.1', '2 enfants max'), t('plan.feature.decouverte.2', '2 nounous max'), t('plan.feature.decouverte.3', '2 parents max'), t('plan.feature.decouverte.4', "Période d'essai 15 jours")],
    essentiel: [t('plan.feature.essentiel.1', '10 enfants max'), t('plan.feature.essentiel.2', '10 nounous max'), t('plan.feature.essentiel.3', '10 parents max'), t('plan.feature.essentiel.4', 'Facturation mensuelle')],
    pro: [t('plan.feature.pro.1', 'Illimité'), t('plan.feature.pro.2', 'Assistant IA'), t('plan.feature.pro.3', 'Facturation mensuelle'), t('plan.feature.pro.5', 'Support prioritaire')],
  };
  return { PLAN_LABELS, PLAN_PRICES, PLAN_FEATURES };
}

function StatusBadge({ status, t }: { status: string; t: (k: string, fallback?: string) => string }) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    active: { label: t('subscription.status.active', 'Actif'), color: 'bg-green-100 text-green-700', icon: <HiOutlineCheckCircle className="w-4 h-4" /> },
    trialing: { label: t('subscription.status.trialing', 'Essai'), color: 'bg-blue-100 text-blue-700', icon: <HiOutlineClock className="w-4 h-4" /> },
    past_due: { label: t('subscription.status.past_due', 'Paiement en retard'), color: 'bg-red-100 text-red-700', icon: <HiOutlineExclamationCircle className="w-4 h-4" /> },
    canceled: { label: t('subscription.status.canceled', 'Annulé'), color: 'bg-gray-100 text-gray-500', icon: <HiOutlineXCircle className="w-4 h-4" /> },
    unpaid: { label: t('subscription.status.unpaid', 'Impayé'), color: 'bg-orange-100 text-orange-700', icon: <HiOutlineExclamationCircle className="w-4 h-4" /> },
  };
  const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-500', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
      {s.icon}{s.label}
    </span>
  );
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function SubscriptionManagement() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);
  const [planSuccess, setPlanSuccess] = useState('');
  const [planError, setPlanError] = useState('');
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null);

  const { t } = useI18n();
  const { PLAN_LABELS, PLAN_PRICES, PLAN_FEATURES } = usePlanData(t);
  const isAdmin = user && (user.role === 'admin' || user.role === 'super-admin');

  const loadSubscription = useCallback((mounted: { current: boolean }) => {
    setLoading(true);
    setError('');
    fetchWithRefresh('/api/subscriptions/my', { credentials: 'include' })
      .then(r => r && r.ok ? r.json() : Promise.reject(new Error('Erreur réseau')))
      .then(data => {
        if (!mounted.current) return;
        setSub(data.subscription || null);
        setPortalUrl(data.portalUrl || null);
      })
      .catch(() => { if (mounted.current) setError('Impossible de charger les informations d\'abonnement.'); })
      .finally(() => { if (mounted.current) setLoading(false); });
  }, []);

  useEffect(() => {
    const mounted = { current: true };
    loadSubscription(mounted);
    return () => { mounted.current = false; };
  }, [loadSubscription]);

  // Recharge les données quand on revient de Stripe (checkout=success dans l'URL)
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    if (qs.get('checkout') === 'success') {
      // Attendre que CheckoutSuccessHandler finalize la session, puis recharger
      const timer = setTimeout(() => {
        const mounted = { current: true };
        loadSubscription(mounted);
        // Nettoyer les query params
        const url = new URL(window.location.href);
        url.searchParams.delete('checkout');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, document.title, url.pathname + url.search);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [location.search, loadSubscription]);

  async function handleUpgradeCheckout(plan: string) {
    try {
      const res = await fetchWithRefresh('/api/subscriptions/create-checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, mode: 'direct' }),
      });
      const data = await res?.json().catch(() => ({}));
      if (!res || !res.ok || !data.url) throw new Error(data?.error || 'Erreur lors de la création de la session');
      window.location.href = data.url;
    } catch (e: unknown) {
      setPlanError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  }

  async function handleChangePlan(plan: string) {
    setChangingPlan(true);
    setPlanError('');
    setPlanSuccess('');
    try {
      const res = await fetchWithRefresh('/api/subscriptions/change-plan', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res || !res.ok) {
        const data = await res?.json().catch(() => ({}));
        throw new Error(data?.error || 'Erreur lors du changement de plan');
      }
      setPlanSuccess(`Plan changé vers ${PLAN_LABELS[plan] || plan} avec succès.`);
      setSub(prev => prev ? { ...prev, plan } : prev);
      // Refresh user context so plan-gated features (ex: assistant IA) update immediately
      fetchWithRefresh('/api/user/me', { credentials: 'include' })
        .then(r => r?.ok ? r.json() : null)
        .then(data => { if (data) setUser(data); })
        .catch(() => {});
    } catch (e: unknown) {
      setPlanError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setChangingPlan(false);
      setConfirmPlan(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 md:pl-64">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <HiOutlineXCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('subscription.forbidden', 'Cette page est réservée aux administrateurs.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:pl-72 md:pr-8 md:py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('subscription.title', 'Mon abonnement')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('subscription.subtitle', 'Gérez votre plan, vos informations de facturation et suivez le statut de votre abonnement.')}</p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow p-8 flex items-center justify-center gap-3 text-gray-400">
            <HiOutlineRefresh className="w-5 h-5 animate-spin" />
            {t('subscription.loading', 'Chargement…')}
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm flex items-center gap-3">
            <HiOutlineExclamationCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && !sub && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-2">
                <HiOutlineCreditCard className="w-6 h-6 text-brand-400" />
                <div className="font-semibold text-gray-900">{t('subscription.no_plan.title', 'Choisissez votre plan')}</div>
              </div>
              <p className="text-sm text-gray-500 mb-5">{t('subscription.no_plan.subtitle', 'Aucun abonnement actif. Sélectionnez un plan ci-dessous pour accéder à toutes les fonctionnalités.')}</p>
              {planError && (
                <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                  <HiOutlineExclamationCircle className="w-4 h-4" />{planError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['essentiel', 'pro'] as const).map(plan => (
                  <div key={plan} className="border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
                    <div>
                      <div className="font-bold text-gray-900 text-base">{PLAN_LABELS[plan]}</div>
                      <div className="text-sm text-brand-600 font-semibold mt-0.5">{PLAN_PRICES[plan]}</div>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {PLAN_FEATURES[plan].map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-500">
                          <HiOutlineCheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleUpgradeCheckout(plan)}
                      className="mt-2 w-full bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <HiOutlineArrowUp className="w-4 h-4" />
                      {t('subscription.choose', 'Choisir')} {PLAN_LABELS[plan]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && sub && (
          <div className="space-y-6">
            {/* Current plan card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">{t('subscription.current_plan', 'Plan actuel')}</div>
                  <div className="text-2xl font-bold text-gray-900">{PLAN_LABELS[sub.plan] || sub.plan}</div>
                  {PLAN_PRICES[sub.plan] && (
                    <div className="text-sm text-gray-500 mt-0.5">{PLAN_PRICES[sub.plan]}</div>
                  )}
                </div>
                <StatusBadge status={sub.status} t={t} />
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {sub.status === 'trialing' && sub.trialEnd && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3">
                    <div className="text-xs text-blue-400 font-medium mb-0.5">{t('subscription.trial_end', "Fin de la période d'essai")}</div>
                    <div className="font-semibold text-blue-800">{formatDate(sub.trialEnd)}</div>
                  </div>
                )}
                {sub.currentPeriodEnd && sub.status !== 'canceled' && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="text-xs text-gray-400 font-medium mb-0.5">
                      {sub.cancelAtPeriodEnd ? t('subscription.access_until', "Accès jusqu'au") : t('subscription.next_renewal', 'Prochain renouvellement')}
                    </div>
                    <div className="font-semibold text-gray-800">{formatDate(sub.currentPeriodEnd)}</div>
                  </div>
                )}
                {sub.cancelAtPeriodEnd && (
                  <div className="sm:col-span-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-orange-700 text-xs font-medium flex items-center gap-2">
                    <HiOutlineExclamationCircle className="w-4 h-4 flex-shrink-0" />
                    {t('subscription.cancel_warning', "Résiliation programmée — votre accès reste actif jusqu'à la fin de la période en cours.")}
                  </div>
                )}
                {sub.status === 'past_due' && (
                  <div className="sm:col-span-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700 text-xs font-medium flex items-center gap-2">
                    <HiOutlineExclamationCircle className="w-4 h-4 flex-shrink-0" />
                    {t('subscription.past_due_warning', 'Paiement en échec — mettez à jour votre moyen de paiement pour éviter la suspension.')}
                  </div>
                )}
              </div>

              {/* Features */}
              {PLAN_FEATURES[sub.plan] && (
                <div className="mt-5">
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-2">{t('subscription.features_title', 'Inclus dans votre plan')}</div>
                  <ul className="space-y-1">
                    {PLAN_FEATURES[sub.plan].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <HiOutlineCheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Billing portal */}
            {portalUrl && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t('subscription.billing.title', 'Facturation & moyen de paiement')}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t('subscription.billing.subtitle', 'Gérez votre carte, consultez vos factures Stripe et modifiez vos informations.')}</div>
                  </div>
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-brand-500 !text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-600 transition-colors"
                    style={{ color: '#ffffff' }}
                  >
                    <HiOutlineCreditCard className="w-4 h-4 text-white" style={{ color: '#ffffff' }} />
                    {t('subscription.billing.portal_btn', 'Portail de facturation')}
                  </a>
                </div>
              </div>
            )}

            {/* Upgrade from decouverte — redirect to Stripe Checkout */}
            {sub.plan === 'decouverte' && ['active', 'trialing'].includes(sub.status) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="font-semibold text-gray-900 text-sm mb-1">{t('subscription.upgrade.title', 'Passer à un plan payant')}</div>
                <div className="text-xs text-gray-400 mb-4">{t('subscription.upgrade.subtitle', "Choisissez un plan pour continuer après la période d'essai.")}</div>
                {planError && (
                  <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                    <HiOutlineExclamationCircle className="w-4 h-4" />{planError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['essentiel', 'pro'] as const).map(plan => (
                    <div key={plan} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{PLAN_LABELS[plan]}</div>
                        <div className="text-sm text-gray-500">{PLAN_PRICES[plan]}</div>
                      </div>
                      <ul className="space-y-1 flex-1">
                        {PLAN_FEATURES[plan].map(f => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleUpgradeCheckout(plan)}
                        className="mt-1 w-full bg-brand-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <HiOutlineArrowUp className="w-3.5 h-3.5" />
                        {t('subscription.choose', 'Choisir')} {PLAN_LABELS[plan]}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Change plan — only for active/trialing, not canceled */}
            {['active', 'trialing'].includes(sub.status) && sub.plan !== 'decouverte' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="font-semibold text-gray-900 text-sm mb-1">{t('subscription.change.title', 'Changer de plan')}</div>

                {/* How it works */}
                <div className="mb-4 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 space-y-1.5">
                  <div className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">{t('subscription.change.how_title', 'Comment ça fonctionne ?')}</div>
                  <div className="flex items-start gap-2 text-xs text-brand-800">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-500" />
                    <span>{t('subscription.change.no_card', 'Aucune saisie de carte requise — votre moyen de paiement déjà enregistré est utilisé automatiquement.')}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-brand-800">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-500" />
                    <span>{t('subscription.change.immediate', 'Changement immédiat — les nouvelles fonctionnalités sont accessibles dès la confirmation.')}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-brand-800">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-500" />
                    <span>{t('subscription.change.proration', 'Facturation au prorata — vous ne payez que les jours restants du mois en cours au nouveau tarif.')}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-brand-800">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-500" />
                    <span>{t('subscription.change.cancel', "Annulation à tout moment — sans engagement, vous gardez l'accès jusqu'à la fin de la période en cours.")}</span>
                  </div>
                </div>

                {planSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-green-700 text-sm flex items-start gap-2">
                    <HiOutlineCheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="font-semibold">{planSuccess}</div>
                  </div>
                )}
                {planError && (
                  <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                    <HiOutlineExclamationCircle className="w-4 h-4" />{planError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['essentiel', 'pro'] as const).filter(p => p !== sub.plan).map(plan => (
                    <div key={plan} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{PLAN_LABELS[plan]}</div>
                        <div className="text-sm text-gray-500">{PLAN_PRICES[plan]}</div>
                      </div>
                      <ul className="space-y-1 flex-1">
                        {PLAN_FEATURES[plan].map(f => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <HiOutlineCheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                      {confirmPlan === plan ? (
                        <div className="mt-1 space-y-2">
                          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">
                            {t('subscription.change.confirm_msg', 'En confirmant, votre carte enregistrée sera débitée au prorata des jours restants ce mois-ci. Le changement est immédiat et sans interruption de service.')}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleChangePlan(plan)}
                              disabled={changingPlan}
                              className="flex-1 bg-brand-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                            >
                              {changingPlan ? t('subscription.change.in_progress', 'En cours…') : t('subscription.change.confirm_btn', 'Confirmer le changement')}
                            </button>
                            <button
                              onClick={() => setConfirmPlan(null)}
                              className="flex-1 border border-gray-200 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              {t('global.cancel', 'Annuler')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmPlan(plan)}
                          className="mt-1 w-full border border-brand-500 text-brand-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-brand-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <HiOutlineArrowUp className="w-3.5 h-3.5" />
                          {t('subscription.change.switch_to', 'Passer au plan')} {PLAN_LABELS[plan]}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
