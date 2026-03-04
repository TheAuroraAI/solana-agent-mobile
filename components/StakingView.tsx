'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, TrendingUp, Zap, RefreshCw, ChevronRight, ArrowDownToLine, ArrowUpFromLine, Info, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { StakingData, StakingPosition } from '@/app/api/staking/route';

function formatSol(n: number, decimals = 3): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function ProtocolIcon({ protocol }: { protocol: string }) {
  if (protocol === 'jito') return <span className="text-lg">⚡</span>;
  if (protocol === 'marinade') return <span className="text-lg">🌊</span>;
  return <span className="text-lg">🔒</span>;
}

function StakeCard({ position, onStake, onUnstake }: {
  position: StakingPosition;
  onStake: (p: StakingPosition) => void;
  onUnstake: (p: StakingPosition) => void;
}) {
  const rewardPerYear = position.staked * (position.apy / 100);
  const rewardPerDay = rewardPerYear / 365;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: position.color + '22', border: `1px solid ${position.color}44` }}>
            <ProtocolIcon protocol={position.protocol} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{position.label}</p>
            <p className="text-xs text-gray-400">{position.asset}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold" style={{ color: position.color }}>
            {position.apy.toFixed(2)}% APY
          </p>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400">{position.status}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800/60 rounded-xl p-2.5 text-center">
          <p className="text-xs font-bold text-white">{formatSol(position.staked)} SOL</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Staked</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-2.5 text-center">
          <p className="text-xs font-bold text-emerald-400">+{formatSol(rewardPerDay, 4)}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">SOL / day</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-2.5 text-center">
          <p className="text-xs font-bold text-white">{formatSol(position.tokenAmount, 3)}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{position.asset}</p>
        </div>
      </div>

      {/* 7-day rewards bar */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">7d rewards</span>
        <span className="text-emerald-400 font-medium">+{formatSol(position.rewards7d, 5)} SOL</span>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onStake(position)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: position.color + '33', border: `1px solid ${position.color}66` }}
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          Stake More
        </button>
        <button
          onClick={() => onUnstake(position)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-gray-800/60 border border-gray-700 transition-all active:scale-95"
        >
          <ArrowUpFromLine className="w-3.5 h-3.5" />
          Unstake
        </button>
      </div>
    </div>
  );
}

function RateCard({ label, apy, color, desc }: { label: string; apy: number; color: string; desc: string }) {
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <div className="flex-1">
        <p className="text-xs font-semibold text-white">{label}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
      </div>
      <p className="text-sm font-bold" style={{ color }}>{apy.toFixed(2)}%</p>
    </div>
  );
}

export function StakingView() {
  const [data, setData] = useState<StakingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'positions' | 'rates'>('positions');
  const [stakeModal, setStakeModal] = useState<{ position: StakingPosition; mode: 'stake' | 'unstake' } | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const demoSuffix = isDemo ? '?demo=true' : '';

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/staking');
      if (res.ok) setData(await res.json());
    } catch { /* use previous data */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStake = (position: StakingPosition) => {
    setStakeModal({ position, mode: 'stake' });
    setStakeAmount('');
  };

  const handleUnstake = (position: StakingPosition) => {
    setStakeModal({ position, mode: 'unstake' });
    setStakeAmount('');
  };

  const executeAction = () => {
    if (!stakeModal) return;
    const { position, mode } = stakeModal;
    const amt = parseFloat(stakeAmount);
    if (isNaN(amt) || amt <= 0) return;

    // Route to Actions page with pre-populated swap
    if (mode === 'stake' && position.protocol === 'jito') {
      router.push(`/actions${demoSuffix}&from=SOL&to=jitoSOL&amount=${amt}&action=stake-jito`);
    } else if (mode === 'stake' && position.protocol === 'marinade') {
      router.push(`/actions${demoSuffix}&from=SOL&to=mSOL&amount=${amt}&action=stake-marinade`);
    } else if (mode === 'unstake' && position.protocol === 'jito') {
      router.push(`/actions${demoSuffix}&from=jitoSOL&to=SOL&amount=${amt}&action=unstake-jito`);
    } else if (mode === 'unstake' && position.protocol === 'marinade') {
      router.push(`/actions${demoSuffix}&from=mSOL&to=SOL&amount=${amt}&action=unstake-marinade`);
    } else {
      router.push(`/actions${demoSuffix}`);
    }
    setStakeModal(null);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-24 bg-gray-800 rounded-2xl" />
        <div className="h-40 bg-gray-800 rounded-2xl" />
        <div className="h-40 bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  const totalStaked = data?.totalStaked ?? 20.65;
  const totalRewards7d = data?.totalRewards7d ?? 0.0277;
  const aprToApy = (apy: number) => apy; // simplified

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Staking</h1>
          <p className="text-xs text-gray-400 mt-0.5">Earn yield on your SOL</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
        >
          <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Summary card */}
      <div className="glass rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Total Staked</p>
            <p className="text-2xl font-bold text-white">{formatSol(totalStaked, 2)}</p>
            <p className="text-xs text-gray-500">SOL</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">7d Rewards</p>
            <p className="text-2xl font-bold text-emerald-400">+{formatSol(totalRewards7d, 4)}</p>
            <p className="text-xs text-gray-500">SOL ≈ ${(totalRewards7d * 172).toFixed(2)}</p>
          </div>
        </div>

        {/* APY bar */}
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Blended APY</span>
            <span className="text-violet-400 font-bold">
              {data ? ((data.jitoApy * 12.45 + data.marinadeApy * 5.2 + data.nativeApy * 3) / totalStaked).toFixed(2) : '7.2'}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-sky-400" style={{ width: `${(12.45 / totalStaked) * 100}%` }} />
            <div className="h-full bg-violet-400" style={{ width: `${(5.2 / totalStaked) * 100}%` }} />
            <div className="h-full bg-emerald-400" style={{ width: `${(3 / totalStaked) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />Jito</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />Marinade</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Native</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['positions', 'rates'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-colors',
              tab === t ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-400'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'positions' && (
        <div className="space-y-3">
          {(data?.positions ?? []).map(position => (
            <StakeCard
              key={position.protocol}
              position={position}
              onStake={handleStake}
              onUnstake={handleUnstake}
            />
          ))}
        </div>
      )}

      {tab === 'rates' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">Current staking rates — updated every 5 minutes</p>
          <RateCard label="Jito (jitoSOL)" apy={data?.jitoApy ?? 7.52} color="#38bdf8" desc="Liquid staking + MEV tips" />
          <RateCard label="Marinade (mSOL)" apy={data?.marinadeApy ?? 7.18} color="#818cf8" desc="400+ validators, max decentralization" />
          <RateCard label="Native Staking" apy={data?.nativeApy ?? 6.8} color="#34d399" desc="Direct validator delegation" />
          <div className="glass rounded-xl p-3 mt-2">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">
                Liquid staking tokens (jitoSOL, mSOL) can be used in DeFi while still earning staking rewards. Native staking locks SOL for ~2–3 days to unstake.
              </p>
            </div>
          </div>

          {/* Quick stake buttons */}
          <div className="pt-2 space-y-2">
            <p className="text-xs font-semibold text-white">Quick Stake</p>
            {(data?.positions ?? []).filter(p => p.protocol !== 'native').map(position => (
              <button
                key={position.protocol}
                onClick={() => handleStake(position)}
                className="w-full flex items-center justify-between p-3 glass rounded-xl active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <ProtocolIcon protocol={position.protocol} />
                  <div className="text-left">
                    <p className="text-sm text-white font-medium">{position.label}</p>
                    <p className="text-xs text-gray-500">{position.apy.toFixed(2)}% APY</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stake/Unstake Modal */}
      {stakeModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setStakeModal(null)}
        >
          <div
            className="w-full max-w-md bg-gray-900 rounded-t-3xl border-t border-gray-700/50 p-6 pb-10 animate-[fadeUp_0.2s_ease-out]"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-5" />
            <p className="text-base font-bold text-white mb-1">
              {stakeModal.mode === 'stake' ? '⬇ Stake SOL' : '⬆ Unstake'} — {stakeModal.position.label}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {stakeModal.mode === 'stake'
                ? `Stake SOL to receive ${stakeModal.position.asset} at ${stakeModal.position.apy.toFixed(2)}% APY`
                : `Unstake ${stakeModal.position.asset} back to SOL`}
            </p>
            <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 mb-4">
              <input
                type="number"
                min="0"
                step="0.1"
                value={stakeAmount}
                onChange={e => setStakeAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-lg font-bold text-white outline-none"
                autoFocus
              />
              <span className="text-gray-400 text-sm">
                {stakeModal.mode === 'stake' ? 'SOL' : stakeModal.position.asset}
              </span>
            </div>
            {stakeAmount && !isNaN(parseFloat(stakeAmount)) && parseFloat(stakeAmount) > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 mb-4">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>
                  Estimated annual rewards: +{(parseFloat(stakeAmount) * stakeModal.position.apy / 100).toFixed(4)} SOL/yr
                </span>
              </div>
            )}
            <button
              onClick={executeAction}
              disabled={!stakeAmount || isNaN(parseFloat(stakeAmount)) || parseFloat(stakeAmount) <= 0}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            >
              {stakeModal.mode === 'stake' ? 'Stake →' : 'Unstake →'} Open in Actions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
