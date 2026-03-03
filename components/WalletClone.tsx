'use client';

import { useEffect, useState, useCallback } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Users, Target, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { truncateAddress, timeAgo } from '@/lib/solana';

interface TokenHolding {
  mint: string;
  symbol: string;
  amount: number;
  pct: number;
}

interface WhaleWallet {
  address: string;
  label: string;
  solBalance: number;
  solPct: number;
  tokens: TokenHolding[];
  totalValueUsd: number;
  lastActive: number;
  pnl7d: number;
}

function formatLargeUsd(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString()}`;
}

function AllocationBar({ solPct, tokens }: { solPct: number; tokens: TokenHolding[] }) {
  const tokenColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-yellow-500', 'bg-pink-500',
    'bg-orange-500', 'bg-teal-500', 'bg-red-400', 'bg-indigo-400',
  ];

  return (
    <div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden flex">
        <div className="h-full bg-violet-500" style={{ width: `${solPct}%` }} />
        {tokens.map((t, i) => (
          <div
            key={t.mint}
            className={clsx('h-full', tokenColors[i % tokenColors.length])}
            style={{ width: `${t.pct}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          SOL {solPct}%
        </span>
        {tokens.slice(0, 4).map((t, i) => (
          <span key={t.mint} className="flex items-center gap-1">
            <span className={clsx('w-2 h-2 rounded-full', tokenColors[i % tokenColors.length])} />
            {t.symbol} {t.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

function WalletCard({ wallet, onClone }: { wallet: WhaleWallet; onClone: (w: WhaleWallet) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass border border-gray-800/50 rounded-2xl p-4 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Target className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{wallet.label}</p>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs font-mono">{truncateAddress(wallet.address)}</span>
              <button onClick={copyAddress} className="text-gray-600 hover:text-gray-400">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white text-sm font-bold">{formatLargeUsd(wallet.totalValueUsd)}</p>
          <div className="flex items-center gap-0.5 justify-end">
            {wallet.pnl7d >= 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            <span className={clsx('text-xs font-medium',
              wallet.pnl7d >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {wallet.pnl7d >= 0 ? '+' : ''}{wallet.pnl7d}% 7d
            </span>
          </div>
        </div>
      </div>

      {/* Allocation Bar */}
      <AllocationBar solPct={wallet.solPct} tokens={wallet.tokens} />

      {/* Quick Stats */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>Active {timeAgo(wallet.lastActive)}</span>
        <span>{wallet.solBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL</span>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide' : 'Show'} holdings
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {wallet.tokens.map(t => (
            <div key={t.mint} className="flex items-center justify-between text-xs bg-gray-900/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{t.symbol}</span>
                <span className="text-gray-600 font-mono">{truncateAddress(t.mint)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300">{t.amount >= 1_000_000 ? `${(t.amount / 1_000_000).toFixed(1)}M` : t.amount >= 1000 ? `${(t.amount / 1000).toFixed(0)}K` : t.amount.toLocaleString()}</span>
                <span className="text-gray-500">{t.pct}%</span>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <a
              href={`https://solscan.io/account/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gray-800 text-gray-300 px-3 py-2 rounded-xl hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Solscan
            </a>
            <button
              onClick={() => onClone(wallet)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-violet-500/20 text-violet-300 px-3 py-2 rounded-xl hover:bg-violet-500/30 transition-colors font-medium"
            >
              <Target className="w-3 h-3" />
              Clone Portfolio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function WalletClone({ demo }: { demo: boolean }) {
  const [wallets, setWallets] = useState<WhaleWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloneTarget, setCloneTarget] = useState<WhaleWallet | null>(null);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clone${demo ? '?demo=true' : ''}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setWallets(data.wallets ?? []);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleClone = (wallet: WhaleWallet) => {
    setCloneTarget(wallet);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            Smart Wallet Clone
          </h2>
        </div>
        <span className="text-gray-600 text-xs">{wallets.length} tracked</span>
      </div>

      <p className="text-gray-500 text-xs mb-3">
        Mirror top wallet allocations. One tap to match their positions.
      </p>

      {/* Clone confirmation banner */}
      {cloneTarget && (
        <div className="mb-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
          <p className="text-violet-300 text-xs font-medium mb-2">
            Clone {cloneTarget.label}&apos;s portfolio?
          </p>
          <p className="text-gray-400 text-xs mb-2">
            This will generate swap actions to match their allocation: {cloneTarget.solPct}% SOL
            {cloneTarget.tokens.slice(0, 3).map(t => `, ${t.pct}% ${t.symbol}`).join('')}
          </p>
          <div className="flex gap-2">
            <a
              href={`/actions?demo=true&clone=${encodeURIComponent(cloneTarget.address)}`}
              className="flex-1 text-center text-xs bg-violet-500 text-white px-3 py-2 rounded-lg font-medium hover:bg-violet-600 transition-colors"
            >
              Generate Actions
            </a>
            <button
              onClick={() => setCloneTarget(null)}
              className="text-xs text-gray-400 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl bg-gray-800/40 h-32 animate-pulse" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-gray-500 text-sm">No wallets tracked yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map(w => (
            <WalletCard key={w.address} wallet={w} onClone={handleClone} />
          ))}
        </div>
      )}
    </div>
  );
}
