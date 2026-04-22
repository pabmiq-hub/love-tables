WITH ev AS (
  SELECT id, game_mode, preliminary_round, tables
  FROM events WHERE id = '3459b895-0b27-4de0-9b6a-2185ed3a0ecf'
),
prelim_seats AS (
  SELECT (seat->>'id')::text AS pid, (tbl_idx_one)::int AS table_number
  FROM ev,
       jsonb_array_elements(preliminary_round->'tables') WITH ORDINALITY AS t(tbl, tbl_idx_one),
       jsonb_array_elements(tbl) AS seat
),
round_seats AS (
  SELECT (seat->>'id')::text AS pid, (tbl_idx_one)::int AS table_number
  FROM ev,
       jsonb_array_elements(tables) AS rnd,
       jsonb_array_elements(rnd->'tables') WITH ORDINALITY AS t(tbl, tbl_idx_one),
       jsonb_array_elements(tbl) AS seat
),
all_seats AS (SELECT * FROM prelim_seats UNION ALL SELECT * FROM round_seats),
dynamics AS (
  SELECT (d->>'id') AS dyn_id, (tn)::int AS table_number
  FROM ev, jsonb_array_elements(game_mode->'dynamics') AS d,
       jsonb_array_elements_text(d->'table_numbers') AS tn
),
played_pairs AS (
  SELECT DISTINCT s.pid, d.dyn_id
  FROM all_seats s JOIN dynamics d ON d.table_number = s.table_number
),
played_json AS (
  SELECT COALESCE(jsonb_object_agg(pid, dyn_ids), '{}'::jsonb) AS played
  FROM (SELECT pid, jsonb_agg(dyn_id) AS dyn_ids FROM played_pairs GROUP BY pid) x
)
UPDATE events e
SET game_mode = jsonb_set(e.game_mode, '{played}', (SELECT played FROM played_json), true)
WHERE e.id = '3459b895-0b27-4de0-9b6a-2185ed3a0ecf';