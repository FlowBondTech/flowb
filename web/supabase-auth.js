// ===== FlowB Passport: Supabase Auth Integration =====
// Vanilla JS Supabase Auth integration.
// Emits 'flowb-auth-change' events for the auth system.

(function () {
  'use strict';

  // Supabase project config
  const SUPABASE_URL = 'https://eoajujwpdkfuicnoxetk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg';

  let supabase = null;
  let currentSession = null;

  // ===== Initialize Supabase =====

  function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.error('[flowb-auth] Supabase JS not loaded');
      return;
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(function (event, session) {
      console.log('[flowb-auth] Auth event:', event);
      currentSession = session;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session && session.user) {
          var user = session.user;
          window.dispatchEvent(new CustomEvent('flowb-auth-change', {
            detail: {
              authenticated: true,
              user: {
                id: user.id,
                displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || shortenAddress(user.user_metadata?.wallet_address) || 'User',
                email: user.email || null,
                wallet: user.user_metadata?.wallet_address || null,
                linkedAccounts: buildLinkedAccounts(user),
              },
              session: session,
            },
          }));
        }
      } else if (event === 'SIGNED_OUT') {
        window.dispatchEvent(new CustomEvent('flowb-auth-change', {
          detail: { authenticated: false, user: null },
        }));
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(function (result) {
      if (result.data.session) {
        currentSession = result.data.session;
        var user = result.data.session.user;
        window.dispatchEvent(new CustomEvent('flowb-auth-change', {
          detail: {
            authenticated: true,
            user: {
              id: user.id,
              displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || shortenAddress(user.user_metadata?.wallet_address) || 'User',
              email: user.email || null,
              wallet: user.user_metadata?.wallet_address || null,
              linkedAccounts: buildLinkedAccounts(user),
            },
            session: result.data.session,
          },
        }));
      }
    });
  }

  function buildLinkedAccounts(user) {
    var accounts = [];
    if (user.email) {
      accounts.push({ type: 'email', email: user.email });
    }
    if (user.identities) {
      user.identities.forEach(function (identity) {
        accounts.push({
          type: identity.provider,
          subject: identity.identity_data?.sub || identity.id,
          username: identity.identity_data?.preferred_username || identity.identity_data?.name,
          email: identity.identity_data?.email,
        });
      });
    }
    return accounts;
  }

  function shortenAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  // ===== Auth Methods =====

  function showAuthModal() {
    // Remove existing modal if any
    var existing = document.getElementById('flowb-auth-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'flowb-auth-modal';
    modal.className = 'flowb-auth-backdrop';
    modal.innerHTML = '\
      <div class="flowb-auth-card">\
        <button class="flowb-auth-close" id="flowbAuthClose">&times;</button>\
        <div class="flowb-auth-header">\
          <img src="flowb.png" alt="FlowB" style="width:40px;height:40px;border-radius:8px">\
          <h3>FlowB Passport</h3>\
          <p class="flowb-auth-subtitle">Sign in to get in the Flow</p>\
        </div>\
        <div class="flowb-auth-tabs">\
          <button class="flowb-auth-tab active" data-tab="magic">Magic Code</button>\
          <button class="flowb-auth-tab" data-tab="wallet">Wallet</button>\
          <button class="flowb-auth-tab" data-tab="password">Password</button>\
        </div>\
        <form id="flowbAuthMagicForm" class="flowb-auth-form">\
          <input type="email" id="flowbAuthEmail" placeholder="you@example.com" required autocomplete="email">\
          <button type="submit" class="flowb-auth-submit" id="flowbAuthMagicBtn">Send Code</button>\
          <p class="flowb-auth-hint" id="flowbAuthMagicHint"></p>\
        </form>\
        <form id="flowbAuthOtpForm" class="flowb-auth-form" style="display:none">\
          <p class="flowb-auth-hint" style="color:var(--accent,#6366f1);margin-bottom:0.75rem">Enter the 6-digit code sent to <strong id="flowbOtpEmailDisplay"></strong></p>\
          <input type="text" id="flowbAuthOtpCode" placeholder="000000" required autocomplete="one-time-code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" style="text-align:center;font-size:1.5rem;letter-spacing:0.5rem;font-family:monospace">\
          <button type="submit" class="flowb-auth-submit" id="flowbAuthOtpBtn">Verify</button>\
          <p class="flowb-auth-hint" id="flowbAuthOtpHint"></p>\
          <div style="display:flex;gap:0.5rem;margin-top:0.25rem">\
            <button type="button" class="flowb-auth-link" id="flowbOtpBack">Use different email</button>\
            <button type="button" class="flowb-auth-link" id="flowbOtpResend">Resend code</button>\
          </div>\
        </form>\
        <div id="flowbAuthWalletForm" class="flowb-auth-form" style="display:none">\
          <p class="flowb-auth-hint" style="color:var(--text-dim,#9ca3af);margin-bottom:0.75rem">Connect your wallet to sign in</p>\
          <button type="button" class="flowb-auth-submit flowb-wallet-btn" id="flowbWalletEth" style="display:flex;align-items:center;justify-content:center;gap:8px">\
            <svg width="18" height="18" viewBox="0 0 256 417" fill="none"><path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fill="#343434"/><path d="M127.962 0L0 212.32l127.962 75.639V154.158z" fill="#8C8C8C"/><path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.601L256 236.587z" fill="#3C3C3B"/><path d="M127.962 416.905v-104.72L0 236.585z" fill="#8C8C8C"/><path d="M127.961 287.958l127.96-75.637-127.96-58.162z" fill="#141414"/><path d="M0 212.32l127.96 75.639v-133.8z" fill="#393939"/></svg>\
            Ethereum\
          </button>\
          <button type="button" class="flowb-auth-submit flowb-wallet-btn" id="flowbWalletSol" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:0.5rem;background:linear-gradient(135deg,#9945ff,#14f195)">\
            <svg width="18" height="18" viewBox="0 0 397 311" fill="white"><path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/><path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/><path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/></svg>\
            Solana\
          </button>\
          <p class="flowb-auth-hint" id="flowbAuthWalletHint"></p>\
          <p class="flowb-auth-hint" id="flowbWalletDetect" style="color:var(--text-dim,#9ca3af);font-size:0.75rem;margin-top:0.75rem"></p>\
        </div>\
        <form id="flowbAuthPasswordForm" class="flowb-auth-form" style="display:none">\
          <input type="email" id="flowbAuthEmailPw" placeholder="you@example.com" required autocomplete="email">\
          <input type="password" id="flowbAuthPassword" placeholder="Password" required autocomplete="current-password">\
          <button type="submit" class="flowb-auth-submit" id="flowbAuthPwBtn">Sign In</button>\
          <div style="display:flex;gap:0.5rem;margin-top:0.25rem">\
            <button type="button" class="flowb-auth-link" id="flowbAuthSignUpToggle">Create account</button>\
            <button type="button" class="flowb-auth-link" id="flowbAuthForgotPw">Forgot password?</button>\
          </div>\
          <p class="flowb-auth-hint" id="flowbAuthPwHint"></p>\
        </form>\
\
      </div>\
    ';
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Event handlers
    var close = function () {
      modal.remove();
      document.body.style.overflow = '';
    };

    modal.querySelector('#flowbAuthClose').addEventListener('click', close);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });

    // Tab switching
    modal.querySelectorAll('.flowb-auth-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        modal.querySelectorAll('.flowb-auth-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.dataset.tab;
        document.getElementById('flowbAuthMagicForm').style.display = target === 'magic' && !otpEmail ? '' : 'none';
        document.getElementById('flowbAuthOtpForm').style.display = target === 'magic' && otpEmail ? '' : 'none';
        document.getElementById('flowbAuthWalletForm').style.display = target === 'wallet' ? '' : 'none';
        document.getElementById('flowbAuthPasswordForm').style.display = target === 'password' ? '' : 'none';
      });
    });

    // Magic Code (OTP)
    var isSignUp = false;
    var otpEmail = null;
    modal.querySelector('#flowbAuthMagicForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('flowbAuthEmail').value.trim();
      if (!email) return;
      var btn = document.getElementById('flowbAuthMagicBtn');
      btn.textContent = 'Sending...';
      btn.disabled = true;
      loginWithEmail(email).then(function () {
        otpEmail = email;
        // Show OTP input
        document.getElementById('flowbAuthMagicForm').style.display = 'none';
        document.getElementById('flowbAuthOtpForm').style.display = '';
        document.getElementById('flowbOtpEmailDisplay').textContent = email;
        document.getElementById('flowbAuthOtpCode').focus();
      }).catch(function (err) {
        document.getElementById('flowbAuthMagicHint').textContent = err.message || 'Failed to send';
        document.getElementById('flowbAuthMagicHint').style.color = '#ef4444';
        btn.textContent = 'Send Code';
        btn.disabled = false;
      });
    });

    // OTP verification
    modal.querySelector('#flowbAuthOtpForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var code = document.getElementById('flowbAuthOtpCode').value.trim();
      if (!code || !otpEmail) return;
      var btn = document.getElementById('flowbAuthOtpBtn');
      var hint = document.getElementById('flowbAuthOtpHint');
      btn.textContent = 'Verifying...';
      btn.disabled = true;
      verifyOtp(otpEmail, code).then(function () {
        close();
      }).catch(function (err) {
        hint.textContent = err.message || 'Invalid code';
        hint.style.color = '#ef4444';
        btn.textContent = 'Verify';
        btn.disabled = false;
      });
    });

    // Back to email from OTP
    modal.querySelector('#flowbOtpBack').addEventListener('click', function () {
      document.getElementById('flowbAuthOtpForm').style.display = 'none';
      document.getElementById('flowbAuthMagicForm').style.display = '';
      document.getElementById('flowbAuthMagicBtn').textContent = 'Send Code';
      document.getElementById('flowbAuthMagicBtn').disabled = false;
      document.getElementById('flowbAuthMagicHint').textContent = '';
      otpEmail = null;
    });

    // Resend code
    modal.querySelector('#flowbOtpResend').addEventListener('click', function () {
      if (!otpEmail) return;
      var hint = document.getElementById('flowbAuthOtpHint');
      hint.textContent = 'Sending new code...';
      hint.style.color = 'var(--text-dim, #9ca3af)';
      loginWithEmail(otpEmail).then(function () {
        hint.textContent = 'New code sent!';
        hint.style.color = 'var(--accent, #6366f1)';
      }).catch(function (err) {
        hint.textContent = err.message || 'Failed to resend';
        hint.style.color = '#ef4444';
      });
    });

    // Web3 wallet detection
    var detectEl = document.getElementById('flowbWalletDetect');
    var hasEth = typeof window.ethereum !== 'undefined';
    var hasSol = typeof window.solana !== 'undefined' || typeof window.phantom !== 'undefined';
    if (!hasEth && !hasSol) {
      detectEl.textContent = 'No wallet detected. Install MetaMask or Phantom to use wallet sign-in.';
    } else {
      var detected = [];
      if (hasEth) detected.push('Ethereum');
      if (hasSol) detected.push('Solana');
      detectEl.textContent = 'Detected: ' + detected.join(', ');
    }

    // Ethereum wallet sign-in
    modal.querySelector('#flowbWalletEth').addEventListener('click', function () {
      var btn = this;
      var hint = document.getElementById('flowbAuthWalletHint');
      if (!hasEth) {
        hint.textContent = 'No Ethereum wallet found. Install MetaMask or similar.';
        hint.style.color = '#ef4444';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Confirm in wallet...';
      hint.textContent = '';
      loginWithWeb3('ethereum').then(function () {
        close();
      }).catch(function (err) {
        hint.textContent = err.message || 'Wallet sign-in failed';
        hint.style.color = '#ef4444';
        btn.disabled = false;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 256 417" fill="none"><path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fill="#343434"/><path d="M127.962 0L0 212.32l127.962 75.639V154.158z" fill="#8C8C8C"/><path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.601L256 236.587z" fill="#3C3C3B"/><path d="M127.962 416.905v-104.72L0 236.585z" fill="#8C8C8C"/></svg> Ethereum';
      });
    });

    // Solana wallet sign-in
    modal.querySelector('#flowbWalletSol').addEventListener('click', function () {
      var btn = this;
      var hint = document.getElementById('flowbAuthWalletHint');
      if (!hasSol) {
        hint.textContent = 'No Solana wallet found. Install Phantom or similar.';
        hint.style.color = '#ef4444';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Confirm in wallet...';
      hint.textContent = '';
      loginWithWeb3('solana').then(function () {
        close();
      }).catch(function (err) {
        hint.textContent = err.message || 'Wallet sign-in failed';
        hint.style.color = '#ef4444';
        btn.disabled = false;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 397 311" fill="white"><path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/><path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/><path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/></svg> Solana';
      });
    });

    // Password sign in / sign up
    modal.querySelector('#flowbAuthPasswordForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('flowbAuthEmailPw').value.trim();
      var password = document.getElementById('flowbAuthPassword').value;
      if (!email || !password) return;
      var btn = document.getElementById('flowbAuthPwBtn');
      var hint = document.getElementById('flowbAuthPwHint');
      btn.textContent = isSignUp ? 'Creating...' : 'Signing in...';
      btn.disabled = true;

      var promise = isSignUp
        ? supabase.auth.signUp({ email: email, password: password, options: { emailRedirectTo: window.location.origin + '/auth/callback' } })
        : supabase.auth.signInWithPassword({ email: email, password: password });

      promise.then(function (result) {
        if (result.error) throw result.error;
        if (isSignUp && !result.data.session) {
          hint.textContent = 'Check your email to confirm your account!';
          hint.style.color = 'var(--accent, #6366f1)';
          btn.textContent = 'Confirmation Sent';
        } else {
          close();
        }
      }).catch(function (err) {
        hint.textContent = err.message || 'Authentication failed';
        hint.style.color = '#ef4444';
        btn.textContent = isSignUp ? 'Create Account' : 'Sign In';
        btn.disabled = false;
      });
    });

    // Sign up toggle
    modal.querySelector('#flowbAuthSignUpToggle').addEventListener('click', function () {
      isSignUp = !isSignUp;
      document.getElementById('flowbAuthPwBtn').textContent = isSignUp ? 'Create Account' : 'Sign In';
      this.textContent = isSignUp ? 'Have an account? Sign in' : 'Create account';
    });

    // Forgot password
    modal.querySelector('#flowbAuthForgotPw').addEventListener('click', function () {
      var email = document.getElementById('flowbAuthEmailPw').value.trim();
      if (!email) {
        document.getElementById('flowbAuthPwHint').textContent = 'Enter your email first';
        document.getElementById('flowbAuthPwHint').style.color = '#ef4444';
        return;
      }
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/callback',
      }).then(function () {
        document.getElementById('flowbAuthPwHint').textContent = 'Password reset email sent!';
        document.getElementById('flowbAuthPwHint').style.color = 'var(--accent, #6366f1)';
      }).catch(function (err) {
        document.getElementById('flowbAuthPwHint').textContent = err.message || 'Failed';
        document.getElementById('flowbAuthPwHint').style.color = '#ef4444';
      });
    });

  }

  function loginWithEmail(email) {
    if (!supabase) return Promise.reject(new Error('Not initialized'));
    // No emailRedirectTo → Supabase sends a 6-digit OTP code instead of a link
    return supabase.auth.signInWithOtp({
      email: email,
    }).then(function (result) {
      if (result.error) throw result.error;
    });
  }

  function verifyOtp(email, code) {
    if (!supabase) return Promise.reject(new Error('Not initialized'));
    return supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: 'email',
    }).then(function (result) {
      if (result.error) throw result.error;
      return result.data;
    });
  }

  function loginWithWeb3(chain) {
    if (!supabase) return Promise.reject(new Error('Not initialized'));
    var opts = {
      chain: chain,
      statement: 'Sign in to FlowB with your wallet',
    };
    // Use Phantom if available for Solana
    if (chain === 'solana' && window.phantom?.solana) {
      opts.wallet = window.phantom.solana;
    }
    return supabase.auth.signInWithWeb3(opts).then(function (result) {
      if (result.error) throw result.error;
      return result.data;
    });
  }

  function loginWithPassword(email, password) {
    if (!supabase) return Promise.reject(new Error('Not initialized'));
    return supabase.auth.signInWithPassword({ email: email, password: password })
      .then(function (result) {
        if (result.error) throw result.error;
        return result.data;
      });
  }


  function logout() {
    if (!supabase) return Promise.resolve();
    return supabase.auth.signOut().then(function () {
      currentSession = null;
    });
  }

  function getSession() {
    return currentSession;
  }

  function getLinkedAccounts() {
    if (!currentSession || !currentSession.user) return [];
    return buildLinkedAccounts(currentSession.user);
  }


  // ===== Public API =====

  window.flowbAuth = {
    login: showAuthModal,
    loginWithEmail: loginWithEmail,
    verifyOtp: verifyOtp,
    loginWithWeb3: loginWithWeb3,
    loginWithPassword: loginWithPassword,
    logout: logout,
    getSession: getSession,
    getLinkedAccounts: getLinkedAccounts,
    getSupabase: function () { return supabase; },
  };

  // ===== Auto-init =====

  // Try to init immediately if Supabase JS is already loaded
  if (typeof window.supabase !== 'undefined') {
    initSupabase();
  } else {
    // Wait for Supabase JS to load (CDN script)
    window.addEventListener('DOMContentLoaded', function () {
      if (typeof window.supabase !== 'undefined') {
        initSupabase();
      } else {
        console.warn('[flowb-auth] Supabase JS not found. Add the CDN script to your HTML.');
      }
    });
  }
})();
