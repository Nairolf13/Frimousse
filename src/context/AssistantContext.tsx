/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useI18n } from '../lib/useI18n';

export type Message = { id: string; role: 'assistant' | 'user'; text: string };

const noopSet = (() => {}) as unknown as React.Dispatch<React.SetStateAction<Message[]>>;
const AssistantContext = createContext<{
  messages: Message[];
  pushMessage: (m: Message) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}>({ messages: [], pushMessage: () => {}, setMessages: noopSet });

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t, locale } = useI18n();

  const initialMessage = React.useMemo(() => ({ id: 'm0', role: 'assistant', text: t('assistant.welcome') }), [t, locale]);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);

  const storageKey = React.useMemo(() => `assistant_convo_${user?.id ?? 'anon'}`, [user?.id]);

  // load on user change / mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(p => p && typeof p.text === 'string' && (p.role === 'assistant' || p.role === 'user'))) {
        setMessages(parsed as Message[]);
      }
    } catch {
      // ignore malformed storage
    }
  }, [storageKey]);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, storageKey]);

  // if user switches language and conversation is still empty except welcome, update it
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'assistant' && messages[0].text !== initialMessage.text) {
      setMessages([initialMessage]);
    }
  }, [locale, messages, initialMessage]);

  // clear when user logs out
  useEffect(() => {
    if (!user) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      setMessages([initialMessage]);
    }
  }, [user, storageKey, initialMessage]);

  const pushMessage = (m: Message) => setMessages(prev => [...prev, m]);

  return (
    <AssistantContext.Provider value={{ messages, pushMessage, setMessages }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  return useContext(AssistantContext);
}

export default AssistantContext;
