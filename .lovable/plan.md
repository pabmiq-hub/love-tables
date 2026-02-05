
# Plan: Completar el Sistema de Códigos de Verificación y Cuotas

## Estado: ✅ COMPLETADO

Todas las tareas han sido implementadas:

1. ✅ **Flujo de selecciones con código** - `ParticipantSelect.tsx` y `submit-selections` actualizados
2. ✅ **Editor de cuotas** - `EventQuotasEditor.tsx` creado
3. ✅ **Paso de cuotas en CreateEvent** - Editor integrado en Step 2 (social)
4. 🔄 **Pruebas del flujo completo** - Pendiente verificación manual

---

## Cambios Realizados

### 1. ParticipantSelect.tsx - Flujo con Código de Verificación

**Nuevo flujo:**
```text
verify_code → confirm_identity → select → done
```

- Eliminada lista de nombres para identificarse
- Añadido input OTP de 6 dígitos para código de verificación
- Pantalla de confirmación de identidad antes de mostrar tablemates
- Envío de selecciones usando `verificationCode` en lugar de `selectorId`

### 2. submit-selections Edge Function

- Acepta `verificationCode` como alternativa a `selectorId`
- Resuelve código a participante antes de procesar selecciones
- Mantiene compatibilidad con flujo anterior (selectorId directo)

### 3. EventQuotasEditor.tsx

Nuevo componente que permite:
- Toggle para habilitar/deshabilitar requisitos de registro
- Lista editable de cuotas por género + rango de edad
- Cálculo automático del total de plazas
- Detección de combinaciones duplicadas

### 4. CreateEvent.tsx

- Nuevo estado: `registrationRequirementsEnabled` y `slotQuotas`
- Editor de cuotas integrado en Step 2 (después de EventPreferencesEditor)
- Campos guardados en la creación del evento

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/pages/ParticipantSelect.tsx` | Reescrito con flujo de código |
| `supabase/functions/submit-selections/index.ts` | Soporte para verificationCode |
| `src/components/event/EventQuotasEditor.tsx` | **Nuevo** - Editor de cuotas |
| `src/pages/CreateEvent.tsx` | Integración del editor de cuotas |

---

## Próximos Pasos (Verificación Manual)

1. Crear un evento social con cuotas habilitadas
2. Registrar participantes y verificar que reciben código por email
3. Acceder a `/event/{id}/select` e introducir código
4. Confirmar identidad y enviar selecciones
5. Verificar que las selecciones se guardan correctamente
