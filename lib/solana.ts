import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

export type SolanaNetwork = 'devnet' | 'mainnet';

export function getNetwork(): SolanaNetwork {
  const env = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_SOLANA_NETWORK
    : process.env.NEXT_PUBLIC_SOLANA_NETWORK;
  return env === 'mainnet' || env === 'mainnet-beta' ? 'mainnet' : 'devnet';
}

export function getSolscanCluster(network: SolanaNetwork): string {
  return network === 'mainnet' ? '' : '?cluster=devnet';
}

export function getRpcUrl(network: SolanaNetwork): string {
  // Check localStorage for custom RPC (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('aurora-settings');
      if (raw) {
        const settings = JSON.parse(raw);
        if (settings.customRpc && settings.customRpc.startsWith('http')) {
          return settings.customRpc;
        }
      }
    } catch { /* ignore */ }
  }
  return network === 'mainnet' ? MAINNET_RPC : DEVNET_RPC;
}

// Common Solana token mint → symbol mapping
export const KNOWN_TOKEN_SYMBOLS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: 'mSOL',
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: 'jitoSOL',
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: 'bSOL',
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 'BONK',
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 'JUP',
  HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3: 'PYTH',
  rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof: 'RENDER',
  hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux: 'HNT',
  MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac: 'MNGO',
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': 'stSOL',
  WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk: 'WEN',
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: 'WIF',
  SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3: 'SKR',
};

// Solana Mobile SKR token constants
export const SKR_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';
export const SKR_STAKING_PROGRAM = 'SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ';
export const SKR_STAKING_URL = 'https://stake.solanamobile.com';
export const SKR_STAKING_APY = 20.2; // Current APY as of March 2026
export const SKR_DECIMALS = 9;

export interface TokenBalance {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  uiAmount: number;
}

export interface WalletState {
  address: string;
  solBalance: number;
  solBalanceUsd: number;
  tokens: TokenBalance[];
  recentTransactions: TransactionSummary[];
}

export interface TransactionSummary {
  signature: string;
  blockTime: number;
  type: 'send' | 'receive' | 'swap' | 'other';
  amount?: number;
  token?: string;
  status: 'success' | 'error';
}

export async function getWalletState(
  publicKeyStr: string,
  network: 'devnet' | 'mainnet' = 'devnet'
): Promise<WalletState> {
  const rpc = network === 'devnet' ? DEVNET_RPC : MAINNET_RPC;
  const connection = new Connection(rpc, 'confirmed');
  const publicKey = new PublicKey(publicKeyStr);

  // Get SOL balance
  const lamports = await connection.getBalance(publicKey);
  const solBalance = lamports / LAMPORTS_PER_SOL;

  // Get recent transactions (last 10 for better analysis)
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit: 10,
  });

  // Parse transaction types more intelligently
  const recentTransactions: TransactionSummary[] = signatures.map((sig) => {
    // Basic type inference from memo/log hints
    let type: TransactionSummary['type'] = 'other';
    if (sig.memo?.toLowerCase().includes('swap')) type = 'swap';
    return {
      signature: sig.signature,
      blockTime: sig.blockTime ?? 0,
      type,
      status: sig.err ? 'error' : 'success',
    };
  });

  // Get token accounts
  let tokens: TokenBalance[] = [];
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    tokens = tokenAccounts.value
      .filter((ta) => {
        const amount = ta.account.data.parsed.info.tokenAmount;
        return amount.uiAmount > 0;
      })
      .map((ta) => {
        const info = ta.account.data.parsed.info;
        const amount = info.tokenAmount;
        return {
          mint: info.mint,
          symbol: KNOWN_TOKEN_SYMBOLS[info.mint] ?? (info.mint.slice(0, 4) + '…'),
          amount: amount.amount,
          decimals: amount.decimals,
          uiAmount: amount.uiAmount,
        };
      })
      .sort((a, b) => {
        // Sort: stablecoins first, then by amount
        const stableOrder = (s: string) =>
          s === 'USDC' ? 0 : s === 'USDT' ? 1 : 10;
        return stableOrder(a.symbol) - stableOrder(b.symbol) || b.uiAmount - a.uiAmount;
      });
  } catch {
    // Token fetch failure is non-critical
  }

  const solPriceUsd = await getSolPrice();

  return {
    address: publicKeyStr,
    solBalance,
    solBalanceUsd: solBalance * solPriceUsd,
    tokens,
    recentTransactions,
  };
}

let _solPriceCache: { price: number; ts: number } | null = null;

export async function getSolPrice(): Promise<number> {
  const now = Date.now();
  if (_solPriceCache && now - _solPriceCache.ts < 60_000) {
    return _solPriceCache.price;
  }
  // Try Jupiter v4 price API first
  try {
    const res = await fetch(
      'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112',
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      const price = Number(data?.data?.['So11111111111111111111111111111111111111112']?.price);
      if (price > 0) {
        _solPriceCache = { price, ts: now };
        return price;
      }
    }
  } catch {
    // Fall through to CoinGecko
  }
  // CoinGecko fallback (no API key needed)
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      const price = data?.solana?.usd;
      if (typeof price === 'number' && price > 0) {
        _solPriceCache = { price, ts: now };
        return price;
      }
    }
  } catch {
    // Fall through to cached/fallback
  }
  return _solPriceCache?.price ?? 140;
}

export function formatSol(amount: number): string {
  if (amount < 0.001) return '< 0.001 SOL';
  if (amount < 1) return `${amount.toFixed(4)} SOL`;
  return `${amount.toFixed(3)} SOL`;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export const DEMO_WALLET_STATE: WalletState = {
  address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  solBalance: 12.847,
  solBalanceUsd: 1798.58, // ~$140/SOL
  tokens: [
    {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      amount: 250000000,
      decimals: 6,
      uiAmount: 250.0,
    },
    {
      mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
      symbol: 'jitoSOL',
      amount: 3200000000,
      decimals: 9,
      uiAmount: 3.2,
    },
    {
      mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      symbol: 'JUP',
      amount: 1500000000,
      decimals: 6,
      uiAmount: 1500,
    },
    {
      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      symbol: 'BONK',
      amount: 50000000000000,
      decimals: 5,
      uiAmount: 500000000,
    },
    {
      mint: SKR_MINT,
      symbol: 'SKR',
      amount: 5000_000000000,
      decimals: 9,
      uiAmount: 5000,
    },
  ],
  recentTransactions: [
    {
      signature: '4xRd7pMz2KhWn9vUFsB1oLqCjTgA3mYeNksPwXiZuVt8',
      blockTime: Math.floor(Date.now() / 1000) - 1800,
      type: 'swap',
      amount: 2.0,
      token: 'jitoSOL',
      status: 'success',
    },
    {
      signature: '2mKp5qNsF8vLcXwYjT6aHdBr3eGiZuMoAk9WnPsQyRt7',
      blockTime: Math.floor(Date.now() / 1000) - 7200,
      type: 'receive',
      amount: 5.0,
      status: 'success',
    },
    {
      signature: '7vJd4mWp1hNsXkTqUoRcGi2eAyBz6LfVnMkPs3QtZwYr',
      blockTime: Math.floor(Date.now() / 1000) - 43200,
      type: 'send',
      amount: 1.5,
      status: 'success',
    },
    {
      signature: '3nKxYqRt8mFpVwJsHdLzUcMbNe1oGiXvWk6pA2QsRyJt',
      blockTime: Math.floor(Date.now() / 1000) - 86400,
      type: 'swap',
      amount: 100.0,
      token: 'USDC',
      status: 'success',
    },
    {
      signature: '9pTwXmRkVzNyJsHf2QaLdBc7KiUeGo5rWx1tA3MnPyQs',
      blockTime: Math.floor(Date.now() / 1000) - 172800,
      type: 'receive',
      amount: 10.0,
      status: 'success',
    },
  ],
};

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
