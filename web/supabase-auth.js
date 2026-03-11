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
                displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
                email: user.email || null,
                wallet: null,
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
              displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
              email: user.email || null,
              wallet: null,
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
          <button class="flowb-auth-tab active" data-tab="magic">Magic Link</button>\
          <button class="flowb-auth-tab" data-tab="password">Password</button>\
        </div>\
        <form id="flowbAuthMagicForm" class="flowb-auth-form">\
          <input type="email" id="flowbAuthEmail" placeholder="you@example.com" required autocomplete="email">\
          <button type="submit" class="flowb-auth-submit" id="flowbAuthMagicBtn">Send Magic Link</button>\
          <p class="flowb-auth-hint" id="flowbAuthMagicHint"></p>\
        </form>\
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
        document.getElementById('flowbAuthMagicForm').style.display = target === 'magic' ? '' : 'none';
        document.getElementById('flowbAuthPasswordForm').style.display = target === 'password' ? '' : 'none';
      });
    });

    // Magic Link
    var isSignUp = false;
    modal.querySelector('#flowbAuthMagicForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('flowbAuthEmail').value.trim();
      if (!email) return;
      var btn = document.getElementById('flowbAuthMagicBtn');
      btn.textContent = 'Sending...';
      btn.disabled = true;
      loginWithEmail(email).then(function () {
        document.getElementById('flowbAuthMagicHint').textContent = 'Check your email for the magic link!';
        document.getElementById('flowbAuthMagicHint').style.color = 'var(--accent, #6366f1)';
        btn.textContent = 'Link Sent';
      }).catch(function (err) {
        document.getElementById('flowbAuthMagicHint').textContent = err.message || 'Failed to send';
        document.getElementById('flowbAuthMagicHint').style.color = '#ef4444';
        btn.textContent = 'Send Magic Link';
        btn.disabled = false;
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
    return supabase.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    }).then(function (result) {
      if (result.error) throw result.error;
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
