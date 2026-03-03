

## Plan: Rediseño del panel de administración con sidebar navegable

### Problema actual
Todo está apilado en una sola página scrollable: estadísticas, subida de logo, configuración de email, lista de eventos. No hay estructura de navegación clara ni separación de contextos. El resultado es un panel desordenado que no escala bien a medida que se añaden funcionalidades.

### Diseño propuesto

Inspirándose en la referencia (sidebar con iconos a la izquierda + área de contenido principal), el dashboard se reorganiza como un layout con sidebar colapsable usando el componente Shadcn `Sidebar` ya disponible en el proyecto.

```text
┌──────────────────────────────────────────────────┐
│ Header (BrandedHeader con nombre usuario)        │
├─────────┬────────────────────────────────────────┤
│         │                                        │
│  📊     │   Contenido dinámico según sección     │
│  📅     │                                        │
│  ⚙️     │   - Inicio: KPIs + resumen             │
│  ✉️     │   - Eventos: lista + crear             │
│  🎨     │   - Analítica: stats globales          │
│  🏷️     │   - Email: dominio + plantillas        │
│  🚪     │   - Cuenta: logo, datos, plan          │
│         │   - Marca blanca (si aplica)            │
│         │                                        │
└─────────┴────────────────────────────────────────┘
```

### Secciones del sidebar

| Icono | Sección | Contenido |
|-------|---------|-----------|
| Home | **Inicio** | KPIs principales (3 cards grandes) + eventos recientes (últimos 3) + acceso rápido a crear evento |
| Calendar | **Eventos** | Lista completa de eventos + botón crear (lo que hoy ocupa la mitad del dashboard) |
| BarChart3 | **Analítica** | Estadísticas generales detalladas (las 4 cards secundarias actuales, expandibles con gráficos en el futuro) |
| Mail | **Email** | `EmailConnectionManager` completo + futura sección de plantillas |
| Settings | **Cuenta** | Datos del organizador, plan actual, subida de logo, cambiar contraseña |
| Palette | **Marca blanca** | Solo visible si `isProfessionalOnly`: personalización visual, logo, colores (futuro) |
| LogOut | **Cerrar sesión** | Acción directa |

### Arquitectura de archivos

| Archivo | Acción |
|---------|--------|
| `src/pages/AdminDashboard.tsx` | Refactorizar: convertir en layout con `SidebarProvider` + router interno por sección (estado local, sin subrutas) |
| `src/components/admin/AdminSidebar.tsx` | **Nuevo** - Sidebar con iconos y labels, colapsable, highlighting de sección activa |
| `src/components/admin/DashboardHome.tsx` | **Nuevo** - Vista inicio con KPIs + eventos recientes |
| `src/components/admin/DashboardEvents.tsx` | **Nuevo** - Lista de eventos + crear (extraído del dashboard actual) |
| `src/components/admin/DashboardAnalytics.tsx` | **Nuevo** - Estadísticas globales (extraído del dashboard actual) |
| `src/components/admin/DashboardEmail.tsx` | **Nuevo** - Wrapper del `EmailConnectionManager` |
| `src/components/admin/DashboardAccount.tsx` | **Nuevo** - Datos de cuenta, plan, logo |
| `src/components/admin/DashboardBranding.tsx` | **Nuevo** - Configuración marca blanca (solo profesional) |

### Comportamiento

- **Sin subrutas nuevas**: se usa un estado `activeSection` en `AdminDashboard` que cambia el contenido renderizado. Mantiene la URL `/admin/dashboard` simple.
- **Sidebar colapsable**: en móvil se colapsa automáticamente a iconos. En desktop muestra iconos + texto.
- **Marca blanca condicional**: la sección "Marca blanca" solo aparece en el sidebar si `branding.isProfessionalOnly`.
- **Datos compartidos**: los hooks `useOrganizer`, `useAuth`, `useFeatures` se consumen en `AdminDashboard` y se pasan como props a las sub-vistas, evitando múltiples llamadas.

### Detalle técnico

El layout principal usa `SidebarProvider` de Shadcn:

```text
AdminDashboard
  └─ SidebarProvider
       ├─ AdminSidebar (activeSection, onSelect, branding)
       └─ main
            ├─ BrandedHeader + SidebarTrigger
            └─ {activeSection === "home" && <DashboardHome />}
              {activeSection === "events" && <DashboardEvents />}
              ...
```

Cada sub-componente recibe las props necesarias (events, stats, branding, handlers) desde `AdminDashboard` que centraliza la carga de datos.

