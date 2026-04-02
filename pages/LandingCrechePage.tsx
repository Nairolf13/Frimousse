import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

export default function LandingCrechePage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title="Logiciel gestion crèche associative et garderie | Les Frimousses"
        description="Les Frimousses : logiciel de gestion pour crèches associatives et garderies. Planning, inscriptions, fiches enfants, communication parents, rapports et facturation. Essai gratuit, conforme RGPD."
        url="https://lesfrimousses.com/logiciel-creche"
        image="https://lesfrimousses.com/imgs/LogoFrimousse.webp"
        breadcrumbs={[
          { name: 'Accueil', url: 'https://lesfrimousses.com/' },
          { name: 'Logiciel crèche', url: 'https://lesfrimousses.com/logiciel-creche' },
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
            Logiciel crèche
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
            Logiciel de gestion pour
            <br />
            <span className="bg-gradient-to-r from-brand-200 via-brand-100 to-cream-100 bg-clip-text text-transparent">
              crèches associatives et garderies
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed">
            Simplifiez la gestion de votre crèche : inscriptions, planning des intervenants, suivi des enfants, communication avec les parents et rapports d'activité — tout centralisé, accessible partout.
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

      {/* ── Contexte crèche ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Crèche associative</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Un logiciel conçu pour la réalité du terrain</h2>
          </div>
          <div className="bg-gray-50 rounded-3xl border border-gray-100 p-8 md:p-12">
            <p className="text-gray-600 leading-relaxed mb-4">
              Gérer une <strong>crèche associative</strong> ou une <strong>garderie</strong> implique de jongler entre les inscriptions, les plannings d'une équipe d'intervenants, le suivi individuel de chaque enfant et la communication avec des dizaines de familles. Les outils génériques — tableur, email, cahier — ne sont plus adaptés.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Les Frimousses est le <strong>logiciel de gestion pour crèche</strong> qui centralise tout : dossiers enfants complets, planning des nounous et intervenants, fil d'actualité pour les parents, et génération automatique des rapports d'activité.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Conçu pour les <strong>crèches associatives, les crèches parentales et les garderies</strong>, notre application vous fait gagner plusieurs heures par semaine sur les tâches administratives, pour vous recentrer sur l'essentiel : l'accueil des enfants.
            </p>
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités crèche ── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Fonctionnalités</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Tout ce dont votre crèche a besoin</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Gestion des inscriptions',
                desc: "Dossiers d'inscription en ligne, liste d'attente, suivi des contrats d'accueil et gestion des places disponibles en temps réel.",
                color: 'bg-blue-50 text-blue-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>,
              },
              {
                title: 'Planning des intervenants',
                desc: "Calendrier hebdomadaire et mensuel pour toute l'équipe. Gestion des absences, remplacements et affectations par salle ou groupe d'enfants.",
                color: 'bg-emerald-50 text-emerald-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>,
              },
              {
                title: 'Fiches enfants & santé',
                desc: "Profils complets : informations médicales, allergies, régimes alimentaires, contacts d'urgence, autorisations parentales et ordonnances.",
                color: 'bg-amber-50 text-amber-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
              },
              {
                title: 'Communication parents',
                desc: "Fil d'actualité avec photos, messagerie intégrée, notifications push et partage de documents. Les familles restent connectées à la vie de la crèche.",
                color: 'bg-violet-50 text-violet-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>,
              },
              {
                title: 'Rapports et suivi d\'activité',
                desc: "Tableaux de bord clairs : taux de remplissage, présences quotidiennes, activités réalisées. Exports prêts pour vos rapports annuels.",
                color: 'bg-rose-50 text-rose-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>,
              },
              {
                title: 'Sécurité & conformité RGPD',
                desc: "Données des enfants et des familles protégées par chiffrement. Accès par rôle (directrice, éducatrice, parent). Hébergement en France.",
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

      {/* ── FAQ Crèche ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Questions fréquentes sur la gestion de crèche</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Quel logiciel pour gérer une crèche associative ?",
                a: "Les Frimousses est un logiciel de gestion crèche complet, pensé pour les crèches associatives et parentales. Il couvre les inscriptions, le planning des intervenants, le suivi des enfants, la communication avec les parents et les rapports d'activité. Essai gratuit sans engagement.",
              },
              {
                q: "Le logiciel convient-il aux crèches parentales ?",
                a: "Oui, Les Frimousses est parfaitement adapté aux crèches parentales. Les parents-bénévoles peuvent accéder à l'application selon les droits définis par le gestionnaire. La transparence et la communication sont au cœur de nos fonctionnalités.",
              },
              {
                q: "Peut-on gérer plusieurs groupes d'enfants dans la crèche ?",
                a: "Oui, l'application permet de créer plusieurs groupes (bébés, moyens, grands) et d'affecter les intervenants et enfants à chaque groupe. Les plannings et fiches sont filtrables par groupe.",
              },
              {
                q: "Les Frimousses est-il accessible sur smartphone ?",
                a: "Oui, Les Frimousses est une application web responsive, accessible depuis n'importe quel navigateur sur ordinateur, tablette et smartphone. Les éducatrices peuvent noter les présences et partager des photos directement depuis le terrain.",
              },
              {
                q: "Comment migrer depuis mon ancien logiciel de crèche ?",
                a: "Notre équipe vous accompagne lors de la migration. Les données existantes (enfants, familles, plannings) peuvent être importées. Un guide de démarrage et un support humain sont disponibles pour assurer une transition sans rupture.",
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
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Modernisez la gestion de votre crèche</h2>
          <p className="text-white/80 text-lg mb-8">Rejoignez les crèches et garderies qui font confiance aux Frimousses. Essai gratuit, sans carte bancaire.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="group bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3 justify-center">
              Démarrer gratuitement
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </a>
            <Link to="/fonctionnalites" className="text-white border-2 border-white/25 hover:border-white/50 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-white/10 text-center">
              Voir toutes les fonctionnalités
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
