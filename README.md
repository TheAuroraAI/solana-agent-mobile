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
2. **Dashboard** → Balance, token holdings (SKR included), AI daily briefing, 24h P&L, health score
3. **Agent Chat** → Ask about DeFi strategy, SKR Guardian staking, yield opportunities, or risk management
4. **Actions** → AI-generated proposals: staking, swaps, alerts — each with reasoning and risk level
5. **Rebalance** → Set target allocations (sliders), Aurora calculates exact trades needed, routes to Actions
6. **Whale Watch** → Spot large transactions → tap "Copy Trade" → swap pre-loaded in Actions, ready to sign
7. **Approve** → Tap "Sign & Send" — Aurora builds a Jupiter swap transaction, Phantom signs it, executes on-chain
8. **Yield** → Browse DeFi opportunities including SKR Guardian Staking (20.2% APY) with delegation guide

## Architecture

```
Browser (Mobile PWA — 17 pages)
├── Landing → Wallet Connect (Phantom) or Demo Mode
├── Dashboard → Portfolio + 7d Chart + AI Briefing + 24h P&L + Health Score + Insight
├── Agent Chat → Streaming AI (Claude Sonnet 4.6 or Groq) with DeFi + SKR knowledge
├── Actions → AI Proposals: Stake/Swap/Analysis/Alert + Copy Trade mode (Haiku 4.5 or Groq)
├── Rebalance → Target allocation sliders + auto trade plan → routes to Actions for signing
├── Blinks → Solana Actions executor — paste any solana-action: URL, execute in-app
├── Whales → Real-time whale tracker with "Copy Trade" one-tap swap pre-fill
├── NFTs → NFT gallery with collection filters, floor prices, grid/list views
├── History → On-chain tx history with protocol ID, token deltas, analytics
├── Trending → Solana ecosystem tokens ranked by volume, gainers, losers
├── Search → 1000+ token search with live prices and DexScreener data
├── Unlocks → Token unlock calendar (upcoming vesting events from DefiLlama)
├── Yield → DeFi yield board (live rates) + SKR Guardian Staking (featured)
├── dApp Store → Solana Mobile dApp discovery
├── Policies → Portfolio automation rules (natural language rule creator)
├── Settings → Network, RPC, AI models (BYOK), DeFi protocols, API keys
└── Policies → Automation rules evaluated against live wallet state

API Routes (Next.js — 14 routes)
├── /api/agent → Streaming AI with portfolio + SKR staking context
├── /api/actions → DeFi action generation with protocol awareness
├── /api/briefing → AI-generated market briefing (Groq, 1h cache)
├── /api/blinks → Solana Actions resolver + executor (GET metadata, POST execute)
├── /api/clone → Smart wallet clone analysis
├── /api/nfts → NFT fetching via Helius DAS + Magic Eden fallback
├── /api/portfolio-history → 7-day portfolio value from CoinGecko SOL history
├── /api/prices → Live token prices + 24h change (CoinGecko, 60s cache)
├── /api/yields → Live APY rates: Jito, Marinade, Kamino (30m cache)
├── /api/whales → Whale wallet monitoring (Solana RPC)
├── /api/history → On-chain tx parsing with protocol identification
├── /api/trending → Solana ecosystem token rankings (CoinGecko)
├── /api/search → Token search with live prices
└── /api/unlocks → Token vesting schedule data
```

## Disclaimer

Aurora fetches live data from Jito, Marinade, Kamino, CoinGecko, and Solana RPC — but rates can change rapidly. The AI briefing is generated fresh every hour using live market data. Always verify rates on the protocol's official website before executing any transaction.

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
- **Installable PWA**: Service worker with offline caching, standalone mode, portrait lock, app shortcuts
- **Solana Actions (Blinks)**: Execute any `solana-action:` URL directly in Aurora — swap, stake, donate — without leaving the app
- **NFT Gallery**: Browse your Solana collectibles with floor prices, collection analytics, and Magic Eden links
- **7-Day Portfolio Chart**: Interactive SVG sparkline with hover tooltip using real CoinGecko historical SOL prices
- **Copy Trading**: Spot whale moves on Whale Watch → tap "Copy Trade" → swap pre-loaded in Actions, ready to sign
- **Portfolio Rebalance**: Set target allocations with sliders (Conservative/Balanced/Growth/Max Yield presets), Aurora calculates the exact trades needed and routes them to Actions for one-tap execution

### Mobile-First UX Features

| Feature | Description |
|---------|-------------|
| **Slide to Sign** | Touch gesture replaces buttons for transaction confirmation — more secure and tactile |
| **Pull to Refresh** | Swipe down to refresh wallet state and prices |
| **Bottom Sheet Nav** | Native iOS/Android-style navigation with expandable sheet |
| **Haptic Feedback** | Vibration on actions, confirmations, and navigation |
| **Offline Detection** | Real-time banner when connection drops |
| **PWA Install Prompt** | Native install prompt for Add to Home Screen |
| **NFA Disclaimer** | Dismissable "Not Financial Advice" banner on first launch + in transaction modal |
| **Skeleton Loading** | Shimmer placeholders during data fetch |
| **Page Transitions** | Smooth animated transitions between views |
| **Portrait Lock** | Viewport locked for consistent mobile layout |
| **Safe Area Support** | Notch-aware padding for Seeker and modern phones |
| **Solana Mobile Wallet Adapter** | Native Seeker/Saga wallet connection |
| **Network Status Widget** | Live TPS, slot height, block time from Solana RPC |
| **Transaction Preview** | Full details (amount, protocol, APY, fees, risk, slippage) before signing |
| **Visibility-Aware Polling** | Price tickers and whale alerts pause when tab is hidden |
| **Error States** | Graceful failure with retry on all data-fetching components |
