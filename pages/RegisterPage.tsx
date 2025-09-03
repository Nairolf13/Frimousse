import { useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL;

// No inline card collection on Register: we redirect to Stripe Checkout instead.

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'admin', centerName: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // initialPlan = what the user selected on the radio (decouverte|essentiel|pro)
  const [initialPlan, setInitialPlan] = useState<'decouverte' | 'essentiel' | 'pro'>('decouverte');
  const [initLoading, setInitLoading] = useState(false);
  const [completeLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === 'role') return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
  if (form.password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    try {
    // If user chose Découverte, perform a normal register + login flow (no Checkout)
      if (initialPlan === 'decouverte') {
        setInitLoading(true);
        // call register endpoint
        const regRes = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
      body: JSON.stringify({ ...form, plan: initialPlan })
        });
        const regData = await regRes.json().catch(() => ({}));
        if (!regRes.ok) throw new Error(regData?.message || regData?.error || 'Erreur lors de l\'inscription');

        // login to get cookies
        const loginRes = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: form.email, password: form.password })
        });
        if (loginRes.status === 402) {
          const loginData = await loginRes.json().catch(() => ({}));
          setUpgradeMessage(loginData?.error || 'Votre compte nécessite un abonnement pour continuer.');
          setShowUpgradeModal(true);
          setInitLoading(false);
          return;
        }
        const loginData = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok) throw new Error(loginData?.message || loginData?.error || 'Erreur lors de la connexion après inscription');

        // Redirect to dashboard/home
        window.location.href = '/';
        return;
      }
      // For paid plans (essentiel/pro) use the existing register + Checkout flow
      setInitLoading(true);
      const res = await fetch(`${API_URL}/auth/register-subscribe/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, plan: initialPlan })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Erreur lors de l’inscription');
      }
      // Immediately redirect to Checkout using the token
      const endpoint = '/api/subscriptions/create-checkout-with-token';
      const body: { plan: string; mode: 'direct' | 'discovery'; selectedPlan?: string; subscribeToken?: string } = { plan: initialPlan, mode: 'direct', subscribeToken: data.subscribeToken };
      // call create-checkout-with-token and redirect
      const res2 = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data2 = await res2.json().catch(() => ({}));
      if (!res2.ok || !data2.url) throw new Error(data2.error || 'Impossible de créer la session de paiement');
      window.location.href = data2.url;
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message || 'Erreur lors de l’inscription'); else setError('Erreur lors de l’inscription');
      setInitLoading(false);
    } finally {
      setInitLoading(false);
    }
  };

  // No handleCardConfirmed: we rely on Checkout flow and webhook to finalize subscription and login

  return (
    <div className="h-screen flex items-center justify-center  bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2] overflow-hidden">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xl md:max-w-2xl flex flex-col items-center max-h-[95vh] overflow-auto">
        <div className="w-20 h-20 mb-4">
          <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-[#0b5566] text-center">Inscription</h2>
        <p className="mb-6 text-[#08323a] text-center">Créez votre compte Frimousse</p>
        {error && <div className="mb-4 text-red-600 w-full text-center">{error}</div>}
        {success && <div className="mb-4 text-[#0b5566] w-full text-center">Inscription réussie. Redirection…</div>}
  {/* ... plan radio selection removed; use compact cards below ... */}
        <label className="block mb-3 w-full text-left font-medium text-[#08323a]">Nom
          <input name="name" value={form.name} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
        </label>
        <label className="block mb-3 w-full text-left font-medium text-[#08323a]">Société / Crèche 
          <input name="centerName" value={form.centerName} onChange={handleChange} placeholder="Nom de la crèche ou société" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
        </label>
        <label className="block mb-3 w-full text-left font-medium text-[#08323a]">Email
          <input name="email" type="email" value={form.email} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
        </label>
        <label className="block mb-3 w-full text-left font-medium text-gray-700">Mot de passe
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              required
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0b5566] text-lg focus:outline-none"
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </label>
        <label className="block mb-3 w-full text-left font-medium text-gray-700">Confirmer le mot de passe
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0b5566] text-lg focus:outline-none"
              onClick={() => setShowConfirm(v => !v)}
            >
              {showConfirm ? '🙈' : '👁️'}
            </button>
          </div>
        </label>
      <div className="w-full mb-4 mt-6">
        <label className="block mb-2 font-medium text-[#08323a]">Offres</label>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Découverte */}
          <button
            type="button"
            onClick={() => { setInitialPlan('decouverte'); }}
            className={`p-3 rounded-lg border text-sm focus:outline-none flex flex-col items-center text-center min-h-[140px] ${initialPlan === 'decouverte' ? 'border-[#0b5566] bg-[#f7f4d7]' : 'border-gray-200 bg-white hover:shadow-sm'}`}
          >
            <div>
              <div className="font-semibold text-[#0b5566]">Découverte</div>
              <div className="text-xs text-gray-600">Essai 15 jours</div>
            </div>
            <div className="mt-3 text-xs text-gray-600">Tester Frimousse sans engagement</div>
            <div className="mt-auto text-base font-bold text-[#0b5566]">0€</div>
          </button>

          {/* Essentiel */}
          <button
            type="button"
            onClick={() => { setInitialPlan('essentiel'); }}
            className={`p-3 rounded-lg border text-sm focus:outline-none flex flex-col items-center text-center min-h-[140px] ${initialPlan === 'essentiel' ? 'border-[#0b5566] bg-white shadow' : 'border-gray-200 bg-white hover:shadow-sm'}`}
          >
            <div>
              <div className="font-semibold text-[#0b5566]">Essentiel</div>
              <div className="text-xs text-gray-600">Pour petites structures</div>
            </div>
            <div className="mt-3 text-xs text-gray-600">Jusqu’à 10 enfants, exports et notifications</div>
            <div className="mt-auto text-base font-bold text-[#0b5566]">29,99€ <span className="text-xs text-gray-500">/ mois</span></div>
          </button>

          {/* Pro */}
          <button
            type="button"
            onClick={() => { setInitialPlan('pro'); }}
            className={`p-3 rounded-lg border text-sm focus:outline-none flex flex-col items-center text-center min-h-[140px] ${initialPlan === 'pro' ? 'border-[#0b5566] bg-white shadow' : 'border-gray-200 bg-white hover:shadow-sm'}`}
          >
            <div>
              <div className="font-semibold text-[#0b5566]">Pro</div>
              <div className="text-xs text-gray-600">Pour structures avancées</div>
            </div>
            <div className="mt-3 text-xs text-gray-600">Enfants illimités, RH & facturation</div>
            <div className="mt-auto text-base font-bold text-[#0b5566]">59,99€ <span className="text-xs text-gray-500">/ mois</span></div>
          </button>
        </div>
      </div>

  <button type="submit" disabled={initLoading || completeLoading} className="w-full bg-[#0b5566] text-white py-2 rounded-full font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]">{initLoading || completeLoading ? 'Patientez…' : (initialPlan === 'decouverte' ? 'S’inscrire' : 'S’inscrire et payer')}</button>
    <div className="mt-4 text-sm text-[#08323a]">Déjà un compte ? <a href="/login" className="text-[#0b5566] hover:underline">Se connecter</a></div>
  {/* Inline card collection removed: registration uses Stripe Checkout redirect */}
      </form>

      {/* Upgrade modal — shown when backend returns 402 (quota / subscription required) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-lg font-bold text-[#0b5566] mb-2">Abonnement requis</h3>
            <p className="text-sm text-gray-700 mb-4">{upgradeMessage || 'Cette action nécessite un abonnement. Passez à un plan supérieur pour continuer.'}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { window.location.href = '/pricing'; }} className="px-4 py-2 bg-[#0b5566] text-white rounded-md">Aller aux offres</button>
              <button onClick={() => setShowUpgradeModal(false)} className="px-4 py-2 border rounded-md">Fermer</button>
            </div>
          </div>
        </div>
      )}
      {/* Chooser removed: Découverte now signs up without selecting a paid plan */}
    </div>
  );
}

// Upgrade modal component JSX inserted after main export (kept in same file for simplicity)
