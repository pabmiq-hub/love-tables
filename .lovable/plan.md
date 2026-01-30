
# Plan: Configurar Super Admin y Mejorar Gestión de Organizadores

## Resumen del Estado Actual

### Base de Datos
| Tabla | Registros | Problema |
|-------|-----------|----------|
| `auth.users` | 6 usuarios | Solo 1 tiene perfil organizador |
| `user_roles` | 6 registros | kleffbcn tiene `super_admin`, otros tienen `admin` |
| `organizers` | 1 registro | Solo kleffbcn@gmail.com tiene perfil |

### Usuarios Actuales
| Email | user_id | Tiene perfil organizador? |
|-------|---------|---------------------------|
| kleffbcn@gmail.com | ee3f0f4a... | Si (activo, Enterprise) |
| pabmiq@gmail.com | a094f0c0... | No |
| test21@test.com | fd829470... | No |
| testeando@testeando.com | 82a0daa7... | No |
| paumarti.docusign@gmail.com | d5fc22bb... | No |
| kevinmofe@gmail.com | 912e554f... | No |

---

## Fase 1: Crear Nuevo Super Admin (hola@konektum.com)

### Pasos necesarios (manual desde el backend):

1. **Crear usuario** en `auth.users` con email `hola@konektum.com` y contraseña `Kleff123+`
2. **Insertar rol** en `user_roles` con `role = 'super_admin'`
3. **Opcional**: Crear perfil organizador activo con plan Enterprise si también necesita acceso de organizador

Nota: Dado que no podemos ejecutar código de modificación en este modo de plan, estas operaciones se harán mediante el panel de Lovable Cloud o edge function.

---

## Fase 2: Convertir kleffbcn@gmail.com a Usuario Normal

1. **Eliminar** el rol `super_admin` de `user_roles` para este usuario
2. **Mantener** su perfil de organizador activo con acceso completo (Enterprise, ambos módulos)

---

## Fase 3: Crear Perfiles para Usuarios Pendientes

El problema de "no ver solicitudes" es porque los usuarios registrados abandonaron el proceso o hubo un error al crear su perfil.

**Opción A - Crear perfiles automáticamente:**
Crear un perfil en `organizers` para cada usuario que tenga rol `admin` pero no tenga perfil, con status `pending`.

**Opción B - Mejorar el flujo:**
Modificar el dashboard para mostrar también usuarios de `auth.users` que tienen rol `admin` pero no perfil organizador.

Recomiendo **Opción A** ya que es más limpio y respeta el modelo de datos actual.

---

## Fase 4: Mejorar Gestión de Features por Organizador

### Cambio 1: Nueva tabla `organizer_features` (override de plan)

```sql
CREATE TABLE organizer_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE NOT NULL,
  feature_code TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organizer_id, feature_code)
);
```

Esta tabla permite:
- Habilitar features que el plan no incluye
- Deshabilitar features que el plan sí incluye (override)

### Cambio 2: Actualizar `useSuperAdmin.ts`

Añadir funciones para:
- `updateOrganizerFeatures(organizerId, featureCode, enabled)`
- Cargar features por organizador

### Cambio 3: Actualizar `SuperAdminDashboard.tsx`

Añadir UI para:
- Ver features disponibles de cada organizador
- Toggle individual de features
- Modal de gestión detallada de permisos

---

## Fase 5: UI Mejorada del Dashboard Super Admin

### Nueva pestaña "Features" en el perfil de organizador

```text
┌─────────────────────────────────────────────────────────┐
│ Organizador: Konektum (kleffbcn@gmail.com)              │
├─────────────────────────────────────────────────────────┤
│ Plan: Enterprise  |  Módulos: Social, Professional     │
├─────────────────────────────────────────────────────────┤
│ Features                                                │
│ ┌─────────────────────┬─────────────┬──────────────┐   │
│ │ Feature             │ Por Plan    │ Override     │   │
│ ├─────────────────────┼─────────────┼──────────────┤   │
│ │ Excel Import        │ ✓ Incluido  │ [✓] Activo   │   │
│ │ Analytics           │ ✓ Incluido  │ [✓] Activo   │   │
│ │ Auto Emails         │ ✓ Incluido  │ [ ] Desact.  │   │
│ │ Custom Branding     │ ✓ Incluido  │ [✓] Activo   │   │
│ └─────────────────────┴─────────────┴──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar/Crear

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `supabase/migrations/` | Crear | Tabla `organizer_features` + RLS |
| `src/hooks/useSuperAdmin.ts` | Modificar | Añadir gestión de features |
| `src/pages/SuperAdminDashboard.tsx` | Modificar | UI para gestión de features y módulos |
| `src/hooks/useFeatures.ts` | Modificar | Considerar overrides de `organizer_features` |
| Edge function | Crear | Para crear el Super Admin de forma segura |

---

## Operaciones de Base de Datos Requeridas

### 1. Crear Super Admin (hola@konektum.com)
```sql
-- Se ejecutará via edge function o API de Supabase Auth
-- 1. Crear usuario con supabase.auth.admin.createUser()
-- 2. Insertar rol super_admin
-- 3. Opcional: crear perfil organizador
```

### 2. Degradar kleffbcn@gmail.com
```sql
DELETE FROM user_roles 
WHERE user_id = 'ee3f0f4a-9a62-4562-8b41-7c4bb04696b3' 
AND role = 'super_admin';
```

### 3. Crear perfiles pendientes para usuarios sin perfil
```sql
INSERT INTO organizers (user_id, contact_email, status, plan_id)
SELECT u.id, u.email, 'pending', 
  (SELECT id FROM subscription_plans WHERE is_default = true)
FROM auth.users u
LEFT JOIN organizers o ON o.user_id = u.id
WHERE o.id IS NULL
AND u.email != 'hola@konektum.com'; -- Excluir al super admin
```

---

## Flujo de Implementación

1. **Crear edge function** para setup del Super Admin (operación privilegiada)
2. **Ejecutar migración** para crear tabla `organizer_features`
3. **Actualizar hook** `useSuperAdmin` con funciones de gestión de features
4. **Actualizar dashboard** con UI mejorada
5. **Actualizar hook** `useFeatures` para considerar overrides

---

## Consideraciones de Seguridad

- El Super Admin solo puede ser creado mediante edge function con service_role_key
- Las operaciones de cambio de rol requieren verificación de Super Admin existente
- RLS en `organizer_features` solo permite acceso a super_admin

