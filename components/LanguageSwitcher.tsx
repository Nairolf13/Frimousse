type Lang = { code: string; label: string; short?: string; emoji?: string };

const LANGS: Lang[] = [
  { code: 'fr', label: 'Français', short: 'FR', emoji: '🇫🇷' },
  { code: 'en', label: 'English', short: 'EN', emoji: '🇬🇧' },
  { code: 'es', label: 'Español', short: 'ES', emoji: '🇪🇸' },
  { code: 'it', label: 'Italiano', short: 'IT', emoji: '🇮🇹' },
];

export default function LanguageSwitcher({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}) {
  return (
    <div className={`w-full overflow-hidden ${className || ''}`}>
      <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-2" role="tablist" aria-label="Language selector">
        {LANGS.map((l) => {
          const active = l.code === value;
          return (
            <button
              key={l.code}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(l.code)}
              aria-label={l.label}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition w-full md:w-auto justify-center min-w-0 ${active ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-white/60'}`}
              title={l.label}
            >
              <span className="text-base leading-none w-5 flex-shrink-0" aria-hidden>
                {l.emoji}
              </span>
              <span className="hidden sm:inline-block truncate max-w-[8rem] md:max-w-[10rem]">{l.label}</span>
              <span className="sm:hidden text-xs text-gray-500">{l.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
