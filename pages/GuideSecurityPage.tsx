
import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useNavigate } from 'react-router-dom';

export default function GuideSecurityPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title={"Sécurité & RGPD | Guide Frimousse"}
        description={"Bonnes pratiques de sécurité et conformité RGPD sur Frimousse : gestion des accès, confidentialité, droits des utilisateurs."}
        url={"https://lesfrimousses.com/guide-securite"}
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
            Sécurité & RGPD
          </h1>
          <p className="text-lg md:text-xl text-white max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-in">
            Protéger les données des familles et garantir la conformité RGPD sont au cœur de Frimousse.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-white text-brand-700 px-6 py-3 rounded-2xl font-bold text-base shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5"
            aria-label="Retour"
          >
            ← Retour
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 80V40C240 10 480 0 720 15C960 30 1200 60 1440 40V80H0Z" fill="white"/></svg>
        </div>
      </section>

      {/* RGPD & sécurité section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Bonnes pratiques</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Comment Frimousse protège vos données&nbsp;?</h2>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-8 md:p-12 shadow-sm">
            <ol className="list-decimal list-inside text-gray-700 space-y-4 text-lg mb-6">
              <li>Accès personnalisé et sécurisé pour chaque utilisateur (mot de passe, rôle).</li>
              <li>Données stockées sur des serveurs sécurisés et régulièrement sauvegardées.</li>
              <li>Respect du RGPD : consentement parental, droit à l’oubli, transparence sur l’utilisation des données.</li>
              <li>Support réactif en cas de problème, via les paramètres du compte ou la politique de confidentialité.</li>
            </ol>
            <div className="mt-8 text-gray-600 text-base">La sécurité et la confidentialité sont une priorité pour Frimousse.</div>
          </div>
        </div>
      </section>

      {/* Valeurs section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Nos engagements</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Nos valeurs pour la sécurité</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[{
              title: 'Confidentialité',
              desc: "Vos données ne sont jamais revendues et restent strictement confidentielles.",
              iconColor: 'bg-rose-50 text-rose-500',
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/></svg>)
            },{
              title: 'Sécurité technique',
              desc: "Serveurs protégés, sauvegardes régulières et chiffrement des données sensibles.",
              iconColor: 'bg-blue-50 text-blue-500',
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>)
            },{
              title: 'Conformité RGPD',
              desc: "Consentement, droit à l’oubli, transparence et contrôle pour les familles.",
              iconColor: 'bg-emerald-50 text-emerald-500',
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>)
            },{
              title: 'Support humain',
              desc: "Une équipe réactive pour vous accompagner et répondre à toutes vos questions.",
              iconColor: 'bg-cyan-50 text-cyan-500',
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"/></svg>)
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
