import { createContext } from 'react';
import type { ReactNode } from 'react';

export interface TutorialStep {
  target: string;
  title: string;
  content: string;
  route?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  modal?: boolean;
  adminOnly?: boolean;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  steps: TutorialStep[];
}

export interface TutorialContextValue {
  tours: Tour[];
  activeTour: Tour | null;
  currentStep: number;
  isActive: boolean;
  showMenu: boolean;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  stopTour: () => void;
  toggleMenu: () => void;
  closeMenu: () => void;
}

export const TutorialContext = createContext<TutorialContextValue | null>(null);
