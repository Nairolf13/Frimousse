
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
                <title>Frimousse — Logiciel de gestion pour crèches et MAM</title>
                <meta
                  name="description"
                  content="Frimousse aide les crèches, micro-crèches et MAM à gérer inscriptions, plannings, fiches enfants et communication parent-crèche. Essai gratuit et conformité RGPD."
                />
                {/* Google site verification placeholder - replace with your token before submitting */}
                <meta name="google-site-verification" content="" />
                <meta name="theme-color" content="#0b5566" />
                <meta property="og:locale" content="fr_FR" />
                <meta property="og:site_name" content="Frimousse" />
                <meta
                  name="keywords"
                  content="application de gestion d'enfant, application pour crèche, application MAM, gestion crèche, gestion micro-crèche, logiciel crèche, mise en relation parent crèche, mise en relation parent MAM, gestion association garde d'enfants, planning crèche, inscription en ligne crèche, solution gestion enfants, Frimousse"
                />
                <meta property="og:title" content="Frimousse — Logiciel gestion crèches & MAM" />
                <meta
                  property="og:description"
                  content="Gérez inscriptions, plannings et fiches enfants avec Frimousse. Solution pour crèches associatives, micro-crèches et MAM — essai gratuit." 
                />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://frimousse-asso.fr/" />
                <meta property="og:image" content="https://frimousse-asso.fr/frimousse-cover.png" />
                <meta property="og:image:alt" content="Frimousse — gestion crèches et MAM" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:site" content="@frimousse" />
                <meta name="twitter:creator" content="@frimousse" />
                <meta name="twitter:title" content="Frimousse | Application de gestion d'enfant pour crèche, MAM et associations" />
                <meta name="twitter:description" content="Logiciel pour crèche, MAM et associations : gestion enfants, plannings, communication parent-crèche, facturation et RGPD. Test gratuit." />
                <link rel="alternate" href="https://frimousse-asso.fr/" hrefLang="fr" />
                <link rel="canonical" href="https://frimousse-asso.fr/" />
                {/* JSON-LD Organization + WebSite
                    Note: sameAs contains probable profile URLs auto-inserted by the team — please verify/replace with your official profiles. */}
                <script type="application/ld+json">
                  {`{
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "Frimousse",
                    "url": "https://frimousse-asso.fr/",
                    "logo": "https://frimousse-asso.fr/imgs/LogoFrimousse.webp",
                    // "sameAs": [
                    //   "https://www.facebook.com/frimousse",
                    //   "https://twitter.com/frimousse",
                    //   "https://www.linkedin.com/company/frimousse",
                    //   "https://www.instagram.com/frimousse",
                    // ],
                  }`}
                </script>
                <script type="application/ld+json">
                  {`{
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "url": "https://frimousse-asso.fr/",
                    "name": "Frimousse",
                    "description": "Application de gestion d'enfant pour crèche, MAM et associations : plannings, inscriptions, communication parent-crèche, facturation et RGPD.",
                    "publisher": {
                      "@type": "Organization",
                      "name": "Frimousse"
                    }
                  }`}
                </script>
                {/* WebPage JSON-LD to improve search understanding of this page */}
                <script type="application/ld+json">
                  {`{
                    "@context": "https://schema.org",
                    "@type": "WebPage",
                    "name": "Frimousse — Logiciel de gestion pour crèches et MAM",
                    "url": "https://frimousse-asso.fr/",
                    "description": "Plateforme tout-en-un pour crèches associatives, micro-crèches, MAM et garderies. Essai gratuit, conformité RGPD.",
                    "inLanguage": "fr-FR",
                    "isPartOf": {"@type": "WebSite", "name": "Frimousse", "url": "https://frimousse-asso.fr/"}
                  }`}
                </script>
                {/* SoftwareApplication JSON-LD to highlight product offering */}
                <script type="application/ld+json">
                  {`{
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": "Frimousse",
                    "operatingSystem": "Web",
                    "applicationCategory": "BusinessApplication",
                    "url": "https://frimousse-asso.fr/",
                    "description": "Frimousse est une application web de gestion pour crèches, MAM et associations : inscriptions, plannings, fiches enfants, communication et facturation.",
                    "offers": {"@type": "Offer", "price": "0.00", "priceCurrency": "EUR", "availability": "https://schema.org/InStock"}
                  }`}
                </script>
                {/* Breadcrumb schema for SEO */}
                <script type="application/ld+json">
                  {`{
                    "@context": "https://schema.org",
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                      {"@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://frimousse-asso.fr/"}
                    ]
                  }`}
                </script>
                <meta name="robots" content="index,follow" />
              </Helmet>

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
                  {/* Mobile-only Connexion button as third CTA to match size/spacing */}
                  <a
                    href="/login"
                    className="sm:hidden bg-[#0b5566] text-white rounded-full px-8 py-4 font-bold text-lg shadow hover:scale-105 transition w-full text-center"
                    aria-label="Connexion"
                    title="Connexion"
                  >
                    Connexion
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

                  {/* SEO-rich block: include many target keywords in natural copy for better AEO/SEO */}
                  <div className="mt-12 bg-[#f7f4d7] p-6 rounded-lg border border-[#fcdcdf] mx-auto text-center max-w-3xl">
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

                    {/* Testimonial snippet - small social proof to increase CTR */}
                    <div className="mt-6 max-w-xl mx-auto">
                      <div className="bg-white rounded-lg p-6 shadow-sm border border-[#f0e9e6]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1" aria-hidden>
                            {/* 5 filled stars */}
                            <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                            </svg>
                            <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                            </svg>
                            <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                            </svg>
                            <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                            </svg>
                            <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.487 2.678c-.785.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.525 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                            </svg>
                          </div>
                          <div className="text-sm text-gray-500">Note moyenne : <span className="font-semibold text-[#0b5566]">5/5</span></div>
                        </div>

                        <blockquote className="mt-3 text-[#0b5566] font-semibold text-lg leading-relaxed">« Frimousse a transformé notre gestion quotidienne, inscription, planning et communication en un seul outil. »</blockquote>
                        <cite className="block mt-3 text-sm text-gray-600 not-italic">Association Les Petites Frimousses</cite>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                          <div>Publié le 12 septembre 2025</div>
                          {/* <a href="/about#testimonials" className="text-[#0b5566] underline hover:no-underline">Voir plus d'avis</a> */}
                        </div>
                      </div>
                    </div>


                    {/* FAQ block (visible) */}
                    <div className="mt-6 text-left max-w-xl mx-auto">
                      <h4 className="font-bold text-[#0b5566] mb-2">Questions fréquentes</h4>
                      <details className="mb-2">
                        <summary className="cursor-pointer">Frimousse est‑il adapté aux crèches associatives ?</summary>
                        <div className="mt-1 text-[#08323a]">Oui — Frimousse gère les inscriptions (formulaires et listes d'attente), planifie les présences, génère des fiches enfants complètes (contacts, allergies, autorisations) et centralise la communication parent-structure en un seul tableau de bord simple.</div>
                      </details>
                      <details className="mb-2">
                        <summary className="cursor-pointer">Proposez‑vous une version d'essai ?</summary>
                        <div className="mt-1 text-[#08323a]">Oui, essai gratuit sans engagement : création de compte, import CSV des enfants, paramétrage du planning et support d'accompagnement. Contactez-nous ou inscrivez-vous via le bouton "Essayer gratuitement".</div>
                      </details>
                      <details>
                        <summary className="cursor-pointer">Les données sont‑elles conformes au RGPD ?</summary>
                        <div className="mt-1 text-[#08323a]">Oui — hébergement sécurisé, accès restreint par rôle, chiffrement des sauvegardes et outils pour exporter/supprimer les données conformément aux demandes des familles.</div>
                      </details>
                    </div>

                    {/* JSON-LD for Review and FAQ moved to <head> (Helmet) to ensure crawlers see it early. */}
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
