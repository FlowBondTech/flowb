import { useEffect, useCallback, Component, type ReactNode } from 'react';
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
      createWallet: () => Promise<void>;
      linkEmail: () => void;
      linkPhone: () => void;
      linkWallet: () => void;
      linkDiscord: () => void;
      linkTwitter: () => void;
      linkGithub: () => void;
      linkFarcaster: () => void;
      linkTelegram: () => void;
      linkApple: () => void;
      linkLinkedIn: () => void;
      linkTikTok: () => void;
      linkInstagram: () => void;
      getLinkedAccounts: () => LinkedAccountInfo[];
      hasEmbeddedWallet: () => boolean;
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
    const res = await fetch(`${FLOWB_API_BASE}/api/v1/me/sync-linked-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      // Dispatch event so vanilla JS (auth.js) can update points display + show toast
      window.dispatchEvent(
        new CustomEvent('flowb-accounts-linked', {
          detail: {
            mergedPoints: data.merged_points ?? 0,
            platformsLinked: data.platforms_linked ?? [],
            newlyLinked: data.newly_linked ?? [],
            pointsAwarded: data.points_awarded ?? 0,
          },
        }),
      );
    }
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
    console.log('[privy] AuthBridge ready:', ready, 'authenticated:', authenticated);
    window.flowbPrivy = {
      login,
      logout,
      createWallet: async () => {
        if (!authenticated) throw new Error('Must be logged in to create wallet');
        await privy.createWallet();
      },
      linkEmail: () => privy.linkEmail(),
      linkPhone: () => privy.linkPhone(),
      linkWallet: () => privy.linkWallet(),
      linkDiscord: () => privy.linkDiscord(),
      linkTwitter: () => privy.linkTwitter(),
      linkGithub: () => privy.linkGithub(),
      linkFarcaster: () => privy.linkFarcaster(),
      linkTelegram: () => privy.linkTelegram(),
      linkApple: () => privy.linkApple(),
      linkLinkedIn: () => privy.linkLinkedIn(),
      linkTikTok: () => privy.linkTiktok(),
      linkInstagram: () => privy.linkInstagram(),
      getLinkedAccounts,
      hasEmbeddedWallet: () => !!user?.wallet?.walletClientType?.includes('privy'),
    };
    console.log('[privy] window.flowbPrivy set');
  }, [login, logout, privy, getLinkedAccounts, authenticated, user]);

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

// Error boundary to catch React rendering crashes (e.g. wallet extension conflicts)
class PrivyErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    console.error('[privy] React error boundary caught:', error);
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

const el = document.getElementById('privy-root');
if (el) {
  try {
    console.log('[privy] Mounting PrivyProvider...');
    createRoot(el).render(
      <PrivyErrorBoundary>
        <PrivyProvider
          appId={PRIVY_APP_ID}
          config={{
            appearance: {
              theme: 'dark',
              accentColor: '#6366f1',
              logo: 'https://flowb.me/flowb-logo.png',
            },
            loginMethods: ['email', 'wallet', 'telegram', 'farcaster', 'discord', 'twitter', 'github', 'linkedin', 'tiktok', 'instagram', 'phone'],
            walletConnectCloudProjectId: '6a48b68b21541e70f93d9fbb70759652',
            embeddedWallets: {
              createOnLogin: 'off', // We create on-demand with "Create your Flow Wallet" button
              noPromptOnSignature: false,
            },
            externalWallets: {
              coinbaseWallet: { connectionOptions: 'smartWalletOnly' },
            },
          }}
        >
          <AuthBridge />
        </PrivyProvider>
      </PrivyErrorBoundary>,
    );
    console.log('[privy] PrivyProvider mounted');
  } catch (err) {
    console.error('[privy] Failed to mount:', err);
  }
} else {
  console.error('[privy] #privy-root element not found');
}
