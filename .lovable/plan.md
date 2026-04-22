

# Plan: Reactivar cuenta Super Admin `hola@konektum.com`

## Problema
La cuenta `hola@konektum.com` no permite acceder a `/super-admin/login`. Posibles causas:
1. El rol `super_admin` no está asignado en la tabla `user_roles`.
2. La contraseña actual no coincide con `Kleff123+`.
3. El email no está confirmado.

## Acciones a ejecutar

### 1. Diagnóstico (read_query)
Comprobar el estado actual de la cuenta:
- Verificar si existe en `auth.users` (id, email_confirmed_at).
- Verificar si tiene rol en `user_roles` (`role = 'super_admin'`).

### 2. Reactivación vía Edge Function `setup-super-admin`
Invocar la edge function existente con `action = "create-super-admin"`:
- Si la cuenta **no existe** → la creará con email `hola@konektum.com`, password `Kleff123+`, email confirmado y rol `super_admin`.
- Si la cuenta **existe pero sin rol** → reasignar el rol manualmente con migración `INSERT INTO user_roles`.
- Si la cuenta **existe con contraseña distinta** → resetear contraseña usando `auth.admin.updateUserById` mediante una pequeña edge function temporal o migración SQL directa sobre `auth.users` (encriptando con `crypt`).

### 3. Estrategia concreta según diagnóstico
- **Caso A — Falta rol**: Migración SQL `INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'super_admin') ON CONFLICT DO NOTHING;`
- **Caso B — Contraseña corrupta**: Migración SQL:
  ```sql
  UPDATE auth.users
  SET encrypted_password = crypt('Kleff123+', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE email = 'hola@konektum.com';
  ```
- **Caso C — No existe usuario**: Invocar `setup-super-admin` (requiere secret `SUPER_ADMIN_SETUP_KEY`; si no está configurado se hará vía SQL directo creando usuario en `auth.users` + rol).

### 4. Verificación final
- Confirmar que se puede leer el rol con `SELECT * FROM user_roles WHERE role='super_admin'`.
- Pedir al usuario que pruebe acceso en `/super-admin/login` con `hola@konektum.com` / `Kleff123+`.

## Notas técnicas
- La modificación directa de `auth.users` es excepcionalmente permitida en este caso de recuperación administrativa (se usa la extensión `pgcrypto` ya instalada por Supabase).
- No se tocará ninguna otra cuenta.
- Tras restaurar el acceso, recordatorio: usar siempre `hola@konektum.com` (la `kleffbcn@gmail.com` quedó degradada según memoria).

