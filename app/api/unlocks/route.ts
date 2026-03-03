import { NextResponse } from 'next/server';

interface TokenUnlock {
  id: string;
  token: string;
  symbol: string;
  date: string; // ISO date
  amount: number;
  amountUsd: number;
  pctSupply: number;
  category: 'team' | 'investor' | 'ecosystem' | 'community' | 'treasury';
  impact: 'high' | 'medium' | 'low';
  description: string;
}

function generateUnlocks(): TokenUnlock[] {
  const now = new Date();
  const unlocks: TokenUnlock[] = [
    {
      id: 'jup-mar-7',
      token: 'Jupiter',
      symbol: 'JUP',
      date: new Date(now.getTime() + 4 * 86400000).toISOString(),
      amount: 125_000_000,
      amountUsd: 112_500_000,
      pctSupply: 1.8,
      category: 'team',
      impact: 'high',
      description: 'Team & advisor vesting unlock. 125M JUP entering circulation.',
    },
    {
      id: 'pyth-mar-10',
      token: 'Pyth Network',
      symbol: 'PYTH',
      date: new Date(now.getTime() + 7 * 86400000).toISOString(),
      amount: 250_000_000,
      amountUsd: 87_500_000,
      pctSupply: 1.6,
      category: 'ecosystem',
      impact: 'medium',
      description: 'Publisher rewards & ecosystem grants unlock.',
    },
    {
      id: 'wif-mar-12',
      token: 'dogwifhat',
      symbol: 'WIF',
      date: new Date(now.getTime() + 9 * 86400000).toISOString(),
      amount: 50_000_000,
      amountUsd: 42_500_000,
      pctSupply: 5.1,
      category: 'community',
      impact: 'high',
      description: 'Community airdrop claim window opens. 5.1% of supply.',
    },
    {
      id: 'render-mar-15',
      token: 'Render',
      symbol: 'RENDER',
      date: new Date(now.getTime() + 12 * 86400000).toISOString(),
      amount: 8_000_000,
      amountUsd: 56_000_000,
      pctSupply: 1.5,
      category: 'investor',
      impact: 'medium',
      description: 'Series B investor tokens vest. 6-month cliff completed.',
    },
    {
      id: 'bonk-mar-20',
      token: 'BONK',
      symbol: 'BONK',
      date: new Date(now.getTime() + 17 * 86400000).toISOString(),
      amount: 2_000_000_000_000,
      amountUsd: 28_000_000,
      pctSupply: 2.9,
      category: 'treasury',
      impact: 'low',
      description: 'DAO treasury allocation for ecosystem incentives.',
    },
    {
      id: 'jto-mar-22',
      token: 'Jito',
      symbol: 'JTO',
      date: new Date(now.getTime() + 19 * 86400000).toISOString(),
      amount: 15_000_000,
      amountUsd: 45_000_000,
      pctSupply: 1.3,
      category: 'team',
      impact: 'medium',
      description: 'Core contributor vesting. Quarterly unlock schedule.',
    },
    {
      id: 'hnt-mar-25',
      token: 'Helium',
      symbol: 'HNT',
      date: new Date(now.getTime() + 22 * 86400000).toISOString(),
      amount: 3_000_000,
      amountUsd: 18_000_000,
      pctSupply: 1.9,
      category: 'ecosystem',
      impact: 'low',
      description: 'Network emissions & hotspot rewards distribution.',
    },
    {
      id: 'sol-apr-1',
      token: 'Solana',
      symbol: 'SOL',
      date: new Date(now.getTime() + 29 * 86400000).toISOString(),
      amount: 5_000_000,
      amountUsd: 700_000_000,
      pctSupply: 0.8,
      category: 'investor',
      impact: 'high',
      description: 'Foundation + early investor unlock. Major supply event.',
    },
  ];

  return unlocks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function GET() {
  const unlocks = generateUnlocks();

  const totalValueLocked = unlocks.reduce((s, u) => s + u.amountUsd, 0);
  const highImpact = unlocks.filter(u => u.impact === 'high').length;

  return NextResponse.json({
    unlocks,
    stats: {
      totalEvents: unlocks.length,
      totalValueUsd: totalValueLocked,
      highImpactCount: highImpact,
      nextUnlock: unlocks[0]?.date ?? null,
    },
  });
}
