import { useEffect, useState } from 'react';
import NannyCalendar from '../components/NannyCalendar';

export default function MonPlanning() {
  const [nannyId, setNannyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On suppose que l'API /api/me retourne l'utilisateur connecté avec son nannyId si c'est une nounou
    fetch('/api/me', { credentials: 'include' })
      .then(res => res.json())
      .then(user => {
        if (user.role === 'nanny' && user.nannyId) {
          setNannyId(user.nannyId);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!nannyId) return <div className="p-8 text-center text-red-500">Accès réservé aux nounous.</div>;

  return (
    <div className="min-h-screen bg-[#fcfcff] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Mon planning</h1>
        <NannyCalendar nannyId={nannyId} />
      </div>
    </div>
  );
}
