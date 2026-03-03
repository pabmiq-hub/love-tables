

## Plan: Flujo de alta de organizador marca blanca desde Super Admin

### Situación actual
El Super Admin solo puede:
- Aprobar organizadores que se auto-registran
- Crear perfil de organizador para usuarios auth existentes sin perfil

No puede crear un organizador marca blanca de cero (usuario + perfil + configuración profesional).

### Cambios propuestos

#### 1. Botón "Crear organizador" en SuperAdminDashboard
Añadir un botón en la pestaña de Organizadores que abra un modal/dialog con un formulario:
- Email del organizador
- Contraseña temporal
- Nombre de empresa
- Teléfono de contacto (opcional)
- Selector de plan
- Selector de módulos (con preset "Solo Profesional / Marca Blanca")
- Estado inicial: activo (sin necesidad de aprobación)

#### 2. Edge function `create-organizer` 
Nueva función que usa el service role para:
- Crear usuario en `auth.users` con `email_confirm: true`
- Asignar rol `admin` en `user_roles`
- Crear perfil en `organizers` con los datos proporcionados (plan, módulos, estado activo)
- Devolver credenciales al Super Admin para comunicarlas al organizador

#### 3. Preset "Marca Blanca Profesional"
En el formulario de creación, un checkbox o preset que automáticamente:
- Selecciona solo el módulo `professional`
- Marca un campo visual indicando que es marca blanca
- El organizador, una vez logado, puede subir su logo desde su dashboard (ya implementado)

### Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `supabase/functions/create-organizer/index.ts` | Nuevo - crea usuario + perfil desde service role |
| `src/pages/SuperAdminDashboard.tsx` | Añadir botón + modal de creación |
| `src/hooks/useSuperAdmin.ts` | Añadir método `createNewOrganizer()` |

### Flujo resultante

```text
Super Admin → "Crear organizador" → Formulario
  → Selecciona "Marca Blanca Profesional"
  → Rellena email, contraseña, empresa, plan
  → Edge function crea auth user + organizer (activo)
  → Super Admin comunica credenciales al organizador
  → Organizador inicia sesión → sube logo → marca blanca activa
```

