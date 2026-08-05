import SEO from '../components/SEO';
import { buildFaqLd } from '../components/buildJsonLd';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    title: 'Accéder au planning',
    desc: "Depuis l'accueil (administrateurs) ou \"Mon planning\" (nounous), affichez le calendrier hebdomadaire ou mensuel des affectations enfants ↔ intervenants.",
  },
  {
    title: 'Affecter un enfant à un intervenant',
    desc: "Cliquez sur un créneau vide ou existant pour choisir l'enfant et l'intervenant concernés. L'affectation détermine qui a accès aux données de l'enfant ce jour-là (rapports, fiche, présence).",
  },
  {
    title: 'Déclarer une absence ou un remplacement',
    desc: "En cas d'absence (congé, maladie) d'un intervenant, réaffectez ses créneaux à un remplaçant directement depuis le planning. Les familles concernées sont notifiées si l'option est activée.",
  },
  {
    title: 'Suivre les présences du jour',
    desc: "La vue du jour affiche en un coup d'œil les enfants attendus, déjà arrivés ou absents. Ces présences alimentent directement les feuilles de présence mensuelles et la facturation.",
  },
  {
    title: 'Modifier ou annuler une affectation',
    desc: "Un administrateur peut réaffecter ou supprimer une entrée de planning à tout moment. Les modifications sont enregistrées immédiatement et visibles par toute l'équipe concernée.",
  },
];

const FAQ_ITEMS = [
  {
    q: 'Qui peut modifier le planning ?',
    a: "Les administrateurs de la structure peuvent créer et modifier toutes les affectations. Les nounous consultent leur propre planning et peuvent signaler une absence, mais ne modifient pas les affectations d'autres intervenants.",
  },
  {
    q: 'Le planning est-il visible par les parents ?',
    a: "Les parents voient uniquement le planning et les présences de leur propre enfant, jamais celui des autres familles ni la répartition complète de l'équipe.",
  },
  {
    q: 'Comment gérer un remplacement de dernière minute ?',
    a: "Depuis le planning, réaffectez simplement le créneau de l'intervenant absent à un remplaçant disponible. L'historique de présence de l'enfant reste inchangé, seul l'intervenant change.",
  },
  {
    q: "Les présences du planning servent-elles à la facturation ?",
    a: "Oui. Chaque présence enregistrée alimente automatiquement le calcul mensuel des cotisations familles, visible dans l'espace facturation.",
  },
];

export default function GuidePlanningPage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Gérer le planning de garde | Guide Frimousse - Application crèche"}
        description={"Comment gérer le planning de garde dans Frimousse : affectation enfant/intervenant, absences, remplacements, suivi des présences. Tutoriel pour crèches, micro-crèches et MAM."}
        url={"https://lesfrimousses.com/guide-planning"}
        image={"https://lesfrimousses.com/imgs/og-banner.png"}
        type={"article"}
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'Guide planning', url: 'https://lesfrimousses.com/guide-planning' }]}
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
              Gérer un planning
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Affectation, absences, remplacements et suivi des présences : le guide complet du planning de garde.
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
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Gérer le planning au quotidien</h2>
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
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Questions fréquentes sur le planning</h2>
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
