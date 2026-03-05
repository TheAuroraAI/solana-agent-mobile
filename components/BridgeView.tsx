'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowDown,
  ArrowLeftRight,
  Copy,
  Check,
  Clock,
  Shield,
  Zap,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { BridgeData, BridgeRoute, Chain, BridgeToken } from '@/app/api/bridge/route';

/* ─── Chain metadata ─── */

const CHAIN_META: Record<Chain, { color: string; bg: string; border: string; emoji: string }> = {
  Solana:    { color: 'text-violet-400',  bg: 'bg-violet-500/15',  border: 'border-violet-500/40',  emoji: '◎' },
  Ethereum:  { color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/40',    emoji: '⟠' },
  Arbitrum:  { color: 'text-cyan-400',    bg: 'bg-cyan-500/15',    border: 'border-cyan-500/40',    emoji: '🔵' },
  Base:      { color: 'text-blue-300',    bg: 'bg-blue-400/15',    border: 'border-blue-400/40',    emoji: '🔷' },
  Polygon:   { color: 'text-purple-400',  bg: 'bg-purple-500/15',  border: 'border-purple-500/40',  emoji: '🟣' },
  Optimism:  { color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/40',     emoji: '🔴' },
  BSC:       { color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  border: 'border-yellow-500/40',  emoji: '🟡' },
  Avalanche: { color: 'text-red-300',     bg: 'bg-red-400/15',     border: 'border-red-400/40',     emoji: '🔺' },
};

/* ─── Helpers ─── */

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function shortenHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return hash.slice(0, 8) + '...' + hash.slice(-6);
}

function SecurityDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            i < score
              ? score >= 8
                ? 'bg-green-400'
                : score >= 6
                ? 'bg-yellow-400'
                : 'bg-red-400'
              : 'bg-gray-700',
          )}
        />
      ))}
    </div>
  );
}

/* ─── Sub-components ─── */

interface ChainBadgeProps {
  chain: Chain;
  size?: 'sm' | 'md';
}

function ChainBadge({ chain, size = 'md' }: ChainBadgeProps) {
  const meta = CHAIN_META[chain];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        meta.bg,
        meta.border,
        meta.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      )}
    >
      <span>{meta.emoji}</span>
      {chain}
    </span>
  );
}

interface ChainSelectProps {
  label: string;
  value: Chain;
  chains: Chain[];
  onChange: (c: Chain) => void;
}

function ChainSelect({ label, value, chains, onChange }: ChainSelectProps) {
  const [open, setOpen] = useState(false);
  const meta = CHAIN_META[value];

  return (
    <div className="relative">
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-colors',
          'bg-gray-900 border-gray-800 hover:border-gray-700',
        )}
      >
        <span className={clsx('flex items-center gap-2 font-medium', meta.color)}>
          <span className="text-lg">{meta.emoji}</span>
          <span className="text-sm">{value}</span>
        </span>
        <ChevronDown
          size={14}
          className={clsx('text-gray-500 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-gray-800 bg-gray-900 shadow-xl overflow-hidden">
          {chains.map((c) => {
            const m = CHAIN_META[c];
            return (
              <button
                key={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                  c === value ? clsx(m.bg, m.color) : 'text-gray-300 hover:bg-gray-800',
                )}
              >
                <span className="text-base">{m.emoji}</span>
                {c}
                {c === value && <Check size={12} className="ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TokenSelectProps {
  label: string;
  value: string;
  tokens: BridgeToken[];
  filterChain: Chain;
  onChange: (t: string) => void;
}

function TokenSelect({ label, value, tokens, filterChain, onChange }: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const available = tokens.filter((t) => t.chains.includes(filterChain));
  const selected = available.find((t) => t.symbol === value) ?? available[0];

  return (
    <div className="relative">
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{selected?.logo ?? '?'}</span>
          <span className="text-sm font-medium text-gray-200">{selected?.symbol ?? value}</span>
          <span className="text-xs text-gray-500">{selected?.name}</span>
        </span>
        <ChevronDown
          size={14}
          className={clsx('text-gray-500 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-gray-800 bg-gray-900 shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {available.map((tok) => (
            <button
              key={tok.symbol}
              onClick={() => {
                onChange(tok.symbol);
                setOpen(false);
              }}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                tok.symbol === value
                  ? 'bg-violet-500/10 text-violet-300'
                  : 'text-gray-300 hover:bg-gray-800',
              )}
            >
              <span className="text-base">{tok.logo}</span>
              <div className="text-left">
                <p className="font-medium leading-none">{tok.symbol}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tok.name}</p>
              </div>
              <span className="ml-auto text-xs text-gray-500">${tok.price.toLocaleString()}</span>
              {tok.symbol === value && <Check size={12} className="text-violet-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface RouteCardProps {
  route: BridgeRoute;
  isSelected: boolean;
  onSelect: () => void;
}

function RouteCard({ route, isSelected, onSelect }: RouteCardProps) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full text-left rounded-xl border p-4 transition-all',
        isSelected
          ? 'border-violet-500/60 bg-violet-500/5'
          : 'border-gray-800 bg-gray-900/60 hover:border-gray-700',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Provider */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{route.providerLogo}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-gray-100">{route.provider}</span>
              {route.isRecommended && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
                  Best
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {route.steps} step{route.steps !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Output */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-100">
            {route.toAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
            <span className="text-gray-400">{route.toToken}</span>
          </p>
          <p className="text-xs text-gray-500">receive</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {/* Fee */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
            <span className="text-xs text-gray-400">$</span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-300">${route.fee.toFixed(2)}</p>
            <p className="text-[10px] text-gray-600">fee</p>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
            <Clock size={10} className="text-gray-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-300">{formatTime(route.estimatedTime)}</p>
            <p className="text-[10px] text-gray-600">time</p>
          </div>
        </div>

        {/* Security */}
        <div className="flex flex-col gap-1">
          <SecurityDots score={route.securityScore} />
          <p className="text-[10px] text-gray-600">security {route.securityScore}/10</p>
        </div>
      </div>
    </button>
  );
}

/* ─── Main View ─── */

export function BridgeView() {
  const router = useRouter();

  const [data, setData] = useState<BridgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromChain, setFromChain] = useState<Chain>('Solana');
  const [toChain, setToChain] = useState<Chain>('Ethereum');
  const [fromToken, setFromToken] = useState('USDC');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/bridge');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: BridgeData = await res.json();
      setData(json);
      // Pre-select the recommended route
      const rec = json.featuredRoutes.find((r) => r.isRecommended);
      if (rec) setSelectedRouteId(rec.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bridge data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSwapChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
    setFromToken(toToken);
    setToToken(fromToken);
  };

  const handleCopyHash = (hash: string) => {
    void navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const filteredRoutes =
    data?.featuredRoutes.filter(
      (r) =>
        r.fromChain === fromChain &&
        r.toChain === toChain &&
        r.fromToken === fromToken,
    ) ?? [];

  const allRoutes =
    filteredRoutes.length > 0 ? filteredRoutes : (data?.featuredRoutes ?? []);

  const selectedRoute = allRoutes.find((r) => r.id === selectedRouteId) ?? allRoutes[0];

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />
          <div className="w-24 h-5 rounded bg-gray-800 animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-900 animate-pulse mb-3" />
        ))}
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-800 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
          <h1 className="text-lg font-bold text-gray-100">Bridge</h1>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Failed to load bridge data</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={() => void fetchData()}
          className="mt-4 flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 pt-4 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-800 active:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-100 leading-none">Bridge</h1>
            <p className="text-xs text-gray-500 mt-0.5">Cross-chain transfers</p>
          </div>
        </div>
        <button
          onClick={() => void fetchData()}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={15} className="text-gray-500" />
        </button>
      </div>

      {/* ── Bridge Form Card ── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4 mb-4">
        {/* FROM section */}
        <div className="mb-3">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <ChainSelect
              label="From chain"
              value={fromChain}
              chains={data.supportedChains}
              onChange={(c) => {
                setFromChain(c);
                // reset token if not available on new chain
                const tok = data.supportedTokens.find(
                  (t) => t.symbol === fromToken && t.chains.includes(c),
                );
                if (!tok) {
                  const first = data.supportedTokens.find((t) => t.chains.includes(c));
                  if (first) setFromToken(first.symbol);
                }
              }}
            />
            <TokenSelect
              label="Asset"
              value={fromToken}
              tokens={data.supportedTokens}
              filterChain={fromChain}
              onChange={setFromToken}
            />
          </div>

          {/* Amount input */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Amount</p>
            <div className="relative">
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={clsx(
                  'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5',
                  'text-gray-100 text-sm placeholder-gray-600',
                  'focus:outline-none focus:border-violet-500/60 focus:bg-gray-800',
                  'transition-colors',
                )}
              />
              <button
                onClick={() => setAmount('100')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        {/* Swap / arrow divider */}
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 border-t border-gray-800" />
          <button
            onClick={handleSwapChains}
            className={clsx(
              'w-9 h-9 rounded-full border border-gray-700 bg-gray-800',
              'flex items-center justify-center',
              'hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-400',
              'active:scale-95 transition-all text-gray-400',
            )}
            aria-label="Swap chains"
          >
            <ArrowLeftRight size={14} />
          </button>
          <div className="flex-1 border-t border-gray-800" />
        </div>

        {/* TO section */}
        <div className="grid grid-cols-2 gap-3">
          <ChainSelect
            label="To chain"
            value={toChain}
            chains={data.supportedChains}
            onChange={(c) => {
              setToChain(c);
              const tok = data.supportedTokens.find(
                (t) => t.symbol === toToken && t.chains.includes(c),
              );
              if (!tok) {
                const first = data.supportedTokens.find((t) => t.chains.includes(c));
                if (first) setToToken(first.symbol);
              }
            }}
          />
          <TokenSelect
            label="Receive"
            value={toToken}
            tokens={data.supportedTokens}
            filterChain={toChain}
            onChange={setToToken}
          />
        </div>

        {/* Estimated output banner */}
        {amount && selectedRoute && (
          <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDown size={14} className="text-violet-400" />
              <span className="text-xs text-gray-400">You receive (est.)</span>
            </div>
            <span className="text-sm font-semibold text-violet-300">
              {(
                (parseFloat(amount || '0') / selectedRoute.fromAmount) *
                selectedRoute.toAmount
              ).toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
              {selectedRoute.toToken}
            </span>
          </div>
        )}
      </div>

      {/* ── Route Comparison ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-gray-300">Available Routes</h2>
          <span className="text-xs text-gray-600">{allRoutes.length} providers</span>
        </div>

        {allRoutes.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-center">
            <Zap size={20} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No routes for this pair</p>
            <p className="text-xs text-gray-600 mt-1">Try a different chain or token</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {allRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isSelected={selectedRoute?.id === route.id}
                onSelect={() => setSelectedRouteId(route.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bridge CTA ── */}
      {selectedRoute && (
        <button
          disabled={!amount || parseFloat(amount) <= 0}
          className={clsx(
            'w-full py-3.5 rounded-xl font-semibold text-sm transition-all mb-5',
            amount && parseFloat(amount) > 0
              ? 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-lg shadow-violet-900/30'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed',
          )}
        >
          {amount && parseFloat(amount) > 0
            ? `Bridge via ${selectedRoute.provider} →`
            : 'Enter an amount'}
        </button>
      )}

      {/* ── Recent Activity ── */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-2.5">Recent Activity</h2>
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden divide-y divide-gray-800">
          {data.recentBridges.map((bridge) => (
            <div key={bridge.id} className="p-3.5 flex items-start gap-3">
              {/* Status dot */}
              <div
                className={clsx(
                  'w-2 h-2 rounded-full mt-1.5 shrink-0',
                  bridge.status === 'completed' && 'bg-green-400',
                  bridge.status === 'pending' && 'bg-yellow-400',
                  bridge.status === 'failed' && 'bg-red-400',
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-300 truncate">
                    {bridge.from} → {bridge.to}
                  </p>
                  <span
                    className={clsx(
                      'text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 font-medium',
                      bridge.status === 'completed' &&
                        'text-green-400 bg-green-500/10 border-green-500/30',
                      bridge.status === 'pending' &&
                        'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
                      bridge.status === 'failed' &&
                        'text-red-400 bg-red-500/10 border-red-500/30',
                    )}
                  >
                    {bridge.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-500">{bridge.amount}</span>
                    <span className="text-[10px] text-gray-600">·</span>
                    <span className="text-[10px] text-gray-600 truncate">
                      {shortenHash(bridge.txHash)}
                    </span>
                    <button
                      onClick={() => handleCopyHash(bridge.txHash)}
                      className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"
                      aria-label="Copy transaction hash"
                    >
                      {copiedHash === bridge.txHash ? (
                        <Check size={10} className="text-green-400" />
                      ) : (
                        <Copy size={10} />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0">
                    {formatTimeAgo(bridge.timestamp)}
                  </span>
                </div>
              </div>
              <button className="text-gray-700 hover:text-gray-500 transition-colors shrink-0 mt-0.5">
                <ExternalLink size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Supported Networks ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-2.5">Supported Networks</h2>
        <div className="grid grid-cols-4 gap-3">
          {data.supportedChains.map((chain) => {
            const meta = CHAIN_META[chain];
            return (
              <button
                key={chain}
                onClick={() => setFromChain(chain)}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all',
                  fromChain === chain
                    ? clsx(meta.bg, meta.border)
                    : 'border-gray-800 bg-gray-900/60 hover:border-gray-700',
                )}
              >
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-lg',
                    fromChain === chain ? meta.bg : 'bg-gray-800',
                  )}
                >
                  {meta.emoji}
                </div>
                <span
                  className={clsx(
                    'text-[10px] font-medium truncate w-full text-center',
                    fromChain === chain ? meta.color : 'text-gray-500',
                  )}
                >
                  {chain}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Security notice ── */}
      <div className="mt-5 rounded-xl border border-gray-800 bg-gray-900/40 p-3 flex items-start gap-2.5">
        <Shield size={14} className="text-gray-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Bridge routes are provided for informational purposes. Always verify transactions
          on-chain. Security scores are estimates based on protocol audits and TVL.
        </p>
      </div>
    </div>
  );
}
