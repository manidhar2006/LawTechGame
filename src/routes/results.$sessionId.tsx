import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/layout/AppHeader";
import { RoleBadge } from "@/components/ui/Badges";
import { toast } from "sonner";
import { SCENARIOS } from "@/data/scenarios";
import { getLevel1CardById } from "@/data/level1Principles";
import { getLevel2CardById } from "@/data/level2BankingInsurance";

export const Route = createFileRoute("/results/$sessionId")({
  component: ResultsPage,
});

interface AnswerRow {
  id: string;
  scenario_id: string;
  level: number;
  choice: string;
  is_correct: boolean;
  dpdp_concept: string;
  answered_at: string | null;
}

interface SP {
  id: string;
  player_id: string;
  role: "fiduciary" | "principal";
  score: number;
  compliance_meter: number;
  current_level: number;
  status: string;
}

function ResultsPage() {
  const { sessionId } = Route.useParams();
  const { user, profile } = useAuth();
  const [me, setMe] = useState<SP | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionMode, setSessionMode] = useState<"solo" | "multiplayer">("solo");
  const [sessionReachedLevel2, setSessionReachedLevel2] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Load session metadata to determine mode & levels reached
      const { data: sessionData } = await supabase
        .from("game_sessions")
        .select("mode, status")
        .eq("id", sessionId)
        .maybeSingle();
      if (sessionData) {
        setSessionMode((sessionData as { mode: "solo" | "multiplayer" }).mode);
        // If the session was promoted to level2 or completed via level2, mark it
        const s = (sessionData as { status: string }).status;
        if (s === "level2" || s === "completed") {
          // Check level2_sessions to see if this session played level 2
          const { data: l2 } = await supabase
            .from("level2_sessions")
            .select("id, status")
            .eq("session_id", sessionId)
            .maybeSingle();
          if (l2) setSessionReachedLevel2(true);
        }
      }

      const { data: sp } = await supabase
        .from("session_players")
        .select("*")
        .eq("session_id", sessionId)
        .eq("player_id", user.id)
        .maybeSingle();
      setMe(sp as SP | null);
      if (sp) {
        const { data: ans } = await supabase
          .from("scenario_answers")
          .select("*")
          .eq("session_player_id", sp.id)
          .order("answered_at", { ascending: true });
        setAnswers((ans as AnswerRow[]) ?? []);
        // Check if already submitted
        const { data: lb } = await supabase.from("leaderboard").select("id").eq("session_id", sessionId).eq("player_id", user.id).maybeSingle();
        if (lb) setSubmitted(true);
      }
      setLoading(false);
    };
    load();
  }, [sessionId, user]);

  const outcome: "completed" | "bankrupt" | "timeout" =
    me?.status === "bankrupt" ? "bankrupt" : me?.status === "timeout" ? "timeout" : "completed";

  const submit = useCallback(async (showToast = true) => {
    if (submitted) return;
    if (!user || !me) return;
    // For multiplayer, current_level on session_players may stay at 1 even if Level-2 was played,
    // so we use the sessionReachedLevel2 flag to report the correct max level reached.
    const maxLevel = sessionMode === "multiplayer" && sessionReachedLevel2
      ? 2
      : me.current_level;
    try {
      const { error } = await supabase.from("leaderboard").insert({
        player_id: user.id,
        display_name: profile?.display_name ?? "Agent",
        role: me.role,
        final_score: me.score,
        max_level_reached: maxLevel,
        compliance_pct: me.compliance_meter,
        outcome,
        session_id: sessionId,
      });
      if (error) throw error;
      setSubmitted(true);
      if (showToast) toast.success("Score submitted to leaderboard!");
    } catch (err: unknown) {
      if (showToast) toast.error(err instanceof Error ? err.message : "Failed to submit");
    }
  }, [submitted, user, me, profile?.display_name, sessionId, outcome, sessionMode, sessionReachedLevel2]);

  useEffect(() => {
    if (loading || !user || !me || submitted) return;
    void submit(false);
  }, [loading, user, me, submitted, submit, sessionReachedLevel2]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading recap…</div>;
  if (!me || !user) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <p className="text-center pt-20 text-muted-foreground">No results found for this session.</p>
      </div>
    );
  }

  const mastered = new Set<string>();
  const toRevisit: { concept: string; scenarioTitle: string }[] = [];
  answers.forEach((a) => {
    const sc = SCENARIOS.find((s) => s.id === a.scenario_id);
    const level1Card = getLevel1CardById(a.scenario_id);
    const concept = a.dpdp_concept;
    if (a.is_correct) mastered.add(concept);
    else toRevisit.push({ concept, scenarioTitle: sc?.title ?? level1Card?.title ?? a.scenario_id });
  });
  const masteredList = [...mastered];

  const answerReview = answers.map((answer) => {
    const scenario = SCENARIOS.find((s) => s.id === answer.scenario_id);
    const level1Card = getLevel1CardById(answer.scenario_id);
    const level2Card = getLevel2CardById(answer.scenario_id);

    if (!scenario) {
      // Level-1 multiplayer card
      if (level1Card) {
        const yourChoiceLabel = answer.choice as "A" | "B" | "C" | "D";
        const correctChoiceLabel = level1Card.correctChoice;
        return {
          id: answer.id,
          title: `${level1Card.title} (${level1Card.section})`,
          level: answer.level,
          yourChoiceLabel,
          yourChoiceText: level1Card.choices[yourChoiceLabel],
          correctChoiceLabel,
          correctChoiceText: level1Card.choices[correctChoiceLabel],
          isCorrect: answer.is_correct,
        };
      }

      // Level-2 multiplayer Banking & Insurance card
      if (level2Card) {
        const yourChoiceLabel = answer.choice as "A" | "B" | "C" | "D";
        const correctChoiceLabel = level2Card.correctChoice;
        return {
          id: answer.id,
          title: `${level2Card.title} (${level2Card.sector} — ${level2Card.section})`,
          level: answer.level,
          yourChoiceLabel,
          yourChoiceText: level2Card.choices[yourChoiceLabel],
          correctChoiceLabel,
          correctChoiceText: level2Card.choices[correctChoiceLabel],
          isCorrect: answer.is_correct,
        };
      }

      return {
        id: answer.id,
        title: answer.scenario_id,
        level: answer.level,
        yourChoiceLabel: answer.choice,
        yourChoiceText: "Answer text unavailable",
        correctChoiceLabel: "A",
        correctChoiceText: "Answer text unavailable",
        isCorrect: answer.is_correct,
      };
    }

    const yourChoiceLabel = answer.choice as "A" | "B" | "C" | "D";
    const correctChoiceLabel = scenario.correctChoice;

    return {
      id: answer.id,
      title: scenario.title,
      level: scenario.level,
      yourChoiceLabel,
      yourChoiceText: scenario.choices[yourChoiceLabel],
      correctChoiceLabel,
      correctChoiceText: scenario.choices[correctChoiceLabel],
      isCorrect: answer.is_correct,
    };
  });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 pt-10 pb-16">
        <h1 className="font-display text-3xl mb-1">Learning Recap</h1>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <p className="text-muted-foreground">Outcome: <span className="font-medium text-foreground">{outcome === "completed" ? "✅ Completed" : outcome === "bankrupt" ? "💀 Bankrupt" : "⏰ Timeout"}</span></p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sessionMode === "multiplayer" ? "bg-[var(--principal)]/10 text-[var(--principal)] border-[var(--principal)]/30" : "bg-[var(--fiduciary)]/10 text-[var(--fiduciary)] border-[var(--fiduciary)]/30"}`}>
            {sessionMode === "multiplayer" ? "🤝 Multiplayer" : "🎮 Solo"}
          </span>
          {sessionReachedLevel2 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30">
              🏦 Level-2 Reached
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Score summary */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-display text-xl">{profile?.display_name}</h2>
              <RoleBadge role={me.role} />
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Final Score</dt><dd className="font-mono font-bold text-2xl tabular-nums">{me.score}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Level Reached</dt><dd className="font-mono">L{me.current_level}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Compliance</dt><dd className="font-mono">{me.compliance_meter}%</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Scenarios Played</dt><dd className="font-mono">{answers.length}</dd></div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => void submit(true)} disabled={submitted} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {submitted ? "Submitted ✓" : "Submit to Leaderboard"}
              </button>
              <Link to="/lobby" className="px-4 py-2 rounded-md border border-border text-sm">Play Again</Link>
              <Link to="/leaderboard" className="px-4 py-2 rounded-md border border-border text-sm">View Leaderboard</Link>
            </div>
          </section>

          {/* Debrief */}
          <section className="space-y-4">
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-5">
              <h3 className="font-display text-lg mb-2">✅ Principles Mastered</h3>
              {masteredList.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet — keep playing!</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {masteredList.map((c) => <li key={c}>· {c}</li>)}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-5">
              <h3 className="font-display text-lg mb-2">⚠️ Principles To Revisit</h3>
              {toRevisit.length === 0 ? (
                <p className="text-sm text-muted-foreground">Flawless run — no concepts to revisit.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {toRevisit.map((r, i) => (
                    <li key={i}>
                      <div className="font-medium">{r.concept}</div>
                      <div className="text-xs text-muted-foreground">Scenario: {r.scenarioTitle}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 bg-surface border border-border rounded-xl p-6">
          <h2 className="font-display text-xl mb-1">Answer Review</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your submitted answer and the correct answer are shown for each scenario.
          </p>

          {answerReview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded answers yet.</p>
          ) : (
            <div className="space-y-3">
              {answerReview.map((row, index) => (
                <article key={row.id} className="rounded-lg border border-border bg-surface-2/40 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-medium">{index + 1}. {row.title}</h3>
                    <span className="text-xs font-mono text-muted-foreground">L{row.level}</span>
                  </div>
                  <div className="text-sm mb-1">
                    <span className="text-muted-foreground">Your answer:</span>{" "}
                    <span className={row.isCorrect ? "text-accent" : "text-[var(--warning)]"}>
                      {row.yourChoiceLabel}. {row.yourChoiceText}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Correct answer:</span>{" "}
                    <span className="text-accent">
                      {row.correctChoiceLabel}. {row.correctChoiceText}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
