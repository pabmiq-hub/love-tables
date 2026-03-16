

## Plan: Add "Lista de espera" tab next to "Participantes"

### Current state
The waitlist is buried inside the "Inscripciones" dropdown menu and appears as a collapsible card panel (`showWaitlist` toggle). This makes it hard to discover and manage.

### Proposed changes

**Single file: `src/pages/EventDetail.tsx`**

1. **Add a new TabsTrigger** for "Lista de espera" right after the "Participantes" tab trigger (around line 2876). It will show conditionally when `waitlist_enabled` is true OR there are waitlist entries. Display the waiting count as a badge: `Lista de espera (N)`.

2. **Move the waitlist card content into a new `TabsContent value="waitlist"`** instead of the current floating card controlled by `showWaitlist`. The content will include:
   - Header with count of waiting entries
   - List of candidates with position number, name, email, gender badge
   - "Inscribir" (promote) button per entry
   - "Eliminar" button to remove entries from the waitlist
   - Empty state message when no one is waiting

3. **Remove the `showWaitlist` state** and the "Ver lista de espera" dropdown menu item from the Inscripciones dropdown (lines 3090-3098), since the tab replaces that functionality.

4. **Remove the floating waitlist Card** block (lines 3522-3568) that was previously toggled by `showWaitlist`.

No database changes needed. No new files needed.

