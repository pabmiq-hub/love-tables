

## Plan: Panel de organizador profesional en formato marca blanca

### Contexto actual

El panel del organizador muestra branding de Konektum en **todas partes**: logo en headers, estadísticas con terminología social ("Tasa de selección", "Conexiones realizadas"), y todas las páginas de participantes usan `konektumLogo`. Las plantillas de email profesionales también llevan "Konektum Business" hardcodeado.

Para un organizador **professional-only en marca blanca**, todo esto debe adaptarse para mostrar su propia identidad.

### Cambios necesarios

#### 1. Almacenamiento del logo del organizador
- Crear un **storage bucket** `organizer-logos` en Lovable Cloud
- Añadir columna `logo_url` a la tabla `organizers` (migration)
- Añadir UI en el dashboard del organizador para subir su logo

#### 2. Hook `useOrganizer` - exponer branding
- Añadir al hook un método que devuelva el logo URL y nombre de empresa
- Crear helper `getOrganizerBranding()` que devuelva `{ logoUrl, companyName, isProfessionalOnly, isWhiteLabel }`

#### 3. Componente `BrandedHeader` reutilizable
- Nuevo componente que renderiza el logo del organizador si es marca blanca, o el logo de Konektum si no
- Se usará en: `AdminDashboard`, `CreateEvent`, `EventDetail`

#### 4. Dashboard adaptado al módulo profesional
- **Estadísticas**: Cambiar "Conexiones realizadas" → "Reuniones B2B", "Tasa de selección" → "Contactos generados", "Repiten evento" → "Empresas recurrentes"
- **Badges de módulo**: No mostrar badge "Profesional" si es el único módulo (redundante)
- **Header**: Usar logo del organizador en lugar de Konektum

#### 5. Páginas de participantes - marca blanca
- `ParticipantJoin`, `ParticipantCheckin`, `ParticipantSelect`, `ParticipantTables`: cargar el branding del organizador del evento y usar su logo en vez de Konektum
- Requiere una consulta al organizer del evento (via `organizer_id` → `organizers.logo_url`)

#### 6. Emails profesionales - marca blanca
- Modificar `send-match-emails` y `send-scheduled-emails`: si el organizador tiene `logo_url` y dominio verificado, usar su nombre de empresa en headers y firma en lugar de "Konektum Business"
- El `from` ya se adapta via dominio verificado; falta adaptar el contenido HTML

### Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| **Migration SQL** | Añadir `logo_url` a `organizers`, crear bucket `organizer-logos` |
| `src/components/BrandedHeader.tsx` | Nuevo - header con logo dinámico |
| `src/hooks/useOrganizer.ts` | Añadir `branding` al return |
| `src/hooks/useEventBranding.ts` | Nuevo - carga branding del organizador de un evento (para páginas de participantes) |
| `src/pages/AdminDashboard.tsx` | Usar `BrandedHeader`, adaptar stats a módulo profesional, añadir upload de logo |
| `src/pages/CreateEvent.tsx` | Usar `BrandedHeader` |
| `src/pages/EventDetail.tsx` | Usar `BrandedHeader` |
| `src/pages/ParticipantJoin.tsx` | Usar `useEventBranding` para logo dinámico |
| `src/pages/ParticipantCheckin.tsx` | Usar `useEventBranding` para logo dinámico |
| `src/pages/ParticipantSelect.tsx` | Usar `useEventBranding` para logo dinámico |
| `src/pages/ParticipantTables.tsx` | Usar `useEventBranding` para logo dinámico |
| `supabase/functions/send-match-emails/index.ts` | Cargar branding del organizador, sustituir "Konektum Business" |

### Flujo de datos para participantes

```text
Participante accede → /event/:id/join
  → Carga evento → evento.organizer_id
    → Consulta organizers (logo_url, company_name)
      → Muestra logo del organizador o Konektum como fallback
```

