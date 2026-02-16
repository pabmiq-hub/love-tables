

# Plan: Codigos de Verificacion Visibles y Enviables desde el Panel de Administrador

## Problema Actual

1. El `DbParticipant` no incluye `verification_code` -- el admin no puede ver los codigos
2. `handleToggleCheckin` solo hace un `UPDATE` directo a la BD sin llamar a la edge function `checkin-participant`, por lo que no genera codigo ni envia email
3. `handleAddParticipant` no incluye el campo `email` en el insert
4. No hay opcion para enviar/reenviar el codigo a participantes que no lo tienen (anadidos manualmente o por Excel)

## Cambios Propuestos

### 1. Anadir `verification_code` al modelo de datos del frontend

**Archivo:** `src/pages/EventDetail.tsx`

- Anadir `verification_code: string | null` a la interfaz `DbParticipant`
- Incluir `verification_code` en la query SELECT de participantes

### 2. Corregir `handleAddParticipant` -- incluir email

**Archivo:** `src/pages/EventDetail.tsx`

El insert actual no incluye `email`. Anadirlo:

```typescript
email: participant.email || null,
```

### 3. Modificar `handleToggleCheckin` para usar la edge function

**Archivo:** `src/pages/EventDetail.tsx`

Cuando el admin hace check-in (de false a true), en lugar de solo hacer un UPDATE directo, llamar a `checkin-participant` que:
- Genera el codigo de 6 digitos
- Envia el email con el codigo
- Actualiza `checked_in = true`

Cuando deshace check-in (de true a false), mantener el UPDATE directo.

```typescript
const handleToggleCheckin = async (participantId: string, currentStatus: boolean) => {
  if (!currentStatus) {
    // Check-in: usar edge function para generar codigo + enviar email
    const { data, error } = await supabase.functions.invoke('checkin-participant', {
      body: { 
        eventId: id, 
        participantId, 
        sendEmail: true, 
        baseUrl: window.location.origin 
      }
    });
    // Actualizar participante local con codigo generado
  } else {
    // Deshacer check-in: UPDATE directo
  }
};
```

### 4. Mostrar codigo en la lista de participantes

**Archivo:** `src/pages/EventDetail.tsx`

En cada fila de participante, si tiene `verification_code`, mostrar un badge con el codigo:

```text
Maria Garcia  [25-32] [Amistad]  [Codigo: 847293]  [Check-in] [Borrar]
Juan Lopez    [25-32] [Ligue]    [Sin codigo]       [Check-in] [Borrar]
```

### 5. Mostrar codigo en el modal de detalle

**Archivo:** `src/components/event/ParticipantDetailModal.tsx`

- Anadir `verification_code` a la interfaz `ParticipantData`
- Mostrar el codigo en la seccion de datos del participante con opcion de copiar

### 6. Boton "Enviar codigo" para participantes sin codigo

**Archivo:** `src/pages/EventDetail.tsx`

Para participantes que tienen check-in pero no tienen codigo (o que fueron anadidos manualmente/Excel):

- Un boton individual "Enviar codigo" junto a cada participante sin codigo
- Un boton masivo "Enviar codigos pendientes" que envia codigos a todos los participantes con check-in que no tienen codigo

La logica sera:
1. Llamar a `checkin-participant` con `participantId` (genera codigo si no tiene)
2. Enviar el email con el codigo

### 7. Boton masivo "Enviar codigos pendientes"

**Archivo:** `src/pages/EventDetail.tsx`

Anadir un boton en la barra de acciones junto a "Check-in todos":

```text
[Check-in todos] [Enviar codigos pendientes] [Deshacer check-in]
```

Este boton:
- Filtra participantes con `checked_in = true` y `verification_code = null`
- Para cada uno, llama a `checkin-participant` secuencialmente (respetando rate limits)
- Muestra progreso: "Enviando codigos... 3/15"

### 8. Permitir check-in en estado `active`

**Archivo:** `supabase/functions/checkin-participant/index.ts`

Cambiar la validacion para permitir check-in tanto en `pending` como en `active` (para check-ins tardios):

```typescript
if (event.status !== 'pending' && event.status !== 'active') {
  return error('Event registrations are closed');
}
```

## Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/EventDetail.tsx` | Anadir verification_code al modelo, corregir insert email, modificar handleToggleCheckin para usar edge function, mostrar codigos en lista, botones de enviar codigo individual y masivo |
| `src/components/event/ParticipantDetailModal.tsx` | Anadir verification_code a la interfaz, mostrar codigo con opcion de copiar |
| `supabase/functions/checkin-participant/index.ts` | Permitir check-in en estado `active` |

## Flujo Resultante

```text
Participante sin check-in:
  [Maria Garcia] [25-32] [Sin codigo]  [Boton Check-in]
                                            |
                                            v
                                    Edge function genera codigo
                                    + envia email
                                            |
                                            v
  [Maria Garcia] [25-32] [847293]    [Check-in activo]

Participante anadido por Excel (con check-in pero sin codigo):
  [Juan Lopez]   [33-40] [Sin codigo]  [Enviar codigo]
                                            |
                                            v
                                    Edge function genera codigo
                                    + envia email
                                            |
                                            v
  [Juan Lopez]   [33-40] [592841]    [Codigo enviado]
```

