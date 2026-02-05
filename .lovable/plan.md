
# Plan: Completar el Sistema de Códigos de Verificación y Cuotas

## Resumen

Completaremos las 4 tareas pendientes del plan de mejoras del módulo social:

1. **Flujo de selecciones con código** - Modificar `ParticipantSelect.tsx` y `submit-selections`
2. **Editor de cuotas** - Crear `EventQuotasEditor.tsx` 
3. **Paso de cuotas en CreateEvent** - Integrar el editor en la creación de eventos
4. **Pruebas del flujo completo** - Verificar que todo funciona correctamente

---

## Fase 1: Flujo de Selecciones con Código

### 1.1 Actualizar `ParticipantSelect.tsx`

Cambios principales:
- Eliminar lista de nombres para identificarse
- Añadir input de código de verificación de 6 dígitos
- Validar código contra la edge function antes de continuar
- Mostrar pantalla de confirmación de identidad

**Flujo nuevo:**
```text
┌────────────────────────────────────────────────────────┐
│                 Introduce tu código                     │
│─────────────────────────────────────────────────────────│
│                                                         │
│    Introduce el código de 6 dígitos que recibiste      │
│    por email al registrarte.                           │
│                                                         │
│    ┌─────────────────────────────────┐                 │
│    │        [ 8 4 7 2 9 3 ]          │                 │
│    └─────────────────────────────────┘                 │
│                                                         │
│    [        Verificar código        ]                  │
│                                                         │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│                 ¿Eres tú?                              │
│─────────────────────────────────────────────────────────│
│                                                         │
│    Nombre: María García López                          │
│    Email: maria@email.com                              │
│                                                         │
│    [Sí, soy yo]    [No, volver]                       │
│                                                         │
└────────────────────────────────────────────────────────┘
                         ↓
               (Flujo de selecciones actual)
```

### 1.2 Actualizar `submit-selections` Edge Function

Cambios:
- Añadir opción de recibir `verificationCode` en lugar de `selectorId`
- Resolver el código a un participante válido
- Mantener compatibilidad con `selectorId` para casos existentes

```typescript
// Nuevo parámetro opcional
const { eventId, selectorId, verificationCode, selections } = await req.json();

// Si viene verificationCode, resolver a participante
if (verificationCode && !selectorId) {
  const participant = await resolveByCode(eventId, verificationCode);
  selectorId = participant.id;
}
```

---

## Fase 2: Editor de Cuotas para Admin

### 2.1 Crear `EventQuotasEditor.tsx`

Nuevo componente que permite configurar límites de plazas por combinación género + edad.

**Interfaz:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  ☐ Establecer requisitos de registro                            │
│────────────────────────────────────────────────────────────────│
│                                                                  │
│  Configura cuántas plazas disponibles hay para cada grupo:      │
│                                                                  │
│  ┌───────────────┬─────────────┬──────────────┬──────────────┐  │
│  │    Género     │  Rango edad │  Plazas máx  │   Acciones   │  │
│  ├───────────────┼─────────────┼──────────────┼──────────────┤  │
│  │ [Hombre ▼]   │  [25-32 ▼]  │     [10]     │    [🗑️]     │  │
│  │ [Mujer ▼]    │  [25-32 ▼]  │     [10]     │    [🗑️]     │  │
│  │ [Hombre ▼]   │  [33-40 ▼]  │     [8]      │    [🗑️]     │  │
│  │ [Mujer ▼]    │  [33-40 ▼]  │     [8]      │    [🗑️]     │  │
│  └───────────────┴─────────────┴──────────────┴──────────────┘  │
│                                                                  │
│  [+ Añadir cuota]                                               │
│                                                                  │
│  Total plazas configuradas: 36                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Props del componente:**
```typescript
interface SlotQuota {
  gender: string;
  ageRange: string;
  maxSlots: number;
}

interface EventQuotasEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  quotas: SlotQuota[];
  onQuotasChange: (quotas: SlotQuota[]) => void;
  availableGenders: string[];
  availableAgeRanges: string[];
}
```

---

## Fase 3: Integración en CreateEvent

### 3.1 Modificar `CreateEvent.tsx`

Añadir el editor de cuotas en el Step 2 (configuración) para eventos sociales, después del editor de preferencias.

**Cambios:**
1. Nuevo estado: `registrationRequirementsEnabled` y `slotQuotas`
2. Integrar `EventQuotasEditor` en Step 2 (social)
3. Guardar `slot_quotas` y `registration_requirements_enabled` al crear evento

```typescript
// Nuevos estados
const [registrationRequirementsEnabled, setRegistrationRequirementsEnabled] = useState(false);
const [slotQuotas, setSlotQuotas] = useState<SlotQuota[]>([]);

// Al crear evento, incluir:
registration_requirements_enabled: registrationRequirementsEnabled,
slot_quotas: registrationRequirementsEnabled ? slotQuotas : null,
```

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/pages/ParticipantSelect.tsx` | Modificar | Cambiar identificación de lista a código |
| `supabase/functions/submit-selections/index.ts` | Modificar | Añadir soporte para `verificationCode` |
| `src/components/event/EventQuotasEditor.tsx` | **Crear** | Editor de cuotas por género/edad |
| `src/pages/CreateEvent.tsx` | Modificar | Integrar editor de cuotas |

---

## Detalles Técnicos

### ParticipantSelect.tsx - Cambios clave

```typescript
// Nuevos estados
const [verificationCode, setVerificationCode] = useState("");
const [verifiedParticipant, setVerifiedParticipant] = useState<Participant | null>(null);
const [isVerifying, setIsVerifying] = useState(false);

// Nueva función para verificar código
const handleVerifyCode = async () => {
  const { data, error } = await supabase.functions.invoke('get-event-participants', {
    body: { eventId, type: 'verify', verificationCode }
  });
  // Si válido, mostrar pantalla de confirmación
  // Si inválido, mostrar error
};

// Nuevo step: "verify_code" antes de "select"
// Step flow: verify_code → confirm_identity → select → done
```

### submit-selections - Cambios clave

```typescript
// Aceptar verificationCode como alternativa a selectorId
const { eventId, selectorId: rawSelectorId, verificationCode, selections } = await req.json();

let selectorId = rawSelectorId;

// Resolver código a participante si se proporciona
if (verificationCode && !selectorId) {
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('verification_code', verificationCode)
    .single();
  
  if (!participant) {
    return error('Código de verificación inválido');
  }
  selectorId = participant.id;
}
```

### EventQuotasEditor.tsx - Estructura

```typescript
const EventQuotasEditor = ({
  enabled,
  onEnabledChange,
  quotas,
  onQuotasChange,
  availableGenders,
  availableAgeRanges,
}: EventQuotasEditorProps) => {
  // Toggle para habilitar/deshabilitar cuotas
  // Lista editable de cuotas
  // Botón para añadir nueva cuota
  // Cálculo de total de plazas
};
```

---

## Orden de Implementación

1. **EventQuotasEditor.tsx** - Crear el componente de UI primero
2. **CreateEvent.tsx** - Integrar el editor en la creación de eventos
3. **submit-selections** - Añadir soporte para verificationCode
4. **ParticipantSelect.tsx** - Cambiar flujo de identificación a código

---

## Validaciones de Seguridad

- Códigos de 6 dígitos validados contra la base de datos
- No revelar si un código existe o no (mensaje genérico de error)
- Rate limiting en edge functions ya implementado
- Verificación de que el participante pertenece al evento

