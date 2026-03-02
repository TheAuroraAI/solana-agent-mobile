'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import {
  Shield, Network, Bot, Cpu, LogOut, ExternalLink, ChevronRight, Zap, Github
} from 'lucide-react';
import { clsx } from 'clsx';
import { getNetwork, getSolscanCluster } from '@/lib/solana';

const NETWORK = getNetwork();

interface SettingRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  iconColor?: string;
}

function SettingRow({ icon: Icon, label, value, href, onClick, danger, iconColor = 'text-gray-400' }: SettingRowProps) {
  const content = (
    <div className={clsx(
      'flex items-center gap-4 px-4 py-4',
      danger && 'text-red-400'
    )}>
      <Icon className={clsx('w-5 h-5 flex-shrink-0', danger ? 'text-red-400' : iconColor)} />
      <span className={clsx('flex-1 text-sm font-medium', danger ? 'text-red-400' : 'text-white')}>
        {label}
      </span>
      {value && <span className="text-gray-500 text-xs">{value}</span>}
      {(href || onClick) && (
        href ? (
          <ExternalLink className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        )
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:bg-gray-800/30 transition-colors">
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full hover:bg-gray-800/30 transition-colors text-left">
        {content}
      </button>
    );
  }

  return <div>{content}</div>;
}

export function SettingsView() {
  const { publicKey, disconnect, connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  useEffect(() => {
    if (!connected && !isDemo) router.push('/');
  }, [connected, router, isDemo]);

  const handleDisconnect = async () => {
    await disconnect();
    router.push('/');
  };

  return (
    <div className="safe-top px-4 pt-6 pb-4">
      <h1 className="text-white font-bold text-2xl mb-6">Settings</h1>

      {/* Wallet section */}
      <div className="mb-4">
        <p className="text-gray-500 text-xs uppercase font-medium tracking-wider px-1 mb-2">Wallet</p>
        <div className="glass rounded-2xl overflow-hidden">
          <SettingRow
            icon={Shield}
            label="Connected Address"
            value={publicKey ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}` : isDemo ? 'Demo mode' : 'Not connected'}
            iconColor="text-emerald-400"
          />
          <div className="border-t border-gray-800/50" />
          <SettingRow
            icon={Network}
            label="Network"
            value={NETWORK === 'mainnet' ? 'Mainnet' : 'Devnet'}
            iconColor="text-blue-400"
          />
        </div>
      </div>

      {/* Agent section */}
      <div className="mb-4">
        <p className="text-gray-500 text-xs uppercase font-medium tracking-wider px-1 mb-2">AI Agent</p>
        <div className="glass rounded-2xl overflow-hidden">
          <SettingRow
            icon={Bot}
            label="Chat Model"
            value="Claude Sonnet 4.6"
            iconColor="text-violet-400"
          />
          <div className="border-t border-gray-800/50" />
          <SettingRow
            icon={Cpu}
            label="Actions Model"
            value="Claude Haiku 4.5"
            iconColor="text-violet-400"
          />
          <div className="border-t border-gray-800/50" />
          <SettingRow
            icon={Zap}
            label="DeFi Protocols"
            value="Jito, Marinade, Jupiter"
            iconColor="text-yellow-400"
          />
        </div>
      </div>

      {/* Links */}
      <div className="mb-4">
        <p className="text-gray-500 text-xs uppercase font-medium tracking-wider px-1 mb-2">About</p>
        <div className="glass rounded-2xl overflow-hidden">
          <SettingRow
            icon={Github}
            label="Source Code"
            href="https://github.com/TheAuroraAI/solana-agent-mobile"
            iconColor="text-gray-400"
          />
          <div className="border-t border-gray-800/50" />
          <SettingRow
            icon={ExternalLink}
            label={NETWORK === 'mainnet' ? 'Solana Explorer' : 'Solana Devnet Explorer'}
            href={`https://solscan.io/account/${publicKey?.toString() ?? ''}${getSolscanCluster(NETWORK)}`}
            iconColor="text-gray-400"
          />
        </div>
      </div>

      {/* Security info */}
      <div className="glass rounded-2xl p-4 mb-4 bg-emerald-500/5 border border-emerald-500/10">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-400 text-sm font-medium">Non-Custodial Security</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Aurora never holds your private keys. All transactions require your explicit approval through Phantom. The agent can only read your on-chain data and propose actions.
            </p>
          </div>
        </div>
      </div>

      {/* Disconnect */}
      {connected && (
        <div className="mb-4">
          <div className="glass rounded-2xl overflow-hidden border border-red-500/10">
            <SettingRow
              icon={LogOut}
              label="Disconnect Wallet"
              onClick={handleDisconnect}
              danger
            />
          </div>
        </div>
      )}

      <p className="text-center text-gray-600 text-xs mt-8">
        Aurora Agent v1.0 · MONOLITH Hackathon 2026
      </p>
    </div>
  );
}
