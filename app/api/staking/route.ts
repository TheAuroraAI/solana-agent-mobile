import { NextRequest, NextResponse } from 'next/server';

export interface StakingPosition {
  protocol: 'jito' | 'marinade' | 'native';
  label: string;
  asset: string;
  staked: number;
  tokenAmount: number;
  apy: number;
  rewards7d: number;
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
  requiresWallet: boolean;
}

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

// ─── Fetch real staking positions from wallet ─────────────────────────────────

const JITOSOL_MINT = 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn';
const MSOL_MINT = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So';

async function fetchWalletPositions(wallet: string, jitoApy: number, marinadeApy: number, nativeApy: number): Promise<StakingPosition[]> {
  const rpc = 'https://api.mainnet-beta.solana.com';

  // Fetch token accounts (jitoSOL, mSOL) and stake accounts
  const [tokenRes, stakeRes] = await Promise.all([
    fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [wallet, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }],
      }),
    }),
    fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2,
        method: 'getProgramAccounts',
        params: ['Stake11111111111111111111111111111111111111112', {
          filters: [{ memcmp: { offset: 44, bytes: wallet } }],
          encoding: 'jsonParsed',
        }],
      }),
    }),
  ]);

  const positions: StakingPosition[] = [];

  // Parse jitoSOL / mSOL
  if (tokenRes.ok) {
    const tokenData = await tokenRes.json() as {
      result: { value: { account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number } } } } } }[] };
    };

    for (const acc of tokenData.result?.value ?? []) {
      const info = acc.account?.data?.parsed?.info;
      if (!info) continue;

      if (info.mint === JITOSOL_MINT && info.tokenAmount.uiAmount > 0) {
        const jitoSOL = info.tokenAmount.uiAmount;
        positions.push({
          protocol: 'jito',
          label: 'Jito Liquid Staking',
          asset: 'jitoSOL',
          staked: jitoSOL * 1.04, // approximate exchange rate
          tokenAmount: jitoSOL,
          apy: jitoApy,
          rewards7d: (jitoSOL * jitoApy / 100) / 52,
          status: 'active',
          color: '#38bdf8',
        });
      }

      if (info.mint === MSOL_MINT && info.tokenAmount.uiAmount > 0) {
        const mSOL = info.tokenAmount.uiAmount;
        positions.push({
          protocol: 'marinade',
          label: 'Marinade Finance',
          asset: 'mSOL',
          staked: mSOL * 1.07, // approximate exchange rate
          tokenAmount: mSOL,
          apy: marinadeApy,
          rewards7d: (mSOL * marinadeApy / 100) / 52,
          status: 'active',
          color: '#818cf8',
        });
      }
    }
  }

  // Parse native stake accounts
  if (stakeRes.ok) {
    const stakeData = await stakeRes.json() as {
      result: { account: { data: { parsed: { info: { stake?: { delegation?: { stake: string }; meta?: { authorized: unknown } }; type?: string } } } }; pubkey: string }[];
    };

    let nativeStaked = 0;
    for (const acc of stakeData.result ?? []) {
      const info = acc.account?.data?.parsed?.info;
      const stake = info?.stake?.delegation?.stake;
      if (stake) {
        nativeStaked += parseInt(stake, 10) / 1e9;
      }
    }

    if (nativeStaked > 0) {
      positions.push({
        protocol: 'native',
        label: 'Native Stake',
        asset: 'SOL',
        staked: nativeStaked,
        tokenAmount: nativeStaked,
        apy: nativeApy,
        rewards7d: (nativeStaked * nativeApy / 100) / 52,
        status: 'active',
        color: '#34d399',
      });
    }
  }

  return positions;
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet')?.trim();

  const [jitoApy, marinadeApy] = await Promise.all([fetchJitoApy(), fetchMarinadeApy()]);

  const finalJitoApy = jitoApy ?? 7.52;
  const finalMarinadeApy = marinadeApy ?? 7.18;
  const nativeApy = 6.8; // Solana inflation-based estimate

  const apySource: 'live' | 'fallback' = jitoApy !== null || marinadeApy !== null ? 'live' : 'fallback';

  if (!wallet) {
    // No wallet — return APY rates only, no fake positions
    return NextResponse.json({
      positions: [],
      totalStaked: 0,
      totalRewards7d: 0,
      jitoApy: finalJitoApy,
      marinadeApy: finalMarinadeApy,
      nativeApy,
      source: apySource,
      requiresWallet: true,
    } satisfies StakingData);
  }

  try {
    const positions = await fetchWalletPositions(wallet, finalJitoApy, finalMarinadeApy, nativeApy);
    const totalStaked = positions.reduce((s, p) => s + p.staked, 0);
    const totalRewards7d = positions.reduce((s, p) => s + p.rewards7d, 0);

    return NextResponse.json({
      positions,
      totalStaked,
      totalRewards7d,
      jitoApy: finalJitoApy,
      marinadeApy: finalMarinadeApy,
      nativeApy,
      source: apySource,
      requiresWallet: false,
    } satisfies StakingData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch staking positions' },
      { status: 500 },
    );
  }
}
