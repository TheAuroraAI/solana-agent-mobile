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
  type: 'transfer' | 'alert' | 'analysis';
  title: string;
  description: string;
  details: {
    reasoning: string;
    risk: 'low' | 'medium' | 'high';
    estimatedGas?: string;
    recipient?: string;
    amount?: number;
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

    const systemPrompt = `You are Aurora, an autonomous AI agent analyzing a Solana wallet to generate actionable proposals.

Analyze the wallet state and generate 2-4 specific, actionable proposals. Return ONLY valid JSON.

Rules:
- "transfer" type: Only propose micro-transfers (≤0.01 SOL) for demo purposes. Always use recipient "GpXHXs5KfzfXbNKcMLNbAMsJsgPsBE7y5GtwVoiuxYvH" (Aurora's address).
- "analysis" type: Portfolio insights, risk assessment, diversification advice.
- "alert" type: Price monitoring suggestions, risk alerts.
- Risk: "low" for analysis/alerts, "medium" for small transfers, "high" for large transfers.
- Be specific to the ACTUAL wallet state (balance, tokens, transaction history).
- If balance < 0.01 SOL: no transfer proposals. Focus on analysis/alerts.
- estimatedGas: "~0.000005 SOL" for transfers, omit for others.

Response format (JSON array, no markdown):
[
  {
    "id": "1",
    "type": "analysis",
    "title": "Short action title",
    "description": "One sentence description of the proposed action",
    "details": {
      "reasoning": "2-3 sentences explaining why this action is recommended based on the actual wallet state",
      "risk": "low",
      "estimatedGas": "~0.000005 SOL"
    }
  }
]`;

    const userMessage = `Wallet state:
Address: ${walletState.address}
SOL Balance: ${walletState.solBalance.toFixed(4)} SOL (~$${walletState.solBalanceUsd.toFixed(2)} USD)
Token Holdings: ${walletState.tokens.length > 0 ? walletState.tokens.map((t) => `${t.uiAmount} ${t.symbol}`).join(', ') : 'None'}
Recent Transactions: ${walletState.recentTransactions.length} transactions (${walletState.recentTransactions.filter((t) => t.status === 'success').length} successful)
Portfolio Composition: ${walletState.tokens.length === 0 ? '100% SOL' : `SOL + ${walletState.tokens.length} token(s)`}

Generate 2-4 specific actions for this wallet.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON response
    let rawActions: Omit<AgentAction, 'status' | 'createdAt'>[];
    try {
      // Strip markdown code blocks if present
      const text = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      rawActions = JSON.parse(text);
    } catch {
      throw new Error('Failed to parse AI response as JSON');
    }

    // Add status and timestamp
    const now = Date.now();
    const actions: AgentAction[] = rawActions.map((action, index) => ({
      ...action,
      id: String(index + 1),
      status: 'pending' as const,
      createdAt: new Date(now - index * 1000 * 60 * 3).toISOString(),
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
