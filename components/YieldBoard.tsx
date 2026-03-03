'use client';

import { useState } from 'react';
import {
  Landmark, ArrowRightLeft, ChevronRight, TrendingUp, Info, ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

interface YieldOpportunity {
  protocol: string;
  strategy: string;
  asset: string;
  apy: number;
  tvl: string;
  risk: 'low' | 'medium' | 'high';
  type: 'staking' | 'lending' | 'lp';
  description: string;
}

const YIELD_OPPORTUNITIES: YieldOpportunity[] = [
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

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
          Yield Opportunities
        </h2>
        <div className="flex items-center gap-1 text-gray-600 text-xs">
          <Info className="w-3 h-3" />
          <span>APYs are estimates</span>
        </div>
      </div>
      <div className="space-y-2">
        {YIELD_OPPORTUNITIES.map((opp) => {
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
