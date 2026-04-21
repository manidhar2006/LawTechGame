import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { OpponentHUD } from "@/components/game/OpponentHUD";
import { RoleBadge, LevelBadge } from "@/components/ui/Badges";
import { toast } from "sonner";

export const Route = createFileRoute("/game/$sessionId")({
  component: GamePage,
});

function GamePage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { session, me, opponent, profiles, loading } = useGameSession(sessionId, user?.id);

  const [showDpo, setShowDpo] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showLevelDone, setShowLevelDone] = useState(false);

  const queue = useMemo(() => (me ? getScenarioQueueForRole(me.role) : []), [me?.role]);
  const currentScenario = me ? queue[me.current_scenario_index] : null;

  // Game end checks
  useEffect(() => {
    if (!me) return;
    if (me.status !== "playing") {
      // already over
    }
  }, [me?.status]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading game…</div>;
  if (!user) {
    navigate({ to: "/auth" });
    return null;
  }
  if (!session || !me) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Session not found.</div>;

  const isFid = me.role === "fiduciary";
  const isMultiplayer = session.mode === "multiplayer";
  const isHost = session.host_id === user.id;

  // Failure overlays
  if (me.status === "bankrupt") {
    return <FailureOverlay type="bankrupt" score={me.score} level={me.current_level} onRecap={() => navigate({ to: "/results/$sessionId", params: { sessionId } })} />;
  }
  if (me.status === "timeout") {
    return <FailureOverlay type="timeout" score={me.score} level={me.current_level} onRecap={() => navigate({ to: "/results/$sessionId", params: { sessionId } })} />;
  }
  if (me.status === "completed" || !currentScenario) {
    // ensure status is set
    if (me.status === "playing" && !currentScenario) {
      supabase.from("session_players").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", me.id);
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center bg-surface border border-border rounded-xl p-7 animate-slide-up">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="font-display text-2xl mb-2">All scenarios complete!</h2>
          <p className="text-muted-foreground mb-5">Final score: <span className="font-mono font-bold text-foreground">{me.score}</span></p>
          <button onClick={() => navigate({ to: "/results/$sessionId", params: { sessionId } })} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium">View Learning Recap →</button>
        </div>
      </div>
    );
  }

  const handleAnswer = (choice: Choice) => {
    const result = applyAnswer(
      { score: me.score, compliance_meter: me.compliance_meter, revenue: me.revenue, shift_timer: me.shift_timer, role: me.role },
      choice,
      currentScenario,
    );

    // Persist answer
    supabase.from("scenario_answers").insert({
      session_player_id: me.id,
      scenario_id: currentScenario.id,
      level: currentScenario.level,
      role: me.role,
      choice,
      is_correct: result.isCorrect,
      score_delta: result.scoreDelta,
      dpdp_concept: currentScenario.dpdpConcepts.join(", "),
    });

    // Update player state
    supabase
      .from("session_players")
      .update({
        score: result.newScore,
        compliance_meter: result.newCompliance,
        revenue: result.newRevenue,
      })
      .eq("id", me.id);

    if (result.isDpoAudit) setShowAudit(true);

    return result;
  };

  const handleNext = async () => {
    if (!currentScenario) return;
    const nextIndex = me.current_scenario_index + 1;
    const nextScenario = queue[nextIndex];
    const nextLevel = nextScenario?.level ?? me.current_level;
    const levelChanged = nextScenario && nextScenario.level !== me.current_level;

    // bankrupt check
    if (me.role === "fiduciary" && me.revenue <= 0) {
      await supabase.from("session_players").update({ status: "bankrupt", completed_at: new Date().toISOString() }).eq("id", me.id);
      return;
    }

    if (!nextScenario) {
      await supabase.from("session_players").update({
        current_scenario_index: nextIndex,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", me.id);
      navigate({ to: "/results/$sessionId", params: { sessionId } });
      return;
    }

    if (levelChanged) {
      // Show level transition
      setShowLevelDone(true);
      await supabase.from("session_players").update({
        current_scenario_index: nextIndex,
        current_level: nextLevel,
      }).eq("id", me.id);
    } else {
      await supabase.from("session_players").update({
        current_scenario_index: nextIndex,
      }).eq("id", me.id);
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
    const updated = applyDpoAuditPenalty({ score: me.score, compliance_meter: me.compliance_meter, revenue: me.revenue, shift_timer: me.shift_timer, role: me.role });
    await supabase.from("session_players").update(updated).eq("id", me.id);
    setShowAudit(false);
  };

  const handleShiftTick = async (newSeconds: number) => {
    if (newSeconds % 5 === 0) {
      await supabase.from("session_players").update({ shift_timer: Math.max(0, newSeconds) }).eq("id", me.id);
    }
  };

  const handleTimeout = async () => {
    await supabase.from("session_players").update({ status: "timeout", shift_timer: 0, completed_at: new Date().toISOString() }).eq("id", me.id);
  };

  const opponentName = opponent ? profiles[opponent.player_id]?.display_name ?? "Opponent" : "";

  return (
    <div className="min-h-screen pb-12">
      {/* Top HUD */}
      <header className="border-b border-border bg-background/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[120px]">{profile?.display_name ?? "Agent"}</span>
            <RoleBadge role={me.role} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <LevelBadge level={me.current_level as 1 | 2 | 3} />
            <span>Scenario {me.current_scenario_index + 1}/{queue.length}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
            <div className="font-mono font-bold text-lg tabular-nums">{me.score}</div>
          </div>
        </div>
        {/* Meters row */}
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

      {/* Opponent HUD - multiplayer */}
      {isMultiplayer && opponent && (
        <div className="fixed top-20 right-3 sm:right-4 z-10">
          <OpponentHUD opponent={opponent} displayName={opponentName} />
        </div>
      )}

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
        <FailureOverlay type="audit" score={me.score} level={me.current_level} onContinue={handleAuditAck} />
      )}
      {showLevelDone && (
        <LevelTransition
          level={me.current_level - 1 < 1 ? me.current_level : me.current_level}
          score={me.score}
          compliance={me.compliance_meter}
          onContinue={() => setShowLevelDone(false)}
          isHost={isHost}
          opponentScore={opponent?.score}
          opponentName={opponentName}
        />
      )}
    </div>
  );
}
