import { useState } from 'react';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'admin' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // On ignore le champ role, il est toujours admin
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Erreur lors de l’inscription');
      setSuccess(true);
      setTimeout(() => (window.location.href = '/login'), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Erreur lors de l’inscription');
      } else {
        setError('Erreur lors de l’inscription');
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white overflow-hidden">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md flex flex-col items-center max-h-[95vh] overflow-auto">
        <span className="text-4xl mb-4">🧒</span>
        <h2 className="text-2xl font-bold mb-2 text-green-700 text-center">Inscription</h2>
        <p className="mb-6 text-gray-500 text-center">Créez votre compte Frimousse</p>
        {error && <div className="mb-4 text-red-600 w-full text-center">{error}</div>}
        {success && <div className="mb-4 text-green-600 w-full text-center">Inscription réussie ! Redirection...</div>}
        <label className="block mb-3 w-full text-left font-medium text-gray-700">Nom
          <input name="name" value={form.name} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200" />
        </label>
        <label className="block mb-3 w-full text-left font-medium text-gray-700">Email
          <input name="email" type="email" value={form.email} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200" />
        </label>
        <label className="block mb-3 w-full text-left font-medium text-gray-700">Mot de passe
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              required
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200 pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 text-lg focus:outline-none"
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
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200 pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 text-lg focus:outline-none"
              onClick={() => setShowConfirm(v => !v)}
            >
              {showConfirm ? '🙈' : '👁️'}
            </button>
          </div>
        </label>
        {/* Le rôle est forcé à admin, pas de select affiché */}
        <button type="submit" className="w-full bg-gray-100 text-black border-2 border-gray-300 py-2 rounded-full font-semibold hover:bg-gray-200 transition">S’inscrire</button>
        <div className="mt-4 text-sm text-gray-500">Déjà un compte ? <a href="/login" className="text-green-600 hover:underline">Se connecter</a></div>
      </form>
    </div>
  );
}
