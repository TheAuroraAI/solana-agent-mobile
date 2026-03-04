'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck, ShieldAlert, BellRing, ToggleLeft, ToggleRight,
  RefreshCw, ChevronRight, Sparkles, Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  loadPolicies, savePolicies, evaluatePolicies,
  type Policy, type PolicyEvaluation, type WalletSnapshot,
} from '@/lib/policies';
import { getWalletState, getNetwork, DEMO_WALLET_STATE } from '@/lib/solana';

const NETWORK = getNetwork();

const DEMO_SNAPSHOT: WalletSnapshot = {
  solBalance: DEMO_WALLET_STATE.solBalance,
  solBalanceUsd: DEMO_WALLET_STATE.solBalanceUsd,
  totalUsd: DEMO_WALLET_STATE.solBalanceUsd + DEMO_WALLET_STATE.tokens.reduce((s, t) => s + t.uiAmount, 0),
  stableUsd: DEMO_WALLET_STATE.tokens
    .filter(t => t.symbol === 'USDC' || t.symbol === 'USDT')
    .reduce((s, t) => s + t.uiAmount, 0),
  get stablePct() { return this.totalUsd > 0 ? (this.stableUsd / this.totalUsd) * 100 : 0; },
  get solPct() { return this.totalUsd > 0 ? (this.solBalanceUsd / this.totalUsd) * 100 : 0; },
};

function statusIcon(status: PolicyEvaluation['status']) {
  switch (status) {
    case 'satisfied': return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
    case 'action_needed': return <ShieldAlert className="w-5 h-5 text-yellow-400" />;
    case 'triggered': return <BellRing className="w-5 h-5 text-orange-400" />;
    default: return <Info className="w-5 h-5 text-gray-500" />;
  }
}

function statusBg(status: PolicyEvaluation['status']) {
  switch (status) {
    case 'satisfied': return 'border-emerald-500/20 bg-emerald-500/5';
    case 'action_needed': return 'border-yellow-500/20 bg-yellow-500/5';
    case 'triggered': return 'border-orange-500/20 bg-orange-500/5';
    default: return 'border-gray-700/50 bg-gray-800/30';
  }
}

function statusColor(status: PolicyEvaluation['status']) {
  switch (status) {
    case 'satisfied': return 'text-emerald-400';
    case 'action_needed': return 'text-yellow-400';
    case 'triggered': return 'text-orange-400';
    default: return 'text-gray-500';
  }
}

export function PoliciesView() {
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [evaluations, setEvaluations] = useState<PolicyEvaluation[]>([]);
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const buildSnapshot = useCallback(async () => {
    if (isDemo) {
      return DEMO_SNAPSHOT;
    }
    if (!publicKey) return null;
    try {
      const ws = await getWalletState(publicKey.toString(), NETWORK);
      const totalUsd = ws.solBalanceUsd + ws.tokens.reduce((s, t) => s + t.uiAmount, 0);
      const stableUsd = ws.tokens
        .filter(t => t.symbol === 'USDC' || t.symbol === 'USDT')
        .reduce((s, t) => s + t.uiAmount, 0);
      return {
        solBalance: ws.solBalance,
        solBalanceUsd: ws.solBalanceUsd,
        totalUsd,
        stableUsd,
        stablePct: totalUsd > 0 ? (stableUsd / totalUsd) * 100 : 0,
        solPct: totalUsd > 0 ? (ws.solBalanceUsd / totalUsd) * 100 : 0,
      } satisfies WalletSnapshot;
    } catch {
      return null;
    }
  }, [publicKey, isDemo]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const loaded = loadPolicies();
    setPolicies(loaded);
    const snap = await buildSnapshot();
    if (snap) {
      setSnapshot(snap);
      setEvaluations(evaluatePolicies(loaded, snap));
    } else {
      setEvaluations(loaded.map(p => ({
        policy: p,
        status: 'inactive' as const,
        statusLabel: 'Connect Wallet',
        statusDetail: 'Connect your wallet to evaluate this policy.',
      })));
    }
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  }, [buildSnapshot]);

  useEffect(() => { refresh(); }, [refresh]);

  function togglePolicy(id: string) {
    const updated = policies.map(p =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setPolicies(updated);
    savePolicies(updated);
    if (snapshot) {
      setEvaluations(evaluatePolicies(updated, snapshot));
    }
  }

  const activeCount = evaluations.filter(e => e.status !== 'inactive').length;
  const alertCount = evaluations.filter(e => e.status === 'triggered' || e.status === 'action_needed').length;

  return (
    <div className="safe-top px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-white text-xl font-bold">Policies</h1>
          <p className="text-gray-400 text-xs mt-0.5">Autonomous rebalancing rules evaluated by Aurora</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Summary bar */}
      <div className="glass rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold">Aurora Policy Engine</span>
              {alertCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-orange-500/15 text-orange-400">
                  {alertCount} alert{alertCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              {loading
                ? 'Evaluating policies…'
                : alertCount > 0
                  ? `${alertCount} polic${alertCount > 1 ? 'ies need' : 'y needs'} attention`
                  : `${activeCount} active polic${activeCount !== 1 ? 'ies' : 'y'} — all conditions met`
              }
              {lastUpdated && !loading && (
                <span className="text-gray-600 ml-2">· {lastUpdated}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Policy cards */}
      <div className="space-y-3">
        {evaluations.map((ev) => (
          <div
            key={ev.policy.id}
            className={clsx('rounded-2xl border p-4 transition-all', statusBg(ev.status))}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{statusIcon(ev.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white text-sm font-semibold leading-tight">{ev.policy.name}</span>
                  <button
                    onClick={() => togglePolicy(ev.policy.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                    aria-label={ev.policy.enabled ? 'Disable policy' : 'Enable policy'}
                  >
                    {ev.policy.enabled
                      ? <ToggleRight className="w-5 h-5 text-violet-400" />
                      : <ToggleLeft className="w-5 h-5 text-gray-600" />
                    }
                  </button>
                </div>

                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{ev.policy.description}</p>

                {/* Status row */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={clsx('text-xs font-semibold', statusColor(ev.status))}>
                    {ev.statusLabel}
                  </span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-gray-400 text-xs leading-snug">{ev.statusDetail}</span>
                </div>

                {/* Action CTA */}
                {ev.recommendedAction && (ev.status === 'action_needed' || ev.status === 'triggered') && (
                  <a
                    href="/actions"
                    className="flex items-center gap-1.5 mt-3 text-violet-400 text-xs font-semibold hover:text-violet-300 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {ev.recommendedAction}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-gray-600 text-xs mt-6 px-4 leading-relaxed">
        Policies are evaluated locally against your wallet state. Aurora proposes actions — you approve every transaction.
      </p>
    </div>
  );
}
