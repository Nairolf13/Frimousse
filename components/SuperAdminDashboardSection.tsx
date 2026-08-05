import { useEffect, useRef, useState } from 'react';
import { HiOutlineUsers, HiOutlineTrendingUp, HiOutlineTrendingDown } from 'react-icons/hi';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useI18n } from '../src/lib/useI18n';

const API_URL = import.meta.env.VITE_API_URL;

type OnlineUser = { id: string; name: string; role: string; centerName: string | null };

type RevenueMonth = { month: string; mrr: number; newSubscriptions: number; canceledSubscriptions: number };

type RevenueStats = {
  currentMrr: number;
  previousMrr: number;
  mrrGrowthPct: number;
  series: RevenueMonth[];
};

const ROLE_LABEL: Record<string, string> = {
  'super-admin': 'Super admin',
  admin: 'Admin',
  nanny: 'Nounou',
  parent: 'Parent',
};

const ROLE_DOT: Record<string, string> = {
  'super-admin': 'bg-violet-400',
  admin: 'bg-[#1a8fa8]',
  nanny: 'bg-amber-400',
  parent: 'bg-emerald-400',
};

function formatEuros(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
}

function wsUrl() {
  const wsBase = API_URL
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:')
    .replace(/\/api\/?$/, '');
  return `${wsBase}/ws`;
}

export default function SuperAdminDashboardSection() {
  const { t } = useI18n();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadOnlineUsersRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    async function loadOnlineUsers() {
      try {
        const res = await fetchWithRefresh(`${API_URL}/admin/online-users`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOnlineUsers(data.users || []);
      } catch { /* ignore transient errors, next event/poll will retry */ }
    }
    loadOnlineUsersRef.current = loadOnlineUsers;

    async function loadRevenue() {
      try {
        const res = await fetchWithRefresh(`${API_URL}/admin/revenue-stats?months=12`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setRevenue(data);
      } catch { /* ignore transient errors, next poll will retry */ }
    }

    async function loadAll() {
      try {
        setError(null);
        await Promise.all([loadOnlineUsers(), loadRevenue()]);
      } catch {
        if (!cancelled) setError(t('settings.superadmin.load_error', 'Impossible de charger le tableau de bord.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();

    // Revenue doesn't need to be live — a slow poll is enough.
    const revenueInterval = setInterval(loadRevenue, 60000);

    return () => { cancelled = true; clearInterval(revenueInterval); };
  }, [t]);

  // Live updates for the online-users panel: react to the same presence
  // WebSocket used app-wide (see usePresenceWS), instead of polling.
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    function connect() {
      ws = new WebSocket(wsUrl());
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'presence' || msg.type === 'online_list') {
            loadOnlineUsersRef.current();
          }
        } catch { /* ignore malformed frames */ }
      };
      ws.onclose = () => {
        if (unmounted) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    }
    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  if (loading && !revenue) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-gray-200 border-t-[#0b5566] animate-spin" />
        <p className="text-sm font-medium">{t('settings.superadmin.loading', 'Chargement…')}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-red-500 font-medium">{error}</div>
    );
  }

  const growth = revenue?.mrrGrowthPct ?? 0;
  const growthPositive = growth >= 0;
  const maxMrr = Math.max(1, ...(revenue?.series.map(s => s.mrr) || [1]));
  const lastMonth = revenue?.series[revenue.series.length - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* ── Utilisateurs connectés ── */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0b5566,#1a8fa8)' }}>
              <HiOutlineUsers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">{t('settings.superadmin.online_users', 'Connectés en ce moment')}</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {t('settings.superadmin.live', 'En direct')}
              </div>
            </div>
          </div>
          <span className="text-2xl font-extrabold text-gray-900">{onlineUsers.length}</span>
        </div>

        {onlineUsers.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">{t('settings.superadmin.no_one_online', "Personne n'est connecté actuellement.")}</div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {onlineUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ROLE_DOT[u.role] || 'bg-gray-300'}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{u.name}</div>
                    {u.centerName && <div className="text-xs text-gray-400 truncate">{u.centerName}</div>}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg flex-shrink-0">
                  {ROLE_LABEL[u.role] || u.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Revenus & croissance ── */}
      <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('settings.superadmin.mrr', 'Revenu mensuel récurrent')}</div>
            <div className="text-3xl font-extrabold text-gray-900">{formatEuros(revenue?.currentMrr || 0)}</div>
          </div>
          <div className={`flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-xl ${growthPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {growthPositive ? <HiOutlineTrendingUp className="w-4 h-4" /> : <HiOutlineTrendingDown className="w-4 h-4" />}
            {growthPositive ? '+' : ''}{growth}%
          </div>
        </div>

        {revenue && revenue.series.length > 0 && (
          <div className="flex items-end gap-1.5 h-28 mb-1">
            {revenue.series.map(s => (
              <div key={s.month} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 group">
                <div className="relative w-full flex justify-center">
                  <div
                    className="w-full max-w-[22px] rounded-t-md transition-all group-hover:opacity-80"
                    style={{ height: `${Math.max(3, (s.mrr / maxMrr) * 100)}px`, background: 'linear-gradient(180deg,#1a8fa8,#0b5566)' }}
                    title={`${formatMonthLabel(s.month)} : ${formatEuros(s.mrr)}`}
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-medium">{formatMonthLabel(s.month)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-gray-50">
          <div className="bg-emerald-50/60 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-emerald-700/70 uppercase tracking-wide">{t('settings.superadmin.new_this_month', 'Nouveaux ce mois')}</div>
            <div className="text-xl font-extrabold text-emerald-600">+{lastMonth?.newSubscriptions ?? 0}</div>
          </div>
          <div className="bg-red-50/60 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-red-700/60 uppercase tracking-wide">{t('settings.superadmin.canceled_this_month', 'Résiliés ce mois')}</div>
            <div className="text-xl font-extrabold text-red-500">-{lastMonth?.canceledSubscriptions ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
