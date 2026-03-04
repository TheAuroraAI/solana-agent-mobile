'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, ImageOff, RefreshCw, Wifi, WifiOff, Grid3X3, List } from 'lucide-react';
import { clsx } from 'clsx';

interface NftItem {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  collection: string;
  floorPrice: number | null;
  listed: boolean;
  listPrice: number | null;
  attributes: Array<{ trait_type: string; value: string }>;
  externalUrl: string;
}

function NftImage({ src, name }: { src: string; name: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full aspect-square bg-gray-800/60 rounded-xl flex items-center justify-center">
        <ImageOff className="w-8 h-8 text-gray-600" />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-800/60">
      {!loaded && (
        <div className="absolute inset-0 bg-gray-800/60 animate-pulse" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className={clsx('w-full h-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  );
}

function NftCard({ nft, viewMode }: { nft: NftItem; viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <a
        href={nft.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 glass rounded-2xl hover:bg-white/5 transition-colors"
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800/60">
          <NftImage src={nft.image} name={nft.name} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{nft.name}</p>
          <p className="text-gray-400 text-xs truncate">{nft.collection}</p>
          {nft.floorPrice && (
            <p className="text-violet-400 text-xs mt-0.5">Floor: {nft.floorPrice.toFixed(2)} SOL</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          {nft.listed && nft.listPrice && (
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
              Listed {nft.listPrice.toFixed(1)} SOL
            </span>
          )}
          <ExternalLink className="w-4 h-4 text-gray-600 mt-1 ml-auto" />
        </div>
      </a>
    );
  }

  return (
    <a
      href={nft.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block glass rounded-2xl overflow-hidden hover:ring-1 hover:ring-violet-500/40 transition-all"
    >
      <NftImage src={nft.image} name={nft.name} />
      <div className="p-2.5">
        <p className="text-white text-xs font-semibold truncate">{nft.name}</p>
        <p className="text-gray-500 text-xs truncate">{nft.collection}</p>
        <div className="flex items-center justify-between mt-1.5">
          {nft.floorPrice ? (
            <span className="text-violet-400 text-xs font-medium">{nft.floorPrice.toFixed(1)} SOL</span>
          ) : (
            <span className="text-gray-600 text-xs">—</span>
          )}
          {nft.listed && (
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full">Listed</span>
          )}
        </div>
      </div>
    </a>
  );
}

function CollectionSummary({ nfts }: { nfts: NftItem[] }) {
  const collections = nfts.reduce<Record<string, { count: number; floor: number | null }>>((acc, nft) => {
    if (!acc[nft.collection]) acc[nft.collection] = { count: 0, floor: nft.floorPrice };
    acc[nft.collection].count++;
    return acc;
  }, {});

  const totalFloorValue = nfts.reduce((sum, nft) => sum + (nft.floorPrice ?? 0), 0);
  const listedCount = nfts.filter(n => n.listed).length;

  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      <div className="glass rounded-xl p-3 text-center">
        <p className="text-violet-400 text-base font-bold">{nfts.length}</p>
        <p className="text-gray-500 text-xs mt-0.5">Total NFTs</p>
      </div>
      <div className="glass rounded-xl p-3 text-center">
        <p className="text-blue-400 text-base font-bold">{Object.keys(collections).length}</p>
        <p className="text-gray-500 text-xs mt-0.5">Collections</p>
      </div>
      <div className="glass rounded-xl p-3 text-center">
        <p className="text-emerald-400 text-base font-bold">
          {totalFloorValue > 0 ? `${totalFloorValue.toFixed(1)} ◎` : `${listedCount} listed`}
        </p>
        <p className="text-gray-500 text-xs mt-0.5">
          {totalFloorValue > 0 ? 'Floor value' : 'Listed'}
        </p>
      </div>
    </div>
  );
}

export function NftGallery() {
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const [nfts, setNfts] = useState<NftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<string>('all');

  const fetchNfts = useCallback(async () => {
    setLoading(true);
    try {
      const wallet = publicKey?.toString();
      const params = new URLSearchParams();
      if (wallet && !isDemo) params.set('wallet', wallet);
      if (isDemo || !wallet) params.set('demo', 'true');

      const res = await fetch(`/api/nfts?${params}`);
      if (!res.ok) return;
      const data = await res.json() as { nfts: NftItem[]; source: string };
      setNfts(data.nfts ?? []);
      setSource(data.source ?? '');
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, [publicKey, isDemo]);

  useEffect(() => { fetchNfts(); }, [fetchNfts]);

  const collections = Array.from(new Set(nfts.map(n => n.collection)));
  const filtered = filter === 'all' ? nfts : nfts.filter(n => n.collection === filter);
  const isLive = source !== 'demo';

  return (
    <div className="safe-top px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-white text-xl font-bold">NFT Gallery</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-gray-400 text-xs">Your Solana collectibles</p>
            <span className={clsx(
              'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium',
              isLive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-700 text-gray-400'
            )}>
              {isLive ? <><Wifi className="w-2.5 h-2.5" /> LIVE</> : <><WifiOff className="w-2.5 h-2.5" /> DEMO</>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-gray-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx('p-1.5 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-400')}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx('p-1.5 rounded-lg transition-colors', viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-gray-400')}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={fetchNfts}
            disabled={loading}
            className="p-2 rounded-xl glass text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {nfts.length > 0 && <CollectionSummary nfts={nfts} />}

      {/* Collection filter pills */}
      {collections.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={clsx('flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
              filter === 'all' ? 'bg-violet-600 text-white' : 'glass text-gray-400')}
          >
            All ({nfts.length})
          </button>
          {collections.map(col => (
            <button
              key={col}
              onClick={() => setFilter(col)}
              className={clsx('flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
                filter === col ? 'bg-violet-600 text-white' : 'glass text-gray-400')}
            >
              {col} ({nfts.filter(n => n.collection === col).length})
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && nfts.length === 0 && (
        <div className={clsx('gap-3', viewMode === 'grid' ? 'grid grid-cols-2' : 'space-y-2.5')}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={clsx('bg-gray-800/40 animate-pulse rounded-2xl', viewMode === 'grid' ? 'aspect-square' : 'h-20')} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && nfts.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">🎨</p>
          <p className="text-white text-sm font-medium mb-1">No NFTs found</p>
          <p className="text-gray-500 text-xs">
            {publicKey ? 'This wallet doesn\'t hold any NFTs' : 'Connect your wallet to see your collection'}
          </p>
        </div>
      )}

      {/* NFT grid / list */}
      {filtered.length > 0 && (
        <div className={clsx(viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2.5')}>
          {filtered.map(nft => (
            <NftCard key={nft.mint} nft={nft} viewMode={viewMode} />
          ))}
        </div>
      )}

      {/* Demo notice */}
      {source === 'demo' && !isDemo && (
        <p className="text-gray-600 text-xs text-center mt-4">
          Connect wallet to see your real NFTs
        </p>
      )}
    </div>
  );
}
