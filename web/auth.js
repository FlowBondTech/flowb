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
  // Capture ?from= param (e.g. ?from=telegram) before Privy redirects clear it
  const urlParams = new URLSearchParams(window.location.search);
  const fromPlatform = urlParams.get('from');
  if (fromPlatform) {
    sessionStorage.setItem('flowb-from-platform', fromPlatform);
    // Clean param from URL without reload
    urlParams.delete('from');
    const cleanUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams}`
      : window.location.pathname;
    history.replaceState(null, '', cleanUrl);
  }

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

  // Listen for account linking events from privy-mount.tsx
  window.addEventListener('flowb-accounts-linked', (e) => {
    const { mergedPoints, platformsLinked } = e.detail;
    // Close any open linking prompt
    document.getElementById('linkingPrompt')?.remove();
    document.body.style.overflow = '';
    // Show points toast
    if (mergedPoints > 0 && typeof showPointsToast === 'function') {
      showPointsToast(mergedPoints, 'Points merged across platforms!', 'bonus');
    }
    // Re-fetch points to update badge
    refreshPointsBadge();
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

  // Check if we should prompt for account linking (after a brief delay for UX)
  setTimeout(() => checkAndPromptLinking(), 1500);
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

// ===== Cross-Platform Account Linking =====

async function checkAndPromptLinking() {
  // Skip if dismissed within 7 days
  const dismissed = localStorage.getItem('flowb-link-prompt-dismissed');
  if (dismissed) {
    const dismissedAt = parseInt(dismissed, 10);
    if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
  }

  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`${FLOWB_API_BASE}/api/v1/me/link-status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const status = await res.json();

    const fromPlatform = sessionStorage.getItem('flowb-from-platform') || null;

    // Determine which platforms to suggest linking
    const suggestTelegram = !status.has_telegram && fromPlatform !== 'telegram';
    const suggestFarcaster = !status.has_farcaster && fromPlatform !== 'farcaster';

    if (!suggestTelegram && !suggestFarcaster) return;

    showLinkingPrompt({ fromPlatform, suggestTelegram, suggestFarcaster, mergedPoints: status.merged_points });
  } catch (err) {
    console.warn('[auth] Link status check failed:', err);
  }
}

function showLinkingPrompt({ fromPlatform, suggestTelegram, suggestFarcaster, mergedPoints }) {
  // Remove any existing prompt
  document.getElementById('linkingPrompt')?.remove();

  // Contextual heading
  let heading, subtext;
  if (fromPlatform === 'telegram') {
    heading = 'Welcome from Telegram!';
    subtext = 'Connect Farcaster to merge your points across platforms.';
  } else if (fromPlatform === 'farcaster') {
    heading = 'Welcome from Farcaster!';
    subtext = 'Connect Telegram to merge your points across platforms.';
  } else {
    heading = 'Connect your accounts';
    subtext = 'Link your accounts to see all your points in one place.';
  }

  const pointsLine = mergedPoints > 0
    ? `<p style="font-size:0.85rem;color:var(--accent);margin:0.5rem 0 0">${mergedPoints} points across your accounts</p>`
    : '';

  // Build action buttons
  let buttons = '';
  if (suggestTelegram) {
    buttons += `<button class="signin-prompt-btn" id="linkTgBtn" style="margin-bottom:0.5rem">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="margin-right:6px;vertical-align:middle"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.28-.02-.12.02-2.02 1.28-5.69 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.09-.5-.84-.27-1.51-.42-1.45-.89.03-.25.38-.5 1.04-.78 4.07-1.77 6.79-2.94 8.15-3.5 3.88-1.62 4.69-1.9 5.21-1.91.12 0 .37.03.54.17.14.12.18.28.2.47-.01.06.01.24 0 .37z"/></svg>
      Connect Telegram</button>`;
  }
  if (suggestFarcaster) {
    buttons += `<button class="signin-prompt-btn" id="linkFcBtn" style="background:var(--accent-secondary,#8b5cf6)">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="margin-right:6px;vertical-align:middle"><path d="M4 3h16v1.5l-1.5 1.5v12l1.5 1.5V21H4v-1.5L5.5 18V6L4 4.5V3zm4 5v8h2v-3h4v3h2V8h-2v3h-4V8H8z"/></svg>
      Connect Farcaster</button>`;
  }

  const prompt = document.createElement('div');
  prompt.id = 'linkingPrompt';
  prompt.className = 'signin-prompt-backdrop';
  prompt.innerHTML = `
    <div class="signin-prompt">
      <button class="signin-prompt-close" id="linkPromptClose">&times;</button>
      <div class="signin-prompt-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
      </div>
      <h3 class="signin-prompt-title">${heading}</h3>
      <p class="signin-prompt-msg">${subtext}</p>
      ${pointsLine}
      <div style="margin-top:1rem">${buttons}</div>
      <button id="linkPromptDismiss" style="background:none;border:none;color:var(--text-dim);cursor:pointer;margin-top:0.75rem;font-size:0.8rem;padding:0.5rem">Maybe later</button>
    </div>
  `;
  document.body.appendChild(prompt);
  document.body.style.overflow = 'hidden';

  const close = () => {
    prompt.remove();
    document.body.style.overflow = '';
  };

  // Dismiss with 7-day cooldown
  const dismiss = () => {
    localStorage.setItem('flowb-link-prompt-dismissed', String(Date.now()));
    close();
  };

  prompt.querySelector('#linkPromptClose')?.addEventListener('click', dismiss);
  prompt.querySelector('#linkPromptDismiss')?.addEventListener('click', dismiss);
  prompt.addEventListener('click', (e) => {
    if (e.target === prompt) dismiss();
  });

  // Link buttons: try Privy, with lazy-load fallback
  const triggerLink = (method) => {
    if (window.flowbPrivy && typeof window.flowbPrivy[method] === 'function') {
      window.flowbPrivy[method]();
    } else {
      // Privy not loaded yet — trigger lazy load, then retry
      const script = document.querySelector('script[data-privy-lazy]');
      if (script) script.dispatchEvent(new Event('load'));
      setTimeout(() => {
        if (window.flowbPrivy && typeof window.flowbPrivy[method] === 'function') {
          window.flowbPrivy[method]();
        }
      }, 2000);
    }
    close();
  };

  prompt.querySelector('#linkTgBtn')?.addEventListener('click', () => triggerLink('linkTelegram'));
  prompt.querySelector('#linkFcBtn')?.addEventListener('click', () => triggerLink('linkFarcaster'));
}

async function refreshPointsBadge() {
  const token = getAuthToken();
  if (!token) return;
  try {
    const res = await fetch(`${FLOWB_API_BASE}/api/v1/me/points`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    // Update points display if the function exists (defined in points.js or app.js)
    if (typeof updatePointsDisplay === 'function') {
      updatePointsDisplay(data.points);
    }
    // Also dispatch event for any other listeners
    window.dispatchEvent(new CustomEvent('flowb-points-updated', { detail: data }));
  } catch (err) {
    console.warn('[auth] Failed to refresh points:', err);
  }
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
