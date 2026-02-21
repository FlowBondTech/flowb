---
title: "Flow Plugin"
---

# Flow Plugin

**Class**: `FlowPlugin` | **Source**: `src/plugins/flow/index.ts`

## Authenticated Actions

These require a valid user session.

| Action | Description |
|--------|-------------|
| `flow-invite` | Generate your personal 'Join my Flow' link |
| `flow-accept` | Accept a friend's flow invite |
| `flow-list` | See your flow (friends + crews) |
| `flow-remove` | Remove a friend from your flow |
| `flow-mute` | Mute/unmute a friend connection |
| `crew-create` | Create a new crew (group flow) |
| `crew-join` | Join a crew via invite code |
| `crew-invite` | Generate a 'Join our Flow' link for your crew |
| `crew-list` | List your crews |
| `crew-members` | See who's in a crew |
| `crew-leave` | Leave a crew |
| `crew-remove-member` | Remove a member from your crew (admin) |
| `crew-settings` | Toggle crew visibility and join mode (creator/admin) |
| `crew-browse` | Browse public crews to discover and join |
| `crew-request-join` | Request to join an approval-mode crew |
| `crew-approve` | Approve a pending join request (creator/admin) |
| `crew-deny` | Deny a pending join request (creator/admin) |
| `crew-promote` | Promote a member to admin (creator only) |
| `crew-demote` | Demote an admin to member (creator only) |
| `crew-personal-invite` | Generate a tracked personal invite link |
| `going` | RSVP to an event (going/maybe) |
| `not-going` | Cancel your RSVP |
| `whos-going` | See which friends & crew are going to events |
| `my-schedule` | See your upcoming RSVPs |
| `flow-notify` | Get friends/crews going to an event (internal) |

---

*Auto-generated on 2026-02-21 17:05:31 UTC*
