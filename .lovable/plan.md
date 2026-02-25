

## Analysis

### 1. Are all fields mandatory in social event registration?

Yes, the current form in `ParticipantJoin.tsx` has all fields as required:
- Name: `required` attribute
- Email: `required` attribute  
- Phone: `required` attribute (added recently)
- Birth date: `required` attribute
- Gender: validated in `handleSubmit`
- Preference: validated in `handleSubmit`
- Dating preference: validated when "Amistad y ligue" is selected
- Returning participant: validated in `handleSubmit`

The Edge Function `register-participant` also validates: `!eventId || !name || !email || !phone || !gender || !birthDate || !preference`.

All fields are correctly enforced as mandatory.

### 2. Show email as fallback in match emails for participants without phone

Currently, the match email template in `send-match-emails/index.ts` only includes `name` and `phone` for each match. When `phone` is null, it simply shows nothing — no contact info at all.

**Plan:**

Modify `supabase/functions/send-match-emails/index.ts`:

1. **Expand match data structure** to include `email` alongside `name` and `phone` (lines 456, 108-109, 117-119).

2. **Update `generateEmailHtml`** signature to accept `{ name: string; phone: string | null; email: string | null }` for both friendship and dating match arrays.

3. **Update contact info display logic** in the HTML template:
   - If phone exists: show `📞 phone`
   - If no phone but email exists: show `📧 email`
   - If neither: show nothing

4. **Update match collection** (lines 477-478, 481-482) to include the matched participant's email when building the match lists.

### Files to modify
- `supabase/functions/send-match-emails/index.ts` — add email to match data, update HTML template fallback

### No database changes needed
The `email` column already exists on the `participants` table and is already fetched in the query at line 402.

