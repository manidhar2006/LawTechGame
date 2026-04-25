-- Consolidated migration 1/2: core schema, triggers, RLS, realtime

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_seed TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game sessions
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code CHAR(6) UNIQUE,
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('solo','multiplayer')),
  status TEXT NOT NULL CHECK (status IN ('lobby','active','completed')) DEFAULT 'lobby',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Session players
CREATE TABLE public.session_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('fiduciary','principal')),
  score INTEGER NOT NULL DEFAULT 0,
  compliance_meter INTEGER NOT NULL DEFAULT 100,
  revenue INTEGER NOT NULL DEFAULT 100000,
  shift_timer INTEGER NOT NULL DEFAULT 28800,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_scenario_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('playing','completed','bankrupt','timeout')) DEFAULT 'playing',
  dpo_tokens INTEGER NOT NULL DEFAULT 3,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (session_id, player_id)
);

-- Scenario answers
CREATE TABLE public.scenario_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_player_id UUID REFERENCES public.session_players(id) ON DELETE CASCADE NOT NULL,
  scenario_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  role TEXT NOT NULL,
  choice TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  score_delta INTEGER NOT NULL,
  dpdp_concept TEXT NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('fiduciary','principal')),
  final_score INTEGER NOT NULL,
  max_level_reached INTEGER NOT NULL,
  compliance_pct INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('completed','bankrupt','timeout')),
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- DPO hints log
CREATE TABLE public.dpo_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_player_id UUID REFERENCES public.session_players(id) ON DELETE CASCADE NOT NULL,
  scenario_id TEXT NOT NULL,
  hint_text TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Level-1 multiplayer state (1v1)
CREATE TABLE public.level1_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  fiduciary_card_id TEXT,
  principal_card_id TEXT,
  fiduciary_choice TEXT CHECK (fiduciary_choice IN ('A', 'B', 'C', 'D')),
  principal_choice TEXT CHECK (principal_choice IN ('A', 'B', 'C', 'D')),
  fiduciary_is_correct BOOLEAN,
  principal_is_correct BOOLEAN,
  status TEXT NOT NULL DEFAULT 'selecting' CHECK (status IN ('selecting', 'answering', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_players_session ON public.session_players(session_id);
CREATE INDEX idx_session_players_player ON public.session_players(player_id);
CREATE INDEX idx_leaderboard_score ON public.leaderboard(final_score DESC);
CREATE INDEX idx_leaderboard_submitted ON public.leaderboard(submitted_at DESC);
CREATE INDEX idx_level1_sessions_session ON public.level1_sessions(session_id);

ALTER TABLE public.session_players REPLICA IDENTITY FULL;
ALTER TABLE public.game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.level1_sessions REPLICA IDENTITY FULL;

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