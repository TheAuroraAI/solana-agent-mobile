'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Landmark, ArrowRightLeft, ChevronRight, TrendingUp, Info, ShieldCheck, Smartphone, ExternalLink, ChevronDown, RefreshCw, Calculator, Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { SKR_STAKING_URL, SKR_STAKING_APY } from '@/lib/solana';

interface Guardian {
  name: string;
  address: string;
  commission: number;
  delegated: string;
  uptime: number;
  appsVerified: number;
  rank: number;
}

// Top Guardian validators — illustrative data based on Solana Mobile Guardian program
const GUARDIANS: Guardian[] = [
  { name: 'Helius Guardian', address: 'HeLiUS3...xB9', commission: 5, delegated: '12.4M SKR', uptime: 99.9, appsVerified: 847, rank: 1 },
  { name: 'Triton Guardian', address: 'Tri7oN1...mK2', commission: 7, delegated: '9.8M SKR', uptime: 99.8, appsVerified: 621, rank: 2 },
  { name: 'Solana FM', address: 'SoFM77...pX4', commission: 8, delegated: '8.2M SKR', uptime: 99.7, appsVerified: 502, rank: 3 },
  { name: 'Figment', address: 'Fig3nt...wQ1', commission: 10, delegated: '6.1M SKR', uptime: 99.6, appsVerified: 388, rank: 4 },
  { name: 'P2P Guardian', address: 'P2PGd...rL8', commission: 6, delegated: '5.9M SKR', uptime: 99.5, appsVerified: 274, rank: 5 },
];

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

function GuardianSelector() {
  const [selected, setSelected] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'rank' | 'commission' | 'uptime'>('rank');

  const sorted = [...GUARDIANS].sort((a, b) => {
    if (sortBy === 'commission') return a.commission - b.commission;
    if (sortBy === 'uptime') return b.uptime - a.uptime;
    return a.rank - b.rank;
  });

  return (
    <div className="p-2.5 bg-gray-900/50 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-violet-400" />
          <h4 className="text-violet-300 text-xs font-semibold">Choose a Guardian</h4>
        </div>
        <div className="flex gap-1">
          {(['rank', 'commission', 'uptime'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded-md transition-colors',
                sortBy === s ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'
              )}
            >
              {s === 'rank' ? 'Top' : s === 'commission' ? 'Fee↑' : 'Uptime↑'}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {sorted.map((g) => (
          <button
            key={g.address}
            onClick={() => setSelected(selected === g.rank ? null : g.rank)}
            className={clsx(
              'w-full text-left rounded-lg p-2 transition-all border',
              selected === g.rank
                ? 'bg-violet-900/40 border-violet-500/50'
                : 'bg-gray-800/60 border-gray-700/30 hover:border-gray-600/50'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600 w-3">#{g.rank}</span>
                <div>
                  <span className="text-white text-xs font-medium">{g.name}</span>
                  <div className="text-gray-600 text-[10px] font-mono">{g.address}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-violet-300 text-xs font-semibold">{g.commission}% fee</div>
                <div className="text-gray-500 text-[10px]">{g.uptime}% up</div>
              </div>
            </div>
            {selected === g.rank && (
              <div className="mt-2 pt-2 border-t border-gray-700/50 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-violet-300 text-xs font-bold">{g.delegated}</div>
                  <div className="text-gray-600 text-[10px]">Delegated</div>
                </div>
                <div>
                  <div className="text-emerald-400 text-xs font-bold">{g.appsVerified}</div>
                  <div className="text-gray-600 text-[10px]">Apps verified</div>
                </div>
                <div>
                  <div className="text-violet-300 text-xs font-bold">{(SKR_STAKING_APY * (1 - g.commission / 100)).toFixed(1)}%</div>
                  <div className="text-gray-600 text-[10px]">Net APY</div>
                </div>
                <a
                  href={`${SKR_STAKING_URL}?validator=${g.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="col-span-3 mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-white text-xs font-medium"
                >
                  Delegate to {g.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="text-gray-700 text-[10px]">Data illustrative — verify on stake.solanamobile.com</p>
    </div>
  );
}

function SkrRewardsCalculator() {
  const [skrAmount, setSkrAmount] = useState('1000');

  const amount = Math.max(0, parseFloat(skrAmount) || 0);
  const apy = SKR_STAKING_APY / 100;

  const calcRewards = useCallback((principal: number, months: number) => {
    // Compound monthly
    const r = apy / 12;
    return principal * Math.pow(1 + r, months) - principal;
  }, [apy]);

  const rewards1m = calcRewards(amount, 1);
  const rewards3m = calcRewards(amount, 3);
  const rewards1y = calcRewards(amount, 12);

  return (
    <div className="p-2.5 bg-gray-900/50 rounded-xl space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Calculator className="w-3.5 h-3.5 text-violet-400" />
        <h4 className="text-violet-300 text-xs font-semibold">Rewards Calculator</h4>
      </div>
      <div>
        <label className="text-gray-500 text-xs mb-1 block">Your SKR amount</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={skrAmount}
            onChange={(e) => setSkrAmount(e.target.value)}
            min="0"
            placeholder="1000"
            className="flex-1 bg-gray-800/80 border border-gray-700/50 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500/50 w-full"
          />
          <span className="text-gray-400 text-xs font-medium flex-shrink-0">SKR</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: '1 month', rewards: rewards1m },
          { label: '3 months', rewards: rewards3m },
          { label: '1 year', rewards: rewards1y },
        ].map(({ label, rewards }) => (
          <div key={label} className="bg-violet-900/20 border border-violet-800/30 rounded-lg p-2 text-center">
            <div className="text-violet-300 text-xs font-bold">
              +{rewards < 1 ? rewards.toFixed(3) : rewards.toFixed(1)}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">SKR</div>
            <div className="text-gray-600 text-[10px] mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <p className="text-gray-600 text-[10px]">
        Based on {SKR_STAKING_APY}% APY, compounded monthly. Actual rewards may vary.
      </p>
    </div>
  );
}

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
            <GuardianSelector />
            <SkrRewardsCalculator />
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
