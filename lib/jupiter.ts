import { VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Known output mints for staking actions (recipient field = output mint)
export const STAKING_MINTS = new Set([
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // jitoSOL
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', // bSOL
]);

/**
 * Get a ready-to-sign swap transaction from Jupiter V6 API.
 * Works for staking (SOL→jitoSOL) and swaps (SOL→USDC) alike.
 */
export async function getJupiterSwapTx(
  userPublicKey: string,
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  inputDecimals: number = 9,
  slippageBps: number = 100,
): Promise<{ transaction: VersionedTransaction; outAmount: string }> {
  const amountRaw = Math.floor(inputAmount * 10 ** inputDecimals);

  // 1. Get quote
  const quoteUrl = new URL(JUPITER_QUOTE_API);
  quoteUrl.searchParams.set('inputMint', inputMint);
  quoteUrl.searchParams.set('outputMint', outputMint);
  quoteUrl.searchParams.set('amount', String(amountRaw));
  quoteUrl.searchParams.set('slippageBps', String(slippageBps));

  const quoteRes = await fetch(quoteUrl.toString());
  if (!quoteRes.ok) {
    const body = await quoteRes.text().catch(() => '');
    throw new Error(`Jupiter quote failed (${quoteRes.status}): ${body.slice(0, 200)}`);
  }
  const quoteResponse = await quoteRes.json();

  // 2. Get swap transaction
  const swapRes = await fetch(JUPITER_SWAP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
    }),
  });
  if (!swapRes.ok) {
    const body = await swapRes.text().catch(() => '');
    throw new Error(`Jupiter swap failed (${swapRes.status}): ${body.slice(0, 200)}`);
  }
  const { swapTransaction } = await swapRes.json();

  // 3. Deserialize versioned transaction (browser-safe base64 decode)
  const binaryStr = atob(swapTransaction);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const transaction = VersionedTransaction.deserialize(bytes);

  return {
    transaction,
    outAmount: quoteResponse.outAmount ?? '0',
  };
}

/**
 * Determine the output mint for an action based on type and details.
 */
export function resolveOutputMint(
  actionType: string,
  recipient?: string,
): string | null {
  if (actionType === 'stake' && recipient && STAKING_MINTS.has(recipient)) {
    return recipient; // recipient IS the output mint (jitoSOL, mSOL, bSOL)
  }
  if (actionType === 'swap') {
    return USDC_MINT; // default swap target
  }
  return null;
}
