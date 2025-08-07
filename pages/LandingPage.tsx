
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
    fetch(`${API_URL}/api/children/count`)
      .then(res => res.ok ? res.json() : { count: 0 })
      .then(data => setChildrenCount(typeof data.count === 'number' ? data.count : 0))
      .catch(() => setChildrenCount(0));
    fetch(`${API_URL}/api/user/all`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAdminCount(Array.isArray(data) ? (data as User[]).filter((u: User) => u.role === 'admin').length : 0))
      .catch(() => setAdminCount(0));
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white p-0 m-0">
      <Helmet>
        <title>Frimousse | Gestion moderne d’associations de garde d’enfants</title>
        <meta name="description" content="Frimousse simplifie la gestion des associations, crèches, MAM et garderies : planning, enfants, intervenants, communication, sécurité RGPD. Essayez gratuitement !" />
        <meta name="keywords" content="garde d'enfants, association, crèche, MAM, micro-crèche, planning, gestion enfants, gestion intervenants, logiciel, solution digitale, RGPD, sécurité, familles, inscription, Frimousse" />
        <meta property="og:title" content="Frimousse | Gestion moderne d’associations de garde d’enfants" />
        <meta property="og:description" content="Plateforme tout-en-un pour associations, crèches, MAM : gestion enfants, plannings, communication, sécurité, support. Test gratuit !" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://frimousse-asso.fr/" />
        <meta property="og:image" content="/frimousse-cover.png" />
        <link rel="canonical" href="https://frimousse-asso.fr/" />
      </Helmet>
      <header className="w-full bg-gradient-to-br from-green-50 to-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-2 px-4">
          <div className="flex items-center gap-2">
            <span className="bg-green-100 rounded-full p-1"><span className="text-xl">🧒</span></span>
            <div className="w-full text-center">
              <span className="font-bold text-base text-gray-800">Les petites Frimousse</span>
            </div>
          </div>
          <div className="hidden md:flex gap-1">
            <a href="/login" className="border border-gray-300 rounded px-3 py-1 text-gray-700 hover:bg-gray-100 transition text-sm">Connexion</a>
            <a href="/register" className="bg-green-500 text-white rounded px-3 py-1 font-semibold hover:bg-green-600 transition text-sm">Inscription</a>
          </div>
        </div>
      </header>
      <div className="fixed bottom-0 left-0 w-full flex md:hidden bg-white border-t border-gray-200 z-20">
        <a href="/login" className="flex-1 text-center py-3 border-r border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition">Connexion</a>
        <a href="/register" className="flex-1 text-center py-3 text-white font-medium bg-green-500 hover:bg-green-600 transition">Inscription</a>
      </div>

      <section className="w-full bg-gradient-to-br from-green-50 to-white pt-12 pb-20 px-4 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-green-700 mb-4 leading-tight drop-shadow-sm">
          Simplifiez la gestion de votre association<br className="hidden md:block" /> de garde d’enfants
        </h1>
        <p className="text-lg md:text-2xl text-gray-700 mb-6 max-w-2xl mx-auto font-medium">
          Plateforme tout-en-un pour crèches associatives, micro-crèches, MAM, garderies et centres de loisirs.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center items-center w-full">
          <a href="/register" className="bg-green-600 text-white rounded-full px-8 py-4 font-bold text-lg shadow hover:bg-green-700 transition w-full sm:w-auto">Essayer gratuitement</a>
          <a href="/tarifs" className="bg-white border border-green-600 text-green-700 rounded-full px-8 py-4 font-bold text-lg shadow hover:bg-green-50 transition w-full sm:w-auto">Voir les tarifs</a>
        </div>
         
      </section>
      

      <section className="w-full py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-green-700 mb-10">Pourquoi choisir Frimousse&nbsp;?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 bg-green-50 rounded-xl shadow border border-green-100">
              <span className="text-3xl mb-2">📅</span>
              <h3 className="font-bold text-lg mb-2 text-green-700">Planning intelligent</h3>
              <p className="text-gray-600">Interface calendrier intuitive pour gérer les présences, suivre les plannings et organiser les activités facilement.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-green-50 rounded-xl shadow border border-green-100">
              <span className="text-3xl mb-2">👶</span>
              <h3 className="font-bold text-lg mb-2 text-green-700">Fiches enfants</h3>
              <p className="text-gray-600">Profils complets avec infos médicales, contacts d’urgence, autorisations parentales, allergies et notes personnalisées pour chaque enfant.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-green-50 rounded-xl shadow border border-green-100">
              <span className="text-3xl mb-2">💛</span>
              <h3 className="font-bold text-lg mb-2 text-green-700">Gestion des intervenants</h3>
              <p className="text-gray-600">Suivi des plannings, qualifications et affectations des professionnels pour une prise en charge optimale.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-green-50 rounded-xl shadow border border-green-100">
              <span className="text-3xl mb-2">💬</span>
              <h3 className="font-bold text-lg mb-2 text-green-700">Communication facilitée</h3>
              <p className="text-gray-600">Notifications, documents, actualités et échanges avec les familles pour une relation de confiance.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-green-50 rounded-xl shadow border border-green-100">
              <span className="text-3xl mb-2">🛡️</span>
              <h3 className="font-bold text-lg mb-2 text-green-700">Sécurité & RGPD</h3>
              <p className="text-gray-600">Données protégées, accès sécurisés, conformité RGPD et confidentialité garantie pour tous les utilisateurs.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-green-50 rounded-xl shadow border border-green-100">
              <span className="text-3xl mb-2">🤝</span>
              <h3 className="font-bold text-lg mb-2 text-green-700">Support humain</h3>
              <p className="text-gray-600">Une équipe réactive pour vous accompagner, former et répondre à toutes vos questions.</p>
            </div>
            
          </div>
           <div className="flex flex-wrap justify-center gap-12 text-center mt-8">
            <div className="w-full flex flex-wrap justify-center gap-8 mt-8">
              <div className="bg-gradient-to-br from-green-200/80 to-green-50/80 rounded-2xl shadow-lg px-6 py-6 flex flex-col items-center min-w-[140px] border border-green-100 hover:scale-105 transition-transform">
                <span className="inline-block bg-white rounded-full shadow px-4 py-2 mb-2 text-green-700 font-bold text-lg">{childrenCount !== null ? childrenCount : '...'}</span>
                <span className="text-green-800 font-semibold text-base">Familles<br/>inscrites</span>
              </div>
              <div className="bg-gradient-to-br from-green-200/80 to-green-50/80 rounded-2xl shadow-lg px-6 py-6 flex flex-col items-center min-w-[140px] border border-green-100 hover:scale-105 transition-transform">
                <span className="inline-block bg-white rounded-full shadow px-4 py-2 mb-2 text-green-700 font-bold text-lg">{adminCount !== null ? adminCount : '...'}</span>
                <span className="text-green-800 font-semibold text-base">Associations <br/>suivi</span>
              </div>
              <div className="bg-gradient-to-br from-green-200/80 to-green-50/80 rounded-2xl shadow-lg px-6 py-6 flex flex-col items-center min-w-[140px] border border-green-100 hover:scale-105 transition-transform">
                <span className="inline-block bg-white rounded-full shadow px-4 py-2 mb-2 text-green-700 font-bold text-lg">99%</span>
                <span className="text-green-800 font-semibold text-base">Utilisateur <br/> satisfait</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="w-full bg-gradient-to-r from-green-50 to-white py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-green-800 mb-6 tracking-tight drop-shadow">Notre mission</h2>
          <div className="w-full bg-white/90 rounded-3xl shadow-xl border border-green-100 px-6 py-10 md:px-12 md:py-12 flex flex-col gap-8 items-center">
            <div className="flex flex-col gap-6 items-center justify-center w-full">
              <p className="text-gray-700 text-lg leading-relaxed max-w-3xl mx-auto text-center">
                <span className="inline-block align-middle text-2xl mr-2">🌱</span>
                <span className="font-semibold text-green-700">Frimousse</span> croit que chaque enfant mérite un accueil de qualité, dans un environnement sécurisé, stimulant et bienveillant. Notre mission est d’accompagner les associations, crèches et structures d’accueil dans leur engagement quotidien auprès des familles.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed max-w-3xl mx-auto text-center">
                <span className="inline-block align-middle text-2xl mr-2">🛡️</span>
                Nous facilitons la gestion administrative et humaine pour que les équipes puissent se concentrer sur l’essentiel&nbsp;: l’épanouissement et la sécurité des enfants. Notre plateforme permet de gagner du temps, de renforcer la confiance avec les familles et de garantir la conformité réglementaire (RGPD, sécurité des données).
              </p>
              <p className="text-gray-700 text-lg leading-relaxed max-w-3xl mx-auto text-center">
                <span className="inline-block align-middle text-2xl mr-2">🤝</span>
                <span className="font-semibold text-green-700">Impact social&nbsp;:</span> Inclusion, diversité et accès à un accueil de qualité pour tous. Nous accompagnons les structures dans leur développement, leur professionnalisation et leur transformation digitale, tout en restant proches de leurs valeurs humaines.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed max-w-3xl mx-auto text-center">
                <span className="inline-block align-middle text-2xl mr-2">💡</span>
                <span className="font-semibold text-green-700">Innovation&nbsp;:</span> Des outils simples, intuitifs et adaptés aux besoins réels du terrain. Notre équipe est à l’écoute de vos retours pour faire évoluer la plateforme.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed max-w-3xl mx-auto text-center">
                <span className="inline-block align-middle text-2xl mr-2">👩‍💻</span>
                <span className="font-semibold text-green-700">Accompagnement&nbsp;:</span> Plus qu’un logiciel, Frimousse c’est aussi un accompagnement humain, une équipe disponible et des ressources pour vous aider à chaque étape.
              </p>
            </div>
          </div>
        </div>
      </section>
       <section className="w-full py-16 px-4 bg-gradient-to-br from-green-100 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-green-700 mb-6">Essayez Frimousse gratuitement dès aujourd’hui</h2>
          <p className="text-gray-700 mb-8 text-lg">Rejoignez des dizaines d’associations et de familles déjà convaincues. Inscription rapide, sans engagement, accompagnement personnalisé.</p>
          <a href="/register" className="bg-green-600 text-white rounded-full px-10 py-4 font-bold text-lg shadow hover:bg-green-700 transition inline-block">Créer mon compte gratuit</a>
        </div>
      </section>
      <footer className="w-full bg-gray-900 text-gray-100 py-10 px-6 mt-auto">
        <div className="w-full flex flex-col items-center text-center gap-6">
          <div className="flex flex-col items-center gap-2 mb-2">
            <span className="bg-green-100 rounded-full p-2"><span className="text-2xl">🧒</span></span>
            <span className="font-bold text-lg">Frimousse</span>
            <div className="text-gray-400 text-sm max-w-xs mt-2">Gestion professionnelle et moderne pour les associations. Pensé avec bienveillance pour les enfants et les familles.</div>
          </div>
          <div className="w-full flex flex-col sm:flex-row sm:justify-center sm:items-center gap-8 text-center">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-8 gap-4 w-full justify-center">
              <div>
                <div className="font-semibold mb-2">Liens utiles</div>
                <ul className="text-gray-300 text-sm flex flex-col sm:flex-row sm:gap-4 gap-1 items-center justify-center">
                  <li><a href="/about" className="hover:text-white">À propos</a></li>
                  <li><a href="/fonctionnalites" className="hover:text-white">Fonctionnalités</a></li>
                  <li><a href="/tarifs" className="hover:text-white">Tarifs</a></li>
                  <li><a href="/support" className="hover:text-white">Support</a></li>
                </ul>
              </div>
              <div className="sm:border-l sm:border-gray-700 sm:pl-8 sm:ml-8 flex flex-col items-center">
                <div className="font-semibold mb-2">Contact</div>
                <div className="text-gray-300 text-sm">contact@frimousse-asso.fr</div>
                <div className="text-gray-300 text-sm">+33 1 23 45 67 89</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
