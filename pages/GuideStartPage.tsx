import SEO from '../components/SEO';
import { buildFaqLd } from '../components/buildJsonLd';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    title: 'Connexion à votre espace',
    desc: "Rendez-vous sur la page d'accueil et cliquez sur \"Se connecter\". Utilisez l'email et le mot de passe fournis lors de la création de votre structure (crèche, micro-crèche ou MAM). Si vous avez été invité par un administrateur, suivez le lien reçu par email pour définir votre mot de passe.",
  },
  {
    title: 'Découvrir la navigation',
    desc: "Le menu principal donne accès aux rubriques Enfants, Nounous, Parents, Planning, Rapports et Fil d'actualité. Sur mobile, ce menu est accessible via l'icône en haut de l'écran. Le tableau de bord d'accueil résume les présences du jour et les activités à venir.",
  },
  {
    title: 'Ajouter votre équipe',
    desc: "Depuis la rubrique \"Nounous\", cliquez sur \"Ajouter\" et renseignez le nom, l'expérience et les coordonnées de chaque intervenant. Chacun reçoit ensuite ses identifiants pour accéder à son propre planning.",
  },
  {
    title: 'Ajouter les familles',
    desc: "Depuis \"Parents\", créez une fiche par famille (nom, email, téléphone). Un compte parent est automatiquement proposé pour qu'ils suivent l'activité de leur enfant depuis leur smartphone.",
  },
  {
    title: 'Créer les fiches enfants',
    desc: "Dans \"Enfants\", ajoutez chaque enfant accueilli avec ses informations essentielles : date de naissance, allergies, informations médicales, contacts d'urgence, et le lien vers ses parents. Consultez notre guide dédié pour le détail de cette étape.",
  },
  {
    title: 'Construire le planning',
    desc: "Depuis l'accueil, affectez chaque enfant à un intervenant pour la semaine ou le mois. Les absences et remplacements se gèrent directement depuis cette vue, visible en temps réel par toute l'équipe.",
  },
  {
    title: 'Suivre les rapports et la facturation',
    desc: "La rubrique \"Rapports\" centralise les rapports d'activité journaliers. Les présences enregistrées alimentent automatiquement la facturation mensuelle des familles, consultable dans l'espace dédié.",
  },
];

const FAQ_ITEMS = [
  {
    q: 'Combien de temps faut-il pour configurer Frimousse ?',
    a: "Pour une petite structure (MAM, micro-crèche), compter environ 30 minutes pour créer les fiches de l'équipe et des premières familles. L'ajout des enfants prend quelques minutes par dossier. Aucune formation technique n'est nécessaire.",
  },
  {
    q: "Puis-je importer mes données existantes (Excel, ancien logiciel) ?",
    a: "Oui, un import par fichier Excel est disponible pour les nounous, parents et enfants (menu Import, réservé aux administrateurs). Notre équipe peut aussi vous accompagner pour une migration depuis un autre outil.",
  },
  {
    q: 'Que voient les parents une fois leur compte créé ?',
    a: "Les parents accèdent à un espace limité à leur propre enfant : planning, rapports d'activité, fil d'actualité avec photos (selon leur consentement) et messagerie avec l'équipe. Ils ne voient jamais les données des autres familles.",
  },
  {
    q: "Comment inviter un nouvel intervenant en cours d'année ?",
    a: "Un administrateur crée sa fiche depuis la rubrique Nounous ; l'intervenant reçoit un email d'invitation pour activer son compte et définir son mot de passe.",
  },
];

export default function GuideStartPage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Guide de démarrage rapide | Frimousse - Logiciel de gestion crèche"}
        description={"Premiers pas sur Frimousse : connexion, navigation, ajout de l'équipe, des familles et des enfants, planning et facturation. Tutoriel complet pour crèches, micro-crèches et MAM."}
        url={"https://lesfrimousses.com/guide-demarrage"}
        image={"https://lesfrimousses.com/imgs/og-banner.png"}
        type={"article"}
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'Guide démarrage', url: 'https://lesfrimousses.com/guide-demarrage' }]}
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
              Démarrez avec Frimousse
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              De la connexion à la facturation : les 7 étapes pour mettre en place votre structure sur Frimousse.
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
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Guide de démarrage rapide</h2>
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
            <div className="mt-10 text-gray-500 text-sm text-center">
              Besoin d'un détail sur une étape précise ? Consultez nos guides <Link to="/guide-ajouter-enfant" className="text-brand-600 underline">ajouter un enfant</Link>, <Link to="/guide-planning" className="text-brand-600 underline">gérer le planning</Link> et <Link to="/guide-export-rapport" className="text-brand-600 underline">exporter un rapport</Link>.
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">FAQ</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Questions fréquentes sur la prise en main</h2>
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
              <Link to="/" className="group bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3 border border-gray-100">
                Retour à l'accueil
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
              </Link>
              <Link to="/support" className="!text-[#ffffff] border-2 border-brand-500 hover:border-brand-600 px-8 py-4 rounded-2xl font-bold text-lg transition-all bg-brand-500 hover:bg-brand-600">
                Besoin d'aide ?
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
