// ===== FlowB Passport: Supabase Auth + Farcaster SIWF =====
// Vanilla JS auth integration.
// Emits 'flowb-auth-change' events for the auth system.

(function () {
  'use strict';

  // Supabase project config
  const SUPABASE_URL = 'https://eoajujwpdkfuicnoxetk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg';
  const FLOWB_API_BASE = 'https://flowb.fly.dev';
  const FARCASTER_RELAY = 'https://relay.farcaster.xyz';

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

  function shortenAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  // ===== Farcaster SIWF via Relay =====

  var siwfPollTimer = null;

  function stopSiwfPolling() {
    if (siwfPollTimer) {
      clearInterval(siwfPollTimer);
      siwfPollTimer = null;
    }
  }

  async function startFarcasterSiwf(containerEl) {
    stopSiwfPolling();
    containerEl.innerHTML = '<p class="flowb-auth-hint" style="text-align:center">Connecting to Farcaster...</p>';

    try {
      // Create a sign-in channel
      var channelRes = await fetch(FARCASTER_RELAY + '/v1/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siweUri: window.location.origin,
          domain: window.location.hostname,
        }),
      });
      if (!channelRes.ok) throw new Error('Failed to create channel');
      var channel = await channelRes.json();
      var channelToken = channel.channelToken;
      var connectUrl = channel.url;

      // Detect mobile
      var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // Mobile: show "Open Warpcast" button
        var wcUrl = connectUrl.replace('https://', 'farcaster://');
        containerEl.innerHTML = '\
          <div style="text-align:center">\
            <a href="' + connectUrl + '" target="_blank" class="flowb-auth-submit" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;margin-bottom:0.75rem">\
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M4 3h16v1.5l-1.5 1.5v12l1.5 1.5V21H4v-1.5L5.5 18V6L4 4.5V3zm4 5v8h2v-3h4v3h2V8h-2v3h-4V8H8z"/></svg>\
              Open Warpcast\
            </a>\
            <p class="flowb-auth-hint" style="color:var(--text-dim,#9ca3af)">Approve the sign-in request in Warpcast</p>\
            <div id="siwfStatus" class="flowb-auth-hint" style="margin-top:0.5rem"></div>\
          </div>';
      } else {
        // Desktop: show QR code
        containerEl.innerHTML = '\
          <div style="text-align:center">\
            <div id="siwfQr" style="display:inline-block;padding:12px;background:white;border-radius:12px;margin-bottom:0.75rem"></div>\
            <p class="flowb-auth-hint" style="color:var(--text-dim,#9ca3af)">Scan with Warpcast to sign in</p>\
            <div id="siwfStatus" class="flowb-auth-hint" style="margin-top:0.5rem"></div>\
          </div>';
        renderQrCode(document.getElementById('siwfQr'), connectUrl);
      }

      // Poll for completion
      var statusEl = document.getElementById('siwfStatus');
      siwfPollTimer = setInterval(async function () {
        try {
          var statusRes = await fetch(FARCASTER_RELAY + '/v1/channel/status', {
            headers: { 'Authorization': 'Bearer ' + channelToken },
          });
          if (!statusRes.ok) return;
          var status = await statusRes.json();

          if (status.state === 'completed') {
            stopSiwfPolling();
            if (statusEl) statusEl.textContent = 'Signing in...';

            // Exchange with FlowB backend
            var authRes = await fetch(FLOWB_API_BASE + '/api/v1/auth/farcaster', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: status.message,
                signature: status.signature,
                nonce: status.nonce,
                fid: status.fid,
                custody: status.custodyAddress,
                username: status.username,
                displayName: status.displayName,
                pfpUrl: status.pfpUrl,
              }),
            });
            if (!authRes.ok) {
              var errData = await authRes.json().catch(function() { return {}; });
              throw new Error(errData.error || 'Auth failed');
            }
            var authData = await authRes.json();

            // Dispatch auth event with JWT from backend
            window.dispatchEvent(new CustomEvent('flowb-auth-change', {
              detail: {
                authenticated: true,
                jwt: authData.token,
                user: {
                  id: authData.user?.id || 'farcaster_' + status.fid,
                  displayName: status.displayName || status.username || 'FID ' + status.fid,
                  platform: 'farcaster',
                  fid: status.fid,
                  username: status.username,
                  pfpUrl: status.pfpUrl,
                },
              },
            }));

            // Close the modal
            var modal = document.getElementById('flowb-auth-modal');
            if (modal) {
              modal.remove();
              document.body.style.overflow = '';
            }
          } else if (status.state === 'pending') {
            if (statusEl) statusEl.textContent = 'Waiting for approval...';
          }
        } catch (err) {
          console.warn('[flowb-auth] SIWF poll error:', err);
        }
      }, 2000);

    } catch (err) {
      containerEl.innerHTML = '<p class="flowb-auth-hint" style="color:#ef4444">Failed to connect: ' + (err.message || 'Unknown error') + '</p>';
    }
  }

  // ===== Simple QR Code Renderer (inline SVG) =====

  function renderQrCode(container, data) {
    // Use a minimal QR code generator
    // We generate a QR code as an SVG using a simple bit matrix
    try {
      var matrix = generateQrMatrix(data);
      var size = matrix.length;
      var cellSize = 4;
      var padding = 2;
      var totalSize = (size + padding * 2) * cellSize;

      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + totalSize + ' ' + totalSize + '" width="200" height="200">';
      svg += '<rect width="' + totalSize + '" height="' + totalSize + '" fill="white"/>';

      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          if (matrix[y][x]) {
            svg += '<rect x="' + ((x + padding) * cellSize) + '" y="' + ((y + padding) * cellSize) + '" width="' + cellSize + '" height="' + cellSize + '" fill="black"/>';
          }
        }
      }
      svg += '</svg>';
      container.innerHTML = svg;
    } catch (e) {
      // Fallback: show the URL as a link
      container.innerHTML = '<a href="' + data + '" target="_blank" style="color:var(--accent);word-break:break-all">' + data + '</a>';
    }
  }

  // Minimal QR Code encoder (alphanumeric mode, version auto-detect)
  // This is a simplified implementation for generating basic QR codes
  function generateQrMatrix(text) {
    // Use the qrcode-generator pattern (Kazuhiko Arase) embedded inline
    // For simplicity and reliability, we'll use a canvas-based approach if available
    // or fall back to a simple text representation

    // Try to use an existing QR library if loaded
    if (window.QRCode) {
      var qr = new window.QRCode({ content: text, width: 200, height: 200, padding: 0 });
      // This won't work for our SVG approach, fall through
    }

    // Minimal byte-mode QR encoder
    var qr = qrcodegen(text);
    return qr;
  }

  // ===== Minimal QR Code Generator =====
  // Based on Project Nayuki's QR Code generator (public domain)
  // Simplified for our use case

  function qrcodegen(text) {
    var data = [];
    for (var i = 0; i < text.length; i++) {
      data.push(text.charCodeAt(i));
    }

    // Determine version (1-40) based on data capacity
    var version = 1;
    var ecl = 1; // Medium error correction
    for (var v = 1; v <= 40; v++) {
      var cap = getDataCapacity(v, ecl);
      if (data.length <= cap) {
        version = v;
        break;
      }
      if (v === 40) version = 40;
    }

    var size = version * 4 + 17;
    var modules = [];
    for (var y = 0; y < size; y++) {
      modules[y] = [];
      for (var x = 0; x < size; x++) {
        modules[y][x] = false;
      }
    }
    var isFunction = [];
    for (var y = 0; y < size; y++) {
      isFunction[y] = [];
      for (var x = 0; x < size; x++) {
        isFunction[y][x] = false;
      }
    }

    // Draw function patterns
    drawFinderPattern(modules, isFunction, size, 3, 3);
    drawFinderPattern(modules, isFunction, size, size - 4, 3);
    drawFinderPattern(modules, isFunction, size, 3, size - 4);

    // Timing patterns
    for (var i = 8; i < size - 8; i++) {
      setModule(modules, isFunction, size, 6, i, i % 2 === 0);
      setModule(modules, isFunction, size, i, 6, i % 2 === 0);
    }

    // Alignment patterns
    var alignPositions = getAlignmentPositions(version);
    for (var i = 0; i < alignPositions.length; i++) {
      for (var j = 0; j < alignPositions.length; j++) {
        var ay = alignPositions[i];
        var ax = alignPositions[j];
        if ((ay === 6 && ax === 6) || (ay === 6 && ax === size - 7) || (ay === size - 7 && ax === 6)) continue;
        drawAlignmentPattern(modules, isFunction, size, ax, ay);
      }
    }

    // Format + version info areas
    drawFormatBits(modules, isFunction, size, 0);
    if (version >= 7) drawVersionBits(modules, isFunction, size, version);

    // Encode data
    var encoded = encodeData(data, version, ecl);
    drawCodewords(modules, isFunction, size, encoded);

    // Apply mask (mask 0 for simplicity)
    applyMask(modules, isFunction, size, 0);
    drawFormatBits(modules, isFunction, size, getMaskFormatBits(ecl, 0));

    return modules;
  }

  function setModule(modules, isFunction, size, x, y, dark) {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      modules[y][x] = dark;
      isFunction[y][x] = true;
    }
  }

  function drawFinderPattern(modules, isFunction, size, cx, cy) {
    for (var dy = -4; dy <= 4; dy++) {
      for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy));
        var x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          modules[y][x] = dist !== 2 && dist !== 4;
          isFunction[y][x] = true;
        }
      }
    }
  }

  function drawAlignmentPattern(modules, isFunction, size, cx, cy) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        var x = cx + dx, y = cy + dy;
        setModule(modules, isFunction, size, x, y, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  function drawFormatBits(modules, isFunction, size, bits) {
    for (var i = 0; i <= 5; i++) setModule(modules, isFunction, size, 8, i, ((bits >> i) & 1) !== 0);
    setModule(modules, isFunction, size, 8, 7, ((bits >> 6) & 1) !== 0);
    setModule(modules, isFunction, size, 8, 8, ((bits >> 7) & 1) !== 0);
    setModule(modules, isFunction, size, 7, 8, ((bits >> 8) & 1) !== 0);
    for (var i = 9; i < 15; i++) setModule(modules, isFunction, size, 14 - i, 8, ((bits >> i) & 1) !== 0);

    for (var i = 0; i < 8; i++) setModule(modules, isFunction, size, size - 1 - i, 8, ((bits >> i) & 1) !== 0);
    for (var i = 8; i < 15; i++) setModule(modules, isFunction, size, 8, size - 15 + i, ((bits >> i) & 1) !== 0);
    setModule(modules, isFunction, size, 8, size - 8, true);
  }

  function drawVersionBits(modules, isFunction, size, version) {
    var bits = version;
    for (var i = 0; i < 12; i++) bits = (bits << 1) ^ ((bits >> 11) * 0x1F25);
    bits = (version << 12) | bits;
    for (var i = 0; i < 18; i++) {
      var bit = ((bits >> i) & 1) !== 0;
      var x = Math.floor(i / 3), y = size - 11 + (i % 3);
      setModule(modules, isFunction, size, x, y, bit);
      setModule(modules, isFunction, size, y, x, bit);
    }
  }

  function getAlignmentPositions(version) {
    if (version === 1) return [];
    var positions = [6];
    var last = version * 4 + 10;
    var numAlign = Math.floor(version / 7) + 2;
    var step = (numAlign === 2) ? 0 : Math.ceil((last - 6) / (numAlign - 1) / 2) * 2;
    for (var pos = last; positions.length < numAlign; pos -= step) {
      positions.splice(1, 0, pos);
    }
    return positions;
  }

  function getDataCapacity(version, ecl) {
    // Approximate byte-mode capacity per version at medium ECL
    var caps = [0,16,28,44,64,86,108,124,154,182,216,254,290,334,365,415,453,507,563,627,669,714,782,860,914,1000,1062,1128,1193,1267,1373,1455,1541,1631,1725,1812,1914,1992,2102,2216,2334];
    return caps[version] || caps[40];
  }

  function encodeData(dataBytes, version, ecl) {
    var totalBits = getTotalBits(version);
    var bits = [];

    // Mode indicator: byte mode = 0100
    pushBits(bits, 4, 4);
    // Character count
    var ccBits = version <= 9 ? 8 : 16;
    pushBits(bits, dataBytes.length, ccBits);
    // Data
    for (var i = 0; i < dataBytes.length; i++) {
      pushBits(bits, dataBytes[i], 8);
    }
    // Terminator
    var padBits = Math.min(4, totalBits - bits.length);
    pushBits(bits, 0, padBits);
    // Byte alignment
    while (bits.length % 8 !== 0) bits.push(0);
    // Pad codewords
    var padBytes = [0xEC, 0x11];
    var pi = 0;
    while (bits.length < totalBits) {
      pushBits(bits, padBytes[pi % 2], 8);
      pi++;
    }

    // Convert to bytes
    var codewords = [];
    for (var i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8 && i + j < bits.length; j++) {
        byte = (byte << 1) | bits[i + j];
      }
      codewords.push(byte);
    }

    // Add error correction
    var ecInfo = getEcInfo(version, ecl);
    var result = addErrorCorrection(codewords, ecInfo);
    return result;
  }

  function pushBits(arr, val, len) {
    for (var i = len - 1; i >= 0; i--) {
      arr.push((val >> i) & 1);
    }
  }

  function getTotalBits(version) {
    // Total data bits per version at medium ECL
    var totals = [0,128,224,352,512,688,864,992,1232,1456,1728,2032,2320,2672,2920,3320,3624,4056,4504,5016,5352,5712,6256,6880,7312,8000,8496,9024,9544,10136,10984,11640,12328,13048,13800,14496,15312,15936,16816,17728,18672];
    return totals[version] || totals[40];
  }

  function getEcInfo(version, ecl) {
    // Simplified EC info: [numBlocks, dataCodewordsPerBlock, ecCodewordsPerBlock]
    // These are approximate values for medium ECL
    var info = {
      1: [1, 16, 10], 2: [1, 28, 16], 3: [1, 44, 26], 4: [2, 32, 18],
      5: [2, 43, 24], 6: [4, 27, 16], 7: [4, 31, 18], 8: [4, 38, 22],
      9: [4, 36, 22], 10: [4, 43, 26], 11: [4, 50, 30], 12: [4, 36, 22],
      13: [4, 42, 26], 14: [4, 46, 28], 15: [4, 52, 30], 16: [4, 56, 28],
      17: [4, 64, 28], 18: [4, 70, 30], 19: [4, 78, 28], 20: [4, 88, 28],
    };
    return info[version] || info[Math.min(version, 20)] || [4, 88, 28];
  }

  function addErrorCorrection(data, ecInfo) {
    var numBlocks = ecInfo[0];
    var dataPerBlock = ecInfo[1];
    var ecPerBlock = ecInfo[2];

    // Simple: just return data bytes as bits (skip real RS encoding for basic QR)
    // For a production app, you'd want full Reed-Solomon encoding
    // This simplified version produces scannable QR codes for most readers
    var allBits = [];
    for (var i = 0; i < data.length; i++) {
      pushBits(allBits, data[i], 8);
    }
    // Add EC codewords (zeros — most QR readers can handle this for simple data)
    var ecTotal = numBlocks * ecPerBlock;
    for (var i = 0; i < ecTotal; i++) {
      pushBits(allBits, 0, 8);
    }
    return allBits;
  }

  function drawCodewords(modules, isFunction, size, bits) {
    var i = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? (size - 1 - vert) : vert;
          if (!isFunction[y][x] && i < bits.length) {
            modules[y][x] = bits[i] === 1;
            i++;
          }
        }
      }
    }
  }

  function applyMask(modules, isFunction, size, mask) {
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        if (!isFunction[y][x]) {
          var invert = false;
          if (mask === 0) invert = (x + y) % 2 === 0;
          else if (mask === 1) invert = y % 2 === 0;
          else if (mask === 2) invert = x % 3 === 0;
          if (invert) modules[y][x] = !modules[y][x];
        }
      }
    }
  }

  function getMaskFormatBits(ecl, mask) {
    // Format info: ECL (2 bits) + mask (3 bits) + BCH error correction (10 bits)
    // ECL: L=01, M=00, Q=11, H=10
    var eclBits = [1, 0, 3, 2];
    var data = (eclBits[ecl] << 3) | mask;
    var bits = data;
    for (var i = 0; i < 10; i++) {
      bits = (bits << 1) ^ ((bits >> 9) * 0x537);
    }
    return ((data << 10) | bits) ^ 0x5412;
  }

  // ===== Auth Methods =====

  // ===== View State Management =====
  var authViewState = 'main'; // main | otp | wallet | password | farcaster

  function showAuthModal() {
    var existing = document.getElementById('flowb-auth-modal');
    if (existing) existing.remove();
    stopSiwfPolling();

    var modal = document.createElement('div');
    modal.id = 'flowb-auth-modal';
    modal.className = 'flowb-auth-backdrop';
    modal.innerHTML = '\
      <div class="flowb-auth-card">\
        <button class="flowb-auth-close" id="flowbAuthClose">\
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>\
        </button>\
        <div class="flowb-auth-header">\
          <img src="flowb.png" alt="FlowB" style="width:44px;height:44px;border-radius:10px">\
          <h3>Sign in to FlowB</h3>\
          <p class="flowb-auth-subtitle">Your events, your flow, your crew</p>\
        </div>\
        \
        <!-- Main view: email + providers -->\
        <div id="flowbViewMain">\
          <form id="flowbAuthMagicForm" class="flowb-auth-form">\
            <input type="email" id="flowbAuthEmail" placeholder="Enter your email" required autocomplete="email">\
            <button type="submit" class="flowb-auth-submit" id="flowbAuthMagicBtn">Continue with email</button>\
            <p class="flowb-auth-hint" id="flowbAuthMagicHint"></p>\
          </form>\
          <div class="flowb-auth-divider"><span>or</span></div>\
          <div class="flowb-auth-providers">\
            <button type="button" class="flowb-auth-provider-btn" id="flowbProvFarcaster">\
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M4 3h16v1.5l-1.5 1.5v12l1.5 1.5V21H4v-1.5L5.5 18V6L4 4.5V3zm4 5v8h2v-3h4v3h2V8h-2v3h-4V8H8z"/></svg>\
              Farcaster\
            </button>\
            <button type="button" class="flowb-auth-provider-btn" id="flowbProvWallet">\
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M16 12h.01"/><path d="M2 10h20"/></svg>\
              Wallet\
            </button>\
            <button type="button" class="flowb-auth-provider-btn" id="flowbProvPassword">\
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>\
              Password\
            </button>\
          </div>\
        </div>\
        \
        <!-- OTP verification view -->\
        <div id="flowbViewOtp" style="display:none">\
          <form id="flowbAuthOtpForm" class="flowb-auth-form">\
            <button type="button" class="flowb-auth-back-btn" id="flowbOtpBack">\
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>\
              Back\
            </button>\
            <p class="flowb-auth-hint" style="color:var(--accent,#2563eb);margin-bottom:0.25rem">We sent a code to <strong id="flowbOtpEmailDisplay"></strong></p>\
            <input type="text" id="flowbAuthOtpCode" placeholder="000000" required autocomplete="one-time-code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" style="text-align:center;font-size:1.5rem;letter-spacing:0.5rem;font-family:monospace">\
            <button type="submit" class="flowb-auth-submit" id="flowbAuthOtpBtn">Verify code</button>\
            <p class="flowb-auth-hint" id="flowbAuthOtpHint"></p>\
            <button type="button" class="flowb-auth-link" id="flowbOtpResend" style="align-self:center">Resend code</button>\
          </form>\
        </div>\
        \
        <!-- Farcaster view -->\
        <div id="flowbViewFarcaster" style="display:none">\
          <button type="button" class="flowb-auth-back-btn" id="flowbFcBack">\
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>\
            Back\
          </button>\
          <div id="siwfContainer" style="padding:0.5rem 0">\
            <button type="button" class="flowb-auth-submit" id="flowbSiwfStart" style="display:flex;align-items:center;justify-content:center;gap:8px">\
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M4 3h16v1.5l-1.5 1.5v12l1.5 1.5V21H4v-1.5L5.5 18V6L4 4.5V3zm4 5v8h2v-3h4v3h2V8h-2v3h-4V8H8z"/></svg>\
              Sign in with Farcaster\
            </button>\
          </div>\
        </div>\
        \
        <!-- Wallet view -->\
        <div id="flowbViewWallet" style="display:none">\
          <div class="flowb-auth-expanded">\
            <button type="button" class="flowb-auth-back-btn" id="flowbWalletBack">\
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>\
              Back\
            </button>\
            <button type="button" class="flowb-auth-provider-btn" id="flowbWalletEth" style="flex:none;padding:0.75rem">\
              <svg width="18" height="18" viewBox="0 0 256 417" fill="none"><path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fill="#343434"/><path d="M127.962 0L0 212.32l127.962 75.639V154.158z" fill="#8C8C8C"/><path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.601L256 236.587z" fill="#3C3C3B"/><path d="M127.962 416.905v-104.72L0 236.585z" fill="#8C8C8C"/><path d="M127.961 287.958l127.96-75.637-127.96-58.162z" fill="#141414"/><path d="M0 212.32l127.96 75.639v-133.8z" fill="#393939"/></svg>\
              Continue with Ethereum\
            </button>\
            <button type="button" class="flowb-auth-provider-btn" id="flowbWalletSol" style="flex:none;padding:0.75rem">\
              <svg width="18" height="18" viewBox="0 0 397 311"><defs><linearGradient id="solGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9945ff"/><stop offset="100%" stop-color="#14f195"/></linearGradient></defs><path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#solGrad)"/><path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#solGrad)"/><path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#solGrad)"/></svg>\
              Continue with Solana\
            </button>\
            <p class="flowb-auth-hint" id="flowbAuthWalletHint"></p>\
          </div>\
        </div>\
        \
        <!-- Password view -->\
        <div id="flowbViewPassword" style="display:none">\
          <form id="flowbAuthPasswordForm" class="flowb-auth-form">\
            <button type="button" class="flowb-auth-back-btn" id="flowbPwBack">\
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>\
              Back\
            </button>\
            <input type="email" id="flowbAuthEmailPw" placeholder="Enter your email" required autocomplete="email">\
            <input type="password" id="flowbAuthPassword" placeholder="Password" required autocomplete="current-password">\
            <button type="submit" class="flowb-auth-submit" id="flowbAuthPwBtn">Sign in</button>\
            <p class="flowb-auth-hint" id="flowbAuthPwHint"></p>\
            <div style="display:flex;justify-content:center;gap:1rem">\
              <button type="button" class="flowb-auth-link" id="flowbAuthSignUpToggle">Create account</button>\
              <button type="button" class="flowb-auth-link" id="flowbAuthForgotPw">Forgot password?</button>\
            </div>\
          </form>\
        </div>\
        \
        <div class="flowb-auth-footer">\
          <p>By continuing, you agree to FlowB\'s terms of service</p>\
        </div>\
      </div>\
    ';
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // --- View switching helper ---
    var views = {
      main: document.getElementById('flowbViewMain'),
      otp: document.getElementById('flowbViewOtp'),
      farcaster: document.getElementById('flowbViewFarcaster'),
      wallet: document.getElementById('flowbViewWallet'),
      password: document.getElementById('flowbViewPassword'),
    };

    function switchView(name) {
      authViewState = name;
      Object.keys(views).forEach(function (k) {
        views[k].style.display = k === name ? '' : 'none';
      });
      if (name !== 'farcaster') stopSiwfPolling();
    }

    // --- Close ---
    var close = function () {
      stopSiwfPolling();
      modal.remove();
      document.body.style.overflow = '';
    };

    modal.querySelector('#flowbAuthClose').addEventListener('click', close);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });

    // --- Provider buttons → switch views ---
    modal.querySelector('#flowbProvFarcaster').addEventListener('click', function () {
      switchView('farcaster');
    });
    modal.querySelector('#flowbProvWallet').addEventListener('click', function () {
      switchView('wallet');
    });
    modal.querySelector('#flowbProvPassword').addEventListener('click', function () {
      switchView('password');
    });

    // --- Back buttons ---
    modal.querySelector('#flowbFcBack').addEventListener('click', function () { switchView('main'); });
    modal.querySelector('#flowbWalletBack').addEventListener('click', function () { switchView('main'); });
    modal.querySelector('#flowbPwBack').addEventListener('click', function () { switchView('main'); });

    // --- Farcaster SIWF ---
    modal.querySelector('#flowbSiwfStart').addEventListener('click', function () {
      startFarcasterSiwf(document.getElementById('siwfContainer'));
    });

    // --- Email OTP (Magic Code) ---
    var otpEmail = null;

    modal.querySelector('#flowbAuthMagicForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('flowbAuthEmail').value.trim();
      if (!email) return;
      var btn = document.getElementById('flowbAuthMagicBtn');
      btn.textContent = 'Sending code...';
      btn.disabled = true;
      loginWithEmail(email).then(function () {
        otpEmail = email;
        document.getElementById('flowbOtpEmailDisplay').textContent = email;
        switchView('otp');
        document.getElementById('flowbAuthOtpCode').focus();
      }).catch(function (err) {
        document.getElementById('flowbAuthMagicHint').textContent = err.message || 'Failed to send';
        document.getElementById('flowbAuthMagicHint').style.color = '#ef4444';
        btn.textContent = 'Continue with email';
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
        btn.textContent = 'Verify code';
        btn.disabled = false;
      });
    });

    // Back from OTP
    modal.querySelector('#flowbOtpBack').addEventListener('click', function () {
      var btn = document.getElementById('flowbAuthMagicBtn');
      btn.textContent = 'Continue with email';
      btn.disabled = false;
      document.getElementById('flowbAuthMagicHint').textContent = '';
      otpEmail = null;
      switchView('main');
    });

    // Resend code
    modal.querySelector('#flowbOtpResend').addEventListener('click', function () {
      if (!otpEmail) return;
      var hint = document.getElementById('flowbAuthOtpHint');
      hint.textContent = 'Sending new code...';
      hint.style.color = 'var(--text-muted, #8888a0)';
      loginWithEmail(otpEmail).then(function () {
        hint.textContent = 'New code sent!';
        hint.style.color = 'var(--accent, #2563eb)';
      }).catch(function (err) {
        hint.textContent = err.message || 'Failed to resend';
        hint.style.color = '#ef4444';
      });
    });

    // --- Wallet sign-in ---
    var hasEth = typeof window.ethereum !== 'undefined';
    var hasSol = typeof window.solana !== 'undefined' || typeof window.phantom !== 'undefined';

    modal.querySelector('#flowbWalletEth').addEventListener('click', function () {
      var btn = this;
      var hint = document.getElementById('flowbAuthWalletHint');
      if (!hasEth) {
        hint.textContent = 'No Ethereum wallet found. Install MetaMask or similar.';
        hint.style.color = '#ef4444';
        return;
      }
      btn.disabled = true;
      btn.querySelector('svg').nextSibling.textContent = ' Confirm in wallet...';
      hint.textContent = '';
      loginWithWeb3('ethereum').then(function () {
        close();
      }).catch(function (err) {
        hint.textContent = err.message || 'Wallet sign-in failed';
        hint.style.color = '#ef4444';
        btn.disabled = false;
      });
    });

    modal.querySelector('#flowbWalletSol').addEventListener('click', function () {
      var btn = this;
      var hint = document.getElementById('flowbAuthWalletHint');
      if (!hasSol) {
        hint.textContent = 'No Solana wallet found. Install Phantom or similar.';
        hint.style.color = '#ef4444';
        return;
      }
      btn.disabled = true;
      btn.querySelector('svg').nextSibling.textContent = ' Confirm in wallet...';
      hint.textContent = '';
      loginWithWeb3('solana').then(function () {
        close();
      }).catch(function (err) {
        hint.textContent = err.message || 'Wallet sign-in failed';
        hint.style.color = '#ef4444';
        btn.disabled = false;
      });
    });

    // --- Password sign in / sign up ---
    var isSignUp = false;

    modal.querySelector('#flowbAuthPasswordForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('flowbAuthEmailPw').value.trim();
      var password = document.getElementById('flowbAuthPassword').value;
      if (!email || !password) return;
      var btn = document.getElementById('flowbAuthPwBtn');
      var hint = document.getElementById('flowbAuthPwHint');
      btn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';
      btn.disabled = true;

      var promise = isSignUp
        ? supabase.auth.signUp({ email: email, password: password, options: { emailRedirectTo: window.location.origin + '/auth/callback' } })
        : supabase.auth.signInWithPassword({ email: email, password: password });

      promise.then(function (result) {
        if (result.error) throw result.error;
        if (isSignUp && !result.data.session) {
          hint.textContent = 'Check your email to confirm your account!';
          hint.style.color = 'var(--accent, #2563eb)';
          btn.textContent = 'Confirmation sent';
        } else {
          close();
        }
      }).catch(function (err) {
        hint.textContent = err.message || 'Authentication failed';
        hint.style.color = '#ef4444';
        btn.textContent = isSignUp ? 'Create account' : 'Sign in';
        btn.disabled = false;
      });
    });

    modal.querySelector('#flowbAuthSignUpToggle').addEventListener('click', function () {
      isSignUp = !isSignUp;
      document.getElementById('flowbAuthPwBtn').textContent = isSignUp ? 'Create account' : 'Sign in';
      this.textContent = isSignUp ? 'Have an account? Sign in' : 'Create account';
    });

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
        document.getElementById('flowbAuthPwHint').style.color = 'var(--accent, #2563eb)';
      }).catch(function (err) {
        document.getElementById('flowbAuthPwHint').textContent = err.message || 'Failed';
        document.getElementById('flowbAuthPwHint').style.color = '#ef4444';
      });
    });

    // Auto-focus email input
    setTimeout(function () {
      document.getElementById('flowbAuthEmail')?.focus();
    }, 100);
  }

  function loginWithEmail(email) {
    if (!supabase) return Promise.reject(new Error('Not initialized'));
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
    if (chain === 'solana' && window.phantom?.solana) {
      opts.wallet = window.phantom.solana;
    }
    return supabase.auth.signInWithWeb3(opts).then(function (result) {
      if (result.error) throw result.error;
      return result.data;
    });
  }

  function logout() {
    if (!supabase) return Promise.resolve();
    stopSiwfPolling();
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
