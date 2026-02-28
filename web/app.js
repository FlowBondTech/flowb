const API = 'https://flowb.fly.dev';
const FLOWB_API = 'https://flowb.fly.dev';

// FlowB Chat API (proxied through flowb.fly.dev → xAI Grok)
const FLOWB_CHAT_URL = FLOWB_API;

// State
let allEvents = [];
let categories = [];
let activeCategory = 'all';
let activeFilter = null;
let activePlatform = 'all';
let searchQuery = '';
let activeCity = localStorage.getItem('flowb-city') || '';
let activeCityLabel = localStorage.getItem('flowb-city-label') || 'Anywhere';
let displayCount = 18;
let chatHistory = [];
let isStreaming = false;

// Touch scroll guard – prevent click firing when user is scrolling
let _touchStartY = 0;
let _touchMoved = false;
document.addEventListener('touchstart', (e) => {
  _touchStartY = e.touches[0].clientY;
  _touchMoved = false;
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (Math.abs(e.touches[0].clientY - _touchStartY) > 10) _touchMoved = true;
}, { passive: true });

// DOM - Events
const grid = document.getElementById('eventsGrid');
const catRow = document.getElementById('categoriesRow');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const resultsMeta = document.getElementById('resultsMeta');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const emptyState = document.getElementById('emptyState');

// DOM - Chat Widget
const widget = document.getElementById('flowbWidget');
const widgetFab = document.getElementById('flowbWidgetFab');
const widgetPanel = document.getElementById('flowbWidgetPanel');
const panelMinimize = document.getElementById('flowbPanelMinimize');
const chatBody = document.getElementById('flowbChatBody');
const chatMessages = document.getElementById('flowbMessages');
const chatForm = document.getElementById('flowbChatForm');
const chatInput = document.getElementById('flowbChatInput');
const chatSendBtn = document.getElementById('flowbSendBtn');
const chatStatus = document.getElementById('flowbStatus');
const chatStatusText = document.getElementById('flowbStatusText');


// ===== API =====

// Map category icon names to emoji
const CATEGORY_ICONS = {
  coins: '\uD83E\uDE99', defi: '\uD83E\uDE99',
  brain: '\uD83E\uDDE0', ai: '\uD83E\uDDE0',
  server: '\uD83D\uDD27', infrastructure: '\uD83D\uDD27',
  hammer: '\uD83D\uDD28', build: '\uD83D\uDD28',
  briefcase: '\uD83D\uDCBC', capital: '\uD83D\uDCBC',
  'party-popper': '\uD83C\uDF89', social: '\uD83C\uDF89',
  sparkles: '\u2728', wellness: '\uD83E\uDDD8',
  shield: '\uD83D\uDD12', privacy: '\uD83D\uDD12',
  palette: '\uD83C\uDFA8', art: '\uD83C\uDFA8',
  globe: '\uD83C\uDF10', gaming: '\uD83C\uDFAE',
};

async function fetchCategories() {
  try {
    const res = await fetch(`${API}/api/v1/categories`);
    const data = await res.json();
    // Normalize to expected shape: { id, emoji, label, count }
    categories = (data.categories || []).map(c => ({
      id: c.slug || c.id,
      emoji: CATEGORY_ICONS[c.icon] || CATEGORY_ICONS[c.slug] || '',
      label: c.name || c.slug,
      count: c.count || '',
    }));
    renderCategories();
  } catch (err) {
    console.error('Failed to fetch categories:', err);
  }
}

async function fetchEvents(params = {}) {
  try {
    // Map old POST params to new GET query params
    const qp = new URLSearchParams();
    qp.set('limit', String(params.limit || 50));
    if (params.mainCategory) qp.set('categories', params.mainCategory);
    if (params.query) qp.set('q', params.query);
    if (params.startDate) qp.set('from', params.startDate + 'T00:00:00');
    if (params.endDate) qp.set('to', params.endDate + 'T23:59:59');
    if (params.freeOnly) qp.set('free', 'true');
    // Use explicit city param, or fall back to active location
    // Pass city: '' to explicitly skip city filtering
    const city = params.city !== undefined ? params.city : activeCity;
    if (city) qp.set('city', city);

    const res = await fetch(`${API}/api/v1/events?${qp}`);
    const data = await res.json();
    return (data.events || []).map(normalizeEvent);
  } catch (err) {
    console.error('Failed to fetch events:', err);
    return [];
  }
}

async function fetchTonight() {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    return await fetchEvents({ startDate: today, endDate: today, limit: 50 });
  } catch (err) {
    console.error('Failed to fetch tonight events:', err);
    return [];
  }
}

// Normalize new API shape to the format createEventCard expects
function normalizeEvent(e) {
  return {
    ...e,
    venue: e.venue || (e.locationName ? { name: e.locationName } : null),
    organizer: e.organizer || (e.organizerName ? { name: e.organizerName } : null),
    isOnline: e.isVirtual || false,
    attendeeCount: e.attendeeCount || e.rsvpCount || 0,
    mainCategoryEmoji: e.mainCategoryEmoji || '',
    mainCategoryLabel: e.mainCategoryLabel || (e.categories && e.categories[0]) || '',
    price: typeof e.price === 'number' ? { min: e.price, max: e.price } : e.price || null,
    imageUrl: e.imageUrl || e.coverUrl || null,
  };
}

// ===== Public API: Leaderboard =====

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


// ===== Render =====

function renderCategories() {
  const allBtn = catRow.querySelector('[data-cat="all"]');
  catRow.innerHTML = '';
  catRow.appendChild(allBtn);

  for (const cat of categories) {
    const btn = document.createElement('button');
    btn.className = 'cat-chip';
    btn.dataset.cat = cat.id;
    btn.innerHTML = `${cat.emoji} ${cat.label}${cat.count ? ` <span class="cat-count">${cat.count}</span>` : ''}`;
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
function optimizeImageUrl(url, w, h) {
  if (!url) return url;
  // Eventbrite already resizes via their CDN params - leave as-is
  if (url.includes('evbuc.com')) return url;
  // wsrv.nl image proxy to resize and convert to webp
  const width = w || 450;
  const height = h || 250;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&h=${height}&fit=cover&output=webp&q=75`;
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
  // Skip if user was scrolling (not a deliberate tap)
  if (_touchMoved && !shareOnly) return;
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
  const optimizedModalImg = img ? optimizeImageUrl(img, 600, 300) : '';
  imgEl.src = optimizedModalImg || '';
  imgEl.style.display = optimizedModalImg ? '' : 'none';
  imgEl.onerror = function() { this.style.display = 'none'; };

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
  expandChat();
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
  document.getElementById('notifTimezone').value = p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Denver';
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
    showRsvpConfirmation(eventId, eventData);
  } else {
    // Revert on failure
    btnEl.classList.remove('rsvpd');
    btnEl.innerHTML = origHtml;
    btnEl.disabled = false;
    btnEl.title = 'Add to my events';
  }
}

function showRsvpConfirmation(eventId, eventData) {
  const modal = document.getElementById('eventModal');
  const backdrop = document.getElementById('eventModalBackdrop');

  // Build confirmation content
  const title = eventData ? escapeHtml(eventData.title) : (currentModalEvent.title || 'Event');
  const meta = currentModalEvent.meta || '';
  const startTime = eventData?.startTime ? new Date(eventData.startTime) : null;

  let calUrl = '';
  if (startTime && eventData) {
    const fmt = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const endTime = eventData.endTime ? new Date(eventData.endTime) : new Date(startTime.getTime() + 2 * 3600000);
    calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title)}&dates=${fmt(startTime)}/${fmt(endTime)}&location=${encodeURIComponent(eventData.venue?.name || '')}&details=${encodeURIComponent('Added via FlowB')}`;
  }

  // Replace modal content with confirmation
  const actionsEl = modal.querySelector('.event-modal-actions');
  const headerEl = modal.querySelector('.event-modal-header');
  const reminderPanel = document.getElementById('eventReminderPanel');
  const sharePanel = document.getElementById('eventSharePanel');

  if (reminderPanel) reminderPanel.classList.add('hidden');
  if (sharePanel) sharePanel.classList.add('hidden');

  if (headerEl) headerEl.style.display = 'none';

  if (actionsEl) {
    actionsEl.innerHTML = `
      <div class="rsvp-confirm">
        <div class="rsvp-confirm-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="32" height="32">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="rsvp-confirm-title">You're going!</div>
        <div class="rsvp-confirm-event">${title}</div>
        ${meta ? `<div class="rsvp-confirm-meta">${escapeHtml(meta)}</div>` : ''}
        <div class="rsvp-confirm-msg">Added to your Flow. You'll get reminders before it starts.</div>
        <div class="rsvp-confirm-actions">
          ${calUrl ? `<a href="${calUrl}" target="_blank" rel="noopener" class="event-modal-chip">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Add to Calendar
          </a>` : ''}
          <button class="event-modal-chip" onclick="closeEventModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Done
          </button>
        </div>
      </div>
    `;
  }

  // Show modal if not already visible (e.g. RSVP from card icon)
  modal.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Reset modal content when closing after confirmation
const _origCloseEventModal = closeEventModal;
closeEventModal = function() {
  _origCloseEventModal();
  // Restore original modal structure after a tick
  setTimeout(() => {
    const headerEl = document.querySelector('.event-modal-header');
    if (headerEl) headerEl.style.display = '';

    const actionsEl = document.querySelector('.event-modal-actions');
    if (actionsEl && actionsEl.querySelector('.rsvp-confirm')) {
      actionsEl.innerHTML = `
        <button class="event-modal-btn primary" id="eventModalRsvp">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          Add to My Flow
        </button>
        <div class="event-modal-row">
          <button class="event-modal-chip" id="eventModalCalendar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Calendar
          </button>
          <button class="event-modal-chip" id="eventModalReminder">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            Remind
          </button>
          <button class="event-modal-chip" id="eventModalShare">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
        </div>
        <a class="event-modal-external" id="eventModalOpen" href="#" target="_blank" rel="noopener">
          <span id="eventModalOpenLabel">Open Event</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      `;
      // Re-attach event listeners
      document.getElementById('eventModalRsvp').addEventListener('click', () => {
        if (!currentModalEvent.id) return;
        if (!requireAuth('add events to your Flow')) return;
        handleRsvp(currentModalEvent.id, document.getElementById('eventModalRsvp'));
      });
      document.getElementById('eventModalCalendar').addEventListener('click', () => {
        if (currentModalEvent.id) handleAddToCalendar(currentModalEvent.id);
      });
      document.getElementById('eventModalReminder').addEventListener('click', () => {
        document.getElementById('eventReminderPanel').classList.toggle('hidden');
      });
      document.getElementById('eventModalShare').addEventListener('click', () => {
        document.getElementById('eventSharePanel').classList.toggle('hidden');
      });
      document.getElementById('eventModalOpen').addEventListener('click', closeEventModal);
    }
  }, 300);
};

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
  displayCount = 18;

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
  displayCount = 18;

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
    displayCount = 18;
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

// ===== Location Picker =====
const POPULAR_CITIES = [
  { city: '', label: 'Anywhere', icon: '🌍', region: 'Global' },
  { city: 'Denver', label: 'Denver', icon: '🏔️', region: 'Colorado, USA' },
  { city: 'New York', label: 'New York', icon: '🗽', region: 'New York, USA' },
  { city: 'San Francisco', label: 'San Francisco', icon: '🌉', region: 'California, USA' },
  { city: 'Los Angeles', label: 'Los Angeles', icon: '🌴', region: 'California, USA' },
  { city: 'Austin', label: 'Austin', icon: '🤠', region: 'Texas, USA' },
  { city: 'Miami', label: 'Miami', icon: '🌊', region: 'Florida, USA' },
  { city: 'Chicago', label: 'Chicago', icon: '🏙️', region: 'Illinois, USA' },
  { city: 'London', label: 'London', icon: '🇬🇧', region: 'United Kingdom' },
  { city: 'Berlin', label: 'Berlin', icon: '🇩🇪', region: 'Germany' },
  { city: 'Paris', label: 'Paris', icon: '🇫🇷', region: 'France' },
  { city: 'Lisbon', label: 'Lisbon', icon: '🇵🇹', region: 'Portugal' },
  { city: 'Singapore', label: 'Singapore', icon: '🇸🇬', region: 'Singapore' },
  { city: 'Tokyo', label: 'Tokyo', icon: '🇯🇵', region: 'Japan' },
  { city: 'Seoul', label: 'Seoul', icon: '🇰🇷', region: 'South Korea' },
  { city: 'Dubai', label: 'Dubai', icon: '🇦🇪', region: 'UAE' },
  { city: 'Bangkok', label: 'Bangkok', icon: '🇹🇭', region: 'Thailand' },
  { city: 'Buenos Aires', label: 'Buenos Aires', icon: '🇦🇷', region: 'Argentina' },
];

const locationPicker = document.getElementById('locationPicker');
const locationModal = document.getElementById('locationModal');
const locationModalClose = document.getElementById('locationModalClose');
const locationNearMe = document.getElementById('locationNearMe');
const locationSearch = document.getElementById('locationSearch');
const locationList = document.getElementById('locationList');
const locationLabelEl = document.getElementById('locationLabel');

// Set initial label from stored value
if (locationLabelEl) locationLabelEl.textContent = activeCityLabel;
if (activeCity && locationPicker) locationPicker.classList.add('active');

function renderLocationList(filter = '') {
  if (!locationList) return;
  const q = filter.toLowerCase();
  const filtered = q
    ? POPULAR_CITIES.filter(c => c.label.toLowerCase().includes(q) || c.region.toLowerCase().includes(q))
    : POPULAR_CITIES;

  locationList.innerHTML = filtered.map(c => `
    <div class="location-item${c.city === activeCity ? ' active' : ''}" data-city="${c.city}" data-label="${c.label}">
      <span class="location-item-icon">${c.icon}</span>
      <div>
        <div class="location-item-name">${c.label}</div>
        <div class="location-item-region">${c.region}</div>
      </div>
    </div>
  `).join('');

  // If user typed a city not in the list, show it as a custom option
  if (q && !filtered.some(c => c.label.toLowerCase() === q)) {
    const capCity = filter.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    locationList.innerHTML += `
      <div class="location-item" data-city="${capCity}" data-label="${capCity}">
        <span class="location-item-icon">📍</span>
        <div>
          <div class="location-item-name">${capCity}</div>
          <div class="location-item-region">Search for events here</div>
        </div>
      </div>
    `;
  }

  // Attach click handlers
  locationList.querySelectorAll('.location-item').forEach(item => {
    item.addEventListener('click', () => selectLocation(item.dataset.city, item.dataset.label));
  });
}

function selectLocation(city, label) {
  activeCity = city;
  activeCityLabel = label || 'Anywhere';
  localStorage.setItem('flowb-city', city);
  localStorage.setItem('flowb-city-label', activeCityLabel);

  if (locationLabelEl) locationLabelEl.textContent = activeCityLabel;
  if (locationPicker) locationPicker.classList.toggle('active', !!city);

  // Update search placeholder contextually
  if (searchInput) {
    searchInput.placeholder = city
      ? `Search events in ${activeCityLabel}...`
      : 'Search events, organizers, venues...';
  }

  closeLocationModal();

  // Re-fetch events with new location
  displayCount = 18;
  showLoading();
  const params = {};
  if (activeCategory !== 'all') params.mainCategory = activeCategory;
  if (searchQuery) params.query = searchQuery;
  if (activeCity) params.city = activeCity;
  fetchEvents(params).then(events => {
    allEvents = events;
    renderEvents(allEvents);
  });
}

function openLocationModal() {
  if (!locationModal) return;
  locationModal.classList.add('open');
  renderLocationList();
  setTimeout(() => locationSearch && locationSearch.focus(), 200);
}

function closeLocationModal() {
  if (!locationModal) return;
  locationModal.classList.remove('open');
  if (locationSearch) locationSearch.value = '';
}

if (locationPicker) locationPicker.addEventListener('click', openLocationModal);
if (locationModalClose) locationModalClose.addEventListener('click', closeLocationModal);

// Close on backdrop click
if (locationModal) {
  locationModal.addEventListener('click', (e) => {
    if (e.target === locationModal) closeLocationModal();
  });
}

// Location search filtering
if (locationSearch) {
  locationSearch.addEventListener('input', () => {
    renderLocationList(locationSearch.value.trim());
  });
}

// Near Me geolocation
if (locationNearMe) {
  locationNearMe.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    locationNearMe.classList.add('locating');
    const nearMeLabel = locationNearMe.querySelector('span');
    if (nearMeLabel) nearMeLabel.textContent = 'Locating';

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        locationNearMe.classList.remove('locating');
        if (nearMeLabel) nearMeLabel.textContent = 'Near Me';

        // Reverse geocode to city name
        try {
          const { latitude, longitude } = pos.coords;
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`);
          const geoData = await geoRes.json();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.county || 'My Area';
          selectLocation(city, `${city}`);
        } catch {
          // Fallback: just use coordinates label
          selectLocation('', 'Near Me');
        }
      },
      (err) => {
        locationNearMe.classList.remove('locating');
        if (nearMeLabel) nearMeLabel.textContent = 'Near Me';
        if (err.code === err.PERMISSION_DENIED) {
          alert('Location access denied. Please enable location in your browser settings.');
        } else {
          alert('Could not determine your location. Please try again or pick a city.');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
}

// Set placeholder on load if city is set
if (activeCity && searchInput) {
  searchInput.placeholder = `Search events in ${activeCityLabel}...`;
}

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
    displayCount = 18;

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
  displayCount += 18;
  renderEvents(allEvents);
});

// ===================================================================
// FlowB Chat
// ===================================================================

let introStarted = false;

function expandChat() {
  widget.dataset.state = 'expanded';
  // Lock body scroll on mobile only
  if (window.innerWidth <= 480) document.body.style.overflow = 'hidden';
  chatInput.focus();
  awardFirstAction('first_chat_open', 3, 'Chat opened!');
}

function minimizeChat() {
  widget.dataset.state = 'minimized';
  document.body.style.overflow = '';
}

widgetFab.addEventListener('click', () => {
  expandChat();
  // First expand with no messages: run intro or show greeting
  if (chatMessages.children.length === 0 && !introStarted) {
    const seen = localStorage.getItem('flowb-intro-seen');
    if (!seen) {
      introStarted = true;
      runIntroInChat();
    } else {
      addChatMessage("Hey! What can I help you find?", 'bot');
    }
  }
});

panelMinimize.addEventListener('click', minimizeChat);

// Escape key minimizes chat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && widget.dataset.state === 'expanded') {
    minimizeChat();
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
    addChatMessage('You haven\'t joined any crews yet. Head to the [Crews page](/crews) to create or join a crew!', 'bot');
  } else {
    let text = `**Your Crews** (${data.crews.length})\n\n`;
    for (const crew of data.crews) {
      text += `${crew.emoji || ''} **${crew.name}** - ${crew.role || 'member'}\n`;
    }
    text += '\nManage your crews on the [Crews page](/crews)!';
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
    const events = await fetchTonight();

    removeTypingIndicator();

    if (!events.length) {
      addChatMessage("I don't see any events listed for tonight. Check back later or try \"this week\"!", 'bot');
    } else {
      let text = `**Tonight's Events** (${events.length})\n\n`;
      for (const e of events.slice(0, 6)) {
        const time = new Date(e.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const venue = e.venue?.name || e.locationName ? ` at ${e.venue?.name || e.locationName}` : '';
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
  let html = escapeHtml(text);
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
  html = html.replace(/^([-*])\s+(.+)$/gm, '<li>$2</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/^### (.+)$/gm, '<strong style="font-size:14px">$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<strong style="font-size:16px">$1</strong>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/<br><ul>/g, '<ul>');
  html = html.replace(/<\/ul><br>/g, '</ul>');
  html = html.replace(/<br><li>/g, '<li>');
  html = html.replace(/<\/li><br>/g, '</li>');
  return html;
}

function setStatus(status, text) {
  chatStatusText.textContent = text;
  if (status === 'error') {
    chatStatus.classList.add('error');
  } else {
    chatStatus.classList.remove('error');
  }
}

// ===== FlowB Chat (xAI Grok via backend proxy) =====

async function sendToFlowB(userMessage) {
  chatHistory.push({ role: 'user', content: userMessage });

  const messages = chatHistory.slice(-20);

  try {
    const chatHeaders = { 'Content-Type': 'application/json' };
    const jwt = localStorage.getItem('flowb-jwt');
    if (jwt) chatHeaders['Authorization'] = `Bearer ${jwt}`;
    const res = await fetch(`${FLOWB_CHAT_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: chatHeaders,
      body: JSON.stringify({
        messages,
        stream: false,
        user: Points.anonId || 'web-anon',
      }),
    });

    if (!res.ok) {
      throw new Error(`Chat returned ${res.status}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'No response from FlowB.';

    chatHistory.push({ role: 'assistant', content: reply });
    return reply;
  } catch (err) {
    console.warn('[flowb-chat] Error:', err.message);
    throw err;
  }
}

// ===== Local Fallback (when AI unavailable) =====

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
    return `**FlowB** is your AI-powered assistant for discovering events and connecting with your crew. I help you find hackathons, parties, meetups, and more -- all curated and in one place.\n\nTry "categories" to browse events or "tonight" to see what's happening!`;
  }

  if (lower === 'help') {
    return `Here's what I can help with:\n\n**categories** — browse by type\n**browse [type]** — events in a category (defi, ai, infra, build, capital, social, wellness, privacy, art)\n**tonight** — tonight's events\n**week** — this week's events\n**free** — free events only\n**search [query]** — search events\n**points** — check your points\n\nOr just ask me anything!`;
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
      const emoji = CATEGORY_ICONS[cat.icon] || CATEGORY_ICONS[cat.slug] || '';
      text += `${emoji} **${cat.name || cat.slug}** \n`;
    }
    text += '\nSay "browse defi" or "browse ai" to see events.';
    return text;
  }

  if (lower === 'tonight' || /tonight/i.test(lower)) {
    const events = await fetchTonight();
    if (!events.length) return 'No events tonight. Try "week" or "categories".';
    return formatChatEvents(events, "Tonight's Events");
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
    const label = mainCat.charAt(0).toUpperCase() + mainCat.slice(1);
    let events = await fetchEvents({ mainCategory: mainCat, limit: 10 });
    if (!events.length && activeCity) {
      events = await fetchEvents({ mainCategory: mainCat, limit: 10, city: '' });
      if (events.length) {
        return formatChatEvents(events, `${label} Events (all cities)`) +
          `\n\n*No ${label} events in ${activeCityLabel} -- showing all cities.*`;
      }
    }
    if (!events.length) return `No events in "${cat}". Try "categories" to see options.`;
    const suffix = activeCity ? ` in ${activeCityLabel}` : '';
    return formatChatEvents(events, `${label} Events${suffix}`);
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
      const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
      let events = await fetchEvents({ mainCategory: cat, limit: 10 });
      if (!events.length && activeCity) {
        events = await fetchEvents({ mainCategory: cat, limit: 10, city: '' });
        if (events.length) {
          return formatChatEvents(events, `${catLabel} Events (all cities)`) +
            `\n\n*No ${catLabel} events in ${activeCityLabel} -- showing all cities.*`;
        }
      }
      if (events.length) {
        const suffix = activeCity ? ` in ${activeCityLabel}` : '';
        return formatChatEvents(events, `${catLabel} Events${suffix}`);
      }
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

// ===== Send Message (tries backend AI, falls back to local) =====

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
    // Try FlowB backend (xAI Grok)
    const response = await sendToFlowB(cleanMsg);
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
      expandChat();
      sendChatMessage(`Tell me about event ${eventParam}`);
    }, 1500);

    // Clean the URL
    const url = new URL(window.location.href);
    url.searchParams.delete('event');
    window.history.replaceState({}, '', url.toString());
  }
}

// ===== Luma API Health Check =====
async function checkLumaHealth() {
  const statusEl = document.getElementById('lumaStatus');
  const labelEl = document.getElementById('lumaStatusLabel');
  if (!statusEl) return;

  try {
    const res = await fetch(`${API}/api/v1/health/luma`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('Health check failed');
    const data = await res.json();

    statusEl.className = 'luma-status ' + (data.status || 'unknown');
    const discoverMs = data.discover?.latency ? `${data.discover.latency}ms` : '';
    const officialMs = data.official?.latency ? `${data.official.latency}ms` : '';
    const parts = [];
    if (data.discover?.status) parts.push(`Discover: ${data.discover.status}${discoverMs ? ' (' + discoverMs + ')' : ''}`);
    if (data.official?.status) parts.push(`Official: ${data.official.status}${officialMs ? ' (' + officialMs + ')' : ''}`);
    statusEl.title = `Luma API: ${data.status}\n${parts.join('\n')}`;
    labelEl.textContent = data.status === 'ok' ? 'Luma' : data.status === 'degraded' ? 'Luma (degraded)' : 'Luma (down)';
  } catch {
    statusEl.className = 'luma-status down';
    statusEl.title = 'Luma API: unreachable';
    labelEl.textContent = 'Luma (offline)';
  }
}

// ===== FlowB In-Chat Intro (first-visit onboarding) =====

function introWait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runIntroInChat() {
  // Step 1: typing
  addTypingIndicator();
  await introWait(800);
  removeTypingIndicator();

  // Step 2: greeting
  addChatMessage("Hey! I'm **FlowB**", 'bot');
  await introWait(600);

  // Step 3: typing
  addTypingIndicator();
  await introWait(1000);
  removeTypingIndicator();

  // Step 4: description
  addChatMessage("I help you discover events and find what's happening around you.", 'bot');
  await introWait(500);

  // Step 5: typing
  addTypingIndicator();
  await introWait(700);
  removeTypingIndicator();

  // Step 6: question
  addChatMessage("What kind of events are you into?", 'bot');
  await introWait(300);

  // Step 7: category chips as interactive message
  await renderIntroCatMessage();
}

// Intro category groups mapping API slugs to higher-level groups
const INTRO_GROUPS = [
  { label: 'Tech & Dev',   icon: '\uD83D\uDCBB', cats: ['ai', 'infrastructure', 'developer', 'depin', 'hackathon'] },
  { label: 'DeFi & Money', icon: '\uD83D\uDCB0', cats: ['defi', 'stablecoins', 'rwa', 'governance'] },
  { label: 'Social & Fun', icon: '\uD83C\uDF89', cats: ['party', 'social', 'networking', 'food-drink', 'brunch', 'poker'] },
  { label: 'Culture',      icon: '\uD83C\uDFA8', cats: ['nft', 'gaming', 'wellness', 'sports'] },
  { label: 'Learn',        icon: '\uD83D\uDCDA', cats: ['workshop', 'panel', 'demo-day', 'privacy', 'identity'] },
];

async function renderIntroCatMessage() {
  // Use global categories for label lookups
  let cats = categories;
  if (!cats || !cats.length) {
    try {
      const res = await fetch(`${API}/api/v1/categories`);
      const data = await res.json();
      cats = (data.categories || []).map(c => ({
        id: c.slug || c.id,
        emoji: CATEGORY_ICONS[c.icon] || CATEGORY_ICONS[c.slug] || '',
        label: c.name || c.slug,
      }));
    } catch {
      cats = [];
    }
  }

  if (!cats.length) {
    addChatMessage("Browse the events below or ask me anything!", 'bot');
    localStorage.setItem('flowb-intro-seen', '1');
    return;
  }

  // Track which groups and sub-cats are active
  const activeGroups = new Set();
  const activeSubs = new Set();

  const div = document.createElement('div');
  div.className = 'flowb-msg bot';
  div.innerHTML = `
    <div class="flowb-msg-avatar">F</div>
    <div class="flowb-msg-content">
      <div class="flowb-intro-groups"></div>
      <button class="flowb-intro-go-btn" disabled>Show me events</button>
    </div>
  `;
  chatMessages.appendChild(div);

  const groupsEl = div.querySelector('.flowb-intro-groups');
  const goBtn = div.querySelector('.flowb-intro-go-btn');

  function updateGoBtn() {
    goBtn.disabled = activeSubs.size === 0;
  }

  for (const group of INTRO_GROUPS) {
    // Group chip
    const groupWrap = document.createElement('div');
    groupWrap.className = 'flowb-intro-group-wrap';

    const groupChip = document.createElement('button');
    groupChip.className = 'flowb-intro-group';
    groupChip.innerHTML = `<span class="intro-group-icon">${group.icon}</span> ${group.label}`;

    // Sub-category container (hidden initially)
    const subsEl = document.createElement('div');
    subsEl.className = 'flowb-intro-subcats';
    subsEl.style.display = 'none';

    // Build sub-cat chips
    const subChips = [];
    for (const slug of group.cats) {
      const catInfo = cats.find(c => c.id === slug);
      const subChip = document.createElement('button');
      subChip.className = 'flowb-intro-chip selected'; // default selected when group is active
      const emoji = catInfo ? catInfo.emoji : '';
      const label = catInfo ? catInfo.label : slug;
      subChip.innerHTML = `<span class="intro-chip-emoji">${emoji}</span> ${label}`;
      subChip.dataset.slug = slug;
      subChip.addEventListener('click', () => {
        subChip.classList.toggle('selected');
        if (subChip.classList.contains('selected')) {
          activeSubs.add(slug);
        } else {
          activeSubs.delete(slug);
        }
        // If all subs in group deselected, deselect group
        const groupActive = group.cats.some(s => activeSubs.has(s));
        groupChip.classList.toggle('selected', groupActive);
        if (!groupActive) activeGroups.delete(group.label);
        updateGoBtn();
      });
      subChips.push(subChip);
      subsEl.appendChild(subChip);
    }

    groupChip.addEventListener('click', () => {
      const isActive = activeGroups.has(group.label);
      if (isActive) {
        // Deselect group + all its subs
        activeGroups.delete(group.label);
        groupChip.classList.remove('selected');
        subsEl.style.display = 'none';
        group.cats.forEach(s => activeSubs.delete(s));
        subChips.forEach(sc => sc.classList.remove('selected'));
      } else {
        // Select group + all its subs
        activeGroups.add(group.label);
        groupChip.classList.add('selected');
        subsEl.style.display = 'flex';
        group.cats.forEach(s => activeSubs.add(s));
        subChips.forEach(sc => sc.classList.add('selected'));
      }
      updateGoBtn();
      scrollChatToBottom();
    });

    groupWrap.appendChild(groupChip);
    groupWrap.appendChild(subsEl);
    groupsEl.appendChild(groupWrap);
  }

  goBtn.addEventListener('click', async () => {
    if (activeSubs.size === 0) return;
    goBtn.disabled = true;
    goBtn.textContent = 'Loading...';

    // Apply categories to main page
    const selectedSlugs = [...activeSubs];
    localStorage.setItem('flowb-user-cats', JSON.stringify(selectedSlugs));
    const catStr = selectedSlugs.join(',');
    displayCount = 18;
    showLoading();
    const params = { mainCategory: catStr };
    if (activeCity) params.city = activeCity;
    allEvents = await fetchEvents(params);
    renderEvents(allEvents);
    activeCategory = catStr;
    if (catRow) {
      catRow.querySelectorAll('.cat-chip').forEach(btn => {
        btn.classList.toggle('active', activeSubs.has(btn.dataset.cat));
      });
    }

    // Disable interactions
    groupsEl.querySelectorAll('button').forEach(b => { b.style.pointerEvents = 'none'; });
    goBtn.style.display = 'none';

    // Confirmation
    const groupNames = [...activeGroups];
    const nameStr = groupNames.length <= 2 ? groupNames.join(' & ') : groupNames.slice(0, 2).join(', ') + ' & more';

    addTypingIndicator();
    await introWait(500);
    removeTypingIndicator();
    addChatMessage(`Nice -- **${nameStr}**. I've filtered the events for you.`, 'bot');

    await introWait(400);
    addTypingIndicator();
    await introWait(700);
    removeTypingIndicator();
    addChatMessage("How do you want to explore?", 'bot');
    await introWait(200);

    // Discovery paths
    renderIntroDiscoveryPaths(activeSubs);
  });

  scrollChatToBottom();
}

function renderIntroDiscoveryPaths(selectedCats) {
  const paths = [
    { id: 'near-me',   icon: '\uD83D\uDCCD', label: 'Find near me',      desc: 'Use my location' },
    { id: 'plan-trip', icon: '\u2708\uFE0F',  label: 'Plan for a trip',   desc: 'Pick a destination' },
    { id: 'crew',      icon: '\uD83D\uDC65',  label: "Where's my crew",   desc: 'See crew activity' },
  ];

  const div = document.createElement('div');
  div.className = 'flowb-msg bot';
  div.innerHTML = `
    <div class="flowb-msg-avatar">F</div>
    <div class="flowb-msg-content">
      <div class="flowb-intro-paths"></div>
    </div>
  `;
  chatMessages.appendChild(div);

  const pathsEl = div.querySelector('.flowb-intro-paths');
  let pathPicked = false;

  for (const p of paths) {
    const chip = document.createElement('button');
    chip.className = 'flowb-intro-path';
    chip.innerHTML = `<span class="intro-path-icon">${p.icon}</span><span class="intro-path-text"><span class="intro-path-label">${p.label}</span><span class="intro-path-desc">${p.desc}</span></span>`;
    chip.addEventListener('click', async () => {
      if (pathPicked) return;
      pathPicked = true;
      pathsEl.querySelectorAll('.flowb-intro-path').forEach(el => { el.style.pointerEvents = 'none'; });
      chip.classList.add('selected');

      if (p.id === 'near-me') {
        await handleIntroNearMe(selectedCats);
      } else if (p.id === 'plan-trip') {
        addTypingIndicator();
        await introWait(400);
        removeTypingIndicator();
        addChatMessage("Where are you headed?", 'bot');
        await introWait(200);
        renderIntroCityPicker(selectedCats);
      } else if (p.id === 'crew') {
        await handleIntroCrew(selectedCats);
      }
    });
    pathsEl.appendChild(chip);
  }

  scrollChatToBottom();
}

async function handleIntroNearMe(selectedCats) {
  if (!navigator.geolocation) {
    addChatMessage("Your browser doesn't support geolocation. Try picking a city instead!", 'bot');
    await introWait(300);
    renderIntroCityPicker(selectedCats);
    return;
  }

  addTypingIndicator();

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false });
    });
    const { latitude, longitude } = pos.coords;
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`);
    const geoData = await geoRes.json();
    const city = geoData.address?.city || geoData.address?.town || geoData.address?.county || 'My Area';

    selectLocation(city, city);

    // Re-fetch with location + selected cats
    if (selectedCats.size > 0) {
      showLoading();
      const params = { mainCategory: [...selectedCats].join(','), city };
      allEvents = await fetchEvents(params);
      renderEvents(allEvents);
    }

    removeTypingIndicator();
    addChatMessage(`Found you in **${city}**! Events updated.`, 'bot');
  } catch (err) {
    removeTypingIndicator();
    if (err.code === 1) {
      addChatMessage("Location access denied. Let's pick a city instead!", 'bot');
    } else {
      addChatMessage("Couldn't get your location. Let's pick a city instead!", 'bot');
    }
    await introWait(300);
    renderIntroCityPicker(selectedCats);
    return;
  }

  await introWait(300);
  addChatMessage("You're all set! Browse events below, or ask me anything here.", 'bot');
  localStorage.setItem('flowb-intro-seen', '1');
}

async function handleIntroCrew(selectedCats) {
  addTypingIndicator();
  await introWait(500);
  removeTypingIndicator();

  if (!Auth.isAuthenticated) {
    addChatMessage("Sign in to see your crew! Click the **Sign In** button at the top, then come back to chat.", 'bot');
    localStorage.setItem('flowb-intro-seen', '1');
    return;
  }

  const data = await fetchAuthed('/api/v1/flow/crews');
  if (!data || !data.crews || !data.crews.length) {
    addChatMessage("You haven't joined any crews yet. Head to the [Crews page](/crews) to create or join one!\n\nMeanwhile, browse events below or ask me anything.", 'bot');
  } else {
    let text = `**Your Crews** (${data.crews.length})\n\n`;
    for (const crew of data.crews) {
      text += `${crew.emoji || ''} **${crew.name}** - ${crew.role || 'member'}\n`;
    }
    text += '\nBrowse events below, or ask me anything here!';
    addChatMessage(text, 'bot');
  }

  localStorage.setItem('flowb-intro-seen', '1');
}

function renderIntroCityPicker(selectedCats) {
  const topCities = [
    { city: 'Denver', icon: '\uD83C\uDFD4\uFE0F', label: 'Denver' },
    { city: 'New York', icon: '\uD83D\uDDFD', label: 'New York' },
    { city: 'San Francisco', icon: '\uD83C\uDF09', label: 'SF' },
    { city: 'Austin', icon: '\uD83E\uDD20', label: 'Austin' },
    { city: 'Miami', icon: '\uD83C\uDF0A', label: 'Miami' },
    { city: 'London', icon: '\uD83C\uDDEC\uD83C\uDDE7', label: 'London' },
    { city: 'Berlin', icon: '\uD83C\uDDE9\uD83C\uDDEA', label: 'Berlin' },
    { city: 'Lisbon', icon: '\uD83C\uDDF5\uD83C\uDDF9', label: 'Lisbon' },
    { city: '', icon: '\uD83C\uDF0D', label: 'Anywhere' },
  ];

  const div = document.createElement('div');
  div.className = 'flowb-msg bot';
  div.innerHTML = `
    <div class="flowb-msg-avatar">F</div>
    <div class="flowb-msg-content">
      <div class="flowb-intro-chips"></div>
    </div>
  `;
  chatMessages.appendChild(div);

  const chipsEl = div.querySelector('.flowb-intro-chips');
  let locationPicked = false;

  for (const c of topCities) {
    const chip = document.createElement('button');
    chip.className = 'flowb-intro-chip';
    if (c.city === activeCity || (!c.city && !activeCity)) chip.classList.add('selected');
    chip.innerHTML = `<span class="intro-chip-emoji">${c.icon}</span> ${c.label}`;
    chip.addEventListener('click', async () => {
      if (locationPicked) return;
      locationPicked = true;

      chipsEl.querySelectorAll('.flowb-intro-chip').forEach(el => el.classList.remove('selected'));
      chip.classList.add('selected');
      chipsEl.querySelectorAll('.flowb-intro-chip').forEach(el => { el.style.pointerEvents = 'none'; });

      // Apply location
      selectLocation(c.city, c.label === 'Anywhere' ? 'Anywhere' : c.label);

      // Re-fetch with new city + selected cats
      if (selectedCats.size > 0) {
        showLoading();
        const params = { mainCategory: [...selectedCats].join(',') };
        if (c.city) params.city = c.city;
        allEvents = await fetchEvents(params);
        renderEvents(allEvents);
      }

      // Final message
      addTypingIndicator();
      await introWait(400);
      removeTypingIndicator();
      addChatMessage("You're all set! Browse events below, or ask me anything here.", 'bot');

      localStorage.setItem('flowb-intro-seen', '1');
    });
    chipsEl.appendChild(chip);
  }

  scrollChatToBottom();
}

// ===== Init =====
(async () => {
  awardPoints(1, 'Daily visit', 'info');
  awardFirstAction('first_visit', 5, 'Welcome to FlowB!');

  // Handle event URL parameter from smart short links
  handleEventUrlParam();

  // First-visit: auto-expand chat panel after 1.5s
  if (!localStorage.getItem('flowb-intro-seen')) {
    setTimeout(() => {
      if (widget.dataset.state === 'minimized') {
        introStarted = true;
        expandChat();
        runIntroInChat();
      }
    }, 1500);
  }

  // Read URL params (from FlowB web links)
  const urlParams = new URLSearchParams(window.location.search);
  const paramSearch = urlParams.get('search');
  const paramCategory = urlParams.get('category');
  const paramFilter = urlParams.get('filter');
  const paramCity = urlParams.get('city');
  const paramAll = urlParams.get('all') === 'true';

  // If "All Events" mode, show everything
  if (paramAll) {
    displayCount = 999;
  }

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
  if (paramAll) initParams.limit = 200;

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

  // Check FlowB chat backend availability
  try {
    const res = await fetch(`${FLOWB_CHAT_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      setStatus('ok', 'connected');
    } else {
      setStatus('ok', 'local mode');
    }
  } catch {
    setStatus('ok', 'local mode');
  }

  // Check Luma API health
  checkLumaHealth();
})();

// ===================================================================
// Submit Event Modal
// ===================================================================

(function initSubmitEvent() {
  const btn = document.getElementById('submitEventBtn');
  const modal = document.getElementById('submitModal');
  const backdrop = document.getElementById('submitModalBackdrop');
  const closeBtn = document.getElementById('submitModalClose');
  const form = document.getElementById('submitEventForm');
  if (!btn || !modal) return;

  function openSubmitModal() {
    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // Auto-fill city from current selection
    const cityInput = document.getElementById('submitCity');
    if (cityInput && activeCity) cityInput.value = activeCity;
  }

  function closeSubmitModal() {
    modal.classList.add('hidden');
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', openSubmitModal);
  closeBtn.addEventListener('click', closeSubmitModal);
  backdrop.addEventListener('click', closeSubmitModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeSubmitModal();
    }
  });

  // When URL is pasted, auto-fill title hint
  const urlInput = document.getElementById('submitUrl');
  const titleInput = document.getElementById('submitTitle');
  if (urlInput && titleInput) {
    urlInput.addEventListener('input', () => {
      if (urlInput.value.trim()) {
        titleInput.removeAttribute('required');
        titleInput.placeholder = 'Optional if URL provided';
      } else {
        titleInput.setAttribute('required', '');
        titleInput.placeholder = 'My awesome event';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const url = document.getElementById('submitUrl').value.trim();
    const title = document.getElementById('submitTitle').value.trim();
    const date = document.getElementById('submitDate').value;
    const time = document.getElementById('submitTime').value;
    const venue = document.getElementById('submitVenue').value.trim();
    const city = document.getElementById('submitCity').value.trim();
    const desc = document.getElementById('submitDesc').value.trim();
    const isFree = document.getElementById('submitFree').checked;
    const name = document.getElementById('submitName').value.trim();

    if (!url && !title) {
      alert('Please provide an event URL or title.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    let startTime = null;
    if (date) {
      startTime = time ? `${date}T${time}:00` : `${date}T00:00:00`;
    }

    const body = {
      url: url || undefined,
      title: title || undefined,
      startTime,
      venue: venue || undefined,
      city: city || 'Denver',
      description: desc || undefined,
      isFree,
      submitterName: name || undefined,
    };

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/api/v1/events/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        submitBtn.textContent = 'Submitted!';
        submitBtn.style.background = 'var(--green)';
        awardPoints(5, 'Event submitted');
        setTimeout(() => {
          closeSubmitModal();
          form.reset();
          submitBtn.textContent = 'Submit Event';
          submitBtn.style.background = '';
          submitBtn.disabled = false;
          // Refresh events to show the new one
          selectCategory(activeCategory);
        }, 1500);
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
        submitBtn.textContent = 'Submit Event';
        submitBtn.disabled = false;
      }
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Network error. Please try again.');
      submitBtn.textContent = 'Submit Event';
      submitBtn.disabled = false;
    }
  });
})();
