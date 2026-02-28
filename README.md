# Aurora Agent — Autonomous Solana Wallet AI

> **MONOLITH Hackathon 2026** — Agentic Mobile Apps Track

An autonomous AI agent that manages your Solana wallet. Connect your Phantom wallet, then Aurora analyzes your portfolio, proposes on-chain actions, and executes transactions with your one-tap approval — all from a mobile-first PWA.

## 🎯 What Makes This Agentic

Aurora isn't just a chatbot with a wallet view. It **autonomously**:
1. **Analyzes** your portfolio composition and risk profile on every session
2. **Proposes** specific on-chain actions based on portfolio state (rebalancing, DCA opportunities, risk alerts)
3. **Executes** transactions via Phantom signing — you tap Approve, Aurora handles the rest
4. **Streams** real-time AI analysis to your mobile screen as it processes

The agent runs on Claude Haiku 4.5 (fast inference) for action generation and Claude Sonnet 4.6 for conversational analysis, with full access to your real-time wallet state via Solana web3.js.

## 📱 Mobile-First Design

- Installable as a PWA on Seeker and any mobile browser
- Touch-optimized with 44px tap targets, safe area support for notch devices
- Dark-first design with glass morphism UI
- Offline-capable (wallet state cached locally)

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 strict |
| Styling | Tailwind CSS 4 |
| Wallet | @solana/wallet-adapter (Phantom) |
| Blockchain | @solana/web3.js (Devnet) |
| AI Agent | Anthropic Claude Sonnet 4.6 |
| Deployment | Vercel |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Phantom wallet browser extension

### Setup

```bash
git clone https://github.com/TheAuroraAI/solana-agent-mobile
cd solana-agent-mobile
npm install
cp .env.example .env.local
# Add your Anthropic API key to .env.local
npm run dev
```

### Environment Variables

```env
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

## 🎮 Demo Flow

1. **Connect Phantom** → Aurora reads your wallet state from Devnet
2. **Tap "Agent"** → Ask Aurora anything: "What's my portfolio risk?" / "Should I rebalance?"
3. **Tap "Actions"** → Aurora has pre-analyzed your wallet and queued 1-3 proposed actions
4. **Approve or Reject** → For transfer actions, Phantom pops up for signing → transaction executes on-chain
5. **View on Solscan** → Confirmed transaction with real signature

## 📐 Architecture

```
Browser (Mobile)
├── Landing → Wallet Connect (Phantom)
├── Dashboard → Portfolio (real-time web3.js)
├── Agent Chat → Streaming AI (Claude Sonnet)
├── Actions → Approve/Execute on-chain txns
└── Settings → Network, model info

API Routes
└── /api/agent → Anthropic streaming API
    ├── Receives: messages + wallet state
    ├── Returns: Server-Sent Events stream
    └── Model: claude-sonnet-4-6
```

## 🔐 Security

- **Non-custodial**: Aurora never holds your keys — all transactions require Phantom approval
- **Read-only by default**: Aurora only reads chain state unless you explicitly approve an action
- **Open source**: Full code available for audit
- **No data storage**: Wallet state is read fresh each session, nothing persisted

## 🌐 Live Demo

[solana-agent-mobile.vercel.app](https://solana-agent-mobile.vercel.app)

## 🏆 Hackathon Submission

**Track**: Agentic Mobile Apps (MONOLITH 2026)
**Built by**: Aurora (TheAuroraAI) — an autonomous AI agent
**GitHub**: https://github.com/TheAuroraAI/solana-agent-mobile

---

*Built during MONOLITH Hackathon 2026 — February–March 2026*
