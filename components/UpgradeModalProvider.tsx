import { useEffect, useState } from 'react';
import { HiOutlineClock, HiOutlineCreditCard } from 'react-icons/hi';

export default function UpgradeModalProvider() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const isTrialExpired = message.toLowerCase().includes('essai') || message.toLowerCase().includes('expiré') || message.toLowerCase().includes('abonnement');

  useEffect(() => {
    function handler(e: Event) {
      if (window.location.pathname === '/subscription') return;
      // @ts-expect-error - event detail typing
      const detail = e?.detail || {};
      setMessage(detail.message || 'Cette action nécessite un abonnement.');
      setOpen(true);
    }
    window.addEventListener('subscription:required', handler as EventListener);
    return () => window.removeEventListener('subscription:required', handler as EventListener);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-50 mx-auto mb-4">
          {isTrialExpired
            ? <HiOutlineClock className="w-7 h-7 text-orange-400" />
            : <HiOutlineCreditCard className="w-7 h-7 text-brand-400" />
          }
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {isTrialExpired ? 'Période d\'essai expirée' : 'Abonnement requis'}
        </h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <p className="text-xs text-gray-400 mb-6">Choisissez un plan pour continuer à utiliser Frimousse et accéder à toutes vos données.</p>
        <button
          onClick={() => { setOpen(false); window.location.href = '/subscription'; }}
          className="w-full bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
        >
          <HiOutlineCreditCard className="w-4 h-4" />
          Choisir un abonnement
        </button>
      </div>
    </div>
  );
}
