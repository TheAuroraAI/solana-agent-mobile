import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Known SPL token mints with metadata
const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number; cgId?: string }> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter', decimals: 6 },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk', decimals: 5 },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF', name: 'dogwifhat', decimals: 6 },
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': { symbol: 'jitoSOL', name: 'Jito Staked SOL', decimals: 9 },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade Staked SOL', decimals: 9 },
  'SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ': { symbol: 'SKR', name: 'Solana Mobile SKR', decimals: 6 },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium', decimals: 6 },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', name: 'Pyth Network', decimals: 6 },
};

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(t));
}

async function getSolBalance(wallet: string): Promise<number> {
  const res = await fetchWithTimeout(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [wallet, { commitment: 'confirmed' }],
    }),
  }, 8000);
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const data = await res.json() as { result?: { value?: number }; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return (data.result?.value ?? 0) / 1e9;
}

interface TokenAccountValue {
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
}

interface TokenAccount {
  pubkey: string;
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          tokenAmount: TokenAccountValue;
        };
      };
    };
    lamports: number;
  };
}

async function getTokenAccounts(wallet: string): Promise<TokenAccount[]> {
  const res = await fetchWithTimeout(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'getTokenAccountsByOwner',
      params: [
        wallet,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ],
    }),
  }, 10000);
  if (!res.ok) throw new Error(`RPC token ${res.status}`);
  const data = await res.json() as { result?: { value?: TokenAccount[] }; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result?.value ?? [];
}

async function fetchPrices(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {};
  const allMints = [SOL_MINT, ...mints].join(',');
  const res = await fetchWithTimeout(
    `https://api.dexscreener.com/tokens/v1/solana/${allMints}`,
    { headers: { Accept: 'application/json' } },
    8000,
  );
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);

  interface DexPair {
    baseToken?: { address?: string };
    priceUsd?: string;
    liquidity?: { usd?: number };
  }

  const pairs = await res.json() as DexPair[];
  const prices: Record<string, number> = {};
  for (const pair of pairs) {
    const mint = pair.baseToken?.address;
    if (mint && !prices[mint]) {
      const p = parseFloat(pair.priceUsd ?? '0');
      if (p > 0) prices[mint] = p;
    }
  }
  return prices;
}

interface TokenHolding {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  priceUsd: number;
  valueUsd: number;
  allocation: number; // percentage, filled in later
}

// GET /api/portfolio?wallet=ADDRESS
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet')?.trim();

  if (!wallet || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return NextResponse.json(
      { error: 'Missing or invalid wallet address. Pass ?wallet=<base58address>' },
      { status: 400 }
    );
  }

  try {
    // Fetch SOL balance and token accounts in parallel
    const [solBalance, tokenAccounts] = await Promise.all([
      getSolBalance(wallet),
      getTokenAccounts(wallet),
    ]);

    // Filter to non-zero, known tokens only
    const nonZeroAccounts = tokenAccounts.filter((acc) => {
      const amount = acc.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
      return amount > 0;
    });

    const knownAccounts = nonZeroAccounts.filter((acc) =>
      acc.account.data.parsed.info.mint in KNOWN_TOKENS
    );

    // Fetch prices
    const mintsToPrice = [SOL_MINT, ...knownAccounts.map((a) => a.account.data.parsed.info.mint)];
    const prices = await fetchPrices(mintsToPrice);

    const solPrice = prices[SOL_MINT] ?? 0;
    const solValueUsd = solBalance * solPrice;

    // Build token holdings
    const holdings: TokenHolding[] = knownAccounts.map((acc) => {
      const mint = acc.account.data.parsed.info.mint;
      const meta = KNOWN_TOKENS[mint];
      const balance = acc.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
      const priceUsd = prices[mint] ?? 0;
      const valueUsd = balance * priceUsd;
      return {
        mint,
        symbol: meta.symbol,
        name: meta.name,
        balance,
        decimals: meta.decimals,
        priceUsd,
        valueUsd,
        allocation: 0, // filled below
      };
    });

    // Sort by value
    holdings.sort((a, b) => b.valueUsd - a.valueUsd);

    const totalUsd = solValueUsd + holdings.reduce((s, h) => s + h.valueUsd, 0);

    // Fill allocations
    if (totalUsd > 0) {
      for (const h of holdings) {
        h.allocation = (h.valueUsd / totalUsd) * 100;
      }
    }

    // Risk scoring: high SOL concentration = low diversification risk
    const solAllocation = totalUsd > 0 ? (solValueUsd / totalUsd) * 100 : 100;
    const riskScore = Math.min(100, Math.round(
      (solAllocation > 80 ? 60 : solAllocation > 60 ? 40 : 20) +
      (holdings.length === 0 ? 20 : holdings.length < 3 ? 10 : 0)
    ));

    return NextResponse.json({
      wallet,
      sol: {
        balance: solBalance,
        priceUsd: solPrice,
        valueUsd: solValueUsd,
        allocation: totalUsd > 0 ? (solValueUsd / totalUsd) * 100 : 100,
      },
      tokens: holdings,
      totalUsd,
      tokenCount: holdings.length,
      riskScore,
      riskLabel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
      source: 'live',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Portfolio fetch failed: ${message}`, wallet, source: 'error' },
      { status: 503 }
    );
  }
}
