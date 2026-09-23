"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Trophy,
  Users,
  Clock,
  CheckCircle2,
  Lock,
  AlertCircle,
  LogOut,
  Send,
  HelpCircle,
  Zap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useTeamState } from "@/hooks/useTeamState";
import { useActiveQuestions } from "@/hooks/useActiveQuestions";
import { useChallengeTimer } from "@/hooks/useChallengeTimer";
import { QuestionView } from "@/lib/round1";
import { CommandHeader } from "@/components/ui/CommandHeader";

export default function TeamDashboardPage() {
  const router = useRouter();
  const { state: teamState, loading: teamLoading, refresh: refreshTeam } = useTeamState(2000);
  const { data: questionsData, loading: qLoading, refresh: refreshQuestions } = useActiveQuestions(2000);

  // Selected question modal state
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionView | null>(null);
  const [flagInput, setFlagInput] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    success: boolean;
    message: string;
    isCorrect?: boolean;
    points?: number;
  } | null>(null);

  // Round 2 state
  const [r2Data, setR2Data] = useState<any>(null);
  const [claimingHintId, setClaimingHintId] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  // Poll Round 2 state if Round 2 is LIVE or READY
  const isRound2 = teamState?.currentRound?.number === 2;

  useEffect(() => {
    if (teamState && (!teamState.currentRound || teamState.currentRound.number === 1 || !teamState.team?.qualified)) {
      router.push("/team/round-1");
    }
  }, [teamState, router]);

  // Logout handler
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/team/join");
  };

  // Submit flag handler
  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !flagInput.trim()) return;

    setSubmitLoading(true);
    setSubmitFeedback(null);

    try {
      const res = await fetch("/api/round-1/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: selectedQuestion.id,
          answer: flagInput.trim(),
        }),
      });

      const data = await res.json();

      if (res.status === 409 || data.alreadySolved) {
        setSubmitFeedback({
          success: false,
          message: data.message || "This question has already been solved by your team.",
        });
        refreshQuestions();
        refreshTeam();
        return;
      }

      if (!res.ok) {
        setSubmitFeedback({
          success: false,
          message: data.message || data.error || "Submission failed",
        });
        return;
      }

      if (data.isCorrect) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#00f0ff", "#00ff66", "#9d4edd"],
        });
        setSubmitFeedback({
          success: true,
          isCorrect: true,
          points: data.points,
          message: data.message || "Correct flag! Points awarded to your team.",
        });
        setFlagInput("");
        refreshQuestions();
        refreshTeam();
      } else {
        setSubmitFeedback({
          success: false,
          isCorrect: false,
          message: data.message || "Incorrect flag. Try again!",
        });
      }
    } catch (err: any) {
      setSubmitFeedback({
        success: false,
        message: err.message || "Network error. Please retry.",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Claim hint in Round 2
  const handleClaimHint = async (hintId: string) => {
    setClaimingHintId(hintId);
    setHintMessage(null);
    try {
      const res = await fetch("/api/round-2/claim-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hintId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHintMessage(`Error: ${data.message || data.error}`);
      } else {
        setHintMessage(`Hint unlocked! -${data.cost || 50} pts`);
        refreshTeam();
      }
    } catch (err: any) {
      setHintMessage(err.message);
    } finally {
      setClaimingHintId(null);
    }
  };

  if (teamLoading) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-cyan-400 tracking-wider">CONNECTING TO ARENA...</p>
        </div>
      </div>
    );
  }

  if (!teamState?.team) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-mono text-white mb-2">NO ACTIVE SESSION</h2>
          <p className="text-sm text-slate-400 mb-6">You need to join a team with a valid join code.</p>
          <Link
            href="/team/join"
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-sm rounded-xl inline-block"
          >
            ENTER JOIN CODE
          </Link>
        </div>
      </div>
    );
  }

  const { team, currentRound } = teamState;

  return (
    <div className="min-h-screen cyber-grid flex flex-col">
      {/* Operational Tactical Command Bar */}
      <CommandHeader
        teamName={team.name}
        joinCode={team.joinCode}
        memberName={team.currentMember}
        memberCount={team.members?.length || 1}
        maxMembers={3}
        score={team.score}
        roundNumber={currentRound?.number || 1}
        roundTitle={currentRound?.name || "MISSION"}
        onLogout={handleLogout}
      />

      {/* Main Content Arena */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-6 md:p-8 space-y-8">
        {/* Current Round Banner */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">CURRENT STAGE</span>
              <h2 className="text-base font-bold font-mono text-white">
                {currentRound?.name || "Round 1 — Themed CTF"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs rounded-full">
              STATUS: {currentRound?.status || "LIVE"}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Solves: <strong className="text-white">{team.solvesCount}</strong>
            </span>
          </div>
        </div>

        {/* SECTION: ROUND 1 QUESTIONS */}
        {(!isRound2 || !team.qualified) && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  LIVE CHALLENGES
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Solve challenges to earn points. First correct solve by any teammate locks the question for the team.
                </p>
              </div>
            </div>

            {qLoading ? (
              <div className="py-12 text-center text-slate-500 font-mono text-sm">
                Fetching questions...
              </div>
            ) : questionsData?.questions && questionsData.questions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {questionsData.questions.map((q) => {
                  const isSolved = q.status === "SOLVED";
                  const isLocked = q.status === "LOCKED";
                  const isClosed = q.status === "CLOSED";

                  return (
                    <div
                      key={q.id}
                      className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                        isSolved
                          ? "bg-emerald-950/20 border-emerald-500/40 shadow-neon-glow"
                          : isLocked
                          ? "bg-slate-900/30 border-slate-800/80 opacity-70"
                          : isClosed
                          ? "bg-slate-900/20 border-slate-800/40 opacity-50"
                          : "bg-slate-900/80 border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-glow"
                      }`}
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {q.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                q.difficulty === "EASY"
                                  ? "bg-cyan-500/20 text-cyan-300"
                                  : q.difficulty === "MEDIUM"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            <span className="text-xs font-mono font-bold text-white">
                              +{q.points} <span className="text-slate-500 font-normal">pts</span>
                            </span>
                          </div>
                        </div>

                        {/* Question Title */}
                        <h4 className="text-base font-bold font-mono text-white mb-2 leading-snug">
                          {q.title}
                        </h4>

                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-sans">
                          {q.description}
                        </p>
                      </div>

                      {/* Card Footer / Action */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        {isSolved ? (
                          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>SOLVED BY TEAM</span>
                          </div>
                        ) : isLocked ? (
                          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                            <Lock className="w-4 h-4" />
                            <span>LOCKED</span>
                          </div>
                        ) : isClosed ? (
                          <div className="text-xs font-mono text-rose-400 font-semibold">
                            CLOSED
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedQuestion(q);
                              setSubmitFeedback(null);
                              setFlagInput("");
                            }}
                            className="w-full py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:text-white font-mono text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <span>OPEN CHALLENGE</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-slate-400 font-mono text-xs">
                No active questions released in this round yet. Stand by for admin release.
              </div>
            )}
          </section>
        )}

        {/* SECTION: ROUND 2 CYBER AUCTION (When Qualified and Round 2 active) */}
        {isRound2 && team.qualified && (
          <section className="space-y-6">
            <Round2TeamPanel
              teamId={team.id}
              onClaimHint={handleClaimHint}
              claimingHintId={claimingHintId}
              hintMessage={hintMessage}
            />
          </section>
        )}
      </main>

      {/* QUESTION DETAIL & SUBMISSION MODAL */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedQuestion(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {selectedQuestion.category}
              </span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${
                  selectedQuestion.difficulty === "EASY"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : selectedQuestion.difficulty === "MEDIUM"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {selectedQuestion.difficulty}
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400 ml-auto">
                +{selectedQuestion.points} points
              </span>
            </div>

            <h3 className="text-xl font-bold font-mono text-white mb-4">
              {selectedQuestion.title}
            </h3>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl mb-6 text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {selectedQuestion.description}
            </div>

            {/* Feedback Alerts */}
            {submitFeedback && (
              <div
                className={`mb-5 p-3.5 rounded-xl border flex items-start gap-3 text-xs font-mono ${
                  submitFeedback.isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/40 text-rose-300"
                }`}
              >
                {submitFeedback.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{submitFeedback.message}</span>
              </div>
            )}

            {/* Submission Form */}
            <form onSubmit={handleSubmitFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Submit Flag / Solution
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="FLAG{...}"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="px-4 py-2.5 text-xs font-mono text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={submitLoading || !flagInput.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center gap-2 shadow-cyan-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitLoading ? (
                    <span>VERIFYING...</span>
                  ) : (
                    <>
                      <span>SUBMIT FLAG</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for Round 2 Cyber Auction View
function Round2TeamPanel({
  teamId,
  onClaimHint,
  claimingHintId,
  hintMessage,
}: {
  teamId: string;
  onClaimHint: (hintId: string) => void;
  claimingHintId: string | null;
  hintMessage: string | null;
}) {
  const [r2State, setR2State] = useState<any>(null);

  const fetchR2 = async () => {
    try {
      const res = await fetch("/api/round-2/state", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setR2State(json);
      }
    } catch {}
  };

  useState(() => {
    fetchR2();
    const interval = setInterval(fetchR2, 2000);
    return () => clearInterval(interval);
  });

  const challenge = r2State?.challenge;
  const { formattedTime, isExpired } = useChallengeTimer(
    challenge?.deadlineAt,
    r2State?.serverTime
  );

  return (
    <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono text-purple-400 uppercase tracking-widest block">
            TIME AUCTION ARENA
          </span>
          <h3 className="text-2xl font-bold font-mono text-white">
            {challenge ? challenge.title : "Awaiting Auction Assignment"}
          </h3>
        </div>
      </div>

      {challenge ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Challenge Details and Timer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Countdown Box */}
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2">
              <span className="text-xs font-mono text-slate-400 tracking-widest uppercase flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" /> AUTHORITATIVE TIME REMAINING
              </span>
              <div
                className={`text-5xl sm:text-6xl font-black font-mono tracking-tight font-mono-num ${
                  isExpired ? "text-rose-400" : "text-cyan-400"
                }`}
              >
                {isExpired ? "00:00" : formattedTime}
              </div>
              <p className="text-xs font-mono text-slate-500">
                Committed Time: {Math.floor((challenge.committedSeconds || 0) / 60)}m{" "}
                {((challenge.committedSeconds || 0) % 60).toString().padStart(2, "0")}s | Base Reward:{" "}
                {challenge.basePoints} pts
              </p>
            </div>

            {/* Challenge Description */}
            <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                CHALLENGE BRIEFING
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                {challenge.description}
              </p>
            </div>

            {/* Challenge status feedback */}
            {challenge.status === "COMPLETED" && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>CHALLENGE COMPLETE! Base points and speed bonus have been credited.</span>
              </div>
            )}

            {challenge.status === "FAILED" && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-300 font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>CHALLENGE FAILED. Time penalty has been applied to team score.</span>
              </div>
            )}
          </div>

          {/* Right Col: Progressive Hints */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-400" /> PROGRESSIVE HINTS
            </h4>

            {hintMessage && (
              <div className="p-2.5 bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 rounded-lg">
                {hintMessage}
              </div>
            )}

            <div className="space-y-3">
              {challenge.hints && challenge.hints.length > 0 ? (
                challenge.hints.map((hint: any) => (
                  <div
                    key={hint.id}
                    className={`p-4 rounded-xl border transition-all ${
                      hint.isClaimed
                        ? "bg-purple-950/20 border-purple-500/40"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-white">
                        {hint.title}
                      </span>
                      <span className="text-xs font-mono text-rose-400">
                        -{hint.cost} pts
                      </span>
                    </div>

                    {hint.isClaimed ? (
                      <p className="text-xs text-purple-200 font-mono leading-relaxed mt-2 p-2 bg-purple-900/30 rounded border border-purple-800/40">
                        {hint.content}
                      </p>
                    ) : (
                      <button
                        onClick={() => onClaimHint(hint.id)}
                        disabled={claimingHintId === hint.id}
                        className="mt-2 w-full py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-mono text-xs rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {claimingHintId === hint.id
                          ? "UNLOCKING..."
                          : `UNLOCK (-${hint.cost} pts from score)`}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs font-mono text-slate-500">No hints configured for this challenge.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 font-mono text-xs">
          The auction challenge has not started yet. Waiting for admin to assign winner and start timer.
        </div>
      )}
    </div>
  );
}
