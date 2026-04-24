import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGameSession } from "@/hooks/useGameSession";
import {
  getLevel2CardById,
  LEVEL2_BANKING_INSURANCE_CARDS,
  type Level2Choice,
  type Level2Card,
} from "@/data/level2BankingInsurance";
import { LevelBadge, RoleBadge } from "@/components/ui/Badges";
import { VoiceRoomPanel } from "@/components/game/VoiceRoomPanel";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  sessionId: string;
}

type Level2SessionRow = Tables<"level2_sessions">;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const SECTOR_COLOR: Record<string, string> = {
  Banking: "var(--fiduciary)",
  Insurance: "var(--principal)",
  "Cross-Sector": "var(--gold)",
};

function useLevel2Session(sessionId: string | undefined, currentUserId: string | undefined) {
  const [state, setState] = useState<Level2SessionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    if (!sessionId) return;

    const { data } = await supabase
      .from("level2_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (data) {
      setState(data);
      return;
    }

    if (!currentUserId) return;

    const { data: created } = await supabase
      .from("level2_sessions")
      .upsert({ session_id: sessionId }, { onConflict: "session_id" })
      .select("*")
      .maybeSingle();

    if (created) {
      setState(created);
    }
  }, [currentUserId, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);

    void fetchState().finally(() => setLoading(false));

    const channel = supabase
      .channel(`level2:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "level2_sessions",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void fetchState();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchState, sessionId]);

  const updateState = useCallback(
    async (patch: Partial<Level2SessionRow>) => {
      if (!sessionId) return;
      const { error } = await supabase
        .from("level2_sessions")
        .update(patch)
        .eq("session_id", sessionId);
      if (error) throw error;
    },
    [sessionId],
  );

  return { state, loading, updateState };
}

export function MultiplayerLevel2Game({ sessionId }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const live = useGameSession(sessionId, user?.id);
  const level2 = useLevel2Session(sessionId, user?.id);
  const completionSynced = useRef(false);
  const answeringSynced = useRef(false);

  if (live.loading || level2.loading || !live.session || !live.me || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Connecting to Level-2…
      </div>
    );
  }

  const fiduciary = live.players.find((p) => p.role === "fiduciary") ?? null;
  const principals = live.players.filter((p) => p.role === "principal");
  const opponent = live.players.find((p) => p.player_id !== live.me!.player_id) ?? null;
  const opponentName = opponent ? live.profiles[opponent.player_id]?.display_name ?? "Opponent" : "Opponent";
  const myName = profile?.display_name ?? "Agent";
  const isHost = live.session.host_id === user.id;

  if (!fiduciary || principals.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Waiting for both players…
      </div>
    );
  }

  if (!level2.state) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Preparing Level-2 state…
      </div>
    );
  }

  const state = level2.state;
  const myRole = live.me.role;
  const myCardId = myRole === "fiduciary" ? state.fiduciary_card_id : state.principal_card_id;
  const opponentCardId = myRole === "fiduciary" ? state.principal_card_id : state.fiduciary_card_id;
  const myChoice = myRole === "fiduciary" ? state.fiduciary_choice : state.principal_choice;
  const opponentChoice = myRole === "fiduciary" ? state.principal_choice : state.fiduciary_choice;

  const mySelectedCard = getLevel2CardById(myCardId);
  const opponentSelectedCard = getLevel2CardById(opponentCardId);
  const questionCard = getLevel2CardById(opponentCardId);

  const handlePickCard = async (cardId: string) => {
    if (state.status !== "selecting") return;
    if (myCardId) return;

    const patch: Partial<Level2SessionRow> =
      myRole === "fiduciary" ? { fiduciary_card_id: cardId } : { principal_card_id: cardId };

    const fidCard = myRole === "fiduciary" ? cardId : state.fiduciary_card_id;
    const priCard = myRole === "principal" ? cardId : state.principal_card_id;
    if (fidCard && priCard) patch.status = "answering";

    try {
      await level2.updateState(patch);
      toast.success("Card locked.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not lock card");
    }
  };

  const handleAnswer = async (choice: Level2Choice) => {
    if (state.status !== "answering") return;
    if (myChoice || !questionCard) return;

    const isCorrect = choice === questionCard.correctChoice;
    const scoreDelta = isCorrect ? 120 : -60; // Slightly higher stakes for Level-2
    const complianceDelta = isCorrect ? 6 : -6;
    const newScore = live.me!.score + scoreDelta;
    const newCompliance = clamp(live.me!.compliance_meter + complianceDelta, 0, 100);

    const choicePatch: Partial<Level2SessionRow> =
      myRole === "fiduciary"
        ? { fiduciary_choice: choice, fiduciary_is_correct: isCorrect }
        : { principal_choice: choice, principal_is_correct: isCorrect };

    if (opponentChoice) {
      choicePatch.status = "completed";
    }

    try {
      await Promise.all([
        supabase
          .from("session_players")
          .update({ score: newScore, compliance_meter: newCompliance })
          .eq("id", live.me!.id),
        supabase.from("scenario_answers").insert({
          session_player_id: live.me!.id,
          scenario_id: questionCard.id,
          level: 2,
          role: myRole,
          choice,
          is_correct: isCorrect,
          score_delta: scoreDelta,
          dpdp_concept: `L2:${questionCard.sector} — ${questionCard.title}`,
        }),
        level2.updateState(choicePatch),
      ]);
      toast.success(isCorrect ? "✅ Correct answer!" : "Answer recorded");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save answer");
    }
  };

  // Sync status to "completed" when both have answered
  useEffect(() => {
    if (state.status === "completed") {
      completionSynced.current = false;
      return;
    }
    if (!state.fiduciary_choice || !state.principal_choice) return;
    if (completionSynced.current) return;
    completionSynced.current = true;
    void level2.updateState({ status: "completed" }).catch(() => {
      completionSynced.current = false;
    });
  }, [level2, state.fiduciary_choice, state.principal_choice, state.status]);

  // Sync status to "answering" when both picked cards
  useEffect(() => {
    if (state.status !== "selecting") {
      answeringSynced.current = false;
      return;
    }
    if (!state.fiduciary_card_id || !state.principal_card_id) return;
    if (answeringSynced.current) return;
    answeringSynced.current = true;
    void level2.updateState({ status: "answering" }).catch(() => {
      answeringSynced.current = false;
    });
  }, [level2, state.fiduciary_card_id, state.principal_card_id, state.status]);

  const finishLevel2 = async () => {
    if (isHost) {
      await supabase
        .from("game_sessions")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    navigate({ to: "/results/$sessionId", params: { sessionId } });
  };

  const viewPhase = state.status;

  // Group cards by DPDP Rule (section) — mirrors Level-1's principle structure
  const cardsByRule = LEVEL2_BANKING_INSURANCE_CARDS.reduce<Record<string, typeof LEVEL2_BANKING_INSURANCE_CARDS>>(
    (acc, card) => {
      if (!acc[card.section]) acc[card.section] = [];
      acc[card.section].push(card);
      return acc;
    },
    {},
  );
  // Sort rules numerically: "Rule 1" < "Rule 2" … < "Rule 23"
  const sortedRules = Object.keys(cardsByRule).sort(
    (a, b) => parseInt(a.replace("Rule ", "")) - parseInt(b.replace("Rule ", "")),
  );

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-border bg-background/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[160px]">{myName}</span>
            <RoleBadge role={myRole} />
            {isHost && (
              <span className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Host</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>Room {live.session.room_code}</span>
            <span>·</span>
            <LevelBadge level={2} />
            <span>·</span>
            <span>Banking &amp; Insurance</span>
            <span>·</span>
            <span className="capitalize">{viewPhase}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
            <div className="font-mono font-bold text-lg tabular-nums">{live.me.score}</div>
          </div>
        </div>
        {/* Compliance bar */}
        <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">Compliance</span>
            <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${live.me.compliance_meter}%`,
                  background: live.me.compliance_meter > 60
                    ? "var(--accent)"
                    : live.me.compliance_meter > 30
                    ? "#f59e0b"
                    : "var(--destructive)",
                }}
              />
            </div>
            <span className="font-mono shrink-0">{live.me.compliance_meter}%</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 pt-6">
        <div className="grid xl:grid-cols-[1fr_340px] gap-6">
          <section>
            {/* Level Banner */}
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 rounded-full text-sm font-semibold bg-[var(--fiduciary)]/15 text-[var(--fiduciary)] border border-[var(--fiduciary)]/30">
                🏦 Level-2: Banking &amp; Insurance Sector
              </div>
            </div>

            <h1 className="font-display text-2xl mb-1">Sector Compliance Duel</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Both players pick one sector card from Banking, Insurance, or Cross-Sector.
              You answer the MCQ from your opponent's selected card. +120 for correct, −60 for incorrect.
            </p>

            {state.status === "selecting" && (
              <div className="rounded-xl border border-border bg-surface p-4 mb-5 text-sm text-muted-foreground">
                {myCardId
                  ? "✅ Card locked. Waiting for your opponent to pick their card."
                  : `Pick one of the ${LEVEL2_BANKING_INSURANCE_CARDS.length} sector cards below.`}
              </div>
            )}

            {/* Question Phase */}
            {state.status !== "selecting" && questionCard && (
              <article className="rounded-xl border border-border bg-surface p-5 mb-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2">
                  <span className="font-semibold text-[11px] text-foreground/70">
                    {questionCard.section}
                  </span>
                  <span>·</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{
                      background: `color-mix(in srgb, ${SECTOR_COLOR[questionCard.sector] ?? "var(--primary)"} 15%, transparent)`,
                      color: SECTOR_COLOR[questionCard.sector] ?? "var(--primary)",
                      border: `1px solid color-mix(in srgb, ${SECTOR_COLOR[questionCard.sector] ?? "var(--primary)"} 30%, transparent)`,
                    }}
                  >
                    {questionCard.sector}
                  </span>
                  <span>·</span>
                  <span>Selected by {opponentName}</span>
                </div>
                <h2 className="font-display text-xl mb-1">{questionCard.title}</h2>
                <p className="text-sm text-muted-foreground mb-3">{questionCard.summary}</p>
                <p className="text-foreground/95 mb-4">{questionCard.question}</p>

                <div className="space-y-2">
                  {(["A", "B", "C", "D"] as const).map((choice) => {
                    const locked = !!myChoice;
                    const isMine = myChoice === choice;
                    const isCorrect = questionCard.correctChoice === choice;
                    return (
                      <button
                        key={choice}
                        disabled={locked}
                        onClick={() => void handleAnswer(choice)}
                        className={[
                          "w-full text-left rounded-md border p-3 text-sm transition",
                          !locked && "hover:border-primary/40",
                          locked && isMine && isCorrect && "border-accent bg-accent/10",
                          locked && isMine && !isCorrect && "border-destructive bg-destructive/10",
                          locked && !isMine && isCorrect && "border-accent/40 bg-accent/5",
                          !locked && "border-border bg-surface-2",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="font-mono font-semibold mr-2">{choice}.</span>
                        {questionCard.choices[choice]}
                      </button>
                    );
                  })}
                </div>

                {myChoice && (
                  <div className="mt-4 rounded-md border border-border bg-surface-2/60 p-3 text-sm">
                    <p className="font-medium mb-1">
                      Your answer: {myChoice} — {myChoice === questionCard.correctChoice ? "✅ Correct!" : "❌ Incorrect"}
                    </p>
                    <p className="text-muted-foreground">{questionCard.explanation}</p>
                  </div>
                )}
              </article>
            )}

            {/* Completion Phase */}
            {state.status === "completed" && (
              <div className="rounded-xl border border-accent/40 bg-accent/5 p-5 mb-5">
                <h2 className="font-display text-xl mb-2">🏆 Level-2 Completed!</h2>
                <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="rounded-md border border-border bg-surface p-3">
                    <div className="text-xs text-muted-foreground mb-1">Your card</div>
                    <div className="font-medium">{mySelectedCard?.title ?? "—"}</div>
                    <div className="text-xs text-muted-foreground mt-1">{mySelectedCard?.sector}</div>
                  </div>
                  <div className="rounded-md border border-border bg-surface p-3">
                    <div className="text-xs text-muted-foreground mb-1">{opponentName}'s card</div>
                    <div className="font-medium">{opponentSelectedCard?.title ?? "—"}</div>
                    <div className="text-xs text-muted-foreground mt-1">{opponentSelectedCard?.sector}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm mb-4">
                  <span>
                    Your answer: <strong>{myChoice ?? "—"}</strong>
                    {myRole === "fiduciary" ? (state.fiduciary_is_correct ? " ✅" : " ❌") : (state.principal_is_correct ? " ✅" : " ❌")}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span>Final Score: <strong className="font-mono">{live.me.score}</strong></span>
                </div>
                <button
                  onClick={() => void finishLevel2()}
                  className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium"
                >
                  View Full Learning Recap →
                </button>
              </div>
            )}

            {/* Card Grid — Grouped by DPDP Rule (mirrors Level-1 section structure) */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Banking &amp; Insurance Cards by DPDP Rule ({LEVEL2_BANKING_INSURANCE_CARDS.length} cards across {sortedRules.length} rules)
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {myCardId ? `Locked: ${myCardId}` : "Not locked"}
                </span>
              </div>

              {sortedRules.map((rule) => {
                const ruleCards = cardsByRule[rule];
                const ruleNum = parseInt(rule.replace("Rule ", ""));
                // Alternate color accent per rule group for visual separation
                const accent = ruleNum % 3 === 0
                  ? "var(--gold)"
                  : ruleNum % 3 === 1
                  ? "var(--fiduciary)"
                  : "var(--principal)";

                return (
                  <div key={rule} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{
                          background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                          color: accent,
                          border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
                        }}
                      >
                        {rule}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ruleCards.length} card{ruleCards.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ruleCards.map((card) =>
                        renderCard(card, myCardId, opponentCardId, state, handlePickCard)
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          </section>

          <aside className="space-y-4">
            <VoiceRoomPanel
              sessionId={sessionId}
              currentUserId={user.id}
              peerUserId={opponent?.player_id ?? null}
              isInitiator={myRole === "fiduciary"}
            />

            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="font-display text-lg mb-3">Round State</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span>{myName} card</span>
                  <span className="font-mono text-xs">{mySelectedCard?.id ?? "—"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>{opponentName} card</span>
                  <span className="font-mono text-xs">{opponentSelectedCard?.id ?? "—"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>{myName} answer</span>
                  <span className="font-mono text-xs">{myChoice ?? "waiting"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>{opponentName} answer</span>
                  <span className="font-mono text-xs">{opponentChoice ?? "waiting"}</span>
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="font-display text-lg mb-2">Level-2 Rules</h3>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Both players pick one Banking, Insurance, or Cross-Sector card.</li>
                <li>You answer the MCQ from the card your opponent selected.</li>
                <li>+120 for correct, −60 for incorrect answers.</li>
                <li>Questions are based on real DPDP Rules applied to Finance sector scenarios.</li>
              </ol>
            </section>

            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="font-display text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                Sector Legend
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--fiduciary)]" />
                  <span>Banking — KYC, Loans, Payments, SDF</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--principal)]" />
                  <span>Insurance — Claims, Health Data, IRDAI</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--gold)]" />
                  <span>Cross-Sector — Bancassurance, TDSAT</span>
                </div>
                <div className="mt-2 pt-2 border-t border-border text-muted-foreground">
                  Cards grouped by DPDP Rule 1–23
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── Helper: render a single card tile ────────────────────────────────────────
function renderCard(
  card: Level2Card,
  myCardId: string | null | undefined,
  opponentCardId: string | null | undefined,
  state: { status: string },
  handlePickCard: (id: string) => Promise<void>,
) {
  const selectedByMe = myCardId === card.id;
  const selectedByOther = opponentCardId === card.id;
  const isDisabled = state.status !== "selecting" || !!myCardId;
  const sectorColor = SECTOR_COLOR[card.sector] ?? "var(--primary)";

  return (
    <button
      key={card.id}
      disabled={isDisabled}
      onClick={() => void handlePickCard(card.id)}
      className={[
        "rounded-lg border text-left p-3 bg-surface transition",
        !isDisabled && "hover:border-primary/50",
        selectedByMe && "border-accent bg-accent/10",
        selectedByOther && "border-[var(--principal)]/45",
        !selectedByMe && !selectedByOther && "border-border",
        isDisabled && !selectedByMe && "opacity-80",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-mono text-xs text-muted-foreground">{card.id}</span>
        {/* Sector badge */}
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
          style={{
            background: `color-mix(in srgb, ${sectorColor} 12%, transparent)`,
            color: sectorColor,
            border: `1px solid color-mix(in srgb, ${sectorColor} 25%, transparent)`,
          }}
        >
          {card.sector}
        </span>
      </div>
      {/* Section (Rule) */}
      <div className="text-[10px] text-muted-foreground/70 font-mono mb-0.5">{card.section}</div>
      <p className="font-medium text-sm leading-snug">{card.title}</p>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.summary}</p>
      {selectedByMe && <p className="text-[11px] text-accent mt-2">✓ Selected by you</p>}
      {selectedByOther && (
        <p className="text-[11px] text-[var(--principal)] mt-2">Selected by opponent</p>
      )}
    </button>
  );
}

