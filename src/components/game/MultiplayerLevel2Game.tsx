import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGameSession } from "@/hooks/useGameSession";
import {
  LEVEL2_BANKING_INSURANCE_CARDS,
  type Level2Choice,
  type Level2Card,
} from "@/data/level2BankingInsurance";
import {
  LEVEL1_PRINCIPLE_CARDS,
  type Level1PrincipleCard,
} from "@/data/level1Principles";
import {
  getSectionDisplayName,
  getSectionExplanation,
  getPrincipleMetaFromSection,
  getSectionTag,
} from "@/data/principles";
import { LevelBadge, RoleBadge } from "@/components/ui/Badges";
import { VoiceRoomPanel } from "@/components/game/VoiceRoomPanel";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  sessionId: string;
}

type Level2SessionRow = Tables<"level2_sessions">;

const LEVEL2_QUESTIONS_PER_RULE = 7;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const SECTOR_COLOR: Record<string, string> = {
  Banking: "var(--fiduciary)",
  Insurance: "var(--principal)",
  "Cross-Sector": "var(--gold)",
};

function convertLevel1CardToLevel2Card(
  card: Level1PrincipleCard,
  sector: Level2Card["sector"],
  suffix: string,
): Level2Card {
  return {
    id: `L2-${card.id}-${suffix}`,
    title: card.title,
    section: card.section,
    sector,
    summary: card.summary,
    question: card.question,
    choices: card.choices,
    correctChoice: card.correctChoice,
    explanation: card.explanation,
  };
}

function buildLevel2CardsByRule(): Record<string, Level2Card[]> {
  const groupedLevel2 = LEVEL2_BANKING_INSURANCE_CARDS.reduce<Record<string, Level2Card[]>>((acc, card) => {
    if (!getPrincipleMetaFromSection(card.section)) return acc;
    if (!acc[card.section]) acc[card.section] = [];
    acc[card.section].push(card);
    return acc;
  }, {});

  const groupedLevel1 = LEVEL1_PRINCIPLE_CARDS.reduce<Record<string, Level1PrincipleCard[]>>((acc, card) => {
    if (!getPrincipleMetaFromSection(card.section)) return acc;
    if (!acc[card.section]) acc[card.section] = [];
    acc[card.section].push(card);
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(groupedLevel2)
      .map(([rule, cards]) => {
        const missingCount = Math.max(0, LEVEL2_QUESTIONS_PER_RULE - cards.length);
        const fallbackCards = (groupedLevel1[rule] ?? [])
          .filter((card) => !cards.some((existing) => existing.title === card.title || existing.question === card.question))
          .slice(0, missingCount)
          .map((card, index) => {
            const sector = cards[index % cards.length]?.sector ?? "Cross-Sector";
            return convertLevel1CardToLevel2Card(card, sector, `${rule}-${index}`);
          });

        return [rule, [...cards.slice(0, LEVEL2_QUESTIONS_PER_RULE), ...fallbackCards].slice(0, LEVEL2_QUESTIONS_PER_RULE)];
      })
      .sort(([ruleA], [ruleB]) => parseInt(ruleA.replace("Rule ", "")) - parseInt(ruleB.replace("Rule ", ""))),
  );
}

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
  const state = level2.state;
  const answeringSynced = useRef(false);

  const cardsByRule = useMemo(
    () => buildLevel2CardsByRule(),
    [],
  );
  const sortedRules = useMemo(
    () => Object.keys(cardsByRule).sort((a, b) => parseInt(a.replace("Rule ", "")) - parseInt(b.replace("Rule ", ""))),
    [cardsByRule],
  );
  const myRole = live.me?.role ?? "fiduciary";
  const mySelectedRule = state
    ? myRole === "fiduciary"
      ? state.fiduciary_selected_rule
      : state.principal_selected_rule
    : null;
  const opponentSelectedRule = state
    ? myRole === "fiduciary"
      ? state.principal_selected_rule
      : state.fiduciary_selected_rule
    : null;
  const opponentRuleCards = opponentSelectedRule ? cardsByRule[opponentSelectedRule] ?? [] : [];
  const currentCardIndex = state?.current_card_index ?? 0;
  const currentStep = opponentSelectedRule ? currentCardIndex + 1 : 0;
  const nextQuestionCard = opponentSelectedRule ? opponentRuleCards[currentCardIndex + 1] ?? null : null;
  const canAdvanceQuestion = state?.status === "answering" && !!state.fiduciary_choice && !!state.principal_choice;
  const myChoice = state
    ? myRole === "fiduciary"
      ? state.fiduciary_choice
      : state.principal_choice
    : null;
  const opponentChoice = state
    ? myRole === "fiduciary"
      ? state.principal_choice
      : state.fiduciary_choice
    : null;
  const questionCard = opponentSelectedRule ? opponentRuleCards[currentCardIndex] ?? null : null;
  const mySelectedTopicName = mySelectedRule ? getSectionDisplayName(mySelectedRule) : null;
  const mySelectedTopicExplanation = mySelectedRule ? getSectionExplanation(mySelectedRule) : null;

  useEffect(() => {
    if (!state) {
      answeringSynced.current = false;
      return;
    }

    const bothRulesChosen = !!state.fiduciary_selected_rule && !!state.principal_selected_rule;
    if (!bothRulesChosen) {
      answeringSynced.current = false;
      if (state.status !== "selecting") {
        void level2.updateState({ status: "selecting" }).catch(() => {
          // ignore transient sync errors
        });
      }
      return;
    }

    const fiduciaryCards = state.fiduciary_selected_rule ? cardsByRule[state.fiduciary_selected_rule] ?? [] : [];
    const principalCards = state.principal_selected_rule ? cardsByRule[state.principal_selected_rule] ?? [] : [];
    const hasCurrentQuestion = !!fiduciaryCards[currentCardIndex] && !!principalCards[currentCardIndex];

    if (!hasCurrentQuestion) {
      if (state.status !== "completed") {
        void level2.updateState({ status: "completed" }).catch(() => {
          // ignore transient sync errors
        });
      }
      answeringSynced.current = false;
      return;
    }

    if (state.status !== "answering" && !answeringSynced.current) {
      answeringSynced.current = true;
      void level2.updateState({ status: "answering" }).catch(() => {
        answeringSynced.current = false;
      });
    }
  }, [cardsByRule, currentCardIndex, level2, state, state?.fiduciary_selected_rule, state?.principal_selected_rule, state?.status]);

  // Bump current_level to 2 in session_players when this component mounts
  // so the leaderboard records Level 2 as max_level_reached.
  useEffect(() => {
    if (!live.me) return;
    if (live.me.current_level >= 2) return;
    void supabase
      .from("session_players")
      .update({ current_level: 2 })
      .eq("id", live.me.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.me?.id]); // run once when me is known

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

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Preparing Level-2 state…
      </div>
    );
  }

  const handleSelectRule = async (rule: string) => {
    if (!cardsByRule[rule]?.length) return;

    try {
      const patch: Partial<Level2SessionRow> =
        myRole === "fiduciary"
          ? {
              fiduciary_selected_rule: rule,
              fiduciary_card_id: null,
              fiduciary_choice: null,
              fiduciary_is_correct: null,
            }
          : {
              principal_selected_rule: rule,
              principal_card_id: null,
              principal_choice: null,
              principal_is_correct: null,
            };

      await level2.updateState({
        ...patch,
        current_card_index: 0,
        status: "selecting",
      });
      answeringSynced.current = false;
      toast.success(`${getSectionDisplayName(rule)} selected.`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not start rule");
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

  const handleNextQuestion = async () => {
    if (!canAdvanceQuestion || !state) return;

    const nextCardIndex = currentCardIndex + 1;
    const hasNextQuestion = !!nextQuestionCard;

    try {
      await level2.updateState({
        current_card_index: nextCardIndex,
        fiduciary_choice: null,
        principal_choice: null,
        fiduciary_is_correct: null,
        principal_is_correct: null,
        status: hasNextQuestion ? "answering" : "completed",
      });
      answeringSynced.current = false;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not advance to the next question");
    }
  };

  const finishLevel2 = async () => {
    // Mark both players as completed in session_players
    await supabase
      .from("session_players")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("session_id", sessionId);

    if (isHost) {
      await supabase
        .from("game_sessions")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    navigate({ to: "/results/$sessionId", params: { sessionId } });
  };

  const viewPhase = state.status;

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

            <h1 className="font-display text-2xl mb-1">Sector Rule Challenge</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Each player selects a DPDP rule independently. The questions appear one by one from the other player's selected rule.
            </p>

            {!mySelectedRule && (
              <div className="rounded-xl border border-border bg-surface p-4 mb-5 text-sm text-muted-foreground">
                Choose your principle first. Your opponent will answer the questions from the principle you select.
              </div>
            )}

            {mySelectedRule && state.status === "selecting" && (
              <div className="rounded-xl border border-border bg-surface p-4 mb-5 text-sm text-muted-foreground">
                Waiting for {opponentName} to select their principle. After that, questions from {getSectionDisplayName(mySelectedRule)} will appear one by one for the other player.
              </div>
            )}

            {!mySelectedRule && (
              <section className="mb-5">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h3 className="text-sm font-medium">Pick Your Principle</h3>
                  <span className="text-xs text-muted-foreground font-mono">{mySelectedTopicName ?? "Not selected"}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sortedRules.map((rule) => {
                    const ruleCardsCount = cardsByRule[rule]?.length ?? 0;
                    const ruleNum = parseInt(rule.replace("Rule ", ""));
                    const accent = ruleNum % 3 === 0
                      ? "var(--gold)"
                      : ruleNum % 3 === 1
                      ? "var(--fiduciary)"
                      : "var(--principal)";
                    const isSelected = mySelectedRule === rule;

                    return (
                      <button
                        key={rule}
                        onClick={() => void handleSelectRule(rule)}
                        disabled={!!mySelectedRule}
                        className={[
                          "rounded-lg border text-left p-3 bg-surface transition",
                          !mySelectedRule && "hover:border-primary/50",
                          isSelected && "border-accent bg-accent/10",
                          !isSelected && "border-border",
                          mySelectedRule && !isSelected && "opacity-70",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{
                              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                              color: accent,
                              border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
                            }}
                          >
                            {getSectionTag(rule)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{ruleCardsCount} cards</span>
                        </div>
                        <p className="font-medium text-sm leading-snug">
                          {isSelected ? "Your principle" : getSectionDisplayName(rule)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {getSectionExplanation(rule) ?? "The card you lock in this principle becomes the question for the other player."}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {mySelectedTopicExplanation && (
                  <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Selected Principle
                    </p>
                    <p className="font-medium text-sm mb-1">{mySelectedTopicName}</p>
                    <p className="text-xs text-muted-foreground">{mySelectedTopicExplanation}</p>
                  </div>
                )}
              </section>
            )}

            {questionCard && state.status === "answering" && (
              <article className="rounded-xl border border-border bg-surface p-5 mb-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2 flex-wrap">
                  <span className="font-semibold text-[11px] text-foreground/70">{opponentSelectedRule ?? "Selected rule"}</span>
                  <span>·</span>
                  <span>{currentStep} / {opponentRuleCards.length} questions</span>
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

                {canAdvanceQuestion && (
                  <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-md border border-border bg-surface-2/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      Both players answered. Click next to load {nextQuestionCard ? "the next question" : "the final result"}.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleNextQuestion()}
                      className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
                    >
                      {nextQuestionCard ? "Next Question →" : "Finish Level-2 →"}
                    </button>
                  </div>
                )}
              </article>
            )}

            {state.status === "completed" && (() => {
              const sorted = live.players.slice().sort((a, b) => b.score - a.score);
              const [first, second] = sorted;
              const isTie = first && second && first.score === second.score;
              const iWon = first?.player_id === user.id && !isTie;
              return (
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-5 mb-5">
                  <h2 className="font-display text-xl mb-3">🏆 Rule Completed!</h2>

                  {(mySelectedRule || opponentSelectedRule) && (
                    <div className="rounded-lg border border-border bg-surface-2 p-3 mb-4">
                      <div className="text-xs text-muted-foreground mb-1">Completed rules</div>
                      <div className="font-medium">You: {mySelectedRule ?? "—"}</div>
                      <div className="font-medium">Opponent: {opponentSelectedRule ?? "—"}</div>
                    </div>
                  )}

                  {isTie ? (
                    <div className="rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-3 mb-4 text-center">
                      <span className="text-lg">⚖️</span>
                      <p className="font-display text-base font-semibold text-[var(--gold)]">It's a Tie!</p>
                      <p className="text-xs text-muted-foreground">Both players scored <span className="font-mono font-bold">{first?.score}</span> pts</p>
                    </div>
                  ) : (
                    <div className={`rounded-lg border p-3 mb-4 text-center ${iWon ? "border-[var(--gold)]/40 bg-[var(--gold)]/5" : "border-border bg-surface-2"}`}>
                      <span className="text-lg">{iWon ? "👑" : "🥈"}</span>
                      <p className={`font-display text-base font-semibold ${iWon ? "text-[var(--gold)]" : "text-muted-foreground"}`}>
                        {iWon ? "You Won!" : `${live.profiles[first?.player_id ?? ""]?.display_name ?? "Opponent"} Won`}
                      </p>
                      <div className="flex justify-center gap-6 mt-2 text-sm">
                        {sorted.map((p, i) => (
                          <div key={p.id} className="text-center">
                            <div className="text-[10px] text-muted-foreground mb-0.5">{p.player_id === user.id ? "You" : (live.profiles[p.player_id]?.display_name ?? "Opponent")}</div>
                            <div className={`font-mono font-bold text-lg ${i === 0 ? "text-[var(--gold)]" : ""}`}>{p.score}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm mb-4 flex-wrap">
                    <span>
                      Rule round finished for <strong>{mySelectedRule ?? "this rule"}</strong>
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
              );
            })()}

            <section>
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <h3 className="text-sm font-medium">Rule State</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {mySelectedTopicName ? `You: ${mySelectedTopicName}` : "Pick your principle"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Your principle</div>
                  <div className="font-medium">{mySelectedTopicName ?? "Not selected"}</div>
                </div>
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Opponent principle</div>
                  <div className="font-medium">
                    {opponentSelectedRule ? getSectionDisplayName(opponentSelectedRule) : "Not selected"}
                  </div>
                </div>
              </div>
            </section>
          </section>

          <aside className="space-y-4">
            <VoiceRoomPanel
              sessionId={sessionId}
              currentUserId={user.id}
              peerUserId={opponent?.player_id ?? null}
              isInitiator={myRole === "fiduciary"}
            />

            {/* Live Scoreboard */}
            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="font-display text-lg mb-3">🏆 Live Scoreboard</h3>
              <div className="space-y-3">
                {live.players
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((player, i) => {
                    const isMe = player.player_id === user.id;
                    const playerName = isMe
                      ? myName
                      : live.profiles[player.player_id]?.display_name ?? "Opponent";
                    const isLeading = i === 0 && live.players.length > 1 && live.players[0]?.score !== live.players[1]?.score;
                    return (
                      <div
                        key={player.id}
                        className={[
                          "flex items-center justify-between gap-3 rounded-lg border p-3 transition-all",
                          isMe ? "border-primary/40 bg-primary/5" : "border-border bg-surface-2",
                          isLeading ? "outline outline-1 outline-[var(--gold)]/40" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{i === 0 ? "👑" : "🥈"}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {playerName} {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Compliance: {player.compliance_meter}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-xl tabular-nums">{player.score}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">pts</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {/* Tie / Leading indicator */}
              {live.players.length === 2 && (() => {
                const [p1, p2] = live.players;
                if (!p1 || !p2) return null;
                const diff = Math.abs(p1.score - p2.score);
                if (diff === 0) {
                  return <p className="text-xs text-center text-muted-foreground mt-2">⚖️ It's a tie!</p>;
                }
                const leader = p1.score > p2.score ? p1 : p2;
                const leaderName = leader.player_id === user.id
                  ? myName
                  : live.profiles[leader.player_id]?.display_name ?? "Opponent";
                return (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    <span className="text-[var(--gold)] font-medium">{leaderName}</span> leads by <span className="font-mono">{diff}</span> pts
                  </p>
                );
              })()}
            </section>

            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="font-display text-lg mb-3">Rule State</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span>Your principle</span>
                  <span className="font-mono text-xs">{mySelectedTopicName ?? "—"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Opponent principle</span>
                  <span className="font-mono text-xs">{opponentSelectedRule ? getSectionDisplayName(opponentSelectedRule) : "—"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Progress</span>
                  <span className="font-mono text-xs">
                    {mySelectedRule && opponentSelectedRule ? `${currentStep} question${currentStep === 1 ? "" : "s"}` : "waiting"}
                  </span>
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
              <h3 className="font-display text-lg mb-2">How Level-2 Works</h3>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Each player selects a DPDP rule independently.</li>
                <li>Then the cards from the other player's rule appear one by one.</li>
                <li>You answer the questions from the opponent's selected rule.</li>
                <li>+120 for correct, −60 for incorrect answers.</li>
                <li>When the rule queues end, the Level-2 round ends.</li>
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
                  Cards grouped by DPDP Principle 1–9
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}


