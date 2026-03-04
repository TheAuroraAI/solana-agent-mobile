'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction } from '@solana/web3.js';
import { Zap, Search, ExternalLink, AlertTriangle, CheckCircle, Loader2, ChevronRight, Link as LinkIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { getRpcUrl, getNetwork } from '@/lib/solana';
import { SlideToConfirm } from './SlideToConfirm';

interface ActionParameter {
  name: string;
  label?: string;
  required?: boolean;
  type?: string;
  min?: string | number;
  max?: string | number;
}

interface LinkedAction {
  type?: string;
  label: string;
  href: string;
  parameters?: ActionParameter[];
}

interface ActionMetadata {
  icon: string;
  label: string;
  title: string;
  description: string;
  disabled?: boolean;
  error?: { message: string };
  links?: { actions: LinkedAction[] };
}

interface BlinkState {
  actionUrl: string;
  metadata: ActionMetadata;
}

const POPULAR_BLINKS = [
  {
    category: 'DeFi & Staking',
    items: [
      { name: 'Stake SOL via Jito', url: 'solana-action:https://jito.network/stake', icon: '🔵' },
      { name: 'Swap SOL→USDC on Jupiter', url: 'solana-action:https://jup.ag/swap/SOL-USDC', icon: '🪐' },
      { name: 'Marinade Liquid Staking', url: 'solana-action:https://marinade.finance/app/staking', icon: '🟣' },
      { name: 'Orca Whirlpool', url: 'solana-action:https://www.orca.so', icon: '🐋' },
    ],
  },
  {
    category: 'Community',
    items: [
      { name: 'Donate to Open Source', url: 'solana-action:https://dial.to/donate', icon: '💜' },
      { name: 'Tip a Creator', url: 'solana-action:https://blinks.so/tip', icon: '⚡' },
    ],
  },
];

function ActionCard({
  action,
  onExecute,
  executing,
}: {
  action: LinkedAction;
  onExecute: (action: LinkedAction, params: Record<string, string>) => void;
  executing: boolean;
}) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [showSlide, setShowSlide] = useState(false);

  const hasParams = (action.parameters?.length ?? 0) > 0;

  const handleExecute = () => {
    if (hasParams) {
      setShowSlide(true);
    } else {
      onExecute(action, {});
    }
  };

  return (
    <div className="glass rounded-xl p-3.5">
      {/* Parameter inputs */}
      {hasParams && (
        <div className="space-y-2 mb-3">
          {action.parameters!.map(param => (
            <div key={param.name}>
              <label className="text-gray-400 text-xs mb-1 block">
                {param.label ?? param.name}
                {param.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type={param.type ?? 'text'}
                min={typeof param.min === 'number' ? param.min : undefined}
                max={typeof param.max === 'number' ? param.max : undefined}
                value={params[param.name] ?? ''}
                onChange={e => setParams(p => ({ ...p, [param.name]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 focus:outline-none"
                placeholder={param.label ?? param.name}
              />
            </div>
          ))}
        </div>
      )}

      {showSlide ? (
        <>
          <SlideToConfirm
            label={`Execute: ${action.label}`}
            onConfirm={() => { setShowSlide(false); onExecute(action, params); }}
          />
          <button
            onClick={() => setShowSlide(false)}
            className="w-full text-center text-xs text-gray-500 mt-2 py-1"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={handleExecute}
          disabled={executing}
          className={clsx(
            'w-full py-3 rounded-xl text-sm font-bold transition-all',
            executing
              ? 'bg-gray-700 text-gray-400 cursor-wait'
              : 'bg-violet-600 text-white hover:bg-violet-500 active:scale-95'
          )}
        >
          {executing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Signing…
            </span>
          ) : action.label}
        </button>
      )}
    </div>
  );
}

export function BlinksView() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [blink, setBlink] = useState<BlinkState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [txResult, setTxResult] = useState<{ sig: string; message?: string } | null>(null);

  const fetchBlink = useCallback(async (inputUrl: string) => {
    if (!inputUrl.trim()) return;
    setLoading(true);
    setError(null);
    setBlink(null);
    setTxResult(null);

    try {
      const res = await fetch(`/api/blinks?url=${encodeURIComponent(inputUrl.trim())}`);
      const data = await res.json() as { actionUrl: string; metadata: ActionMetadata; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to load action');
        return;
      }

      if (data.metadata.disabled || data.metadata.error) {
        setError(data.metadata.error?.message ?? 'This action is currently disabled');
        return;
      }

      setBlink({ actionUrl: data.actionUrl, metadata: data.metadata });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const executeAction = useCallback(async (action: LinkedAction, params: Record<string, string>) => {
    if (!publicKey || !blink) return;
    setExecuting(true);
    setTxResult(null);

    try {
      const res = await fetch('/api/blinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionHref: action.href.startsWith('http') ? action.href : `${new URL(blink.actionUrl).origin}${action.href}`,
          account: publicKey.toString(),
          params,
        }),
      });

      const data = await res.json() as { transaction?: string; message?: string; error?: string };
      if (data.error) throw new Error(data.error);
      if (!data.transaction) throw new Error('No transaction returned');

      // Deserialize and send
      const txBytes = Buffer.from(data.transaction, 'base64');
      const tx = Transaction.from(txBytes);
      const connection = new Connection(getRpcUrl(getNetwork()));
      const sig = await sendTransaction(tx, connection);

      setTxResult({ sig, message: data.message });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExecuting(false);
    }
  }, [publicKey, blink, sendTransaction]);

  const actions = blink?.metadata.links?.actions ?? (blink ? [{ label: blink.metadata.label, href: blink.actionUrl }] : []);

  return (
    <div className="safe-top px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-white text-xl font-bold">Solana Actions</h1>
          <p className="text-gray-400 text-xs mt-0.5">Execute any Blink directly in Aurora</p>
        </div>
      </div>

      {/* URL Input */}
      <div className="mb-5">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 glass rounded-xl px-3 py-2.5">
            <LinkIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchBlink(url)}
              placeholder="Paste a Blink URL or solana-action:..."
              className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-gray-600"
            />
          </div>
          <button
            onClick={() => fetchBlink(url)}
            disabled={loading || !url.trim()}
            className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-violet-500 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-1.5 ml-1">
          Supports <code className="text-gray-500">solana-action:</code> URIs and direct action API URLs
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* TX Success */}
      {txResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <p className="text-emerald-300 text-sm font-semibold">Transaction sent!</p>
          </div>
          {txResult.message && <p className="text-gray-300 text-xs mb-2">{txResult.message}</p>}
          <a
            href={`https://solscan.io/tx/${txResult.sig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
          >
            View on Solscan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Blink Card */}
      {blink && (
        <div className="mb-6">
          <div className="glass rounded-2xl overflow-hidden">
            {/* Action Image */}
            {blink.metadata.icon && (
              <div className="relative w-full aspect-[2/1] bg-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blink.metadata.icon}
                  alt={blink.metadata.title}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="text-white text-base font-bold">{blink.metadata.title}</h2>
                <a
                  href={blink.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-400"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-gray-400 text-sm mb-4">{blink.metadata.description}</p>

              {!connected ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                  <p className="text-yellow-300 text-sm">Connect Phantom to execute this action</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {actions.map((action, i) => (
                    <ActionCard
                      key={i}
                      action={action}
                      onExecute={executeAction}
                      executing={executing}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Popular Blinks */}
      {!blink && !loading && (
        <div>
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
            Featured Actions
          </h2>
          <div className="space-y-4">
            {POPULAR_BLINKS.map(cat => (
              <div key={cat.category}>
                <p className="text-gray-500 text-xs mb-2 font-medium">{cat.category}</p>
                <div className="space-y-1.5">
                  {cat.items.map(item => (
                    <button
                      key={item.url}
                      onClick={() => { setUrl(item.url); fetchBlink(item.url); }}
                      className="w-full glass rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-white text-sm font-medium">{item.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 glass rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs leading-relaxed">
              Solana Actions let you execute any on-chain operation from a simple URL.
              Paste any <code className="text-violet-400">solana-action:</code> link above to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
