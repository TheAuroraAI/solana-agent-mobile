'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Shield, Network, Bot, Cpu, LogOut, ExternalLink, Github, Zap,
  Key, Eye, EyeOff, Check, ChevronDown, Globe
} from 'lucide-react';
import { clsx } from 'clsx';
import { getSolscanCluster } from '@/lib/solana';
import {
  loadSettings, saveSettings, AppSettings,
  CHAT_MODELS, ACTIONS_MODELS, DEFI_PROTOCOLS, getModelProvider,
} from '@/lib/settings';

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-gray-500 text-xs uppercase font-medium tracking-wider px-1 mb-2">
      {label}
    </p>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl overflow-hidden divide-y divide-gray-800/50">
      {children}
    </div>
  );
}

function SettingRow({ label, children, icon: Icon, iconColor = 'text-gray-400' }: {
  label: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon className={clsx('w-5 h-5 flex-shrink-0', iconColor)} />
      <span className="text-sm font-medium text-white flex-shrink-0 w-32">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-violet-600' : 'bg-gray-700'
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function ModelSelect({
  value, options, onChange, requiresKey, hasKey,
}: {
  value: string;
  options: { id: string; label: string; provider: string }[];
  onChange: (v: string) => void;
  requiresKey?: boolean;
  hasKey?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value) ?? options[0];
  const needsKey = getModelProvider(value) === 'anthropic' && !hasKey;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-800/60 rounded-lg px-2.5 py-1.5 hover:bg-gray-700/60 transition-colors"
      >
        {needsKey && requiresKey && <Key className="w-3 h-3 text-amber-400" />}
        <span className="max-w-[140px] truncate">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 min-w-[200px]">
          {options.map((opt) => {
            const isAnthropicModel = opt.provider === 'anthropic';
            const locked = isAnthropicModel && !hasKey;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors first:rounded-t-xl last:rounded-b-xl',
                  locked ? 'text-gray-600' : 'text-gray-200 hover:bg-gray-800'
                )}
              >
                <span>{opt.label}</span>
                {opt.id === value && <Check className="w-3 h-3 text-violet-400" />}
                {locked && <Key className="w-3 h-3 text-amber-500/60" aria-label="Requires Anthropic API key" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SettingsView() {
  const { publicKey, disconnect, connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    if (!connected && !isDemo) router.push('/');
  }, [connected, router, isDemo]);

  // Load API key display on mount
  useEffect(() => {
    const s = loadSettings();
    setApiKeyInput(s.anthropicApiKey);
  }, []);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const toggleProtocol = useCallback((protocol: string) => {
    setSettings((prev) => {
      const current = prev.defiProtocols;
      const next = current.includes(protocol)
        ? current.filter((p) => p !== protocol)
        : [...current, protocol];
      const updated = { ...prev, defiProtocols: next };
      saveSettings(updated);
      return updated;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const saveApiKey = useCallback(() => {
    update('anthropicApiKey', apiKeyInput.trim());
  }, [apiKeyInput, update]);

  const handleDisconnect = async () => {
    await disconnect();
    router.push('/');
  };

  const network = settings.network;
  const hasAnthropicKey = settings.anthropicApiKey.length > 0;

  return (
    <div className="safe-top px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white font-bold text-2xl">Settings</h1>
        {saved && (
          <div className="flex items-center gap-1 text-emerald-400 text-xs animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            Saved
          </div>
        )}
      </div>

      {/* Wallet */}
      <div className="mb-4">
        <SectionHeader label="Wallet" />
        <SettingCard>
          <SettingRow icon={Shield} label="Address" iconColor="text-emerald-400">
            <span className="text-gray-400 text-xs">
              {publicKey
                ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}`
                : isDemo ? 'Demo mode' : 'Not connected'}
            </span>
          </SettingRow>

          <SettingRow icon={Network} label="Network" iconColor="text-blue-400">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{network === 'mainnet' ? 'Mainnet' : 'Devnet'}</span>
              <Toggle
                checked={network === 'mainnet'}
                onChange={(v) => update('network', v ? 'mainnet' : 'devnet')}
                label="Toggle mainnet/devnet"
              />
            </div>
          </SettingRow>

          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white">Custom RPC</span>
            </div>
            <input
              type="url"
              value={settings.customRpc}
              onChange={(e) => update('customRpc', e.target.value)}
              placeholder={network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com'}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            {settings.customRpc && (
              <p className="text-gray-500 text-xs mt-1">Custom RPC active — overrides default endpoint</p>
            )}
          </div>
        </SettingCard>
      </div>

      {/* AI Agent */}
      <div className="mb-4">
        <SectionHeader label="AI Agent" />
        <SettingCard>
          <SettingRow icon={Bot} label="Chat Model" iconColor="text-violet-400">
            <ModelSelect
              value={settings.chatModel}
              options={CHAT_MODELS}
              onChange={(v) => update('chatModel', v)}
              requiresKey
              hasKey={hasAnthropicKey}
            />
          </SettingRow>

          <SettingRow icon={Cpu} label="Actions Model" iconColor="text-violet-400">
            <ModelSelect
              value={settings.actionsModel}
              options={ACTIONS_MODELS}
              onChange={(v) => update('actionsModel', v)}
              requiresKey
              hasKey={hasAnthropicKey}
            />
          </SettingRow>
        </SettingCard>
      </div>

      {/* Anthropic API Key (BYOK) */}
      <div className="mb-4">
        <SectionHeader label="Anthropic API Key (BYOK)" />
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Key className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Bring Your Own Key</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Unlock Claude models. Key stored locally, never sent to our servers.
              </p>
            </div>
            {hasAnthropicKey && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onBlur={saveApiKey}
                placeholder="sk-ant-..."
                className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors pr-9"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={saveApiKey}
              className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 text-xs rounded-xl px-3 transition-colors"
            >
              Save
            </button>
          </div>
          {apiKeyInput && !apiKeyInput.startsWith('sk-ant-') && (
            <p className="text-amber-400/80 text-xs mt-1.5">Key should start with sk-ant-...</p>
          )}
        </div>
      </div>

      {/* DeFi Protocols */}
      <div className="mb-4">
        <SectionHeader label="DeFi Protocols" />
        <div className="glass rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Active Protocols</p>
              <p className="text-xs text-gray-500 mt-0.5">Agent will only suggest enabled protocols</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEFI_PROTOCOLS.map((protocol) => {
              const active = settings.defiProtocols.includes(protocol);
              return (
                <button
                  key={protocol}
                  onClick={() => toggleProtocol(protocol)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                    active
                      ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300'
                      : 'bg-gray-800/40 border border-gray-700/50 text-gray-500 hover:text-gray-400'
                  )}
                >
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', active ? 'bg-violet-400' : 'bg-gray-600')} />
                  {protocol}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="mb-4">
        <SectionHeader label="About" />
        <SettingCard>
          <a
            href="https://github.com/TheAuroraAI/solana-agent-mobile"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 hover:bg-gray-800/30 transition-colors"
          >
            <Github className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-white flex-1">Source Code</span>
            <ExternalLink className="w-4 h-4 text-gray-600" />
          </a>
          <div className="border-t border-gray-800/50" />
          <a
            href={`https://solscan.io/account/${publicKey?.toString() ?? ''}${getSolscanCluster(network)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 hover:bg-gray-800/30 transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-white flex-1">
              {network === 'mainnet' ? 'Solana Explorer' : 'Devnet Explorer'}
            </span>
            <ExternalLink className="w-4 h-4 text-gray-600" />
          </a>
        </SettingCard>
      </div>

      {/* Security info */}
      <div className="glass rounded-2xl p-4 mb-4 bg-emerald-500/5 border border-emerald-500/10">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-400 text-sm font-medium">Non-Custodial Security</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Aurora never holds your private keys. API keys are stored only in your browser&apos;s localStorage. All transactions require your explicit approval through Phantom.
            </p>
          </div>
        </div>
      </div>

      {/* Disconnect */}
      {connected && (
        <div className="mb-4">
          <div className="glass rounded-2xl overflow-hidden border border-red-500/10">
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-4 px-4 py-4 text-red-400 hover:bg-gray-800/30 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1 text-left">Disconnect Wallet</span>
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-gray-600 text-xs mt-4">
        Aurora Agent v1.0 · MONOLITH Hackathon 2026
      </p>
    </div>
  );
}
