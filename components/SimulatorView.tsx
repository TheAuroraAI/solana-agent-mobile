'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Sparkles,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import type {
  SimulatorData,
  ScenarioToken,
  SimulatorScenario,
} from '@/app/api/simulator/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `${n < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000).toFixed(2)}K`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPrice(n: number): string {
  if (n < 0.001) return `$${n.toFixed(8)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number, alwaysSign = true): string {
  const sign = alwaysSign && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function gainColor(n: number): string {
  return n > 0 ? 'text-emerald-400' : n < 0 ? 'text-red-400' : 'text-gray-400';
}

function gainBg(n: number): string {
  return n > 0
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : n < 0
    ? 'bg-red-500/10 border-red-500/20'
    : 'bg-gray-800/40 border-gray-700/30';
}

// Clamp slider value to its valid range
const SLIDER_MIN = -90;
const SLIDER_MAX = 500;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Build a conic-gradient string from allocation percentages
function buildConicGradient(segments: { pct: number; color: string }[]): string {
  let cursor = 0;
  const stops: string[] = [];
  for (const seg of segments) {
    const end = cursor + seg.pct;
    stops.push(`${seg.color} ${cursor.toFixed(1)}% ${end.toFixed(1)}%`);
    cursor = end;
  }
  return `conic-gradient(${stops.join(', ')})`;
}

const TOKEN_COLORS: Record<string, string> = {
  SOL: '#8b5cf6',
  USDC: '#3b82f6',
  JUP: '#f59e0b',
  BONK: '#f97316',
  WIF: '#ec4899',
  RAY: '#06b6d4',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="px-4 pt-6 pb-4 animate-pulse">
      <div className="h-7 w-48 bg-gray-800 rounded mb-2" />
      <div className="h-4 w-24 bg-gray-800/60 rounded mb-8" />
      <div className="h-28 bg-gray-800/40 rounded-2xl mb-4" />
      <div className="flex gap-2 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 flex-1 bg-gray-800/40 rounded-full" />
        ))}
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-gray-800/40 rounded-2xl mb-3" />
      ))}
    </div>
  );
}

// Slider track with a violet fill from 0 to value
function TokenSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  // Map value in [SLIDER_MIN, SLIDER_MAX] to a 0-100 percentage for the fill
  const range = SLIDER_MAX - SLIDER_MIN;
  const zeroFraction = (0 - SLIDER_MIN) / range; // where "0" sits on the track
  const valueFraction = (value - SLIDER_MIN) / range;

  const leftFill = Math.min(zeroFraction, valueFraction) * 100;
  const fillWidth = Math.abs(valueFraction - zeroFraction) * 100;
  const fillColor = value >= 0 ? '#10b981' : '#f87171'; // emerald / red

  return (
    <div className="relative w-full h-8 flex items-center">
      {/* Track background */}
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-700/60" />
      {/* Colored fill */}
      <div
        className="absolute h-1.5 rounded-full transition-all duration-75"
        style={{
          left: `${leftFill}%`,
          width: `${fillWidth}%`,
          backgroundColor: fillColor,
        }}
      />
      {/* Zero tick mark */}
      <div
        className="absolute w-0.5 h-3 bg-gray-500 rounded-full -translate-x-1/2"
        style={{ left: `${zeroFraction * 100}%` }}
      />
      <input
        type="range"
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        style={{ zIndex: 10 }}
      />
    </div>
  );
}

function TokenCard({
  token,
  portfolioValue,
  change,
  onChangeUpdate,
}: {
  token: ScenarioToken;
  portfolioValue: number;
  change: number;
  onChangeUpdate: (symbol: string, v: number) => void;
}) {
  const tokenUsdValue = (portfolioValue * token.currentAllocation) / 100;
  const projectedPrice = token.currentPrice * (1 + change / 100);
  const projectedUsd = tokenUsdValue * (1 + change / 100);
  const dollarDelta = projectedUsd - tokenUsdValue;

  return (
    <div
      className={clsx(
        'rounded-2xl border p-4 mb-3 transition-all duration-200',
        gainBg(change),
      )}
    >
      {/* Row 1: Logo / name / allocation + projected delta */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{token.logo}</span>
          <div>
            <p className="font-semibold text-white text-sm">{token.symbol}</p>
            <p className="text-xs text-gray-400">{token.currentAllocation}% of portfolio</p>
          </div>
        </div>
        <div className="text-right">
          <p className={clsx('text-sm font-bold', gainColor(change))}>
            {change === 0 ? '—' : fmtPct(change)}
          </p>
          <p className={clsx('text-xs', gainColor(dollarDelta))}>
            {dollarDelta === 0 ? '' : (dollarDelta > 0 ? '+' : '') + fmt$(dollarDelta)}
          </p>
        </div>
      </div>

      {/* Slider */}
      <TokenSlider
        value={change}
        onChange={(v) => onChangeUpdate(token.symbol, v)}
      />

      {/* Row 3: Price info */}
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>
          Now:{' '}
          <span className="text-gray-200 font-medium">
            {fmtPrice(token.currentPrice)}
          </span>
        </span>
        <span>
          Projected:{' '}
          <span
            className={clsx(
              'font-medium',
              change !== 0 ? gainColor(change) : 'text-gray-200',
            )}
          >
            {fmtPrice(projectedPrice)}
          </span>
        </span>
        <span>
          Value:{' '}
          <span className="text-gray-200 font-medium">
            {fmt$(tokenUsdValue)}
          </span>
        </span>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function SimulatorView() {
  const router = useRouter();
  const [data, setData] = useState<SimulatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Map of symbol → projected change (slider value)
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/simulator', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SimulatorData = await res.json();
      setData(json);
      // Initialise all changes to 0 on first load
      if (!showRefresh) {
        const init: Record<string, number> = {};
        for (const t of json.tokens) init[t.symbol] = 0;
        setChanges(init);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load simulator data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const handleSliderChange = useCallback((symbol: string, v: number) => {
    setChanges((prev) => ({ ...prev, [symbol]: clamp(v, SLIDER_MIN, SLIDER_MAX) }));
    setActiveScenarioId(null); // deselect preset when manual adjustment made
  }, []);

  const applyScenario = useCallback(
    (scenario: SimulatorScenario) => {
      if (!data) return;
      const next: Record<string, number> = {};
      for (const t of data.tokens) {
        next[t.symbol] = clamp(scenario.changes[t.symbol] ?? 0, SLIDER_MIN, SLIDER_MAX);
      }
      setChanges(next);
      setActiveScenarioId(scenario.id);
    },
    [data],
  );

  const resetAll = useCallback(() => {
    if (!data) return;
    const init: Record<string, number> = {};
    for (const t of data.tokens) init[t.symbol] = 0;
    setChanges(init);
    setActiveScenarioId(null);
  }, [data]);

  // ── Derived calculations ──────────────────────────────────────────────────

  const { projectedValue, netDelta, netDeltaPct, tokenResults } = useMemo(() => {
    if (!data)
      return { projectedValue: 0, netDelta: 0, netDeltaPct: 0, tokenResults: [] };

    let projected = 0;
    const results = data.tokens.map((t) => {
      const alloc = (data.currentPortfolioValue * t.currentAllocation) / 100;
      const change = changes[t.symbol] ?? 0;
      const newValue = alloc * (1 + change / 100);
      projected += newValue;
      return { symbol: t.symbol, logo: t.logo, delta: newValue - alloc, pct: change };
    });

    const delta = projected - data.currentPortfolioValue;
    const deltaPct =
      data.currentPortfolioValue > 0 ? (delta / data.currentPortfolioValue) * 100 : 0;

    return {
      projectedValue: projected,
      netDelta: delta,
      netDeltaPct: deltaPct,
      tokenResults: results,
    };
  }, [data, changes]);

  const bestToken = useMemo(
    () =>
      tokenResults.length
        ? tokenResults.reduce((a, b) => (a.pct >= b.pct ? a : b))
        : null,
    [tokenResults],
  );

  const worstToken = useMemo(
    () =>
      tokenResults.length
        ? tokenResults.reduce((a, b) => (a.pct <= b.pct ? a : b))
        : null,
    [tokenResults],
  );

  // Stacked bar segments
  const stackedSegments = useMemo(() => {
    if (!data) return [];
    return data.tokens.map((t) => ({
      symbol: t.symbol,
      pct: t.currentAllocation,
      color: TOKEN_COLORS[t.symbol] ?? '#6b7280',
    }));
  }, [data]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="px-4 pt-16 text-center">
        <AlertTriangle className="mx-auto mb-3 text-red-400" size={32} />
        <p className="text-red-400 font-semibold mb-1">Failed to load</p>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <button
          onClick={() => fetchData(false)}
          className="px-6 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const isChanged = netDelta !== 0;

  return (
    <div className="px-4 pt-safe-top pb-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-6 mb-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors -ml-1"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={clsx(refreshing && 'animate-spin')} />
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Simulator</h1>
        <p className="text-gray-500 text-sm mt-0.5">What if...?</p>
      </div>

      {/* ── Portfolio Value Card ────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gray-900/80 border border-gray-800/60 p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Current Portfolio
            </p>
            <p className="text-lg font-semibold text-gray-300">
              {fmt$(data.currentPortfolioValue)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Projected Value
            </p>
            <p
              className={clsx(
                'text-2xl font-bold tracking-tight',
                isChanged ? gainColor(netDelta) : 'text-white',
              )}
            >
              {fmt$(projectedValue)}
            </p>
          </div>
        </div>

        {/* Delta row */}
        <div
          className={clsx(
            'mt-4 pt-3 border-t flex items-center justify-between',
            'border-gray-700/40',
          )}
        >
          <div className="flex items-center gap-2">
            {isChanged ? (
              netDelta > 0 ? (
                <TrendingUp size={16} className="text-emerald-400" />
              ) : (
                <TrendingDown size={16} className="text-red-400" />
              )
            ) : (
              <Sparkles size={16} className="text-gray-500" />
            )}
            <span
              className={clsx(
                'text-sm font-semibold',
                isChanged ? gainColor(netDelta) : 'text-gray-500',
              )}
            >
              {isChanged
                ? `${netDelta > 0 ? '+' : ''}${fmt$(netDelta)}`
                : 'Adjust sliders below'}
            </span>
          </div>
          {isChanged && (
            <span
              className={clsx(
                'text-sm font-bold px-2 py-0.5 rounded-full',
                netDelta > 0
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400',
              )}
            >
              {fmtPct(netDeltaPct)}
            </span>
          )}
        </div>
      </div>

      {/* ── Preset Scenarios ───────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Preset Scenarios
          </p>
          {activeScenarioId && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {data.presetScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => applyScenario(scenario)}
              className={clsx(
                'flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full',
                'border text-sm font-semibold transition-all duration-200',
                activeScenarioId === scenario.id
                  ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/40'
                  : 'bg-gray-800/60 border-gray-700/50 text-gray-300 hover:bg-gray-700/60 hover:text-white',
              )}
            >
              <span className="text-base leading-none">{scenario.icon}</span>
              <span>{scenario.name}</span>
            </button>
          ))}
        </div>
        {activeScenarioId && (
          <p className="text-xs text-gray-500 mt-2 pl-1">
            {data.presetScenarios.find((s) => s.id === activeScenarioId)?.description}
          </p>
        )}
      </div>

      {/* ── Current Allocation Bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gray-900/60 border border-gray-800/40 p-4 mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Current Allocation
        </p>
        <div className="flex h-3 rounded-full overflow-hidden gap-px">
          {stackedSegments.map((seg) => (
            <div
              key={seg.symbol}
              className="h-full transition-all duration-300"
              style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
              title={`${seg.symbol}: ${seg.pct}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
          {stackedSegments.map((seg) => (
            <div key={seg.symbol} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-xs text-gray-400">
                {seg.symbol}{' '}
                <span className="text-gray-200 font-medium">{seg.pct}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Token Sliders ──────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Price Change per Token
          </p>
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <RotateCcw size={11} />
            Reset all
          </button>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Drag sliders from −90% to +500%
        </p>
        {data.tokens.map((token) => (
          <TokenCard
            key={token.symbol}
            token={token}
            portfolioValue={data.currentPortfolioValue}
            change={changes[token.symbol] ?? 0}
            onChangeUpdate={handleSliderChange}
          />
        ))}
      </div>

      {/* ── Impact Summary Card ────────────────────────────────────────────── */}
      {isChanged && (
        <div
          className={clsx(
            'rounded-2xl border p-5 mt-2',
            gainBg(netDelta),
          )}
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Total Impact
          </p>

          {/* Net gain / loss */}
          <div className="text-center mb-5">
            <p className="text-xs text-gray-500 mb-1">Net gain / loss</p>
            <p
              className={clsx(
                'text-4xl font-bold tracking-tight',
                gainColor(netDelta),
              )}
            >
              {netDelta > 0 ? '+' : ''}
              {fmt$(netDelta)}
            </p>
            <p className={clsx('text-sm font-semibold mt-1', gainColor(netDeltaPct))}>
              {fmtPct(netDeltaPct)} on portfolio
            </p>
          </div>

          {/* New portfolio value */}
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm text-gray-400">New portfolio value</span>
            <span className="text-sm font-bold text-white">{fmt$(projectedValue)}</span>
          </div>

          {/* Best / Worst */}
          <div className="grid grid-cols-2 gap-3">
            {bestToken && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy size={12} className="text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-semibold">Best</span>
                </div>
                <p className="text-white font-bold text-sm">{bestToken.symbol}</p>
                <p className="text-emerald-400 text-xs font-semibold">
                  {fmtPct(bestToken.pct)}
                </p>
                <p className="text-emerald-300 text-xs">
                  {bestToken.delta > 0 ? '+' : ''}
                  {fmt$(bestToken.delta)}
                </p>
              </div>
            )}
            {worstToken && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} className="text-red-400" />
                  <span className="text-xs text-red-400 font-semibold">Worst</span>
                </div>
                <p className="text-white font-bold text-sm">{worstToken.symbol}</p>
                <p className="text-red-400 text-xs font-semibold">
                  {fmtPct(worstToken.pct)}
                </p>
                <p className="text-red-300 text-xs">
                  {worstToken.delta > 0 ? '+' : ''}
                  {fmt$(worstToken.delta)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
