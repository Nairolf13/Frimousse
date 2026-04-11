import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useI18n } from '../src/lib/useI18n';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const steps = [
    t('notfound.step1', "Vérification de l'origine du problème"),
    t('notfound.step2', 'Correction au lieu de la redirection'),
    t('notfound.step3', 'Vérification de l\'inventaire des pages concernées'),
    t('notfound.step4', 'Mise en place d\'un correctif si nécessaire'),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">

        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-8 tracking-wide uppercase">
          {t('notfound.breadcrumb', 'Erreur 404 — Page introuvable')}
        </p>

        {/* Hero */}
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-12 mb-16">

          {/* Left — text */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              {t('notfound.title', 'Cette page\nn\'existe pas.')}
            </h1>
            <p className="text-gray-500 text-base leading-relaxed max-w-md">
              {t('notfound.description', 'Il est possible que le lien que vous avez suivi soit cassé, que la page ait été déplacée, ou que l\'URL ait été saisie avec une faute de frappe. Dans tous les cas, vous serez informé et tout sera résolu.')}
            </p>
          </div>

          {/* Right — 404 illustration */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            {/* Big 404 */}
            <span
              className="text-[9rem] font-extrabold leading-none select-none"
              style={{ color: '#e8f4f8', letterSpacing: '-4px' }}
              aria-hidden="true"
            >
              404
            </span>
            {/* Cards row */}
            <div className="flex items-stretch gap-3">
              {/* Lien introuvable card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex flex-col items-center gap-2 w-40">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-xs">{t('notfound.card.title', 'Lien introuvable')}</p>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">{t('notfound.card.desc', 'Cette page n\'existe plus ou a été déplacée.')}</p>
                </div>
              </div>
              {/* Incident connu card */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-lg p-4 flex flex-col items-center gap-2 w-40">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-amber-800 text-xs">{t('notfound.badge', 'Incident connu')}</p>
                  <p className="text-amber-600 text-xs mt-1 leading-relaxed">{t('notfound.badge.desc', 'Notre équipe est déjà informée.')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps card */}
        <div className="w-full max-w-xl bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-10">
          <p className="text-sm font-semibold text-gray-700 mb-4">{t('notfound.steps.title', 'Ce que fait notre équipe')}</p>
          <ul className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-brand-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('notfound.cta.home', 'Retour à l\'accueil')}
          </button>
          <button
            onClick={() => navigate('/support')}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {t('notfound.cta.support', 'Nous contacter')}
          </button>
        </div>

        {/* Support note */}
        <div className="mt-10 w-full max-w-xl bg-brand-50 border border-brand-100 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-brand-800 text-sm">{t('notfound.support.title', 'Besoin d\'aide immédiate ?')}</p>
            <p className="text-brand-600 text-xs mt-1 leading-relaxed">
              {t('notfound.support.desc', 'Notre support répond sous 24h en semaine.')}
            </p>
          </div>
          <button
            onClick={() => navigate('/support')}
            className="ml-auto flex-shrink-0 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
          >
            {t('notfound.support.cta', 'Écrire')}
          </button>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
