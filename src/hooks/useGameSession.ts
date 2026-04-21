import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface SessionPlayerRow {
  id: string;
  session_id: string;
  player_id: string;
  role: "fiduciary" | "principal";
  score: number;
  compliance_meter: number;
  revenue: number;
  shift_timer: number;
  current_level: number;
  current_scenario_index: number;
  status: "playing" | "completed" | "bankrupt" | "timeout";
  dpo_tokens: number;
  joined_at: string;
  completed_at: string | null;
}

export interface GameSessionRow {
  id: string;
  room_code: string | null;
  host_id: string | null;
  mode: "solo" | "multiplayer";
  status: "lobby" | "active" | "completed";
  started_at: string | null;
  ended_at: string | null;
}

interface ProfileLite {
  id: string;
  display_name: string;
}

export function useGameSession(sessionId: string | undefined, currentUserId: string | undefined) {
  const [session, setSession] = useState<GameSessionRow | null>(null);
  const [players, setPlayers] = useState<SessionPlayerRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchPlayers = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("session_players")
      .select("*")
      .eq("session_id", sessionId);
    if (data) {
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

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;
    setLoading(true);

    Promise.all([fetchSession(), fetchPlayers()]).finally(() => {
      if (mounted) setLoading(false);
    });

    // Realtime subscription
    const ch = supabase
      .channel(`game:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_players", filter: `session_id=eq.${sessionId}` },
        () => {
          fetchPlayers();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        () => {
          fetchSession();
        },
      )
      .subscribe();

    channelRef.current = ch;

    return () => {
      mounted = false;
      ch.unsubscribe();
    };
  }, [sessionId, fetchPlayers, fetchSession]);

  const me = currentUserId ? players.find((p) => p.player_id === currentUserId) ?? null : null;
  const opponent = currentUserId ? players.find((p) => p.player_id !== currentUserId) ?? null : null;

  const updateMe = useCallback(
    async (patch: Partial<SessionPlayerRow>) => {
      if (!me) return;
      // Optimistic
      setPlayers((prev) => prev.map((p) => (p.id === me.id ? { ...p, ...patch } : p)));
      const { error } = await supabase.from("session_players").update(patch).eq("id", me.id);
      if (error) console.error("updateMe error", error);
    },
    [me],
  );

  return { session, players, profiles, me, opponent, loading, refetch: fetchPlayers, updateMe };
}
