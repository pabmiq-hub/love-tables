

# Super Like — Estado actual y propuesta para hacerlo más atractivo

## Cómo está implementado HOY (resumen)

El Super Like ya existe en la plataforma, pero está prácticamente "escondido". Te cuento dónde aparece:

**1. Activación (organizador)**
- Ajustes del evento → toggle `super_like_enabled` (solo módulo Social).
- Si está activo, los participantes pueden dar **1 super like por evento**.

**2. Experiencia del participante (`/select`)**
- En la pestaña **"Selecciones"**, dentro de la tarjeta de cada compañero/a aparece una pequeña **estrella ámbar** a la derecha (icono `Star`, ~20px). Esa es la única pista visual.
- Si ya lo usaste, la estrella desaparece y se muestra un texto diminuto.
- Mensaje hint: "Puedes dar 1 Super Like por evento — el destinatario recibirá una notificación anónima".

**3. Notificación al destinatario**
- Edge function `send-super-like-notification` envía un email anónimo: *"✨ ¡Alguien te ha seleccionado en {evento}!"* con CTA para entrar al panel.
- El receptor **no sabe quién** ha sido el remitente (gamificación de anticipación).

**4. Analíticas**
- Se guarda `is_super_like = true` en `participant_selections`. Visible en analíticas sociales del evento.

## Por qué hoy no resulta atractivo

Mirando tu pantallazo del panel del participante, el problema salta a la vista:
- La estrella es pequeña, sin color llamativo, sin animación, sin storytelling.
- No hay un "momento" especial al usar el super like (sin confirmación visual potente).
- El receptor recibe un correo, pero **dentro de la app no hay ningún feedback** ("alguien te ha dado un super like" antes de elegir).
- No se comunica la mecánica al inicio (los usuarios ni se enteran de que existe).
- No hay límite temporal ni escasez percibida más allá del "1 por evento".

## Propuesta: rediseño del Super Like

### A. Onboarding del participante (educar la mecánica)
- Al entrar por primera vez en `/select`, mostrar un **modal de bienvenida** (una sola vez, persistido en localStorage) con 2 mensajes:
  1. Cómo funciona seleccionar amistad/ligue.
  2. **"Tienes 1 Super Like ⭐"** — explicación clara: anónimo, notifica al destinatario inmediatamente, aumenta tus posibilidades de match.

### B. Momento Super Like (rediseño visual)
- Sustituir la pequeña estrella por un **botón outline ámbar/dorado** con texto: `⭐ Super Like` integrado al lado de los checkboxes de Amistad/Ligue.
- Al pulsarlo:
  - **Animación de confeti** (libreria `canvas-confetti`) + "swoosh" de la estrella.
  - **Modal de confirmación** estilo "¿Seguro? Solo tienes 1 ⭐ por evento" con preview del destinatario (anonimizado).
  - Tras confirmar: badge dorado permanente "⭐ Super Like enviado" en la tarjeta de esa persona.
- Un contador visible permanente arriba: **"Super Like restante: 1"** o **"Usado ✓"**.

### C. Recibir un Super Like (feedback in-app — actualmente solo email)
- Cuando un participante recibe un super like, mostrar al entrar al panel:
  - **Banner dorado pulsante en la cabecera**: *"✨ Alguien especial te ha dado un Super Like — envía tus selecciones para descubrir si hay match"*.
  - Pequeño emisor de partículas/brillo en el header.
  - Al final del evento, si hay match recíproco, etiquetar la persona como **"⭐ Super Match"** con un highlight especial.

### D. Comunicación posterior (email mejorado)
- El email actual ya existe (`send-super-like-notification`). Mejoras visuales:
  - Hero más impactante (gradiente dorado, estrella animada SVG inline).
  - CTA más urgente: "Descubre si es match — tienes hasta {fecha_cierre}".
  - Recordar que pueden dar también su propio super like.

### E. Resultado del evento
- En el email de matches y en `/access`, marcar los matches que provinieron de super like con badge **"⭐ Super Match"** y mensaje destacado: *"Esta persona te dio Super Like"* (revelando finalmente la identidad solo si hay match recíproco).

### F. Gamificación opcional (futuro)
- En módulo Pro/Enterprise: opción de configurar **2-3 super likes** por evento como upgrade.

## Cambios técnicos resumidos

| Archivo / componente | Cambio |
|---|---|
| `src/pages/ParticipantSelect.tsx` | Rediseño del botón super like (texto + estrella), modal de confirmación, contador visible, banner dorado de "te han dado super like", confeti al usar |
| `src/components/ui/super-like-onboarding.tsx` (nuevo) | Modal de primera vez explicando la mecánica |
| `src/components/ui/super-like-banner.tsx` (nuevo) | Banner dorado animado para receptores |
| `src/pages/ParticipantAccess.tsx` | Mostrar badge "⭐ Super Match" en resultados con match recíproco vía super like |
| `supabase/functions/send-super-like-notification/index.ts` | Mejorar HTML del email (hero dorado, urgencia, CTA reforzado) |
| `supabase/functions/send-match-emails/index.ts` | Marcar matches que vinieron de super like en el email final |
| `package.json` | Añadir `canvas-confetti` |
| Sin migraciones SQL | La estructura de datos actual (`is_super_like`) es suficiente |

## Notas
- Sigue siendo **1 super like por evento** (manteniendo escasez = atractivo).
- La identidad del emisor permanece anónima salvo que haya match recíproco.
- Feature gateada por `super_like_enabled` en ajustes del evento (sin cambios).
- Compatible con eventos en modo prueba (los super likes ficticios no envían correos reales).

