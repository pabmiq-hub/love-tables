

## Why "Tipo de conexión" shows "No especificado"

### Root Cause
All participants in this event registered **before** the fix that added the `preference` field to the registration payload. The data simply wasn't saved to the database -- every participant (except one added manually) has `preference = NULL`.

### Plan

#### 1. Ensure the Edge Function is deployed
The `register-participant` edge function was edited to include `preference` in the insert, but it needs to be redeployed to take effect for future registrations.

#### 2. Backfill existing participant data
Run a database migration to set a default preference for all participants in this event (and any others) that have `preference = NULL`. Since these are social module events, a reasonable default would be `'Solo amistad'` (or the equivalent based on event language).

Alternatively, we can prompt the admin to manually update via the "Editar" button for each participant if they want accurate data.

#### 3. Make `preference` required in the Edge Function validation
Add `preference` to the required field check in `register-participant` so future registrations cannot skip it:

```typescript
if (!eventId || !name || !email || !phone || !gender || !birthDate || !preference) {
  return new Response(
    JSON.stringify({ error: 'Faltan campos obligatorios' }),
    { status: 400, ... }
  );
}
```

#### 4. Redeploy the Edge Function
Trigger a redeployment of `register-participant` to ensure the updated code (with `preference` in the insert and validation) is live.

### Files to modify
- `supabase/functions/register-participant/index.ts` -- add `preference` to required validation
- Redeploy the edge function

### Optional: Backfill migration
```sql
UPDATE participants
SET preference = 'Solo amistad'
WHERE preference IS NULL AND event_id IN (
  SELECT id FROM events WHERE module = 'social'
);
```

This is optional and depends on whether the admin prefers to set it manually per participant or apply a bulk default.

