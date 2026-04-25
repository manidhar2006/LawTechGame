-- Consolidated migration 2/2: level2 sessions and queued rule fields

-- Level-2 multiplayer session state (Banking & Insurance sector)
-- Mirrors the structure of level1_sessions
CREATE TABLE IF NOT EXISTS public.level2_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  selected_rule TEXT,
  current_card_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'selecting',
  fiduciary_card_id TEXT,
  principal_card_id TEXT,
  fiduciary_choice TEXT,
  principal_choice TEXT,
  fiduciary_is_correct BOOLEAN,
  principal_is_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable row-level security
ALTER TABLE public.level2_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write their own sessions
CREATE POLICY "Players can read level2_sessions they participate in"
  ON public.level2_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_players sp
      WHERE sp.session_id = level2_sessions.session_id
        AND sp.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can insert level2_sessions"
  ON public.level2_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_players sp
      WHERE sp.session_id = level2_sessions.session_id
        AND sp.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can update level2_sessions they participate in"
  ON public.level2_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.session_players sp
      WHERE sp.session_id = level2_sessions.session_id
        AND sp.player_id = auth.uid()
    )
  );

-- Realtime: enable broadcast for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.level2_sessions;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_level2_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER level2_sessions_updated_at
  BEFORE UPDATE ON public.level2_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_level2_updated_at();

-- Add Level-2 rule queue fields so multiplayer can run one rule at a time
ALTER TABLE public.level2_sessions
  ADD COLUMN IF NOT EXISTS selected_rule TEXT,
  ADD COLUMN IF NOT EXISTS current_card_index INTEGER NOT NULL DEFAULT 0;

-- Add per-role Level-2 rule selection so each player chooses a rule independently
ALTER TABLE public.level2_sessions
  ADD COLUMN IF NOT EXISTS fiduciary_selected_rule TEXT,
  ADD COLUMN IF NOT EXISTS principal_selected_rule TEXT;

-- Add Level-1 rule queue fields so each player can select a principle rule independently
ALTER TABLE public.level1_sessions
  ADD COLUMN IF NOT EXISTS current_card_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fiduciary_selected_rule TEXT,
  ADD COLUMN IF NOT EXISTS principal_selected_rule TEXT;