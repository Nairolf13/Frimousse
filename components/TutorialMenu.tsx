import { useNavigate } from 'react-router-dom';
import { useTutorial } from '../src/context/useTutorial';
import { useAuth } from '../src/context/AuthContext';
import { useI18n } from '../src/lib/useI18n';

export default function TutorialMenu() {
  const { tours, showMenu, closeMenu, startTour, isActive } = useTutorial();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleClose = () => {
    closeMenu();
    navigate('/settings?section=tutoriels');
  };
  const completed = user?.tutorialCompleted ?? [];

  if (!showMenu || isActive) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm tutorial-backdrop-in" />
      <div
        className="relative z-10 bg-card rounded-t-3xl md:rounded-3xl shadow-2xl max-w-lg w-full mx-0 md:mx-4 overflow-hidden tutorial-card-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden bg-card">
          <div className="w-10 h-1 bg-input rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 md:px-8 py-6 md:py-7 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('settings.tutorials.menu.title', 'Tutoriels')}</h2>
                <p className="text-sm text-white/80">{t('settings.tutorials.menu.subtitle', 'Apprenez à utiliser Frimousse')}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${tours.length > 0 ? (completed.length / tours.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-white/70 font-medium">{completed.length}/{tours.length}</span>
          </div>
        </div>

        {/* Tour list */}
        <div className="p-4 max-h-[55vh] overflow-auto">
          <div className="space-y-2">
            {tours.map(tour => {
              const isDone = completed.includes(tour.id);
              return (
                <button
                  key={tour.id}
                  onClick={() => startTour(tour.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group ${
                    isDone
                      ? 'border-emerald-100 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                      : 'border-border-default bg-card hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isDone ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-600'
                    }`}>
                      {isDone ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      ) : tour.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold text-sm ${isDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-primary'}`}>{tour.name}</h3>
                        {isDone && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded-full">Fait</span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{tour.description}</p>
                    </div>
                    <svg className="w-4 h-4 text-muted group-hover:text-secondary transition-colors flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 safe-area-bottom">
          <p className="text-center text-xs text-muted">
            {t(
              'settings.tutorials.menu.footer',
              'Vous pouvez relancer un tutoriel à tout moment depuis le bouton ? du menu.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
