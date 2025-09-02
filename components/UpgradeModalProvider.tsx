import { useEffect, useState } from 'react';

export default function UpgradeModalProvider() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    function handler(e: Event) {
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div role="dialog" aria-modal="true" className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
        <h3 className="text-lg font-bold text-[#0b5566] mb-2">Abonnement requis</h3>
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => { window.location.href = '/pricing'; }} className="px-4 py-2 bg-[#0b5566] text-white rounded-md">Aller aux offres</button>
          <button onClick={() => setOpen(false)} className="px-4 py-2 border rounded-md">Fermer</button>
        </div>
      </div>
    </div>
  );
}
