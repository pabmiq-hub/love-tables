# Rediseño del panel de participante (estética del mockup)

Objetivo: que el panel del participante (`/event/:id/access`) se vea como el mockup: app móvil de pantalla completa, tarjeta de evento con foto y datos, fila de estadísticas, lista de compatibilidad con anillos de porcentaje y barra inferior de navegación limpia.

## 1. Estructura general (app shell)

- En móvil el panel deja de ser una `Card` centrada con marco: pasa a ocupar todo el ancho, fondo suave, contenido en columna con separaciones de 12–16px y padding lateral de 16px.
- Cabecera compacta: saludo ("Hola, Nombre") + estado del evento (ronda en curso / finalizado) sin caja, tipografía pequeña.
- El contenido reserva espacio inferior para la barra fija (safe-area incluida).
- En tablet/escritorio se mantiene el contenedor centrado con ancho máximo y las pestañas en línea.

## 2. Tarjeta de evento (pestaña Inicio)

Nueva tarjeta superior, redondeada (radio grande), sombra suave, fondo `card`:

- Miniatura cuadrada a la izquierda (imagen del evento si existe; si no, degradado de marca con icono).
- A la derecha: chip de fecha con icono de calendario (formato "SÁB 24 MAY 2026", en mayúsculas, fondo primario suave), nombre del evento en grande, ubicación con icono de pin y horario con icono de reloj.
- Debajo, separador fino y fila de 3 estadísticas con icono superior, valor en negrita y etiqueta en gris: Participantes, Compatibilidad media (solo si el modo Wrapped está activo) y Mesas/Rondas. Si un dato no está disponible, la columna se omite y la fila se reparte entre las restantes.

Antes de implementar hay que confirmar qué datos ya llegan al panel (nombre, fecha, hora, ubicación, nº de participantes, nº de mesas) y, si falta alguno, añadirlo a la respuesta pública que alimenta el panel. Sin ese dato confirmado, la columna correspondiente no se muestra.

## 3. Bloque de compatibilidad

- Tarjeta con cabecera: icono de corazón en círculo suave, título "Tu compatibilidad", subtítulo "Personas con las que tienes más afinidad" y botón redondeado "Cómo se calcula" a la derecha.
- Filas de personas separadas por líneas finas: avatar/inicial, nombre (anonimizado según las reglas del proyecto), subtítulo descriptivo, 1–2 etiquetas de intereses en chips suaves y, a la derecha, anillo de progreso con el porcentaje dentro y chevron.
- Anillo: SVG circular con color primario para valores altos y acento para intermedios, usando tokens del sistema (sin colores fijos).
- Pie de la tarjeta: enlace "Ver todas las compatibilidades ›" que abre la pestaña de compatibilidad completa.
- La lista corta reutiliza los mismos datos que la pestaña de compatibilidad, mostrando los 5 primeros.

## 4. Barra inferior de navegación

- Barra fija inferior en móvil, fondo `card` translúcido, borde superior fino, safe-area, iconos de 22–24px con etiqueta pequeña debajo.
- Ítem activo en color primario con icono relleno; inactivos en gris. Sin fondo ni sombra en el activo (estilo del mockup).
- Ítems: Inicio, Compatibilidad (si Wrapped activo), Juego (si activo), Mesas, Selecciones. Con 5 ítems se reduce el tamaño de etiqueta para que no se corte.

## 5. Alineación del resto de pestañas

Para que todo quede coherente con la nueva estética, se unifican en Mesas, Selecciones, Juego y Compatibilidad:

- Mismo radio de tarjeta, mismo grosor de borde, misma sombra suave y mismo espaciado vertical.
- Cabeceras de sección con icono en círculo suave + título, igual que el bloque de compatibilidad.
- Chips y badges con el mismo estilo redondeado y fondos suaves.
- Se quitan los recuadros de aviso con colores duros y se pasan a fondos suaves de token.

## Notas técnicas

- Archivos afectados: `src/pages/ParticipantAccess.tsx` (shell, cabecera, tarjeta de evento, barra inferior, pestaña Inicio), `src/components/event/WrappedCompatibilityTab.tsx` (filas con anillo y chips), y nuevos componentes de presentación: `src/components/event/participant/EventHeroCard.tsx`, `CompatibilityRing.tsx`, `CompatibilityPreview.tsx`, `ParticipantBottomNav.tsx`.
- Nuevos tokens en `src/index.css` si hacen falta (radio extra grande, sombra de tarjeta suave, fondos de chip); nada de colores literales en componentes.
- Solo cambios de presentación: no se toca la lógica de selecciones, votos, super likes ni las funciones de servidor. Si algún dato de la tarjeta de evento no existe hoy en el panel, se añade únicamente su lectura.
- Verificación con capturas en viewport móvil (390px) y escritorio comparando con el mockup.
