
# Plan: Verificar y Arreglar Acceso a Super Admin

## Problema Actual

Cuando navegas directamente a `/super-admin` desde el selector de rutas de Lovable sin estar autenticado:
1. El hook `useSuperAdmin` detecta que no hay usuario → `isSuperAdmin = false`
2. `SuperAdminDashboard` redirige a `/admin/login`  
3. `/admin/login` sin sesión muestra el formulario o redirige a `/admin/register`

**Esto es comportamiento esperado** - las rutas protegidas requieren autenticación previa.

---

## Credenciales del Super Admin

| Campo | Valor |
|-------|-------|
| Email | `kleffbcn@gmail.com` |
| Contraseña | La que se establecio al crear la cuenta |

> Las contrasenas no se almacenan en texto plano por seguridad. Si no la recuerdas, hay que resetearla.

---

## Fase 1: Verificar que el Fix del Login Funciona

El archivo `AdminLogin.tsx` ya fue modificado para usar `useRef` en lugar de `useState` para `isRedirecting`. Esto deberia haber solucionado el parpadeo.

**Verificacion necesaria:**
- Confirmar que la linea 44 usa `useRef`:
  ```typescript
  const isRedirecting = useRef(false);
  ```
- Confirmar que las lineas del useEffect usan `isRedirecting.current`
- Confirmar que el array de dependencias NO incluye `isRedirecting`

---

## Fase 2: Opcion de Reset de Contrasena (si es necesario)

Si no recuerdas la contrasena del Super Admin, hay dos opciones:

### Opcion A: Usar el flujo de "Olvidaste tu contrasena"
1. Ir a `/admin/login`
2. Hacer clic en "Olvidaste tu contrasena?"
3. Ingresar `kleffbcn@gmail.com`
4. Recibir email con enlace de reset
5. Establecer nueva contrasena

### Opcion B: Actualizar contrasena via Supabase (si tienes acceso)
No es posible desde el codigo - requiere acceso al panel de Lovable Cloud.

---

## Fase 3: Flujo Correcto de Acceso

```text
Usuario navega a /admin/login
         |
         v
Ingresa: kleffbcn@gmail.com + contrasena
         |
         v
signIn() exitoso → useEffect detecta user
         |
         v
checkOrganizerAndRedirect() se ejecuta
         |
         v
Verifica user_roles → encuentra super_admin
         |
         v
navigate("/super-admin", { replace: true })
         |
         v
Panel de Super Admin carga correctamente
```

---

## Resumen

| Paso | Accion |
|------|--------|
| 1 | Ir a `/admin/login` |
| 2 | Iniciar sesion con `kleffbcn@gmail.com` |
| 3 | Si no recuerdas la contrasena, usar "Olvidaste tu contrasena?" |
| 4 | El sistema redirigira automaticamente a `/super-admin` |

**No hay cambios de codigo necesarios** - el sistema esta configurado correctamente. Solo necesitas autenticarte primero.
