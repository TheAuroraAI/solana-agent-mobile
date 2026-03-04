'use client';

import { useState } from 'react';
import { Store, Star, ShieldCheck, ExternalLink, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface DApp {
  name: string;
  category: string;
  rating: number;
  downloads: string;
  description: string;
  verified: boolean;
  url: string;
  icon: string;
}

// Featured dApps from Solana Mobile dApp Store (illustrative)
const FEATURED_DAPPS: DApp[] = [
  {
    name: 'Jupiter',
    category: 'DeFi',
    rating: 4.9,
    downloads: '50K+',
    description: 'Best-in-class Solana DEX aggregator. Swap any token at the best price.',
    verified: true,
    url: 'https://jup.ag',
    icon: '🪐',
  },
  {
    name: 'Phantom',
    category: 'Wallet',
    rating: 4.8,
    downloads: '100K+',
    description: 'The most popular Solana wallet. Store, send, and receive SOL and tokens.',
    verified: true,
    url: 'https://phantom.app',
    icon: '👻',
  },
  {
    name: 'Tensor',
    category: 'NFT',
    rating: 4.7,
    downloads: '25K+',
    description: 'Pro NFT marketplace with real-time floor tracking and instant liquidity.',
    verified: true,
    url: 'https://tensor.trade',
    icon: '🔷',
  },
  {
    name: 'Kamino',
    category: 'DeFi',
    rating: 4.6,
    downloads: '15K+',
    description: 'Automated liquidity management and lending on Solana. Earn optimized yields.',
    verified: true,
    url: 'https://kamino.finance',
    icon: '🌊',
  },
  {
    name: 'Drift',
    category: 'DeFi',
    rating: 4.5,
    downloads: '20K+',
    description: 'Decentralized perpetuals exchange. Trade with up to 10x leverage on Solana.',
    verified: true,
    url: 'https://drift.trade',
    icon: '⚡',
  },
  {
    name: 'Mad Lads',
    category: 'NFT',
    rating: 4.8,
    downloads: '8K+',
    description: 'Legendary Solana NFT collection by Backpack. Staking and ecosystem perks.',
    verified: true,
    url: 'https://madlads.com',
    icon: '😤',
  },
];

const CATEGORIES = ['All', 'DeFi', 'NFT', 'Wallet', 'Gaming', 'Social'];

export function DAppStore() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = FEATURED_DAPPS.filter((d) => {
    const matchCat = activeCategory === 'All' || d.category === activeCategory;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-violet-400" />
          <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            Solana Mobile dApp Store
          </h2>
        </div>
        <span className="text-xs text-violet-400/70 bg-violet-500/10 px-2 py-0.5 rounded-full">
          Seeker Verified
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dApps..."
          className="w-full bg-gray-900/70 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              'flex-shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors',
              activeCategory === cat
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-300'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* dApp list */}
      <div className="space-y-2">
        {filtered.map((dapp) => (
          <button
            key={dapp.name}
            onClick={() => setExpanded(expanded === dapp.name ? null : dapp.name)}
            className="w-full text-left glass rounded-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">
                {dapp.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-sm font-medium">{dapp.name}</span>
                  {dapp.verified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" aria-label="Guardian Verified" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-gray-500 text-xs">{dapp.category}</span>
                  <span className="text-gray-700">·</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-gray-400 text-xs">{dapp.rating}</span>
                  </div>
                  <span className="text-gray-700">·</span>
                  <span className="text-gray-500 text-xs">{dapp.downloads}</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
            </div>
            {expanded === dapp.name && (
              <div className="px-3 pb-3">
                <p className="text-gray-400 text-xs leading-relaxed mb-2">{dapp.description}</p>
                <a
                  href={dapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-white text-xs font-medium"
                >
                  Open {dapp.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-gray-600 text-sm text-center py-6">No dApps found</div>
        )}
      </div>
    </div>
  );
}
