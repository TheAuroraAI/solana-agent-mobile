import { NextRequest } from 'next/server';

export const runtime = 'edge';

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

function getDemoAlerts(): Alert[] {
  const now = new Date();

  return [
    {
      id: 'alert-001',
      type: 'price_above',
      tokenSymbol: 'SOL',
      tokenName: 'Solana',
      condition: 'SOL > $160.00',
      threshold: 160,
      currentValue: 148.72,
      enabled: true,
      triggered: false,
      triggeredAt: null,
      createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
      notifyVia: 'push',
    },
    {
      id: 'alert-002',
      type: 'price_below',
      tokenSymbol: 'JUP',
      tokenName: 'Jupiter',
      condition: 'JUP < $0.50',
      threshold: 0.5,
      currentValue: 0.67,
      enabled: true,
      triggered: false,
      triggeredAt: null,
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      notifyVia: 'both',
    },
    {
      id: 'alert-003',
      type: 'whale_move',
      tokenSymbol: 'SOL',
      tokenName: 'Solana',
      condition: 'Whale transfer > $500K SOL',
      threshold: 500000,
      currentValue: 823400,
      enabled: true,
      triggered: true,
      triggeredAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
      notifyVia: 'push',
    },
    {
      id: 'alert-004',
      type: 'volume_spike',
      tokenSymbol: 'BONK',
      tokenName: 'Bonk',
      condition: 'BONK 1h volume > $2M',
      threshold: 2000000,
      currentValue: 1450000,
      enabled: true,
      triggered: false,
      triggeredAt: null,
      createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
      notifyVia: 'sms',
    },
    {
      id: 'alert-005',
      type: 'pnl_target',
      tokenSymbol: 'WIF',
      tokenName: 'dogwifhat',
      condition: 'WIF position PnL > +25%',
      threshold: 25,
      currentValue: 31.2,
      enabled: false,
      triggered: true,
      triggeredAt: new Date(now.getTime() - 18 * 3600000).toISOString(),
      createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      notifyVia: 'push',
    },
    {
      id: 'alert-006',
      type: 'gas_spike',
      tokenSymbol: 'SOL',
      tokenName: 'Solana',
      condition: 'Priority fee > 0.005 SOL',
      threshold: 0.005,
      currentValue: 0.0023,
      enabled: true,
      triggered: false,
      triggeredAt: null,
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      notifyVia: 'push',
    },
  ];
}

export async function GET() {
  try {
    const alerts = getDemoAlerts();
    return Response.json({ alerts, source: 'demo', ts: Date.now() });
  } catch {
    return Response.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      tokenSymbol,
      tokenName,
      condition,
      threshold,
      notifyVia,
    } = body as Partial<Alert>;

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
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json(
        { error: 'Missing alert ID' },
        { status: 400 },
      );
    }

    return Response.json({ deleted: id, success: true });
  } catch {
    return Response.json(
      { error: 'Failed to delete alert' },
      { status: 500 },
    );
  }
}
