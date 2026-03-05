'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldOff,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Zap,
  Eye,
  TrendingUp,
  Lock,
  Info,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { MevData, MevAttack, MevRiskMetric, RiskLevel } from '@/app/api/mev/route';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatLiquidity(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function riskColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/30';
    case 'high':     return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    case 'medium':   return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'low':      return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'safe':     return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
  }
}

function attackTypeColor(type: MevAttack['type']): string {
  switch (type) {
    case 'sandwich':    return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'frontrun':    return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    case 'backrun':     return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'liquidation': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
    case 'arbitrage':   return 'text-violet-400 bg-violet-400/10 border-violet-400/20';
  }
}

function intensityZone(value: number): { label: string; color: string; textColor: string } {
  if (value <= 30) return { label: 'Safe',     color: 'bg-emerald-500', textColor: 'text-emerald-400' };
  if (value <= 60) return { label: 'Moderate', color: 'bg-yellow-500',  textColor: 'text-yellow-400'  };
  if (value <= 80) return { label: 'High',     color: 'bg-orange-500',  textColor: 'text-orange-400'  };
  return              { label: 'Critical',  color: 'bg-red-500',     textColor: 'text-red-400'     };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none',
        enabled ? 'bg-emerald-500' : 'bg-gray-600',
      )}
      aria-label="Toggle MEV protection"
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-300',
          enabled ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

type ProtectionMode = 'smart' | 'jito' | 'bloxroute' | 'off';

const MODES: { id: ProtectionMode; label: string; desc: string }[] = [
  {
    id: 'smart',
    label: 'Smart',
    desc: 'Automatically picks the best route for each trade — lowest cost, highest protection.',
  },
  {
    id: 'jito',
    label: 'Jito',
    desc: 'Routes all transactions via Jito block engine. Bundles prevent sandwich attacks.',
  },
  {
    id: 'bloxroute',
    label: 'bloXroute',
    desc: 'Uses bloXroute\'s protected mempool. Best for large trades and low-latency needs.',
  },
];

function ProtectionCard({
  enabled,
  mode,
  onToggle,
  onModeChange,
}: {
  enabled: boolean;
  mode: ProtectionMode;
  onToggle: () => void;
  onModeChange: (m: ProtectionMode) => void;
}) {
  const ShieldIcon = enabled ? ShieldCheck : ShieldOff;
  const activeMode = MODES.find(m => m.id === mode) ?? MODES[0];

  return (
    <div
      className={clsx(
        'rounded-2xl p-4 border transition-colors',
        enabled
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-gray-800/60 border-gray-700/50',
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
              enabled ? 'bg-emerald-500/20' : 'bg-gray-700/60',
            )}
          >
            <ShieldIcon
              className={clsx(
                'w-6 h-6 transition-colors',
                enabled ? 'text-emerald-400' : 'text-gray-500',
              )}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-white">MEV Protection</p>
            <p className={clsx('text-xs font-semibold', enabled ? 'text-emerald-400' : 'text-gray-500')}>
              {enabled ? 'Active' : 'Off'}
            </p>
          </div>
        </div>
        <ToggleSwitch enabled={enabled} onToggle={onToggle} />
      </div>

      {/* Mode selector */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium mb-1">Protection Mode</p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              disabled={!enabled}
              className={clsx(
                'py-2 rounded-xl text-xs font-semibold transition-colors',
                mode === m.id && enabled
                  ? 'bg-emerald-500 text-white'
                  : enabled
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {enabled && (
          <p className="text-[11px] text-gray-500 leading-relaxed pt-1">
            {activeMode.desc}
          </p>
        )}
      </div>
    </div>
  );
}

function IntensityGauge({ value }: { value: number }) {
  const zone = intensityZone(value);
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-300">Network MEV Intensity</p>
        <span className={clsx('text-xs font-bold', zone.textColor)}>
          {zone.label}
        </span>
      </div>

      {/* Gradient bar */}
      <div className="relative h-3 rounded-full bg-gray-700 overflow-hidden mb-1">
        {/* Gradient background */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(to right, #10b981 0%, #10b981 30%, #eab308 30%, #eab308 60%, #f97316 60%, #f97316 80%, #ef4444 80%, #ef4444 100%)',
          }}
        />
        {/* Dark mask from right */}
        <div
          className="absolute top-0 right-0 bottom-0 bg-gray-700/80 rounded-r-full transition-all duration-700"
          style={{ width: `${100 - pct}%` }}
        />
      </div>

      {/* Zone labels */}
      <div className="flex justify-between text-[9px] text-gray-600 mb-2 px-0.5">
        <span>0</span>
        <span>Safe</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Critical</span>
        <span>100</span>
      </div>

      {/* Needle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={clsx('w-3.5 h-3.5', zone.textColor)} />
          <span className="text-xs text-gray-400">
            Current score: <span className={clsx('font-bold', zone.textColor)}>{value}</span>
          </span>
        </div>
        <span className="text-[10px] text-gray-500">Updated live</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-gray-800/60 rounded-2xl p-3 border border-gray-700/40 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={clsx('w-3.5 h-3.5', color)} />
        <p className="text-[10px] text-gray-500 truncate">{label}</p>
      </div>
      <p className={clsx('text-base font-bold', color)}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize',
        riskColor(level),
      )}
    >
      {level}
    </span>
  );
}

function RouteBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
      {name}
    </span>
  );
}

function TokenRiskTable({ tokens }: { tokens: MevRiskMetric[] }) {
  return (
    <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/50">
        <p className="text-sm font-semibold text-white">Token Risk Matrix</p>
        <p className="text-[10px] text-gray-500 mt-0.5">Sandwich attack exposure by token</p>
      </div>
      <div className="divide-y divide-gray-700/30">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr] px-4 py-2 text-[9px] uppercase tracking-wider text-gray-600">
          <span>Token</span>
          <span className="text-right">Risk</span>
          <span className="text-right">Attacks/hr</span>
          <span className="text-right">Slip%</span>
        </div>
        {tokens.map(token => (
          <div key={token.token} className="px-4 py-3">
            {/* Main row */}
            <div className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr] items-center mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{token.logo}</span>
                <div>
                  <p className="text-xs font-semibold text-white">{token.token}</p>
                  <p className="text-[9px] text-gray-500">{formatLiquidity(token.poolLiquidity)}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <RiskBadge level={token.riskLevel} />
              </div>
              <p
                className={clsx(
                  'text-xs font-semibold text-right',
                  token.sandwichFrequency > 10
                    ? 'text-red-400'
                    : token.sandwichFrequency > 5
                      ? 'text-orange-400'
                      : 'text-gray-300',
                )}
              >
                {token.sandwichFrequency.toFixed(1)}
              </p>
              <p className="text-xs text-gray-400 text-right">
                {token.recommendedSlippage.toFixed(1)}%
              </p>
            </div>
            {/* Protected routes */}
            <div className="flex items-center gap-1 flex-wrap">
              <Lock className="w-2.5 h-2.5 text-gray-600" />
              {token.protectedRoutes.map(r => (
                <RouteBadge key={r} name={r} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttackTypeBadge({ type }: { type: MevAttack['type'] }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider',
        attackTypeColor(type),
      )}
    >
      {type}
    </span>
  );
}

function AttackFeed({ attacks }: { attacks: MevAttack[] }) {
  return (
    <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <p className="text-sm font-semibold text-white">Live Attack Feed</p>
        </div>
        <button className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Attack list */}
      <div className="divide-y divide-gray-700/30">
        {attacks.map(attack => (
          <div key={attack.id} className="px-4 py-3 space-y-1.5">
            {/* Row 1: type badge + pair + time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AttackTypeBadge type={attack.type} />
                <span className="text-xs font-semibold text-white">
                  {attack.tokenIn} → {attack.tokenOut}
                </span>
              </div>
              <span className="text-[10px] text-gray-500">{timeAgo(attack.timestamp)}</span>
            </div>
            {/* Row 2: financials */}
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-gray-500">
                Victim:{' '}
                <span className="text-red-400 font-semibold">
                  -{formatUsd(attack.victimLoss)}
                </span>
              </span>
              <span className="text-gray-500">
                Bot profit:{' '}
                <span className="text-orange-400 font-semibold">
                  +{formatUsd(attack.attackerProfit)}
                </span>
              </span>
              <span className="text-gray-600 ml-auto">
                Slip: {attack.slippageUsed}%
              </span>
            </div>
            {/* Row 3: truncated addresses */}
            <div className="flex items-center gap-3 text-[9px] text-gray-600">
              <span>Victim: {attack.victimTx}</span>
              <span>·</span>
              <span>Attacker: {attack.attackerWallet}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: 'What is MEV?',
    a: 'Maximal Extractable Value (MEV) refers to profit that block producers (validators/miners) or specialized bots can extract by reordering, inserting, or censoring transactions. On Solana, the most common forms are sandwich attacks, front-running, and arbitrage bots.',
  },
  {
    q: 'How does a sandwich attack work?',
    a: 'A bot detects your pending swap and places two transactions: one just before yours (buying the token, driving up its price) and one just after (selling for a profit). You receive fewer tokens than expected and the bot profits from the price movement your trade caused.',
  },
  {
    q: 'Will protection slow down my transactions?',
    a: 'In Smart mode, the overhead is minimal (50-100ms). Jito bundles are processed by the Jito block engine at near-native speed. bloXroute may add slightly more latency but provides stronger guarantees for large trades.',
  },
];

function EducationSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const tips = [
    { icon: '🎯', text: 'Set slippage to the recommended value shown in the Token Risk Matrix — never higher than needed.' },
    { icon: '⏰', text: 'Avoid trading meme tokens during high MEV intensity (score >70). Wait for calmer windows.' },
    { icon: '🔀', text: 'Split large trades into smaller chunks to reduce the incentive for bots to target you.' },
  ];

  return (
    <div className="space-y-3">
      {/* Accordion */}
      <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-semibold text-white">MEV Explained</p>
          </div>
        </div>
        <div className="divide-y divide-gray-700/30">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-xs font-medium text-gray-200">{item.q}</span>
                <ChevronDown
                  className={clsx(
                    'w-4 h-4 text-gray-500 transition-transform shrink-0 ml-2',
                    openIndex === i && 'rotate-180',
                  )}
                />
              </button>
              {openIndex === i && (
                <div className="px-4 pb-3">
                  <p className="text-[11px] text-gray-400 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-4">
        <p className="text-xs font-semibold text-white mb-3">Protection Tips</p>
        <div className="space-y-2.5">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base leading-tight shrink-0">{tip.icon}</span>
              <p className="text-[11px] text-gray-400 leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function MevView() {
  const router = useRouter();
  const [data, setData] = useState<MevData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Local overrides for interactive state
  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const [protectionMode, setProtectionMode] = useState<'smart' | 'jito' | 'bloxroute' | 'off'>('smart');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/mev');
      if (res.ok) {
        const json: MevData = await res.json();
        setData(json);
        // Seed local state from API only on first load
        if (!isRefresh) {
          setProtectionEnabled(json.protectionEnabled);
          setProtectionMode(json.protectionMode === 'off' ? 'smart' : json.protectionMode);
        }
      }
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = () => {
    setProtectionEnabled(prev => !prev);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded-xl w-40" />
        <div className="h-32 bg-gray-800 rounded-2xl" />
        <div className="h-16 bg-gray-800 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-gray-800 rounded-2xl" />
          <div className="h-20 bg-gray-800 rounded-2xl" />
          <div className="h-20 bg-gray-800 rounded-2xl" />
          <div className="h-20 bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const intensity = data?.networkMevIntensity ?? 67;

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-400" />
              MEV Shield
            </h1>
            <p className="text-xs text-gray-400">Sandwich attack protection</p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
          aria-label="Refresh"
        >
          <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* ── Protection Toggle ── */}
      <ProtectionCard
        enabled={protectionEnabled}
        mode={protectionMode}
        onToggle={handleToggle}
        onModeChange={setProtectionMode}
      />

      {/* ── MEV Intensity Gauge ── */}
      <IntensityGauge value={intensity} />

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Attacks Blocked (24h)"
          value={stats ? stats.totalAttacks24h.toLocaleString() : '—'}
          sub="on this network"
          color="text-red-400"
          icon={AlertTriangle}
        />
        <StatCard
          label="Your Savings"
          value={stats ? formatUsd(stats.savedUsd) : '—'}
          sub="protected trades"
          color="text-emerald-400"
          icon={ShieldCheck}
        />
        <StatCard
          label="Network Lost (24h)"
          value={stats ? formatUsd(stats.totalLost24h) : '—'}
          sub="unprotected trades"
          color="text-orange-400"
          icon={TrendingUp}
        />
        <StatCard
          label="Protected Txs"
          value={stats ? stats.protectedTxCount.toLocaleString() : '—'}
          sub="via Jito / bloXroute"
          color="text-violet-400"
          icon={Zap}
        />
      </div>

      {/* ── Token Risk Table ── */}
      {data && <TokenRiskTable tokens={data.riskByToken} />}

      {/* ── Attack Feed ── */}
      {data && <AttackFeed attacks={data.recentAttacks} />}

      {/* ── Education ── */}
      <EducationSection />

      {/* ── Last updated ── */}
      {data && (
        <p className="text-center text-[10px] text-gray-600">
          Last updated {new Date(data.lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
