## Cambios en la pestaña Compatibilidad

Archivo: `src/components/event/EventCompatibilityTab.tsx`

### 1. Orden alfabético
- Ordenar `rows` por `name` (locale `es`, `sensitivity: "base"`) antes de renderizar, tanto en la lista completa como en `filtered`.

### 2. Top 10 desplegable por participante
- Cambiar `topMatches` para que, en lugar de guardar sólo el mejor match, guarde para cada participante un array ordenado por score descendente con **los 10 más compatibles** (`{ otherId, otherName, score }[]`).
- Reemplazar la fila actual por un componente colapsable (usando `Collapsible` de shadcn, ya disponible):
  - Cabecera: nombre + top hobby + badge con la persona más compatible (#1) y su % + chevron.
  - Al expandir: lista numerada (1–10) con nombre y % de cada match, resaltando el #1.
- Sólo se muestran matches de participantes que también tengan perfil Wrapped; si hay menos de 10 disponibles, se muestran los que haya.
- Participantes sin perfil siguen mostrando el badge "Sin perfil" y no son expandibles.

### 3. Sin cambios en
- Lógica de cálculo (`computeCompatibility`), carga de datos, realtime/polling ni el resto del panel.
