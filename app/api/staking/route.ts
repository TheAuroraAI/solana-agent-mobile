import { NextResponse } from 'next/server';

export interface StakingPosition {
  protocol: 'jito' | 'marinade' | 'native';
  label: string;
  asset: string;
  staked: number;       // SOL value
  tokenAmount: number;  // liquid token amount (jitoSOL / mSOL)
  apy: number;
  rewards7d: number;    // SOL earned in last 7 days (estimated)
  status: 'active' | 'deactivating' | 'inactive';
  color: string;
}

export interface StakingData {
  positions: StakingPosition[];
  totalStaked: number;
  totalRewards7d: number;
  jitoApy: number;
  marinadeApy: number;
  nativeApy: number;
  source: 'live' | 'fallback';
}

let _cache: { data: StakingData; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

async function fetchJitoApy(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout('https://kobe.mainnet.jito.network/api/v1/stake_pool_stats', 8000);
    if (!res.ok) return null;
    const data = await res.json();
    // API returns apy as array of {data: number, date: string}
    if (Array.isArray(data?.apy) && data.apy.length > 0) {
      const latest = data.apy[data.apy.length - 1];
      if (typeof latest?.data === 'number') return latest.data * 100;
    }
    if (typeof data?.apy === 'number') return data.apy * 100;
    return null;
  } catch { return null; }
}

async function fetchMarinadeApy(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout('https://api.marinade.finance/msol/apy/latest', 8000);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.value === 'number') return data.value * 100;
    return null;
  } catch { return null; }
}

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data);
  }

  const [jitoApy, marinadeApy] = await Promise.all([
    fetchJitoApy(),
    fetchMarinadeApy(),
  ]);

  const finalJitoApy = jitoApy ?? 7.52;
  const finalMarinadeApy = marinadeApy ?? 7.18;
  const nativeApy = 6.8;

  // Demo staking positions — real amounts from connected wallet would populate these
  const positions: StakingPosition[] = [
    {
      protocol: 'jito',
      label: 'Jito Liquid Staking',
      asset: 'jitoSOL',
      staked: 12.45,
      tokenAmount: 11.98,
      apy: finalJitoApy,
      rewards7d: 0.0166,
      status: 'active',
      color: '#38bdf8',
    },
    {
      protocol: 'marinade',
      label: 'Marinade Finance',
      asset: 'mSOL',
      staked: 5.20,
      tokenAmount: 4.89,
      apy: finalMarinadeApy,
      rewards7d: 0.0072,
      status: 'active',
      color: '#818cf8',
    },
    {
      protocol: 'native',
      label: 'Native Stake',
      asset: 'SOL',
      staked: 3.0,
      tokenAmount: 3.0,
      apy: nativeApy,
      rewards7d: 0.0039,
      status: 'active',
      color: '#34d399',
    },
  ];

  const totalStaked = positions.reduce((sum, p) => sum + p.staked, 0);
  const totalRewards7d = positions.reduce((sum, p) => sum + p.rewards7d, 0);

  const data: StakingData = {
    positions,
    totalStaked,
    totalRewards7d,
    jitoApy: finalJitoApy,
    marinadeApy: finalMarinadeApy,
    nativeApy,
    source: jitoApy !== null || marinadeApy !== null ? 'live' : 'fallback',
  };

  _cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}
