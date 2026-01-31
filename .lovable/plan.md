
# Plan: Corregir Selección de Módulo en Creación de Eventos

## Diagnóstico del Problema

### Estado Actual de la Base de Datos
| Email | active_modules | Status | Resultado |
|-------|----------------|--------|-----------|
| kleffbcn@gmail.com | ["social", "professional"] | active | Puede ver selector |
| pabmiq@gmail.com | [] (vacío) | active | Solo ve Social (sin selector) |

### Problema Principal
El organizador con `active_modules: []` no puede acceder al módulo profesional porque:
1. `hasModule("professional")` retorna `false`
2. `hasBothModules` es `false` 
3. El paso 0 (selector de módulo) no se muestra
4. Se inicia directamente en paso 1 con módulo "social" por defecto

### Causa Raíz
Los perfiles de organizador creados automáticamente por la edge function `setup-super-admin` tienen `active_modules: []` vacío.

---

## Solución Propuesta

### Fase 1: Corregir Edge Function para Asignar Módulos por Defecto

**Archivo:** `supabase/functions/setup-super-admin/index.ts`

Modificar la creación de perfiles para incluir al menos el módulo "social" por defecto:

```typescript
// En lugar de:
INSERT INTO organizers (user_id, contact_email, status, plan_id)

// Cambiar a:
INSERT INTO organizers (user_id, contact_email, status, plan_id, active_modules)
SELECT u.id, u.email, 'pending', 
  (SELECT id FROM subscription_plans WHERE is_default = true),
  ARRAY['social']  -- Módulo por defecto
```

### Fase 2: Migración para Corregir Organizadores Existentes

**Archivo:** Nueva migración SQL

```sql
-- Asignar módulo social a organizadores sin módulos
UPDATE organizers 
SET active_modules = ARRAY['social']
WHERE active_modules IS NULL OR active_modules = '{}';
```

### Fase 3: Mejorar UI del SuperAdmin para Gestión de Módulos

**Archivo:** `src/pages/SuperAdminDashboard.tsx`

1. **Mostrar advertencia visual** cuando un organizador activo no tiene módulos asignados
2. **Botón de acción rápida** para asignar módulos predeterminados
3. **Tooltip explicativo** en los badges de módulos

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Organizers                                                              │
├──────────────────────────────────────┬─────────┬──────────┬────────────┤
│ Email                                │ Estado  │ Módulos  │ Acciones   │
├──────────────────────────────────────┼─────────┼──────────┼────────────┤
│ pabmiq@gmail.com                     │ Activo  │ ⚠️ Ninguno│ [···]     │
│  ↳ Sin módulos asignados             │         │ [S] [P]  │            │
├──────────────────────────────────────┼─────────┼──────────┼────────────┤
│ kleffbcn@gmail.com                   │ Activo  │ [S] [P]  │ [···]      │
└──────────────────────────────────────┴─────────┴──────────┴────────────┘

Leyenda: [S] = Social activo, [P] = Professional activo
```

### Fase 4: Mejora Preventiva en CreateEvent.tsx

**Archivo:** `src/pages/CreateEvent.tsx`

Añadir validación cuando el organizador no tiene ningún módulo:

```typescript
// Si el organizador no tiene módulos, mostrar mensaje de error
if (!hasSocialModule && !hasProfessionalModule && !loading) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Sin acceso a módulos</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Tu cuenta no tiene módulos asignados. Contacta con el administrador.</p>
          <Button asChild className="mt-4">
            <Link to="/admin/dashboard">Volver al dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Funcionalidades Clave del Módulo Profesional (B2B)

Para referencia, estas son las diferencias principales entre módulos:

| Aspecto | Social (Speed Dating) | Professional (B2B Networking) |
|---------|----------------------|-------------------------------|
| **Tamaño mesa** | Configurable (2-6) | Siempre 1:1 (2 personas) |
| **Participantes** | Individuos | Empresas (Cliente/Proveedor) |
| **Datos requeridos** | Nombre, edad, género, preferencia | Empresa, sector, tamaño, necesidades/soluciones |
| **Tipo de rotación** | Host fijo o todos rotan | Cliente fijo o proveedor fijo |
| **Matching** | Por preferencia romántica/amistad | Por sector, necesidades vs soluciones |
| **Preferencias evento** | Géneros, rangos edad, preferencias dating | Sectores, tamaños empresa, necesidades, soluciones |
| **Paridad de género** | Disponible | No aplica |
| **Modal añadir** | AddParticipantModal | AddProfessionalParticipantModal |
| **Algoritmo mesas** | generateTables (lib/tableGenerator) | generateB2BTables (lib/b2bTableGenerator) |
| **Scoring matches** | Mutual selection | professionalMatching.ts (sector, need/solution) |

---

## Archivos a Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| Nueva migración SQL | Crear | Actualizar organizadores sin módulos |
| `supabase/functions/setup-super-admin/index.ts` | Modificar | Asignar módulo por defecto |
| `src/pages/SuperAdminDashboard.tsx` | Modificar | Advertencia visual para organizadores sin módulos |
| `src/pages/CreateEvent.tsx` | Modificar | Validación cuando no hay módulos |

---

## Corrección Inmediata de Datos

Para el usuario `pabmiq@gmail.com` que tiene `active_modules: []`, se puede corregir desde el SuperAdminDashboard:
1. Hacer clic en los badges [S] y/o [P] para activar los módulos deseados

O ejecutar la migración para corregir todos los organizadores sin módulos automáticamente.

---

## Flujo Corregido de Creación de Eventos

```text
Usuario accede a /admin/create-event
         |
         v
useOrganizer.hasModule() verifica módulos activos
         |
         ├── Tiene ambos módulos → Paso 0: Selector Social/Professional
         │                              |
         │                              v
         │                         Paso 1: Información básica
         │
         ├── Tiene solo Social → Paso 1 directamente (Social)
         │
         ├── Tiene solo Professional → Paso 1 directamente (Professional)
         │
         └── Sin módulos → Mensaje de error + link a dashboard
```
