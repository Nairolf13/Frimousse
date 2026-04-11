import { useEffect, useState } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';
import { HiOutlineExclamationCircle, HiOutlineCheck, HiOutlineRefresh, HiOutlineTrash } from 'react-icons/hi';

type NotFoundLog = {
  id: string;
  url: string;
  count: number;
  userAgent: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  resolved: boolean;
  resolvedAt: string | null;
};

export default function AdminNotFoundLogs() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<NotFoundLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const LIMIT = 50;

  async function fetchLogs(p = page, resolved = showResolved) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRefresh(
        `/api/admin/not-found-logs?page=${p}&limit=${LIMIT}&resolved=${resolved}`,
        { credentials: 'include' }
      );
      if (res.status === 403) {
        setError(t('admin.notfound.forbidden', 'Accès refusé — super-administrateur requis.'));
        setLogs([]);
        return;
      }
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError(t('admin.notfound.error', 'Erreur lors du chargement des logs.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLogs(page, showResolved); }, [page, showResolved]);

  async function handleResolve(id: string) {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await fetchWithRefresh(`/api/admin/not-found-logs/${id}/resolve`, {
        method: 'PATCH',
        credentials: 'include',
      });
      setLogs(prev => prev.filter(l => l.id !== id));
      setTotal(prev => (prev !== null ? prev - 1 : prev));
    } catch {
      // ignore
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await fetchWithRefresh(`/api/admin/not-found-logs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setLogs(prev => prev.filter(l => l.id !== id));
      setTotal(prev => (prev !== null ? prev - 1 : prev));
    } catch {
      // ignore
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  }

  const totalPages = total !== null ? Math.ceil(total / LIMIT) : 1;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <HiOutlineExclamationCircle className="w-5 h-5 text-red-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {t('admin.notfound.title', 'Pages introuvables (404)')}
          </h1>
        </div>
        <p className="text-gray-500 text-sm ml-13">
          {t('admin.notfound.subtitle', 'URLs visitées qui ont déclenché une erreur 404 sur le site.')}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => { setShowResolved(false); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!showResolved ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          {t('admin.notfound.tab.unresolved', 'Non résolus')}
          {!showResolved && total !== null && (
            <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{total}</span>
          )}
        </button>
        <button
          onClick={() => { setShowResolved(true); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${showResolved ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          {t('admin.notfound.tab.resolved', 'Résolus')}
        </button>
        <button
          onClick={() => fetchLogs(page, showResolved)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.notfound.refresh', 'Actualiser')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            {t('admin.notfound.loading', 'Chargement...')}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <HiOutlineCheck className="w-10 h-10 mb-3 text-emerald-400" />
            <p className="font-semibold text-gray-600">
              {showResolved
                ? t('admin.notfound.empty.resolved', 'Aucun log résolu.')
                : t('admin.notfound.empty.unresolved', 'Aucune page introuvable détectée.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {t('admin.notfound.col.url', 'URL')}
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-20">
                    {t('admin.notfound.col.hits', 'Hits')}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-40 hidden md:table-cell">
                    {t('admin.notfound.col.first', 'Première fois')}
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-40">
                    {t('admin.notfound.col.last', 'Dernière fois')}
                  </th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-gray-700 break-all">{log.url}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${log.count >= 10 ? 'bg-red-100 text-red-700' : log.count >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {log.count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400 hidden md:table-cell whitespace-nowrap">
                      {formatDate(log.firstSeenAt)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(log.lastSeenAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!showResolved && (
                          <button
                            onClick={() => handleResolve(log.id)}
                            disabled={actionLoading[log.id]}
                            title={t('admin.notfound.action.resolve', 'Marquer comme résolu')}
                            className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50"
                          >
                            <HiOutlineCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={actionLoading[log.id]}
                          title={t('admin.notfound.action.delete', 'Supprimer')}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-400">
            {t('admin.notfound.pagination', 'Page {page} sur {total}').replace('{page}', String(page)).replace('{total}', String(totalPages))}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {t('admin.notfound.prev', 'Précédent')}
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {t('admin.notfound.next', 'Suivant')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
