import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGameSession } from "@/hooks/useGameSession";
import {
  getLevel1CardById,
  LEVEL1_PRINCIPLE_CARDS,
  type Level1Choice,
} from "@/data/level1Principles";
import { LevelBadge, RoleBadge } from "@/components/ui/Badges";
import { VoiceRoomPanel } from "@/components/game/VoiceRoomPanel";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  sessionId: string;
}

type Level1SessionRow = Tables<"level1_sessions">;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function useLevel1Session(sessionId: string | undefined, currentUserId: string | undefined) {
  const [state, setState] = useState<Level1SessionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    if (!sessionId) return;

    const { data } = await supabase
      .from("level1_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (data) {
      setState(data);
      return;
    }

    if (!currentUserId) return;

    const { data: created } = await supabase
      .from("level1_sessions")
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
      .channel(`level1:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "level1_sessions",
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
    async (patch: Partial<Level1SessionRow>) => {
      if (!sessionId) return;
      const { error } = await supabase
        .from("level1_sessions")
        .update(patch)
        .eq("session_id", sessionId);
      if (error) throw error;
    },
    [sessionId],
  );

  return { state, loading, updateState };
}

export function MultiplayerLiveGame({ sessionId }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const live = useGameSession(sessionId, user?.id);
  const level1 = useLevel1Session(sessionId, user?.id);
  const completionSynced = useRef(false);
  const answeringSynced = useRef(false);

  if (live.loading || level1.loading || !live.session || !live.me || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Connecting to live session…
      </div>
    );
  }

  const fiduciary = live.players.find((player) => player.role === "fiduciary") ?? null;
  const principals = live.players.filter((player) => player.role === "principal");
  const opponent = live.players.find((player) => player.player_id !== live.me!.player_id) ?? null;
  const opponentName = opponent ? live.profiles[opponent.player_id]?.display_name ?? "Opponent" : "Opponent";
  const myName = profile?.display_name ?? "Agent";
  const isHost = live.session.host_id === user.id;

  if (!fiduciary) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Waiting for a fiduciary to join.
      </div>
    );
  }

  if (principals.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Waiting for a principal to join.
      </div>
    );
  }

  if (principals.length > 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-lg rounded-xl border border-border bg-surface p-6 text-center">
          <h2 className="font-display text-2xl mb-2">Level-1 is strict 1v1</h2>
          <p className="text-sm text-muted-foreground">
            This session has more than one principal connected. Please return to lobby and start a new room with only one principal for Level-1.
          </p>
        </div>
      </div>
    );
  }

  if (!level1.state) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Preparing Level-1 state…
      </div>
    );
  }

  const state = level1.state;
  const myRole = live.me.role;
  const myCardId = myRole === "fiduciary" ? state.fiduciary_card_id : state.principal_card_id;
  const opponentCardId = myRole === "fiduciary" ? state.principal_card_id : state.fiduciary_card_id;
  const myChoice = myRole === "fiduciary" ? state.fiduciary_choice : state.principal_choice;
  const opponentChoice = myRole === "fiduciary" ? state.principal_choice : state.fiduciary_choice;

  const mySelectedCard = getLevel1CardById(myCardId);
  const opponentSelectedCard = getLevel1CardById(opponentCardId);
  const questionCard = getLevel1CardById(opponentCardId);

  const handlePickCard = async (cardId: string) => {
    if (state.status !== "selecting") return;
    if (myCardId) return;

    const patch: Partial<Level1SessionRow> =
      myRole === "fiduciary" ? { fiduciary_card_id: cardId } : { principal_card_id: cardId };

    const fidCard = myRole === "fiduciary" ? cardId : state.fiduciary_card_id;
    const priCard = myRole === "principal" ? cardId : state.principal_card_id;
    if (fidCard && priCard) patch.status = "answering";

    try {
      await level1.updateState(patch);
      toast.success("Card locked.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not lock card");
    }
  };

  const handleAnswer = async (choice: Level1Choice) => {
    if (state.status !== "answering") return;
    if (myChoice || !questionCard) return;

    const isCorrect = choice === questionCard.correctChoice;
    const scoreDelta = isCorrect ? 100 : -50;
    const complianceDelta = isCorrect ? 5 : -5;
    const newScore = live.me!.score + scoreDelta;
    const newCompliance = clamp(live.me!.compliance_meter + complianceDelta, 0, 100);

    const choicePatch: Partial<Level1SessionRow> =
      myRole === "fiduciary"
        ? {
            fiduciary_choice: choice,
            fiduciary_is_correct: isCorrect,
          }
        : {
            principal_choice: choice,
            principal_is_correct: isCorrect,
          };

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
          level: 1,
          role: myRole,
          choice,
          is_correct: isCorrect,
          score_delta: scoreDelta,
          dpdp_concept: questionCard.title,
        }),
        level1.updateState(choicePatch),
      ]);
      toast.success(isCorrect ? "Correct answer" : "Answer recorded");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save answer");
    }
  };

  useEffect(() => {
    if (state.status === "completed") {
      completionSynced.current = false;
      return;
    }
    if (!state.fiduciary_choice || !state.principal_choice) return;
    if (completionSynced.current) return;
    completionSynced.current = true;
    void level1.updateState({ status: "completed" }).catch(() => {
      completionSynced.current = false;
    });
  }, [level1, state.fiduciary_choice, state.principal_choice, state.status]);

  useEffect(() => {
    if (state.status !== "selecting") {
      answeringSynced.current = false;
      return;
    }
    if (!state.fiduciary_card_id || !state.principal_card_id) return;
    if (answeringSynced.current) return;
    answeringSynced.current = true;
    void level1.updateState({ status: "answering" }).catch(() => {
      answeringSynced.current = false;
    });
  }, [level1, state.fiduciary_card_id, state.principal_card_id, state.status]);

  const finishLevel1 = async () => {
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
            <LevelBadge level={1} />
            <span>·</span>
            <span>1v1</span>
            <span>·</span>
            <span className="capitalize">{viewPhase}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
            <div className="font-mono font-bold text-lg tabular-nums">{live.me.score}</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 pt-6">
        <div className="grid xl:grid-cols-[1fr_340px] gap-6">
          <section>
            <h1 className="font-display text-2xl mb-1">Level-1: Principle Duel</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Both players pick one DPDP principle card. You answer a question from your opponent's selected card.
            </p>

            {state.status === "selecting" && (
              <div className="rounded-xl border border-border bg-surface p-4 mb-5 text-sm text-muted-foreground">
                {myCardId
                  ? "Card selected. Waiting for the other player to lock their card."
                  : `Pick one card from the ${LEVEL1_PRINCIPLE_CARDS.length} principles below.`}
              </div>
            )}

            {state.status !== "selecting" && questionCard && (
              <article className="rounded-xl border border-border bg-surface p-5 mb-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2">
                  <span>{questionCard.section}</span>
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
                    <p className="font-medium mb-1">Your answer: {myChoice}</p>
                    <p className="text-muted-foreground">{questionCard.explanation}</p>
                  </div>
                )}
              </article>
            )}

            {state.status === "completed" && (
              <div className="rounded-xl border border-border bg-surface p-5 mb-5">
                <h2 className="font-display text-xl mb-2">Level-1 Completed</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Both players answered. You can now view the recap while Level-2 stays pending.
                </p>
                <button
                  onClick={() => void finishLevel1()}
                  className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium"
                >
                  View Learning Recap
                </button>
              </div>
            )}

            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">DPDP Principle Cards ({LEVEL1_PRINCIPLE_CARDS.length})</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {myCardId ? `Locked: ${myCardId}` : "Not locked"}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {LEVEL1_PRINCIPLE_CARDS.map((card) => {
                  const selectedByMe = myCardId === card.id;
                  const selectedByOther = opponentCardId === card.id;
                  const isDisabled = state.status !== "selecting" || !!myCardId;

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
                        <span className="text-[10px] text-muted-foreground">{card.section}</span>
                      </div>
                      <p className="font-medium text-sm leading-snug">{card.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.summary}</p>
                      {selectedByMe && <p className="text-[11px] text-accent mt-2">Selected by you</p>}
                      {selectedByOther && <p className="text-[11px] text-[var(--principal)] mt-2">Selected by opponent</p>}
                    </button>
                  );
                })}
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

            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="font-display text-lg mb-3">Round State</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span>{myName} card</span>
                  <span className="font-mono text-xs">{mySelectedCard?.id ?? "-"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>{opponentName} card</span>
                  <span className="font-mono text-xs">{opponentSelectedCard?.id ?? "-"}</span>
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
              <h3 className="font-display text-lg mb-2">Rules Snapshot</h3>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Fiduciary and Principal each pick one of 23 cards.</li>
                <li>You answer question from the card picked by the other role.</li>
                <li>Level-2 is intentionally not started yet.</li>
              </ol>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
