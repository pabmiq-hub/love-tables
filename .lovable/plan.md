
# Plan: Idiomas, pregunta de historial, submodo Wrapped y panel de compatibilidad

## 1. Idiomas hablados (todos los eventos sociales)

**Ajustes del evento** → nueva sección "Idiomas hablados":
- Toggle "Preguntar idiomas hablados en el formulario"
- Lista editable de idiomas disponibles (por defecto: Castellano, Català, English, Portugués, Français)

**Formulario de inscripción**: si el toggle está activo, se añade un campo multi-select obligatorio "¿Qué idiomas hablas?".

**Base de datos**:
- `events.languages_enabled` (bool), `events.available_languages` (text[])
- `participants.spoken_languages` (text[])

**Algoritmo de mesas** (`generateSmartTables`, `preliminaryRoundAssign`): prioridad **fuerte** — todos los miembros de una mesa deben compartir al menos un idioma. Idioma pasa a ser criterio duro por encima de género/edad; si es imposible respetarlo (persona aislada), warning en admin y se agrupa por el resto de criterios.

## 2. Pregunta "¿Has participado antes?" contextual

En el formulario social por defecto, sustituir la pregunta por:
> "¿Has participado antes en alguno de nuestros eventos similares a **{nombre del evento}**?"

Se compone en render usando `event.name` → aplica retroactivamente a todos los eventos existentes sin migración de datos.

## 3. Nuevo submodo "Wrapped" (dentro de Social)

**Ajustes del evento** → toggle "Modo Wrapped" (solo módulo social).

**Formulario en 2 pasos** (obligatorio cuando Wrapped está activo):
- **Paso 1**: género, fecha de nacimiento, email. Backend valida cupo y comprueba si el email ya tiene `wrapped_profile`.
- **Paso 2**: resto de campos habituales + (solo si NO existe wrapped_profile previo) las preguntas de intereses.

**Preguntas de intereses por defecto** (editables):
1. Estilo de vida (multi): Deportista, Cinéfilo/a, Gamer, Viajero/a, Foodie, Melómano/a, Lector/a, Artista/creativo/a, Naturaleza/outdoor.
2. Personalidad (single): Introvertido / Ambivertido / Extrovertido.
3. Plan ideal fin de semana (single): Casa tranquilo / Cena amigos / Fiesta / Escapada / Evento cultural.
4. Música favorita (multi): Pop, Rock, Indie, Electrónica, Latina, Clásica, Hip-hop, Jazz.
5. ¿Te gustan los juegos de mesa? (sí/no).
6. Nivel de gaming/juegos (single): Casual / Habitual / Muy aficionado.
7. Tipo de humor (multi): Absurdo, Sarcástico, Físico, Inteligente, Negro.
8. ¿Fumas? (sí/no).
9. ¿Tienes mascotas? (sí/no).
10. **Top 3 hobbies ordenados** (1-2-3), incluyendo "Juegos de mesa" en las opciones: Juegos de mesa, Deporte, Cine/Series, Música, Viajes, Cocina, Lectura, Videojuegos, Arte, Naturaleza, Fotografía, Baile.

**Algoritmo de compatibilidad (0–100%)**:
- Hobby #1 coincidente: +25 · #2: +15 · #3: +10 · en cualquier orden: +5
- Cada respuesta single coincidente: +8
- Cada opción multi compartida: +4 (máx +20 por pregunta)
- Bonus personalidad complementaria: +5
- Normalizado a 100.

**Base de datos**:
- `events.wrapped_enabled` (bool), `events.wrapped_questions` (jsonb).
- Tabla `wrapped_profiles`: `id`, `organizer_id`, `email` (unique por organizador), `answers` (jsonb), `hobbies_ranked` (text[]), timestamps. RLS por organizador. GRANTs a authenticated + service_role.
- `participants.wrapped_profile_id` (uuid, fk opcional).
- Edge function `check-wrapped-eligibility` (paso 1 → `cupo_ok`, `has_wrapped_profile`).
- `register-participant` extendido para persistir/enlazar `wrapped_profiles`.

### Editor visual de preguntas Wrapped (v1)

Nueva sección en ajustes del evento (cuando Wrapped está activo):
- Lista de preguntas con arrastrar-para-reordenar.
- Por pregunta editable: enunciado, tipo (yes_no / single_choice / multi_choice / ranked_top3), opciones (chips con añadir/eliminar), obligatoriedad.
- Botón "Restaurar preguntas por defecto".
- La pregunta ranked_top3 fuerza incluir "Juegos de mesa" como opción.
- Modo avanzado: switch "Editar como JSON" con validación de esquema al guardar.

### Traducción automática al idioma del evento

- Las preguntas por defecto vienen con traducciones ES/EN precargadas.
- Para preguntas o opciones **personalizadas**, al guardar se llama a la Edge Function `translate-wrapped-questions` (usando Lovable AI Gateway) que rellena las traducciones faltantes para todos los idiomas soportados (ES/EN, ampliable).
- Estructura por pregunta: `{ id, type, required, i18n: { es: { label, options }, en: { label, options } }, options_key: [...] }` (las claves internas se mantienen estables para el matching de compatibilidad; solo se traduce el texto visible).
- El formulario renderiza el idioma configurado del evento; el admin puede editar las traducciones manualmente después.

## 4. Panel del participante: sección "Funcionamiento del evento"

Nueva pestaña junto a "Mis mesas" y "Selecciones":
- Número de rondas, duración, cómo enviar selecciones.
- Cómo funciona Super Like, Repetir, Flechazo (solo los habilitados).
- Si el evento es Wrapped: explicación del modo y de Compatibilidad.
- Textos por defecto en ES/EN.

## 5. Panel del participante: sección "Compatibilidad" (solo Wrapped)

Pestaña visible solo si el evento tiene Wrapped activo y el participante completó el formulario de intereses.

- Lista **anónima** de las 10 personas más compatibles.
- Por cada persona: % compatibilidad, hobby favorito (#1), género, franja de edad (18-23, 24-29, 30-35, 36-40, 41-46, +46).
- Botón **"Pedir coincidir en mesa"** (límite por defecto **3 solicitudes por participante y evento**).

**Solicitud recibida — retrato robot anónimo**:
El destinatario ve una tarjeta "Alguien quiere coincidir contigo en una mesa" con un retrato robot compuesto por las respuestas del emisor, **sin datos identificativos** (nombre, email, teléfono, foto):
- Género
- Franja de edad
- Idiomas hablados (si están activados)
- Preferencia (amistad / ligue / ambos)
- Top 3 hobbies ordenados
- Todas las respuestas Wrapped (estilo de vida, personalidad, plan, música, humor, juegos de mesa, fumar, mascotas…)
- % de compatibilidad contigo

Botones **Aceptar** / **Rechazar**. Si acepta:
- Se crea un `participant_inclusion` que el algoritmo **debe** cumplir en la **siguiente ronda generada**.
- Notificación por email a emisor ("Han aceptado tu solicitud de mesa") y receptor (confirmación).
- La identidad permanece anónima hasta que se encuentren en la mesa asignada.

**Base de datos**:
- Tabla `wrapped_table_requests`: `id`, `event_id`, `sender_participant_id`, `receiver_participant_id`, `status` (pending/accepted/rejected), `created_at`, `responded_at`. Unique(event, sender, receiver). RLS por organizador y por participantes implicados. GRANTs.
- Reutiliza `participant_inclusions` para materializar la aceptación.
- Edge functions: `request-wrapped-table`, `respond-wrapped-table`.

## 6. Retroactividad

- **Idiomas**: opt-in por evento.
- **Pregunta de historial**: retroactiva automática (render dinámico).
- **Wrapped**: nuevo, no retroactivo.
- **Funcionamiento del evento**: aparece automáticamente en todos los eventos sociales.

## Notas técnicas

- Nuevas tablas: `CREATE TABLE` + GRANTs a authenticated + service_role + RLS + policies scoped a `organizer_id = auth.uid()` o participación en el evento.
- Textos ES/EN via `LanguageContext` (UI) y idioma del evento (contenido participante).
- Traducción automática vía Lovable AI Gateway (sin coste de configuración extra).
- Wrapped disponible para organizadores con módulo social activo; puede gatearse a plan Pro/Enterprise si lo indicas.
