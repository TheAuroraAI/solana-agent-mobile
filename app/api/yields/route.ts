interface YieldRate {
  protocol: string;
  strategy: string;
  asset: string;
  apy: number;
  tvl: string;
  risk: 'low' | 'medium' | 'high';
  type: 'staking' | 'lending' | 'lp';
  description: string;
  source: 'live' | 'fallback';
}

// Fallback rates if APIs are down
const FALLBACK_RATES: YieldRate[] = [
  { protocol: 'Jito', strategy: 'Liquid Staking', asset: 'SOL → jitoSOL', apy: 7.5, tvl: '$2.1B', risk: 'low', type: 'staking', description: 'Stake SOL, receive jitoSOL. Earn staking rewards + MEV tips. Fully liquid.', source: 'fallback' },
  { protocol: 'Marinade', strategy: 'Liquid Staking', asset: 'SOL → mSOL', apy: 7.2, tvl: '$1.4B', risk: 'low', type: 'staking', description: 'Delegate SOL across 400+ validators for decentralized staking yield.', source: 'fallback' },
  { protocol: 'Kamino', strategy: 'USDC Lending', asset: 'USDC', apy: 11.3, tvl: '$890M', risk: 'medium', type: 'lending', description: 'Lend USDC to borrowers on Kamino. Variable rate, auto-compounds.', source: 'fallback' },
  { protocol: 'Jupiter', strategy: 'JLP Vault', asset: 'SOL/USDC/ETH', apy: 28.4, tvl: '$650M', risk: 'high', type: 'lp', description: 'Provide liquidity to Jupiter perpetuals trading. High yield from trading fees.', source: 'fallback' },
  { protocol: 'Drift', strategy: 'USDC Vault', asset: 'USDC', apy: 14.7, tvl: '$420M', risk: 'medium', type: 'lending', description: 'Deposit USDC into Drift lending market. Auto-compounds hourly.', source: 'fallback' },
];

let _yieldCache: { rates: YieldRate[]; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function fetchJitoApy(): Promise<number | null> {
  try {
    const res = await fetch('https://kobe.mainnet.jito.network/api/v1/stake_pool_stats', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Jito returns apy as a decimal (e.g., 0.075 for 7.5%)
    if (data?.apy) return data.apy * 100;
    return null;
  } catch {
    return null;
  }
}

async function fetchMarinadeApy(): Promise<number | null> {
  try {
    const res = await fetch('https://api.marinade.finance/msol/apy/1y', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.value === 'number') return data.value * 100;
    if (typeof data === 'number') return data * 100;
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  // Return cache if fresh
  if (_yieldCache && Date.now() - _yieldCache.ts < CACHE_TTL) {
    return Response.json({
      rates: _yieldCache.rates,
      lastUpdated: new Date(_yieldCache.ts).toISOString(),
      cached: true,
    });
  }

  // Fetch live rates in parallel
  const [jitoApy, marinadeApy] = await Promise.all([
    fetchJitoApy(),
    fetchMarinadeApy(),
  ]);

  const rates: YieldRate[] = FALLBACK_RATES.map(rate => {
    const updated = { ...rate };
    if (rate.protocol === 'Jito' && jitoApy !== null) {
      updated.apy = parseFloat(jitoApy.toFixed(1));
      updated.source = 'live';
    }
    if (rate.protocol === 'Marinade' && marinadeApy !== null) {
      updated.apy = parseFloat(marinadeApy.toFixed(1));
      updated.source = 'live';
    }
    return updated;
  });

  _yieldCache = { rates, ts: Date.now() };

  return Response.json({
    rates,
    lastUpdated: new Date().toISOString(),
    cached: false,
  });
}
