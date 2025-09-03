
        import { Helmet } from 'react-helmet-async';
        import { useEffect, useState } from 'react';

        const API_URL = import.meta.env.VITE_API_URL || '';

        type User = {
          id: string;
          role: string;
        };

        export default function LandingPage() {
          const [childrenCount, setChildrenCount] = useState<number | null>(null);
          const [adminCount, setAdminCount] = useState<number | null>(null);

          useEffect(() => {
            fetch(`${API_URL}/children/count`)
              .then(res => (res.ok ? res.json() : { count: 0 }))
              .then(data => setChildrenCount(typeof data.count === 'number' ? data.count : 0))
              .catch(() => setChildrenCount(0));

            fetch(`${API_URL}/user/all`, { credentials: 'include' })
              .then(res => (res.ok ? res.json() : []))
              .then(data =>
                setAdminCount(Array.isArray(data) ? (data as User[]).filter((u: User) => u.role === 'admin').length : 0)
              )
              .catch(() => setAdminCount(0));
          }, []);

          return (
          <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0 relative pb-16 sm:pb-0">
              <Helmet>
                <title>Frimousse | Gestion moderne d’associations de garde d’enfants</title>
                <meta
                  name="description"
                  content="Frimousse simplifie la gestion des associations, crèches, MAM et garderies : planning, enfants, intervenants, communication, sécurité RGPD. Essayez gratuitement !"
                />
                <meta
                  name="keywords"
                  content="garde d'enfants, association, crèche, MAM, micro-crèche, planning, gestion enfants, gestion intervenants, logiciel, solution digitale, RGPD, sécurité, familles, inscription, Frimousse"
                />
                <meta property="og:title" content="Frimousse | Gestion moderne d’associations de garde d’enfants" />
                <meta
                  property="og:description"
                  content="Plateforme tout-en-un pour associations, crèches, MAM : gestion enfants, plannings, communication, sécurité, support. Test gratuit !"
                />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://frimousse-asso.fr/" />
                <meta property="og:image" content="/frimousse-cover.png" />
                <link rel="canonical" href="https://frimousse-asso.fr/" />
              </Helmet>

              <section className="w-full bg-gradient-to-br from-[#a9ddf2] to-[#f7f4d7] pt-6 sm:pt-12 pb-20 px-4 flex flex-col items-center justify-center text-center">
                <header className="w-full sticky top-0 z-10">
                  <div className="max-w-7xl mx-auto relative flex items-start justify-between py-2 md:py-3 px-4">
                    <div className="flex items-center gap-3 w-full justify-start md:justify-start">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex items-center justify-center">
                        <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
                      </div>
                      <div className="w-full text-center md:text-left">
                        <span className="hidden sm:inline-block font-extrabold text-xl text-[#0b5566]">Les Frimousses</span>
                      </div>
                    </div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:hidden pointer-events-none">
                      <span className="font-extrabold text-xl text-[#0b5566]">Les Frimousses</span>
                    </div>

                    <div className="hidden md:flex gap-2">
                      <a
                        href="/login"
                        className="bg-[#f7f4d7] border border-[#fcdcdf] text-[#0b5566] rounded px-3 py-1 text-sm hover:bg-[#fcdcdf] transition"
                      >
                        Connexion
                      </a>
                      <a href="/register" className="bg-[#0b5566] text-white rounded px-3 py-1 font-semibold hover:opacity-95 transition text-sm">
                        Inscription
                      </a>
                    </div>
                  </div>
                </header>

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
                    className="bg-[#0b5566] text-white rounded-full px-8 py-4 font-bold text-lg shadow hover:opacity-95 transition w-full sm:w-auto"
                  >
                    Essayer gratuitement
                  </a>
                  <a
                    href="/tarifs"
                    className="bg-[#f7f4d7] border border-[#fcdcdf] text-[#0b5566] rounded-full px-8 py-4 font-bold text-lg shadow hover:bg-[#fcdcdf] transition w-full sm:w-auto"
                  >
                    Voir les tarifs
                  </a>
                </div>
              </section>

              <section className="w-full py-16 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-2xl md:text-3xl font-bold text-center text-[#0b5566] mb-10">Pourquoi choisir Frimousse&nbsp;?</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center text-center p-6 bg-[#f7f4d7] rounded-xl shadow border border-[#fcdcdf]">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Planning intelligent</h3>
                      <p className="text-[#08323a]">Interface calendrier intuitive pour gérer les présences, suivre les plannings et organiser les activités facilement.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-[#f7f4d7] rounded-xl shadow border border-[#fcdcdf]">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Fiches enfants</h3>
                      <p className="text-[#08323a]">Profils complets avec infos médicales, contacts d’urgence, autorisations parentales, allergies et notes personnalisées pour chaque enfant.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-[#f7f4d7] rounded-xl shadow border border-[#fcdcdf]">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Gestion des intervenants</h3>
                      <p className="text-[#08323a]">Suivi des plannings, qualifications et affectations des professionnels pour une prise en charge optimale.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-[#f7f4d7] rounded-xl shadow border border-[#fcdcdf]">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Communication facilitée</h3>
                      <p className="text-[#08323a]">Notifications, documents, actualités et échanges avec les familles pour une relation de confiance.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-[#f7f4d7] rounded-xl shadow border border-[#fcdcdf]">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Sécurité &amp; RGPD</h3>
                      <p className="text-[#08323a]">Données protégées, accès sécurisés, conformité RGPD et confidentialité garantie pour tous les utilisateurs.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-[#f7f4d7] rounded-xl shadow border border-[#fcdcdf]">
                      <span className="text-3xl mb-2" aria-hidden />
                      <h3 className="font-bold text-lg mb-2 text-[#0b5566]">Support humain</h3>
                      <p className="text-[#08323a]">Une équipe réactive pour vous accompagner, former et répondre à toutes vos questions.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-12 text-center mt-8">
                    <div className="w-full flex flex-wrap justify-center gap-8 mt-8">
                      <div className="bg-[#f7f4d7] rounded-2xl shadow-lg px-6 py-6 flex flex-col items-center min-w-[140px] border border-[#fcdcdf] hover:scale-105 transition-transform">
                        <span className="inline-block bg-white rounded-full shadow px-4 py-2 mb-2 text-[#0b5566] font-bold text-lg">{childrenCount !== null ? childrenCount : '...'}</span>
                        <span className="text-[#0b5566] font-semibold text-base">Familles<br />inscrites</span>
                      </div>

                      <div className="bg-[#f7f4d7] rounded-2xl shadow-lg px-6 py-6 flex flex-col items-center min-w-[140px] border border-[#fcdcdf] hover:scale-105 transition-transform">
                        <span className="inline-block bg-white rounded-full shadow px-4 py-2 mb-2 text-[#0b5566] font-bold text-lg">{adminCount !== null ? adminCount : '...'}</span>
                        <span className="text-[#0b5566] font-semibold text-base">Associations <br />suivi</span>
                      </div>

                      <div className="bg-[#f7f4d7] rounded-2xl shadow-lg px-6 py-6 flex flex-col items-center min-w-[140px] border border-[#fcdcdf] hover:scale-105 transition-transform">
                        <span className="inline-block bg-white rounded-full shadow px-4 py-2 mb-2 text-[#0b5566] font-bold text-lg">99%</span>
                        <span className="text-[#0b5566] font-semibold text-base">Utilisateur <br /> satisfait</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="w-full bg-gradient-to-r from-[#a9ddf2] to-[#f7f4d7] py-12 px-6">
                <div className="max-w-5xl mx-auto flex flex-col items-center">
                  <div className="w-full bg-white/90 rounded-3xl shadow-xl border border-[#fcdcdf] px-6 py-10 md:px-12 md:py-12 flex flex-col gap-8 items-center">
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

                <div className="max-w-3xl mx-auto text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#0b5566] mb-6">Essayez Frimousse gratuitement dès aujourd’hui</h2>
                  <p className="text-[#08323a] mb-8 text-lg">Rejoignez des dizaines d’associations et de familles déjà convaincues. Inscription rapide, sans engagement, accompagnement personnalisé.</p>
                  <a href="/register" className="bg-[#0b5566] text-white rounded-full px-10 py-4 font-bold text-lg shadow hover:opacity-95 transition inline-block">Créer mon compte gratuit</a>
                </div>
              </section>

              <footer className="w-full text-[#08323a] py-10 px-6 mt-auto">
                <div className="max-w-5xl mx-auto border-t border-gray-100 py-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 justify-items-center items-center gap-6">
                    <div className="flex flex-col items-center text-center">
                      <h4 className="font-semibold text-[#08323a] mb-2">Liens utiles</h4>
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
                      <h4 className="font-bold text-lg text-[#08323a] mb-2">Les Frimousses</h4>
                      <p className="text-[#08323a] text-sm mt-2 max-w-md mx-auto">Gestion professionnelle et moderne pour les associations. Pensé avec bienveillance pour les enfants et les familles.</p>
                      <div className="mt-4 text-xs text-gray-500 hidden sm:block">© Les Frimousses {new Date().getFullYear()}</div>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <h4 className="font-semibold text-[#08323a] mb-2">Contact</h4>
                      <div className="text-[#08323a] text-sm">contact@frimousse-asso.fr</div>
                      <div className="text-[#08323a] text-sm">+33 1 23 45 67 89</div>
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
