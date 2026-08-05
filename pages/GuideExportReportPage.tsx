import SEO from '../components/SEO';
import { buildFaqLd } from '../components/buildJsonLd';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    title: 'Accéder aux rapports',
    desc: 'Depuis le menu principal, ouvrez la rubrique "Rapports". La liste affiche tous les rapports d\'activité de votre structure (ou uniquement ceux de vos enfants assignés pour une nounou).',
  },
  {
    title: "Filtrer par type ou période",
    desc: "Filtrez par type de rapport (incident, comportement, soin) ou sur les 30 derniers jours pour retrouver rapidement l'information recherchée.",
  },
  {
    title: 'Consulter un rapport en détail',
    desc: "Cliquez sur un rapport pour voir son contenu complet : priorité, description, enfant concerné, intervenant à l'origine du rapport et date.",
  },
  {
    title: 'Suivre la facturation associée',
    desc: "Les rapports d'activité et les présences alimentent automatiquement la facturation mensuelle des familles, disponible en PDF dans l'espace facturation.",
  },
  {
    title: 'Exporter le planning d\'une nounou',
    desc: "Depuis la fiche d'un intervenant, un export PDF de son planning mensuel est disponible pour archivage ou transmission administrative.",
  },
];

const FAQ_ITEMS = [
  {
    q: 'Qui peut créer un rapport d\'activité ?',
    a: "Les administrateurs et les nounous peuvent créer un rapport (incident, comportement ou soin) pour un enfant. Les parents ne créent pas de rapport mais peuvent consulter ceux concernant leur enfant.",
  },
  {
    q: 'Peut-on exporter les rapports en PDF ou Excel ?',
    a: "Les rapports d'activité se consultent et se filtrent directement dans l'application. L'export PDF est disponible pour les factures mensuelles et pour le planning d'un intervenant, depuis leurs rubriques respectives.",
  },
  {
    q: 'Les parents voient-ils tous les rapports de la structure ?',
    a: "Non, un parent ne voit que les rapports concernant son propre enfant. Une nounou ne voit que les rapports des enfants qui lui sont assignés.",
  },
  {
    q: 'Comment retrouver un rapport ancien ?',
    a: "Désactivez le filtre \"30 derniers jours\" et utilisez le filtre par type pour parcourir l'historique complet des rapports de la structure.",
  },
];

export default function GuideExportReportPage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Rapports d'activité et facturation | Guide Frimousse - Logiciel crèche"}
        description={"Comment consulter, filtrer les rapports d'activité et exporter la facturation et le planning dans Frimousse. Guide pour crèches, micro-crèches et MAM."}
        url={"https://lesfrimousses.com/guide-export-rapport"}
        image={"https://lesfrimousses.com/imgs/og-banner.png"}
        type={"article"}
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'Export rapport', url: 'https://lesfrimousses.com/guide-export-rapport' }]}
        ldJson={buildFaqLd(FAQ_ITEMS)}
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
              Rapports & facturation
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Consulter, filtrer les rapports d'activité et exporter la facturation ou le planning d'un intervenant.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 120V60C240 15 480 0 720 25C960 50 1200 80 1440 50V120H0Z" fill="white"/></svg>
          </div>
        </section>

        {/* ── Étapes ── */}
        <section className="py-20 md:py-24 px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Étape par étape</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Consulter et exporter</h2>
            </div>
            <ol className="space-y-6">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-5 bg-gray-50 rounded-3xl border border-gray-100 p-6 md:p-8">
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-brand-500 text-white font-bold flex items-center justify-center">{i + 1}</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">FAQ</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Questions fréquentes sur les rapports</h2>
            </div>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, i) => (
                <details key={i} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <summary className="flex items-center justify-between p-6 cursor-pointer font-semibold text-gray-900 list-none">
                    {item.q}
                    <svg className="w-5 h-5 text-brand-500 flex-shrink-0 ml-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </summary>
                  <div className="px-6 pb-6 text-gray-600 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/support" className="group bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3 border border-gray-100">
                Retour au support
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
              </Link>
              <Link to="/" className="!text-[#ffffff] border-2 border-brand-500 hover:border-brand-600 px-8 py-4 rounded-2xl font-bold text-lg transition-all bg-brand-500 hover:bg-brand-600">
                Accueil
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
