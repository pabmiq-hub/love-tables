
# Plan: Mejoras del Módulo Social - Sistema de Códigos y Cuotas

## Resumen de Cambios

### 1. Sistema de Códigos de Verificación
- Código único de 6 dígitos por participante
- Enviado por email al registrarse
- Usado para: check-in, ver mesas, enviar selecciones

### 2. Sistema de Cuotas por Género/Edad
- Definir plazas disponibles por combinación género+edad
- Mostrar plazas restantes en tiempo real
- Bloquear registro si no hay plazas

### 3. Cambio a Fecha de Nacimiento
- Reemplazar selector de rango de edad por input de fecha
- Calcular rango automáticamente
- Pregunta de participación anterior

---

## Fase 1: Cambios en Base de Datos

### 1.1 Modificar tabla `participants`
```sql
-- Añadir columnas de verificación
ALTER TABLE participants 
  ADD COLUMN verification_code TEXT UNIQUE,
  ADD COLUMN birth_date DATE,
  ADD COLUMN is_returning_participant BOOLEAN DEFAULT false,
  ADD COLUMN verification_email_sent_at TIMESTAMPTZ;

-- Crear índice para búsqueda por código
CREATE UNIQUE INDEX idx_participants_verification_code ON participants(verification_code) WHERE verification_code IS NOT NULL;
```

### 1.2 Modificar tabla `events`
```sql
-- Añadir configuración de cuotas y requisitos
ALTER TABLE events
  ADD COLUMN registration_requirements_enabled BOOLEAN DEFAULT false,
  ADD COLUMN slot_quotas JSONB DEFAULT '[]';

-- Formato de slot_quotas:
-- [
--   { "gender": "Hombre", "ageRange": "25-32", "maxSlots": 10, "currentCount": 0 },
--   { "gender": "Mujer", "ageRange": "25-32", "maxSlots": 10, "currentCount": 0 }
-- ]
```

---

## Fase 2: Edge Functions

### 2.1 Nueva función: `register-participant`
Flujo seguro de registro con:
1. Validación de cuotas disponibles
2. Generación de código de verificación único (6 dígitos)
3. Envío de email de confirmación con código
4. Actualización de contador de cuotas

**Archivo:** `supabase/functions/register-participant/index.ts`

### 2.2 Modificar: `checkin-participant`
- Ahora recibe `verificationCode` en lugar de `participantId`
- Valida código y retorna datos del participante
- Auto check-in si falta menos de 1 hora para evento

### 2.3 Nueva función: `get-table-assignments`
- Recibe `eventId` + `verificationCode`
- Solo funciona si evento está en estado `active` o `completed`
- Retorna las mesas donde está asignado el participante

### 2.4 Modificar: `submit-selections`
- Ahora identifica al participante por `verificationCode`
- Elimina necesidad de seleccionar nombre de lista

### 2.5 Nueva función: `send-verification-email`
- Envía email con código de verificación
- Template incluye: código, link de check-in, link de mesas

---

## Fase 3: Flujo de Configuración de Evento (Admin)

### 3.1 Paso Previo: Requisitos de Registro
Nuevo paso opcional en creación de evento:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Requisitos de Registro                        │
│─────────────────────────────────────────────────────────────────│
│                                                                  │
│  ¿Quieres establecer límites de plazas por género y edad?       │
│                                                                  │
│  ○ No, aceptar todos los registros                              │
│  ● Sí, configurar cuotas                                        │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Configurar cuotas por grupo:                              │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Género     │ Rango edad │ Plazas máx │ Acciones   │  │  │
│  │  ├────────────┼────────────┼────────────┼────────────┤  │  │
│  │  │ Hombre     │ 25-32      │ [10]       │ [🗑️]       │  │  │
│  │  │ Mujer      │ 25-32      │ [10]       │ [🗑️]       │  │  │
│  │  │ Hombre     │ 33-40      │ [8]        │ [🗑️]       │  │  │
│  │  │ Mujer      │ 33-40      │ [8]        │ [🗑️]       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  [+ Añadir cuota]                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Archivos a modificar:
- `src/pages/CreateEvent.tsx` - Añadir paso de requisitos
- `src/components/event/EventQuotasEditor.tsx` - Nuevo componente

---

## Fase 4: Flujo de Registro Público (ParticipantJoin)

### 4.1 Cambios en formulario:
1. **Fecha de nacimiento** → reemplaza selector de rango edad
2. **¿Has participado antes?** → nuevo campo booleano
3. **Validación de cuotas** → mostrar plazas disponibles y bloquear si lleno

### 4.2 Nuevo flujo:
```
1. Usuario accede a /event/{id}/join
2. Se cargan cuotas disponibles del evento
3. Usuario introduce fecha nacimiento → se calcula rango edad
4. Se muestra disponibilidad de su combinación género+edad
5. Si hay plazas → continúa formulario
6. Si NO hay plazas → mensaje "No hay plazas para tu perfil"
7. Al enviar → edge function genera código y envía email
8. Pantalla de confirmación con instrucciones
```

### 4.3 Pantalla de confirmación:
```
┌─────────────────────────────────────────────────────────────┐
│                    ✓ ¡Registro completado!                   │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  Hemos enviado un email a maria@email.com con tu código     │
│  personal de verificación.                                   │
│                                                              │
│  Con este código podrás:                                     │
│  • Hacer check-in al llegar al evento                        │
│  • Ver en qué mesas estás asignado                          │
│  • Enviar tus selecciones después del evento                │
│                                                              │
│  ⚠️ Guarda tu código, lo necesitarás para participar        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Fase 5: Flujo de Check-in (ParticipantCheckin)

### 5.1 Nuevo flujo basado en código:
```
1. Usuario accede a /event/{id}/checkin
2. Introduce su código de 6 dígitos
3. Sistema valida código y muestra:
   "¿Eres María García López?"
   [Sí, confirmar check-in] [No, volver]
4. Al confirmar → check-in completado
```

### 5.2 Email automático:
- Si se registra faltando < 1 hora para evento → auto check-in
- Email incluye código igualmente

---

## Fase 6: Ver Asignación de Mesas

### 6.1 Nueva página: `/event/{id}/tables`
- Usuario introduce código de verificación
- Solo disponible cuando evento está en `active` o `completed`
- Muestra lista de mesas por ronda

```
┌─────────────────────────────────────────────────────────────┐
│                   Tus mesas asignadas                        │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  Ronda 1: Mesa 3                                            │
│  Ronda 2: Mesa 7                                            │
│  Ronda 3: Mesa 2                                            │
│  Ronda 4: Mesa 5                                            │
│                                                              │
│  Busca el número de tu mesa en el local.                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Fase 7: Selecciones con Código (ParticipantSelect)

### 7.1 Cambio en identificación:
- Ya no muestra lista de nombres
- Usuario introduce código de verificación
- Sistema carga automáticamente sus datos y compañeros de mesa

---

## Fase 8: Template de Email

### 8.1 Email de confirmación de registro:
```html
Asunto: Tu código de acceso para [Nombre Evento]

Hola [Nombre],

¡Tu registro está confirmado!

Tu código personal: 847293

Con este código podrás:
• Hacer check-in cuando llegues al evento
• Ver tus mesas asignadas una vez inicie el evento
• Enviar tus selecciones después del evento

Links directos:
• Check-in: [URL]/event/{id}/checkin?code=847293
• Mis mesas: [URL]/event/{id}/tables?code=847293
• Selecciones: [URL]/event/{id}/select?code=847293

¡Nos vemos en el evento!
Equipo Konektum
```

---

## Archivos a Crear/Modificar

### Nuevos archivos:
| Archivo | Descripción |
|---------|-------------|
| `supabase/functions/register-participant/index.ts` | Registro seguro con código |
| `supabase/functions/get-table-assignments/index.ts` | Consulta mesas por código |
| `supabase/functions/send-verification-email/index.ts` | Envío de email con código |
| `src/components/event/EventQuotasEditor.tsx` | Editor de cuotas para admin |
| `src/pages/ParticipantTables.tsx` | Ver asignación de mesas |

### Archivos a modificar:
| Archivo | Cambios |
|---------|---------|
| `src/pages/ParticipantJoin.tsx` | Fecha nacimiento, cuotas, email de confirmación |
| `src/pages/ParticipantCheckin.tsx` | Identificación por código |
| `src/pages/ParticipantSelect.tsx` | Identificación por código |
| `src/pages/CreateEvent.tsx` | Paso de requisitos previos |
| `supabase/functions/checkin-participant/index.ts` | Validar por código |
| `supabase/functions/submit-selections/index.ts` | Validar por código |
| `src/App.tsx` | Nueva ruta /event/{id}/tables |

---

## Orden de Implementación

1. **Migración DB** - Añadir columnas necesarias
2. **Edge functions base** - register-participant, send-verification-email
3. **ParticipantJoin** - Nuevo formulario con fecha nacimiento
4. **Verificación email** - Template y envío
5. **ParticipantCheckin** - Cambiar a identificación por código
6. **get-table-assignments** - Nueva edge function
7. **ParticipantTables** - Nueva página
8. **ParticipantSelect** - Cambiar a identificación por código
9. **EventQuotasEditor** - Componente admin
10. **CreateEvent** - Integrar paso de cuotas

---

## Consideraciones de Seguridad

1. **Códigos únicos**: 6 dígitos = 1 millón combinaciones, suficiente para eventos de <1000 personas
2. **Rate limiting**: En edge functions para prevenir fuerza bruta
3. **Validación UUID**: Mantener validación de formato para eventId
4. **Expiración**: Códigos válidos hasta 48h después del evento
5. **No revelar datos**: Si código inválido, no indicar si participante existe
