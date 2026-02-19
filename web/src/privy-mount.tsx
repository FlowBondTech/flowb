import { useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

const PRIVY_APP_ID = 'cmei6qqd0007hl20cjvh0h5md';
const FLOWB_API_BASE = 'https://flowb.fly.dev';

interface LinkedAccountInfo {
  type: string;
  username?: string;
  email?: string;
  address?: string;
  telegramUserId?: string;
  fid?: number;
  phoneNumber?: string;
  subject?: string;
}

declare global {
  interface Window {
    flowbPrivy: {
      login: () => void;
      logout: () => Promise<void>;
      linkEmail: () => void;
      linkPhone: () => void;
      linkWallet: () => void;
      linkDiscord: () => void;
      linkTwitter: () => void;
      linkGithub: () => void;
      linkFarcaster: () => void;
      linkTelegram: () => void;
      linkApple: () => void;
      getLinkedAccounts: () => LinkedAccountInfo[];
    };
  }
}

/** Extracts the best display name from a Privy user */
function getDisplayName(user: ReturnType<typeof usePrivy>['user']): string {
  if (!user) return 'User';

  // Check linked accounts for a human-readable name
  // Privy v2 types: telegram, farcaster, discord_oauth, twitter_oauth, github_oauth
  for (const account of user.linkedAccounts ?? []) {
    const a = account as any;
    if (a.type === 'telegram' && a.username) return a.username;
    if (a.type === 'farcaster' && a.username) return a.username;
    if (a.type === 'discord_oauth' && a.username) return a.username;
    if (a.type === 'twitter_oauth' && a.username) return a.username;
    if (a.type === 'github_oauth' && a.username) return a.username;
  }

  // Email
  if (user.email?.address) {
    return user.email.address.split('@')[0];
  }

  // Wallet - truncated
  if (user.wallet?.address) {
    const addr = user.wallet.address;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return 'User';
}

/** Convert Privy linked accounts to a simpler format for vanilla JS */
function serializeLinkedAccounts(user: ReturnType<typeof usePrivy>['user']): LinkedAccountInfo[] {
  if (!user) return [];
  return (user.linkedAccounts ?? []).map((account) => {
    const a = account as any;
    const info: LinkedAccountInfo = { type: a.type };
    if (a.username) info.username = a.username;
    if (a.address) info.email = a.address;
    if (a.telegramUserId) info.telegramUserId = a.telegramUserId;
    if (a.fid) info.fid = a.fid;
    if (a.phoneNumber) info.phoneNumber = a.phoneNumber;
    if (a.subject) info.subject = a.subject;
    return info;
  });
}

/** Sync linked accounts to the FlowB backend after linking/unlinking */
async function syncLinkedAccountsToBackend() {
  const jwt = localStorage.getItem('flowb-jwt');
  if (!jwt) return;
  try {
    await fetch(`${FLOWB_API_BASE}/api/v1/me/sync-linked-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    });
  } catch (err) {
    console.warn('[privy] Failed to sync linked accounts:', err);
  }
}

function AuthBridge() {
  const privy = usePrivy();
  const { ready, authenticated, user, login, logout } = privy;

  const getLinkedAccounts = useCallback(() => {
    return serializeLinkedAccounts(user);
  }, [user]);

  // Expose login/logout/linking to vanilla JS
  useEffect(() => {
    window.flowbPrivy = {
      login,
      logout,
      // Linking methods - these open Privy's linking UI
      linkEmail: () => privy.linkEmail(),
      linkPhone: () => privy.linkPhone(),
      linkWallet: () => privy.linkWallet(),
      linkDiscord: () => privy.linkDiscord(),
      linkTwitter: () => privy.linkTwitter(),
      linkGithub: () => privy.linkGithub(),
      linkFarcaster: () => privy.linkFarcaster(),
      linkTelegram: () => privy.linkTelegram(),
      linkApple: () => privy.linkApple(),
      getLinkedAccounts,
    };
  }, [login, logout, privy, getLinkedAccounts]);

  // Emit auth state changes for vanilla JS to consume
  // Include linked accounts so the settings page can render them
  useEffect(() => {
    if (!ready) return;

    const linkedAccounts = serializeLinkedAccounts(user);

    window.dispatchEvent(
      new CustomEvent('privy-auth-change', {
        detail: {
          authenticated,
          user: authenticated && user
            ? {
                id: user.id,
                displayName: getDisplayName(user),
                wallet: user.wallet?.address ?? null,
                email: user.email?.address ?? null,
                linkedAccounts,
              }
            : null,
        },
      }),
    );

    // Sync linked accounts to backend whenever they change
    if (authenticated && user && linkedAccounts.length > 0) {
      syncLinkedAccountsToBackend();
    }
  }, [ready, authenticated, user]);

  return null;
}

const el = document.getElementById('privy-root');
if (el) {
  createRoot(el).render(
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
        },
        // Configure which login methods to show (no Google)
        loginMethods: ['email', 'wallet', 'telegram', 'farcaster', 'discord', 'twitter', 'github', 'apple'],
      }}
    >
      <AuthBridge />
    </PrivyProvider>,
  );
}
