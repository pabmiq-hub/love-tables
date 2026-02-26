

## Diagnosis

I've traced the exact sequence of what happened with the "Slow Friending [ENG - Feb '26]" event:

### Problem 1: Emails sent immediately, ignoring the 24h deadline
When you clicked "Cerrar evento y enviar emails", the function `handleCloseAndSendEmails` closes the event AND sends match emails in the same action. The 24h deadline only controls how long participants can still submit selections -- it does NOT delay the email sending. So all 28 participants received their results email immediately at 11:49 UTC, when only 10 out of 28 had submitted their selections. That's why everyone got a "no matches" email.

### Problem 2: Emails sent in Spanish instead of English
The event has `language: en` and no custom email template (`email_template: null`). Both `send-match-emails` and `send-scheduled-emails` fall back to `DEFAULT_TEMPLATE`, which is hardcoded entirely in Spanish. The function fetches the event language but never uses it to choose the template language.

### Problem 3: Stats counter bug (minor)
The social event branch in `send-match-emails` doesn't increment `withMatches`/`withoutMatches` counters, which is why the response showed `{ withMatches: 0, withoutMatches: 0 }` despite sending 28 emails.

---

## Plan

### 1. Change "Close event" behavior: schedule emails at deadline expiry

**Files:** `src/pages/EventDetail.tsx`, `src/components/event/CloseEventDialog.tsx`

- Remove the "Cerrar evento y enviar emails" option from CloseEventDialog.
- Replace with two clear options:
  - **"Cerrar evento"** -- closes event, sets deadline, and automatically schedules email sending for when the deadline expires (sets `scheduled_email_at` = now + deadline hours).
  - **"Cerrar y enviar resultados ahora"** -- only shown when ALL participants have responded. Sends immediately.
- The dialog will clearly explain: "Los emails de resultados se enviarán automáticamente cuando venza el plazo de X horas."

### 2. Add English default templates to both email functions

**Files:** `supabase/functions/send-match-emails/index.ts`, `supabase/functions/send-scheduled-emails/index.ts`

- Add `DEFAULT_TEMPLATE_EN` with English translations of subject, greeting, intro, friendshipTitle, datingTitle, closing, and signature.
- When `email_template` is null, select the default template based on `event.language`:
  - `language === 'en'` --> use `DEFAULT_TEMPLATE_EN`
  - Otherwise --> use `DEFAULT_TEMPLATE` (Spanish)
- Both functions already fetch `event.language`, so no query changes needed.

### 3. Fix stats counter in send-match-emails

**File:** `supabase/functions/send-match-emails/index.ts`

- Add missing `hasMatches ? stats.withMatches++ : stats.withoutMatches++` in the social event branch (after line 537).

### 4. Add per-participant email history in EmailManagement

**File:** `src/components/event/EmailManagement.tsx`

- Expand the participant list to show ALL email types per participant (not just `match`), grouped as a timeline:
  - `registration_confirmation` -- confirmation at registration
  - `checkin_code` -- access code email
  - `match` -- match results email
  - `reminder` -- selection reminder
- Each entry shows: type icon, status badge, timestamp, and error message if failed.
- Add a filter by email type in addition to the existing status filter.
- Log reminder emails to `email_logs` table (currently `send-reminder-email` does not log).

### 5. Log reminder emails to email_logs

**File:** `supabase/functions/send-reminder-email/index.ts`

- Add `logEmailResult` helper (same as in `send-match-emails`).
- After each reminder send, log to `email_logs` with `email_type: 'reminder'`.

### 6. Deploy updated edge functions

Redeploy: `send-match-emails`, `send-scheduled-emails`, `send-reminder-email`.

---

## Summary of changes

| File | Change |
|---|---|
| `send-match-emails/index.ts` | Add English default template, fix stats counter, use event language |
| `send-scheduled-emails/index.ts` | Add English default template, use event language |
| `send-reminder-email/index.ts` | Add email logging to `email_logs` |
| `EventDetail.tsx` | Change close event flow to schedule emails at deadline |
| `CloseEventDialog.tsx` | Update UI to reflect new behavior |
| `EmailManagement.tsx` | Show full email history per participant across all types |

