'use client';

import { useEffect, useState, useCallback } from 'react';
import { ExternalLink, Copy, Check, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';
import { timeAgo, truncateAddress } from '@/lib/solana';

interface WhaleAlert {
  signature: string;
  type: 'buy' | 'sell' | 'transfer';
  token: string;
  amount: number;
  amountUsd: number;
  wallet: string;
  blockTime: number;
  tier: 'mega' | 'whale' | 'dolphin';
}

function tierEmoji(tier: WhaleAlert['tier']) {
  if (tier === 'mega') return '🐋';
  if (tier === 'whale') return '🦈';
  return '🐬';
}

function tierColor(tier: WhaleAlert['tier']) {
  if (tier === 'mega') return 'text-violet-400';
  if (tier === 'whale') return 'text-blue-400';
  return 'text-teal-400';
}

function tierBg(tier: WhaleAlert['tier']) {
  if (tier === 'mega') return 'bg-violet-500/10 border-violet-500/20';
  if (tier === 'whale') return 'bg-blue-500/10 border-blue-500/20';
  return 'bg-teal-500/10 border-teal-500/20';
}

function formatAmount(amount: number, token: string): string {
  if (token === 'SOL') return `${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL`;
  if (token === 'USDC' || token === 'USDT') return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B ${token}`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ${token}`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ${token}`;
  return `${amount.toLocaleString()} ${token}`;
}

function formatUsd(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function typeLabel(type: WhaleAlert['type']) {
  if (type === 'buy') return 'BOUGHT';
  if (type === 'sell') return 'SOLD';
  return 'MOVED';
}

function typeColor(type: WhaleAlert['type']) {
  if (type === 'buy') return 'text-emerald-400';
  if (type === 'sell') return 'text-red-400';
  return 'text-gray-400';
}

function WhaleCard({ alert, isNew, demo }: { alert: WhaleAlert; isNew: boolean; demo: boolean }) {
  const [copied, setCopied] = useState(false);

  const copyWallet = async () => {
    await navigator.clipboard.writeText(alert.wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={clsx(
        'border rounded-2xl p-3.5 transition-all duration-500',
        tierBg(alert.tier),
        isNew && 'animate-pulse-once'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label={alert.tier}>
            {tierEmoji(alert.tier)}
          </span>
          <div>
            <span className={clsx('text-xs font-bold', typeColor(alert.type))}>
              {typeLabel(alert.type)}
            </span>
            <span className="text-white text-sm font-bold ml-1.5">
              {formatAmount(alert.amount, alert.token)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className={clsx('text-sm font-bold', tierColor(alert.tier))}>
            {formatUsd(alert.amountUsd)}
          </p>
          <p className="text-gray-500 text-xs">{timeAgo(alert.blockTime)}</p>
        </div>
      </div>

      {/* Wallet */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs">Wallet:</span>
          <span className="text-gray-300 text-xs font-mono">
            {truncateAddress(alert.wallet)}
          </span>
          <button
            onClick={copyWallet}
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/actions?${demo ? 'demo=true&' : ''}copy=${encodeURIComponent(alert.wallet)}&token=${alert.token}`}
            className="text-xs bg-violet-500/20 text-violet-300 px-2.5 py-1 rounded-full font-medium hover:bg-violet-500/30 transition-colors"
          >
            Copy Trade
          </a>
          <a
            href={`https://solscan.io/tx/${alert.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function WhaleAlerts({ demo }: { demo: boolean }) {
  const [alerts, setAlerts] = useState<WhaleAlert[]>([]);
  const [source, setSource] = useState<'live' | 'mixed' | 'demo'>('demo');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async (manual = false) => {
    if (manual) setLoading(true);
    try {
      const res = await fetch(`/api/whales${demo ? '?demo=true' : ''}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const incoming: WhaleAlert[] = data.alerts ?? [];

      setAlerts(prev => {
        const prevSigs = new Set(prev.map(a => a.signature));
        const newSigs = new Set(
          incoming.filter(a => !prevSigs.has(a.signature)).map(a => a.signature)
        );
        if (newSigs.size > 0) setNewIds(newSigs);
        return incoming;
      });
      setSource(data.source ?? 'demo');
      setLastRefresh(Date.now());
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(), 20_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Clear "new" highlight after 3s
  useEffect(() => {
    if (newIds.size === 0) return;
    const t = setTimeout(() => setNewIds(new Set()), 3000);
    return () => clearTimeout(t);
  }, [newIds]);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            Whale Alerts
          </h2>
          <span
            className={clsx(
              'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium',
              source === 'live'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-gray-700 text-gray-400'
            )}
          >
            {source === 'live' ? (
              <><Wifi className="w-2.5 h-2.5" /> LIVE</>
            ) : (
              <><WifiOff className="w-2.5 h-2.5" /> DEMO</>
            )}
          </span>
        </div>
        <button
          onClick={() => fetchAlerts(true)}
          disabled={loading}
          className="p-1.5 rounded-lg glass text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
        <span>🐋 &gt;$500K</span>
        <span>🦈 $50K-500K</span>
        <span>🐬 &lt;$50K</span>
      </div>

      {/* Alerts list */}
      {loading && alerts.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl bg-gray-800/40 h-20 animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-gray-500 text-sm">No whale activity detected</p>
          <p className="text-gray-600 text-xs mt-1">Refreshes every 20 seconds</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.map(alert => (
            <WhaleCard
              key={alert.signature}
              alert={alert}
              isNew={newIds.has(alert.signature)}
              demo={demo}
            />
          ))}
        </div>
      )}

      {lastRefresh > 0 && (
        <p className="text-gray-600 text-xs text-center mt-3">
          Updated {timeAgo(Math.floor(lastRefresh / 1000))} · auto-refresh 20s
        </p>
      )}
    </div>
  );
}
