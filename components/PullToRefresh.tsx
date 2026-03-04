'use client';

import { useRef, useState, useCallback, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const THRESHOLD = 60;

  // Use window.scrollY (not el.scrollTop) so the container doesn't need
  // overflow-y:auto — avoids creating a stacking context that hides the
  // fixed BottomNav on WebKit/mobile.
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    if (window.scrollY > 0) {
      pulling.current = false;
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Diminishing returns after threshold
      setPullDistance(Math.min(delta * 0.5, 100));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={clsx('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={{ height: refreshing ? 40 : pullDistance > 10 ? pullDistance * 0.6 : 0 }}
      >
        <RefreshCw
          className={clsx(
            'w-5 h-5 text-violet-400 transition-transform',
            refreshing && 'animate-spin',
            pullDistance >= THRESHOLD && !refreshing && 'text-emerald-400'
          )}
          style={{
            transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
