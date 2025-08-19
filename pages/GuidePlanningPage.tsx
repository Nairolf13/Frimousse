import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function GuidePlanningPage() {
  const navigate = useNavigate();
  return (
  <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0">
      <Helmet>
        <title>Gérer un planning | Guide Frimousse</title>
        <meta name="description" content="Tutoriel pour gérer le planning dans Frimousse : visualisation, modification, gestion des absences et présences." />
      </Helmet>
      <header className="w-full bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2] border-b border-[#fcdcdf] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
              <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
            </div>
            <div className="w-full text-center">
              <span className="font-bold text-base text-[#08323a]">Les Frimousses</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">
        <section className="w-full py-12 px-6 bg-white border-b border-[#fcdcdf]">
          <div className="max-w-3xl mx-auto text-left">
            <button
              onClick={() => navigate(-1)}
              className="mb-8 px-4 py-2 rounded bg-[#0b5566] text-white hover:opacity-95 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2"
              aria-label="Retour"
            >
              ← Retour
            </button>
            <h1 className="text-3xl font-bold text-[#0b5566] mb-6">Gérer un planning</h1>
            <ol className="list-decimal list-inside text-[#08323a] space-y-3 mb-6">
              <li>Accédez à la rubrique "Mon planning" via le menu.</li>
              <li>Visualisez le planning de garde sous forme de calendrier.</li>
              <li>Pour modifier une garde, cliquez sur le créneau souhaité et suivez les instructions.</li>
              <li>Les absences et présences sont gérées directement dans le calendrier.</li>
              <li>Les modifications sont enregistrées automatiquement et visibles par les intervenants concernés.</li>
            </ol>
            <div className="mt-8 text-[#08323a] text-sm">Seuls les utilisateurs autorisés peuvent modifier le planning.</div>
          </div>
        </section>
        <div className="max-w-4xl mx-auto text-center mt-10 mb-8">
          <button
            onClick={() => navigate('/support')} 
            className="px-4 py-2 rounded bg-[#0b5566] text-white hover:opacity-95 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2"
            aria-label="Retour au support (bas de page)"
          >
            ← Retour au support
          </button>
        </div>
      </main>
    </div>
  );
}
