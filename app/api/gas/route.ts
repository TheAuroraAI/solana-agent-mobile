import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 10;

export interface GasTier {
  label: string;
  microlamports: number;
  estimatedCostSol: number;
}

export interface GasData {
  tiers: GasTier[];
  avgFee: number;
  medianFee: number;
  feeHistory: { slot: number; fee: number }[];
  congestionLevel: 'low' | 'medium' | 'high' | 'extreme';
  timestamp: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function estimateCostSol(microlamports: number, computeUnits = 200_000): number {
  // Cost = (microlamports * computeUnits) / 1e6 lamports, then / 1e9 for SOL
  return (microlamports * computeUnits) / 1e15;
}

function getCongestionLevel(medianFee: number): 'low' | 'medium' | 'high' | 'extreme' {
  if (medianFee < 100) return 'low';
  if (medianFee < 1_000) return 'medium';
  if (medianFee < 10_000) return 'high';
  return 'extreme';
}

export async function GET() {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPrioritizationFees',
        params: [],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Solana RPC returned ${response.status}` },
        { status: 502 },
      );
    }

    const json = await response.json();

    if (json.error) {
      return NextResponse.json(
        { error: json.error.message ?? 'RPC error' },
        { status: 502 },
      );
    }

    const results: { slot: number; prioritizationFee: number }[] = json.result ?? [];

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No priority fee data available' },
        { status: 503 },
      );
    }

    // Extract fees and sort for percentile calculation
    const fees = results.map((r) => r.prioritizationFee);
    const sorted = [...fees].sort((a, b) => a - b);

    const low = percentile(sorted, 25);
    const medium = percentile(sorted, 50);
    const high = percentile(sorted, 75);
    const veryHigh = percentile(sorted, 95);

    const avgFee = Math.round(fees.reduce((s, f) => s + f, 0) / fees.length);
    const medianFee = medium;

    const tiers: GasTier[] = [
      {
        label: 'Low',
        microlamports: low,
        estimatedCostSol: estimateCostSol(low),
      },
      {
        label: 'Medium',
        microlamports: medium,
        estimatedCostSol: estimateCostSol(medium),
      },
      {
        label: 'High',
        microlamports: high,
        estimatedCostSol: estimateCostSol(high),
      },
      {
        label: 'Very High',
        microlamports: veryHigh,
        estimatedCostSol: estimateCostSol(veryHigh),
      },
    ];

    // Last 20 entries for the fee history chart (most recent slots)
    const sortedBySlot = [...results].sort((a, b) => a.slot - b.slot);
    const feeHistory = sortedBySlot.slice(-20).map((r) => ({
      slot: r.slot,
      fee: r.prioritizationFee,
    }));

    const congestionLevel = getCongestionLevel(medianFee);

    const data: GasData = {
      tiers,
      avgFee,
      medianFee,
      feeHistory,
      congestionLevel,
      timestamp: Date.now(),
    };

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch priority fees';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
