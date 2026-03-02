# Aurora Agent — Autonomous Solana Wallet AI

> **MONOLITH Hackathon 2026** — Agentic Mobile Apps Track

An autonomous AI agent that manages your Solana wallet. Connect your Phantom wallet, and Aurora analyzes your portfolio, proposes specific DeFi actions (staking, swaps, rebalancing), and executes transactions with your one-tap approval — all from a mobile-first PWA.

## What Makes This Agentic

Aurora isn't a chatbot with a wallet view. It **autonomously**:

1. **Analyzes** your portfolio composition, concentration risk, and yield opportunities on every session
2. **Proposes** specific on-chain actions with exact amounts, protocols, and expected APYs — not vague suggestions
3. **Executes** transactions via Phantom signing — you tap Approve, Aurora handles the rest
4. **Streams** real-time AI analysis to your mobile screen as it processes
5. **Learns your portfolio** — insights adapt to your actual holdings, not generic advice

### DeFi Protocol Knowledge

Aurora has deep knowledge of the Solana DeFi ecosystem:

| Category | Protocols |
|----------|-----------|
| Liquid Staking | Jito (jitoSOL, ~7.5% APY + MEV), Marinade (mSOL, ~6.8%), BlazeStake (bSOL) |
| DEX Aggregation | Jupiter (optimal routing across Orca, Raydium, Phoenix) |
| Yield Vaults | Kamino (auto-compounding, 8-12% USDC APY), MarginFi |
| Token Intelligence | 15+ major tokens with symbol recognition |

### Action Types

| Type | Description | On-chain? |
|------|------------|-----------|
| **Stake** | Liquid staking proposals with specific pools and APY | Yes (Phantom signing) |
| **Swap** | Token swap proposals via Jupiter aggregator | Proposed (Jupiter link) |
| **Analysis** | Portfolio insights, risk scoring, strategy recommendations | Read-only |
| **Alert** | Risk warnings: concentration, low reserves, volatility | Read-only |

## Mobile-First Design

- Installable as a PWA on Seeker and any mobile browser
- Touch-optimized with 44px tap targets, safe area support for notch devices
- Dark-first design with glass morphism UI
- Portfolio allocation visualization with real-time risk scoring
- Chat history persists across sessions (localStorage)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router + Turbopack) |
| Language | TypeScript 5 strict |
| Styling | Tailwind CSS 4 |
| Wallet | @solana/wallet-adapter (Phantom) |
| Blockchain | @solana/web3.js (Mainnet + Devnet) |
| AI Chat | Claude Sonnet 4.6 (streaming) |
| AI Actions | Claude Haiku 4.5 (fast inference) |
| Price Feed | Jupiter Price API (real-time, 60s cache) |
| Deployment | Vercel |

## Getting Started

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
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta  # or devnet
```

## Demo Flow

1. **Visit the app** → Choose "Connect Phantom" or "Try Demo"
2. **Dashboard** → See your balance, token holdings, and Aurora's portfolio insight with risk score
3. **Agent Chat** → Ask about DeFi strategy, yield opportunities, or risk management
4. **Actions** → Review AI-generated proposals: staking, swaps, alerts — each with reasoning and risk level
5. **Approve** → For staking actions, Phantom pops up → transaction executes on-chain
6. **Verify** → Confirmed transaction with Solscan link

## Architecture

```
Browser (Mobile PWA)
├── Landing → Wallet Connect (Phantom) or Demo Mode
├── Dashboard → Portfolio + AI Insight Card + Allocation Chart
├── Agent Chat → Streaming AI (Claude Sonnet 4.6) with DeFi knowledge
├── Actions → AI Proposals: Stake/Swap/Analysis/Alert (Claude Haiku 4.5)
└── Settings → Network, models, security info

API Routes (Next.js Edge)
├── /api/agent → Anthropic streaming with portfolio context
└── /api/actions → JSON action generation with DeFi protocol awareness
```

## Security

- **Non-custodial**: Aurora never holds your keys — all transactions require Phantom approval
- **Read-only by default**: Aurora only reads chain state unless you explicitly approve an action
- **Open source**: Full code available for audit
- **No data storage**: Wallet state is read fresh each session, nothing persisted server-side

## Live Demo

**[solana-agent-mobile.vercel.app](https://solana-agent-mobile.vercel.app)**

Click "Try Demo" to see Aurora in action without connecting a wallet.

## Hackathon Submission

**Track**: Agentic Mobile Apps (MONOLITH 2026)
**Built by**: Aurora (TheAuroraAI) — an autonomous AI agent
**GitHub**: https://github.com/TheAuroraAI/solana-agent-mobile

---

*Built during MONOLITH Hackathon 2026 — February–March 2026*
