import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { Link } from 'react-router-dom';

export default function LandingMAMPage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
      <SEO
        title="Logiciel gestion MAM — Maison d'Assistantes Maternelles | Les Frimousses"
        description="Les Frimousses : logiciel de gestion MAM complet. Planning des assistantes maternelles, fiches enfants, communication parents, rapports d'activité et facturation. Essai gratuit, conforme RGPD."
        url="https://lesfrimousses.com/logiciel-mam"
        image="https://lesfrimousses.com/imgs/LogoFrimousse.webp"
        breadcrumbs={[
          { name: 'Accueil', url: 'https://lesfrimousses.com/' },
          { name: 'Logiciel MAM', url: 'https://lesfrimousses.com/logiciel-mam' },
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
            Logiciel MAM
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
            Logiciel de gestion pour
            <br />
            <span className="bg-gradient-to-r from-brand-200 via-brand-100 to-cream-100 bg-clip-text text-transparent">
              Maison d'Assistantes Maternelles
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed">
            Gérez votre MAM simplement : planning de chaque assistante maternelle, suivi des enfants, communication avec les parents et rapports d'activité — tout en un seul outil.
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

      {/* ── Qu'est-ce qu'une MAM ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">MAM</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Pourquoi un logiciel dédié à la MAM ?</h2>
          </div>
          <div className="bg-gray-50 rounded-3xl border border-gray-100 p-8 md:p-12">
            <p className="text-gray-600 leading-relaxed mb-4">
              Une <strong>Maison d'Assistantes Maternelles (MAM)</strong> regroupe plusieurs assistantes maternelles qui exercent ensemble dans un local commun. Chaque professionnelle garde ses propres enfants et contrats, mais le planning, les présences et la communication doivent être coordonnés.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Les Frimousses est le <strong>logiciel de gestion MAM</strong> pensé pour ce fonctionnement particulier : chaque assistante maternelle a son propre espace, ses propres plannings et fiches enfants, tout en partageant la structure commune.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Contrairement à un simple tableur Excel ou un agenda partagé, notre application MAM centralise toutes les informations, automatise les rapports d'activité et facilite la communication avec les familles — en toute conformité RGPD.
            </p>
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités MAM ── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Fonctionnalités</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Ce que Les Frimousses fait pour votre MAM</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Planning par assistante maternelle',
                desc: "Chaque assistante maternelle gère son propre planning d'accueil. Vue hebdomadaire et mensuelle, gestion des absences et remplacements.",
                color: 'bg-blue-50 text-blue-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>,
              },
              {
                title: 'Fiches enfants complètes',
                desc: "Dossier médical, allergies, contacts d'urgence, autorisations parentales et documents administratifs pour chaque enfant accueilli.",
                color: 'bg-amber-50 text-amber-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
              },
              {
                title: 'Communication parents',
                desc: "Fil d'actualité avec photos, messages, notifications push. Les parents suivent les activités de leur enfant en temps réel.",
                color: 'bg-violet-50 text-violet-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>,
              },
              {
                title: 'Rapports d\'activité automatisés',
                desc: "Génération automatique des rapports hebdomadaires et mensuels : heures de garde, présences, repas et activités réalisées.",
                color: 'bg-emerald-50 text-emerald-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>,
              },
              {
                title: 'Facturation simplifiée',
                desc: "Suivi des heures facturables, export des données pour la CAF et la PMI. Gain de temps considérable en fin de mois.",
                color: 'bg-rose-50 text-rose-500',
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>,
              },
              {
                title: 'Conformité RGPD & sécurité',
                desc: "Données des enfants et des familles protégées et chiffrées. Accès sécurisé par rôle. Conforme aux exigences de la PMI et de la CAF.",
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

      {/* ── FAQ MAM ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Questions fréquentes sur la gestion MAM</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Quel logiciel pour gérer une MAM ?",
                a: "Les Frimousses est spécialement conçu pour les Maisons d'Assistantes Maternelles. Il permet à chaque assistante maternelle de gérer son planning et ses enfants de façon indépendante, tout en partageant la structure commune. L'application est accessible sur ordinateur, tablette et smartphone.",
              },
              {
                q: "Le logiciel est-il adapté à plusieurs assistantes maternelles ?",
                a: "Oui, Les Frimousses gère le multi-utilisateurs nativement. Chaque assistante maternelle a son propre accès, ses propres fiches enfants et son planning. La responsable de la MAM dispose d'une vue d'ensemble sur toute la structure.",
              },
              {
                q: "Les Frimousses génère-t-il les rapports pour la PMI ?",
                a: "Les Frimousses génère automatiquement les rapports d'activité mensuels avec les données de présence, heures de garde et activités. Ces exports facilitent les déclarations auprès de la PMI et de la CAF.",
              },
              {
                q: "Faut-il être informaticien pour utiliser ce logiciel MAM ?",
                a: "Non. Les Frimousses est conçu pour être utilisé au quotidien sans formation technique. L'interface est intuitive, mobile-first, et notre équipe vous accompagne lors de la prise en main.",
              },
              {
                q: "Quel est le prix du logiciel pour une MAM ?",
                a: "Les Frimousses propose un essai gratuit sans engagement. Les tarifs démarrent à partir de 29,99 €/mois pour les petites structures. Consultez notre page tarifs pour le détail des offres adaptées aux MAM.",
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
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Prêt à moderniser votre MAM ?</h2>
          <p className="text-white/80 text-lg mb-8">Rejoignez les MAM qui font confiance aux Frimousses. Essai gratuit, sans carte bancaire.</p>
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
