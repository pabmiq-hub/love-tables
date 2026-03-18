

## Plan: CRM de Usuarios y Remarketing (Plan Empresa)

This is a large feature with two main pillars: (1) a User Database / CRM dashboard, and (2) a Remarketing email campaign system. Both gated behind the Enterprise plan via the existing feature flags system.

---

### 1. Database Changes

**New table: `organizer_user_records`**
Extends `global_participants` with CRM-specific data. Rather than modifying the existing table (which is used for encounter tracking), we create a richer view by querying across existing tables and adding a status/source tracking field.

Actually, `global_participants` already serves as the unified user identity. We need:

- **New column on `global_participants`**: `status` (text, default `'active'`) — values: `active`, `removed`, `no_show`, `waitlisted`
- **New column on `global_participants`**: `source_notes` (text, nullable) — free text for admin notes
- **New table: `remarketing_campaigns`** — stores campaign metadata (organizer_id, target_event_id, subject, body, recipients filter, sent_at, status)
- **New table: `remarketing_recipients`** — stores individual send records (campaign_id, global_participant_id, email, status, sent_at)
- **New feature code**: `crm` added to the `features` table and linked to Enterprise plan in `plan_features`

RLS policies: organizer-scoped via `organizer_id` or through campaign ownership.

---

### 2. Sidebar & Navigation

- Add new section `"users"` to `DashboardSection` type in `AdminSidebar.tsx`
- New nav item: icon `UsersRound`, label "Usuarios", positioned after "Analítica"
- Feature-gated with code `"crm"` — locked with padlock for non-Enterprise plans

---

### 3. Component: `DashboardUsers.tsx`

**User Database Tab** with two sub-views:

**A. User List (main view)**
- Table/grid showing all `global_participants` for this organizer
- Columns: Name, Email, Phone, Events Attended, Last Event Date, Status, Actions
- Smart deduplication: on load, merge records sharing email OR phone (LOWER/TRIM), keeping the most recent data
- Filters: by status (active/removed/no_show/waitlisted), by event, search by name/email
- Actions per user: View detail, Edit, Merge duplicates, Delete
- Bulk select for remarketing sends

**B. User Detail Modal**
- Profile info (editable: name, email, phone)
- Event history: list of events attended with date, role, check-in status, selections sent/received, matches
- Selections detail: who they selected, who selected them, mutual matches per event
- Source tracking: registered / waitlisted / removed / no-show per event

**Data sources** (all existing tables, no new ones needed for reads):
- `global_participants` — identity
- `participants` — per-event records (joined by `global_participant_id`)
- `event_waitlist` — waitlist history (joined by email)
- `participant_selections` — selections sent/received
- `events` — event names/dates

---

### 4. Component: `RemarketingCampaignModal.tsx`

Multi-step wizard dialog:

1. **Select recipients**: 
   - All users / Manual selection (checkboxes) / By event (multi-select events)
   - Show count of selected recipients
2. **Select target event**: 
   - Dropdown of organizer's upcoming events (status pending/active)
   - Auto-generates registration link
3. **Compose email**: 
   - Editable subject line
   - Rich text body (TipTap editor, reusing existing `rich-text-editor`)
   - Dynamic variables: `{{nombre}}`, `{{evento}}`, `{{enlace_inscripcion}}`
   - Preview panel
4. **Confirm & Send**: 
   - Summary of recipients count, target event, subject
   - Send button

---

### 5. Edge Function: `send-remarketing-email`

- Receives: campaign_id, list of recipients with emails, subject, HTML body, event link
- Uses existing Resend API key
- Rate-limited sends (350ms delay between emails, matching existing pattern)
- Logs each send to `remarketing_recipients` table
- Respects email suppression list if exists

---

### 6. Smart Deduplication Logic

In `useGlobalParticipants` or a new `useCRM` hook:
- On dashboard load, scan for potential duplicates (same LOWER(email) or same LOWER(phone) across different `global_participants` records)
- Present merge suggestions to admin
- Merge action: keep primary record, update all `participants.global_participant_id` references, delete duplicate record

---

### 7. Integration Points

- **AdminDashboard.tsx**: Add `"users"` case to `renderSection()`, import `DashboardUsers`
- **Event participant deletion**: When organizer deletes a participant from an event, update `global_participants.status` to `'removed'` (don't delete the global record)
- **No-show tracking**: When event closes without check-in, mark as `'no_show'`
- **Waitlist**: Cross-reference `event_waitlist` entries by email to show waitlist history

---

### 8. Files to Create/Modify

**New files:**
- `src/components/admin/DashboardUsers.tsx` — main CRM view
- `src/components/admin/UserDetailModal.tsx` — user profile + history
- `src/components/admin/RemarketingCampaignModal.tsx` — email campaign wizard
- `src/hooks/useCRM.ts` — data fetching, dedup logic, CRUD
- `supabase/functions/send-remarketing-email/index.ts` — bulk email sender

**Modified files:**
- `src/components/admin/AdminSidebar.tsx` — add "Usuarios" nav item
- `src/pages/AdminDashboard.tsx` — add users section + import
- Migration: new tables (`remarketing_campaigns`, `remarketing_recipients`), new columns on `global_participants`, feature flag insert

**Database migration:**
- Add `status` and `source_notes` columns to `global_participants`
- Create `remarketing_campaigns` and `remarketing_recipients` tables with RLS
- Insert `crm` feature code and link to Enterprise plan

