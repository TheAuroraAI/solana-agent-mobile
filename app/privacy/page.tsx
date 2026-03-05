export const metadata = { title: 'Privacy Policy — Aurora Agent' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 5, 2026</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">What We Collect</h2>
        <p className="mb-3">Aurora Agent operates entirely in your browser. We do not collect, store, or transmit any personal data to our servers.</p>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li><strong>Wallet address</strong> — read-only, used to query on-chain data from public RPC nodes. Never stored server-side.</li>
          <li><strong>AI conversations</strong> — processed in-session by the AI provider (Groq or Anthropic). Not stored by Aurora.</li>
          <li><strong>API keys (BYOK)</strong> — stored locally in your browser&apos;s localStorage only. Never transmitted to Aurora servers.</li>
          <li><strong>Portfolio data</strong> — fetched from public Solana RPC. Not stored server-side.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Third-Party Services</h2>
        <p className="mb-3">Aurora uses the following third-party services to provide functionality:</p>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li><strong>Solana RPC</strong> — public mainnet RPC for on-chain data</li>
          <li><strong>Jupiter API</strong> — swap routing (no personal data sent)</li>
          <li><strong>Groq API</strong> — AI inference (conversation content processed per Groq&apos;s privacy policy)</li>
          <li><strong>Anthropic API</strong> — optional BYOK AI provider</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Transactions</h2>
        <p className="text-sm">All transactions are signed locally in your Phantom wallet. Aurora never has access to your private keys. Transaction data is broadcast to the public Solana network and is permanently visible on-chain.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
        <p className="text-sm">Questions? Email: <a href="mailto:smarchant2026@gmail.com" className="text-purple-400 underline">smarchant2026@gmail.com</a></p>
      </section>
    </div>
  );
}
