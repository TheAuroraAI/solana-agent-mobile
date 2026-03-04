'use client';

import { useState, useEffect } from 'react';
import {
  Landmark, ArrowRightLeft, ChevronRight, TrendingUp, Info, ShieldCheck, Smartphone, ExternalLink, ChevronDown, RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { SKR_STAKING_URL, SKR_STAKING_APY } from '@/lib/solana';

interface YieldOpportunity {
  protocol: string;
  strategy: string;
  asset: string;
  apy: number;
  tvl: string;
  risk: 'low' | 'medium' | 'high';
  type: 'staking' | 'lending' | 'lp';
  description: string;
  source?: 'live' | 'fallback';
}

const FALLBACK_OPPORTUNITIES: YieldOpportunity[] = [
  {
    protocol: 'Jito',
    strategy: 'Liquid Staking',
    asset: 'SOL → jitoSOL',
    apy: 7.5,
    tvl: '$2.1B',
    risk: 'low',
    type: 'staking',
    description: 'Stake SOL, receive jitoSOL. Earn staking rewards + MEV tips. Fully liquid — swap back via Jupiter anytime.',
  },
  {
    protocol: 'Marinade',
    strategy: 'Liquid Staking',
    asset: 'SOL → mSOL',
    apy: 7.2,
    tvl: '$1.4B',
    risk: 'low',
    type: 'staking',
    description: 'Delegate SOL across 400+ validators for decentralized staking yield. mSOL is tradeable on any DEX.',
  },
  {
    protocol: 'Kamino',
    strategy: 'USDC Lending',
    asset: 'USDC',
    apy: 11.3,
    tvl: '$890M',
    risk: 'medium',
    type: 'lending',
    description: 'Lend USDC to borrowers on Kamino. Variable rate, auto-compounds. Withdraw anytime.',
  },
  {
    protocol: 'Jupiter',
    strategy: 'JLP Vault',
    asset: 'SOL/USDC/ETH',
    apy: 28.4,
    tvl: '$650M',
    risk: 'high',
    type: 'lp',
    description: 'Provide liquidity to Jupiter perpetuals trading. High yield from trading fees + funding rate payments.',
  },
  {
    protocol: 'Drift',
    strategy: 'USDC Vault',
    asset: 'USDC',
    apy: 14.7,
    tvl: '$420M',
    risk: 'medium',
    type: 'lending',
    description: 'Deposit USDC into Drift lending market. Auto-compounds hourly. Audited by OtterSec.',
  },
];

const typeIcons = {
  staking: Landmark,
  lending: ShieldCheck,
  lp: ArrowRightLeft,
};

export function YieldBoard() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [skrExpanded, setSkrExpanded] = useState(false);
  const [opportunities, setOpportunities] = useState<YieldOpportunity[]>(FALLBACK_OPPORTUNITIES);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [usingFallback, setUsingFallback] = useState(false);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/yields');
      if (res.ok) {
        const data = await res.json();
        if (data.rates?.length > 0) {
          setOpportunities(data.rates);
          setLastUpdated(data.lastUpdated);
          setUsingFallback(false);
        }
      } else {
        setUsingFallback(true);
      }
    } catch {
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
          Yield Opportunities
        </h2>
        <div className="flex items-center gap-2">
          {lastUpdated ? (
            <span className="text-gray-600 text-xs">
              Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : usingFallback ? (
            <span className="text-amber-500/70 text-xs">Cached rates</span>
          ) : null}
          <button
            onClick={fetchRates}
            disabled={loading}
            className="text-gray-600 hover:text-gray-400 transition-colors"
            title="Refresh rates"
          >
            <RefreshCw className={clsx('w-3 h-3', loading && 'animate-spin')} />
          </button>
          <div className="flex items-center gap-1 text-gray-600 text-xs">
            <Info className="w-3 h-3" />
            <span>APYs are estimates</span>
          </div>
        </div>
      </div>
      {/* SKR Guardian Staking — featured Solana Mobile integration */}
      <div className="mb-3 rounded-2xl overflow-hidden border border-violet-500/30 bg-gradient-to-br from-violet-900/30 to-indigo-900/20">
        <button
          onClick={() => setSkrExpanded(!skrExpanded)}
          className="w-full text-left"
        >
          <div className="flex items-center gap-3 p-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">Solana Mobile</span>
                <span className="text-xs bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full font-medium">SKR</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">Featured</span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">Guardian Staking · Supports Seeker ecosystem</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 text-violet-400">
                <TrendingUp className="w-3 h-3" />
                <span className="text-sm font-bold">{SKR_STAKING_APY}%</span>
              </div>
              <span className="text-gray-600 text-xs">APY</span>
            </div>
            <ChevronDown className={clsx('w-4 h-4 text-gray-500 transition-transform flex-shrink-0', skrExpanded && 'rotate-180')} />
          </div>
        </button>
        <div className="px-3 pb-2.5">
          <p className="text-gray-400 text-xs leading-relaxed">
            Stake SKR and delegate to a Guardian to secure the Solana Mobile network.
            Earn compounding rewards while supporting dApp verification on Seeker devices.
          </p>
        </div>
        {skrExpanded && (
          <div className="px-3 pb-3 space-y-2">
            <div className="p-2.5 bg-gray-900/50 rounded-xl space-y-2">
              <h4 className="text-violet-300 text-xs font-semibold">How Guardian Staking Works</h4>
              <ul className="text-gray-400 text-xs leading-relaxed space-y-1">
                <li className="flex gap-2"><span className="text-violet-400">1.</span> Acquire SKR tokens (from Seeker airdrop or Jupiter swap)</li>
                <li className="flex gap-2"><span className="text-violet-400">2.</span> Delegate SKR to a Guardian validator on stake.solanamobile.com</li>
                <li className="flex gap-2"><span className="text-violet-400">3.</span> Guardians verify dApps in the Solana Mobile dApp Store</li>
                <li className="flex gap-2"><span className="text-violet-400">4.</span> Earn ~{SKR_STAKING_APY}% APY in compounding SKR rewards</li>
              </ul>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-800/50">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span className="text-gray-400 text-xs">Low risk</span>
                </div>
                <span className="text-gray-700">·</span>
                <span className="text-gray-400 text-xs">48h cooldown to unstake</span>
                <span className="text-gray-700">·</span>
                <span className="text-gray-400 text-xs">Mint: SKRb…hW3</span>
              </div>
            </div>
            <a
              href={SKR_STAKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-white text-sm font-medium"
            >
              <Smartphone className="w-4 h-4" />
              Stake SKR on Solana Mobile
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {opportunities.map((opp) => {
          const Icon = typeIcons[opp.type];
          const isExpanded = expanded === opp.protocol;
          return (
            <button
              key={opp.protocol}
              onClick={() => setExpanded(isExpanded ? null : opp.protocol)}
              className="w-full text-left glass rounded-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3">
                <div
                  className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    opp.risk === 'low' && 'bg-emerald-500/15',
                    opp.risk === 'medium' && 'bg-yellow-500/15',
                    opp.risk === 'high' && 'bg-orange-500/15'
                  )}
                >
                  <Icon
                    className={clsx(
                      'w-4 h-4',
                      opp.risk === 'low' && 'text-emerald-400',
                      opp.risk === 'medium' && 'text-yellow-400',
                      opp.risk === 'high' && 'text-orange-400'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{opp.protocol}</span>
                    <span className="text-gray-500 text-xs">·</span>
                    <span className="text-gray-400 text-xs">{opp.strategy}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{opp.asset}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-sm font-bold">{opp.apy}%</span>
                    {opp.source === 'live' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live rate" />
                    )}
                  </div>
                  <span className="text-gray-600 text-xs">TVL {opp.tvl}</span>
                </div>
                <ChevronRight
                  className={clsx(
                    'w-4 h-4 text-gray-600 transition-transform flex-shrink-0',
                    isExpanded && 'rotate-90'
                  )}
                />
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 pt-0">
                  <div className="p-2.5 bg-gray-900/50 rounded-xl">
                    <p className="text-gray-300 text-xs leading-relaxed">{opp.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={clsx(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          opp.risk === 'low' && 'bg-emerald-500/20 text-emerald-400',
                          opp.risk === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                          opp.risk === 'high' && 'bg-orange-500/20 text-orange-400'
                        )}
                      >
                        {opp.risk} risk
                      </span>
                      <span className="text-gray-600 text-xs">TVL {opp.tvl}</span>
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
