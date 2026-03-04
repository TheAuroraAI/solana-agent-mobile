'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import { SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey, Connection } from '@solana/web3.js';
import {
  Zap, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, RefreshCw,
  ArrowRightLeft, Landmark, BarChart3, Bell,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getWalletState, getNetwork, getSolscanCluster, getRpcUrl } from '@/lib/solana';
import { getJupiterSwapTx, resolveOutputMint, SOL_MINT } from '@/lib/jupiter';
import { logAction, updateActionOutcome } from '@/lib/action-log';
import { loadSettings } from '@/lib/settings';
import { SlideToConfirm } from './SlideToConfirm';

const NETWORK = getNetwork();

type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed';

interface AgentAction {
  id: string;
  type: 'stake' | 'swap' | 'alert' | 'analysis' | 'transfer';
  title: string;
  description: string;
  details: {
    reasoning: string;
    risk: 'low' | 'medium' | 'high';
    estimatedGas?: string;
    recipient?: string;
    amount?: number;
    protocol?: string;
    expectedApy?: string;
  };
  status: ActionStatus;
  createdAt: string | Date;
}

const FALLBACK_ACTIONS: AgentAction[] = [
  {
    id: '1',
    type: 'analysis',
    title: 'Connect wallet to get AI actions',
    description: 'Aurora generates personalized on-chain actions based on your wallet state.',
    details: {
      reasoning: 'Connect your Phantom wallet so Aurora can analyze your SOL balance, token holdings, and transaction history to generate relevant action proposals.',
      risk: 'low',
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

const DEMO_ACTIONS: AgentAction[] = [
  {
    id: 'demo-1',
    type: 'analysis',
    title: 'Portfolio concentration risk detected',
    description: 'Your portfolio is heavily weighted toward SOL. Aurora recommends diversifying across liquid staking and stablecoins for better risk management.',
    details: {
      reasoning: 'With 12.85 SOL ($1,798) and $250 in USDC, a 20% SOL drawdown would reduce your portfolio by ~$360. You already hold 3.2 jitoSOL earning yield — consider converting more SOL to stablecoins for dry powder during volatility.',
      risk: 'low',
      protocol: 'Aurora',
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    type: 'stake',
    title: 'Stake 2.5 SOL with Jito for yield',
    description: 'Convert 3.0 SOL → jitoSOL for ~7.5% APY + MEV rewards. Keep 9.85 SOL liquid.',
    details: {
      reasoning: 'Jito offers the highest liquid staking yield on Solana (7.5% base + MEV tips). jitoSOL is fully liquid — swap back via Jupiter anytime. Combined with your existing 3.2 jitoSOL, this brings your staked total to 6.2 jitoSOL (~$84/year yield).',
      risk: 'low',
      estimatedGas: '~0.000005 SOL',
      recipient: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
      amount: 3.0,
      protocol: 'Jito',
      expectedApy: '~7.5%',
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    type: 'swap',
    title: 'Swap 0.5 SOL → USDC via Jupiter',
    description: 'Increase USDC reserve for DeFi opportunities. Jupiter finds the best route across all Solana DEXs.',
    details: {
      reasoning: 'Your current $250 USDC reserve is solid, but adding more gives you flexibility for yield vaults (Kamino 8-12% APY) or buying dips. Jupiter aggregates Orca, Raydium, and Phoenix for optimal execution.',
      risk: 'medium',
      estimatedGas: '~0.000005 SOL',
      amount: 0.5,
      protocol: 'Jupiter',
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    type: 'alert',
    title: 'Gas reserve healthy',
    description: 'After proposed actions, you\'d retain ~3 SOL — sufficient for 600,000+ transactions on Solana.',
    details: {
      reasoning: 'Solana transactions cost ~0.000005 SOL. Your remaining liquid SOL would be more than adequate for months of active DeFi usage. No gas reserve concerns.',
      risk: 'low',
      protocol: 'Solana',
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

const ACTION_ICONS: Record<string, { icon: typeof Zap; color: string }> = {
  stake: { icon: Landmark, color: 'text-emerald-400' },
  swap: { icon: ArrowRightLeft, color: 'text-blue-400' },
  transfer: { icon: Zap, color: 'text-yellow-400' },
  analysis: { icon: BarChart3, color: 'text-violet-400' },
  alert: { icon: Bell, color: 'text-orange-400' },
};

function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  return (
    <span className={clsx(
      'text-xs px-2 py-0.5 rounded-full font-medium',
      risk === 'low' && 'bg-emerald-500/20 text-emerald-400',
      risk === 'medium' && 'bg-yellow-500/20 text-yellow-400',
      risk === 'high' && 'bg-red-500/20 text-red-400',
    )}>
      {risk} risk
    </span>
  );
}

function ActionCard({ action, onApprove, onReject }: {
  action: AgentAction;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { icon: TypeIcon, color: typeColor } = ACTION_ICONS[action.type] ?? ACTION_ICONS.analysis;

  const StatusIcon = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
    executed: CheckCircle,
  }[action.status];

  const statusColor = {
    pending: 'text-yellow-400',
    approved: 'text-emerald-400',
    rejected: 'text-red-400',
    executed: 'text-emerald-400',
  }[action.status];

  const isExecutable = action.type === 'stake' || action.type === 'swap' || action.type === 'transfer';

  return (
    <div className={clsx(
      'glass rounded-2xl overflow-hidden',
      action.status === 'rejected' && 'opacity-50'
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-3">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              action.type === 'stake' ? 'bg-emerald-500/15' :
              action.type === 'swap' ? 'bg-blue-500/15' :
              action.type === 'alert' ? 'bg-orange-500/15' :
              'bg-violet-500/15'
            )}>
              <TypeIcon className={clsx('w-4 h-4', typeColor)} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{action.title}</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{action.description}</p>
            </div>
          </div>
          <StatusIcon className={clsx('w-4 h-4 flex-shrink-0 mt-0.5', statusColor)} />
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <RiskBadge risk={action.details.risk} />
          {action.details.protocol && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800/80 text-gray-300 font-medium">
              {action.details.protocol}
            </span>
          )}
          {action.details.expectedApy && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
              {action.details.expectedApy} APY
            </span>
          )}
          {action.details.estimatedGas && (
            <span className="text-xs text-gray-500">Gas: {action.details.estimatedGas}</span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto text-gray-500 hover:text-gray-300 flex items-center gap-1 text-xs"
          >
            Details
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 p-3 bg-gray-900/50 rounded-xl space-y-2">
            <p className="text-gray-300 text-xs leading-relaxed">{action.details.reasoning}</p>
            {action.details.recipient && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">To:</span>
                <span className="text-gray-300 text-xs font-mono">
                  {action.details.recipient.slice(0, 8)}...{action.details.recipient.slice(-4)}
                </span>
              </div>
            )}
            {action.details.amount && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">Amount:</span>
                <span className="text-white text-xs font-medium">{action.details.amount} SOL</span>
              </div>
            )}
          </div>
        )}
      </div>

      {action.status === 'pending' && (
        <div className="flex border-t border-gray-800/50">
          <button
            onClick={() => onReject(action.id)}
            className="flex-1 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <div className="w-px bg-gray-800/50" />
          <button
            onClick={() => {
              navigator.vibrate?.(50);
              onApprove(action.id);
            }}
            className="flex-1 py-3 text-sm text-emerald-400 hover:bg-emerald-500/5 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            {isExecutable ? (action.type === 'swap' ? 'Sign & Swap' : 'Sign & Send') : 'Acknowledge'}
          </button>
        </div>
      )}
    </div>
  );
}

function buildCopyTradeAction(walletAddr: string, token: string): AgentAction {
  const shortAddr = `${walletAddr.slice(0, 4)}...${walletAddr.slice(-4)}`;
  const safeToken = token.replace(/[^A-Z0-9a-z]/g, '').slice(0, 10) || 'TOKEN';
  return {
    id: `copy-trade-${Date.now()}`,
    type: 'swap',
    title: `Copy whale trade: Buy ${safeToken}`,
    description: `Mirror the whale at ${shortAddr} — swap 0.5 SOL → ${safeToken} via Jupiter.`,
    details: {
      reasoning: `A whale wallet (${shortAddr}) just made a large ${safeToken} purchase. Aurora proposes copying this trade: swap 0.5 SOL → ${safeToken} at the current market price via Jupiter aggregator. This is a speculative action — only approve if you've researched ${safeToken} independently.`,
      risk: 'high',
      estimatedGas: '~0.000005 SOL',
      amount: 0.5,
      protocol: 'Jupiter',
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

export function ActionsView() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const copyWallet = searchParams.get('copy') ?? '';
  const copyToken = searchParams.get('token') ?? '';
  const isCopyTrade = !!(copyWallet && copyToken);

  const initialActions = isCopyTrade
    ? [buildCopyTradeAction(copyWallet, copyToken), ...FALLBACK_ACTIONS]
    : isDemo
    ? DEMO_ACTIONS
    : FALLBACK_ACTIONS;

  const [actions, setActions] = useState<AgentAction[]>(initialActions);
  const [executing, setExecuting] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<{ success: boolean; sig?: string; error?: string } | null>(null);
  const [previewAction, setPreviewAction] = useState<AgentAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(isDemo || isCopyTrade);

  const generateActions = useCallback(async () => {
    if (!publicKey || !connected) return;
    setLoading(true);
    try {
      const walletState = await getWalletState(publicKey.toString(), NETWORK);
      const settings = loadSettings();
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletState,
          actionsModel: settings.actionsModel,
          anthropicApiKey: settings.anthropicApiKey || undefined,
          defiProtocols: settings.defiProtocols,
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.actions?.length > 0) {
        setActions(data.actions);
        setAiGenerated(true);
        // Log to persistent action history
        for (const a of data.actions) {
          logAction({
            id: a.id,
            timestamp: new Date().toISOString(),
            type: a.type,
            title: a.title,
            outcome: 'proposed',
            protocol: a.details?.protocol,
            amount: a.details?.amount,
          });
        }
      }
    } catch {
      setActions([{
        id: 'error',
        type: 'alert',
        title: 'Action generation failed',
        description: 'Aurora couldn\'t analyze your wallet right now. Tap refresh to try again.',
        details: { reasoning: 'There was an error connecting to the AI service. This is usually temporary.', risk: 'low' },
        status: 'pending',
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected]);

  useEffect(() => {
    if (connected && publicKey && !aiGenerated) {
      generateActions();
    }
  }, [connected, publicKey, aiGenerated, generateActions]);

  const handleApprove = async (id: string) => {
    const action = actions.find((a) => a.id === id);
    if (!action) return;

    const isExecutable = (action.type === 'stake' || action.type === 'swap' || action.type === 'transfer') &&
      action.details.amount;

    // Show preview modal for executable actions (unless already confirmed)
    if (isExecutable && !previewAction) {
      setPreviewAction(action);
      return;
    }
    // Clear preview if it was set
    setPreviewAction(null);

    if (isExecutable) {
      setExecuting(id);
      try {
        const connection = new Connection(getRpcUrl(NETWORK), 'confirmed');

        // Pre-flight: validate balance before attempting transaction
        if (action.details.amount && publicKey) {
          const lamports = await connection.getBalance(publicKey);
          const solBalance = lamports / LAMPORTS_PER_SOL;
          const requiredAmount = action.details.amount + 0.01; // amount + gas buffer
          if (solBalance < requiredAmount) {
            throw new Error(
              `Insufficient SOL: need ${requiredAmount.toFixed(4)} SOL (${action.details.amount} + gas) but wallet has ${solBalance.toFixed(4)} SOL`
            );
          }
        }

        const outputMint = resolveOutputMint(action.type, action.details.recipient);

        let sig: string;
        if (outputMint && action.type !== 'transfer') {
          // Use Jupiter swap for staking (SOL→jitoSOL etc) and swaps (SOL→USDC)
          const { transaction: swapTx } = await getJupiterSwapTx(
            publicKey!.toString(),
            SOL_MINT,
            outputMint,
            action.details.amount!,
          );
          sig = await sendTransaction(swapTx, connection);
        } else if (action.details.recipient) {
          // Plain SOL transfer
          const tx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: publicKey!,
              toPubkey: new PublicKey(action.details.recipient),
              lamports: Math.floor(action.details.amount! * LAMPORTS_PER_SOL),
            })
          );
          sig = await sendTransaction(tx, connection);
        } else {
          throw new Error('No recipient or output mint for this action');
        }

        await connection.confirmTransaction(sig, 'confirmed');
        setTxResult({ success: true, sig });
        setActions((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'executed' } : a))
        );
        updateActionOutcome(id, 'executed', sig);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        // User-friendly error messages
        let displayError = errorMsg;
        if (errorMsg.includes('Insufficient SOL')) {
          displayError = errorMsg; // Already user-friendly
        } else if (errorMsg.includes('User rejected')) {
          displayError = 'Transaction cancelled — you rejected the signing request.';
        } else if (errorMsg.includes('blockhash')) {
          displayError = 'Transaction expired. Please try again.';
        } else if (errorMsg.includes('0x1')) {
          displayError = 'Insufficient funds for this transaction.';
        } else if (errorMsg.includes('slippage')) {
          displayError = 'Price moved too much (slippage exceeded). Try again with a smaller amount.';
        }
        setTxResult({ success: false, error: displayError });
      } finally {
        setExecuting(null);
      }
    } else {
      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
      );
      updateActionOutcome(id, 'approved');
    }
  };

  const handleReject = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
    );
    updateActionOutcome(id, 'rejected');
  };

  const handleRefresh = () => {
    setAiGenerated(false);
    setTxResult(null);
    setActions(FALLBACK_ACTIONS);
    generateActions();
  };

  const pendingCount = actions.filter((a) => a.status === 'pending').length;
  const executedCount = actions.filter((a) => a.status === 'executed').length;

  return (
    <div className="safe-top px-4 pt-6 pb-4">
      {/* Copy Trade Banner */}
      {isCopyTrade && (
        <div className="mb-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 p-3 flex items-start gap-2">
          <ArrowRightLeft className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-400 text-xs font-semibold">Copy Trade Mode</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Mirroring {copyWallet.slice(0, 6)}…{copyWallet.slice(-4)} — {copyToken} trade pre-loaded below.
              High risk: verify before approving.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-yellow-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-white font-semibold">Agent Actions</h1>
          <p className="text-gray-400 text-xs">
            {loading
              ? 'Aurora is analyzing your wallet...'
              : isCopyTrade
              ? `Copy trade ready — review before approving`
              : isDemo
              ? `${pendingCount} demo action${pendingCount !== 1 ? 's' : ''} — AI-generated proposals`
              : aiGenerated
              ? `${pendingCount} pending · ${executedCount} executed — personalized for your wallet`
              : `${pendingCount} action${pendingCount !== 1 ? 's' : ''} waiting for approval`}
          </p>
          <p className="text-gray-600 text-xs mt-0.5">
            Rates are estimates. Verify current APYs before approving.
          </p>
        </div>
        {(connected || isDemo) && !loading && (
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            title="Regenerate actions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="glass rounded-2xl p-6 mb-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <div className="w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Aurora is thinking...</p>
            <p className="text-gray-400 text-xs mt-0.5">Analyzing portfolio, checking DeFi yields, generating proposals</p>
          </div>
        </div>
      )}

      {txResult && (
        <div className={clsx(
          'rounded-2xl p-4 mb-4 flex items-start gap-3',
          txResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
        )}>
          {txResult.success ? (
            <>
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 font-medium text-sm">Transaction executed on-chain!</p>
                {txResult.sig && (
                  <a
                    href={`https://solscan.io/tx/${txResult.sig}${getSolscanCluster(NETWORK)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-300/70 underline mt-1 block"
                  >
                    View on Solscan →
                  </a>
                )}
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">Transaction failed</p>
                {txResult.error && (
                  <p className="text-red-300/60 text-xs mt-0.5">{txResult.error.slice(0, 100)}</p>
                )}
              </div>
            </>
          )}
          <button onClick={() => setTxResult(null)} aria-label="Dismiss" className="ml-auto text-gray-500 text-lg leading-none">×</button>
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              action={executing === action.id ? { ...action, status: 'approved' } : action}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {!loading && actions.every((a) => a.status !== 'pending') && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-semibold">All actions reviewed!</p>
          <p className="text-gray-400 text-sm mt-1">
            {executedCount > 0
              ? `${executedCount} transaction${executedCount !== 1 ? 's' : ''} executed on-chain.`
              : 'Aurora will generate new proposals when your portfolio changes.'}
          </p>
          {(connected || isDemo) && (
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors"
            >
              Generate new actions
            </button>
          )}
        </div>
      )}

      {/* Transaction Preview Modal */}
      {previewAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl border-t border-gray-700/50 p-6 animate-[fadeUp_0.2s_ease-out]">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-5" />
            <h3 className="text-white text-lg font-bold mb-4">Confirm Transaction</h3>

            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Action</span>
                <span className="text-white font-medium capitalize">{previewAction.type}</span>
              </div>
              {previewAction.details.amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-white font-medium">{previewAction.details.amount} SOL</span>
                </div>
              )}
              {previewAction.details.protocol && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Protocol</span>
                  <span className="text-white font-medium">{previewAction.details.protocol}</span>
                </div>
              )}
              {previewAction.details.expectedApy && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Expected APY</span>
                  <span className="text-emerald-400 font-medium">{previewAction.details.expectedApy}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Est. Fee</span>
                <span className="text-white font-medium">{previewAction.details.estimatedGas ?? '~0.000005 SOL'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Risk</span>
                <RiskBadge risk={(previewAction.details.risk as 'low' | 'medium' | 'high') ?? 'medium'} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Slippage</span>
                <span className="text-white font-medium">0.5%</span>
              </div>
            </div>

            <p className="text-gray-500 text-xs mb-3 leading-relaxed">
              {previewAction.details.reasoning?.slice(0, 150)}
            </p>

            <div className="flex items-start gap-2 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-200/60 text-[10px] leading-relaxed">
                Not financial advice. Rates are estimates. You are responsible for verifying all details before signing.
              </p>
            </div>

            <SlideToConfirm
              onConfirm={() => handleApprove(previewAction.id)}
              label="Slide to sign"
              confirmedLabel="Signed!"
            />
            <button
              onClick={() => setPreviewAction(null)}
              className="w-full mt-3 py-2.5 text-sm text-gray-400 hover:text-gray-300 transition-colors text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
