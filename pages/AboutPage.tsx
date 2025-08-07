import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white p-0 m-0">
      <Helmet>
        <title>À propos de Frimousse | Application de gestion de garde d’enfants, sécurité, RGPD, avantages</title>
        <meta name="description" content="Frimousse, la solution digitale complète pour la gestion des associations de garde d’enfants : sécurité, RGPD, communication, planning, témoignages, FAQ, et bien plus." />
        <meta name="keywords" content="garde d'enfants, application gestion, association, crèche, micro-crèche, MAM, planning, sécurité, RGPD, communication parents, logiciel, solution digitale, Frimousse, gestion enfants, gestion intervenants, facturation, attestations, notifications, familles, témoignages, FAQ" />
        <meta property="og:title" content="À propos de Frimousse | Application de gestion de garde d’enfants" />
        <meta property="og:description" content="Découvrez Frimousse, la solution digitale moderne et sécurisée pour la gestion des associations de garde d’enfants : centralisation, sécurité, RGPD, communication, planning, témoignages, FAQ, et bien plus." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://frimousse.asso/a-propos" />
        <meta property="og:image" content="https://frimousse.asso/og-image.jpg" />
        <link rel="canonical" href="https://frimousse.asso/a-propos" />
      </Helmet>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Pourquoi utiliser une application pour la gestion de la garde d’enfants ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Une application comme Frimousse permet de centraliser toutes les informations, d’automatiser les tâches administratives, d’assurer la sécurité des données et de faciliter la communication entre intervenants et familles."
                }
              },
              {
                "@type": "Question",
                "name": "Comment Frimousse garantit-elle la sécurité et la confidentialité des données ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Frimousse respecte strictement le RGPD, utilise des serveurs sécurisés, des accès personnalisés et des sauvegardes régulières pour garantir la confidentialité et l’intégrité des données."
                }
              },
              {
                "@type": "Question",
                "name": "Quels bénéfices pour les familles et les intervenants ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Les familles bénéficient d’une communication fluide, d’un accès à l’historique, aux documents et aux notifications. Les intervenants gagnent du temps, organisent mieux les plannings et assurent un suivi optimal des enfants."
                }
              },
              {
                "@type": "Question",
                "name": "Frimousse est-elle adaptée à tous types de structures ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Oui, Frimousse s’adresse aux crèches associatives, micro-crèches, MAM, garderies, centres de loisirs, et toute structure d’accueil collectif ou familial." 
                }
              },
              {
                "@type": "Question",
                "name": "Quels sont les avantages concrets de Frimousse ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Gain de temps, réduction des erreurs, meilleure organisation, sécurité, conformité RGPD, accès multi-utilisateurs, support réactif, et évolutivité selon les besoins de l’association."
                }
              }
            ]
          })
        }}
      />
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
            <h1 className="text-3xl md:text-4xl font-bold text-green-700 mb-6">À propos de Frimousse</h1>
            <p className="text-gray-700 text-base sm:text-lg mb-6">
              Frimousse est une application web moderne dédiée à la gestion des associations de garde d’enfants. Notre mission est de simplifier le quotidien des responsables, des intervenants et des familles en centralisant toutes les informations et outils nécessaires à un accueil de qualité.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div>
                <h2 className="font-bold text-lg mb-2 text-green-700">Pourquoi choisir une solution digitale pour la garde d’enfants&nbsp;?</h2>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Centralisation des dossiers enfants, informations médicales et autorisations parentales.</li>
                  <li>Gestion simplifiée des présences, plannings et affectations des intervenants.</li>
                  <li>Communication facilitée avec les familles (notifications, rappels, actualités).</li>
                  <li>Suivi administratif (cotisations, factures, attestations) automatisé.</li>
                  <li>Respect des normes RGPD et sécurité des données personnelles.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-bold text-lg mb-2 text-green-700">Les avantages de Frimousse pour votre association</h2>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Gain de temps pour les équipes grâce à une interface intuitive et collaborative.</li>
                  <li>Meilleure organisation des activités, sorties et événements.</li>
                  <li>Accès sécurisé pour chaque intervenant, parent ou administrateur.</li>
                  <li>Historique des présences et rapports d’activité accessibles à tout moment.</li>
                  <li>Support réactif et évolutif, adapté aux besoins des associations de toutes tailles.</li>
                </ul>
              </div>
            </div>
            <div className="mt-8 text-gray-700 text-base sm:text-lg">
              <strong>Frimousse</strong> s’adresse à toutes les structures d’accueil collectif ou familial&nbsp;: crèches associatives, micro-crèches, garderies, centres de loisirs, MAM, etc. Notre solution accompagne les professionnels dans leur mission d’accueil, de suivi et d’épanouissement des enfants.
            </div>

            <div className="mt-12 text-left max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-green-700 mb-4">Pourquoi digitaliser la gestion de la garde d’enfants&nbsp;?</h2>
              <p className="mb-4">La gestion de la garde d’enfants implique de nombreux défis&nbsp;: suivi des présences, gestion des plannings, communication avec les familles, respect des normes administratives et sanitaires, sécurité des données, etc. La digitalisation permet de centraliser toutes ces tâches, d’automatiser les processus répétitifs et de garantir une traçabilité optimale pour chaque enfant accueilli.</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                <li>Réduction des erreurs humaines et des oublis grâce à des rappels et des notifications automatiques.</li>
                <li>Accès instantané à l’historique des présences, des activités, des documents et des autorisations parentales.</li>
                <li>Meilleure réactivité en cas d’urgence (accès aux contacts, allergies, protocoles médicaux).</li>
                <li>Gain de temps administratif pour se concentrer sur l’accompagnement des enfants.</li>
              </ul>
            </div>

            <div className="mt-12 text-left max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-green-700 mb-4">Sécurité, confidentialité et conformité RGPD</h2>
              <p className="mb-4">La sécurité des données des enfants et des familles est une priorité absolue. Frimousse met en œuvre&nbsp;:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                <li>Des accès personnalisés et sécurisés pour chaque intervenant, parent ou administrateur.</li>
                <li>Des sauvegardes régulières et un hébergement sur des serveurs conformes aux normes européennes.</li>
                <li>Un respect strict du RGPD&nbsp;: consentement parental, droit à l’oubli, transparence sur l’utilisation des données.</li>
                <li>Un support technique réactif pour accompagner les associations dans la gestion de la conformité.</li>
              </ul>
            </div>

            <div className="mt-12 text-left max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-green-700 mb-4">Quels bénéfices pour les familles et les intervenants&nbsp;?</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                <li>Les familles accèdent à un espace personnel pour consulter les plannings, recevoir des notifications, télécharger des documents et échanger avec l’équipe encadrante.</li>
                <li>Les intervenants disposent d’outils pour organiser les activités, suivre les présences, rédiger des rapports et communiquer facilement avec les parents.</li>
                <li>La transparence et la confiance sont renforcées grâce à un suivi partagé et à la disponibilité des informations en temps réel.</li>
              </ul>
            </div>

            <div className="mt-12 text-left max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-green-700 mb-4">L’impact de Frimousse sur la qualité de l’accueil</h2>
              <p className="mb-4">En centralisant toutes les informations et en fluidifiant la communication, Frimousse permet aux équipes de se concentrer sur l’essentiel&nbsp;: le bien-être, l’éveil et la sécurité des enfants. L’application favorise l’implication des familles, la personnalisation de l’accueil et l’amélioration continue des pratiques professionnelles.</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                <li>Suivi individualisé du parcours de chaque enfant.</li>
                <li>Valorisation du travail des équipes et simplification des démarches administratives.</li>
                <li>Adaptabilité aux besoins spécifiques de chaque structure et de chaque famille.</li>
              </ul>
            </div>
          </div>
        </section>
        <div className="max-w-4xl mx-auto text-center mt-8 mb-8">
          <button
            onClick={() => navigate('/')}
            className="mt-8 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            aria-label="Retour à l'accueil"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </main>
    </div>
  );
}
