# Kanban Board Research: Libraries, Patterns, and Best Practices

**Date**: 2026-03-04
**Purpose**: Evaluate the best approach for building a production-quality Kanban board with drag-and-drop, mobile-first responsive design, shadcn/ui integration, real-time notifications, and user assignment with mentions/pings.

---

## Executive Summary

1. **Best DnD approach**: Use the **shadcn-kanban-board** zero-dependency registry component (pure React, no library overhead) as the base, with **@dnd-kit** as the fallback/upgrade path for complex scenarios
2. **Best pre-built component**: **Dice UI (@diceui/kanban)** -- installable via shadcn CLI, built on dnd-kit + Radix primitives, full accessibility
3. **Best notifications stack**: **Novu** (open-source) for in-app bell + email + push, or lightweight custom WebSocket approach with Socket.io
4. **Best mentions library**: **react-mentions-ts** (TypeScript-first, Tailwind v4 support, mobile-friendly)

---

## 1. Drag-and-Drop Library Comparison

### Option A: Zero-Dependency Pure React (RECOMMENDED for shadcn projects)

**Package**: `shadcn-kanban-board` via shadcn registry
**Install**: `npx shadcn@latest add https://shadcn-kanban-board.com/r/kanban.json`
**Author**: janhesters
**GitHub**: https://github.com/janhesters/shadcn-kanban-board

| Metric | Value |
|--------|-------|
| Bundle overhead | ~0 KB (pure React, no library) |
| Accessibility | WCAG 2.2 AAA, full keyboard nav, screen reader announcements |
| Touch support | Native pointer events |
| Framework support | React Router v7 actions, Next.js Server Actions, local state |
| Theming | Auto-inherits shadcn/ui CSS variables |

**Components exposed**:
- `KanbanBoardProvider` -- wraps board hierarchy
- `<KanbanBoard>` -- main container
- `<KanbanBoardColumnSkeleton>` -- loading state
- `KanbanColorCircle` -- color indicators
- `useJsLoaded()` -- performance guard (skeleton until JS loads)
- `useDndEvents()` -- all mouse/keyboard drag interactions

**Key features**:
- Space/Enter to pick up and drop, arrow keys to move, Escape to cancel
- Inline editing via Input/Textarea
- Auto-scroll to keep latest column visible
- Screen-reader announcements on drag events
- Custom DnD monitors and announcement handlers
- Uses `@paralleldrive/cuid2` for stable ID generation

**Pros**:
- Zero external dependencies (no react-beautiful-dnd, no dnd-kit)
- Smallest possible bundle impact
- Seamless shadcn/ui theming out of the box
- Drop-in registry install via `npx shadcn@latest add`

**Cons**:
- Less battle-tested than dnd-kit for complex scenarios
- No built-in grid layout support
- Custom DnD engine means custom bugs to debug

---

### Option B: @dnd-kit (BEST for complex/custom scenarios)

**Package**: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
**Weekly downloads**: ~4.7-8M (dominant in the ecosystem)
**Bundle size**: ~10KB gzipped, zero external dependencies
**GitHub**: https://github.com/clauderic/dnd-kit

| Metric | Value |
|--------|-------|
| Bundle size | ~10KB gzipped |
| Accessibility | Built-in keyboard + screen reader |
| Touch support | Extensible sensor system (mouse, touch, keyboard) |
| API style | Headless hook-based toolkit |
| Maintenance | Active, major refactor underway (framework-agnostic rewrite) |

**Architecture**:
```
@dnd-kit/core         -- DndContext, sensors, collision detection
@dnd-kit/sortable     -- SortableContext, useSortable hook
@dnd-kit/modifiers    -- restrict movement, snap to grid
@dnd-kit/utilities    -- CSS utilities, transforms
```

**Pre-built shadcn integration**:
- `@diceui/kanban` (Dice UI) -- `npx shadcn@latest add @diceui/kanban`
- Georgegriff's template: https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui

**Pros**:
- Most flexible: grid support, custom animations, fine-grained control
- Lightweight (~10KB) with hook-based composable API
- Largest community and ecosystem
- Framework-agnostic rewrite coming (vanilla JS, Vue, SolidJS support)

**Cons**:
- Steeper learning curve, more boilerplate
- Major refactor means potential breaking API changes ahead
- Some unaddressed issues while maintainer focuses on rewrite

**Maintenance note**: Creator Clauderic Demers confirmed "I'm still actively working on this library" but is focused on a significant framework-agnostic rewrite. The experimental branch and Storybook show active development. Expect breaking API changes when v2 launches.

---

### Option C: @hello-pangea/dnd (BEST for quick list-based kanban)

**Package**: `@hello-pangea/dnd`
**Weekly downloads**: ~546K
**Bundle size**: ~30KB gzipped (heavier, requires full package import)
**GitHub**: https://github.com/hello-pangea/dnd
**Origin**: Community fork of react-beautiful-dnd after Atlassian abandoned it

| Metric | Value |
|--------|-------|
| Bundle size | ~30KB gzipped |
| Accessibility | Full out-of-box keyboard + screen reader |
| Touch support | Native mouse, keyboard, touch |
| API style | High-level, pre-built, opinionated |
| Maintenance | Active community fork |

**Key components**:
- `DragDropContext` -- wraps entire drag system
- `Droppable` -- defines drop zones (columns)
- `Draggable` -- wraps draggable items (cards)

**Pros**:
- Fastest time-to-implementation -- minimal setup
- "Feels natural and intuitive" -- physics-based animations, smooth placeholders
- Multi-drag support (Ctrl/Cmd to select multiple items)
- Battle-tested (fork of Atlassian's react-beautiful-dnd)
- Best documentation of all options

**Cons**:
- Heaviest bundle (~30KB gzipped, must import entire package)
- Strictly designed for lists -- no grid layout support
- Limited customization compared to dnd-kit
- Not composable/headless -- harder to customize deeply

---

### Option D: @atlassian/pragmatic-drag-and-drop (LIGHTWEIGHT alternative)

**Package**: `@atlassian/pragmatic-drag-and-drop`
**Bundle size**: ~5KB gzipped
**Maintenance**: Active (Atlassian)

**Pros**: Ultra-lightweight, framework-agnostic, accessibility-focused
**Cons**: Sparse documentation, emerging community, limited visual feedback OOB, steeper learning curve

---

### Comparison Matrix

| Criteria | Zero-Dep (shadcn) | dnd-kit | hello-pangea | pragmatic |
|----------|-------------------|---------|--------------|-----------|
| Bundle size | 0KB extra | ~10KB | ~30KB | ~5KB |
| Setup time | 5 min | 30 min | 15 min | 45 min |
| Flexibility | Medium | High | Low | High |
| Mobile/touch | Good | Excellent | Good | Good |
| Accessibility | AAA | AA+ | AA+ | AA |
| shadcn integration | Native | Via Dice UI | Manual | Manual |
| Grid support | No | Yes | No | Yes |
| Community size | Small | Largest | Medium | Growing |
| Maintenance risk | Low (pure React) | Medium (rewrite) | Low (stable fork) | Low (Atlassian) |
| Learning curve | Low | Medium-High | Low | High |

### RECOMMENDATION

For a FlowB kanban feature:
1. **Start with**: shadcn-kanban-board zero-dep approach (fastest, cleanest shadcn integration)
2. **Upgrade path**: If you need complex grid layouts or custom sensors, migrate to @diceui/kanban (dnd-kit based, also shadcn registry installable)
3. **Avoid**: hello-pangea/dnd (bundle bloat not justified for the marginal ease-of-use gain)

---

## 2. Pre-Built Shadcn Kanban Components

### Dice UI Kanban (@diceui/kanban) -- RECOMMENDED pre-built

**Install**: `npx shadcn@latest add @diceui/kanban`
**Built on**: dnd-kit + Radix UI primitives
**Docs**: https://www.diceui.com/docs/components/radix/kanban

**Component API**:
```tsx
<Kanban value={columns} onValueChange={handleChange} getItemValue={(item) => item.id}>
  <KanbanBoard>
    {columns.map(col => (
      <KanbanColumn key={col.id}>
        <KanbanColumnHandle /> {/* drag handle for columns */}
        {col.items.map(item => (
          <KanbanItem key={item.id}>
            <KanbanItemHandle /> {/* optional drag handle */}
            {/* card content */}
          </KanbanItem>
        ))}
      </KanbanColumn>
    ))}
  </KanbanBoard>
  <KanbanOverlay /> {/* portal-rendered drag preview */}
</Kanban>
```

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `value` | `Record<UniqueIdentifier, T[]>` | Column data |
| `onValueChange` | `(value) => void` | Callback on move |
| `getItemValue` | `(item) => UniqueIdentifier` | Extract unique ID |
| `strategy` | `SortableContextProps["strategy"]` | Sorting algorithm |
| `orientation` | `"horizontal" \| "vertical"` | Layout direction |
| `flatCursor` | `boolean` | Disable grab cursor |
| `onMove` | `(event) => void` | Custom move handler |

**Dependencies installed**:
- `@dnd-kit/core`
- `@dnd-kit/modifiers`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`
- `@radix-ui/react-slot`

**Features**:
- Mouse, touch, and keyboard sensors
- Collision detection (pointer proximity + rectangle intersection)
- Cross-column dragging
- Column reordering
- Keyboard navigation (arrow keys during drag)
- Accessibility announcements (screen reader feedback)
- React Context-based state management

---

### Kibo UI Kanban

**Site**: https://www.kibo-ui.com/
**Style**: Composable, accessible, extensible -- designed for shadcn/ui
**License**: Free, open source
Another viable option in the shadcn ecosystem but less documented than Dice UI.

---

### Georgegriff Template

**Demo**: https://georgegriff.github.io/react-dnd-kit-tailwind-shadcn-ui/
**GitHub**: https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui
**Stack**: React + dnd-kit + Tailwind + shadcn/ui
**License**: MIT

Good reference implementation but not an installable component -- more of a starter template.

---

## 3. Mobile-First Kanban UX Patterns

### Critical Mobile Design Principles

**Touch targets**:
- Minimum 44x44px tap target size (Apple + Google recommendation)
- Adequate spacing between clickable elements to prevent mis-taps
- Buttons sized for fingers, not mouse cursors

**Card design**:
- Cards readable without zooming
- Organize content into digestible chunks
- Support custom fields and rich content without looking generic
- Visual hierarchy: title > assignee > labels > due date

**Column navigation (mobile)**:
- Swipe left/right to reveal adjacent columns (swim lane pattern)
- Single column view with horizontal swipe navigation
- Smooth drag-and-drop between visible columns
- Long-press for quick actions menu
- Swipe-to-complete for common operations

**Performance requirements**:
- App launch in under 2 seconds
- Add a task in 5 seconds or less
- No waiting for sync
- No nested menu navigation between thought and action

### Responsive Layout Strategy

```
Desktop (>1024px):  All columns visible side-by-side
Tablet (768-1024px): 2-3 columns visible, horizontal scroll
Mobile (<768px):    Single column view with swipe navigation
                    OR stacked columns with collapse/expand
```

### 2026 Mobile Trends to Incorporate

1. **Anticipatory design**: Predict next action and reshape interface accordingly
2. **Micro-interactions**: Subtle animations and haptic feedback on task completion
3. **AI suggestions**: Smart task prioritization, automatic categorization
4. **Widget support**: Home screen widgets for quick task views
5. **Gesture-first**: Swipe, long-press, drag replace taps and menus
6. **View switching**: List, board, timeline views depending on context

### Mobile Kanban Implementation Pattern

```tsx
// Mobile-first column layout
const KanbanMobile = () => {
  const [activeColumn, setActiveColumn] = useState(0);

  return (
    <div className="relative overflow-hidden">
      {/* Column indicator dots */}
      <div className="flex justify-center gap-2 py-2">
        {columns.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              i === activeColumn ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Swipeable column container */}
      <div
        className="flex transition-transform duration-300"
        style={{ transform: `translateX(-${activeColumn * 100}%)` }}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        {columns.map(col => (
          <div key={col.id} className="w-full flex-shrink-0 px-4">
            <ColumnHeader>{col.name}</ColumnHeader>
            <div className="space-y-3 overflow-y-auto max-h-[70vh]">
              {col.cards.map(card => (
                <KanbanCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 4. Real-Time Notifications

### Option A: Novu (RECOMMENDED for production)

**Package**: `@novu/node` (server), `@novu/notification-center-react` (client)
**Type**: Open-source notification infrastructure
**GitHub**: https://github.com/novuhq/novu

**Channels supported**:
- In-App (bell icon with WebSocket real-time delivery)
- Email
- SMS
- Push notifications
- Chat (Slack, Discord, Teams)

**React integration**:
```tsx
import { NovuProvider, PopoverNotificationCenter, NotificationBell } from '@novu/notification-center-react';

<NovuProvider subscriberId={userId} applicationIdentifier={APP_ID}>
  <PopoverNotificationCenter>
    {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
  </PopoverNotificationCenter>
</NovuProvider>
```

**Server-side** (Node.js):
```ts
import { Novu } from '@novu/node';
const novu = new Novu(API_KEY);

await novu.trigger('task-assigned', {
  to: { subscriberId: assigneeUserId },
  payload: {
    taskTitle: 'Fix login bug',
    assignedBy: 'koH',
    boardName: 'Sprint 42',
  },
});
```

**Pros**: Full notification infrastructure, multi-channel, open-source, self-hostable
**Cons**: Additional infrastructure to manage, heavier setup

---

### Option B: Custom WebSocket with Socket.io (LIGHTWEIGHT)

For a simpler approach, especially if FlowB already has a WebSocket layer:

```ts
// Server
io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);

  // When a card is assigned
  function notifyAssignment(card, assigneeId) {
    io.to(`user:${assigneeId}`).emit('notification', {
      type: 'task-assigned',
      title: `You were assigned to "${card.title}"`,
      cardId: card.id,
      boardId: card.boardId,
      timestamp: Date.now(),
    });
  }
});

// Client
socket.on('notification', (data) => {
  // Update notification bell count
  // Show toast notification
  // Play sound if user preference allows
});
```

**Pros**: Minimal dependencies, full control, integrates with existing infra
**Cons**: Must build bell UI, notification storage, read/unread state yourself

---

### Option C: Supabase Realtime (BEST for FlowB)

Since FlowB already uses Supabase, leverage its built-in realtime:

```ts
// Subscribe to notifications table changes
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'flowb_notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Handle new notification
    showToast(payload.new);
    incrementBellCount();
  })
  .subscribe();
```

**Pros**: Zero additional infrastructure (already using Supabase), built into existing stack
**Cons**: Limited to Supabase's realtime capabilities, no multi-channel OOB

---

## 5. User Assignment with @Mentions

### Option A: react-mentions-ts (RECOMMENDED)

**Package**: `react-mentions-ts`
**GitHub**: https://github.com/hbmartin/react-mentions-ts

**Features**:
- TypeScript-first with full type safety
- React 19 compatible
- Tailwind v4 support
- Flexible triggers (@ for users, # for tags, etc.)
- Async data loading for user search
- Smart suggestions with caret awareness
- Accessibility support
- SSR compatible
- Mobile friendly

**Usage**:
```tsx
import { MentionsInput, Mention } from 'react-mentions-ts';

<MentionsInput
  value={comment}
  onChange={(e, newValue, newPlaintext, mentions) => {
    setComment(newValue);
    // mentions = [{ id: 'user_123', display: 'koH' }]
  }}
  className="mentions-input"
>
  <Mention
    trigger="@"
    data={async (search) => {
      const users = await fetchTeamMembers(search);
      return users.map(u => ({ id: u.id, display: u.name }));
    }}
    renderSuggestion={(suggestion) => (
      <div className="flex items-center gap-2 p-2">
        <Avatar src={suggestion.avatar} size="sm" />
        <span>{suggestion.display}</span>
      </div>
    )}
  />
</MentionsInput>
```

---

### Option B: react-mentions (CLASSIC, wider adoption)

**Package**: `react-mentions`
**GitHub**: https://github.com/signavio/react-mentions
**Weekly downloads**: High (used by Wix, Swat.io, Evite, Publer, Kontentino)

Same API as react-mentions-ts but JavaScript-first. Less TypeScript ergonomics.

---

### Mentions + Notifications Flow

```
User types "@koH" in comment
  -> MentionsInput parses mention
  -> On submit: extract mentioned user IDs from markup
  -> Backend: create notification for each mentioned user
  -> Supabase Realtime / WebSocket delivers notification
  -> Mentioned user sees bell icon badge + toast
  -> Clicking notification navigates to card/comment
```

---

## 6. Recommended Tech Stack Summary

### Core Kanban

| Layer | Package | Rationale |
|-------|---------|-----------|
| Kanban base | `shadcn-kanban-board` via registry | Zero-dep, native shadcn theming, accessible |
| Upgrade path | `@diceui/kanban` | dnd-kit based, also shadcn registry, more features |
| ID generation | `@paralleldrive/cuid2` | Collision-resistant, URL-safe IDs |
| Styling | Tailwind CSS + shadcn/ui | Already in FlowB stack |

### Notifications

| Layer | Package | Rationale |
|-------|---------|-----------|
| Real-time transport | Supabase Realtime | Already in stack, zero new infra |
| In-app bell | Custom (shadcn Popover + Badge) | Lightweight, matches existing UI |
| Email fallback | Existing email-digest service | Already built (`src/services/email-digest.ts`) |
| Push (future) | Novu or web-push | Add when needed |

### Mentions & Assignment

| Layer | Package | Rationale |
|-------|---------|-----------|
| @mention input | `react-mentions-ts` | TypeScript, Tailwind, mobile-friendly |
| User search | Supabase `flowb_users` query | Already in stack |
| Assignment UI | shadcn Avatar + Command palette | Consistent with existing design |

### Mobile Responsiveness

| Pattern | Implementation |
|---------|---------------|
| Column navigation | Swipe-based single column view on mobile |
| Touch targets | min 44x44px, adequate spacing |
| Card design | Compact with expandable detail |
| Quick actions | Long-press context menu |
| View switching | Board / List / Timeline toggle |

---

## 7. Implementation Architecture

### Database Schema (Supabase)

```sql
-- Kanban boards
CREATE TABLE flowb_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,  -- user_id format: telegram_{id} / farcaster_{fid}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columns within boards
CREATE TABLE flowb_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES flowb_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL,
  color TEXT,  -- CSS color variable
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards (tasks)
CREATE TABLE flowb_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID REFERENCES flowb_columns(id) ON DELETE CASCADE,
  board_id UUID REFERENCES flowb_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL,
  assignee_ids TEXT[] DEFAULT '{}',
  labels TEXT[] DEFAULT '{}',
  due_date TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments with mentions
CREATE TABLE flowb_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES flowb_cards(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,  -- raw text with @[username](user_id) markup
  mentioned_user_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE flowb_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'assigned', 'mentioned', 'comment', 'moved', 'due_soon'
  title TEXT NOT NULL,
  body TEXT,
  card_id UUID REFERENCES flowb_cards(id) ON DELETE CASCADE,
  board_id UUID REFERENCES flowb_boards(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE flowb_notifications;

-- Indexes
CREATE INDEX idx_cards_column ON flowb_cards(column_id, position);
CREATE INDEX idx_cards_board ON flowb_cards(board_id);
CREATE INDEX idx_notifications_user ON flowb_notifications(user_id, read, created_at DESC);
CREATE INDEX idx_comments_card ON flowb_card_comments(card_id, created_at);
```

### Optimistic Update Pattern for Drag-and-Drop

```ts
// When card is dragged to new column/position
async function handleCardMove(
  cardId: string,
  fromColumnId: string,
  toColumnId: string,
  newPosition: number
) {
  // 1. Optimistic local state update (instant UI feedback)
  setColumns(prev => {
    const updated = structuredClone(prev);
    const card = removeCardFromColumn(updated, fromColumnId, cardId);
    insertCardInColumn(updated, toColumnId, card, newPosition);
    return updated;
  });

  // 2. Async backend sync
  try {
    await supabase.from('flowb_cards').update({
      column_id: toColumnId,
      position: newPosition,
      updated_at: new Date().toISOString(),
    }).eq('id', cardId);

    // 3. Recalculate positions for affected cards
    await reorderColumnPositions(toColumnId);
    if (fromColumnId !== toColumnId) {
      await reorderColumnPositions(fromColumnId);
    }
  } catch (error) {
    // 4. Rollback on failure
    refetchBoard();
    toast.error('Failed to move card');
  }
}
```

---

## 8. NPM Packages Quick Reference

### Must-Have
```json
{
  "@paralleldrive/cuid2": "^2.2.2",
  "react-mentions-ts": "^5.0.0"
}
```

### Install via shadcn Registry (not npm)
```bash
npx shadcn@latest add https://shadcn-kanban-board.com/r/kanban.json
npx shadcn@latest add https://shadcn-kanban-board.com/r/use-js-loaded.json
```

### Alternative (if dnd-kit approach preferred)
```bash
npx shadcn@latest add @diceui/kanban
# This auto-installs: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/modifiers, @dnd-kit/utilities
```

### Optional (for richer features)
```json
{
  "@novu/node": "^2.0.0",
  "@novu/notification-center-react": "^0.25.0"
}
```

---

## 9. Key References and Demos

- shadcn-kanban-board zero-dep: https://github.com/janhesters/shadcn-kanban-board
- Dice UI kanban (dnd-kit + shadcn): https://www.diceui.com/docs/components/radix/kanban
- Georgegriff dnd-kit + shadcn template: https://georgegriff.github.io/react-dnd-kit-tailwind-shadcn-ui/
- Marmelab hello-pangea/dnd tutorial: https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html
- Top 5 DnD Libraries comparison: https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react
- dnd-kit maintenance status: https://github.com/clauderic/dnd-kit/issues/1194
- react-mentions-ts: https://github.com/hbmartin/react-mentions-ts
- Novu notifications: https://novu.co/blog/building-a-beautiful-kanban-board-with-node-js-react-and-websockets/
