import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

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

const DEMO_NFTS: NftItem[] = [
  {
    mint: 'DEMO1111111111111111111111111111111111111111',
    name: 'Mad Lads #4217',
    symbol: 'MAD',
    image: 'https://madlads.s3.us-west-2.amazonaws.com/images/4217.png',
    collection: 'Mad Lads',
    floorPrice: 38.5,
    listed: false,
    listPrice: null,
    attributes: [{ trait_type: 'Background', value: 'Purple' }, { trait_type: 'Skin', value: 'Ivory' }],
    externalUrl: 'https://magiceden.io/marketplace/mad_lads',
  },
  {
    mint: 'DEMO2222222222222222222222222222222222222222',
    name: 'Tensorians #812',
    symbol: 'TNSR',
    image: 'https://arweave.net/26YdhY_eAzv26YdhY_eAzv26YdhY_eAzv26YdhY_eAzv26Yd/812.png',
    collection: 'Tensorians',
    floorPrice: 12.3,
    listed: true,
    listPrice: 15.0,
    attributes: [{ trait_type: 'Type', value: 'Legendary' }, { trait_type: 'Eyes', value: 'Laser' }],
    externalUrl: 'https://tensor.trade/trade/tensorians',
  },
  {
    mint: 'DEMO3333333333333333333333333333333333333333',
    name: 'Okay Bears #1529',
    symbol: 'OKAY',
    image: 'https://okay.mypinata.cloud/ipfs/QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi/1529.png',
    collection: 'Okay Bears',
    floorPrice: 5.2,
    listed: false,
    listPrice: null,
    attributes: [{ trait_type: 'Background', value: 'Forest' }, { trait_type: 'Fur', value: 'Brown' }],
    externalUrl: 'https://magiceden.io/marketplace/okay_bears',
  },
  {
    mint: 'DEMO4444444444444444444444444444444444444444',
    name: 'DeGods #7231',
    symbol: 'DGOD',
    image: 'https://metadata.degods.com/g/7231-dead.png',
    collection: 'DeGods',
    floorPrice: 4.8,
    listed: false,
    listPrice: null,
    attributes: [{ trait_type: 'Background', value: 'Sunset' }, { trait_type: 'Clothing', value: 'Armor' }],
    externalUrl: 'https://magiceden.io/marketplace/degods',
  },
  {
    mint: 'DEMO5555555555555555555555555555555555555555',
    name: 'Famous Fox #3892',
    symbol: 'FFM',
    image: 'https://storage.googleapis.com/feliz-foxes/3892.png',
    collection: 'Famous Fox Federation',
    floorPrice: 1.4,
    listed: false,
    listPrice: null,
    attributes: [{ trait_type: 'Background', value: 'Blue Sky' }, { trait_type: 'Fur', value: 'Orange' }],
    externalUrl: 'https://magiceden.io/marketplace/famous_fox_federation',
  },
  {
    mint: 'DEMO6666666666666666666666666666666666666666',
    name: 'Aurory #2109',
    symbol: 'AURY',
    image: 'https://metadata.aurory.io/2109.png',
    collection: 'Aurory',
    floorPrice: 0.9,
    listed: false,
    listPrice: null,
    attributes: [{ trait_type: 'Rarity', value: 'Rare' }, { trait_type: 'Class', value: 'Warrior' }],
    externalUrl: 'https://magiceden.io/marketplace/aurory',
  },
];

async function fetchMagicEdenNfts(wallet: string): Promise<NftItem[]> {
  const url = `https://api-mainnet.magiceden.dev/v2/wallets/${wallet}/tokens?offset=0&limit=20&listStatus=both`;
  const res = await fetch(url, {
    headers: { 'accept': 'application/json' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`ME API ${res.status}`);
  const data = await res.json() as Array<{
    mintAddress?: string;
    name?: string;
    symbol?: string;
    image?: string;
    collection?: string;
    floorPrice?: number;
    listStatus?: string;
    price?: number;
    attributes?: Array<{ trait_type: string; value: string }>;
    externalUrl?: string;
  }>;
  if (!Array.isArray(data)) throw new Error('Unexpected ME response');

  return data.slice(0, 20).map(item => ({
    mint: item.mintAddress ?? '',
    name: item.name ?? 'Unknown NFT',
    symbol: item.symbol ?? '',
    image: item.image ?? '',
    collection: item.collection ?? 'Unknown Collection',
    floorPrice: item.floorPrice ?? null,
    listed: item.listStatus === 'listed',
    listPrice: item.price ?? null,
    attributes: item.attributes ?? [],
    externalUrl: item.externalUrl ?? `https://magiceden.io/item-details/${item.mintAddress}`,
  }));
}

async function fetchHeliusNfts(wallet: string, apiKey: string): Promise<NftItem[]> {
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'nfts',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: wallet,
        page: 1,
        limit: 20,
        displayOptions: { showFungible: false, showNativeBalance: false },
      },
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Helius API ${res.status}`);
  const json = await res.json() as { result?: { items?: Array<{
    id?: string;
    content?: { metadata?: { name?: string; symbol?: string; attributes?: Array<{ trait_type: string; value: string }> }; links?: { image?: string }; json_uri?: string };
    grouping?: Array<{ group_value?: string }>;
    token_info?: { price_info?: { price_per_token?: number } };
  }> } };
  const items = json.result?.items ?? [];

  return items.slice(0, 20).map(asset => ({
    mint: asset.id ?? '',
    name: asset.content?.metadata?.name ?? 'Unknown NFT',
    symbol: asset.content?.metadata?.symbol ?? '',
    image: asset.content?.links?.image ?? '',
    collection: asset.grouping?.[0]?.group_value ?? 'Unknown',
    floorPrice: null,
    listed: false,
    listPrice: null,
    attributes: asset.content?.metadata?.attributes ?? [],
    externalUrl: `https://magiceden.io/item-details/${asset.id}`,
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet') ?? '';
  const demo = searchParams.get('demo') === 'true';

  if (demo || !wallet) {
    return NextResponse.json({ nfts: DEMO_NFTS, source: 'demo', count: DEMO_NFTS.length });
  }

  // Validate wallet address (base58, 32-44 chars)
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  // Try Helius first if API key provided
  const heliusKey = process.env.HELIUS_API_KEY;
  if (heliusKey) {
    try {
      const nfts = await fetchHeliusNfts(wallet, heliusKey);
      return NextResponse.json({ nfts, source: 'helius', count: nfts.length });
    } catch {
      // fall through to Magic Eden
    }
  }

  // Try Magic Eden public API
  try {
    const nfts = await fetchMagicEdenNfts(wallet);
    return NextResponse.json({ nfts, source: 'magic-eden', count: nfts.length });
  } catch {
    // fall through to demo
  }

  // Final fallback: demo data
  return NextResponse.json({ nfts: DEMO_NFTS, source: 'demo', count: DEMO_NFTS.length });
}
