
# Plan: Reorganización del Flujo del Módulo Social

## Resumen del Problema Actual

El sistema actual tiene estos problemas de UX y lógica:

1. **Código se genera en registro**: El código de verificación se genera al registrarse, pero según tu visión debería generarse en el check-in
2. **Confusión de QR codes**: Hay QR de Registro, Check-in y Selección pero no está claro cuándo usar cada uno
3. **Modal de añadir participante manual no envía código**: Cuando el admin añade manualmente, no se genera código ni se envía email
4. **Plazas disponibles no visibles antes de registrarse**: El usuario no ve cuántas plazas quedan hasta que empieza el formulario

## Flujo Propuesto (según tu descripción)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ADMINISTRADOR/ORGANIZADOR                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CREAR EVENTO                                                    │
│     ├── Datos esenciales (nombre, fecha, ubicación)                │
│     ├── Configuración de participantes                              │
│     │   └── Límites de género/edad (opcional)                      │
│     └── ¿Cómo añadir participantes?                                │
│         ├── Manual → se genera enlace/QR de registro               │
│         ├── Excel → importación masiva (sin email)                 │
│         └── Manual + Excel                                          │
│                                                                     │
│  2. GESTIONAR INSCRIPCIONES (evento pendiente)                     │
│     ├── Ver plazas disponibles por género/edad                     │
│     ├── Añadir manualmente → email de confirmación                 │
│     ├── Importar Excel → sin email                                 │
│     └── Enlace/QR registro visible                                  │
│                                                                     │
│  3. DÍA DEL EVENTO                                                  │
│     ├── Check-in: código se genera aquí                            │
│     │   └── Si registro < 1h antes → auto check-in                 │
│     ├── Iniciar evento → genera mesas                              │
│     └── QR Mesas para participantes                                │
│                                                                     │
│  4. POST-EVENTO                                                     │
│     ├── QR Selecciones (requiere código de check-in)               │
│     └── Ver matches y enviar emails                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        PARTICIPANTE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  A. REGISTRO (antes del evento)                                     │
│     ├── Escanea QR o accede al enlace                              │
│     ├── Ve plazas disponibles ANTES de registrarse                 │
│     ├── Completa datos + confirma participación previa             │
│     ├── Recibe EMAIL DE CONFIRMACIÓN (sin código aún)              │
│     └── Si registra < 1h antes: auto check-in + código             │
│                                                                     │
│  B. CHECK-IN (día del evento)                                       │
│     ├── Organizador hace check-in manual O                         │
│     ├── Participante recibe CÓDIGO al confirmar asistencia         │
│     └── Email con código + enlaces (mesas, selecciones)            │
│                                                                     │
│  C. DURANTE EL EVENTO                                               │
│     ├── Con su código accede a /event/{id}/tables                  │
│     └── Ve sus mesas asignadas por ronda                           │
│                                                                     │
│  D. DESPUÉS DEL EVENTO                                              │
│     ├── Con su código accede a /event/{id}/select                  │
│     └── Selecciona matches (amistad/ligue)                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Cambios Necesarios

### Fase 1: Separar Registro de Check-in (Código)

**Cambio clave**: El código se genera en el CHECK-IN, no en el registro.

#### 1.1 Edge Function: `register-participant`
- Ya NO genera `verification_code` 
- Envía email de **confirmación de registro** (sin código)
- Si evento < 1 hora: genera código y hace check-in automático

#### 1.2 Edge Function: Nueva `generate-checkin-code`
- Genera código de 6 dígitos único
- Actualiza participante con `verification_code` y `checked_in = true`
- Envía email con el código

#### 1.3 Edge Function: `send-verification-email` → renombrar a `send-registration-confirmation`
- Email de confirmación de registro (sin código)
- Informa que recibirá código el día del evento

#### 1.4 Nueva Edge Function: `send-checkin-code-email`
- Email con el código de acceso
- Enlaces directos a mesas y selecciones

### Fase 2: Mejorar Visibilidad de Plazas

#### 2.1 Página de Registro (`ParticipantJoin.tsx`)
- Mostrar contador de plazas ANTES del formulario
- Formato: "Plazas disponibles: Hombres 25-32: 8/10 | Mujeres 25-32: 5/10"
- Si una combinación está llena, mostrar claramente

#### 2.2 Dashboard Admin (`EventDetail.tsx`)
- Añadir sección de "Estado de inscripciones"
- Mostrar plazas ocupadas vs totales por combinación

### Fase 3: Identificación de Participantes Recurrentes

#### 3.1 Base de datos
- Tabla `global_participants` ya existe
- Al registrarse, buscar por EMAIL primero (identificador principal)
- Verificar pregunta "¿Has participado antes?" contra historial real

#### 3.2 Lógica de Matching
- Ya existe `participant_encounters` para evitar repetir mesas
- Asegurar que funcione correctamente con identificación por email

### Fase 4: Reorganizar QR Codes y Enlaces

#### 4.1 Dashboard del Organizador
Mostrar QR según estado del evento:

| Estado | QR Disponibles |
|--------|----------------|
| `pending` | QR Registro |
| `active` | QR Mesas (para participantes) |
| `completed` | QR Selecciones |

#### 4.2 Añadir Participante Manual
Cuando admin añade manualmente:
- Generar registro en DB
- Enviar email de confirmación (igual que auto-registro)
- NO generar código hasta check-in

### Fase 5: Panel de Usuario (Código de Acceso)

#### 5.1 Unificar acceso con código
Crear una página central `/event/{id}/access`:
- Input para código de verificación
- Una vez verificado, mostrar menú:
  - Ver mis mesas (si evento activo)
  - Enviar selecciones (si evento completado)

## Archivos a Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `supabase/functions/register-participant/index.ts` | Modificar | Quitar generación de código (excepto auto-checkin) |
| `supabase/functions/send-verification-email/index.ts` | Renombrar/Modificar | Convertir en email de confirmación sin código |
| `supabase/functions/checkin-participant/index.ts` | Modificar | Añadir generación de código y envío de email |
| `src/pages/ParticipantJoin.tsx` | Modificar | Mostrar plazas disponibles al inicio |
| `src/pages/EventDetail.tsx` | Modificar | Reorganizar QR codes según estado |
| `src/components/event/AddParticipantModal.tsx` | Modificar | Enviar email de confirmación |

## Nuevo Flujo de Emails

### Email 1: Confirmación de Registro
```
Asunto: ¡Registro confirmado! - {Nombre Evento}

Hola {Nombre},

Tu registro para {Nombre Evento} el {Fecha} ha sido confirmado.

El día del evento, cuando hagas check-in, recibirás un código 
personal que te permitirá:
- Ver tus mesas asignadas
- Enviar tus selecciones después del evento

¡Te esperamos!
```

### Email 2: Código de Check-in
```
Asunto: Tu código de acceso - {Nombre Evento}

Hola {Nombre},

¡Bienvenido/a al evento! Este es tu código personal:

    [847293]

Con este código puedes:
✅ Ver tus mesas: {enlace}/tables?code={codigo}
💕 Enviar selecciones: {enlace}/select?code={codigo}

Guarda este código, lo necesitarás durante y después del evento.
```

## Orden de Implementación

1. **Modificar `register-participant`**: Quitar código excepto auto-checkin
2. **Crear `send-registration-confirmation`**: Email sin código
3. **Modificar `checkin-participant`**: Añadir generación de código
4. **Crear `send-checkin-code-email`**: Email con código
5. **Actualizar `ParticipantJoin.tsx`**: Mostrar plazas al inicio
6. **Actualizar `EventDetail.tsx`**: Reorganizar QR y enviar email al añadir manual
7. **Actualizar `ParticipantCheckin.tsx`**: Flujo donde se recibe código
8. **Actualizar `AddParticipantModal.tsx`**: Enviar email confirmación

## Consideraciones Técnicas

### Identificación por Email
- Email es el identificador principal para detectar participantes recurrentes
- La tabla `global_participants` ya lo soporta
- El campo `is_returning_participant` se verifica contra historial real

### Seguridad
- Código de 6 dígitos solo se genera en check-in
- Rate limiting en todas las edge functions
- Validación UUID en todas las peticiones

### Compatibilidad
- Eventos existentes con códigos ya generados seguirán funcionando
- Nuevos eventos usarán el flujo revisado
