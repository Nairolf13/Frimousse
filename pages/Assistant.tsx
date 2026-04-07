import SEO from '../components/SEO';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
import { useNavigate } from 'react-router-dom';
// icons intentionally removed from suggestion cards
import { useAssistant } from '../src/context/AssistantContext';
import type { Message as AssistantMessage } from '../src/context/AssistantContext';

type Message = { id: string; role: 'assistant' | 'user'; text: string };

export default function Assistant() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isShortLandscape, setIsShortLandscape] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { messages, pushMessage } = useAssistant();
  const scroller = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 400) + 'px';
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [message, resizeTextarea]);

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

  // Gate: Pro plan OR active trial can access the assistant
  const userPlan = (user?.plan || '').toLowerCase();
  const isSuperAdmin = user?.role === 'super-admin';
  const isTrialing = user?.subscriptionStatus === 'trialing';
  const hasPro = isSuperAdmin || userPlan === 'pro' || isTrialing;

  if (!hasPro) {
    return (
      <div className="min-h-screen bg-surface p-2 sm:p-4 md:pl-64 w-full flex items-center justify-center">
        <div className="max-w-md text-center bg-card rounded-2xl shadow-lg p-8">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-primary mb-2">{t('assistant.locked.title', 'Fonctionnalite reservee au plan Pro')}</h2>
          <p className="text-secondary mb-6">{t('assistant.locked.description', "L'assistant IA est disponible uniquement avec le plan Pro. Mettez a niveau votre abonnement pour y acceder.")}</p>
          <button
            onClick={() => navigate('/tarifs')}
            className="bg-brand-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-brand-600 transition-all"
          >
            {t('assistant.locked.cta', 'Voir les tarifs')}
          </button>
        </div>
      </div>
    );
  }

  function localPush(msg: Message) {
    pushMessage(msg as AssistantMessage);
    // after DOM updates, scroll to the appropriate place
    setTimeout(() => {
      try {
        if (msg.role === 'assistant') {
          const el = scroller.current?.querySelector(`[data-msg-id="${msg.id}"]`) as HTMLElement | null;
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
      } catch {
        // ignore
      }
      // fallback: scroll to bottom
      scroller.current?.scrollTo({ top: scroller.current!.scrollHeight, behavior: 'smooth' });
    }, 120);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!message.trim()) return;
    const text = message.trim();
    setMessage('');
    setError(null);
    localPush({ id: String(Date.now()), role: 'user', text });
    setLoading(true);
    try {
      const historyMessages = [...messages, { id: String(Date.now()), role: 'user', text }];
      const last = historyMessages.slice(-12);
      const historyPayload = last.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.text }));

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historyPayload, locale }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const reply = (data.reply ?? data.answer ?? JSON.stringify(data)) as string;
      localPush({ id: 'r' + Date.now(), role: 'assistant', text: reply });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      pushMessage({ id: 'e' + Date.now(), role: 'assistant', text: 'Erreur: ' + msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen bg-surface p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
        <SEO title={t('assistant.title', 'Assistant Frimousse')} />

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 w-full">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.1 2.7H3.9c-1.4 0-2.1-1.7-1.1-2.7L4.2 15.3"/></svg>
                </div>
                <div className="pt-0.5">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{t('assistant.header.title', 'Assistant Frimousse')}</h1>
                  <p className="text-xs sm:text-sm text-secondary mt-0.5">{t('assistant.header.subtitle', '· Specialized in child care')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-1 mb-0 w-full">
              <div className="bg-card rounded-2xl p-4 shadow-sm w-full">
                <div className="bg-transparent rounded-lg mt-4">
                  <div className="flex flex-col h-[70vh] md:h-[72vh]">
                    <div ref={scroller} className="space-y-6 p-4 overflow-auto flex-1">

                      {/* Intro card */}
                      <div className="bg-card rounded-2xl p-5 shadow-md relative overflow-visible">
                            <div className="absolute left-3 top-6 w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm sm:text-base font-bold" aria-hidden="true">🤖</div>
                        <div className="max-w-4xl w-full mx-auto relative">
                        
                          <div className="flex flex-col items-center text-center">
                            <div className="text-2xl sm:text-3xl text-indigo-800 dark:text-indigo-200 font-semibold">{t('assistant.intro.title', 'Assistant IA')}</div>
                            <p className="text-secondary mt-2">{t('assistant.intro.description', "I'm your child-care assistant. I can help with:")}</p>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 justify-center items-stretch">
                              <div className="border rounded-lg p-3 flex flex-col sm:flex-row items-center sm:items-start gap-3 w-full">
                                <div className="flex-1 min-w-0 text-center sm:text-left">
                                  <div className="font-semibold">{t('assistant.option.nutrition', 'Nutrition advice')}</div>
                                  <div className="text-sm text-secondary">{t('assistant.option.nutrition.example', "What to cook for my child?")}</div>
                                </div>
                              </div>

                              <div className="border-2 border-dashed border-blue-300 rounded-lg p-3 flex flex-col sm:flex-row items-center sm:items-start gap-3 bg-blue-50 dark:bg-blue-950 w-full">
                                <div className="flex-1 min-w-0 text-center sm:text-left">
                                  <div className="font-semibold">{t('assistant.option.education', 'Educational tips')}</div>
                                  <div className="text-sm text-secondary">{t('assistant.option.education.example', 'Development and age-appropriate learning')}</div>
                                </div>
                              </div>

                              <div className="border rounded-lg p-3 flex flex-col sm:flex-row items-center sm:items-start gap-3 w-full">
                                <div className="flex-1 min-w-0 text-center sm:text-left">
                                  <div className="font-semibold">{t('assistant.option.activities', 'Suggested activities')}</div>
                                  <div className="text-sm text-secondary">{t('assistant.option.activities.example', 'Games and exercises by age')}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      {messages.map(m => (
                        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {m.role === 'assistant' ? (
                            <div data-msg-id={m.id} className="bg-card rounded-2xl p-4 shadow-sm max-w-[80%]">
                              <div className="text-sm text-indigo-700 dark:text-indigo-300 font-semibold">Assistant IA <span className="text-xs text-muted">maintenant</span></div>
                              <div className="mt-2 text-primary whitespace-pre-line">{m.text}</div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-2xl p-4 shadow-md max-w-[70%]">
                              <div className="font-semibold">{user?.name ?? t('assistant.user.fallback', 'Guest')}</div>
                              <div className="mt-2">{m.text}</div>
                            </div>
                          )}
                        </div>
                      ))}

                    </div>

                    {/* Input area */}
                    <div className="mt-4 pt-2 border-t border-border-default bg-card">
                      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch p-3">
                        <textarea
                          ref={textareaRef}
                          aria-label={t('assistant.input.aria', 'Your question')}
                          className="w-full sm:flex-1 px-4 py-3 rounded-2xl border border-border-default focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] resize-none overflow-hidden"
                          placeholder={t('assistant.input.placeholder', "Ask the assistant...")}
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          disabled={loading}
                          rows={1}
                          onInput={resizeTextarea}
                        />
                        <button type="submit" disabled={loading} className="w-full sm:w-auto px-4 py-2 rounded-full bg-indigo-600 text-white font-semibold">{loading ? t('assistant.loading', 'Loading...') : t('assistant.send.button', 'Send')}</button>
                      </form>
                      {error && <div className="text-red-600 mt-2 p-3">{error}</div>}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
