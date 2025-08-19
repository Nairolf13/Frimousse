export default function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose}></div>
      <div className="bg-white rounded-lg p-6 z-10 max-w-lg mx-4">
        <h3 className="text-lg font-semibold mb-2">Bienvenue sur Frimousse</h3>
        <p className="text-sm text-gray-600 mb-4">Commencez par compléter votre profil, configurer le centre ou découvrir le planning.</p>
        <div className="flex gap-2">
          <button onClick={() => { onClose(); window.location.href = '/settings'; }} className="px-3 py-2 bg-emerald-600 text-white rounded">Compléter profil</button>
          <button onClick={() => { onClose(); window.location.href = '/settings'; }} className="px-3 py-2 bg-gray-200 rounded">Configurer centre</button>
          <button onClick={() => { onClose(); window.location.href = '/dashboard'; }} className="px-3 py-2 bg-gray-200 rounded">Découvrir planning</button>
        </div>
        <div className="mt-4 text-right">
          <button onClick={onClose} className="text-sm text-gray-500">Fermer</button>
        </div>
        <div className="mt-3 text-center">
          <button onClick={() => { onClose(); window.location.href = '/guide-demarrage'; }} className="text-sm text-emerald-600">Voir le tutoriel</button>
        </div>
      </div>
    </div>
  );
}
