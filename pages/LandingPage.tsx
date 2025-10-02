import SEO from '../components/SEO';
import { useEffect, useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog';

        const API_URL = import.meta.env.VITE_API_URL || '';

        type User = {
          id: string;
          role: string;
        };

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
                const res = await fetch(`${API_URL}/children/count`);
                const data = (await res.json()) as { count?: number };
                setChildrenCount(typeof data.count === 'number' ? data.count : 0);
              } catch {
                setChildrenCount(0);
              }

              try {
                const res = await fetch(`${API_URL}/user/all`, { credentials: 'include' });
                const data = await res.json();
                if (Array.isArray(data)) {
                  const users = data as User[];
                  setAdminCount(users.filter(u => u.role === 'admin').length);
                } else if (Array.isArray((data && data.users))) {
                  const users = data.users as User[];
                  setAdminCount(users.filter(u => u.role === 'admin').length);
                } else {
                  setAdminCount(0);
                }
              } catch {
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
          <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0 relative pb-16 sm:pb-0">
                  <SEO
                    title={"Frimousse — Logiciel de gestion pour crèches et MAM"}
                    description={"Frimousse aide les crèches, micro-crèches et MAM à gérer inscriptions, plannings, fiches enfants et communication parent-crèche. Essai gratuit et conformité RGPD."}
                    url={"https://lesfrimousses.com/"}
                    image={"https://lesfrimousses.com/frimousse-cover.png"}
                  />

              <section className="w-full bg-gradient-to-br from-[#a9ddf2] to-[#f7f4d7] pt-6 sm:pt-12 pb-20 px-4 flex flex-col items-center justify-center text-center">
                <header className="w-full sticky top-0 z-10">
                  <div className="max-w-7xl mx-auto relative flex items-start justify-between py-2 md:py-3 px-4">
                    <div className="flex items-center gap-3 w-full justify-start md:justify-start">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex items-center justify-center">
                        <img loading="lazy" src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
                      </div>
                      <div className="w-full text-center md:text-left">
                        <span className="hidden sm:inline-block font-extrabold text-xl text-[#0b5566]">Les Frimousses</span>
                      </div>
                    </div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:hidden pointer-events-none">
                      <span className="font-extrabold text-xl text-[#0b5566]">Les Frimousses</span>
                    </div>

                    <div className="hidden md:flex gap-2">
                      <a href="/register" className="bg-[#f7f4d7] border border-[#fcdcdf] text-[#0b5566] rounded px-3 py-1 font-semibold hover:bg-[#fcdcdf] transition text-sm">
                        Inscription
                      </a>
                      <a
                        href="/login"
                        className="bg-[#0b5566] !text-white rounded px-3 py-1 text-sm hover:opacity-95 transition"
                      >
                        Connexion
                      </a>
                    </div>
                  </div>
                </header>

                {/* Mobile-only pill login button removed from header/section; placed at root for true fixed positioning */}

                <h1 className="text-5xl md:text-6xl font-extrabold text-[#0b5566] mb-4 leading-tight drop-shadow-sm">
                  Simplifiez la gestion de votre association
                  <br className="hidden md:block" /> de garde d’enfants
                </h1>

                <p className="text-lg md:text-2xl text-[#08323a] mb-6 max-w-2xl mx-auto font-medium">
                  Plateforme tout-en-un pour crèches associatives, micro-crèches, MAM, garderies et centres de loisirs.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center items-center w-full">
                  <a
                    href="/register"
                    className="bg-[#0b5566] !text-white rounded-full px-8 py-4 font-bold text-lg shadow hover:opacity-95 transition w-full sm:w-auto"
                  >
                    Essayer gratuitement
                  </a>
                  <a
                    href="/tarifs"
                    className="bg-[#f7f4d7] border border-[#fcdcdf] text-[#0b5566] rounded-full px-8 py-4 font-bold text-lg shadow hover:bg-[#fcdcdf] transition w-full sm:w-auto"
                  >
                    Voir les tarifs
                  </a>
                  {/* Mobile-only Connexion button as third CTA to match size/spacing */}
                  <a
                    href="/login"
                    className="sm:hidden bg-[#0b5566] !text-white rounded-full px-8 py-4 font-bold text-lg shadow hover:scale-105 transition w-full text-center"
                    aria-label="Connexion"
                    title="Connexion"
                  >
                    Connexion
                  </a>
                </div>
              </section>

              <section className="w-full py-16 px-4 bg-gradient-to-r from-[#a9ddf2] to-[#f7f4d7]">
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-2xl md:text-3xl font-bold text-center text-[#0b5566] mb-10">Pourquoi choisir Frimousse&nbsp;?</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center text-center p-6 bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Planning intelligent</h3>
                      <p className="text-[#08323a]">Interface calendrier intuitive pour gérer les présences, suivre les plannings et organiser les activités facilement.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Fiches enfants</h3>
                      <p className="text-[#08323a]">Profils complets avec infos médicales, contacts d’urgence, autorisations parentales, allergies et notes personnalisées pour chaque enfant.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Gestion des intervenants</h3>
                      <p className="text-[#08323a]">Suivi des plannings, qualifications et affectations des professionnels pour une prise en charge optimale.</p>
                    </div>

                    <div className="flex flex-col items-center text-center bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Communication facilitée</h3>
                      <p className="text-[#08323a]">Notifications, documents, actualités et échanges avec les familles pour une relation de confiance.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Sécurité &amp; RGPD</h3>
                      <p className="text-[#08323a]">Données protégées, accès sécurisés, conformité RGPD et confidentialité garantie pour tous les utilisateurs.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Support humain</h3>
                      <p className="text-[#08323a]">Une équipe réactive pour vous accompagner, former et répondre à toutes vos questions.</p>
                    </div>
                  </div>

                  {/* SEO-rich block: include many target keywords in natural copy for better AEO/SEO */}
                  <div className="mt-12 bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8 mx-auto text-center max-w-3xl">
                    <h3 className="text-lg font-bold text-[#0b5566] mb-3">Les frimousses votre application de gestion d'enfant</h3>
                    <p className="text-[#08323a] mb-2">
                      Frimousse est une application de gestion d'enfant pensée pour les associations, crèches, micro-crèches, MAM et garderies. Notre logiciel de gestion pour crèche permet
                      d'automatiser les inscriptions, gérer les plannings, suivre les présences, tenir à jour les fiches enfants (dossier médical, autorisations, contacts), et faciliter
                      la communication entre parents et structures.
                    </p>
                    <p className="text-[#08323a] mb-2">
                      Que vous cherchiez une solution pour une crèche associative, une micro-crèche, une Maison d'Assistantes Maternelles (MAM) ou un réseau de garderies, Frimousse
                      offre des fonctionnalités complètes : application pour crèche, application pour MAM, gestion des réservations, facturation et export des données.
                    </p>
                    <p className="text-[#08323a]">
                      Frimousse facilite aussi la mise en relation entre parents et crèches/MAM, la diffusion d'annonces et l'organisation d'ateliers. Nos outils aident à
                      professionnaliser la gestion des structures d'accueil et à renforcer la confiance entre les familles et le personnel.
                    </p>
                    <ul className="mt-4 text-[#08323a] list-disc list-inside mx-auto text-center max-w-lg">
                      <li className="mx-auto">Application de gestion d'enfant pour crèche et MAM</li>
                      <li className="mx-auto">Gestion des inscriptions et des présences</li>
                      <li className="mx-auto">Planning et affectation des intervenants</li>
                      <li className="mx-auto">Mise en relation parent — crèche / parent — MAM</li>
                      <li className="mx-auto">Fiches enfants, santé et autorisations</li>
                      <li className="mx-auto">Conformité RGPD et sécurité des données</li>
                    </ul>

                  </div>

                  <div className="flex flex-wrap justify-center gap-12 text-center mt-8">
                    <div className="w-full flex flex-wrap justify-center gap-8 mt-8">
                      <div className="bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8 flex flex-col items-center min-w-[140px] border border-[#fcdcdf] hover:scale-105 transition-transform">
                        <span className="inline-block bg-[white] rounded-full shadow px-4 py-2 mb-2 text-[#0b5566] font-bold text-lg">{childrenCount !== null ? childrenCount : '...'}</span>
                        <span className="text-[#0b5566] font-semibold text-base">Familles<br />inscrites</span>
                      </div>

                      <div className="bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8 flex flex-col items-center min-w-[140px] border border-[#fcdcdf] hover:scale-105 transition-transform">
                        <span className="inline-block bg-white rounded-full shadow px-4 py-2 mb-2 text-[#0b5566] font-bold text-lg">{adminCount !== null ? adminCount : '...'}</span>
                        <span className="text-[#0b5566] font-semibold text-base">Associations <br />suivi</span>
                      </div>

                      <div className="bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8 flex flex-col items-center min-w-[140px] border border-[#fcdcdf] hover:scale-105 transition-transform">
                        <span className="inline-block bg-white rounded-full shadow px-4 py-2 mb-2 text-[#0b5566] font-bold text-lg">99%</span>
                        <span className="text-[#0b5566] font-semibold text-base">Utilisateur <br /> satisfait</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="w-full bg-gradient-to-r from-[#a9ddf2] to-[#f7f4d7] py-12 px-6">
                <div className="max-w-5xl mx-auto flex flex-col items-center">
                  <div className="w-full bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8 flex flex-col gap-8 items-center">
                    <div className="flex flex-col gap-6 items-center justify-center w-full">
                      <div className="text-[#08323a] text-lg leading-relaxed max-w-3xl mx-auto text-center">
                        <div className="text-2xl md:text-3xl font-extrabold text-[#0b5566] mb-3">Chez Frimousse</div>
                        <p className="m-0">
                          nous croyons que chaque enfant mérite un accueil de qualité, dans un environnement sécurisé, stimulant et bienveillant. Notre mission est
                          d’accompagner les associations, crèches et structures d’accueil dans leur engagement quotidien auprès des familles.
                        </p>
                      </div>

                      <div className="text-[#08323a] text-lg leading-relaxed max-w-3xl mx-auto text-center">
                        <p className="m-0">
                          Nous facilitons la gestion administrative et humaine pour que les équipes puissent se concentrer sur l’essentiel&nbsp;: l’épanouissement et la
                          sécurité des enfants. Notre plateforme permet de gagner du temps, de renforcer la confiance avec les familles et de garantir la conformité
                          réglementaire (RGPD, sécurité des données).
                        </p>
                      </div>

                      <div className="text-[#08323a] text-lg leading-relaxed max-w-3xl mx-auto text-center">
                        <div className="text-xl md:text-2xl font-extrabold text-[#0b5566] mb-2">Impact social</div>
                        <p className="m-0">
                          Inclusion, diversité et accès à un accueil de qualité pour tous. Nous accompagnons les structures dans leur développement, leur
                          professionnalisation et leur transformation digitale, tout en restant proches de leurs valeurs humaines.
                        </p>
                      </div>

                      <div className="text-[#08323a] text-lg leading-relaxed max-w-3xl mx-auto text-center">
                        <div className="text-xl md:text-2xl font-extrabold text-[#0b5566] mb-2">Innovation</div>
                        <p className="m-0">Des outils simples, intuitifs et adaptés aux besoins réels du terrain. Notre équipe est à l’écoute de vos retours pour faire évoluer la plateforme.</p>
                      </div>

                      <div className="text-[#08323a] text-lg leading-relaxed max-w-3xl mx-auto text-center">
                        <div className="text-xl md:text-2xl font-extrabold text-[#0b5566] mb-2">Accompagnement</div>
                        <p className="m-0">Plus qu’un logiciel, Frimousse c’est aussi un accompagnement humain, une équipe disponible et des ressources pour vous aider à chaque étape.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <br />
            {/* Dedicated Reviews (Avis) section placed before the footer - styled to match screenshot */}
          <section className="w-full py-16 px-6 bg-gradient-to-r from-[#a9ddf2] to-[#f7f4d7]">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-3" aria-hidden>
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} className="w-6 h-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                        </svg>
                      ))}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#0b5566]">Les avis de nos utilisateurs</h2>
                    <p className="text-sm text-gray-500 mt-2">{childrenCount ? `Plus de ${childrenCount} familles nous font confiance pour le bien-être de leurs enfants` : 'Des dizaines de familles nous font confiance pour le bien-être de leurs enfants'}</p>

                    <div className="mt-6 flex items-center justify-center gap-10">
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
                                  <div className="text-2xl font-extrabold text-[#0b5566]">{avgStr}/5</div>
                                  <div className="text-xs text-gray-400">Note moyenne</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-extrabold text-[#0b5566]">{verifiedCount}</div>
                                  <div className="text-xs text-gray-400">Avis vérifiés</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-extrabold text-[#0b5566]">{recommendPct}%</div>
                                  <div className="text-xs text-gray-400">Recommandent</div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                  </div>

                  <div className="relative mt-8 px-4 md:px-12">
                    {/* Left nav */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                      <button
                        aria-label="Précédent"
                        onClick={() => setCurrentReviewIndex(i => (reviews.length === 0 ? 0 : (i - 1 + reviews.length) % reviews.length))}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-gray-200 shadow-lg flex items-center justify-center text-2xl text-[#0b5566] hover:scale-105 transition-transform"
                      >
                        ‹
                      </button>
                    </div>

                    {/* Right nav */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
                      <button
                        aria-label="Suivant"
                        onClick={() => setCurrentReviewIndex(i => (reviews.length === 0 ? 0 : (i + 1) % reviews.length))}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-gray-200 shadow-lg flex items-center justify-center text-2xl text-[#0b5566] hover:scale-105 transition-transform"
                      >
                        ›
                      </button>
                    </div>

                    <div className="mx-auto w-full max-w-3xl">
                      { !currentReview ? (
                        <div className="text-gray-500 text-center py-12">Aucun avis pour le moment.</div>
                      ) : (
                        <div className="relative">
                          <div key={currentReview.id} className="transform transition duration-500 ease-in-out">
                            <div className="bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8">
                              <div className="flex items-start gap-5">
                                <div className="flex-shrink-0">
                                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0b5566] to-[#0b83a3] text-white flex items-center justify-center font-bold text-xl shadow-lg">{(currentReview.authorName || 'U').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="text-lg font-semibold text-[#08323a]">{currentReview.authorName || 'Anonyme'}</div>
                                      <div className="text-sm text-gray-400">{new Date(currentReview.createdAt).toLocaleDateString()}</div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center">
                                        {[1,2,3,4,5].map(i => (
                                          <svg key={i} className={`w-5 h-5 ${currentReview.rating && currentReview.rating >= i ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 20 20" fill={currentReview.rating && currentReview.rating >= i ? 'currentColor' : 'none'} stroke={currentReview.rating && currentReview.rating >= i ? 'none' : 'currentColor'} xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                                          </svg>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 text-[#08323a] text-base md:text-lg leading-relaxed"> 
                                    <svg className="w-8 h-8 text-[#0b5566] opacity-20 inline-block mr-2 -translate-y-1" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M7.17 6A5 5 0 0 1 12 3v6H6a1 1 0 0 0-1 1v4h2v-4a3 3 0 0 1 0-6H7.17zM17.17 6A5 5 0 0 1 22 3v6h-6a1 1 0 0 0-1 1v4h2v-4a3 3 0 0 1 0-6h.17z"/></svg>
                                    <span className="italic">{currentReview.content}</span>
                                  </div>

                                  <div className="mt-4 flex items-center justify-start">
                                    <span className="inline-flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded">✓ Avis vérifié</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) }
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-3">
                      {reviews.slice(0,5).map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentReviewIndex(idx)} className={`w-3 h-3 rounded-full ${currentReviewIndex % Math.max(1, reviews.length) === idx ? 'bg-[#0b5566] scale-110' : 'bg-gray-200'} transition-transform`} aria-label={`Aller à avis ${idx+1}`} />
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-center">
                      <button
                        className="mt-4 bg-gradient-to-r from-[#0b5566] to-[#0b83a3] text-white px-5 py-2 rounded-full font-semibold shadow-lg hover:opacity-95 transition inline-flex items-center gap-3"
                        onClick={() => setShowReviewForm(s => !s)}
                        aria-expanded={showReviewForm}
                      >
                        {showReviewForm ? 'Annuler' : 'Laisser un avis'}
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/><path d="M17 3l4 4-4 4"/></svg>
                      </button>
                    </div>

                    {showReviewForm && (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setSubmittingReview(true);
                          setReviewError(null);
                          try {
                            const payload = { authorName: reviewName || null, content: reviewContent, rating: reviewRating, centerId: null };
                            const res = await fetch(`${API_URL}/reviews`, {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data?.message || 'Erreur lors de l\'envoi');
                            const created: Review | undefined = data?.review;
                            if (created) {
                              // Do not display unapproved reviews publicly. Backend creates with approved=false by default.
                              if (created.approved) {
                                setReviews(prev => [created, ...prev]);
                                setSentModalTitle('Merci ');
                                setSentModalBody('Votre avis a bien été publié. Merci pour votre retour !');
                              } else {
                                setSentModalTitle('Merci ');
                                setSentModalBody('Votre avis a bien été envoyé. Il sera publié dans les prochains jours.');
                              }
                              setSentModalOpen(true);
                            } else {
                              setReviewError('Réponse inattendue du serveur.');
                            }
                            setShowReviewForm(false);
                            setReviewName('');
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
                        className="mt-6 mx-auto w-full max-w-3xl bg-gradient-to-br from-white/70 to-white/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col md:flex-row md:items-center md:gap-6">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                              <input
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c6f0ff]"
                                value={reviewName}
                                onChange={e => setReviewName(e.target.value)}
                                placeholder="Votre prénom"
                                aria-label="Nom"
                              />
                            </div>

                            <div className="mt-3 md:mt-0 md:w-48">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
                              <div className="flex items-center gap-2">
                                {[1,2,3,4,5].map(i => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setReviewRating(i)}
                                    aria-label={`Donner ${i} étoiles`}
                                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition ${reviewRating && reviewRating >= i ? 'bg-yellow-50 text-yellow-400 shadow-inner' : 'bg-white text-gray-300 hover:text-yellow-300 hover:bg-yellow-50'}`}
                                  >
                                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z"/></svg>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Commentaire</label>
                            <textarea
                              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm min-h-[110px] focus:outline-none focus:ring-2 focus:ring-[#c6f0ff]"
                              value={reviewContent}
                              onChange={e => setReviewContent(e.target.value)}
                              placeholder="Racontez votre expérience"
                              rows={4}
                              aria-label="Commentaire"
                            />
                          </div>

                          <div>
                            {reviewError && <div className="text-sm text-red-600 mb-2">{reviewError}</div>}
                          </div>

                          <div className="flex items-center justify-end gap-3">
                            <button type="button" onClick={() => setShowReviewForm(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
                            <button disabled={submittingReview} type="submit" className={`px-4 py-2 ${submittingReview ? 'opacity-60 cursor-wait' : ''} bg-gradient-to-r from-[#0b5566] to-[#0b83a3] text-white rounded-lg text-sm shadow`}>
                              {submittingReview ? 'Envoi...' : 'Envoyer'}
                            </button>
                          </div>
                        </div>
                      </form>
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

                <div className="max-w-3xl mx-auto text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#0b5566] mb-6">Essayez Frimousse gratuitement dès aujourd’hui</h2>
                  <p className="text-[#08323a] mb-8 text-lg">Rejoignez des dizaines d’associations et de familles déjà convaincues. Inscription rapide, sans engagement, accompagnement personnalisé.</p>
                  <a href="/register" className="bg-[#0b5566] !text-white rounded-full px-10 py-4 font-bold text-lg shadow hover:opacity-95 transition inline-block">Créer mon compte gratuit</a>
                </div>
              </section>

             

              <footer className="w-full text-[#08323a] py-10 px-6 mt-auto">
                <div className="max-w-5xl mx-auto border-t border-gray-100 py-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 justify-items-center items-start gap-6">
                    <div className="flex flex-col items-center text-center">
                      <h3 className="font-semibold text-[#08323a] mb-2">Liens utiles</h3>
                      <ul className="text-sm text-[#08323a] space-y-1">
                        <li>
                          <a href="/about" className="hover:text-[#0b5566]">À propos</a>
                        </li>
                        <li>
                          <a href="/fonctionnalites" className="hover:text-[#0b5566]">Fonctionnalités</a>
                        </li>
                        <li>
                          <a href="/tarifs" className="hover:text-[#0b5566]">Tarifs</a>
                        </li>
                        <li>
                          <a href="/support" className="hover:text-[#0b5566]">Support</a>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <h3 className="font-bold text-lg text-[#08323a] mb-2">Les Frimousses</h3>
                      <p className="text-[#08323a] text-sm mt-2 max-w-md mx-auto">Gestion professionnelle et moderne pour les associations. Pensé avec bienveillance pour les enfants et les familles.</p>
                      <div className="mt-4 text-xs text-gray-500 hidden sm:block">© Les Frimousses {new Date().getFullYear()}</div>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <h3 className="font-semibold text-[#08323a] mb-2">Contact</h3>
                      <div className="text-[#08323a] text-sm">bricchi.florian@outlook.com</div>
                      <div className="text-[#08323a] text-sm">+33 6 47 48 67 34</div>
                    </div>
                  </div>
                </div>
              </footer>

              <div className="sm:hidden absolute left-0 right-0 bottom-0 text-center text-xs text-gray-500 pb-4 bg-transparent">
                © Les Frimousses {new Date().getFullYear()}
              </div>

              
            </div>
          );
        }

