import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { RoleBadge } from "@/components/ui/Badges";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

interface LB {
  id: string;
  role: "fiduciary" | "principal";
  final_score: number;
  max_level_reached: number;
  compliance_pct: number;
  outcome: string;
  submitted_at: string;
}

function ProfilePage() {
  const { user, profile } = useAuth();
  const [history, setHistory] = useState<LB[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("leaderboard")
      .select("*")
      .eq("player_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory((data as LB[]) ?? []));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="max-w-md mx-auto px-4 pt-20 text-center">
          <h1 className="font-display text-2xl mb-3">Sign in first</h1>
          <Link to="/auth" className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground inline-block">Continue</Link>
        </div>
      </div>
    );
  }

  const best = history.reduce((m, r) => Math.max(m, r.final_score), 0);
  const bestComp = history.reduce((m, r) => Math.max(m, r.compliance_pct), 0);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 pt-10 pb-16">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${profile?.avatar_seed ?? user.id}`}
            alt="avatar"
            className="w-16 h-16 rounded-full bg-surface-2 border border-border"
          />
          <div>
            <h1 className="font-display text-2xl">{profile?.display_name ?? "Agent"}</h1>
            <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Games" value={history.length.toString()} />
          <Stat label="Best Score" value={best.toString()} />
          <Stat label="Best Compliance" value={`${bestComp}%`} />
        </div>

        <h2 className="font-display text-xl mb-3">Recent Games</h2>
        {history.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-surface border border-border rounded-lg p-6 text-center">
            No submitted games yet. <Link to="/lobby" className="text-primary">Start playing →</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((r) => (
              <li key={r.id} className="flex items-center justify-between bg-surface border border-border rounded-lg p-3 text-sm">
                <div className="flex items-center gap-3">
                  <RoleBadge role={r.role} />
                  <span className="text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span>L{r.max_level_reached}</span>
                  <span>{r.compliance_pct}%</span>
                  <span className="font-mono font-bold text-base text-foreground">{r.final_score}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface border border-border p-4">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="font-mono font-bold text-2xl">{value}</div>
    </div>
  );
}
