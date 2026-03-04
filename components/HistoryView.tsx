'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowUpRight, ArrowDownLeft, ArrowRightLeft,
  TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  ExternalLink, Zap, ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import { clsx } from 'clsx';
import { BottomNav } from '@/components/BottomNav';
import { getNetwork, getSolscanCluster, truncateAddress, timeAgo, formatSol } from '@/lib/solana';
import type { RichTransaction, HistoryResponse } from '@/app/api/history/route';

const NETWORK = getNetwork();

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  send:    { label: 'Sent',     icon: <ArrowUpRight   className="w-4 h-4" />, color: 'text-orange-400',  bg: 'bg-orange-500/20' },
  receive: { label: 'Received', icon: <ArrowDownLeft  className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  swap:    { label: 'Swap',     icon: <ArrowRightLeft className="w-4 h-4" />, color: 'text-blue-400',    bg: 'bg-blue-500/20' },
  stake:   { label: 'Staked',   icon: <TrendingUp     className="w-4 h-4" />, color: 'text-violet-400',  bg: 'bg-violet-500/20' },
  unstake: { label: 'Unstaked', icon: <TrendingDown   className="w-4 h-4" />, color: 'text-cyan-400',    bg: 'bg-cyan-500/20' },
  other:   { label: 'Contract', icon: <Zap            className="w-4 h-4" />, color: 'text-gray-400',    bg: 'bg-gray-500/20' },
};

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass rounded-2xl p-4 flex-1 min-w-0">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={clsx('text-base font-bold font-mono truncate', color ?? 'text-white')}>{value}</p>
      {sub && <p className="text-gray-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

function TxRow({ tx, solscanCluster, expanded, onToggle }: {
  tx: RichTransaction;
  solscanCluster: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.other;
  const isErr = tx.status === 'error';

  const mainAmount = tx.type === 'swap'
    ? (tx.tokenChanges.length > 0
        ? `${tx.tokenChanges.map((c) => `${c.change > 0 ? '+' : ''}${c.change.toFixed(4)} ${c.symbol}`).join(' / ')}`
        : `${tx.solChange.toFixed(4)} SOL`)
    : tx.solChange !== 0
      ? `${tx.solChange > 0 ? '+' : ''}${tx.solChange.toFixed(4)} SOL`
      : tx.tokenChanges.length > 0
        ? `${tx.tokenChanges[0].change > 0 ? '+' : ''}${tx.tokenChanges[0].change.toFixed(4)} ${tx.tokenChanges[0].symbol}`
        : '—';

  const amountColor = tx.type === 'receive' || (tx.solChange > 0 && tx.type !== 'swap')
    ? 'text-emerald-400'
    : tx.type === 'send' || tx.solChange < -0.001
    ? 'text-orange-400'
    : 'text-gray-300';

  return (
    <div
      className="border-t border-gray-800/50 first:border-t-0"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-gray-800/30 transition-colors">
        <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', isErr ? 'bg-red-500/20' : cfg.bg)}>
          <span className={clsx(isErr ? 'text-red-400' : cfg.color)}>
            {isErr ? <AlertTriangle className="w-4 h-4" /> : cfg.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-white text-sm font-medium">{isErr ? 'Failed' : cfg.label}</p>
            <span className="text-gray-600 text-[10px] bg-gray-800/60 px-1.5 py-0.5 rounded-full">{tx.protocol}</span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">{tx.blockTime ? timeAgo(tx.blockTime) : 'Unknown'}</p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={clsx('text-sm font-mono font-medium', isErr ? 'text-red-400 line-through' : amountColor)}>
            {mainAmount}
          </p>
          <p className="text-gray-600 text-[10px]">Fee: {(tx.fee * 1000).toFixed(3)}ms SOL</p>
        </div>

        <span className="text-gray-600 ml-1">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 bg-gray-900/40 space-y-2.5">
          {/* Token changes */}
          {tx.tokenChanges.length > 0 && (
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">Token Changes</p>
              {tx.tokenChanges.map((tc, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-400 font-mono text-xs">{tc.symbol}</span>
                  <span className={clsx('font-mono text-xs', tc.change > 0 ? 'text-emerald-400' : 'text-orange-400')}>
                    {tc.change > 0 ? '+' : ''}{tc.change.toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* SOL change */}
          {tx.solChange !== 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">SOL change</span>
              <span className={clsx('font-mono', tx.solChange > 0 ? 'text-emerald-400' : 'text-orange-400')}>
                {tx.solChange > 0 ? '+' : ''}{tx.solChange.toFixed(6)} SOL
              </span>
            </div>
          )}

          {/* Counterparty */}
          {tx.counterparty && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{tx.type === 'receive' ? 'From' : 'To'}</span>
              <span className="text-gray-300 font-mono">{truncateAddress(tx.counterparty)}</span>
            </div>
          )}

          {/* Slot + Fee */}
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Slot</span>
            <span className="text-gray-400 font-mono">{tx.slot.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Network fee</span>
            <span className="text-gray-400 font-mono">{(tx.fee * 1000).toFixed(4)} mSOL</span>
          </div>

          {/* Explorer link */}
          <a
            href={`https://solscan.io/tx/${tx.signature}${solscanCluster}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-violet-400 text-xs hover:text-violet-300 mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            View on Solscan
          </a>
        </div>
      )}
    </div>
  );
}

type FilterType = 'all' | 'send' | 'receive' | 'swap' | 'stake' | 'other';

export function HistoryView() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSig, setExpandedSig] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const solscanCluster = getSolscanCluster(NETWORK);

  const fetchHistory = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/history?address=${publicKey.toString()}&network=${NETWORK}&limit=25`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as HistoryResponse;
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = data?.transactions.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'stake') return t.type === 'stake' || t.type === 'unstake';
    return t.type === filter;
  }) ?? [];

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-gray-400 text-sm text-center">Connect your wallet to view transaction history</p>
        <button onClick={() => router.back()} className="text-violet-400 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
        <div className="fixed bottom-0 left-0 right-0"><BottomNav /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50 px-4 py-3 flex items-center gap-3 safe-top">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-base">Transaction History</h1>
          <p className="text-gray-500 text-xs">{truncateAddress(publicKey.toString())}</p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"
        >
          <RefreshCw className={clsx('w-4 h-4 text-gray-300', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Summary cards */}
        {data?.summary && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <SummaryCard
              label="Received"
              value={`+${formatSol(data.summary.totalReceived)} SOL`}
              color="text-emerald-400"
            />
            <SummaryCard
              label="Sent"
              value={`-${formatSol(data.summary.totalSent)} SOL`}
              color="text-orange-400"
            />
            <SummaryCard
              label="Fees paid"
              value={`${(data.summary.totalFees * 1000).toFixed(3)}m`}
              sub="milli-SOL"
              color="text-gray-300"
            />
            <SummaryCard
              label="Swaps"
              value={String(data.summary.swapCount)}
              sub={`${data.summary.stakeCount} staking`}
              color="text-blue-400"
            />
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
          {(['all', 'receive', 'send', 'swap', 'stake', 'other'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors',
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {f === 'stake' ? 'Staking' : f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        {loading && (
          <div className="glass rounded-2xl overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-gray-800/50 first:border-0">
                <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-gray-800 rounded animate-pulse" />
                  <div className="h-2.5 w-16 bg-gray-800 rounded animate-pulse" />
                </div>
                <div className="h-3 w-20 bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="glass rounded-2xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Failed to load history</p>
            <p className="text-gray-600 text-xs mt-1">{error}</p>
            <button onClick={fetchHistory} className="mt-3 text-violet-400 text-sm">Retry</button>
          </div>
        )}

        {!loading && !error && data && filtered.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-gray-400 text-sm">
              {filter === 'all' ? 'No transactions found' : `No ${filter} transactions`}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="text-violet-400">Show all transactions</button>
              )}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden">
            {filtered.map((tx) => (
              <TxRow
                key={tx.signature}
                tx={tx}
                solscanCluster={solscanCluster}
                expanded={expandedSig === tx.signature}
                onToggle={() => setExpandedSig(expandedSig === tx.signature ? null : tx.signature)}
              />
            ))}
          </div>
        )}

        {/* Load more hint */}
        {!loading && filtered.length >= 20 && (
          <p className="text-center text-gray-600 text-xs pb-2">
            Showing last 25 transactions
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0"><BottomNav /></div>
    </div>
  );
}
