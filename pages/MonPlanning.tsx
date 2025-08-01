import { useEffect, useState } from 'react';
import NannyCalendar from '../components/NannyCalendar';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL;

export default function MonPlanning() {
  const [nannyId, setNannyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/api/me`, { credentials: 'include' })
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
    <div className="min-h-screen bg-[#fcfcff] flex flex-col md:flex-row">
      <main className="flex-1 flex flex-col items-center py-4 px-2 md:py-8 md:px-2 md:ml-64">
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow p-4 md:p-10 min-h-[600px] md:min-h-[700px] flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">Mon planning</h1>
            <div className="flex-1 flex flex-col">
              <NannyCalendar nannyId={nannyId} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
