import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface WalletState {
  address: string;
  solBalance: number;
  solBalanceUsd: number;
  tokens: Array<{
    mint: string;
    symbol: string;
    amount: number;
    uiAmount: number;
  }>;
  recentTransactions: Array<{
    signature: string;
    type: string;
    amount?: number;
    status: string;
  }>;
}

interface AgentAction {
  id: string;
  type: 'stake' | 'swap' | 'alert' | 'analysis' | 'transfer';
  title: string;
  description: string;
  details: {
    reasoning: string;
    risk: 'low' | 'medium' | 'high';
    estimatedGas?: string;
    recipient?: string;
    amount?: number;
    protocol?: string;
    expectedApy?: string;
  };
  status: 'pending';
  createdAt: string;
}

export async function POST(req: Request) {
  try {
    const { walletState }: { walletState: WalletState } = await req.json();

    if (!walletState) {
      return Response.json({ error: 'walletState required' }, { status: 400 });
    }

    const totalUsd = walletState.solBalanceUsd +
      walletState.tokens.reduce((sum, t) => {
        if (t.symbol === 'USDC' || t.symbol === 'USDT') return sum + t.uiAmount;
        return sum;
      }, 0);

    const systemPrompt = `You are Aurora, an autonomous AI agent specializing in Solana DeFi portfolio management. You analyze wallets deeply and generate precise, actionable proposals.

WALLET ANALYSIS CONTEXT:
- Address: ${walletState.address}
- SOL: ${walletState.solBalance.toFixed(4)} SOL (~$${walletState.solBalanceUsd.toFixed(2)})
- Tokens: ${walletState.tokens.length > 0 ? walletState.tokens.map(t => `${t.uiAmount} ${t.symbol}`).join(', ') : 'None'}
- Total portfolio value: ~$${totalUsd.toFixed(2)}
- Recent txns: ${walletState.recentTransactions.length} (${walletState.recentTransactions.filter(t => t.status === 'success').length} successful)
- Composition: ${walletState.tokens.length === 0 ? '100% SOL' : `SOL + ${walletState.tokens.length} token(s)`}

SOLANA DEFI KNOWLEDGE:
- Liquid Staking: Jito (jitoSOL, ~7.5% APY + MEV rewards), Marinade (mSOL, ~6.8% APY), BlazeStake (bSOL, ~7.0% APY)
- DEX: Jupiter (best aggregator, optimal routing across Orca/Raydium/Phoenix)
- Lending: Kamino (auto-compounding vaults), MarginFi (lending/borrowing)
- Stablecoin yield: Kamino USDC vaults (~8-12% APY), MarginFi USDC lending (~5-8% APY)

ACTION TYPES:
1. "stake" — Liquid staking proposals. Use recipient addresses:
   - Jito (jitoSOL): "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" (~7.5% APY + MEV)
   - Marinade (mSOL): "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So" (~6.8% APY)
2. "swap" — Token swap proposals via Jupiter. Specify fromToken, toToken, reasoning.
3. "analysis" — Portfolio insights, risk assessment, strategy recommendations.
4. "alert" — Risk warnings: concentration, low reserves, impermanent loss risk, etc.

RULES:
- Generate 3-5 specific actions tailored to this EXACT wallet state.
- Always include at least 1 analysis and 1 actionable proposal (stake/swap).
- If SOL balance > 1.0: suggest liquid staking for a portion (keep 0.5 SOL liquid minimum for gas).
- If SOL balance > 5.0: suggest splitting between Jito AND Marinade for diversification.
- If heavy concentration in one asset: suggest rebalancing via Jupiter swap.
- If low stablecoins and decent SOL: suggest converting some SOL to USDC for opportunities.
- If balance < 0.1 SOL: focus on analysis and alerts only, no transfers.
- Risk ratings: "low" for analysis/staking, "medium" for swaps/rebalancing, "high" for large moves (>50% of portfolio).
- estimatedGas: "~0.000005 SOL" for most Solana txns.
- Each action must have specific amounts, not vague suggestions.
- protocol field: name the specific protocol (Jito, Marinade, Jupiter, Kamino).
- expectedApy field: include for staking/yield proposals.

Return ONLY a valid JSON array, no markdown wrapping:
[
  {
    "id": "1",
    "type": "analysis",
    "title": "Short title",
    "description": "One sentence",
    "details": {
      "reasoning": "2-3 sentences explaining why, specific to wallet state",
      "risk": "low",
      "protocol": "Aurora",
      "estimatedGas": "~0.000005 SOL"
    }
  }
]`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate personalized actions for this wallet.' }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON response — handle markdown wrapping robustly
    let rawActions: Omit<AgentAction, 'status' | 'createdAt'>[];
    try {
      let text = content.text.trim();
      // Strip markdown code blocks if present
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '').trim();
      }
      // Find JSON array boundaries
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) {
        text = text.slice(start, end + 1);
      }
      rawActions = JSON.parse(text);
    } catch {
      // Fallback: generate a single analysis action
      rawActions = [{
        id: '1',
        type: 'analysis',
        title: 'Portfolio snapshot',
        description: `Your wallet holds ${walletState.solBalance.toFixed(3)} SOL (~$${walletState.solBalanceUsd.toFixed(2)}) with ${walletState.tokens.length} token(s).`,
        details: {
          reasoning: 'Aurora analyzed your wallet but encountered an issue generating detailed proposals. Try refreshing to get personalized action recommendations.',
          risk: 'low',
          protocol: 'Aurora',
        },
      }];
    }

    // Normalize and add metadata
    const now = Date.now();
    const actions: AgentAction[] = rawActions.map((action, index) => ({
      ...action,
      type: (['stake', 'swap', 'alert', 'analysis', 'transfer'].includes(action.type) ? action.type : 'analysis') as AgentAction['type'],
      id: String(index + 1),
      status: 'pending' as const,
      createdAt: new Date(now - index * 1000 * 60 * 2).toISOString(),
    }));

    return Response.json({ actions });
  } catch (err) {
    console.error('/api/actions error:', err);
    return Response.json(
      { error: 'Failed to generate actions' },
      { status: 500 }
    );
  }
}
