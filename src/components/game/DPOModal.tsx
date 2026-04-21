export function DPOModal({
  hint,
  tokensRemaining,
  onClose,
}: {
  hint: string;
  tokensRemaining: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 animate-slide-up">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl">
            🔔
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg">Data Protection Officer</h3>
            <p className="text-xs text-muted-foreground">{tokensRemaining} token(s) remaining</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90 mb-5">{hint}</p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
