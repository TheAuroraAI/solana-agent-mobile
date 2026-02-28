'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey, Connection } from '@solana/web3.js';
import {
  Zap, CheckCircle, XCircle, Clock, Send, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { clsx } from 'clsx';

type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed';

interface AgentAction {
  id: string;
  type: 'transfer' | 'alert' | 'analysis';
  title: string;
  description: string;
  details: {
    reasoning: string;
    risk: 'low' | 'medium' | 'high';
    estimatedGas?: string;
    recipient?: string;
    amount?: number;
  };
  status: ActionStatus;
  createdAt: Date;
}

const DEMO_ACTIONS: AgentAction[] = [
  {
    id: '1',
    type: 'analysis',
    title: 'Portfolio Rebalance Opportunity',
    description: 'Aurora detected your portfolio is 100% SOL. Consider diversifying 20% into stablecoins for reduced volatility.',
    details: {
      reasoning: 'Single-asset portfolios have high volatility. Allocating 20% to USDC would reduce portfolio risk by approximately 30% while maintaining SOL upside exposure.',
      risk: 'low',
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    type: 'alert',
    title: 'SOL Price Alert Setup',
    description: 'Set an automatic alert when SOL price drops below $130 to DCA into position.',
    details: {
      reasoning: 'Based on your portfolio size, accumulating more SOL at $130 would be a strategic entry point supported by the 200-day moving average.',
      risk: 'low',
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 12),
  },
  {
    id: '3',
    type: 'transfer',
    title: 'Test Transfer (0.001 SOL)',
    description: 'Execute a test transfer to verify the wallet signing flow works correctly.',
    details: {
      reasoning: 'Verifying on-chain transaction capability. This is a micro-transaction to confirm Phantom signing integration works end-to-end.',
      risk: 'low',
      estimatedGas: '~0.000005 SOL',
      recipient: 'GpXHXs5KfzfXbNKcMLNbAMsJsgPsBE7y5GtwVoiuxYvH',
      amount: 0.001,
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 2),
  },
];

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

  const typeIcon = action.type === 'transfer' ? '📤' : action.type === 'alert' ? '🔔' : '📊';

  return (
    <div className={clsx(
      'glass rounded-2xl overflow-hidden',
      action.status === 'rejected' && 'opacity-50'
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">{typeIcon}</span>
            <div>
              <h3 className="text-white font-semibold text-sm">{action.title}</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{action.description}</p>
            </div>
          </div>
          <StatusIcon className={clsx('w-4 h-4 flex-shrink-0 mt-0.5', statusColor)} />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <RiskBadge risk={action.details.risk} />
          {action.details.estimatedGas && (
            <span className="text-xs text-gray-500">Gas: {action.details.estimatedGas}</span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto text-gray-500 hover:text-gray-300 flex items-center gap-1 text-xs"
          >
            Reasoning
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 p-3 bg-gray-900/50 rounded-xl">
            <p className="text-gray-300 text-xs leading-relaxed">{action.details.reasoning}</p>
            {action.details.recipient && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-gray-500 text-xs">To:</span>
                <span className="text-gray-300 text-xs font-mono">
                  {action.details.recipient.slice(0, 8)}...{action.details.recipient.slice(-4)}
                </span>
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
            onClick={() => onApprove(action.id)}
            className="flex-1 py-3 text-sm text-emerald-400 hover:bg-emerald-500/5 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            {action.type === 'transfer' ? 'Sign & Send' : 'Approve'}
          </button>
        </div>
      )}
    </div>
  );
}

export function ActionsView() {
  const { publicKey, sendTransaction } = useWallet();
  const [actions, setActions] = useState<AgentAction[]>(DEMO_ACTIONS);
  const [executing, setExecuting] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<{ success: boolean; sig?: string } | null>(null);

  const handleApprove = async (id: string) => {
    const action = actions.find((a) => a.id === id);
    if (!action) return;

    if (action.type === 'transfer' && action.details.recipient && action.details.amount) {
      // Execute on-chain transfer
      setExecuting(id);
      try {
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey!,
            toPubkey: new PublicKey(action.details.recipient),
            lamports: Math.floor(action.details.amount * LAMPORTS_PER_SOL),
          })
        );
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, 'confirmed');
        setTxResult({ success: true, sig });
        setActions((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'executed' } : a))
        );
      } catch (err) {
        console.error('Transaction failed:', err);
        setTxResult({ success: false });
        setActions((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'pending' } : a))
        );
      } finally {
        setExecuting(null);
      }
    } else {
      // Mark as approved (no on-chain action)
      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
      );
    }
  };

  const handleReject = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
    );
  };

  const pendingCount = actions.filter((a) => a.status === 'pending').length;

  return (
    <div className="safe-top px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-white font-semibold">Pending Actions</h1>
          <p className="text-gray-400 text-xs">
            {pendingCount} action{pendingCount !== 1 ? 's' : ''} waiting for approval
          </p>
        </div>
      </div>

      {txResult && (
        <div className={clsx(
          'rounded-2xl p-4 mb-4 flex items-start gap-3',
          txResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
        )}>
          {txResult.success ? (
            <>
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 font-medium text-sm">Transaction executed!</p>
                {txResult.sig && (
                  <a
                    href={`https://solscan.io/tx/${txResult.sig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-300/70 underline mt-1 block"
                  >
                    View on Solscan
                  </a>
                )}
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">Transaction failed. Please try again.</p>
            </>
          )}
          <button onClick={() => setTxResult(null)} className="ml-auto text-gray-500 text-lg">×</button>
        </div>
      )}

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

      {actions.every((a) => a.status !== 'pending') && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-semibold">All caught up!</p>
          <p className="text-gray-400 text-sm mt-1">Aurora will notify you when new actions are ready.</p>
        </div>
      )}
    </div>
  );
}
