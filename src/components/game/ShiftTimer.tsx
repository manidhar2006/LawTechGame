import { useEffect } from "react";
import { formatTimer } from "@/lib/gameEngine";
import { cn } from "@/lib/utils";

export function ShiftTimer({
  seconds,
  running,
  onTick,
  onTimeout,
}: {
  seconds: number;
  running: boolean;
  onTick?: (newSeconds: number) => void;
  onTimeout?: () => void;
}) {
  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) {
      onTimeout?.();
      return;
    }
    const t = setInterval(() => {
      const next = seconds - 1;
      onTick?.(next);
      if (next <= 0) {
        onTimeout?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [running, seconds, onTick, onTimeout]);

  const mins = Math.floor(seconds / 60);
  const danger = mins < 30;
  const warn = mins < 60 && !danger;
  return (
    <div className="flex items-center gap-1.5 font-mono tabular-nums text-sm">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">SHIFT</span>
      <span className={cn("font-semibold", danger ? "text-destructive" : warn ? "text-[var(--warning)]" : "text-foreground")}>
        {formatTimer(seconds)}
      </span>
    </div>
  );
}
