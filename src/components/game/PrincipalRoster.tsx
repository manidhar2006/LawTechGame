import type { SessionPlayerRow } from "@/hooks/useGameSession";
import type { LiveAnswerRow } from "@/hooks/useLiveSession";
import { cn } from "@/lib/utils";

interface Props {
  principals: SessionPlayerRow[];
  profiles: Record<string, { id: string; display_name: string }>;
  currentRoundAnswers: LiveAnswerRow[];
  showChoices?: boolean; // host can see, principals cannot
}

/**
 * Live roster of all connected Principals showing who has answered the
 * current round and (optionally, for the host) what they picked.
 */
export function PrincipalRoster({ principals, profiles, currentRoundAnswers, showChoices = false }: Props) {
  const answersByPlayer = new Map(currentRoundAnswers.map((a) => [a.player_id, a]));

  if (principals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-2/40 p-4 text-sm text-muted-foreground">
        No Principals connected yet. Share the room code so they can join.
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {principals.map((p) => {
        const ans = answersByPlayer.get(p.player_id);
        const name = profiles[p.player_id]?.display_name ?? "Principal";
        return (
          <li
            key={p.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm",
              ans
                ? ans.is_correct
                  ? "border-accent/40 bg-accent/5"
                  : "border-destructive/40 bg-destructive/5"
                : "border-border bg-surface-2",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  ans ? (ans.is_correct ? "bg-accent" : "bg-destructive") : "bg-muted-foreground/40 animate-pulse",
                )}
              />
              <span className="truncate font-medium">{name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
              {ans ? (
                <>
                  {showChoices && (
                    <span className="px-1.5 py-0.5 rounded bg-surface border border-border">
                      {ans.choice}
                    </span>
                  )}
                  <span className={cn(ans.score_delta >= 0 ? "text-accent" : "text-destructive")}>
                    {ans.score_delta > 0 ? "+" : ""}
                    {ans.score_delta}
                  </span>
                  <span className="font-mono tabular-nums">{p.score}</span>
                </>
              ) : (
                <span className="text-muted-foreground">thinking…</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
