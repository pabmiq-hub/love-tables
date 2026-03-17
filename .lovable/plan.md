

## Current behavior: When are access codes sent?

The 6-digit access code is sent automatically in these scenarios:

1. **Self-registration (ParticipantJoin)**: If the participant registers close to the event (auto check-in), `send-checkin-code` is called immediately. Otherwise, only `send-registration-confirmation` is sent (no code yet).

2. **Admin adds participant manually (EventDetail)**: Both `send-registration-confirmation` AND `generate-and-send-code` are called immediately — the participant gets the code right away.

3. **Admin bulk sends codes (EventDetail)**: The organizer can manually trigger "Enviar códigos" for all participants missing codes.

4. **Excel import (EventDetail)**: After importing, codes are generated and sent to all imported participants with email.

5. **Check-in (checkin-participant)**: If a participant checks in and didn't have a code, one is generated and emailed.

**The gap**: For self-registered participants (scenario 1, no auto check-in), the code is NOT sent at registration — only the confirmation email. The organizer must later bulk-send codes manually.

---

## Plan: Add "Envío de códigos" setting to Event Settings

**Goal**: Let the organizer configure WHEN access codes are automatically sent to self-registered participants.

### Database change
Add column `code_send_mode` to `events` table with values:
- `'on_registration'` — Send code immediately when participant registers (default for new behavior)
- `'manual'` — Don't auto-send; organizer sends codes manually (current behavior)

Default: `'on_registration'`

### UI change: `EventSettingsEditor.tsx`
Add a new card/section "Envío de códigos de acceso" with a select dropdown:
- **Al registrarse** (`on_registration`): "El código se envía automáticamente cuando el participante se inscribe"
- **Manual** (`manual`): "Tú decides cuándo enviar los códigos desde el panel de participantes"

Place it near the check-in settings (after `checkinOpensMinutesBefore`).

### Logic change: `ParticipantJoin.tsx`
After successful registration (non-waitlist, non-auto-checkin path):
- Fetch the event's `code_send_mode`
- If `'on_registration'`: call `generate-and-send-code` in addition to `send-registration-confirmation`
- If `'manual'`: only send `send-registration-confirmation` (current behavior)

### Logic change: `register-participant/index.ts`
Return `codeSendMode` from the event data so the frontend knows which path to take (or handle it server-side in the edge function itself for cleaner architecture).

### Files to modify
1. **Migration**: Add `code_send_mode text not null default 'on_registration'` to `events`
2. **EventSettingsEditor.tsx**: Add the setting UI with Select dropdown
3. **ParticipantJoin.tsx**: Conditionally call `generate-and-send-code` based on mode
4. **EventDetail.tsx**: Pass new prop to settings editor; ensure manual add still always sends code regardless of mode

