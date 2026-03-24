// ===== FlowB Passport: Email-Only Auth (Privy-style) =====
// Vanilla JS auth via Supabase email OTP.
// Emits 'flowb-auth-change' events for the auth system.

(function () {
  'use strict';

  var SUPABASE_URL = 'https://eoajujwpdkfuicnoxetk.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg';

  var supabase = null;
  var currentSession = null;

  // ===== Initialize Supabase =====

  function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.error('[flowb-auth] Supabase JS not loaded');
      return;
    }

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
                platform: 'web',
                linkedAccounts: buildLinkedAccounts(user),
                session: session,
              },
            },
          }));
        }
      } else if (event === 'SIGNED_OUT') {
        window.dispatchEvent(new CustomEvent('flowb-auth-change', {
          detail: { authenticated: false, user: null },
        }));
      }
    });

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
              platform: 'web',
              linkedAccounts: buildLinkedAccounts(user),
              session: result.data.session,
            },
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

  function loginWithEmail(email) {
    if (!supabase) return Promise.reject(new Error('Not initialized'));
    return supabase.auth.signInWithOtp({ email: email }).then(function (result) {
      if (result.error) throw result.error;
    });
  }

  function verifyOtp(email, code) {
    if (!supabase) return Promise.reject(new Error('Not initialized'));
    return supabase.auth.verifyOtp({
      email: email, token: code, type: 'email',
    }).then(function (result) {
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

  function getSession() { return currentSession; }

  function getLinkedAccounts() {
    if (!currentSession || !currentSession.user) return [];
    return buildLinkedAccounts(currentSession.user);
  }

  // ===== Auth Modal =====

  function showAuthModal() {
    var existing = document.getElementById('flowb-auth-modal');
    if (existing) existing.remove();

    var otpEmail = null;
    var resendCooldown = null;

    var modal = document.createElement('div');
    modal.id = 'flowb-auth-modal';
    modal.className = 'flowb-auth-backdrop';
    modal.innerHTML = '\
      <div class="flowb-auth-card">\
        <button class="flowb-auth-close" id="flowbAuthClose">\
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>\
        </button>\
        \
        <!-- Email view -->\
        <div id="flowbViewEmail">\
          <img src="flowb.png" alt="FlowB" class="flowb-auth-logo">\
          <h3 class="flowb-auth-title">Log in to FlowB</h3>\
          <p class="flowb-auth-subtitle">Enter your email to receive a sign-in code</p>\
          <form id="flowbEmailForm">\
            <label class="flowb-auth-label" for="flowbAuthEmail">Email address</label>\
            <input type="email" id="flowbAuthEmail" class="flowb-auth-input" placeholder="you@example.com" required autocomplete="email">\
            <button type="submit" class="flowb-auth-submit" id="flowbEmailBtn">Continue</button>\
            <p class="flowb-auth-hint" id="flowbEmailHint"></p>\
          </form>\
        </div>\
        \
        <!-- OTP view -->\
        <div id="flowbViewOtp" class="flowb-auth-view-hidden">\
          <div class="flowb-auth-icon-circle">\
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>\
          </div>\
          <h3 class="flowb-auth-title">Check your email</h3>\
          <p class="flowb-auth-subtitle">Enter the 6-digit code sent to <strong id="flowbOtpEmailDisplay"></strong></p>\
          <div class="flowb-auth-otp-group" id="flowbOtpGroup">\
            <input type="text" inputmode="numeric" maxlength="1" class="flowb-auth-otp-digit" data-idx="0" autocomplete="one-time-code">\
            <input type="text" inputmode="numeric" maxlength="1" class="flowb-auth-otp-digit" data-idx="1">\
            <input type="text" inputmode="numeric" maxlength="1" class="flowb-auth-otp-digit" data-idx="2">\
            <span class="flowb-auth-otp-sep"></span>\
            <input type="text" inputmode="numeric" maxlength="1" class="flowb-auth-otp-digit" data-idx="3">\
            <input type="text" inputmode="numeric" maxlength="1" class="flowb-auth-otp-digit" data-idx="4">\
            <input type="text" inputmode="numeric" maxlength="1" class="flowb-auth-otp-digit" data-idx="5">\
          </div>\
          <button type="button" class="flowb-auth-submit" id="flowbOtpBtn">Verify</button>\
          <p class="flowb-auth-hint" id="flowbOtpHint"></p>\
          <div class="flowb-auth-otp-actions">\
            <button type="button" class="flowb-auth-link" id="flowbOtpResend">Resend code</button>\
            <button type="button" class="flowb-auth-link" id="flowbOtpBack">Use a different email</button>\
          </div>\
        </div>\
        \
        <div class="flowb-auth-footer">\
          <p>By continuing, you agree to FlowB\'s terms of service</p>\
        </div>\
      </div>\
    ';
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    var viewEmail = modal.querySelector('#flowbViewEmail');
    var viewOtp = modal.querySelector('#flowbViewOtp');

    function switchView(name) {
      viewEmail.className = name === 'email' ? '' : 'flowb-auth-view-hidden';
      viewOtp.className = name === 'otp' ? '' : 'flowb-auth-view-hidden';
    }

    // Close
    var close = function () {
      if (resendCooldown) clearInterval(resendCooldown);
      modal.remove();
      document.body.style.overflow = '';
    };
    modal.querySelector('#flowbAuthClose').addEventListener('click', close);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });

    // --- Email form submit ---
    modal.querySelector('#flowbEmailForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = modal.querySelector('#flowbAuthEmail').value.trim();
      if (!email) return;
      var btn = modal.querySelector('#flowbEmailBtn');
      var hint = modal.querySelector('#flowbEmailHint');
      btn.textContent = 'Sending code...';
      btn.disabled = true;
      hint.textContent = '';

      loginWithEmail(email).then(function () {
        otpEmail = email;
        modal.querySelector('#flowbOtpEmailDisplay').textContent = email;
        switchView('otp');
        var digits = modal.querySelectorAll('.flowb-auth-otp-digit');
        digits[0].focus();
        startResendCooldown();
      }).catch(function (err) {
        hint.textContent = err.message || 'Failed to send code';
        hint.style.color = '#ef4444';
        btn.textContent = 'Continue';
        btn.disabled = false;
      });
    });

    // --- OTP digit box wiring ---
    var digits = modal.querySelectorAll('.flowb-auth-otp-digit');

    function getOtpValue() {
      var code = '';
      digits.forEach(function (d) { code += d.value; });
      return code;
    }

    function submitOtp() {
      var code = getOtpValue();
      if (code.length !== 6 || !otpEmail) return;
      var btn = modal.querySelector('#flowbOtpBtn');
      var hint = modal.querySelector('#flowbOtpHint');
      btn.textContent = 'Verifying...';
      btn.disabled = true;
      hint.textContent = '';

      verifyOtp(otpEmail, code).then(function () {
        close();
      }).catch(function (err) {
        hint.textContent = err.message || 'Invalid code';
        hint.style.color = '#ef4444';
        btn.textContent = 'Verify';
        btn.disabled = false;
        // Shake animation
        digits.forEach(function (d) {
          d.classList.add('shake');
          d.value = '';
        });
        digits[0].focus();
        setTimeout(function () {
          digits.forEach(function (d) { d.classList.remove('shake'); });
        }, 500);
      });
    }

    digits.forEach(function (digit, idx) {
      digit.addEventListener('input', function (e) {
        var val = this.value.replace(/[^0-9]/g, '');
        this.value = val ? val[val.length - 1] : '';
        if (this.value && idx < 5) {
          digits[idx + 1].focus();
        }
        if (getOtpValue().length === 6) {
          submitOtp();
        }
      });

      digit.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !this.value && idx > 0) {
          digits[idx - 1].focus();
          digits[idx - 1].value = '';
          e.preventDefault();
        }
        if (e.key === 'Enter') {
          submitOtp();
        }
      });

      digit.addEventListener('paste', function (e) {
        e.preventDefault();
        var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        for (var i = 0; i < pasted.length && i < 6; i++) {
          digits[i].value = pasted[i];
        }
        if (pasted.length >= 6) {
          digits[5].focus();
          submitOtp();
        } else if (pasted.length > 0) {
          digits[Math.min(pasted.length, 5)].focus();
        }
      });
    });

    // Verify button
    modal.querySelector('#flowbOtpBtn').addEventListener('click', submitOtp);

    // --- Resend with 30s cooldown ---
    function startResendCooldown() {
      var resendBtn = modal.querySelector('#flowbOtpResend');
      var secs = 30;
      resendBtn.disabled = true;
      resendBtn.textContent = 'Resend code (' + secs + 's)';
      if (resendCooldown) clearInterval(resendCooldown);
      resendCooldown = setInterval(function () {
        secs--;
        if (secs <= 0) {
          clearInterval(resendCooldown);
          resendCooldown = null;
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend code';
        } else {
          resendBtn.textContent = 'Resend code (' + secs + 's)';
        }
      }, 1000);
    }

    modal.querySelector('#flowbOtpResend').addEventListener('click', function () {
      if (!otpEmail || this.disabled) return;
      var hint = modal.querySelector('#flowbOtpHint');
      hint.textContent = 'Sending new code...';
      hint.style.color = 'var(--text-muted, #8888a0)';
      loginWithEmail(otpEmail).then(function () {
        hint.textContent = 'New code sent!';
        hint.style.color = 'var(--accent, #2563eb)';
        startResendCooldown();
      }).catch(function (err) {
        hint.textContent = err.message || 'Failed to resend';
        hint.style.color = '#ef4444';
      });
    });

    // --- Back to email view ---
    modal.querySelector('#flowbOtpBack').addEventListener('click', function () {
      otpEmail = null;
      var btn = modal.querySelector('#flowbEmailBtn');
      btn.textContent = 'Continue';
      btn.disabled = false;
      modal.querySelector('#flowbEmailHint').textContent = '';
      digits.forEach(function (d) { d.value = ''; });
      modal.querySelector('#flowbOtpHint').textContent = '';
      if (resendCooldown) { clearInterval(resendCooldown); resendCooldown = null; }
      switchView('email');
      modal.querySelector('#flowbAuthEmail').focus();
    });

    // Auto-focus email input
    setTimeout(function () {
      modal.querySelector('#flowbAuthEmail')?.focus();
    }, 100);
  }

  // ===== Public API =====

  window.flowbAuth = {
    login: showAuthModal,
    loginWithEmail: loginWithEmail,
    verifyOtp: verifyOtp,
    logout: logout,
    getSession: getSession,
    getLinkedAccounts: getLinkedAccounts,
    getSupabase: function () { return supabase; },
  };

  // ===== Auto-init =====

  if (typeof window.supabase !== 'undefined') {
    initSupabase();
  } else {
    window.addEventListener('DOMContentLoaded', function () {
      if (typeof window.supabase !== 'undefined') {
        initSupabase();
      } else {
        console.warn('[flowb-auth] Supabase JS not found. Add the CDN script to your HTML.');
      }
    });
  }
})();
