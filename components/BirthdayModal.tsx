import { useEffect, useRef } from 'react';

type Child = { id: string; name: string; dob: string; photoUrl?: string };

export default function BirthdayModal({ items, open, onClose, centerId }: { items: Child[]; open: boolean; onClose: ()=>void; centerId?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // compute age in years from a birth date string
  const computeAge = (dobStr?: string) => {
    if (!dobStr) return null;
    try {
      const dob = new Date(dobStr);
      if (Number.isNaN(dob.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age;
  } catch { return null; }
  };

  // Robust confetti effect: use refs to hold running flag and timeout id so
  // repeated renders or async timing won't accidentally cancel the loop.
  const confettiRunningRef = useRef(false);
  const confettiTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    confettiRunningRef.current = true;
    // confetti burst: dynamically import so projects without the dependency still build
    (async () => {
      try {
  // prefer the lightweight bundle if available
  // Try the normal package first, then fallback to the browser bundle for more compatibility
  // @vite-ignore
  let mod: unknown = null;
        try {
          mod = await import('canvas-confetti');
          } catch {
          try {
            // fallback: browser bundle has no TS types — expect an error here
            // @ts-expect-error browser-bundle has no types
            // @vite-ignore
            mod = await import('canvas-confetti/dist/confetti.browser.js');
          } catch {
            mod = null;
          }
        }
        if (!mod) return;
        if (!confettiRunningRef.current) return;

        // create has a runtime shape we can type: it accepts an optional canvas and options
        type ConfettiOptions = { resize?: boolean; useWorker?: boolean } & Record<string, unknown>;
        type ConfettiCreate = (canvas?: HTMLCanvasElement | OffscreenCanvas | undefined, opts?: ConfettiOptions) => ( (options?: Record<string, unknown>) => void );
        const create = (mod && typeof mod === 'function' ? mod : (mod && (mod as { default?: unknown }).default) || mod) as unknown as ConfettiCreate;

        // Use the non-worker path to avoid transferable/cloning issues across browsers.
        let myConfettiFn: ((options?: Record<string, unknown>) => void) | null = null;
        try {
          // let the library create and manage its own canvas to avoid transfer/cloning issues
          myConfettiFn = create(undefined, { resize: true, useWorker: false });
        } catch (e) {
          console.error('[BirthdayModal] confetti.create failed:', e);
        }

        if (!myConfettiFn || typeof myConfettiFn !== 'function') {
          // nothing to do — confetti couldn't be created
          return;
        }

        // Fire an initial burst
        try {
          myConfettiFn({ particleCount: 140, spread: 160, origin: { y: 0.6 } });
        } catch (e) {
          console.error('[BirthdayModal] confetti first-fire failed:', e);
        }

        // Use a recursive timeout loop instead of setInterval for better control and cleanup
        const tick = () => {
          if (!confettiRunningRef.current) return;
          try {
            myConfettiFn({ particleCount: 40, spread: 120, origin: { x: Math.random(), y: 0.6 } });
            console.debug('[BirthdayModal] confetti tick');
          } catch (e) {
            console.error('[BirthdayModal] confetti tick error:', e);
          }
          if (confettiRunningRef.current) {
            confettiTimeoutRef.current = window.setTimeout(tick, 1200) as unknown as number;
          }
        };
        // start the recurring ticks
        confettiTimeoutRef.current = window.setTimeout(tick, 1200) as unknown as number;
      } catch (err) {
        // log the error so we can diagnose why animation doesn't run
        console.error('[BirthdayModal] failed to load canvas-confetti:', err);
      }
    })();

    // mark seen in localStorage (avoid repeating)
    if (centerId) {
      const key = `birthday_seen:${centerId}:${new Date().toISOString().slice(0,10)}`;
      try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
    }

    return () => {
      // stop the recurring ticks
      confettiRunningRef.current = false;
      if (confettiTimeoutRef.current !== null) {
        clearTimeout(confettiTimeoutRef.current);
        confettiTimeoutRef.current = null;
      }
    };
  }, [open, centerId]);


  useEffect(() => {
    if (!open) return;
    // focus trap: set focus to close button after open - simple approach
    const el = document.getElementById('birthday-close-btn');
    el?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />

      <div role="dialog" aria-modal="true" aria-label="Célébration anniversaire" className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
        {/* Hero */}
        <div className="h-64 bg-gradient-to-br from-[#f6a21a] to-[#ffd98a] flex flex-col items-center justify-center text-white">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight uppercase text-center">Joyeux Anniversaire</h1>
        </div>

        {/* Content */}
        <div className="bg-white p-6">
          {/* List all birthday children */}
          {items && items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((child) => {
                const initials = (child.name || 'U').split(' ').map(s => s[0]).slice(0,2).join('');
                const age = computeAge(child.dob);
                return (
                  <div key={child.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 shadow-sm bg-white">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#ff6aa1,#ff9b4a)' }}>
                      <span className="text-white font-bold text-lg">{initials}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-extrabold text-[#08323a] truncate">{child.name}</div>
                      <div className="text-sm text-gray-500 truncate">fête {age !== null ? `ses ${age} ans` : 'son anniversaire'} aujourd'hui !</div>
                    </div>

                    <div className="flex-shrink-0">
                      <div className="px-3 py-2 rounded-full bg-gradient-to-br from-[#e68d17] to-[#f7b65d] text-white font-semibold shadow">{age ?? '-'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500">Aucun enfant trouvé pour aujourd'hui.</div>
          )}

          <div className="mt-6">
            <div className="rounded-xl border border-[#f3cda6] bg-gradient-to-br from-[#fff4ed] to-[#fff9f6] p-5 shadow-sm">
              <div className="text-center text-[#b45309] font-semibold mb-2">♡ Message spécial ♡</div>
              <div className="text-sm text-[#6b4b3a]">Nous souhaitons à {items && items.length === 1 ? items[0].name : 'tous les enfants'} une merveilleuse journée remplie de joie, de rires et de beaux souvenirs ! Que cette nouvelle année vous apporte plein de découvertes et de bonheurs.</div>
            </div>
          </div>

          {/* Footer with centered close button */}
          <div className="mt-6 pb-6 flex justify-center">
            <button id="birthday-close-btn" type="button" onClick={onClose} className="px-6 py-2 bg-[#08323a] text-white rounded-lg font-semibold shadow hover:bg-[#0b3b41] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f6a21a]">Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
