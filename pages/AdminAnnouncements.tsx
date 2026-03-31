import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
import { useNavigate } from 'react-router-dom';

function useIsShortLandscape() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const check = () => setV(window.matchMedia('(min-width: 768px) and (max-height: 600px)').matches);
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check); };
  }, []);
  return v;
}

const API_URL = import.meta.env.VITE_API_URL;

type AnnouncementType = 'info' | 'success' | 'warning' | 'update';
type View = 'list' | 'create' | 'detail';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  active: boolean;
  sendEmail: boolean;
  createdAt: string;
}

const TYPE_OPTIONS: { value: AnnouncementType; label: string; badgeCls: string; activeCls: string; icon: string }[] = [
  { value: 'update',  label: 'Mise à jour', badgeCls: 'bg-[#0b5566]/10 text-[#0b5566] border-[#0b5566]/20',   activeCls: 'border-[#0b5566] bg-[#0b5566]/8 text-[#0b5566]',  icon: '🚀' },
  { value: 'info',    label: 'Information', badgeCls: 'bg-blue-100 text-blue-700 border-blue-200',              activeCls: 'border-blue-400 bg-blue-50 text-blue-700',          icon: 'ℹ️' },
  { value: 'success', label: 'Nouveauté',   badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200',    activeCls: 'border-emerald-400 bg-emerald-50 text-emerald-700', icon: '✨' },
  { value: 'warning', label: 'Important',   badgeCls: 'bg-amber-100 text-amber-700 border-amber-200',          activeCls: 'border-amber-400 bg-amber-50 text-amber-700',       icon: '⚠️' },
];

const TYPE_TRANSLATION_KEYS: Record<AnnouncementType, string> = {
  update: 'announcements.type.update',
  info: 'announcements.type.info',
  success: 'announcements.type.success',
  warning: 'announcements.type.warning',
};

const TYPE_GRADIENT: Record<AnnouncementType, string> = {
  update:  'from-[#0b5566] to-[#1a8fa6]',
  info:    'from-blue-500 to-indigo-600',
  success: 'from-emerald-500 to-teal-600',
  warning: 'from-amber-500 to-orange-500',
};

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyList({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#0b5566]/8 flex items-center justify-center text-3xl">📢</div>
      <div>
        <div className="font-bold text-gray-700">{t('announcements.empty.title', 'Aucune annonce publiée')}</div>
        <div className="text-sm text-gray-400 mt-1">{t('announcements.empty.subtitle', 'Créez votre première annonce pour communiquer avec vos utilisateurs')}</div>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#0b5566] text-white rounded-xl font-semibold text-sm hover:bg-[#0a4a59] transition shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
        {t('announcements.action.create', 'Créer une annonce')}
      </button>
    </div>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────
function AnnouncementItem({ a, selected, onClick }: { a: Announcement; selected: boolean; onClick: () => void }) {
  const { t } = useI18n();
  const opt = TYPE_OPTIONS.find(t => t.value === a.type) || TYPE_OPTIONS[0];
  const label = t(TYPE_TRANSLATION_KEYS[opt.value], opt.label);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left transition-all rounded-xl overflow-hidden border ${
        selected ? 'border-[#0b5566]/40 bg-[#0b5566]/5 shadow-sm' : 'border-gray-100 bg-white hover:border-[#0b5566]/20 hover:bg-[#0b5566]/3'
      } ${!a.active ? 'opacity-50' : ''}`}
    >
      <div className={`h-1 bg-gradient-to-r ${TYPE_GRADIENT[a.type]}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-gradient-to-br ${TYPE_GRADIENT[a.type]}`}>
            {opt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${opt.badgeCls}`}>{label}</span>
              {!a.active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{t('announcements.status.disabled', 'Désactivée')}</span>}
            </div>
            <div className="font-bold text-sm text-gray-800 truncate">{a.title}</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">{a.message}</div>
            <div className="text-[11px] text-gray-300 mt-1.5 flex items-center gap-2">
              {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              {a.sendEmail && <span className="text-[#1a8fa6]">✉</span>}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────
function CreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ title: '', message: '', type: 'update' as AnnouncementType, sendEmail: false });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => { autoResize(); }, [form.message, autoResize]);

  const selectedType = TYPE_OPTIONS.find(t => t.value === form.type)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) { setError(t('announcements.create.error.required', 'Titre et message requis')); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/announcements`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || t('announcements.create.error.generic', 'Erreur'));
      setSuccess(form.sendEmail ? t('announcements.create.success.emailSent', 'Annonce publiée et emails envoyés !') : t('announcements.create.success.published', 'Annonce publiée !'));

      setTimeout(() => onCreated(), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setSending(false);
    }
  };

  const { t } = useI18n();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={onCancel} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h2 className="font-bold text-gray-900 text-base">{t('announcements.create.title', 'Nouvelle annonce')}</h2>
          <p className="text-xs text-gray-400">{t('announcements.create.subtitle', 'Visible immédiatement pour tous les utilisateurs connectés')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
          {/* Type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">{t('announcements.create.type.label', "Type d'annonce")}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.type === opt.value ? `${opt.activeCls} shadow-sm scale-[1.03]` : 'border-gray-200 text-gray-400 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="text-xl leading-none">{opt.icon}</span>
                  <span className="text-[11px] font-bold">{t(TYPE_TRANSLATION_KEYS[opt.value], opt.label)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">{t('announcements.create.title.label', 'Titre')}</label>
            <input type="text" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={t('announcements.create.title.placeholder', 'ex: Mise à jour v2.1 — Nouvelles fonctionnalités')}
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566] transition bg-gray-50 focus:bg-white"
            />
            <div className="text-right text-[11px] text-gray-300 mt-1">{form.title.length}/100</div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">{t('announcements.create.message.label', 'Message')}</label>
            <textarea ref={textareaRef} value={form.message}
              onChange={e => { setForm(f => ({ ...f, message: e.target.value })); autoResize(); }}
              placeholder={t('announcements.create.message.placeholder', 'Décrivez en détail les changements ou informations à communiquer...')}
              maxLength={5000} rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 focus:border-[#0b5566] transition bg-gray-50 focus:bg-white resize-none overflow-hidden leading-relaxed"
              style={{ minHeight: '80px' }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-gray-400">Le texte s'adapte automatiquement</span>
              <span className={`text-[11px] font-medium ${form.message.length > 4500 ? 'text-red-400' : 'text-gray-300'}`}>{form.message.length}/5000</span>
            </div>
          </div>

          {/* Email */}
          <label className="flex items-start gap-4 p-4 rounded-xl bg-[#0b5566]/5 border border-[#0b5566]/10 cursor-pointer hover:bg-[#0b5566]/8 transition">
            <input type="checkbox" checked={form.sendEmail}
              onChange={e => setForm(f => ({ ...f, sendEmail: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded flex-shrink-0 accent-[#0b5566]"
            />
            <div>
              <div className="text-sm font-bold text-[#0b5566]">{t('announcements.create.email.label', 'Envoyer par email à tous les utilisateurs')}</div>
              <div className="text-xs text-[#0b5566]/60 mt-0.5">{t('announcements.create.email.subtitle', 'Un email sera envoyé à tous les comptes ayant activé les notifications.')}</div>
            </div>
          </label>

          {/* Preview */}
          {(form.title || form.message) && (
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="w-2 h-2 rounded-full bg-gray-300"/><span className="w-2 h-2 rounded-full bg-gray-300"/><span className="w-2 h-2 rounded-full bg-gray-300"/>
                <div className="ml-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('announcements.create.preview.label', 'Aperçu bannière')}</div>
              </div>
              <div className={`bg-gradient-to-r ${TYPE_GRADIENT[form.type]} p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-base">{selectedType.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm">{form.title || t('announcements.create.preview.title', "Titre de l'annonce")}</div>
                    <div className="text-white/80 text-xs mt-0.5 leading-relaxed whitespace-pre-wrap">{form.message || t('announcements.create.preview.message', "Message de l'annonce...")}</div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {success}
            </div>
          )}

          <button type="submit"
            disabled={sending || !form.title.trim() || !form.message.trim()}
            className="w-full py-3.5 bg-[#0b5566] text-white font-bold text-sm rounded-xl hover:bg-[#0a4a59] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {sending ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none"/></svg>{t('announcements.create.sending', 'Envoi en cours…')}</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                {t('announcements.create.publish', 'Publier')}{form.sendEmail ? ` + ${t('announcements.create.publishEmail', 'email')}` : ''}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────
function AnnouncementDetail({ a, onBack, onToggle, onDelete }: {
  a: Announcement; onBack: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const { t } = useI18n();
  const opt = TYPE_OPTIONS.find(t => t.value === a.type) || TYPE_OPTIONS[0];
  const statusText = a.active ? t('announcements.detail.status.active', 'Active') : t('announcements.detail.status.inactive', 'Inactive');
  const statusDot = a.active ? '●' : '○';
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-base truncate">{a.title}</h2>
            <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border flex-shrink-0 ${
              a.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
            }`}
          >
            {a.active
              ? <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>{statusText}</>
              : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>{statusText}</>
            }
          </button>
          <button onClick={onDelete} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors border border-red-100 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {/* Banner preview */}
        <div className={`rounded-2xl bg-gradient-to-r ${TYPE_GRADIENT[a.type]} p-5 shadow-md`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-xl">{opt.icon}</div>
            <div className="flex-1">
              <div className="text-white font-extrabold text-base">{a.title}</div>
              <div className="text-white/85 text-sm mt-1 leading-relaxed whitespace-pre-wrap">{a.message}</div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
          {[
            { label: t('announcements.detail.meta.status', 'Statut'), value: <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${a.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{statusDot} {statusText}</span> },
            { label: t('announcements.detail.meta.type', 'Type'), value: <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${opt.badgeCls}`}>{opt.icon} {t(TYPE_TRANSLATION_KEYS[opt.value], opt.label)}</span> },
            { label: t('announcements.detail.meta.email', 'Email envoyé'), value: <span className={`text-xs font-bold ${a.sendEmail ? 'text-[#0b5566]' : 'text-gray-400'}`}>{a.sendEmail ? `${t('announcements.detail.meta.emailYes', '✉ Oui')}` : t('announcements.detail.meta.emailNo', 'Non')}</span> },
            { label: t('announcements.detail.meta.published', 'Publiée le'), value: <span className="text-xs text-gray-600 font-medium">{new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{row.label}</span>
              {row.value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminAnnouncements() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isShortLandscape = useIsShortLandscape();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Announcement | null>(null);

  useEffect(() => {
    if (user && user.role !== 'super-admin') navigate('/dashboard');
  }, [user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/announcements`, { credentials: 'include' });
      if (res.ok) setAnnouncements(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (a: Announcement) => {
    await fetch(`${API_URL}/announcements/${a.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !a.active }),
    });
    await load();
    setSelected(prev => prev?.id === a.id ? { ...prev, active: !prev.active } : prev);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await fetch(`${API_URL}/announcements/${id}`, { method: 'DELETE', credentials: 'include' });
    setView('list');
    setSelected(null);
    load();
  };

  return (
    <div className={`flex bg-white overflow-hidden h-[calc(100vh-48px)] md:h-screen ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>

      {/* ── LEFT: List ── */}
      <div className={`flex flex-col border-r border-gray-100 flex-shrink-0 ${
        view !== 'list' ? 'hidden' : 'flex w-full'
      }`}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0b5566] flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
                </svg>
              </div>
              <div>
                <h1 className="font-extrabold text-gray-900 text-base leading-tight">{t('announcements.page.title', 'Annonces')}</h1>
                <p className="text-xs text-gray-400">
                  {(() => {
                    const activeCount = announcements.filter(a => a.active).length;
                    return t('announcements.page.stats', {
                      active: String(activeCount),
                      suffix: activeCount === 1 ? '' : 's',
                      total: String(announcements.length),
                    });
                  })()}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setSelected(null); setView('create'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b5566] text-white font-semibold text-xs rounded-lg hover:bg-[#0a4a59] transition shadow-sm active:scale-[0.98] flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              {t('announcements.action.create.short', 'Créer')}
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#0b5566] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <EmptyList onCreate={() => setView('create')} />
          ) : (
            <div className="space-y-2">
              {announcements.map(a => (
                <AnnouncementItem key={a.id} a={a}
                  selected={selected?.id === a.id && view === 'detail'}
                  onClick={() => { setSelected(a); setView('detail'); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Create / Detail — masqué quand view=list ── */}
      <div className={`flex-1 flex flex-col bg-[#f4f7fa] w-full min-w-0 ${view === 'list' ? 'hidden' : 'flex'}`}>
        {view === 'create' && (
          <div className="h-full bg-white flex flex-col overflow-hidden">
            <CreateForm onCreated={() => { setView('list'); load(); }} onCancel={() => setView('list')} />
          </div>
        )}

        {view === 'detail' && selected && (
          <div className="h-full bg-white flex flex-col overflow-hidden">
            <AnnouncementDetail
              a={selected}
              onBack={() => setView('list')}
              onToggle={() => handleToggle(selected)}
              onDelete={() => handleDelete(selected.id)}
            />
          </div>
        )}

      </div>
    </div>
  );
}
