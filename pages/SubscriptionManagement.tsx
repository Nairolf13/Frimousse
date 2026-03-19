import { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineClock, HiOutlineXCircle, HiOutlineCreditCard, HiOutlineArrowUp, HiOutlineRefresh } from 'react-icons/hi';

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

const PLAN_LABELS: Record<string, string> = {
  decouverte: 'Découverte',
  essentiel: 'Essentiel',
  pro: 'Pro',
};

const PLAN_PRICES: Record<string, string> = {
  essentiel: '29 €/mois',
  pro: '59 €/mois',
};

const PLAN_FEATURES: Record<string, string[]> = {
  decouverte: ['2 enfants max', '2 nounous max', '2 parents max', 'Période d\'essai 15 jours'],
  essentiel: ['10 enfants max', '10 nounous max', '10 parents max', 'Facturation mensuelle', 'Export PDF'],
  pro: ['Illimité', 'Assistant IA', 'Facturation mensuelle', 'Export PDF', 'Support prioritaire'],
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    active: { label: 'Actif', color: 'bg-green-100 text-green-700', icon: <HiOutlineCheckCircle className="w-4 h-4" /> },
    trialing: { label: 'Essai', color: 'bg-blue-100 text-blue-700', icon: <HiOutlineClock className="w-4 h-4" /> },
    past_due: { label: 'Paiement en retard', color: 'bg-red-100 text-red-700', icon: <HiOutlineExclamationCircle className="w-4 h-4" /> },
    canceled: { label: 'Annulé', color: 'bg-gray-100 text-gray-500', icon: <HiOutlineXCircle className="w-4 h-4" /> },
    unpaid: { label: 'Impayé', color: 'bg-orange-100 text-orange-700', icon: <HiOutlineExclamationCircle className="w-4 h-4" /> },
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
  const { user } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);
  const [planSuccess, setPlanSuccess] = useState('');
  const [planError, setPlanError] = useState('');
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'admin' || user.role === 'super-admin');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    fetchWithRefresh('/api/subscriptions/my', { credentials: 'include' })
      .then(r => r && r.ok ? r.json() : Promise.reject(new Error('Erreur réseau')))
      .then(data => {
        if (!mounted) return;
        setSub(data.subscription || null);
        setPortalUrl(data.portalUrl || null);
      })
      .catch(() => { if (mounted) setError('Impossible de charger les informations d\'abonnement.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

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
    } catch (e: unknown) {
      setPlanError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setChangingPlan(false);
      setConfirmPlan(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <HiOutlineXCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Cette page est réservée aux administrateurs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mon abonnement</h1>
          <p className="text-gray-500 mt-1 text-sm">Gérez votre plan, vos informations de facturation et suivez le statut de votre abonnement.</p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow p-8 flex items-center justify-center gap-3 text-gray-400">
            <HiOutlineRefresh className="w-5 h-5 animate-spin" />
            Chargement…
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm flex items-center gap-3">
            <HiOutlineExclamationCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && !sub && (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <HiOutlineCreditCard className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Aucun abonnement actif trouvé.</p>
            <a
              href="/tarifs"
              className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors"
            >
              Voir les plans
            </a>
          </div>
        )}

        {!loading && !error && sub && (
          <div className="space-y-6">
            {/* Current plan card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Plan actuel</div>
                  <div className="text-2xl font-bold text-gray-900">{PLAN_LABELS[sub.plan] || sub.plan}</div>
                  {PLAN_PRICES[sub.plan] && (
                    <div className="text-sm text-gray-500 mt-0.5">{PLAN_PRICES[sub.plan]}</div>
                  )}
                </div>
                <StatusBadge status={sub.status} />
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {sub.status === 'trialing' && sub.trialEnd && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3">
                    <div className="text-xs text-blue-400 font-medium mb-0.5">Fin de la période d'essai</div>
                    <div className="font-semibold text-blue-800">{formatDate(sub.trialEnd)}</div>
                  </div>
                )}
                {sub.currentPeriodEnd && sub.status !== 'canceled' && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="text-xs text-gray-400 font-medium mb-0.5">
                      {sub.cancelAtPeriodEnd ? 'Accès jusqu\'au' : 'Prochain renouvellement'}
                    </div>
                    <div className="font-semibold text-gray-800">{formatDate(sub.currentPeriodEnd)}</div>
                  </div>
                )}
                {sub.cancelAtPeriodEnd && (
                  <div className="sm:col-span-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-orange-700 text-xs font-medium flex items-center gap-2">
                    <HiOutlineExclamationCircle className="w-4 h-4 flex-shrink-0" />
                    Résiliation programmée — votre accès reste actif jusqu'à la fin de la période en cours.
                  </div>
                )}
                {sub.status === 'past_due' && (
                  <div className="sm:col-span-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700 text-xs font-medium flex items-center gap-2">
                    <HiOutlineExclamationCircle className="w-4 h-4 flex-shrink-0" />
                    Paiement en échec — mettez à jour votre moyen de paiement pour éviter la suspension.
                  </div>
                )}
              </div>

              {/* Features */}
              {PLAN_FEATURES[sub.plan] && (
                <div className="mt-5">
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-2">Inclus dans votre plan</div>
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
                    <div className="font-semibold text-gray-900 text-sm">Facturation & moyen de paiement</div>
                    <div className="text-xs text-gray-400 mt-0.5">Gérez votre carte, consultez vos factures Stripe et modifiez vos informations.</div>
                  </div>
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors"
                  >
                    <HiOutlineCreditCard className="w-4 h-4" />
                    Portail de facturation
                  </a>
                </div>
              </div>
            )}

            {/* Change plan — only for active/trialing, not canceled */}
            {['active', 'trialing'].includes(sub.status) && sub.plan !== 'decouverte' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="font-semibold text-gray-900 text-sm mb-1">Changer de plan</div>
                <div className="text-xs text-gray-400 mb-4">Le changement est immédiat et au prorata du mois en cours.</div>

                {planSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-green-700 text-sm flex items-center gap-2">
                    <HiOutlineCheckCircle className="w-4 h-4" />{planSuccess}
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
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => handleChangePlan(plan)}
                            disabled={changingPlan}
                            className="flex-1 bg-brand-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                          >
                            {changingPlan ? 'En cours…' : 'Confirmer'}
                          </button>
                          <button
                            onClick={() => setConfirmPlan(null)}
                            className="flex-1 border border-gray-200 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmPlan(plan)}
                          className="mt-1 w-full border border-brand-500 text-brand-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-brand-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <HiOutlineArrowUp className="w-3.5 h-3.5" />
                          Passer au plan {PLAN_LABELS[plan]}
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
