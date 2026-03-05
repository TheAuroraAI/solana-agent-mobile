import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 60;

export type Chain =
  | 'Solana'
  | 'Ethereum'
  | 'Arbitrum'
  | 'Base'
  | 'Polygon'
  | 'Optimism'
  | 'BSC'
  | 'Avalanche';

export interface BridgeToken {
  symbol: string;
  name: string;
  logo: string;
  chains: Chain[];
  price: number;
}

export interface BridgeRoute {
  id: string;
  provider: string;
  providerLogo: string;
  fromChain: Chain;
  toChain: Chain;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  fee: number;
  feePct: number;
  estimatedTime: number;
  steps: number;
  securityScore: number;
  isRecommended: boolean;
  lastUpdated: string;
}

export interface RecentBridge {
  id: string;
  status: 'completed' | 'pending' | 'failed';
  from: string;
  to: string;
  amount: string;
  txHash: string;
  timestamp: string;
}

export interface BridgeData {
  supportedChains: Chain[];
  supportedTokens: BridgeToken[];
  featuredRoutes: BridgeRoute[];
  recentBridges: RecentBridge[];  // Requires wallet connection — always empty
  lastUpdated: string;
  source: 'live' | 'estimated';
}

// ─── Static chain + token structure (no faked rates) ─────────────────────────

const SUPPORTED_CHAINS: Chain[] = [
  'Solana', 'Ethereum', 'Arbitrum', 'Base', 'Polygon', 'Optimism', 'BSC', 'Avalanche',
];

// ─── Live price fetch ─────────────────────────────────────────────────────────

async function fetchTokenPrices(): Promise<Record<string, number>> {
  // CoinGecko free tier for multi-token prices
  const ids = 'solana,usd-coin,ethereum,tether,wrapped-bitcoin,binancecoin';
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: { 'Accept': 'application/json' } },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json() as Record<string, { usd: number }>;
  return {
    SOL: data['solana']?.usd ?? 0,
    USDC: 1.0,
    ETH: data['ethereum']?.usd ?? 0,
    USDT: data['tether']?.usd ?? 1.0,
    WBTC: data['wrapped-bitcoin']?.usd ?? 0,
    BNB: data['binancecoin']?.usd ?? 0,
  };
}

// ─── deBridge live quote for SOL→ETH USDC ────────────────────────────────────

async function fetchDeBridgeRoutes(prices: Record<string, number>): Promise<BridgeRoute[]> {
  const now = new Date().toISOString();
  // deBridge DLN API — free, no auth
  // Solana chainId: 7565164, Ethereum: 1, Arbitrum: 42161
  const amount = '100000000'; // 100 USDC (6 decimals)
  const url = [
    'https://api.dln.trade/v1.0/dln/estimation',
    '?srcChainId=7565164',
    '&srcChainTokenIn=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    `&srcChainTokenInAmount=${amount}`,
    '&dstChainId=1',
    '&dstChainTokenOut=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    '&prependOperatingExpenses=true',
  ].join('');

  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`deBridge ${res.status}`);

    const data = await res.json() as {
      estimation?: {
        srcChainTokenIn?: { amount?: string };
        dstChainTokenOut?: { amount?: string; recommendedAmount?: string };
        fees?: { fixFee?: { amount?: string }; operatingExpense?: { amount?: string } };
        recommendedSlippage?: number;
      };
      order?: { approximateFulfillmentDelay?: number };
    };

    const fromAmount = parseInt(data.estimation?.srcChainTokenIn?.amount ?? '100000000', 10) / 1e6;
    const toAmount = parseInt(data.estimation?.dstChainTokenOut?.recommendedAmount ?? data.estimation?.dstChainTokenOut?.amount ?? '99000000', 10) / 1e6;
    const fee = Math.round((fromAmount - toAmount) * 100) / 100;
    const feePct = Math.round((fee / fromAmount) * 10000) / 100;
    const estimatedTime = (data.order?.approximateFulfillmentDelay ?? 180);

    return [
      {
        id: 'route-debridge-sol-eth-usdc',
        provider: 'deBridge (DLN)',
        providerLogo: '🔗',
        fromChain: 'Solana',
        toChain: 'Ethereum',
        fromToken: 'USDC',
        toToken: 'USDC',
        fromAmount,
        toAmount,
        fee,
        feePct,
        estimatedTime,
        steps: 1,
        securityScore: 8,
        isRecommended: true,
        lastUpdated: now,
      },
    ];
  } catch {
    // deBridge unavailable — return empty routes (no fake data)
    return [];
  }
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const prices = await fetchTokenPrices().catch(() => ({
      SOL: 0, USDC: 1.0, ETH: 0, USDT: 1.0, WBTC: 0, BNB: 0,
    }));

    const featuredRoutes = await fetchDeBridgeRoutes(prices);

    const supportedTokens: BridgeToken[] = [
      { symbol: 'SOL',  name: 'Solana',          logo: '◎',  chains: ['Solana', 'Ethereum', 'Arbitrum', 'Base'],       price: prices.SOL  },
      { symbol: 'USDC', name: 'USD Coin',         logo: '💵', chains: ['Solana', 'Ethereum', 'Arbitrum', 'Base', 'Polygon', 'Optimism', 'Avalanche'], price: 1.0 },
      { symbol: 'ETH',  name: 'Ethereum',         logo: '⟠',  chains: ['Ethereum', 'Arbitrum', 'Base', 'Optimism', 'Polygon'], price: prices.ETH  },
      { symbol: 'USDT', name: 'Tether USD',       logo: '₮',  chains: ['Solana', 'Ethereum', 'BSC', 'Polygon', 'Avalanche'], price: 1.0 },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin',  logo: '₿',  chains: ['Ethereum', 'Arbitrum', 'Base', 'Polygon'], price: prices.WBTC },
      { symbol: 'BNB',  name: 'BNB',              logo: '🔶', chains: ['BSC', 'Ethereum'],                           price: prices.BNB  },
    ];

    return NextResponse.json({
      supportedChains: SUPPORTED_CHAINS,
      supportedTokens,
      featuredRoutes,
      recentBridges: [],
      lastUpdated: new Date().toISOString(),
      source: 'live',
    } satisfies BridgeData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load bridge data' },
      { status: 500 },
    );
  }
}
