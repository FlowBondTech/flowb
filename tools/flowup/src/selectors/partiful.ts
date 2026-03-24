/**
 * Centralized CSS selectors and URL patterns for Partiful.
 * Partiful is a Next.js app - selectors may change with updates.
 * Keep this file as the single source of truth for all DOM queries.
 */

// ============================================================================
// URL Patterns
// ============================================================================

export const URLS = {
  base: "https://partiful.com",
  discover: (city: string) => `https://partiful.com/discover/${city}`,
  event: (id: string) => `https://partiful.com/e/${id}`,
  createEvent: "https://partiful.com/create",
  login: "https://partiful.com/login",
  home: "https://partiful.com/home",
} as const;

// ============================================================================
// City Slugs (Partiful's full set)
// ============================================================================

export const CITY_SLUGS: Record<string, string> = {
  "new york": "nyc",
  nyc: "nyc",
  "los angeles": "la",
  la: "la",
  "san francisco": "sf",
  sf: "sf",
  boston: "boston",
  "washington dc": "dc",
  dc: "dc",
  chicago: "chicago",
  london: "london",
  miami: "miami",
  austin: "austin",
};

export const ALL_DISCOVER_SLUGS = [
  "nyc", "la", "sf", "boston", "dc", "chicago", "london", "miami", "austin",
];

export const SLUG_TO_CITY: Record<string, string> = {
  nyc: "New York",
  la: "Los Angeles",
  sf: "San Francisco",
  boston: "Boston",
  dc: "Washington DC",
  chicago: "Chicago",
  london: "London",
  miami: "Miami",
  austin: "Austin",
};

// ============================================================================
// Auth Selectors
// ============================================================================

export const AUTH = {
  /** Indicators that user is logged in */
  loggedIn: [
    '[data-testid="user-avatar"]',
    '[data-testid="profile-button"]',
    'a[href="/home"]',
    'a[href*="/settings"]',
  ],
  /** Login page elements */
  phoneInput: 'input[type="tel"]',
  emailInput: 'input[type="email"]',
  submitButton: 'button[type="submit"]',
  codeInput: 'input[inputmode="numeric"]',
} as const;

// ============================================================================
// Discover Page Selectors
// ============================================================================

export const DISCOVER = {
  /** Event card on discover page */
  eventCard: 'a[href^="/e/"]',
  /** Event title within card */
  eventTitle: "h3, h2, [class*='title'], [class*='Title']",
  /** Event date within card */
  eventDate: "[class*='date'], [class*='Date'], time",
  /** Event location within card */
  eventLocation: "[class*='location'], [class*='Location'], [class*='venue']",
  /** Event image */
  eventImage: "img[src*='partiful'], img[class*='cover'], img[class*='event']",
  /** Host name */
  hostName: "[class*='host'], [class*='Host'], [class*='organizer']",
  /** RSVP count */
  rsvpCount: "[class*='guest'], [class*='Guest'], [class*='rsvp'], [class*='attendee']",
} as const;

// ============================================================================
// Event Page Selectors
// ============================================================================

export const EVENT_PAGE = {
  /** Event title on detail page */
  title: "h1, [class*='eventTitle'], [class*='EventTitle']",
  /** RSVP / Going button */
  rsvpButton: "button:has-text('RSVP'), button:has-text('Going'), button:has-text('Interested'), button:has-text('Join')",
  /** Already RSVP'd indicator */
  rsvpStatus: "[class*='rsvpStatus'], [class*='RsvpStatus'], button[class*='going'], button[class*='Going']",
  /** Maybe button */
  maybeButton: "button:has-text('Maybe'), button:has-text('Interested')",
  /** Going button specifically */
  goingButton: "button:has-text('Going'), button:has-text('RSVP'), button:has-text('Join')",
  /** Message / note input for RSVP */
  rsvpMessage: "textarea[placeholder*='message'], textarea[placeholder*='note'], input[placeholder*='message']",
  /** Submit RSVP confirmation */
  rsvpSubmit: "button:has-text('Submit'), button:has-text('Confirm'), button:has-text('Done')",
  /** Invite button */
  inviteButton: "button:has-text('Invite'), button:has-text('Share'), a:has-text('Invite')",
  /** Invite input (phone/email) */
  inviteInput: "input[placeholder*='phone'], input[placeholder*='email'], input[placeholder*='name'], input[type='tel'], input[type='email']",
  /** Send invite button */
  inviteSend: "button:has-text('Send'), button:has-text('Invite'), button:has-text('Add')",
  /** Event description */
  description: "[class*='description'], [class*='Description'], [class*='details']",
  /** Event date/time */
  dateTime: "[class*='date'], [class*='Date'], time, [class*='when']",
  /** Event location */
  location: "[class*='location'], [class*='Location'], [class*='venue'], [class*='where']",
} as const;

// ============================================================================
// Create Event Selectors
// ============================================================================

export const CREATE = {
  /** Event title input */
  titleInput: "input[placeholder*='title'], input[placeholder*='name'], input[name='title']",
  /** Description input */
  descriptionInput: "textarea[placeholder*='description'], textarea[placeholder*='details'], [contenteditable='true']",
  /** Date input */
  dateInput: "input[type='date'], input[placeholder*='date'], button:has-text('Date')",
  /** Start time input */
  startTimeInput: "input[type='time'], input[placeholder*='start'], button:has-text('Start')",
  /** End time input */
  endTimeInput: "input[placeholder*='end'], button:has-text('End')",
  /** Location input */
  locationInput: "input[placeholder*='location'], input[placeholder*='address'], input[placeholder*='venue']",
  /** Publish / Create button */
  publishButton: "button:has-text('Publish'), button:has-text('Create'), button:has-text('Done')",
  /** Cover image upload */
  coverImageInput: "input[type='file']",
} as const;

// ============================================================================
// Common / Shared
// ============================================================================

export const COMMON = {
  /** Cookie consent / modal dismiss */
  dismissModal: "button:has-text('Accept'), button:has-text('Got it'), button:has-text('Close'), [aria-label='Close']",
  /** Loading indicator */
  loading: "[class*='loading'], [class*='spinner'], [class*='skeleton']",
  /** Next.js data script */
  nextData: "script#__NEXT_DATA__",
} as const;

// ============================================================================
// Helpers
// ============================================================================

/** Extract event ID from a Partiful URL. */
export function extractEventId(url: string): string | null {
  const match = url.match(/partiful\.com\/e\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/** Check if a URL is a Partiful event page. */
export function isEventUrl(url: string): boolean {
  return /partiful\.com\/e\/[a-zA-Z0-9]+/.test(url);
}

/** Resolve a city name to its Partiful slug. */
export function resolveCity(input: string): string | null {
  const lower = input.toLowerCase().trim();
  return CITY_SLUGS[lower] || (ALL_DISCOVER_SLUGS.includes(lower) ? lower : null);
}
