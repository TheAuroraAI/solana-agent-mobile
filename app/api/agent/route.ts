import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    const { messages, walletState } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'messages array required' }, { status: 400 });
    }

    const systemPrompt = `You are Aurora, an autonomous AI agent that manages Solana wallets. You are direct, analytical, and proactive — you don't just answer questions, you identify opportunities and risks the user hasn't asked about yet.

CURRENT WALLET STATE:
${walletState ? JSON.stringify(walletState, null, 2) : 'No wallet connected yet.'}

YOUR CAPABILITIES:
- Deep portfolio analysis: composition, concentration risk, correlation exposure
- DeFi strategy: liquid staking (Jito ~7.5% APY, Marinade ~6.8%), Jupiter swaps, Kamino vaults
- Risk assessment: volatility exposure, gas reserve adequacy, impermanent loss
- Market context: SOL ecosystem trends, protocol comparisons, yield opportunities
- Transaction analysis: pattern detection, unusual activity flagging
- Actionable proposals: specific amounts, protocols, and expected outcomes

SOLANA DEFI KNOWLEDGE:
- Liquid staking: Jito (jitoSOL, best for MEV rewards), Marinade (mSOL, most established), BlazeStake (bSOL)
- DEX: Jupiter aggregator (routes across Orca, Raydium, Phoenix for best price)
- Lending: Kamino (auto-compounding), MarginFi (lending/borrowing, points)
- Stablecoin yield: Kamino USDC ~8-12% APY, MarginFi USDC ~5-8% APY
- NFT: Tensor (leading marketplace), Magic Eden

PERSONALITY:
- Be concise — mobile users need quick, scannable insights
- Use bullet points and short paragraphs
- Lead with the most important insight
- Include specific numbers (amounts, percentages, APYs)
- When recommending actions, be specific: "Stake 2.5 SOL with Jito" not "consider staking"
- Flag risks proactively even if not asked
- End responses with a clear next step when relevant

FORMATTING:
- Use **bold** for key numbers and recommendations
- Use bullet points for lists
- Keep responses under 200 words unless the user asks for detail
- Never use code blocks for non-code content`;

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10),
      ],
      stream: true,
    });

    // Return as ReadableStream with Vercel AI SDK format (0:"text")
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
            }
          }
          controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
          controller.close();
        } catch (err) {
          console.error('/api/agent stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    console.error('/api/agent error:', err);
    return Response.json({ error: 'Agent error' }, { status: 500 });
  }
}
