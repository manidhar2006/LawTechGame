import { useState } from "react";
import type { Choice, Scenario, SimulationFormat } from "@/data/scenarios";
import { cn } from "@/lib/utils";
import { LevelBadge, RoleBadge } from "@/components/ui/Badges";
import type { AnswerResult } from "@/lib/gameEngine";

const SKIN_LABEL: Record<SimulationFormat, string> = {
  bank_desk: "Axiom Bank — Customer Service Terminal",
  email: "📧 Inbox — Compliance",
  chat: "💬 Chat",
  phone: "📱 Phone",
  alert: "🚨 INCIDENT ALERT",
  courtroom: "⚖️ Court of Record",
  call_centre: "📞 Call Centre — CRM",
  form_audit: "📋 Internal Compliance Audit",
};

const SKIN_CLASS: Record<SimulationFormat, string> = {
  bank_desk: "bg-surface border-border",
  email: "bg-surface border-border",
  chat: "bg-surface border-border",
  phone: "bg-surface border-border",
  alert: "bg-[color-mix(in_oklab,var(--destructive)_8%,var(--surface))] border-[color-mix(in_oklab,var(--destructive)_40%,transparent)]",
  courtroom: "bg-[color-mix(in_oklab,#a78a5a_8%,var(--surface))] border-[color-mix(in_oklab,#a78a5a_30%,transparent)]",
  call_centre: "bg-surface border-border",
  form_audit: "bg-surface border-border",
};

interface Props {
  scenario: Scenario;
  onAnswer: (choice: Choice) => AnswerResult;
  onNext: () => void;
  onAskDpo?: () => void;
  dpoTokens: number;
  showDpoBlocked?: boolean;
}

export function ScenarioCard({ scenario, onAnswer, onNext, onAskDpo, dpoTokens }: Props) {
  const [selected, setSelected] = useState<Choice | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);

  const handleChoice = (c: Choice) => {
    if (selected) return;
    setSelected(c);
    const r = onAnswer(c);
    setResult(r);
  };

  const handleNext = () => {
    setSelected(null);
    setResult(null);
    onNext();
  };

  const skinClass = SKIN_CLASS[scenario.simulationFormat];
  const skinLabel = SKIN_LABEL[scenario.simulationFormat];
  const isCourtroom = scenario.simulationFormat === "courtroom";
  const isAlert = scenario.simulationFormat === "alert";

  return (
    <article
      className={cn(
        "rounded-xl border p-5 md:p-7 animate-slide-up transition-shadow",
        skinClass,
      )}
    >
      {/* Skin header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-3 mb-4 font-mono">
        <span className={cn(isAlert && "text-destructive font-semibold")}>{skinLabel}</span>
        {scenario.isTimed && (
          <span className="px-2 py-0.5 rounded bg-[var(--warning)]/15 text-[var(--warning)] uppercase animate-pulse-ring">
            ⏱ Timed
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <LevelBadge level={scenario.level} />
        <RoleBadge role={scenario.role} />
        <span className="text-xs text-muted-foreground font-mono">
          Scenario {scenario.scenarioNumber.toString().padStart(2, "0")} of {scenario.totalInLevel}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{scenario.domain}</span>
      </div>

      <h2 className={cn("font-display text-2xl md:text-3xl mb-1", isCourtroom && "italic")}>
        {scenario.title}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        DPDP: {scenario.dpdpConcepts.join(" · ")}
      </p>

      {/* Situation */}
      <div className={cn("mb-5", isCourtroom && "font-serif")}>
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">Situation</h3>
        <p className="text-foreground/95 leading-relaxed">{scenario.situation}</p>
      </div>

      {/* Choices */}
      <div className="space-y-2.5">
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">What would you do?</h3>
        {(["A", "B", "C", "D"] as Choice[]).map((c) => {
          const text = scenario.choices[c];
          const isSelected = selected === c;
          const isCorrect = c === "A";
          let stateClass = "border-border bg-surface-2 hover:border-primary/50 hover:glow-primary";
          if (selected) {
            if (isSelected) {
              stateClass = isCorrect
                ? "border-accent bg-accent/10 text-accent-foreground glow-accent"
                : "border-destructive bg-destructive/10 glow-danger";
            } else if (isCorrect) {
              stateClass = "border-accent/50 bg-accent/5";
            } else {
              stateClass = "border-border bg-surface-2 opacity-60";
            }
          }
          return (
            <button
              key={c}
              disabled={!!selected}
              onClick={() => handleChoice(c)}
              aria-label={`Choice ${c}`}
              className={cn(
                "w-full text-left rounded-lg border p-3.5 transition-all flex gap-3 items-start min-h-[44px]",
                stateClass,
                !selected && "cursor-pointer",
              )}
            >
              <span className="font-mono font-bold text-sm w-6 shrink-0">{c}</span>
              <span className="text-sm leading-snug flex-1">{text}</span>
            </button>
          );
        })}
      </div>

      {/* Result panel */}
      {result && (
        <div
          className={cn(
            "mt-5 rounded-lg border p-4 animate-slide-up",
            result.isCorrect
              ? "border-accent/40 bg-accent/10"
              : result.outcome === "partial"
                ? "border-[var(--warning)]/40 bg-[var(--warning)]/10"
                : "border-destructive/40 bg-destructive/10",
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-lg">
              {result.isCorrect ? "✅ CORRECT" : result.outcome === "partial" ? "⚠️ PARTIAL" : "❌ WRONG"}
            </span>
            <span
              className={cn(
                "font-mono font-bold text-2xl tabular-nums",
                result.scoreDelta > 0 ? "text-accent" : "text-destructive",
              )}
            >
              {result.scoreDelta > 0 ? "+" : ""}
              {result.scoreDelta}
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{scenario.explanation}</p>
          <button
            onClick={handleNext}
            className="mt-4 w-full md:w-auto px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Next Scenario →
          </button>
        </div>
      )}

      {/* DPO Hint button */}
      {!selected && onAskDpo && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onAskDpo}
            disabled={dpoTokens <= 0}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border border-border bg-surface-2 hover:border-primary/40 transition-colors",
              dpoTokens <= 0 && "opacity-40 cursor-not-allowed",
            )}
            aria-label="Ask DPO for hint"
          >
            🔔 Ask DPO ({dpoTokens})
          </button>
        </div>
      )}
    </article>
  );
}
