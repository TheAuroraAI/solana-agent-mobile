import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';

export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

export type SolanaNetwork = 'devnet' | 'mainnet';

export function getNetwork(): SolanaNetwork {
  const env = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
  return env === 'mainnet' || env === 'mainnet-beta' ? 'mainnet' : 'devnet';
}

export function getSolscanCluster(network: SolanaNetwork): string {
  return network === 'mainnet' ? '' : '?cluster=devnet';
}

export function getRpcUrl(network: SolanaNetwork): string {
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
};

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

  // Get recent transactions (last 5)
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit: 5,
  });

  const recentTransactions: TransactionSummary[] = signatures.map((sig) => ({
    signature: sig.signature,
    blockTime: sig.blockTime ?? 0,
    type: 'other' as const,
    status: sig.err ? 'error' : 'success',
  }));

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
  try {
    const res = await fetch(
      'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112',
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      const price = data?.data?.['So11111111111111111111111111111111111111112']?.price;
      if (typeof price === 'number' && price > 0) {
        _solPriceCache = { price, ts: now };
        return price;
      }
    }
  } catch {
    // Fall through to fallback
  }
  return _solPriceCache?.price ?? 140;
}

export function formatSol(amount: number): string {
  if (amount < 0.001) return '< 0.001 SOL';
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
  address: 'DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  solBalance: 5.512,
  solBalanceUsd: 826.8,
  tokens: [
    {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      amount: 25000000,
      decimals: 6,
      uiAmount: 25.0,
    },
    {
      mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      symbol: 'USDT',
      amount: 10000000,
      decimals: 6,
      uiAmount: 10.0,
    },
  ],
  recentTransactions: [
    {
      signature: '4xRd7pMz2KhWn9vUFsB1oLqCjTgA3mYeNksPwXiZuVt8',
      blockTime: Math.floor(Date.now() / 1000) - 3600,
      type: 'receive',
      amount: 1.0,
      status: 'success',
    },
    {
      signature: '2mKp5qNsF8vLcXwYjT6aHdBr3eGiZuMoAk9WnPsQyRt7',
      blockTime: Math.floor(Date.now() / 1000) - 86400,
      type: 'send',
      amount: 0.5,
      status: 'success',
    },
    {
      signature: '7vJd4mWp1hNsXkTqUoRcGi2eAyBz6LfVnMkPs3QtZwYr',
      blockTime: Math.floor(Date.now() / 1000) - 172800,
      type: 'other',
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
