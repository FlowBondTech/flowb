// ===== FlowB Auth System =====
// Login via Privy — Privy is the source of truth for auth state

const AUTH_KEY = 'flowb-auth';

// State
const Auth = {
  user: null,
  isAuthenticated: false,
};

// ===== Init =====

function initAuth() {
  // Restore from localStorage only as a temporary UI hint while Privy loads.
  // Privy's auth-change event will override this once the SDK is ready.
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      Auth.user = JSON.parse(stored);
      Auth.isAuthenticated = true;
      renderAuthState();
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  // Privy is the source of truth — always obey its auth state
  window.addEventListener('privy-auth-change', (e) => {
    const { authenticated, user } = e.detail;

    if (authenticated && user) {
      handlePrivyLogin(user);
    } else {
      // Privy says not authenticated — clear everything
      clearLocalAuth();
    }
  });

  // Wire up buttons
  document.getElementById('authBtn')?.addEventListener('click', () => {
    if (window.flowbPrivy) {
      window.flowbPrivy.login();
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    // Clear local state immediately for responsive UI
    clearLocalAuth();
    // Then tell Privy to end the session
    if (window.flowbPrivy) {
      try {
        await window.flowbPrivy.logout();
      } catch (err) {
        console.warn('[auth] Privy logout error:', err);
      }
    }
  });

  document.getElementById('userAvatar')?.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.toggle('hidden');
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (menu && dropdown && !menu.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  renderAuthState();
}

// ===== Privy Login Handler =====

async function handlePrivyLogin(user) {
  Auth.user = {
    id: user.id,
    username: user.displayName,
    wallet: user.wallet,
    email: user.email,
    loginAt: Date.now(),
  };
  Auth.isAuthenticated = true;
  localStorage.setItem(AUTH_KEY, JSON.stringify(Auth.user));

  // Award first login bonus
  if (typeof awardFirstAction === 'function') {
    awardFirstAction('first_login', 10, 'First login bonus!');
  }

  // Claim pending anonymous points to backend account
  claimPendingPointsToBackend(user);

  renderAuthState();
}

async function claimPendingPointsToBackend(user) {
  const API_BASE = window.FLOWB_API_URL || '';
  const pending = typeof getPendingActions === 'function' ? getPendingActions() : [];
  if (!pending.length) return;

  try {
    // Get a FlowB JWT for this web user
    const authRes = await fetch(`${API_BASE}/api/v1/auth/web`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyUserId: user.id, displayName: user.displayName }),
    });
    if (!authRes.ok) return;
    const { token } = await authRes.json();

    // Claim pending actions
    const claimRes = await fetch(`${API_BASE}/api/v1/auth/claim-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ actions: pending }),
    });
    if (!claimRes.ok) return;
    const { claimed, total } = await claimRes.json();

    // Clear the ledger
    if (typeof clearPendingActions === 'function') clearPendingActions();

    if (claimed > 0 && typeof showPointsToast === 'function') {
      showPointsToast(claimed, 'Points synced to your account!', 'bonus');
    }
    console.log(`[auth] Claimed ${claimed} pending points for ${user.displayName} (total: ${total})`);
  } catch (err) {
    console.warn('[auth] Failed to claim pending points:', err);
  }
}

// ===== Logout =====

function clearLocalAuth() {
  Auth.user = null;
  Auth.isAuthenticated = false;
  localStorage.removeItem(AUTH_KEY);
  document.getElementById('userDropdown')?.classList.add('hidden');
  renderAuthState();
}

// ===== Render =====

function renderAuthState() {
  const authBtn = document.getElementById('authBtn');
  const userMenu = document.getElementById('userMenu');
  const userAvatar = document.getElementById('userAvatar');
  const userDropdownHeader = document.getElementById('userDropdownHeader');

  if (Auth.isAuthenticated && Auth.user) {
    authBtn?.classList.add('hidden');
    userMenu?.classList.remove('hidden');

    // Avatar
    const initial = (Auth.user.username || '?')[0].toUpperCase();
    if (userAvatar) userAvatar.textContent = initial;

    // Dropdown header
    if (userDropdownHeader) {
      userDropdownHeader.innerHTML = `
        <div style="font-weight:600;font-size:0.85rem">${escapeHtml(Auth.user.username)}</div>
        <div style="font-size:0.7rem;color:var(--text-dim)">Connected via Privy</div>`;
    }
  } else {
    authBtn?.classList.remove('hidden');
    userMenu?.classList.add('hidden');
  }
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Init
initAuth();
