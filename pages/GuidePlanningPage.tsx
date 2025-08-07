import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function GuidePlanningPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white p-0 m-0">
      <Helmet>
        <title>Gérer un planning | Guide Frimousse</title>
        <meta name="description" content="Tutoriel pour gérer le planning dans Frimousse : visualisation, modification, gestion des absences et présences." />
      </Helmet>
      <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-2 px-4">
          <div className="flex items-center gap-2">
            <span className="bg-green-100 rounded-full p-1"><span className="text-xl">🧒</span></span>
            <div className="w-full text-center">
              <span className="font-bold text-base text-gray-800">Les petites Frimousse</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">
        <section className="w-full py-12 px-6 bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto text-left">
            <button
              onClick={() => navigate(-1)}
              className="mb-8 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
              aria-label="Retour"
            >
              ← Retour
            </button>
            <h1 className="text-3xl font-bold text-green-700 mb-6">Gérer un planning</h1>
            <ol className="list-decimal list-inside text-gray-700 space-y-3 mb-6">
              <li>Accédez à la rubrique "Mon planning" via le menu.</li>
              <li>Visualisez le planning de garde sous forme de calendrier.</li>
              <li>Pour modifier une garde, cliquez sur le créneau souhaité et suivez les instructions.</li>
              <li>Les absences et présences sont gérées directement dans le calendrier.</li>
              <li>Les modifications sont enregistrées automatiquement et visibles par les intervenants concernés.</li>
            </ol>
            <div className="mt-8 text-gray-600 text-sm">Seuls les utilisateurs autorisés peuvent modifier le planning.</div>
          </div>
        </section>
        <div className="max-w-4xl mx-auto text-center mt-10 mb-8">
          <button
            onClick={() => navigate('/support')} 
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            aria-label="Retour au support (bas de page)"
          >
            ← Retour au support
          </button>
        </div>
      </main>
    </div>
  );
}
