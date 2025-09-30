import SEO from '../components/SEO';
import { useNavigate } from 'react-router-dom';

export default function GuideExportReportPage() {
  const navigate = useNavigate();
  return (
  <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0">
      <SEO
        title={"Rapport | Guide Frimousse"}
        description={"Tutoriel pour exporter un rapport dans Frimousse : consultation, filtrage, export PDF ou Excel des rapports d'activité."}
        url={"https://frimousse-asso.fr/guide-export-rapport"}
      />
      <header className="w-full py-6 bg-white border-b border-[#fcdcdf]">
        <div className="max-w-4xl mx-auto flex items-center gap-4 px-6">
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
            <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
          </div>
          <div className="w-full text-left">
            <span className="font-bold text-base text-[#08323a]">Les Frimousses</span>
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
            <h1 className="text-3xl font-bold text-[#0b5566] mb-6">Rapport</h1>
            <ol className="list-decimal list-inside text-[#08323a] space-y-3 mb-6">
              <li>Accédez à la rubrique "Rapports" via le menu.</li>
              <li>Filtrez les rapports selon la période, le groupe ou l’intervenant.</li>
              <li>Cliquez sur le rapport souhaité pour le consulter en détail.</li>
            </ol>
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
