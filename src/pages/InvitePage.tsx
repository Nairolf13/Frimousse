import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return setMessage('Token manquant');
    setLoading(true);
    try {
      const res = await fetch('/api/nannies/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Mot de passe défini. Vous pouvez vous connecter.');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setMessage(data.message || data.error || 'Erreur');
      }
    } catch {
      // network or unexpected error
      setMessage('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-6 rounded-md shadow">
        <h2 className="text-xl font-semibold mb-4">Définir votre mot de passe</h2>
        {message && <div className="mb-4 text-sm text-gray-700">{message}</div>}
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full border rounded p-2" />
          <button disabled={loading} className="mt-4 w-full bg-emerald-600 text-white py-2 rounded">{loading ? 'Chargement...' : 'Valider'}</button>
        </form>
      </div>
    </div>
  );
}
