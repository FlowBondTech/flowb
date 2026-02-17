const API = 'https://egator-api.fly.dev';
const FLOWB_API = 'https://flowb.fly.dev';

// OpenClaw Gateway config (set via Netlify env or override here)
const OPENCLAW_GATEWAY = window.FLOWB_GATEWAY_URL || 'https://gateway.openclaw.ai';
const OPENCLAW_TOKEN = window.FLOWB_GATEWAY_TOKEN || '';
const FLOWB_AGENT_ID = 'flowb';

// State
let allEvents = [];
let categories = [];
let activeCategory = 'all';
let activeFilter = null;
let activePlatform = 'all';
let searchQuery = '';
let displayCount = 12;
let chatHistory = [];
let isStreaming = false;

// DOM - Events
const grid = document.getElementById('eventsGrid');
const catRow = document.getElementById('categoriesRow');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const resultsMeta = document.getElementById('resultsMeta');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const emptyState = document.getElementById('emptyState');

// DOM - Chat
const chatBtn = document.getElementById('chatWithFlowB');
const chatModal = document.getElementById('flowbChatModal');
const chatBackdrop = document.getElementById('flowbChatBackdrop');
const chatClose = document.getElementById('flowbChatClose');
const chatBody = document.getElementById('flowbChatBody');
const chatWelcome = document.getElementById('flowbWelcome');
const chatMessages = document.getElementById('flowbMessages');
const chatForm = document.getElementById('flowbChatForm');
const chatInput = document.getElementById('flowbChatInput');
const chatSendBtn = document.getElementById('flowbSendBtn');
const chatStatus = document.getElementById('flowbStatus');
const chatStatusText = document.getElementById('flowbStatusText');

// DOM - My Flow
const myFlowSection = document.getElementById('myFlowSection');
const myFlowSchedule = document.getElementById('myFlowSchedule');
const myFlowCrews = document.getElementById('myFlowCrews');
const myFlowLeaderboard = document.getElementById('myFlowLeaderboard');

// DOM - Hero Stats & Crews
const statCrews = document.getElementById('statCrews');
const statPoints = document.getElementById('statPoints');
const statCheckins = document.getElementById('statCheckins');
const heroCrews = document.getElementById('heroCrews');
const heroCrewsList = document.getElementById('heroCrewsList');

// ===== API =====

async function fetchCategories() {
  try {
    const res = await fetch(`${API}/api/v1/categories`);
    const data = await res.json();
    categories = data.categories || [];
    renderCategories();
  } catch (err) {
    console.error('Failed to fetch categories:', err);
  }
}

async function fetchEvents(params = {}) {
  try {
    const res = await fetch(`${API}/api/v1/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50, ...params }),
    });
    const data = await res.json();
    return data.events || [];
  } catch (err) {
    console.error('Failed to fetch events:', err);
    return [];
  }
}

async function fetchTonight() {
  const res = await fetch(`${API}/api/v1/discover/tonight`);
  const data = await res.json();
  return data.events || [];
}

// ===== Public API: Stats & Leaderboard =====

async function fetchLiveStats() {
  try {
    const res = await fetch(`${FLOWB_API}/api/v1/stats`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchGlobalLeaderboard() {
  try {
    const res = await fetch(`${FLOWB_API}/api/v1/flow/leaderboard`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ===== Authenticated API helpers =====
// getAuthToken() is defined in auth.js and returns the FlowB JWT

async function fetchAuthed(path, opts = {}) {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${FLOWB_API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ===== Render: Hero Stats =====

async function loadHeroStats() {
  const stats = await fetchLiveStats();
  if (stats) {
    if (statCrews) statCrews.textContent = stats.crewsActive || 0;
    if (statPoints) statPoints.textContent = formatNumber(stats.totalPoints || 0);
    if (statCheckins) statCheckins.textContent = stats.checkinsToday || 0;
  }
}

function formatNumber(n) {
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// ===== Render: Hero Top Crews =====

async function loadHeroCrews() {
  const data = await fetchGlobalLeaderboard();
  if (!data || !data.crews || !data.crews.length) return;

  const top3 = data.crews.slice(0, 3);
  if (!heroCrewsList || !heroCrews) return;

  heroCrewsList.innerHTML = top3.map((crew, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze';
    return `
      <div class="hero-crew-item">
        <span class="hero-crew-rank ${rankClass}">${i + 1}</span>
        <span class="hero-crew-emoji">${crew.emoji || ''}</span>
        <span class="hero-crew-name">${escapeHtml(crew.name)}</span>
        <span class="hero-crew-pts">${crew.totalPoints} pts</span>
        ${crew.memberCount ? `<span class="hero-crew-members">${crew.memberCount} members</span>` : ''}
      </div>
    `;
  }).join('');

  heroCrews.classList.remove('hidden');
}

// ===== Render: My Flow Section =====

async function loadMyFlow() {
  if (!Auth.isAuthenticated) {
    if (myFlowSection) myFlowSection.classList.add('hidden');
    return;
  }

  if (myFlowSection) myFlowSection.classList.remove('hidden');

  // Load all three cards in parallel
  loadMyFlowSchedule();
  loadMyFlowCrews();
  loadMyFlowLeaderboard();
}

async function loadMyFlowSchedule() {
  if (!myFlowSchedule) return;

  const data = await fetchAuthed('/api/v1/me/schedule');
  if (!data || !data.schedule || !data.schedule.length) {
    myFlowSchedule.innerHTML = '<div class="myflow-empty">No upcoming RSVPs yet. Browse events and hit RSVP!</div>';
    return;
  }

  myFlowSchedule.innerHTML = data.schedule.slice(0, 5).map(item => {
    const date = new Date(item.starts_at);
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = date.getDate();
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const venue = item.venue_name || '';

    return `
      <div class="myflow-schedule-item">
        <div class="myflow-schedule-date">
          <span>${dayStr}</span>
          <span class="day">${dayNum}</span>
        </div>
        <div class="myflow-schedule-info">
          <div class="myflow-schedule-title">${escapeHtml(item.event_title)}</div>
          <div class="myflow-schedule-meta">${timeStr}${venue ? ' &middot; ' + escapeHtml(venue) : ''}</div>
        </div>
        <span class="myflow-rsvp-badge">${item.rsvp_status === 'maybe' ? 'Maybe' : 'Going'}</span>
      </div>
    `;
  }).join('');
}

async function loadMyFlowCrews() {
  if (!myFlowCrews) return;

  const data = await fetchAuthed('/api/v1/flow/crews');
  if (!data || !data.crews || !data.crews.length) {
    myFlowCrews.innerHTML = '<div class="myflow-empty">Not in any crews yet. Join or create one!</div>';
    return;
  }

  myFlowCrews.innerHTML = data.crews.slice(0, 5).map(crew => `
    <div class="myflow-crew-item">
      <span class="myflow-crew-emoji">${crew.emoji || ''}</span>
      <div class="myflow-crew-info">
        <div class="myflow-crew-name">${escapeHtml(crew.name)}</div>
        <div class="myflow-crew-role">${crew.role || 'member'}</div>
      </div>
    </div>
  `).join('');
}

async function loadMyFlowLeaderboard() {
  if (!myFlowLeaderboard) return;

  const data = await fetchGlobalLeaderboard();
  if (!data || !data.crews || !data.crews.length) {
    myFlowLeaderboard.innerHTML = '<div class="myflow-empty">Leaderboard data coming soon!</div>';
    return;
  }

  myFlowLeaderboard.innerHTML = data.crews.slice(0, 10).map((crew, i) => {
    const rankClass = i < 3 ? `rank-${i + 1}` : '';
    return `
      <div class="myflow-lb-item">
        <span class="myflow-lb-rank ${rankClass}">${i + 1}</span>
        <span class="myflow-lb-emoji">${crew.emoji || ''}</span>
        <span class="myflow-lb-name">${escapeHtml(crew.name)}</span>
        <span class="myflow-lb-pts">${crew.totalPoints} pts</span>
        ${crew.memberCount ? `<span class="myflow-lb-members">${crew.memberCount} mbrs</span>` : ''}
      </div>
    `;
  }).join('');
}

// ===== Auth State Change Handler =====

function onAuthStateChange() {
  loadMyFlow();
  loadDashboard();
}

// Listen for auth ready events (fires after JWT is obtained)
window.addEventListener('flowb-auth-ready', () => {
  setTimeout(onAuthStateChange, 200);
});

// ===== User Dashboard =====

async function loadDashboard() {
  const dashSection = document.getElementById('dashboardSection');
  const heroDashBtn = document.getElementById('heroDashBtn');
  if (!dashSection) return;

  if (!Auth.isAuthenticated || !Auth.jwt) {
    dashSection.classList.add('hidden');
    if (heroDashBtn) heroDashBtn.classList.add('hidden');
    return;
  }

  // Show CTA button in hero instead of auto-showing dashboard
  if (heroDashBtn) {
    heroDashBtn.classList.remove('hidden');
    heroDashBtn.addEventListener('click', function(e) {
      e.preventDefault();
      dashSection.classList.remove('hidden');
      dashSection.scrollIntoView({ behavior: 'smooth' });
    }, { once: true });
  }

  // Pre-load dashboard data so it's ready when user clicks
  Promise.all([
    loadDashProfile(),
    loadDashSchedule(),
    loadDashCrews(),
    loadDashPoints(),
    loadDashFriends(),
  ]);
}

async function loadDashProfile() {
  const el = document.getElementById('dashProfile');
  if (!el || !Auth.user) return;

  const displayName = Auth.user.username || Auth.user.email || 'User';
  const initial = displayName[0].toUpperCase();
  const pointsData = await fetchAuthed('/api/v1/me/points');
  const totalPts = pointsData?.total_points ?? Points.total;
  const streak = pointsData?.current_streak ?? Points.streak;
  const milestone = getMilestoneForPoints(totalPts);

  el.innerHTML = `
    <div class="dash-profile-card">
      <div class="dash-avatar">${initial}</div>
      <div class="dash-profile-info">
        <h3 class="dash-username">${escapeHtml(displayName)}</h3>
        <p class="dash-user-meta">${Auth.user.email ? escapeHtml(Auth.user.email) : Auth.user.wallet ? escapeHtml(Auth.user.wallet.slice(0,6) + '...' + Auth.user.wallet.slice(-4)) : 'Connected via Privy'}</p>
      </div>
      <div class="dash-stats-row">
        <div class="dash-stat">
          <span class="dash-stat-val">${totalPts}</span>
          <span class="dash-stat-label">Points</span>
        </div>
        <div class="dash-stat">
          <span class="dash-stat-val">${streak}${streak > 2 ? ' \uD83D\uDD25' : ''}</span>
          <span class="dash-stat-label">Day Streak</span>
        </div>
        <div class="dash-stat">
          <span class="dash-stat-val">${milestone ? milestone.title : 'Newcomer'}</span>
          <span class="dash-stat-label">Rank</span>
        </div>
      </div>
    </div>
  `;
}

async function loadDashSchedule() {
  const el = document.getElementById('dashSchedule');
  if (!el) return;

  const data = await fetchAuthed('/api/v1/me/schedule');
  if (!data || !data.schedule || !data.schedule.length) {
    el.innerHTML = `
      <div class="dash-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>No upcoming events yet</p>
        <span>Browse events below and hit "Add to My Flow"</span>
      </div>`;
    return;
  }

  el.innerHTML = data.schedule.map(item => {
    const date = new Date(item.starts_at);
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = date.getDate();
    const monStr = date.toLocaleDateString('en-US', { month: 'short' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const venue = item.venue_name || '';
    const statusClass = item.rsvp_status === 'going' ? 'going' : 'maybe';

    return `
      <div class="dash-event-item">
        <div class="dash-event-date">
          <span class="dash-event-day">${dayStr}</span>
          <span class="dash-event-num">${dayNum}</span>
          <span class="dash-event-mon">${monStr}</span>
        </div>
        <div class="dash-event-info">
          <div class="dash-event-title">${escapeHtml(item.event_title)}</div>
          <div class="dash-event-meta">${timeStr}${venue ? ' &middot; ' + escapeHtml(venue) : ''}</div>
        </div>
        <span class="dash-event-status ${statusClass}">${item.rsvp_status === 'going' ? 'Going' : 'Maybe'}</span>
      </div>
    `;
  }).join('');
}

async function loadDashCrews() {
  const el = document.getElementById('dashCrews');
  if (!el) return;

  const data = await fetchAuthed('/api/v1/flow/crews');
  if (!data || !data.crews || !data.crews.length) {
    el.innerHTML = `
      <div class="dash-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        <p>No crews yet</p>
        <span>Join or create a crew on Telegram or Farcaster</span>
      </div>`;
    return;
  }

  el.innerHTML = data.crews.map(crew => `
    <div class="dash-crew-item">
      <span class="dash-crew-emoji">${crew.emoji || ''}</span>
      <div class="dash-crew-info">
        <div class="dash-crew-name">${escapeHtml(crew.name)}</div>
        <div class="dash-crew-role">${crew.role || 'member'}</div>
      </div>
    </div>
  `).join('');
}

async function loadDashPoints() {
  const el = document.getElementById('dashPointsHistory');
  if (!el) return;

  const pointsData = await fetchAuthed('/api/v1/me/points');
  const totalPts = pointsData?.total_points ?? Points.total;
  const next = getNextMilestone(totalPts);
  const progress = getMilestoneProgress(totalPts);

  let html = '';
  if (next) {
    html += `
      <div class="dash-milestone-progress">
        <div class="dash-milestone-header">
          <span>Progress to <strong>${next.title}</strong></span>
          <span>${totalPts} / ${next.points}</span>
        </div>
        <div class="dash-progress-bar">
          <div class="dash-progress-fill" style="width:${progress * 100}%"></div>
        </div>
        <p class="dash-milestone-hint">${next.points - totalPts} points to go</p>
      </div>
    `;
  } else {
    html += `<div class="dash-milestone-progress"><p class="dash-milestone-maxed">You've reached the highest rank!</p></div>`;
  }

  // Show milestones achieved
  const achieved = MILESTONES.filter(m => totalPts >= m.points);
  if (achieved.length) {
    html += '<div class="dash-achieved">';
    for (const m of achieved) {
      html += `<span class="dash-achieved-badge">Lv${m.level} ${m.title}</span>`;
    }
    html += '</div>';
  }

  el.innerHTML = html;
}

async function loadDashFriends() {
  const el = document.getElementById('dashFriends');
  if (!el) return;

  const data = await fetchAuthed('/api/v1/flow/friends');
  if (!data || !data.friends || !data.friends.length) {
    el.innerHTML = `
      <div class="dash-empty dash-empty-sm">
        <p>No connections yet</p>
        <span>Share your invite link to connect with friends</span>
      </div>`;
    return;
  }

  el.innerHTML = data.friends.slice(0, 8).map(f => `
    <div class="dash-friend-item">
      <div class="dash-friend-avatar">${(f.username || '?')[0].toUpperCase()}</div>
      <span class="dash-friend-name">${escapeHtml(f.username || 'User')}</span>
    </div>
  `).join('');
}

// ===== Render =====

function renderCategories() {
  const allBtn = catRow.querySelector('[data-cat="all"]');
  catRow.innerHTML = '';
  catRow.appendChild(allBtn);

  for (const cat of categories) {
    const btn = document.createElement('button');
    btn.className = 'cat-chip';
    btn.dataset.cat = cat.id;
    btn.innerHTML = `${cat.emoji} ${cat.label} <span class="cat-count">${cat.count}</span>`;
    btn.addEventListener('click', () => selectCategory(cat.id));
    catRow.appendChild(btn);
  }
}

function renderEvents(events) {
  // Apply platform filter client-side
  let filtered = events;
  if (activePlatform !== 'all') {
    filtered = events.filter(e => e.source === activePlatform);
  }

  const visible = filtered.slice(0, displayCount);
  emptyState.classList.toggle('hidden', filtered.length > 0);

  if (filtered.length === 0) {
    grid.innerHTML = '';
    loadMoreWrap.style.display = 'none';
    return;
  }

  grid.innerHTML = visible.map(e => createEventCard(e)).join('');
  loadMoreWrap.style.display = filtered.length > displayCount ? '' : 'none';
  const platformSuffix = activePlatform !== 'all' ? ` from ${getSourceMeta(activePlatform).label}` : '';
  resultsMeta.textContent = `${filtered.length} events${searchQuery ? ` matching "${searchQuery}"` : ''}${activeCategory !== 'all' ? ` in ${getCatLabel(activeCategory)}` : ''}${platformSuffix}`;
}

function getCatLabel(catId) {
  const cat = categories.find(c => c.id === catId);
  return cat ? cat.label : catId;
}

// Optimize image URLs - resize oversized images via proxy/params
function optimizeImageUrl(url) {
  if (!url) return url;
  // Eventbrite already resizes via their CDN params - leave as-is
  if (url.includes('evbuc.com')) return url;
  // Luma images: use wsrv.nl image proxy to resize and convert to webp
  // This turns 4 MB PNGs into ~30-80 KB webp thumbnails
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=450&h=250&fit=cover&output=webp&q=75`;
}

// Platform source colors and labels
const SOURCE_META = {
  luma: { color: '#FF5C00', label: 'Luma' },
  eventbrite: { color: '#F05537', label: 'Eventbrite' },
  ra: { color: '#D4FC79', label: 'RA' },
  brave: { color: '#FB542B', label: 'Brave' },
  'google-places': { color: '#4285F4', label: 'Google' },
  tavily: { color: '#7C3AED', label: 'Tavily' },
  egator: { color: '#3b82f6', label: 'eGator' },
};

function getSourceMeta(source) {
  return SOURCE_META[source] || { color: '#888', label: source || 'Event' };
}

function createEventCard(e) {
  const date = new Date(e.startTime);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const catEmoji = e.mainCategoryEmoji || '';
  const catLabel = e.mainCategoryLabel || '';
  const venue = e.venue?.name || (e.isOnline ? 'Online' : '');
  const org = e.organizer?.name || '';

  let priceHtml = '';
  if (e.isSoldOut) {
    priceHtml = '<span class="event-sold-out">Sold Out</span>';
  } else if (e.isFree) {
    priceHtml = '<span class="event-price free">Free</span>';
  } else if (e.price?.min) {
    priceHtml = `<span class="event-price paid">$${e.price.min}${e.price.max > e.price.min ? '–$' + e.price.max : ''}</span>`;
  }

  const attendeesHtml = e.attendeeCount
    ? `<span class="event-attendees"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>${e.attendeeCount}</span>`
    : '';

  // Source badge
  const src = getSourceMeta(e.source);
  const sourceBadge = e.source
    ? `<span class="event-card-source"><span class="source-dot" style="background:${src.color}"></span>${src.label}</span>`
    : '';

  const thumbUrl = optimizeImageUrl(e.imageUrl);
  const imgInner = thumbUrl
    ? `<img class="event-card-img" src="${thumbUrl}" alt="" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=\\'event-card-img placeholder\\'>${catEmoji}</div>'">`
    : `<div class="event-card-img placeholder">${catEmoji}</div>`;

  const safeUrl = e.url ? e.url.replace(/'/g, "\\'") : '#';
  const safeId = e.id ? e.id.replace(/'/g, "\\'") : '';
  const safeTitle = escapeHtml(e.title).replace(/'/g, "\\'");
  const safeImg = e.imageUrl ? e.imageUrl.replace(/'/g, "\\'") : '';
  const safeSource = (e.source || '').replace(/'/g, "\\'");

  // Card action icons
  const actionsHtml = `<div class="event-card-actions">
    <button class="event-card-action" title="Open event" onclick="event.stopPropagation(); window.open('${safeUrl}', '_blank')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </button>
    <button class="event-card-action" title="Add to my events" onclick="event.stopPropagation(); handleRsvp('${safeId}', this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
    </button>
    <button class="event-card-action" title="Share" onclick="event.stopPropagation(); openEventModal('${safeTitle}', '${safeUrl}', '${safeImg}', '${safeSource}', '${safeId}', '${dateStr} at ${timeStr}', true)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    </button>
  </div>`;

  return `
    <article class="event-card" onclick="openEventModal('${safeTitle}', '${safeUrl}', '${safeImg}', '${safeSource}', '${safeId}', '${dateStr} at ${timeStr}')">
      <div class="event-card-img-wrap">
        ${imgInner}
        ${sourceBadge}
      </div>
      <div class="event-card-body">
        <div class="event-card-cat">${catEmoji} ${catLabel}</div>
        <h3 class="event-card-title">${escapeHtml(e.title)}</h3>
        <div class="event-card-meta">
          <div class="event-card-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${dateStr} at ${timeStr}
          </div>
          ${venue ? `<div class="event-card-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(venue)}
          </div>` : ''}
          ${org ? `<div class="event-card-meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${escapeHtml(org)}
          </div>` : ''}
        </div>
        <div class="event-card-footer">
          ${priceHtml}
          ${attendeesHtml}
          ${actionsHtml}
        </div>
      </div>
    </article>
  `;
}

// ===== Event Action Modal =====

let currentModalEvent = {};

function openEventModal(title, url, img, source, id, meta, shareOnly) {
  currentModalEvent = { title, url, img, source, id, meta };

  const modal = document.getElementById('eventModal');
  const backdrop = document.getElementById('eventModalBackdrop');
  const titleEl = document.getElementById('eventModalTitle');
  const metaEl = document.getElementById('eventModalMeta');
  const imgEl = document.getElementById('eventModalImg');
  const openLabel = document.getElementById('eventModalOpenLabel');
  const sharePanel = document.getElementById('eventSharePanel');

  titleEl.textContent = title;
  metaEl.textContent = meta;
  imgEl.src = img || '';
  imgEl.style.display = img ? '' : 'none';

  const src = getSourceMeta(source);
  openLabel.textContent = source ? `Open on ${src.label}` : 'Open Event';
  const openLink = document.getElementById('eventModalOpen');
  openLink.href = url || '#';

  // Reset share panel
  sharePanel.classList.add('hidden');

  modal.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  awardPoints(2, 'Event viewed');
  awardFirstAction('first_event_click', 5, 'First event click!');

  // If opened from share icon, go straight to share panel
  if (shareOnly) {
    sharePanel.classList.remove('hidden');
  }
}

function closeEventModal() {
  document.getElementById('eventModal').classList.add('hidden');
  document.getElementById('eventModalBackdrop').classList.add('hidden');
  document.getElementById('eventSharePanel').classList.add('hidden');
  document.getElementById('eventReminderPanel').classList.add('hidden');
  document.body.style.overflow = '';
}

window.openEventModal = openEventModal;

// Modal event listeners
document.getElementById('eventModalBackdrop').addEventListener('click', closeEventModal);
document.getElementById('eventModalClose').addEventListener('click', closeEventModal);

document.getElementById('eventModalOpen').addEventListener('click', () => {
  closeEventModal();
});

document.getElementById('eventModalRsvp').addEventListener('click', () => {
  if (!currentModalEvent.id) return;
  if (!requireAuth('add events to your Flow')) return;
  handleRsvp(currentModalEvent.id, document.getElementById('eventModalRsvp'));
});

document.getElementById('eventModalCalendar').addEventListener('click', () => {
  if (currentModalEvent.id) {
    handleAddToCalendar(currentModalEvent.id);
  }
});

document.getElementById('eventModalReminder').addEventListener('click', () => {
  const panel = document.getElementById('eventReminderPanel');
  panel.classList.toggle('hidden');
  document.getElementById('eventSharePanel').classList.add('hidden');
  if (!panel.classList.contains('hidden') && currentModalEvent.id && Auth.isAuthenticated) {
    loadEventReminders(currentModalEvent.id);
  }
});

document.getElementById('eventModalShare').addEventListener('click', () => {
  document.getElementById('eventSharePanel').classList.toggle('hidden');
  document.getElementById('eventReminderPanel').classList.add('hidden');
});

document.getElementById('shareToFlow').addEventListener('click', () => {
  // Open chat with pre-filled share message
  closeEventModal();
  openChat();
  const msg = `Check out: ${currentModalEvent.title} ${currentModalEvent.url || ''}`;
  chatInput.value = msg;
  chatInput.focus();
  awardPoints(3, 'Shared to Flow');
});

document.getElementById('shareToSocial').addEventListener('click', () => {
  const text = encodeURIComponent(`${currentModalEvent.title} - found on FlowB`);
  const url = encodeURIComponent(currentModalEvent.url || window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=550,height=420');
  awardPoints(3, 'Shared to social');
  closeEventModal();
});

document.getElementById('shareCopyLink').addEventListener('click', () => {
  const url = currentModalEvent.url || window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('shareCopyLink');
    btn.classList.add('copied');
    const orig = btn.innerHTML;
    btn.innerHTML = btn.innerHTML.replace('Copy Link', 'Copied!');
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = orig;
    }, 1500);
  });
  awardPoints(1, 'Link copied');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('eventModal').classList.contains('hidden')) {
    closeEventModal();
  }
});

// ===== Calendar Download =====

async function handleAddToCalendar(eventId) {
  const url = `${FLOWB_API}/api/v1/events/${encodeURIComponent(eventId)}/calendar`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch calendar');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'event.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    awardPoints(2, 'Added to calendar');
  } catch (err) {
    console.error('Calendar download failed:', err);
  }
}

// ===== Reminder Panel Logic =====

// Toggle reminder chips (multi-select)
document.getElementById('reminderChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.reminder-chip');
  if (chip) chip.classList.toggle('active');
});

// Add custom reminder
document.getElementById('reminderCustomAdd').addEventListener('click', () => {
  const val = parseInt(document.getElementById('reminderCustomVal').value, 10);
  const unit = parseInt(document.getElementById('reminderCustomUnit').value, 10);
  if (!val || val < 1) return;

  const mins = val * unit;
  const chips = document.getElementById('reminderChips');

  // Check if this value already exists
  const existing = chips.querySelector(`[data-mins="${mins}"]`);
  if (existing) {
    existing.classList.add('active');
    return;
  }

  // Create custom chip
  const label = unit === 60 ? `${val}h` : `${mins}m`;
  const chip = document.createElement('button');
  chip.className = 'reminder-chip active';
  chip.dataset.mins = mins;
  chip.textContent = label;
  chip.addEventListener('click', () => chip.classList.toggle('active'));
  chips.appendChild(chip);

  document.getElementById('reminderCustomVal').value = '';
});

// Save reminders for current event
document.getElementById('reminderSaveBtn').addEventListener('click', async () => {
  if (!Auth.isAuthenticated || !currentModalEvent.id) return;

  const chips = document.querySelectorAll('#reminderChips .reminder-chip.active');
  const minutesBefore = Array.from(chips).map(c => parseInt(c.dataset.mins, 10)).filter(Boolean);

  const result = await fetchAuthed(`/api/v1/events/${encodeURIComponent(currentModalEvent.id)}/reminders`, {
    method: 'POST',
    body: JSON.stringify({ minutes_before: minutesBefore }),
  });

  const btn = document.getElementById('reminderSaveBtn');
  if (result && result.ok) {
    btn.textContent = 'Saved!';
    btn.style.background = 'var(--green)';
    setTimeout(() => {
      btn.textContent = 'Save Reminders';
      btn.style.background = '';
    }, 1500);
    awardPoints(2, 'Reminder set');
  }
});

// Load existing reminders for an event
async function loadEventReminders(eventId) {
  const data = await fetchAuthed(`/api/v1/events/${encodeURIComponent(eventId)}/reminders`);
  const activeMinutes = (data && data.reminders) ? data.reminders.map(r => r.remind_minutes_before) : [30];

  // Reset all chips to inactive then activate matching ones
  document.querySelectorAll('#reminderChips .reminder-chip').forEach(chip => {
    chip.classList.toggle('active', activeMinutes.includes(parseInt(chip.dataset.mins, 10)));
  });
}

// ===== Notification Settings Modal =====

function openNotifSettings() {
  document.getElementById('notifSettingsModal').classList.remove('hidden');
  document.getElementById('notifSettingsBackdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  loadNotificationSettings();
}

function closeNotifSettings() {
  document.getElementById('notifSettingsModal').classList.add('hidden');
  document.getElementById('notifSettingsBackdrop').classList.add('hidden');
  document.body.style.overflow = '';
}

// Populate hour selects
(function initHourSelects() {
  const startSel = document.getElementById('quietHoursStart');
  const endSel = document.getElementById('quietHoursEnd');
  if (!startSel || !endSel) return;
  for (let h = 0; h < 24; h++) {
    const label = `${h.toString().padStart(2, '0')}:00`;
    startSel.add(new Option(label, h));
    endSel.add(new Option(label, h));
  }
  startSel.value = 22;
  endSel.value = 8;
})();

// Default reminder chips (settings modal)
document.getElementById('defaultReminderChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.reminder-chip');
  if (chip) chip.classList.toggle('active');
});

// Wire up open/close
document.getElementById('notifSettingsBtn')?.addEventListener('click', openNotifSettings);
document.getElementById('dashSettingsBtn')?.addEventListener('click', openNotifSettings);
document.getElementById('notifSettingsClose').addEventListener('click', closeNotifSettings);
document.getElementById('notifSettingsBackdrop').addEventListener('click', closeNotifSettings);

async function loadNotificationSettings() {
  const data = await fetchAuthed('/api/v1/me/preferences');
  if (!data || !data.preferences) return;
  const p = data.preferences;

  // Default reminders
  const defaults = p.reminder_defaults || [30];
  document.querySelectorAll('#defaultReminderChips .reminder-chip').forEach(chip => {
    chip.classList.toggle('active', defaults.includes(parseInt(chip.dataset.mins, 10)));
  });

  // Toggles
  document.getElementById('notifCrewCheckins').checked = p.notify_crew_checkins ?? true;
  document.getElementById('notifFriendRsvps').checked = p.notify_friend_rsvps ?? true;
  document.getElementById('notifCrewRsvps').checked = p.notify_crew_rsvps ?? true;
  document.getElementById('notifEventReminders').checked = p.notify_event_reminders ?? true;
  document.getElementById('notifDailyDigest').checked = p.notify_daily_digest ?? true;

  // Quiet hours
  document.getElementById('notifQuietHours').checked = p.quiet_hours_enabled || false;
  document.getElementById('quietHoursStart').value = p.quiet_hours_start ?? 22;
  document.getElementById('quietHoursEnd').value = p.quiet_hours_end ?? 8;

  // Daily limit
  document.getElementById('notifDailyLimit').value = p.daily_notification_limit ?? 10;

  // Timezone
  document.getElementById('notifTimezone').value = p.timezone || 'America/Denver';
}

document.getElementById('notifSaveBtn').addEventListener('click', async () => {
  if (!Auth.isAuthenticated) return;

  // Collect default reminders
  const chips = document.querySelectorAll('#defaultReminderChips .reminder-chip.active');
  const reminder_defaults = Array.from(chips).map(c => parseInt(c.dataset.mins, 10)).filter(Boolean);

  const body = {
    reminder_defaults: reminder_defaults.length ? reminder_defaults : [30],
    notify_crew_checkins: document.getElementById('notifCrewCheckins').checked,
    notify_friend_rsvps: document.getElementById('notifFriendRsvps').checked,
    notify_crew_rsvps: document.getElementById('notifCrewRsvps').checked,
    notify_event_reminders: document.getElementById('notifEventReminders').checked,
    notify_daily_digest: document.getElementById('notifDailyDigest').checked,
    quiet_hours_enabled: document.getElementById('notifQuietHours').checked,
    quiet_hours_start: parseInt(document.getElementById('quietHoursStart').value, 10),
    quiet_hours_end: parseInt(document.getElementById('quietHoursEnd').value, 10),
    daily_notification_limit: parseInt(document.getElementById('notifDailyLimit').value, 10) || 10,
    timezone: document.getElementById('notifTimezone').value,
  };

  const result = await fetchAuthed('/api/v1/me/preferences', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  const btn = document.getElementById('notifSaveBtn');
  if (result && result.ok) {
    btn.textContent = 'Saved!';
    btn.classList.add('saved');
    setTimeout(() => {
      btn.textContent = 'Save Settings';
      btn.classList.remove('saved');
    }, 1500);
  }
});

// Close notif settings on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('notifSettingsModal').classList.contains('hidden')) {
    closeNotifSettings();
  }
});

// ===== RSVP Handler =====

async function handleRsvp(eventId, btnEl) {
  if (!requireAuth('add events to your Flow')) return;

  // Optimistic UI
  const origHtml = btnEl.innerHTML;
  btnEl.classList.add('rsvpd');
  btnEl.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="14" height="14"><path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/></svg>';
  btnEl.disabled = true;
  btnEl.title = 'Added to My Flow!';

  // Find event details from loaded events to send with RSVP
  const eventData = allEvents.find(e => e.id === eventId);
  const rsvpBody = { status: 'going' };
  if (eventData) {
    rsvpBody.eventTitle = eventData.title;
    rsvpBody.eventSource = eventData.source;
    rsvpBody.eventUrl = eventData.url;
    rsvpBody.venueName = eventData.venue?.name || null;
    rsvpBody.startTime = eventData.startTime;
    rsvpBody.endTime = eventData.endTime;
  }

  const result = await fetchAuthed(`/api/v1/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: 'POST',
    body: JSON.stringify(rsvpBody),
  });

  if (result) {
    awardPoints(3, 'RSVP bonus');
    awardFirstAction('first_rsvp', 5, 'First RSVP!');
    // Refresh schedule if My Flow / Dashboard is visible
    if (myFlowSection && !myFlowSection.classList.contains('hidden')) {
      loadMyFlowSchedule();
    }
    loadDashboard();
  } else {
    // Revert on failure
    btnEl.classList.remove('rsvpd');
    btnEl.innerHTML = origHtml;
    btnEl.disabled = false;
    btnEl.title = 'Add to my events';
  }
}

// Make handleRsvp available globally for onclick
window.handleRsvp = handleRsvp;

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Actions =====

async function selectCategory(catId) {
  activeCategory = catId;
  activeFilter = null;
  displayCount = 12;

  catRow.querySelectorAll('.cat-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === catId);
  });

  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));

  if (catId !== 'all') {
    awardPoints(1, 'Category browsed');
    awardFirstAction('first_category', 3, 'First category browse!');
  }

  showLoading();
  const params = {};
  if (catId !== 'all') params.mainCategory = catId;
  if (searchQuery) params.query = searchQuery;
  allEvents = await fetchEvents(params);
  renderEvents(allEvents);
}

async function applyFilter(filter) {
  if (activeFilter === filter) {
    activeFilter = null;
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    return selectCategory(activeCategory);
  }

  activeFilter = filter;
  displayCount = 12;

  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  awardPoints(1, 'Filter applied');
  awardFirstAction('first_filter', 3, 'First filter used!');

  showLoading();

  if (filter === 'tonight') {
    allEvents = await fetchTonight();
  } else if (filter === 'week') {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const params = {
      startDate: now.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
    if (activeCategory !== 'all') params.mainCategory = activeCategory;
    allEvents = await fetchEvents(params);
  } else if (filter === 'free') {
    const params = { freeOnly: true };
    if (activeCategory !== 'all') params.mainCategory = activeCategory;
    allEvents = await fetchEvents(params);
  }

  renderEvents(allEvents);
}

function showLoading() {
  grid.innerHTML = Array(6).fill('<div class="skeleton-card"></div>').join('');
  emptyState.classList.add('hidden');
  loadMoreWrap.style.display = 'none';
}

// ===== Search =====

let searchTimeout;
searchInput.addEventListener('input', () => {
  const val = searchInput.value.trim();
  searchClear.classList.toggle('hidden', !val);

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    searchQuery = val;
    displayCount = 12;
    showLoading();
    const params = {};
    if (val) params.query = val;
    if (activeCategory !== 'all') params.mainCategory = activeCategory;
    allEvents = await fetchEvents(params);
    renderEvents(allEvents);

    if (val) {
      awardPoints(3, 'Search bonus');
      awardFirstAction('first_search', 5, 'First search!');
    }
  }, 300);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.add('hidden');
  searchQuery = '';
  selectCategory(activeCategory);
});

// ===== Filter pills =====
document.querySelectorAll('.filter-pill:not(.platform-trigger)').forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

// ===== Platform Dropdown =====
const platformDropdown = document.getElementById('platformDropdown');
const platformTrigger = document.getElementById('platformTrigger');
const platformLabel = document.getElementById('platformLabel');

platformTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  platformDropdown.classList.toggle('open');
});

document.addEventListener('click', () => {
  platformDropdown.classList.remove('open');
});

document.querySelectorAll('.platform-option').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const platform = btn.dataset.platform;
    activePlatform = platform;
    displayCount = 12;

    document.querySelectorAll('.platform-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    platformLabel.textContent = btn.textContent.trim();
    platformDropdown.classList.remove('open');

    if (platform !== 'all') {
      platformTrigger.classList.add('active');
    } else {
      platformTrigger.classList.remove('active');
    }

    renderEvents(allEvents);
  });
});

// ===== "All" category =====
catRow.querySelector('[data-cat="all"]').addEventListener('click', () => selectCategory('all'));

// ===== Load More =====
loadMoreBtn.addEventListener('click', () => {
  displayCount += 12;
  renderEvents(allEvents);
});

// ===================================================================
// FlowB Chat - OpenClaw Integration
// ===================================================================

function openChat() {
  chatModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  chatInput.focus();
  awardFirstAction('first_chat_open', 3, 'Chat opened!');
}

function closeChat() {
  chatModal.classList.add('hidden');
  document.body.style.overflow = '';
}

chatBtn.addEventListener('click', openChat);
chatBackdrop.addEventListener('click', closeChat);
chatClose.addEventListener('click', closeChat);

// Escape key closes chat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !chatModal.classList.contains('hidden')) {
    closeChat();
  }
});

// Auto-resize textarea
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

// Enter to send (Shift+Enter for newline)
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});

// Quick actions - regular chat chips (data-msg)
document.querySelectorAll('.flowb-quick-chip[data-msg]').forEach(btn => {
  btn.addEventListener('click', () => sendChatMessage(btn.dataset.msg));
});

// Flow-aware quick action chips (data-action)
document.querySelectorAll('.flowb-quick-chip[data-action]').forEach(btn => {
  btn.addEventListener('click', () => handleFlowAction(btn.dataset.action));
});

// Suggestion buttons
document.querySelectorAll('.flowb-suggestion').forEach(btn => {
  btn.addEventListener('click', () => sendChatMessage(btn.dataset.msg));
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg || isStreaming) return;
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendChatMessage(msg);
});

// ===== Flow-Aware Chat Chip Handlers (Task 6C) =====

async function handleFlowAction(action) {
  if (isStreaming) return;

  switch (action) {
    case 'my-crew':
      await handleMyCrewAction();
      break;
    case 'my-schedule':
      await handleMyScheduleAction();
      break;
    case 'whos-going':
      await handleWhosGoingAction();
      break;
    case 'leaderboard':
      await handleLeaderboardAction();
      break;
    default:
      sendChatMessage(action);
  }
}

async function handleMyCrewAction() {
  isStreaming = true;
  chatSendBtn.disabled = true;
  addChatMessage('My Crew', 'user');
  addTypingIndicator();

  if (!Auth.isAuthenticated) {
    removeTypingIndicator();
    addChatMessage('Sign in to see your crew info! Click the "Sign In" button at the top.', 'bot');
    isStreaming = false;
    chatSendBtn.disabled = false;
    return;
  }

  const data = await fetchAuthed('/api/v1/flow/crews');
  removeTypingIndicator();

  if (!data || !data.crews || !data.crews.length) {
    addChatMessage('You haven\'t joined any crews yet. Open FlowB on Telegram or Farcaster to create or join a crew!', 'bot');
  } else {
    let text = `**Your Crews** (${data.crews.length})\n\n`;
    for (const crew of data.crews) {
      text += `${crew.emoji || ''} **${crew.name}** - ${crew.role || 'member'}\n`;
    }
    text += '\nManage your crews in the Telegram or Farcaster mini app!';
    addChatMessage(text, 'bot');
  }

  isStreaming = false;
  chatSendBtn.disabled = false;
  chatInput.focus();
}

async function handleMyScheduleAction() {
  isStreaming = true;
  chatSendBtn.disabled = true;
  addChatMessage('My Schedule', 'user');
  addTypingIndicator();

  if (!Auth.isAuthenticated) {
    removeTypingIndicator();
    addChatMessage('Sign in to see your schedule! Click the "Sign In" button at the top.', 'bot');
    isStreaming = false;
    chatSendBtn.disabled = false;
    return;
  }

  const data = await fetchAuthed('/api/v1/me/schedule');
  removeTypingIndicator();

  if (!data || !data.schedule || !data.schedule.length) {
    addChatMessage('No upcoming events on your schedule. Browse events and RSVP to build your schedule!', 'bot');
  } else {
    let text = `**Your Upcoming Events** (${data.schedule.length})\n\n`;
    for (const item of data.schedule.slice(0, 8)) {
      const date = new Date(item.starts_at);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const venue = item.venue_name ? ` at ${item.venue_name}` : '';
      const status = item.rsvp_status === 'maybe' ? ' (maybe)' : '';
      text += `- **${item.event_title}**\n  ${dateStr} ${timeStr}${venue}${status}\n\n`;
    }
    addChatMessage(text, 'bot');
  }

  isStreaming = false;
  chatSendBtn.disabled = false;
  chatInput.focus();
}

async function handleWhosGoingAction() {
  isStreaming = true;
  chatSendBtn.disabled = true;
  addChatMessage("Who's going tonight?", 'user');
  addTypingIndicator();

  // Try to get tonight's events first
  try {
    const res = await fetch(`${API}/api/v1/discover/tonight`);
    const data = await res.json();
    const events = data.events || [];

    removeTypingIndicator();

    if (!events.length) {
      addChatMessage("I don't see any events listed for tonight. Check back later or try \"this week\"!", 'bot');
    } else {
      let text = `**Tonight's Events** (${events.length})\n\n`;
      for (const e of events.slice(0, 6)) {
        const time = new Date(e.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const venue = e.venue?.name ? ` at ${e.venue.name}` : '';
        const price = e.isFree ? ' [Free]' : '';
        text += `${e.mainCategoryEmoji || ''} **${e.title}**\n${time}${venue}${price}\n\n`;
      }
      text += 'RSVP to events and check who from your crew is going!';
      addChatMessage(text, 'bot');
    }
  } catch {
    removeTypingIndicator();
    addChatMessage("Couldn't load tonight's events right now. Try again in a moment!", 'bot');
  }

  isStreaming = false;
  chatSendBtn.disabled = false;
  chatInput.focus();
}

async function handleLeaderboardAction() {
  isStreaming = true;
  chatSendBtn.disabled = true;
  addChatMessage('Leaderboard', 'user');
  addTypingIndicator();

  const data = await fetchGlobalLeaderboard();
  removeTypingIndicator();

  if (!data || !data.crews || !data.crews.length) {
    addChatMessage('Crew leaderboard is loading up! Join a crew on FlowB to start earning points.', 'bot');
  } else {
    let text = '**Crew Leaderboard**\n\n';
    for (let i = 0; i < Math.min(data.crews.length, 10); i++) {
      const crew = data.crews[i];
      const medal = i === 0 ? '' : i === 1 ? '' : i === 2 ? '' : `${i + 1}.`;
      text += `${medal} ${crew.emoji || ''} **${crew.name}** - ${crew.totalPoints} pts`;
      if (crew.memberCount) text += ` (${crew.memberCount} members)`;
      text += '\n';
    }
    text += '\nJoin a crew to climb the leaderboard!';
    addChatMessage(text, 'bot');
  }

  isStreaming = false;
  chatSendBtn.disabled = false;
  chatInput.focus();
}

// ===== Chat Message Rendering =====

function addChatMessage(text, type) {
  // Hide welcome on first message
  if (chatWelcome) {
    chatWelcome.classList.add('hidden-welcome');
  }

  const div = document.createElement('div');
  div.className = `flowb-msg ${type}`;

  const avatarText = type === 'bot' ? 'F' : (Auth.isAuthenticated && Auth.user?.username ? Auth.user.username[0].toUpperCase() : 'U');

  const html = formatMarkdown(text);

  div.innerHTML = `
    <div class="flowb-msg-avatar">${avatarText}</div>
    <div class="flowb-msg-content">${html}</div>
  `;
  chatMessages.appendChild(div);
  scrollChatToBottom();
  return div;
}

function addTypingIndicator() {
  if (chatWelcome) chatWelcome.classList.add('hidden-welcome');

  const div = document.createElement('div');
  div.className = 'flowb-msg bot';
  div.id = 'flowbTyping';
  div.innerHTML = `
    <div class="flowb-msg-avatar">F</div>
    <div class="flowb-msg-content">
      <div class="flowb-typing"><span></span><span></span><span></span></div>
    </div>
  `;
  chatMessages.appendChild(div);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('flowbTyping');
  if (el) el.remove();
}

function scrollChatToBottom() {
  chatBody.scrollTop = chatBody.scrollHeight;
}

function formatMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
}

function setStatus(status, text) {
  chatStatusText.textContent = text;
  if (status === 'error') {
    chatStatus.classList.add('error');
  } else {
    chatStatus.classList.remove('error');
  }
}

// ===== OpenClaw Chat Completions =====

async function sendToOpenClaw(userMessage) {
  // Add to history
  chatHistory.push({ role: 'user', content: userMessage });

  // Get user's display name for replies
  const userName = Auth.isAuthenticated ? (Auth.user?.username || Auth.user?.email || null) : null;

  // Build system message with context
  const systemMsg = {
    role: 'system',
    content: `You are FlowB, a friendly AI assistant for ETHDenver 2026 side events. You help users discover events, hackathons, parties, meetups, and summits happening during ETHDenver week (Feb 13-20, 2026) in Denver.

You have access to a tool called "flowb" that can search events, browse categories, check tonight's events, find free events, and more. Use it when users ask about events.

CRITICAL RULES:
1. ALWAYS reply in a SINGLE message. If the user asks multiple questions, address ALL of them in ONE cohesive response with clear sections. NEVER send multiple separate messages.
2. If a user asks two things like "what is X? also show me Y events", gather ALL the information first, then respond once with everything.
3. When using the flowb tool, batch your tool calls and combine all results into one response.
4. ${userName ? `Address the user as "${userName}" when greeting them.` : 'Be friendly and conversational.'}
5. Respond when the user mentions "flowb" or "@flowb" — treat it as them talking to you.
6. Be conversational, helpful, and concise. Use emojis sparingly.
7. Format event listings clearly with titles, dates, venues, and prices.

The user's platform is "web" and their user_id is "${Points.anonId || 'anon'}".`
  };

  const messages = [systemMsg, ...chatHistory.slice(-20)]; // Keep last 20 messages

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (OPENCLAW_TOKEN) {
      headers['Authorization'] = `Bearer ${OPENCLAW_TOKEN}`;
    }

    const res = await fetch(`${OPENCLAW_GATEWAY}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: `openclaw:${FLOWB_AGENT_ID}`,
        messages,
        stream: false,
        user: Points.anonId || 'web-anon',
      }),
    });

    if (!res.ok) {
      throw new Error(`Gateway returned ${res.status}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'No response from FlowB.';

    chatHistory.push({ role: 'assistant', content: reply });
    return reply;
  } catch (err) {
    console.warn('[flowb-chat] OpenClaw gateway error:', err.message);
    throw err;
  }
}

// ===== Local Fallback (when OpenClaw unavailable) =====

/** Strip "flowb" / "@flowb" / "hey flowb" prefix from input */
function stripFlowbMention(text) {
  return text.replace(/^(?:@?flowb[,:]?\s*|hey\s+flowb[,:]?\s*)/i, '').trim();
}

/** Split multi-part questions into segments */
function segmentQuestions(text) {
  // Split on "also", "and also", "? " followed by another question, ";", or "+" as separators
  const segments = text
    .split(/(?:\?\s+(?:also\s+)?|;\s*|\balso\b\s*|\band\s+also\b\s*)/i)
    .map(s => s.replace(/\?$/, '').trim())
    .filter(s => s.length > 2);
  return segments.length > 0 ? segments : [text];
}

async function processLocalCommand(input) {
  // Strip FlowB mentions
  input = stripFlowbMention(input);
  const lower = input.toLowerCase().trim();

  // Handle multi-part questions
  const segments = segmentQuestions(lower);
  if (segments.length > 1) {
    const results = [];
    for (const seg of segments) {
      const result = await processSingleCommand(seg.trim());
      results.push(result);
    }
    const userName = Auth.isAuthenticated ? (Auth.user?.username || Auth.user?.email || null) : null;
    const greeting = userName ? `Hey ${userName}, ` : '';
    return `${greeting}here's what I found:\n\n${results.join('\n\n---\n\n')}`;
  }

  return processSingleCommand(lower);
}

async function processSingleCommand(lower) {
  // Normalize natural language to commands
  // "what's happening tonight" → "tonight"
  // "show me free events" → "free"
  // "what are the best parties" → "browse social"
  // "whats danz" → knowledge answer
  lower = lower
    .replace(/^(?:what'?s?|show me|find|tell me about|give me|list)\s+/i, '')
    .replace(/^(?:happening|going on)\s+/i, '')
    .trim();

  // Handle "danz" / "what is danz" type questions (FlowBond ecosystem knowledge)
  if (/^(?:danz|danz\.now|danz now)/i.test(lower)) {
    return `**DANZ.Now** is a vibrant dance community platform within the FlowBond ecosystem. It connects dancers, offers challenges with USDC rewards on the Base network, and helps you find and register for dance events.\n\nYou can track your stats, join leaderboards, and engage with other dancers. Say "stats" to check your stats or "challenges" for active challenges.`;
  }

  // Handle "flowb" / "what is flowb" questions
  if (/^(?:flowb|flow\s?b|flow\s?bond)/i.test(lower)) {
    return `**FlowB** is your AI-powered assistant for discovering events and connecting with communities. I can help you find ETHDenver 2026 side events, hackathons, parties, and meetups.\n\nI'm part of the FlowBond ecosystem, which includes DANZ.Now (dance community) and the eGator event aggregator.\n\nTry "categories" to browse events or "tonight" to see what's happening!`;
  }

  if (lower === 'help') {
    return `Here's what I can help with:\n\n**categories** — browse by type\n**browse [type]** — events in a category (defi, ai, infra, build, capital, social, wellness, privacy, art)\n**tonight** — tonight's events\n**week** — this week's events\n**free** — free events only\n**search [query]** — search events\n**points** — check your points\n\nOr just ask me anything about ETHDenver!`;
  }

  if (lower === 'points' || lower === 'my points') {
    const current = getMilestoneForPoints(Points.total);
    const next = getNextMilestone(Points.total);
    let text = `**Your FlowB Points**\n\n**${Points.total}** pts`;
    if (current) text += `  |  ${current.title}`;
    if (Points.streak > 1) text += `\nStreak: ${Points.streak} day${Points.streak > 1 ? 's' : ''}`;
    if (next) text += `\n\nNext: **${next.title}** at ${next.points} pts (${next.points - Points.total} to go)`;
    if (Auth.isAuthenticated) text += `\n\nLogged in as **${Auth.user?.username || Auth.user?.email || 'User'}**`;
    else text += `\n\nSign in to save your progress!`;
    return text;
  }

  if (lower === 'categories' || lower === 'cats') {
    const res = await fetch(`${API}/api/v1/categories`);
    const data = await res.json();
    let text = '**Event Categories**\n\n';
    for (const cat of data.categories) {
      text += `${cat.emoji} **${cat.label}** — ${cat.count} events\n`;
    }
    text += '\nSay "browse defi" or "browse ai" to see events.';
    return text;
  }

  if (lower === 'tonight' || /tonight/i.test(lower)) {
    const res = await fetch(`${API}/api/v1/discover/tonight`);
    const data = await res.json();
    if (!data.events?.length) return 'No events tonight. Try "week" or "categories".';
    return formatChatEvents(data.events, "Tonight's Events");
  }

  if (lower === 'week' || lower === 'this week') {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const events = await fetchEvents({
      startDate: now.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      limit: 10,
    });
    if (!events.length) return 'No events this week.';
    return formatChatEvents(events, "This Week");
  }

  if (lower === 'free' || /free\s*(?:events|only|stuff)?$/i.test(lower)) {
    const events = await fetchEvents({ freeOnly: true, limit: 10 });
    if (!events.length) return 'No free events found.';
    return formatChatEvents(events, "Free Events");
  }

  if (lower.startsWith('browse ')) {
    const cat = lower.replace('browse ', '').trim();
    const aliases = {
      defi: 'defi', trading: 'defi', finance: 'defi',
      ai: 'ai', agents: 'ai',
      infra: 'infra', infrastructure: 'infra', l2: 'infra',
      build: 'build', builder: 'build', dev: 'build', hack: 'build',
      capital: 'capital', vc: 'capital', investor: 'capital',
      social: 'social', party: 'social', parties: 'social',
      wellness: 'wellness', fitness: 'wellness',
      privacy: 'privacy', security: 'privacy',
      art: 'art', nft: 'art', culture: 'art',
    };
    const mainCat = aliases[cat] || cat;
    const events = await fetchEvents({ mainCategory: mainCat, limit: 10 });
    if (!events.length) return `No events in "${cat}". Try "categories" to see options.`;
    return formatChatEvents(events, `${mainCat.charAt(0).toUpperCase() + mainCat.slice(1)} Events`);
  }

  if (lower.startsWith('search ')) {
    const query = lower.replace('search ', '').trim();
    const events = await fetchEvents({ query, limit: 10 });
    if (!events.length) return `No events matching "${query}".`;
    return formatChatEvents(events, `Results for "${query}"`);
  }

  // Natural language → category matching
  const catKeywords = {
    'part(?:y|ies)': 'social', 'fun': 'social', 'social': 'social', 'networking': 'social',
    'defi': 'defi', 'trading': 'defi', 'finance': 'defi',
    'ai': 'ai', 'agent': 'ai', 'machine learning': 'ai',
    'hack(?:athon)?': 'build', 'build': 'build', 'dev': 'build',
    'art': 'art', 'nft': 'art', 'culture': 'art',
    'wellness': 'wellness', 'yoga': 'wellness', 'fitness': 'wellness',
    'privacy': 'privacy', 'security': 'privacy', 'zk': 'privacy',
    'infra': 'infra', 'infrastructure': 'infra', 'l2': 'infra',
    'capital': 'capital', 'vc': 'capital', 'invest': 'capital',
  };
  for (const [pattern, cat] of Object.entries(catKeywords)) {
    if (new RegExp(pattern, 'i').test(lower)) {
      const events = await fetchEvents({ mainCategory: cat, limit: 10 });
      if (events.length) return formatChatEvents(events, `${cat.charAt(0).toUpperCase() + cat.slice(1)} Events`);
    }
  }

  // Default: search
  const events = await fetchEvents({ query: lower, limit: 8 });
  if (!events.length) return `No events found for "${lower}". Try "categories" or "help".`;
  return formatChatEvents(events, `Results for "${lower}"`);
}

function formatChatEvents(events, title) {
  let text = `**${title}** (${events.length})\n\n`;
  for (const e of events.slice(0, 8)) {
    const date = new Date(e.startTime);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const emoji = e.mainCategoryEmoji || '';
    const venue = e.venue?.name ? `\uD83D\uDCCD ${e.venue.name}` : '';
    const price = e.isFree ? '\uD83C\uDD93' : e.price?.min ? `$${e.price.min}` : '';
    text += `${emoji} **${e.title}**\n${dateStr} ${timeStr}`;
    if (venue) text += ` | ${venue}`;
    if (price) text += ` | ${price}`;
    if (e.url) text += `\n${e.url}`;
    text += '\n\n';
  }
  return text.trim();
}

// ===== Send Message (tries OpenClaw, falls back to local) =====

async function sendChatMessage(msg) {
  if (isStreaming) return;
  isStreaming = true;
  chatSendBtn.disabled = true;

  addChatMessage(msg, 'user');
  addTypingIndicator();
  awardPoints(1, 'Chat message');

  // Clean the message for processing (strip "flowb" prefix, keep original for display)
  const cleanMsg = stripFlowbMention(msg);

  try {
    // Try OpenClaw gateway first
    const response = await sendToOpenClaw(cleanMsg);
    removeTypingIndicator();
    addChatMessage(response, 'bot');
    setStatus('ok', 'connected');
  } catch (err) {
    // Fall back to local command processing
    console.log('[flowb-chat] Falling back to local processing');
    setStatus('ok', 'local mode');
    try {
      const response = await processLocalCommand(cleanMsg);
      removeTypingIndicator();
      addChatMessage(response, 'bot');
    } catch (innerErr) {
      removeTypingIndicator();
      addChatMessage('Something went wrong. Try again!', 'bot');
    }
  }

  isStreaming = false;
  chatSendBtn.disabled = false;
  chatInput.focus();
}

// ===== URL Parameter Handling (Smart Short Links) =====

function handleEventUrlParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventParam = urlParams.get('event');

  if (eventParam) {
    // Event linked from smart short link (/e/:id)
    // Open chat with context about this event
    setTimeout(() => {
      openChat();
      sendChatMessage(`Tell me about event ${eventParam}`);
    }, 1500);

    // Clean the URL
    const url = new URL(window.location.href);
    url.searchParams.delete('event');
    window.history.replaceState({}, '', url.toString());
  }
}

// ===== Init =====
(async () => {
  awardPoints(1, 'Daily visit', 'info');
  awardFirstAction('first_visit', 5, 'Welcome to FlowB!');

  // Load hero stats and top crews (non-blocking)
  loadHeroStats();
  loadHeroCrews();

  // Handle event URL parameter from smart short links
  handleEventUrlParam();

  // Read URL params (from FlowB web links)
  const urlParams = new URLSearchParams(window.location.search);
  const paramSearch = urlParams.get('search');
  const paramCategory = urlParams.get('category');
  const paramFilter = urlParams.get('filter');
  const paramCity = urlParams.get('city');

  if (paramSearch) {
    searchInput.value = paramSearch;
    searchQuery = paramSearch;
    searchClear.classList.remove('hidden');
  }

  if (paramCategory && paramCategory !== 'all') {
    activeCategory = paramCategory;
  }

  await fetchCategories();

  // Apply category from URL
  if (paramCategory && paramCategory !== 'all') {
    catRow.querySelectorAll('.cat-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === paramCategory);
    });
  }

  // Build initial fetch params from URL
  const initParams = {};
  if (paramSearch) initParams.query = paramSearch;
  if (paramCategory && paramCategory !== 'all') initParams.mainCategory = paramCategory;
  if (paramCity) initParams.city = paramCity;

  // Apply filter from URL (tonight/week/free)
  if (paramFilter === 'tonight') {
    allEvents = await fetchTonight();
    activeFilter = 'tonight';
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'tonight');
    });
  } else if (paramFilter === 'week') {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    initParams.startDate = now.toISOString().slice(0, 10);
    initParams.endDate = end.toISOString().slice(0, 10);
    allEvents = await fetchEvents(initParams);
    activeFilter = 'week';
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'week');
    });
  } else if (paramFilter === 'free') {
    initParams.freeOnly = true;
    allEvents = await fetchEvents(initParams);
    activeFilter = 'free';
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'free');
    });
  } else {
    allEvents = await fetchEvents(initParams);
  }

  renderEvents(allEvents);

  // Load My Flow and Dashboard if authenticated
  loadMyFlow();
  loadDashboard();

  // Check OpenClaw gateway availability
  try {
    const res = await fetch(`${OPENCLAW_GATEWAY}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      setStatus('ok', 'connected');
    } else {
      setStatus('ok', 'local mode');
    }
  } catch {
    setStatus('ok', 'local mode');
  }

  // FlowB nudge popup - dismiss + auto-hide
  const nudge = document.getElementById('flowbNudge');
  const nudgeClose = document.getElementById('flowbNudgeClose');
  const nudgeDismissed = localStorage.getItem('flowb_nudge_dismissed');

  if (nudgeDismissed) {
    nudge.style.display = 'none';
  } else {
    nudgeClose.addEventListener('click', () => {
      nudge.classList.add('dismissed');
      setTimeout(() => { nudge.style.display = 'none'; }, 300);
      localStorage.setItem('flowb_nudge_dismissed', '1');
    });
    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      if (!nudge.classList.contains('dismissed')) {
        nudge.classList.add('dismissed');
        setTimeout(() => { nudge.style.display = 'none'; }, 300);
      }
    }, 18000);
  }
})();
