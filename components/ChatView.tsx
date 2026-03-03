'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, User, Sparkles, AlertCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { type WalletState, getWalletState, getNetwork, DEMO_WALLET_STATE } from '@/lib/solana';

const NETWORK = getNetwork();

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const SUGGESTED_PROMPTS = [
  'Analyze my portfolio and suggest improvements',
  'What DeFi yield opportunities should I consider?',
  'Is my portfolio too concentrated? How should I rebalance?',
  'Compare Jito vs Marinade for liquid staking',
  'What are the biggest risks in my current position?',
  'Create a strategy to grow my portfolio with moderate risk',
];

function loadMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('aurora-chat-history');
    if (saved) {
      const parsed = JSON.parse(saved) as Message[];
      return parsed.slice(-50);
    }
  } catch { /* ignore */ }
  return [];
}

function saveMessages(messages: Message[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('aurora-chat-history', JSON.stringify(messages.slice(-50)));
  } catch { /* ignore */ }
}

export function ChatView() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const [walletState, setWalletState] = useState<WalletState | null>(isDemo ? DEMO_WALLET_STATE : null);
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDemo) return;
    if (!connected) {
      router.push('/');
      return;
    }
    if (publicKey) {
      getWalletState(publicKey.toString(), NETWORK).then(setWalletState).catch(console.error);
    }
  }, [connected, publicKey, router, isDemo]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;
    setError(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          walletState,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('0:')) {
            try {
              fullText += JSON.parse(line.slice(2));
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
              );
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach Aurora');
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }, [messages, walletState, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('aurora-chat-history');
  };

  return (
    <div className="flex flex-col h-screen safe-top">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-gray-800/50">
        <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-sm">Aurora Agent</h1>
          <p className="text-gray-500 text-xs">
            {isDemo ? 'Demo — sample portfolio' : walletState ? `Managing ${walletState.solBalance.toFixed(3)} SOL` : 'Connecting...'}
          </p>
          <p className="text-gray-600 text-xs mt-0.5">
            Prices/APYs not live — data may be outdated. Production would use real-time feeds + advanced AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <div className={clsx(
            'w-2 h-2 rounded-full',
            isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'
          )} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-violet-400" />
              </div>
              <h2 className="text-white font-semibold mb-1">Aurora is ready</h2>
              <p className="text-gray-400 text-sm">
                Your autonomous wallet agent. Ask about portfolio strategy, DeFi opportunities, or risk management.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="glass rounded-xl px-4 py-3 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-800/30 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              'flex gap-3 fade-up',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                msg.role === 'user' ? 'bg-violet-600' : 'bg-gray-700'
              )}
            >
              {msg.role === 'user' ? (
                <User className="w-3.5 h-3.5 text-white" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              )}
            </div>
            <div
              className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-tr-sm'
                  : 'glass text-gray-100 rounded-tl-sm'
              )}
            >
              {msg.content || (
                <div className="flex gap-1 items-center h-5">
                  <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-gray-400" />
                  <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-gray-400" />
                  <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-gray-400" />
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm px-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800/50 px-4 py-3 safe-bottom">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Aurora anything..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
