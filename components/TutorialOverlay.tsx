import { useEffect, useState, useRef, useCallback } from 'react';
import { useTutorial } from '../src/context/useTutorial';

/* ───── Tooltip position calculator ───── */
function getTooltipStyle(rect: DOMRect, placement: string, tooltipW: number, tooltipH: number) {
  const gap = 12;
  const padding = 16;
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = rect.top - tooltipH - gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case 'bottom':
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - gap;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + gap;
      break;
  }

  // Clamp to viewport
  if (left < padding) left = padding;
  if (left + tooltipW > window.innerWidth - padding) left = window.innerWidth - tooltipW - padding;
  if (top < padding) top = padding;
  if (top + tooltipH > window.innerHeight - padding) top = window.innerHeight - tooltipH - padding;

  return { top, left };
}

/* ───── Spotlight + Tooltip component ───── */
export default function TutorialOverlay() {
  const { activeTour, currentStep, isActive, nextStep, prevStep, stopTour } = useTutorial();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ w: 340, h: 200 });

  const step = activeTour?.steps[currentStep];
  const [targetMissing, setTargetMissing] = useState(false);
  const isNativeModal = !!(step?.modal || step?.target === '_modal_');
  const isModal = isNativeModal || targetMissing;
  const totalSteps = activeTour?.steps.length || 0;

  // Find and track the target element
  const updateTarget = useCallback((retrying = false) => {
    if (!step || step.modal || step.target === '_modal_') {
      setTargetRect(null);
      setTargetMissing(false);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      setTargetMissing(false);
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setTargetRect(el.getBoundingClientRect()), 400);
      }
    } else {
      const isMobile = window.innerWidth < 768;
      if (isMobile && !retrying) {
        // Réessaie après que le menu mobile soit ouvert
        setTimeout(() => updateTarget(true), 350);
      } else {
        setTargetRect(null);
        setTargetMissing(true);
      }
    }
  }, [step]);

  // Reset targetMissing on step change
  useEffect(() => {
    setTargetMissing(false);
  }, [currentStep]);

  // Sur mobile : ouvre le menu uniquement pour l'étape sidebar-logo, ferme pour tout le reste
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;
    if (!isNativeModal && step?.target === 'sidebar-logo') {
      window.dispatchEvent(new CustomEvent('tutorial:open-mobile-menu'));
    } else {
      window.dispatchEvent(new CustomEvent('tutorial:close-mobile-menu'));
    }
  }, [currentStep, isNativeModal, step?.target]);

  useEffect(() => {
    if (!isActive) return;
    // Small delay to allow DOM to settle after navigation
    const timer = setTimeout(updateTarget, 150);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [isActive, currentStep, updateTarget]);

  // Measure tooltip
  useEffect(() => {
    if (tooltipRef.current) {
      const { offsetWidth, offsetHeight } = tooltipRef.current;
      setTooltipSize({ w: offsetWidth, h: offsetHeight });
    }
  }, [currentStep, isActive]);

  if (!isActive || !step) return null;

  const placement = step.placement || 'bottom';

  // Modal step — bottom sheet sur mobile, centré sur desktop
  if (isModal) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center" onClick={stopTour}>
        <div className="absolute inset-0 bg-black/40 tutorial-backdrop-in" />
        <div
          className="relative z-10 bg-white md:rounded-3xl rounded-t-3xl shadow-2xl max-w-md w-full mx-0 md:mx-4 p-6 md:p-8 tutorial-card-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 bg-brand-500' : i < currentStep ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">{step.title}</h3>
          <p className="text-gray-600 leading-relaxed text-center mb-8">{step.content}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={stopTour}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Quitter
            </button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Retour
                </button>
              )}
              <button
                onClick={nextStep}
                className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 transition-all hover:-translate-y-0.5"
              >
                {currentStep === totalSteps - 1 ? 'Terminer' : 'Suivant'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Targeted step — spotlight + tooltip
  const tooltipPos = targetRect
    ? getTooltipStyle(targetRect, placement, tooltipSize.w, tooltipSize.h)
    : { top: window.innerHeight / 2 - tooltipSize.h / 2, left: window.innerWidth / 2 - tooltipSize.w / 2 };

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Overlay with hole */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={stopTour}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)"
          mask="url(#tutorial-mask)"
          className="tutorial-backdrop-in"
        />
      </svg>

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="absolute border-2 border-brand-400 rounded-xl pointer-events-none tutorial-ring-pulse"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Tooltip — bottom sheet sur mobile, positionné sur desktop */}
      <div
        ref={tooltipRef}
        className="pointer-events-auto tutorial-card-in bg-white shadow-2xl border border-gray-100 p-5
          fixed bottom-0 left-0 right-0 rounded-t-3xl
          md:absolute md:bottom-auto md:left-auto md:right-auto md:rounded-2xl md:max-w-sm md:w-[340px]"
        style={{ ...(window.innerWidth >= 768 ? { top: tooltipPos.top, left: tooltipPos.left } : {}) }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-5 bg-brand-500' : i < currentStep ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
          <span className="ml-auto text-xs text-gray-400 font-medium">{currentStep + 1}/{totalSteps}</span>
        </div>

        <h4 className="text-base font-bold text-gray-900 mb-2">{step.title}</h4>
        <p className="text-sm text-gray-600 leading-relaxed mb-5">{step.content}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={stopTour}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Quitter
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Retour
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl transition-all"
            >
              {currentStep === totalSteps - 1 ? 'Terminer' : 'Suivant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
