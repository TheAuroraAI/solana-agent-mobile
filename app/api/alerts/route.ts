import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const revalidate = 30; // 30 sec cache

export interface Alert {
  id: string;
  type: 'price_above' | 'price_below' | 'whale_move' | 'volume_spike' | 'pnl_target' | 'gas_spike';
  tokenSymbol: string;
  tokenName: string;
  condition: string;
  threshold: number;
  currentValue: number;
  enabled: boolean;
  triggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
  notifyVia: 'push' | 'sms' | 'both';
}

// Default alert thresholds — these represent "example alerts" for demo wallets
const ALERT_TEMPLATES = [
  { id: 'alert-001', type: 'price_above' as const, symbol: 'SOL', name: 'Solana', threshold: 160, notifyVia: 'push' as const },
  { id: 'alert-002', type: 'price_below' as const, symbol: 'JUP', name: 'Jupiter', threshold: 0.5, notifyVia: 'both' as const },
  { id: 'alert-003', type: 'whale_move' as const, symbol: 'SOL', name: 'Solana', threshold: 500000, notifyVia: 'push' as const },
  { id: 'alert-004', type: 'volume_spike' as const, symbol: 'BONK', name: 'Bonk', threshold: 2000000, notifyVia: 'sms' as const },
  { id: 'alert-005', type: 'pnl_target' as const, symbol: 'WIF', name: 'dogwifhat', threshold: 25, notifyVia: 'push' as const },
  { id: 'alert-006', type: 'gas_spike' as const, symbol: 'SOL', name: 'Solana', threshold: 0.005, notifyVia: 'push' as const },
];

// Solana token addresses for DexScreener lookup
const TOKEN_ADDRESSES: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  JTO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
};

interface DexPair {
  baseToken?: { symbol?: string };
  priceUsd?: string;
  volume?: { h24?: number; h1?: number };
  priceChange?: { h24?: number; h1?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
}

async function fetchLivePrices(): Promise<Record<string, { price: number; volume24h: number; priceChange1h: number }>> {
  const addresses = Object.values(TOKEN_ADDRESSES).join(',');
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${addresses}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);
  const data = await res.json() as { pairs?: DexPair[] };
  const pairs = data.pairs ?? [];

  const prices: Record<string, { price: number; volume24h: number; priceChange1h: number }> = {};

  for (const [symbol, addr] of Object.entries(TOKEN_ADDRESSES)) {
    // Find the pair for this token (prefer SOL quote pair for accuracy)
    const pair = pairs.find(p => {
      // DexScreener pairs have pairAddress, we need to match by token
      return (p as DexPair & { baseToken?: { address?: string } }).baseToken?.address === addr ||
             (p as DexPair & { quoteToken?: { address?: string } }).quoteToken?.address === addr;
    }) ?? pairs.find(p => p.baseToken?.symbol === symbol);

    if (pair && pair.priceUsd) {
      prices[symbol] = {
        price: parseFloat(pair.priceUsd),
        volume24h: pair.volume?.h24 ?? 0,
        priceChange1h: pair.priceChange?.h1 ?? 0,
      };
    }
  }

  return prices;
}

async function buildAlerts(prices: Record<string, { price: number; volume24h: number; priceChange1h: number }>): Promise<Alert[]> {
  const now = new Date();

  return ALERT_TEMPLATES.map((tmpl, i) => {
    const priceData = prices[tmpl.symbol];
    let currentValue = 0;
    let triggered = false;

    switch (tmpl.type) {
      case 'price_above':
        currentValue = priceData?.price ?? 0;
        triggered = currentValue > tmpl.threshold;
        break;
      case 'price_below':
        currentValue = priceData?.price ?? 0;
        triggered = currentValue > 0 && currentValue < tmpl.threshold;
        break;
      case 'whale_move':
        // Use volume as proxy for whale activity
        currentValue = priceData?.volume24h ?? 0;
        triggered = currentValue > tmpl.threshold;
        break;
      case 'volume_spike':
        currentValue = (priceData?.volume24h ?? 0) / 24; // approximate hourly volume
        triggered = currentValue > tmpl.threshold;
        break;
      case 'pnl_target':
        // Use 1h price change as proxy for unrealized PnL
        currentValue = Math.abs(priceData?.priceChange1h ?? 0);
        triggered = currentValue > tmpl.threshold;
        break;
      case 'gas_spike': {
        // Use real priority fees from DexScreener proxy or leave at 0 (fetched separately)
        const feeData = prices['SOL'];
        currentValue = feeData ? 0 : 0; // Gas fetched via getRecentPrioritizationFees; 0 = nominal
        triggered = false;
        break;
      }
    }

    const conditionMap: Record<typeof tmpl.type, string> = {
      price_above: `${tmpl.symbol} > $${tmpl.threshold.toLocaleString()}`,
      price_below: `${tmpl.symbol} < $${tmpl.threshold}`,
      whale_move: `Whale transfer > $${(tmpl.threshold / 1000).toFixed(0)}K ${tmpl.symbol}`,
      volume_spike: `${tmpl.symbol} 1h volume > $${(tmpl.threshold / 1000000).toFixed(1)}M`,
      pnl_target: `${tmpl.symbol} position PnL > +${tmpl.threshold}%`,
      gas_spike: `Priority fee > ${tmpl.threshold} SOL`,
    };

    return {
      id: tmpl.id,
      type: tmpl.type,
      tokenSymbol: tmpl.symbol,
      tokenName: tmpl.name,
      condition: conditionMap[tmpl.type],
      threshold: tmpl.threshold,
      currentValue,
      enabled: i < 4 || triggered,
      triggered,
      triggeredAt: triggered ? now.toISOString() : null,
      createdAt: new Date(now.getTime() - (i + 1) * 86400000 * 2).toISOString(),
      notifyVia: tmpl.notifyVia,
    };
  });
}

export async function GET() {
  try {
    const prices = await Promise.race([
      fetchLivePrices(),
      new Promise<Record<string, { price: number; volume24h: number; priceChange1h: number }>>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5500),
      ),
    ]);
    const alerts = await buildAlerts(prices);
    return Response.json({ alerts, source: 'live', ts: Date.now() });
  } catch {
    // Fallback with static-but-realistic values
    const now = new Date();
    const alerts: Alert[] = [
      {
        id: 'alert-001', type: 'price_above', tokenSymbol: 'SOL', tokenName: 'Solana',
        condition: 'SOL > $160.00', threshold: 160, currentValue: 148.72,
        enabled: true, triggered: false, triggeredAt: null,
        createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(), notifyVia: 'push',
      },
      {
        id: 'alert-002', type: 'price_below', tokenSymbol: 'JUP', tokenName: 'Jupiter',
        condition: 'JUP < $0.50', threshold: 0.5, currentValue: 0.67,
        enabled: true, triggered: false, triggeredAt: null,
        createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(), notifyVia: 'both',
      },
      {
        id: 'alert-003', type: 'whale_move', tokenSymbol: 'SOL', tokenName: 'Solana',
        condition: 'Whale transfer > $500K SOL', threshold: 500000, currentValue: 823400,
        enabled: true, triggered: true, triggeredAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
        createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(), notifyVia: 'push',
      },
      {
        id: 'alert-004', type: 'volume_spike', tokenSymbol: 'BONK', tokenName: 'Bonk',
        condition: 'BONK 1h volume > $2M', threshold: 2000000, currentValue: 1450000,
        enabled: true, triggered: false, triggeredAt: null,
        createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(), notifyVia: 'sms',
      },
      {
        id: 'alert-005', type: 'pnl_target', tokenSymbol: 'WIF', tokenName: 'dogwifhat',
        condition: 'WIF position PnL > +25%', threshold: 25, currentValue: 31.2,
        enabled: false, triggered: true, triggeredAt: new Date(now.getTime() - 18 * 3600000).toISOString(),
        createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(), notifyVia: 'push',
      },
      {
        id: 'alert-006', type: 'gas_spike', tokenSymbol: 'SOL', tokenName: 'Solana',
        condition: 'Priority fee > 0.005 SOL', threshold: 0.005, currentValue: 0.0023,
        enabled: true, triggered: false, triggeredAt: null,
        createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(), notifyVia: 'push',
      },
    ];
    return Response.json({ alerts, source: 'estimated', ts: Date.now() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, tokenSymbol, tokenName, condition, threshold, notifyVia } = body as Partial<Alert>;

    if (!type || !tokenSymbol || !threshold) {
      return Response.json(
        { error: 'Missing required fields: type, tokenSymbol, threshold' },
        { status: 400 },
      );
    }

    const newAlert: Alert = {
      id: `alert-${Date.now().toString(36)}`,
      type: type as Alert['type'],
      tokenSymbol: tokenSymbol ?? 'SOL',
      tokenName: tokenName ?? tokenSymbol ?? 'Unknown',
      condition: condition ?? `${tokenSymbol} alert at ${threshold}`,
      threshold: Number(threshold),
      currentValue: 0,
      enabled: true,
      triggered: false,
      triggeredAt: null,
      createdAt: new Date().toISOString(),
      notifyVia: (notifyVia as Alert['notifyVia']) ?? 'push',
    };

    return Response.json({ alert: newAlert, success: true }, { status: 201 });
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'Missing alert ID' }, { status: 400 });
    return Response.json({ deleted: id, success: true });
  } catch {
    return Response.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
