import { useEffect, useState, useCallback, useRef } from 'react';
import { useI18n } from '../src/lib/useI18n';
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

const EXPIRY_DAYS = 7;

export default function AnnouncementBanner() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dismissedIds = useRef<Set<string>>(new Set());

  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/announcements/active', { credentials: 'include' });
      if (!res.ok) return;
      const data: Announcement[] = await res.json();
      const cutoff = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      const filtered = data.filter(a =>
        !localStorage.getItem(LS_KEY(a.id)) &&
        new Date(a.createdAt).getTime() > cutoff
      );
      setAnnouncements(filtered);
      if (filtered.length > 0) {
        setCurrentIndex(0);
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
  }, [visible, currentIndex, checkScroll]);

  const current = announcements[currentIndex] ?? null;

  const dismiss = useCallback(async () => {
    if (!current) return;
    dismissedIds.current.add(current.id);
    try { localStorage.setItem(LS_KEY(current.id), '1'); } catch { /* ignore */ }
    fetch(`/api/announcements/${current.id}/read`, { method: 'POST', credentials: 'include' }).catch(() => {});

    const nextIndex = announcements.findIndex((a, i) => i > currentIndex && !dismissedIds.current.has(a.id));
    setVisible(false);
    setTimeout(() => {
      if (nextIndex !== -1) {
        setCurrentIndex(nextIndex);
        setTimeout(() => setVisible(true), 100);
      } else {
        setAnnouncements([]);
      }
    }, 300);
  }, [current, currentIndex, announcements]);

  if (!current) return null;

  const remaining = announcements.filter(a => !dismissedIds.current.has(a.id));
  const positionInRemaining = remaining.indexOf(current) + 1;
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
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/70 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full">
            {cfg.icon && <span className="opacity-80">{cfg.icon}</span>}
            {t(`announcements.type.${current.type}`, cfg.badgeText)}
          </span>
          {remaining.length > 1 && (
            <span className="text-xs font-bold text-white/60 bg-white/10 border border-white/20 px-2.5 py-1.5 rounded-full">
              {positionInRemaining}/{remaining.length}
            </span>
          )}
        </div>
        <button
          onClick={dismiss}
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center text-white"
          aria-label={t('announcements.banner.close', 'Fermer')}
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
            {current.message.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
              /^https?:\/\//.test(part)
                ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-white font-medium break-all">{part}</a>
                : part
            )}
          </p>
        </div>

        {/* Social links */}
        <div className="flex justify-center gap-3 mb-8 flex-wrap">
          <a href="https://www.instagram.com/lesfrimousses13/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/20">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </a>
          <a href="https://www.facebook.com/profile.php?id=61577468283486" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/20">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>
          <a href="https://www.linkedin.com/groups/17963103/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/20">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            LinkedIn
          </a>
        </div>

        {/* Date */}
        <p className="text-white/40 text-xs text-center mb-10">
          {t('announcements.banner.published', 'Publié le')} {new Date(current.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Scroll indicator */}
      {canScrollDown && (
        <div className="relative flex justify-center py-2 pointer-events-none flex-shrink-0">
          <div className="flex flex-col items-center gap-1 animate-bounce">
            <span className="text-white/50 text-[11px] font-medium">{t('announcements.banner.scrollHint', 'Défiler pour lire la suite')}</span>
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
          {t('announcements.banner.cta', 'J\'ai compris')}
        </button>
      </div>
    </div>
  );
}
