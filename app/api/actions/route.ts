import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';

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
    const { walletState, actionsModel, anthropicApiKey, defiProtocols }:
      { walletState: WalletState; actionsModel?: string; anthropicApiKey?: string; defiProtocols?: string[] } = await req.json();

    if (!walletState) {
      return Response.json({ error: 'walletState required' }, { status: 400 });
    }

    const useAnthropic = typeof anthropicApiKey === 'string' && anthropicApiKey.startsWith('sk-ant-') &&
      typeof actionsModel === 'string' && actionsModel.startsWith('claude');

    const groq = process.env.GROQ_API_KEY
      ? new Groq({ apiKey: process.env.GROQ_API_KEY })
      : null;

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
1. "stake" — Liquid staking proposals. Uses Jupiter swap API under the hood. Use recipient addresses:
   - Jito (jitoSOL): "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" (~7.5% APY + MEV)
   - Marinade (mSOL): "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So" (~6.8% APY)
2. "swap" — Token swap proposals via Jupiter aggregator. Executed on-chain with one-tap approval.
3. "analysis" — Portfolio insights, risk assessment, strategy recommendations.
4. "alert" — Risk warnings: concentration, low reserves, impermanent loss risk, etc.

SKR GUARDIAN STAKING (Solana Mobile ecosystem):
- If user holds SKR tokens (mint: SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3): suggest Guardian staking at stake.solanamobile.com (~20.2% APY, 48h cooldown)
- If user holds NO SKR but has >2 SOL: suggest swapping some SOL for SKR to participate in Seeker ecosystem staking
- SKR Guardian staking secures the Solana Mobile dApp verification network and supports the Seeker device ecosystem

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

    const protocolList = Array.isArray(defiProtocols) && defiProtocols.length > 0
      ? defiProtocols.join(', ')
      : 'Jito, Marinade, Jupiter';
    const fullPrompt = systemPrompt + `\n\nENABLED DEFI PROTOCOLS: ${protocolList}\nOnly suggest the above protocols.\n\nReturn a JSON object with key "actions" containing the array.`;

    // Request with JSON mode for structured output
    let rawActions: Omit<AgentAction, 'status' | 'createdAt'>[] = [];
    let parseSuccess = false;

    if (useAnthropic && anthropicApiKey) {
      // Use Anthropic Claude model
      try {
        const anthropic = new Anthropic({ apiKey: anthropicApiKey, dangerouslyAllowBrowser: false });
        const modelMap: Record<string, string> = {
          'claude-sonnet-4-6': 'claude-sonnet-4-6',
          'claude-haiku-4-5-20251001': 'claude-haiku-4-5-20251001',
          'claude-opus-4-6': 'claude-opus-4-6',
        };
        const claudeModel = modelMap[actionsModel ?? ''] ?? 'claude-haiku-4-5-20251001';
        const msg = await anthropic.messages.create({
          model: claudeModel,
          max_tokens: 2048,
          system: fullPrompt,
          messages: [{ role: 'user', content: 'Generate personalized actions for this wallet. Return ONLY valid JSON.' }],
        });
        const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '').trim();
        }
        const parsed = JSON.parse(cleaned);
        rawActions = Array.isArray(parsed) ? parsed : (parsed.actions ?? [parsed]);
        if (rawActions.length > 0) parseSuccess = true;
      } catch {
        // Fall through to Groq
      }
    }

    for (let attempt = 0; attempt < 2 && !parseSuccess && groq; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 2048,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: fullPrompt },
            { role: 'user', content: attempt === 0
              ? 'Generate personalized actions for this wallet.'
              : 'Generate 3 simple actions for this wallet as a JSON object with "actions" array.' },
          ],
        });

        const text = completion.choices[0]?.message?.content || '';
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '').trim();
        }

        const parsed = JSON.parse(cleaned);
        rawActions = Array.isArray(parsed) ? parsed : (parsed.actions ?? [parsed]);
        if (rawActions.length > 0) parseSuccess = true;
      } catch {
        if (attempt === 1) {
          rawActions = [];
        }
      }
    }

    // If LLM failed, generate deterministic actions based on wallet state
    if (rawActions.length === 0) {
      rawActions = [];
      // Analysis action
      rawActions.push({
        id: '1',
        type: 'analysis',
        title: 'Portfolio overview',
        description: `Your wallet holds ${walletState.solBalance.toFixed(3)} SOL (~$${walletState.solBalanceUsd.toFixed(2)}) with ${walletState.tokens.length} token(s).`,
        details: {
          reasoning: `Total portfolio value: ~$${totalUsd.toFixed(2)}. ${walletState.solBalance > 2 ? 'Consider liquid staking a portion for yield.' : 'Low balance — focus on accumulation.'}`,
          risk: 'low',
          protocol: 'Aurora',
        },
      });
      // Staking suggestion if enough SOL
      if (walletState.solBalance > 1.0) {
        const stakeAmount = Math.min(walletState.solBalance * 0.4, walletState.solBalance - 0.5);
        rawActions.push({
          id: '2',
          type: 'stake',
          title: `Stake ${stakeAmount.toFixed(2)} SOL with Jito`,
          description: `Convert ${stakeAmount.toFixed(2)} SOL → jitoSOL for ~7.5% APY + MEV rewards.`,
          details: {
            reasoning: 'Jito offers the highest liquid staking yield on Solana. jitoSOL is fully liquid — swap back via Jupiter anytime.',
            risk: 'low',
            estimatedGas: '~0.000005 SOL',
            recipient: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
            amount: parseFloat(stakeAmount.toFixed(4)),
            protocol: 'Jito',
            expectedApy: '~7.5%',
          },
        });
      }
    }

    // Inject SKR Guardian staking action if user holds SKR or has enough SOL
    const hasSKR = walletState.tokens.some(t => t.symbol === 'SKR' && t.uiAmount > 0);
    const hasSkrAction = rawActions.some(a =>
      a.title?.toLowerCase().includes('skr') || a.details?.protocol?.toLowerCase().includes('guardian')
    );
    if (!hasSkrAction && (hasSKR || walletState.solBalance > 2)) {
      const skrToken = walletState.tokens.find(t => t.symbol === 'SKR');
      if (hasSKR && skrToken) {
        rawActions.push({
          id: String(rawActions.length + 1),
          type: 'stake',
          title: `Stake ${skrToken.uiAmount.toLocaleString()} SKR with Guardian`,
          description: `Delegate your SKR to a Guardian validator for ~20.2% APY. Supports Solana Mobile dApp verification.`,
          details: {
            reasoning: `You hold ${skrToken.uiAmount.toLocaleString()} SKR tokens. Guardian staking earns ~20.2% APY with a 48h cooldown to unstake. This secures the Solana Mobile dApp Store network while generating yield.`,
            risk: 'low',
            protocol: 'Solana Mobile Guardian',
            expectedApy: '~20.2%',
          },
        });
      } else if (walletState.solBalance > 2) {
        rawActions.push({
          id: String(rawActions.length + 1),
          type: 'swap',
          title: 'Swap SOL → SKR for Guardian Staking',
          description: `Acquire SKR tokens via Jupiter swap, then stake for ~20.2% APY on Solana Mobile.`,
          details: {
            reasoning: `You have no SKR tokens but enough SOL to participate. SKR Guardian staking offers ~20.2% APY — one of the highest yields on Solana. Swap a small amount to try it.`,
            risk: 'medium',
            estimatedGas: '~0.000005 SOL',
            amount: 0.5,
            protocol: 'Jupiter → SKR Guardian',
            expectedApy: '~20.2%',
          },
        });
      }
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
