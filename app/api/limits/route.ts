import { NextResponse } from 'next/server';

export const runtime = 'edge';

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
}

/* ─── mock data ─── */

function buildData(): LimitsData {
  const now = Date.now();
  const H = 3_600_000;
  const D = 86_400_000;

  const openOrders: LimitOrder[] = [
    {
      id: 'ord-001',
      type: 'limit',
      side: 'buy',
      status: 'partial',
      inputToken: 'USDC',
      outputToken: 'SOL',
      inputLogo: '💵',
      outputLogo: '◎',
      inputAmount: 500,
      outputAmount: 2.831,
      limitPrice: 176.5,
      currentPrice: 180.24,
      triggerPrice: null,
      filledPct: 34,
      createdAt: new Date(now - 6 * H).toISOString(),
      expiresAt: new Date(now + 18 * H).toISOString(),
      filledAt: null,
      txHash: null,
      platform: 'Jupiter',
      platformLogo: '🪐',
      fee: 0.12,
    },
    {
      id: 'ord-002',
      type: 'stop_loss',
      side: 'sell',
      status: 'open',
      inputToken: 'SOL',
      outputToken: 'USDC',
      inputLogo: '◎',
      outputLogo: '💵',
      inputAmount: 5,
      outputAmount: 825.0,
      limitPrice: 165.0,
      currentPrice: 180.24,
      triggerPrice: 168.0,
      filledPct: 0,
      createdAt: new Date(now - 2 * D).toISOString(),
      expiresAt: null,
      filledAt: null,
      txHash: null,
      platform: 'Drift',
      platformLogo: '🌊',
      fee: 0.08,
    },
    {
      id: 'ord-003',
      type: 'limit',
      side: 'buy',
      status: 'open',
      inputToken: 'USDC',
      outputToken: 'JUP',
      inputLogo: '💵',
      outputLogo: '🪐',
      inputAmount: 200,
      outputAmount: 178.57,
      limitPrice: 1.12,
      currentPrice: 1.19,
      triggerPrice: null,
      filledPct: 0,
      createdAt: new Date(now - 1 * H).toISOString(),
      expiresAt: new Date(now + 7 * D).toISOString(),
      filledAt: null,
      txHash: null,
      platform: 'Phoenix',
      platformLogo: '🔥',
      fee: 0.05,
    },
  ];

  const orderHistory: LimitOrder[] = [
    {
      id: 'ord-h001',
      type: 'limit',
      side: 'buy',
      status: 'filled',
      inputToken: 'USDC',
      outputToken: 'SOL',
      inputLogo: '💵',
      outputLogo: '◎',
      inputAmount: 1000,
      outputAmount: 5.814,
      limitPrice: 172.0,
      currentPrice: 180.24,
      triggerPrice: null,
      filledPct: 100,
      createdAt: new Date(now - 3 * D).toISOString(),
      expiresAt: new Date(now - 2 * D).toISOString(),
      filledAt: new Date(now - 2 * D - 4 * H).toISOString(),
      txHash: '4xK9rNmBQv2TpWcLfZgH7sYdUoEa3JnCiR8bXwMtVqP',
      platform: 'Jupiter',
      platformLogo: '🪐',
      fee: 0.25,
    },
    {
      id: 'ord-h002',
      type: 'take_profit',
      side: 'sell',
      status: 'filled',
      inputToken: 'SOL',
      outputToken: 'USDC',
      inputLogo: '◎',
      outputLogo: '💵',
      inputAmount: 3,
      outputAmount: 564.6,
      limitPrice: 188.2,
      currentPrice: 180.24,
      triggerPrice: 185.0,
      filledPct: 100,
      createdAt: new Date(now - 5 * D).toISOString(),
      expiresAt: null,
      filledAt: new Date(now - 4 * D).toISOString(),
      txHash: '7mGjP2KsWnAqYvBtLcHfE5uRiXo9DpNb4ZwQeCkTdMl',
      platform: 'Drift',
      platformLogo: '🌊',
      fee: 0.14,
    },
    {
      id: 'ord-h003',
      type: 'limit',
      side: 'buy',
      status: 'cancelled',
      inputToken: 'USDC',
      outputToken: 'BONK',
      inputLogo: '💵',
      outputLogo: '🐶',
      inputAmount: 100,
      outputAmount: 5_263_158,
      limitPrice: 0.000019,
      currentPrice: 0.0000212,
      triggerPrice: null,
      filledPct: 0,
      createdAt: new Date(now - 6 * D).toISOString(),
      expiresAt: new Date(now - 5 * D).toISOString(),
      filledAt: null,
      txHash: null,
      platform: 'Jupiter',
      platformLogo: '🪐',
      fee: 0,
    },
    {
      id: 'ord-h004',
      type: 'limit',
      side: 'sell',
      status: 'filled',
      inputToken: 'WIF',
      outputToken: 'USDC',
      inputLogo: '🐕',
      outputLogo: '💵',
      inputAmount: 400,
      outputAmount: 972.0,
      limitPrice: 2.43,
      currentPrice: 2.17,
      triggerPrice: null,
      filledPct: 100,
      createdAt: new Date(now - 8 * D).toISOString(),
      expiresAt: new Date(now - 6 * D).toISOString(),
      filledAt: new Date(now - 7 * D).toISOString(),
      txHash: '9fVnS3CpAbKrJwMtQxZdY8LuEiGo6HnBeR4WkXmTjPl',
      platform: 'Phoenix',
      platformLogo: '🔥',
      fee: 0.19,
    },
  ];

  return {
    openOrders,
    orderHistory,
    stats: {
      openCount: openOrders.length,
      filledToday: 2,
      totalVolume: 17_840.5,
      successRate: 82.4,
    },
    supportedTokens: [
      { symbol: 'SOL', logo: '◎', price: 180.24 },
      { symbol: 'USDC', logo: '💵', price: 1.0 },
      { symbol: 'JUP', logo: '🪐', price: 1.19 },
      { symbol: 'BONK', logo: '🐶', price: 0.0000212 },
      { symbol: 'WIF', logo: '🐕', price: 2.17 },
      { symbol: 'RAY', logo: '🔵', price: 3.84 },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

/* ─── GET handler ─── */

export async function GET() {
  return NextResponse.json(buildData());
}
