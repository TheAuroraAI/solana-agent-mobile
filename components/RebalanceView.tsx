'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Scale, ArrowRightLeft, ChevronRight, RefreshCw, Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { getWalletState, getNetwork, DEMO_WALLET_STATE } from '@/lib/solana';

const NETWORK = getNetwork();

interface AllocationSlice {
  key: string;
  label: string;
  color: string;
  target: number; // 0-100
  currentPct: number; // 0-100
  currentUsd: number;
}

interface RebalanceTrade {
  from: string;
  to: string;
  fromAmount: number;
  toEstimate: number;
  protocol: string;
  reason: string;
}

const SLICE_CONFIG: { key: string; label: string; color: string }[] = [
  { key: 'sol', label: 'SOL (liquid)', color: 'bg-violet-500' },
  { key: 'staking', label: 'Liquid Staking', color: 'bg-emerald-500' },
  { key: 'stable', label: 'Stablecoins', color: 'bg-sky-500' },
  { key: 'defi', label: 'DeFi Tokens', color: 'bg-orange-500' },
];

const DEFAULT_TARGETS = { sol: 40, staking: 30, stable: 20, defi: 10 };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function computeCurrentSlices(
  solBalanceUsd: number,
  tokens: { symbol: string; uiAmount: number }[],
  totalUsd: number,
): Record<string, number> {
  const LST_SYMBOLS = ['jitoSOL', 'mSOL', 'bSOL', 'stSOL'];
  const STABLE_SYMBOLS = ['USDC', 'USDT', 'USDH', 'USDR'];

  let stakingUsd = 0;
  let stableUsd = 0;
  let defiUsd = 0;

  for (const t of tokens) {
    const usd = t.uiAmount; // assume uiAmount is USD for simplicity
    if (LST_SYMBOLS.includes(t.symbol)) stakingUsd += usd;
    else if (STABLE_SYMBOLS.includes(t.symbol)) stableUsd += usd;
    else defiUsd += usd;
  }

  if (totalUsd <= 0) return { sol: 100, staking: 0, stable: 0, defi: 0 };
  return {
    sol: Math.round((solBalanceUsd / totalUsd) * 100),
    staking: Math.round((stakingUsd / totalUsd) * 100),
    stable: Math.round((stableUsd / totalUsd) * 100),
    defi: Math.round((defiUsd / totalUsd) * 100),
  };
}

function generateTrades(
  current: Record<string, number>,
  targets: Record<string, number>,
  totalUsd: number,
  solPrice: number,
): RebalanceTrade[] {
  const trades: RebalanceTrade[] = [];
  const threshold = 5; // only trade if diff > 5%

  // Over-weight categories (sell)
  const overweight: { key: string; excess: number }[] = [];
  const underweight: { key: string; deficit: number }[] = [];

  for (const key of Object.keys(targets)) {
    const diff = (current[key] ?? 0) - (targets[key] ?? 0);
    if (diff > threshold) overweight.push({ key, excess: diff });
    else if (diff < -threshold) underweight.push({ key, deficit: -diff });
  }

  // Simple rule: for each underweight category, sell from the most overweight
  for (const under of underweight) {
    const over = overweight[0];
    if (!over) break;

    const tradeUsd = Math.min(
      (under.deficit / 100) * totalUsd,
      (over.excess / 100) * totalUsd,
    );
    const fromSol = tradeUsd / Math.max(solPrice, 1);

    const tradeMap: Record<string, { from: string; to: string; toLabel: string }> = {
      staking: { from: 'SOL', to: 'jitoSOL', toLabel: 'jitoSOL' },
      stable: { from: 'SOL', to: 'USDC', toLabel: 'USDC' },
      defi: { from: 'SOL', to: 'JUP', toLabel: 'JUP' },
      sol: { from: 'jitoSOL', to: 'SOL', toLabel: 'SOL' },
    };

    const mapping = tradeMap[under.key];
    if (!mapping) continue;

    trades.push({
      from: mapping.from,
      to: mapping.to,
      fromAmount: parseFloat(fromSol.toFixed(4)),
      toEstimate: parseFloat(tradeUsd.toFixed(2)),
      protocol: 'Jupiter',
      reason: `Increase ${under.key} from ${current[under.key] ?? 0}% → ${targets[under.key]}%`,
    });

    // Reduce overweight tracking
    over.excess -= under.deficit;
    if (over.excess <= 0) overweight.shift();
  }

  return trades;
}

export function RebalanceView() {
  const { publicKey, connected } = useWallet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDemo = searchParams.get('demo') === 'true';

  const [totalUsd, setTotalUsd] = useState(0);
  const [solPrice, setSolPrice] = useState(140);
  const [currentSlices, setCurrentSlices] = useState<Record<string, number>>({
    sol: 85, staking: 10, stable: 5, defi: 0,
  });
  const [targets, setTargets] = useState<Record<string, number>>(DEFAULT_TARGETS);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      let ws;
      if (isDemo) {
        ws = DEMO_WALLET_STATE;
      } else if (publicKey && connected) {
        ws = await getWalletState(publicKey.toString(), NETWORK);
      } else {
        setLoading(false);
        return;
      }

      const total = ws.solBalanceUsd + ws.tokens.reduce((s, t) => s + t.uiAmount, 0);
      setTotalUsd(total);
      setSolPrice(total > 0 ? ws.solBalanceUsd / Math.max(ws.solBalance, 0.001) : 140);
      setCurrentSlices(computeCurrentSlices(ws.solBalanceUsd, ws.tokens, total));
    } catch { /* keep defaults */ }
    setLoading(false);
  }, [publicKey, connected, isDemo]);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const trades = useMemo(
    () => generateTrades(currentSlices, targets, totalUsd, solPrice),
    [currentSlices, targets, totalUsd, solPrice],
  );

  const totalSum = Object.values(targets).reduce((s, v) => s + v, 0);
  const sumError = Math.abs(totalSum - 100) > 2;

  function applyPreset(name: string) {
    setPreset(name);
    if (name === 'conservative') setTargets({ sol: 30, staking: 40, stable: 25, defi: 5 });
    if (name === 'balanced') setTargets({ sol: 40, staking: 30, stable: 20, defi: 10 });
    if (name === 'growth') setTargets({ sol: 50, staking: 25, stable: 10, defi: 15 });
    if (name === 'yield') setTargets({ sol: 20, staking: 55, stable: 20, defi: 5 });
  }

  function setTarget(key: string, value: number) {
    setPreset(null);
    setTargets((prev) => ({ ...prev, [key]: clamp(value, 0, 100) }));
  }

  function executeRebalance() {
    // Navigate to actions with rebalance intent
    const params = new URLSearchParams();
    if (isDemo) params.set('demo', 'true');
    params.set('rebalance', '1');
    router.push(`/actions?${params.toString()}`);
  }

  return (
    <div className="safe-top px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Scale className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-white font-semibold">Portfolio Rebalance</h1>
          <p className="text-gray-400 text-xs">
            Set target allocations — Aurora generates the exact trades needed
          </p>
        </div>
        <button
          onClick={loadWallet}
          disabled={loading}
          className="w-9 h-9 rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Current vs Target summary */}
      <div className="glass rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white text-sm font-semibold">Current Portfolio</span>
          <span className="text-gray-400 text-xs">${totalUsd > 0 ? totalUsd.toFixed(0) : '–'} total</span>
        </div>

        <div className="space-y-2">
          {SLICE_CONFIG.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-3">
              <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', color)} />
              <span className="text-gray-400 text-xs w-28 flex-shrink-0">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-800">
                <div
                  className={clsx('h-full rounded-full', color)}
                  style={{ width: `${currentSlices[key] ?? 0}%`, transition: 'width 0.3s' }}
                />
              </div>
              <span className="text-gray-300 text-xs w-9 text-right">{currentSlices[key] ?? 0}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Presets */}
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Strategy Presets</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { id: 'conservative', label: 'Conservative', icon: '🛡️' },
          { id: 'balanced', label: 'Balanced', icon: '⚖️' },
          { id: 'growth', label: 'Growth', icon: '📈' },
          { id: 'yield', label: 'Max Yield', icon: '🌾' },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => applyPreset(id)}
            className={clsx(
              'glass rounded-xl p-2 flex flex-col items-center gap-1 text-center transition-all',
              preset === id
                ? 'border border-violet-500/60 bg-violet-500/10'
                : 'border border-transparent hover:border-gray-700'
            )}
          >
            <span className="text-base">{icon}</span>
            <span className={clsx('text-[10px] font-medium', preset === id ? 'text-violet-300' : 'text-gray-400')}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Target sliders */}
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Target Allocation</p>
      <div className="glass rounded-2xl p-4 mb-4 space-y-5">
        {SLICE_CONFIG.map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={clsx('w-2.5 h-2.5 rounded-full', color)} />
                <span className="text-white text-sm">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                {Math.abs((currentSlices[key] ?? 0) - (targets[key] ?? 0)) > 5 && (
                  <span className="text-xs text-gray-500">
                    {(currentSlices[key] ?? 0)}% →
                  </span>
                )}
                <span className={clsx(
                  'text-sm font-semibold w-10 text-right',
                  (targets[key] ?? 0) > (currentSlices[key] ?? 0) + 5
                    ? 'text-emerald-400'
                    : (targets[key] ?? 0) < (currentSlices[key] ?? 0) - 5
                    ? 'text-orange-400'
                    : 'text-white'
                )}>
                  {targets[key] ?? 0}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={targets[key] ?? 0}
              onChange={(e) => setTarget(key, parseInt(e.target.value))}
              className="w-full h-2 accent-violet-500"
            />
          </div>
        ))}

        {/* Sum indicator */}
        <div className={clsx(
          'flex items-center gap-2 pt-2 border-t',
          sumError ? 'border-red-500/30' : 'border-gray-700/50'
        )}>
          {sumError ? (
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span className={clsx('text-xs', sumError ? 'text-red-400' : 'text-gray-400')}>
            Total: {totalSum}% {sumError ? `(${totalSum > 100 ? 'over' : 'under'} by ${Math.abs(totalSum - 100)}%)` : '✓'}
          </span>
        </div>
      </div>

      {/* Proposed Trades */}
      {trades.length > 0 && !sumError && (
        <>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
            Aurora&apos;s Rebalance Plan
          </p>
          <div className="space-y-2 mb-4">
            {trades.map((t, i) => (
              <div key={i} className="glass rounded-2xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ArrowRightLeft className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">
                    Swap {t.fromAmount} {t.from} → {t.to}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    ~${t.toEstimate.toFixed(0)} via {t.protocol}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">{t.reason}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Execute button */}
          <button
            onClick={executeRebalance}
            className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            Send {trades.length} trade{trades.length !== 1 ? 's' : ''} to Actions →
          </button>
        </>
      )}

      {trades.length === 0 && !sumError && !loading && (
        <div className="glass rounded-2xl p-5 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-semibold">Portfolio is balanced</p>
            <p className="text-gray-400 text-xs mt-1">
              Your current allocation is within 5% of your targets. No trades needed.
            </p>
          </div>
        </div>
      )}

      {!connected && !isDemo && (
        <div className="glass rounded-2xl p-5 flex items-start gap-3 mt-2">
          <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-semibold">Connect your wallet</p>
            <p className="text-gray-400 text-xs mt-1">
              Connect Phantom to see your real portfolio and generate personalized trades.
            </p>
          </div>
        </div>
      )}

      <p className="text-gray-600 text-xs text-center mt-6">
        ⚠️ Trade amounts are estimates. Verify slippage in Phantom before signing.
      </p>
    </div>
  );
}
