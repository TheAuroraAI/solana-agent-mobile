'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Download, TrendingUp, TrendingDown, Minus, X, Sparkles, Tag, Calendar, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';

interface TradeEntry {
  id: string;
  date: string;          // ISO string
  pair: string;          // e.g. "SOL/USDC"
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;         // USD
  pnl?: number;          // USD, undefined for open
  pnlPct?: number;
  notes: string;
  tags: string[];
  aiCommentary?: string;
}

const DEMO_ENTRIES: TradeEntry[] = [
  {
    id: '1',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    pair: 'SOL/USDC',
    side: 'buy',
    amount: 5,
    price: 168.4,
    total: 842,
    pnl: 67.5,
    pnlPct: 8.02,
    notes: 'Accumulated near daily EMA. Volume breakout pattern.',
    tags: ['accumulation', 'technical'],
    aiCommentary: 'Strong accumulation setup at the 50-day EMA with elevated volume. The entry timing aligns with a historically strong support zone. Risk/reward ~1:3 at this level. Consider scaling in further if it holds.',
  },
  {
    id: '2',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    pair: 'JTO/USDC',
    side: 'sell',
    amount: 100,
    price: 3.12,
    total: 312,
    pnl: -28,
    pnlPct: -8.23,
    notes: 'Stop loss hit. Thesis invalidated when it broke below $3.',
    tags: ['stop-loss', 'technical'],
    aiCommentary: 'Disciplined exit — protecting capital is the right call when your level breaks. JTO momentum shifted after the broader alt pullback. Consider re-entry if $3 reclaims and holds for 24h.',
  },
  {
    id: '3',
    date: new Date(Date.now() - 8 * 86400000).toISOString(),
    pair: 'BONK/SOL',
    side: 'buy',
    amount: 10_000_000,
    price: 0.00001843,
    total: 184.3,
    pnl: undefined,
    notes: 'Meme cycle play. Small size, no stop.',
    tags: ['memecoin', 'speculative'],
    aiCommentary: 'Meme entries are inherently asymmetric — small position size is smart. No stop makes sense here since the position size itself is the risk limit. Watch for volume/sentiment shifts.',
  },
];

const PRESET_TAGS = ['accumulation', 'technical', 'fundamental', 'memecoin', 'dca', 'stop-loss', 'take-profit', 'speculative', 'defi', 'nft'];

function PnlBadge({ pnl, pnlPct }: { pnl?: number; pnlPct?: number }) {
  if (pnl === undefined) return <span className="text-xs text-gray-500">Open</span>;
  const positive = pnl >= 0;
  return (
    <div className={clsx('flex items-center gap-1 text-xs font-semibold', positive ? 'text-emerald-400' : 'text-red-400')}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{pnl.toFixed(2)} ({pnlPct?.toFixed(1)}%)
    </div>
  );
}

function TradeCard({ entry, onDelete }: { entry: TradeEntry; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold',
            entry.side === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          )}>
            {entry.side === 'buy' ? '▲' : '▼'}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{entry.pair}</p>
            <p className="text-xs text-gray-400 capitalize">{entry.side} · {entry.amount.toLocaleString()} @ ${entry.price < 0.01 ? entry.price.toExponential(3) : entry.price.toFixed(2)}</p>
          </div>
        </div>
        <div className="text-right">
          <PnlBadge pnl={entry.pnl} pnlPct={entry.pnlPct} />
          <p className="text-[10px] text-gray-500 mt-0.5">${entry.total.toFixed(0)}</p>
        </div>
      </div>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map(tag => (
            <span key={tag} className="text-[10px] bg-violet-500/15 text-violet-400 rounded-full px-2 py-0.5 border border-violet-500/20">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes preview */}
      {entry.notes && (
        <p className="text-xs text-gray-400 line-clamp-2">{entry.notes}</p>
      )}

      {/* AI Commentary toggle */}
      {entry.aiCommentary && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {expanded ? 'Hide AI analysis' : 'Show AI analysis'}
        </button>
      )}

      {expanded && entry.aiCommentary && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-400">Aurora&apos;s Take</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{entry.aiCommentary}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-700/40">
        <span className="text-[10px] text-gray-500">
          {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export function TradeJournalView() {
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'profit' | 'loss'>('all');
  const [aiLoading, setAiLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    pair: '',
    side: 'buy' as 'buy' | 'sell',
    amount: '',
    price: '',
    pnl: '',
    notes: '',
    tags: [] as string[],
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('monolith-journal');
      setEntries(stored ? JSON.parse(stored) : DEMO_ENTRIES);
    } catch {
      setEntries(DEMO_ENTRIES);
    }
  }, []);

  const saveEntries = useCallback((next: TradeEntry[]) => {
    setEntries(next);
    try { localStorage.setItem('monolith-journal', JSON.stringify(next)); } catch { /* quota */ }
  }, []);

  const deleteEntry = useCallback((id: string) => {
    saveEntries(entries.filter(e => e.id !== id));
  }, [entries, saveEntries]);

  const getAiCommentary = async (entry: Partial<TradeEntry>): Promise<string> => {
    try {
      const prompt = `Trade: ${entry.side?.toUpperCase()} ${entry.amount} ${entry.pair} at $${entry.price}. Notes: "${entry.notes}". Tags: ${entry.tags?.join(', ')}. Provide a concise 2-3 sentence trading insight.`;
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, walletAddress: null }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      return data.reply ?? data.message ?? 'No commentary available.';
    } catch {
      const side = entry.side === 'buy' ? 'Entry' : 'Exit';
      return `${side} logged. Review your thesis against market conditions and size position accordingly.`;
    }
  };

  const submitEntry = async () => {
    const amount = parseFloat(form.amount);
    const price = parseFloat(form.price);
    if (!form.pair || isNaN(amount) || isNaN(price)) return;

    const pnlVal = form.pnl ? parseFloat(form.pnl) : undefined;
    const total = amount * price;

    setAiLoading(true);
    const aiCommentary = await getAiCommentary({
      pair: form.pair,
      side: form.side,
      amount,
      price,
      notes: form.notes,
      tags: form.tags,
    });
    setAiLoading(false);

    const newEntry: TradeEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      pair: form.pair.toUpperCase(),
      side: form.side,
      amount,
      price,
      total,
      pnl: pnlVal,
      pnlPct: pnlVal !== undefined ? (pnlVal / total) * 100 : undefined,
      notes: form.notes,
      tags: form.tags,
      aiCommentary,
    };

    saveEntries([newEntry, ...entries]);
    setShowForm(false);
    setForm({ pair: '', side: 'buy', amount: '', price: '', pnl: '', notes: '', tags: [] });
  };

  const exportCsv = () => {
    const header = 'Date,Pair,Side,Amount,Price,Total,PnL,PnL%,Tags,Notes';
    const rows = entries.map(e =>
      `"${new Date(e.date).toLocaleDateString()}","${e.pair}","${e.side}",${e.amount},${e.price},${e.total.toFixed(2)},${e.pnl ?? ''},${e.pnlPct?.toFixed(2) ?? ''},"${e.tags.join(';')}","${e.notes.replace(/"/g, '""')}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = entries.filter(e => {
    if (filter === 'buy') return e.side === 'buy';
    if (filter === 'sell') return e.side === 'sell';
    if (filter === 'profit') return (e.pnl ?? 0) > 0;
    if (filter === 'loss') return (e.pnl ?? 1) < 0;
    return true;
  });

  const totalPnl = entries.reduce((sum, e) => sum + (e.pnl ?? 0), 0);
  const winRate = entries.filter(e => e.pnl !== undefined).length > 0
    ? Math.round((entries.filter(e => (e.pnl ?? 0) > 0).length / entries.filter(e => e.pnl !== undefined).length) * 100)
    : 0;

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Trade Journal</h1>
          <p className="text-xs text-gray-400 mt-0.5">AI-powered trade log</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Trade
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <p className={clsx('text-sm font-bold', totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(0)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Total P&L $</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-sm font-bold text-white">{winRate}%</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Win Rate</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-sm font-bold text-white">{entries.length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Total Trades</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {(['all', 'buy', 'sell', 'profit', 'loss'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors',
              filter === f ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-400'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No trades logged yet</p>
            <p className="text-xs mt-1">Tap &quot;Log Trade&quot; to start tracking</p>
          </div>
        ) : (
          filtered.map(entry => (
            <TradeCard key={entry.id} entry={entry} onDelete={deleteEntry} />
          ))
        )}
      </div>

      {/* Log Trade Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md bg-gray-900 rounded-t-3xl border-t border-gray-700/50 p-5 pb-10 animate-[fadeUp_0.2s_ease-out] max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold text-white">Log Trade</p>
              <button onClick={() => setShowForm(false)} className="p-1">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Pair + Side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Pair</label>
                  <input
                    value={form.pair}
                    onChange={e => setForm(f => ({ ...f, pair: e.target.value }))}
                    placeholder="SOL/USDC"
                    className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-gray-700 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Side</label>
                  <div className="grid grid-cols-2 gap-1">
                    {(['buy', 'sell'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setForm(f => ({ ...f, side: s }))}
                        className={clsx(
                          'py-2.5 rounded-xl text-xs font-bold capitalize',
                          form.side === s
                            ? s === 'buy' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                            : 'bg-gray-800 text-gray-400'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Amount + Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Amount</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-gray-700 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Price ($)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-gray-700 focus:border-violet-500"
                  />
                </div>
              </div>

              {/* P&L (optional) */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">P&L ($) — optional</label>
                <input
                  type="number"
                  value={form.pnl}
                  onChange={e => setForm(f => ({ ...f, pnl: e.target.value }))}
                  placeholder="Leave blank if trade is still open"
                  className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-gray-700 focus:border-violet-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Why did you take this trade?"
                  rows={3}
                  className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-gray-700 focus:border-violet-500 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setForm(f => ({
                        ...f,
                        tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
                      }))}
                      className={clsx(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        form.tags.includes(tag)
                          ? 'bg-violet-500/20 text-violet-400 border-violet-500/40'
                          : 'bg-gray-800 text-gray-500 border-gray-700'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={submitEntry}
                disabled={!form.pair || !form.amount || !form.price || aiLoading}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-violet-600 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {aiLoading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Getting AI analysis...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Log with AI Commentary
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
