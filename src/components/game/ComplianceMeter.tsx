import { cn } from "@/lib/utils";

export function ComplianceMeter({ value, size = "small" }: { value: number; size?: "small" | "large" }) {
  const color =
    value >= 70 ? "bg-accent" : value >= 40 ? "bg-[var(--warning)]" : "bg-destructive";
  const height = size === "large" ? "h-3" : "h-2";
  const pulse = value < 40 ? "animate-pulse-ring" : "";
  return (
    <div className="flex items-center gap-2 min-w-[120px]" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Compliance meter">
      <div className={cn("flex-1 rounded-full bg-surface-2 overflow-hidden", height)}>
        <div
          className={cn(height, "rounded-full transition-all duration-500", color, pulse)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("font-mono tabular-nums text-xs", value < 40 && "text-destructive")}>{value}%</span>
    </div>
  );
}
