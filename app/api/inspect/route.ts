import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletToken {
  symbol: string;
  name: string;
  logo: string; // emoji
  balance: number;
  valueUsd: number;
  allocation: number; // percentage of total
  price: number;
  change24h: number;
}

export interface WalletActivity {
  date: string; // "Mar 1"
  txCount: number;
  volumeUsd: number;
  fees: number;
}

export interface WalletLabel {
  type: 'whale' | 'bot' | 'defi_user' | 'nft_collector' | 'trader' | 'founder';
  label: string;
  confidence: number; // 0-100
}

export interface InspectData {
  address: string;
  shortAddress: string;
  totalValueUsd: number;
  solBalance: number;
  tokenCount: number;
  nftCount: number;
  txCount: number;
  firstTx: string; // date
  lastTx: string;
  labels: WalletLabel[];
  riskScore: number; // 0-100
  defiInteractions: { protocol: string; logo: string; lastUsed: string; txCount: number }[];
  topTokens: WalletToken[];
  activityHistory: WalletActivity[]; // last 30 days
  pnl30d: number;
  winRate: number;
  topPnlToken: { symbol: string; pnl: number };
  worstPnlToken: { symbol: string; pnl: number };
}

// ─── Mock data builder ────────────────────────────────────────────────────────

function buildMockData(address: string): InspectData {
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;

  // 30 days of activity history (Feb 4 – Mar 5 2026)
  const activityHistory: WalletActivity[] = [];
  const months = ['Jan', 'Feb', 'Mar'];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(2026, 2, 5); // Mar 5
    d.setDate(d.getDate() - i);
    const month = months[d.getMonth()];
    const day = d.getDate();
    const dateStr = `${month} ${day}`;

    // Weekend dip, weekday spike pattern
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const base = isWeekend ? 2 : 6;
    const jitter = Math.round(Math.sin(i * 1.7) * 2 + Math.cos(i * 0.9) * 1.5);
    const txCount = Math.max(1, base + jitter);
    const volumeUsd = txCount * (18000 + Math.round(Math.sin(i * 0.7) * 8000));
    const fees = parseFloat((txCount * 0.000025 * 179).toFixed(4));

    activityHistory.push({ date: dateStr, txCount, volumeUsd, fees });
  }

  const topTokens: WalletToken[] = [
    {
      symbol: 'SOL',
      name: 'Solana',
      logo: '◎',
      balance: 4820.5,
      valueUsd: 862_769,
      allocation: 37.5,
      price: 179.0,
      change24h: 2.34,
    },
    {
      symbol: 'JUP',
      name: 'Jupiter',
      logo: '🪐',
      balance: 1_240_000,
      valueUsd: 831_600,
      allocation: 36.1,
      price: 0.671,
      change24h: -1.12,
    },
    {
      symbol: 'WIF',
      name: 'dogwifhat',
      logo: '🐶',
      balance: 218_400,
      valueUsd: 305_760,
      allocation: 13.3,
      price: 1.4,
      change24h: 5.87,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      logo: '💵',
      balance: 148_320,
      valueUsd: 148_320,
      allocation: 6.4,
      price: 1.0,
      change24h: 0.01,
    },
    {
      symbol: 'BONK',
      name: 'Bonk',
      logo: '🔥',
      balance: 4_200_000_000,
      valueUsd: 92_400,
      allocation: 4.0,
      price: 0.000022,
      change24h: -3.45,
    },
    {
      symbol: 'PYTH',
      name: 'Pyth Network',
      logo: '🔮',
      balance: 87_500,
      valueUsd: 61_250,
      allocation: 2.7,
      price: 0.7,
      change24h: 1.23,
    },
  ];

  const defiInteractions = [
    { protocol: 'Jupiter', logo: '🪐', lastUsed: 'Mar 5', txCount: 312 },
    { protocol: 'Kamino', logo: '🌊', lastUsed: 'Mar 4', txCount: 87 },
    { protocol: 'Drift', logo: '💨', lastUsed: 'Mar 3', txCount: 63 },
    { protocol: 'Marinade', logo: '🥩', lastUsed: 'Feb 28', txCount: 41 },
    { protocol: 'Orca', logo: '🐳', lastUsed: 'Feb 22', txCount: 29 },
    { protocol: 'Raydium', logo: '⚡', lastUsed: 'Feb 15', txCount: 18 },
  ];

  const labels: WalletLabel[] = [
    { type: 'whale', label: 'Whale', confidence: 97 },
    { type: 'defi_user', label: 'DeFi Power User', confidence: 94 },
    { type: 'trader', label: 'Active Trader', confidence: 88 },
  ];

  return {
    address,
    shortAddress: short,
    totalValueUsd: 2_302_099,
    solBalance: 4820.5,
    tokenCount: 14,
    nftCount: 7,
    txCount: 4_287,
    firstTx: 'Nov 3, 2021',
    lastTx: 'Mar 5, 2026',
    labels,
    riskScore: 38,
    defiInteractions,
    topTokens,
    activityHistory,
    pnl30d: 184_320,
    winRate: 67,
    topPnlToken: { symbol: 'WIF', pnl: 127_450 },
    worstPnlToken: { symbol: 'BONK', pnl: -18_200 },
  };
}

// ─── GET handler ──────────────────────────────────────────────────────────────

const SAMPLE_WHALE = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')?.trim() || SAMPLE_WHALE;

  // Basic Solana address validation (32-44 base58 chars)
  const base58Re = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!base58Re.test(wallet)) {
    return Response.json(
      { error: 'Invalid Solana address format.' },
      { status: 400 },
    );
  }

  const data = buildMockData(wallet);
  return Response.json(data);
}
