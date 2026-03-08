

## Plan: Sistema de Marca Blanca gestionado desde Super Admin

### Contexto actual
- La marca blanca se determina implícitamente: `isProfessionalOnly && !!logo_url`
- El `DashboardBranding` del organizador es un placeholder "Próximamente"
- El Super Admin puede gestionar módulos y features, pero no hay configuración de branding personalizada (colores, textos, etc.)
- Los organizadores pueden subir su logo desde "Mi Cuenta"

### Arquitectura propuesta

**1. Nueva tabla `organizer_branding`** para almacenar la configuración visual completa:
- `organizer_id` (FK a organizers)
- `is_white_label` (boolean) — activado/desactivado por el Super Admin
- `primary_color` (texto, hex) — color principal de la marca
- `secondary_color` (texto, hex) — color secundario
- `background_color` (texto, hex) — fondo personalizado
- `font_family` (texto) — tipografía (selección de un catálogo predefinido)
- `custom_welcome_text` (texto) — mensaje de bienvenida para participantes
- `custom_footer_text` (texto) — pie de página personalizado
- `hide_konektum_branding` (boolean) — ocultar completamente "Powered by Konektum"
- `created_at`, `updated_at`

RLS: el organizador lee/actualiza su propio registro; super admin gestiona todos.

**2. Super Admin Dashboard — Nueva pestaña "Marca Blanca"**

Añadir una pestaña en `SuperAdminDashboard.tsx` que muestre:
- Lista de organizadores con estado de marca blanca (activado/desactivado)
- Toggle rápido para activar/desactivar marca blanca por organizador
- Al activar, automáticamente habilitar el feature `custom_branding` en `organizer_features`
- Vista rápida del logo actual y colores configurados por cada organizador
- Botón para abrir un modal de configuración inicial (presets de colores)

**3. Panel del organizador — Desarrollar `DashboardBranding`**

Reemplazar el placeholder actual con un editor completo:
- **Logo**: ya funciona desde "Mi Cuenta", mostrar preview aquí también
- **Colores**: color pickers para primario, secundario, fondo
- **Tipografía**: selector con opciones predefinidas (Outfit, Inter, Poppins, Montserrat, etc.)
- **Textos personalizados**: campos para mensaje de bienvenida y footer
- **Toggle "Ocultar marca Konektum"**: si el plan lo permite
- **Preview en vivo**: tarjeta de ejemplo que muestra cómo se verá la experiencia del participante

**4. Aplicación del branding en páginas de participantes**

- Extender `useEventBranding` para cargar también los datos de `organizer_branding`
- Inyectar CSS variables dinámicas (`--brand-primary`, `--brand-secondary`, `--brand-bg`) en las páginas de participantes cuando `is_white_label === true`
- Las páginas `ParticipantJoin`, `ParticipantCheckin`, `ParticipantSelect`, `ParticipantTables` ya usan `BrandedHeader` — añadir soporte para colores y tipografía dinámica
- Condicionar el "Powered by Konektum" footer según `hide_konektum_branding`

**5. Extender `useOrganizer`**

Cambiar la lógica de `isWhiteLabel`: en lugar de inferirlo de `isProfessionalOnly && logo_url`, leerlo directamente de `organizer_branding.is_white_label`. Añadir los campos de branding al objeto `branding` que ya se exporta.

### Archivos a modificar/crear

| Archivo | Cambio |
|---|---|
| `supabase/migrations/...` | Crear tabla `organizer_branding` con RLS |
| `src/pages/SuperAdminDashboard.tsx` | Nueva pestaña "Marca Blanca" con lista y toggles |
| `src/components/admin/DashboardBranding.tsx` | Reescribir con editor de colores, tipografía, textos y preview |
| `src/hooks/useOrganizer.ts` | Cargar `organizer_branding`, cambiar lógica `isWhiteLabel` |
| `src/hooks/useEventBranding.ts` | Cargar branding completo (colores, fuente) para participantes |
| `src/hooks/useSuperAdmin.ts` | Funciones para activar/desactivar marca blanca |
| `src/components/BrandedHeader.tsx` | Soporte para colores dinámicos |
| Páginas de participantes | Aplicar CSS variables de branding |

### Flujo de uso

1. Super Admin entra a pestaña "Marca Blanca" → ve lista de organizadores → activa la marca blanca para uno
2. Esto crea un registro en `organizer_branding` y habilita el feature `custom_branding`
3. El organizador entra a su dashboard → la sección "Marca blanca" ya no muestra "Próximamente" sino el editor completo
4. El organizador configura colores, tipografía y textos
5. Los participantes de sus eventos ven la experiencia completamente personalizada

