UPDATE public.events
SET current_round = 4,
    completed_rounds = ARRAY[1,2,3,4]
WHERE id = '32ebdc2f-3b6b-462d-95c3-16aca1a05896'
  AND jsonb_array_length(tables) = 4
  AND status = 'completed';