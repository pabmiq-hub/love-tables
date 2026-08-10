ALTER TABLE public.events ADD COLUMN IF NOT EXISTS social_game jsonb;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS game_answers jsonb;
ALTER TABLE public.event_waitlist ADD COLUMN IF NOT EXISTS game_answers jsonb;

CREATE TABLE IF NOT EXISTS public.game_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round integer NOT NULL,
  voter_participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  target_participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  guessed_participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (event_id, round, voter_participant_id, question_id, target_participant_id)
);

GRANT SELECT ON public.game_votes TO authenticated;
GRANT ALL ON public.game_votes TO service_role;
ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view game votes of their events"
ON public.game_votes FOR SELECT TO authenticated
USING (public.is_event_organizer(auth.uid(), event_id) OR public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.game_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  round integer NOT NULL,
  reward_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (event_id, participant_id, round, reward_type)
);

GRANT SELECT ON public.game_rewards TO authenticated;
GRANT ALL ON public.game_rewards TO service_role;
ALTER TABLE public.game_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view game rewards of their events"
ON public.game_rewards FOR SELECT TO authenticated
USING (public.is_event_organizer(auth.uid(), event_id) OR public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_game_votes_event_voter ON public.game_votes(event_id, voter_participant_id);
CREATE INDEX IF NOT EXISTS idx_game_rewards_event_participant ON public.game_rewards(event_id, participant_id);