# PRD: Property-Based Multi-User Access

**Date:** 2026-02-01

---

## Problem Statement

### What problem are we solving?

Currently, all data (projects, contacts, invoices, etc.) is isolated per user. Households with multiple people (partners, family members) cannot share access to the same renovation projects and cost tracking. Each person would need their own copy of data, leading to duplication and sync issues.

### Why now?

Core feature request before wider usage. Must be implemented early since it affects the fundamental data model.

### Who is affected?

- **Primary users:** Households where multiple people manage home renovation projects together

---

## Proposed Solution

### Overview

Introduce a `property` entity that owns all data (projects, contacts). Users belong to a property and share full access to all its data. When a user signs up, a property is auto-created for them. They can invite others via email to join their property.

### Data Model

```
property (new)
├── id, name, createdAt, updatedAt
└── createdById (FK → user, the original creator)

user (modified)
└── propertyId (FK → property, required)

project (modified)
└── propertyId (FK → property, replaces userId)

contact (modified)
└── propertyId (FK → property, replaces userId)

propertyInvite (new)
├── id, propertyId, email, token
├── expiresAt, acceptedAt
└── invitedById (FK → user)
```

### User Flows

#### Flow 1: New User Sign-Up

1. User creates account (existing flow)
2. System auto-creates a property for the user
3. User's `propertyId` is set to the new property
4. User proceeds to dashboard (no visible change)

#### Flow 2: Invite Partner

1. User navigates to settings/members page
2. User enters partner's email
3. System creates `propertyInvite` record with unique token
4. System sends email via Resend with invite link
5. Partner clicks link → sign up/sign in → joins property
6. Partner's `propertyId` updated to inviter's property
7. Partner now sees all shared data

#### Flow 3: Accept Invite (New User)

1. Partner clicks invite link `/invite/[token]`
2. If not logged in → redirect to sign up, store token
3. After sign up → validate token, join property
4. Redirect to dashboard

#### Flow 4: Accept Invite (Existing User)

1. Partner clicks invite link `/invite/[token]`
2. If logged in → validate token
3. If user already has property with data → show warning (data will be orphaned)
4. User confirms → propertyId updated, old property remains (orphaned)
5. Redirect to dashboard

---

## End State

When this PRD is complete:

- [ ] `property` table exists with auto-generated property per user
- [ ] `propertyInvite` table exists for pending invitations
- [ ] `user.propertyId` links users to their property
- [ ] `project.propertyId` replaces `project.userId`
- [ ] `contact.propertyId` replaces `contact.userId`
- [ ] All queries filter by `propertyId` instead of `userId`
- [ ] Invite flow works: send invite → accept → share data
- [ ] Settings page shows property members
- [ ] Email sent via existing Resend service

---

## Acceptance Criteria

### Schema Migration

- [ ] `property` table created with id, name, createdById, timestamps
- [ ] `propertyInvite` table created with token, email, expiry
- [ ] `user` table has `propertyId` column (required)
- [ ] `project` table has `propertyId` column (replaces `userId`)
- [ ] `contact` table has `propertyId` column (replaces `userId`)
- [ ] Old `userId` columns removed from project/contact

### Auth Flow Changes

- [ ] On sign-up, auto-create property and assign to user
- [ ] `getSession()` returns `propertyId` alongside user info

### Query Changes

- [ ] All project queries filter by `propertyId`
- [ ] All contact queries filter by `propertyId`
- [ ] Nested entities (costItem, quotation, invoice, logItem) access via project's propertyId

### Invite System

- [ ] `createInviteAction` creates invite record, sends email
- [ ] `acceptInviteAction` validates token, updates user's propertyId
- [ ] Invite tokens expire after 7 days
- [ ] Invite link format: `/invite/[token]`

### UI

- [ ] Settings page lists property members (name, email)
- [ ] Settings page has "Invite member" form (email input)
- [ ] Invite page handles token validation and acceptance

---

## Technical Context

### Existing Patterns

| Pattern            | File                                        | Relevance                         |
| ------------------ | ------------------------------------------- | --------------------------------- |
| Service definition | `lib/services/email/live-layer.ts`          | Email sending for invites         |
| Server action      | `lib/core/project/create-project-action.ts` | Action pattern for invite actions |
| Session helper     | `lib/services/auth/get-session.ts`          | Needs to include propertyId       |
| Schema definition  | `lib/services/db/schema.ts`                 | Add property tables               |

### Key Files to Modify

| File                               | Change                                                             |
| ---------------------------------- | ------------------------------------------------------------------ |
| `lib/services/db/schema.ts`        | Add property, propertyInvite tables; modify user, project, contact |
| `lib/services/auth/get-session.ts` | Include propertyId in session                                      |
| `lib/core/project/queries.ts`      | Change userId → propertyId filtering                               |
| `lib/core/contact/queries.ts`      | Change userId → propertyId filtering                               |
| All `*-action.ts` files            | Use propertyId for ownership checks                                |

### New Files

| File                                               | Purpose                      |
| -------------------------------------------------- | ---------------------------- |
| `lib/core/property/queries.ts`                     | Get property members         |
| `lib/core/property-invite/create-invite-action.ts` | Create and send invite       |
| `lib/core/property-invite/accept-invite-action.ts` | Accept invite, join property |
| `app/(dashboard)/settings/page.tsx`                | Members list and invite form |
| `app/(auth)/invite/[token]/page.tsx`               | Invite acceptance page       |

---

## Risks & Mitigations

| Risk                                        | Likelihood | Impact | Mitigation                                                  |
| ------------------------------------------- | ---------- | ------ | ----------------------------------------------------------- |
| Orphaned properties when user joins another | Low        | Low    | Properties without members remain in DB; can clean up later |
| Invite token guessing                       | Low        | Med    | Use CUID2 (cryptographically random), 7-day expiry          |
| User confusion about shared data            | Med        | Med    | Clear UI indicating shared property name                    |

---

## Non-Goals (v1)

- **Role-based permissions** - All members have equal access; no owner/editor/viewer
- **Activity attribution** - Not tracking who made changes (can add later)
- **Transfer ownership** - No mechanism to transfer property to another user
- **Leave/remove member** - Users cannot leave or be removed from property
- **Multiple properties per user** - One property per user only
- **Property settings UI** - Property name is auto-generated, not editable

---

## Open Questions

| Question                                  | Status                                               |
| ----------------------------------------- | ---------------------------------------------------- |
| Auto-generated property name format?      | Suggest: "{User's name}'s Property"                  |
| What happens to orphaned property's data? | Remains in DB, inaccessible                          |
| Invite email template content?            | Basic: "You've been invited to join {property name}" |
