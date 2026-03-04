import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const InvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) return setError("Lien d'invitation manquant");
    if (!password) return setError('Mot de passe requis');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');
    try {
  setLoading(true);
  const res = await fetchWithRefresh(`${API_URL}/auth/accept-invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || body?.error || 'Erreur');
      setSuccess('Mot de passe défini, vous pouvez maintenant vous connecter.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Invitation - définir votre mot de passe</h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {success ? (
          <div className="text-green-600">{success}</div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-sm">Mot de passe</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2 pr-10" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div>
              <label className="text-sm">Confirmer</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full border rounded px-3 py-2 pr-10" />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg" aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}>{showConfirm ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button type="submit" disabled={loading} className="bg-green-500 text-white px-4 py-2 rounded">{loading ? 'Envoi...' : 'Valider'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
