import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

function getApiUrl(): string {
  try {
    const meta = import.meta as unknown as { env?: { VITE_API_URL?: string } };
    return (meta.env && meta.env.VITE_API_URL) ? meta.env.VITE_API_URL : 'http://localhost:4000';
  } catch {
    return 'http://localhost:4000';
  }
}
const API_URL = getApiUrl();
// Ensure we have an absolute URL. If API_URL is empty or relative, fallback to the frontend host with port 4000.
const resolvedApi = (() => {
  if (API_URL && /https?:\/\//.test(API_URL)) return API_URL.replace(/\/$/, '');
  try {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4000`;
  } catch {
    return 'http://localhost:4000';
  }
})();
console.debug('[ParentDashboard] API base:', resolvedApi);

type Child = { id: string; name: string; group?: string };
type Parent = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null; children?: { child: Child }[]; createdAt?: string | null };
type AdminStats = { parentsCount: number; childrenCount: number; presentToday: number };
type AdminData = { stats: AdminStats; parents: Parent[] } | null;
type AuthUser = { role?: string | null; nannyId?: string | null } | null;

const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const authUser = user as AuthUser;
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminData>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (authUser && (authUser.role === 'admin' || authUser.nannyId)) {
          const res = await fetchWithRefresh(`${resolvedApi}/api/parent/admin`, { credentials: 'include' });
          const text = await res.text();
          let json: unknown = null;
          try { json = text ? JSON.parse(text) : null; } catch { json = text; }
          if (!res.ok) {
            const message = typeof json === 'string' ? json : (json && typeof json === 'object' && 'error' in (json as Record<string, unknown>) ? String((json as Record<string, unknown>).error) : 'Erreur serveur');
            throw new Error(message);
          }
          setAdminData(json as AdminData);
        } else {
          const res = await fetchWithRefresh(`${resolvedApi}/api/parent/children`, { credentials: 'include' });
          const text = await res.text();
          let json: unknown = null;
          try { json = text ? JSON.parse(text) : null; } catch { json = text; }
          if (!res.ok) {
            const message = typeof json === 'string' ? json : (json && typeof json === 'object' && 'error' in (json as Record<string, unknown>) ? String((json as Record<string, unknown>).error) : 'Erreur serveur');
            throw new Error(message);
          }
          setChildren(json as Child[]);
        }
      } catch (err: unknown) {
        console.error('ParentDashboard load error', err);
        if (err instanceof Error) setError(err.message);
        else setError('Erreur');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authUser]);

  if (loading) return <div className="p-6">Chargement...</div>;
  if (error) return <div className="p-6 text-red-600">Erreur: {error}</div>;


  if (authUser && (authUser.role === 'admin' || authUser.nannyId)) {
  const stats: AdminStats = adminData?.stats ?? { parentsCount: 0, childrenCount: 0, presentToday: 0 };
  const parents: Parent[] = adminData?.parents ?? [];
    return (
      <div className="relative z-0 min-h-screen bg-[#fcfcff] p-4 md:pl-64 w-full">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 w-full">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">Gestion des parents</h1>
              <div className="text-gray-400 text-base">Gérez les comptes parents, contacts et enfants associés.</div>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => { setAdding(true); setFormError(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' }); }} className="bg-green-500 text-black font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-green-600 transition h-[60px]">Ajouter un parent</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 w-full">
            <div className="flex flex-col md:flex-row gap-3 w-full">
              <input type="text" placeholder="Rechercher par nom, email..." className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-base w-full md:w-64" />
            </div>
            <div className="flex gap-2 items-center">
              <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px] h-[60px] justify-center">
                <div className="text-xs text-gray-400">Total</div>
                <div className="text-lg font-bold text-gray-900">{stats.parentsCount}</div>
              </div>
              <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px] h-[60px] justify-center">
                <div className="text-xs text-gray-400">Enfants</div>
                <div className="text-lg font-bold text-gray-900">{stats.childrenCount}</div>
              </div>
              <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px] h-[60px] justify-center">
                <div className="text-xs text-gray-400">Présents</div>
                <div className="text-lg font-bold text-gray-900">{stats.presentToday}</div>
              </div>
            </div>
          </div>

          {adding && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setFormError(null);
              if (!form.firstName || !form.lastName || !form.email) {
                setFormError('Les champs Prénom, Nom et Email sont requis');
                return;
              }
              if ((form.password || form.confirmPassword) && form.password !== form.confirmPassword) {
                setFormError("Les mots de passe ne correspondent pas");
                return;
              }
                try {
                // Build payload for admin endpoint. Password is optional: if omitted, backend will
                // create the parent and send an invitation token by email.
                type CreateParentPayload = { name: string; email: string; phone?: string; password?: string };
                const payload: CreateParentPayload = { name: `${form.firstName} ${form.lastName}`, email: form.email, phone: form.phone };
                if (form.password) payload.password = form.password;

                const res = await fetchWithRefresh(`${resolvedApi}/api/parent`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload)
                });
                let resBody: unknown = null;
                try { resBody = await res.json(); } catch (e) { }
                if (!res.ok) {
                  const bodyText = typeof resBody === 'object' && resBody !== null && 'message' in (resBody as Record<string, unknown>) ? String((resBody as Record<string, unknown>).message) : (await res.text());
                  throw new Error(bodyText || 'Erreur création parent');
                }
                setSuccessMessage(form.password ? 'Parent créé avec mot de passe.' : 'Parent créé — une invitation a été envoyée.');
                const reload = await fetchWithRefresh(`${resolvedApi}/api/parent/admin`, { credentials: 'include' });
                const reloadText = await reload.text();
                let json: unknown = null;
                try { json = reloadText ? JSON.parse(reloadText) : null; } catch { json = reloadText; }
                setAdminData(json as AdminData);
                setAdding(false);
                // clear form and errors
                setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
              } catch (err: unknown) {
                console.error('Add parent failed', err);
                if (err instanceof Error) setFormError(err.message);
                else setFormError('Erreur');
              }
            }} className="mb-6 bg-white rounded-2xl shadow p-4 md:p-6 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              <input name="firstName" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Prénom" required className="border rounded px-3 py-2 text-xs md:text-base" />
              <input name="lastName" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Nom" required className="border rounded px-3 py-2 text-xs md:text-base" />
              <input name="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" required className="border rounded px-3 py-2 text-xs md:text-base" />
              <input name="phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Téléphone" className="border rounded px-3 py-2 text-xs md:text-base" />
              <input name="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mot de passe (laisser vide pour envoyer une invitation)" className="border rounded px-3 py-2 text-xs md:text-base" />
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirmer le mot de passe" className="border rounded px-3 py-2 text-xs md:text-base" />
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="bg-green-500 text-black px-4 py-2 rounded hover:bg-green-600 transition">Ajouter</button>
                <button type="button" onClick={() => setAdding(false)} className="bg-gray-300 px-4 py-2 rounded">Annuler</button>
              </div>
              {formError && <div className="text-red-600 md:col-span-2">{formError}</div>}
              {successMessage && <div className="text-green-600 md:col-span-2">{successMessage}</div>}
            </form>
          )}

          <div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
              {(() => {
                const cardColors = ['bg-blue-50','bg-yellow-50','bg-purple-50','bg-green-50','bg-pink-50','bg-orange-50'];
                return parents.map((p, idx) => {
                  const color = cardColors[idx % cardColors.length];
                  return (
                    <div key={p.id} className={`rounded-2xl shadow ${color} relative flex flex-col min-h-[220px] h-full p-5`}>
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-lg shadow border border-gray-100 font-bold text-purple-700">{((p.firstName && p.lastName) ? `${p.firstName[0] || ''}${p.lastName[0] || ''}` : (p.name || 'U')).toUpperCase().slice(0,2)}</div>
                            <div className="truncate flex-1">
                              <div className="font-semibold text-gray-900 truncate">{(p.firstName || p.lastName) ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : (p.name || '—')}</div>
                                <div className="text-sm text-gray-600 mt-1">{
                                  p.email ? (
                                    <a href={`mailto:${p.email}`} className="text-blue-600 hover:underline" aria-label={`Envoyer un e-mail à ${p.email}`}>{p.email}</a>
                                  ) : '—'
                                }</div>
                                <div className="text-sm text-gray-600">{
                                  p.phone ? (
                                    <a href={`tel:${p.phone.replace(/\s+/g, '')}`} className="text-blue-600 hover:underline" aria-label={`Appeler ${p.phone}`}>{p.phone}</a>
                                  ) : '—'
                                }</div>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">Enfants</div>
                            <div className="flex flex-wrap gap-2">
                              {(p.children || []).map(c => (
                                <div key={c.child.id} className="px-2 py-1 bg-white text-blue-700 rounded text-sm border">
                                  <div className="font-medium">{c.child.name}</div>
                                  <div className="text-xs text-gray-500">Groupe: {c.child.group || '—'}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="text-xs text-gray-500">Statut: <span className="text-green-600 font-semibold">Actif</span></div>
                        <div className="flex gap-2">
                          <button className="bg-white border border-gray-200 text-gray-500 hover:text-yellow-500 rounded-full p-2" title="Voir">👁️</button>
                          <button className="bg-white border border-gray-200 text-gray-500 hover:text-blue-500 rounded-full p-2" title="Éditer">✏️</button>
                          <button className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full p-2" title="Plus">⋯</button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Parent view (their children)
  return (
    <div className="min-h-screen bg-[#fcfcff] p-2 sm:p-4 md:pl-64 w-full">
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
        <h1 className="text-2xl font-semibold mb-4">Espace Parent</h1>
      {children.length === 0 ? (
        <div>Aucun enfant trouvé.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map(child => (
            <div key={child.id} className="p-4 border rounded shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{child.name}</div>
                  <div className="text-sm text-gray-500">Groupe: {child.group}</div>
                </div>
                <div className="flex space-x-2">
                  <button className="btn" onClick={() => navigate(`/parent/child/${child.id}/schedule`)}>
                    Planning
                  </button>
                  <button className="btn" onClick={() => navigate(`/parent/child/${child.id}/reports`)}>
                    Rapports
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default ParentDashboard;
