'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, MessageSquare, Zap, Activity, Calendar, TrendingUp, Settings, MoreHorizontal, Shield } from 'lucide-react';
import { clsx } from 'clsx';

const primaryNav = [
  { href: '/dashboard', label: 'Wallet', icon: Home },
  { href: '/chat', label: 'Agent', icon: MessageSquare },
  { href: '/actions', label: 'Actions', icon: Zap },
  { href: '/yield', label: 'Yield', icon: TrendingUp },
];

const moreNav = [
  { href: '/policies', label: 'Policies', icon: Shield },
  { href: '/whales', label: 'Whales', icon: Activity },
  { href: '/unlocks', label: 'Unlocks', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const demoSuffix = isDemo ? '?demo=true' : '';
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMoreActive = moreNav.some(({ href }) => pathname.startsWith(href));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-t border-gray-800 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {primaryNav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={`${href}${demoSuffix}`}
              onClick={() => navigator.vibrate?.(10)}
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

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { navigator.vibrate?.(10); setMoreOpen(!moreOpen); }}
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

          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-40 bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
              {moreNav.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={`${href}${demoSuffix}`}
                    onClick={() => setMoreOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 transition-colors',
                      isActive
                        ? 'text-violet-400 bg-gray-700/50'
                        : 'text-gray-300 hover:bg-gray-700/30'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
