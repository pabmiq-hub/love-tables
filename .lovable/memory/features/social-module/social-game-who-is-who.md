---
name: Social game «¿Quién es quién?»
description: Juego por rondas donde los participantes adivinan quién escribió respuestas anónimas y ganan Super Like/Repetir/Flechazo extra
type: feature
---
Juego social opcional (módulo Social, activable en Ajustes del evento → «🎭 Juego ¿Quién es quién?»).

- **Config**: `events.social_game` JSONB `{ enabled, questions: [{id, label_es, label_en}] }`. 5 preguntas por defecto (profesión, fun fact, talento inútil, género de película, placer culpable). Editor: `src/components/event/SocialGameEditor.tsx`.
- **Registro**: todas las preguntas son obligatorias (máx. 140 caracteres) y se piden también a quien entra en lista de espera. Se guardan en `participants.game_answers` / `event_waitlist.game_answers` y se transfieren al promover. Form: `src/components/registration/SocialGameForm.tsx`.
- **Mecánica**: 2 preguntas por ronda con rotación determinista (`questionsForRound` en `src/lib/socialGame.ts`); ronda 0 = preliminar. Las respuestas de los compañeros de mesa se muestran anónimas con un token HMAC (derivado del service role key) para que el cliente no pueda deducir el autor. Revelación inmediata al votar.
- **Premios acumulables por ronda**: ≥1 acierto → Super Like extra; ≥3 → también Repetir extra; pleno → también Flechazo extra. Amplían el cupo base de 1 en `submit-selections`, `get-table-assignments`, `request-repeat` y `request-crush`.
- **Tablas**: `game_votes` (único por evento+ronda+votante+pregunta+objetivo) y `game_rewards` (único por evento+participante+ronda+tipo). Escritura solo vía service role.
- **Edge functions**: `get-game-round` (rondas, respuestas anónimas, votos y premios) y `submit-game-vote` (valida mesa/pregunta, resuelve token, guarda voto y recalcula premios).
- **UI**: pestaña «Juego» en el panel del participante (`src/components/event/SocialGameTab.tsx`); métricas de participación/aciertos/premios en Analítica (`EventEngagementInsights`).
