import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/layout/AppHeader";
import { RoleBadge } from "@/components/ui/Badges";
import { toast } from "sonner";
import { SCENARIOS } from "@/data/scenarios";

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
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [me, setMe] = useState<SP | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
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
          .eq("session_player_id", sp.id);
        setAnswers((ans as AnswerRow[]) ?? []);
        // Check if already submitted
        const { data: lb } = await supabase.from("leaderboard").select("id").eq("session_id", sessionId).eq("player_id", user.id).maybeSingle();
        if (lb) setSubmitted(true);
      }
      setLoading(false);
    };
    load();
  }, [sessionId, user]);

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
    const concept = a.dpdp_concept;
    if (a.is_correct) mastered.add(concept);
    else toRevisit.push({ concept, scenarioTitle: sc?.title ?? a.scenario_id });
  });
  const masteredList = [...mastered];

  const outcome: "completed" | "bankrupt" | "timeout" =
    me.status === "bankrupt" ? "bankrupt" : me.status === "timeout" ? "timeout" : "completed";

  const submit = async () => {
    if (submitted) return;
    try {
      const { error } = await supabase.from("leaderboard").insert({
        player_id: user.id,
        display_name: profile?.display_name ?? "Agent",
        role: me.role,
        final_score: me.score,
        max_level_reached: me.current_level,
        compliance_pct: me.compliance_meter,
        outcome,
        session_id: sessionId,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Score submitted to leaderboard!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 pt-10 pb-16">
        <h1 className="font-display text-3xl mb-1">Learning Recap</h1>
        <p className="text-muted-foreground mb-6">Outcome: <span className="font-medium text-foreground">{outcome === "completed" ? "✅ Completed" : outcome === "bankrupt" ? "💀 Bankrupt" : "⏰ Timeout"}</span></p>

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
              <button onClick={submit} disabled={submitted} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
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
      </main>
    </div>
  );
}
