'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  RefreshCw, TrendingUp, ArrowUpRight, ArrowDownLeft, Copy, Check, ExternalLink,
  FlaskConical, Sparkles, AlertTriangle, Zap, ArrowRightLeft,
  Calendar, ChevronRight,
} from 'lucide-react';
import { PriceTicker } from './PriceTicker';
import { ActionLogWidget } from './ActionLogWidget';
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
import { detectSeeker, type SeekerInfo } from '@/lib/seeker';
import { Shield } from 'lucide-react';

const NETWORK = getNetwork();

function computeHealthScore(ws: WalletState): { score: number; label: string; color: string } {
  let score = 50;

  // Diversification (+15 if not 100% SOL)
  const totalUsd = ws.solBalanceUsd + ws.tokens.reduce((s, t) => s + t.uiAmount, 0);
  const solPct = totalUsd > 0 ? (ws.solBalanceUsd / totalUsd) * 100 : 100;
  if (solPct <= 70) score += 15;
  else if (solPct <= 85) score += 8;

  // Staking yield (+15 if holding LST)
  const hasLst = ws.tokens.some(t => ['jitoSOL', 'mSOL', 'bSOL', 'SKR', 'stSOL'].includes(t.symbol));
  if (hasLst) score += 15;

  // Stablecoin reserve (+10 if >5%)
  const stableUsd = ws.tokens.filter(t => t.symbol === 'USDC' || t.symbol === 'USDT')
    .reduce((s, t) => s + t.uiAmount, 0);
  const stablePct = totalUsd > 0 ? (stableUsd / totalUsd) * 100 : 0;
  if (stablePct >= 10) score += 10;
  else if (stablePct >= 5) score += 5;

  // Activity (+10 if recent txns)
  if (ws.recentTransactions.length >= 3) score += 10;

  // Clamp
  score = Math.min(100, Math.max(0, score));

  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work';
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-violet-400' : score >= 40 ? 'text-yellow-400' : 'text-orange-400';
  return { score, label, color };
}

function HealthScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-gray-800" />
          <circle
            cx="32" cy="32" r={r} fill="none" strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={clsx(
              'transition-all duration-700',
              score >= 80 ? 'stroke-emerald-400' : score >= 60 ? 'stroke-violet-400' : score >= 40 ? 'stroke-yellow-400' : 'stroke-orange-400'
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('text-sm font-bold', color)}>{score}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Shield className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-white text-sm font-semibold">Portfolio Health</span>
        </div>
        <span className={clsx('text-xs font-semibold', color)}>{label}</span>
        <p className="text-gray-500 text-xs mt-0.5">Based on diversification, yield & activity</p>
      </div>
    </div>
  );
}

function PortfolioInsight({ walletState }: { walletState: WalletState }) {
  const solPct = walletState.tokens.length === 0 ? 100 :
    Math.round((walletState.solBalanceUsd / (walletState.solBalanceUsd +
      walletState.tokens.reduce((sum, t) => {
        if (t.symbol === 'USDC' || t.symbol === 'USDT') return sum + t.uiAmount;
        return sum;
      }, 0))) * 100);

  const stablePct = 100 - solPct;
  const hasStaking = walletState.tokens.some(t =>
    ['jitoSOL', 'mSOL', 'bSOL', 'SKR'].includes(t.symbol));

  // Risk assessment
  let riskLevel: 'low' | 'moderate' | 'high' = 'moderate';
  let riskColor = 'text-yellow-400';
  let riskBg = 'bg-yellow-500/10';
  let insight = '';

  if (solPct >= 90 && !hasStaking) {
    riskLevel = 'high';
    riskColor = 'text-orange-400';
    riskBg = 'bg-orange-500/10';
    insight = `${solPct}% SOL concentration. Consider liquid staking for yield.`;
  } else if (hasStaking && stablePct >= 10) {
    riskLevel = 'low';
    riskColor = 'text-emerald-400';
    riskBg = 'bg-emerald-500/10';
    insight = 'Diversified with staking yield + stablecoin reserve.';
  } else if (solPct >= 70) {
    insight = `${solPct}% SOL exposure. Tap Actions for rebalancing proposals.`;
  } else {
    riskLevel = 'low';
    riskColor = 'text-emerald-400';
    riskBg = 'bg-emerald-500/10';
    insight = 'Well-balanced allocation across assets.';
  }

  return (
    <div className={clsx('glass rounded-2xl p-4 mb-4', riskBg)}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-semibold">Aurora Insight</span>
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', riskBg, riskColor)}>
              {riskLevel} risk
            </span>
          </div>
          <p className="text-gray-300 text-xs leading-relaxed">{insight}</p>
          <p className="text-gray-600 text-xs mt-1.5">
            ⚠️ AI analysis uses estimated rates. Verify current APYs before acting.
          </p>

          {/* Portfolio allocation bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden flex">
              <div
                className="h-full bg-violet-500 rounded-l-full"
                style={{ width: `${solPct}%` }}
              />
              {walletState.tokens.map((t, i) => {
                const tokenColors = ['bg-blue-500', 'bg-emerald-500', 'bg-yellow-500', 'bg-pink-500'];
                return (
                  <div
                    key={t.mint}
                    className={clsx('h-full', tokenColors[i % tokenColors.length])}
                    style={{ width: `${Math.max(stablePct / Math.max(walletState.tokens.length, 1), 2)}%` }}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              SOL {solPct}%
            </span>
            {walletState.tokens.slice(0, 3).map((t) => (
              <span key={t.mint} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {t.symbol}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardView() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const [walletState, setWalletState] = useState<WalletState | null>(isDemo ? DEMO_WALLET_STATE : null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seekerInfo, setSeekerInfo] = useState<SeekerInfo>({ isSeeker: false, features: [] });

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
    setSeekerInfo(detectSeeker());
  }, []);

  useEffect(() => {
    if (isDemo) return;
    if (!connected) {
      router.push('/');
      return;
    }
    fetchWalletState();
  }, [connected, fetchWalletState, router, isDemo]);

  const copyAddress = async () => {
    const addr = publicKey?.toString() ?? walletState?.address;
    if (!addr) return;
    await navigator.clipboard.writeText(addr);
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

      {/* Seeker Device Banner */}
      {seekerInfo.isSeeker && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <span className="text-emerald-400 text-sm flex-shrink-0">📱</span>
          <div>
            <p className="text-emerald-300 text-xs font-medium">
              {seekerInfo.model} detected — enhanced features active
            </p>
            <p className="text-emerald-400/60 text-[10px] mt-0.5">
              {seekerInfo.features.slice(0, 2).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Live Price Ticker */}
      <PriceTicker demo={isDemo} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-400 text-xs">Solana {NETWORK === 'mainnet' ? 'Mainnet' : 'Devnet'}</p>
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
          {formatUsd(walletState.solBalanceUsd + walletState.tokens.reduce((sum, t) => {
            if (t.symbol === 'USDC' || t.symbol === 'USDT') return sum + t.uiAmount;
            return sum;
          }, 0))}
        </div>
        <div className="flex items-center gap-1.5 text-gray-300">
          <span className="text-sm font-medium">{formatSol(walletState.solBalance)}</span>
          {walletState.tokens.length > 0 && (
            <span className="text-gray-500 text-xs">+ {walletState.tokens.length} token{walletState.tokens.length !== 1 ? 's' : ''}</span>
          )}
          <span className={clsx(
            'text-xs flex items-center gap-0.5 ml-auto',
            NETWORK === 'mainnet' ? 'text-emerald-400' : 'text-blue-400'
          )}>
            <TrendingUp className="w-3 h-3" />
            {NETWORK === 'mainnet' ? 'Live' : 'Devnet'}
          </span>
        </div>
      </div>

      {/* Portfolio Health Score */}
      <div className="glass rounded-2xl p-4 mb-4">
        <HealthScoreRing {...computeHealthScore(walletState)} />
      </div>

      {/* Aurora Portfolio Insight */}
      <PortfolioInsight walletState={walletState} />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <a
          href={isDemo ? '/chat?demo=true' : '/chat'}
          className="glass rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
            <Sparkles className="text-violet-400 w-5 h-5" />
          </div>
          <span className="text-white text-xs font-medium">Ask Agent</span>
        </a>
        <a
          href={isDemo ? '/actions?demo=true' : '/actions'}
          className="glass rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <Zap className="text-emerald-400 w-5 h-5" />
          </div>
          <span className="text-white text-xs font-medium">Actions</span>
        </a>
        <a
          href={isDemo ? '/policies?demo=true' : '/policies'}
          className="glass rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Shield className="text-blue-400 w-5 h-5" />
          </div>
          <span className="text-white text-xs font-medium">Policies</span>
        </a>
      </div>

      {/* Token Holdings */}
      {walletState.tokens.length > 0 && (
        <div className="mb-4">
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
            Token Holdings
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
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    token.symbol === 'USDC' || token.symbol === 'USDT' ? 'bg-emerald-500/20' :
                    ['jitoSOL', 'mSOL', 'bSOL'].includes(token.symbol) ? 'bg-violet-500/20' :
                    token.symbol === 'SKR' ? 'bg-violet-500/20' :
                    'bg-gray-700'
                  )}>
                    <span className={clsx(
                      'text-xs font-medium',
                      token.symbol === 'USDC' || token.symbol === 'USDT' ? 'text-emerald-400' :
                      ['jitoSOL', 'mSOL', 'bSOL'].includes(token.symbol) ? 'text-violet-400' :
                      token.symbol === 'SKR' ? 'text-violet-400' :
                      'text-gray-300'
                    )}>
                      {token.symbol.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{token.symbol}</p>
                    <p className="text-gray-500 text-xs font-mono">{truncateAddress(token.mint)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-mono">{token.uiAmount.toFixed(token.uiAmount < 1 ? 4 : 2)}</p>
                  {(token.symbol === 'USDC' || token.symbol === 'USDT') && (
                    <p className="text-gray-500 text-xs">${token.uiAmount.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Unlock Calendar — teaser */}
      <Link href={isDemo ? '/unlocks?demo=true' : '/unlocks'} className="block mb-3">
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Token Unlocks</p>
              <p className="text-gray-400 text-xs">8 upcoming events · tap to explore</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        </div>
      </Link>

      {/* Yield Opportunities — teaser */}
      <Link href={isDemo ? '/yield?demo=true' : '/yield'} className="block mb-3">
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Yield Opportunities</p>
              <p className="text-gray-400 text-xs">Up to 28.4% APY · 5 protocols</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        </div>
      </Link>

      {/* Agent Action Log */}
      <div className="mb-4">
        <ActionLogWidget />
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        {walletState.recentTransactions.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm">No recent transactions</p>
            <p className="text-gray-600 text-xs mt-1">Transactions will appear here after your first on-chain action</p>
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
                        ? tx.type === 'send' ? 'bg-orange-500/20' :
                          tx.type === 'swap' ? 'bg-blue-500/20' :
                          'bg-emerald-500/20'
                        : 'bg-red-500/20'
                    )}
                  >
                    {tx.type === 'send' ? (
                      <ArrowUpRight className="w-4 h-4 text-orange-400" />
                    ) : tx.type === 'receive' ? (
                      <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    ) : tx.type === 'swap' ? (
                      <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                    ) : tx.status === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{tx.type}</p>
                    <p className="text-gray-500 text-xs">
                      {tx.blockTime ? timeAgo(tx.blockTime) : 'Unknown time'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {tx.amount != null && (
                    <div className="text-right">
                      <p className={clsx(
                        'text-sm font-mono font-medium',
                        tx.type === 'send' ? 'text-orange-400' :
                        tx.type === 'receive' ? 'text-emerald-400' :
                        'text-gray-300'
                      )}>
                        {tx.type === 'send' ? '-' : tx.type === 'receive' ? '+' : ''}
                        {tx.amount < 1 ? tx.amount.toFixed(4) : tx.amount.toLocaleString()} {tx.token ?? 'SOL'}
                      </p>
                    </div>
                  )}
                  <a
                    href={`https://solscan.io/tx/${tx.signature}${getSolscanCluster(NETWORK)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-500 hover:text-gray-300 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
