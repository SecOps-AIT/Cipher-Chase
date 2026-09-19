"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Trophy,
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  Lock,
  AlertCircle,
  LogOut,
  Send,
  Zap,
  Sparkles,
  ChevronRight,
  X,
  Layers,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useTeamState } from "@/hooks/useTeamState";
import { useActiveQuestions } from "@/hooks/useActiveQuestions";
import { QuestionView } from "@/lib/round1";

export default function TeamRound1Page() {
  const router = useRouter();
  // Poll team state and challenges state every 1.5 seconds for instant cross-device updates (Section 11)
  const { state: teamState, loading: teamLoading, refresh: refreshTeam } = useTeamState(1500);
  const { data: questionsData, loading: qLoading, refresh: refreshQuestions } = useActiveQuestions(1500);

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

  // Timer countdown calculations
  const [localSecondsRemaining, setLocalSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (questionsData?.batchInfo?.secondsRemaining !== undefined) {
      setLocalSecondsRemaining(questionsData.batchInfo.secondsRemaining);
    }
  }, [questionsData?.batchInfo?.secondsRemaining]);

  useEffect(() => {
    if (localSecondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setLocalSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [localSecondsRemaining]);

  // Keep selected question updated if team solves it concurrently from another device
  useEffect(() => {
    if (selectedQuestion && questionsData?.questions) {
      const updated = questionsData.questions.find((q) => q.id === selectedQuestion.id);
      if (updated && updated.status === "SOLVED" && selectedQuestion.status !== "SOLVED") {
        setSelectedQuestion(updated);
        setSubmitFeedback({
          success: true,
          isCorrect: true,
          message: "✓ Question was solved by a teammate! Points awarded to your team.",
        });
      }
    }
  }, [questionsData, selectedQuestion]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/team/join");
  };

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !flagInput.trim() || submitLoading) return;

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
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#00f0ff", "#00ff66", "#a855f7"],
        });
        setSubmitFeedback({
          success: true,
          isCorrect: true,
          points: data.points,
          message: data.message || "✓ Correct flag! Points awarded to your team.",
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
        message: err.message || "Network error. Please try again.",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (teamLoading && !teamState) {
    return (
      <div className="min-h-screen bg-cyber-darker text-slate-100 flex items-center justify-center font-mono">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Connecting to team session...</span>
        </div>
      </div>
    );
  }

  if (!teamState?.team) {
    return (
      <div className="min-h-screen bg-cyber-darker text-slate-100 flex items-center justify-center p-4 font-mono">
        <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">NO ACTIVE SESSION</h2>
          <p className="text-xs text-slate-400">
            You must join a team with your team code before accessing Round 1.
          </p>
          <Link
            href="/team/join"
            className="inline-block px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors"
          >
            GO TO JOIN SCREEN
          </Link>
        </div>
      </div>
    );
  }

  const team = teamState.team;
  const currentRound = teamState.currentRound;
  const batchInfo = questionsData?.batchInfo;
  const now = new Date(questionsData?.serverTime || Date.now());

  return (
    <div className="min-h-screen bg-cyber-darker text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation / Team Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black font-mono text-white tracking-wide uppercase">
                  {team.name}
                </h1>
                {team.qualified && (
                  <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono rounded flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    QUALIFIED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Logged in as: <strong className="text-cyan-300">{team.currentMember || "Member"}</strong> • Team: {team.memberCount} / {team.maxMembers} members
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">SCORE</span>
              <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                {team.score}
              </span>
            </div>

            <div className="text-right pl-4 border-l border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block flex items-center gap-1 justify-end">
                <Wallet className="w-3 h-3 text-amber-400" /> WALLET
              </span>
              <span className="text-xl font-bold font-mono text-amber-300">
                {team.wallet} <span className="text-xs text-amber-400/70">pts</span>
              </span>
            </div>

            <div className="pl-4 border-l border-slate-800 flex items-center gap-2">
              <Link
                href="/leaderboard"
                target="_blank"
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                title="View Live Leaderboard"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                title="Leave Team Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-6 md:p-8 space-y-8">
        {/* Round 1 Stage & Batch Banner (Section 10) */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              ROUND 1 — THEMED CTF
            </div>
            <h2 className="text-2xl font-black font-mono text-white flex items-center gap-3">
              <Layers className="w-6 h-6 text-cyan-400" />
              BATCH {batchInfo?.currentBatch || 1} / {batchInfo?.totalBatches || 1}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Status: <span className="text-emerald-400 font-bold">{currentRound?.status || "LIVE"}</span> • Solves: <strong className="text-white">{team.solvesCount}</strong>
            </p>
          </div>

          <div className="text-right bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
              TIME REMAINING
            </span>
            <span className="text-3xl font-black font-mono text-amber-400 tracking-wider">
              {formatTimer(localSecondsRemaining)}
            </span>
          </div>
        </div>

        {/* Challenges Arena */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                CHALLENGES
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                First correct submission by any teammate locks the question for the team and awards points.
              </p>
            </div>
          </div>

          {qLoading && !questionsData ? (
            <div className="py-16 text-center text-slate-500 font-mono text-sm">
              Syncing challenge status...
            </div>
          ) : questionsData?.questions && questionsData.questions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {questionsData.questions.map((q) => {
                const isSolved = q.status === "SOLVED";
                const isLocked = q.status === "LOCKED";
                const isClosed = q.status === "CLOSED";
                const isActive = q.status === "LIVE" || (!isSolved && !isLocked && !isClosed);

                // Calculate countdown for upcoming challenges
                let upcomingCountdown = "";
                if (isLocked && q.releaseAt) {
                  const diffSec = Math.max(0, Math.ceil((new Date(q.releaseAt).getTime() - now.getTime()) / 1000));
                  upcomingCountdown = formatTimer(diffSec);
                }

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
                          {/* First Blood Badge */}
                          {q.firstBlood ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300">
                              🩸 FB: {q.firstBlood.teamName}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                              🩸 +{q.firstBloodBonus || 50} FB
                            </span>
                          )}
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
                        Q{q.order.toString().padStart(2, "0")} — {q.title}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-sans">
                        {isLocked ? "This challenge is currently locked." : q.description}
                      </p>
                    </div>

                    {/* Footer / Action (Section 10 specifications) */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      {isSolved ? (
                        <div className="flex items-center justify-between w-full text-xs font-mono text-emerald-400 font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ✓ SOLVED
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                            +{q.points}
                          </span>
                        </div>
                      ) : isLocked ? (
                        <div className="flex items-center justify-between w-full text-xs font-mono text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            LOCKED
                          </span>
                          <span>Releases in {upcomingCountdown || "--:--"}</span>
                        </div>
                      ) : isClosed ? (
                        <div className="text-xs font-mono text-rose-400/80 font-bold uppercase tracking-wider">
                          CLOSED
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedQuestion(q);
                            setSubmitFeedback(null);
                            setFlagInput("");
                          }}
                          className="w-full py-2.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:text-white font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>OPEN</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 font-mono text-xs">
              No questions found for Round 1.
            </div>
          )}
        </section>
      </main>

      {/* QUESTION SUBMISSION & LIVE TRACKING MODAL */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedQuestion(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedQuestion.category}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
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
                  +{selectedQuestion.points} pts
                </span>
              </div>

              <h3 className="text-lg font-bold font-mono text-white">
                Q{selectedQuestion.order.toString().padStart(2, "0")} — {selectedQuestion.title}
              </h3>
            </div>

            {/* FIRST BLOOD LIVE STATUS */}
            <div className="p-3 bg-slate-950 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🩸</span>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    FIRST BLOOD
                  </span>
                  {selectedQuestion.firstBlood ? (
                    <span className="text-rose-300 font-bold">
                      Claimed by <strong className="text-white">{selectedQuestion.firstBlood.teamName}</strong> at{" "}
                      {new Date(selectedQuestion.firstBlood.solvedAt).toLocaleTimeString()} (+{selectedQuestion.firstBlood.bonus} bonus)
                    </span>
                  ) : (
                    <span className="text-amber-300 font-bold">
                      AVAILABLE (+{selectedQuestion.firstBloodBonus || 50} pts bonus for first solve!)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {selectedQuestion.description}
              </p>
            </div>

            {/* LIVE SOLVERS MINI-LEADERBOARD */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                <span>QUESTION SOLVERS ({selectedQuestion.solvesCount || selectedQuestion.recentSolves?.length || 0})</span>
                <span>TIME</span>
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {selectedQuestion.recentSolves && selectedQuestion.recentSolves.length > 0 ? (
                  selectedQuestion.recentSolves.map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-1.5 rounded flex items-center justify-between text-[11px] ${
                        s.isFirstBlood ? "bg-rose-950/30 text-rose-300 font-bold" : "text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">{idx + 1}.</span>
                        <span>{s.teamName}</span>
                        {s.isFirstBlood && <span>🩸</span>}
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(s.solvedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500 py-1 text-center">No solves yet. Be the first team!</p>
                )}
              </div>
            </div>

            {submitFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 ${
                  submitFeedback.isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/40 text-rose-300"
                }`}
              >
                {submitFeedback.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{submitFeedback.message}</span>
              </div>
            )}

            {selectedQuestion.status !== "SOLVED" ? (
              <form onSubmit={handleSubmitFlag} className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">
                    Flag / Answer Submission
                  </label>
                  <input
                    type="text"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    placeholder="Enter flag format: CC{...}"
                    disabled={submitLoading}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 font-mono text-xs text-white placeholder-slate-600 focus:outline-none"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedQuestion(null)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading || !flagInput.trim()}
                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-cyan-950/50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitLoading ? "SUBMITTING..." : "SUBMIT FLAG"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
