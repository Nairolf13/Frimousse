import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../src/context/AuthContext';

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'update';
  createdAt: string;
};

const TYPE_CONFIG = {
  update: {
    gradient: 'from-[#0b5566] to-[#1a8fa6]',
    badgeText: 'Mise à jour',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
    ),
  },
  info: {
    gradient: 'from-blue-600 to-indigo-600',
    badgeText: 'Information',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    gradient: 'from-emerald-600 to-teal-600',
    badgeText: 'Nouveauté',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    gradient: 'from-amber-500 to-orange-500',
    badgeText: 'Important',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

const LS_KEY = (id: string) => `announcement_dismissed_${id}`;

export default function AnnouncementBanner() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/announcements/active', { credentials: 'include' });
      if (!res.ok) return;
      const data: Announcement[] = await res.json();
      const filtered = data.filter(a => !localStorage.getItem(LS_KEY(a.id)));
      setAnnouncements(filtered);
      if (filtered.length > 0) {
        setCurrent(filtered[0]);
        setTimeout(() => setVisible(true), 200);
      }
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  // Lock body scroll when visible
  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  // Check if content is scrollable
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  }, []);

  useEffect(() => {
    if (visible) setTimeout(checkScroll, 100);
  }, [visible, current, checkScroll]);

  const dismiss = useCallback(async () => {
    if (!current) return;
    setVisible(false);
    try { localStorage.setItem(LS_KEY(current.id), '1'); } catch { /* ignore */ }
    fetch(`/api/announcements/${current.id}/read`, { method: 'POST', credentials: 'include' }).catch(() => {});
    setTimeout(() => {
      const next = announcements.find(a => a.id !== current.id);
      if (next) { setCurrent(next); setTimeout(() => setVisible(true), 100); }
      else setCurrent(null);
    }, 300);
  }, [current, announcements]);

  if (!current) return null;

  const cfg = TYPE_CONFIG[current.type] || TYPE_CONFIG.info;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col transition-all duration-400 ease-out bg-gradient-to-br ${cfg.gradient} ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_20%_50%,white,transparent_50%),radial-gradient(circle_at_80%_20%,white,transparent_40%)]" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 pt-8 pb-4 flex-shrink-0">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/70 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full">
          {cfg.icon && <span className="opacity-80">{cfg.icon}</span>}
          {cfg.badgeText}
        </span>
        <button
          onClick={dismiss}
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center text-white"
          aria-label="Fermer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="relative flex-1 overflow-y-auto px-6 md:px-16 lg:px-32 xl:px-48"
      >
        {/* Logo / icon */}
        <div className="flex justify-center mb-8 mt-4">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center text-white shadow-lg">
            <div className="scale-[2]">{cfg.icon}</div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-white font-extrabold text-3xl md:text-4xl leading-tight text-center mb-6">
          {current.title}
        </h1>

        {/* Message */}
        <div className="bg-white/10 border border-white/15 rounded-2xl px-6 py-5 mb-8">
          <p className="text-white/90 text-base leading-relaxed whitespace-pre-wrap">
            {current.message}
          </p>
        </div>

        {/* Date */}
        <p className="text-white/40 text-xs text-center mb-10">
          Publié le {new Date(current.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Scroll indicator */}
      {canScrollDown && (
        <div className="relative flex justify-center py-2 pointer-events-none flex-shrink-0">
          <div className="flex flex-col items-center gap-1 animate-bounce">
            <span className="text-white/50 text-[11px] font-medium">Défiler pour lire la suite</span>
            <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="relative flex-shrink-0 px-6 md:px-16 lg:px-32 xl:px-48 pb-10 pt-2">
        <button
          onClick={dismiss}
          className="w-full py-4 rounded-2xl bg-white text-gray-900 font-extrabold text-base shadow-lg hover:bg-white/90 active:scale-[0.98] transition-all"
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
}
