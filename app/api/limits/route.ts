import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 30;

/* ─── exported types ─── */

export type OrderStatus = 'open' | 'filled' | 'cancelled' | 'expired' | 'partial';
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'stop_loss' | 'take_profit' | 'trailing_stop';

export interface LimitOrder {
  id: string;
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  inputToken: string;
  outputToken: string;
  inputLogo: string;
  outputLogo: string;
  inputAmount: number;
  outputAmount: number;
  limitPrice: number;
  currentPrice: number;
  triggerPrice: number | null;
  filledPct: number;
  createdAt: string;
  expiresAt: string | null;
  filledAt: string | null;
  txHash: string | null;
  platform: 'Jupiter' | 'Phoenix' | 'Drift';
  platformLogo: string;
  fee: number;
}

export interface LimitsData {
  openOrders: LimitOrder[];
  orderHistory: LimitOrder[];
  stats: {
    openCount: number;
    filledToday: number;
    totalVolume: number;
    successRate: number;
  };
  supportedTokens: { symbol: string; logo: string; price: number }[];
  lastUpdated: string;
  source: 'live' | 'empty';
  requiresWallet?: boolean;
}

/* ─── Jupiter Limit Orders API ─── */

interface JupLimitOrder {
  publicKey?: string;
  account?: {
    inputMint?: string;
    outputMint?: string;
    oriInAmount?: string;
    oriOutAmount?: string;
    inAmount?: string;
    outAmount?: string;
    expiredAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
}

const MINT_SYMBOLS: Record<string, { symbol: string; logo: string }> = {
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', logo: '◎' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', logo: '💵' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', logo: '🪐' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', logo: '🐶' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF', logo: '🐕' },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', logo: '🔮' },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', logo: '🔵' },
};

async function fetchLivePrices(): Promise<Record<string, number>> {
  const addrs = Object.keys(MINT_SYMBOLS).join(',');
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${addrs}`,
    { signal: AbortSignal.timeout(5000) },
  );
  if (!res.ok) return {};
  const data = await res.json() as { pairs?: Array<{ baseToken?: { address?: string; symbol?: string }; priceUsd?: string }> };
  const prices: Record<string, number> = {};
  for (const pair of data.pairs ?? []) {
    const mintInfo = pair.baseToken?.address ? MINT_SYMBOLS[pair.baseToken.address] : undefined;
    const sym = mintInfo?.symbol;
    if (sym && pair.priceUsd && !(sym in prices)) {
      prices[sym] = parseFloat(pair.priceUsd);
    }
  }
  prices['USDC'] = 1.0;
  return prices;
}

async function fetchJupiterOrders(wallet: string): Promise<LimitOrder[]> {
  const res = await fetch(
    `https://jup.ag/api/limit/v2/openOrders?wallet=${wallet}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!res.ok) throw new Error(`Jupiter limit orders API ${res.status}`);
  const orders = await res.json() as JupLimitOrder[];
  if (!Array.isArray(orders)) throw new Error('Invalid response');

  const [prices] = await Promise.allSettled([fetchLivePrices()]);
  const priceMap = prices.status === 'fulfilled' ? prices.value : {};

  return orders.slice(0, 10).map((order, i) => {
    const acc = order.account ?? {};
    const inInfo: { symbol: string; logo: string } = (acc.inputMint ? MINT_SYMBOLS[acc.inputMint] : undefined) ?? { symbol: 'UNKNOWN', logo: '?' };
    const outInfo: { symbol: string; logo: string } = (acc.outputMint ? MINT_SYMBOLS[acc.outputMint] : undefined) ?? { symbol: 'UNKNOWN', logo: '?' };

    const inAmount = parseInt(acc.inAmount ?? acc.oriInAmount ?? '0');
    const outAmount = parseInt(acc.oriOutAmount ?? '0');

    // Calculate limit price from amounts (adjust for decimals)
    const inDecimals = inInfo.symbol === 'USDC' ? 1e6 : inInfo.symbol === 'BONK' ? 1e5 : 1e9;
    const outDecimals = outInfo.symbol === 'USDC' ? 1e6 : outInfo.symbol === 'BONK' ? 1e5 : 1e9;
    const inAmountAdj = inAmount / inDecimals;
    const outAmountAdj = outAmount / outDecimals;
    const limitPrice = inAmountAdj > 0 && outAmountAdj > 0 ? outAmountAdj / inAmountAdj : 0;

    return {
      id: order.publicKey ?? `jup-${i}`,
      type: 'limit' as const,
      side: inInfo.symbol === 'USDC' ? 'buy' as const : 'sell' as const,
      status: 'open' as const,
      inputToken: inInfo.symbol,
      outputToken: outInfo.symbol,
      inputLogo: inInfo.logo,
      outputLogo: outInfo.logo,
      inputAmount: inAmountAdj,
      outputAmount: outAmountAdj,
      limitPrice,
      currentPrice: priceMap[outInfo.symbol] ?? 0,
      triggerPrice: null,
      filledPct: acc.inAmount && acc.oriInAmount
        ? Math.round((1 - parseInt(acc.inAmount) / parseInt(acc.oriInAmount)) * 100)
        : 0,
      createdAt: acc.createdAt ?? new Date().toISOString(),
      expiresAt: acc.expiredAt ?? null,
      filledAt: null,
      txHash: null,
      platform: 'Jupiter' as const,
      platformLogo: '🪐',
      fee: 0.2,
    };
  });
}

/* ─── GET handler ─── */

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get('wallet');

  if (wallet && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    try {
      const [orders, prices] = await Promise.all([
        fetchJupiterOrders(wallet),
        fetchLivePrices(),
      ]);
      const supportedTokens = [
        { symbol: 'SOL', logo: '◎', price: prices['SOL'] ?? 180 },
        { symbol: 'USDC', logo: '💵', price: 1.0 },
        { symbol: 'JUP', logo: '🪐', price: prices['JUP'] ?? 0.67 },
        { symbol: 'BONK', logo: '🐶', price: prices['BONK'] ?? 0.0000212 },
        { symbol: 'WIF', logo: '🐕', price: prices['WIF'] ?? 2.17 },
        { symbol: 'RAY', logo: '🔵', price: prices['RAY'] ?? 3.84 },
      ];
      return NextResponse.json({
        openOrders: orders,
        orderHistory: [],
        stats: { openCount: orders.length, filledToday: 0, totalVolume: 0, successRate: 0 },
        supportedTokens,
        lastUpdated: new Date().toISOString(),
        source: 'live',
      });
    } catch {
      // fall through to demo
    }
  }

  // No wallet — return live prices with empty orders
  try {
    const prices = await fetchLivePrices();
    const supportedTokens = [
      { symbol: 'SOL',  logo: '◎',  price: prices['SOL']  ?? 0 },
      { symbol: 'USDC', logo: '💵', price: 1.0 },
      { symbol: 'JUP',  logo: '🪐', price: prices['JUP']  ?? 0 },
      { symbol: 'BONK', logo: '🐶', price: prices['BONK'] ?? 0 },
      { symbol: 'WIF',  logo: '🐕', price: prices['WIF']  ?? 0 },
      { symbol: 'RAY',  logo: '🔵', price: prices['RAY']  ?? 0 },
    ];
    return NextResponse.json({
      openOrders: [],
      orderHistory: [],
      stats: { openCount: 0, filledToday: 0, totalVolume: 0, successRate: 0 },
      supportedTokens,
      lastUpdated: new Date().toISOString(),
      source: 'live',
      requiresWallet: true,
    } satisfies LimitsData & { requiresWallet: boolean });
  } catch {
    return NextResponse.json({
      openOrders: [], orderHistory: [],
      stats: { openCount: 0, filledToday: 0, totalVolume: 0, successRate: 0 },
      supportedTokens: [],
      lastUpdated: new Date().toISOString(),
      source: 'live',
      requiresWallet: true,
    });
  }
}
