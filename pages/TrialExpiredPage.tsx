import { useNavigate } from 'react-router-dom';
import { useI18n } from '../src/lib/useI18n';

export default function TrialExpiredPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('trial.expired.title', 'Votre essai gratuit est terminé')}
        </h1>
        <p className="text-gray-500 leading-relaxed mb-8">
          {t('trial.expired.description', 'Votre période d\'essai de 15 jours a expiré. Choisissez un plan pour continuer à utiliser toutes les fonctionnalités de Frimousse sans interruption.')}
        </p>

        {/* Features reminder */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left space-y-2">
          {[
            t('trial.expired.feature1', 'Gestion des nounous, enfants et parents'),
            t('trial.expired.feature2', 'Messagerie et notifications'),
            t('trial.expired.feature3', 'Feuilles de présence & rapports'),
            t('trial.expired.feature4', 'Planning et activités'),
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/subscription')}
          className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-brand-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all mb-3"
        >
          {t('trial.expired.cta', 'Choisir un plan →')}
        </button>
        <button
          onClick={() => navigate('/tarifs')}
          className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
        >
          {t('trial.expired.see_pricing', 'Voir les tarifs')}
        </button>

      </div>
    </div>
  );
}
