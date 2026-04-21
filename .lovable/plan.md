
# Eventos de Prueba (Test Mode) — Plan Empresa

Crear una opción para generar eventos de prueba con participantes ficticios, exclusiva del plan **Empresa**. Estos eventos quedan marcados como "test" y se excluyen de toda analítica/dashboard global.

## Cómo lo verás como administrador

1. **En el listado "Mis Eventos"** y dentro de **Crear Nuevo Evento** aparecerá un botón pequeño junto al título: **"Modo prueba"** (icono FlaskConical).
   - Solo visible para usuarios con plan **Empresa** (o Super Admin).
   - Para otros planes mostrará un candado con tooltip "Disponible en el plan Empresa".

2. **Al activar el modo prueba**, el flujo de creación funciona igual, pero al final del wizard aparece un nuevo paso: **"Generación de participantes ficticios"**, donde podrás configurar:
   - **Cantidad** de participantes a generar (por defecto: igual al `tableSize × rounds`).
   - **Distribución demográfica** (% por género, rango de edad, preferencias) con sliders.
   - **Idioma de los nombres** (español/inglés) y prefijo opcional (ej. `[TEST] Ana G.`).
   - **Email de prueba**: opción de redirigir todos los correos a un email tuyo (single inbox) o desactivar envíos por completo.
   - Para módulo **Profesional**: sectores, tamaños de empresa y necesidades/soluciones aleatorias.

3. **Identificación visual del evento de prueba**:
   - Badge naranja **"PRUEBA"** en cabecera del evento, listado y dashboard.
   - Banner informativo en el detalle: "Este evento es de prueba. No cuenta para analíticas globales."
   - Los participantes ficticios llevan un badge **"Ficticio"** en su tarjeta.

4. **Exclusión de analíticas globales**:
   - El **Dashboard Home** (KPIs, sparklines, distribución por módulo, eventos recientes) ignora eventos de prueba.
   - La sección **Analíticas** del dashboard del organizador ignora eventos de prueba.
   - Las analíticas internas del propio evento de prueba **sí funcionan** (para que puedas testear el comportamiento).
   - El **CRM/Usuarios globales** no incorpora a los participantes ficticios (no se crean `global_participants`).
   - Las **campañas de remarketing** nunca verán estos contactos.

5. **Acción adicional**: botón "Convertir a evento real" (solo si está en estado `pending`) que limpia los datos de prueba y desmarca el flag (con confirmación).

## Cambios técnicos

### Base de datos (migración)
- `events`: nueva columna `is_test_event boolean NOT NULL DEFAULT false`.
- `participants`: nueva columna `is_fake boolean NOT NULL DEFAULT false`.
- Nueva feature `test_events` en tabla `features` (módulo `core`, categoría `enterprise`).
- Asignar `test_events` a `plan_features` solo para el plan `enterprise`.

### Frontend
- **`src/pages/CreateEvent.tsx`**: 
  - Añadir toggle "Modo prueba" en cabecera del wizard (gated con `hasFeature("test_events")`).
  - Nuevo paso final "Configuración de prueba" si está activo.
  - Generador local de participantes ficticios (nombres/emails/teléfonos sintéticos con prefijo `test+<uuid>@konektum.test`).
  - Al insertar el evento: `is_test_event: true`; al insertar participants: `is_fake: true`, `marketing_consent: false`.
- **`src/components/admin/DashboardEvents.tsx`**: 
  - Botón secundario "Modo prueba" junto a "Nuevo Evento" que abre el flujo con `?testMode=1`.
  - Badge "PRUEBA" en tarjetas de eventos con `is_test_event`.
- **`src/pages/AdminDashboard.tsx`**: filtrar `events` y `participants` excluyendo `is_test_event` antes de calcular `stats` y pasarlos a `DashboardHome` y `DashboardAnalytics`. Al pasar a `DashboardEvents` enviar la lista completa (para que se vean ahí).
- **`src/pages/EventDetail.tsx`**: mostrar banner naranja "Evento de prueba" + badge en cabecera + acción "Convertir a real".
- **`src/components/event/ParticipantCard.tsx`**: badge "Ficticio" cuando `is_fake`.
- **Edge functions de envío de emails** (`send-registration-confirmation`, `send-match-emails`, `send-checkin-code`, etc.): cortocircuito si `is_test_event === true` y `code_send_mode !== 'manual'` salvo que el organizador haya configurado un email de redirección (guardado en `events.professional_config` o nuevo campo `test_config jsonb`).
- **Edge functions de CRM** (`register-participant`): no crear `global_participants` ni `participant_encounters` cuando el evento es de prueba.

### Diagrama del flujo
```text
Admin → "Mis eventos"
        ├── [Nuevo Evento]   → wizard normal
        └── [Modo Prueba 🧪]  → wizard normal + paso "Generar ficticios"
                              → guarda event.is_test_event=true
                              → participants.is_fake=true
                              → emails bloqueados / redirigidos
                              → excluido de stats globales
                              → analítica interna del evento OK
```

## Notas y limitaciones
- Los eventos de prueba **sí cuentan** contra el límite `max_active_events` del plan (para evitar abuso). Si quieres que no cuente, indícalo y lo ajusto.
- Los participantes ficticios **no podrán** acceder al portal `/access` real (sin email válido), pero podrás simular check-in manual desde el panel para probar mesas, rondas y matches.
- La conversión "prueba → real" eliminará todos los participantes ficticios y reseteará selecciones/encuentros del evento.
