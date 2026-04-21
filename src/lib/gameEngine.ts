import type { Choice, Role, Scenario } from "@/data/scenarios";

export interface PlayerState {
  score: number;
  compliance_meter: number;
  revenue: number;
  shift_timer: number;
  role: Role;
}

export interface AnswerResult {
  newScore: number;
  newCompliance: number;
  newRevenue: number;
  scoreDelta: number;
  complianceDelta: number;
  revenueDelta: number;
  isCorrect: boolean;
  isDpoAudit: boolean;
  isBankrupt: boolean;
  outcome: "correct" | "partial" | "wrong" | "violation";
}

export const REVENUE_DELTA_DEFAULT = { A: -2000, B: -1000, C: 5000, D: 10000 } as const;

export function applyAnswer(
  player: PlayerState,
  choice: Choice,
  scenario: Scenario,
): AnswerResult {
  const scoreDelta = scenario.choiceScores[choice];
  const complianceDelta = scenario.choiceComplianceDelta[choice];
  const revenueDelta =
    player.role === "fiduciary"
      ? scenario.choiceRevenueDelta?.[choice] ?? REVENUE_DELTA_DEFAULT[choice]
      : 0;

  const newScore = player.score + scoreDelta;
  const newCompliance = Math.max(0, Math.min(100, player.compliance_meter + complianceDelta));
  const newRevenue =
    player.role === "fiduciary" ? Math.max(0, player.revenue + revenueDelta) : player.revenue;

  const isDpoAudit = newCompliance < 40 && player.compliance_meter >= 40;
  const isBankrupt = newRevenue <= 0 && player.role === "fiduciary";

  const outcome: AnswerResult["outcome"] =
    choice === "A" ? "correct" : choice === "B" ? "partial" : choice === "C" ? "wrong" : "violation";

  return {
    newScore,
    newCompliance,
    newRevenue,
    scoreDelta,
    complianceDelta,
    revenueDelta,
    isCorrect: choice === "A",
    isDpoAudit,
    isBankrupt,
    outcome,
  };
}

export function applyDpoAuditPenalty(player: PlayerState) {
  return {
    score: player.score - 200,
    compliance_meter: 50,
  };
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[bytes[i] % chars.length];
  return s;
}

export function formatRevenue(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
