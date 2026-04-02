import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

export default function LandingMicroCrechePage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title="Logiciel gestion micro-crèche — Application complète | Les Frimousses"
        description="Les Frimousses : logiciel de gestion micro-crèche tout-en-un. Planning, fiches enfants, communication parents, facturation et conformité RGPD. Conçu pour les petites structures. Essai gratuit."
        url="https://lesfrimousses.com/logiciel-micro-creche"
        image="https://lesfrimousses.com/imgs/LogoFrimousse.webp"
        breadcrumbs={[
          { name: 'Accueil', url: 'https://lesfrimousses.com/' },
          { name: 'Logiciel micro-crèche', url: 'https://lesfrimousses.com/logiciel-micro-creche' },
        ]}
      />
      <PublicNavbar variant="dark" />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-brand-300/15 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-white/15 px-4 py-1.5 rounded-full mb-6 border border-white/20">
            Logiciel micro-crèche
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
            Logiciel de gestion pour
            <br />
            <span className="bg-gradient-to-r from-brand-200 via-brand-100 to-cream-100 bg-clip-text text-transparent">
              micro-crèche
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed">
            L'outil pensé pour les petites structures : simple à prendre en main, complet sur les fonctionnalités essentielles, abordable. Planning, enfants, parents, rapports — tout en un.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="group bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3 justify-center">
              Essai gratuit
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </a>
            <a href="/tarifs" className="text-white border-2 border-white/25 hover:border-white/50 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-white/10 text-center">
              Voir les tarifs
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 120V60C240 15 480 0 720 25C960 50 1200 80 1440 50V120H0Z" fill="white" /></svg>
        </div>
      </section>

      {/* ── Contexte micro-crèche ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Micro-crèche</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Pourquoi un logiciel dédié à la micro-crèche ?</h2>
          </div>
          <div className="bg-gray-50 rounded-3xl border border-gray-100 p-8 md:p-12">
            <p className="text-gray-600 leading-relaxed mb-4">
              Une <strong>micro-crèche</strong> accueille jusqu'à 12 enfants et fonctionne avec une petite équipe. Les logiciels conçus pour les grandes crèches sont souvent trop complexes et trop coûteux. Les Frimousses est calibré pour les <strong>petites structures d'accueil</strong> : simple à utiliser, rapide à mettre en place, et tarifé en conséquence.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Avec notre <strong>application de gestion micro-crèche</strong>, plus besoin de jongler entre un cahier de présences, un tableur Excel pour la facturation et des emails pour contacter les parents. Tout est centralisé dans un seul outil, accessible depuis n'importe quel appareil.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Les Frimousses répond aux exigences réglementaires des micro-crèches : <strong>conformité RGPD</strong>, traçabilité des présences, gestion des dossiers médicaux et communication sécurisée avec les familles.
            </p>
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités micro-crèche ── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Fonctionnalités</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">L'essentiel pour votre micro-crèche</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Suivi des présences',
                desc: "Pointage des arrivées et départs, calcul automatique des heures de garde, historique des présences consultable à tout moment.",
                color: 'bg-blue-50 text-blue-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>,
              },
              {
                title: 'Fiches enfants',
                desc: "Dossiers complets : informations médicales, allergies, autorisations, contacts d'urgence. Tout accessible en un clic, même depuis le smartphone.",
                color: 'bg-amber-50 text-amber-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
              },
              {
                title: 'Communication parents',
                desc: "Photos, messages et actualités de la journée partagés directement avec les familles via l'application. Zéro groupe WhatsApp non sécurisé.",
                color: 'bg-violet-50 text-violet-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>,
              },
              {
                title: 'Rapports mensuels',
                desc: "Export automatique des rapports d'activité mensuel : heures de garde, présences, activités. Gain de temps considérable en fin de mois.",
                color: 'bg-emerald-50 text-emerald-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>,
              },
              {
                title: 'Planning simplifié',
                desc: "Vue hebdomadaire claire de l'accueil. Qui garde quel enfant, à quel horaire. Modifiable en quelques secondes depuis le téléphone.",
                color: 'bg-rose-50 text-rose-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>,
              },
              {
                title: 'Conforme RGPD',
                desc: "Données chiffrées, accès sécurisés, consentements tracés. Respectez vos obligations légales sans effort supplémentaire.",
                color: 'bg-cyan-50 text-cyan-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>,
              },
            ].map((f, i) => (
              <div key={i} className="group p-6 rounded-3xl border border-gray-100 hover:border-brand-200 bg-white hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`w-12 h-12 flex-shrink-0 rounded-2xl ${f.color} flex items-center justify-center`}>{f.icon}</div>
                  <h3 className="text-base md:text-lg font-bold text-gray-900">{f.title}</h3>
                </div>
                <p className="text-gray-500 leading-relaxed text-[15px]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ micro-crèche ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Questions fréquentes sur la gestion de micro-crèche</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Quel logiciel pour gérer une micro-crèche ?",
                a: "Les Frimousses est un logiciel de gestion micro-crèche conçu pour les petites structures jusqu'à 12 enfants. Il couvre le planning, les fiches enfants, la communication avec les parents et les rapports d'activité. Simple à prendre en main, accessible sur tous les appareils.",
              },
              {
                q: "Combien coûte un logiciel de gestion pour micro-crèche ?",
                a: "Les Frimousses propose un essai gratuit sans engagement. L'abonnement pour les petites structures (micro-crèches) démarre à partir de 29,99 €/mois. Consultez notre page tarifs pour les détails.",
              },
              {
                q: "Le logiciel fonctionne-t-il sans connexion internet ?",
                a: "Les Frimousses est une application web qui nécessite une connexion internet. Cependant, certaines données sont mises en cache pour fonctionner en mode hors ligne partiel. Une connexion même basique (4G) suffit pour une utilisation normale.",
              },
              {
                q: "Peut-on utiliser Les Frimousses sur tablette ?",
                a: "Oui, Les Frimousses est optimisé pour tablette et smartphone. L'interface s'adapte automatiquement à la taille de l'écran. Idéal pour une utilisation en salle d'accueil avec une tablette affichant le planning du jour.",
              },
              {
                q: "Comment Les Frimousses aide pour la facturation de la micro-crèche ?",
                a: "L'application trace automatiquement les heures de présence de chaque enfant. En fin de mois, vous exportez les données pour calculer les factures familles et préparer vos déclarations auprès de la CAF et des organismes de financement.",
              },
            ].map((item, i) => (
              <details key={i} className="group bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer font-semibold text-gray-900 list-none">
                  {item.q}
                  <svg className="w-5 h-5 text-brand-500 flex-shrink-0 ml-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Testez gratuitement pour votre micro-crèche</h2>
          <p className="text-white/80 text-lg mb-8">Sans engagement, sans carte bancaire. Prise en main en moins de 10 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="group bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3 justify-center">
              Démarrer gratuitement
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </a>
            <Link to="/tarifs" className="text-white border-2 border-white/25 hover:border-white/50 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-white/10 text-center">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
