

## Plan: Formulario de registro B2B diferenciado + Rotación cliente/proveedor en gestión de evento

### Problema
El formulario público de registro (`ParticipantJoin.tsx`) muestra siempre las preguntas del módulo social (género, preferencias de ligue, fecha de nacimiento, etc.) incluso para eventos profesionales B2B, donde estas preguntas no son relevantes.

### Solución

**1. Formulario de registro B2B multi-paso en `ParticipantJoin.tsx`**

Cuando el evento tiene `module === "professional"`, mostrar un formulario completamente diferente con fases:

- **Fase 1: Datos de contacto** — Nombre, email, teléfono
- **Fase 2: ¿Eres cliente o proveedor?** — Selección de `entity_type` con tarjetas visuales
- **Fase 3: Datos de empresa** — Nombre de empresa, sector (dropdown con opciones del `professional_config.sectors` del evento), tamaño de empresa
- **Fase 4: Necesidades o soluciones** — Si es cliente: "¿Qué necesitas?" (checkboxes con opciones del `professional_config.predefined_needs`). Si es proveedor: "¿Qué ofreces?" (checkboxes con `predefined_solutions`)

Se elimina: género, fecha de nacimiento, rango de edad preferido, preferencia de ligue, dating preference, cuotas de género.

**2. Cargar `professional_config` en el fetch del evento**

Añadir `professional_config` al query de `ParticipantJoin.tsx` para acceder a los sectores, necesidades y soluciones predefinidas del organizador.

**3. Nueva Edge Function o adaptar `register-participant`**

Crear una rama condicional en `register-participant` para eventos profesionales:
- Campos requeridos diferentes: `eventId, name, email, phone, entityType, companyName, sector, companySize`
- Sin validación de edad, género ni preferencias de dating
- Guardar `entity_type`, `company_name`, `sector`, `company_size`, `needs`, `solutions` en la tabla `participants`

**4. Rotación en la gestión del evento (`EventSettingsEditor.tsx`)**

Para eventos profesionales, añadir un selector de tipo de rotación B2B:
- "Clientes fijos – Proveedores rotan"
- "Proveedores fijos – Clientes rotan"

Esto ya existe en `CreateEvent.tsx` como `b2bRotationType`, pero NO en `EventSettingsEditor.tsx`. Hay que añadirlo ahí y persistirlo en `professional_config.rotation_type`.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/ParticipantJoin.tsx` | Detectar `module` del evento. Si es `professional`, renderizar formulario B2B multi-paso en lugar del social |
| `supabase/functions/register-participant/index.ts` | Añadir rama para registro profesional con validación de campos B2B |
| `src/components/event/EventSettingsEditor.tsx` | Añadir selector de rotación B2B cuando el evento es profesional |
| `src/i18n/translations.ts` | Añadir traducciones para el formulario B2B (es/en) |

### Detalle técnico

**ParticipantJoin.tsx — flujo B2B:**
```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Paso 1          │────▶│  Paso 2           │────▶│  Paso 3          │────▶│  Paso 4           │
│  Nombre, Email,  │     │  ¿Cliente o       │     │  Empresa, Sector,│     │  Necesidades (C)  │
│  Teléfono        │     │   Proveedor?      │     │  Tamaño          │     │  o Soluciones (P)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └──────────────────┘
```

**Edge function — registro profesional:**
- Si `event.module === 'professional'`: validar `entityType, companyName, sector, companySize` en vez de `gender, birthDate, preference`
- Insertar con campos profesionales, sin `age_range`, `gender`, `preference`, `dating_preference`

**EventSettingsEditor.tsx:**
- Recibir nueva prop `module` y `professionalConfig`
- Mostrar selector de rotación B2B (`client_fixed` / `provider_fixed`) cuando `module === "professional"`
- Ocultar campos no relevantes para B2B (paridad de género, preferencias sociales)
- Guardar `professional_config` actualizado en el evento

