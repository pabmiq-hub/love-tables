
# Plan de Corrección: Autenticación y Selector de Módulos

## Resumen de Problemas Identificados

| # | Problema | Causa | Severidad |
|---|----------|-------|-----------|
| 1 | Módulos no visibles en registro | ModuleSelector no renderiza las tarjetas correctamente | Media |
| 2 | Parpadeo al iniciar sesión | Bucle infinito por `isRedirecting` en dependencias del useEffect | Crítica |
| 3 | No se accede a Super Admin | Relacionado con problema 2 - el login no funciona | Crítica |
| 4 | Verificar implementación | Los módulos y Super Admin están correctos en BD | N/A |

---

## Fase 1: Corregir Bucle Infinito en Login (Problema Crítico)

**Archivo:** `src/pages/AdminLogin.tsx`

El problema está en la línea 100 donde `isRedirecting` está en el array de dependencias:

```typescript
// Problema actual (línea 100)
}, [user, loading, navigate, toast, isRedirecting]);
```

### Solución: Usar `useRef` en lugar de `useState`

**Cambio 1 - Añadir import de useRef (línea 1):**
```typescript
import { useState, useEffect, useRef } from "react";
```

**Cambio 2 - Reemplazar useState por useRef (línea 44):**
```typescript
// Antes:
const [isRedirecting, setIsRedirecting] = useState(false);

// Después:
const isRedirecting = useRef(false);
```

**Cambio 3 - Actualizar uso dentro del useEffect (líneas 48-94):**
```typescript
const checkOrganizerAndRedirect = async () => {
  if (!user || isRedirecting.current) return;
  
  isRedirecting.current = true;
  
  try {
    // ... lógica de redirección existente ...
  } catch (error) {
    console.error("Error checking organizer status:", error);
    isRedirecting.current = false;
  }
};
```

**Cambio 4 - Actualizar reset del flag (líneas 85, 93):**
```typescript
// Cambiar de:
setIsRedirecting(false);
// A:
isRedirecting.current = false;
```

**Cambio 5 - Eliminar isRedirecting del array de dependencias (línea 100):**
```typescript
// Antes:
}, [user, loading, navigate, toast, isRedirecting]);

// Después:
}, [user, loading, navigate, toast]);
```

---

## Fase 2: Arreglar ModuleSelector (Módulos no visibles)

**Archivo:** `src/components/registration/ModuleSelector.tsx`

El componente carga los módulos pero puede haber un problema con la renderización. Vamos a asegurar que se muestre correctamente:

### Cambio 1 - Mejorar manejo de estado de carga

Añadir un estado de error y mejorar el feedback visual:

```typescript
const [error, setError] = useState<string | null>(null);

const loadModules = async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from("modules")
      .select("code, name, description")
      .eq("is_active", true);

    if (fetchError) {
      setError("Error cargando módulos");
      console.error(fetchError);
      return;
    }

    if (data && data.length > 0) {
      setModules(data);
      if (selectedModules.length === 0) {
        onModulesChange(["social"]);
      }
    } else {
      // Fallback a módulos hardcoded si la BD falla
      setModules([
        { code: "social", name: "Módulo Social", description: "Speed dating con preferencias personales" },
        { code: "professional", name: "Módulo Profesional", description: "Networking B2B" }
      ]);
      if (selectedModules.length === 0) {
        onModulesChange(["social"]);
      }
    }
  } catch (err) {
    console.error(err);
    setError("Error de conexión");
  } finally {
    setLoading(false);
  }
};
```

### Cambio 2 - Mostrar mensaje de error si falla

```typescript
if (error) {
  return (
    <div className="text-center py-4 text-red-500">
      <p>{error}</p>
      <Button variant="outline" onClick={loadModules} className="mt-2">
        Reintentar
      </Button>
    </div>
  );
}
```

---

## Fase 3: Verificación del Sistema

### Estado Actual de la Base de Datos

**Módulos (Correctos):**
| Código | Nombre | Activo |
|--------|--------|--------|
| social | Módulo Social | Si |
| professional | Módulo Profesional | Si |

**Roles Super Admin (Correctos):**
| Usuario | Rol |
|---------|-----|
| ee3f0f4a-9a62-4562-8b41-7c4bb04696b3 | super_admin |

**Organizador Super Admin (Correcto):**
| Email | Plan | Módulos | Estado |
|-------|------|---------|--------|
| kleffbcn@gmail.com | Enterprise | social + professional | Activo |

### Rutas del Sistema (Correctas)

| Ruta | Componente | Función |
|------|------------|---------|
| `/admin/login` | AdminLogin | Login de organizadores |
| `/admin/register` | AdminRegister | Registro de organizadores |
| `/super-admin` | SuperAdminDashboard | Panel de Super Admin |
| `/admin/dashboard` | AdminDashboard | Panel de organizadores |

---

## Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/AdminLogin.tsx` | Cambiar useState a useRef para isRedirecting, eliminar de dependencias |
| `src/components/registration/ModuleSelector.tsx` | Añadir manejo de errores y fallback de módulos |

---

## Notas Tecnicas

### Por que useRef resuelve el problema

- `useState` causa re-renders cuando el valor cambia
- El useEffect se vuelve a ejecutar cuando sus dependencias cambian
- `isRedirecting` en dependencias significa: cambio de state -> re-render -> useEffect se ejecuta -> cambia state -> bucle infinito

- `useRef` NO causa re-renders
- El valor se mantiene entre renders sin disparar el effect
- El bucle se rompe porque el effect solo se ejecuta cuando `user` o `loading` cambian

### Flujo de Login Corregido

```text
Usuario hace login
       |
       v
useEffect detecta user != null
       |
       v
isRedirecting.current = true (no re-render)
       |
       v
Verifica rol super_admin -> Si: navega a /super-admin
       |
       v (No)
Verifica organizer profile
       |
       +-> active: /admin/dashboard
       +-> pending: /admin/pending-approval
       +-> null: /admin/register
```

---

## Pruebas Post-Implementacion

1. **Login normal**: Verificar que no parpadea y redirige correctamente
2. **Login Super Admin**: Verificar redirección a `/super-admin`
3. **Registro**: Verificar que los módulos aparecen en el Step 2
4. **Super Admin Panel**: Verificar gestión de organizadores y módulos
