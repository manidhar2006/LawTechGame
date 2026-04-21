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

const searchSchema = z.object({
  mode: z.enum(["solo", "multiplayer"]).optional(),
  join: z.coerce.boolean().optional(),
  session: z.string().optional(),
});

export const Route = createFileRoute("/lobby")({
  validateSearch: searchSchema,
  component: LobbyPage,
});

function LobbyPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, profile, loading: authLoading } = useAuth();

  // Onboarding gate
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
  if (search.mode === "solo") return <SoloFlow userId={user.id} displayName={profile?.display_name ?? "Agent"} />;
  if (search.join) return <JoinFlow userId={user.id} displayName={profile?.display_name ?? "Agent"} />;
  if (search.session) return <WaitingLobby sessionId={search.session} userId={user.id} displayName={profile?.display_name ?? "Agent"} />;
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
        <p className="text-muted-foreground mb-8">Solo to learn at your pace, or multiplayer to challenge a colleague live.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/lobby" search={{ mode: "solo" }} className="group rounded-xl border border-border bg-surface p-6 hover:border-primary/40 hover:glow-primary transition">
            <div className="text-2xl mb-2">🎯</div>
            <h2 className="font-display text-xl mb-1">Solo</h2>
            <p className="text-sm text-muted-foreground">Play at your own pace. Full learning recap at the end.</p>
          </Link>
          <Link to="/lobby" search={{ mode: "multiplayer" }} className="group rounded-xl border border-border bg-surface p-6 hover:border-[var(--principal)]/40 transition">
            <div className="text-2xl mb-2">⚡</div>
            <h2 className="font-display text-xl mb-1">Multiplayer</h2>
            <p className="text-sm text-muted-foreground">Challenge a colleague. Live scoreboard. Room code sharing.</p>
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
  const [step, setStep] = useState<"choose" | "join_or_create">("choose");

  if (step === "choose") {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-4 pt-12">
          <h1 className="font-display text-3xl mb-2">Multiplayer</h1>
          <p className="text-muted-foreground mb-8">Hi {displayName}. Host a new room or join with a code.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <button onClick={() => setStep("join_or_create")} className="rounded-xl border border-border bg-surface p-6 text-left hover:border-primary/40">
              <div className="text-xl mb-2">🆕</div>
              <h2 className="font-display text-lg">Host a new room</h2>
              <p className="text-sm text-muted-foreground mt-1">Pick your role and share the 6-character code.</p>
            </button>
            <Link to="/lobby" search={{ mode: "multiplayer", join: true }} className="rounded-xl border border-border bg-surface p-6 text-left hover:border-primary/40">
              <div className="text-xl mb-2">🔗</div>
              <h2 className="font-display text-lg">Join with code</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter a 6-character room code from the host.</p>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const create = async (role: Role) => {
    try {
      let roomCode = generateRoomCode();
      // collision-check up to 5 times
      for (let i = 0; i < 5; i++) {
        const { data: existing } = await supabase.from("game_sessions").select("id").eq("room_code", roomCode).maybeSingle();
        if (!existing) break;
        roomCode = generateRoomCode();
      }
      const { data: gs, error } = await supabase
        .from("game_sessions")
        .insert({ host_id: userId, mode: "multiplayer", status: "lobby", room_code: roomCode })
        .select()
        .single();
      if (error) throw error;
      const { error: spErr } = await supabase.from("session_players").insert({ session_id: gs.id, player_id: userId, role });
      if (spErr) throw spErr;
      navigate({ to: "/lobby", search: { mode: "multiplayer", session: gs.id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 pt-12">
        <h1 className="font-display text-3xl mb-1">Pick your role</h1>
        <p className="text-muted-foreground mb-8">Your opponent will play the opposite role.</p>
        <RoleCardPicker onPick={create} />
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
      const upper = code.trim().toUpperCase();
      const { data: gs } = await supabase.from("game_sessions").select("*").eq("room_code", upper).maybeSingle();
      if (!gs) throw new Error("Room not found");
      if (gs.status !== "lobby") throw new Error("Room is no longer accepting players");
      const { data: existing } = await supabase.from("session_players").select("*").eq("session_id", gs.id);
      if (existing && existing.length >= 2) throw new Error("Room is full");
      const hostRole = existing?.[0]?.role;
      const myRole: Role = hostRole === "fiduciary" ? "principal" : "fiduciary";
      const { error } = await supabase.from("session_players").insert({ session_id: gs.id, player_id: userId, role: myRole });
      if (error) throw error;
      toast.success(`Joined as ${myRole}`);
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
        <p className="text-muted-foreground mb-6">Hi {displayName}, enter the 6-character code.</p>
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

function WaitingLobby({ sessionId, userId }: { sessionId: string; userId: string; displayName: string }) {
  const navigate = useNavigate();
  const { session, players, profiles, me } = useGameSession(sessionId, userId);
  const isHost = session?.host_id === userId;
  const isFull = players.length === 2;
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-redirect both clients when host starts game (status -> active)
  useEffect(() => {
    if (session?.status === "active") {
      navigate({ to: "/game/$sessionId", params: { sessionId } });
    }
  }, [session?.status, sessionId, navigate]);

  const startGame = async () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      supabase
        .from("game_sessions")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", sessionId)
        .then(() => navigate({ to: "/game/$sessionId", params: { sessionId } }));
      return;
    }
    const t = setTimeout(() => setCountdown((n) => (n ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, sessionId, navigate]);

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
        <p className="text-muted-foreground mb-6">Share this code with your opponent.</p>

        {session.room_code && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center mb-6">
            <div className="text-xs uppercase text-muted-foreground tracking-widest mb-2">Room Code</div>
            <div className="font-mono text-5xl font-bold tracking-[0.3em] mb-4">{session.room_code}</div>
            <div className="flex gap-2 justify-center">
              <button onClick={copyCode} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Copy code</button>
              <a
                href={`https://wa.me/?text=Join%20me%20on%20DataGuardian!%20Code:%20${session.room_code}%20%E2%80%94%20${encodeURIComponent(window.location.origin)}/lobby?mode=multiplayer&join=true`}
                target="_blank" rel="noreferrer"
                className="px-4 py-2 rounded-md border border-border text-sm"
              >
                Share via WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[0, 1].map((slot) => {
            const p = players[slot];
            return (
              <div key={slot} className={`rounded-lg border p-4 ${p ? "border-border bg-surface" : "border-dashed border-border bg-surface-2/40"}`}>
                {p ? (
                  <>
                    <div className="font-medium truncate">{profiles[p.player_id]?.display_name ?? "Player"}</div>
                    <RoleBadge role={p.role} className="mt-1.5" />
                    {p.player_id === session.host_id && <span className="ml-2 text-[10px] text-[var(--gold)] uppercase">Host</span>}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Waiting for player…</div>
                )}
              </div>
            );
          })}
        </div>

        {isHost && (
          countdown !== null ? (
            <div className="text-center font-display text-6xl py-6 animate-pulse-ring">{countdown || "GO"}</div>
          ) : (
            <button onClick={startGame} disabled={!isFull} className="w-full py-3 rounded-md bg-accent text-accent-foreground font-semibold disabled:opacity-40">
              {isFull ? "Start Game" : "Waiting for opponent…"}
            </button>
          )
        )}
        {!isHost && <div className="text-center text-sm text-muted-foreground">Waiting for host to start…</div>}
      </main>
    </div>
  );
}
