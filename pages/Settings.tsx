import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useCenterSettings } from '../src/context/CenterSettingsContext';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import PageLoader from '../components/PageLoader';
import { useTutorial } from '../src/context/useTutorial';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { subscribeToPush, unsubscribeFromPush } from '../src/utils/pushSubscribe';
import { useI18n } from '../src/lib/useI18n';
import LanguageDropdown from '../components/LanguageDropdown';
import { HiOutlineChat, HiOutlinePaperAirplane, HiOutlineClock, HiOutlineCheckCircle } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

type ParentForm = { role: 'parent'; id: string; firstName: string; lastName: string; email: string; phone?: string; address?: string; postalCode?: string; city?: string; region?: string; country?: string; birthDate?: string; lat?: number | null; lon?: number | null; geodataRaw?: unknown };
type NannyForm = { role: 'nanny'; id: string; name: string; availability?: string; experience?: number; contact?: string; email?: string; birthDate?: string };
type UserForm = { role: 'user'; id: string; name?: string; email?: string; phone?: string; address?: string; postalCode?: string; city?: string; region?: string; country?: string; birthDate?: string; lat?: number | null; lon?: number | null; geodataRaw?: unknown };
type ProfileForm = ParentForm | NannyForm | UserForm | null;

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  replies: Reply[];
  user: {
    id: string;
    name: string;
    email: string;
    center?: {
      id: string;
      name: string;
    };
  };
};

type Reply = {
  id: string;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
};

function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // --- geodata/autocomplete ---
  type GeodataPlace = { id?: string | number; name?: string; lat?: number | null; lon?: number | null; house_number?: string | null; street?: string | null; city?: string | null; state?: string | null; country?: string | null; postcode?: string | null; raw?: unknown };
  const [placeSuggestions, setPlaceSuggestions] = useState<GeodataPlace[]>([]);
  const [openAddress, setOpenAddress] = useState(false);

  const fetchGeodata = useCallback(async (query: string) => {
    try {
  if (!query || query.length < 3) { setPlaceSuggestions([]); return; }
      const res = await fetch(`/api/geodata/positionstack?q=${encodeURIComponent(query)}&limit=12`);
      if (!res.ok) { setPlaceSuggestions([]); throw new Error('Impossible de récupérer les suggestions'); }
      const data = (await res.json()) as GeodataPlace[];
      const addresses = data.filter(d => d.street || d.house_number || (d.name && /\d/.test(String(d.name))));
      setPlaceSuggestions(addresses.slice(0, 8));
    } catch (err) {
      console.error('geodata fetch error', err);
      setPlaceSuggestions([]);
    }
  }, []);

  const selectPlace = async (p: GeodataPlace) => {
  setPlaceSuggestions([]);
    setOpenAddress(false);
    const addr = [p.house_number, p.street].filter(Boolean).join(' ').trim();
    const city = p.city || p.name || '';
    setForm(prev => {
      const newForm = prev ? { ...prev } : null;
      if (!newForm) return newForm;
      if (newForm.role === 'user') {
        const u = newForm as UserForm;
        return { ...(newForm as UserForm), address: addr || u.address, city: city || u.city, postalCode: p.postcode || u.postalCode, region: p.state || u.region, country: p.country || u.country, lat: p.lat ?? null, lon: p.lon ?? null, geodataRaw: p.raw ?? p };
      }
      if (newForm.role === 'parent') {
        const pa = newForm as ParentForm;
        return { ...(newForm as ParentForm), address: addr || pa.address, city: city || pa.city, postalCode: p.postcode || pa.postalCode, region: p.state || pa.region, country: p.country || pa.country, lat: p.lat ?? null, lon: p.lon ?? null, geodataRaw: p.raw ?? p };
      }
      return newForm;
    });
  };

  const [form, setForm] = useState<ProfileForm>(null);

  // debounce fetch for address suggestions
  useEffect(() => {
    if (!form) return;
    const getAddress = (fr: ProfileForm) => {
      if (!fr) return '';
      if (fr.role === 'user') return (fr as UserForm).address || '';
      if (fr.role === 'parent') return (fr as ParentForm).address || '';
      return '';
    };
    const currentAddress = getAddress(form);
  if (!currentAddress || currentAddress.length < 3) { setPlaceSuggestions([]); return; }
    const id = setTimeout(() => fetchGeodata(currentAddress), 650);
    return () => clearTimeout(id);
  }, [form, fetchGeodata]);

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
              setForm({ role: 'parent', id: p.id, firstName: p.firstName || '', lastName: p.lastName || '', email: p.email || '', phone: (u && u.phone) ? u.phone : (p.phone || ''), address: (u && u.address) ? u.address : (p.address || ''), postalCode: (u && u.postalCode) ? u.postalCode : (p.postalCode || ''), city: (u && u.city) ? u.city : (p.city || ''), region: (u && u.region) ? u.region : (p.region || ''), country: (u && u.country) ? u.country : (p.country || ''), birthDate: p.birthDate ? new Date(p.birthDate).toISOString().slice(0,10) : (u && u.birthDate ? new Date(u.birthDate).toISOString().slice(0,10) : ''), lat: (u && typeof u.lat !== 'undefined' ? u.lat : (p.lat ?? null)), lon: (u && typeof u.lon !== 'undefined' ? u.lon : (p.lon ?? null)), geodataRaw: (u && typeof u.geodataRaw !== 'undefined') ? u.geodataRaw : (p.geodataRaw ?? null) });
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
                setForm({ role: 'parent', id: p2.id, firstName: p2.firstName || '', lastName: p2.lastName || '', email: p2.email || '', phone: (u && u.phone) ? u.phone : (p2.phone || ''), address: (u && u.address) ? u.address : (p2.address || ''), postalCode: (u && u.postalCode) ? u.postalCode : (p2.postalCode || ''), city: (u && u.city) ? u.city : (p2.city || ''), region: (u && u.region) ? u.region : (p2.region || ''), country: (u && u.country) ? u.country : (p2.country || ''), birthDate: p2.birthDate ? new Date(p2.birthDate).toISOString().slice(0,10) : (u && u.birthDate ? new Date(u.birthDate).toISOString().slice(0,10) : ''), lat: (u && typeof u.lat !== 'undefined' ? u.lat : (p2.lat ?? null)), lon: (u && typeof u.lon !== 'undefined' ? u.lon : (p2.lon ?? null)), geodataRaw: (u && typeof u.geodataRaw !== 'undefined') ? u.geodataRaw : (p2.geodataRaw ?? null) });
              return;
            }
          } catch {
            // ignore and continue to fallback
          }
        }

  if (u) setForm({ role: 'user', id: u.id, name: u.name || '', email: u.email || '', phone: u.phone || '', address: u.address || '', postalCode: u.postalCode || '', city: u.city || '', region: u.region || '', country: u.country || '', birthDate: u.birthDate ? new Date(u.birthDate).toISOString().slice(0,10) : '', lat: u.lat ?? null, lon: u.lon ?? null, geodataRaw: u.geodataRaw ?? null });
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
    const parent = form as ParentForm;
  const body: Record<string, unknown> = { firstName: parent.firstName, lastName: parent.lastName, email: parent.email, phone: parent.phone, address: parent.address, postalCode: parent.postalCode, city: parent.city, region: parent.region, country: parent.country };
    if (parent.birthDate) body.birthDate = parent.birthDate;
    if (typeof parent.lat !== 'undefined') body.lat = parent.lat;
    if (typeof parent.lon !== 'undefined') body.lon = parent.lon;
    if (parent.geodataRaw) body.geodataRaw = parent.geodataRaw;
    const res = await fetchWithRefresh(`${API_URL}/parent/${encodeURIComponent(String(form.id))}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Erreur lors de la mise à jour du parent');
      } else if (form.role === 'nanny') {
        const body = { name: form.name, availability: form.availability, experience: Number(form.experience || 0), contact: form.contact, email: form.email, birthDate: form.birthDate || null };
        const res = await fetchWithRefresh(`${API_URL}/nannies/${encodeURIComponent(String(form.id))}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Erreur lors de la mise à jour de la nounou');
      } else {
        const u = form as UserForm;
  const body: Record<string, unknown> = { name: u.name, email: u.email, phone: u.phone, address: u.address, postalCode: u.postalCode, city: u.city, region: u.region, country: u.country };
        if (u.birthDate) body.birthDate = u.birthDate;
        if (typeof u.lat !== 'undefined') body.lat = u.lat;
        if (typeof u.lon !== 'undefined') body.lon = u.lon;
        if (u.geodataRaw) body.geodataRaw = u.geodataRaw;
        const res = await fetchWithRefresh(`${API_URL}/user/me`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || 'Impossible de mettre à jour l\'utilisateur');
        }
      }
      // If password fields are filled, attempt a password change
      if (oldPassword || newPassword || confirmPassword) {
        if (!oldPassword || !newPassword || !confirmPassword) throw new Error(t('settings.password.all_required'));
        if (newPassword !== confirmPassword) throw new Error(t('settings.password.mismatch'));
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

  if (loading) return <PageLoader title={t('nav.settings')} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />;
  if (!form) return <div className="text-sm text-gray-500">{t('no_profile')}</div>;

  return (
    <div>
      {form.role === 'parent' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">{t('label.firstName')}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('label.lastName')}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('label.email')}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('label.phone')}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm">{t('parent.form.address') || 'Adresse'}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.address || ''} onChange={e => { handleChange('address', e.target.value); setOpenAddress(true); }} />
            {openAddress && placeSuggestions && placeSuggestions.length > 0 && (
              <div className="border rounded bg-white mt-1 max-h-48 overflow-auto">
                {placeSuggestions.map((p, i) => (
                  <div key={i} className="px-2 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => selectPlace(p)}>
                    {(p.house_number || '') + ' ' + (p.street || p.name || '')} {p.postcode ? ` - ${p.postcode}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {form.role === 'nanny' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">{t('label.name')}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.name} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('label.email')}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('label.contact')}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.contact} onChange={e => handleChange('contact', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('label.experience')}</label>
            <input type="number" className="border rounded px-2 py-1 w-full" value={String(form.experience || 0)} onChange={e => handleChange('experience', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm">{t('label.availability')}</label>
            <select className="border rounded px-2 py-1 w-full" value={form.availability} onChange={e => handleChange('availability', e.target.value)}>
              <option value="Disponible">{t('availability.available')}</option>
              <option value="En_congé">{t('availability.on_leave')}</option>
              <option value="Maladie">{t('availability.sick')}</option>
            </select>
          </div>
          <div>
            <label className="text-sm">{t('label.birthDate')}</label>
            <input type="date" className="border rounded px-2 py-1 w-full" value={form.birthDate || ''} onChange={e => handleChange('birthDate', e.target.value)} />
          </div>
        </div>
      )}
      {form.role === 'user' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">{t('label.name')}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.name} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('label.email')}</label>
            <input className="border rounded px-2 py-1 w-full" value={form.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('label.phone')}</label>
            <input className="border rounded px-2 py-1 w-full" value={(form as UserForm).phone || ''} onChange={e => handleChange('phone', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('parent.form.postalCode') || 'Code postal'}</label>
            <input className="border rounded px-2 py-1 w-full" value={(form as UserForm).postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm">{t('parent.form.address') || 'Adresse'}</label>
            <input className="border rounded px-2 py-1 w-full" value={(form as UserForm).address || ''} onChange={e => { handleChange('address', e.target.value); setOpenAddress(true); }} />
            {openAddress && placeSuggestions && placeSuggestions.length > 0 && (
              <div className="border rounded bg-white mt-1 max-h-48 overflow-auto">
                {placeSuggestions.map((p, i) => (
                  <div key={i} className="px-2 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => selectPlace(p)}>
                    {(p.house_number || '') + ' ' + (p.street || p.name || '')} {p.postcode ? ` - ${p.postcode}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm">{t('parent.form.city') || 'Ville'}</label>
            <input className="border rounded px-2 py-1 w-full" value={(form as UserForm).city || ''} onChange={e => handleChange('city', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('parent.form.region') || 'Région'}</label>
            <input className="border rounded px-2 py-1 w-full" value={(form as UserForm).region || ''} onChange={e => handleChange('region', e.target.value)} />
          </div>
          <div>
            <label className="text-sm">{t('parent.form.country') || 'Pays'}</label>
            <input className="border rounded px-2 py-1 w-full" value={(form as UserForm).country || ''} onChange={e => handleChange('country', e.target.value)} />
          </div>
        </div>
      )}

      <div className="border-t mt-4 pt-4">
  <h3 className="font-semibold mb-2">{t('settings.change_password')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
          <div>
            <label className="text-sm">{t('label.oldPassword')}</label>
            <div className="relative">
              <input type={showOldPassword ? 'text' : 'password'} className="border rounded px-2 py-1 w-full pr-10" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
              <button type="button" onClick={() => setShowOldPassword(s => !s)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 p-1" aria-label={showOldPassword ? 'Masquer l\'ancien mot de passe' : 'Afficher l\'ancien mot de passe'}>
                {showOldPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm">{t('label.newPassword')}</label>
            <div className="relative">
              <input type={showNewPassword ? 'text' : 'password'} className="border rounded px-2 py-1 w-full pr-10" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button type="button" onClick={() => setShowNewPassword(s => !s)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 p-1" aria-label={showNewPassword ? 'Masquer le nouveau mot de passe' : 'Afficher le nouveau mot de passe'}>
                {showNewPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm">{t('label.confirmPassword')}</label>
            <div className="relative">
              <input type={showConfirmPassword ? 'text' : 'password'} className="border rounded px-2 py-1 w-full pr-10" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <button type="button" onClick={() => setShowConfirmPassword(s => !s)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 p-1" aria-label={showConfirmPassword ? 'Masquer la confirmation' : 'Afficher la confirmation'}>
                {showConfirmPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

        <div className="flex gap-2 mt-4">
        <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={handleSave} disabled={saving}>{saving ? t('settings.saving') : t('settings.save')}</button>
        <button className="bg-gray-200 px-3 py-2 rounded" onClick={onClose}>{t('settings.cancel')}</button>
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );
}

function ProfileButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition" onClick={() => setOpen(true)}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        {t('settings.profile.edit')}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 backdrop-blur-sm overflow-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl relative">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
            <h2 className="text-lg font-bold mb-4 text-center">{t('settings.profile.edit')}</h2>
            <ProfileEditor onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export default function Settings() {
  const { user: authUser } = useAuth();
  const [isShortLandscape, setIsShortLandscape] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-height: 600px) and (orientation: landscape)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange); else mql.addListener(onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => { try { if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange); else mql.removeListener(onChange); } catch { /* ignore */ } window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange); };
  }, []);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [pushSubId, setPushSubId] = useState<string | null>(null);
  const [pushDeniedModal, setPushDeniedModal] = useState(false);
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem('site_language');
      return saved === 'en' ? 'en' : 'fr';
    } catch { return 'fr'; }
  });

  useEffect(() => {
    try {
      document.documentElement.lang = language === 'en' ? 'en' : 'fr';
      localStorage.setItem('site_language', language);
      document.cookie = `site_language=${language};path=/;max-age=${60 * 60 * 24 * 365}`;
    } catch { /* ignore */ }
    if (authUser) {
      fetch('/api/user/preferences', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      }).catch(() => { /* ignore */ });
    }
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [tarifs, setTarifs] = useState({ dailyRate: 2, childCotisationAmount: 15, nannyCotisationAmount: 10 });
  const [tarifsSaving, setTarifsSaving] = useState(false);
  const [tarifsSuccess, setTarifsSuccess] = useState(false);
  const [tarifsError, setTarifsError] = useState<string | null>(null);
  const { t, setLocale } = useI18n();
  const { tours, toggleMenu: openTutorialMenu } = useTutorial();
  const completedTours = authUser?.tutorialCompleted ?? [];
  const isAdmin = !!(authUser && typeof authUser.role === 'string' && (authUser.role === 'admin' || authUser.role.toLowerCase().includes('super')));
  const { reload: reloadCenterSettings } = useCenterSettings();
  const isSuperAdmin = !!(authUser && typeof authUser.role === 'string' && authUser.role.toLowerCase().includes('super'));
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportTickets, setSupportTickets] = useState<Ticket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [ticketsByCenter, setTicketsByCenter] = useState<Record<string, Ticket[]>>({});
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const supportModalContainerRef = useRef<HTMLDivElement | null>(null);
  const replyInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchWithRefresh(`${API_URL}/centers/settings`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTarifs({ dailyRate: d.dailyRate ?? 2, childCotisationAmount: d.childCotisationAmount ?? 0, nannyCotisationAmount: d.nannyCotisationAmount ?? 0 }); })
      .catch(() => {});
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // load current user's notifyByEmail preference
    (async () => {
      try {
        const res = await fetchWithRefresh(`${API_URL}/user/me`, { credentials: 'include' });
        if (res.ok) {
          const u = await res.json();
          if (u && typeof u.notifyByEmail === 'boolean') setEmailNotifications(!!u.notifyByEmail);
        }
      } catch {
        // ignore
      }
    })();

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
        try {
          const me = await fetchWithRefresh('/api/push-subscriptions/me', { credentials: 'include' });
          if (me.ok) {
            const data = await me.json();
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

  const loadSupportTickets = useCallback(async () => {
    setSupportLoading(true);
    setSupportError(null);
    try {
      const res = await fetchWithRefresh(`${API_URL}/support/tickets`, { credentials: 'include' });
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setSupportTickets(data.tickets || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSupportError(msg);
    } finally {
      setSupportLoading(false);
    }
  }, []);
  const loadTicketsByCenter = useCallback(async () => {
    setSupportLoading(true);
    setSupportError(null);
    try {
      // Load all tickets
      const ticketsRes = await fetchWithRefresh(`${API_URL}/support/admin/tickets`, { credentials: 'include' });
      if (!ticketsRes.ok) throw new Error('Erreur chargement tickets');
      const ticketsData = await ticketsRes.json();
      const tickets = ticketsData.tickets || [];

      // Group tickets by center and collect unique centers
      const grouped: Record<string, Ticket[]> = {};
      const uniqueCenters = new Map<string, {id: string, name: string}>();

      tickets.forEach((ticket: Ticket) => {
        if (ticket.user.center) {
          uniqueCenters.set(ticket.user.center.id, ticket.user.center);
          const key = `${ticket.user.center.id}:${ticket.user.center.name}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(ticket);
        } else {
          // Tickets without center
          const key = 'unknown:Centre inconnu';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(ticket);
        }
      });

      setTicketsByCenter(grouped);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSupportError(msg);
    } finally {
      setSupportLoading(false);
    }
  }, []);
  const createSupportTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    try {
      const res = await fetchWithRefresh(`${API_URL}/support/tickets`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject, message: newMessage })
      });
      if (!res.ok) throw new Error('Erreur lors de la création du ticket');
      const data = await res.json().catch(() => null);
      const created: Ticket | null = data && (data.ticket || data) ? (data.ticket || data) : null;
      setNewSubject('');
      setNewMessage('');
      setShowNewTicket(false);
      // Ensure support modal is visible and select the created ticket
      setShowSupportModal(true);
      if (created && created.id) {
        setSelectedTicket(created);
        // Optimistically add to list so it appears immediately
        setSupportTickets(prev => [created, ...prev.filter(t => t.id !== created.id)]);
      }
      // Refresh list from server to keep in sync
      await loadSupportTickets();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSupportError(msg);
    }
  };

  const sendSupportReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    const message = replyMessage.trim();
    // sendSupportReply called

    // Create temp reply for instant UI feedback
    const tempReply = {
      id: `temp-${Date.now()}`,
      message,
      isFromAdmin: false,
      createdAt: new Date().toISOString()
    } as unknown as Reply;

    // Optimistically update selectedTicket and supportTickets
    setSelectedTicket(prev => prev ? { ...prev, replies: [...(prev.replies || []), tempReply] } : prev);
    setSupportTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, replies: [...(t.replies || []), tempReply] } : t));
    setReplyMessage('');

    try {
      const res = await fetchWithRefresh(`${API_URL}/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error('Erreur lors de l\'envoi de la réponse');

      const data = await res.json();
      const realReply = data.reply;

      // Replace temp reply with real reply
      setSelectedTicket(prev => prev ? {
        ...prev,
        replies: (prev.replies || []).map(r => r.id === tempReply.id ? realReply : r)
      } : prev);
      setSupportTickets(prev => prev.map(t => t.id === selectedTicket.id ? {
        ...t,
        replies: (t.replies || []).map(r => r.id === tempReply.id ? realReply : r)
      } : t));

      // Refresh list from server to keep in sync
      await loadSupportTickets();
    } catch (e: unknown) {
      console.error('Error sending support reply:', e);
      // Remove temp reply on error
      setSelectedTicket(prev => prev ? { ...prev, replies: (prev.replies || []).filter(r => !String(r.id).startsWith('temp-')) } : prev);
      setSupportTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, replies: (t.replies || []).filter(r => !String(r.id).startsWith('temp-')) } : t));
      const msg = e instanceof Error ? e.message : String(e);
      setSupportError(msg);
    }
  };

  useEffect(() => {
    if (showSupportModal) {
      loadSupportTickets();
    }
  }, [showSupportModal, loadSupportTickets]);

  // Auto-scroll to selected ticket conversation and focus reply input
  useEffect(() => {
    if (!showSupportModal || !selectedTicket) return;
    setTimeout(() => {
      try {
        if (supportModalContainerRef.current) {
          supportModalContainerRef.current.scrollTop = supportModalContainerRef.current.scrollHeight;
        }
      } catch { /* ignore */ }
      try { replyInputRef.current?.focus(); } catch { /* ignore */ }
    }, 80);
  }, [showSupportModal, selectedTicket]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadTicketsByCenter();
    }
  }, [isSuperAdmin, loadTicketsByCenter]);

  return (
  <div className={`min-h-screen bg-[#f4f7fa] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('settings.title')}</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('settings.description', 'Gérez vos préférences et votre compte')}</p>
            </div>
          </div>
        </div>

          {/* ── Tutoriels ── */}
          <div className="bg-white rounded-2xl shadow p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Tutoriels interactifs</div>
                  <div className="text-xs text-gray-500">{completedTours.length}/{tours.length} completé{completedTours.length > 1 ? 's' : ''}</div>
                </div>
              </div>
              <button
                onClick={openTutorialMenu}
                className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-semibold rounded-xl shadow hover:opacity-90 transition"
              >
                Voir les tutoriels
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {tours.map(tour => {
                const done = completedTours.includes(tour.id);
                return (
                  <span key={tour.id} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {done && <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                    {tour.name}
                  </span>
                );
              })}
            </div>
          </div>

          {/* ── Tarifs (admin seulement) ── */}
          {isAdmin && (
            <div className="bg-white rounded-2xl shadow p-5 mb-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Tarifs de la structure</div>
                  <div className="text-xs text-gray-500">Ces tarifs sont utilisés pour le calcul automatique des factures</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarif journalier garde (€/jour)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={tarifs.dailyRate}
                    onChange={e => setTarifs(t => ({ ...t, dailyRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cotisation annuelle enfant (€/an)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={tarifs.childCotisationAmount}
                    onChange={e => setTarifs(t => ({ ...t, childCotisationAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cotisation mensuelle nounou (€/mois)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={tarifs.nannyCotisationAmount}
                    onChange={e => setTarifs(t => ({ ...t, nannyCotisationAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              {tarifsError && <p className="text-red-500 text-sm mt-3">{tarifsError}</p>}
              {tarifsSuccess && <p className="text-emerald-600 text-sm mt-3">Tarifs enregistrés avec succès.</p>}
              <div className="mt-4 flex justify-end">
                <button
                  disabled={tarifsSaving}
                  onClick={async () => {
                    setTarifsSaving(true);
                    setTarifsError(null);
                    setTarifsSuccess(false);
                    try {
                      const res = await fetchWithRefresh(`${API_URL}/centers/settings`, {
                        method: 'PUT', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(tarifs),
                      });
                      if (!res.ok) { const d = await res.json().catch(() => ({})); setTarifsError(d.error || 'Erreur lors de la sauvegarde'); }
                      else { setTarifsSuccess(true); reloadCenterSettings(); setTimeout(() => setTarifsSuccess(false), 3000); }
                    } catch { setTarifsError('Erreur réseau'); }
                    finally { setTarifsSaving(false); }
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-semibold rounded-xl shadow hover:opacity-90 transition disabled:opacity-50"
                >
                  {tarifsSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
            <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between h-full">
              <div>
                <div className="font-semibold text-gray-800">{t('settings.email.title')}</div>
                <div className="text-gray-500 text-sm">{t('settings.email.desc')}</div>
              </div>
              <div className="mt-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={emailNotifications} onChange={async e => {
                    const val = e.target.checked;
                    setEmailNotifications(val);
                    try {
                      await fetchWithRefresh(`${API_URL}/user/me`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notifyByEmail: val }) });
                    } catch { /* ignore */ }
                  }} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#a9ddf2] rounded-full peer peer-checked:bg-[#0b5566] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between h-full">
              <div>
                <div className="font-semibold text-gray-800">{t('settings.push.title')}</div>
                <div className="text-gray-500 text-sm">{t('settings.push.desc')}</div>
              </div>
              <div className="mt-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={!!pushEnabled} onChange={async (e) => {
                    const enable = e.target.checked;
                    try {
                      if (!enable) {
                        try { await unsubscribeFromPush(); } catch { /* ignore client-side unsubscribe errors */ }
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
                      try {
                        const res = await fetchWithRefresh('/api/push-subscriptions/save', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription }) });
                        if (res.ok) {
                          const json = await res.json();
                          if (json && json.id) setPushSubId(json.id);
                        }
                      } catch { /* ignore backend save errors */ }
                      setPushEnabled(true);
                    } catch {
                      setPushDeniedModal(true);
                    }
                  }} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#a9ddf2] rounded-full peer peer-checked:bg-[#0b5566] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            </div>

            {isAdmin ? (
              <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="font-semibold text-gray-800">🧾 {t('admin.emaillogs.title')}</div>
                  <div className="text-gray-500 text-sm">{t('admin.emaillogs.description')}</div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => { window.location.href = '/admin/emaillogs'; }}
                    className="bg-[#0b5566] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#08323a]"
                  >
                    {t('admin.emaillogs.title')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800">{t('settings.language.title')}</div>
                  <div className="text-gray-500 text-sm">{t('settings.language.desc')}</div>
                </div>
                <div className="w-full">
                  <div className="w-full max-w-[320px] md:max-w-[420px]">
                    <LanguageDropdown value={language} onChange={(code) => { setLanguage(code); setLocale(code === 'en' ? 'en' : 'fr'); }} />
                  </div>
                </div>
              </div>
            )}

            {!isSuperAdmin && (
              <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="font-semibold text-gray-800">{t('settings.support.title', 'Support Client')}</div>
                  <div className="text-gray-500 text-sm">{t('settings.support.description', "Besoin d'aide ? Contactez notre équipe de support")}</div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setShowSupportModal(true)}
                    className="bg-[#0b5566] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#08323a]"
                  >
                    {t('settings.support.open_ticket', 'Ouvrir un ticket')}
                  </button>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800">{t('settings.language.title')}</div>
                  <div className="text-gray-500 text-sm">{t('settings.language.desc')}</div>
                </div>
                <div className="w-full">
                  <div className="w-full max-w-[320px] md:max-w-[420px]">
                    <LanguageDropdown value={language} onChange={(code) => { setLanguage(code); setLocale(code === 'en' ? 'en' : 'fr'); }} />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow p-4 md:col-span-2">
              <div className="font-semibold text-gray-800 mb-4">{t('settings.account.title')}</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 font-semibold rounded-lg px-4 py-2 hover:bg-red-100 transition" onClick={() => setShowDeleteModal(true)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  {t('settings.account.delete')}
                </button>
                <ProfileButton />
                <button className="flex-1 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-lg px-4 py-2 hover:bg-amber-100 transition" onClick={async () => {
                try { await fetchWithRefresh('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch { /* continue */ }
                try {
                  // Preserve cookie consent so the banner doesn't reappear after logout/login
                  const __cons = (() => {
                    try { return localStorage.getItem('cookie_consent'); } catch { return null; }
                  })();
                  try { localStorage.clear(); } catch { /* ignore */ }
                  if (__cons) try { localStorage.setItem('cookie_consent', __cons); } catch { /* ignore */ }
                } catch { /* ignore */ }
                try {
                  const __scons = (() => {
                    try { return sessionStorage.getItem('cookie_consent'); } catch { return null; }
                  })();
                  try { sessionStorage.clear(); } catch { /* ignore */ }
                  if (__scons) try { sessionStorage.setItem('cookie_consent', __scons); } catch { /* ignore */ }
                } catch { /* ignore */ }
                try {
                  // Preserve cookie consent cookie
                  const cookieConsentMatch = document.cookie.match(/(?:^|; )cookie_consent=([^;]+)/);
                  const cookieConsentValue = cookieConsentMatch ? cookieConsentMatch[1] : null;
                  document.cookie.split(';').forEach(function(c) {
                    const name = c.split('=')[0].trim();
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
                  });
                  // Restore cookie_consent cookie
                  if (cookieConsentValue) {
                    document.cookie = `cookie_consent=${cookieConsentValue};path=/;max-age=31536000`;
                  }
                } catch { /* ignore */ }
                window.location.href = '/login';
               }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  {t('settings.logout')}
                </button>
            </div>
          </div>
        </div>
      </div>

        {pushDeniedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-900 text-base mb-1">Notifications bloquées</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Votre navigateur a bloqué les notifications. Pour les activer, cliquez sur l'icône <strong>🔒</strong> dans la barre d'adresse, puis autorisez les notifications pour ce site.
              </p>
            </div>
            <button
              onClick={() => setPushDeniedModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#0b5566] text-white font-semibold text-sm hover:bg-[#094a52] transition"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs flex flex-col items-center relative">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
              <h2 className="text-lg font-bold mb-4 text-center text-red-700">{t('settings.delete_confirm.title')}</h2>
              <p className="text-gray-700 text-center mb-4">{t('settings.delete_confirm.body')}</p>
              <div className="flex gap-2 w-full">
                <button type="button" className="bg-gray-300 px-3 py-1 rounded w-full" onClick={() => setShowDeleteModal(false)}>{t('settings.cancel')}</button>
                <button type="button" className="bg-red-500 text-white px-3 py-1 rounded w-full font-bold" onClick={async () => {
                  setDeleteError('');
                  const res = await fetchWithRefresh(`${API_URL}/user`, {
                    method: 'DELETE',
                    credentials: 'include',
                  });
                  if (!res.ok) {
                    setDeleteError(t('settings.delete_error'));
                    return;
                  }
                  setShowDeleteModal(false);
                  window.location.href = '/login';
                }}>{t('settings.delete_confirm.confirm')}</button>
              </div>
              {deleteError && <div className="text-red-600 text-xs mt-2 text-center w-full">{deleteError}</div>}
            </div>
          </div>
        )}

      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm md:pl-64">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden m-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{t('settings.support.title', 'Support Client')}</h2>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {supportError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded">{supportError}</div>
              )}

              {isSuperAdmin ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Tickets par centre</h3>
                  {supportLoading && <div className="mb-4 flex items-center gap-2 text-gray-400"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12a8 8 0 018-8"/></svg>Chargement…</div>}
                  {Object.entries(ticketsByCenter).map(([centerKey, tickets]) => {
                    const [, centerName] = centerKey.split(':');
                    return (
                      <div key={centerKey} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{centerName} ({tickets.length})</h4>
                        <div className="space-y-2">
                          {tickets.map(ticket => (
                            <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{ticket.subject}</div>
                                  <div className="text-sm text-gray-600">Par: {ticket.user.name}</div>
                                  <div className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                  {ticket.status === 'open' ? 'Ouvert' : 'Fermé'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Mes tickets</h3>
                    <button
                      onClick={() => setShowNewTicket(true)}
                      className="bg-[#0b5566] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#08323a]"
                    >
                      Nouveau ticket
                    </button>
                  </div>

                  {supportLoading && <div className="mb-4 flex items-center gap-2 text-gray-400"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12a8 8 0 018-8"/></svg>Chargement…</div>}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {supportTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`p-3 rounded-lg cursor-pointer border ${selectedTicket?.id === ticket.id ? 'border-[#0b5566] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</div>
                            <div className="text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {ticket.status === 'open' ? (
                              <HiOutlineClock className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <HiOutlineCheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {supportTickets.length === 0 && (
                      <div className="text-center py-8 text-gray-500">Aucun ticket</div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  {selectedTicket ? (
                    <div ref={supportModalContainerRef} className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{selectedTicket.subject}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${selectedTicket.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {selectedTicket.status === 'open' ? 'Ouvert' : 'Fermé'}
                        </div>
                      </div>

                      <div className="space-y-4 mb-4">
                        <div className="bg-white p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Votre message initial</div>
                          <div className="text-sm">{selectedTicket.message}</div>
                          <div className="text-xs text-gray-400 mt-2">{new Date(selectedTicket.createdAt).toLocaleString()}</div>
                        </div>

                        {selectedTicket.replies.map(reply => (
                          <div key={reply.id} className={`p-3 rounded-lg ${reply.isFromAdmin ? 'bg-blue-50 ml-4' : 'bg-white'}`}>
                            <div className="text-sm text-gray-600 mb-1">{reply.isFromAdmin ? 'Support' : 'Vous'}</div>
                            <div className="text-sm">{reply.message}</div>
                            <div className="text-xs text-gray-400 mt-2">{new Date(reply.createdAt).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>

                      {selectedTicket.status === 'open' && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                                ref={replyInputRef}
                                value={replyMessage}
                                onChange={e => setReplyMessage(e.target.value)}
                            placeholder="Tapez votre réponse..."
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            onKeyPress={e => e.key === 'Enter' && sendSupportReply()}
                          />
                          <button
                            onClick={sendSupportReply}
                            className="bg-[#0b5566] text-white px-4 py-2 rounded-lg hover:bg-[#08323a]"
                          >
                            <HiOutlinePaperAirplane className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center h-64">
                      <div className="text-center text-gray-500">
                        <HiOutlineChat className="w-12 h-12 mx-auto mb-4" />
                        <div>Sélectionnez un ticket pour voir la conversation</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showNewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm md:pl-64">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md m-4">
            <h2 className="text-lg font-bold mb-4">Nouveau ticket</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sujet</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Sujet de votre demande"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 h-24 resize-none"
                  placeholder="Décrivez votre problème..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewTicket(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={createSupportTicket}
                  className="flex-1 bg-[#0b5566] text-white px-4 py-2 rounded-lg hover:bg-[#08323a]"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
