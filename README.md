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

### SKR Guardian Staking Integration

Aurora integrates with Solana Mobile's native **SKR** token ecosystem:

- **SKR balance tracking** — automatically detected and displayed in your wallet
- **Guardian Staking card** — featured in the Yield tab with live 20.2% APY
- **AI agent awareness** — Aurora can advise on SKR staking strategy, cooldowns, and Guardian selection
- **One-tap access** — links directly to `stake.solanamobile.com` for staking actions
- **Seeker-native** — designed for Seeker device holders who hold SKR from the airdrop

### DeFi Protocol Knowledge

Aurora has deep knowledge of the Solana DeFi ecosystem:

| Category | Protocols |
|----------|-----------|
| **SKR Staking** | **Solana Mobile Guardian Staking (~20.2% APY)** — Seeker ecosystem |
| Liquid Staking | Jito (jitoSOL, ~7.5% APY + MEV), Marinade (mSOL, ~6.8%), BlazeStake (bSOL) |
| DEX Aggregation | Jupiter (optimal routing across Orca, Raydium, Phoenix) |
| Yield Vaults | Kamino (auto-compounding, 8-12% USDC APY), MarginFi |
| Token Intelligence | 15+ major tokens with symbol recognition including SKR |

### On-Chain Action Execution

Aurora doesn't just suggest — it **executes**. Every actionable proposal (staking, swapping) generates a real on-chain transaction via Jupiter V6 Swap API:

| Type | Description | Execution |
|------|------------|-----------|
| **Stake** | Liquid staking: SOL → jitoSOL/mSOL/bSOL | Jupiter swap tx → Phantom sign → on-chain |
| **Swap** | Token swaps: SOL → USDC, etc. | Jupiter aggregator → Phantom sign → on-chain |
| **Analysis** | Portfolio insights, risk scoring, strategy recommendations | Read-only |
| **Alert** | Risk warnings: concentration, low reserves, volatility | Read-only |

The agent proposes, you approve with one tap, and the transaction executes — no copy-pasting addresses, no manual DEX interactions.

## Installable PWA

Aurora registers a service worker and is installable as a standalone app on Seeker and any mobile device:

- **Offline-capable** — service worker caches the app shell for instant loading
- **Add to Home Screen** — runs fullscreen, no browser chrome
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
| AI Chat | Groq Llama 3.3 70B (streaming) or Claude (BYOK) |
| AI Actions | Groq Llama 3.3 70B (fast inference) or Claude (BYOK) |
| DeFi Execution | Jupiter V6 Swap API (staking + swaps, on-chain via Phantom) |
| Price Feed | Jupiter Price API (real-time, 60s cache) |
| SKR Integration | Solana Mobile Guardian Staking (SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ) |
| PWA | Custom service worker with app shell caching |
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
2. **Dashboard** → See your balance, token holdings (including SKR), and Aurora's portfolio insight with risk score
3. **Agent Chat** → Ask about DeFi strategy, SKR Guardian staking, yield opportunities, or risk management
4. **Actions** → Review AI-generated proposals: staking, swaps, alerts — each with reasoning and risk level
5. **Approve** → Tap "Sign & Send" — Aurora builds a Jupiter swap transaction, Phantom signs it, executes on-chain
6. **Verify** → Confirmed transaction with Solscan link
7. **Yield** → Browse DeFi opportunities including SKR Guardian Staking (20.2% APY) with detailed delegation guide

## Architecture

```
Browser (Mobile PWA)
├── Landing → Wallet Connect (Phantom) or Demo Mode
├── Dashboard → Portfolio + AI Insight Card + Allocation Chart
├── Agent Chat → Streaming AI (Claude Sonnet 4.6 or Groq) with DeFi + SKR knowledge
├── Actions → AI Proposals: Stake/Swap/Analysis/Alert (Haiku 4.5 or Groq)
├── Whales → Whale wallet tracker with clone functionality
├── Unlocks → Token unlock calendar (upcoming vesting events)
├── Yield → DeFi yield board + SKR Guardian Staking (featured)
└── Settings → Network, RPC, AI models (BYOK), DeFi protocols, API keys

API Routes (Next.js Edge)
├── /api/agent → Streaming AI with portfolio + SKR staking context
├── /api/actions → DeFi action generation with protocol awareness
├── /api/whales → Whale wallet monitoring
└── /api/unlocks → Token vesting schedule data
```

## Disclaimer

Aurora's AI analysis uses estimated DeFi rates (APYs, protocol yields) that reflect typical market conditions but are **not real-time data**. SOL price is fetched live from Jupiter Price API (60s cache), but protocol APYs and strategy recommendations are based on the AI model's training data and may not reflect current market conditions. Always verify rates on the protocol's official website before executing any transaction.

*This is not financial advice.*

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

### Key Technical Differentiators

- **Real transactions, not links**: Staking and swap actions execute on-chain via Jupiter V6 Swap API + Phantom signing — not redirect links
- **Streaming AI**: Real-time token-by-token streaming from Groq (free) or Claude (BYOK) — responsive on mobile
- **Non-custodial agent**: Aurora proposes but never holds keys — all signing happens in Phantom
- **SKR-native**: Built for Seeker holders with deep Guardian staking knowledge and SKR balance tracking
- **Installable PWA**: Service worker with offline caching, standalone mode, portrait lock
