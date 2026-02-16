// ===== FlowB Auth System =====
// Login via Privy — Privy is the source of truth for auth state
// After Privy login, we exchange the Privy user ID for a FlowB JWT

const AUTH_KEY = 'flowb-auth';
const JWT_KEY = 'flowb-jwt';
const FLOWB_API_BASE = 'https://flowb.fly.dev';

// State
const Auth = {
  user: null,
  isAuthenticated: false,
  jwt: null,
};

// ===== Init =====

function initAuth() {
  // Restore JWT from localStorage
  Auth.jwt = localStorage.getItem(JWT_KEY);

  // Restore user from localStorage as a temporary UI hint while Privy loads.
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      Auth.user = JSON.parse(stored);
      Auth.isAuthenticated = !!Auth.jwt;
      renderAuthState();
      // If we have a stored user but no JWT, get one
      if (!Auth.jwt && Auth.user.id) {
        getFlowbJwt(Auth.user.id, Auth.user.username);
      }
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

  // Wire up buttons - Privy may not be loaded yet (lazy), so check first
  document.getElementById('authBtn')?.addEventListener('click', () => {
    if (window.flowbPrivy) {
      window.flowbPrivy.login();
    }
    // If Privy isn't loaded yet, the lazy loader in index.html handles it
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

// ===== Get FlowB JWT from backend =====

async function getFlowbJwt(privyUserId, displayName) {
  try {
    const authRes = await fetch(`${FLOWB_API_BASE}/api/v1/auth/web`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyUserId, displayName: displayName || 'User' }),
    });
    if (!authRes.ok) {
      console.warn('[auth] Failed to get FlowB JWT:', authRes.status);
      return null;
    }
    const data = await authRes.json();
    Auth.jwt = data.token;
    localStorage.setItem(JWT_KEY, data.token);
    Auth.isAuthenticated = true;
    console.log('[auth] FlowB JWT obtained for', displayName);
    return data.token;
  } catch (err) {
    console.warn('[auth] Failed to get FlowB JWT:', err);
    return null;
  }
}

// ===== Get auth token for API calls =====

function getAuthToken() {
  return Auth.jwt || localStorage.getItem(JWT_KEY) || null;
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
  localStorage.setItem(AUTH_KEY, JSON.stringify(Auth.user));

  // Get FlowB JWT from backend (this is the critical step!)
  await getFlowbJwt(user.id, user.displayName);
  Auth.isAuthenticated = true;

  // Award first login bonus
  if (typeof awardFirstAction === 'function') {
    awardFirstAction('first_login', 10, 'First login bonus!');
  }

  renderAuthState();

  // Claim pending anonymous points to backend account
  claimPendingPointsToBackend();

  // Dispatch custom event so dashboard and other components can react
  window.dispatchEvent(new CustomEvent('flowb-auth-ready'));
}

async function claimPendingPointsToBackend() {
  const pending = typeof getPendingActions === 'function' ? getPendingActions() : [];
  if (!pending.length) return;

  const token = getAuthToken();
  if (!token) return;

  try {
    const claimRes = await fetch(`${FLOWB_API_BASE}/api/v1/auth/claim-points`, {
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
    console.log(`[auth] Claimed ${claimed} pending points (total: ${total})`);
  } catch (err) {
    console.warn('[auth] Failed to claim pending points:', err);
  }
}

// ===== Prompt sign-in for protected actions =====

function requireAuth(actionLabel) {
  if (Auth.isAuthenticated && Auth.jwt) return true;

  showSignInPrompt(actionLabel);
  return false;
}

function showSignInPrompt(actionLabel) {
  // Remove any existing prompt
  document.getElementById('signInPrompt')?.remove();

  const prompt = document.createElement('div');
  prompt.id = 'signInPrompt';
  prompt.className = 'signin-prompt-backdrop';
  prompt.innerHTML = `
    <div class="signin-prompt">
      <button class="signin-prompt-close" id="signInPromptClose">&times;</button>
      <div class="signin-prompt-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <h3 class="signin-prompt-title">Sign in to continue</h3>
      <p class="signin-prompt-msg">Sign in to ${actionLabel || 'use this feature'}. Your points and activity will be saved to your account.</p>
      <button class="signin-prompt-btn" id="signInPromptBtn">Sign In</button>
      <p class="signin-prompt-sub">Connect with email, wallet, or social accounts</p>
    </div>
  `;
  document.body.appendChild(prompt);
  document.body.style.overflow = 'hidden';

  const close = () => {
    prompt.remove();
    document.body.style.overflow = '';
  };

  prompt.querySelector('#signInPromptClose').addEventListener('click', close);
  prompt.addEventListener('click', (e) => {
    if (e.target === prompt) close();
  });

  prompt.querySelector('#signInPromptBtn').addEventListener('click', () => {
    close();
    // Trigger Privy login
    if (window.flowbPrivy) {
      window.flowbPrivy.login();
    } else {
      // Privy not loaded yet - trigger the lazy loader
      document.getElementById('authBtn')?.click();
    }
  });
}

// ===== Logout =====

function clearLocalAuth() {
  Auth.user = null;
  Auth.isAuthenticated = false;
  Auth.jwt = null;
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(JWT_KEY);
  document.getElementById('userDropdown')?.classList.add('hidden');
  renderAuthState();
  window.dispatchEvent(new CustomEvent('flowb-auth-ready'));
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
        <div style="font-weight:600;font-size:0.85rem">${escapeHtml(Auth.user.username || Auth.user.email || 'User')}</div>
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
