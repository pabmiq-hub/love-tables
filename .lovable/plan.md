

## Problema identificado

La tabla `organizers` solo tiene 2 registros activos. Los usuarios que ves en la captura (morgan.klaus, jkhipouros, marius.lemaire, etc.) existen en el sistema de autenticacion pero **no tienen registro en la tabla `organizers`**. Esto puede ocurrir por:

1. El registro fallo al crear el perfil de organizador (el codigo actual hace `console.error` pero no impide la navegacion)
2. Los registros de organizador fueron eliminados al cancelarlos, pero los usuarios auth siguen existiendo

## Solucion propuesta

### 1. Crear Edge Function `list-auth-users`
Una funcion backend que use el service role para listar usuarios de `auth.users` y cruzarlos con la tabla `organizers`. Devolvera tanto los que tienen perfil como los "huerfanos" (auth user sin organizer record).

### 2. Crear Edge Function `delete-auth-user`
Para que el Super Admin pueda eliminar usuarios auth huerfanos que no deberian estar en el sistema.

### 3. Añadir seccion "Usuarios Auth" al Super Admin Dashboard
Una nueva pestaña que muestre todos los usuarios del sistema de autenticacion con:
- Email, fecha de registro, ultimo login
- Estado: "Con perfil" o "Sin perfil de organizador"
- Accion para crear perfil de organizador o eliminar usuario huerfano

### 4. Mejorar el flujo de registro
Hacer que si falla la creacion del organizador, se muestre un error claro y no se redirija.

### Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| `supabase/functions/list-auth-users/index.ts` | Nuevo - lista auth users con status de organizador |
| `supabase/functions/delete-auth-user/index.ts` | Nuevo - elimina usuario auth huerfano |
| `src/hooks/useSuperAdmin.ts` | Añadir funciones para cargar/gestionar auth users |
| `src/pages/SuperAdminDashboard.tsx` | Añadir pestaña "Usuarios" con lista completa |
| `src/pages/AdminRegister.tsx` | Mejorar manejo de error al crear organizador |

