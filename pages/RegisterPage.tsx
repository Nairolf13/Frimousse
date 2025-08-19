import { useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL;

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'admin', centerName: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      const res = await fetch(`${API_URL}/api/auth/register`, {
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
    <div className="h-screen flex items-center justify-center  bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2] overflow-hidden">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md flex flex-col items-center max-h-[95vh] overflow-auto">
        <div className="w-20 h-20 mb-4">
          <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-[#0b5566] text-center">Inscription</h2>
        <p className="mb-6 text-[#08323a] text-center">Créez votre compte Frimousse</p>
        {error && <div className="mb-4 text-red-600 w-full text-center">{error}</div>}
        {success && <div className="mb-4 text-[#0b5566] w-full text-center">Inscription réussie ! Redirection...</div>}
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
    <button type="submit" className="w-full bg-[#0b5566] text-white py-2 rounded-full font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]">S’inscrire</button>
    <div className="mt-4 text-sm text-[#08323a]">Déjà un compte ? <a href="/login" className="text-[#0b5566] hover:underline">Se connecter</a></div>
      </form>
    </div>
  );
}
