import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Identifiants invalides');
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
    <div className="min-h-screen w-screen max-w-full overflow-x-hidden flex items-center justify-center bg-gradient-to-br from-green-50 to-white">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md flex flex-col items-center">
        <span className="text-4xl mb-4">🧒</span>
        <h2 className="text-2xl font-bold mb-2 text-green-700 text-center">Connexion</h2>
        <p className="mb-6 text-gray-500 text-center">Connectez-vous à votre espace Frimousse</p>
        {error && <div className="mb-4 text-red-600 w-full text-center">{error}</div>}
        <label className="block mb-3 w-full text-left font-medium text-gray-700">Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200" />
        </label>
        <label className="block mb-6 w-full text-left font-medium text-gray-700">Mot de passe
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200" />
        </label>
        <button type="submit" className="w-full bg-green-500 text-black py-2 rounded-full font-semibold hover:bg-green-600 transition">Se connecter</button>
        <div className="mt-4 text-sm text-gray-500">Pas encore de compte ? <a href="/register" className="text-green-600 hover:underline">Créer un compte</a></div>
      </form>
    </div>
  );
}
