import { useEffect, useState, useRef, useCallback } from 'react';
import { useTutorial } from '../src/context/useTutorial';

/* ─── helpers ─── */

/** Returns true when the step target lives inside the mobile menu */
function targetNeedsMobileMenu(target: string) {
  return target === 'sidebar-logo' || target.startsWith('nav-');
}

/** Returns true when the step target is only informational (not meant to be clicked) */
function isInfoOnlyTarget(target: string) {
  return target === 'sidebar-logo';
}

/* ─── Tooltip position (desktop) ─── */
function getDesktopTooltipStyle(
  rect: DOMRect,
  placement: string,
  tooltipW: number,
  tooltipH: number
) {
  const gap = 16;
  const pad = 12;
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
    default:
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + gap;
      // force right edge for special rightmost targets (context menu)
      if (left + tooltipW > window.innerWidth - pad) {
        left = window.innerWidth - tooltipW - pad;
      }
      break;
  }

  if (left < pad) left = pad;
  if (left + tooltipW > window.innerWidth - pad) left = window.innerWidth - tooltipW - pad;
  if (top < pad) top = pad;
  if (top + tooltipH > window.innerHeight - pad) top = window.innerHeight - tooltipH - pad;

  return { top, left };
}

/* ─── Arrow (desktop tooltip) ─── */
function TooltipArrow({ placement }: { placement: string }) {
  const base = 'absolute w-3 h-3 bg-card rotate-45';
  switch (placement) {
    case 'right':
      return <div className={`${base} -left-[7px] top-1/2 -translate-y-1/2 border-l border-b border-border-default`} />;
    case 'left':
      return <div className={`${base} -right-[7px] top-1/2 -translate-y-1/2 border-r border-t border-border-default`} />;
    case 'bottom':
      return <div className={`${base} -top-[7px] left-1/2 -translate-x-1/2 border-t border-l border-border-default`} />;
    case 'top':
      return <div className={`${base} -bottom-[7px] left-1/2 -translate-x-1/2 border-b border-r border-border-default`} />;
    default:
      return null;
  }
}

/* ─── Progress dots / bar ─── */
function Progress({ total, current, animate = false }: { total: number; current: number; animate?: boolean }) {
  if (total > 6) {
    return (
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1 bg-input rounded-full overflow-hidden">
          <div
            className={`h-full bg-brand-500 rounded-full ${animate ? 'transition-all duration-500' : ''}`}
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted font-semibold tabular-nums">{current + 1}/{total}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full ${animate ? 'transition-all duration-300' : ''} ${
            i === current ? 'w-5 bg-brand-500' : i < current ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-input'
          }`}
        />
      ))}
      <span className="ml-auto text-xs text-muted font-medium">{current + 1}/{total}</span>
    </div>
  );
}

/* ─── Tap indicator ─── */
function TapIndicator({ rect, fromTop }: { rect: DOMRect; fromTop: boolean }) {
  const CARD_H = 220;
  const GAP = 10;

  // Place the label between the card edge and the target element
  if (fromTop) {
    // card is at top → indicator below target
    const top = rect.bottom + GAP;
    if (top + 44 > window.innerHeight - CARD_H - 16) return null;
    return (
      <div
        className="absolute pointer-events-none tutorial-indicator-in flex flex-col items-center gap-1"
        style={{ top, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }}
      >
        <svg className="w-5 h-5 text-brand-400 tutorial-bounce-y" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </div>
    );
  }
  // card is at bottom → indicator above target
  const top = rect.top - GAP - 44;
  if (top < CARD_H + 16) return null;
  return (
    <div
      className="absolute pointer-events-none tutorial-indicator-in flex flex-col items-center gap-1"
      style={{ top, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }}
    >
      <svg className="w-5 h-5 text-brand-400" style={{ animation: 'tutorial-bounce-y 1.2s ease-in-out infinite', transform: 'rotate(180deg)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </div>
  );
}

/* ─── Desktop click indicator ─── */
function DesktopClickIndicator({ rect, placement }: { rect: DOMRect; placement: string }) {
  const GAP = 8;

  const opposite =
    placement === 'right' ? 'left' :
    placement === 'left' ? 'right' :
    placement === 'bottom' ? 'top' : 'bottom';

  if (opposite === 'bottom') {
    const top = rect.bottom + GAP;
    if (top + 28 > window.innerHeight - 60) return null;
    return (
      <div className="absolute pointer-events-none tutorial-indicator-in flex flex-col items-center"
        style={{ top, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }}>
        <svg className="w-4 h-4 text-white tutorial-bounce-y" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </div>
    );
  }
  if (opposite === 'top') {
    const top = rect.top - GAP - 20;
    if (top < 8) return null;
    return (
      <div className="absolute pointer-events-none tutorial-indicator-in flex flex-col items-center"
        style={{ top, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }}>
        <svg className="w-4 h-4 text-white" style={{ animation: 'tutorial-bounce-y 1.2s ease-in-out infinite', transform: 'rotate(180deg)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </div>
    );
  }
  if (opposite === 'right') {
    const left = rect.right + GAP;
    if (left + 24 > window.innerWidth - 8) return null;
    return (
      <div className="absolute pointer-events-none tutorial-indicator-in flex items-center"
        style={{ top: rect.top + rect.height / 2, left, transform: 'translateY(-50%)' }}>
        <svg className="w-4 h-4 text-white tutorial-bounce-x" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </div>
    );
  }
  // left
  const right = window.innerWidth - rect.left + GAP;
  if (right + 24 > window.innerWidth - 8) return null;
  return (
    <div className="absolute pointer-events-none tutorial-indicator-in flex items-center"
      style={{ top: rect.top + rect.height / 2, right, transform: 'translateY(-50%)' }}>
      <svg className="w-4 h-4 text-white" style={{ animation: 'tutorial-bounce-x 1.2s ease-in-out infinite', transform: 'rotate(180deg)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </div>
  );
}

/* ─── Nav buttons ─── */
function NavButtons({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onStop,
  compact = false,
}: {
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
  compact?: boolean;
}) {
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;
  return (
    <div className={`flex items-center justify-between ${compact ? 'mt-4' : 'mt-6 md:mt-8'}`}>
      <button
        onClick={onStop}
        className={`text-muted hover:text-secondary transition-colors font-medium ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {isFirst ? 'Passer le tutoriel' : 'Quitter'}
      </button>
      <div className="flex items-center gap-2">
        {currentStep > 0 && (
          <button
            onClick={onPrev}
            className={`font-medium text-secondary hover:text-primary transition-colors px-3 py-2 rounded-xl hover:bg-input ${compact ? 'text-xs' : 'text-sm'}`}
          >
            ← Retour
          </button>
        )}
        <button
          onClick={onNext}
          className={`font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all ${
            compact ? 'text-xs px-4 py-2.5' : 'text-sm px-5 py-3'
          } ${
            isLast
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-500/30'
              : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-500/30'
          }`}
        >
          {isLast ? '✓ Terminer' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function TutorialOverlay() {
  const { activeTour, currentStep, isActive, nextStep, prevStep, stopTour } = useTutorial();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ w: 340, h: 220 });
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = activeTour?.steps[currentStep];
  const [targetMissing, setTargetMissing] = useState(false);
  const isNativeModal = !!(step?.modal || step?.target === '_modal_');
  const isModal = isNativeModal || targetMissing;
  const totalSteps = activeTour?.steps.length || 0;
  const placement = step?.placement || 'bottom';

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  /* ── Find the first truly visible element with a given data-tour ── */
  const findVisibleElement = useCallback((target: string): Element | null => {
    const candidates = document.querySelectorAll(`[data-tour="${target}"]`);
    for (const el of Array.from(candidates)) {
      // Walk up ancestors to check none is visibility:hidden or display:none
      let node: Element | null = el;
      let hidden = false;
      while (node) {
        const style = window.getComputedStyle(node);
        if (style.visibility === 'hidden' || style.display === 'none') { hidden = true; break; }
        node = node.parentElement;
      }
      if (!hidden) return el;
    }
    return null;
  }, []);

  /* ── Read current rect without any side effects ── */
  const readRect = useCallback(() => {
    if (!step || isNativeModal) return;
    const el = findVisibleElement(step.target);
    if (el) setTargetRect(el.getBoundingClientRect());
  }, [step, isNativeModal, findVisibleElement]);

  /* ── Scroll target into view (called once per step, no listener) ── */
  const scrollToTarget = useCallback((el: Element) => {
    // Find nearest scrollable ancestor (e.g. Sidebar nav or MobileMenu nav)
    // Check both overflow and overflowY since Tailwind uses overflow-y-auto
    let scrollParent: Element | null = el.parentElement;
    while (scrollParent && scrollParent !== document.body) {
      const style = window.getComputedStyle(scrollParent);
      const ov = style.overflow;
      const ovY = style.overflowY;
      if (ov === 'auto' || ov === 'scroll' || ovY === 'auto' || ovY === 'scroll') break;
      scrollParent = scrollParent.parentElement;
    }

    if (scrollParent && scrollParent !== document.body) {
      const elRect = el.getBoundingClientRect();
      const parentRect = scrollParent.getBoundingClientRect();
      // Check visibility relative to the scroll container (not the window)
      const isVisible = elRect.top >= parentRect.top && elRect.bottom <= parentRect.bottom;
      if (!isVisible) {
        // Scroll to center the element inside the container
        const elTopRelativeToParent = elRect.top - parentRect.top + scrollParent.scrollTop;
        const center = elTopRelativeToParent - scrollParent.clientHeight / 2 + elRect.height / 2;
        scrollParent.scrollTo({ top: Math.max(0, center), behavior: 'smooth' });
      }
    } else {
      const rect = el.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Force scroll into view for cases where the element is present but parent logic doesn't trigger
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, []);

  /* ── Find target, scroll once, then read final rect ── */
  const findAndSnapTarget = useCallback((attempt = 0) => {
    if (!step || isNativeModal) {
      setTargetRect(null);
      setTargetMissing(false);
      setCardReady(true);
      return;
    }
    const el = findVisibleElement(step.target);
    if (el) {
      setTargetMissing(false);
      scrollToTarget(el);
      // wait for scroll to settle before reading the final rect and showing the card
      setTimeout(() => {
        const finalEl = findVisibleElement(step.target);
        if (finalEl) {
          setTargetRect(finalEl.getBoundingClientRect());
          setCardReady(true);
        }
      }, 320);
    } else {
      if (attempt < 7) {
        const delay = [80, 150, 300, 500, 700, 900, 1200][attempt];
        retryRef.current = setTimeout(() => findAndSnapTarget(attempt + 1), delay);
      } else {
        setTargetRect(null);
        setTargetMissing(true);
        setCardReady(true);
      }
    }
  }, [step, isNativeModal, scrollToTarget, findVisibleElement]);

  /* ── Reset on step change ── */
  useEffect(() => {
    setTargetMissing(false);
    setTargetRect(null);
    setCardReady(false);
    if (retryRef.current) clearTimeout(retryRef.current);
  }, [currentStep]);

  /* ── Mobile menu management ── */
  useEffect(() => {
    if (!isActive || !step || isNativeModal) return;
    const mobile = window.innerWidth < 768;
    if (!mobile) return;
    if (targetNeedsMobileMenu(step.target)) {
      window.dispatchEvent(new CustomEvent('tutorial:open-mobile-menu'));
    } else {
      window.dispatchEvent(new CustomEvent('tutorial:close-mobile-menu'));
    }
  }, [currentStep, isActive, isNativeModal, step]);

  /* ── Trigger find+snap once per step ── */
  useEffect(() => {
    if (!isActive) return;
    const mobile = window.innerWidth < 768;
    const menuDelay = mobile && step && targetNeedsMobileMenu(step.target) ? 200 : 0;
    const timer = setTimeout(() => findAndSnapTarget(0), 120 + menuDelay);
    return () => {
      clearTimeout(timer);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [isActive, currentStep, findAndSnapTarget, step]);

  /* ── Update rect on resize only (no scroll listener → no loop) ── */
  useEffect(() => {
    if (!isActive) return;
    window.addEventListener('resize', readRect);
    return () => window.removeEventListener('resize', readRect);
  }, [isActive, readRect]);

  /* ── Measure tooltip ── */
  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipSize({ w: tooltipRef.current.offsetWidth, h: tooltipRef.current.offsetHeight });
    }
  }, [currentStep, isActive]);

  if (!isActive || !step) return null;

  /* ────────────────────────────────────────
     MODAL step
  ──────────────────────────────────────── */
  if (isModal) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/50 tutorial-backdrop-in" />
        <div
          className="relative z-10 bg-card md:rounded-3xl rounded-t-3xl shadow-2xl max-w-md w-full mx-0 md:mx-4 px-8 pt-8 md:px-12 md:pt-10 tutorial-card-in"
          style={{ paddingBottom: 'max(2rem, calc(2rem + env(safe-area-inset-bottom, 0px)))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-input rounded-full mx-auto mb-5 md:hidden" />
          <Progress total={totalSteps} current={currentStep} animate />
          <h3 className="text-xl font-bold text-primary mb-2.5 text-center">{step.title}</h3>
          <p className="text-secondary leading-relaxed text-center">{step.content}</p>
          <NavButtons
            currentStep={currentStep}
            totalSteps={totalSteps}
            onPrev={prevStep}
            onNext={nextStep}
            onStop={stopTour}
          />
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────
     TARGETED step
  ──────────────────────────────────────── */
  const SPOTLIGHT_PAD = 10;
  const CARD_H_ESTIMATE = tooltipSize.h || 220;

  // Determine mobile card direction:
  // If the target is in the lower 45% of the screen → card slides from top
  // Also check that the card wouldn't cover the target from top
  let cardFromTop = false;
  if (isMobile && targetRect) {
    const targetMidY = targetRect.top + targetRect.height / 2;
    const screenH = window.innerHeight;
    if (targetMidY > screenH * 0.45) {
      // target in bottom half → card from top
      // but make sure target isn't ALSO near the top (very tall menu, etc.)
      if (targetRect.top > CARD_H_ESTIMATE + 40) {
        cardFromTop = true;
      }
    }
  }

  // Desktop tooltip position
  const tooltipPos = targetRect
    ? getDesktopTooltipStyle(targetRect, placement, tooltipSize.w, tooltipSize.h)
    : { top: window.innerHeight / 2 - tooltipSize.h / 2, left: window.innerWidth / 2 - tooltipSize.w / 2 };

  const showClickIndicator = !isInfoOnlyTarget(step.target);

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">

      {/* ── Dark backdrop with spotlight cutout ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - SPOTLIGHT_PAD}
                y={targetRect.top - SPOTLIGHT_PAD}
                width={targetRect.width + SPOTLIGHT_PAD * 2}
                height={targetRect.height + SPOTLIGHT_PAD * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tutorial-mask)"
          className="tutorial-backdrop-in"
        />
      </svg>

      {/* ── Spotlight glow layers ── */}
      {targetRect && (
        <>
          {/* Beacon ripple */}
          <div
            className="absolute rounded-xl tutorial-beacon pointer-events-none"
            style={{
              top: targetRect.top - SPOTLIGHT_PAD,
              left: targetRect.left - SPOTLIGHT_PAD,
              width: targetRect.width + SPOTLIGHT_PAD * 2,
              height: targetRect.height + SPOTLIGHT_PAD * 2,
              background: 'rgba(47,168,209,0.3)',
            }}
          />
          {/* Pulsing border */}
          <div
            className="absolute rounded-xl pointer-events-none tutorial-ring-pulse"
            style={{
              top: targetRect.top - SPOTLIGHT_PAD,
              left: targetRect.left - SPOTLIGHT_PAD,
              width: targetRect.width + SPOTLIGHT_PAD * 2,
              height: targetRect.height + SPOTLIGHT_PAD * 2,
              border: '2.5px solid rgba(47,168,209,0.9)',
              boxShadow: '0 0 0 0 rgba(47,168,209,0.5), inset 0 0 12px rgba(47,168,209,0.15)',
            }}
          />
        </>
      )}

      {/* ── Click / Tap indicator ── */}
      {targetRect && showClickIndicator && (
        isMobile
          ? <TapIndicator rect={targetRect} fromTop={cardFromTop} />
          : <DesktopClickIndicator rect={targetRect} placement={placement} />
      )}

      {/* ── Tooltip / sheet card ── */}
      <div
        ref={tooltipRef}
        className={`pointer-events-auto bg-card border border-border-default shadow-2xl p-5 md:p-7
          ${isMobile
            ? cardFromTop
              ? 'fixed top-0 left-0 right-0 rounded-b-3xl tutorial-card-up-in'
              : 'fixed bottom-0 left-0 right-0 rounded-t-3xl tutorial-card-in'
            : 'fixed rounded-2xl w-[320px] tutorial-card-in'
          }`}
        style={{
          ...(!isMobile ? { top: tooltipPos.top, left: tooltipPos.left } : {}),
          ...(cardReady ? {} : { display: 'none' }),
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        {isMobile && !cardFromTop && (
          <div className="w-8 h-1 bg-input rounded-full mx-auto mb-4" />
        )}

        {/* Arrow (desktop) */}
        {!isMobile && <TooltipArrow placement={placement} />}

        <Progress total={totalSteps} current={currentStep} />

        <h4 className="text-sm font-bold text-primary mb-1.5">{step.title}</h4>
        <p className="text-xs text-secondary leading-relaxed">{step.content}</p>

        <NavButtons
          currentStep={currentStep}
          totalSteps={totalSteps}
          onPrev={prevStep}
          onNext={nextStep}
          onStop={stopTour}
          compact
        />

        {isMobile && cardFromTop && (
          <div className="w-8 h-1 bg-input rounded-full mx-auto mt-4" />
        )}
      </div>
    </div>
  );
}
