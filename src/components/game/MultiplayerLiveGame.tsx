import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLiveSession } from "@/hooks/useLiveSession";
import { getScenarioQueueForRole, type Scenario } from "@/data/scenarios";
import { applyAnswer } from "@/lib/gameEngine";
import { ScenarioCard } from "@/components/game/ScenarioCard";
import { PrincipalRoster } from "@/components/game/PrincipalRoster";
import { LevelBadge, RoleBadge } from "@/components/ui/Badges";
import { toast } from "sonner";

interface Props {
  sessionId: string;
}

/**
 * Live multiplayer cockpit.
 * - Fiduciary (host) sees the principal-queue, picks a scenario, pushes it to all
 *   connected Principals, watches answers stream in, and auto-advances when all
 *   connected Principals have answered.
 * - Principals see the currently-live scenario and answer it once. After answering
 *   they see correctness, score and wait for the next push.
 *
 * Real-time sync uses Supabase Realtime (postgres_changes) on:
 *   live_rounds, live_answers, session_players, game_sessions.
 */
export function MultiplayerLiveGame({ sessionId }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const live = useLiveSession(sessionId, user?.id);

  // The shared queue is the PRINCIPAL queue (chosen game design):
  // Fiduciary curates Principal-rights scenarios for connected customers.
  const queue = useMemo(() => getScenarioQueueForRole("principal"), []);

  const isFiduciary = live.me?.role === "fiduciary";
  const isHost = live.session?.host_id === user?.id;

  if (live.loading || !live.session || !live.me) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Connecting to live session…
      </div>
    );
  }

  const roundIndex = live.rounds.length; // next round number = current count
  const queueExhausted = roundIndex >= queue.length && live.currentRound?.status === "closed";

  if (queueExhausted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center bg-surface border border-border rounded-xl p-7 animate-slide-up">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="font-display text-2xl mb-2">Session complete</h2>
          <p className="text-muted-foreground mb-5">
            All {queue.length} scenarios have been played. Final score:{" "}
            <span className="font-mono font-bold text-foreground">{live.me.score}</span>
          </p>
          <button
            onClick={() => navigate({ to: "/results/$sessionId", params: { sessionId } })}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            View Learning Recap →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-border bg-background/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[160px]">
              {profile?.display_name ?? "Agent"}
            </span>
            <RoleBadge role={live.me.role} />
            {isHost && (
              <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Host</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>Room {live.session.room_code}</span>
            <span>·</span>
            <span>
              Round {Math.min(roundIndex + (live.currentRound?.status === "open" ? 0 : 1), queue.length)}/{queue.length}
            </span>
            <span>·</span>
            <span>{live.principals.length} principal{live.principals.length === 1 ? "" : "s"}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
            <div className="font-mono font-bold text-lg tabular-nums">{live.me.score}</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 pt-6">
        {isFiduciary ? (
          <FiduciaryCockpit
            sessionId={sessionId}
            queue={queue}
            live={live}
            onFinish={() => navigate({ to: "/results/$sessionId", params: { sessionId } })}
          />
        ) : (
          <PrincipalLiveView sessionId={sessionId} queue={queue} live={live} />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FIDUCIARY COCKPIT                                                    */
/* ------------------------------------------------------------------ */

function FiduciaryCockpit({
  sessionId,
  queue,
  live,
  onFinish,
}: {
  sessionId: string;
  queue: Scenario[];
  live: ReturnType<typeof useLiveSession>;
  onFinish: () => void;
}) {
  const [pushing, setPushing] = useState(false);
  const nextIndex = live.rounds.length; // 0-based queue index for next push
  const currentScenario = live.currentRound
    ? queue.find((s) => s.id === live.currentRound!.scenario_id) ?? null
    : null;
  const upNext = nextIndex < queue.length ? queue[nextIndex] : null;

  const allAnswered =
    live.currentRound &&
    live.currentRound.status === "open" &&
    live.principals.length > 0 &&
    live.currentRoundAnswers.length >= live.principals.length;

  const closeRound = async () => {
    if (!live.currentRound) return;
    await supabase
      .from("live_rounds")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", live.currentRound.id);
  };

  const pushScenario = async (scenario: Scenario) => {
    if (pushing) return;
    setPushing(true);
    try {
      // Close any open round first
      if (live.currentRound?.status === "open") await closeRound();

      const { error } = await supabase.from("live_rounds").insert({
        session_id: sessionId,
        scenario_id: scenario.id,
        round_number: nextIndex + 1,
        status: "open",
      });
      if (error) throw error;
      toast.success(`Pushed: ${scenario.title}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not push scenario");
    } finally {
      setPushing(false);
    }
  };

  // Auto-close + auto-advance when all connected principals have answered
  useAutoAdvance({
    enabled: !!allAnswered,
    onTrigger: async () => {
      await closeRound();
      // Brief pause so principals see the resolution, then push next
      setTimeout(() => {
        const next = queue[nextIndex + 1] ?? null;
        if (next) {
          pushScenario(next);
        }
      }, 5000);
    },
  });

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <section>
        <h1 className="font-display text-2xl mb-1">Fiduciary Cockpit</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Push scenarios to your connected Principals. Each scenario auto-advances 5 seconds after every
          Principal has answered.
        </p>

        {currentScenario ? (
          <article className="rounded-xl border border-border bg-surface p-5 md:p-6 mb-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-3 mb-3 font-mono">
              <span>LIVE NOW</span>
              <span>
                {live.currentRoundAnswers.length}/{live.principals.length} answered
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <LevelBadge level={currentScenario.level} />
              <span className="text-xs text-muted-foreground">{currentScenario.domain}</span>
            </div>
            <h2 className="font-display text-xl mb-2">{currentScenario.title}</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">{currentScenario.situation}</p>
            <ol className="text-sm space-y-1.5">
              {(["A", "B", "C", "D"] as const).map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="font-mono font-bold text-muted-foreground w-5 shrink-0">{c}.</span>
                  <span className={c === "A" ? "text-accent" : ""}>{currentScenario.choices[c]}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
              Correct: A · {currentScenario.dpdpConcepts.join(" · ")}
            </p>
            {live.currentRound?.status === "closed" && (
              <button
                disabled={!upNext || pushing}
                onClick={() => upNext && pushScenario(upNext)}
                className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {upNext ? `Push next: ${upNext.title} →` : "End session"}
              </button>
            )}
            {live.currentRound?.status === "open" && !allAnswered && (
              <button
                onClick={closeRound}
                className="mt-4 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:border-primary/40"
              >
                Close round early
              </button>
            )}
          </article>
        ) : upNext ? (
          <article className="rounded-xl border border-border bg-surface p-5 md:p-6 mb-5">
            <h2 className="font-display text-xl mb-2">Ready to start: {upNext.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {live.principals.length === 0
                ? "Waiting for at least one Principal to join."
                : `${live.principals.length} Principal${live.principals.length === 1 ? "" : "s"} connected. Push the first scenario when ready.`}
            </p>
            <button
              disabled={live.principals.length === 0 || pushing}
              onClick={() => pushScenario(upNext)}
              className="px-5 py-2.5 rounded-md bg-accent text-accent-foreground font-semibold disabled:opacity-40"
            >
              📡 Push to Principals
            </button>
          </article>
        ) : (
          <article className="rounded-xl border border-border bg-surface p-5 md:p-6 mb-5 text-center">
            <p className="font-display text-xl mb-2">All scenarios pushed</p>
            <button
              onClick={onFinish}
              className="mt-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium"
            >
              View Learning Recap →
            </button>
          </article>
        )}

        {/* Queue preview */}
        <details className="rounded-xl border border-border bg-surface-2/30 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Queue ({nextIndex}/{queue.length} pushed)
          </summary>
          <ol className="mt-3 space-y-1.5 text-sm">
            {queue.map((s, i) => (
              <li
                key={s.id}
                className={
                  i < nextIndex - (live.currentRound?.status === "open" ? 1 : 0)
                    ? "text-muted-foreground line-through"
                    : i === nextIndex - 1 && live.currentRound?.status === "open"
                      ? "text-accent font-medium"
                      : "text-foreground/80"
                }
              >
                <span className="font-mono text-xs mr-2">L{s.level}·{i + 1}</span>
                {s.title}
              </li>
            ))}
          </ol>
        </details>
      </section>

      <aside className="space-y-4">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Connected Principals
          </h3>
          <PrincipalRoster
            principals={live.principals}
            profiles={live.profiles}
            currentRoundAnswers={live.currentRoundAnswers}
            showChoices
          />
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PRINCIPAL LIVE VIEW                                                  */
/* ------------------------------------------------------------------ */

function PrincipalLiveView({
  sessionId,
  queue,
  live,
}: {
  sessionId: string;
  queue: Scenario[];
  live: ReturnType<typeof useLiveSession>;
}) {
  const round = live.currentRound;
  const scenario = round ? queue.find((s) => s.id === round.scenario_id) ?? null : null;
  const myAnswer = round
    ? live.currentRoundAnswers.find((a) => a.player_id === live.me!.player_id) ?? null
    : null;

  if (!round || !scenario) {
    return (
      <div className="max-w-md mx-auto text-center pt-12">
        <div className="text-5xl mb-3 animate-pulse-ring">📡</div>
        <h2 className="font-display text-2xl mb-2">Waiting for the Fiduciary…</h2>
        <p className="text-sm text-muted-foreground">
          The Fiduciary will push your next scenario shortly. Stay on this screen.
        </p>
      </div>
    );
  }

  const handleAnswer = async (choice: "A" | "B" | "C" | "D") => {
    if (myAnswer || !live.me) return;

    const result = applyAnswer(
      {
        score: live.me.score,
        compliance_meter: live.me.compliance_meter,
        revenue: live.me.revenue,
        shift_timer: live.me.shift_timer,
        role: live.me.role,
      },
      choice,
      scenario,
    );

    // Insert live answer (broadcast via realtime to host + others)
    const { error: ansErr } = await supabase.from("live_answers").insert({
      round_id: round.id,
      session_id: sessionId,
      player_id: live.me.player_id,
      session_player_id: live.me.id,
      choice,
      is_correct: result.isCorrect,
      score_delta: result.scoreDelta,
    });
    if (ansErr) {
      toast.error(ansErr.message);
      return;
    }

    // Persist permanent answer trail for the recap
    await supabase.from("scenario_answers").insert({
      session_player_id: live.me.id,
      scenario_id: scenario.id,
      level: scenario.level,
      role: live.me.role,
      choice,
      is_correct: result.isCorrect,
      score_delta: result.scoreDelta,
      dpdp_concept: scenario.dpdpConcepts.join(", "),
    });

    // Update player aggregate
    await supabase
      .from("session_players")
      .update({
        score: result.newScore,
        compliance_meter: result.newCompliance,
      })
      .eq("id", live.me.id);

    return result;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <ScenarioCard
        key={round.id}
        scenario={scenario}
        onAnswer={(c) => {
          // Synchronous wrapper expected by ScenarioCard. We trigger the async
          // write but return a computed AnswerResult immediately so the UI can
          // reveal the result panel.
          const synchronousResult = applyAnswer(
            {
              score: live.me!.score,
              compliance_meter: live.me!.compliance_meter,
              revenue: live.me!.revenue,
              shift_timer: live.me!.shift_timer,
              role: live.me!.role,
            },
            c,
            scenario,
          );
          // fire-and-forget the persistence
          void handleAnswer(c);
          return synchronousResult;
        }}
        onNext={() => {
          // No-op: the host advances the round. Show a waiting message instead.
          toast("Waiting for the Fiduciary to push the next scenario…");
        }}
        dpoTokens={live.me?.dpo_tokens ?? 0}
      />

      {/* Waiting / progress banner */}
      <div className="mt-5 rounded-lg border border-border bg-surface-2/40 p-3 text-xs text-muted-foreground flex items-center justify-between font-mono">
        <span>
          {live.currentRoundAnswers.length}/{live.principals.length} principals have answered
        </span>
        <span>{round.status === "closed" ? "Round closed — next coming up…" : "Round open"}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                              */
/* ------------------------------------------------------------------ */

function useAutoAdvance({ enabled, onTrigger }: { enabled: boolean; onTrigger: () => void }) {
  // Use a ref to prevent multiple triggers per round
  const triggeredRef = useTriggerOnce(enabled);
  if (enabled && !triggeredRef.alreadyFired) {
    triggeredRef.fire(onTrigger);
  }
}

import { useRef as useReactRef, useEffect as useReactEffect } from "react";
function useTriggerOnce(reset: boolean) {
  const ref = useReactRef<{ fired: boolean }>({ fired: false });
  useReactEffect(() => {
    if (!reset) ref.current.fired = false;
  }, [reset]);
  return {
    get alreadyFired() {
      return ref.current.fired;
    },
    fire(cb: () => void) {
      if (ref.current.fired) return;
      ref.current.fired = true;
      cb();
    },
  };
}
