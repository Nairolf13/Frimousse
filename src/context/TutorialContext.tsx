import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TutorialContext } from './TutorialTypes';
import type { Tour } from './TutorialTypes';
import { useI18n } from '../lib/useI18n';
export type { TutorialStep, Tour, TutorialContextValue } from './TutorialTypes';

/* ───── Tour definitions — all text uses i18n keys ───── */

type RawStep = { target: string; titleKey: string; contentKey: string; modal?: boolean; placement?: 'right' | 'bottom' | 'top' | 'left'; route?: string; adminOnly?: boolean };
type RawTour = { id: string; icon: ReactNode; steps: RawStep[] };

const TOURS_RAW: RawTour[] = [
  {
    id: 'onboarding',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    steps: [
      { target: '_modal_', titleKey: 'tour.onboarding.step0.title', contentKey: 'tour.onboarding.step0.content', modal: true },
      { target: 'sidebar-logo', titleKey: 'tour.onboarding.step1.title', contentKey: 'tour.onboarding.step1.content', placement: 'right' },
      { target: 'nav-dashboard', titleKey: 'tour.onboarding.step2.title', contentKey: 'tour.onboarding.step2.content', placement: 'right', route: '/dashboard' },
      { target: 'nav-feed', titleKey: 'tour.onboarding.step3.title', contentKey: 'tour.onboarding.step3.content', placement: 'right', route: '/feed' },
      { target: 'nav-notifications', titleKey: 'tour.onboarding.step4.title', contentKey: 'tour.onboarding.step4.content', placement: 'right', route: '/notifications' },
      { target: 'nav-children', titleKey: 'tour.onboarding.step5.title', contentKey: 'tour.onboarding.step5.content', placement: 'right', route: '/children' },
      { target: 'nav-parent', titleKey: 'tour.onboarding.step6.title', contentKey: 'tour.onboarding.step6.content', placement: 'right', route: '/parent' },
      { target: 'nav-nannies', titleKey: 'tour.onboarding.step7.title', contentKey: 'tour.onboarding.step7.content', placement: 'right', route: '/nannies' },
      { target: 'nav-activites', titleKey: 'tour.onboarding.step8.title', contentKey: 'tour.onboarding.step8.content', placement: 'right', route: '/activites' },
      { target: 'nav-reports', titleKey: 'tour.onboarding.step9.title', contentKey: 'tour.onboarding.step9.content', placement: 'right', route: '/reports' },
      { target: 'nav-assistant', titleKey: 'tour.onboarding.step10.title', contentKey: 'tour.onboarding.step10.content', placement: 'right', route: '/assistant' },
      { target: 'nav-presence-sheets', titleKey: 'tour.onboarding.step11.title', contentKey: 'tour.onboarding.step11.content', placement: 'right', route: '/presence-sheets' },
      { target: 'nav-messages', titleKey: 'tour.onboarding.step12.title', contentKey: 'tour.onboarding.step12.content', placement: 'right', route: '/messages' },
      { target: 'nav-payment-history', titleKey: 'tour.onboarding.step13.title', contentKey: 'tour.onboarding.step13.content', placement: 'right', route: '/payment-history' },
      { target: 'nav-subscription', titleKey: 'tour.onboarding.step14.title', contentKey: 'tour.onboarding.step14.content', placement: 'right', route: '/subscription', adminOnly: true },
      { target: 'nav-settings', titleKey: 'tour.onboarding.step15.title', contentKey: 'tour.onboarding.step15.content', placement: 'right', route: '/settings' },
      { target: '_modal_', titleKey: 'tour.onboarding.step16.title', contentKey: 'tour.onboarding.step16.content', modal: true },
    ],
  },
  {
    id: 'add-nanny',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
    steps: [
      { target: '_modal_', titleKey: 'tour.add-nanny.step0.title', contentKey: 'tour.add-nanny.step0.content', modal: true },
      { target: 'nav-nannies', titleKey: 'tour.add-nanny.step1.title', contentKey: 'tour.add-nanny.step1.content', placement: 'right', route: '/nannies' },
      { target: 'btn-add-nanny', titleKey: 'tour.add-nanny.step2.title', contentKey: 'tour.add-nanny.step2.content', placement: 'bottom' },
      { target: 'nanny-form-identity', titleKey: 'tour.add-nanny.step3.title', contentKey: 'tour.add-nanny.step3.content', placement: 'bottom' },
      { target: 'nanny-form-availability', titleKey: 'tour.add-nanny.step4.title', contentKey: 'tour.add-nanny.step4.content', placement: 'bottom' },
      { target: 'nanny-form-address', titleKey: 'tour.add-nanny.step5.title', contentKey: 'tour.add-nanny.step5.content', placement: 'bottom' },
      { target: 'nanny-form-credentials', titleKey: 'tour.add-nanny.step6.title', contentKey: 'tour.add-nanny.step6.content', placement: 'bottom' },
    ],
  },
  {
    id: 'add-parent',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
    steps: [
      { target: '_modal_', titleKey: 'tour.add-parent.step0.title', contentKey: 'tour.add-parent.step0.content', modal: true },
      { target: 'nav-parent', titleKey: 'tour.add-parent.step1.title', contentKey: 'tour.add-parent.step1.content', placement: 'right', route: '/parent' },
      { target: 'btn-add-parent', titleKey: 'tour.add-parent.step2.title', contentKey: 'tour.add-parent.step2.content', placement: 'bottom' },
      { target: 'parent-form-identity', titleKey: 'tour.add-parent.step3.title', contentKey: 'tour.add-parent.step3.content', placement: 'bottom' },
      { target: 'parent-form-email', titleKey: 'tour.add-parent.step4.title', contentKey: 'tour.add-parent.step4.content', placement: 'bottom' },
      { target: 'parent-form-address', titleKey: 'tour.add-parent.step5.title', contentKey: 'tour.add-parent.step5.content', placement: 'bottom' },
      { target: 'parent-form-password', titleKey: 'tour.add-parent.step6.title', contentKey: 'tour.add-parent.step6.content', placement: 'bottom' },
      { target: '_modal_', titleKey: 'tour.add-parent.step7.title', contentKey: 'tour.add-parent.step7.content', modal: true },
    ],
  },
  {
    id: 'add-child',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
    steps: [
      { target: '_modal_', titleKey: 'tour.add-child.step0.title', contentKey: 'tour.add-child.step0.content', modal: true },
      { target: 'nav-children', titleKey: 'tour.add-child.step1.title', contentKey: 'tour.add-child.step1.content', placement: 'right', route: '/children' },
      { target: 'btn-add-child', titleKey: 'tour.add-child.step2.title', contentKey: 'tour.add-child.step2.content', placement: 'bottom' },
      { target: 'child-form-info', titleKey: 'tour.add-child.step3.title', contentKey: 'tour.add-child.step3.content', placement: 'bottom' },
      { target: 'child-form-parent', titleKey: 'tour.add-child.step4.title', contentKey: 'tour.add-child.step4.content', placement: 'bottom' },
      { target: 'child-form-medical', titleKey: 'tour.add-child.step5.title', contentKey: 'tour.add-child.step5.content', placement: 'bottom' },
      { target: '_modal_', titleKey: 'tour.add-child.step6.title', contentKey: 'tour.add-child.step6.content', modal: true },
    ],
  },
  {
    id: 'planning',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
    steps: [
      { target: '_modal_', titleKey: 'tour.planning.step0.title', contentKey: 'tour.planning.step0.content', modal: true },
      { target: 'nav-dashboard', titleKey: 'tour.planning.step1.title', contentKey: 'tour.planning.step1.content', placement: 'right', route: '/dashboard' },
      { target: 'planning-calendar', titleKey: 'tour.planning.step2.title', contentKey: 'tour.planning.step2.content', placement: 'bottom', route: '/mon-planning' },
      { target: '_modal_', titleKey: 'tour.planning.step3.title', contentKey: 'tour.planning.step3.content', modal: true },
      { target: 'nav-activites', titleKey: 'tour.planning.step4.title', contentKey: 'tour.planning.step4.content', placement: 'right', route: '/activites' },
    ],
  },
  {
    id: 'presence-sheets',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
    steps: [
      { target: '_modal_', titleKey: 'tour.presence-sheets.step0.title', contentKey: 'tour.presence-sheets.step0.content', modal: true },
      { target: 'nav-presence-sheets', titleKey: 'tour.presence-sheets.step1.title', contentKey: 'tour.presence-sheets.step1.content', placement: 'right', route: '/presence-sheets' },
      { target: 'presence-sheets-new', titleKey: 'tour.presence-sheets.step2.title', contentKey: 'tour.presence-sheets.step2.content', placement: 'bottom' },
      { target: 'presence-sheets-empty', titleKey: 'tour.presence-sheets.step3.title', contentKey: 'tour.presence-sheets.step3.content', placement: 'bottom' },
      { target: 'presence-sheet-save', titleKey: 'tour.presence-sheets.step4.title', contentKey: 'tour.presence-sheets.step4.content', placement: 'bottom' },
      { target: 'presence-sheet-send', titleKey: 'tour.presence-sheets.step5.title', contentKey: 'tour.presence-sheets.step5.content', placement: 'bottom' },
      { target: 'presence-sheet-sign', titleKey: 'tour.presence-sheets.step6.title', contentKey: 'tour.presence-sheets.step6.content', placement: 'bottom' },
      { target: 'presence-sheet-pdf', titleKey: 'tour.presence-sheets.step7.title', contentKey: 'tour.presence-sheets.step7.content', placement: 'bottom' },
      { target: '_modal_', titleKey: 'tour.presence-sheets.step8.title', contentKey: 'tour.presence-sheets.step8.content', modal: true },
    ],
  },
  {
    id: 'messaging',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>,
    steps: [
      { target: '_modal_', titleKey: 'tour.messaging.step0.title', contentKey: 'tour.messaging.step0.content', modal: true },
      { target: 'nav-messages', titleKey: 'tour.messaging.step1.title', contentKey: 'tour.messaging.step1.content', placement: 'right', route: '/messages' },
      { target: 'msg-conv-list', titleKey: 'tour.messaging.step2.title', contentKey: 'tour.messaging.step2.content', placement: 'bottom' },
      { target: 'msg-new-btn', titleKey: 'tour.messaging.step3.title', contentKey: 'tour.messaging.step3.content', placement: 'bottom' },
      { target: 'msg-avatar-status', titleKey: 'tour.messaging.step4.title', contentKey: 'tour.messaging.step4.content', placement: 'right' },
      { target: 'msg-input', titleKey: 'tour.messaging.step5.title', contentKey: 'tour.messaging.step5.content', placement: 'top' },
      { target: 'msg-typing-indicator', titleKey: 'tour.messaging.step6.title', contentKey: 'tour.messaging.step6.content', placement: 'top' },
      { target: 'msg-action-hint', titleKey: 'tour.messaging.step7.title', contentKey: 'tour.messaging.step7.content', placement: 'right' },

    ],
  },
  {
    id: 'feed-reports',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>,
    steps: [
      { target: '_modal_', titleKey: 'tour.feed-reports.step0.title', contentKey: 'tour.feed-reports.step0.content', modal: true },
      { target: 'nav-feed', titleKey: 'tour.feed-reports.step1.title', contentKey: 'tour.feed-reports.step1.content', placement: 'right', route: '/feed' },
      { target: 'feed-compose', titleKey: 'tour.feed-reports.step2.title', contentKey: 'tour.feed-reports.step2.content', placement: 'bottom' },
      { target: 'feed-publish-btn', titleKey: 'tour.feed-reports.step3.title', contentKey: 'tour.feed-reports.step3.content', placement: 'top' },
      { target: '_modal_', titleKey: 'tour.feed-reports.step4.title', contentKey: 'tour.feed-reports.step4.content', modal: true },
    ],
  },
];

/* ───── Provider ───── */

export function TutorialProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const { t } = useI18n();
  const isAdmin = user && typeof user.role === 'string' && (user.role === 'admin' || user.role.toLowerCase().includes('super'));
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const pendingRoute = useRef<string | null>(null);

  const isActive = activeTour !== null;

  // Resolve all i18n keys into Tour objects
  const TOURS: Tour[] = useMemo(() => TOURS_RAW.map(raw => ({
    id: raw.id,
    icon: raw.icon,
    name: t(`tour.${raw.id}.name`),
    description: t(`tour.${raw.id}.description`),
    steps: raw.steps.map(s => ({
      target: s.target,
      title: t(s.titleKey),
      content: t(s.contentKey),
      ...(s.modal !== undefined && { modal: s.modal }),
      ...(s.placement !== undefined && { placement: s.placement }),
      ...(s.route !== undefined && { route: s.route }),
      ...(s.adminOnly !== undefined && { adminOnly: s.adminOnly }),
    })),
  })), [t]);

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
    const firstRoute = tour.steps[0]?.route;
    if (firstRoute && location.pathname !== firstRoute) {
      navigate(firstRoute);
    }
  }, [TOURS, navigate, location.pathname, isAdmin]);

  const goToStep = useCallback((index: number) => {
    if (!activeTour || index < 0 || index >= activeTour.steps.length) return;
    const step = activeTour.steps[index];
    if (!step) return;

    const doSet = () => {
      setCurrentStep(index);
      window.dispatchEvent(new CustomEvent('tutorial:step', { detail: { target: step.target, tourId: activeTour.id } }));
    };

    if (step.route && location.pathname !== step.route) {
      pendingRoute.current = step.route;
      navigate(step.route);
      setTimeout(() => {
        doSet();
        pendingRoute.current = null;
      }, 140);
    } else {
      doSet();
    }
  }, [activeTour, navigate, location.pathname]);

  const stopTour = useCallback(() => {
    setActiveTour(null);
    setCurrentStep(0);
    pendingRoute.current = null;
    setShowMenu(true);
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStep >= activeTour.steps.length - 1) {
      const tourId = activeTour.id;
      fetch('/api/user/tutorial-completed', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId }),
      }).catch(() => { /* ignore */ });
      if (user) {
        const prev = user.tutorialCompleted || [];
        if (!prev.includes(tourId)) {
          const next = [...prev, tourId];
          setUser({ ...user, tutorialCompleted: next });
          try { localStorage.setItem('tutorial_completed', JSON.stringify(next)); } catch { /* ignore */ }
        }
      }
      setActiveTour(null);
      setCurrentStep(0);
      pendingRoute.current = null;
      setShowMenu(true);
      return;
    }
    const nextIdx = currentStep + 1;
    const nextStep = activeTour.steps[nextIdx];
    const nextRoute = nextStep?.route;
    if (nextRoute && location.pathname !== nextRoute) {
      pendingRoute.current = nextRoute;
      navigate(nextRoute);
      setTimeout(() => {
        setCurrentStep(nextIdx);
        window.dispatchEvent(new CustomEvent('tutorial:step', { detail: { target: nextStep?.target, tourId: activeTour.id } }));
        pendingRoute.current = null;
      }, 100);
    } else {
      setCurrentStep(nextIdx);
      window.dispatchEvent(new CustomEvent('tutorial:step', { detail: { target: nextStep?.target, tourId: activeTour.id } }));
    }
  }, [activeTour, currentStep, location.pathname, navigate, user, setUser]);

  const prevStep = useCallback(() => {
    if (!activeTour || currentStep <= 0) return;
    const prevIdx = currentStep - 1;
    const prevRoute = activeTour.steps[prevIdx]?.route;
    if (prevRoute && location.pathname !== prevRoute) {
      navigate(prevRoute);
      setTimeout(() => setCurrentStep(prevIdx), 100);
    } else {
      setCurrentStep(prevIdx);
    }
  }, [activeTour, currentStep, location.pathname, navigate]);

  const toggleMenu = useCallback(() => setShowMenu(v => !v), []);
  const closeMenu = useCallback(() => setShowMenu(false), []);

  useEffect(() => {
    if (!user) return;
    if (user.tutorialSeen) return;
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
      goToStep,
      stopTour,
      toggleMenu,
      closeMenu,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}
