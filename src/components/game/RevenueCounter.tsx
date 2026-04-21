import { formatRevenue } from "@/lib/gameEngine";
import { cn } from "@/lib/utils";

export function RevenueCounter({ value }: { value: number }) {
  const danger = value < 10000;
  return (
    <div className="flex items-center gap-1.5 font-mono tabular-nums text-sm">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">REV</span>
      <span className={cn("font-semibold", danger ? "text-destructive" : "text-accent")}>
        {formatRevenue(value)}
      </span>
    </div>
  );
}
