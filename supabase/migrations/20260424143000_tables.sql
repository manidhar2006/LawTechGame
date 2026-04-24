-- Fresh schema: core tables and indexes
-- Paste/run this file first.

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
