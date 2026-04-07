import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useEffect, useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog';

        const API_URL = import.meta.env.VITE_API_URL || '';

        type Review = {
          id: string;
          authorName?: string | null;
          content: string;
          rating?: number | null;
          approved?: boolean | null;
          centerId?: string | null;
          createdAt: string;
        };

        

        export default function LandingPage() {
          const [childrenCount, setChildrenCount] = useState<number | null>(null);
          const [adminCount, setAdminCount] = useState<number | null>(null);
          const [reviews, setReviews] = useState<Review[]>([]);
          const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
          const [showReviewForm, setShowReviewForm] = useState(false);
          const [reviewName, setReviewName] = useState('');
          const [reviewEmail, setReviewEmail] = useState('');
          const [reviewRating, setReviewRating] = useState<number | null>(5);
          const [reviewContent, setReviewContent] = useState('');
          const [submittingReview, setSubmittingReview] = useState(false);
          const [reviewError, setReviewError] = useState<string | null>(null);
          const [sentModalOpen, setSentModalOpen] = useState(false);
          const [sentModalTitle, setSentModalTitle] = useState<string | undefined>(undefined);
          const [sentModalBody, setSentModalBody] = useState<string | undefined>(undefined);

          // helper to simplify JSX rendering and avoid inline IIFEs
          const currentReview = reviews.length > 0 ? reviews[currentReviewIndex % reviews.length] : null;

          useEffect(() => {
            const doFetches = async () => {
              try {
                const res = await fetch(`${API_URL}/public/stats`);
                const data = (await res.json()) as { structuresCount?: number; childrenCount?: number };
                setChildrenCount(typeof data.childrenCount === 'number' ? data.childrenCount : 0);
                setAdminCount(typeof data.structuresCount === 'number' ? data.structuresCount : 0);
              } catch {
                setChildrenCount(0);
                setAdminCount(0);
              }

              try {
                const res = await fetch(`${API_URL}/reviews?limit=6`);
                const data = (await res.json()) as { reviews?: Review[] };
                setReviews(Array.isArray(data.reviews) ? data.reviews : []);
              } catch {
                setReviews([]);
              }
            };

            // Defer non-critical API calls to idle time to shorten initial critical request chain
            type IdleHandle = number | null;
            let schedule: IdleHandle = null;

            if (typeof window.requestIdleCallback === 'function') {
              schedule = window.requestIdleCallback(() => { doFetches(); }) as number;
            } else {
              schedule = window.setTimeout(() => { doFetches(); }, 250) as unknown as number;
            }

            return () => {
              try {
                if (typeof schedule === 'number') {
                  // cancelIdleCallback exists in modern browsers; fall back to clearTimeout
                  if (typeof window.cancelIdleCallback === 'function') {
                    window.cancelIdleCallback(schedule);
                  } else {
                    window.clearTimeout(schedule);
                  }
                }
              } catch {
                // swallow — cleanup should not break unmount
              }
            };
          }, []);

          return (
          <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white">
            <SEO
              title={"Logiciel gestion crèche, MAM, micro-crèche | Les Frimousses"}
              description={"Les Frimousses : logiciel de gestion pour crèches, MAM et micro-crèches. Planning, fiches enfants, communication parents, facturation. Essai gratuit, conforme RGPD."}
              url={"https://lesfrimousses.com/"}
              image={"https://lesfrimousses.com/imgs/LogoFrimousse.webp"}
              tags={["application garde enfant", "logiciel creche", "gestion micro-creche", "application MAM", "planning creche", "communication parents creche", "logiciel petite enfance", "gestion assistante maternelle"]}
            />

            <PublicNavbar variant="dark" />

            {/* ── Hero ── */}
            <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
              {/* Decorative blobs */}
              <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px]" />
              <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-brand-300/15 rounded-full blur-[100px]" />
              <div className="absolute top-20 right-1/4 w-72 h-72 bg-cream-100/10 rounded-full blur-[80px]" />
              {/* Subtle grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

              <div className="relative z-10 max-w-5xl mx-auto text-center px-6 pt-32 pb-24 md:pt-40 md:pb-32">
                {/* Trust badge */}
                <div className="flex justify-center mb-8 animate-fade-in">
                  <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-full px-4 sm:px-5 py-2 border border-white/20 max-w-[90vw]">
                    <div className="w-2 h-2 flex-shrink-0 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs sm:text-sm font-medium text-white text-center leading-snug">
                      Plateforme de confiance pour{' '}
                      <span className="font-bold">{childrenCount !== null ? `+ de ${childrenCount}` : 'des dizaines de'} familles</span>
                    </span>
                  </div>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6 animate-scale-in">
                  Logiciel de gestion
                  <br />
                  <span className="bg-gradient-to-r from-brand-200 via-brand-100 to-cream-100 bg-clip-text text-transparent">crèche, MAM, micro-crèche</span>
                </h1>

                <p className="text-lg md:text-xl text-white max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in">
                  La plateforme pour crèches associatives, MAM et micro-crèches. Planning, fiches enfants, communication parents et facturation tout en un clic.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in">
                  <a href="/register" className="group bg-white !text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3 w-full sm:w-auto justify-center">
                    Essayer gratuitement
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
                  </a>
                  <a href="/tarifs" className="!text-[#ffffff] border-2 border-white/25 hover:border-white/50 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-white/10 w-full sm:w-auto text-center">
                    Voir les tarifs
                  </a>
                </div>

                {/* Social proof mini-stats */}
                <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-12 animate-fade-in">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-extrabold text-white">{childrenCount !== null ? childrenCount : '…'}</div>
                    <div className="text-white text-xs font-medium mt-1 uppercase tracking-wider">Familles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-extrabold text-white">{adminCount !== null ? adminCount : '…'}</div>
                    <div className="text-white text-xs font-medium mt-1 uppercase tracking-wider">Structures</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-extrabold text-white">99%</div>
                    <div className="text-white text-xs font-medium mt-1 uppercase tracking-wider">Satisfaction</div>
                  </div>
                </div>
              </div>

              {/* Bottom wave */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block"><path d="M0 120V60C240 15 480 0 720 25C960 50 1200 80 1440 50V120H0Z" fill="white"/></svg>
              </div>
            </section>

            {/* ── Features ── */}
            <section id="features" className="py-24 px-6 bg-white">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Fonctionnalités</span>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Pourquoi choisir Frimousse&nbsp;?</h2>
                  <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">Tout ce dont vous avez besoin pour gérer votre structure, dans une interface simple et intuitive.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>), title: 'Planning intelligent', desc: 'Interface calendrier intuitive pour gérer les présences, suivre les plannings et organiser les activités facilement.', color: 'bg-blue-50 text-blue-500' },
                    { icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>), title: 'Fiches enfants', desc: "Profils complets avec infos médicales, contacts d'urgence, autorisations parentales et allergies.", color: 'bg-amber-50 text-amber-500' },
                    { icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg>), title: 'Gestion des intervenants', desc: 'Suivi des plannings, qualifications et affectations des professionnels pour une prise en charge optimale.', color: 'bg-emerald-50 text-emerald-500' },
                    { icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"/></svg>), title: 'Communication facilitée', desc: "Notifications, documents, actualités et échanges avec les familles pour une relation de confiance.", color: 'bg-violet-50 text-violet-500' },
                    { icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/></svg>), title: 'Sécurité & RGPD', desc: 'Données protégées, accès sécurisés, conformité RGPD et confidentialité garantie pour tous.', color: 'bg-rose-50 text-rose-500' },
                    { icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"/></svg>), title: 'Support humain', desc: "Une équipe réactive pour vous accompagner, former et répondre à toutes vos questions.", color: 'bg-cyan-50 text-cyan-500' },
                  ].map((f, i) => (
                    <div key={i} className="group p-6 md:p-8 rounded-3xl border border-gray-100 hover:border-brand-200 bg-white hover:shadow-xl hover:shadow-brand-100/50 transition-all duration-300 hover:-translate-y-1">
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

            {/* ── SEO‑rich content ── */}
            <section className="py-20 px-6 bg-gray-50">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Notre solution</span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Votre application de gestion d'enfant</h2>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 p-8 md:p-12 shadow-sm">
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Frimousse est une application de gestion d'enfant pensée pour les associations, crèches, micro-crèches, MAM et garderies. Notre logiciel de gestion pour crèche permet
                    d'automatiser les inscriptions, gérer les plannings, suivre les présences, tenir à jour les fiches enfants (dossier médical, autorisations, contacts), et faciliter
                    la communication entre parents et structures.
                  </p>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Que vous cherchiez une solution pour une crèche associative, une micro-crèche, une Maison d'Assistantes Maternelles (MAM) ou un réseau de garderies, Frimousse
                    offre des fonctionnalités complètes : application pour crèche, application pour MAM, gestion des réservations, facturation et export des données.
                  </p>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    Frimousse facilite aussi la mise en relation entre parents et crèches/MAM, la diffusion d'annonces et l'organisation d'ateliers. Nos outils aident à
                    professionnaliser la gestion des structures d'accueil et à renforcer la confiance entre les familles et le personnel.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      "Application de gestion d'enfant pour crèche et MAM",
                      "Gestion des inscriptions et des présences",
                      "Planning et affectation des intervenants",
                      "Mise en relation parent — crèche / parent — MAM",
                      "Fiches enfants, santé et autorisations",
                      "Conformité RGPD et sécurité des données",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="w-5 h-5 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Mission & Values ── */}
            <section className="py-24 px-6 bg-white">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                  <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Notre mission</span>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Chez Frimousse</h2>
                  <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">Nous croyons que chaque enfant mérite un accueil de qualité, dans un environnement sécurisé, stimulant et bienveillant.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { title: 'Accompagnement', desc: "Nous facilitons la gestion administrative et humaine pour que les équipes puissent se concentrer sur l'essentiel : l'épanouissement et la sécurité des enfants.", iconColor: 'bg-blue-50 text-blue-500', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg>) },
                    { title: 'Impact social', desc: "Inclusion, diversité et accès à un accueil de qualité pour tous. Nous accompagnons les structures dans leur développement et leur transformation digitale.", iconColor: 'bg-emerald-50 text-emerald-500', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.466.733-3.559"/></svg>) },
                    { title: 'Innovation', desc: "Des outils simples, intuitifs et adaptés aux besoins réels du terrain. Notre équipe est à l'écoute de vos retours pour faire évoluer la plateforme.", iconColor: 'bg-violet-50 text-violet-500', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/></svg>) },
                    { title: 'Confiance', desc: "Plus qu'un logiciel, Frimousse c'est aussi un accompagnement humain, une équipe disponible et des ressources pour vous aider à chaque étape.", iconColor: 'bg-amber-50 text-amber-500', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg>) },
                  ].map((v, i) => (
                    <div key={i} className="bg-gray-50 rounded-3xl p-6 md:p-8 border border-gray-100 hover:bg-white hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`w-12 h-12 flex-shrink-0 rounded-2xl ${v.iconColor} flex items-center justify-center`}>{v.icon}</div>
                        <h3 className="text-base md:text-xl font-bold text-gray-900">{v.title}</h3>
                      </div>
                      <p className="text-gray-500 leading-relaxed">{v.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Reviews ── */}
            <section className="py-24 px-6 bg-gray-50">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">Témoignages</span>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Les avis de nos utilisateurs</h2>
                  <p className="text-gray-500 mt-4 text-lg">{childrenCount ? `Plus de ${childrenCount} familles nous font confiance` : 'Des dizaines de familles nous font confiance'}</p>

                  {/* Review stats */}
                  <div className="mt-8 inline-flex items-center gap-8 bg-white rounded-2xl px-8 py-4 border border-gray-100 shadow-sm">
                    {(() => {
                      const approved = reviews.filter(r => r.approved);
                      const ratings = approved.map(r => (typeof r.rating === 'number' ? r.rating : 0));
                      const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0) / ratings.length) : 0;
                      const avgRounded = Math.round(avg * 10) / 10;
                      const avgStr = ratings.length ? (Number.isInteger(avgRounded) ? String(Math.round(avgRounded)) : avgRounded.toFixed(1)) : '—';
                      const verifiedCount = approved.length;
                      const recommendPct = ratings.length ? Math.round((ratings.filter(r => r >= 4).length / ratings.length) * 100) : 0;
                      return (
                        <>
                          <div className="text-center">
                            <div className="text-2xl font-extrabold text-gray-900">{avgStr}<span className="text-gray-400">/5</span></div>
                            <div className="text-xs text-gray-400 font-medium mt-0.5">Note moyenne</div>
                          </div>
                          <div className="w-px h-8 bg-gray-200" />
                          <div className="text-center">
                            <div className="text-2xl font-extrabold text-gray-900">{verifiedCount}</div>
                            <div className="text-xs text-gray-400 font-medium mt-0.5">Avis vérifiés</div>
                          </div>
                          <div className="w-px h-8 bg-gray-200" />
                          <div className="text-center">
                            <div className="text-2xl font-extrabold text-gray-900">{recommendPct}%</div>
                            <div className="text-xs text-gray-400 font-medium mt-0.5">Recommandent</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Review carousel */}
                <div className="relative mt-8 max-w-3xl mx-auto">
                  { !currentReview ? (
                    <div className="text-gray-400 text-center py-16 bg-white rounded-3xl border border-gray-100">Aucun avis pour le moment.</div>
                  ) : (
                    <div className="relative px-8 md:px-12">
                      {/* Nav buttons — outside the card, in the px gutter */}
                      <button
                        aria-label="Précédent"
                        onClick={() => setCurrentReviewIndex(i => (reviews.length === 0 ? 0 : (i - 1 + reviews.length) % reviews.length))}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-400 hover:text-brand-500 hover:border-brand-200 transition-all hover:shadow-xl"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
                      </button>
                      <button
                        aria-label="Suivant"
                        onClick={() => setCurrentReviewIndex(i => (reviews.length === 0 ? 0 : (i + 1) % reviews.length))}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-400 hover:text-brand-500 hover:border-brand-200 transition-all hover:shadow-xl"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
                      </button>

                      <div key={currentReview!.id} className="transform transition duration-500 ease-in-out">
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-10 shadow-sm">

                          {/* Stars */}
                          <div className="flex gap-1 mb-6">
                            {[1,2,3,4,5].map(i => (
                              <svg key={i} className={`w-5 h-5 ${currentReview!.rating && currentReview!.rating >= i ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 20 20" fill={currentReview!.rating && currentReview!.rating >= i ? 'currentColor' : 'none'} stroke={currentReview!.rating && currentReview!.rating >= i ? 'none' : 'currentColor'} xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                              </svg>
                            ))}
                          </div>

                          {/* Quote */}
                          <blockquote className="text-gray-700 text-lg md:text-xl leading-relaxed mb-6 italic">
                            "{currentReview!.content}"
                          </blockquote>

                          {/* Author */}
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                              {(currentReview!.authorName || 'U').split(' ').map(s=>s[0]).slice(0,2).join('')}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{currentReview!.authorName || 'Anonyme'}</div>
                              <div className="text-sm text-gray-400">{new Date(currentReview!.createdAt).toLocaleDateString()} · <span className="text-emerald-500 font-medium">Avis vérifié</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) }

                  {/* Dots */}
                  <div className="mt-8 flex items-center justify-center gap-2.5">
                    {reviews.slice(0,5).map((_, idx) => (
                      <button key={idx} onClick={() => setCurrentReviewIndex(idx)} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentReviewIndex % Math.max(1, reviews.length) === idx ? 'bg-brand-500 w-8' : 'bg-gray-300 hover:bg-gray-400'}`} aria-label={`Aller à avis ${idx+1}`} />
                    ))}
                  </div>

                  {/* Leave review button */}
                  <div className="mt-8 flex items-center justify-center">
                    <button
                      className="inline-flex items-center gap-2.5 bg-brand-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-sm hover:bg-brand-600 hover:shadow-md transition-all"
                      onClick={() => setShowReviewForm(s => !s)}
                      aria-expanded={showReviewForm}
                    >
                      {showReviewForm ? 'Annuler' : 'Laisser un avis'}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>
                    </button>
                  </div>

                  {/* Desktop review form */}
                  {showReviewForm && (
                    <>
                      <div className="hidden md:block">
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setSubmittingReview(true);
                            setReviewError(null);
                            try {
                              const payload = { authorName: reviewName || null, email: reviewEmail, content: reviewContent, rating: reviewRating, centerId: null };
                              const res = await fetch(`${API_URL}/reviews`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data?.message || "Erreur lors de l'envoi");
                              const created: Review | undefined = data?.review;
                              if (created) {
                                if (created.approved) {
                                  setReviews(prev => [created, ...prev]);
                                  setSentModalTitle('Merci !');
                                  setSentModalBody('Votre avis a bien été publié. Merci pour votre retour !');
                                } else {
                                  setSentModalTitle('Merci !');
                                  setSentModalBody('Votre avis a bien été envoyé. Il sera publié dans les prochains jours.');
                                }
                                setSentModalOpen(true);
                              } else {
                                setReviewError('Réponse inattendue du serveur.');
                              }
                              setShowReviewForm(false);
                              setReviewName('');
                              setReviewEmail('');
                              setReviewRating(5);
                              setReviewContent('');
                            } catch (err: unknown) {
                              const maybeObj = err as Record<string, unknown> | undefined;
                              const message = maybeObj && typeof maybeObj.message === 'string' ? maybeObj.message : String(err ?? '');
                              setReviewError(message || 'Erreur serveur');
                            } finally {
                              setSubmittingReview(false);
                            }
                          }}
                          className="mt-8 mx-auto w-full max-w-3xl bg-white rounded-3xl border border-gray-100 p-8 shadow-sm"
                        >
                          <div className="flex flex-col gap-5">
                            <div className="flex flex-col md:flex-row md:items-start md:gap-6">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Nom</label>
                                <input
                                  className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all"
                                  value={reviewName}
                                  onChange={e => setReviewName(e.target.value)}
                                  placeholder="Votre prénom"
                                  aria-label="Nom"
                                />
                              </div>
                              <div className="flex-1 mt-3 md:mt-0">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email</label>
                                <input
                                  type="email"
                                  required
                                  className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all"
                                  value={reviewEmail}
                                  onChange={e => setReviewEmail(e.target.value)}
                                  placeholder="votre@email.com"
                                  aria-label="Email"
                                />
                                <p className="text-xs text-gray-400 mt-1">🔒 Votre email ne sera pas visible sur l'avis, uniquement votre nom.</p>
                              </div>

                              <div className="mt-3 md:mt-0 md:w-48">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Note</label>
                                <div className="flex items-center gap-2">
                                  {[1,2,3,4,5].map(i => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setReviewRating(i)}
                                      aria-label={`Donner ${i} étoiles`}
                                      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl transition ${reviewRating && reviewRating >= i ? 'bg-yellow-50 text-yellow-400 shadow-inner' : 'bg-gray-50 text-gray-300 hover:text-yellow-300 hover:bg-yellow-50'}`}
                                    >
                                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z"/></svg>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Commentaire</label>
                              <textarea
                                className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-3 text-sm min-h-[110px] placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all"
                                value={reviewContent}
                                onChange={e => setReviewContent(e.target.value)}
                                placeholder="Racontez votre expérience"
                                rows={4}
                                aria-label="Commentaire"
                              />
                            </div>

                            {reviewError && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{reviewError}</div>}

                            <div className="flex items-center justify-end gap-3">
                              <button type="button" onClick={() => setShowReviewForm(false)} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 font-medium transition-colors">Annuler</button>
                              <button disabled={submittingReview} type="submit" className={`px-5 py-2.5 ${submittingReview ? 'opacity-60 cursor-wait' : ''} bg-brand-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-brand-600 transition-all`}>
                                {submittingReview ? 'Envoi...' : 'Envoyer'}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>

                      {/* Mobile bottom-sheet form */}
                      <div className="md:hidden">
                        <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm">
                          <div className="w-full max-h-[90vh] bg-white rounded-t-3xl p-5 overflow-auto shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                              <div className="text-lg font-bold text-gray-900">Laisser un avis</div>
                              <button type="button" aria-label="Fermer" className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors" onClick={() => setShowReviewForm(false)}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                              </button>
                            </div>
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setSubmittingReview(true);
                                setReviewError(null);
                                try {
                                  const payload = { authorName: reviewName || null, email: reviewEmail, content: reviewContent, rating: reviewRating, centerId: null };
                                  const res = await fetch(`${API_URL}/reviews`, {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data?.message || "Erreur lors de l'envoi");
                                  const created: Review | undefined = data?.review;
                                  if (created) {
                                    if (created.approved) {
                                      setReviews(prev => [created, ...prev]);
                                      setSentModalTitle('Merci !');
                                      setSentModalBody('Votre avis a bien été publié. Merci pour votre retour !');
                                    } else {
                                      setSentModalTitle('Merci !');
                                      setSentModalBody('Votre avis a bien été envoyé. Il sera publié dans les prochains jours.');
                                    }
                                    setSentModalOpen(true);
                                  } else {
                                    setReviewError('Réponse inattendue du serveur.');
                                  }
                                  setShowReviewForm(false);
                                  setReviewName('');
                                  setReviewEmail('');
                                  setReviewRating(5);
                                  setReviewContent('');
                                } catch (err: unknown) {
                                  const maybeObj = err as Record<string, unknown> | undefined;
                                  const message = maybeObj && typeof maybeObj.message === 'string' ? maybeObj.message : String(err ?? '');
                                  setReviewError(message || 'Erreur serveur');
                                } finally {
                                  setSubmittingReview(false);
                                }
                              }}
                              className="flex flex-col gap-4"
                            >
                              <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Nom</label>
                                <input
                                  className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all"
                                  value={reviewName}
                                  onChange={e => setReviewName(e.target.value)}
                                  placeholder="Votre prénom"
                                  aria-label="Nom"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email</label>
                                <input
                                  type="email"
                                  required
                                  className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all"
                                  value={reviewEmail}
                                  onChange={e => setReviewEmail(e.target.value)}
                                  placeholder="votre@email.com"
                                  aria-label="Email"
                                />
                                <p className="text-xs text-gray-400 mt-1">🔒 Votre email ne sera pas visible .</p>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Note</label>
                                <div className="flex items-center gap-2">
                                  {[1,2,3,4,5].map(i => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setReviewRating(i)}
                                      aria-label={`Donner ${i} étoiles`}
                                      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl transition ${reviewRating && reviewRating >= i ? 'bg-yellow-50 text-yellow-400 shadow-inner' : 'bg-gray-50 text-gray-300 hover:text-yellow-300 hover:bg-yellow-50'}`}
                                    >
                                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z"/></svg>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Commentaire</label>
                                <textarea
                                  className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-3 text-sm min-h-[110px] placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all"
                                  value={reviewContent}
                                  onChange={e => setReviewContent(e.target.value)}
                                  placeholder="Racontez votre expérience"
                                  rows={4}
                                  aria-label="Commentaire"
                                />
                              </div>

                              {reviewError && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{reviewError}</div>}

                              <div className="flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setShowReviewForm(false)} className="px-5 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 font-medium transition-colors">Annuler</button>
                                <button disabled={submittingReview} type="submit" className={`px-5 py-2.5 ${submittingReview ? 'opacity-60 cursor-wait' : ''} bg-brand-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-brand-600 transition-all`}>
                                  {submittingReview ? 'Envoi...' : 'Envoyer'}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <ConfirmDialog
                    open={sentModalOpen}
                    title={sentModalTitle}
                    body={sentModalBody}
                    confirmLabel="OK"
                    cancelLabel=""
                    variant="success"
                    onCancel={() => setSentModalOpen(false)}
                    onConfirm={async () => { setSentModalOpen(false); }}
                  />
                </div>
              </div>
            </section>

            {/* ── FAQ (AEO - Answer Engine Optimization) ── */}
            <section id="faq" className="py-24 px-6 bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                  <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full mb-4">FAQ</span>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Questions fréquentes</h2>
                  <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">Tout ce que vous devez savoir sur Frimousse, l'application de gestion pour crèches et MAM.</p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      q: "Quelle est la meilleure application de gestion pour crèche ?",
                      a: "Frimousse est une application complète de gestion pour crèches, micro-crèches et MAM. Elle permet de gérer les plannings, les fiches enfants avec informations médicales, la communication avec les parents, les rapports d'activité et la facturation. Essai gratuit de 7 jours sans engagement."
                    },
                    {
                      q: "Comment gérer une micro-crèche avec un logiciel ?",
                      a: "Avec Frimousse, vous pouvez gérer votre micro-crèche de A à Z : inscriptions des enfants, plannings des intervenants, suivi des présences, communication avec les familles, génération de rapports et facturation automatisée. L'interface est simple et intuitive, conçue pour le terrain."
                    },
                    {
                      q: "Frimousse est-il conforme au RGPD ?",
                      a: "Oui, Frimousse est entièrement conforme au RGPD. Les données sont chiffrées, les accès sont sécurisés par authentification JWT, et toutes les informations personnelles des enfants et des familles sont protégées conformément à la réglementation européenne."
                    },
                    {
                      q: "Combien coûte un logiciel de gestion de crèche ?",
                      a: "Frimousse propose un essai gratuit de 15 jours, puis des formules à partir de 29,99 € par mois pour le plan Essentiel (jusqu'à 10 enfants) et 59,99 € par mois pour le plan Pro (illimité). Sans engagement, résiliable à tout moment."
                    },
                    {
                      q: "Quelle application pour une MAM (Maison d'Assistantes Maternelles) ?",
                      a: "Frimousse est spécialement conçu pour les MAM. L'application permet de gérer les plannings de chaque assistante maternelle, suivre les enfants, communiquer avec les parents et générer les rapports nécessaires. Interface mobile-first pour une utilisation au quotidien."
                    },
                    {
                      q: "Comment faciliter la communication entre parents et crèche ?",
                      a: "Frimousse intègre un fil d'actualité avec photos, des notifications push, un système de rapports quotidiens et une messagerie intégrée. Les parents peuvent suivre les activités de leur enfant en temps réel depuis l'application."
                    },
                    {
                      q: "Peut-on essayer Frimousse gratuitement ?",
                      a: "Oui ! Frimousse offre un essai gratuit de 15 jours avec accès à toutes les fonctionnalités. Aucune carte bancaire n'est requise. Vous pouvez créer votre compte et commencer à utiliser l'application immédiatement."
                    },
                    {
                      q: "Frimousse fonctionne-t-il sur mobile ?",
                      a: "Oui, Frimousse est une application web progressive (PWA) qui fonctionne sur tous les appareils : smartphone, tablette et ordinateur. Vous pouvez l'installer sur votre écran d'accueil comme une application native, sans passer par les stores."
                    },
                  ].map((item, i) => (
                    <details key={i} className="group bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                      <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-left font-semibold text-gray-900 hover:bg-gray-100 transition-colors">
                        <span>{item.q}</span>
                        <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
                      </summary>
                      <div className="px-6 pb-5 text-gray-600 leading-relaxed">{item.a}</div>
                    </details>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="py-24 px-6 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 relative overflow-hidden">
              <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-brand-400/20 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-brand-300/15 rounded-full blur-[80px]" />
              <div className="max-w-3xl mx-auto text-center relative z-10">
                <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-6">Prêt à simplifier votre gestion&nbsp;?</h2>
                <p className="text-white text-lg mb-10 max-w-xl mx-auto leading-relaxed">Rejoignez des dizaines d'associations et de familles déjà convaincues. Inscription rapide, sans engagement.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <a href="/register" className="group bg-white !text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-3">
                    Créer mon compte gratuit
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
                  </a>
                  <a href="/tarifs" className="!text-[#ffffff] border-2 border-white/25 hover:border-white/50 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-white/10">
                    Découvrir les tarifs
                  </a>
                </div>
              </div>
            </section>

            <PublicFooter variant="full" />
          </div>
          );
        }
