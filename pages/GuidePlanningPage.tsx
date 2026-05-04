import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

export default function GuidePlanningPage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Gerer le planning de garde | Guide Frimousse - Application creche"}
        description={"Comment gerer le planning de garde dans Frimousse : visualisation calendrier, modification des presences, gestion des absences. Tutoriel pour creches et MAM."}
        url={"https://lesfrimousses.com/guide-planning"}
        image={"https://lesfrimousses.com/imgs/og-banner.png"}
        type={"article"}
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'Guide planning', url: 'https://lesfrimousses.com/guide-planning' }]}
      />
      <PublicNavbar />
      <main className="flex-1 w-full">
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-brand-300/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-white/15 px-4 py-1.5 rounded-full mb-6 border border-white/20">Guide</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold !text-[#ffffff] leading-[1.1] tracking-tight mb-6">
              Gérer un planning
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Tutoriel pour gérer le planning dans Frimousse : visualisation, modification, gestion des absences et présences.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 120V60C240 15 480 0 720 25C960 50 1200 80 1440 50V120H0Z" fill="white"/></svg>
          </div>
        </section>
        {/* ── Guide Card ── */}
        <section className="py-20 md:py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
              <h2 className="text-2xl font-bold text-brand-700 mb-6 text-center">Gérer un planning</h2>
              <ol className="list-decimal list-inside text-gray-700 space-y-3 mb-6 text-left">
                <li>Accédez à la rubrique "Mon planning" via le menu.</li>
                <li>Visualisez le planning de garde sous forme de calendrier.</li>
                <li>Pour modifier une garde, cliquez sur le créneau souhaité et suivez les instructions.</li>
                <li>Les absences et présences sont gérées directement dans le calendrier.</li>
                <li>Les modifications sont enregistrées automatiquement et visibles par les intervenants concernés.</li>
              </ol>
              <div className="mt-8 text-gray-500 text-sm">Seuls les utilisateurs autorisés peuvent modifier le planning.</div>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/support" className="group bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3">
                  Retour au support
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
                </Link>
                <Link to="/" className="!text-[#ffffff] border-2 border-brand-500 hover:border-brand-600 px-8 py-4 rounded-2xl font-bold text-lg transition-all bg-brand-500 hover:bg-brand-600">
                  Accueil
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
