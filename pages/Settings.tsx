import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { useCenterSettings } from '../src/context/CenterSettingsContext';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { useTutorial } from '../src/context/useTutorial';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { subscribeToPush, unsubscribeFromPush } from '../src/utils/pushSubscribe';
import { useI18n } from '../src/lib/useI18n';
import LanguageDropdown from '../components/LanguageDropdown';
import AvatarCropper from '../components/AvatarCropper';
import ImportModal from '../components/ImportModal';
import { HiOutlineChat, HiOutlinePaperAirplane, HiOutlineClock, HiOutlineCheckCircle } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

type ParentForm = { role: 'parent'; id: string; firstName: string; lastName: string; email: string; phone?: string; address?: string; postalCode?: string; city?: string; region?: string; country?: string; birthDate?: string; lat?: number | null; lon?: number | null; geodataRaw?: unknown };
type NannyForm = { role: 'nanny'; id: string; name: string; availability?: string; experience?: number; contact?: string; email?: string; birthDate?: string; address?: string; postalCode?: string; city?: string; region?: string; country?: string };
type UserForm = { role: 'user'; id: string; name?: string; email?: string; phone?: string; address?: string; postalCode?: string; city?: string; region?: string; country?: string; birthDate?: string; lat?: number | null; lon?: number | null; geodataRaw?: unknown; facebookUrl?: string; instagramUrl?: string; linkedinUrl?: string; twitterUrl?: string };
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

function ProfileEditor({ onClose, isAdmin }: { onClose: () => void; isAdmin?: boolean }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [centerName, setCenterName] = useState('');
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
      if (newForm.role === 'nanny') {
        const na = newForm as NannyForm;
        return { ...(newForm as NannyForm), address: addr || na.address, city: city || na.city, postalCode: p.postcode || na.postalCode, region: p.state || na.region, country: p.country || na.country };
      }
      return newForm;
    });
  };

  const [form, setForm] = useState<ProfileForm>(null);

  // load center name for admins
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await fetchWithRefresh(`${API_URL}/centers/settings`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          if (d && d.name) setCenterName(d.name);
        }
      } catch { /* ignore */ }
    })();
  }, [isAdmin]);

  // debounce fetch for address suggestions
  useEffect(() => {
    if (!form) return;
    const getAddress = (fr: ProfileForm) => {
      if (!fr) return '';
      if (fr.role === 'user') return (fr as UserForm).address || '';
      if (fr.role === 'parent') return (fr as ParentForm).address || '';
      if (fr.role === 'nanny') return (fr as NannyForm).address || '';
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
        const resUser = await fetchWithRefresh(`${API_URL}/user/me`, { credentials: 'include', cache: 'no-store' });
        if (!resUser.ok) throw new Error('Impossible de récupérer l\'utilisateur');
        const u = await resUser.json();

        const isAdminRole = u && u.role && (String(u.role).toLowerCase().includes('admin') || String(u.role).toLowerCase().includes('super'));

        if (u && u.parentId && !isAdminRole) {
          const r = await fetchWithRefresh(`${API_URL}/parent/${encodeURIComponent(String(u.parentId))}`, { credentials: 'include' });
          if (r.ok) {
              const p = await r.json();
              if (!mounted) return;
              setForm({ role: 'parent', id: p.id, firstName: p.firstName || '', lastName: p.lastName || '', email: p.email || '', phone: (u && u.phone) ? u.phone : (p.phone || ''), address: (u && u.address) ? u.address : (p.address || ''), postalCode: (u && u.postalCode) ? u.postalCode : (p.postalCode || ''), city: (u && u.city) ? u.city : (p.city || ''), region: (u && u.region) ? u.region : (p.region || ''), country: (u && u.country) ? u.country : (p.country || ''), birthDate: p.birthDate ? new Date(p.birthDate).toISOString().slice(0,10) : (u && u.birthDate ? new Date(u.birthDate).toISOString().slice(0,10) : ''), lat: (u && typeof u.lat !== 'undefined' ? u.lat : (p.lat ?? null)), lon: (u && typeof u.lon !== 'undefined' ? u.lon : (p.lon ?? null)), geodataRaw: (u && typeof u.geodataRaw !== 'undefined') ? u.geodataRaw : (p.geodataRaw ?? null) });
              return;
            }
        }

        if (u && u.nannyId && !isAdminRole) {
          const r = await fetchWithRefresh(`${API_URL}/nannies/${encodeURIComponent(String(u.nannyId))}`, { credentials: 'include' });
          if (r.ok) {
            const n = await r.json();
            if (!mounted) return;
            setForm({ role: 'nanny', id: n.id, name: n.name || '', availability: n.availability || '', experience: n.experience || 0, contact: n.contact || '', email: n.email || '', birthDate: n.birthDate ? new Date(n.birthDate).toISOString().slice(0,10) : '', address: u.address || '', postalCode: u.postalCode || '', city: u.city || '', region: u.region || '', country: u.country || '' });
            return;
          }
        }

        // If no parentId is present, try to find a parent record by email — skip for pure admins (already handled above if they have parentId/nannyId)
        if (u && u.email && !isAdminRole) {
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

  if (u) setForm({ role: 'user', id: u.id, name: u.name || '', email: u.email || '', phone: u.phone || '', address: u.address || '', postalCode: u.postalCode || '', city: u.city || '', region: u.region || '', country: u.country || '', birthDate: u.birthDate ? new Date(u.birthDate).toISOString().slice(0,10) : '', lat: u.lat ?? null, lon: u.lon ?? null, geodataRaw: u.geodataRaw ?? null, facebookUrl: u.facebookUrl || '', instagramUrl: u.instagramUrl || '', linkedinUrl: u.linkedinUrl || '', twitterUrl: u.twitterUrl || '' });
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
        const nanny = form as NannyForm;
        const body: Record<string, unknown> = { name: nanny.name, availability: nanny.availability, experience: Number(nanny.experience || 0), contact: nanny.contact, email: nanny.email, birthDate: nanny.birthDate || null, address: nanny.address, postalCode: nanny.postalCode, city: nanny.city, region: nanny.region, country: nanny.country };
        const res = await fetchWithRefresh(`${API_URL}/nannies/${encodeURIComponent(String(form.id))}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Erreur lors de la mise à jour de la nounou');
      } else {
        const u = form as UserForm;
  const body: Record<string, unknown> = { name: u.name, email: u.email, phone: u.phone, address: u.address, postalCode: u.postalCode, city: u.city, region: u.region, country: u.country, facebookUrl: u.facebookUrl ?? null, instagramUrl: u.instagramUrl ?? null, linkedinUrl: u.linkedinUrl ?? null, twitterUrl: u.twitterUrl ?? null };
        if (u.birthDate) body.birthDate = u.birthDate;
        if (typeof u.lat !== 'undefined') body.lat = u.lat;
        if (typeof u.lon !== 'undefined') body.lon = u.lon;
        if (u.geodataRaw) body.geodataRaw = u.geodataRaw;
        const res = await fetchWithRefresh(`${API_URL}/user/me`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || 'Impossible de mettre à jour l\'utilisateur');
        }
        // Update center name if admin
        if (isAdmin && centerName.trim()) {
          const cres = await fetchWithRefresh(`${API_URL}/centers/settings`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: centerName.trim() }) });
          if (!cres.ok) {
            const ctxt = await cres.json().catch(() => ({}));
            throw new Error(ctxt.error || 'Erreur lors de la mise à jour du nom du centre');
          }
          window.dispatchEvent(new CustomEvent('center:nameUpdated', { detail: { name: centerName.trim() } }));
        }
      }
      // If password fields are filled, attempt a password change
      if (oldPassword || newPassword || confirmPassword) {
        if (!oldPassword || !newPassword || !confirmPassword) throw new Error(t('settings.password.all_required'));
        if (newPassword !== confirmPassword) throw new Error(t('settings.password.mismatch'));
        const pres = await fetchWithRefresh(`${API_URL}/user/password`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
        if (!pres.ok) throw new Error('Erreur lors du changement de mot de passe');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-full border-4 border-[#0b5566] border-t-transparent animate-spin" />
      <p className="text-sm text-gray-400">Chargement du profil…</p>
    </div>
  );
  if (!form) return <div className="text-sm text-gray-500">{t('no_profile')}</div>;

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566] transition placeholder:text-gray-300";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="space-y-6">

      {/* Champs parent */}
      {form.role === 'parent' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('label.firstName')}</label>
              <input className={inputCls} placeholder="Prénom" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('label.lastName')}</label>
              <input className={inputCls} placeholder="Nom" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('label.email')}</label>
              <input className={inputCls} placeholder="email@exemple.com" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('label.phone')}</label>
              <input className={inputCls} placeholder="06 00 00 00 00" value={form.phone || ''} onChange={e => handleChange('phone', e.target.value)} />
            </div>
            <div className="sm:col-span-2 relative">
              <label className={labelCls}>{t('parent.form.address') || 'Adresse'}</label>
              <input className={inputCls} placeholder="Rechercher une adresse…" value={form.address || ''} onChange={e => { handleChange('address', e.target.value); setOpenAddress(true); }} />
              {openAddress && placeSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {placeSuggestions.map((p, i) => (
                    <div key={i} className="px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0" onClick={() => selectPlace(p)}>
                      <span className="font-medium">{[p.house_number, p.street || p.name].filter(Boolean).join(' ')}</span>
                      {p.postcode && <span className="text-gray-400 ml-1">— {p.postcode}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>{t('parent.form.postalCode') || 'Code postal'}</label>
              <input className={inputCls} placeholder="75000" value={(form as ParentForm).postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('parent.form.city') || 'Ville'}</label>
              <input className={inputCls} placeholder="Paris" value={(form as ParentForm).city || ''} onChange={e => handleChange('city', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('parent.form.region') || 'Région'}</label>
              <input className={inputCls} placeholder="Île-de-France" value={(form as ParentForm).region || ''} onChange={e => handleChange('region', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('parent.form.country') || 'Pays'}</label>
              <input className={inputCls} placeholder="France" value={(form as ParentForm).country || ''} onChange={e => handleChange('country', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Champs nanny */}
      {form.role === 'nanny' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('label.name')}</label>
            <input className={inputCls} placeholder="Nom complet" value={(form as NannyForm).name} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('label.email')}</label>
            <input className={inputCls} placeholder="email@exemple.com" type="email" value={(form as NannyForm).email || ''} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('label.contact')}</label>
            <input className={inputCls} placeholder="06 00 00 00 00" value={(form as NannyForm).contact || ''} onChange={e => handleChange('contact', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('label.experience')} (ans)</label>
            <input type="number" className={inputCls} value={String((form as NannyForm).experience || 0)} onChange={e => handleChange('experience', Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>{t('label.availability')}</label>
            <select className={inputCls} value={(form as NannyForm).availability} onChange={e => handleChange('availability', e.target.value)}>
              <option value="Disponible">{t('availability.available')}</option>
              <option value="En_congé">{t('availability.on_leave')}</option>
              <option value="Maladie">{t('availability.sick')}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('label.birthDate')}</label>
            <input type="date" className={inputCls} value={(form as NannyForm).birthDate || ''} onChange={e => handleChange('birthDate', e.target.value)} />
          </div>
          <div className="sm:col-span-2 relative">
            <label className={labelCls}>{t('parent.form.address') || 'Adresse'}</label>
            <input className={inputCls} placeholder="Rechercher une adresse…" value={(form as NannyForm).address || ''} onChange={e => { handleChange('address', e.target.value); setOpenAddress(true); }} />
            {openAddress && placeSuggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {placeSuggestions.map((p, i) => (
                  <div key={i} className="px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0" onClick={() => selectPlace(p)}>
                    <span className="font-medium">{[p.house_number, p.street || p.name].filter(Boolean).join(' ')}</span>
                    {p.postcode && <span className="text-gray-400 ml-1">— {p.postcode}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>{t('parent.form.postalCode') || 'Code postal'}</label>
            <input className={inputCls} placeholder="75000" value={(form as NannyForm).postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('parent.form.city') || 'Ville'}</label>
            <input className={inputCls} placeholder="Paris" value={(form as NannyForm).city || ''} onChange={e => handleChange('city', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('parent.form.region') || 'Région'}</label>
            <input className={inputCls} placeholder="Île-de-France" value={(form as NannyForm).region || ''} onChange={e => handleChange('region', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('parent.form.country') || 'Pays'}</label>
            <input className={inputCls} placeholder="France" value={(form as NannyForm).country || ''} onChange={e => handleChange('country', e.target.value)} />
          </div>
        </div>
      )}

      {/* Champs user */}
      {form.role === 'user' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isAdmin && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Nom du centre / structure</label>
              <input className={inputCls} placeholder="Nom de votre structure" value={centerName} onChange={e => setCenterName(e.target.value)} />
            </div>
          )}
          <div>
            <label className={labelCls}>{t('label.name')}</label>
            <input className={inputCls} placeholder="Nom complet" value={(form as UserForm).name || ''} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('label.email')}</label>
            <input className={inputCls} placeholder="email@exemple.com" type="email" value={(form as UserForm).email || ''} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('label.phone')}</label>
            <input className={inputCls} placeholder="06 00 00 00 00" value={(form as UserForm).phone || ''} onChange={e => handleChange('phone', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('parent.form.postalCode') || 'Code postal'}</label>
            <input className={inputCls} placeholder="75000" value={(form as UserForm).postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} />
          </div>
          <div className="sm:col-span-2 relative">
            <label className={labelCls}>{t('parent.form.address') || 'Adresse'}</label>
            <input className={inputCls} placeholder="Rechercher une adresse…" value={(form as UserForm).address || ''} onChange={e => { handleChange('address', e.target.value); setOpenAddress(true); }} />
            {openAddress && placeSuggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {placeSuggestions.map((p, i) => (
                  <div key={i} className="px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0" onClick={() => selectPlace(p)}>
                    <span className="font-medium">{[p.house_number, p.street || p.name].filter(Boolean).join(' ')}</span>
                    {p.postcode && <span className="text-gray-400 ml-1">— {p.postcode}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>{t('parent.form.city') || 'Ville'}</label>
            <input className={inputCls} placeholder="Paris" value={(form as UserForm).city || ''} onChange={e => handleChange('city', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('parent.form.region') || 'Région'}</label>
            <input className={inputCls} placeholder="Île-de-France" value={(form as UserForm).region || ''} onChange={e => handleChange('region', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('parent.form.country') || 'Pays'}</label>
            <input className={inputCls} placeholder="France" value={(form as UserForm).country || ''} onChange={e => handleChange('country', e.target.value)} />
          </div>
          {isAdmin && (
            <>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 mt-1">Réseaux sociaux</p>
              </div>
              <div>
                <label className={labelCls}>Facebook</label>
                <input className={inputCls} placeholder="https://facebook.com/mastructure" value={(form as UserForm).facebookUrl || ''} onChange={e => handleChange('facebookUrl', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Instagram</label>
                <input className={inputCls} placeholder="https://instagram.com/mastructure" value={(form as UserForm).instagramUrl || ''} onChange={e => handleChange('instagramUrl', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>LinkedIn</label>
                <input className={inputCls} placeholder="https://linkedin.com/company/mastructure" value={(form as UserForm).linkedinUrl || ''} onChange={e => handleChange('linkedinUrl', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>X (Twitter)</label>
                <input className={inputCls} placeholder="https://x.com/mastructure" value={(form as UserForm).twitterUrl || ''} onChange={e => handleChange('twitterUrl', e.target.value)} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Section mot de passe accordéon */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPasswordSection(s => !s)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-sm font-semibold text-gray-700"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0b5566]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
            {t('settings.change_password')}
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${showPasswordSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
        {showPasswordSection && (
          <div className="p-4 space-y-3 bg-white">
            <div>
              <label className={labelCls}>{t('label.oldPassword')}</label>
              <div className="relative">
                <input type={showOldPassword ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="••••••••" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                <button type="button" onClick={() => setShowOldPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showOldPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('label.newPassword')}</label>
              <div className="relative">
                <input type={showNewPassword ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowNewPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('label.confirmPassword')}</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                <button type="button" onClick={() => setShowConfirmPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Profil mis à jour avec succès
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#0b5566] to-[#08a7c4] text-white font-semibold rounded-xl py-2.5 text-sm shadow hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? (
            <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12a8 8 0 018-8"/></svg>Enregistrement…</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{t('settings.save')}</>
          )}
        </button>
        <button
          onClick={onClose}
          className="px-5 flex items-center justify-center bg-gray-100 text-gray-600 font-medium rounded-xl py-2.5 text-sm hover:bg-gray-200 transition"
        >
          {t('settings.cancel')}
        </button>
      </div>
    </div>
  );
}


export default function Settings() {
  const { user: authUser, setUser } = useAuth();
  const navigate = useNavigate();
  const [isShortLandscape, setIsShortLandscape] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(authUser?.avatarUrl ?? null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

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
      if (['en', 'es', 'ar'].includes(saved ?? '')) return saved!;
      return 'fr';
    } catch { return 'fr'; }
  });

  const { t, setLocale } = useI18n();

  useEffect(() => {
    // Ensure that the i18n provider always matches the current language selection
    setLocale(['en', 'es', 'ar'].includes(language) ? language as 'en' | 'es' | 'ar' : 'fr');

    try {
      document.documentElement.lang = language;
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

  useEffect(() => {
    setLocalAvatarUrl(authUser?.avatarUrl ?? null);
  }, [authUser?.avatarUrl]);

  const uploadProfileAvatar = async (file: File) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetchWithRefresh(`${API_URL}/user/me/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Avatar upload failed', text);
        return;
      }
      const data = await res.json();
      if (data && data.avatarUrl) {
        const avatarWithBuster = `${data.avatarUrl}&v=${Date.now()}`;
        setLocalAvatarUrl(avatarWithBuster);
        if (setUser && authUser) setUser({ ...authUser, avatarUrl: avatarWithBuster });
      }
    } catch (e) {
      console.error('Error uploading avatar', e);
    } finally {
      setAvatarUploading(false);
    }
  };

  const onAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setCropModalOpen(true);
  };

  const closeCropModal = () => {
    setCropModalOpen(false);
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [tarifs, setTarifs] = useState({ dailyRate: 2, childCotisationAmount: 15, nannyCotisationAmount: 10, showInDirectory: true });
  const [directoryToggleSaving, setDirectoryToggleSaving] = useState(false);
  const [tarifsSaving, setTarifsSaving] = useState(false);
  const [tarifsSuccess, setTarifsSuccess] = useState(false);
  const [tarifsError, setTarifsError] = useState<string | null>(null);
  const { tours, startTour } = useTutorial();
  const completedTours = authUser?.tutorialCompleted ?? [];
  const isAdmin = !!(authUser && typeof authUser.role === 'string' && (authUser.role === 'admin' || authUser.role.toLowerCase().includes('super')));
  const { reload: reloadCenterSettings } = useCenterSettings();
  const isSuperAdmin = !!(authUser && typeof authUser.role === 'string' && authUser.role.toLowerCase().includes('super'));
  const displayName = authUser?.name || 'Utilisateur';
  const accountInitials = displayName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section');
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
      .then(d => { if (d) setTarifs({ dailyRate: d.dailyRate ?? 2, childCotisationAmount: d.childCotisationAmount ?? 0, nannyCotisationAmount: d.nannyCotisationAmount ?? 0, showInDirectory: d.showInDirectory ?? true }); })
      .catch(() => {});
  }, [isAdmin]);

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

  // ── Section detail header with back button ──
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={() => setSearchParams({})}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow border border-gray-100 text-gray-500 hover:text-[#0b5566] hover:border-[#0b5566] transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <h2 className="text-lg font-bold text-[#0b5566]">{title}</h2>
    </div>
  );

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

        {/* ── Tiles grid (home) ── */}
        {!activeSection && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Profil & Compte */}
            <button
              onClick={() => setSearchParams({ section: 'account' })}
              className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left hover:shadow-md hover:border-[#0b5566] border border-transparent transition group"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#0b5566] group-hover:bg-[#0b5566] group-hover:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{t('settings.section.account', 'Profil & Compte')}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t('settings.section.account.subtitle', 'Modifier vos informations')}</div>
              </div>
            </button>

            {/* Notifications */}
            <button
              onClick={() => setSearchParams({ section: 'notifications' })}
              className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left hover:shadow-md hover:border-[#0b5566] border border-transparent transition group"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{t('settings.section.notifications', 'Notifications')}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t('settings.section.notifications.subtitle', 'Email et push')}</div>
              </div>
            </button>

            {/* Facturation — admin only */}
            {isAdmin && (
              <button
                onClick={() => setSearchParams({ section: 'tarifs' })}
                className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left hover:shadow-md hover:border-[#0b5566] border border-transparent transition group"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"/></svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{t('settings.section.billing', 'Facturation')}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t('settings.section.billing.subtitle', 'Tarifs et cotisations')}</div>
                </div>
              </button>
            )}

            {/* Langue */}
            <button
              onClick={() => setSearchParams({ section: 'langue' })}
              className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left hover:shadow-md hover:border-[#0b5566] border border-transparent transition group"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"/></svg>
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{t('settings.language.title')}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t('settings.language.desc')}</div>
              </div>
            </button>

            {/* Tutoriels */}
            <button
              onClick={() => setSearchParams({ section: 'tutoriels' })}
              className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left hover:shadow-md hover:border-[#0b5566] border border-transparent transition group"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-[#0b5566] group-hover:bg-[#0b5566] group-hover:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/></svg>
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{t('settings.section.tutorials', 'Tutoriels')}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t('settings.section.tutorials.progress', { done: String(completedTours.length), total: String(tours.length) })}</div>
              </div>
            </button>

            {/* Support */}
            {!isSuperAdmin && (
              <button
                onClick={() => setSearchParams({ section: 'support' })}
                className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left hover:shadow-md hover:border-[#0b5566] border border-transparent transition group"
              >
                <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{t('settings.support.title', 'Support')}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t('settings.support.open_ticket', 'Ouvrir un ticket')}</div>
                </div>
              </button>
            )}

            {/* Email logs — admin only */}
            {isAdmin && (
              <button
                onClick={() => { navigate('/admin/emaillogs'); }}
                className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left hover:shadow-md hover:border-[#0b5566] border border-transparent transition group"
              >
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-500 group-hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{t('settings.section.email_logs', 'Email log')}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t('settings.section.email_logs.subtitle', 'Logs des emails envoyés')}</div>
                </div>
              </button>
            )}

            {/* Import de données — admin uniquement */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3 text-left hover:shadow-md hover:border-[#0b5566] border border-transparent transition group"
              >
                <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-[#0b5566] group-hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">Importer des données</div>
                  <div className="text-xs text-gray-400 mt-0.5">Nounous, parents et enfants depuis Excel</div>
                </div>
              </button>
            )}
          </div>
        )}

        {showImportModal && (
          <ImportModal onClose={() => setShowImportModal(false)} />
        )}

        {/* ── Section: Tutoriels ── */}
        {activeSection === 'tutoriels' && (
          <div>
            <SectionHeader title={t('settings.tutorials.title')} />

            {/* Barre de progression globale */}
            <div className="bg-white rounded-2xl shadow p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-800">{t('settings.tutorials.progress_label')}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t('settings.tutorials.progress_detail', { done: String(completedTours.length), total: String(tours.length) })}</div>
                </div>
                <div className="text-2xl font-extrabold text-[#0b5566]">
                  {tours.length > 0 ? Math.round((completedTours.length / tours.length) * 100) : 0}%
                </div>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0b5566] to-[#08a7c4] rounded-full transition-all duration-500"
                  style={{ width: tours.length > 0 ? `${(completedTours.length / tours.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Cards par tutoriel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {tours.map((tour, idx) => {
                const done = completedTours.includes(tour.id);
                const colors = [
                  { bg: 'bg-blue-50', text: 'text-blue-500', ring: 'hover:border-blue-200' },
                  { bg: 'bg-violet-50', text: 'text-violet-500', ring: 'hover:border-violet-200' },
                  { bg: 'bg-emerald-50', text: 'text-emerald-500', ring: 'hover:border-emerald-200' },
                  { bg: 'bg-amber-50', text: 'text-amber-500', ring: 'hover:border-amber-200' },
                  { bg: 'bg-rose-50', text: 'text-rose-500', ring: 'hover:border-rose-200' },
                  { bg: 'bg-indigo-50', text: 'text-indigo-500', ring: 'hover:border-indigo-200' },
                ];
                const color = colors[idx % colors.length];
                return (
                  <button
                    key={tour.id}
                    onClick={() => startTour(tour.id)}
                    className={`group relative bg-white rounded-2xl shadow border-2 transition text-left p-4 flex items-center gap-4 ${done ? 'border-emerald-100' : 'border-transparent'} ${color.ring}`}
                  >
                    <div className={`w-11 h-11 rounded-xl ${done ? 'bg-emerald-50' : color.bg} flex items-center justify-center flex-shrink-0 transition group-hover:scale-105`}>
                      <span className={done ? 'text-emerald-500' : color.text}>{tour.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{tour.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{tour.description}</div>
                      <div className={`text-xs mt-1.5 font-semibold ${done ? 'text-emerald-600' : 'text-gray-300'}`}>
                        {done ? t('settings.tutorials.done') : t('settings.tutorials.not_started')}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"/></svg>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Section: Facturation ── */}
        {activeSection === 'tarifs' && isAdmin && (
          <div>
            <SectionHeader title={t('settings.billing.title')} />

            {/* Bandeau intro */}
            <div className="bg-gradient-to-r from-[#0b5566] to-[#08a7c4] rounded-2xl p-5 mb-4 text-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"/></svg>
              </div>
              <div>
                <div className="font-bold text-base">{t('settings.billing.title')}</div>
                <div className="text-sm text-white/75 mt-0.5">{t('settings.billing.subtitle')}</div>
              </div>
            </div>

            {/* Cards des 3 montants */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {/* Tarif journalier */}
              <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('settings.billing.daily_rate')}</div>
                    <div className="text-xs text-gray-400">{t('settings.billing.daily_rate.desc')}</div>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number" min="0" step="0.01"
                    value={tarifs.dailyRate}
                    onChange={e => setTarifs(t => ({ ...t, dailyRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-2xl font-bold text-[#0b5566] focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 focus:border-[#0b5566]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">€</span>
                </div>
                <div className="text-xs text-gray-400 text-center">{t('settings.billing.per_day')}</div>
              </div>

              {/* Cotisation enfant */}
              <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"/></svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('settings.billing.child_fee')}</div>
                    <div className="text-xs text-gray-400">{t('settings.billing.child_fee.desc')}</div>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number" min="0" step="0.01"
                    value={tarifs.childCotisationAmount}
                    onChange={e => setTarifs(t => ({ ...t, childCotisationAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-2xl font-bold text-[#0b5566] focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 focus:border-[#0b5566]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">€</span>
                </div>
                <div className="text-xs text-gray-400 text-center">{t('settings.billing.per_year')}</div>
              </div>

              {/* Cotisation nounou */}
              <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('settings.billing.nanny_fee')}</div>
                    <div className="text-xs text-gray-400">{t('settings.billing.nanny_fee.desc')}</div>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number" min="0" step="0.01"
                    value={tarifs.nannyCotisationAmount}
                    onChange={e => setTarifs(t => ({ ...t, nannyCotisationAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-2xl font-bold text-[#0b5566] focus:outline-none focus:ring-2 focus:ring-[#0b5566]/20 focus:border-[#0b5566]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">€</span>
                </div>
                <div className="text-xs text-gray-400 text-center">{t('settings.billing.per_month')}</div>
              </div>
            </div>

            {tarifsError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                {tarifsError}
              </div>
            )}
            {tarifsSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl mb-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {t('settings.billing.saved')}
              </div>
            )}

            <button
              disabled={tarifsSaving}
              onClick={async () => {
                setTarifsSaving(true); setTarifsError(null); setTarifsSuccess(false);
                try {
                  const res = await fetchWithRefresh(`${API_URL}/centers/settings`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tarifs) });
                  if (!res.ok) { const d = await res.json().catch(() => ({})); setTarifsError(d.error || 'Erreur lors de la sauvegarde'); }
                  else { setTarifsSuccess(true); reloadCenterSettings(); setTimeout(() => setTarifsSuccess(false), 3000); }
                } catch { setTarifsError('Erreur réseau'); }
                finally { setTarifsSaving(false); }
              }}
              className="w-full py-3 bg-gradient-to-r from-[#0b5566] to-[#08a7c4] text-white font-semibold rounded-2xl shadow hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {tarifsSaving ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12a8 8 0 018-8"/></svg>{t('settings.saving')}</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{t('settings.billing.save_btn')}</>
              )}
            </button>
          </div>
        )}

        {/* ── Section: Notifications ── */}
        {activeSection === 'notifications' && (
          <div>
            <SectionHeader title={t('settings.section.notifications', 'Notifications')} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-gray-800">{t('settings.email.title')}</div>
                  <div className="text-gray-500 text-sm">{t('settings.email.desc')}</div>
                </div>
                <div className="mt-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={emailNotifications} onChange={async e => {
                      const val = e.target.checked;
                      setEmailNotifications(val);
                      try { await fetchWithRefresh(`${API_URL}/user/me`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notifyByEmail: val }) }); } catch { /* ignore */ }
                    }} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#a9ddf2] rounded-full peer peer-checked:bg-[#0b5566] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between">
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
                          try { await unsubscribeFromPush(); } catch { /* ignore */ }
                          try {
                            if (pushSubId) { await fetchWithRefresh(`/api/push-subscriptions/${encodeURIComponent(pushSubId)}`, { method: 'DELETE', credentials: 'include' }); }
                            else { await fetchWithRefresh('/api/push-subscriptions/me', { method: 'DELETE', credentials: 'include' }); }
                          } catch (be) { console.error('Failed to delete subscription on server', be); }
                          setPushEnabled(false); setPushSubId(null); return;
                        }
                        const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                        if (!vapid) return alert('VAPID_PUBLIC_KEY non défini en front');
                        const { subscription } = await subscribeToPush(vapid);
                        try {
                          const res = await fetchWithRefresh('/api/push-subscriptions/save', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription }) });
                          if (res.ok) { const json = await res.json(); if (json && json.id) setPushSubId(json.id); }
                        } catch { /* ignore */ }
                        setPushEnabled(true);
                      } catch { setPushDeniedModal(true); }
                    }} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#a9ddf2] rounded-full peer peer-checked:bg-[#0b5566] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Section: Langue ── */}
        {activeSection === 'langue' && (
          <div>
            <SectionHeader title={t('settings.language.title')} />

            {/* Hero banner */}
            <div className="relative bg-gradient-to-br from-[#0b5566] to-[#08a7c4] rounded-2xl px-6 py-5 mb-4 overflow-hidden shadow">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -right-2 bottom-0 w-16 h-16 rounded-full bg-white/5" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 text-2xl">
                  🌍
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">{t('settings.language.title')}</h3>
                  <p className="text-white/75 text-xs mt-0.5">{t('settings.language.desc')}</p>
                </div>
              </div>
            </div>

            {/* Language cards */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('settings.language.choose', 'Choisissez votre langue')}</p>
              <LanguageDropdown value={language} onChange={(code) => { setLanguage(code); setLocale(['en', 'es', 'ar'].includes(code) ? code as 'en' | 'es' | 'ar' : 'fr'); }} />
            </div>
          </div>
        )}

        {/* ── Section: Support ── */}
        {activeSection === 'support' && !isSuperAdmin && (
          <div>
            <SectionHeader title={t('settings.support.title', 'Support Client')} />
            <div className="bg-white rounded-2xl shadow p-4">
              <p className="text-gray-500 text-sm mb-4">{t('settings.support.description', "Besoin d'aide ? Contactez notre équipe de support")}</p>
              <button onClick={() => setShowSupportModal(true)} className="bg-[#0b5566] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#08323a]">
                {t('settings.support.open_ticket', 'Ouvrir un ticket')}
              </button>
            </div>
          </div>
        )}

        {/* ── Section: Profil & Compte ── */}
        {activeSection === 'account' && (
          <div>
            <SectionHeader title={t('settings.section.account', 'Profil & Compte')} />
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-lg font-bold text-blue-800">
                    {localAvatarUrl ? (
                      <img src={localAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      accountInitials
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-white border border-gray-200 text-xs text-[#0b5566] flex items-center justify-center shadow-sm hover:bg-gray-50"
                  >
                    {avatarUploading ? '...' : '✎'}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onAvatarFileChange} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{displayName}</div>
                  <div className="text-xs text-gray-400 capitalize mt-0.5">
                    {authUser?.role === 'nanny'
                      ? t('settings.profile.role.nanny', 'Assistante maternelle')
                      : authUser?.role === 'parent'
                        ? t('settings.profile.role.parent', 'Parent')
                        : t('settings.profile.role.user', 'Utilisateur')}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="mt-1.5 text-xs text-[#0b5566] hover:underline"
                  >
                    {t('settings.profile.avatar', 'Modifier la photo')}
                  </button>
                </div>
              </div>
              {cropModalOpen && cropImageSrc && (
                <AvatarCropper
                  imageSrc={cropImageSrc}
                  onCancel={closeCropModal}
                  onApply={(croppedFile) => {
                    closeCropModal();
                    uploadProfileAvatar(croppedFile);
                  }}
                />
              )}
              <ProfileEditor onClose={() => setSearchParams({})} isAdmin={isAdmin} />
              {isAdmin && (
                <div className="border-t mt-6 pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{t('settings.account.show_in_directory', 'Apparaître dans l\'annuaire')}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{t('settings.account.show_in_directory.desc', 'Votre structure sera visible dans l\'annuaire public')}</div>
                    </div>
                    <button
                      role="switch"
                      aria-checked={tarifs.showInDirectory}
                      onClick={async () => {
                        if (directoryToggleSaving) return;
                        const next = !tarifs.showInDirectory;
                        setTarifs(prev => ({ ...prev, showInDirectory: next }));
                        setDirectoryToggleSaving(true);
                        try {
                          const res = await fetchWithRefresh(`${API_URL}/centers/settings`, {
                            method: 'PUT',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ showInDirectory: next }),
                          });
                          if (!res.ok) {
                            setTarifs(prev => ({ ...prev, showInDirectory: !next }));
                          }
                        } catch {
                          setTarifs(prev => ({ ...prev, showInDirectory: !next }));
                        } finally {
                          setDirectoryToggleSaving(false);
                        }
                      }}
                      disabled={directoryToggleSaving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${tarifs.showInDirectory ? 'bg-brand-500' : 'bg-gray-200'} ${directoryToggleSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${tarifs.showInDirectory ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              )}
              <div className="border-t mt-6 pt-4 flex flex-col gap-3">
                <button
                  className="flex items-center gap-2 text-sm text-brand-600 font-medium hover:text-brand-700 transition"
                  onClick={async () => {
                    try {
                      const res = await fetchWithRefresh('/api/user/me/export', { credentials: 'include' });
                      if (!res.ok) throw new Error('Export failed');
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `frimousse-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      alert(t('settings.export_error', 'Erreur lors de l\'export de vos données.'));
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  {t('settings.export_data', 'Télécharger mes données (RGPD)')}
                </button>
                <button className="flex items-center gap-2 text-sm text-red-600 font-medium hover:text-red-700 transition" onClick={() => setShowDeleteModal(true)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  {t('settings.account.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Déconnexion (toujours visible en bas) ── */}
        {!activeSection && (
          <div className="mt-4">
            <button className="w-full flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-2xl px-4 py-3 hover:bg-amber-100 transition" onClick={async () => {
              try { await fetchWithRefresh('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch { /* continue */ }
              try {
                const __cons = (() => { try { return localStorage.getItem('cookie_consent'); } catch { return null; } })();
                try { localStorage.clear(); } catch { /* ignore */ }
                if (__cons) try { localStorage.setItem('cookie_consent', __cons); } catch { /* ignore */ }
              } catch { /* ignore */ }
              try {
                const __scons = (() => { try { return sessionStorage.getItem('cookie_consent'); } catch { return null; } })();
                try { sessionStorage.clear(); } catch { /* ignore */ }
                if (__scons) try { sessionStorage.setItem('cookie_consent', __scons); } catch { /* ignore */ }
              } catch { /* ignore */ }
              try {
                const cookieConsentMatch = document.cookie.match(/(?:^|; )cookie_consent=([^;]+)/);
                const cookieConsentValue = cookieConsentMatch ? cookieConsentMatch[1] : null;
                document.cookie.split(';').forEach(function(c) {
                  const name = c.split('=')[0].trim();
                  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
                });
                if (cookieConsentValue) { document.cookie = `cookie_consent=${cookieConsentValue};path=/;max-age=31536000`; }
              } catch { /* ignore */ }
              window.location.href = '/login';
            }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {t('settings.logout')}
            </button>
          </div>
        )}
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
