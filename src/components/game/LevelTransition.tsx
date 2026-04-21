export function LevelTransition({
  level,
  score,
  compliance,
  onContinue,
  isWaiting,
  isHost,
  opponentScore,
  opponentName,
}: {
  level: number;
  score: number;
  compliance: number;
  onContinue: () => void;
  isWaiting?: boolean;
  isHost?: boolean;
  opponentScore?: number;
  opponentName?: string;
}) {
  const next = level + 1;
  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-lg w-full bg-surface border border-border rounded-xl p-7 text-center animate-slide-up">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Level Complete</div>
        <h2 className="font-display text-4xl mb-4">Level {level}</h2>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-md bg-surface-2 border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
            <div className="font-mono font-bold text-2xl">{score}</div>
          </div>
          <div className="rounded-md bg-surface-2 border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Compliance</div>
            <div className="font-mono font-bold text-2xl">{compliance}%</div>
          </div>
        </div>
        {opponentName && opponentScore !== undefined && (
          <div className="mb-5 text-sm text-muted-foreground">
            Opponent <span className="text-foreground font-medium">{opponentName}</span> · score{" "}
            <span className="text-foreground font-mono">{opponentScore}</span>
          </div>
        )}
        {next <= 3 ? (
          isWaiting && !isHost ? (
            <div className="text-sm text-muted-foreground">Waiting for host to continue…</div>
          ) : (
            <button
              onClick={onContinue}
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium"
            >
              Continue to Level {next} →
            </button>
          )
        ) : (
          <button
            onClick={onContinue}
            className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold"
          >
            View Learning Recap →
          </button>
        )}
      </div>
    </div>
  );
}
