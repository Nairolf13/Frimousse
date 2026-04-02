import { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useLocation } from 'react-router-dom';
import OAuthButtons from '../components/OAuthButtons';


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

  const { setUser } = useAuth();
  const location = useLocation();

  // Show a message if redirected from a failed OAuth attempt or expired session
  useEffect(() => {
    if ((location.state as { sessionExpired?: boolean } | null)?.sessionExpired) {
      setError('Votre session a expiré. Veuillez vous reconnecter.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    const params = new URLSearchParams(window.location.search);
    const oauthErr = params.get('error');
    if (oauthErr) {
      const messages: Record<string, string> = {
        oauth_config: 'La connexion sociale n\'est pas encore configurée. Utilisez email/mot de passe.',
        oauth_no_code: 'Connexion annulée.',
        oauth_failed: 'Échec de la connexion sociale. Veuillez réessayer.',
        oauth_no_account: 'Aucun compte trouvé. Veuillez d\'abord vous inscrire.',
      };
      setError(messages[oauthErr] || 'Erreur de connexion.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.state]);

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
        // Handle email not verified
        if (res.status === 403 && data.error === 'email_not_verified') {
          // the server has just sent a fresh verification code
          window.location.href = `/verify-email?email=${encodeURIComponent(data.email || email)}&sent=1`;
          return;
        }
        if (res.status === 402 && data && data.error) {
          setError(data.error);
          setNeedsSubscription(true);
          setPrefillEmail(email);
          setSubscribeToken(data.subscribeToken || null);
          return;
        }
        throw new Error(data?.message || data?.error || 'Identifiants invalides');
      }
      // refresh user context synchronously using already imported setUser
      try {
        const meRes = await fetch(`${API_URL}/api/user/me`, { credentials: 'include' });
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData);
        }
      } catch {
        // ignore
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
    <div className="min-h-dvh w-full bg-white md:flex md:flex-row">
      {/* Desktop left branding panel — sticky */}
      <div className="hidden md:flex md:w-[38%] lg:w-[35%] xl:w-[30%] bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 flex-col items-center justify-center p-10 relative overflow-hidden md:sticky md:top-0 md:h-screen md:flex-shrink-0">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 right-10 w-28 h-28 bg-white/10 rounded-full" />
        <img src="/imgs/FrimousseLogo.webp" alt="Logo Frimousse" className="w-24 h-24 object-contain drop-shadow-lg mb-8 relative z-10" />
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white text-center tracking-tight leading-tight relative z-10">
          Bienvenue sur<br />Frimousse
        </h1>
        <p className="mt-4 text-brand-100 text-center text-base lg:text-lg max-w-xs leading-relaxed relative z-10">
          La plateforme de gestion pour les assistantes maternelles et crèches.
        </p>
        <div className="mt-10 flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <span className="text-sm font-medium">Planning & suivi en temps réel</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <span className="text-sm font-medium">Assistant IA</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <span className="text-sm font-medium">Communication parents simplifiée</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 md:px-10 lg:px-16 py-6 md:py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md">

        {/* Mobile header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 mb-3 md:hidden">
            <img src="/imgs/FrimousseLogo.webp" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Connexion</h2>
          <p className="mt-1 text-gray-500 text-sm">Connectez-vous à votre espace Frimousse</p>
        </div>

        {error && <div className="mb-5 text-red-600 text-sm text-center bg-red-50 rounded-xl px-4 py-3">{error}</div>}
        {needsSubscription && (
          <div className="mb-5 w-full text-center">
            <button
              type="button"
              onClick={() => {
                const qs = new URLSearchParams();
                if (prefillEmail) qs.set('prefillEmail', prefillEmail);
                if (subscribeToken) qs.set('subscribeToken', subscribeToken);
                window.location.href = `/tarifs?${qs.toString()}`;
              }}
              className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-brand-600 transition-colors shadow-sm"
            >
              S'abonner
            </button>
          </div>
        )}

        {/* ── Email ── */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" placeholder="vous@exemple.com" />
        </div>

        {/* ── Mot de passe ── */}
        <div className="mb-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Mot de passe</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all pr-11"
              placeholder="••••••••"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors focus:outline-none"
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
              )}
            </button>
          </div>
        </div>
        <div className="w-full text-right mb-6">
          <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-brand-500 hover:text-brand-600 hover:underline transition-colors font-medium">Mot de passe oublié ?</button>
        </div>

        {/* Submit */}
        <button type="submit" className="w-full bg-brand-500 text-white py-3.5 rounded-xl font-semibold text-sm tracking-wide hover:bg-brand-600 active:scale-[0.98] transition-all shadow-sm hover:shadow-md">Se connecter</button>

        {/* Divider */}
        <div className="flex items-center w-full my-6">
          <div className="flex-1 border-t border-gray-400" />
          <span className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">ou</span>
          <div className="flex-1 border-t border-gray-400" />
        </div>

        <OAuthButtons mode="login" />

        <p className="mt-5 text-center text-sm text-gray-400">Pas encore de compte ? <a href="/register" className="text-brand-500 font-semibold hover:underline">Créer un compte</a></p>
      </form>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Réinitialiser le mot de passe</h3>
            <p className="text-sm text-gray-500 mb-4">Entrez votre email pour recevoir un lien de réinitialisation.</p>
            {forgotMessage ? <div className="mb-3 text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm">{forgotMessage}</div> : null}
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" placeholder="vous@exemple.com" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setForgotOpen(false)} className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors">Annuler</button>
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
              }} className="bg-brand-500 text-white px-5 py-2 rounded-xl font-semibold hover:bg-brand-600 transition-colors shadow-sm">Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
