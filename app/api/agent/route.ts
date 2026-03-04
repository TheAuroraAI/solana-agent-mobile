import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are Aurora, an autonomous AI agent that manages Solana wallets. You are direct, analytical, and proactive — you don't just answer questions, you identify opportunities and risks the user hasn't asked about yet.

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
- SKR Guardian Staking: Stake SKR (Solana Mobile's native token) to Guardian validators. 20.2% APY. 48h cooldown to unstake. Stake at stake.solanamobile.com. Mint: SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3. Staking program: SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ.
  - Guardians are validators that verify and curate dApps in the Solana Mobile dApp Store
  - SKR holders delegate tokens to Guardians, earning rewards while securing the mobile ecosystem
  - Seeker device holders received SKR airdrop — staking it supports their own device ecosystem
  - SKR can be swapped on Jupiter (SOL → SKR) for non-Seeker holders who want exposure

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

export async function POST(req: Request) {
  try {
    const { messages, walletState, anthropicApiKey, chatModel, defiProtocols } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'messages array required' }, { status: 400 });
    }

    const protocols = Array.isArray(defiProtocols) && defiProtocols.length > 0
      ? defiProtocols
      : ['Jito', 'Marinade', 'Jupiter'];

    const systemPrompt = `${SYSTEM_PROMPT}

CURRENT WALLET STATE:
${walletState ? JSON.stringify(walletState, null, 2) : 'No wallet connected yet.'}

ENABLED DEFI PROTOCOLS FOR THIS USER: ${protocols.join(', ')}
Only suggest the above protocols. Do not mention protocols outside this list.`;

    const useAnthropic = typeof anthropicApiKey === 'string' && anthropicApiKey.startsWith('sk-ant-');
    const model = typeof chatModel === 'string' && chatModel.length > 0 ? chatModel : 'llama-3.3-70b-versatile';

    if (useAnthropic) {
      return handleAnthropic(anthropicApiKey, model, systemPrompt, messages);
    }
    return handleGroq(systemPrompt, messages);

  } catch (err) {
    console.error('/api/agent error:', err);
    return Response.json({ error: 'Agent error' }, { status: 500 });
  }
}

async function handleGroq(systemPrompt: string, messages: { role: string; content: string }[]) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: 'GROQ_API_KEY not configured. Add it to .env' }, { status: 500 });
  }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1200,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10) as { role: 'user' | 'assistant'; content: string }[],
    ],
    stream: true,
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
        }
        controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
        controller.close();
      } catch (err) {
        console.error('/api/agent groq stream error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  });
}

async function handleAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
) {
  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: false });

  // Map model IDs: handle both short and full names
  const modelMap: Record<string, string> = {
    'claude-sonnet-4-6': 'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001': 'claude-haiku-4-5-20251001',
    'claude-opus-4-6': 'claude-opus-4-6',
  };
  const claudeModel = modelMap[model] ?? 'claude-sonnet-4-6';

  const stream = await anthropic.messages.stream({
    model: claudeModel,
    max_tokens: 1200,
    system: systemPrompt,
    messages: messages.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            if (text) controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
          }
        }
        controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
        controller.close();
      } catch (err) {
        console.error('/api/agent anthropic stream error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  });
}
