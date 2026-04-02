import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useI18n } from '../src/lib/useI18n';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import PageLoader from '../components/PageLoader';
import { HiOutlineDocumentText, HiOutlinePlus, HiOutlinePaperAirplane, HiOutlineDownload, HiOutlineCheck, HiOutlinePencil, HiOutlineX, HiOutlineTrash, HiOutlineRefresh } from 'react-icons/hi';
import { usePresenceSheetWS } from '../src/hooks/usePresenceSheetWS';

const API_URL = import.meta.env.VITE_API_URL;

type Child = { id: string; name: string; photoUrl?: string | null };
type Nanny = { id: string; name: string };
type Entry = {
  id: string;
  date: string;
  arrivalTime: string | null;
  departureTime: string | null;
  absent: boolean;
  comment: string | null;
  nannySignature: string | null;
  nannySignedAt: string | null;
  parentSignature: string | null;
  parentSignedAt: string | null;
};
type Sheet = {
  id: string;
  childId: string;
  nannyId: string;
  centerId?: string | null;
  month: number;
  year: number;
  status: 'draft' | 'sent' | 'signed';
  entries: Entry[];
  child: Child;
  nanny: Nanny;
  sentAt: string | null;
  joursContrat: number | null;
  joursPresence: number | null;
  joursAbsence: number | null;
  heuresCompl: number | null;
  nannySignature: string | null;
  nannySignedAt: string | null;
  parentSignature: string | null;
  parentSignedAt: string | null;
};

const DAY_NAMES = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function isWeekend(dateStr: string) {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

const FRENCH_HOLIDAYS = ['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'];
function isHoliday(dateStr: string) {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return FRENCH_HOLIDAYS.includes(`${mm}-${dd}`);
}
function isNonWorkDay(dateStr: string) {
  return isWeekend(dateStr) || isHoliday(dateStr);
}

function statusBadge(status: string, t: (k: string, fallback?: string) => string) {
  if (status === 'signed') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{t('presenceSheets.status.signed', 'Signée')}</span>;
  if (status === 'sent') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{t('presenceSheets.status.sent', 'Envoyée')}</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">{t('presenceSheets.status.draft', 'Brouillon')}</span>;
}

// Canvas de signature
function SignaturePad({ onSave, onCancel, t }: { onSave: (sig: string) => void; onCancel: () => void; t: (k: string, fallback?: string) => string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }
  function start(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return;
    drawing.current = true;
    const pos = getPos(e, canvas);
    canvas.getContext('2d')!.beginPath();
    canvas.getContext('2d')!.moveTo(pos.x, pos.y);
    e.preventDefault();
  }
  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0b5566';
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    e.preventDefault();
  }
  function end() { drawing.current = false; }
  function clear() { const c = canvasRef.current; if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height); }
  function save() { const c = canvasRef.current; if (c) onSave(c.toDataURL('image/png')); }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500">Dessinez votre signature ci-dessous</p>
      <canvas ref={canvasRef} width={300} height={100}
        className="border-2 border-dashed border-[#0b5566]/30 rounded-xl bg-white cursor-crosshair touch-none w-full"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="flex gap-2 w-full">
        <button onClick={clear} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100">{t('presenceSheets.signature.clear', 'Effacer')}</button>
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100">{t('presenceSheets.signature.cancel', 'Annuler')}</button>
        <button onClick={save} className="flex-1 py-3 rounded-xl bg-[#0b5566] text-white text-sm font-semibold hover:opacity-90 active:opacity-80">{t('presenceSheets.signature.save', 'Valider')}</button>
      </div>
    </div>
  );
}

export default function PresenceSheets() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const monthNames: string[] = useMemo(() => {
    const localeCode = locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale || 'en-US';
    return Array.from({ length: 12 }, (_: unknown, i: number) => new Intl.DateTimeFormat(localeCode, { month: 'long' }).format(new Date(2000, i, 1)));
  }, [locale]);
  const u = user as { role?: string | null; nannyId?: string | null; parentId?: string | null } | null;
  const isAdminUser = !!(u && typeof u.role === 'string' && (u.role === 'admin' || u.role.includes('super')));
  const isNannyUser = !!(u && u.nannyId);
  const isParentUser = !!(u && (u.parentId || u.role === 'parent'));

  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);
  const [editingEntries, setEditingEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // { entryId, role: 'nanny'|'parent' }
  const [signingEntry, setSigningEntry] = useState<{ entryId: string; role: 'nanny' | 'parent' } | null>(null);
  const [signingSheet, setSigningSheet] = useState<'nanny' | 'parent' | null>(null);
  const [billingData, setBillingData] = useState({ joursContrat: '', joursPresence: '', joursAbsence: '', heuresCompl: '' });
  const [savingBilling, setSavingBilling] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  type ParentItem = { id: string; name: string; children?: { id: string; name: string }[] };
  type ParentApiItem = { id?: string | null; firstName?: string | null; lastName?: string | null; name?: string | null; children?: Array<{ id?: string | null; name?: string | null; child?: { id?: string | null; name?: string | null } }> };

  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [centerFilter, setCenterFilter] = useState<string>('');
  const [parentFilter, setParentFilter] = useState<string>('');
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [parents, setParents] = useState<ParentItem[]>([]);

  const [children, setChildren] = useState<Child[]>([]);
  const [createForm, setCreateForm] = useState({
    childId: '', month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()), defaultArrival: '08h30', defaultDeparture: '17h30',
  });

  // WebSocket : mise à jour en temps réel des signatures
  usePresenceSheetWS({
    sheetId: selectedSheet?.id ?? null,
    onSignature: ({ sheetId: wsSheetId, entry, sheetStatus }) => {
      setEditingEntries(prev => prev.map(e => e.id === entry.id ? { ...e, ...entry } as Entry : e));
      setSelectedSheet(prev => {
        if (!prev || prev.id !== wsSheetId) return prev;
        const newEntries = prev.entries.map(e => e.id === entry.id ? { ...e, ...entry } as Entry : e);
        return { ...prev, entries: newEntries, ...(sheetStatus ? { status: sheetStatus as Sheet['status'] } : {}) };
      });
      setSheets(prev => prev.map(s => {
        if (s.id !== wsSheetId) return s;
        const newEntries = s.entries.map(e => e.id === entry.id ? { ...e, ...entry } as Entry : e);
        return { ...s, entries: newEntries, ...(sheetStatus ? { status: sheetStatus as Sheet['status'] } : {}) };
      }));
    },
  });

  const loadSheets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (centerFilter && u?.role === 'super-admin') params.set('centerId', centerFilter);
      if (parentFilter && isAdminUser) params.set('parentId', parentFilter);
      const url = `${API_URL}/presence-sheets${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetchWithRefresh(url, { credentials: 'include' });
      if (!res.ok) throw new Error();
      setSheets(await res.json());
    } catch { setError(t('presenceSheets.error.load', 'Impossible de charger les feuilles')); }
    finally { setLoading(false); }
  }, [centerFilter, parentFilter, u, isAdminUser, t]);

  useEffect(() => { loadSheets(); }, [loadSheets]);

  useEffect(() => {
    if (!showCreate || (!isNannyUser && !isAdminUser)) return;
    fetchWithRefresh(`${API_URL}/children`, { credentials: 'include' })
      .then(r => r.json()).then(setChildren).catch(() => {});
  }, [showCreate, isNannyUser, isAdminUser]);

  useEffect(() => {
    if (!u || u.role !== 'super-admin') return;
    fetchWithRefresh(`${API_URL}/centers`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { data: [] })
      .then((res: { data?: Array<{id:string,name:string}> } | Array<{id:string,name:string}>) => {
        const list = Array.isArray(res) ? res : (Array.isArray((res as { data?: Array<{id:string,name:string}> }).data) ? (res as { data: Array<{id:string,name:string}> }).data : []);
        setCenters(list);
      })
      .catch(() => setCenters([]));
  }, [u]);

  useEffect(() => {
    if (!isAdminUser) return;
    const centerQuery = centerFilter ? `?centerId=${encodeURIComponent(centerFilter)}` : '';
    fetchWithRefresh(`${API_URL}/parent/admin${centerQuery}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { parents: [] })
      .then((data: { parents?: ParentApiItem[] }) => {
        const list = Array.isArray(data.parents) ? data.parents : [];
        setParents(list.map((p: ParentApiItem) => {
          const children = Array.isArray(p.children) ? p.children.map((c) => {
            // API returns ParentChild relation: { child: { id, name } } or flat { id, name }
            const child = c.child ?? c;
            return { id: String(child.id ?? ''), name: String(child.name ?? '') };
          }).filter(c => c.id) : [];
          return {
            id: String(p.id ?? ''),
            name: String(p.name ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`).trim() || String(p.id ?? ''),
            children,
          };
        }));
      })
      .catch(() => setParents([]));
  }, [isAdminUser, centerFilter]);

  function openSheet(sheet: Sheet) {
    setSelectedSheet(sheet);
    setEditingEntries(sheet.entries.map(e => ({ ...e })));
    setBillingData({
      joursContrat: sheet.joursContrat != null ? String(sheet.joursContrat) : '',
      joursPresence: sheet.joursPresence != null ? String(sheet.joursPresence) : '',
      joursAbsence: sheet.joursAbsence != null ? String(sheet.joursAbsence) : '',
      heuresCompl: sheet.heuresCompl != null ? String(sheet.heuresCompl) : '',
    });
    setError(''); setSuccessMsg('');
  }

  async function saveEntries() {
    if (!selectedSheet) return;
    setSaving(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/presence-sheets/${selectedSheet.id}/entries`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ entries: editingEntries }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSelectedSheet(updated);
      setEditingEntries(updated.entries.map((e: Entry) => ({ ...e })));
      setSheets(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSuccessMsg(t('presenceSheets.success.saved', 'Modifications enregistrées'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { setError(t('presenceSheets.error.save', 'Erreur lors de la sauvegarde')); }
    finally { setSaving(false); }
  }

  async function sendSheet() {
    if (!selectedSheet) return;
    setSending(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/presence-sheets/${selectedSheet.id}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      await loadSheets();
      setSelectedSheet(prev => prev ? { ...prev, status: 'sent', sentAt: new Date().toISOString() } : prev);
      setSuccessMsg(t('presenceSheets.success.sent', 'Feuille envoyée aux parents'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch { setError(t('presenceSheets.error.send', 'Erreur lors de l\'envoi')); }
    finally { setSending(false); }
  }

  async function signEntry(entryId: string, role: 'nanny' | 'parent', signature: string) {
    if (!selectedSheet) return;
    setSaving(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/presence-sheets/${selectedSheet.id}/entries/${entryId}/sign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ signature, role }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const updatedEntry: Entry = await res.json();
      // mettre à jour l'entrée localement
      const newEntries = editingEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
      setEditingEntries(newEntries);
      setSelectedSheet(prev => {
        if (!prev) return prev;
        const updatedSheet = { ...prev, entries: newEntries };
        // recalculer le statut local
        const workDays = newEntries.filter(e => { const d = new Date(e.date); return d.getDay() !== 0 && d.getDay() !== 6; });
        if (workDays.every(e => e.nannySignedAt && e.parentSignedAt)) updatedSheet.status = 'signed';
        return updatedSheet;
      });
      setSheets(prev => prev.map(s => s.id === selectedSheet.id ? { ...s, entries: newEntries } : s));
      setSuccessMsg(t('presenceSheets.success.signature', 'Signature enregistrée'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t('presenceSheets.error.signature', 'Erreur lors de la signature')); }
    finally { setSaving(false); setSigningEntry(null); }
  }

  async function signSheet(role: 'nanny' | 'parent', signature: string) {
    if (!selectedSheet) return;
    setSaving(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/presence-sheets/${selectedSheet.id}/sign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ signature, role }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erreur'); }
      const updated: Sheet = await res.json();
      setSelectedSheet(updated);
      setSheets(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSuccessMsg(t('presenceSheets.success.signed', 'Feuille signée'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t('presenceSheets.error.signature', 'Erreur lors de la signature')); }
    finally { setSaving(false); setSigningSheet(null); }
  }

  async function saveBilling() {
    if (!selectedSheet) return;
    setSavingBilling(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/presence-sheets/${selectedSheet.id}/billing`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(billingData),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erreur'); }
      const updated: Sheet = await res.json();
      setSelectedSheet(updated);
      setSheets(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSuccessMsg('Données de facturation enregistrées');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSavingBilling(false); }
  }

  async function downloadPdf(sheet: Sheet) {
    setDownloadingPdf(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/presence-sheets/${sheet.id}/pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('Erreur PDF');
      const blob = await res.blob();
      const name = `fiche-presence-${sheet.month}-${sheet.year}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function createSheet() {
    setSaving(true); setError('');
    try {
      const res = await fetchWithRefresh(`${API_URL}/presence-sheets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(createForm),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const sheet = await res.json();
      setSheets(prev => [sheet, ...prev]);
      setShowCreate(false);
      openSheet(sheet);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur lors de la création'); }
    finally { setSaving(false); }
  }

  async function deleteSheet(sheetId: string) {
    setDeleting(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/presence-sheets/${sheetId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      setSheets(prev => prev.filter(s => s.id !== sheetId));
      if (selectedSheet?.id === sheetId) setSelectedSheet(null);
      setConfirmDeleteId(null);
    } catch {
      setError('Erreur lors de la suppression');
      setConfirmDeleteId(null);
    } finally { setDeleting(false); }
  }

  async function resetSheetStatus(sheetId: string, status: 'draft' | 'sent') {
    try {
      const res = await fetchWithRefresh(`${API_URL}/presence-sheets/${sheetId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSheets(prev => prev.map(s => s.id === sheetId ? updated : s));
      setSelectedSheet(updated);
      setEditingEntries(updated.entries.map((e: Entry) => ({ ...e })));
      setSuccessMsg('Statut mis à jour');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { setError('Erreur lors de la mise à jour'); }
  }

  function updateEntry(idx: number, field: keyof Entry, value: string | boolean) {
    setEditingEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  if (loading) return <PageLoader title={t('page.presenceSheets', 'Feuilles de présence')} icon={<HiOutlineDocumentText className="w-6 h-6 text-white" />} />;

  const canEdit = isNannyUser || isAdminUser;

  const parentChildIds = parentFilter ? (parents.find(p => p.id === parentFilter)?.children?.map(c => c.id) || []) : [];
  const filteredSheets = sheets.filter(s =>
    s.child && s.nanny &&
    (!filterMonth || s.month === Number(filterMonth)) &&
    (!filterYear || s.year === Number(filterYear)) &&
    (!centerFilter || s.centerId === centerFilter) &&
    (!parentFilter || parentChildIds.includes(s.childId))
  );

  return (
    <div className="min-h-screen bg-[#f4f7fa] p-2 sm:p-4 md:pl-64 w-full">


<div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
              <HiOutlineDocumentText className="w-6 h-6 text-white" />
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('page.presenceSheets', 'Feuilles de présence')}</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('page.presenceSheets.description', 'Consultez et gérez les feuilles de présence et signatures des enfants.')}</p>
            </div>
          </div>
          {canEdit && (
            <button onClick={() => { setShowCreate(true); setError(''); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>
              <HiOutlinePlus className="w-4 h-4" /> {t('presenceSheets.new_sheet', 'Nouvelle feuille')}
            </button>
          )}
        </div>

        {/* Filtres mois / année */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 text-gray-700"
          >
            <option value="">{t('presenceSheets.month.all', 'Tous les mois')}</option>
            {monthNames.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 text-gray-700"
          >
            <option value="">{t('presenceSheets.year.all', 'Toutes les années')}</option>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          {isAdminUser && (
            <select
              value={parentFilter}
              onChange={e => setParentFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 text-gray-700"
            >
              <option value="">{t('presenceSheets.parent.all', 'Tous les parents')}</option>
              {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {u?.role === 'super-admin' && (
            <select
              value={centerFilter}
              onChange={e => setCenterFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 text-gray-700"
            >
              <option value="">{t('presenceSheets.center.all', 'Tous les centres')}</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {(filterMonth || filterYear || centerFilter || parentFilter) && (
            <button
              onClick={() => { setFilterMonth(''); setFilterYear(''); setCenterFilter(''); setParentFilter(''); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 transition"
            >
              <HiOutlineX className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          )}
          {(filterMonth || filterYear || centerFilter || parentFilter) && (
            <span className="text-xs text-gray-400 ml-1">
              {filteredSheets.length} résultat{filteredSheets.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Modal création */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-[#0b5566]">{t('presenceSheets.new_sheet.title', 'Nouvelle feuille de présence')}</h2>
                <button onClick={() => setShowCreate(false)}><HiOutlineX className="w-5 h-5 text-gray-400" /></button>
              </div>
              {error && <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</div>}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('presenceSheets.create.child', 'Enfant')}</label>
                  <select value={createForm.childId} onChange={e => setCreateForm(p => ({ ...p, childId: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30">
                    <option value="">{t('presenceSheets.create.selectChild', 'Sélectionner un enfant')}</option>
                    {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('presenceSheets.create.month', 'Mois')}</label>
                    <select value={createForm.month} onChange={e => setCreateForm(p => ({ ...p, month: e.target.value }))}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30">
                      {monthNames.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('presenceSheets.create.year', 'Année')}</label>
                    <select value={createForm.year} onChange={e => setCreateForm(p => ({ ...p, year: e.target.value }))}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30">
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('presenceSheets.create.arrival', 'Arrivée par défaut')}</label>
                    <input type="text" value={createForm.defaultArrival} onChange={e => setCreateForm(p => ({ ...p, defaultArrival: e.target.value }))}
                      placeholder={t('presenceSheets.create.arrivalPlaceholder', '08h30')} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('presenceSheets.create.departure', 'Départ par défaut')}</label>
                    <input type="text" value={createForm.defaultDeparture} onChange={e => setCreateForm(p => ({ ...p, defaultDeparture: e.target.value }))}
                      placeholder={t('presenceSheets.create.departurePlaceholder', '17h30')} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">{t('global.cancel', 'Annuler')}</button>
                <button onClick={createSheet} disabled={!createForm.childId || saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#0b5566] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {saving ? t('presenceSheets.creating', 'Création…') : t('presenceSheets.create', 'Créer')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des feuilles — toujours visible, détail en dessous */}
        {!selectedSheet && (
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-400 text-center mb-3">{t('presenceSheets.select_sheet', 'Sélectionnez une feuille pour la consulter')}</p>
            {filteredSheets.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
                <HiOutlineDocumentText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {filterMonth || filterYear ? t('presenceSheets.select_sheet.empty.date', 'Aucune feuille pour cette période') : t('presenceSheets.select_sheet.empty', 'Aucune feuille de présence')}
                </p>
                {canEdit && !filterMonth && !filterYear && <p className="text-xs mt-1">{t('presenceSheets.select_sheet.first', 'Créez votre première feuille')}</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSheets.map(sheet => (
                  <div key={sheet.id}
                    className="bg-white rounded-2xl shadow border-2 border-transparent transition-all hover:border-[#0b5566]/40 hover:shadow-md">
                    <button className="w-full text-left p-4" onClick={() => openSheet(sheet)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-[#e6f4f7] flex items-center justify-center text-xs font-bold text-[#0b5566]">
                            {sheet.child?.photoUrl
                              ? <img src={sheet.child.photoUrl} alt={sheet.child.name} className="w-full h-full object-cover" />
                              : sheet.child?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{sheet.child?.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{monthNames[sheet.month - 1]} {sheet.year} · {sheet.nanny?.name}</div>
                          </div>
                        </div>
                        {statusBadge(sheet.status, t)}
                      </div>
                    </button>
                    {isAdminUser && (
                      <div className="px-4 pb-3 flex justify-end">
                        <button onClick={() => setConfirmDeleteId(sheet.id)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition">
                          <HiOutlineTrash className="w-3.5 h-3.5" /> {t('global.delete', 'Supprimer')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Détail feuille sélectionnée */}
        {selectedSheet && (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedSheet(null)} className="lg:hidden mr-1 p-1.5 rounded-lg hover:bg-gray-100 transition" title={t('common.back', 'Retour')}>
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-[#e6f4f7] flex items-center justify-center text-xs font-bold text-[#0b5566]">
                        {selectedSheet.child.photoUrl
                          ? <img src={selectedSheet.child.photoUrl} alt={selectedSheet.child.name} className="w-full h-full object-cover" />
                          : selectedSheet.child.name.charAt(0).toUpperCase()}
                      </div>
                      <h2 className="font-bold text-[#0b5566] text-base">{selectedSheet.child.name}</h2>
                      {statusBadge(selectedSheet.status, t)}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{monthNames[selectedSheet.month - 1]} {selectedSheet.year} · {selectedSheet.nanny.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {canEdit && selectedSheet.status !== 'signed' && (
                      <button onClick={saveEntries} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#0b5566]/30 text-[#0b5566] text-xs font-semibold hover:bg-[#0b5566]/5 disabled:opacity-50">
                        <HiOutlinePencil className="w-3.5 h-3.5" />
                        {saving ? t('presenceSheets.saving', 'Sauvegarde…') : t('presenceSheets.save', 'Sauvegarder')}
                      </button>
                    )}
                    {canEdit && selectedSheet.status === 'draft' && (
                      <button onClick={sendSheet} disabled={sending}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                        <HiOutlinePaperAirplane className="w-3.5 h-3.5" />
                        {sending ? t('presenceSheets.sending', 'Envoi…') : t('presenceSheets.send', 'Envoyer aux parents')}
                      </button>
                    )}
                    <button onClick={() => downloadPdf(selectedSheet)} disabled={downloadingPdf}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50">
                      <HiOutlineDownload className="w-3.5 h-3.5" /> {downloadingPdf ? '…' : t('presenceSheets.pdf', 'PDF')}
                    </button>
                    {isAdminUser && selectedSheet.status === 'signed' && (
                      <button onClick={() => resetSheetStatus(selectedSheet.id, 'sent')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 text-orange-600 text-xs font-semibold hover:bg-orange-50"
                        title={t('presenceSheets.reopen.title', 'Remettre en statut Envoyée')}>
                        <HiOutlineRefresh className="w-3.5 h-3.5" /> {t('presenceSheets.reopen', 'Réouvrir')}
                      </button>
                    )}
                    {isAdminUser && (
                      <button onClick={() => setConfirmDeleteId(selectedSheet.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50">
                        <HiOutlineTrash className="w-3.5 h-3.5" /> {t('global.delete', 'Supprimer')}
                      </button>
                    )}
                  </div>
                </div>

                {successMsg && (
                  <div className="mx-5 mt-3 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2">
                    <HiOutlineCheck className="w-4 h-4" />{successMsg}
                  </div>
                )}
                {error && <div className="mx-5 mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}

                {/* Légende signatures */}
                {selectedSheet.status !== 'draft' && (
                  <div className="px-5 pt-3 pb-1 flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#0b5566] inline-block" />{t('presenceSheets.legend.nannySigned', 'Nounou signé')}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />{t('presenceSheets.legend.parentSigned', 'Parent signé')}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />{t('presenceSheets.legend.notSigned', 'Non signé')}</span>
                  </div>
                )}

                {/* Vue mobile : cartes par jour */}
                <div className="block md:hidden divide-y divide-gray-100">
                  {editingEntries.map((entry, idx) => {
                    const d = new Date(entry.date);
                    const nonWorkDay = isNonWorkDay(entry.date);
                    const entryIsSigned = !!(entry.nannySignature || entry.parentSignature);
                    const canEditEntry = canEdit && selectedSheet.status !== 'signed' && (isAdminUser || !entryIsSigned);
                    const canSignNanny = (isNannyUser || isAdminUser) && selectedSheet.status !== 'draft' && !entry.nannySignedAt && !nonWorkDay && !entry.absent;
                    const canSignParent = isParentUser && selectedSheet.status !== 'draft' && !entry.parentSignedAt && !nonWorkDay && !entry.absent;

                    if (nonWorkDay) {
                      return (
                        <div key={entry.id} className="px-4 py-2 flex items-center justify-between bg-gray-50/60">
                          <span className="text-xs font-medium text-gray-400">
                            {DAY_NAMES[d.getDay()]} {d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <span className="text-xs text-gray-300">—</span>
                        </div>
                      );
                    }

                    return (
                      <div key={entry.id} className={`px-4 py-3 ${entry.absent ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}`}>
                        {/* Ligne date + absent */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-800">
                              {DAY_NAMES[d.getDay()]} {d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </span>
                            {entryIsSigned && !isAdminUser && (
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><title>{t('presenceSheets.entry.locked', 'Entrée verrouillée — déjà signée')}</title><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.absent && <span className="text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">{t('presenceSheets.entry.absent', 'Absent')}</span>}
                            {canEditEntry && (
                              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                                <input type="checkbox" checked={entry.absent} onChange={e => updateEntry(idx, 'absent', e.target.checked)} className="w-4 h-4 rounded accent-red-500" />
                                {t('presenceSheets.entry.absent', 'Absent')}
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Heures */}
                        {!entry.absent && (
                          <div className="flex gap-3 mb-2">
                            <div className="flex-1">
                              <div className="text-xs text-gray-400 mb-1">{t('presenceSheets.entry.arrival', 'Arrivée')}</div>
                              {canEditEntry ? (
                                <input type="text" value={entry.arrivalTime || ''} onChange={e => updateEntry(idx, 'arrivalTime', e.target.value)}
                                  placeholder="08h30"
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#0b5566]/40" />
                              ) : <span className="text-sm font-medium text-gray-700">{entry.arrivalTime || '—'}</span>}
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-gray-400 mb-1">{t('presenceSheets.entry.departure', 'Départ')}</div>
                              {canEditEntry ? (
                                <input type="text" value={entry.departureTime || ''} onChange={e => updateEntry(idx, 'departureTime', e.target.value)}
                                  placeholder="17h30"
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#0b5566]/40" />
                              ) : <span className="text-sm font-medium text-gray-700">{entry.departureTime || '—'}</span>}
                            </div>
                          </div>
                        )}

                        {/* Commentaire */}
                        {canEditEntry ? (
                          <input type="text" value={entry.comment || ''} onChange={e => updateEntry(idx, 'comment', e.target.value)}
                            placeholder={t('presenceSheets.entry.commentPlaceholder', 'Commentaire…')}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0b5566]/40 mb-2" />
                        ) : entry.comment ? (
                          <p className="text-xs text-gray-500 mb-2">{entry.comment}</p>
                        ) : null}

                        {/* Signatures */}
                        {selectedSheet.status !== 'draft' && !entry.absent && (
                          <div className="flex gap-2 mt-1">
                            {/* Sig nounou */}
                            <div className="flex-1 flex items-center gap-1.5">
                              {entry.nannySignedAt ? (
                                <span className="flex items-center gap-1 text-xs text-[#0b5566] font-medium">
                                  <HiOutlineCheck className="w-3.5 h-3.5" /> {t('presenceSheets.entry.nanny', 'Nounou')}
                                </span>
                              ) : canSignNanny ? (
                                <button onClick={() => setSigningEntry({ entryId: entry.id, role: 'nanny' })}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-[#0b5566]/40 text-xs text-[#0b5566] hover:bg-[#0b5566]/5 transition">
                                  <HiOutlinePencil className="w-3 h-3" /> {t('presenceSheets.entry.signNanny', 'Signer (nounou)')}
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-gray-300">
                                  <span className="w-3 h-3 rounded-full border border-gray-200 inline-block" /> Nounou
                                </span>
                              )}
                            </div>
                            {/* Sig parent */}
                            <div className="flex-1 flex items-center gap-1.5">
                              {entry.parentSignedAt ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                  <HiOutlineCheck className="w-3.5 h-3.5" /> Parent
                                </span>
                              ) : canSignParent ? (
                                <button onClick={() => setSigningEntry({ entryId: entry.id, role: 'parent' })}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-emerald-400/60 text-xs text-emerald-600 hover:bg-emerald-50 transition">
                                  <HiOutlinePencil className="w-3 h-3" /> {t('presenceSheets.entry.signParent', 'Signer (parent)')}
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-gray-300">
                                  <span className="w-3 h-3 rounded-full border border-gray-200 inline-block" /> Parent
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Vue desktop : tableau */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f4f7fa] text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-3 py-2.5 text-left">Date</th>
                        <th className="px-2 py-2.5 text-left">Jour</th>
                        <th className="px-2 py-2.5 text-center">Arrivée</th>
                        <th className="px-2 py-2.5 text-center">Départ</th>
                        <th className="px-2 py-2.5 text-center">Absent</th>
                        <th className="px-2 py-2.5 text-left">Commentaire</th>
                        {selectedSheet.status !== 'draft' && <th className="px-2 py-2.5 text-center">Sig. Nounou</th>}
                        {selectedSheet.status !== 'draft' && <th className="px-2 py-2.5 text-center">Sig. Parent</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {editingEntries.map((entry, idx) => {
                        const d = new Date(entry.date);
                        const nonWorkDay = isNonWorkDay(entry.date);
                        const rowBg = entry.absent ? 'bg-red-50' : nonWorkDay ? 'bg-gray-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]';
                        const textColor = nonWorkDay ? 'text-gray-400' : 'text-gray-700';
                        const entryIsSigned = !!(entry.nannySignature || entry.parentSignature);
                    const canEditEntry = canEdit && selectedSheet.status !== 'signed' && (isAdminUser || !entryIsSigned);
                        const canSignNanny = (isNannyUser || isAdminUser) && selectedSheet.status !== 'draft' && !entry.nannySignedAt && !nonWorkDay && !entry.absent;
                        const canSignParent = isParentUser && selectedSheet.status !== 'draft' && !entry.parentSignedAt && !nonWorkDay && !entry.absent;

                        return (
                          <tr key={entry.id} className={`${rowBg} border-b border-gray-50`}>
                            <td className={`px-3 py-1.5 font-medium text-xs ${textColor}`}>
                              <div className="flex items-center gap-1">
                                {d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                {entryIsSigned && !isAdminUser && (
                                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><title>Verrouillé — déjà signé</title><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                )}
                              </div>
                            </td>
                            <td className={`px-2 py-1.5 text-xs ${textColor}`}>{DAY_NAMES[d.getDay()]}</td>
                            <td className="px-2 py-1.5 text-center">
                              {canEditEntry && !nonWorkDay ? (
                                <input type="text" value={entry.arrivalTime || ''} onChange={e => updateEntry(idx, 'arrivalTime', e.target.value)}
                                  placeholder="08h30" disabled={entry.absent}
                                  className="w-14 text-center border border-gray-200 rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0b5566]/40 disabled:opacity-30" />
                              ) : <span className={`text-xs ${textColor}`}>{entry.arrivalTime || '—'}</span>}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {canEditEntry && !nonWorkDay ? (
                                <input type="text" value={entry.departureTime || ''} onChange={e => updateEntry(idx, 'departureTime', e.target.value)}
                                  placeholder="17h30" disabled={entry.absent}
                                  className="w-14 text-center border border-gray-200 rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0b5566]/40 disabled:opacity-30" />
                              ) : <span className={`text-xs ${textColor}`}>{entry.departureTime || '—'}</span>}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {canEditEntry && !nonWorkDay ? (
                                <input type="checkbox" checked={entry.absent} onChange={e => updateEntry(idx, 'absent', e.target.checked)} className="w-4 h-4 rounded accent-red-500" />
                              ) : entry.absent ? <span className="text-red-500 font-semibold text-xs">Abs.</span> : null}
                            </td>
                            <td className="px-2 py-1.5">
                              {canEditEntry && !nonWorkDay ? (
                                <input type="text" value={entry.comment || ''} onChange={e => updateEntry(idx, 'comment', e.target.value)}
                                  placeholder="Note…" className="w-full min-w-[80px] border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0b5566]/40" />
                              ) : !nonWorkDay ? <span className="text-xs text-gray-400">{entry.comment || ''}</span> : null}
                            </td>
                            {selectedSheet.status !== 'draft' && (
                              <td className="px-2 py-1.5 text-center">
                                {nonWorkDay || entry.absent ? null : entry.nannySignedAt ? (
                                  <span title={`Signé le ${new Date(entry.nannySignedAt).toLocaleDateString('fr-FR')}`}>
                                    <HiOutlineCheck className="w-4 h-4 text-[#0b5566] mx-auto" />
                                  </span>
                                ) : canSignNanny ? (
                                  <button onClick={() => setSigningEntry({ entryId: entry.id, role: 'nanny' })}
                                    className="w-6 h-6 rounded-full border-2 border-dashed border-[#0b5566]/40 hover:border-[#0b5566] hover:bg-[#0b5566]/5 transition mx-auto flex items-center justify-center"
                                    title="Signer ce jour">
                                    <HiOutlinePencil className="w-3 h-3 text-[#0b5566]/50" />
                                  </button>
                                ) : <span className="w-4 h-4 rounded-full border border-gray-200 inline-block" />}
                              </td>
                            )}
                            {selectedSheet.status !== 'draft' && (
                              <td className="px-2 py-1.5 text-center">
                                {nonWorkDay || entry.absent ? null : entry.parentSignedAt ? (
                                  <span title={`Signé le ${new Date(entry.parentSignedAt).toLocaleDateString('fr-FR')}`}>
                                    <HiOutlineCheck className="w-4 h-4 text-emerald-500 mx-auto" />
                                  </span>
                                ) : canSignParent ? (
                                  <button onClick={() => setSigningEntry({ entryId: entry.id, role: 'parent' })}
                                    className="w-6 h-6 rounded-full border-2 border-dashed border-emerald-400/60 hover:border-emerald-500 hover:bg-emerald-50 transition mx-auto flex items-center justify-center"
                                    title="Signer ce jour">
                                    <HiOutlinePencil className="w-3 h-3 text-emerald-400" />
                                  </button>
                                ) : <span className="w-4 h-4 rounded-full border border-gray-200 inline-block" />}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Récap */}
                <div className="px-5 py-4 border-t border-gray-100 bg-[#f8fafc]">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-gray-600">Présences : <strong>{editingEntries.filter(e => !e.absent && e.arrivalTime && !isWeekend(e.date)).length} jours</strong></span>
                    <span className="text-gray-600">Absences : <strong>{editingEntries.filter(e => e.absent).length} jours</strong></span>
                    {selectedSheet.status !== 'draft' && (
                      <>
                        <span className="text-[#0b5566]">Sig. nounou : <strong>{editingEntries.filter(e => e.nannySignedAt).length}</strong></span>
                        <span className="text-emerald-600">Sig. parent : <strong>{editingEntries.filter(e => e.parentSignedAt).length}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Tableau de facturation + Signatures globales */}
                <div className="px-5 py-5 border-t border-gray-100 space-y-5">

                  {/* Tableau réservé à la facturation */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">Tableau Réservé à la Facturation</h3>
                    <div className="border border-gray-300 rounded-xl overflow-hidden text-sm">
                      {([
                        { label: 'Nombre de jours de contrat', key: 'joursContrat' },
                        { label: 'Nombre de jours de présence', key: 'joursPresence' },
                        { label: "Nombre de jours d'absences", key: 'joursAbsence' },
                        { label: "Nombre d'heures complémentaires", key: 'heuresCompl' },
                      ] as { label: string; key: keyof typeof billingData }[]).map((row, i) => (
                        <div key={i} className={`flex items-center ${i > 0 ? 'border-t border-gray-200' : ''}`}>
                          <span className="flex-1 px-4 py-2.5 text-gray-700">{row.label}</span>
                          {(isAdminUser || isNannyUser) ? (
                            <input
                              type="number"
                              min="0"
                              step={row.key === 'heuresCompl' ? '0.5' : '1'}
                              value={billingData[row.key]}
                              onChange={e => setBillingData(prev => ({ ...prev, [row.key]: e.target.value }))}
                              onBlur={saveBilling}
                              placeholder="—"
                              className="w-20 border-l border-gray-200 px-3 py-2.5 text-center text-gray-800 bg-transparent focus:outline-none focus:bg-[#0b5566]/5 transition"
                            />
                          ) : (
                            <span className="w-20 border-l border-gray-200 px-3 py-2.5 text-center text-gray-600">{billingData[row.key] || '—'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {savingBilling && <p className="text-[10px] text-gray-400 mt-1 text-right">{t('presenceSheets.billing.saving', 'Enregistrement…')}</p>}
                  </div>

                  {/* Signatures globales */}
                  {selectedSheet.status !== 'draft' && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">{t('presenceSheets.signatures.title', 'Signatures de validation')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Signature Nounou */}
                      <div className="border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('presenceSheets.signature.role.nanny', 'Nounou')}</span>
                        {selectedSheet.nannySignature ? (
                          <img src={selectedSheet.nannySignature} alt={t('presenceSheets.signature.alt.nanny', 'Signature nounou')} className="h-16 w-full object-contain" />
                        ) : (
                          <div className="h-16 w-full flex items-center justify-center text-gray-300 text-xs border border-dashed border-gray-200 rounded-lg">{t('presenceSheets.signature.notSigned', 'Non signé')}</div>
                        )}
                        {selectedSheet.nannySignedAt && (
                          <span className="text-[10px] text-gray-400">{t('presenceSheets.signature.signedAt', { date: new Date(selectedSheet.nannySignedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR') })}</span>
                        )}
                        {(isNannyUser || isAdminUser) && !selectedSheet.nannySignature && (
                          <button
                            onClick={() => setSigningSheet('nanny')}
                            className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#0b5566]/40 text-xs text-[#0b5566] hover:bg-[#0b5566]/5 transition">
                            <HiOutlinePencil className="w-3 h-3" /> {t('presenceSheets.signature.btn', 'Signer')}
                          </button>
                        )}
                      </div>

                      {/* Signature Parent */}
                      <div className="border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('presenceSheets.signature.role.parent', 'Parent')}</span>
                        {selectedSheet.parentSignature ? (
                          <img src={selectedSheet.parentSignature} alt={t('presenceSheets.signature.alt.parent', 'Signature parent')} className="h-16 w-full object-contain" />
                        ) : (
                          <div className="h-16 w-full flex items-center justify-center text-gray-300 text-xs border border-dashed border-gray-200 rounded-lg">{t('presenceSheets.signature.notSigned', 'Non signé')}</div>
                        )}
                        {selectedSheet.parentSignedAt && (
                          <span className="text-[10px] text-gray-400">{t('presenceSheets.signature.signedAt', { date: new Date(selectedSheet.parentSignedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR') })}</span>
                        )}
                        {isParentUser && !selectedSheet.parentSignature && (
                          <button
                            onClick={() => setSigningSheet('parent')}
                            className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-emerald-400/60 text-xs text-emerald-600 hover:bg-emerald-50 transition">
                            <HiOutlinePencil className="w-3 h-3" /> {t('presenceSheets.signature.btn', 'Signer')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </div>
        )}

        {/* Modal confirmation suppression */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <HiOutlineTrash className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t('presenceSheets.delete.title', 'Supprimer la feuille')}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{t('presenceSheets.delete.subtitle', 'Cette action est irréversible')}</p>
                </div>
              </div>
              {(() => {
                const sheet = sheets.find(s => s.id === confirmDeleteId);
                return sheet ? (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-[#e6f4f7] flex items-center justify-center text-xs font-bold text-[#0b5566]">
                      {sheet.child?.photoUrl
                        ? <img src={sheet.child.photoUrl} alt={sheet.child.name} className="w-full h-full object-cover" />
                        : sheet.child?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{sheet.child?.name}</p>
                      <p className="text-xs text-gray-500">{monthNames[sheet.month - 1]} {sheet.year} · {sheet.nanny?.name}</p>
                    </div>
                    {statusBadge(sheet.status, t)}
                  </div>
                ) : null;
              })()}
              <p className="text-sm text-gray-600 mb-6">
                {t('presenceSheets.delete.confirm', 'Êtes-vous sûr de vouloir supprimer cette feuille de présence ? Toutes les entrées et signatures associées seront définitivement perdues.')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
                  {t('global.cancel', 'Annuler')}
                </button>
                <button
                  onClick={() => deleteSheet(confirmDeleteId)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleting ? (
                    <><HiOutlineRefresh className="w-4 h-4 animate-spin" /> {t('presenceSheets.delete.deleting', 'Suppression…')}</>
                  ) : (
                    <><HiOutlineTrash className="w-4 h-4" /> {t('presenceSheets.delete.button', 'Supprimer')}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal signature globale de la feuille */}
        {signingSheet && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm sm:max-w-sm overflow-y-auto max-h-[90vh] p-6 pb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#0b5566] text-sm">
                  {t('presenceSheets.signatureSheet.title', { role: signingSheet === 'nanny' ? t('presenceSheets.signature.role.nanny', 'Nounou') : t('presenceSheets.signature.role.parent', 'Parent') })}
                </h2>
                <button onClick={() => setSigningSheet(null)} className="p-2 rounded-full hover:bg-gray-100"><HiOutlineX className="w-5 h-5 text-gray-400" /></button>
              </div>
              <p className="text-xs text-gray-500 mb-4">{t('presenceSheets.signatureSheet.desc', 'Signez pour valider l\'ensemble de la feuille de présence du mois.')}</p>
              <SignaturePad
                onSave={sig => signSheet(signingSheet, sig)}
                onCancel={() => setSigningSheet(null)}
                t={t}
              />
            </div>
          </div>
        )}

        {/* Modal signature par entrée */}
        {signingEntry && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm overflow-y-auto max-h-[90vh] p-6 pb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#0b5566]">
                  Signature {signingEntry.role === 'nanny' ? 'Nounou' : 'Parent'} — {(() => {
                    const e = editingEntries.find(e => e.id === signingEntry.entryId);
                    return e ? new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
                  })()}
                </h2>
                <button onClick={() => setSigningEntry(null)}><HiOutlineX className="w-5 h-5 text-gray-400" /></button>
              </div>
              {/* Afficher les heures du jour */}
              {(() => {
                const e = editingEntries.find(e => e.id === signingEntry.entryId);
                if (!e) return null;
                return (
                  <div className="mb-4 bg-[#f4f7fa] rounded-xl px-4 py-3 text-sm flex gap-6">
                    <span className="text-gray-500">Arrivée : <strong className="text-gray-800">{e.arrivalTime || '—'}</strong></span>
                    <span className="text-gray-500">Départ : <strong className="text-gray-800">{e.departureTime || '—'}</strong></span>
                  </div>
                );
              })()}
              <SignaturePad
                onSave={sig => signEntry(signingEntry.entryId, signingEntry.role, sig)}
                onCancel={() => setSigningEntry(null)}
                t={t}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
