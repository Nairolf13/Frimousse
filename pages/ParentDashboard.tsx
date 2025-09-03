import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import ParentCard from '../components/ParentCard';
import ChildOptionsModal from '../components/ChildOptionsModal';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

// Using relative /api/* endpoints so requests go through the dev proxy and use the browser origin

type Child = { id: string; name: string; group?: string };
type Parent = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null; children?: { child: Child }[]; createdAt?: string | null };
type AdminStats = { parentsCount: number; childrenCount: number; presentToday: number };
type AdminData = { stats: AdminStats; parents: Parent[] } | null;
type AuthUser = { role?: string | null; nannyId?: string | null } | null;
// more detailed user shape used in this page
type UserInfo = {
  id?: string | null;
  parentId?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  nannyId?: string | null;
} | null;

const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const authUser = user as AuthUser;
  const isAdminView = (u: AuthUser) => {
    if (!u) return false;
    const r = (u.role || '').toLowerCase();
    return r === 'admin' || !!u.nannyId || r.includes('super');
  };
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminData>(null);
  const [parentBilling, setParentBilling] = useState<Record<string, number>>({});
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showChildModal, setShowChildModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [deletingParentId, setDeletingParentId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isAdminView(authUser)) {
          const res = await fetchWithRefresh(`api/parent/admin`, { credentials: 'include' });
          const text = await res.text();
          let json: unknown = null;
          try { json = text ? JSON.parse(text) : null; } catch { json = text; }
          if (!res.ok) {
            // If the user isn't authorized to access the admin endpoint, fall back to the parent view
            if (res.status === 403) {
              const res2 = await fetchWithRefresh(`api/parent/children`, { credentials: 'include' });
              const text2 = await res2.text();
              let json2: unknown = null;
              try { json2 = text2 ? JSON.parse(text2) : null; } catch { json2 = text2; }
              if (!res2.ok) {
                const message2 = typeof json2 === 'string' ? json2 : (json2 && typeof json2 === 'object' && 'error' in (json2 as Record<string, unknown>) ? String((json2 as Record<string, unknown>).error) : 'Erreur serveur');
                throw new Error(message2);
              }
              setChildren(json2 as Child[]);
              setLoading(false);
              return;
            }
            const message = typeof json === 'string' ? json : (json && typeof json === 'object' && 'error' in (json as Record<string, unknown>) ? String((json as Record<string, unknown>).error) : 'Erreur serveur');
            throw new Error(message);
          }
          setAdminData(json as AdminData);
          try {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const payload = (json && typeof json === 'object') ? (json as AdminData) : null;
            const parentsList: Parent[] = payload?.parents ?? [];
            const billingMap: Record<string, number> = {};
            type ChildRef = { child?: Child; id?: string };
            await Promise.all(parentsList.map(async (p: Parent) => {
              let total = 0;
              const childrenArr = Array.isArray(p.children) ? p.children : [];
              await Promise.all(childrenArr.map(async (ci: ChildRef) => {
                const childId = ci?.child?.id || ci?.id;
                if (!childId) return;
                try {
                  const res = await fetchWithRefresh(`api/children/${childId}/billing?month=${month}`, { credentials: 'include' });
                  if (!res.ok) return;
                  const data = await res.json();
                  if (data && typeof (data as Record<string, unknown>).amount === 'number') total += (data as { amount: number }).amount;
                } catch {
                  /* noop - ignore per-child failure */
                }
              }));
              billingMap[String((p as Parent).id)] = total;
            }));
            setParentBilling(billingMap);
            } catch {
              /* noop - ignore billing errors */
            }
        } else {
          const res = await fetchWithRefresh(`api/parent/children`, { credentials: 'include' });
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

      // Build a parent object for the connected parent user so we can reuse ParentCard UI
      const userInfo = (user as UserInfo) ?? null;
      const parentForCard: Parent | null = userInfo ? {
        id: (userInfo.parentId ?? userInfo.id ?? 'me') as string,
        name: (userInfo.name ?? `${(userInfo.firstName ?? '')} ${(userInfo.lastName ?? '')}`.trim()) ?? null,
        firstName: userInfo.firstName ?? null,
        lastName: userInfo.lastName ?? null,
        email: userInfo.email ?? null,
        phone: userInfo.phone ?? null,
        children: children.map(c => ({ child: c }))
      } : null;

  if (loading) return <div className="p-6">Chargement...</div>;
  if (error) return <div className="p-6 text-red-600">Erreur: {error}</div>;


  if (isAdminView(authUser)) {
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
              <button onClick={() => { setAdding(true); setFormError(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' }); }} className="bg-[#0b5566] text-white font-semibold rounded-lg px-5 py-2 text-base shadow hover:bg-[#08323a] transition h-[60px]">Ajouter un parent</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 w-full">
            <div className="flex flex-col md:flex-row gap-3 w-full">
              <input type="text" placeholder="Rechercher par nom, email..." className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm text-base w-full md:w-64" />
            </div>
            <div className="flex gap-2 items-center">
              <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px] h-[60px] justify-center">
                <div className="text-xs text-gray-400">Total</div>
                <div className="text-lg font-bold text-[#0b5566]">{stats.parentsCount}</div>
              </div>
              <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px] h-[60px] justify-center">
                <div className="text-xs text-gray-400">Enfants</div>
                <div className="text-lg font-bold text-[#0b5566]">{stats.childrenCount}</div>
              </div>
              <div className="bg-white rounded-xl shadow px-4 py-2 flex flex-col items-center min-w-[90px] h-[60px] justify-center">
                <div className="text-xs text-gray-400">Présents</div>
                <div className="text-lg font-bold text-[#0b5566]">{stats.presentToday}</div>
              </div>
            </div>
          </div>

          {(adding || editingParent) && (
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
                type CreateParentPayload = { name: string; email: string; phone?: string; password?: string };
                const payload: CreateParentPayload = { name: `${form.firstName} ${form.lastName}`, email: form.email, phone: form.phone };
                if (form.password) payload.password = form.password;

                const url = editingParent ? `api/parent/${editingParent.id}` : `api/parent`;
                const method = editingParent ? 'PUT' : 'POST';

                const res = await fetchWithRefresh(url, {
                  method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload)
                });
                let resBody: unknown = null;
                try { resBody = await res.json(); } catch { /* noop */ }
                if (!res.ok) {
                  const bodyText = typeof resBody === 'object' && resBody !== null && 'message' in (resBody as Record<string, unknown>) ? String((resBody as Record<string, unknown>).message) : (await res.text());
                  throw new Error(bodyText || 'Erreur création parent');
                }
                setSuccessMessage(form.password ? (editingParent ? 'Parent modifié.' : 'Parent créé avec mot de passe.') : (editingParent ? 'Parent modifié.' : 'Parent créé — une invitation a été envoyée.'));
                const reload = await fetchWithRefresh(`api/parent/admin`, { credentials: 'include' });
                const reloadText = await reload.text();
                let json: unknown = null;
                try { json = reloadText ? JSON.parse(reloadText) : null; } catch { json = reloadText; }
                setAdminData(json as AdminData);
                setAdding(false);
                setEditingParent(null);
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
                <button type="submit" className="bg-[#0b5566] text-white px-4 py-2 rounded hover:bg-[#08323a] transition">{editingParent ? 'Enregistrer' : 'Ajouter'}</button>
                <button type="button" onClick={() => { setAdding(false); setEditingParent(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' }); setFormError(null); }} className="bg-gray-300 px-4 py-2 rounded">Annuler</button>
              </div>
              {formError && <div className="text-red-600 md:col-span-2">{formError}</div>}
              {successMessage && <div className="md:col-span-2 text-[#0b5566] font-semibold text-center bg-[#a9ddf2] border border-[#fcdcdf] rounded-lg py-2">{successMessage}</div>}
            </form>
          )}

          <div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
              {(() => {
                const cardColors = ['bg-blue-50','bg-yellow-50','bg-purple-50','bg-[#a9ddf2]','bg-pink-50','bg-orange-50'];
                return parents.map((p, idx) => {
                  const color = cardColors[idx % cardColors.length];
                  return (
                      <ParentCard
                        key={p.id}
                        parent={p}
                        color={color}
                        parentDue={parentBilling[String(p.id)] || 0}
                        onChildClick={(child) => { setSelectedChild(child); setShowChildModal(true); }}
                        onEdit={(par) => { setEditingParent(par); setAdding(false); setFormError(null); setForm({ firstName: par.firstName || '', lastName: par.lastName || '', email: par.email || '', phone: par.phone || '', password: '', confirmPassword: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        onDelete={(id) => { setDeletingParentId(id); }}
                      />
                    );
                });
              })()}
            </div>
          </div>
          {deletingParentId && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
                <div className="text-lg font-semibold mb-4 text-gray-900">Confirmer la suppression</div>
                <div className="text-sm text-gray-600 mb-4">Voulez-vous vraiment supprimer ce parent ? Cette action est irréversible.</div>
                <div className="flex gap-3">
                  <button onClick={() => setDeletingParentId(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2">Annuler</button>
                  <button onClick={async () => {
                    try {
                      const res = await fetchWithRefresh(`api/parent/${deletingParentId}`, { method: 'DELETE', credentials: 'include' });
                      const respText = await res.text();
                      let respBody: Record<string, unknown> | null = null;
                      try { respBody = respText ? JSON.parse(respText) : null; } catch { respBody = respText as unknown as Record<string, unknown>; }
                      if (!res.ok) {
                        const message = respBody && typeof respBody === 'object' && ('message' in respBody || 'error' in respBody)
                          ? (respBody.message || respBody.error)
                          : (typeof respBody === 'string' ? respBody : 'Erreur suppression');
                        throw new Error(String(message));
                      }
                      const reload = await fetchWithRefresh(`api/parent/admin`, { credentials: 'include' });
                      const text = await reload.text();
                      let json: unknown = null;
                      try { json = text ? JSON.parse(text) : null; } catch { json = text; }
                      setAdminData(json as AdminData);
                      setDeletingParentId(null);
                    } catch (err) {
                      console.error('Delete parent failed', err);
                      // show a helpful message to the user
                      if (err instanceof Error) {
                        alert('Suppression échouée: ' + err.message);
                      } else {
                        alert('Suppression échouée');
                      }
                      setDeletingParentId(null);
                    }
                  }} className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2">Supprimer</button>
                </div>
              </div>
            </div>
          )}
          {showChildModal && <ChildOptionsModal child={selectedChild} onClose={() => { setShowChildModal(false); setSelectedChild(null); }} />}
        </div>
      </div>
    );
  }

  // Parent view (their children)
  return (
    <div className="min-h-screen bg-[#fcfcff] p-2 sm:p-4 md:pl-64 w-full">
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
        <h1 className="text-2xl font-semibold mb-4">Espace Parent</h1>
      {parentForCard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ParentCard
            parent={parentForCard}
            color={'bg-white'}
            parentDue={parentBilling[String(parentForCard.id)] || 0}
            onChildClick={(child) => { setSelectedChild(child); setShowChildModal(true); }}
            onEdit={undefined}
            onDelete={undefined}
            annualPerChild={15}
          />
        </div>
      ) : children.length === 0 ? (
        <div>Aucun enfant trouvé.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map(child => (
            <div key={child.id} className="p-4 border rounded shadow-sm" style={{ borderColor: '#fcdcdf' }}>
              <div className="flex justify-between items-center">
                <div>
                  <button type="button" className="font-medium cursor-pointer text-[#08323a] hover:text-[#0b5566] text-left" onClick={(e) => { e.stopPropagation(); console.debug('[ParentDashboard] child click', child); setSelectedChild(child); setShowChildModal(true); }}>{child.name}</button>
                  <div className="text-sm text-gray-500">Groupe: {child.group}</div>
                </div>
                <div className="flex space-x-2">
                  <button className="btn bg-[#a9ddf2] text-[#0b5566] hover:bg-[#f7f4d7]" onClick={() => navigate(`/parent/child/${child.id}/schedule`)}>
                    Planning
                  </button>
                  <button className="btn bg-[#a9ddf2] text-[#0b5566] hover:bg-[#f7f4d7]" onClick={() => navigate(`/parent/child/${child.id}/reports`)}>
                    Rapports
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      {showChildModal && <ChildOptionsModal child={selectedChild} onClose={() => { setShowChildModal(false); setSelectedChild(null); }} />}
    </div>
  );
};

export default ParentDashboard;
