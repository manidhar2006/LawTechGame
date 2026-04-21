import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SessionPlayerRow, GameSessionRow } from "@/hooks/useGameSession";

export interface LiveRoundRow {
  id: string;
  session_id: string;
  scenario_id: string;
  round_number: number;
  status: "open" | "closed";
  pushed_at: string;
  ended_at: string | null;
}

export interface LiveAnswerRow {
  id: string;
  round_id: string;
  session_id: string;
  player_id: string;
  session_player_id: string;
  choice: "A" | "B" | "C" | "D";
  is_correct: boolean;
  score_delta: number;
  answered_at: string;
}

interface ProfileLite {
  id: string;
  display_name: string;
}

function uniqueSuffix() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${randomPart}`;
}

/**
 * Live multi-principal multiplayer session.
 * - Fetches game_session, all session_players, all live_rounds and live_answers
 * - Subscribes via Supabase Realtime (WebSockets) to keep them in sync
 * - Exposes a derived `currentRound` (latest round) and per-round answer tallies
 */
export function useLiveSession(sessionId: string | undefined, currentUserId: string | undefined) {
  const [session, setSession] = useState<GameSessionRow | null>(null);
  const [players, setPlayers] = useState<SessionPlayerRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [rounds, setRounds] = useState<LiveRoundRow[]>([]);
  const [answers, setAnswers] = useState<LiveAnswerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchPlayers = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase.from("session_players").select("*").eq("session_id", sessionId);
    if (!data) return;
    setPlayers(data as SessionPlayerRow[]);
    const ids = (data as SessionPlayerRow[]).map((p) => p.player_id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", ids);
      if (profs) {
        const map: Record<string, ProfileLite> = {};
        (profs as ProfileLite[]).forEach((p) => (map[p.id] = p));
        setProfiles(map);
      }
    }
  }, [sessionId]);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    setSession(data as GameSessionRow | null);
  }, [sessionId]);

  const fetchRounds = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("live_rounds")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", { ascending: true });
    setRounds((data as LiveRoundRow[]) ?? []);
  }, [sessionId]);

  const fetchAnswers = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("live_answers")
      .select("*")
      .eq("session_id", sessionId);
    setAnswers((data as LiveAnswerRow[]) ?? []);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;
    setLoading(true);

    // In React strict mode, effects can mount twice. Ensure no stale channel
    // with the same topic remains subscribed before registering callbacks.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    Promise.all([fetchSession(), fetchPlayers(), fetchRounds(), fetchAnswers()]).finally(() => {
      if (mounted) setLoading(false);
    });

    const channelName = `live:${sessionId}:${uniqueSuffix()}`;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_players", filter: `session_id=eq.${sessionId}` },
        () => fetchPlayers(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        () => fetchSession(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_rounds", filter: `session_id=eq.${sessionId}` },
        () => fetchRounds(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_answers", filter: `session_id=eq.${sessionId}` },
        () => fetchAnswers(),
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
      if (channelRef.current === ch) {
        channelRef.current = null;
      }
    };
  }, [sessionId, fetchSession, fetchPlayers, fetchRounds, fetchAnswers]);

  const me = currentUserId ? players.find((p) => p.player_id === currentUserId) ?? null : null;
  const fiduciary = players.find((p) => p.role === "fiduciary") ?? null;
  const principals = players.filter((p) => p.role === "principal");
  const currentRound = rounds.length ? rounds[rounds.length - 1] : null;
  const currentRoundAnswers = currentRound
    ? answers.filter((a) => a.round_id === currentRound.id)
    : [];

  return {
    session,
    players,
    profiles,
    me,
    fiduciary,
    principals,
    rounds,
    answers,
    currentRound,
    currentRoundAnswers,
    loading,
    refetchAll: () => Promise.all([fetchSession(), fetchPlayers(), fetchRounds(), fetchAnswers()]),
  };
}
