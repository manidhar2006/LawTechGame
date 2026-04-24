import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGameSession } from "@/hooks/useGameSession";
import { generateRoomCode } from "@/lib/gameEngine";
import { AppHeader } from "@/components/layout/AppHeader";
import { RoleBadge } from "@/components/ui/Badges";
import { toast } from "sonner";
import type { Role } from "@/data/scenarios";

const AUDIO_PREFS_KEY = "dg-audio-prefs";
const AUDIO_PREFS_EVENT = "dg-audio-prefs-updated";

type AudioPrefs = {
  micMuted: boolean;
  speakerMuted: boolean;
};

function readAudioPrefs(): AudioPrefs {
  if (typeof window === "undefined") return { micMuted: false, speakerMuted: false };

  try {
    const raw = window.localStorage.getItem(AUDIO_PREFS_KEY);
    if (!raw) return { micMuted: false, speakerMuted: false };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      micMuted: !!parsed.micMuted,
      speakerMuted: !!parsed.speakerMuted,
    };
  } catch {
    return { micMuted: false, speakerMuted: false };
  }
}

function writeAudioPrefs(next: AudioPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(AUDIO_PREFS_EVENT, { detail: next }));
}

const searchSchema = z.object({
  mode: z.enum(["solo", "multiplayer"]).optional(),
  join: z.coerce.boolean().optional(),
  session: z.string().optional(),
});

export const Route = createFileRoute("/lobby")({
  validateSearch: searchSchema,
  component: LobbyPage,
});

async function ensureProfileExists(userId: string, displayName: string) {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: displayName || "Agent",
      },
      { onConflict: "id" },
    );
  if (error) throw error;
}

function isRoomCodeConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeCode = "code" in error ? error.code : undefined;
  const maybeMessage = "message" in error ? String(error.message ?? "") : "";
  return maybeCode === "23505" || maybeMessage.toLowerCase().includes("room_code");
}

function LobbyPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("dg_onboarded")) {
      navigate({ to: "/onboarding" });
    }
  }, [navigate]);

  if (authLoading) return <FullScreenSpinner />;
  if (!user) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="max-w-md mx-auto pt-20 px-4 text-center">
          <h1 className="font-display text-2xl mb-3">Sign in to play</h1>
          <Link to="/auth" className="inline-block px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium">Continue</Link>
        </div>
      </div>
    );
  }

  if (!search.mode) return <ModeSelection />;
  if (search.mode === "solo")
    return <SoloFlow userId={user.id} displayName={profile?.display_name ?? "Agent"} />;
  if (search.join) return <JoinFlow userId={user.id} displayName={profile?.display_name ?? "Agent"} />;
  if (search.session)
    return (
      <WaitingLobby
        sessionId={search.session}
        userId={user.id}
        displayName={profile?.display_name ?? "Agent"}
      />
    );
  return <MultiplayerHostFlow userId={user.id} displayName={profile?.display_name ?? "Agent"} />;
}

function FullScreenSpinner() {
  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
}

function ModeSelection() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 pt-12">
        <h1 className="font-display text-3xl mb-2">Choose your mode</h1>
        <p className="text-muted-foreground mb-8">
          Solo to learn at your own pace, or multiplayer for a live 1v1 Level-1 round.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/lobby" search={{ mode: "solo" }} className="group rounded-xl border border-border bg-surface p-6 hover:border-primary/40 hover:glow-primary transition">
            <div className="text-2xl mb-2">🎯</div>
            <h2 className="font-display text-xl mb-1">Solo</h2>
            <p className="text-sm text-muted-foreground">
              Play at your own pace. Full learning recap at the end.
            </p>
          </Link>
          <Link to="/lobby" search={{ mode: "multiplayer" }} className="group rounded-xl border border-border bg-surface p-6 hover:border-[var(--principal)]/40 transition">
            <div className="text-2xl mb-2">⚡</div>
            <h2 className="font-display text-xl mb-1">Multiplayer (live)</h2>
            <p className="text-sm text-muted-foreground">
              One Fiduciary and one Principal play Level-1 (DPDP Principles) and Level-2 (Banking &amp; Insurance sector) with live voice and cross-questioning.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}

function RoleCardPicker({ onPick }: { onPick: (r: Role) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <button onClick={() => onPick("fiduciary")} className="text-left rounded-xl border border-border bg-surface p-6 hover:border-[var(--fiduciary)]/60 transition">
        <RoleBadge role="fiduciary" />
        <h2 className="font-display text-xl mt-2 mb-2">The Bank / Agency</h2>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Handle data breaches in 72 hrs</li>
          <li>Approve / reject vendor data access</li>
          <li>Manage customer consent</li>
          <li>Balance compliance vs revenue</li>
        </ul>
        <p className="text-xs mt-3 text-[var(--fiduciary)]">Manages compliance, revenue & shift timer</p>
      </button>
      <button onClick={() => onPick("principal")} className="text-left rounded-xl border border-border bg-surface p-6 hover:border-[var(--principal)]/60 transition">
        <RoleBadge role="principal" />
        <h2 className="font-display text-xl mt-2 mb-2">The Customer</h2>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Request data deletion</li>
          <li>Correct wrong information</li>
          <li>Withdraw consent</li>
          <li>Challenge unnecessary data collection</li>
        </ul>
        <p className="text-xs mt-3 text-[var(--principal)]">Focus purely on rights & compliance decisions</p>
      </button>
    </div>
  );
}

function SoloFlow({ userId, displayName }: { userId: string; displayName: string }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const create = async (role: Role) => {
    setCreating(true);
    try {
      await ensureProfileExists(userId, displayName);

      const { data: activeSoloSession } = await supabase
        .from("game_sessions")
        .select("id")
        .eq("host_id", userId)
        .eq("mode", "solo")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSoloSession?.id) {
        const { data: existingSoloPlayer } = await supabase
          .from("session_players")
          .select("id,status")
          .eq("session_id", activeSoloSession.id)
          .eq("player_id", userId)
          .eq("role", role)
          .maybeSingle();

        if (existingSoloPlayer?.status === "playing") {
          toast.success("Resuming your last solo run");
          navigate({ to: "/game/$sessionId", params: { sessionId: activeSoloSession.id } });
          return;
        }
      }

      const { data: gs, error } = await supabase
        .from("game_sessions")
        .insert({ host_id: userId, mode: "solo", status: "active", started_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      const { error: spErr } = await supabase
        .from("session_players")
        .insert({ session_id: gs.id, player_id: userId, role });
      if (spErr) throw spErr;
      navigate({ to: "/game/$sessionId", params: { sessionId: gs.id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
      setCreating(false);
    }
  };
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 pt-12">
        <h1 className="font-display text-3xl mb-1">Pick your role, {displayName}</h1>
        <p className="text-muted-foreground mb-8">Solo session — your scenarios will be drawn from your role's queue.</p>
        {creating ? <FullScreenSpinner /> : <RoleCardPicker onPick={create} />}
      </main>
    </div>
  );
}

function MultiplayerHostFlow({ userId, displayName }: { userId: string; displayName: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const hostNewRoom = async (hostRole: Role) => {
    setBusy(true);
    try {
      await ensureProfileExists(userId, displayName);

      let gs: { id: string } | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 12; attempt++) {
        const roomCode = generateRoomCode();
        const { data, error } = await supabase
          .from("game_sessions")
          .upsert(
            { host_id: userId, mode: "multiplayer", status: "lobby", room_code: roomCode },
            { onConflict: "room_code", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle();

        if (data?.id) {
          gs = data;
          break;
        }

        if (error && !isRoomCodeConflict(error)) {
          throw error;
        }

        lastError = error ?? lastError;
      }

      if (!gs) {
        throw lastError ?? new Error("Could not generate a unique room code. Please try again.");
      }

      const { error: spErr } = await supabase
        .from("session_players")
        .insert({ session_id: gs.id, player_id: userId, role: hostRole });
      if (spErr) throw spErr;
      navigate({ to: "/lobby", search: { mode: "multiplayer", session: gs.id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 pt-12">
        <h1 className="font-display text-3xl mb-2">Multiplayer (live)</h1>
        <p className="text-muted-foreground mb-8">
          Hi {displayName}. Room creator can be either role. Create as Fiduciary or Data Principal,
          then invite the opposite role for the Level-1 → Level-2 live experience.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <button
            onClick={() => hostNewRoom("fiduciary")}
            disabled={busy}
            className="rounded-xl border border-border bg-surface p-6 text-left hover:border-primary/40 disabled:opacity-50"
          >
            <div className="text-xl mb-2">🆕</div>
            <h2 className="font-display text-lg">Host as Fiduciary</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Get a room code and invite one Principal.
            </p>
          </button>
          <button
            onClick={() => hostNewRoom("principal")}
            disabled={busy}
            className="rounded-xl border border-border bg-surface p-6 text-left hover:border-primary/40 disabled:opacity-50"
          >
            <div className="text-xl mb-2">🆕</div>
            <h2 className="font-display text-lg">Host as Principal</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Get a room code and invite one Fiduciary.
            </p>
          </button>
          <Link
            to="/lobby"
            search={{ mode: "multiplayer", join: true }}
            className="rounded-xl border border-border bg-surface p-6 text-left hover:border-primary/40"
          >
            <div className="text-xl mb-2">🔗</div>
            <h2 className="font-display text-lg">Join Existing Room</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter a 6-character room code. You will join as the missing role.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}

function JoinFlow({ userId, displayName }: { userId: string; displayName: string }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ensureProfileExists(userId, displayName);

      const upper = code.trim().toUpperCase();
      const { data: gs } = await supabase.from("game_sessions").select("*").eq("room_code", upper).maybeSingle();
      if (!gs) throw new Error("Room not found");
      if (gs.status === "completed") throw new Error("This session has ended");

      // Already joined?
      const { data: existing } = await supabase
        .from("session_players")
        .select("id,role")
        .eq("session_id", gs.id)
        .eq("player_id", userId)
        .maybeSingle();

      if (!existing) {
        const { count: principalCount } = await supabase
          .from("session_players")
          .select("id", { count: "exact", head: true })
          .eq("session_id", gs.id)
          .eq("role", "principal");

        const { count: fiduciaryCount } = await supabase
          .from("session_players")
          .select("id", { count: "exact", head: true })
          .eq("session_id", gs.id)
          .eq("role", "fiduciary");

        const principalFilled = (principalCount ?? 0) >= 1;
        const fiduciaryFilled = (fiduciaryCount ?? 0) >= 1;

        if (principalFilled && fiduciaryFilled) {
          throw new Error("This 1v1 room is already full");
        }

        const joinRole: Role = principalFilled ? "fiduciary" : "principal";

        const { error } = await supabase
          .from("session_players")
          .insert({ session_id: gs.id, player_id: userId, role: joinRole });
        if (error) throw error;
        toast.success(`Joined as ${joinRole === "fiduciary" ? "Fiduciary" : "Principal"}`);
      } else {
        toast.success(`Joined as ${existing.role === "fiduciary" ? "Fiduciary" : "Principal"}`);
      }
      navigate({ to: "/lobby", search: { mode: "multiplayer", session: gs.id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not join");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-md mx-auto px-4 pt-16">
        <h1 className="font-display text-3xl mb-1">Join a room</h1>
        <p className="text-muted-foreground mb-6">
          Hi {displayName}, enter the 6-character code from your Fiduciary.
        </p>
        <form onSubmit={join} className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="w-full px-3 py-3 text-center text-2xl font-mono tracking-[0.4em] rounded-md bg-surface-2 border border-border focus:outline-none focus:border-primary"
          />
          <button disabled={busy || code.length !== 6} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50">
            {busy ? "Joining…" : "Join Room"}
          </button>
        </form>
      </main>
    </div>
  );
}

function WaitingLobby({
  sessionId,
  userId,
  displayName,
}: {
  sessionId: string;
  userId: string;
  displayName: string;
}) {
  const initialAudioPrefs = readAudioPrefs();
  const navigate = useNavigate();
  const { session, players, profiles, me } = useGameSession(sessionId, userId);
  const [isMicMuted, setIsMicMuted] = useState(initialAudioPrefs.micMuted);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(initialAudioPrefs.speakerMuted);
  const isHost = session?.host_id === userId;
  const principals = players.filter((p) => p.role === "principal");
  const fiduciary = players.find((p) => p.role === "fiduciary") ?? null;
  const principal = principals[0] ?? null;
  const hostPlayer = session?.host_id
    ? players.find((p) => p.player_id === session.host_id) ?? null
    : null;
  const hostRole = hostPlayer?.role ?? null;
  const hostNeeds = hostRole === "fiduciary" ? "Principal" : "Fiduciary";

  // Auto-redirect everyone when host starts
  useEffect(() => {
    if (session?.status === "active") {
      navigate({ to: "/game/$sessionId", params: { sessionId } });
    }
  }, [session?.status, sessionId, navigate]);

  useEffect(() => {
    writeAudioPrefs({ micMuted: isMicMuted, speakerMuted: isSpeakerMuted });
  }, [isMicMuted, isSpeakerMuted]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = isSpeakerMuted;
      audio.volume = isSpeakerMuted ? 0 : 1;
    });
  }, [isSpeakerMuted]);

  const startGame = async () => {
    const hasOnePrincipal = principals.length === 1;
    const hasOneFiduciary = fiduciary !== null;
    if (!hasOnePrincipal || !hasOneFiduciary) {
      toast.error("Need exactly one Fiduciary and one Principal for Level-1");
      return;
    }
    await supabase
      .from("game_sessions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", sessionId);
  };

  const copyCode = () => {
    if (session?.room_code) {
      navigator.clipboard.writeText(session.room_code);
      toast.success("Code copied!");
    }
  };

  if (!session || !me) return <FullScreenSpinner />;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 pt-12">
        <h1 className="font-display text-3xl mb-1">Waiting room</h1>
        <p className="text-muted-foreground mb-6">
          {isHost
            ? `Hi ${displayName}, share this code with one ${hostNeeds}. Start when they join.`
            : `Hi ${displayName}, hang tight — the host will start the session.`}
        </p>

        {session.room_code && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center mb-6">
            <div className="text-xs uppercase text-muted-foreground tracking-widest mb-2">Room Code</div>
            <div className="font-mono text-5xl font-bold tracking-[0.3em] mb-4">{session.room_code}</div>
            <div className="flex gap-2 justify-center flex-wrap">
              <button onClick={copyCode} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Copy code</button>
              <a
                href={`https://wa.me/?text=Join%20me%20on%20DataGuardian!%20Code:%20${session.room_code}%20%E2%80%94%20${encodeURIComponent(window.location.origin)}/lobby?mode=multiplayer&join=true`}
                target="_blank" rel="noreferrer"
                className="px-4 py-2 rounded-md border border-border text-sm"
              >
                Share via WhatsApp
              </a>
            </div>
            <div className="mt-3 flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => setIsMicMuted((prev) => !prev)}
                className="px-4 py-2 rounded-md border border-border text-sm"
              >
                Mic: {isMicMuted ? "Unmute" : "Mute"}
              </button>
              <button
                onClick={() => setIsSpeakerMuted((prev) => !prev)}
                className="px-4 py-2 rounded-md border border-border text-sm"
              >
                Speaker: {isSpeakerMuted ? "Unmute" : "Mute"}
              </button>
            </div>
          </div>
        )}

        {/* Fiduciary slot */}
        <div className="mb-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Fiduciary (1/1)</h3>
          <div className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center justify-between">
            <span className="font-medium truncate">
              {fiduciary ? profiles[fiduciary.player_id]?.display_name ?? "Fiduciary" : "—"}
            </span>
            <div className="flex items-center gap-2">
              {fiduciary && session?.host_id === fiduciary.player_id && (
                <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Host</span>
              )}
              <RoleBadge role="fiduciary" />
            </div>
          </div>
        </div>

        {/* Principal slot */}
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Principal ({principals.length}/1 connected)
          </h3>
          <div className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center justify-between">
            <span className="font-medium truncate">
              {principal ? profiles[principal.player_id]?.display_name ?? "Principal" : "—"}
            </span>
            <div className="flex items-center gap-2">
              {principal && session?.host_id === principal.player_id && (
                <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Host</span>
              )}
              <RoleBadge role="principal" />
            </div>
          </div>
          {!principal && (
            <div className="mt-1.5 rounded-lg border border-dashed border-border bg-surface-2/40 px-4 py-2.5 text-sm text-muted-foreground">
              Waiting for Principal to join…
            </div>
          )}
        </div>

        {isHost ? (
          <button
            onClick={startGame}
            disabled={principals.length !== 1 || !fiduciary}
            className="w-full py-3 rounded-md bg-accent text-accent-foreground font-semibold disabled:opacity-40"
          >
            {!fiduciary || principals.length === 0
              ? `Waiting for ${hostNeeds}…`
              : "Start Level-1 → Level-2 session"}
          </button>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            Waiting for the host to start the session…
          </div>
        )}
      </main>
    </div>
  );
}
