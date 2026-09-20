import { useEffect, useRef, useState } from 'react';

// Counts up from 0 to `value` over `duration` ms. Purely cosmetic — falls
// back to the plain value instantly if the user prefers reduced motion.
export default function AnimatedNumber({ value, duration = 600, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, duration]);

  return <>{display}{suffix}</>;
}
