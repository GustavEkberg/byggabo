# PRD: Byggabo - Home Improvement Project Management

**Date:** 2026-01-31
**Status:** Draft

---

## Problem Statement

### What problem are we solving?

Homeowners (me and my partners) currently use spreadsheets to track home improvement projects spanning months. It's difficult to:

- Keep track of all quotations from contractors
- Organize receipts and cost documentation
- Monitor actual spending vs estimated budgets
- Maintain project history over time
- Share project status with partners

The cost of inaction is lost receipts, forgotten quotations, budget overruns, and poor visibility into project finances.

### Why now?

We have multiple active renovation projects and need a centralized system immediately to avoid losing track of expenses and contractor communications.

### Who is affected?

- **Primary users:** Homeowners managing home improvement projects (personal/family use)
- **Secondary users:** Partners who need visibility into shared projects

---

## Proposed Solution

### Overview

Byggabo is a project management application for home improvement projects. It centralizes project documentation, cost tracking, and contractor communications. Users can create projects, track cost items (receipts), manage quotations from contacts, convert quotations to invoices, and view project financial summaries.

### User Experience

#### User Flow: Create New Project

1. User clicks "New Project" button
2. System displays project creation form
3. User enters project name, description
4. User saves project
5. System redirects to project detail page

#### User Flow: Add Cost Item

1. User navigates to project detail page
2. User clicks "Add Cost Item"
3. User enters name, description, value
4. User uploads receipt file (optional)
5. System saves cost item and updates project totals

#### User Flow: Create Quotation

1. User navigates to project detail page
2. User clicks "Add Quotation"
3. User selects or creates Contact (contractor)
4. User enters description, amount, date received
5. User uploads quotation file
6. System saves quotation linked to project and contact

#### User Flow: Convert Quotation to Invoice

1. User views quotation list on project page
2. User clicks "Convert to Invoice" on accepted quotation
3. System creates invoice linked to original quotation
4. User can upload final invoice file
5. Project actual spending updates automatically

#### User Flow: View Project Timeline

1. User opens project detail page
2. System displays chronological log of:
   - Project creation
   - Cost items added
   - Quotations received
   - Quotations converted to invoices
   - Comments/events added
3. Items sorted by date, newest first

---

## End State

When this PRD is complete, the following will be true:

- [ ] Users can create, edit, and delete Projects
- [ ] Projects have names, descriptions, creation dates, and status (active/completed)
- [ ] Users can add Cost Items to projects (name, description, value, receipt file)
- [ ] Users can create Contacts (contractors/suppliers with name, email, phone)
- [ ] Users can create Quotations linked to Contacts and Projects
- [ ] Quotations have description, amount, status (pending/accepted/rejected), file attachment
- [ ] Users can convert Quotations to Invoices
- [ ] Invoices are separate entities linked to original quotation
- [ ] Project detail page displays financial summary (estimated vs actual spending)
- [ ] Project timeline shows all activities: cost items, quotations, invoices, comments
- [ ] Users can add comments/events to project timeline
- [ ] All data is isolated per user (multi-tenant)
- [ ] File uploads work via S3 signed URLs for receipts, quotations, invoices
- [ ] Responsive design works on mobile and desktop
- [ ] Visual style matches reference repo (clean, minimal, card-based, Tailwind CSS 4)

---

## Success Metrics

### Quantitative

| Metric             | Current          | Target          | Measurement Method |
| ------------------ | ---------------- | --------------- | ------------------ |
| Projects created   | 0                | 3+ active       | Database count     |
| Cost items tracked | 0 (spreadsheets) | 20+ per project | Database count     |
| File uploads       | Manual filing    | 100% digital    | Upload count       |

### Qualitative

- No more lost receipts or quotations
- Partners can view project status without asking
- Budget visibility prevents overspending

---

## Acceptance Criteria

### Feature: Project Management

- [ ] Users can create projects with name and description
- [ ] Projects display created/updated timestamps
- [ ] Projects have status: active, completed, archived
- [ ] Users can edit project details
- [ ] Users can archive (soft delete) projects
- [ ] Project list shows summary: total estimated, total actual, item count

### Feature: Cost Items

- [ ] Cost items have: name, description, value (decimal), date, receipt file URL
- [ ] Cost items belong to exactly one project
- [ ] File upload for receipts via S3 signed URL
- [ ] Cost items appear in project timeline
- [ ] Users can edit/delete cost items

### Feature: Contacts

- [ ] Contacts have: name, email, phone, company (optional)
- [ ] Contacts are user-scoped (private to user)
- [ ] Contacts can be created inline when adding quotation
- [ ] Contact list page shows all contacts

### Feature: Quotations

- [ ] Quotations have: description, amount, contact, status, file URL, received date
- [ ] Quotations belong to exactly one project and one contact
- [ ] Status options: pending, accepted, rejected
- [ ] File upload for quotation PDFs/images
- [ ] Quotations appear in project timeline
- [ ] Users can update quotation status

### Feature: Invoices

- [ ] Invoices created by converting quotation
- [ ] Invoices have: description, amount, file URL, invoice date, paid status
- [ ] Invoice linked to original quotation (nullable)
- [ ] File upload for invoice PDFs
- [ ] Invoices appear in project timeline
- [ ] Converting quotation updates project actual spending

### Feature: Project Timeline (Log)

- [ ] Timeline shows all events chronologically
- [ ] Event types: comment, cost_item, quotation, invoice
- [ ] Each event shows: type icon, date, description
- [ ] Users can add manual comments/events
- [ ] Timeline is filterable by event type

### Feature: Financial Dashboard

- [ ] Project detail shows: estimated total (sum of accepted quotations), actual total (sum of cost items + invoices)
- [ ] Visual indicator: progress bar showing actual vs estimated
- [ ] Color coding: green under budget, red over budget
- [ ] Breakdown by category (optional v1.1)

---

## Technical Context

### Existing Patterns to Follow

- **Schema:** `lib/services/db/schema.ts` - Use existing user table, add new tables for projects, cost_items, contacts, quotations, invoices, log_items
- **RSC Pattern:** `specs/DATA_ACCESS_PATTERNS.md` - Use Suspense + Content pattern for authenticated pages
- **Server Actions:** `specs/SERVER_ACTION_PATTERNS.md` - One action per file ending in `-action.ts`
- **Effect-TS:** All database operations must use `yield*` inside `Effect.gen`, never await
- **S3 Files:** `lib/core/file/get-upload-url-action.ts` - Follow existing file upload pattern

### Key Files

- `lib/services/db/schema.ts` - Add new tables
- `lib/layers.ts` - AppLayer composition already exists
- `lib/services/s3/live-layer.ts` - S3 service for file uploads
- `app/(dashboard)/` - Create project pages here
- `lib/core/project/` - Domain logic for projects
- `lib/core/cost-item/` - Domain logic for cost items
- `lib/core/contact/` - Domain logic for contacts
- `lib/core/quotation/` - Domain logic for quotations
- `lib/core/invoice/` - Domain logic for invoices
- `lib/core/log-item/` - Domain logic for timeline events

### Data Model

```typescript
// Projects
project: {
  id: text (CUID2),
  name: text (not null),
  description: text,
  status: enum('active', 'completed', 'archived'),
  userId: text (fk -> user.id),
  createdAt: timestamp,
  updatedAt: timestamp
}

// Cost Items (simple purchases/receipts)
costItem: {
  id: text (CUID2),
  projectId: text (fk -> project.id),
  name: text (not null),
  description: text,
  amount: decimal(12,2) (not null),
  date: timestamp (not null),
  receiptFileUrl: text,
  createdAt: timestamp,
  updatedAt: timestamp
}

// Contacts (contractors/suppliers)
contact: {
  id: text (CUID2),
  userId: text (fk -> user.id),
  name: text (not null),
  email: text,
  phone: text,
  company: text,
  createdAt: timestamp,
  updatedAt: timestamp
}

// Quotations (from contractors)
quotation: {
  id: text (CUID2),
  projectId: text (fk -> project.id),
  contactId: text (fk -> contact.id),
  description: text (not null),
  amount: decimal(12,2) (not null),
  status: enum('pending', 'accepted', 'rejected'),
  fileUrl: text,
  receivedDate: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}

// Invoices (converted from quotations)
invoice: {
  id: text (CUID2),
  projectId: text (fk -> project.id),
  quotationId: text (fk -> quotation.id, nullable),
  description: text (not null),
  amount: decimal(12,2) (not null),
  fileUrl: text,
  invoiceDate: timestamp,
  isPaid: boolean (default false),
  createdAt: timestamp,
  updatedAt: timestamp
}

// Log Items (timeline events)
logItem: {
  id: text (CUID2),
  projectId: text (fk -> project.id),
  type: enum('comment', 'cost_item', 'quotation', 'invoice'),
  referenceId: text (id of related entity),
  description: text (not null),
  createdAt: timestamp
}
```

### Relations

```typescript
// User has many projects, contacts
// Project has many costItems, quotations, invoices, logItems
// Contact has many quotations
// Quotation has one invoice (optional)
```

### System Dependencies

- **Database:** PostgreSQL via Drizzle ORM (already configured)
- **Auth:** better-auth (already configured)
- **File Storage:** AWS S3 (already configured)
- **UI Components:** shadcn/ui with Base UI primitives
- **Charts:** Recharts for financial visualizations
- **Currency:** SEK (Swedish Krona) - default and only currency for v1

### File Upload Pattern

All files (receipts, quotations, invoices) use S3 signed URLs:

1. Client requests signed URL from server action
2. Client uploads directly to S3
3. Client saves entity with file URL

---

## Visual Design Specification

### Design System

Byggabo must match the visual style of the reference repo (Kostnad expense tracker):

**Color Palette:**

- Uses Tailwind CSS 4 with oklch color system
- Primary: `oklch(0.205 0 0)` (dark gray)
- Background: `oklch(1 0 0)` (white) / `oklch(0.145 0 0)` (dark mode)
- Success/Positive: `green-500` / `green-600` (income, under budget)
- Destructive/Negative: `red-500` / `red-600` (expenses, over budget)
- Muted text: `oklch(0.556 0 0)` (gray)
- Border: `oklch(0.922 0 0)` (light gray)

**Layout:**

- Mobile-first responsive design
- Max-width containers: `max-w-6xl` for main content
- Card-based UI with rounded corners (`rounded-xl`)
- Subtle borders (`border`) and shadows (`shadow-sm`)
- Generous padding: `p-4` mobile, `p-6` desktop
- Grid layouts: responsive `grid-cols-1` → `lg:grid-cols-2`

**Typography:**

- System font stack: system-ui, -apple-system, BlinkMacSystemFont
- Clean, minimal aesthetic
- Font sizes: `text-sm` for labels, `text-base` for body, `text-2xl` for headings

**Components:**

- Cards: `Card`, `CardHeader`, `CardTitle`, `CardContent` from shadcn/ui
- Buttons: `Button` with variants (default, outline, ghost)
- Forms: `Input`, `Textarea`, `Select` with consistent styling
- Dialogs: `Dialog` for modals (new project, add item)
- Dropdowns: `DropdownMenu` for actions
- Charts: Use Recharts with consistent color scheme

**Financial Data Styling:**

- Default currency: SEK (Swedish Krona) for all monetary values
- Expenses/negative values: `text-red-600 dark:text-red-400`
- Income/positive values: `text-green-600 dark:text-green-400`
- Currency formatting: `formatCurrency()` with SEK symbol (kr)
- Progress bars for budget vs actual

**Key UI Patterns from Reference:**

- Page header with action buttons (New Project, Filters)
- Card grid for project list
- Detail page with summary cards at top
- Timeline/activity feed with icons
- Modal forms for creating entities
- File upload areas with drag-and-drop

### Responsive Breakpoints

- Mobile: default (flex-col layouts)
- Tablet: `sm:` (640px)
- Desktop: `lg:` (1024px) - grid layouts activate

---

## Risks & Mitigations

| Risk                              | Likelihood | Impact | Mitigation                                  |
| --------------------------------- | ---------- | ------ | ------------------------------------------- |
| File upload complexity            | Med        | Med    | Use existing S3 service pattern             |
| Multi-tenant data leaks           | Low        | High   | Strict userId filters on all queries        |
| Schema migration issues           | Med        | Med    | Use drizzle push in dev, migrations in prod |
| Over-engineering for personal use | High       | Med    | Stick to core features, defer nice-to-haves |
| Mobile UX issues                  | Med        | Med    | Test on actual devices, mobile-first CSS    |

---

## Alternatives Considered

### Alternative 1: Use existing project management tool (Trello/Asana)

- **Pros:** Ready-made, feature-rich
- **Cons:** No cost tracking, no file management for receipts, generic
- **Decision:** Rejected. Need custom financial tracking and receipt storage.

### Alternative 2: Continue with spreadsheets

- **Pros:** Free, familiar
- **Cons:** No file attachments, poor collaboration, easy to lose data
- **Decision:** Rejected. Explicitly why we're building this.

### Alternative 3: Build as mobile app only

- **Pros:** Better mobile UX, offline support
- **Cons:** More complex build, harder to share with partners
- **Decision:** Rejected. Web app is sufficient for personal use, responsive design handles mobile.

---

## Non-Goals (v1)

Explicitly out of scope for this PRD:

- **Payment processing** - Not building an invoicing system for contractors
- **Real-time collaboration** - No WebSocket updates, partners can refresh
- **Email notifications** - No automated emails to contacts
- **Advanced reporting** - No PDF export, charts beyond basic summaries
- **Project templates** - Each project created from scratch
- **Recurring cost items** - All items are one-time
- **Multi-currency** - SEK only, no currency switching
- **Mobile native app** - Responsive web only
- **Integration with accounting software** - Manual exports only

---

## Interface Specifications

### Page Structure

```
/                     → Landing page (marketing)
/login                → Auth (existing)
/dashboard            → Project list (main app entry)
/dashboard/projects   → Project list (alias)
/dashboard/projects/[id]   → Project detail page
/dashboard/projects/[id]/edit   → Edit project
/dashboard/contacts   → Contact list
/dashboard/contacts/[id]   → Contact detail
```

### API Patterns

All mutations use Server Actions:

```typescript
// lib/core/project/create-project-action.ts
'use server'
export const createProjectAction = async (input: CreateProjectInput) => { ... }

// lib/core/cost-item/create-cost-item-action.ts
'use server'
export const createCostItemAction = async (input: CreateCostItemInput) => { ... }
```

### UI Components Needed

- ProjectCard - Summary card for project list
- ProjectDetail - Full project view with tabs/timeline
- CostItemForm - Form for adding cost items
- QuotationForm - Form with contact selection
- ContactForm - Create/edit contacts
- Timeline - Activity feed component
- BudgetProgress - Visual budget vs actual indicator
- FileUpload - S3 upload component

---

## Documentation Requirements

- [ ] Delete example Post files from repo (as per AGENTS.md)
- [ ] Update AGENTS.md with domain-specific information
- [ ] Add setup instructions for new developers
- [ ] Document file upload flow

---

## Open Questions

| Question                                | Owner | Due Date | Status          |
| --------------------------------------- | ----- | -------- | --------------- |
| Do we need project categories/tags?     | User  | v1.1     | Deferred        |
| Should contacts be shared across users? | User  | v1.1     | Private for now |
| Do we need reminder notifications?      | User  | v1.1     | Deferred        |

---

## Appendix

### Glossary

- **Cost Item:** A single purchase/receipt (e.g., bought paint for 450 SEK)
- **Quotation:** Price estimate from contractor (e.g., fence building quote for 15000 SEK)
- **Invoice:** Final bill after work completion
- **Log Item:** Timeline event (comment, cost added, quote received, etc.)
- **Contact:** Contractor, supplier, or vendor

### References

- Reference repo: `/reference_repo/` - Visual style and patterns
- AGENTS.md: Project structure and conventions
- specs/: Architecture and pattern documentation
