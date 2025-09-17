import { useState, useRef, useEffect } from 'react';

type Lang = { code: string; label: string; emoji: string };

const LANGS: Lang[] = [
  { code: 'fr', label: 'Français', emoji: '🇫🇷' },
  { code: 'en', label: 'English', emoji: '🇬🇧' },
  // { code: 'es', label: 'Español', emoji: '🇪🇸' },
  // { code: 'it', label: 'Italiano', emoji: '🇮🇹' },
];

export default function LanguageDropdown({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: Event) {
      if (!menuRef.current) return;
      const t = e.target as Node | null;
      if (t && menuRef.current.contains(t)) return;
      if (t && btnRef.current && btnRef.current.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc as EventListener);
    document.addEventListener('touchstart', onDoc as EventListener);
    document.addEventListener('keydown', onKey as EventListener);
    return () => {
      document.removeEventListener('mousedown', onDoc as EventListener);
      document.removeEventListener('touchstart', onDoc as EventListener);
      document.removeEventListener('keydown', onKey as EventListener);
    };
  }, []);

  const current = LANGS.find((l) => l.code === value) || LANGS[0];

  return (
    <div className="relative inline-block text-left w-full md:w-auto">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full md:w-auto flex items-center gap-2 justify-between px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700 hover:bg-gray-200"
      >
        <span className="flex items-center gap-2">
          <span className="text-base w-5">{current.emoji}</span>
          <span className="truncate max-w-[10rem]">{current.label}</span>
        </span>
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div ref={menuRef} className="absolute right-0 mt-2 w-full md:w-48 bg-white border rounded-md shadow-lg z-50">
          <div className="py-1">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => { onChange(l.code); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${l.code === value ? 'font-semibold' : ''}`}
              >
                <span className="w-5">{l.emoji}</span>
                <span className="truncate">{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
