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

// Kamino USDC lending rate via their public market API
const KAMINO_USDC_RESERVE = 'D6q6wuQSriffjP5J1bNR6DHK5SH7pLDuukMv6ByNGi4';
async function fetchKaminoUsdcApy(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.kamino.finance/reserve-market-stats?env=mainnet-beta&start=0&end=0&frequency=1h&pubkey=${KAMINO_USDC_RESERVE}`,
      10000
    );
    if (!res.ok) return null;
    const data = await res.json();
    const apy =
      data?.supplyInterestAPY ??
      data?.data?.[0]?.supplyInterestAPY ??
      data?.stats?.supplyInterestAPY;
    if (typeof apy === 'number') return parseFloat((apy * 100).toFixed(1));
    return null;
  } catch {
    return null;
  }
}

async function fetchJupiterJlpApy(): Promise<number | null> {
  // Primary: Jupiter perpetuals pool stats API
  try {
    const res = await fetchWithTimeout('https://api.jup.ag/perpetuals/v1/pool-stats', 10000);
    if (res.ok) {
      try {
        const data = await res.json();
        // Try various field names the API may return
        const apy =
          data?.feeApr ??
          data?.totalApr ??
          data?.apy ??
          data?.apr ??
          data?.poolStats?.feeApr ??
          data?.poolStats?.totalApr ??
          data?.stats?.feeApr ??
          data?.stats?.totalApr;
        if (typeof apy === 'number' && apy > 0) {
          // Value may be a decimal fraction (0.285) or already a percentage (28.5)
          const pct = apy < 2 ? parseFloat((apy * 100).toFixed(1)) : parseFloat(apy.toFixed(1));
          return pct;
        }
      } catch {
        // JSON parse failed, fall through to secondary
      }
    }
  } catch {
    // fetch failed, fall through to secondary
  }

  // Secondary: CoinGecko pool data for JLP
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/pools/solana/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
      10000
    );
    if (res.ok) {
      try {
        const data = await res.json();
        const apy =
          data?.data?.attributes?.apr ??
          data?.data?.attributes?.apy ??
          data?.attributes?.apr ??
          data?.attributes?.apy;
        if (typeof apy === 'number' && apy > 0) {
          const pct = apy < 2 ? parseFloat((apy * 100).toFixed(1)) : parseFloat(apy.toFixed(1));
          return pct;
        }
        // CoinGecko sometimes returns string percentages
        if (typeof apy === 'string') {
          const parsed = parseFloat(apy);
          if (!isNaN(parsed) && parsed > 0) {
            return parsed < 2 ? parseFloat((parsed * 100).toFixed(1)) : parseFloat(parsed.toFixed(1));
          }
        }
      } catch {
        // JSON parse failed
      }
    }
  } catch {
    // fetch failed
  }

  return null;
}

async function fetchDriftUsdcApy(): Promise<number | null> {
  // Primary: Drift mainnet APY endpoint
  try {
    const res = await fetchWithTimeout('https://mainnet-beta.api.drift.trade/apys', 10000);
    if (res.ok) {
      try {
        const data = await res.json();
        // Drift returns an object keyed by market name or index; look for USDC
        const usdcApy =
          data?.USDC?.supplyApy ??
          data?.USDC?.apy ??
          data?.usdc?.supplyApy ??
          data?.usdc?.apy ??
          data?.['USDC-SPOT']?.supplyApy ??
          data?.['USDC-SPOT']?.apy ??
          (Array.isArray(data)
            ? (data.find((m: Record<string, unknown>) =>
                typeof m.symbol === 'string' && m.symbol.toUpperCase() === 'USDC'
              ) as Record<string, unknown> | undefined)?.supplyApy ?? null
            : null);
        if (typeof usdcApy === 'number' && usdcApy > 0) {
          // Value may be fractional (0.147) or percentage (14.7)
          const pct = usdcApy < 2 ? parseFloat((usdcApy * 100).toFixed(1)) : parseFloat(usdcApy.toFixed(1));
          return pct;
        }
      } catch {
        // JSON parse failed, fall through
      }
    }
  } catch {
    // fetch failed, fall through
  }

  // Secondary: Drift historical S3 data
  try {
    const res = await fetchWithTimeout(
      'https://drift-historical-data.s3.eu-west-1.amazonaws.com/spot-market-stats/latest.json',
      10000
    );
    if (res.ok) {
      try {
        const data = await res.json();
        // S3 data may be an array of market objects
        const markets: Record<string, unknown>[] = Array.isArray(data) ? data : (data?.markets ?? []);
        const usdcMarket = markets.find(
          (m: Record<string, unknown>) =>
            (typeof m.symbol === 'string' && m.symbol.toUpperCase() === 'USDC') ||
            m.marketIndex === 0
        );
        const apy =
          (usdcMarket?.depositApy as number | undefined) ??
          (usdcMarket?.supplyApy as number | undefined) ??
          (usdcMarket?.apy as number | undefined);
        if (typeof apy === 'number' && apy > 0) {
          const pct = apy < 2 ? parseFloat((apy * 100).toFixed(1)) : parseFloat(apy.toFixed(1));
          return pct;
        }
      } catch {
        // JSON parse failed
      }
    }
  } catch {
    // fetch failed
  }

  return null;
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
