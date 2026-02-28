import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const { messages, walletState } = await req.json();

  const systemPrompt = `You are Aurora, an autonomous AI agent that manages Solana wallets. You are direct, analytical, and action-oriented.

Current wallet state:
${walletState ? JSON.stringify(walletState, null, 2) : 'No wallet connected yet.'}

Your capabilities:
- Analyze portfolio composition and risk
- Identify rebalancing opportunities
- Suggest specific on-chain actions (transfers, swaps)
- Monitor for suspicious transactions
- Provide real-time market context

Be concise. Mobile users need quick, actionable insights. Use bullet points.`;

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: systemPrompt,
    messages,
  });

  // Return as a ReadableStream with Vercel AI SDK format (0:"text")
  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text;
            // Format as Vercel AI SDK data stream
            controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
          }
        }
        controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
        controller.close();
      } catch (err) {
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
}
