import SEO from '../components/SEO';
import { buildFaqLd } from '../components/buildJsonLd';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    title: 'Ouvrir le formulaire d\'ajout',
    desc: 'Depuis le menu principal, accédez à la rubrique "Enfants" puis cliquez sur le bouton "Ajouter" en haut de la liste.',
  },
  {
    title: 'Renseigner l\'identité de l\'enfant',
    desc: "Saisissez le nom, la date de naissance et le sexe. Le groupe d'âge (0-1 an, 1-2 ans, 2-3 ans...) est calculé automatiquement à partir de la date de naissance, mais reste modifiable si besoin.",
  },
  {
    title: 'Lier un ou plusieurs parents',
    desc: "Recherchez un parent déjà existant par email, ou créez une nouvelle fiche parent directement depuis ce formulaire (nom, téléphone, email). L'enfant peut être lié à plusieurs parents ou responsables légaux.",
  },
  {
    title: 'Renseigner les informations médicales',
    desc: "Ajoutez les allergies connues et toute information médicale utile à l'équipe (traitement, ordonnance). Ces informations sont visibles uniquement par l'équipe encadrante et les parents liés à l'enfant.",
  },
  {
    title: 'Ajouter une photo (avec consentement)',
    desc: "Une photo peut être ajoutée à la fiche enfant. Le consentement photographique des parents est demandé séparément et conditionne l'apparition de l'enfant dans le fil d'actualité partagé.",
  },
  {
    title: 'Assigner l\'enfant à une nounou',
    desc: "Une fois la fiche créée, affectez l'enfant à un ou plusieurs intervenants depuis le planning. Cette affectation détermine qui peut consulter et modifier ses données au quotidien.",
  },
];

const FAQ_ITEMS = [
  {
    q: 'Quelles informations sont obligatoires pour créer une fiche enfant ?',
    a: 'Le nom, la date de naissance et le sexe sont obligatoires. Le groupe est calculé automatiquement mais peut être ajusté. Les allergies, informations médicales et photo sont facultatives mais recommandées.',
  },
  {
    q: 'Qui peut voir les informations médicales et les allergies ?',
    a: "Seuls l'équipe encadrante de la structure (nounous assignées, administrateurs) et les parents liés à l'enfant peuvent consulter ces informations. Elles ne sont jamais visibles par d'autres familles.",
  },
  {
    q: "Peut-on lier un enfant à deux parents séparés ?",
    a: "Oui, une fiche enfant peut être liée à plusieurs comptes parents (par exemple en cas de garde partagée). Chaque parent lié accède au planning, aux rapports et au fil d'actualité de son enfant.",
  },
  {
    q: 'Comment modifier ou supprimer une fiche enfant existante ?',
    a: "Depuis la liste \"Enfants\", utilisez les boutons d'action sur la ligne de l'enfant concerné pour modifier ses informations ou supprimer sa fiche. La suppression retire aussi ses liens de planning et de facturation.",
  },
];

export default function GuideAddChildPage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Ajouter un enfant dans le logiciel | Guide Frimousse - Gestion crèche"}
        description={"Comment ajouter un enfant dans Frimousse : identité, groupe d'âge, liaison aux parents, informations médicales, allergies et consentement photo. Guide pour crèches, micro-crèches et MAM."}
        url={"https://lesfrimousses.com/guide-ajouter-enfant"}
        image={"https://lesfrimousses.com/imgs/og-banner.png"}
        type={"article"}
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'Guide ajout enfant', url: 'https://lesfrimousses.com/guide-ajouter-enfant' }]}
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
              Ajouter un enfant
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Identité, groupe d'âge, liaison aux parents, informations médicales : le guide complet pour créer une fiche enfant.
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
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Créer une fiche enfant</h2>
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
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Questions fréquentes sur les fiches enfants</h2>
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
