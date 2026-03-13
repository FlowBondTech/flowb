// ===== FlowB Auth System =====
// Supabase Auth (FlowB Passport) — exchange token for FlowB JWT

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
  // Capture ?from= param (e.g. ?from=telegram) before redirects clear it
  const urlParams = new URLSearchParams(window.location.search);
  const fromPlatform = urlParams.get('from');
  if (fromPlatform) {
    sessionStorage.setItem('flowb-from-platform', fromPlatform);
    urlParams.delete('from');
    const cleanUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams}`
      : window.location.pathname;
    history.replaceState(null, '', cleanUrl);
  }

  // Restore JWT from localStorage
  Auth.jwt = localStorage.getItem(JWT_KEY);

  // Restore user from localStorage as a temporary UI hint while auth loads
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      Auth.user = JSON.parse(stored);
      Auth.isAuthenticated = !!Auth.jwt;
      renderAuthState();
      // If we have a stored user but no JWT, get one
      if (!Auth.jwt && Auth.user.id) {
        getFlowbJwtFromPassport();
      }
      // Refresh display name from backend on page load
      if (Auth.jwt) {
        fetchBackendProfile();
      }
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  // ===== Supabase Auth listener (primary) =====
  window.addEventListener('flowb-auth-change', (e) => {
    const { authenticated, user, session } = e.detail;

    if (authenticated && user && session) {
      handleSupabaseLogin(user, session);
    } else {
      clearLocalAuth();
    }
  });

  // Cross-device magic link: Device B clicked the link, Device A auto-signs in
  window.addEventListener('flowb-pending-resolved', (e) => {
    const { token, user } = e.detail;
    if (!token || !user) return;
    Auth.jwt = token;
    Auth.user = {
      id: user.id,
      username: user.username || user.email?.split('@')[0],
      email: user.email,
      loginAt: Date.now(),
      authProvider: 'supabase',
    };
    Auth.isAuthenticated = true;
    localStorage.setItem(JWT_KEY, token);
    localStorage.setItem(AUTH_KEY, JSON.stringify(Auth.user));
    renderAuthState();
    // Close the auth modal if open
    var modal = document.getElementById('flowb-auth-modal');
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
    window.dispatchEvent(new CustomEvent('flowb-auth-ready'));
    setTimeout(() => checkAndPromptLinking(), 1500);
  });

  // Listen for account linking events
  window.addEventListener('flowb-accounts-linked', (e) => {
    const { mergedPoints } = e.detail;
    document.getElementById('linkingPrompt')?.remove();
    document.body.style.overflow = '';
    if (mergedPoints > 0 && typeof showPointsToast === 'function') {
      showPointsToast(mergedPoints, 'Points merged across platforms!', 'bonus');
    }
    refreshPointsBadge();
  });

  // Logout handler
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    clearLocalAuth();
    // Logout from Supabase Auth
    if (window.flowbAuth) {
      try { await window.flowbAuth.logout(); } catch {}
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

// ===== Get FlowB JWT from Passport endpoint (Supabase Auth) =====

async function getFlowbJwtFromPassport(session) {
  // If no session passed, try to get it from flowbAuth
  if (!session && window.flowbAuth) {
    session = window.flowbAuth.getSession();
  }
  if (!session || !session.access_token) {
    return null;
  }

  try {
    const authRes = await fetch(`${FLOWB_API_BASE}/api/v1/auth/passport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: session.access_token,
        displayName: Auth.user?.username || session.user?.user_metadata?.display_name,
      }),
    });
    if (!authRes.ok) {
      console.warn('[auth] Passport JWT failed:', authRes.status);
      return null;
    }
    const data = await authRes.json();
    Auth.jwt = data.token;
    localStorage.setItem(JWT_KEY, data.token);
    Auth.isAuthenticated = true;
    console.log('[auth] FlowB Passport JWT obtained');
    return data.token;
  } catch (err) {
    console.warn('[auth] Passport JWT error:', err);
    return null;
  }
}

// ===== Get auth token for API calls =====

function getAuthToken() {
  return Auth.jwt || localStorage.getItem(JWT_KEY) || null;
}

// ===== Supabase Auth Login Handler =====

async function handleSupabaseLogin(user, session) {
  Auth.user = {
    id: user.id,
    username: user.displayName || user.email?.split('@')[0],
    email: user.email,
    loginAt: Date.now(),
    authProvider: 'supabase',
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(Auth.user));

  // Get FlowB JWT from Passport endpoint
  await getFlowbJwtFromPassport(session);
  Auth.isAuthenticated = true;

  // Award first login bonus
  if (typeof awardFirstAction === 'function') {
    awardFirstAction('first_login', 10, 'First login bonus!');
  }

  renderAuthState();
  claimPendingPointsToBackend();

  // Fetch backend profile to get real display name
  fetchBackendProfile();

  window.dispatchEvent(new CustomEvent('flowb-auth-ready'));
  setTimeout(() => checkAndPromptLinking(), 1500);
}

async function fetchBackendProfile() {
  const token = getAuthToken();
  if (!token) return;
  try {
    const res = await fetch(`${FLOWB_API_BASE}/api/v1/me/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const p = data.profile;
    if (!p) return;
    // Update Auth.user with backend data if richer than what we have
    const backendName = p.display_name;
    if (backendName && backendName !== 'User' && Auth.user) {
      Auth.user.username = backendName;
      if (p.avatar_url) Auth.user.avatarUrl = p.avatar_url;
      if (p.bio) Auth.user.bio = p.bio;
      Auth.user.profile = p;
      localStorage.setItem(AUTH_KEY, JSON.stringify(Auth.user));
      renderAuthState();
    } else if (Auth.user) {
      Auth.user.profile = p;
    }
    window.dispatchEvent(new CustomEvent('flowb-profile-loaded', { detail: { profile: p } }));
  } catch (err) {
    console.warn('[auth] Failed to fetch profile:', err);
  }
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
    const { claimed } = await claimRes.json();

    if (typeof clearPendingActions === 'function') clearPendingActions();

    if (claimed > 0 && typeof showPointsToast === 'function') {
      showPointsToast(claimed, 'Points synced to your account!', 'bonus');
    }
    console.log(`[auth] Claimed ${claimed} pending points`);
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
      <p class="signin-prompt-sub">Connect with email, social accounts, or magic link</p>
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
    triggerLogin();
  });
}

// ===== Trigger Login =====

function triggerLogin() {
  if (window.flowbAuth) {
    window.flowbAuth.login();
  } else {
    console.warn('[auth] No auth provider loaded');
  }
}

// ===== Cross-Platform Account Linking =====

async function checkAndPromptLinking() {
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
    const suggestTelegram = !status.has_telegram && fromPlatform !== 'telegram';
    const suggestFarcaster = !status.has_farcaster && fromPlatform !== 'farcaster';

    if (!suggestTelegram && !suggestFarcaster) return;

    showLinkingPrompt({ fromPlatform, suggestTelegram, suggestFarcaster, mergedPoints: status.merged_points });
  } catch (err) {
    console.warn('[auth] Link status check failed:', err);
  }
}

function showLinkingPrompt({ fromPlatform, suggestTelegram, suggestFarcaster, mergedPoints }) {
  document.getElementById('linkingPrompt')?.remove();

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

  let buttons = '';
  if (suggestTelegram) {
    buttons += `<a href="https://flowb.fly.dev/connect" target="_blank" class="signin-prompt-btn" style="margin-bottom:0.5rem;display:inline-flex;align-items:center;text-decoration:none">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="margin-right:6px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.28-.02-.12.02-2.02 1.28-5.69 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.09-.5-.84-.27-1.51-.42-1.45-.89.03-.25.38-.5 1.04-.78 4.07-1.77 6.79-2.94 8.15-3.5 3.88-1.62 4.69-1.9 5.21-1.91.12 0 .37.03.54.17.14.12.18.28.2.47-.01.06.01.24 0 .37z"/></svg>
      Connect Telegram</a>`;
  }
  if (suggestFarcaster) {
    buttons += `<a href="https://fc.flowb.me?link=true" target="_blank" class="signin-prompt-btn" style="background:var(--accent-secondary,#8b5cf6);display:inline-flex;align-items:center;text-decoration:none">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="margin-right:6px"><path d="M4 3h16v1.5l-1.5 1.5v12l1.5 1.5V21H4v-1.5L5.5 18V6L4 4.5V3zm4 5v8h2v-3h4v3h2V8h-2v3h-4V8H8z"/></svg>
      Connect Farcaster</a>`;
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

  const dismiss = () => {
    localStorage.setItem('flowb-link-prompt-dismissed', String(Date.now()));
    close();
  };

  prompt.querySelector('#linkPromptClose')?.addEventListener('click', dismiss);
  prompt.querySelector('#linkPromptDismiss')?.addEventListener('click', dismiss);
  prompt.addEventListener('click', (e) => {
    if (e.target === prompt) dismiss();
  });
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
    if (typeof updatePointsDisplay === 'function') {
      updatePointsDisplay(data.points);
    }
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

    if (userAvatar) {
      if (Auth.user.avatarUrl) {
        userAvatar.innerHTML = '<img src="' + escapeHtml(Auth.user.avatarUrl) + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
      } else {
        const initial = (Auth.user.username || Auth.user.email || '?')[0].toUpperCase();
        userAvatar.textContent = initial;
      }
    }

    if (userDropdownHeader) {
      const provider = 'FlowB Passport';
      userDropdownHeader.innerHTML = `
        <div style="font-weight:600;font-size:0.85rem">${escapeHtml(Auth.user.username || Auth.user.email || 'User')}</div>
        <div style="font-size:0.7rem;color:var(--text-dim)">${provider}</div>`;
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
