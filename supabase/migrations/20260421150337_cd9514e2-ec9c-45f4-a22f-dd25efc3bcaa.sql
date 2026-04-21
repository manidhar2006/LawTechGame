
-- Live round table: one row per scenario the Fiduciary pushes
CREATE TABLE public.live_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  round_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'closed'
  pushed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  UNIQUE (session_id, round_number)
);

CREATE INDEX idx_live_rounds_session ON public.live_rounds(session_id);

ALTER TABLE public.live_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Live rounds viewable by all"
  ON public.live_rounds FOR SELECT TO public USING (true);

CREATE POLICY "Host inserts rounds"
  ON public.live_rounds FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.game_sessions gs
    WHERE gs.id = live_rounds.session_id AND gs.host_id = auth.uid()
  ));

CREATE POLICY "Host updates rounds"
  ON public.live_rounds FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.game_sessions gs
    WHERE gs.id = live_rounds.session_id AND gs.host_id = auth.uid()
  ));

-- Live answer table: one row per Principal answer
CREATE TABLE public.live_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.live_rounds(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  session_player_id UUID NOT NULL REFERENCES public.session_players(id) ON DELETE CASCADE,
  choice TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  score_delta INT NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id)
);

CREATE INDEX idx_live_answers_round ON public.live_answers(round_id);
CREATE INDEX idx_live_answers_session ON public.live_answers(session_id);

ALTER TABLE public.live_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Live answers viewable by all"
  ON public.live_answers FOR SELECT TO public USING (true);

CREATE POLICY "Players insert own answers"
  ON public.live_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
