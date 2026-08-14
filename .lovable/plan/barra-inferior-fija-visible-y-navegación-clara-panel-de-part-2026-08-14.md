# Barra inferior fija visible y navegación clara (panel de participante)

En el pantallazo, el panel se ve con las pestañas en línea apretadas y sin barra inferior. El motivo está en el código: la barra inferior solo existe por debajo de 640px (`sm:hidden`) y las pestañas en línea aparecen a partir de 640px. El navegador del móvil está renderizando con un ancho mayor a 640px (vista de escritorio / ancho de pantalla grande), así que se muestran las pestañas en línea, que además se solapan porque hay 5 pestañas en dos grupos.

## Cambios

1. **Umbral de la barra inferior**: la barra fija inferior pasa a mostrarse hasta 1024px (`lg`), y las pestañas en línea solo desde 1024px. Así en cualquier móvil o tablet (incluido el modo "sitio de escritorio") se ve la barra inferior del mockup.
2. **Pestañas en línea (escritorio)**: un único grupo horizontal con las 5 pestañas, sin dos `TabsList` separadas, para evitar solapamientos y textos cortados.
3. **Estética del mockup en la barra inferior**: 4-5 ítems, icono de 24px arriba y etiqueta pequeña debajo, activo en color primario con icono relleno, inactivos en gris, fondo `card` translúcido con borde superior fino, sin sombras duras y respetando safe-area.
4. **Etiquetas coherentes**: Inicio, Compatibilidad, Juego, Mesas, Selecciones (versiones cortas si hay 5 ítems para que no se corten).
5. **Shell móvil**: en pantallas por debajo de `lg` el panel deja de ir dentro de una tarjeta centrada estrecha: ocupa todo el ancho con padding lateral de 16px, fondo suave y espacio inferior reservado para la barra (`pb-24` + safe-area), como en el mockup.
6. **Tarjeta hero y bloque de compatibilidad**: se mantienen los componentes ya creados (`EventHeroCard`, anillos de compatibilidad) y se ajusta su ancho al nuevo shell a pantalla completa.

## Notas técnicas

- Archivo principal: `src/pages/ParticipantAccess.tsx` (contenedor, `TabsList` de escritorio, barra inferior).
- Solo cambios de presentación: no se toca la lógica de selecciones, votos, super likes, flechazo ni funciones de servidor.
- Sin colores literales: se usan tokens (`primary`, `muted-foreground`, `card`, `border`).
- Verificación con capturas en 390px, 820px y 1280px comprobando que la barra inferior aparece en los dos primeros y las pestañas en línea en el último.
