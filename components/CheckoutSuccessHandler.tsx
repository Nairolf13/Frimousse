import { useEffect, useState } from 'react';

export default function CheckoutSuccessHandler() {
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    if (!qs.get('checkout')) return;
    if (qs.get('checkout') !== 'success') return;
    if (status !== 'idle') return;

    (async () => {
      setShowModal(true);
      setStatus('loading');
      try {
        const sessionId = qs.get('session_id');
        if (sessionId) {
          try {
            await fetch(`/subscriptions/complete-checkout-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
          } catch (e) {
            console.warn('complete-checkout-session failed', e);
          }
        }
        setStatus('ok');
      } catch (e) {
        console.error('Error during checkout finalization', e);
        setStatus('error');
      }
    })();
  }, [status]);

  function handleClose() {
    setShowModal(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.pathname + url.search);
    } catch {
      // ignore
    }
  }

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" />
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6 mx-4">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#0b5566]"></div>
            <h3 className="text-lg font-bold text-[#0b5566]">Finalisation en cours</h3>
            <p className="text-sm text-gray-600 text-center">Nous finalisons votre abonnement. Patientez un instant.</p>
          </div>
        )}

        {status === 'ok' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl">✓</div>
            <h3 className="text-lg font-bold text-[#0b5566]">Abonnement confirmé</h3>
            <p className="text-sm text-gray-700 text-center">Merci — votre abonnement a bien été pris en compte.</p>
            <div className="w-full mt-2">
              <button onClick={handleClose} className="w-full py-2 border rounded">Fermer</button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl">✕</div>
            <h3 className="text-lg font-bold text-red-600">Erreur</h3>
            <p className="text-sm text-gray-700 text-center">Un problème est survenu lors de la finalisation de votre abonnement. Les webhooks peuvent encore arriver.</p>
            <div className="w-full mt-2">
              <button onClick={handleClose} className="w-full py-2 border rounded">Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
