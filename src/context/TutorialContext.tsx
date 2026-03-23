import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TutorialContext } from './TutorialTypes';
import type { Tour } from './TutorialTypes';
export type { TutorialStep, Tour, TutorialContextValue } from './TutorialTypes';

/* ───── Tour definitions ───── */

const TOURS: Tour[] = [
  {
    id: 'onboarding',
    name: 'Prise en main',
    description: 'Découvrez l\'interface et les fonctionnalités principales de Frimousse.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
    ),
    steps: [
      { target: '_modal_', title: 'Bienvenue sur Frimousse !', content: 'Ce tutoriel va vous présenter chaque page de l\'application une par une. Vous saurez à quoi sert chaque section en moins de 2 minutes.', modal: true },
      { target: 'sidebar-logo', title: 'Votre structure', content: 'Le nom de votre structure s\'affiche ici en haut du menu. Toutes les pages sont accessibles depuis cette barre latérale.', placement: 'right' },
      { target: 'nav-dashboard', title: 'Tableau de bord', content: 'Le tableau de bord est votre page d\'accueil. Il affiche le calendrier du mois, les affectations prévues et un résumé de l\'activité du jour.', placement: 'right', route: '/dashboard' },
      { target: 'nav-feed', title: 'Fil d\'actualité', content: 'Le fil d\'actualité est l\'espace de communication entre la nounou et les parents. La nounou y publie ce qui s\'est passé dans la journée. Si les parents ont donné leur autorisation, des photos de leur enfant peuvent également être partagées.', placement: 'right', route: '/feed' },
      { target: 'nav-notifications', title: 'Notifications', content: 'Les notifications vous alertent des nouveaux messages, publications ou événements importants. Le badge indique le nombre de notifications non lues.', placement: 'right', route: '/notifications' },
      { target: 'nav-children', title: 'Enfants', content: 'La liste de tous les enfants inscrits dans votre structure. Vous pouvez ajouter un enfant, consulter ses informations, ses allergies, son groupe et le rattacher à ses parents.', placement: 'right', route: '/children' },
      { target: 'nav-parent', title: 'Parents', content: 'La liste des parents et tuteurs légaux. Chaque parent peut se connecter à son espace pour suivre les publications du fil d\'actualité concernant son enfant.', placement: 'right', route: '/parent' },
      { target: 'nav-nannies', title: 'Nounous', content: 'La liste de votre équipe. Gérez les disponibilités, les plannings et les affectations de chaque professionnelle aux enfants dont elle s\'occupe.', placement: 'right', route: '/nannies' },
      { target: 'nav-activites', title: 'Activités', content: 'Planifiez les activités de la semaine pour vos groupes d\'enfants : éveil musical, motricité, arts plastiques, sorties... Visible par toute l\'équipe.', placement: 'right', route: '/activites' },
      { target: 'nav-reports', title: 'Rapports', content: 'La section Rapports permet à la nounou de rédiger un compte-rendu pour les parents : refus de manger, colère, fatigue, chute ou tout autre événement survenu dans la journée.', placement: 'right', route: '/reports' },
      { target: 'nav-assistant', title: 'Assistant IA', content: 'L\'assistant IA vous aide à rédiger des messages, générer des comptes-rendus et gagner du temps au quotidien. Cette section est disponible uniquement avec un abonnement Pro.', placement: 'right', route: '/assistant' },
      { target: 'nav-payment-history', title: 'Paiements', content: 'L\'historique des paiements et des cotisations. Consultez les règlements effectués et suivez la facturation de votre structure.', placement: 'right', route: '/payment-history' },
      { target: 'nav-subscription', title: 'Mon abonnement', content: 'Gérez votre abonnement, consultez votre plan actuel et passez en Pro pour débloquer l\'assistant IA et toutes les fonctionnalités avancées.', placement: 'right', route: '/subscription', adminOnly: true },
      { target: 'nav-settings', title: 'Paramètres', content: 'Configurez votre profil, votre mot de passe, les notifications et retrouvez tous les tutoriels de l\'application.', placement: 'right', route: '/settings' },
      { target: '_modal_', title: 'C\'est parti !', content: 'Vous connaissez maintenant toutes les pages de Frimousse. Explorez les autres tutoriels pour apprendre à créer une nounou, un parent et un enfant !', modal: true },
    ],
  },
  {
    id: 'add-nanny',
    name: 'Créer une nounou',
    description: 'Apprenez à ajouter une assistante maternelle ou une professionnelle à votre équipe.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
    ),
    steps: [
      { target: '_modal_', title: 'Ajouter une nounou', content: 'Suivez ce guide pour ajouter une nouvelle professionnelle (assistante maternelle, auxiliaire...) à votre équipe.', modal: true },
      { target: 'nav-nannies', title: 'Menu Nounous', content: 'Commencez par cliquer sur "Nounous" dans le menu pour accéder à la liste de votre équipe.', placement: 'right', route: '/nannies' },
      { target: 'btn-add-nanny', title: 'Bouton Ajouter', content: 'Cliquez sur ce bouton pour ouvrir le formulaire d\'ajout d\'une nouvelle nounou.', placement: 'bottom' },
      { target: '_modal_', title: 'Remplir le formulaire', content: 'Renseignez le nom, l\'email, le mot de passe et les informations de contact. L\'email et le mot de passe permettront à la nounou de se connecter à son espace.', modal: true },
      { target: '_modal_', title: 'Disponibilités & spécialisations', content: 'Indiquez la disponibilité (disponible ou en congé), les années d\'expérience et les spécialisations éventuelles.', modal: true },
      { target: '_modal_', title: 'Nounou créée !', content: 'Une fois validé, la nounou apparaît dans la liste et peut se connecter avec ses identifiants. Vous pourrez ensuite lui affecter des enfants dans le planning.', modal: true },
    ],
  },
  {
    id: 'add-parent',
    name: 'Créer un parent',
    description: 'Apprenez à inscrire un parent ou tuteur légal dans l\'application.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
    ),
    steps: [
      { target: '_modal_', title: 'Ajouter un parent', content: 'Ce tutoriel vous montre comment créer un compte parent. Le parent pourra ensuite se connecter pour suivre son enfant.', modal: true },
      { target: 'nav-parent', title: 'Menu Parents', content: 'Cliquez sur "Parents" dans le menu latéral pour accéder à la gestion des parents.', placement: 'right', route: '/parent' },
      { target: 'btn-add-parent', title: 'Bouton Ajouter', content: 'Cliquez ici pour ouvrir le formulaire de création d\'un nouveau parent.', placement: 'bottom' },
      { target: '_modal_', title: 'Informations du parent', content: 'Renseignez le prénom, le nom, l\'email et le numéro de téléphone. L\'email servira d\'identifiant de connexion.', modal: true },
      { target: '_modal_', title: 'Adresse & mot de passe', content: 'Ajoutez l\'adresse du parent et définissez un mot de passe temporaire. Le parent pourra le modifier dans ses paramètres.', modal: true },
      { target: '_modal_', title: 'Parent créé !', content: 'Le parent est maintenant inscrit ! Vous pourrez ensuite lui rattacher un ou plusieurs enfants lors de la création d\'un enfant.', modal: true },
    ],
  },
  {
    id: 'add-child',
    name: 'Inscrire un enfant',
    description: 'Apprenez à inscrire un enfant et le rattacher à un parent et une nounou.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
    ),
    steps: [
      { target: '_modal_', title: 'Inscrire un enfant', content: 'Ce guide vous explique comment ajouter un enfant dans Frimousse et le rattacher à ses parents et sa nounou.', modal: true },
      { target: 'nav-children', title: 'Menu Enfants', content: 'Rendez-vous dans la section "Enfants" depuis le menu.', placement: 'right', route: '/children' },
      { target: 'btn-add-child', title: 'Bouton Ajouter', content: 'Cliquez sur le bouton d\'ajout pour ouvrir le formulaire d\'inscription.', placement: 'bottom' },
      { target: '_modal_', title: 'Informations de l\'enfant', content: 'Renseignez le nom, la date de naissance, le sexe et le groupe (bébés, moyens, grands...). Le groupe permet d\'organiser les enfants par âge.', modal: true },
      { target: '_modal_', title: 'Rattacher un parent', content: 'Sélectionnez le parent dans la liste déroulante. Si le parent n\'est pas encore créé, faites-le d\'abord via le tutoriel "Créer un parent".', modal: true },
      { target: '_modal_', title: 'Informations médicales', content: 'Ajoutez les allergies éventuelles et les informations de santé importantes. Ces informations seront visibles par les nounous.', modal: true },
      { target: '_modal_', title: 'Enfant inscrit !', content: 'L\'enfant apparaît maintenant dans la liste. Vous pouvez lui affecter une nounou via le planning et ses parents peuvent suivre son activité.', modal: true },
    ],
  },
  {
    id: 'planning',
    name: 'Gérer le planning',
    description: 'Découvrez comment organiser le planning et les pointages.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
    ),
    steps: [
      { target: '_modal_', title: 'Le planning', content: 'Le planning vous permet de visualiser les affectations nounou-enfant et de gérer les pointages quotidiens.', modal: true },
      { target: 'nav-dashboard', title: 'Tableau de bord', content: 'Le tableau de bord affiche le calendrier du mois avec les affectations prévues pour chaque jour.', placement: 'right', route: '/dashboard' },
      { target: '_modal_', title: 'Créer une affectation', content: 'Cliquez sur un jour du calendrier pour créer une affectation : choisissez l\'enfant et la nounou, puis validez.', modal: true },
      { target: 'nav-activites', title: 'Activités', content: 'Dans la section Activités, planifiez les activités de la semaine : éveil musical, motricité, arts plastiques...', placement: 'right', route: '/activites' },
    ],
  },
  {
    id: 'feed-reports',
    name: 'Fil d\'actualité',
    description: 'Communiquez avec les parents : humeur, repas, incidents, moments du quotidien.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
    ),
    steps: [
      { target: '_modal_', title: 'Le fil d\'actualité', content: 'Le fil d\'actualité est l\'outil de communication quotidienne entre la nounou et les parents. La nounou y signale tout ce qui s\'est passé dans la journée avec l\'enfant.', modal: true },
      { target: 'nav-feed', title: 'Accéder au fil', content: 'Cliquez sur "Fil d\'actualité" dans le menu pour accéder aux publications.', placement: 'right', route: '/feed' },
      { target: '_modal_', title: 'Partager des moments', content: 'La nounou peut publier des photos des activités de la journée, partager des informations importantes concernant la crèche ou la MAM : sorties, événements, fermetures exceptionnelles...', modal: true },
      { target: '_modal_', title: 'Réactions & réponses', content: 'Les parents peuvent liker la publication et voir qui d\'autre a réagi. Cela crée un lien de confiance et de transparence entre la structure et les familles.', modal: true },
      { target: '_modal_', title: 'Bonne pratique', content: 'Publiez au moins un message par enfant en fin de journée. Les parents apprécient savoir comment s\'est passée la journée même quand tout va bien.', modal: true },
    ],
  },
];

/* ───── Provider ───── */

export function TutorialProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user && typeof user.role === 'string' && (user.role === 'admin' || user.role.toLowerCase().includes('super'));
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const pendingRoute = useRef<string | null>(null);

  const isActive = activeTour !== null;

  const startTour = useCallback((tourId: string) => {
    const tour = TOURS.find(t => t.id === tourId);
    if (!tour) return;
    const filteredTour = {
      ...tour,
      steps: tour.steps.filter(s => !s.adminOnly || isAdmin),
    };
    setActiveTour(filteredTour);
    setCurrentStep(0);
    setShowMenu(false);
    // Navigate to first step's route if needed
    const firstRoute = tour.steps[0]?.route;
    if (firstRoute && location.pathname !== firstRoute) {
      navigate(firstRoute);
    }
  }, [navigate, location.pathname, isAdmin]);

  const stopTour = useCallback(() => {
    setActiveTour(null);
    setCurrentStep(0);
    pendingRoute.current = null;
    // Rouvre le menu sauf si tous les tours sont déjà complétés
    try {
      const done = JSON.parse(localStorage.getItem('tutorial_completed') || '[]');
      const allDone = TOURS.every(t => done.includes(t.id));
      if (!allDone) setShowMenu(true);
    } catch { setShowMenu(true); }
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStep >= activeTour.steps.length - 1) {
      // Mark tour as completed
      let allDone = false;
      try {
        const done = JSON.parse(localStorage.getItem('tutorial_completed') || '[]');
        if (!done.includes(activeTour.id)) done.push(activeTour.id);
        localStorage.setItem('tutorial_completed', JSON.stringify(done));
        allDone = TOURS.every(t => done.includes(t.id));
      } catch { /* ignore */ }
      setActiveTour(null);
      setCurrentStep(0);
      pendingRoute.current = null;
      // Rouvre le menu sauf si tous les tours sont terminés
      if (!allDone) setShowMenu(true);
      return;
    }
    const nextIdx = currentStep + 1;
    const nextRoute = activeTour.steps[nextIdx]?.route;
    if (nextRoute && location.pathname !== nextRoute) {
      pendingRoute.current = nextRoute;
      navigate(nextRoute);
      // Wait for navigation then set step
      setTimeout(() => {
        setCurrentStep(nextIdx);
        pendingRoute.current = null;
      }, 300);
    } else {
      setCurrentStep(nextIdx);
    }
  }, [activeTour, currentStep, location.pathname, navigate]);

  const prevStep = useCallback(() => {
    if (!activeTour || currentStep <= 0) return;
    const prevIdx = currentStep - 1;
    const prevRoute = activeTour.steps[prevIdx]?.route;
    if (prevRoute && location.pathname !== prevRoute) {
      navigate(prevRoute);
      setTimeout(() => setCurrentStep(prevIdx), 300);
    } else {
      setCurrentStep(prevIdx);
    }
  }, [activeTour, currentStep, location.pathname, navigate]);

  const toggleMenu = useCallback(() => setShowMenu(v => !v), []);
  const closeMenu = useCallback(() => setShowMenu(false), []);

  // Auto-launch onboarding on very first login (server-side flag)
  useEffect(() => {
    if (!user) return;
    if (user.tutorialSeen) return;
    // Mark as seen on the server
    fetch('/api/user/tutorial-seen', { method: 'PUT', credentials: 'include' }).catch(() => { /* ignore */ });
    const timer = setTimeout(() => setShowMenu(true), 1500);
    return () => clearTimeout(timer);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TutorialContext.Provider value={{
      tours: TOURS,
      activeTour,
      currentStep,
      isActive,
      showMenu,
      startTour,
      nextStep,
      prevStep,
      stopTour,
      toggleMenu,
      closeMenu,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}
