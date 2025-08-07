import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    title: 'Gestion des enfants',
    description: 'Ajout, modification, suppression et suivi des enfants inscrits à l’association.'
  },
  {
    title: 'Gestion des familles',
    description: 'Centralisation des informations des familles, contacts, et historique.'
  },
  {
    title: 'Gestion des nounous',
    description: 'Affectation, plannings, profils et suivi des nounous.'
  },
  {
    title: 'Planning & Calendrier',
    description: 'Visualisation et édition des plannings de garde, gestion des absences et présences.'
  },

  {
    title: 'Authentification sécurisée',
    description: 'Connexion par email/mot de passe, gestion des rôles et permissions.'
  },
  {
    title: 'Notifications',
    description: 'Alertes pour les événements importants, rappels et communications.'
  },
  {
    title: 'Accessibilité',
    description: 'Respect des standards d’accessibilité pour tous les utilisateurs.'
  },
  {
    title: 'Sécurité & RGPD',
    description: 'Protection des données, conformité RGPD, cookies HTTP-only.'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  'name': 'Fonctionnalités de l’application Frimousse',
  'itemListElement': features.map((f, i) => ({
    '@type': 'ListItem',
    'position': i + 1,
    'name': f.title,
    'description': f.description
  }))
};

export default function FeaturesPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white p-0 m-0">
      <Helmet>
        <title>Fonctionnalités | Frimousse Association</title>
        <meta name="description" content="Découvrez toutes les fonctionnalités de l’application Frimousse : gestion des enfants, familles, nounous, planning, rapports, sécurité, accessibilité et plus encore." />
        <meta property="og:title" content="Fonctionnalités | Frimousse Association" />
        <meta property="og:description" content="Liste complète des fonctionnalités de l’application Frimousse pour la gestion de garde d’enfants." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://frimousse-asso.fr/fonctionnalites" />
        <meta property="og:image" content="/frimousse-cover.png" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-2 px-4">
          <div className="flex items-center gap-2">
            <span className="bg-green-100 rounded-full p-1"><span className="text-xl">🧒</span></span>
            <div className="w-full text-center">
              <span className="font-bold text-base text-gray-800">Les petites Frimousse</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">
        <section className="w-full py-12 px-6 bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto text-center">
            <button
              onClick={() => navigate('/')} 
              className="mb-8 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
              aria-label="Retour à l'accueil"
            >
              ← Retour à l'accueil
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-green-700 mb-6">Fonctionnalités de l’application</h1>
            <p className="text-gray-700 text-base sm:text-lg mb-6">
              Découvrez toutes les fonctionnalités de Frimousse, conçues pour simplifier la gestion de votre association de garde d’enfants, améliorer la communication et garantir la sécurité des données.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-green-50 rounded-lg shadow p-5 border border-green-100">
                  <h2 className="text-lg font-semibold mb-2 text-green-700">{feature.title}</h2>
                  <p className="text-gray-700">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div className="max-w-4xl mx-auto text-center mt-10 mb-8">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            aria-label="Retour à l'accueil (bas de page)"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </main>
    </div>
  );
}
