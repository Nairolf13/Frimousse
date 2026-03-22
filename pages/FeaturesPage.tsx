import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Gestion des enfants',
    description: 'Ajout, modification, suppression et suivi des enfants inscrits à l’association.'
  },
  {
    title: 'Gestion des familles',
    description: 'Centralisation des informations des familles, contacts, et historique.'
  },
  {
    title: 'Gestion des nounous',
    description: 'Affectation, plannings, profils et suivi des nounous.'
  },
  {
    title: 'Planning & Calendrier',
    description: 'Visualisation et édition des plannings de garde, gestion des absences et présences.'
  },

  {
    title: 'Authentification sécurisée',
    description: 'Connexion par email/mot de passe, gestion des rôles et permissions.'
  },
  {
    title: 'Notifications',
    description: 'Alertes pour les événements importants, rappels et communications.'
  },
  {
    title: 'Assistant IA',
    description: 'Obtiens des réponses rapides, des modèles de messages et de l’aide administrative pour gérer ton association.'
  },
  {
    title: 'Accessibilité',
    description: 'Respect des standards d’accessibilité pour tous les utilisateurs.'
  },
  {
    title: 'Sécurité & RGPD',
    description: 'Protection des données, conformité RGPD, cookies HTTP-only.'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  'name': 'Fonctionnalités de l’application Frimousse',
  'itemListElement': features.map((f, i) => ({
    '@type': 'ListItem',
    'position': i + 1,
    'name': f.title,
    'description': f.description
  }))
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Fonctionnalites de Frimousse | Logiciel de gestion creche, micro-creche et MAM"}
        description={"Decouvrez les fonctionnalites de Frimousse : gestion des enfants et familles, planning intervenants, rapports d'activite, communication parents, assistant IA, securite RGPD. Application complete pour creches et MAM."}
        url={"https://lesfrimousses.com/fonctionnalites"}
        image={"https://lesfrimousses.com/imgs/LogoFrimousse.webp"}
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'Fonctionnalites', url: 'https://lesfrimousses.com/fonctionnalites' }]}
        tags={["fonctionnalites creche", "logiciel gestion enfant", "planning creche", "application MAM", "gestion micro-creche"]}
      />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <PublicNavbar />

      <main className="flex-1 w-full">
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-brand-300/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-white/15 px-4 py-1.5 rounded-full mb-6 border border-white/20">Fonctionnalités</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold !text-[#ffffff] leading-[1.1] tracking-tight mb-6">
              Tout ce qu'il faut
              <br />
              <span className="bg-gradient-to-r from-brand-200 via-brand-100 to-cream-100 bg-clip-text text-transparent">pour votre structure</span>
            </h1>
            <p className="text-lg md:text-xl !text-[#ffffff] max-w-2xl mx-auto leading-relaxed">
              Des outils pensés pour simplifier la gestion, améliorer la communication et garantir la sécurité des données de votre association.
            </p>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 120V60C240 15 480 0 720 25C960 50 1200 80 1440 50V120H0Z" fill="white"/></svg>
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section className="py-20 md:py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => {
                const icons = [
                  { color: 'bg-blue-50 text-blue-500', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg> },
                  { color: 'bg-amber-50 text-amber-500', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg> },
                  { color: 'bg-emerald-50 text-emerald-500', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg> },
                  { color: 'bg-violet-50 text-violet-500', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg> },
                  { color: 'bg-rose-50 text-rose-500', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg> },
                  { color: 'bg-cyan-50 text-cyan-500', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg> },
                  { color: 'bg-indigo-50 text-indigo-500', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/></svg> },
                  { color: 'bg-teal-50 text-teal-500', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/></svg> },
                  { color: 'bg-orange-50 text-orange-500', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/></svg> },
                ];
                const { color, icon } = icons[idx % icons.length];
                return (
                  <div key={idx} className="group p-8 rounded-3xl border border-gray-100 hover:border-brand-200 bg-white hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300 hover:-translate-y-1">
                    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-5`}>{icon}</div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h2>
                    <p className="text-gray-500 leading-relaxed text-[15px]">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-6 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-brand-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-brand-300/15 rounded-full blur-[80px]" />
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold !text-[#ffffff] tracking-tight mb-6">Prêt à simplifier votre gestion ?</h2>
            <p className="!text-[#ffffff] text-lg mb-10 max-w-xl mx-auto leading-relaxed">Essayez Frimousse gratuitement et découvrez comment nous pouvons vous aider au quotidien.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register" className="group bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3">
                Essayer gratuitement
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
              </Link>
              <Link to="/tarifs" className="!text-[#ffffff] border-2 border-white/25 hover:border-white/50 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-white/10">
                Voir les tarifs
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
