'use client';

import { useState, useEffect } from 'react';
import { ScrollText, CheckCircle, XCircle, Clock, ExternalLink, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { getActionLog, getActionStats, type ActionLogEntry } from '@/lib/action-log';
import { getNetwork, getSolscanCluster } from '@/lib/solana';

const NETWORK = getNetwork();

const outcomeConfig = {
  proposed: { icon: Clock, color: 'text-yellow-400', label: 'Proposed' },
  approved: { icon: CheckCircle, color: 'text-blue-400', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-400', label: 'Rejected' },
  executed: { icon: CheckCircle, color: 'text-emerald-400', label: 'Executed' },
};

function LogEntry({ entry }: { entry: ActionLogEntry }) {
  const config = outcomeConfig[entry.outcome];
  const Icon = config.icon;
  const time = new Date(entry.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{entry.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={clsx('text-[10px]', config.color)}>{config.label}</span>
          {entry.protocol && (
            <span className="text-[10px] text-gray-500">{entry.protocol}</span>
          )}
          <span className="text-[10px] text-gray-600 ml-auto flex-shrink-0">{dateStr} {timeStr}</span>
        </div>
      </div>
      {entry.txSignature && (
        <a
          href={`https://solscan.io/tx/${entry.txSignature}${getSolscanCluster(NETWORK)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-emerald-400 flex-shrink-0 mt-0.5"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

export function ActionLogWidget() {
  const [log, setLog] = useState<ActionLogEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, executed: 0, approved: 0, rejected: 0 });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLog(getActionLog());
    setStats(getActionStats());
  }, []);

  if (log.length === 0) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
          <ScrollText className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Agent Action Log</p>
          <p className="text-gray-400 text-xs">No actions yet. Visit Actions tab to get AI proposals.</p>
        </div>
      </div>
    );
  }

  const displayed = expanded ? log.slice(0, 20) : log.slice(0, 3);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-violet-400" />
            <span className="text-white text-sm font-semibold">Agent Action Log</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {stats.executed > 0 && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />{stats.executed} executed
              </span>
            )}
            <span className="text-gray-500">{stats.total} total</span>
          </div>
        </div>

        <div className="divide-y divide-gray-800/50">
          {displayed.map((entry) => (
            <LogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      </div>

      {log.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 text-xs text-gray-400 hover:text-white bg-gray-800/30 transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${log.length} actions`}
        </button>
      )}
    </div>
  );
}
