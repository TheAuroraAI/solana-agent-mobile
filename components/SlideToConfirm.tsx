'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface SlideToConfirmProps {
  onConfirm: () => void;
  label?: string;
  confirmedLabel?: string;
  disabled?: boolean;
}

export function SlideToConfirm({
  onConfirm,
  label = 'Slide to confirm',
  confirmedLabel = 'Confirmed',
  disabled = false,
}: SlideToConfirmProps) {
  const [progress, setProgress] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);

  const getTrackWidth = () => trackRef.current?.offsetWidth ?? 300;
  const thumbSize = 48;
  const maxTravel = getTrackWidth() - thumbSize - 8; // 8px padding

  const handleStart = useCallback((clientX: number) => {
    if (disabled || confirmed) return;
    dragging.current = true;
    startX.current = clientX;
  }, [disabled, confirmed]);

  const handleMove = useCallback((clientX: number) => {
    if (!dragging.current) return;
    const delta = clientX - startX.current;
    const pct = Math.min(1, Math.max(0, delta / maxTravel));
    setProgress(pct);
  }, [maxTravel]);

  const handleEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (progress >= 0.9) {
      setProgress(1);
      setConfirmed(true);
      navigator.vibrate?.([30, 50, 30]);
      onConfirm();
    } else {
      setProgress(0);
    }
  }, [progress, onConfirm]);

  return (
    <div
      ref={trackRef}
      className={clsx(
        'relative w-full h-14 rounded-2xl overflow-hidden select-none touch-none',
        confirmed ? 'bg-emerald-500/20' : 'bg-gray-800/80',
        disabled && 'opacity-50 pointer-events-none',
      )}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Progress fill */}
      <div
        className={clsx(
          'absolute inset-y-0 left-0 transition-colors',
          confirmed ? 'bg-emerald-500/30' : 'bg-violet-500/20',
        )}
        style={{ width: `${progress * 100}%`, transition: dragging.current ? 'none' : 'width 0.3s ease-out' }}
      />

      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={clsx(
          'text-sm font-medium transition-opacity',
          confirmed ? 'text-emerald-400' : 'text-gray-400',
          progress > 0.3 && !confirmed && 'opacity-0',
        )}>
          {confirmed ? confirmedLabel : label}
        </span>
      </div>

      {/* Thumb */}
      {!confirmed ? (
        <div
          className="absolute top-1 w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg shadow-violet-900/40"
          style={{
            left: `${4 + progress * maxTravel}px`,
            transition: dragging.current ? 'none' : 'left 0.3s ease-out',
          }}
          onMouseDown={(e) => handleStart(e.clientX)}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
      ) : (
        <div className="absolute top-1 right-1 w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
          <Check className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}
