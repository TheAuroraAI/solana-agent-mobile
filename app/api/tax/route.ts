import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaxEventType =
  | 'sale'
  | 'purchase'
  | 'defi_income'
  | 'airdrop'
  | 'staking_reward'
  | 'transfer';

export type HoldingType = 'short_term' | 'long_term';

export interface TaxEvent {
  id: string;
  type: TaxEventType;
  date: string;
  token: string;
  logo: string;
  amount: number;
  costBasis: number;   // USD
  proceeds: number;    // USD
  gainLoss: number;    // USD
  holdingType: HoldingType;
  txHash: string;
}

export interface TaxSummary {
  year: number;
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  netShortTerm: number;
  netLongTerm: number;
  totalNetGain: number;
  defiIncome: number;
  stakingRewards: number;
  airdrops: number;
  totalTaxableIncome: number;
  estimatedTaxOwed: number; // rough estimate at 25% effective rate
  eventCount: number;
}

export interface TaxData {
  year: number;
  summary: TaxSummary;
  events: TaxEvent[];
  byToken: { token: string; logo: string; netGain: number; eventCount: number }[];
  taxBracketNote: string;
  disclaimer: string;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Mock data builder
// ---------------------------------------------------------------------------

function buildMockData(year: number): TaxData {
  const events: TaxEvent[] = [
    {
      id: 'ev-001',
      type: 'sale',
      date: `${year}-01-14`,
      token: 'SOL',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      amount: 10,
      costBasis: 850.0,
      proceeds: 1420.0,
      gainLoss: 570.0,
      holdingType: 'long_term',
      txHash: '4xK2mP...qNwR',
    },
    {
      id: 'ev-002',
      type: 'sale',
      date: `${year}-02-22`,
      token: 'JTO',
      logo: 'https://storage.googleapis.com/token-list-jpgstoreio/jto.png',
      amount: 150,
      costBasis: 540.0,
      proceeds: 405.0,
      gainLoss: -135.0,
      holdingType: 'short_term',
      txHash: '7bZ9qA...mLvK',
    },
    {
      id: 'ev-003',
      type: 'staking_reward',
      date: `${year}-03-08`,
      token: 'SOL',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      amount: 0.85,
      costBasis: 0,
      proceeds: 118.75,
      gainLoss: 118.75,
      holdingType: 'short_term',
      txHash: '2nX8wE...pQtY',
    },
    {
      id: 'ev-004',
      type: 'airdrop',
      date: `${year}-04-01`,
      token: 'BONK',
      logo: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
      amount: 5000000,
      costBasis: 0,
      proceeds: 325.0,
      gainLoss: 325.0,
      holdingType: 'short_term',
      txHash: '9pR4cN...xWjF',
    },
    {
      id: 'ev-005',
      type: 'defi_income',
      date: `${year}-05-15`,
      token: 'USDC',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      amount: 412.5,
      costBasis: 0,
      proceeds: 412.5,
      gainLoss: 412.5,
      holdingType: 'short_term',
      txHash: '3mY7kB...sHdU',
    },
    {
      id: 'ev-006',
      type: 'sale',
      date: `${year}-06-03`,
      token: 'RAY',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
      amount: 200,
      costBasis: 520.0,
      proceeds: 760.0,
      gainLoss: 240.0,
      holdingType: 'short_term',
      txHash: '6vL3gD...nPqR',
    },
    {
      id: 'ev-007',
      type: 'staking_reward',
      date: `${year}-07-19`,
      token: 'SOL',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      amount: 1.2,
      costBasis: 0,
      proceeds: 204.0,
      gainLoss: 204.0,
      holdingType: 'short_term',
      txHash: '1wA5oC...vMnZ',
    },
    {
      id: 'ev-008',
      type: 'sale',
      date: `${year}-08-11`,
      token: 'JUP',
      logo: 'https://static.jup.ag/jup/icon.png',
      amount: 500,
      costBasis: 600.0,
      proceeds: 875.0,
      gainLoss: 275.0,
      holdingType: 'long_term',
      txHash: '5hT2jF...kXcS',
    },
    {
      id: 'ev-009',
      type: 'airdrop',
      date: `${year}-09-25`,
      token: 'WIF',
      logo: 'https://bafkreibk3covs5ltyqxa272uodhculbois6yuzmbl4o3stmlpcclkp23a.ipfs.nftstorage.link',
      amount: 1200,
      costBasis: 0,
      proceeds: 180.0,
      gainLoss: 180.0,
      holdingType: 'short_term',
      txHash: '8cQ6lE...yWbT',
    },
    {
      id: 'ev-010',
      type: 'defi_income',
      date: `${year}-10-07`,
      token: 'USDC',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      amount: 289.75,
      costBasis: 0,
      proceeds: 289.75,
      gainLoss: 289.75,
      holdingType: 'short_term',
      txHash: '0dV9mH...uRaP',
    },
    {
      id: 'ev-011',
      type: 'sale',
      date: `${year}-11-18`,
      token: 'BONK',
      logo: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
      amount: 10000000,
      costBasis: 325.0,
      proceeds: 480.0,
      gainLoss: 155.0,
      holdingType: 'short_term',
      txHash: 'BxN3pK...wZeL',
    },
    {
      id: 'ev-012',
      type: 'staking_reward',
      date: `${year}-12-30`,
      token: 'SOL',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      amount: 0.55,
      costBasis: 0,
      proceeds: 99.0,
      gainLoss: 99.0,
      holdingType: 'short_term',
      txHash: 'DmR7sJ...fKoX',
    },
  ];

  // Compute summary from events
  let shortTermGains = 0;
  let shortTermLosses = 0;
  let longTermGains = 0;
  let longTermLosses = 0;
  let defiIncome = 0;
  let stakingRewards = 0;
  let airdrops = 0;

  for (const ev of events) {
    if (ev.type === 'defi_income') {
      defiIncome += ev.gainLoss;
    } else if (ev.type === 'staking_reward') {
      stakingRewards += ev.gainLoss;
    } else if (ev.type === 'airdrop') {
      airdrops += ev.gainLoss;
    } else if (ev.type === 'sale') {
      if (ev.holdingType === 'short_term') {
        if (ev.gainLoss >= 0) shortTermGains += ev.gainLoss;
        else shortTermLosses += Math.abs(ev.gainLoss);
      } else {
        if (ev.gainLoss >= 0) longTermGains += ev.gainLoss;
        else longTermLosses += Math.abs(ev.gainLoss);
      }
    }
  }

  const netShortTerm = shortTermGains - shortTermLosses;
  const netLongTerm = longTermGains - longTermLosses;
  const totalNetGain = netShortTerm + netLongTerm;
  const totalTaxableIncome = totalNetGain + defiIncome + stakingRewards + airdrops;
  const estimatedTaxOwed = Math.round(totalTaxableIncome * 0.25 * 100) / 100;

  const summary: TaxSummary = {
    year,
    shortTermGains,
    shortTermLosses,
    longTermGains,
    longTermLosses,
    netShortTerm,
    netLongTerm,
    totalNetGain,
    defiIncome,
    stakingRewards,
    airdrops,
    totalTaxableIncome,
    estimatedTaxOwed,
    eventCount: events.length,
  };

  // Aggregate by token
  const tokenMap = new Map<string, { logo: string; netGain: number; eventCount: number }>();
  for (const ev of events) {
    const existing = tokenMap.get(ev.token);
    if (existing) {
      existing.netGain += ev.gainLoss;
      existing.eventCount += 1;
    } else {
      tokenMap.set(ev.token, { logo: ev.logo, netGain: ev.gainLoss, eventCount: 1 });
    }
  }

  const byToken = Array.from(tokenMap.entries()).map(([token, v]) => ({
    token,
    logo: v.logo,
    netGain: Math.round(v.netGain * 100) / 100,
    eventCount: v.eventCount,
  }));

  return {
    year,
    summary,
    events,
    byToken,
    taxBracketNote:
      'Estimated tax uses a flat 25% effective rate. Your actual rate depends on your filing status and total income.',
    disclaimer:
      'This report is for informational purposes only and does not constitute tax advice. Consult a qualified tax professional before filing.',
    lastUpdated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) : 2025;

  const validYear = !isNaN(year) && year >= 2020 && year <= 2030 ? year : 2025;
  const data = buildMockData(validYear);

  return NextResponse.json(data);
}
