'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Bell, BellPlus, BellOff, Plus, Trash2,
  ChevronDown, ChevronUp, DollarSign, TrendingUp, TrendingDown,
  BarChart3, Fuel, Activity, Zap, Check, X, AlertTriangle, Clock,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Alert } from '@/app/api/alerts/route';

/* ------------------------------------------------------------------ */
/* Alert type configuration                                           */
/* ------------------------------------------------------------------ */

type AlertType = Alert['type'];

const ALERT_TYPE_CONFIG: Record<AlertType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}> = {
  price_above:  { label: 'Price Above',  icon: DollarSign,  color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  price_below:  { label: 'Price Below',  icon: TrendingDown, color: 'text-red-400',     bg: 'bg-red-500/20' },
  whale_move:   { label: 'Whale Move',   icon: Activity,    color: 'text-blue-400',    bg: 'bg-blue-500/20' },
  volume_spike: { label: 'Volume Spike', icon: BarChart3,   color: 'text-orange-400',  bg: 'bg-orange-500/20' },
  pnl_target:   { label: 'PnL Target',   icon: TrendingUp,  color: 'text-violet-400',  bg: 'bg-violet-500/20' },
  gas_spike:    { label: 'Gas Spike',    icon: Fuel,        color: 'text-yellow-400',  bg: 'bg-yellow-500/20' },
};

const ALERT_TYPES = Object.keys(ALERT_TYPE_CONFIG) as AlertType[];

const TOKENS = [
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'JUP', name: 'Jupiter' },
  { symbol: 'BONK', name: 'Bonk' },
  { symbol: 'WIF', name: 'dogwifhat' },
  { symbol: 'PYTH', name: 'Pyth' },
  { symbol: 'RAY', name: 'Raydium' },
];

/* ------------------------------------------------------------------ */
/* Toggle component (custom, no HTML checkbox)                        */
/* ------------------------------------------------------------------ */

function Toggle({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
        checked ? 'bg-violet-600' : 'bg-gray-700',
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Progress bar helper                                                */
/* ------------------------------------------------------------------ */

function ProgressBar({ current, threshold, type }: {
  current: number;
  threshold: number;
  type: AlertType;
}) {
  const pct = threshold > 0 ? Math.min((current / threshold) * 100, 100) : 0;
  const isClose = pct >= 80;
  const cfg = ALERT_TYPE_CONFIG[type];

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-gray-500">Current: {formatValue(current, type)}</span>
        <span className="text-gray-500">Target: {formatValue(threshold, type)}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            isClose ? 'bg-yellow-400' : cfg.color.replace('text-', 'bg-'),
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function formatValue(v: number, type: AlertType): string {
  if (type === 'whale_move') {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toLocaleString()}`;
  }
  if (type === 'volume_spike') {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  }
  if (type === 'pnl_target') return `${v.toFixed(1)}%`;
  if (type === 'gas_spike') return `${v.toFixed(4)} SOL`;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function AlertsSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 pt-16">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-16 bg-gray-800/50 rounded-xl" />
        ))}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-800/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-32" />
              <div className="h-3 bg-gray-700 rounded w-48" />
            </div>
            <div className="h-6 w-11 bg-gray-700 rounded-full" />
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alert Card                                                         */
/* ------------------------------------------------------------------ */

function AlertCard({ alert, onToggle, onDelete }: {
  alert: Alert;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = ALERT_TYPE_CONFIG[alert.type];
  const Icon = cfg.icon;

  return (
    <div
      className={clsx(
        'bg-gray-900 rounded-2xl p-4 border transition-all',
        alert.triggered
          ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
          : 'border-gray-800',
        !alert.enabled && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
          <Icon className={clsx('w-5 h-5', cfg.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
            <span className="text-white text-sm font-bold">{alert.tokenSymbol}</span>
          </div>

          <p className="text-gray-300 text-sm mt-1 font-mono">{alert.condition}</p>

          <ProgressBar
            current={alert.currentValue}
            threshold={alert.threshold}
            type={alert.type}
          />

          {/* Triggered badge */}
          {alert.triggered && alert.triggeredAt && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" />
                Triggered
              </div>
              <span className="text-gray-500 text-[10px]">{timeAgo(alert.triggeredAt)}</span>
            </div>
          )}

          {/* Notify via badge */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-600 text-[10px]">
              via {alert.notifyVia === 'both' ? 'push + sms' : alert.notifyVia}
            </span>
          </div>
        </div>

        {/* Right side: toggle + delete */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <Toggle
            checked={alert.enabled}
            onChange={(v) => onToggle(alert.id, v)}
            label={`Toggle ${alert.tokenSymbol} alert`}
          />
          <button
            onClick={() => onDelete(alert.id)}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 active:text-red-400 transition-colors"
            aria-label="Delete alert"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New Alert Bottom Sheet                                             */
/* ------------------------------------------------------------------ */

function NewAlertSheet({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: {
    type: AlertType;
    tokenSymbol: string;
    tokenName: string;
    condition: 'above' | 'below';
    threshold: number;
    notifyVia: 'push' | 'sms' | 'both';
  }) => void;
}) {
  const [type, setType] = useState<AlertType>('price_above');
  const [token, setToken] = useState(TOKENS[0]);
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [notifyVia, setNotifyVia] = useState<'push' | 'sms' | 'both'>('push');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    const value = parseFloat(threshold);
    if (isNaN(value) || value <= 0) {
      setError('Enter a valid threshold above 0');
      return;
    }
    onSubmit({
      type,
      tokenSymbol: token.symbol,
      tokenName: token.name,
      condition,
      threshold: value,
      notifyVia,
    });
  };

  const needsToken = ['price_above', 'price_below', 'volume_spike', 'whale_move'].includes(type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gray-900 rounded-t-3xl border-t border-gray-700/50 p-6 pb-10 animate-[fadeUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">New Alert</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert type selector */}
        <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-2">Alert Type</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {ALERT_TYPES.map((t) => {
            const cfg = ALERT_TYPE_CONFIG[t];
            return (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  if (t === 'price_above') setCondition('above');
                  if (t === 'price_below') setCondition('below');
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  type === t
                    ? `${cfg.bg} ${cfg.color} ring-1 ring-current`
                    : 'bg-gray-800 text-gray-400',
                )}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Token selector (for applicable types) */}
        {needsToken && (
          <>
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-2">Token</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {TOKENS.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => setToken(t)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    token.symbol === t.symbol
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-800 text-gray-400',
                  )}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Condition: above/below */}
        {(type === 'price_above' || type === 'price_below') && (
          <>
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-2">Condition</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-4">
              <button
                onClick={() => setCondition('above')}
                className={clsx(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  condition === 'above'
                    ? 'bg-emerald-600/30 text-emerald-400'
                    : 'bg-gray-800 text-gray-500',
                )}
              >
                Above
              </button>
              <button
                onClick={() => setCondition('below')}
                className={clsx(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  condition === 'below'
                    ? 'bg-red-600/30 text-red-400'
                    : 'bg-gray-800 text-gray-500',
                )}
              >
                Below
              </button>
            </div>
          </>
        )}

        {/* Threshold input */}
        <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-2">Threshold</p>
        <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 mb-4">
          <input
            type="number"
            min="0"
            step="any"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={
              type === 'pnl_target' ? '25 (%)' :
              type === 'gas_spike' ? '0.005 (SOL)' :
              '0.00'
            }
            className="flex-1 bg-transparent text-lg font-bold text-white outline-none placeholder-gray-600"
          />
          <span className="text-gray-400 text-sm">
            {type === 'pnl_target' ? '%' : type === 'gas_spike' ? 'SOL' : 'USD'}
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Notification method */}
        <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-2">Notify Via</p>
        <div className="flex gap-2 mb-6">
          {(['push', 'sms', 'both'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setNotifyVia(m)}
              className={clsx(
                'flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-colors',
                notifyVia === m
                  ? 'bg-violet-500 text-white'
                  : 'bg-gray-800 text-gray-400',
              )}
            >
              {m === 'both' ? 'Push + SMS' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!threshold || isNaN(parseFloat(threshold)) || parseFloat(threshold) <= 0}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          Create Alert
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main AlertsView component                                          */
/* ------------------------------------------------------------------ */

export function AlertsView() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setError(null);
    } catch {
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleToggle = useCallback((id: string, enabled: boolean) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled } : a)),
    );
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
    } catch {
      // Optimistic update; ignore network errors
    }
  }, []);

  const handleCreateAlert = useCallback(async (data: {
    type: AlertType;
    tokenSymbol: string;
    tokenName: string;
    condition: 'above' | 'below';
    threshold: number;
    notifyVia: 'push' | 'sms' | 'both';
  }) => {
    const conditionText = data.type === 'pnl_target'
      ? `${data.tokenSymbol} PnL > +${data.threshold}%`
      : data.type === 'gas_spike'
      ? `Priority fee > ${data.threshold} SOL`
      : data.type === 'whale_move'
      ? `Whale transfer > $${data.threshold.toLocaleString()} ${data.tokenSymbol}`
      : data.type === 'volume_spike'
      ? `${data.tokenSymbol} 1h volume > $${data.threshold.toLocaleString()}`
      : `${data.tokenSymbol} ${data.condition === 'above' ? '>' : '<'} $${data.threshold.toFixed(2)}`;

    const alertType: AlertType = data.type === 'price_above' || data.type === 'price_below'
      ? (data.condition === 'above' ? 'price_above' : 'price_below')
      : data.type;

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: alertType,
          tokenSymbol: data.tokenSymbol,
          tokenName: data.tokenName,
          condition: conditionText,
          threshold: data.threshold,
          notifyVia: data.notifyVia,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();

      if (result.alert) {
        setAlerts((prev) => [result.alert, ...prev]);
      }
    } catch {
      // Fallback: add locally
      const localAlert: Alert = {
        id: `alert-${Date.now().toString(36)}`,
        type: alertType,
        tokenSymbol: data.tokenSymbol,
        tokenName: data.tokenName,
        condition: conditionText,
        threshold: data.threshold,
        currentValue: 0,
        enabled: true,
        triggered: false,
        triggeredAt: null,
        createdAt: new Date().toISOString(),
        notifyVia: data.notifyVia,
      };
      setAlerts((prev) => [localAlert, ...prev]);
    }

    setShowNewAlert(false);
  }, []);

  // Derived stats
  const totalAlerts = alerts.length;
  const activeAlerts = alerts.filter((a) => a.enabled && !a.triggered).length;
  const triggeredToday = alerts.filter((a) => {
    if (!a.triggered || !a.triggeredAt) return false;
    const trigDate = new Date(a.triggeredAt);
    const today = new Date();
    return trigDate.toDateString() === today.toDateString();
  }).length;

  const activeList = alerts.filter((a) => !a.triggered);
  const triggeredList = alerts.filter((a) => a.triggered);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AlertsSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="safe-top px-4 pt-6 pb-28 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Alerts</h1>
              <p className="text-gray-500 text-xs mt-0.5">Manage your price and event alerts</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewAlert(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <BellPlus className="w-4 h-4" />
            New Alert
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
            <p className="text-white text-base font-bold">{totalAlerts}</p>
            <p className="text-gray-500 text-xs mt-0.5">Total</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
            <p className="text-violet-400 text-base font-bold">{activeAlerts}</p>
            <p className="text-gray-500 text-xs mt-0.5">Active</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
            <p className="text-emerald-400 text-base font-bold">{triggeredToday}</p>
            <p className="text-gray-500 text-xs mt-0.5">Triggered today</p>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 text-sm font-medium">{error}</p>
              <button
                onClick={() => { setLoading(true); fetchAlerts(); }}
                className="text-red-300 text-xs mt-1 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {alerts.length === 0 && !error && (
          <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
            <BellOff className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No alerts yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Tap &quot;New Alert&quot; to create your first price or event alert.
            </p>
          </div>
        )}

        {/* Active alerts */}
        {activeList.length > 0 && (
          <div className="space-y-3 mb-6">
            <p className="text-gray-500 text-xs uppercase font-medium tracking-wider px-1">
              Active Alerts
            </p>
            {activeList.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Triggered alerts (history section) */}
        {triggeredList.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 w-full px-1 py-2 mb-2"
            >
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 text-xs uppercase font-medium tracking-wider flex-1 text-left">
                Triggered ({triggeredList.length})
              </span>
              {showHistory
                ? <ChevronUp className="w-4 h-4 text-gray-500" />
                : <ChevronDown className="w-4 h-4 text-gray-500" />
              }
            </button>

            {showHistory && (
              <div className="space-y-3">
                {triggeredList.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Alert Bottom Sheet */}
      {showNewAlert && (
        <NewAlertSheet
          onClose={() => setShowNewAlert(false)}
          onSubmit={handleCreateAlert}
        />
      )}
    </div>
  );
}
