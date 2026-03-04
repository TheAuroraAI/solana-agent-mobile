'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { DcaPlan, DcaData, DcaOrder } from '@/app/api/dca/route';

/* ─── helpers ─── */

function formatSol(n: number, decimals = 3): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPrice(p: number): string {
  if (p === 0) return '$--';
  if (p >= 1) return '$' + p.toFixed(2);
  if (p >= 0.001) return '$' + p.toFixed(6);
  return '$' + p.toExponential(2);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function nextExecutionProgress(plan: DcaPlan): number {
  const intervalMs =
    plan.interval === 'daily'
      ? 86400000
      : plan.interval === 'weekly'
        ? 7 * 86400000
        : 30 * 86400000;
  const nextTs = new Date(plan.nextExecution).getTime();
  const elapsed = intervalMs - (nextTs - Date.now());
  return Math.max(0, Math.min(100, (elapsed / intervalMs) * 100));
}

const INTERVAL_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

/* ─── token options for new plan ─── */

const TOKEN_OPTIONS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    icon: 'https://static.jup.ag/jup/icon.png',
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
  },
  {
    symbol: 'PYTH',
    name: 'Pyth Network',
    icon: 'https://pyth.network/token.svg',
  },
  {
    symbol: 'JTO',
    name: 'Jito',
    icon: 'https://storage.googleapis.com/token-metadata/Jito-256.png',
  },
  {
    symbol: 'WIF',
    name: 'dogwifhat',
    icon: 'https://bafkreibk3covs5ltyqxa272uodhculbzd2udsdeticwwv5ka26rkevdxv4.ipfs.nftstorage.link/',
  },
  {
    symbol: 'RAY',
    name: 'Raydium',
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
  },
  {
    symbol: 'RENDER',
    name: 'Render',
    icon: 'https://render.x.foundation/logo.png',
  },
];

/* ─── sub-components ─── */

function PlanCard({
  plan,
  onToggle,
  onDelete,
}: {
  plan: DcaPlan;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = plan.pnlPercent >= 0;
  const progress = nextExecutionProgress(plan);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center overflow-hidden">
            {plan.tokenIcon ? (
              <img
                src={plan.tokenIcon}
                alt={plan.tokenSymbol}
                className="w-7 h-7 rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.textContent =
                    plan.tokenSymbol.slice(0, 2);
                }}
              />
            ) : (
              <span className="text-sm font-bold text-white">
                {plan.tokenSymbol.slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">{plan.tokenSymbol}</p>
              <span
                className={clsx(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  plan.interval === 'daily'
                    ? 'bg-violet-500/20 text-violet-400'
                    : plan.interval === 'weekly'
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'bg-emerald-500/20 text-emerald-400',
                )}
              >
                {INTERVAL_LABELS[plan.interval]}
              </span>
              {plan.status === 'paused' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
                  Paused
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{plan.tokenName}</p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={clsx(
              'text-xs font-bold flex items-center gap-0.5 justify-end',
              isPositive ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isPositive ? '+' : ''}
            {plan.pnlPercent.toFixed(2)}%
          </p>
          <p className="text-[10px] text-gray-500">{formatSol(plan.totalInvested, 2)} SOL</p>
        </div>
      </div>

      {/* Amount per interval */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          {formatSol(plan.amountPerInterval, 2)} SOL / {plan.interval.replace('ly', '')}
        </span>
        <span className="text-gray-400">
          Avg {formatPrice(plan.averagePrice)} vs {formatPrice(plan.currentPrice)}
        </span>
      </div>

      {/* Next execution progress */}
      {plan.status === 'active' && (
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Next buy
            </span>
            <span className="text-violet-400 font-medium">
              {timeUntil(plan.nextExecution)}
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onToggle(plan.id)}
          className={clsx(
            'flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold flex-1 transition-all active:scale-95',
            plan.status === 'active'
              ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
          )}
        >
          {plan.status === 'active' ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Resume
            </>
          )}
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold flex-1 bg-gray-800/60 text-gray-300 border border-gray-700 transition-all active:scale-95"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Hide Orders
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Orders ({plan.orders.length})
            </>
          )}
        </button>
        <button
          onClick={() => onDelete(plan.id)}
          className="flex items-center justify-center p-2 rounded-xl bg-gray-800/60 text-gray-500 border border-gray-700 transition-all active:scale-95 hover:text-red-400 hover:border-red-500/30"
          aria-label="Delete plan"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expandable order history */}
      {expanded && (
        <div className="space-y-1.5 pt-2 border-t border-gray-700/50">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-2">
            Order History
          </p>
          {plan.orders.length === 0 ? (
            <p className="text-xs text-gray-500 py-2 text-center">No orders yet</p>
          ) : (
            plan.orders.map((order: DcaOrder, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-gray-800/40 rounded-xl px-3 py-2"
              >
                <div>
                  <p className="text-xs text-white font-medium">
                    {formatSol(order.amount, 2)} SOL @ {formatPrice(order.price)}
                  </p>
                  <p className="text-[10px] text-gray-500">{formatDateShort(order.date)}</p>
                </div>
                <a
                  href={`https://solscan.io/tx/${order.txSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-violet-400 transition-colors"
                  aria-label="View transaction"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── new plan form ─── */

interface NewPlanForm {
  tokenIndex: number;
  amount: string;
  interval: 'daily' | 'weekly' | 'monthly';
  untilCancelled: boolean;
  durationWeeks: string;
  startDate: string;
}

const DEFAULT_FORM: NewPlanForm = {
  tokenIndex: 0,
  amount: '',
  interval: 'weekly',
  untilCancelled: true,
  durationWeeks: '12',
  startDate: new Date().toISOString().slice(0, 10),
};

function projectedCost(form: NewPlanForm): { total: number; executions: number } | null {
  const amt = parseFloat(form.amount);
  if (isNaN(amt) || amt <= 0) return null;

  if (form.untilCancelled) {
    // Show projected 30-day cost
    const perDay =
      form.interval === 'daily'
        ? amt
        : form.interval === 'weekly'
          ? amt / 7
          : amt / 30;
    return { total: parseFloat((perDay * 30).toFixed(4)), executions: -1 };
  }

  const weeks = parseInt(form.durationWeeks);
  if (isNaN(weeks) || weeks <= 0) return null;

  const days = weeks * 7;
  const executions =
    form.interval === 'daily'
      ? days
      : form.interval === 'weekly'
        ? weeks
        : Math.floor(days / 30);

  return { total: parseFloat((amt * executions).toFixed(4)), executions };
}

/* ─── main component ─── */

export function DcaView() {
  const router = useRouter();
  const [data, setData] = useState<DcaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [form, setForm] = useState<NewPlanForm>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/dca');
      if (!res.ok) throw new Error('Failed to fetch');
      const json: DcaData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      if (!data) setError(err instanceof Error ? err.message : 'Failed to load DCA plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = useCallback(
    (id: string) => {
      if (!data) return;
      setData({
        ...data,
        plans: data.plans.map((p) =>
          p.id === id
            ? { ...p, status: p.status === 'active' ? 'paused' : 'active' }
            : p,
        ),
      });
    },
    [data],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!data) return;
      const updated = data.plans.filter((p) => p.id !== id);
      const totalInvested = updated.reduce((s, p) => s + p.totalInvested, 0);
      const totalValue = updated.reduce(
        (s, p) => s + p.totalInvested * (1 + p.pnlPercent / 100),
        0,
      );
      setData({
        plans: updated,
        totalInvested,
        totalValue,
        overallPnlPercent:
          totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
      });
    },
    [data],
  );

  const handleCreatePlan = useCallback(async () => {
    const token = TOKEN_OPTIONS[form.tokenIndex];
    const amount = parseFloat(form.amount);
    if (!token || isNaN(amount) || amount <= 0) return;

    setCreating(true);
    try {
      const res = await fetch('/api/dca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSymbol: token.symbol,
          tokenName: token.name,
          tokenIcon: token.icon,
          amountPerInterval: amount,
          interval: form.interval,
          duration: form.untilCancelled ? null : parseInt(form.durationWeeks),
          startDate: new Date(form.startDate).toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to create plan');
      const json = await res.json();

      if (data && json.plan) {
        setData({
          ...data,
          plans: [json.plan, ...data.plans],
        });
      }

      setShowNewPlan(false);
      setForm(DEFAULT_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  }, [form, data]);

  const projection = useMemo(() => projectedCost(form), [form]);

  const activePlans = data?.plans.filter((p) => p.status === 'active') ?? [];
  const pausedPlans = data?.plans.filter((p) => p.status === 'paused') ?? [];
  const isOverallPositive = (data?.overallPnlPercent ?? 0) >= 0;

  /* ─── loading skeleton ─── */

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-800 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-800 rounded w-32" />
            <div className="h-3 bg-gray-800 rounded w-48" />
          </div>
        </div>
        <div className="h-28 bg-gray-800 rounded-2xl" />
        <div className="h-44 bg-gray-800 rounded-2xl" />
        <div className="h-44 bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  /* ─── error state ─── */

  if (error && !data) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-white">DCA Scheduler</h1>
        </div>
        <div className="glass rounded-2xl p-6 text-center">
          <RefreshCw className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">DCA Scheduler</h1>
            <p className="text-xs text-gray-400 mt-0.5">Automated dollar-cost averaging</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
          >
            <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowNewPlan(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            New Plan
          </button>
        </div>
      </div>

      {/* Summary card */}
      {data && (
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Invested</p>
              <p className="text-lg font-bold text-white">{formatSol(data.totalInvested, 2)}</p>
              <p className="text-[10px] text-gray-500">SOL</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Value</p>
              <p className="text-lg font-bold text-white">{formatSol(data.totalValue, 2)}</p>
              <p className="text-[10px] text-gray-500">SOL</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">P&L</p>
              <p
                className={clsx(
                  'text-lg font-bold',
                  isOverallPositive ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {isOverallPositive ? '+' : ''}
                {data.overallPnlPercent.toFixed(2)}%
              </p>
              <p className="text-[10px] text-gray-500">
                {isOverallPositive ? '+' : ''}
                {formatSol(data.totalValue - data.totalInvested, 3)} SOL
              </p>
            </div>
          </div>

          {/* Plan count bar */}
          <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {activePlans.length} active plan{activePlans.length !== 1 ? 's' : ''}
              {pausedPlans.length > 0 &&
                ` · ${pausedPlans.length} paused`}
            </span>
            <span className="text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {data.plans.length > 0
                ? `Since ${formatDateShort(
                    data.plans.reduce((oldest, p) =>
                      new Date(p.startDate) < new Date(oldest.startDate) ? p : oldest,
                    ).startDate,
                  )}`
                : 'No plans yet'}
            </span>
          </div>
        </div>
      )}

      {/* Plans list */}
      {data && data.plans.length > 0 ? (
        <div className="space-y-3">
          {data.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <DollarSign className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No DCA plans yet</p>
          <p className="text-xs text-gray-600 mt-1">
            Create a plan to start dollar-cost averaging into your favorite tokens
          </p>
          <button
            onClick={() => setShowNewPlan(true)}
            className="mt-4 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold mx-auto active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Plan
          </button>
        </div>
      )}

      {/* Info note */}
      <p className="text-gray-600 text-xs text-center">
        DCA plans execute automatically. Verify each transaction in Phantom before signing.
      </p>

      {/* ─── New Plan Bottom Sheet ─── */}
      {showNewPlan && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNewPlan(false)}
        >
          <div
            className="w-full max-w-md bg-gray-900 rounded-t-3xl border-t border-gray-700/50 p-5 pb-10 animate-[fadeUp_0.2s_ease-out] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

            {/* Sheet header */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-bold text-white">New DCA Plan</p>
              <button
                onClick={() => setShowNewPlan(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Token selector */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Buy Token (with SOL)</label>
                <div className="grid grid-cols-4 gap-2">
                  {TOKEN_OPTIONS.map((token, idx) => (
                    <button
                      key={token.symbol}
                      onClick={() => setForm((f) => ({ ...f, tokenIndex: idx }))}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all text-center',
                        form.tokenIndex === idx
                          ? 'bg-violet-500/20 border border-violet-500/50'
                          : 'bg-gray-800/60 border border-gray-700/50 hover:border-gray-600',
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center">
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="w-6 h-6"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span
                        className={clsx(
                          'text-[10px] font-semibold',
                          form.tokenIndex === idx ? 'text-violet-300' : 'text-gray-400',
                        )}
                      >
                        {token.symbol}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount per interval */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">
                  Amount per buy (SOL)
                </label>
                <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700 focus-within:border-violet-500 transition-colors">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-lg font-bold text-white outline-none"
                  />
                  <span className="text-sm text-gray-400">SOL</span>
                </div>
              </div>

              {/* Frequency toggle */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Frequency</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setForm((f) => ({ ...f, interval }))}
                      className={clsx(
                        'py-2.5 rounded-xl text-xs font-semibold capitalize transition-colors',
                        form.interval === interval
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-800 text-gray-400 border border-gray-700',
                      )}
                    >
                      {INTERVAL_LABELS[interval]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Duration</label>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setForm((f) => ({ ...f, untilCancelled: true }))}
                    className={clsx(
                      'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                      form.untilCancelled
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-800 text-gray-400 border border-gray-700',
                    )}
                  >
                    Until Cancelled
                  </button>
                  <button
                    onClick={() => setForm((f) => ({ ...f, untilCancelled: false }))}
                    className={clsx(
                      'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                      !form.untilCancelled
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-800 text-gray-400 border border-gray-700',
                    )}
                  >
                    Fixed Duration
                  </button>
                </div>
                {!form.untilCancelled && (
                  <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700 focus-within:border-violet-500 transition-colors">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.durationWeeks}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, durationWeeks: e.target.value }))
                      }
                      className="flex-1 bg-transparent text-sm font-bold text-white outline-none"
                    />
                    <span className="text-sm text-gray-400">weeks</span>
                  </div>
                )}
              </div>

              {/* Start date */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Start Date</label>
                <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700 focus-within:border-violet-500 transition-colors">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="flex-1 bg-transparent text-sm font-medium text-white outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Projection summary */}
              {projection && (
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-400">
                      Projection
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Token</span>
                    <span className="text-white font-medium">
                      SOL → {TOKEN_OPTIONS[form.tokenIndex]?.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Per execution</span>
                    <span className="text-white font-medium">
                      {formatSol(parseFloat(form.amount) || 0, 2)} SOL
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {form.untilCancelled ? 'Est. 30-day cost' : 'Total cost'}
                    </span>
                    <span className="text-white font-medium">
                      {formatSol(projection.total, 2)} SOL
                      {projection.executions > 0 &&
                        ` (${projection.executions} buys)`}
                    </span>
                  </div>
                  {form.untilCancelled && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Runs indefinitely until you pause or cancel
                    </p>
                  )}
                </div>
              )}

              {/* Create button */}
              <button
                onClick={handleCreatePlan}
                disabled={
                  !form.amount ||
                  isNaN(parseFloat(form.amount)) ||
                  parseFloat(form.amount) <= 0 ||
                  creating
                }
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
