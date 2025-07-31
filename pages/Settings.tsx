import { useState } from 'react';

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('fr');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Paramètres</h1>
      <div className="space-y-6">
        {/* Notifications */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow p-4">
          <div>
            <div className="font-semibold text-gray-800">Notifications par email</div>
            <div className="text-gray-500 text-sm">Recevoir un email pour chaque nouveau rapport ou affectation</div>
          </div>
          <input type="checkbox" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} className="w-5 h-5" />
        </div>
        {/* Dark mode */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow p-4">
          <div>
            <div className="font-semibold text-gray-800">Mode sombre</div>
            <div className="text-gray-500 text-sm">Activer le thème sombre pour l'application</div>
          </div>
          <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} className="w-5 h-5" />
        </div>
        {/* Language */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow p-4">
          <div>
            <div className="font-semibold text-gray-800">Langue</div>
            <div className="text-gray-500 text-sm">Choisissez la langue de l'interface</div>
          </div>
          <select value={language} onChange={e => setLanguage(e.target.value)} className="border rounded px-2 py-1">
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
        {/* Account management */}
        <div className="flex flex-col bg-white rounded-xl shadow p-4">
          <div className="font-semibold text-gray-800 mb-2">Gestion du compte</div>
          <button className="bg-red-500 text-white px-4 py-2 rounded mb-2" onClick={() => setShowPasswordModal(true)}>Changer le mot de passe</button>
          <button className="bg-gray-300 text-gray-700 px-4 py-2 rounded" onClick={async () => {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
          }}>Se déconnecter</button>
        </div>
        {/* Password change modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <form
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs flex flex-col items-center relative"
              onSubmit={async e => {
                e.preventDefault();
                setPasswordError('');
                setPasswordSuccess('');
                if (!oldPassword || !newPassword || !confirmPassword) {
                  setPasswordError('Tous les champs sont requis');
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setPasswordError('Les mots de passe ne correspondent pas');
                  return;
                }
                const res = await fetch('/api/user/password', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ oldPassword, newPassword }),
                });
                if (!res.ok) {
                  setPasswordError('Erreur lors du changement de mot de passe');
                  return;
                }
                setPasswordSuccess('Mot de passe changé avec succès !');
                setTimeout(() => {
                  setShowPasswordModal(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordSuccess('');
                }, 1200);
              }}
            >
              <button type="button" onClick={() => setShowPasswordModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
              <h2 className="text-lg font-bold mb-4 text-center">Changer le mot de passe</h2>
              <input type="password" placeholder="Ancien mot de passe" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="border rounded px-2 py-1 mb-2 w-full" required />
              <input type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="border rounded px-2 py-1 mb-2 w-full" required />
              <input type="password" placeholder="Confirmer le nouveau mot de passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="border rounded px-2 py-1 mb-2 w-full" required />
              <div className="flex gap-2 w-full">
                <button type="submit" className="bg-red-500 text-white px-3 py-1 rounded w-full">Valider</button>
                <button type="button" className="bg-gray-300 px-3 py-1 rounded w-full" onClick={() => setShowPasswordModal(false)}>Annuler</button>
              </div>
              {passwordError && <div className="text-red-600 text-xs mt-2 text-center w-full">{passwordError}</div>}
              {passwordSuccess && <div className="text-green-600 text-xs mt-2 text-center w-full">{passwordSuccess}</div>}
            </form>
          </div>
        )}
        {/* Data export */}
        <div className="flex flex-col bg-white rounded-xl shadow p-4">
          <div className="font-semibold text-gray-800 mb-2">Exportation des données</div>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">Exporter les rapports</button>
          <button className="bg-blue-500 text-white px-4 py-2 rounded mt-2">Exporter les affectations</button>
        </div>
      </div>
    </div>
  );
}
