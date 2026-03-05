import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60;

// ─── Exported Types ──────────────────────────────────────────────────────────

export interface ScenarioToken {
  symbol: string;
  logo: string;
  currentPrice: number;
  currentAllocation: number;
  projectedChange: number;
}

export interface SimulatorScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  changes: Record<string, number>;
}

export interface SimulatorData {
  currentPortfolioValue: number | null;
  tokens: ScenarioToken[];
  presetScenarios: SimulatorScenario[];
  lastUpdated: string;
  source: 'live' | 'estimated';
}

// ─── Token list ───────────────────────────────────────────────────────────────

const TOKEN_MINTS: Record<string, { logo: string; defaultAllocation: number }> = {
  SOL:  { logo: '◎',  defaultAllocation: 40 },
  USDC: { logo: '💵', defaultAllocation: 20 },
  JUP:  { logo: '🪐', defaultAllocation: 15 },
  BONK: { logo: '🐶', defaultAllocation: 10 },
  WIF:  { logo: '🎩', defaultAllocation: 8  },
  RAY:  { logo: '⚡', defaultAllocation: 7  },
};

const DEXSCREENER_PAIRS: Record<string, string> = {
  SOL:  'So11111111111111111111111111111111111111112',
  JUP:  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF:  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  RAY:  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
};

// ─── Live price fetch ─────────────────────────────────────────────────────────

async function fetchLivePrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = { USDC: 1.0 };

  const mints = Object.values(DEXSCREENER_PAIRS).join(',');
  const res = await fetch(
    `https://api.dexscreener.com/tokens/v1/solana/${mints}`,
    { headers: { 'Accept': 'application/json' } },
  );
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);

  const data = await res.json() as { pairs?: { baseToken?: { symbol?: string; address?: string }; priceUsd?: string }[] }[];

  for (const tokenData of data) {
    for (const pair of tokenData?.pairs ?? []) {
      const sym = pair.baseToken?.symbol?.toUpperCase() ?? '';
      const addr = pair.baseToken?.address ?? '';
      const price = parseFloat(pair.priceUsd ?? '0');
      if (price > 0 && (TOKEN_MINTS[sym] || Object.values(DEXSCREENER_PAIRS).includes(addr))) {
        if (!prices[sym] || price > prices[sym]) prices[sym] = price;
      }
    }
  }

  // Map by mint address for tokens we might have missed by symbol
  for (const [sym, mint] of Object.entries(DEXSCREENER_PAIRS)) {
    if (!prices[sym]) prices[sym] = 0;
  }

  return prices;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse<SimulatorData>> {
  const { searchParams } = new URL(request.url);
  const walletParam = searchParams.get('wallet');

  try {
    const prices = await fetchLivePrices();

    const tokens: ScenarioToken[] = Object.entries(TOKEN_MINTS).map(([symbol, meta]) => ({
      symbol,
      logo: meta.logo,
      currentPrice: prices[symbol] ?? 0,
      currentAllocation: meta.defaultAllocation,
      projectedChange: 0,
    }));

    // If wallet provided, use real portfolio value (not implemented yet — requires wallet balance)
    // For now return null to signal "connect wallet for real value"
    const currentPortfolioValue = walletParam ? null : null;

    const presetScenarios: SimulatorScenario[] = [
      {
        id: 'bull-run',
        name: 'Bull Run',
        description: 'Everything pumps — altseason in full swing',
        icon: '🚀',
        changes: { SOL: 150, JUP: 200, BONK: 500, WIF: 300, RAY: 120, USDC: 0 },
      },
      {
        id: 'bear-market',
        name: 'Bear Market',
        description: 'Crypto winter — liquidity dries up',
        icon: '🐻',
        changes: { SOL: -60, JUP: -75, BONK: -90, WIF: -85, RAY: -65, USDC: 0 },
      },
      {
        id: 'sol-flippening',
        name: 'Solana Flippening',
        description: 'SOL surpasses ETH market cap',
        icon: '⚡',
        changes: { SOL: 400, JUP: 100, BONK: 80, WIF: 60, RAY: 50, USDC: 0 },
      },
      {
        id: 'defi-summer',
        name: 'DeFi Summer',
        description: 'Yield and governance tokens explode',
        icon: '☀️',
        changes: { SOL: 80, JUP: 300, BONK: 100, WIF: 150, RAY: 250, USDC: 0 },
      },
    ];

    return NextResponse.json({
      currentPortfolioValue,
      tokens,
      presetScenarios,
      lastUpdated: new Date().toISOString(),
      source: 'live',
    } satisfies SimulatorData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load simulator data' } as never,
      { status: 500 },
    );
  }
}
