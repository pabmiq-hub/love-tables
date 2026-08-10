# Juego social «¿Quién es quién?» (modo compatibilidad)

Mini-juego por ronda: los participantes leen respuestas anónimas de su mesa y votan quién escribió cada una. Acertar desbloquea eventos extra (super like, repetir, flechazo).

## Ubicación

Pestaña propia **«Juego»** en el panel del participante, visible solo si el evento tiene el modo compatibilidad y el juego activados.

- Escritorio/tablet: quinta pestaña en la fila superior.
- Móvil: la barra inferior fija pasa a 5 iconos (Inicio · Afinidad · Mesas · Juego · Selección), iconos algo más estrechos y etiquetas cortas.
- Punto rojo en el icono cuando hay votos pendientes en la ronda activa.
- Ninguna otra sección cambia: Mesas y Selecciones quedan intactas.

## Registro: 5 preguntas obligatorias

Nuevo bloque en el paso de intereses del formulario (solo eventos con juego activo), todas obligatorias:

1. ¿Cuál es tu profesión?
2. Explica un fun fact sobre ti
3. ¿Cuál es tu talento más inútil?
4. Si tu vida fuera una película, ¿qué género sería?
5. ¿Qué cosa te da vergüenza admitir que te encanta?

Texto libre con límite de 140 caracteres. También se piden a quien entra en lista de espera y se traspasan al promover. El administrador puede editarlas desde el perfil del participante.

## Mecánica por ronda

- Cada ronda muestra **2 preguntas** (rotación fija: ronda 0 → preguntas 1-2, ronda 1 → 3-4, ronda 2 → 5-1, etc.), así que la ronda preliminar también juega.
- Para cada pregunta se listan las respuestas de los compañeros de mesa en orden aleatorio y sin nombre; el participante asigna a cada respuesta una persona de la mesa.
- **Revelación inmediata**: al votar se muestra al instante si el acierto es correcto, con el nombre real.
- Un voto por respuesta y ronda; no se puede rehacer.

## Premios

Por ronda, según aciertos totales en esa ronda:

| Aciertos en la ronda | Premio |
| --- | --- |
| 1 o 2 | +1 super like extra |
| 3 o 4 | +1 super like extra y +1 «repetir» extra |
| Todos los aciertos posibles | además +1 «flechazo» extra |

Los extras amplían los cupos existentes (base 1 por evento de cada tipo) y son acumulables entre rondas. El panel muestra un contador de premios ganados.

## Panel del organizador

- Interruptor «Juego social» y editor de los 5 textos de pregunta en Ajustes del evento (junto a la configuración de compatibilidad).
- En Analítica del evento: participación en el juego y % de acierto por pregunta y ronda, dentro del bloque de engagement ya existente (sin sección nueva).

## Detalles técnicos

Base de datos:
- `events.social_game` jsonb → `{ enabled, questions: [{id, label_es, label_en}] }`.
- `participants.game_answers` jsonb y `event_waitlist.game_answers` jsonb.
- Tabla `game_votes` (event_id, round, voter_participant_id, question_id, target_participant_id, guessed_participant_id, is_correct, created_at) con GRANTs y RLS: lectura/gestión solo del organizador del evento; los participantes escriben vía edge function con service role.
- Tabla `game_rewards` (event_id, participant_id, round, reward_type, created_at) para materializar los extras y evitar recuentos duplicados.

Edge functions:
- `get-game-round`: valida código de acceso, devuelve las 2 preguntas de la ronda, las respuestas anónimas barajadas de la mesa, los votos ya emitidos y el balance de premios.
- `submit-game-vote`: valida pertenencia a la mesa y que no haya voto previo, calcula acierto, inserta premios de la ronda y devuelve el resultado revelado.
- Cupos: `submit-selections`, `request-repeat` y `request-crush` pasan a calcular el límite como `1 + extras ganados` leyendo `game_rewards`.

Frontend:
- Nuevo `src/components/participant/SocialGameTab.tsx` (acordeón por ronda, ronda activa abierta) y nueva pestaña en `src/pages/ParticipantAccess.tsx`.
- `src/components/registration/SocialGameForm.tsx` reutilizado en `ParticipantJoin.tsx` y `EditParticipantModal.tsx`.
- Editor de preguntas en `EventSettingsEditor.tsx`; métricas en `EventEngagementInsights.tsx`.
- Todos los textos en ES/EN siguiendo el idioma del evento.
