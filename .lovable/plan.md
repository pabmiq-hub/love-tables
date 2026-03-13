

## Plan: Sistema de Plantillas para el Dashboard (Plan Enterprise)

### Resumen

Crear una nueva sección **"Plantillas"** en el dashboard del organizador (disponible solo en plan Enterprise), con 3 subsecciones: plantillas de formularios de registro, plantillas de emails, y plantillas de eventos. Además, integrar la selección de plantilla de formulario durante la creación de eventos profesionales.

### 1. Base de datos — Nueva tabla `organizer_templates`

Una tabla unificada para almacenar todos los tipos de plantilla:

```sql
CREATE TABLE organizer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'registration_form' | 'email' | 'event'
  subtype TEXT, -- 'social' | 'professional' | 'match_results' | 'registration_confirmation' | 'access_code' | 'reminder'
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Historial de cambios
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES organizer_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  changed_by TEXT, -- descripción del cambio
  created_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: solo el organizador dueño puede CRUD. Super admin puede gestionar todo.

Feature gate: crear un nuevo feature code `templates` asignado al plan Enterprise.

### 2. Sección "Plantillas" en el Dashboard

**Nuevo `DashboardSection`: `"templates"`**

Archivos a modificar/crear:
- `AdminSidebar.tsx` — Añadir item "Plantillas" con icono `FileText`, gateado por feature `templates`
- `AdminDashboard.tsx` — Añadir case `"templates"` en `renderSection()` con gate
- **Nuevo** `src/components/admin/DashboardTemplates.tsx` — Componente principal con 3 tabs:

**Tab 1: Formularios de registro**
- Lista de plantillas tipo `registration_form` con subtipo `social` o `professional`
- Incluir 2-3 plantillas predefinidas (seed) como "B2B Estándar", "Networking Rápido"
- Botón "Crear nueva plantilla" → editor de campos del formulario
- El `content` JSON almacena: campos habilitados, orden, opciones de sectores/necesidades/soluciones, textos personalizados

**Tab 2: Correos electrónicos**
- Plantillas de email por tipo: confirmación de registro, código de acceso, recordatorio de selección, resultados de matches
- Reutilizar la interfaz de `EmailTemplateEditor` adaptada para guardar como plantilla
- Cada plantilla guarda el JSON de `EmailTemplate` o `ProfessionalEmailTemplate`

**Tab 3: Plantillas de eventos**
- Guardar configuraciones completas de eventos (rounds, table_size, rotation, professional_config, etc.) como plantilla reutilizable
- Al crear evento: opción de "Usar plantilla" que precarga todos los valores
- Solo necesita actualizar fecha, lugar y descripción

**Cada tab incluye:**
- Lista con nombre, subtipo, fecha de última modificación
- Acciones: editar, duplicar, eliminar, ver historial de versiones
- Al guardar cambios → se crea entrada en `template_versions` con el contenido anterior

### 3. Selección de formulario al crear evento profesional

En `CreateEvent.tsx`, añadir un paso intermedio después de seleccionar módulo "professional":

**"¿Cómo quieres gestionar el formulario de registro?"**
- 🤖 **Formulario automático** — Usa el formulario B2B estándar con las opciones del `professional_config`
- 📋 **Usar una plantilla guardada** — Selector con las plantillas tipo `registration_form` + subtipo `professional` del organizador
- ✏️ **Crear formulario personalizado** — Abre el editor inline para configurar campos específicos para este evento

La elección se guarda en `professional_config.registration_form_mode`: `"auto" | "template" | "custom"` y opcionalmente `professional_config.registration_template_id`.

En `ParticipantJoin.tsx`, el `B2BRegistrationForm` leerá el modo y, si es `template`, cargará la configuración de la plantilla para determinar qué campos mostrar y con qué opciones.

### 4. Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `src/components/admin/DashboardTemplates.tsx` | **Crear** — Página principal con 3 tabs |
| `src/components/admin/templates/FormTemplateEditor.tsx` | **Crear** — Editor de plantillas de formulario |
| `src/components/admin/templates/EmailTemplateManager.tsx` | **Crear** — Gestión de plantillas de email |
| `src/components/admin/templates/EventTemplateManager.tsx` | **Crear** — Gestión de plantillas de evento |
| `src/components/admin/templates/VersionHistoryModal.tsx` | **Crear** — Modal de historial de versiones |
| `src/components/admin/AdminSidebar.tsx` | **Editar** — Añadir item "Plantillas" |
| `src/pages/AdminDashboard.tsx` | **Editar** — Añadir section "templates" |
| `src/pages/CreateEvent.tsx` | **Editar** — Paso de selección de formulario para profesional |
| `src/pages/ParticipantJoin.tsx` | **Editar** — Cargar config de plantilla si aplica |
| `src/i18n/translations.ts` | **Editar** — Traducciones para templates |
| Migración SQL | **Crear** — Tablas `organizer_templates` + `template_versions` + feature `templates` + asignar a plan Enterprise |

### 5. Feature gating

- Nueva feature `templates` en tabla `features`
- Asignar a plan Enterprise en `plan_features`
- En sidebar y dashboard, mostrar con candado si no tiene la feature
- Mostrar `UpgradePrompt` al intentar acceder sin el plan adecuado

