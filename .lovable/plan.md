

# Plan: Corregir Flujo de Login y Añadir Acceso Super Admin en Footer

## Problemas Identificados

### Problema 1: Bucle Login → Register
El flujo actual tiene un problema en `AdminLogin.tsx`:
- Líneas 87-89: Si no hay perfil de organizador, redirige a `/admin/register`
- Pero primero debería verificar si es Super Admin ANTES de redirigir

El usuario `kleffbcn@gmail.com` tiene:
- Rol `super_admin` en `user_roles`
- Perfil de organizador `active` en `organizers`

Sin embargo, puede haber una condición de carrera donde el check de organizador falla silenciosamente y redirige a register antes de completar la verificación de super admin.

### Problema 2: No hay acceso directo a Super Admin
El usuario quiere un botón discreto en el footer para acceder directamente al login de Super Admin.

---

## Fase 1: Corregir AdminLogin.tsx

### Cambio 1.1 - Mejorar el manejo de errores y orden de verificación

El problema está en que si alguna query falla silenciosamente, el código continúa y puede redirigir incorrectamente.

**Archivo:** `src/pages/AdminLogin.tsx`

Reemplazar el `useEffect` completo (líneas 47-100) con una versión más robusta:

```typescript
const isRedirecting = useRef(false);

useEffect(() => {
  const checkAndRedirect = async () => {
    if (!user || isRedirecting.current) return;
    
    isRedirecting.current = true;
    
    try {
      // 1. PRIMERO verificar si es Super Admin
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      
      if (roleError) {
        console.error("Error checking super admin role:", roleError);
      }
      
      if (roleData) {
        console.log("Super Admin detected, redirecting...");
        navigate("/super-admin", { replace: true });
        return;
      }
      
      // 2. DESPUÉS verificar perfil de organizador
      const { data: orgData, error: orgError } = await supabase
        .from("organizers")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (orgError) {
        console.error("Error checking organizer profile:", orgError);
        isRedirecting.current = false;
        return;
      }
      
      if (orgData) {
        switch (orgData.status) {
          case "active":
            navigate("/admin/dashboard", { replace: true });
            break;
          case "pending":
            navigate("/admin/pending-approval", { replace: true });
            break;
          case "suspended":
            toast({
              title: "Cuenta suspendida",
              description: "Tu cuenta ha sido suspendida. Contacta con soporte.",
              variant: "destructive",
            });
            isRedirecting.current = false;
            break;
          default:
            isRedirecting.current = false;
        }
      } else {
        // No tiene perfil - redirigir a registro para completar
        navigate("/admin/register", { replace: true });
      }
    } catch (error) {
      console.error("Error in redirect check:", error);
      isRedirecting.current = false;
    }
  };

  if (!loading && user) {
    checkAndRedirect();
  }
}, [user, loading, navigate, toast]);
```

---

## Fase 2: Crear Página de Login Super Admin

### Nuevo archivo: `src/pages/SuperAdminLogin.tsx`

Crear una página de login específica para Super Admin, separada del login de organizadores:

```typescript
// Página de login exclusiva para Super Admin
// - Solo muestra email y contraseña
// - Verifica que el usuario tenga rol super_admin
// - Redirige a /super-admin si es válido
// - Muestra error si no es super admin
```

**Características:**
- Diseño minimalista y discreto
- Sin opción de Google ni registro
- Verificación estricta del rol super_admin
- Mensaje de error claro si las credenciales no corresponden a un super admin

---

## Fase 3: Añadir Ruta en App.tsx

**Archivo:** `src/App.tsx`

Añadir la nueva ruta:
```typescript
import SuperAdminLogin from "./pages/SuperAdminLogin";

// En Routes:
<Route path="/super-admin/login" element={<SuperAdminLogin />} />
```

---

## Fase 4: Añadir Botón Discreto en Footer

**Archivo:** `src/components/landing/Footer.tsx`

Añadir un enlace sutil al final del footer:

```typescript
// En la sección de contacto o al final
<Link 
  to="/super-admin/login" 
  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
>
  <Shield className="w-3 h-3 inline mr-1" />
  Admin
</Link>
```

---

## Resumen de Archivos a Modificar/Crear

| Archivo | Acción | Cambios |
|---------|--------|---------|
| `src/pages/AdminLogin.tsx` | Modificar | Mejorar orden de verificación y manejo de errores |
| `src/pages/SuperAdminLogin.tsx` | Crear | Nueva página de login exclusiva para Super Admin |
| `src/App.tsx` | Modificar | Añadir ruta `/super-admin/login` |
| `src/components/landing/Footer.tsx` | Modificar | Añadir enlace discreto al login de Super Admin |

---

## Credenciales Super Admin

| Campo | Valor |
|-------|-------|
| Email | `kleffbcn@gmail.com` |
| Contraseña | Debe usarse "Olvidaste tu contraseña" si no la recuerdas |

Las contraseñas se almacenan hasheadas por seguridad. Si no recuerdas la contraseña:
1. Ve a `/admin/login`
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa `kleffbcn@gmail.com`
4. Recibirás un email para resetear la contraseña

---

## Flujo Corregido

```text
Usuario en /admin/login hace login
         |
         v
useEffect detecta user autenticado
         |
         v
Verifica user_roles.role = 'super_admin'
         |
    Si → navega a /super-admin
         |
    No ↓
         v
Verifica organizers.status
         |
    active → /admin/dashboard
    pending → /admin/pending-approval
    suspended → muestra error
    null → /admin/register
```

```text
Usuario en /super-admin/login hace login
         |
         v
Verifica credenciales
         |
         v
Verifica que tiene rol super_admin
         |
    Si → navega a /super-admin
    No → muestra error "No autorizado"
```

