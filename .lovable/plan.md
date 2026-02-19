

# Fix: Cálculo de franja de edad desde fecha de nacimiento

## Problema detectado

Hay un **desajuste de formato** entre cómo se guardan los rangos de edad y cómo se interpretan:

- **En la base de datos**, los rangos personalizados se guardan como **strings**: `["18-24", "25-32", "33-40", "41+"]`
- **En la funcion del servidor** (`register-participant`), el codigo espera **objetos** con formato `{label, min, max}` (ej. `{label: "18-24", min: 18, max: 24}`)

Cuando el evento tiene rangos personalizados, el servidor intenta hacer `range.min` y `range.max` sobre un string, lo que devuelve `undefined`. La comparacion `age >= undefined` siempre es `false`, asi que siempre devuelve **"Otro"**.

Ademas, hay un segundo desajuste: los rangos por defecto del **cliente** usan en-dash (`18–24`, `+ 50`) mientras que los del **servidor** usan guion normal (`18-24`, `51+`). Esto puede causar inconsistencias en cuotas y filtros.

## Solucion

### 1. Edge Function `register-participant` - Parsear strings correctamente

Modificar `calculateAgeRange` para que detecte si los rangos son strings o objetos, y los parsee adecuadamente:

```text
"18-24"  -->  min: 18, max: 24
"41+"    -->  min: 41, max: 100
"+ 50"   -->  min: 50, max: 100
```

### 2. Cliente `ParticipantJoin.tsx` - Mejorar el regex

El regex actual `/(\d+)[-–]?(\d+)?/` funciona para la mayoria de formatos, pero conviene asegurar que el formato `"+ 50"` (con espacio) tambien se maneje correctamente. Se mejorara para cubrir todos los formatos posibles.

### 3. Alinear formatos por defecto

Actualizar los rangos por defecto del servidor para que coincidan con los del cliente (`AGE_RANGES` de `excelParser.ts`), evitando discrepancias entre guion normal y en-dash.

---

## Detalle tecnico

| Archivo | Cambio |
|---|---|
| `supabase/functions/register-participant/index.ts` | Reescribir `calculateAgeRange` para parsear strings (`"18-24"`, `"41+"`) ademas de objetos `{label, min, max}`. |
| `src/pages/ParticipantJoin.tsx` | Mejorar el regex de `calculateAgeRange` para manejar todos los formatos (`+50`, `+ 50`, `50+`). |
| `src/components/event/AddParticipantModal.tsx` | Misma correccion del regex. |
| `src/components/event/EditParticipantModal.tsx` | Misma correccion del regex. |

### Logica corregida del servidor

```text
function parseRangeString(range: string): { label: string, min: number, max: number } {
  // Handle "41+", "+ 50", "50+" formats
  if (range.includes('+')) {
    const num = parseInt(range.replace(/[^0-9]/g, ''));
    return { label: range, min: num, max: 100 };
  }
  // Handle "18-24" or "18–24" formats
  const parts = range.replace('–', '-').split('-').map(n => parseInt(n.trim()));
  return { label: range, min: parts[0], max: parts[1] };
}
```

