import { useState } from 'react';


const API_URL = import.meta.env.VITE_API_URL;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState('');
  const [subscribeToken, setSubscribeToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // If server indicates subscription required, show that message and a CTA
        if (res.status === 402 && data && data.error) {
          setError(data.error);
          setNeedsSubscription(true);
          setPrefillEmail(email);
          setSubscribeToken(data.subscribeToken || null);
          return;
        }
        throw new Error(data?.message || data?.error || 'Identifiants invalides');
      }
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Erreur de connexion');
      } else {
        setError('Erreur de connexion');
      }
    }
  };

  return (
    <div className="min-h-screen w-screen max-w-full overflow-x-hidden flex items-center justify-center  bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2]">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md flex flex-col items-center">
        <div className="w-20 h-20 mb-4">
          <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-[#0b5566] text-center">Connexion</h2>
        <p className="mb-6 text-[#08323a] text-center">Connectez-vous à votre espace Frimousse</p>
        {error && <div className="mb-4 text-red-600 w-full text-center">{error}</div>}
        {needsSubscription && (
          <div className="mb-4 w-full text-center">
            <button
              type="button"
              onClick={() => {
                const qs = new URLSearchParams();
                if (prefillEmail) qs.set('prefillEmail', prefillEmail);
                if (subscribeToken) qs.set('subscribeToken', subscribeToken);
                window.location.href = `/tarifs?${qs.toString()}`;
              }}
              className="bg-[#0b5566] text-white px-4 py-2 rounded"
            >
              S'abonner
            </button>
          </div>
        )}
        <label className="block mb-3 w-full text-left font-medium text-[#08323a]">Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
        </label>
        <label className="block mb-6 w-full text-left font-medium text-gray-700">Mot de passe
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200 pr-10"
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
        <div className="w-full text-center text-sm mt-2">
          <button type="button" onClick={() => setForgotOpen(true)} className="text-[#0b5566] hover:underline">Mot de passe oublié ?</button>
        </div>
        <button type="submit" className="w-full bg-[#0b5566] text-white py-2 rounded-full font-semibold hover:opacity-95 transition">Se connecter</button>
        <div className="mt-4 text-sm text-[#08323a]">Pas encore de compte ? <a href="/register" className="text-[#0b5566] hover:underline">Créer un compte</a></div>
      </form>
      {forgotOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Réinitialiser le mot de passe</h3>
            {forgotMessage ? <div className="mb-2 text-green-600">{forgotMessage}</div> : null}
            <label className="block mb-3">Email
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForgotOpen(false)} className="px-3 py-1">Annuler</button>
              <button type="button" onClick={async () => {
                setForgotMessage('');
                try {
                  const res = await fetch(`${API_URL}/auth/forgot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmail }) });
                  if (res.ok) {
                    setForgotMessage('Si un compte existe, un email de réinitialisation a été envoyé.');
                  } else {
                    const d = await res.json().catch(() => ({}));
                    setForgotMessage(d?.error || 'Erreur');
                  }
                } catch (err) {
                  console.error('forgot request error', err);
                  setForgotMessage('Erreur réseau');
                }
              }} className="bg-[#0b5566] text-white px-3 py-1 rounded">Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
