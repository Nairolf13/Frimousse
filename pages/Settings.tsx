import { useState, useEffect } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { subscribeToPush, unsubscribeFromPush } from '../src/utils/pushSubscribe';

const API_URL = import.meta.env.VITE_API_URL;

type ParentForm = { role: 'parent'; id: string; firstName: string; lastName: string; email: string; phone?: string };
type NannyForm = { role: 'nanny'; id: string; name: string; availability?: string; experience?: number; contact?: string; email?: string; birthDate?: string };
type UserForm = { role: 'user'; id: string; name?: string; email?: string };
type ProfileForm = ParentForm | NannyForm | UserForm | null;

function ProfileEditor({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [form, setForm] = useState<ProfileForm>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const resUser = await fetchWithRefresh(`${API_URL}/user/me`, { credentials: 'include' });
        if (!resUser.ok) throw new Error('Impossible de récupérer l\'utilisateur');
        const u = await resUser.json();

        if (u && u.parentId) {
          const r = await fetchWithRefresh(`${API_URL}/parent/${encodeURIComponent(String(u.parentId))}`, { credentials: 'include' });
          if (r.ok) {
            const p = await r.json();
            if (!mounted) return;
            setForm({ role: 'parent', id: p.id, firstName: p.firstName || '', lastName: p.lastName || '', email: p.email || '', phone: p.phone || '' });
            return;
          }
        }

        if (u && u.nannyId) {
          const r = await fetchWithRefresh(`${API_URL}/nannies/${encodeURIComponent(String(u.nannyId))}`, { credentials: 'include' });
          if (r.ok) {
            const n = await r.json();
            if (!mounted) return;
            setForm({ role: 'nanny', id: n.id, name: n.name || '', availability: n.availability || '', experience: n.experience || 0, contact: n.contact || '', email: n.email || '', birthDate: n.birthDate ? new Date(n.birthDate).toISOString().slice(0,10) : '' });
            return;
          }
        }

        // If no parentId is present but we have the user's email, try to find a parent record by email
        if (u && u.email) {
          try {
            const r2 = await fetchWithRefresh(`${API_URL}/parent/by-email?email=${encodeURIComponent(String(u.email))}`, { credentials: 'include' });
            if (r2.ok) {
              const p2 = await r2.json();
              if (!mounted) return;
              setForm({ role: 'parent', id: p2.id, firstName: p2.firstName || '', lastName: p2.lastName || '', email: p2.email || '', phone: p2.phone || '' });
              return;
            }
          } catch {
            // ignore and continue to fallback
          }
        }

        if (u) setForm({ role: 'user', id: u.id, name: u.name || '', email: u.email || '' });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleChange = (key: string, value: unknown) => setForm(f => f ? ({ ...f, [key]: value } as ProfileForm) : f);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    try {
  if (form.role === 'parent') {
        const body = { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone };
        const res = await fetchWithRefresh(`${API_URL}/parent/${encodeURIComponent(String(form.id))}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Erreur lors de la mise à jour du parent');
      } else if (form.role === 'nanny') {
        const body = { name: form.name, availability: form.availability, experience: Number(form.experience || 0), contact: form.contact, email: form.email, birthDate: form.birthDate || null };
        const res = await fetchWithRefresh(`${API_URL}/nannies/${encodeURIComponent(String(form.id))}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Erreur lors de la mise à jour de la nounou');
      } else {
        const body = { name: form.name, email: form.email };
        const res = await fetchWithRefresh(`${API_URL}/user/me`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || 'Impossible de mettre à jour l\'utilisateur');
        }
      }
      // If password fields are filled, attempt a password change
      if (oldPassword || newPassword || confirmPassword) {
        if (!oldPassword || !newPassword || !confirmPassword) throw new Error('Tous les champs de mot de passe sont requis');
        if (newPassword !== confirmPassword) throw new Error('Les mots de passe ne correspondent pas');
        const pres = await fetchWithRefresh(`${API_URL}/user/password`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
        if (!pres.ok) throw new Error('Erreur lors du changement de mot de passe');
      }
      onClose();
      window.location.reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-6">Chargement...</div>;
  if (!form) return <div className="text-sm text-gray-500">Aucune donnée de profil disponible</div>;

  return (
    <div>
      {form.role === 'parent' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Prénom</label>
            <input className="border rounded px-2 py-1 w-full" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Nom</label>
            <input className="border rounded px-2 py-1 w-full" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input className="border rounded px-2 py-1 w-full" value={form.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Téléphone</label>
            <input className="border rounded px-2 py-1 w-full" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
          </div>
        </div>
      )}
      {form.role === 'nanny' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Nom</label>
            <input className="border rounded px-2 py-1 w-full" value={form.name} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input className="border rounded px-2 py-1 w-full" value={form.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Contact</label>
            <input className="border rounded px-2 py-1 w-full" value={form.contact} onChange={e => handleChange('contact', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Expérience (années)</label>
            <input type="number" className="border rounded px-2 py-1 w-full" value={String(form.experience || 0)} onChange={e => handleChange('experience', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm">Disponibilité</label>
            <select className="border rounded px-2 py-1 w-full" value={form.availability} onChange={e => handleChange('availability', e.target.value)}>
              <option value="Disponible">Disponible</option>
              <option value="En_congé">En congé</option>
              <option value="Maladie">Maladie</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Date de naissance</label>
            <input type="date" className="border rounded px-2 py-1 w-full" value={form.birthDate || ''} onChange={e => handleChange('birthDate', e.target.value)} />
          </div>
        </div>
      )}
      {form.role === 'user' && (
        <div>
          <label className="text-sm">Nom</label>
          <input className="border rounded px-2 py-1 w-full" value={form.name} onChange={e => handleChange('name', e.target.value)} />
          <label className="text-sm mt-2">Email</label>
          <input className="border rounded px-2 py-1 w-full" value={form.email} onChange={e => handleChange('email', e.target.value)} />
        </div>
      )}

      <div className="border-t mt-4 pt-4">
        <h3 className="font-semibold mb-2">Changer le mot de passe</h3>
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
          <div>
            <label className="text-sm">Ancien mot de passe</label>
            <input type="password" className="border rounded px-2 py-1 w-full" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Nouveau mot de passe</label>
            <input type="password" className="border rounded px-2 py-1 w-full" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Confirmer le nouveau mot de passe</label>
            <input type="password" className="border rounded px-2 py-1 w-full" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        <button className="bg-gray-200 px-3 py-2 rounded" onClick={onClose}>Annuler</button>
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );
}

function ProfileButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="flex-1 bg-[#a9ddf2] text-[#0b5566] px-4 py-2 rounded-lg font-medium hover:bg-[#cfeef9]" onClick={() => setOpen(true)}>Modifier le profil</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 backdrop-blur-sm overflow-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl relative">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
            <h2 className="text-lg font-bold mb-4 text-center">Modifier mon profil</h2>
            <ProfileEditor onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  // store server-side subscription id for this device (returned by /api/push-subscriptions/save)
  const [pushSubId, setPushSubId] = useState<string | null>(null);
  const [language, setLanguage] = useState('fr');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    // detect existing subscription
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushEnabled(false);
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return setPushEnabled(false);
        const sub = await reg.pushManager.getSubscription();
        setPushEnabled(!!sub);
        // try to fetch server-side subscription id for current user
        try {
          const me = await fetchWithRefresh('/api/push-subscriptions/me', { credentials: 'include' });
          if (me.ok) {
            const data = await me.json();
            // try to match subscription by endpoint if we have a client-side sub
            if (sub && Array.isArray(data.subscriptions)) {
              type SubRecord = { id?: string; subscription?: { endpoint?: string } | null };
              const found = (data.subscriptions as SubRecord[]).find((s) => s.subscription && s.subscription.endpoint === sub.endpoint);
              if (found && found.id) setPushSubId(found.id);
            }
          }
  } catch { /* ignore */ }
      } catch {
        setPushEnabled(false);
      }
    })();
  }, []);

  return (
    <div className="relative z-0 min-h-screen bg-[#fcfcff] p-4 md:pl-64 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">Paramètres</h1>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between">
              <div>
                <div className="font-semibold text-gray-800">Notifications par email</div>
                <div className="text-gray-500 text-sm">Recevoir un email pour chaque nouveau rapport ou affectation</div>
              </div>
              <div className="mt-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#a9ddf2] rounded-full peer peer-checked:bg-[#0b5566] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">Langue</div>
                <div className="text-gray-500 text-sm">Choisissez la langue de l'interface</div>
              </div>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="border rounded-lg px-3 py-2 bg-white text-gray-700">
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 md:col-span-2 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">Notifications push</div>
                <div className="text-gray-500 text-sm">Recevoir des notifications sur votre navigateur (rappels et annonces)</div>
              </div>
              <div>
                <button
                  className={`px-4 py-2 rounded font-medium ${pushEnabled ? 'bg-red-200 text-red-700' : 'bg-[#a9ddf2] text-[#0b5566]'}`}
                  onClick={async () => {
                    try {
                      if (pushEnabled) {
                        // client-side unsubscribe
                        try { await unsubscribeFromPush(); } catch { /* ignore client-side unsubscribe errors */ }
                        // notify backend to remove any server-side subscriptions for this user
                        try {
                          if (pushSubId) {
                            await fetchWithRefresh(`/api/push-subscriptions/${encodeURIComponent(pushSubId)}`, { method: 'DELETE', credentials: 'include' });
                          } else {
                            await fetchWithRefresh('/api/push-subscriptions/me', { method: 'DELETE', credentials: 'include' });
                          }
                        } catch (be) {
                          console.error('Failed to delete subscription on server', be);
                        }
                        setPushEnabled(false);
                        setPushSubId(null);
                        return;
                      }
                      const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                      if (!vapid) return alert('VAPID_PUBLIC_KEY non défini en front');
                      const { subscription } = await subscribeToPush(vapid);
                      // send to backend and capture id
                      try {
                        const res = await fetchWithRefresh('/api/push-subscriptions/save', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription }) });
                        if (res.ok) {
                          const json = await res.json();
                          if (json && json.id) setPushSubId(json.id);
                        }
                      } catch { /* ignore backend save errors */ }
                      setPushEnabled(true);
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : String(e);
                      alert('Impossible d\'activer les notifications push: ' + msg);
                    }
                  }}
                >
                  {pushEnabled ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 md:col-span-2">
              <div className="font-semibold text-gray-800 mb-4">Gestion du compte</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="flex-1 bg-[#fcdcdf] text-[#7a2a2a] font-semibold rounded-lg px-4 py-2 shadow hover:bg-[#fbd5d8]" onClick={() => setShowDeleteModal(true)}>Supprimer le compte</button>
                <ProfileButton />
              </div>
            </div>

            

                <div className="md:col-span-2">
              <button className="w-full bg-[#a9ddf2] text-[#0b5566] px-4 py-2 rounded-lg font-medium hover:bg-[#cfeef9]" style={{marginTop: '8px'}} onClick={async () => {
                // Use a relative path so the browser sends cookies to the same origin (Vite dev proxy)
                try { await fetchWithRefresh('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch { /* continue */ }
                // Clear client storage
                try { localStorage.clear(); } catch { /* ignore */ }
                try { sessionStorage.clear(); } catch { /* ignore */ }
                // Clear non-httpOnly cookies accessible from JS
                try {
                  document.cookie.split(';').forEach(function(c) {
                    const name = c.split('=')[0].trim();
                    // expire cookie for current path
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                    // also try to clear for domain
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
                  });
                } catch { /* ignore */ }
                // Redirect to login
                window.location.href = '/login';
               }}>Se déconnecter</button>
            </div>
          </div>
        </div>
        
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs flex flex-col items-center relative">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
              <h2 className="text-lg font-bold mb-4 text-center text-red-700">Confirmer la suppression du compte</h2>
              <p className="text-gray-700 text-center mb-4">Voulez-vous vraiment supprimer votre compte ? Cette action est irréversible et toutes vos données seront perdues.</p>
              <div className="flex gap-2 w-full">
                <button type="button" className="bg-gray-300 px-3 py-1 rounded w-full" onClick={() => setShowDeleteModal(false)}>Annuler</button>
                <button type="button" className="bg-red-500 text-white px-3 py-1 rounded w-full font-bold" onClick={async () => {
                  setDeleteError('');
                  const res = await fetchWithRefresh(`${API_URL}/user`, {
                    method: 'DELETE',
                    credentials: 'include',
                  });
                  if (!res.ok) {
                    setDeleteError('Erreur lors de la suppression du compte');
                    return;
                  }
                  setShowDeleteModal(false);
                  window.location.href = '/login';
                }}>Supprimer</button>
              </div>
              {deleteError && <div className="text-red-600 text-xs mt-2 text-center w-full">{deleteError}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
