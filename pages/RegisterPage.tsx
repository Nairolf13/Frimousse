import { useState } from 'react';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'parent' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
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
          <input name="password" type="password" value={form.password} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200" />
        </label>
        <label className="block mb-6 w-full text-left font-medium text-gray-700">Rôle
          <select name="role" value={form.role} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="parent">Parent</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" className="w-full bg-gray-100 text-black border-2 border-gray-300 py-2 rounded-full font-semibold hover:bg-gray-200 transition">S’inscrire</button>
        <div className="mt-4 text-sm text-gray-500">Déjà un compte ? <a href="/login" className="text-green-600 hover:underline">Se connecter</a></div>
      </form>
    </div>
  );
}
