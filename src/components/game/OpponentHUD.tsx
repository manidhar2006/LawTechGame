import { ComplianceMeter } from "@/components/game/ComplianceMeter";
import { RoleBadge } from "@/components/ui/Badges";
import type { SessionPlayerRow } from "@/hooks/useGameSession";

export function OpponentHUD({
  opponent,
  displayName,
}: {
  opponent: SessionPlayerRow;
  displayName: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/80 backdrop-blur p-3 min-w-[200px]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate max-w-[120px]">{displayName}</span>
          <RoleBadge role={opponent.role} />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span>Score</span>
        <span className="font-mono font-bold text-foreground">{opponent.score}</span>
      </div>
      <ComplianceMeter value={opponent.compliance_meter} />
      <div className="text-[10px] text-muted-foreground mt-1.5 font-mono">
        L{opponent.current_level} · S{opponent.current_scenario_index + 1} · {opponent.status}
      </div>
    </div>
  );
}
