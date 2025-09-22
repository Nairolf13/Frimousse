/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type Message = { id: string; role: 'assistant' | 'user'; text: string };

const noopSet = (() => {}) as unknown as React.Dispatch<React.SetStateAction<Message[]>>;
const AssistantContext = createContext<{
  messages: Message[];
  pushMessage: (m: Message) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}>({ messages: [], pushMessage: () => {}, setMessages: noopSet });

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm0', role: 'assistant', text: "👋 Bonjour ! Je suis votre assistant spécialisé dans la garde d'enfants. Posez votre question et je vous répondrai de manière claire et bienveillante." },
  ]);

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

  // clear when user logs out
  useEffect(() => {
    if (!user) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      setMessages([{ id: 'm0', role: 'assistant', text: "👋 Bonjour ! Je suis votre assistant spécialisé dans la garde d'enfants. Posez votre question et je vous répondrai de manière claire et bienveillante." }]);
    }
  }, [user, storageKey]);

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
