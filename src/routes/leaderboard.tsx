import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { RoleBadge } from "@/components/ui/Badges";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});

interface Row {
  id: string;
  player_id: string | null;
  display_name: string;
  role: "fiduciary" | "principal";
  final_score: number;
  max_level_reached: number;
  compliance_pct: number;
  outcome: string;
  submitted_at: string;
}

function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "all">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "fiduciary" | "principal">("all");

  useEffect(() => {
    setLoading(true);
    let q = supabase.from("leaderboard").select("*").order("final_score", { ascending: false }).limit(100);
    if (timeRange === "week") {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      q = q.gte("submitted_at", since);
    }
    if (roleFilter !== "all") q = q.eq("role", roleFilter);
    q.then(({ data }) => {
      setRows((data as Row[]) ?? []);
      setLoading(false);
    });
  }, [timeRange, roleFilter]);

  const Pill = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "bg-surface-2 border border-border text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 pt-10 pb-16">
        <h1 className="font-display text-3xl mb-1">Global Leaderboard</h1>
        <p className="text-muted-foreground mb-5">Top 100 DataGuardian agents.</p>

        <div className="flex flex-wrap gap-3 items-center mb-5">
          <div className="flex gap-1.5">
            <Pill active={timeRange === "week"} onClick={() => setTimeRange("week")} label="This Week" />
            <Pill active={timeRange === "all"} onClick={() => setTimeRange("all")} label="All Time" />
          </div>
          <div className="flex gap-1.5 ml-auto">
            <Pill active={roleFilter === "all"} onClick={() => setRoleFilter("all")} label="All" />
            <Pill active={roleFilter === "fiduciary"} onClick={() => setRoleFilter("fiduciary")} label="Fiduciary" />
            <Pill active={roleFilter === "principal"} onClick={() => setRoleFilter("principal")} label="Principal" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No scores yet — be the first!</div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">#</th>
                  <th className="px-3 py-2.5 text-left">Player</th>
                  <th className="px-3 py-2.5 text-left">Role</th>
                  <th className="px-3 py-2.5 text-right hidden sm:table-cell">Level</th>
                  <th className="px-3 py-2.5 text-right">Score</th>
                  <th className="px-3 py-2.5 text-right hidden md:table-cell">Compliance</th>
                  <th className="px-3 py-2.5 text-right hidden md:table-cell">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isMe = user?.id === r.player_id;
                  const medal = i === 0 ? "bg-[var(--gold)]/10" : i === 1 ? "bg-foreground/5" : i === 2 ? "bg-[var(--warning)]/10" : "";
                  return (
                    <tr key={r.id} className={`border-t border-border ${medal} ${isMe ? "outline outline-2 -outline-offset-2 outline-primary/40" : ""}`}>
                      <td className="px-3 py-2.5 font-mono">{i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{r.display_name}</td>
                      <td className="px-3 py-2.5"><RoleBadge role={r.role} /></td>
                      <td className="px-3 py-2.5 text-right font-mono hidden sm:table-cell">L{r.max_level_reached}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums">{r.final_score}</td>
                      <td className="px-3 py-2.5 text-right font-mono hidden md:table-cell">{r.compliance_pct}%</td>
                      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground hidden md:table-cell">{r.outcome}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
