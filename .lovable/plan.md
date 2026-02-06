# Plan: Sistema de Códigos de Verificación y Cuotas - Módulo Social

## Estado: ✅ COMPLETADO

## Resumen de la Implementación

Se ha reorganizado completamente el flujo del módulo social para separar el registro del check-in:

### Cambios Principales

#### 1. Generación de Código en Check-in (no en Registro)
- **Antes**: El código de 6 dígitos se generaba al registrarse
- **Ahora**: El código se genera cuando el organizador hace check-in al participante
- **Excepción**: Si el registro ocurre < 1 hora antes del evento → auto check-in + código

#### 2. Dos Emails Separados
- **Email de Confirmación de Registro** (`send-registration-confirmation`): Sin código, informa que recibirá código el día del evento
- **Email de Código de Check-in** (`send-checkin-code`): Con código de 6 dígitos y enlaces directos

#### 3. Reorganización de QR Codes por Estado
| Estado | QR Disponibles |
|--------|----------------|
| `pending` | QR Registro (para nuevos participantes) |
| `active` | QR Mesas (para que participantes vean sus mesas) |
| `completed` | QR Selección (para enviar matches) |

#### 4. Visibilidad de Plazas Antes de Registrarse
- La página de registro (`ParticipantJoin.tsx`) ahora muestra las plazas disponibles por género/edad ANTES del formulario
- Los usuarios ven claramente qué plazas quedan antes de completar sus datos

#### 5. Identificación de Participantes Recurrentes
- El sistema verifica automáticamente si el email ya existe en `global_participants`
- Se marca `is_returning_participant` correctamente basándose en historial real

## Archivos Modificados

### Edge Functions
- `supabase/functions/register-participant/index.ts` - Ya no genera código (excepto auto-checkin)
- `supabase/functions/checkin-participant/index.ts` - Genera código y envía email
- `supabase/functions/send-registration-confirmation/index.ts` - **NUEVO** - Email sin código
- `supabase/functions/send-checkin-code/index.ts` - **NUEVO** - Email con código
- `supabase/config.toml` - Registradas las nuevas funciones

### Frontend
- `src/pages/ParticipantJoin.tsx` - Muestra plazas antes del formulario, pantalla de éxito diferenciada
- `src/pages/EventDetail.tsx` - QRs reorganizados por estado, añadido QR Mesas
- `src/components/event/EventQRCode.tsx` - Añadido tipo "tables"

## Flujo del Usuario

### Participante
1. Escanea QR Registro o accede al enlace
2. Ve plazas disponibles ANTES de registrarse
3. Completa formulario + confirma participación previa
4. Recibe email de confirmación (sin código)
5. El día del evento, organizador hace check-in
6. Recibe email con código de 6 dígitos
7. Con código accede a mesas (/tables) y selecciones (/select)

### Organizador
1. Crea evento con límites opcionales de género/edad
2. Ve QR Registro durante fase "pending"
3. Hace check-in manual a participantes (código se genera aquí)
4. Inicia evento → QR Mesas disponible
5. Cierra evento → QR Selección disponible

## Próximos Pasos (Sugeridos)

- [ ] Añadir opción de reenviar email de código si no llega
- [ ] Dashboard de cuotas en tiempo real para organizador
- [ ] Página unificada de acceso `/event/{id}/access` con menú de opciones
