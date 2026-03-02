'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, TrendingUp, ArrowUpRight, ArrowDownLeft, Copy, Check, ExternalLink, FlaskConical } from 'lucide-react';
import { clsx } from 'clsx';
import {
  type WalletState,
  getWalletState,
  getNetwork,
  getSolscanCluster,
  DEMO_WALLET_STATE,
  formatSol,
  formatUsd,
  truncateAddress,
  timeAgo,
} from '@/lib/solana';

const NETWORK = getNetwork();

export function DashboardView() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const [walletState, setWalletState] = useState<WalletState | null>(isDemo ? DEMO_WALLET_STATE : null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchWalletState = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const state = await getWalletState(publicKey.toString(), NETWORK);
      setWalletState(state);
    } catch (err) {
      console.error('Failed to fetch wallet state:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (isDemo) return; // Demo mode: skip wallet check
    if (!connected) {
      router.push('/');
      return;
    }
    fetchWalletState();
  }, [connected, fetchWalletState, router, isDemo]);

  const copyAddress = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!walletState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-top px-4 pt-6 pb-4">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
          <FlaskConical className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <p className="text-violet-300 text-xs">
            Demo mode — sample data.{' '}
            <button onClick={() => router.push('/')} className="underline hover:text-violet-200">
              Connect wallet
            </button>{' '}
            for real data.
          </p>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-xs">Solana Devnet</p>
          <button
            onClick={copyAddress}
            className="flex items-center gap-1.5 text-white font-mono text-sm mt-0.5"
          >
            {truncateAddress(walletState.address)}
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        </div>
        <button
          onClick={fetchWalletState}
          className="p-2 rounded-xl glass text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Balance card */}
      <div className="glass rounded-3xl p-6 mb-4 bg-gradient-to-br from-violet-950/40 to-purple-950/20">
        <p className="text-gray-400 text-xs mb-1">Total Balance</p>
        <div className="text-4xl font-bold text-white mb-1">
          {formatUsd(walletState.solBalanceUsd)}
        </div>
        <div className="flex items-center gap-1.5 text-gray-300">
          <img src="/solana-logo.svg" alt="SOL" className="w-4 h-4" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <span className="text-sm font-medium">{formatSol(walletState.solBalance)}</span>
          <span className="text-emerald-400 text-xs flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            Devnet
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <a
          href={isDemo ? '/chat?demo=true' : '/chat'}
          className="glass rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
            <span className="text-violet-400 text-lg">✦</span>
          </div>
          <span className="text-white text-xs font-medium">Ask Agent</span>
        </a>
        <a
          href={isDemo ? '/actions?demo=true' : '/actions'}
          className="glass rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <span className="text-emerald-400 text-lg">⚡</span>
          </div>
          <span className="text-white text-xs font-medium">Actions</span>
        </a>
      </div>

      {/* Token Holdings */}
      {walletState.tokens.length > 0 && (
        <div className="mb-4">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
            Tokens
          </h2>
          <div className="glass rounded-2xl overflow-hidden">
            {walletState.tokens.map((token, idx) => (
              <div
                key={token.mint}
                className={clsx(
                  'flex items-center justify-between px-4 py-3',
                  idx > 0 && 'border-t border-gray-800/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-300 text-xs">{token.symbol.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{token.symbol}</p>
                    <p className="text-gray-500 text-xs font-mono">{truncateAddress(token.mint)}</p>
                  </div>
                </div>
                <p className="text-white text-sm font-mono">{token.uiAmount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        {walletState.recentTransactions.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm">No recent transactions</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {walletState.recentTransactions.map((tx, idx) => (
              <div
                key={tx.signature}
                className={clsx(
                  'flex items-center justify-between px-4 py-3',
                  idx > 0 && 'border-t border-gray-800/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      tx.status === 'success'
                        ? 'bg-emerald-500/20'
                        : 'bg-red-500/20'
                    )}
                  >
                    {tx.type === 'send' ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{tx.type}</p>
                    <p className="text-gray-500 text-xs">
                      {tx.blockTime ? timeAgo(tx.blockTime) : 'Unknown time'}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://solscan.io/tx/${tx.signature}${getSolscanCluster(NETWORK)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-500 hover:text-gray-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
