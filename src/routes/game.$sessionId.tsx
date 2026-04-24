import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGameSession } from "@/hooks/useGameSession";
import { supabase } from "@/integrations/supabase/client";
import { getScenarioQueueForRole, type Choice } from "@/data/scenarios";
import { applyAnswer, applyDpoAuditPenalty } from "@/lib/gameEngine";
import { ScenarioCard } from "@/components/game/ScenarioCard";
import { ComplianceMeter } from "@/components/game/ComplianceMeter";
import { RevenueCounter } from "@/components/game/RevenueCounter";
import { ShiftTimer } from "@/components/game/ShiftTimer";
import { DPOModal } from "@/components/game/DPOModal";
import { FailureOverlay } from "@/components/game/FailureOverlay";
import { LevelTransition } from "@/components/game/LevelTransition";
import { RoleBadge, LevelBadge } from "@/components/ui/Badges";
import { MultiplayerLiveGame } from "@/components/game/MultiplayerLiveGame";

export const Route = createFileRoute("/game/$sessionId")({
  component: GamePage,
});

function GamePage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { session, me, loading } = useGameSession(sessionId, user?.id);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading game…
      </div>
    );
  }
  if (!user) {
    navigate({ to: "/auth" });
    return null;
  }
  if (!session || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Session not found.
      </div>
    );
  }

  // Multiplayer: route to the live, host-driven cockpit / principal view
  if (session.mode === "multiplayer") {
    return <MultiplayerLiveGame sessionId={sessionId} />;
  }

  // Solo path (unchanged)
  return <SoloGame sessionId={sessionId} userId={user.id} displayName={profile?.display_name ?? "Agent"} />;
}

/* ------------------------------------------------------------------ */
/* SOLO GAME (single-player flow, preserved as-is)                      */
/* ------------------------------------------------------------------ */

function SoloGame({
  sessionId,
  userId,
  displayName,
}: {
  sessionId: string;
  userId: string;
  displayName: string;
}) {
  const navigate = useNavigate();
  const { me } = useGameSession(sessionId, userId);

  const [showDpo, setShowDpo] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showLevelDone, setShowLevelDone] = useState(false);
  const [completedLevel, setCompletedLevel] = useState<1 | 2 | 3 | null>(null);
  const pendingPersistRef = useRef<Promise<void> | null>(null);

  const queue = useMemo(() => (me ? getScenarioQueueForRole(me.role) : []), [me]);
  const currentScenario = me ? queue[me.current_scenario_index] : null;
  const displayLevel = (currentScenario?.level ?? me?.current_level ?? 1) as 1 | 2 | 3;

  useEffect(() => {
    if (!me) return;

    if (me.status === "playing" && !currentScenario) {
      void Promise.all([
        supabase
          .from("session_players")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", me.id),
        supabase
          .from("game_sessions")
          .update({ status: "completed", ended_at: new Date().toISOString() })
          .eq("id", sessionId),
      ]);
      return;
    }

    if (me.status === "playing") return;

    void supabase
      .from("game_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", sessionId)
      .neq("status", "completed");
  }, [me, currentScenario, sessionId]);

  if (!me) return null;

  const isFid = me.role === "fiduciary";

  if (me.status === "bankrupt") {
    return (
      <FailureOverlay
        type="bankrupt"
        score={me.score}
        level={displayLevel}
        onRecap={() => navigate({ to: "/results/$sessionId", params: { sessionId } })}
      />
    );
  }
  if (me.status === "timeout") {
    return (
      <FailureOverlay
        type="timeout"
        score={me.score}
        level={displayLevel}
        onRecap={() => navigate({ to: "/results/$sessionId", params: { sessionId } })}
      />
    );
  }
  if (me.status === "completed" || !currentScenario) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center bg-surface border border-border rounded-xl p-7 animate-slide-up">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="font-display text-2xl mb-2">All scenarios complete!</h2>
          <p className="text-muted-foreground mb-5">
            Final score: <span className="font-mono font-bold text-foreground">{me.score}</span>
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

  const handleAnswer = (choice: Choice) => {
    const result = applyAnswer(
      {
        score: me.score,
        compliance_meter: me.compliance_meter,
        revenue: me.revenue,
        shift_timer: me.shift_timer,
        role: me.role,
      },
      choice,
      currentScenario,
    );

    const persistPromise = (async () => {
      const { error: ansErr } = await supabase.from("scenario_answers").insert({
        session_player_id: me.id,
        scenario_id: currentScenario.id,
        level: currentScenario.level,
        role: me.role,
        choice,
        is_correct: result.isCorrect,
        score_delta: result.scoreDelta,
        dpdp_concept: currentScenario.dpdpConcepts.join(", "),
      });

      if (ansErr) throw ansErr;

      const { error: playerErr } = await supabase
        .from("session_players")
        .update({
          score: result.newScore,
          compliance_meter: result.newCompliance,
          revenue: result.newRevenue,
        })
        .eq("id", me.id);

      if (playerErr) throw playerErr;
    })();

    pendingPersistRef.current = persistPromise;
    void persistPromise.catch((error) => {
      console.error("Failed to persist answer", error);
    });

    if (result.isDpoAudit) setShowAudit(true);
    return result;
  };

  const handleNext = async () => {
    if (!currentScenario) return;

    if (pendingPersistRef.current) {
      try {
        await pendingPersistRef.current;
      } catch {
        return;
      } finally {
        pendingPersistRef.current = null;
      }
    }

    const nextIndex = me.current_scenario_index + 1;
    const nextScenario = queue[nextIndex];
    const nextLevel = nextScenario?.level ?? me.current_level;
    const levelChanged = nextScenario && nextScenario.level !== me.current_level;

    if (me.role === "fiduciary" && me.revenue <= 0) {
      await Promise.all([
        supabase
          .from("session_players")
          .update({ status: "bankrupt", completed_at: new Date().toISOString() })
          .eq("id", me.id),
        supabase
          .from("game_sessions")
          .update({ status: "completed", ended_at: new Date().toISOString() })
          .eq("id", sessionId),
      ]);
      return;
    }

    if (!nextScenario) {
      await Promise.all([
        supabase
          .from("session_players")
          .update({
            current_scenario_index: nextIndex,
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", me.id),
        supabase
          .from("game_sessions")
          .update({ status: "completed", ended_at: new Date().toISOString() })
          .eq("id", sessionId),
      ]);
      navigate({ to: "/results/$sessionId", params: { sessionId } });
      return;
    }

    if (levelChanged) {
      setCompletedLevel(currentScenario.level);
      setShowLevelDone(true);
      await supabase
        .from("session_players")
        .update({ current_scenario_index: nextIndex, current_level: nextLevel })
        .eq("id", me.id);
    } else {
      setCompletedLevel(null);
      await supabase
        .from("session_players")
        .update({ current_scenario_index: nextIndex })
        .eq("id", me.id);
    }
  };

  const askDpo = async () => {
    if (me.dpo_tokens <= 0) return;
    setShowDpo(true);
    await supabase.from("session_players").update({ dpo_tokens: me.dpo_tokens - 1 }).eq("id", me.id);
    await supabase.from("dpo_hints").insert({
      session_player_id: me.id,
      scenario_id: currentScenario.id,
      hint_text: currentScenario.dpoHint,
    });
  };

  const handleAuditAck = async () => {
    const updated = applyDpoAuditPenalty({
      score: me.score,
      compliance_meter: me.compliance_meter,
      revenue: me.revenue,
      shift_timer: me.shift_timer,
      role: me.role,
    });
    await supabase.from("session_players").update(updated).eq("id", me.id);
    setShowAudit(false);
  };

  const handleShiftTick = async (newSeconds: number) => {
    if (newSeconds % 5 === 0) {
      await supabase
        .from("session_players")
        .update({ shift_timer: Math.max(0, newSeconds) })
        .eq("id", me.id);
    }
  };

  const handleTimeout = async () => {
    await Promise.all([
      supabase
        .from("session_players")
        .update({ status: "timeout", shift_timer: 0, completed_at: new Date().toISOString() })
        .eq("id", me.id),
      supabase
        .from("game_sessions")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", sessionId),
    ]);
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-border bg-background/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[120px]">{displayName}</span>
            <RoleBadge role={me.role} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <LevelBadge level={displayLevel} />
            <span>
              Scenario {currentScenario.scenarioNumber}/{currentScenario.totalInLevel}
            </span>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
            <div className="font-mono font-bold text-lg tabular-nums">{me.score}</div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-2 flex items-center gap-4 flex-wrap text-xs">
          <ComplianceMeter value={me.compliance_meter} />
          {isFid && <RevenueCounter value={me.revenue} />}
          {isFid && (
            <ShiftTimer
              seconds={me.shift_timer}
              running={!!currentScenario?.isTimed && me.status === "playing"}
              onTick={handleShiftTick}
              onTimeout={handleTimeout}
            />
          )}
          <button
            onClick={askDpo}
            disabled={me.dpo_tokens <= 0 || showDpo}
            className="ml-auto text-xs px-3 py-1 rounded-md border border-border bg-surface-2 hover:border-primary/40 disabled:opacity-40"
          >
            🔔 Ask DPO ({me.dpo_tokens})
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 pt-6">
        <ScenarioCard
          key={currentScenario.id}
          scenario={currentScenario}
          onAnswer={handleAnswer}
          onNext={handleNext}
          onAskDpo={askDpo}
          dpoTokens={me.dpo_tokens}
        />
      </main>

      {showDpo && (
        <DPOModal hint={currentScenario.dpoHint} tokensRemaining={me.dpo_tokens} onClose={() => setShowDpo(false)} />
      )}
      {showAudit && (
        <FailureOverlay type="audit" score={me.score} level={displayLevel} onContinue={handleAuditAck} />
      )}
      {showLevelDone && (
        <LevelTransition
          level={completedLevel ?? displayLevel}
          score={me.score}
          compliance={me.compliance_meter}
          onContinue={() => {
            setShowLevelDone(false);
            setCompletedLevel(null);
          }}
          isHost={true}
        />
      )}
    </div>
  );
}
