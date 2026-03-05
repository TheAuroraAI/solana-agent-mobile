'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Copy,
  Pause,
  Play,
  X,
  TrendingUp,
  Users,
  Shield,
  Star,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { CopyData, Trader, TraderTier, CopyStatus, CopyPosition } from '@/app/api/copy/route';

/* ─── helpers ─── */

function formatUsd(n: number, compact = false): string {
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  }
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(n: number, sign = true): string {
  const prefix = sign && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(1)}%`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

/* ─── tier helpers ─── */

const TIER_LABEL: Record<TraderTier, string> = {
  legendary: 'LEGENDARY',
  elite: 'ELITE',
  pro: 'PRO',
  rising: 'RISING',
};

const TIER_COLORS: Record<TraderTier, string> = {
  legendary: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  elite: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  pro: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  rising: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
};

const TIER_AVATAR_RING: Record<TraderTier, string> = {
  legendary: 'ring-yellow-400/60',
  elite: 'ring-violet-400/60',
  pro: 'ring-blue-400/60',
  rising: 'ring-emerald-400/60',
};

const TIER_AVATAR_BG: Record<TraderTier, string> = {
  legendary: 'bg-yellow-400/15',
  elite: 'bg-violet-400/15',
  pro: 'bg-blue-400/15',
  rising: 'bg-emerald-400/15',
};

/* ─── sub-components ─── */

function TierBadge({ tier }: { tier: TraderTier }) {
  return (
    <span
      className={clsx(
        'text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded border',
        TIER_COLORS[tier],
      )}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  const filled = score;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-500 text-[10px]">Risk</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => {
          const active = i < filled;
          const color = i < 3 ? 'bg-emerald-500' : i < 6 ? 'bg-yellow-500' : i < 8 ? 'bg-orange-500' : 'bg-red-500';
          return (
            <div
              key={i}
              className={clsx('h-1.5 w-2 rounded-sm', active ? color : 'bg-gray-800')}
            />
          );
        })}
      </div>
      <span
        className={clsx(
          'text-[10px] font-semibold',
          score <= 3 ? 'text-emerald-400' : score <= 6 ? 'text-yellow-400' : score <= 8 ? 'text-orange-400' : 'text-red-400',
        )}
      >
        {score}/10
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: CopyStatus }) {
  return (
    <span
      className={clsx(
        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
        status === 'active' && 'bg-emerald-500/15 text-emerald-400',
        status === 'paused' && 'bg-yellow-500/15 text-yellow-400',
        status === 'stopped' && 'bg-red-500/15 text-red-400',
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* ─── Allocation Bottom Sheet ─── */

const PRESET_AMOUNTS = [25, 50, 100, 200];

interface AllocationSheetProps {
  trader: Trader;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

function AllocationSheet({ trader, onClose, onConfirm }: AllocationSheetProps) {
  const [amount, setAmount] = useState(50);
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    setConfirmed(true);
    setTimeout(() => {
      onConfirm(amount);
      onClose();
    }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-t-2xl p-5 border-t border-gray-800 max-w-md mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />

        {/* Trader info */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className={clsx(
              'w-11 h-11 rounded-full flex items-center justify-center text-xl ring-2',
              TIER_AVATAR_BG[trader.tier],
              TIER_AVATAR_RING[trader.tier],
            )}
          >
            {trader.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-semibold text-sm">{trader.handle}</span>
              {trader.isVerified && <CheckCircle className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />}
            </div>
            <TierBadge tier={trader.tier} />
          </div>
          <div className="text-right">
            <p className="text-emerald-400 font-bold text-sm">{formatPct(trader.roi30d)}</p>
            <p className="text-gray-500 text-[10px]">30D ROI</p>
          </div>
        </div>

        {/* Current amount display */}
        <div className="text-center mb-4">
          <p className="text-gray-500 text-xs mb-1">Allocation</p>
          <p className="text-white text-3xl font-bold">{formatUsd(amount)}</p>
          <p className="text-gray-500 text-[10px] mt-1">
            Est. monthly return: <span className="text-emerald-400">{formatUsd(amount * trader.roi30d / 100)}</span> at current pace
          </p>
        </div>

        {/* Slider */}
        <div className="mb-4">
          <input
            type="range"
            min={10}
            max={500}
            step={5}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-violet-500 h-1.5"
          />
          <div className="flex justify-between text-gray-600 text-[10px] mt-1">
            <span>$10</span>
            <span>$500</span>
          </div>
        </div>

        {/* Preset chips */}
        <div className="flex gap-2 mb-5">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset)}
              className={clsx(
                'flex-1 py-2 rounded-xl text-xs font-semibold border transition-all',
                amount === preset
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600',
              )}
            >
              ${preset}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleConfirm}
          disabled={confirmed}
          className={clsx(
            'w-full py-3.5 rounded-2xl font-bold text-sm transition-all',
            confirmed
              ? 'bg-emerald-600 text-white'
              : 'bg-violet-600 hover:bg-violet-500 text-white',
          )}
        >
          {confirmed ? '✓ Copying Started!' : `Start Copying • ${formatUsd(amount)}`}
        </button>

        {/* Disclaimer */}
        <p className="text-gray-600 text-[9px] text-center mt-3 leading-relaxed">
          Copy trading does not guarantee profits. Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}

/* ─── Position Card ─── */

function PositionCard({ pos }: { pos: CopyPosition }) {
  const isProfit = pos.pnl >= 0;
  return (
    <div className="bg-gray-900/70 border border-gray-800/60 rounded-xl p-3 min-w-[160px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-xs font-semibold">{pos.token}</span>
        <span
          className={clsx(
            'text-[9px] font-bold px-1.5 py-0.5 rounded',
            pos.side === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400',
          )}
        >
          {pos.side.toUpperCase()}
        </span>
      </div>
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-gray-500 text-[10px]">Entry</span>
        <span className="text-gray-300 text-[10px] font-mono">
          ${pos.entryPrice < 1 ? pos.entryPrice.toFixed(3) : pos.entryPrice.toFixed(2)}
        </span>
        <ChevronRight className="w-2.5 h-2.5 text-gray-600" />
        <span className="text-gray-300 text-[10px] font-mono">
          ${pos.currentPrice < 1 ? pos.currentPrice.toFixed(3) : pos.currentPrice.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-[10px]">{pos.traderHandle}</span>
        <span className={clsx('text-xs font-bold', isProfit ? 'text-emerald-400' : 'text-red-400')}>
          {isProfit ? '+' : ''}{formatPct(pos.pnlPct)}
        </span>
      </div>
      <p className="text-gray-600 text-[9px] mt-1">{timeAgo(pos.openedAt)}</p>
    </div>
  );
}

/* ─── Trader Card ─── */

interface TraderCardProps {
  trader: Trader;
  onCopy: (trader: Trader) => void;
  tab: '7d' | '30d' | 'all';
}

function TraderCard({ trader, onCopy, tab }: TraderCardProps) {
  const roi = tab === '7d' ? trader.roi7d : trader.roi30d;
  const roiLabel = tab === '7d' ? '7D ROI' : '30D ROI';

  return (
    <div className="bg-gray-900/80 border border-gray-800/60 rounded-2xl p-4 mb-3">
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center text-2xl ring-2 flex-shrink-0',
            TIER_AVATAR_BG[trader.tier],
            TIER_AVATAR_RING[trader.tier],
          )}
        >
          {trader.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white font-bold text-sm">{trader.handle}</span>
            {trader.isVerified && (
              <CheckCircle className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
            )}
            <TierBadge tier={trader.tier} />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-gray-500 text-[10px] flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" /> {trader.copiers.toLocaleString()} copying
            </span>
            <span className="text-gray-600 text-[10px]">
              {trader.followers.toLocaleString()} followers
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={clsx('font-bold text-base', roi >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {formatPct(roi)}
          </p>
          <p className="text-gray-500 text-[10px]">{roiLabel}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <p className="text-white text-xs font-semibold">{formatPct(trader.roi30d)}</p>
          <p className="text-gray-500 text-[9px]">30D ROI</p>
        </div>
        <div className="text-center">
          <p className="text-white text-xs font-semibold">{trader.winRate}%</p>
          <p className="text-gray-500 text-[9px]">Win Rate</p>
        </div>
        <div className="text-center">
          <p className="text-white text-xs font-semibold">{trader.totalTrades.toLocaleString()}</p>
          <p className="text-gray-500 text-[9px]">Trades</p>
        </div>
        <div className="text-center">
          <p className="text-red-400 text-xs font-semibold">-{trader.maxDrawdown}%</p>
          <p className="text-gray-500 text-[9px]">Max DD</p>
        </div>
      </div>

      {/* Token chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {trader.preferredTokens.map((token) => (
          <span
            key={token}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700/50"
          >
            {token}
          </span>
        ))}
      </div>

      {/* Risk bar */}
      <div className="mb-3">
        <RiskBar score={trader.riskScore} />
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Star className="w-3 h-3 text-yellow-400" />
          <span className="text-gray-400 text-[10px]">
            {trader.avgHoldHours < 24
              ? `${trader.avgHoldHours}h avg hold`
              : `${(trader.avgHoldHours / 24).toFixed(1)}d avg hold`}
          </span>
        </div>
        <button
          onClick={() => onCopy(trader)}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
        >
          <Copy className="w-3 h-3" />
          Copy Trader
        </button>
      </div>
    </div>
  );
}

/* ─── My Trader Row ─── */

interface MyTraderRowProps {
  item: { trader: Trader; status: CopyStatus; allocatedUsd: number; pnl: number };
  onToggle: (id: string) => void;
  onStop: (id: string) => void;
}

function MyTraderRow({ item, onToggle, onStop }: MyTraderRowProps) {
  const { trader, status, allocatedUsd, pnl } = item;
  const isProfit = pnl >= 0;

  return (
    <div className="bg-gray-900/70 border border-gray-800/50 rounded-xl p-3 mb-2.5">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center text-xl ring-2 flex-shrink-0',
            TIER_AVATAR_BG[trader.tier],
            TIER_AVATAR_RING[trader.tier],
          )}
        >
          {trader.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-sm font-semibold">{trader.handle}</span>
            {trader.isVerified && <CheckCircle className="w-3 h-3 text-violet-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={status} />
            <span className="text-gray-500 text-[10px]">{formatUsd(allocatedUsd)} allocated</span>
          </div>
        </div>
        <div className="text-right mr-2">
          <p className={clsx('font-bold text-sm', isProfit ? 'text-emerald-400' : 'text-red-400')}>
            {isProfit ? '+' : ''}{formatUsd(pnl)}
          </p>
          <p className="text-gray-500 text-[10px]">P&amp;L</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onToggle(trader.id)}
            className={clsx(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95',
              status === 'active'
                ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25',
            )}
          >
            {status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onStop(trader.id)}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main View ─── */

type LeaderboardTab = '30d' | '7d' | 'all';

export function CopyView() {
  const router = useRouter();
  const [data, setData] = useState<CopyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<LeaderboardTab>('30d');
  const [sheetTrader, setSheetTrader] = useState<Trader | null>(null);
  const [myTraderStatuses, setMyTraderStatuses] = useState<Map<string, CopyStatus>>(new Map());
  const [stoppedTraders, setStoppedTraders] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/copy');
      if (!res.ok) throw new Error('Failed to fetch');
      const json: CopyData = await res.json();
      setData(json);
      const statusMap = new Map<string, CopyStatus>();
      json.myTraders.forEach((m) => statusMap.set(m.trader.id, m.status));
      setMyTraderStatuses(statusMap);
    } catch {
      // keep stale data if available
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleToggle(traderId: string) {
    setMyTraderStatuses((prev) => {
      const next = new Map(prev);
      const cur = next.get(traderId) ?? 'active';
      next.set(traderId, cur === 'active' ? 'paused' : 'active');
      return next;
    });
  }

  function handleStop(traderId: string) {
    setStoppedTraders((prev) => new Set(prev).add(traderId));
  }

  function handleCopyConfirmed(trader: Trader, amount: number) {
    // In production, POST to /api/copy/positions
    console.log('Copying trader', trader.id, 'with $', amount);
  }

  const sortedTraders = data
    ? [...data.featuredTraders].sort((a, b) => {
        if (tab === '7d') return b.roi7d - a.roi7d;
        return b.roi30d - a.roi30d;
      })
    : [];

  const visibleMyTraders = data
    ? data.myTraders
        .filter((m) => !stoppedTraders.has(m.trader.id))
        .map((m) => ({
          ...m,
          status: myTraderStatuses.get(m.trader.id) ?? m.status,
        }))
    : [];

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="safe-top px-4 pt-6 pb-4 animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gray-800 rounded-xl" />
          <div className="h-5 w-36 bg-gray-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-900 rounded-2xl" />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 bg-gray-900 rounded-2xl mb-3" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="safe-top px-4 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800/80 hover:bg-gray-700 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-gray-300" />
            </button>
            <div>
              <h1 className="text-white text-lg font-bold leading-tight">Copy Trading</h1>
              <p className="text-gray-500 text-[11px]">Mirror top wallets</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className={clsx(
              'w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800/80 hover:bg-gray-700 transition-all active:scale-95',
              refreshing && 'animate-spin',
            )}
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {/* Stats bar */}
        {data && (
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-3">
              <p className="text-gray-500 text-[10px] mb-0.5">Total Copied</p>
              <p className="text-white font-bold text-base">{formatUsd(data.stats.totalCopied)}</p>
            </div>
            <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-3">
              <p className="text-gray-500 text-[10px] mb-0.5">Total P&amp;L</p>
              <p
                className={clsx(
                  'font-bold text-base',
                  data.stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {data.stats.totalPnl >= 0 ? '+' : ''}{formatUsd(data.stats.totalPnl)}
              </p>
            </div>
            <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-3">
              <p className="text-gray-500 text-[10px] mb-0.5">Active Traders</p>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                <p className="text-white font-bold text-base">{data.stats.activeTraders}</p>
              </div>
            </div>
            <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-3">
              <p className="text-gray-500 text-[10px] mb-0.5">Win Rate</p>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <p className="text-emerald-400 font-bold text-base">{data.stats.winRate}%</p>
              </div>
            </div>
          </div>
        )}

        {/* My Portfolio */}
        {visibleMyTraders.length > 0 && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">My Portfolio</h2>
              <span className="text-gray-500 text-[10px]">{visibleMyTraders.length} trader{visibleMyTraders.length !== 1 ? 's' : ''}</span>
            </div>
            {visibleMyTraders.map((item) => (
              <MyTraderRow
                key={item.trader.id}
                item={item}
                onToggle={handleToggle}
                onStop={handleStop}
              />
            ))}
          </section>
        )}

        {/* Active Positions */}
        {data && data.activeCopyPositions.length > 0 && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">Active Positions</h2>
              <span className="text-gray-500 text-[10px]">{data.activeCopyPositions.length} open</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {data.activeCopyPositions.map((pos) => (
                <PositionCard key={pos.id} pos={pos} />
              ))}
            </div>
          </section>
        )}

        {/* Divider */}
        <div className="border-t border-gray-800/50 mb-5" />

        {/* Leaderboard Header + Tabs */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Leaderboard
          </h2>
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-0.5 gap-0.5">
            {(['all', '7d', '30d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t === 'all' ? '30d' : t)}
                className={clsx(
                  'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                  tab === (t === 'all' ? '30d' : t)
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-500 hover:text-gray-300',
                )}
              >
                {t === 'all' ? 'All' : t === '7d' ? '7D' : '30D'}
              </button>
            ))}
          </div>
        </div>

        {/* Trader Cards */}
        {sortedTraders.map((trader) => (
          <TraderCard
            key={trader.id}
            trader={trader}
            onCopy={setSheetTrader}
            tab={tab}
          />
        ))}

        {/* Last updated */}
        {data && (
          <p className="text-gray-700 text-[9px] text-center mt-2 mb-2">
            Updated {timeAgo(data.lastUpdated)}
          </p>
        )}
      </div>

      {/* Allocation bottom sheet overlay */}
      {sheetTrader && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
      )}
      {sheetTrader && (
        <AllocationSheet
          trader={sheetTrader}
          onClose={() => setSheetTrader(null)}
          onConfirm={(amount) => handleCopyConfirmed(sheetTrader, amount)}
        />
      )}
    </>
  );
}
