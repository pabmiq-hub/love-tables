

## Plan: Reestructurar sidebar + mejorar Configuración

### 1. Reordenar sidebar (`AdminSidebar.tsx`)

Nuevo orden con Analítica incluida:
1. Inicio (Home)
2. Eventos (Calendar)
3. Analítica (BarChart3) — bloqueado si no tiene `analytics`
4. Email (Mail) — bloqueado si no tiene `auto_emails`
5. Plantillas (FileText) — bloqueado si no tiene `templates`
6. Configuración (Settings) — renombrado desde "Cuenta"

Branding (Marca blanca) se añade condicionalmente como antes.

Actualizar `DashboardSection` type: `"account"` → `"settings"`.

### 2. Reescribir DashboardAccount → DashboardSettings

Nuevo componente con 4 secciones expandidas:

**A. Datos del organizador (editables)**
- Campos: empresa, email contacto, teléfono — con modo edición toggle
- Botón "Editar" / "Guardar" que hace update en `organizers`
- Logo integrado aquí (mover desde sección separada)

**B. Idioma de la plataforma**
- Selector Español / English usando `useLanguage()` del `LanguageContext` existente
- Cambio en tiempo real de toda la UI

**C. Plan actual (expandido)**
- Nombre + descripción del plan
- Lista de funcionalidades incluidas (query `plan_features` + `features` via `useFeatures`)
- Límites: max eventos, max participantes, max eventos activos + uso actual
- Estado suscripción (trial, activo, fechas)
- Botón "Cambiar plan" → abre `/#pricing`

**D. Logo** (integrado en sección A o separado visualmente)

### 3. Actualizar `AdminDashboard.tsx`

- Cambiar import `DashboardAccount` → `DashboardSettings`
- Renombrar case `"account"` → `"settings"` en `renderSection`
- Pasar props adicionales: `limits`, `allFeatures` (de `useFeatures`)

### 4. Sin migración de base de datos

Campos editables (`company_name`, `contact_email`, `contact_phone`) ya existen en `organizers`. Features del plan se obtienen de hooks existentes.

### Archivos a modificar
1. `src/components/admin/AdminSidebar.tsx` — reordenar items, renombrar account→settings
2. `src/components/admin/DashboardAccount.tsx` → reescribir como `DashboardSettings.tsx`
3. `src/pages/AdminDashboard.tsx` — actualizar imports, tipo y renderSection

