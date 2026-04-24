-- Fresh schema: triggers, RLS policies, and realtime publication
-- Paste/run this file second.

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_seed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Agent_' || SUBSTR(NEW.id::text, 1, 6)),
    SUBSTR(NEW.id::text, 1, 12)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Keep level1_sessions.updated_at fresh on every update
CREATE OR REPLACE FUNCTION public.touch_level1_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_level1_sessions_updated_at ON public.level1_sessions;
CREATE TRIGGER trg_touch_level1_sessions_updated_at
BEFORE UPDATE ON public.level1_sessions
FOR EACH ROW
EXECUTE FUNCTION public.touch_level1_sessions_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpo_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level1_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Sessions policies
CREATE POLICY "Sessions viewable by all"
  ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated create sessions"
  ON public.game_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host updates session"
  ON public.game_sessions FOR UPDATE TO authenticated USING (auth.uid() = host_id);

-- Session players policies
CREATE POLICY "Session players viewable by all"
  ON public.session_players FOR SELECT USING (true);
CREATE POLICY "Users join sessions"
  ON public.session_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Users update own session player"
  ON public.session_players FOR UPDATE TO authenticated USING (auth.uid() = player_id);
CREATE POLICY "Users delete own session player"
  ON public.session_players FOR DELETE TO authenticated USING (auth.uid() = player_id);

-- Scenario answers policies
CREATE POLICY "Answers viewable to owner"
  ON public.scenario_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_players sp
      WHERE sp.id = session_player_id
        AND sp.player_id = auth.uid()
    )
  );
CREATE POLICY "Users insert own answers"
  ON public.scenario_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_players sp
      WHERE sp.id = session_player_id
        AND sp.player_id = auth.uid()
    )
  );

-- Leaderboard policies
CREATE POLICY "Leaderboard public read"
  ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Users submit own scores"
  ON public.leaderboard FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id);

-- DPO hints policies
CREATE POLICY "DPO hints viewable to owner"
  ON public.dpo_hints FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_players sp
      WHERE sp.id = session_player_id
        AND sp.player_id = auth.uid()
    )
  );
CREATE POLICY "Users insert own DPO hints"
  ON public.dpo_hints FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_players sp
      WHERE sp.id = session_player_id
        AND sp.player_id = auth.uid()
    )
  );

-- Level-1 session policies
CREATE POLICY "Level1 session state viewable by all"
  ON public.level1_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Participants insert level1 session state"
  ON public.level1_sessions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_players sp
      WHERE sp.session_id = level1_sessions.session_id
        AND sp.player_id = auth.uid()
    )
  );
CREATE POLICY "Participants update level1 session state"
  ON public.level1_sessions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_players sp
      WHERE sp.session_id = level1_sessions.session_id
        AND sp.player_id = auth.uid()
    )
  );

-- Realtime publication additions (safe if rerun)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'session_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_players;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'game_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'level1_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.level1_sessions;
  END IF;
END
$$;
