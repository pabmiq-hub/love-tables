

# Plan: Corregir Bucle de Redirección en Sistema de Autenticación

## Diagnóstico del Problema

El sistema tiene un **bucle de redirección circular** causado por condiciones de carrera entre múltiples `useEffect` hooks:

```text
/admin/login (usuario autenticado sin perfil)
       |
       v
Muestra "needsRegistration" → Usuario hace clic "Ya tengo cuenta"
       |
       v
Navega a /admin/login → useEffect detecta usuario → Verifica BD
       |
       v
Parpadeo continuo porque el estado no se resetea correctamente
```

### Problemas Identificados

| # | Archivo | Problema | Causa |
|---|---------|----------|-------|
| 1 | `AdminLogin.tsx` | El `useEffect` se ejecuta en cada re-render | No hay flag para evitar ejecucion repetida mientras se procesan queries |
| 2 | `AdminLogin.tsx` | `isRedirecting.current` solo se setea DESPUES de confirmar redirect | Hay una ventana donde se ejecutan queries duplicadas |
| 3 | `useAuth.ts` | `loading` cambia de `true` a `false` dos veces | Tanto el listener como `getSession()` llaman `setLoading(false)` |
| 4 | `SuperAdminDashboard.tsx` | Redirige a `/admin/login` que luego puede redirigir de vuelta | Bucle circular |

---

## Fase 1: Corregir useAuth.ts - Evitar doble setLoading

**Archivo:** `src/hooks/useAuth.ts`

El problema es que `setLoading(false)` se llama dos veces - una desde `onAuthStateChange` y otra desde `getSession()`. Esto causa re-renders innecesarios.

**Cambios:**
- Usar un flag `initialLoadDone` para controlar que solo se setee loading una vez
- El listener NO debe controlar el loading inicial, solo los cambios posteriores

```typescript
useEffect(() => {
  let initialLoadDone = false;

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Solo setear loading si ya paso la carga inicial
      if (initialLoadDone) {
        // No necesitamos setear loading aqui para cambios posteriores
      }
    }
  );

  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    initialLoadDone = true;
    setLoading(false); // Solo aqui se setea loading false
  });

  return () => subscription.unsubscribe();
}, []);
```

---

## Fase 2: Corregir AdminLogin.tsx - Prevenir ejecucion multiple

**Archivo:** `src/pages/AdminLogin.tsx`

**Cambio 1:** Setear `isRedirecting.current = true` ANTES de ejecutar cualquier query, no despues.

**Cambio 2:** Añadir un estado `isCheckingAuth` para mostrar loading mientras se verifican roles.

**Cambio 3:** Simplificar la logica para evitar estados intermedios.

```typescript
const isRedirecting = useRef(false);
const hasCheckedAuth = useRef(false);
const [isCheckingAuth, setIsCheckingAuth] = useState(false);
const [needsRegistration, setNeedsRegistration] = useState(false);

useEffect(() => {
  const checkAndRedirect = async () => {
    // Evitar ejecucion multiple
    if (!user || isRedirecting.current || hasCheckedAuth.current) return;
    
    hasCheckedAuth.current = true;
    setIsCheckingAuth(true);
    
    try {
      // 1. Verificar Super Admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      
      if (roleData) {
        isRedirecting.current = true;
        navigate("/super-admin", { replace: true });
        return;
      }
      
      // 2. Verificar organizador
      const { data: orgData } = await supabase
        .from("organizers")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (orgData) {
        isRedirecting.current = true;
        if (orgData.status === "active") {
          navigate("/admin/dashboard", { replace: true });
        } else if (orgData.status === "pending") {
          navigate("/admin/pending-approval", { replace: true });
        } else if (orgData.status === "suspended") {
          await supabase.auth.signOut();
          toast({ title: "Cuenta suspendida", variant: "destructive" });
          hasCheckedAuth.current = false;
          isRedirecting.current = false;
        }
      } else {
        // Sin perfil - mostrar opcion de completar registro
        setNeedsRegistration(true);
      }
    } catch (error) {
      console.error("Error:", error);
      hasCheckedAuth.current = false;
    } finally {
      setIsCheckingAuth(false);
    }
  };

  if (!loading && user) {
    checkAndRedirect();
  }
}, [user, loading, navigate, toast]);

// Resetear flags cuando cambia el usuario (logout/login diferente)
useEffect(() => {
  hasCheckedAuth.current = false;
  isRedirecting.current = false;
  setNeedsRegistration(false);
}, [user?.id]);
```

**Cambio 4:** Mostrar loading mientras se verifica autenticacion.

```typescript
if (loading || isCheckingAuth) {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
```

---

## Fase 3: Corregir SuperAdminLogin.tsx - Mismo patron

**Archivo:** `src/pages/SuperAdminLogin.tsx`

Aplicar el mismo patron con `hasCheckedAuth` ref para evitar verificaciones duplicadas.

---

## Fase 4: Corregir SuperAdminDashboard.tsx - Evitar redirect a login

**Archivo:** `src/pages/SuperAdminDashboard.tsx`

Cambiar el redirect de `/admin/login` a `/super-admin/login` para evitar bucle:

```typescript
useEffect(() => {
  if (!loading && !isSuperAdmin) {
    navigate("/super-admin/login"); // No /admin/login
  }
}, [loading, isSuperAdmin, navigate]);
```

---

## Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/hooks/useAuth.ts` | Evitar doble setLoading(false) |
| `src/pages/AdminLogin.tsx` | Añadir hasCheckedAuth ref, mostrar loading, resetear en cambio de user |
| `src/pages/SuperAdminLogin.tsx` | Añadir hasCheckedAuth ref para evitar verificaciones duplicadas |
| `src/pages/SuperAdminDashboard.tsx` | Cambiar redirect a /super-admin/login |

---

## Flujo Corregido

```text
Usuario navega a /admin/login
         |
         v
loading = true → Muestra spinner
         |
         v
getSession() completa → loading = false
         |
         v
Si hay user → hasCheckedAuth = true, isCheckingAuth = true
         |
         v
Muestra spinner mientras verifica BD
         |
         v
Resultado:
  - Super Admin → redirect /super-admin
  - Organizador activo → redirect /admin/dashboard
  - Organizador pendiente → redirect /admin/pending-approval
  - Sin perfil → Muestra needsRegistration
  - Error → Muestra formulario login
```

```text
Usuario en /super-admin (no autenticado)
         |
         v
isSuperAdmin = false → redirect /super-admin/login (NO /admin/login)
         |
         v
Login exitoso → redirect /super-admin
```

