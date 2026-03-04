'use client';

export type PolicyStatus = 'satisfied' | 'action_needed' | 'triggered' | 'inactive';
export type PolicyTrigger = 'percentage' | 'balance' | 'drawdown' | 'custom';

export interface Policy {
  id: string;
  name: string;
  description: string;
  trigger: PolicyTrigger;
  enabled: boolean;
  params: Record<string, number | string>;
  actionType: 'stake' | 'swap' | 'alert' | 'rebalance';
  actionLabel: string;
}

export interface PolicyEvaluation {
  policy: Policy;
  status: PolicyStatus;
  statusLabel: string;
  statusDetail: string;
  recommendedAction?: string;
}

const STORAGE_KEY = 'aurora_policies_v1';

export const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'keep_stables',
    name: 'Maintain 20% Stablecoins',
    description: 'Keep at least 20% of portfolio in USDC/USDT as a stablecoin reserve.',
    trigger: 'percentage',
    enabled: true,
    params: { targetPct: 20, asset: 'stablecoin' },
    actionType: 'swap',
    actionLabel: 'Swap SOL → USDC',
  },
  {
    id: 'stake_excess',
    name: 'Stake SOL Above 5',
    description: 'Auto-stake any SOL balance above 5 SOL with Jito for ~7.5% APY.',
    trigger: 'balance',
    enabled: true,
    params: { threshold: 5, protocol: 'Jito' },
    actionType: 'stake',
    actionLabel: 'Stake Excess SOL',
  },
  {
    id: 'drawdown_alert',
    name: 'Alert on 30% Drawdown',
    description: 'Notify when portfolio value drops 30% from its peak.',
    trigger: 'drawdown',
    enabled: true,
    params: { pct: 30 },
    actionType: 'alert',
    actionLabel: 'Review Portfolio',
  },
  {
    id: 'max_sol_exposure',
    name: 'Cap SOL at 70% Exposure',
    description: 'Rebalance when SOL exceeds 70% of total portfolio value.',
    trigger: 'percentage',
    enabled: false,
    params: { maxPct: 70, asset: 'SOL' },
    actionType: 'rebalance',
    actionLabel: 'Rebalance Now',
  },
];

export function loadPolicies(): Policy[] {
  if (typeof window === 'undefined') return DEFAULT_POLICIES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_POLICIES;
    return JSON.parse(stored) as Policy[];
  } catch {
    return DEFAULT_POLICIES;
  }
}

export function savePolicies(policies: Policy[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
  } catch {
    // ignore
  }
}

export interface WalletSnapshot {
  solBalance: number;
  solBalanceUsd: number;
  totalUsd: number;
  stableUsd: number;
  stablePct: number;
  solPct: number;
  peakUsd?: number;
}

export function evaluatePolicies(
  policies: Policy[],
  wallet: WalletSnapshot
): PolicyEvaluation[] {
  return policies.map((policy) => {
    if (!policy.enabled) {
      return {
        policy,
        status: 'inactive',
        statusLabel: 'Disabled',
        statusDetail: 'Policy is turned off.',
      };
    }

    if (policy.id === 'keep_stables') {
      const target = policy.params.targetPct as number;
      if (wallet.stablePct >= target) {
        return {
          policy,
          status: 'satisfied',
          statusLabel: 'Satisfied',
          statusDetail: `Stablecoin reserve at ${wallet.stablePct.toFixed(0)}% — above ${target}% target.`,
        };
      } else {
        const deficit = ((target - wallet.stablePct) / 100) * wallet.totalUsd;
        return {
          policy,
          status: 'action_needed',
          statusLabel: 'Action Needed',
          statusDetail: `Only ${wallet.stablePct.toFixed(0)}% in stablecoins. Need $${deficit.toFixed(0)} more USDC.`,
          recommendedAction: `Swap $${deficit.toFixed(0)} SOL → USDC`,
        };
      }
    }

    if (policy.id === 'stake_excess') {
      const threshold = policy.params.threshold as number;
      const excess = wallet.solBalance - threshold;
      if (excess <= 0) {
        return {
          policy,
          status: 'satisfied',
          statusLabel: 'Satisfied',
          statusDetail: `SOL balance (${wallet.solBalance.toFixed(2)}) is below ${threshold} SOL threshold.`,
        };
      } else {
        return {
          policy,
          status: 'action_needed',
          statusLabel: 'Action Needed',
          statusDetail: `${excess.toFixed(2)} SOL above threshold. Staking earns ~7.5% APY.`,
          recommendedAction: `Stake ${excess.toFixed(2)} SOL with Jito`,
        };
      }
    }

    if (policy.id === 'drawdown_alert') {
      const pct = policy.params.pct as number;
      const peak = wallet.peakUsd ?? wallet.totalUsd;
      const drawdown = peak > 0 ? ((peak - wallet.totalUsd) / peak) * 100 : 0;
      if (drawdown >= pct) {
        return {
          policy,
          status: 'triggered',
          statusLabel: 'Triggered',
          statusDetail: `Portfolio down ${drawdown.toFixed(0)}% from peak ($${peak.toFixed(0)} → $${wallet.totalUsd.toFixed(0)}).`,
          recommendedAction: 'Review and consider defensive position',
        };
      } else {
        return {
          policy,
          status: 'satisfied',
          statusLabel: 'Satisfied',
          statusDetail: `Portfolio at $${wallet.totalUsd.toFixed(0)}. ${drawdown > 0 ? `Down ${drawdown.toFixed(0)}% from peak.` : 'Near peak value.'}`,
        };
      }
    }

    if (policy.id === 'max_sol_exposure') {
      const maxPct = policy.params.maxPct as number;
      if (wallet.solPct > maxPct) {
        return {
          policy,
          status: 'triggered',
          statusLabel: 'Triggered',
          statusDetail: `SOL at ${wallet.solPct.toFixed(0)}% of portfolio — exceeds ${maxPct}% cap.`,
          recommendedAction: `Rebalance to reduce SOL by ${(wallet.solPct - maxPct).toFixed(0)}%`,
        };
      } else {
        return {
          policy,
          status: 'satisfied',
          statusLabel: 'Satisfied',
          statusDetail: `SOL at ${wallet.solPct.toFixed(0)}% — within ${maxPct}% cap.`,
        };
      }
    }

    return {
      policy,
      status: 'satisfied',
      statusLabel: 'Satisfied',
      statusDetail: 'Policy conditions met.',
    };
  });
}
