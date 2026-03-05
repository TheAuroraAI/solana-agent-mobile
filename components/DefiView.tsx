'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, Percent, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import type { DefiRatesData, DefiProtocol, DefiToken } from '@/app/api/defi/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtApy(n: number): string {
  return `${n.toFixed(2)}%`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Bone({ className }: { className?: string }) {
  return <div className={clsx('bg-gray-800/60 animate-pulse rounded-xl', className)} />;
}

function DefiSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Bone className="h-14 w-full" />
      <div className="grid grid-cols-3 gap-2">
        <Bone className="h-20" />
        <Bone className="h-20" />
        <Bone className="h-20" />
      </div>
      <Bone className="h-10 w-full" />
      {[0, 1, 2].map((i) => (
        <Bone key={i} className="h-28" />
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}

function StatCard({ label, value, sub, icon, iconBg, valueColor }: StatCardProps) {
  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-3 flex flex-col gap-1.5">
      <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', iconBg)}>
        {icon}
      </div>
      <p className={clsx('text-base font-bold font-mono leading-tight', valueColor ?? 'text-white')}>
        {value}
      </p>
      {sub && <p className="text-gray-500 text-[10px] leading-tight">{sub}</p>}
      <p className="text-gray-600 text-[10px] uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

type TabMode = 'supply' | 'borrow';

function TabBar({ active, onChange }: { active: TabMode; onChange: (t: TabMode) => void }) {
  return (
    <div className="flex gap-1 bg-gray-800/70 rounded-xl p-1">
      {(['supply', 'borrow'] as TabMode[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={clsx(
            'flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all',
            active === tab
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200',
          )}
        >
          {tab === 'supply' ? 'Supply APY' : 'Borrow APY'}
        </button>
      ))}
    </div>
  );
}

// ─── Utilization Bar ──────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-violet-500/60 transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// ─── Token Row ────────────────────────────────────────────────────────────────

interface TokenRowProps {
  token: DefiToken;
  mode: TabMode;
  isTopSupply: boolean;
  isTopBorrow: boolean;
}

function TokenRow({ token, mode, isTopSupply, isTopBorrow }: TokenRowProps) {
  const highlight = mode === 'supply' ? isTopSupply : isTopBorrow;

  return (
    <div
      className={clsx(
        'flex items-center gap-2 py-2.5 border-b border-gray-800/40 last:border-0',
        highlight && 'bg-violet-500/5 -mx-2 px-2 rounded-xl',
      )}
    >
      {/* Symbol + liquidity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-white text-xs font-semibold">{token.symbol}</span>
          {highlight && (
            <Trophy className="w-3 h-3 text-amber-400 shrink-0" aria-label="Top rate" />
          )}
        </div>
        <p className="text-gray-600 text-[10px] mt-0.5">{token.liquidity} liquidity</p>
      </div>

      {/* Utilization */}
      <div className="w-16 shrink-0">
        <p className="text-gray-500 text-[10px] text-right mb-1">{token.utilization}% util</p>
        <UtilBar pct={token.utilization} />
      </div>

      {/* APY pair */}
      <div className="shrink-0 text-right w-20">
        <p
          className={clsx(
            'text-xs font-bold font-mono',
            mode === 'supply' ? 'text-emerald-400' : 'text-gray-500',
          )}
        >
          {fmtApy(token.supplyApy)}
        </p>
        <p
          className={clsx(
            'text-[10px] font-semibold font-mono',
            mode === 'borrow' ? 'text-amber-400' : 'text-gray-600',
          )}
        >
          {fmtApy(token.borrowApy)}
        </p>
      </div>
    </div>
  );
}

// ─── Protocol Accordion ───────────────────────────────────────────────────────

interface ProtocolBadgeProps {
  type: DefiProtocol['type'];
}

function TypeBadge({ type }: ProtocolBadgeProps) {
  const styles: Record<DefiProtocol['type'], string> = {
    lending: 'bg-blue-500/15 text-blue-400',
    yield:   'bg-emerald-500/15 text-emerald-400',
    perps:   'bg-violet-500/15 text-violet-400',
  };
  return (
    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', styles[type])}>
      {type}
    </span>
  );
}

interface ProtocolAccordionProps {
  protocol: DefiProtocol;
  mode: TabMode;
  bestSupplyKey: string;   // "SOL@Kamino"
  bestBorrowKey: string;   // "SOL@Drift"
  defaultOpen: boolean;
}

function ProtocolAccordion({
  protocol,
  mode,
  bestSupplyKey,
  bestBorrowKey,
  defaultOpen,
}: ProtocolAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Sort tokens by active mode APY (best first for supply, lowest first for borrow)
  const sorted = [...protocol.tokens].sort((a, b) =>
    mode === 'supply' ? b.supplyApy - a.supplyApy : a.borrowApy - b.borrowApy,
  );

  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-800/30 transition-colors"
        aria-expanded={open}
      >
        <span className="text-2xl leading-none" aria-hidden="true">{protocol.logo}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-sm font-semibold">{protocol.name}</span>
            <TypeBadge type={protocol.type} />
          </div>
          <p className="text-gray-500 text-xs mt-0.5">TVL {protocol.tvl}</p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
        }
      </button>

      {/* Token table */}
      {open && (
        <div className="px-4 pb-3">
          {/* Column headers */}
          <div className="flex items-center gap-2 pb-1.5 mb-0.5 border-b border-gray-800/40">
            <span className="flex-1 text-gray-600 text-[10px] uppercase tracking-wider">Token</span>
            <span className="w-16 text-right text-gray-600 text-[10px] uppercase tracking-wider">Util</span>
            <div className="w-20 text-right">
              <span className="text-emerald-700 text-[10px] uppercase tracking-wider">Supply</span>
              {' / '}
              <span className="text-amber-700 text-[10px] uppercase tracking-wider">Borrow</span>
            </div>
          </div>

          {sorted.map((token) => {
            const key = `${token.symbol}@${protocol.name}`;
            return (
              <TokenRow
                key={token.symbol}
                token={token}
                mode={mode}
                isTopSupply={key === bestSupplyKey}
                isTopBorrow={key === bestBorrowKey}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Empty / Error State ──────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
      <p className="text-red-400 text-sm font-medium">Failed to load rates</p>
      <p className="text-red-500/60 text-xs mt-1">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-4 mt-4 bg-gray-900/60 border border-gray-800/50 rounded-2xl p-8 text-center">
      <p className="text-gray-500 text-sm">No protocols found</p>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function DefiView() {
  const [data, setData] = useState<DefiRatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TabMode>('supply');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch('/api/defi', { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DefiRatesData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load DeFi rates');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Pre-compute best-rate keys for trophy highlighting
  const bestSupplyKey = data
    ? `${data.bestSupply.symbol}@${data.bestSupply.protocol}`
    : '';
  const bestBorrowKey = data
    ? `${data.bestBorrow.symbol}@${data.bestBorrow.protocol}`
    : '';

  // Sort protocols so the one with the overall best active-mode rate appears first
  const sortedProtocols = data
    ? [...data.protocols].sort((a, b) => {
        if (mode === 'supply') {
          const maxA = Math.max(...a.tokens.map((t) => t.supplyApy));
          const maxB = Math.max(...b.tokens.map((t) => t.supplyApy));
          return maxB - maxA;
        } else {
          const minA = Math.min(...a.tokens.map((t) => t.borrowApy));
          const minB = Math.min(...b.tokens.map((t) => t.borrowApy));
          return minA - minB;
        }
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-xl font-bold leading-tight">DeFi Rates</h1>
          <p className="text-gray-500 text-xs mt-0.5">Best rates across Solana protocols</p>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !data && <DefiSkeleton />}

      {/* Error state */}
      {error && <ErrorState message={error} />}

      {/* Main content */}
      {data && (
        <div className="px-4 pb-8 space-y-4">

          {/* Stat Cards — 3 columns */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              label="Total TVL"
              value={data.totalTvl}
              icon={<DollarSign className="w-3.5 h-3.5 text-violet-400" />}
              iconBg="bg-violet-500/15"
            />
            <StatCard
              label="Best Supply"
              value={fmtApy(data.bestSupply.apy)}
              sub={`${data.bestSupply.symbol} · ${data.bestSupply.protocol}`}
              icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
              iconBg="bg-emerald-500/15"
              valueColor="text-emerald-400"
            />
            <StatCard
              label="Low Borrow"
              value={fmtApy(data.bestBorrow.apy)}
              sub={`${data.bestBorrow.symbol} · ${data.bestBorrow.protocol}`}
              icon={<Percent className="w-3.5 h-3.5 text-blue-400" />}
              iconBg="bg-blue-500/15"
              valueColor="text-blue-400"
            />
          </div>

          {/* Tab Bar */}
          <TabBar active={mode} onChange={setMode} />

          {/* Protocol Accordions */}
          {sortedProtocols.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {sortedProtocols.map((protocol, idx) => (
                <ProtocolAccordion
                  key={protocol.id}
                  protocol={protocol}
                  mode={mode}
                  bestSupplyKey={bestSupplyKey}
                  bestBorrowKey={bestBorrowKey}
                  defaultOpen={idx === 0}
                />
              ))}
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-gray-700 text-[10px]">
            Rates updated{' '}
            {new Date(data.lastUpdated).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' '}· Simulated data for demonstration
          </p>
        </div>
      )}
    </div>
  );
}
