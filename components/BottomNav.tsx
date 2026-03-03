'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, MessageSquare, Zap, Activity, Calendar, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Wallet', icon: Home },
  { href: '/chat', label: 'Agent', icon: MessageSquare },
  { href: '/actions', label: 'Actions', icon: Zap },
  { href: '/whales', label: 'Whales', icon: Activity },
  { href: '/unlocks', label: 'Unlocks', icon: Calendar },
  { href: '/yield', label: 'Yield', icon: TrendingUp },
];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const demoSuffix = isDemo ? '?demo=true' : '';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-t border-gray-800 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={`${href}${demoSuffix}`}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors',
                isActive
                  ? 'text-violet-400'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <Icon className={clsx('w-4.5 h-4.5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
