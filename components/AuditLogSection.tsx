import { useEffect, useState, useCallback } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';

type AuditLog = {
  id: string;
  action: string;
  targetType: 'parent' | 'nanny' | 'child' | 'center' | string;
  targetId: string;
  snapshot: Record<string, unknown> | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  centerId: string | null;
  centerName: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  parent: 'Parent',
  nanny: 'Nounou',
  child: 'Enfant',
  center: 'Centre',
};

const TYPE_COLOR: Record<string, string> = {
  parent: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  nanny: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  child: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  center: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
};

function formatSnapshot(log: AuditLog): string {
  const s = log.snapshot;
  if (!s) return '—';
  if (log.targetType === 'parent') {
    const name = `${s.firstName || ''} ${s.lastName || ''}`.trim();
    const children = Array.isArray(s.children) ? s.children as { name?: string }[] : [];
    const childrenPart = children.length ? ` · ${children.length} enfant(s): ${children.map(c => c.name).join(', ')}` : '';
    return `${name || s.email || '—'}${s.email ? ` (${s.email})` : ''}${childrenPart}`;
  }
  if (log.targetType === 'nanny') {
    const nannies = Array.isArray(s.assignedChildren) ? s.assignedChildren as { name?: string }[] : [];
    const childrenPart = nannies.length ? ` · suivait: ${nannies.map(c => c.name).join(', ')}` : '';
    return `${s.name || '—'}${s.email ? ` (${s.email})` : ''}${childrenPart}`;
  }
  if (log.targetType === 'child') {
    const parents = Array.isArray(s.parents) ? s.parents as { name?: string }[] : [];
    const parentsPart = parents.length ? ` · parent(s): ${parents.map(p => p.name).join(', ')}` : '';
    return `${s.name || '—'}${parentsPart}`;
  }
  if (log.targetType === 'center') {
    const counts = s.counts as Record<string, number> | undefined;
    const countsPart = counts ? ` · ${counts.parents || 0} parents, ${counts.nannies || 0} nounous, ${counts.children || 0} enfants` : '';
    return `${s.name || '—'}${countsPart}`;
  }
  return JSON.stringify(s);
}

export default function AuditLogSection() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (typeFilter) params.set('targetType', typeFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetchWithRefresh(`api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error('failed');
      const body = await res.json();
      setLogs(body.logs || []);
      setTotal(body.total || 0);
    } catch {
      setError(t('settings.auditlog.error', "Impossible de charger l'historique."));
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search, t]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-primary">{t('settings.auditlog.title', "Historique des suppressions")}</h2>
        <p className="text-sm text-muted mt-1">
          {t('settings.auditlog.subtitle', "Trace qui a supprimé un parent, une nounou, un enfant ou un centre, et quand — utile en cas de litige avec une famille.")}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={search}
          onChange={e => { setPage(1); setSearch(e.target.value); }}
          placeholder={t('settings.auditlog.search_placeholder', "Rechercher (nom, email, centre)...")}
          className="border border-border-default rounded-xl px-3 py-2 text-sm bg-card text-primary flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30"
        />
        <select
          value={typeFilter}
          onChange={e => { setPage(1); setTypeFilter(e.target.value); }}
          className="border border-border-default rounded-xl px-3 py-2 text-sm bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30"
        >
          <option value="">{t('settings.auditlog.filter.all', "Tous les types")}</option>
          <option value="parent">Parent</option>
          <option value="nanny">Nounou</option>
          <option value="child">Enfant</option>
          <option value="center">Centre</option>
        </select>
      </div>

      {error && <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-10 text-muted text-sm">{t('loading')}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-muted text-sm">{t('settings.auditlog.empty', "Aucune suppression enregistrée.")}</div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-card border border-border-default rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 w-fit ${TYPE_COLOR[log.targetType] || 'bg-gray-100 text-gray-600'}`}>
                {TYPE_LABEL[log.targetType] || log.targetType}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-primary truncate">{formatSnapshot(log)}</div>
                <div className="text-xs text-muted mt-0.5">
                  {t('settings.auditlog.by', "Supprimé par")} <span className="font-medium text-secondary">{log.actorName || log.actorEmail || t('common.unknown', 'Inconnu')}</span>
                  {log.centerName ? ` · ${log.centerName}` : ''}
                </div>
              </div>
              <div className="text-xs text-muted flex-shrink-0 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-border-default text-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-input transition"
          >
            {t('common.previous', 'Précédent')}
          </button>
          <span className="text-xs text-muted">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-border-default text-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-input transition"
          >
            {t('common.next', 'Suivant')}
          </button>
        </div>
      )}
    </div>
  );
}
