'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, MessageSquare, Zap, Activity, Calendar, TrendingUp, Settings, MoreHorizontal, Shield, X, Store, Clock, Flame, Search, Image, Link as LinkIcon, Scale, Crosshair, Layers, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';

const primaryNav = [
  { href: '/dashboard', label: 'Wallet', icon: Home },
  { href: '/chat', label: 'Agent', icon: MessageSquare },
  { href: '/actions', label: 'Actions', icon: Zap },
  { href: '/yield', label: 'Yield', icon: TrendingUp },
];

const moreNav = [
  { href: '/search', label: 'Token Search', icon: Search, desc: 'Search 1,000+ verified Solana tokens' },
  { href: '/trending', label: 'Trending', icon: Flame, desc: 'Top Solana gainers & volume leaders' },
  { href: '/history', label: 'Tx History', icon: Clock, desc: 'On-chain transaction history + analytics' },
  { href: '/nfts', label: 'NFT Gallery', icon: Image, desc: 'Your Solana collectibles & collections' },
  { href: '/blinks', label: 'Blinks', icon: LinkIcon, desc: 'Execute any Solana Action (Blink)' },
  { href: '/store', label: 'dApp Store', icon: Store, desc: 'Seeker-verified Solana dApps' },
  { href: '/policies', label: 'Policies', icon: Shield, desc: 'Portfolio rules & automation' },
  { href: '/rebalance', label: 'Rebalance', icon: Scale, desc: 'Set target allocations, Aurora generates trades' },
  { href: '/staking', label: 'Staking', icon: Layers, desc: 'Stake SOL with Jito, Marinade, or native validators' },
  { href: '/journal', label: 'Trade Journal', icon: BookOpen, desc: 'Log trades with AI commentary and export history' },
  { href: '/sniper', label: 'Token Sniper', icon: Crosshair, desc: 'New Solana tokens — boosted & trending launches' },
  { href: '/whales', label: 'Whale Watch', icon: Activity, desc: 'Track large transactions' },
  { href: '/unlocks', label: 'Token Unlocks', icon: Calendar, desc: 'Upcoming vesting events' },
  { href: '/settings', label: 'Settings', icon: Settings, desc: 'Network, model & preferences' },
];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const demoSuffix = isDemo ? '?demo=true' : '';
  const [sheetOpen, setSheetOpen] = useState(false);

  const isMoreActive = moreNav.some(({ href }) => pathname.startsWith(href));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-gray-900/95 backdrop-blur border-t border-gray-800 safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={`${href}${demoSuffix}`}
                onClick={() => navigator.vibrate?.(10)}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'text-violet-400'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <Icon className={clsx('w-5 h-5', isActive && 'stroke-[2.5]')} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => { navigator.vibrate?.(10); setSheetOpen(true); }}
            aria-expanded={sheetOpen}
            aria-haspopup="dialog"
            className={clsx(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors',
              isMoreActive
                ? 'text-violet-400'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            <MoreHorizontal className={clsx('w-5 h-5', isMoreActive && 'stroke-[2.5]')} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          onClick={() => setSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl border-t border-gray-700/50 animate-[fadeUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={() => setSheetOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 right-4 p-1.5 rounded-full bg-gray-800 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Menu items */}
            <div className="px-4 pb-8 space-y-1">
              {moreNav.map(({ href, label, icon: Icon, desc }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={`${href}${demoSuffix}`}
                    onClick={() => { navigator.vibrate?.(10); setSheetOpen(false); }}
                    className={clsx(
                      'flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors',
                      isActive
                        ? 'text-violet-400 bg-violet-500/10'
                        : 'text-gray-300 active:bg-gray-800'
                    )}
                  >
                    <div className={clsx(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      isActive ? 'bg-violet-500/20' : 'bg-gray-800'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-medium block">{label}</span>
                      <span className="text-xs text-gray-500">{desc}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
