// ===== FlowB Chat Widget (shared across all pages) =====
// Injects the FAB + chat panel if not already present (index.html has it inline).
// Provides standalone chat functionality on non-index pages.

(function () {
  'use strict';

  const CHAT_API = 'https://flowb.fly.dev';

  // Skip if widget already exists (index.html includes it inline, app.js handles it)
  if (document.getElementById('flowbWidget')) return;

  // ----- Inject Widget HTML -----
  const widgetHtml = `
    <div class="flowb-widget" id="flowbWidget" data-state="minimized">
      <button class="flowb-widget-fab" id="flowbWidgetFab">
        <img class="flowb-fab-avatar" src="/flowb.png" alt="FlowB">
        <span class="flowb-fab-dot"></span>
      </button>
      <div class="flowb-fab-speech" id="flowbFabSpeech">
        FlowB Here <span aria-hidden="true">\u{1F44B}</span>
        <div class="flowb-fab-speech-tail"></div>
      </div>
      <div class="flowb-widget-panel" id="flowbWidgetPanel">
        <div class="flowb-panel-header">
          <div class="flowb-panel-header-left">
            <img class="logo-icon" src="/flowb.png" alt="FlowB">
            <div class="flowb-panel-header-info">
              <span class="flowb-panel-header-title">FlowB</span>
              <span class="flowb-panel-header-sub">Your AI event guide</span>
            </div>
          </div>
          <div class="flowb-panel-header-right">
            <span class="flowb-chat-status" id="flowbStatus">
              <span class="flowb-status-dot"></span>
              <span id="flowbStatusText">connected</span>
            </span>
            <button class="flowb-panel-minimize" id="flowbPanelMinimize" title="Minimize">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="flowb-chat-body" id="flowbChatBody">
          <div class="flowb-messages" id="flowbMessages"></div>
        </div>
        <div class="flowb-quick-bar" id="flowbQuickBar">
          <button class="flowb-quick-chip flowb-quick-featured" data-action="featured" style="background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(239,68,68,0.1));border-color:rgba(245,158,11,0.3);color:#f59e0b;">Featured</button>
          <button class="flowb-quick-chip" data-msg="tonight">Tonight</button>
          <button class="flowb-quick-chip" data-msg="free events">Free</button>
          <button class="flowb-quick-chip" data-msg="categories">Categories</button>
          <button class="flowb-quick-chip" data-msg="browse defi">DeFi</button>
          <button class="flowb-quick-chip" data-msg="browse ai">AI</button>
          <button class="flowb-quick-chip" data-msg="browse social">Parties</button>
          <button class="flowb-quick-chip" data-msg="points">My Points</button>
        </div>
        <form class="flowb-input-area" id="flowbChatForm">
          <div class="flowb-input-wrap">
            <textarea id="flowbChatInput" placeholder="Ask FlowB anything..." rows="1" autocomplete="off"></textarea>
            <button type="submit" class="flowb-send-btn" id="flowbSendBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p class="flowb-input-hint">Responses may take a moment.</p>
        </form>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', widgetHtml);

  // ----- DOM refs -----
  const widget = document.getElementById('flowbWidget');
  const fab = document.getElementById('flowbWidgetFab');
  const speech = document.getElementById('flowbFabSpeech');
  const panel = document.getElementById('flowbWidgetPanel');
  const minimize = document.getElementById('flowbPanelMinimize');
  const chatBody = document.getElementById('flowbChatBody');
  const messages = document.getElementById('flowbMessages');
  const form = document.getElementById('flowbChatForm');
  const input = document.getElementById('flowbChatInput');
  const sendBtn = document.getElementById('flowbSendBtn');
  const statusText = document.getElementById('flowbStatusText');

  let chatHistory = [];
  let isStreaming = false;
  let speechInterval = null;

  // ----- Teaser / Wiggle -----
  const SPEECH_PROMPTS = [
    "FlowB Here \u{1F44B}",
    "What's happening tonight?",
    "Find events near you",
    "Ask me anything!",
    "Discover what's next",
    "Free events this week?",
  ];
  let speechIndex = 0;

  function updateSpeechText() {
    const text = SPEECH_PROMPTS[speechIndex];
    const tail = speech.querySelector('.flowb-fab-speech-tail');
    speech.textContent = text;
    if (tail) speech.appendChild(tail);
    else {
      const t = document.createElement('div');
      t.className = 'flowb-fab-speech-tail';
      speech.appendChild(t);
    }
  }

  function runTeaser() {
    fab.classList.add('wiggle');
    setTimeout(() => fab.classList.remove('wiggle'), 600);
    updateSpeechText();
    setTimeout(() => speech.classList.add('visible'), 800);
    setTimeout(() => speech.classList.remove('visible'), 5600);

    speechInterval = setInterval(() => {
      if (widget.dataset.state === 'expanded') return;
      speechIndex = (speechIndex + 1) % SPEECH_PROMPTS.length;
      speech.classList.remove('visible');
      setTimeout(() => {
        updateSpeechText();
        speech.classList.add('visible');
        fab.classList.add('wiggle');
        setTimeout(() => fab.classList.remove('wiggle'), 600);
      }, 500);
      setTimeout(() => speech.classList.remove('visible'), 6500);
    }, 25000);
  }

  // Run teaser on first visit (only if not seen before)
  if (!localStorage.getItem('flowb-intro-seen')) {
    setTimeout(() => {
      if (widget.dataset.state === 'minimized') runTeaser();
    }, 3000);
  }

  // ----- Expand / Minimize -----
  function expand() {
    speech.classList.remove('visible');
    clearInterval(speechInterval);
    widget.dataset.state = 'expanded';
    if (window.innerWidth <= 640) {
      document.body.style.overflow = 'hidden';
    } else {
      input.focus();
    }
    if (typeof awardFirstAction === 'function') {
      awardFirstAction('first_chat_open', 3, 'Chat opened!');
    }
    // Show greeting if empty
    if (messages.children.length === 0) {
      addMsg("Hey! I'm **FlowB** -- your AI event guide. Ask me about events, crews, or what's happening tonight!", 'bot');
    }
  }

  function collapse() {
    widget.dataset.state = 'minimized';
    document.body.style.overflow = '';
    input.blur();
  }

  fab.addEventListener('click', expand);
  minimize.addEventListener('click', collapse);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && widget.dataset.state === 'expanded') collapse();
  });
  widget.addEventListener('click', (e) => {
    if (widget.dataset.state === 'expanded' && e.target === widget) collapse();
  });

  // Virtual keyboard handling on mobile
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (widget.dataset.state === 'expanded' && window.innerWidth <= 640) {
        const vvh = window.visualViewport.height;
        const keyboardUp = window.innerHeight - vvh > 100;
        panel.style.bottom = keyboardUp ? (window.innerHeight - vvh) + 'px' : '';
        panel.style.borderRadius = keyboardUp ? '20px' : '';
      }
    });
  }

  // ----- Markdown rendering (lightweight) -----
  function renderMd(text) {
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n/g, '<br>');
    return html;
  }

  // ----- Chat Messages -----
  function addMsg(text, role) {
    const div = document.createElement('div');
    div.className = `flowb-msg ${role}`;
    const avatarText = role === 'bot' ? 'F' : 'U';
    const html = role === 'bot' ? renderMd(text) : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    div.innerHTML = `
      <div class="flowb-msg-avatar">${avatarText}</div>
      <div class="flowb-msg-content">${html}</div>`;
    messages.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function addTyping() {
    const div = document.createElement('div');
    div.className = 'flowb-msg bot';
    div.id = 'flowbTypingShared';
    div.innerHTML = `
      <div class="flowb-msg-avatar">F</div>
      <div class="flowb-msg-content">
        <div class="flowb-typing"><span></span><span></span><span></span></div>
      </div>`;
    messages.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function removeTyping() {
    document.getElementById('flowbTypingShared')?.remove();
  }

  // ----- Send Message -----
  async function sendMessage(msg) {
    if (isStreaming || !msg.trim()) return;
    isStreaming = true;
    sendBtn.disabled = true;

    addMsg(msg, 'user');
    addTyping();
    if (typeof awardPoints === 'function') awardPoints(1, 'Chat message');

    chatHistory.push({ role: 'user', content: msg });

    try {
      const headers = { 'Content-Type': 'application/json' };
      const jwt = localStorage.getItem('flowb-jwt');
      if (jwt) headers['Authorization'] = 'Bearer ' + jwt;

      const res = await fetch(CHAT_API + '/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: chatHistory.slice(-20),
          stream: false,
          user: localStorage.getItem('flowb-anon-id') || 'web-anon',
        }),
      });

      removeTyping();

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || 'No response.';
        chatHistory.push({ role: 'assistant', content: reply });
        addMsg(reply, 'bot');
        if (statusText) statusText.textContent = 'connected';
      } else {
        addMsg('Something went wrong. Try again!', 'bot');
      }
    } catch (err) {
      removeTyping();
      addMsg('Connection error. Try again!', 'bot');
      if (statusText) statusText.textContent = 'offline';
    }

    isStreaming = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // ----- Form / Input -----
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    input.style.height = 'auto';
    sendMessage(msg);
  });

  // Quick action chips
  document.querySelectorAll('#flowbWidget .flowb-quick-chip[data-msg]').forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.msg));
  });
  document.querySelectorAll('#flowbWidget .flowb-quick-chip[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.action === 'featured') {
        sendMessage("What's the featured event right now?");
      } else {
        sendMessage(btn.dataset.action.replace(/-/g, ' '));
      }
    });
  });

  // Mark intro as seen once chat is opened
  fab.addEventListener('click', () => {
    localStorage.setItem('flowb-intro-seen', '1');
  });
})();
