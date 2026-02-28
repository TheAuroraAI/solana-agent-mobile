import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';

export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

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
          symbol: info.mint.slice(0, 6) + '...', // We'd need a token list for proper symbols
          amount: amount.amount,
          decimals: amount.decimals,
          uiAmount: amount.uiAmount,
        };
      });
  } catch {
    // Token fetch failure is non-critical
  }

  // Rough SOL price estimate (would use real API in production)
  const solPriceUsd = 150; // Approximate

  return {
    address: publicKeyStr,
    solBalance,
    solBalanceUsd: solBalance * solPriceUsd,
    tokens,
    recentTransactions,
  };
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

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
