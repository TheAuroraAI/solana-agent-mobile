'use client';

import { useState, useCallback } from 'react';
import { X, Download, Share2, Loader2 } from 'lucide-react';

interface ShareCardModalProps {
  wallet: string;
  totalUsd: number;
  solBalance: number;
  solBalanceUsd: number;
  healthScore: number;
  healthLabel: string;
  pnl24h: { usd: number; pct: number } | null;
  topTokens: Array<{ symbol: string; usdValue: number }>;
  onClose: () => void;
}

function buildCardUrl(props: Omit<ShareCardModalProps, 'onClose'>) {
  const params = new URLSearchParams({
    wallet: props.wallet,
    total: props.totalUsd.toFixed(2),
    sol: props.solBalance.toFixed(4),
    health: String(props.healthScore),
    hlabel: props.healthLabel,
    hasPnl: props.pnl24h ? '1' : '0',
    pnlUsd: props.pnl24h ? props.pnl24h.usd.toFixed(2) : '0',
    pnlPct: props.pnl24h ? props.pnl24h.pct.toFixed(2) : '0',
    tokens: [
      `SOL:${props.solBalanceUsd.toFixed(2)}`,
      ...props.topTokens.slice(0, 3).map(t => `${t.symbol}:${t.usdValue.toFixed(2)}`),
    ].join(','),
  });
  return `/api/share-card?${params.toString()}`;
}

async function svgToPngBlob(svgUrl: string): Promise<Blob | null> {
  try {
    const resp = await fetch(svgUrl);
    const svgText = await resp.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 420;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
      img.src = url;
    });
  } catch {
    return null;
  }
}

export function ShareCardModal(props: ShareCardModalProps) {
  const { onClose } = props;
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const cardUrl = buildCardUrl(props);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      if (navigator.share) {
        const pngBlob = await svgToPngBlob(cardUrl);
        if (pngBlob && navigator.canShare({ files: [new File([pngBlob], 'aurora-report.png', { type: 'image/png' })] })) {
          await navigator.share({
            title: 'My Solana Portfolio — Aurora Agent',
            text: `My portfolio is worth ${props.totalUsd >= 1000 ? ('$' + (props.totalUsd / 1000).toFixed(1) + 'K') : ('$' + props.totalUsd.toFixed(0))}. Check it out on Aurora Agent!`,
            files: [new File([pngBlob], 'aurora-report.png', { type: 'image/png' })],
          });
        } else {
          // Fallback: share text only
          await navigator.share({
            title: 'My Solana Portfolio — Aurora Agent',
            text: `My Solana portfolio: ${props.totalUsd >= 1000 ? ('$' + (props.totalUsd / 1000).toFixed(1) + 'K') : ('$' + props.totalUsd.toFixed(0))} — managed by Aurora AI Agent`,
            url: window.location.href,
          });
        }
      }
    } catch {
      // User cancelled or not supported
    } finally {
      setSharing(false);
    }
  }, [cardUrl, props.totalUsd]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const pngBlob = await svgToPngBlob(cardUrl);
      if (pngBlob) {
        const url = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aurora-portfolio.png';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback: download SVG
        const a = document.createElement('a');
        a.href = cardUrl;
        a.download = 'aurora-portfolio.svg';
        a.click();
      }
    } finally {
      setDownloading(false);
    }
  }, [cardUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gray-900 rounded-t-3xl border-t border-gray-700/50 p-5 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-base">Share Portfolio Report</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card preview */}
        <div className="rounded-2xl overflow-hidden mb-5 border border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt="Aurora Portfolio Report"
            className="w-full"
            loading="eager"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 transition-colors text-white text-sm font-medium disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading ? 'Saving…' : 'Download PNG'}
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 transition-colors text-white text-sm font-medium disabled:opacity-60"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {sharing ? 'Sharing…' : 'Share'}
            </button>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center mt-3">
          ⚠️ Not financial advice — for informational use only
        </p>
      </div>
    </div>
  );
}
