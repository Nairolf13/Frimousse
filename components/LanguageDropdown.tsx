type Lang = { code: string; label: string; nativeLabel: string; emoji: string; description: string };

const LANGS: Lang[] = [
  { code: 'fr', label: 'Français', nativeLabel: 'Français', emoji: '🇫🇷', description: 'Langue par défaut' },
  { code: 'en', label: 'English', nativeLabel: 'English', emoji: '🇬🇧', description: 'Default language' },
  { code: 'es', label: 'Español', nativeLabel: 'Español', emoji: '🇪🇸', description: 'Idioma disponible' },
];

export default function LanguageDropdown({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {LANGS.map((lang) => {
        const isSelected = lang.code === value;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => onChange(lang.code)}
            className={`group w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
              isSelected
                ? 'border-[#0b5566] bg-[#e6f4f7]'
                : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
            }`}
          >
            {/* Flag */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-all ${
              isSelected ? 'bg-white shadow-sm' : 'bg-white'
            }`}>
              {lang.emoji}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm ${isSelected ? 'text-[#0b5566]' : 'text-gray-800'}`}>
                {lang.nativeLabel}
              </div>
              <div className={`text-xs mt-0.5 ${isSelected ? 'text-[#0b5566]/70' : 'text-gray-400'}`}>
                {lang.description}
              </div>
            </div>

            {/* Check */}
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              isSelected
                ? 'bg-[#0b5566] border-[#0b5566]'
                : 'border-gray-300 group-hover:border-gray-400'
            }`}>
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
