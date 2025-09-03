import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const t = qs.get('token') || '';
    setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!token) return setMessage('Token manquant');
    if (!password) return setMessage('Entrez un mot de passe');
    if (password !== confirm) return setMessage('Les mots de passe ne correspondent pas');
    try {
      const res = await fetch(`${API_URL}/auth/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || 'Erreur');
        return;
      }
      setMessage('Mot de passe mis à jour. Vous pouvez vous connecter.');
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    } catch (err) {
      console.error('reset error', err);
      setMessage('Erreur réseau');
    }
  };

  return (
    <div className="min-h-screen w-screen max-w-full overflow-x-hidden flex items-center justify-center  bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2]">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4">Réinitialiser le mot de passe</h2>
        {message && <div className="mb-4 text-center text-sm">{message}</div>}
        <label className="block w-full mb-3">Nouveau mot de passe
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className="block w-full mb-3">Confirmer mot de passe
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <button type="submit" className="bg-[#0b5566] text-white px-4 py-2 rounded">Valider</button>
      </form>
    </div>
  );
}
