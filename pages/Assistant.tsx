import { Helmet } from 'react-helmet-async';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../src/lib/useI18n';
import { useAuth } from '../src/context/AuthContext';
// icons intentionally removed from suggestion cards
import { useAssistant } from '../src/context/AssistantContext';
import type { Message as AssistantMessage } from '../src/context/AssistantContext';

type Message = { id: string; role: 'assistant' | 'user'; text: string };

export default function Assistant() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { messages, pushMessage } = useAssistant();
  const scroller = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 400) + 'px';
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [message, resizeTextarea]);

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
        body: JSON.stringify({ message: text, history: historyPayload }),
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
    <div className="relative z-0 min-h-screen bg-[#f1f5f9] p-4 md:pl-64 w-full">
      <Helmet>
        <title>{t('assistant.title', 'Assistant Frimousse')}</title>
      </Helmet>

      <div className="max-w-7xl mx-auto w-full">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 w-full">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1 text-left">{t('assistant.header.title', 'Assistant Frimousse')}</h1>
              <div className="text-gray-400 text-base text-left">{t('assistant.header.subtitle', '· Specialized in child care')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-1 mb-0 w-full">
            <div className="bg-white rounded-2xl p-4 shadow-sm w-full">
              <div className="bg-transparent rounded-lg mt-4">
                <div className="flex flex-col h-[70vh] md:h-[72vh]">
                  <div ref={scroller} className="space-y-6 p-4 overflow-auto flex-1">

                    {/* Intro card */}
                    <div className="bg-white rounded-2xl p-5 shadow-md relative overflow-visible">
                          <div className="absolute left-3 top-6 w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg sm:text-xl font-bold" aria-hidden="true">🤖</div>
                      <div className="max-w-4xl w-full mx-auto relative">
                      
                        <div className="flex flex-col items-center text-center">
                          <div className="text-2xl sm:text-3xl text-indigo-800 font-semibold">{t('assistant.intro.title', 'Assistant IA')}</div>
                          <p className="text-gray-600 mt-2">{t('assistant.intro.description', "I'm your child-care assistant. I can help with:")}</p>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 justify-center items-stretch">
                            <div className="border rounded-lg p-3 flex flex-col sm:flex-row items-center sm:items-start gap-3 w-full">
                              <div className="flex-1 min-w-0 text-center sm:text-left">
                                <div className="font-semibold">{t('assistant.option.nutrition', 'Nutrition advice')}</div>
                                <div className="text-sm text-gray-500">{t('assistant.option.nutrition.example', "What to cook for my child?")}</div>
                              </div>
                            </div>

                            <div className="border-2 border-dashed border-blue-300 rounded-lg p-3 flex flex-col sm:flex-row items-center sm:items-start gap-3 bg-blue-50 w-full">
                              <div className="flex-1 min-w-0 text-center sm:text-left">
                                <div className="font-semibold">{t('assistant.option.education', 'Educational tips')}</div>
                                <div className="text-sm text-gray-500">{t('assistant.option.education.example', 'Development and age-appropriate learning')}</div>
                              </div>
                            </div>

                            <div className="border rounded-lg p-3 flex flex-col sm:flex-row items-center sm:items-start gap-3 w-full">
                              <div className="flex-1 min-w-0 text-center sm:text-left">
                                <div className="font-semibold">{t('assistant.option.activities', 'Suggested activities')}</div>
                                <div className="text-sm text-gray-500">{t('assistant.option.activities.example', 'Games and exercises by age')}</div>
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
                          <div data-msg-id={m.id} className="bg-white rounded-2xl p-4 shadow-sm max-w-[80%]">
                            <div className="text-sm text-indigo-700 font-semibold">Assistant IA <span className="text-xs text-gray-400">maintenant</span></div>
                            <div className="mt-2 text-gray-700 whitespace-pre-line">{m.text}</div>
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
                  <div className="mt-4 pt-2 border-t border-gray-100 bg-white">
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch p-3">
                      <textarea
                        ref={textareaRef}
                        aria-label={t('assistant.input.aria', 'Your question')}
                        className="w-full sm:flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] resize-none overflow-hidden"
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
