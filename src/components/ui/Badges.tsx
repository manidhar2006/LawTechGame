import { cn } from "@/lib/utils";
import type { Role } from "@/data/scenarios";

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const isFid = role === "fiduciary";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
        isFid
          ? "bg-[color-mix(in_oklab,var(--fiduciary)_15%,transparent)] text-[var(--fiduciary)] border-[color-mix(in_oklab,var(--fiduciary)_35%,transparent)]"
          : "bg-[color-mix(in_oklab,var(--principal)_15%,transparent)] text-[var(--principal)] border-[color-mix(in_oklab,var(--principal)_35%,transparent)]",
        className,
      )}
    >
      {isFid ? "🏦 Fiduciary" : "🧑 Principal"}
    </span>
  );
}

export function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-surface-2 border border-border text-foreground">
      L{level}
    </span>
  );
}
