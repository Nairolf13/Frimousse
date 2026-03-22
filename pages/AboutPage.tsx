import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"A propos de Frimousse | Application de gestion de garde d'enfants pour creches et MAM"}
        description={"Decouvrez Frimousse, la solution digitale pour la gestion des creches, micro-creches et MAM. Securite, RGPD, communication parents, planning, temoignages et FAQ."}
        url={"https://lesfrimousses.com/about"}
        image={"https://lesfrimousses.com/imgs/LogoFrimousse.webp"}
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'A propos', url: 'https://lesfrimousses.com/about' }]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Pourquoi utiliser une application pour la gestion de la garde d’enfants ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Une application comme Frimousse permet de centraliser toutes les informations, d’automatiser les tâches administratives, d’assurer la sécurité des données et de faciliter la communication entre intervenants et familles."
                }
              },
              {
                "@type": "Question",
                "name": "Comment Frimousse garantit-elle la sécurité et la confidentialité des données ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Frimousse respecte strictement le RGPD, utilise des serveurs sécurisés, des accès personnalisés et des sauvegardes régulières pour garantir la confidentialité et l’intégrité des données."
                }
              },
              {
                "@type": "Question",
                "name": "Quels bénéfices pour les familles et les intervenants ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Les familles bénéficient d’une communication fluide, d’un accès à l’historique, aux documents et aux notifications. Les intervenants gagnent du temps, organisent mieux les plannings et assurent un suivi optimal des enfants."
                }
              },
              {
                "@type": "Question",
                "name": "Frimousse est-elle adaptée à tous types de structures ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Oui, Frimousse s’adresse aux crèches associatives, micro-crèches, MAM, garderies, centres de loisirs, et toute structure d’accueil collectif ou familial." 
                }
              },
              {
                "@type": "Question",
                "name": "Quels sont les avantages concrets de Frimousse ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Gain de temps, réduction des erreurs, meilleure organisation, sécurité, conformité RGPD, accès multi-utilisateurs, support réactif, et évolutivité selon les besoins de l’association."
                }
              }
            ]
          })
        }}
      />
      <PublicNavbar variant="dark" />

      {/* Hero section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
        <div className="absolute top-1/4 -left-32 w-[400px] h-[400px] bg-brand-400/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-[300px] h-[300px] bg-brand-300/15 rounded-full blur-[100px]" />
        <div className="absolute top-20 right-1/4 w-60 h-60 bg-cream-100/10 rounded-full blur-[80px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative z-10 max-w-3xl mx-auto text-center px-6 pt-24 pb-16 md:pt-32 md:pb-24">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-6 animate-scale-in">
            À propos de Frimousse
          </h1>
          <p className="text-lg md:text-xl text-white max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-in">
            Frimousse simplifie la gestion des associations de garde d’enfants, pour un accueil de qualité, sécurisé et humain.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-white text-brand-700 px-6 py-3 rounded-2xl font-bold text-base shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5"
            aria-label="Retour à l'accueil"
          >
            ← Retour à l'accueil
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 80V40C240 10 480 0 720 15C960 30 1200 60 1440 40V80H0Z" fill="white"/></svg>
        </div>
      </section>

      {/* Avantages section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Avantages</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Pourquoi choisir Frimousse&nbsp;?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[{
              title: 'Centralisation',
              desc: 'Dossiers enfants, infos médicales, autorisations et documents réunis au même endroit.',
              iconColor: 'bg-blue-50 text-blue-500',
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>)
            },{
              title: 'Organisation',
              desc: 'Plannings, présences, activités et événements gérés simplement.',
              iconColor: 'bg-amber-50 text-amber-500',
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>)
            },{
              title: 'Communication',
              desc: 'Notifications, rappels, actualités et échanges avec les familles.',
              iconColor: 'bg-violet-50 text-violet-500',
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg>)
            },{
              title: 'Sécurité & RGPD',
              desc: 'Accès sécurisés, sauvegardes, conformité RGPD et confidentialité garantie.',
              iconColor: 'bg-rose-50 text-rose-500',
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/></svg>)
            }].map((v, i) => (
              <div key={i} className="group p-8 rounded-3xl border border-gray-100 hover:border-brand-200 bg-white hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl ${v.iconColor} flex items-center justify-center mb-5`}>{v.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-500 leading-relaxed text-[15px]">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valeurs section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Nos valeurs</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Notre mission et impact social</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[{
              title: 'Accompagnement',
              desc: "Faciliter la gestion pour se concentrer sur l’épanouissement et la sécurité des enfants.",
              iconColor: 'bg-blue-50 text-blue-500',
              icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg>)
            },{
              title: 'Impact social',
              desc: "Inclusion, diversité et accès à un accueil de qualité pour tous.",
              iconColor: 'bg-emerald-50 text-emerald-500',
              icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.466.733-3.559"/></svg>)
            },{
              title: 'Innovation',
              desc: "Des outils simples, intuitifs et adaptés aux besoins réels du terrain.",
              iconColor: 'bg-violet-50 text-violet-500',
              icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/></svg>)
            },{
              title: 'Confiance',
              desc: "Plus qu'un logiciel, Frimousse c'est aussi un accompagnement humain, une équipe disponible et des ressources pour vous aider à chaque étape.",
              iconColor: 'bg-amber-50 text-amber-500',
              icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg>)
            }].map((v, i) => (
              <div key={i} className="bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:bg-white hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
                <div className={`w-12 h-12 rounded-2xl ${v.iconColor} flex items-center justify-center mb-5`}>{v.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{v.title}</h3>
                <p className="text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter variant="compact" />
    </div>
  );
}
