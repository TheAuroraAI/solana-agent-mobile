'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  X,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Clock,
  Check,
  Copy,
  ExternalLink,
  AlertTriangle,
  Zap,
  Target,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import type {
  LimitsData,
  LimitOrder,
  OrderSide,
  OrderType,
} from '@/app/api/limits/route';
import { DemoBanner } from '@/components/DemoBanner';

/* ─── helpers ─── */

function formatPrice(p: number): string {
  if (p === 0) return '$--';
  if (p >= 1_000) return '$' + p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 1) return '$' + p.toFixed(2);
  if (p >= 0.001) return '$' + p.toFixed(6);
  return '$' + p.toExponential(2);
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 0.001) return n.toFixed(n < 1 ? 4 : 3);
  return n.toExponential(2);
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function priceDist(limit: number, current: number): { pct: number; above: boolean } {
  if (current === 0) return { pct: 0, above: false };
  const pct = ((limit - current) / current) * 100;
  return { pct: Math.abs(pct), above: pct > 0 };
}

function truncateTx(hash: string): string {
  return hash.slice(0, 6) + '...' + hash.slice(-4);
}

/* ─── badge helpers ─── */

function orderTypeBadge(type: OrderType) {
  const map: Record<OrderType, { label: string; cls: string; Icon: React.ElementType }> = {
    limit: { label: 'LIMIT', cls: 'bg-violet-900/60 text-violet-300 border-violet-700/40', Icon: Target },
    stop_loss: { label: 'STOP LOSS', cls: 'bg-red-900/50 text-red-300 border-red-700/40', Icon: AlertTriangle },
    take_profit: { label: 'TAKE PROFIT', cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40', Icon: TrendingUp },
    trailing_stop: { label: 'TRAILING', cls: 'bg-amber-900/50 text-amber-300 border-amber-700/40', Icon: Zap },
  };
  return map[type];
}

function statusBadge(status: LimitOrder['status']) {
  const map: Record<LimitOrder['status'], { label: string; cls: string }> = {
    open: { label: 'OPEN', cls: 'bg-blue-900/50 text-blue-300 border-blue-700/40' },
    partial: { label: 'PARTIAL', cls: 'bg-amber-900/50 text-amber-300 border-amber-700/40' },
    filled: { label: 'FILLED', cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40' },
    cancelled: { label: 'CANCELLED', cls: 'bg-gray-800/80 text-gray-400 border-gray-700/40' },
    expired: { label: 'EXPIRED', cls: 'bg-gray-800/80 text-gray-400 border-gray-700/40' },
  };
  return map[status];
}

/* ─── sub-components ─── */

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex-1 min-w-0 bg-gray-900/60 border border-gray-800/60 rounded-xl p-3 flex flex-col gap-0.5">
      <span className="text-gray-500 text-[10px] uppercase tracking-wider font-medium leading-none">
        {label}
      </span>
      <span className={clsx('text-sm font-bold leading-tight tabular-nums', accent)}>{value}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* silent */
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

function FillBar({ pct }: { pct: number }) {
  if (pct === 0) return null;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Fill progress</span>
        <span className="text-[10px] text-amber-400 font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OpenOrderCard({
  order,
  onCancel,
}: {
  order: LimitOrder;
  onCancel: (id: string) => void;
}) {
  const typeBadge = orderTypeBadge(order.type);
  const sBadge = statusBadge(order.status);
  const { pct, above } = priceDist(order.limitPrice, order.currentPrice);
  const TypeIcon = typeBadge.Icon;

  return (
    <div className="bg-gray-900/70 border border-gray-800/60 rounded-2xl p-4 space-y-3">
      {/* top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={clsx(
              'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5',
              typeBadge.cls,
            )}
          >
            <TypeIcon size={9} />
            {typeBadge.label}
          </span>
          <span
            className={clsx(
              'text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5',
              order.side === 'buy'
                ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40'
                : 'bg-red-900/50 text-red-300 border-red-700/40',
            )}
          >
            {order.side.toUpperCase()}
          </span>
          <span
            className={clsx(
              'text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5',
              sBadge.cls,
            )}
          >
            {sBadge.label}
          </span>
        </div>
        <button
          onClick={() => onCancel(order.id)}
          className="shrink-0 text-[11px] font-semibold border border-red-800/60 text-red-400 hover:bg-red-900/30 rounded-lg px-2.5 py-1 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* token pair */}
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none" role="img" aria-label={order.inputToken}>
          {order.inputLogo}
        </span>
        <div>
          <p className="text-white font-bold text-base leading-tight">
            {order.inputToken} → {order.outputToken}
          </p>
          <p className="text-gray-400 text-xs">
            {formatAmount(order.inputAmount)} {order.inputToken} →{' '}
            {formatAmount(order.outputAmount)} {order.outputToken}
          </p>
        </div>
        <span className="text-xl leading-none ml-1" role="img" aria-label={order.outputToken}>
          {order.outputLogo}
        </span>
      </div>

      {/* price grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800/50 rounded-xl p-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Limit Price</p>
          <p className="text-white font-semibold text-sm tabular-nums">
            {formatPrice(order.limitPrice)}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Current</p>
          <div className="flex items-center gap-1">
            <p className="text-white font-semibold text-sm tabular-nums">
              {formatPrice(order.currentPrice)}
            </p>
            <span
              className={clsx(
                'text-[10px] font-semibold',
                above ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {above ? '+' : '-'}{pct.toFixed(1)}%
            </span>
          </div>
        </div>
        {order.triggerPrice !== null && (
          <div className="bg-gray-800/50 rounded-xl p-2.5 col-span-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Trigger Price</p>
            <p className="text-amber-400 font-semibold text-sm tabular-nums">
              {formatPrice(order.triggerPrice)}
            </p>
          </div>
        )}
      </div>

      {order.filledPct > 0 && <FillBar pct={order.filledPct} />}

      {/* footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800/60">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none" role="img" aria-label={order.platform}>
            {order.platformLogo}
          </span>
          <span className="text-gray-400 text-xs font-medium">{order.platform}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-500 text-xs">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatDateShort(order.createdAt)}
          </span>
          {order.expiresAt && (
            <span className="text-gray-600">
              exp {formatDateShort(order.expiresAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryOrderCard({ order }: { order: LimitOrder }) {
  const typeBadge = orderTypeBadge(order.type);
  const sBadge = statusBadge(order.status);
  const TypeIcon = typeBadge.Icon;
  const isFilled = order.status === 'filled';

  return (
    <div className="bg-gray-900/70 border border-gray-800/60 rounded-2xl p-4 space-y-3">
      {/* badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={clsx(
            'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5',
            typeBadge.cls,
          )}
        >
          <TypeIcon size={9} />
          {typeBadge.label}
        </span>
        <span
          className={clsx(
            'text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5',
            order.side === 'buy'
              ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40'
              : 'bg-red-900/50 text-red-300 border-red-700/40',
          )}
        >
          {order.side.toUpperCase()}
        </span>
        <span
          className={clsx(
            'text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5',
            sBadge.cls,
          )}
        >
          {sBadge.label}
        </span>
      </div>

      {/* pair */}
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none" role="img" aria-label={order.inputToken}>
          {order.inputLogo}
        </span>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">
            {order.inputToken} → {order.outputToken}
          </p>
          <p className="text-gray-400 text-xs">
            {formatAmount(order.inputAmount)} {order.inputToken} →{' '}
            {formatAmount(order.outputAmount)} {order.outputToken}
          </p>
        </div>
        <span className="text-xl leading-none ml-1" role="img" aria-label={order.outputToken}>
          {order.outputLogo}
        </span>
      </div>

      {/* price row */}
      <div className="flex items-center gap-3 text-xs">
        <div>
          <span className="text-gray-500">Limit </span>
          <span className="text-white font-medium tabular-nums">
            {formatPrice(order.limitPrice)}
          </span>
        </div>
        {isFilled && (
          <>
            <span className="text-gray-700">·</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <Check size={11} />
              <span className="font-medium">Filled {order.filledAt ? formatDateShort(order.filledAt) : ''}</span>
            </div>
          </>
        )}
        {order.status === 'cancelled' && (
          <>
            <span className="text-gray-700">·</span>
            <div className="flex items-center gap-1 text-gray-500">
              <X size={11} />
              <span>Cancelled</span>
            </div>
          </>
        )}
      </div>

      {/* tx hash */}
      {order.txHash && (
        <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2">
          <span className="text-gray-500 text-xs">Tx</span>
          <span className="text-gray-300 text-xs font-mono flex-1">
            {truncateTx(order.txHash)}
          </span>
          <CopyButton text={order.txHash} />
          <a
            href={`https://solscan.io/tx/${order.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="View on Solscan"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800/60">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none" role="img" aria-label={order.platform}>
            {order.platformLogo}
          </span>
          <span className="text-gray-400 text-xs">{order.platform}</span>
        </div>
        <span className="text-gray-500 text-xs flex items-center gap-1">
          <Clock size={10} />
          {formatDateShort(order.createdAt)}
        </span>
      </div>
    </div>
  );
}

/* ─── new order form ─── */

interface NewOrderFormState {
  side: OrderSide;
  type: OrderType;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  limitPrice: string;
  expiry: '24h' | '7d' | '30d' | 'never';
  platform: 'Jupiter' | 'Phoenix';
}

function NewOrderSheet({
  onClose,
  onPlace,
  supportedTokens,
}: {
  onClose: () => void;
  onPlace: (form: NewOrderFormState) => void;
  supportedTokens: LimitsData['supportedTokens'];
}) {
  const [form, setForm] = useState<NewOrderFormState>({
    side: 'buy',
    type: 'limit',
    inputToken: 'USDC',
    outputToken: 'SOL',
    inputAmount: '',
    limitPrice: '',
    expiry: '24h',
    platform: 'Jupiter',
  });

  const currentToken = supportedTokens.find((t) => t.symbol === form.outputToken);
  const marketPrice = currentToken?.price ?? 0;

  function set<K extends keyof NewOrderFormState>(key: K, value: NewOrderFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function useMarketPrice() {
    set('limitPrice', marketPrice > 0 ? marketPrice.toFixed(marketPrice < 1 ? 6 : 2) : '');
  }

  const canPlace = form.inputAmount.trim() !== '' && form.limitPrice.trim() !== '';

  const ORDER_TYPES: { value: OrderType; label: string }[] = [
    { value: 'limit', label: 'Limit' },
    { value: 'stop_loss', label: 'Stop Loss' },
    { value: 'take_profit', label: 'Take Profit' },
  ];

  const EXPIRIES: { value: NewOrderFormState['expiry']; label: string }[] = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: 'never', label: 'Never' },
  ];

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-950 border-t border-gray-800/80 rounded-t-3xl z-50 pb-safe-or-6">
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
          <h2 className="text-white font-bold text-base">New Limit Order</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* buy / sell toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-800/60 bg-gray-900/40">
            {(['buy', 'sell'] as const).map((s) => (
              <button
                key={s}
                onClick={() => set('side', s)}
                className={clsx(
                  'flex-1 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors',
                  form.side === s
                    ? s === 'buy'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'text-gray-500 hover:text-gray-300',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* order type */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
              Order Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {ORDER_TYPES.map(({ value, label }) => {
                const badge = orderTypeBadge(value);
                return (
                  <button
                    key={value}
                    onClick={() => set('type', value)}
                    className={clsx(
                      'text-xs font-semibold border rounded-full px-3 py-1.5 transition-all',
                      form.type === value
                        ? badge.cls + ' ring-1 ring-violet-500/50'
                        : 'border-gray-700 text-gray-500 hover:text-gray-300',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* token selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
                Pay With
              </label>
              <div className="relative">
                <select
                  value={form.inputToken}
                  onChange={(e) => set('inputToken', e.target.value)}
                  className="w-full bg-gray-800/60 border border-gray-700/60 text-white rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-violet-600/60"
                >
                  {supportedTokens.map((t) => (
                    <option key={t.symbol} value={t.symbol}>
                      {t.logo} {t.symbol}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
                Receive
              </label>
              <div className="relative">
                <select
                  value={form.outputToken}
                  onChange={(e) => set('outputToken', e.target.value)}
                  className="w-full bg-gray-800/60 border border-gray-700/60 text-white rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-violet-600/60"
                >
                  {supportedTokens
                    .filter((t) => t.symbol !== form.inputToken)
                    .map((t) => (
                      <option key={t.symbol} value={t.symbol}>
                        {t.logo} {t.symbol}
                      </option>
                    ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* amount input */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
              Amount ({form.inputToken})
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0.00"
              value={form.inputAmount}
              onChange={(e) => set('inputAmount', e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/60 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-600/60 placeholder-gray-600"
            />
          </div>

          {/* limit price */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Limit Price ({form.inputToken} per {form.outputToken})
              </label>
              <button
                onClick={useMarketPrice}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold uppercase tracking-wider transition-colors"
              >
                Use Market {marketPrice > 0 ? `(${formatPrice(marketPrice)})` : ''}
              </button>
            </div>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0.00"
              value={form.limitPrice}
              onChange={(e) => set('limitPrice', e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/60 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-600/60 placeholder-gray-600"
            />
          </div>

          {/* expiry */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
              Expiry
            </label>
            <div className="flex gap-2">
              {EXPIRIES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => set('expiry', value)}
                  className={clsx(
                    'flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors',
                    form.expiry === value
                      ? 'border-violet-600 bg-violet-900/40 text-violet-300'
                      : 'border-gray-700 text-gray-500 hover:text-gray-300',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* platform */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
              Platform
            </label>
            <div className="flex gap-3">
              {(['Jupiter', 'Phoenix'] as const).map((p) => {
                const logos: Record<'Jupiter' | 'Phoenix', string> = {
                  Jupiter: '🪐',
                  Phoenix: '🔥',
                };
                return (
                  <button
                    key={p}
                    onClick={() => set('platform', p)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
                      form.platform === p
                        ? 'border-violet-600 bg-violet-900/40 text-white'
                        : 'border-gray-700 text-gray-500 hover:text-gray-300',
                    )}
                  >
                    <span role="img" aria-label={p}>{logos[p]}</span>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* place button */}
          <button
            onClick={() => {
              if (canPlace) onPlace(form);
            }}
            disabled={!canPlace}
            className={clsx(
              'w-full py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all',
              canPlace
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 active:scale-[0.98]'
                : 'bg-gray-800/60 text-gray-600 cursor-not-allowed',
            )}
          >
            Place Order
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── main view ─── */

export function LimitsView() {
  const router = useRouter();
  const [data, setData] = useState<LimitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'open' | 'history'>('open');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/limits');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LimitsData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  function handleCancel(id: string) {
    setCancelledIds((prev) => new Set([...prev, id]));
  }

  function handlePlace(form: NewOrderFormState) {
    // In production this would POST to the API
    setSheetOpen(false);
    // Trigger a soft refresh
    void fetchData(true);
  }

  /* loading skeleton */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 pt-4 space-y-4 animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
          <div className="h-5 w-36 bg-gray-800 rounded-lg" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-14 bg-gray-800/60 rounded-xl" />
          ))}
        </div>
        <div className="h-10 bg-gray-800/60 rounded-2xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 bg-gray-800/40 rounded-2xl" />
        ))}
      </div>
    );
  }

  /* error state */
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="text-red-400" size={36} />
        <p className="text-gray-300 font-medium">Could not load limit orders</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <button
          onClick={() => void fetchData()}
          className="mt-2 px-5 py-2.5 bg-violet-700 hover:bg-violet-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const visibleOpen = data.openOrders.filter((o) => !cancelledIds.has(o.id));

  return (
    <>
      <div className="min-h-screen bg-gray-950 pb-6">
        {/* header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-white font-bold text-lg leading-tight">Limit Orders</h1>
              <p className="text-gray-500 text-xs">Automated order execution</p>
            </div>
            <button
              onClick={() => void fetchData(true)}
              className={clsx(
                'p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors',
                refreshing && 'animate-spin text-violet-400',
              )}
              aria-label="Refresh"
              disabled={refreshing}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <p className="text-gray-600 text-[10px] ml-10">
            Last updated {new Date(data.lastUpdated).toLocaleTimeString()}
          </p>
        </div>

        <DemoBanner />

        {/* stats bar */}
        <div className="px-4 pb-3 flex gap-2">
          <StatCard
            label="Open"
            value={String(visibleOpen.length)}
            accent="text-violet-400"
          />
          <StatCard
            label="Filled Today"
            value={String(data.stats.filledToday)}
            accent="text-emerald-400"
          />
          <StatCard
            label="Volume"
            value={'$' + (data.stats.totalVolume / 1000).toFixed(1) + 'K'}
            accent="text-amber-400"
          />
          <StatCard
            label="Win Rate"
            value={data.stats.successRate.toFixed(1) + '%'}
            accent="text-blue-400"
          />
        </div>

        {/* new order button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-700 hover:bg-violet-600 active:scale-[0.98] text-white font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-violet-900/40"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Order
          </button>
        </div>

        {/* tabs */}
        <div className="px-4 pb-3">
          <div className="flex rounded-xl overflow-hidden border border-gray-800/60 bg-gray-900/40">
            {(['open', 'history'] as const).map((t) => {
              const labels: Record<typeof t, string> = { open: 'Open', history: 'History' };
              const counts: Record<typeof t, number> = {
                open: visibleOpen.length,
                history: data.orderHistory.length,
              };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={clsx(
                    'flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                    tab === t
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:text-gray-300',
                  )}
                >
                  {labels[t]}
                  <span
                    className={clsx(
                      'text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none',
                      tab === t ? 'bg-violet-700 text-white' : 'bg-gray-800 text-gray-500',
                    )}
                  >
                    {counts[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* order lists */}
        <div className="px-4 space-y-3">
          {tab === 'open' ? (
            visibleOpen.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/60 flex items-center justify-center">
                  <BarChart2 className="text-gray-600" size={26} />
                </div>
                <p className="text-gray-400 font-medium">No open orders</p>
                <p className="text-gray-600 text-sm">
                  Tap &ldquo;New Order&rdquo; to place your first limit order
                </p>
              </div>
            ) : (
              visibleOpen.map((order) => (
                <OpenOrderCard key={order.id} order={order} onCancel={handleCancel} />
              ))
            )
          ) : data.orderHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-800/60 flex items-center justify-center">
                <Clock className="text-gray-600" size={26} />
              </div>
              <p className="text-gray-400 font-medium">No order history</p>
            </div>
          ) : (
            data.orderHistory.map((order) => (
              <HistoryOrderCard key={order.id} order={order} />
            ))
          )}
        </div>

        {/* legend */}
        <div className="px-4 pt-6">
          <div className="bg-gray-900/40 border border-gray-800/40 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
              Order Types
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['limit', 'Executes at your set price or better'],
                  ['stop_loss', 'Sells when price drops to trigger'],
                  ['take_profit', 'Sells when price reaches target'],
                  ['trailing_stop', 'Adjusts stop price with market'],
                ] as [OrderType, string][]
              ).map(([type, desc]) => {
                const badge = orderTypeBadge(type);
                const Icon = badge.Icon;
                return (
                  <div key={type} className="flex items-start gap-2">
                    <div
                      className={clsx(
                        'shrink-0 w-5 h-5 rounded-md flex items-center justify-center border mt-0.5',
                        badge.cls,
                      )}
                    >
                      <Icon size={10} />
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs font-medium">{badge.label}</p>
                      <p className="text-gray-600 text-[10px] leading-tight">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* new order sheet */}
      {sheetOpen && (
        <NewOrderSheet
          onClose={() => setSheetOpen(false)}
          onPlace={handlePlace}
          supportedTokens={data.supportedTokens}
        />
      )}
    </>
  );
}
