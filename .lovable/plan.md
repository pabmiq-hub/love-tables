

## Estado actual del sistema de feature gating

La infraestructura base **ya existe** y funciona:

**Base de datos (completa):**
- Tabla `features` con 16 funcionalidades definidas (core, social, professional)
- Tabla `subscription_plans` con 3 planes (Free, Professional, Enterprise) y sus límites
- Tabla `plan_features` mapeando qué features tiene cada plan
- Tabla `organizer_features` para overrides por organizador
- Cada organizador tiene un `plan_id` asignado

**Frontend (parcialmente implementado):**
- `useFeatures` hook carga las features del plan y los overrides correctamente
- `FeatureGate` componente wrapper listo para bloquear UI
- `useOrganizer` hook con `canCreateEvent()` y `canAddParticipants()` para límites

**Uso actual (muy limitado):**
Solo se usa `hasFeature` en 2 sitios de `EventDetail.tsx`:
1. `analytics` - oculta/muestra la pestaña de analítica
2. `excel_import` - oculta/muestra el botón de importación Excel

---

## Lo que falta: aplicar el bloqueo en todos los puntos relevantes

Hay muchas funcionalidades que tienen su feature flag definido en la BD pero **no se bloquean** en el frontend. Necesitamos envolverlas con `FeatureGate` o `hasFeature`.

### Plan de implementación

**1. Bloquear funcionalidades en EventDetail.tsx**

Aplicar `hasFeature` o `<FeatureGate>` en los siguientes puntos:
- `auto_emails` — Pestaña/sección de emails automáticos y programación
- `basic_emails` — Envío de emails de matches
- `avoid_encounters` — Sección de exclusiones (ExclusionsManager)
- `manual_matches` — Botón/acción de crear matches manuales
- `custom_branding` — Opciones de personalización de marca

**2. Bloquear funcionalidades en CreateEvent.tsx**

- `excel_import` — Ya parcialmente hecho, asegurar bloqueo completo
- Validar límites de `max_participants_per_event` y `max_active_events` al crear evento (ya existe `canCreateEvent` pero verificar que se aplica)

**3. Bloquear en el Dashboard del organizador (AdminDashboard.tsx)**

- `analytics` — Pestaña de analítica en el dashboard principal
- `auto_emails` — Sección de configuración de email (`DashboardEmail`)
- `custom_branding` — Sección de marca blanca (`DashboardBranding`)

**4. Bloquear en AdminSidebar.tsx**

Ocultar o mostrar con candado los items del menú lateral según las features del plan:
- Email → `auto_emails`
- Marca blanca → `custom_branding`
- Analítica → `analytics`

**5. Aplicar límites cuantitativos**

- Al añadir participantes: verificar `max_participants_per_event` y mostrar mensaje de upgrade
- Al crear evento: verificar `max_active_events` y bloquear con `UpgradePrompt`
- Mostrar contadores tipo "15/20 participantes" en la UI

**6. Mejorar el componente UpgradePrompt**

Conectar los botones "Mejorar plan" y "Ver planes disponibles" para que lleven a una página o modal de planes (o a la sección de pricing de la landing).

### Archivos a modificar

- `src/pages/EventDetail.tsx` — Envolver secciones con FeatureGate
- `src/pages/CreateEvent.tsx` — Validar límites antes de crear
- `src/pages/AdminDashboard.tsx` — Gate en pestañas del dashboard
- `src/components/admin/AdminSidebar.tsx` — Iconos de candado en menú
- `src/components/event/EmailManagement.tsx` — Gate en emails
- `src/components/event/ExclusionsManager.tsx` — Gate en exclusiones
- `src/components/UpgradePrompt.tsx` — Conectar navegación a planes

