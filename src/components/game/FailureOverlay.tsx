import { cn } from "@/lib/utils";

export function FailureOverlay({
  type,
  score,
  level,
  onContinue,
  onRecap,
}: {
  type: "audit" | "bankrupt" | "timeout";
  score: number;
  level?: number;
  onContinue?: () => void;
  onRecap?: () => void;
}) {
  const cfg = {
    audit: {
      bg: "bg-destructive/20",
      icon: "🚨",
      title: "COMPLIANCE AUDIT INITIATED",
      body: "Your compliance score dropped below 40%. A mandatory DPO review has been triggered. −200 points applied. Compliance restored to 50%.",
      cta: "Acknowledge & Continue",
      onCta: onContinue,
    },
    bankrupt: {
      bg: "bg-destructive/30",
      icon: "💀",
      title: "REGULATORY SHUTDOWN",
      body: "Branch revenue depleted. Non-compliant decisions cost you the business. Game over.",
      cta: "View Learning Recap",
      onCta: onRecap,
    },
    timeout: {
      bg: "bg-primary/20",
      icon: "⏰",
      title: "SHIFT ENDED",
      body: "Your shift ran out. Customers walked away unserved.",
      cta: "View Learning Recap",
      onCta: onRecap,
    },
  }[type];

  return (
    <div className={cn("fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in", cfg.bg)}>
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-7 text-center animate-slide-up">
        <div className="text-5xl mb-3">{cfg.icon}</div>
        <h2 className="font-display text-2xl mb-3 tracking-wide">{cfg.title}</h2>
        <p className="text-sm text-foreground/85 leading-relaxed mb-5">{cfg.body}</p>
        {(score !== undefined || level !== undefined) && (
          <div className="grid grid-cols-2 gap-3 mb-5 text-left">
            <div className="rounded-md bg-surface-2 border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
              <div className="font-mono font-bold text-xl">{score}</div>
            </div>
            {level !== undefined && (
              <div className="rounded-md bg-surface-2 border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Level</div>
                <div className="font-mono font-bold text-xl">L{level}</div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={cfg.onCta}
          className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
        >
          {cfg.cta}
        </button>
      </div>
    </div>
  );
}
