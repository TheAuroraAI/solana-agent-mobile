'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  SlidersHorizontal,
  Vote,
  Building2,
  Flame,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { GovernanceData, Proposal } from '@/app/api/governance/route';

type StatusFilter = 'all' | 'active' | 'passed' | 'rejected' | 'pending';

const STATUS_COLORS: Record<Proposal['status'], { bg: string; text: string; border: string; dot: string }> = {
  active: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  passed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
};

function formatVotes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-3 flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{label}</p>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function ProposalCard({
  proposal,
  onVote,
}: {
  proposal: Proposal;
  onVote: (id: string, side: 'for' | 'against') => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPct = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 50;
  const againstPct = totalVotes > 0 ? 100 - forPct : 50;
  const quorumPct = Math.min((totalVotes / proposal.quorum) * 100, 100);
  const sc = STATUS_COLORS[proposal.status];

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* DAO header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-lg">
            {proposal.daoIcon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white">{proposal.dao}</p>
            <span className="text-[10px] text-gray-500">{proposal.category}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {proposal.yourVote && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-[10px] font-medium text-violet-400">
              <Check className="w-2.5 h-2.5" />
              Voted {proposal.yourVote}
            </span>
          )}
          <span
            className={clsx(
              'flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize',
              sc.bg,
              sc.text,
              sc.border,
            )}
          >
            <span className={clsx('w-1.5 h-1.5 rounded-full', sc.dot, proposal.status === 'active' && 'animate-pulse')} />
            {proposal.status}
          </span>
        </div>
      </div>

      {/* Title + summary */}
      <div>
        <p className="text-sm font-bold text-white leading-snug">{proposal.title}</p>
        <p className={clsx('text-xs text-gray-400 mt-1 leading-relaxed', !expanded && 'line-clamp-2')}>
          {proposal.summary}
        </p>
        {proposal.summary.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-0.5 mt-1 text-[10px] text-violet-400 font-medium"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Read more <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Vote progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-emerald-400 font-medium">For {forPct.toFixed(1)}%</span>
          <span className="text-red-400 font-medium">Against {againstPct.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${forPct}%` }}
          />
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${againstPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>{formatVotes(proposal.votesFor)} votes</span>
          <span>{formatVotes(proposal.votesAgainst)} votes</span>
        </div>
      </div>

      {/* Quorum bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">Quorum</span>
          <span className={clsx('font-medium', proposal.quorumReached ? 'text-emerald-400' : 'text-yellow-400')}>
            {quorumPct.toFixed(0)}% {proposal.quorumReached ? 'Reached' : `(${formatVotes(proposal.quorum)} needed)`}
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              proposal.quorumReached ? 'bg-emerald-500' : 'bg-yellow-500',
            )}
            style={{ width: `${quorumPct}%` }}
          />
        </div>
      </div>

      {/* Time remaining + vote buttons */}
      <div className="flex items-center justify-between pt-1">
        <span
          className={clsx(
            'px-2.5 py-1 rounded-lg text-[10px] font-semibold border',
            proposal.status === 'active' && 'bg-violet-500/10 text-violet-400 border-violet-500/30',
            proposal.status === 'passed' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            proposal.status === 'rejected' && 'bg-red-500/10 text-red-400 border-red-500/30',
            proposal.status === 'pending' && 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
          )}
        >
          {proposal.timeRemaining}
        </span>

        {proposal.status === 'active' && !proposal.yourVote && (
          <div className="flex gap-2">
            <button
              onClick={() => onVote(proposal.id, 'for')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 active:scale-95 transition-all"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Vote For
            </button>
            <button
              onClick={() => onVote(proposal.id, 'against')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 active:scale-95 transition-all"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              Vote Against
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gray-800" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-gray-800 rounded w-20" />
          <div className="h-2 bg-gray-800 rounded w-16" />
        </div>
        <div className="h-5 w-14 bg-gray-800 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 bg-gray-800 rounded w-3/4" />
        <div className="h-3 bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-800 rounded w-2/3" />
      </div>
      <div className="h-2.5 bg-gray-800 rounded-full" />
      <div className="h-1.5 bg-gray-800 rounded-full w-1/2" />
      <div className="flex justify-between">
        <div className="h-6 w-16 bg-gray-800 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-gray-800 rounded-xl" />
          <div className="h-7 w-24 bg-gray-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'passed', label: 'Passed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending', label: 'Pending' },
];

export function GovernanceView() {
  const router = useRouter();
  const [data, setData] = useState<GovernanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(true);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/governance');
      if (!res.ok) throw new Error(`Failed to load governance data (${res.status})`);
      const json: GovernanceData = await res.json();
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = (proposalId: string, side: 'for' | 'against') => {
    if (!data) return;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        proposals: prev.proposals.map((p) => {
          if (p.id !== proposalId) return p;
          const voteWeight = prev.daoStats.yourVotingPower;
          return {
            ...p,
            yourVote: side,
            votesFor: side === 'for' ? p.votesFor + voteWeight : p.votesFor,
            votesAgainst: side === 'against' ? p.votesAgainst + voteWeight : p.votesAgainst,
            quorumReached:
              p.quorumReached ||
              p.votesFor + p.votesAgainst + voteWeight >= p.quorum,
          };
        }),
      };
    });
  };

  const filtered =
    data?.proposals.filter((p) => filter === 'all' || p.status === filter) ?? [];

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-800" />
            <div className="h-5 w-28 bg-gray-800 rounded" />
          </div>
          <div className="w-8 h-8 rounded-xl bg-gray-800" />
        </div>
        {/* Stats skeleton */}
        <div className="flex gap-2">
          <div className="flex-1 h-20 bg-gray-800 rounded-xl" />
          <div className="flex-1 h-20 bg-gray-800 rounded-xl" />
          <div className="flex-1 h-20 bg-gray-800 rounded-xl" />
        </div>
        {/* Filter pills skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-16 bg-gray-800 rounded-full" />
          ))}
        </div>
        {/* Cards skeleton */}
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-white">Governance</h1>
        </div>
        <div className="glass rounded-2xl p-6 flex flex-col items-center text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm font-semibold text-white">Failed to load proposals</p>
          <p className="text-xs text-gray-400">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 active:scale-95 transition-transform"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.daoStats;

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-white">Governance</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-gray-800 text-gray-400 active:scale-95 transition-transform"
          >
            <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'p-2 rounded-xl active:scale-95 transition-all',
              showFilters ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-2">
        <StatCard
          label="DAOs"
          value={String(stats?.totalDaos ?? 0)}
          icon={<Building2 className="w-3.5 h-3.5 text-violet-400" />}
        />
        <StatCard
          label="Active"
          value={String(stats?.activeProposals ?? 0)}
          icon={<Flame className="w-3.5 h-3.5 text-orange-400" />}
        />
        <StatCard
          label="Power"
          value={formatVotes(stats?.yourVotingPower ?? 0)}
          icon={<Vote className="w-3.5 h-3.5 text-emerald-400" />}
        />
      </div>

      {/* Filter pills */}
      {showFilters && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTER_OPTIONS.map((opt) => {
            const count =
              opt.value === 'all'
                ? data?.proposals.length ?? 0
                : data?.proposals.filter((p) => p.status === opt.value).length ?? 0;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border',
                  filter === opt.value
                    ? 'bg-violet-600 text-white border-violet-500'
                    : 'bg-gray-800/60 text-gray-400 border-gray-700/50',
                )}
              >
                {opt.label}
                <span
                  className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                    filter === opt.value ? 'bg-violet-400/30 text-white' : 'bg-gray-700/60 text-gray-500',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Proposal cards */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} onVote={handleVote} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 flex flex-col items-center text-center space-y-2">
          <Vote className="w-8 h-8 text-gray-600" />
          <p className="text-sm font-semibold text-gray-400">No proposals found</p>
          <p className="text-xs text-gray-600">
            {filter === 'all'
              ? 'There are no governance proposals at this time.'
              : `No ${filter} proposals right now. Try a different filter.`}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/30 active:scale-95 transition-transform"
            >
              Show all proposals
            </button>
          )}
        </div>
      )}
    </div>
  );
}
