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

// Safe fetch with timeout using AbortController (compatible with all Vercel runtimes)
function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(t));
}

async function fetchJitoApy(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout('https://kobe.mainnet.jito.network/api/v1/stake_pool_stats', 10000);
    if (!res.ok) return null;
    const data = await res.json();
    // API returns apy as array of {data: number, date: string}
    if (Array.isArray(data?.apy) && data.apy.length > 0) {
      const latest = data.apy[data.apy.length - 1];
      if (typeof latest?.data === 'number') return latest.data * 100;
    }
    // Scalar fallback in case API format changes
    if (typeof data?.apy === 'number') return data.apy * 100;
    return null;
  } catch {
    return null;
  }
}

async function fetchMarinadeApy(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout('https://api.marinade.finance/msol/apy/1y', 10000);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.value === 'number') return data.value * 100;
    if (typeof data === 'number') return data * 100;
    return null;
  } catch {
    return null;
  }
}

// Kamino USDC lending rate via DeFiLlama (pool d2141a59)
async function fetchKaminoUsdcApy(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      'https://yields.llama.fi/chart/d2141a59-c199-4be7-8d4b-c8223954836b',
      10000
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entries: { apy?: number }[] = data?.data ?? [];
    if (entries.length > 0) {
      const latest = entries[entries.length - 1];
      if (typeof latest?.apy === 'number') return parseFloat(latest.apy.toFixed(1));
    }
    return null;
  } catch {
    return null;
  }
}

// Jupiter JLP APY via DeFiLlama (pool cf41a15b)
async function fetchJupiterJlpApy(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      'https://yields.llama.fi/chart/cf41a15b-eb6a-46de-bc2b-cf4d0a58569c',
      10000
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entries: { apy?: number }[] = data?.data ?? [];
    if (entries.length > 0) {
      const latest = entries[entries.length - 1];
      if (typeof latest?.apy === 'number' && latest.apy > 0) {
        return parseFloat(latest.apy.toFixed(1));
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Drift USDC vault APY via DeFiLlama pools (filter for drift solana USDC)
async function fetchDriftUsdcApy(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout('https://yields.llama.fi/pools', 10000);
    if (!res.ok) return null;
    const data = await res.json();
    const pools: { project?: string; symbol?: string; chain?: string; apy?: number; tvlUsd?: number }[] =
      data?.data ?? [];
    // Find Drift USDC lending pool on Solana with meaningful TVL
    const driftUsdc = pools.find(
      (p) =>
        p.chain?.toLowerCase() === 'solana' &&
        p.project?.toLowerCase().includes('drift') &&
        p.symbol?.toUpperCase().includes('USDC') &&
        typeof p.apy === 'number' &&
        p.apy > 0 &&
        (p.tvlUsd ?? 0) > 1e6
    );
    if (driftUsdc && typeof driftUsdc.apy === 'number') {
      return parseFloat(driftUsdc.apy.toFixed(1));
    }
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
  const [jitoApy, marinadeApy, kaminoUsdcApy, jupiterJlpApy, driftUsdcApy] = await Promise.all([
    fetchJitoApy(),
    fetchMarinadeApy(),
    fetchKaminoUsdcApy(),
    fetchJupiterJlpApy(),
    fetchDriftUsdcApy(),
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
    if (rate.protocol === 'Kamino' && kaminoUsdcApy !== null) {
      updated.apy = kaminoUsdcApy;
      updated.source = 'live';
    }
    if (rate.protocol === 'Jupiter' && jupiterJlpApy !== null) {
      updated.apy = jupiterJlpApy;
      updated.source = 'live';
    }
    if (rate.protocol === 'Drift' && driftUsdcApy !== null) {
      updated.apy = driftUsdcApy;
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
