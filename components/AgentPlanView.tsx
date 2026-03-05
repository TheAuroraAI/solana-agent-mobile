'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles, CheckCircle, Circle, ArrowRight, RefreshCw,
  Landmark, ArrowRightLeft, Bell, BarChart3, Zap,
  ChevronDown, ChevronUp, AlertTriangle, Play,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getWalletState, getNetwork, DEMO_WALLET_STATE } from '@/lib/solana';
import { SlideToConfirm } from './SlideToConfirm';

const NETWORK = getNetwork();

type StepStatus = 'pending' | 'active' | 'executing' | 'done' | 'skipped';
type StepType = 'analysis' | 'stake' | 'swap' | 'alert' | 'rebalance';

interface PlanStep {
  id: string;
  type: StepType;
  title: string;
  description: string;
  detail: string;
  impact: string;
  risk: 'low' | 'medium' | 'high';
  amount?: number;
  protocol?: string;
  expectedApy?: string;
  status: StepStatus;
  canExecute: boolean; // false = analysis/alert, no tx needed
}

const STEP_ICONS: Record<StepType, typeof Sparkles> = {
  analysis: BarChart3,
  stake: Landmark,
  swap: ArrowRightLeft,
  alert: Bell,
  rebalance: Zap,
};

const DEMO_PLAN: PlanStep[] = [
  {
    id: 'plan-1',
    type: 'analysis',
    title: 'Portfolio health check',
    description: 'Analyzing concentration risk, yield efficiency, and liquidity buffer',
    detail: 'Your portfolio is 87% SOL — high concentration risk. You have 3.2 jitoSOL earning yield but 9.65 SOL sitting idle. Stablecoin reserve ($250 USDC) is below recommended 20% for volatility cushion.',
    impact: 'Baseline established. Plan targets: +2.3% annual yield, -30% concentration risk',
    risk: 'low',
    status: 'pending',
    canExecute: false,
  },
  {
    id: 'plan-2',
    type: 'stake',
    title: 'Stake 3 SOL → jitoSOL',
    description: 'Convert idle SOL to liquid staked jitoSOL earning 7.5% APY + MEV tips',
    detail: 'Jito\'s jitoSOL is fully liquid — swap back via Jupiter anytime. Combining with your existing 3.2 jitoSOL brings total staked to 6.2 jitoSOL (~$84/year yield at current rates).',
    impact: '+$68/year yield | jitoSOL remains liquid, zero lockup',
    risk: 'low',
    amount: 3.0,
    protocol: 'Jito',
    expectedApy: '~7.5%',
    status: 'pending',
    canExecute: true,
  },
  {
    id: 'plan-3',
    type: 'swap',
    title: 'Swap 1.5 SOL → USDC reserve',
    description: 'Build dry-powder reserve for DeFi opportunities and volatility protection',
    detail: 'At current prices ($91/SOL), 1.5 SOL ≈ $136. Adding to your $250 USDC brings reserve to $386 (20% of portfolio). This lets you buy dips, enter Kamino vaults, or cover gas without selling staked positions.',
    impact: '+$136 USDC reserve | Reduces forced selling risk during volatility',
    risk: 'medium',
    amount: 1.5,
    protocol: 'Jupiter',
    status: 'pending',
    canExecute: true,
  },
  {
    id: 'plan-4',
    type: 'alert',
    title: 'Set SOL price alert at $110',
    description: 'Aurora will notify you when SOL breaks resistance — ideal to rebalance back to SOL',
    detail: '$110 is a key resistance level. If SOL breaks above, consider swapping some USDC back to SOL to capture upside. Alert fires once — you decide the action.',
    impact: 'Risk management: never miss a breakout or breakdown',
    risk: 'low',
    protocol: 'Aurora Alerts',
    status: 'pending',
    canExecute: false,
  },
];

function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  return (
    <span className={clsx(
      'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
      risk === 'low' && 'bg-emerald-500/20 text-emerald-400',
      risk === 'medium' && 'bg-yellow-500/20 text-yellow-400',
      risk === 'high' && 'bg-red-500/20 text-red-400',
    )}>
      {risk}
    </span>
  );
}

export function AgentPlanView() {
  const { publicKey, connected } = useWallet();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const [steps, setSteps] = useState<PlanStep[]>(DEMO_PLAN);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>('plan-1');
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [planStarted, setPlanStarted] = useState(false);

  const currentStepIdx = steps.findIndex(s => s.status === 'active');
  const completedCount = steps.filter(s => s.status === 'done' || s.status === 'skipped').length;
  const allDone = completedCount === steps.length;

  const startPlan = useCallback(async () => {
    setPlanStarted(true);
    setTxError(null);

    if (!connected && !isDemo) {
      // Generate static plan for non-connected
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'active' } : s));
      return;
    }

    setGenerating(true);
    try {
      const ws = isDemo ? DEMO_WALLET_STATE : (connected && publicKey ? await getWalletState(publicKey.toBase58(), NETWORK) : null);
      if (!ws) {
        setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'active' } : s));
        setGenerating(false);
        return;
      }

      // Use real wallet data to personalize the plan
      const solIdle = Math.max(0, ws.solBalance - 0.5); // keep 0.5 SOL for gas
      const stakeAmt = parseFloat(Math.min(solIdle * 0.4, 5).toFixed(2));
      const swapAmt = parseFloat(Math.min(solIdle * 0.2, 2).toFixed(2));
      const hasSkr = ws.tokens.some(t => t.symbol === 'SKR' && t.uiAmount > 100);

      const personalizedPlan: PlanStep[] = [
        {
          id: 'plan-1',
          type: 'analysis',
          title: 'Portfolio health check',
          description: `Analyzing ${ws.address.slice(0, 8)}... wallet — ${ws.solBalance.toFixed(2)} SOL, ${ws.tokens.length} tokens`,
          detail: `SOL balance: ${ws.solBalance.toFixed(3)} SOL ($${ws.solBalanceUsd.toFixed(0)}). ${ws.tokens.length > 0 ? `Token positions: ${ws.tokens.map(t => t.symbol).join(', ')}.` : 'No SPL tokens detected.'} Idle SOL available for yield: ~${solIdle.toFixed(2)} SOL.`,
          impact: 'Plan personalized to your wallet state',
          risk: 'low',
          status: 'active',
          canExecute: false,
        },
        ...(stakeAmt > 0.1 ? [{
          id: 'plan-2',
          type: 'stake' as StepType,
          title: `Stake ${stakeAmt} SOL → jitoSOL`,
          description: `Convert idle SOL to jitoSOL for ~7.5% APY + MEV rewards`,
          detail: `Jito liquid staking earns 7.5% base APY plus MEV tips from validator activity. jitoSOL is fully liquid — redeem via Jupiter anytime. Estimated annual yield from this position: $${(stakeAmt * 91 * 0.075).toFixed(0)}.`,
          impact: `+$${(stakeAmt * 91 * 0.075).toFixed(0)}/year yield | Fully liquid`,
          risk: 'low' as const,
          amount: stakeAmt,
          protocol: 'Jito',
          expectedApy: '~7.5%',
          status: 'pending' as StepStatus,
          canExecute: true,
        }] : []),
        ...(swapAmt > 0.1 ? [{
          id: 'plan-3',
          type: 'swap' as StepType,
          title: `Swap ${swapAmt} SOL → USDC`,
          description: 'Build stablecoin reserve for opportunities and downside protection',
          detail: `${swapAmt} SOL ≈ $${(swapAmt * 91).toFixed(0)} USDC at current prices. Stablecoin reserves let you: enter Kamino vaults (8-12% APY), buy SOL dips, or cover gas without selling staked positions.`,
          impact: `+$${(swapAmt * 91).toFixed(0)} USDC reserve | Reduce forced-sell risk`,
          risk: 'medium' as const,
          amount: swapAmt,
          protocol: 'Jupiter',
          status: 'pending' as StepStatus,
          canExecute: true,
        }] : []),
        ...(hasSkr ? [{
          id: 'plan-skr',
          type: 'stake' as StepType,
          title: 'Stake SKR with Guardian',
          description: 'Delegate SKR to a Guardian validator for ~20.2% APY',
          detail: 'SKR Guardian staking earns ~20.2% APY with a 48h unstaking cooldown. Guardians curate the Solana Mobile dApp Store — your stake secures the ecosystem you use.',
          impact: '~20.2% APY | Supports Solana Mobile ecosystem',
          risk: 'low' as const,
          protocol: 'Solana Mobile Guardian',
          expectedApy: '~20.2%',
          status: 'pending' as StepStatus,
          canExecute: false, // directs to stake.solanamobile.com
        }] : []),
        {
          id: 'plan-alert',
          type: 'alert',
          title: 'Activate portfolio monitoring',
          description: 'Aurora watches for price alerts and whale activity near your tokens',
          detail: 'Once enabled, Aurora monitors SOL price movements and whale wallet activity for tokens you hold. Alerts fire instantly via in-app notification.',
          impact: 'Always informed. Never miss a major move.',
          risk: 'low',
          status: 'pending' as StepStatus,
          canExecute: false,
        },
      ];

      setSteps(personalizedPlan);
    } catch {
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'active' } : s));
    } finally {
      setGenerating(false);
    }
  }, [connected, publicKey, isDemo]);

  const advanceToNext = useCallback((currentId: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === currentId);
      return prev.map((s, i) => {
        if (s.id === currentId) return { ...s, status: 'done' };
        if (i === idx + 1) return { ...s, status: 'active' };
        return s;
      });
    });
    setExpanded(null);
    setTimeout(() => {
      const next = steps[steps.findIndex(s => s.id === currentId) + 1];
      if (next) setExpanded(next.id);
    }, 300);
  }, [steps]);

  const skipStep = useCallback((id: string) => {
    advanceToNext(id);
  }, [advanceToNext]);

  const executeStep = useCallback(async (step: PlanStep) => {
    if (!step.canExecute) {
      advanceToNext(step.id);
      return;
    }

    // Simulate execution with a brief delay (real execution goes via /actions page)
    setExecutingId(step.id);
    setTxError(null);
    setSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'executing' } : s));

    try {
      await new Promise(r => setTimeout(r, 1800));
      advanceToNext(step.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Step failed';
      setTxError(msg.slice(0, 80));
      setSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'active' } : s));
    } finally {
      setExecutingId(null);
    }
  }, [advanceToNext]);

  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="px-4 py-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-white text-lg font-bold">Agent Plan</h1>
          <p className="text-gray-500 text-xs">Aurora&apos;s multi-step portfolio optimization</p>
        </div>
        {planStarted && !allDone && (
          <button
            onClick={() => { setPlanStarted(false); setSteps(DEMO_PLAN); }}
            className="ml-auto p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {planStarted && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{completedCount} of {steps.length} steps</span>
            <span>{progressPct}% complete</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Start CTA */}
      {!planStarted && (
        <div className="glass rounded-2xl p-5 mb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-3">
            <Play className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-white font-semibold mb-1">Run Portfolio Optimization</h2>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">
            Aurora analyzes your wallet and builds a personalized plan to maximize yield and reduce risk — then executes each step with your approval.
          </p>
          <div className="flex gap-2 justify-center flex-wrap mb-4">
            {['Maximize yield', 'Reduce risk', 'Build reserves', 'Set alerts'].map(tag => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={startPlan}
            disabled={generating}
            className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Analyzing wallet...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate my plan</>
            )}
          </button>
          {!connected && !isDemo && (
            <p className="text-gray-600 text-xs mt-3">Connect wallet for personalized plan · or use <a href="?demo=true" className="text-violet-400 underline">demo mode</a></p>
          )}
        </div>
      )}

      {/* All done */}
      {allDone && planStarted && (
        <div className="glass rounded-2xl p-5 mb-4 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-white font-semibold text-lg mb-1">Plan complete!</h2>
          <p className="text-gray-400 text-sm mb-4">Aurora executed all {steps.length} steps. Your portfolio is optimized.</p>
          <button
            onClick={() => { setPlanStarted(false); setSteps(DEMO_PLAN); }}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Run new plan
          </button>
        </div>
      )}

      {/* Error */}
      {txError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-xs">{txError}</p>
        </div>
      )}

      {/* Steps */}
      {planStarted && !allDone && (
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const Icon = STEP_ICONS[step.type];
            const isActive = step.status === 'active';
            const isDone = step.status === 'done' || step.status === 'skipped';
            const isExecuting = step.status === 'executing';
            const isOpen = expanded === step.id;

            return (
              <div
                key={step.id}
                className={clsx(
                  'rounded-2xl border transition-all duration-300',
                  isActive ? 'bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/10' :
                  isDone ? 'bg-emerald-500/5 border-emerald-500/20 opacity-80' :
                  'bg-white/[0.03] border-white/5 opacity-50'
                )}
              >
                {/* Step header */}
                <button
                  onClick={() => isActive || isDone ? setExpanded(isOpen ? null : step.id) : undefined}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  {/* Step indicator */}
                  <div className="relative flex-shrink-0">
                    {isDone ? (
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    ) : isExecuting ? (
                      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    ) : isActive ? (
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 border-2 border-violet-500 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-violet-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className="text-gray-600 text-xs font-medium">{idx + 1}</span>
                      </div>
                    )}
                    {idx < steps.length - 1 && (
                      <div className={clsx(
                        'absolute left-1/2 -translate-x-1/2 top-full h-3 w-0.5',
                        isDone ? 'bg-emerald-500/40' : 'bg-white/10'
                      )} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={clsx(
                        'text-sm font-semibold truncate',
                        isDone ? 'text-emerald-300' : isActive ? 'text-white' : 'text-gray-500'
                      )}>
                        {step.title}
                      </span>
                      <RiskBadge risk={step.risk} />
                    </div>
                    <p className="text-gray-500 text-xs truncate">{step.description}</p>
                    {step.expectedApy && isActive && (
                      <p className="text-emerald-400 text-xs font-medium mt-0.5">{step.expectedApy} APY</p>
                    )}
                  </div>

                  {(isActive || isDone) && (
                    <div className="flex-shrink-0 text-gray-600">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  )}
                </button>

                {/* Expanded detail */}
                {isOpen && (isActive || isDone) && (
                  <div className="px-4 pb-4">
                    <div className="border-t border-white/5 pt-3 mb-3">
                      <p className="text-gray-400 text-xs leading-relaxed mb-2">{step.detail}</p>
                      <div className="flex items-center gap-1.5 p-2 bg-emerald-500/5 rounded-xl">
                        <ArrowRight className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <p className="text-emerald-300 text-xs">{step.impact}</p>
                      </div>
                    </div>

                    {isActive && !isExecuting && (
                      <div className="space-y-2">
                        {step.canExecute ? (
                          <>
                            <SlideToConfirm
                              onConfirm={() => executeStep(step)}
                              label={step.type === 'stake' ? `Slide to stake ${step.amount} SOL` : `Slide to swap ${step.amount} SOL → USDC`}
                              confirmedLabel="Executing..."
                            />
                            <button
                              onClick={() => skipStep(step.id)}
                              className="w-full py-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                            >
                              Skip this step
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => executeStep(step)}
                            className="w-full py-3 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark complete & continue
                          </button>
                        )}
                      </div>
                    )}

                    {isDone && (
                      <div className="flex items-center gap-2 text-emerald-400 text-xs">
                        <CheckCircle className="w-4 h-4" />
                        {step.status === 'skipped' ? 'Skipped' : 'Completed'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer disclaimer */}
      <p className="text-gray-700 text-[10px] text-center mt-6 leading-relaxed">
        Aurora&apos;s plans are algorithmic suggestions. Not financial advice. Always verify transactions before signing.
      </p>
    </div>
  );
}
