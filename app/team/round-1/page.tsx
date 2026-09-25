"use client";

import { useState, useEffect, useMemo } from "react";
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
  Zap,
  Sparkles,
  ChevronRight,
  X,
  Layers,
  Lightbulb,
  Play,
  HelpCircle,
  Terminal,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useTeamState } from "@/hooks/useTeamState";
import { useActiveQuestions } from "@/hooks/useActiveQuestions";
import { QuestionView } from "@/lib/round1";
import { CommandHeader } from "@/components/ui/CommandHeader";

export default function TeamRound1Page() {
  const router = useRouter();
  // Poll team state and challenges state every 1.5 seconds for instant cross-device updates (Section 11)
  const { state: teamState, loading: teamLoading, refresh: refreshTeam } = useTeamState(1500);
  const { data: questionsData, loading: qLoading, refresh: refreshQuestions } = useActiveQuestions(1500);

  // Tutorial Briefing & Demo Flag modal state
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [hasOpenedBriefingAuto, setHasOpenedBriefingAuto] = useState(false);
  const [demoFlagInput, setDemoFlagInput] = useState("");
  const [demoFlagSolved, setDemoFlagSolved] = useState(false);
  const [demoFeedback, setDemoFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [startLoading, setStartLoading] = useState(false);

  // Automatically show tutorial when entering Round 1 if timer is not started
  useEffect(() => {
    if (questionsData?.teamTimer?.status === "NOT_STARTED" && !hasOpenedBriefingAuto) {
      setShowTutorialModal(true);
      setHasOpenedBriefingAuto(true);
    }
  }, [questionsData?.teamTimer?.status, hasOpenedBriefingAuto]);

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

  // Hint system state
  const [showHints, setShowHints] = useState(false);
  const [hintData, setHintData] = useState<any>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [claimingHint, setClaimingHint] = useState<string | null>(null);

  // Timer countdown calculations - USE TEAM TIMER ONLY
  const [localSecondsRemaining, setLocalSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    const timerSeconds = questionsData?.teamTimer?.secondsRemaining ?? 0;
    setLocalSecondsRemaining(timerSeconds);
  }, [questionsData?.teamTimer?.secondsRemaining]);

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

  const loadHints = async (questionId: string) => {
    setHintLoading(true);
    try {
      const res = await fetch(`/api/round-1/hints/${questionId}`);
      if (res.ok) {
        const data = await res.json();
        setHintData(data);
      } else {
        const error = await res.json();
        console.error("Failed to load hints:", error.error);
        setHintData(null);
      }
    } catch (error) {
      console.error("Error loading hints:", error);
      setHintData(null);
    } finally {
      setHintLoading(false);
    }
  };

  const claimHint = async (hintId: string, questionId: string) => {
    if (!selectedQuestion) return;
    
    setClaimingHint(hintId);
    try {
      const res = await fetch(`/api/round-1/hints/${questionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hintId })
      });

      const data = await res.json();
      
      if (res.ok) {
        // Refresh hint data to show claimed hint
        await loadHints(questionId);
        // Refresh team data to update score
        refreshTeam();
        setSubmitFeedback({
          success: true,
          message: data.message
        });
      } else {
        setSubmitFeedback({
          success: false,
          message: data.error || "Failed to claim hint"
        });
      }
    } catch (error: any) {
      setSubmitFeedback({
        success: false,
        message: error.message || "Network error claiming hint"
      });
    } finally {
      setClaimingHint(null);
    }
  };

  const handleTestDemoFlag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = demoFlagInput.trim().toLowerCase();
    if (clean === "welcome" || clean === "cc{welcome}") {
      setDemoFlagSolved(true);
      setDemoFeedback({
        success: true,
        message: "✓ Calibration successful! Demo flag verified. Terminal link established.",
      });
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.5 },
        colors: ["#00f0ff", "#10b981", "#f59e0b"],
      });
    } else {
      setDemoFeedback({
        success: false,
        message: "Invalid calibration flag. Enter 'welcome' or 'CC{welcome}' to test.",
      });
    }
  };

  const handleStartOperation = async () => {
    setStartLoading(true);
    try {
      const res = await fetch("/api/round-1/start", { method: "POST" });
      if (res.ok) {
        setShowTutorialModal(false);
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
          colors: ["#10b981", "#00f0ff", "#fbbf24"],
        });
        refreshQuestions();
        refreshTeam();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to start operation timer");
      }
    } catch (err: any) {
      alert(err.message || "Failed to start operation timer");
    } finally {
      setStartLoading(false);
    }
  };

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !flagInput.trim() || submitLoading) return;

    if (questionsData?.teamTimer?.status === "NOT_STARTED") {
      setSubmitFeedback({
        success: false,
        message: "Operation timer has not started yet. Click 'START OPERATION' in the header to activate your 30-minute mission!",
      });
      return;
    }

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

  return (
    <div className="min-h-screen bg-cyber-darker text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Operational Tactical Command Bar */}
      <CommandHeader
        teamName={team.name}
        joinCode={team.joinCode}
        memberName={team.currentMember}
        memberCount={team.memberCount}
        maxMembers={team.maxMembers}
        score={team.score}
        roundNumber={1}
        roundTitle="THEMED CTF"
        timeRemaining={localSecondsRemaining}
        timerStatus={questionsData?.teamTimer?.status}
        onBriefingClick={() => setShowTutorialModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-6 md:p-8 space-y-8">
        {/* STANDBY TIMER NOT STARTED BANNER */}
        {questionsData?.teamTimer?.status === "NOT_STARTED" && (
          <div className="p-5 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold rounded">
                    OPERATION STANDBY
                  </span>
                  <span className="text-xs font-mono text-slate-400">30:00 Window</span>
                </div>
                <h3 className="text-base font-bold font-mono text-white mt-1">
                  Team Timer Has Not Started Yet
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Review the mission briefing, test your submission terminal with the demo flag, and click Ready to start!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowTutorialModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              MISSION BRIEFING & START OPERATION
            </button>
          </div>
        )}

        {/* Round 1 Competition Status Banner */}
        <div className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-700 rounded-2xl shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-6">
            {/* Competition Information */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <Layers className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ROUND 1 — CYBERSECURITY CTF
                  </div>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    Challenge-Based Competition
                  </h2>
                </div>
              </div>

              {/* Game State Explanation */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                {/* CTF CHALLENGE LINK - PROMINENT */}
                <div className="mb-4 p-4 bg-gradient-to-r from-cyan-500/20 via-emerald-500/20 to-purple-500/20 border-2 border-cyan-500/50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">CTF Challenge Platform</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    Access the live challenges, solve puzzles, and submit flags at the official CTF platform:
                  </p>
                  <a
                    href="https://heist-ctf.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm rounded-lg transition-all shadow-lg hover:shadow-cyan-500/30"
                  >
                    <Zap className="w-4 h-4" />
                    OPEN CTF PLATFORM →
                  </a>
                  <p className="text-xs text-slate-400 mt-2">
                    🔗 <span className="font-mono">heist-ctf.vercel.app</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-sm font-semibold text-white">How This Round Works</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-mono shrink-0">•</span>
                      <span><strong className="text-white">Per-team timer:</strong> Your team gets 30 minutes to crack as many targets as possible once started</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-mono shrink-0">•</span>
                      <span><strong className="text-white">20 Vault Challenges:</strong> 20 security challenges spanning Crypto, Web, Forensics, and Reverse Engineering</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-mono shrink-0">•</span>
                      <span><strong className="text-white">Live Team Sync:</strong> Any teammate&apos;s correct submission immediately scores points for the whole team</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-mono shrink-0">•</span>
                      <span><strong className="text-white">Progressive Hints:</strong> Access hints if stuck on complex vaults for minor point deducts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Timer:</span>
                  <span className={`font-bold font-mono ${
                    questionsData?.teamTimer?.status === "ACTIVE" ? "text-emerald-400" :
                    questionsData?.teamTimer?.status === "EXPIRED" ? "text-rose-400" : 
                    "text-amber-400"
                  }`}>
                    {questionsData?.teamTimer?.status === "NOT_STARTED" ? "READY TO START" :
                     questionsData?.teamTimer?.status === "ACTIVE" ? "ACTIVE" : 
                     questionsData?.teamTimer?.status === "EXPIRED" ? "TIME EXPIRED" : "WAITING"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Available Questions:</span>
                  <span className="font-bold text-cyan-300">
                    {questionsData?.questions?.length || 20} Challenges
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Team Progress:</span>
                  <span className="font-bold text-white">{team.solvesCount} solved</span>
                </div>
              </div>
            </div>

            {/* Timer Display */}
            <div className="text-center bg-slate-950/80 border border-slate-700 rounded-xl p-4 min-w-[140px]">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  {questionsData?.teamTimer?.status === "NOT_STARTED" ? "TEAM TIMER" : 
                   questionsData?.teamTimer?.status === "ACTIVE" ? "TIME REMAINING" :
                   questionsData?.teamTimer?.status === "EXPIRED" ? "FINAL TIME" : "TEAM TIMER"}
                </span>
                <div className={`text-3xl font-black font-mono tracking-wide ${
                  questionsData?.teamTimer?.status === "ACTIVE" ? "text-emerald-400" :
                  questionsData?.teamTimer?.status === "EXPIRED" ? "text-rose-400" :
                  "text-amber-400"
                }`}>
                  {formatTimer(localSecondsRemaining)}
                </div>
                
                {questionsData?.teamTimer?.status === "NOT_STARTED" && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowTutorialModal(true)}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-[11px] rounded-lg transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      CLICK READY
                    </button>
                    <div className="text-[10px] text-slate-400 mt-1 text-center font-mono">
                      Timer starts on Ready
                    </div>
                  </div>
                )}
                
                {questionsData?.teamTimer?.status === "ACTIVE" && (
                  <div className="text-[10px] text-emerald-400 mt-2 font-medium">
                    Competition Active
                  </div>
                )}
                
                {questionsData?.teamTimer?.status === "EXPIRED" && (
                  <div className="text-[10px] text-rose-400 mt-2 font-bold">
                    Time Expired
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Challenges Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                CYBERSECURITY CHALLENGES (20 TARGETS)
              </h3>
              <div className="space-y-1 text-xs text-slate-400">
                <p className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                  Click <strong className="text-white font-mono">OPEN</strong> to view challenge details and submit flags
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
                  First correct submission by any team member locks the challenge and awards points to your whole team
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                  Progressive hints available for all 20 vault challenges
                </p>
              </div>
            </div>
            
            {questionsData?.teamTimer?.status === "EXPIRED" && (
              <div className="px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-bold">TIME EXPIRED</span>
                </div>
                <p className="text-[10px] text-rose-400 mt-1">
                  No new submissions accepted
                </p>
              </div>
            )}
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

                const cleanTitle = q.title.replace(/^Q\d+\s*[-—:]\s*/i, "");

                return (
                  <div
                    key={q.id}
                    className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between corner-frame ${
                      isSolved
                        ? "bg-emerald-950/20 border-emerald-500/40 shadow-neon-glow"
                        : isLocked
                        ? "bg-[#080C14]/40 border-[#1E293B] opacity-60"
                        : isClosed
                        ? "bg-[#080C14]/30 border-[#1E293B]/60 opacity-50"
                        : "bg-[#090D16] border-[#1E293B] hover:border-cyan-500/50 hover:bg-[#0D1424]"
                    }`}
                  >
                    <div>
                      {/* Top Badges & Question Type */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#05070B] border border-cyan-500/20 text-cyan-300 font-bold uppercase tracking-wider">
                          {q.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              q.difficulty === "EASY"
                                ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
                                : q.difficulty === "MEDIUM"
                                ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                                : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                            }`}
                          >
                            {q.difficulty}
                          </span>
                          <span className="text-xs font-mono font-black text-white">
                            +{q.points} <span className="text-slate-500 font-normal">pts</span>
                          </span>
                        </div>
                      </div>

                      {/* Question Order & Title */}
                      <div className="text-[11px] font-mono text-cyan-400 font-bold tracking-wider mb-0.5">
                        Q{q.order.toString().padStart(2, "0")}
                      </div>
                      <h4 className="text-sm font-bold font-mono text-white mb-2 leading-snug tracking-wide uppercase truncate">
                        {cleanTitle}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 font-sans leading-relaxed">
                        {isClosed
                          ? "This challenge is no longer accepting submissions."
                          : q.description}
                      </p>
                    </div>

                    {/* Footer / Action Status */}
                    <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between">
                      {isSolved ? (
                        <div className="flex items-center justify-between w-full text-xs font-mono text-emerald-400 font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ✓ SOLVED
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                            +{q.points} PTS
                          </span>
                        </div>
                      ) : isLocked ? (
                        <div className="flex items-center justify-between w-full text-xs font-mono text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            LOCKED
                          </span>
                          <span className="text-purple-400">Admin Release</span>
                        </div>
                      ) : isClosed ? (
                        <div className="text-xs font-mono text-rose-400/80 font-bold uppercase tracking-wider">
                          CLOSED
                        </div>
                      ) : questionsData?.teamTimer?.status === "EXPIRED" ? (
                        <div className="w-full text-xs font-mono text-rose-400 text-center font-bold">
                          TIME EXPIRED
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => {
                              setSelectedQuestion(q);
                              setSubmitFeedback(null);
                              setFlagInput("");
                              setShowHints(false);
                            }}
                            className="flex-1 py-2 px-3 bg-cyan-950/40 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm group cursor-pointer"
                          >
                            <span>SOLVE →</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedQuestion(q);
                              setSubmitFeedback(null);
                              setFlagInput("");
                              setShowHints(true);
                              loadHints(q.id);
                            }}
                            className="p-2 bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                            title="Classified Hints"
                          >
                            <Lightbulb className="w-4 h-4" />
                          </button>
                        </div>
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

      {/* QUESTION MODAL - FLAG SUBMISSION OR HINTS */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090D16] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto corner-frame">
            <button
              onClick={() => {
                setSelectedQuestion(null);
                setShowHints(false);
                setHintData(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#05070B] border border-cyan-500/20 text-cyan-300 font-bold uppercase tracking-wider">
                  {selectedQuestion.category}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    selectedQuestion.difficulty === "EASY"
                      ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
                      : selectedQuestion.difficulty === "MEDIUM"
                      ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}
                >
                  {selectedQuestion.difficulty}
                </span>
                <span className="text-xs font-mono font-black text-cyan-400 ml-auto">
                  +{selectedQuestion.points} pts
                </span>
              </div>

              <div className="text-[11px] font-mono text-cyan-400 font-bold tracking-wider mb-0.5">
                Q{selectedQuestion.order.toString().padStart(2, "0")}
              </div>
              <h3 className="text-base font-bold font-mono text-white mb-1 uppercase tracking-wide">
                {selectedQuestion.title.replace(/^Q\d+\s*[-—:]\s*/i, "")}
              </h3>
              
              {selectedQuestion.status === "SOLVED" && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono font-bold mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✓ SOLVED BY YOUR TEAM</span>
                </div>
              )}

              {/* Tab Navigation */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowHints(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    !showHints 
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-800 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  CHALLENGE
                </button>
                <button
                  onClick={() => {
                    setShowHints(true);
                    if (!hintData) loadHints(selectedQuestion.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-1.5 ${
                    showHints 
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-slate-800 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <Lightbulb className="w-3 h-3" />
                  HINTS
                </button>
              </div>
            </div>

            {!showHints ? (
              // CHALLENGE TAB
              <>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                    {selectedQuestion.description}
                  </p>
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
                  questionsData?.teamTimer?.status === "EXPIRED" ? (
                    <div className="space-y-3 text-center">
                      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                        <AlertCircle className="w-6 h-6 text-rose-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-rose-300 mb-1">Competition Time Expired</p>
                        <p className="text-xs text-rose-400">
                          Your team&apos;s timer has expired. No new submissions can be accepted.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedQuestion(null)}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl"
                      >
                        Close Challenge
                      </button>
                    </div>
                  ) : (
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
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          First correct submission by any team member will lock this challenge for your team
                        </p>
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
                  )
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
              </>
            ) : (
              // HINTS TAB
              <div className="space-y-4">
                {hintData && (
                  <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div className="text-xs text-slate-400">
                      <span className="block">Hints Used</span>
                      <span className="text-sm font-mono text-white">
                        {hintData.totalHintsClaimed} hints • {hintData.totalCostPaid} pts spent
                      </span>
                    </div>
                  </div>
                )}

                {hintLoading ? (
                  <div className="py-8 text-center text-slate-500">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs font-mono">Loading hints...</span>
                  </div>
                ) : hintData?.availableHints?.length > 0 ? (
                  <div className="space-y-3">
                    {hintData.availableHints.map((hint: any, idx: number) => (
                      <div
                        key={hint.id}
                        className={`p-4 rounded-xl border ${
                          hint.isClaimed
                            ? "bg-emerald-950/20 border-emerald-500/40"
                            : "bg-slate-950 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-amber-300">
                            HINT #{hint.order}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">
                              {hint.cost} pts
                            </span>
                            {hint.isClaimed ? (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                CLAIMED
                              </span>
                            ) : (
                              <button
                                onClick={() => claimHint(hint.id, selectedQuestion.id)}
                                disabled={claimingHint === hint.id}
                                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {claimingHint === hint.id ? "..." : "CLAIM"}
                              </button>
                            )}
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-2">{hint.title}</h4>
                        {hint.isClaimed ? (
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {hint.content}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            Hint content will be revealed after claiming
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    <Lightbulb className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs font-mono">No hints available for this question</p>
                  </div>
                )}

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuestion(null);
                      setShowHints(false);
                      setHintData(null);
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MISSION BRIEFING & TERMINAL CALIBRATION MODAL */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 text-left space-y-6">
            {/* Close Button */}
            <button
              onClick={() => setShowTutorialModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Close Briefing"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/40 rounded-xl text-amber-400 shadow-sm">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
                  OPERATION BRIEFING & TERMINAL CALIBRATION
                </span>
                <h3 className="text-xl font-bold font-mono text-white">
                  Round 1: Vault Breach Guidelines
                </h3>
              </div>
            </div>

            {/* Step-by-Step Guide */}
            <div className="space-y-4 text-xs">
              {/* Point 1: 20 Challenges */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-mono font-bold text-white text-xs">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] shrink-0 border border-cyan-500/30">
                    1
                  </span>
                  <span>20 OPERATION TARGETS</span>
                </div>
                <p className="text-slate-300 pl-7 leading-relaxed">
                  Round 1 features <strong className="text-white">exactly 20 challenges</strong> spanning Cryptography, Web Security, Network Forensics, and Reverse Engineering. Point values range from 100 to 250 points based on difficulty.
                </p>
              </div>

              {/* Point 2: Co-op Sync */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-mono font-bold text-white text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30">
                    2
                  </span>
                  <span>LIVE MULTI-DEVICE TEAM SYNC</span>
                </div>
                <p className="text-slate-300 pl-7 leading-relaxed">
                  Your team shares progress across devices in real time. The first teammate to solve any challenge locks it as <strong className="text-emerald-300">SOLVED</strong> and immediately secures the points for your whole team.
                </p>
              </div>

              {/* Point 3: Hints */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-mono font-bold text-white text-xs">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] shrink-0 border border-amber-500/30">
                    3
                  </span>
                  <span>TACTICAL HINTS SYSTEM</span>
                </div>
                <p className="text-slate-300 pl-7 leading-relaxed">
                  Stuck on a tricky vault? Open the challenge and switch to the <strong className="text-amber-300">Hints</strong> tab to unlock clues in exchange for small score deductions.
                </p>
              </div>

              {/* Point 4: Interactive Calibration Test with Demo Flag */}
              <div className="p-4 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-cyan-300 text-xs">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] shrink-0 border border-cyan-500/40">
                      4
                    </span>
                    <span>TERMINAL CALIBRATION TEST (DEMO FLAG)</span>
                  </div>
                  {demoFlagSolved && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold rounded flex items-center gap-1">
                      <Check className="w-3 h-3" /> CALIBRATED
                    </span>
                  )}
                </div>

                <p className="text-slate-300 pl-7 leading-relaxed">
                  Verify your submission connection by entering the test flag <code className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono">welcome</code> (or <code className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono">CC&#123;welcome&#125;</code>) below:
                </p>

                <form onSubmit={handleTestDemoFlag} className="pl-7 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={demoFlagInput}
                      onChange={(e) => setDemoFlagInput(e.target.value)}
                      placeholder="Type demo flag: welcome"
                      className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-mono text-xs rounded-lg transition-colors shadow"
                    >
                      VERIFY
                    </button>
                  </div>

                  {demoFeedback && (
                    <div
                      className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                        demoFeedback.success
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {demoFeedback.success ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{demoFeedback.message}</span>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="px-4 py-2.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
              >
                {questionsData?.teamTimer?.status === "NOT_STARTED"
                  ? "Explore Dashboard First"
                  : "Close Briefing"}
              </button>

              {questionsData?.teamTimer?.status === "NOT_STARTED" ? (
                <button
                  type="button"
                  onClick={handleStartOperation}
                  disabled={startLoading}
                  className={`px-6 py-3 font-bold font-mono text-xs rounded-xl flex items-center gap-2 transition-all shadow-xl ${
                    demoFlagSolved
                      ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25 scale-[1.02]"
                      : "bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950"
                  }`}
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>
                    {startLoading
                      ? "INITIALIZING..."
                      : demoFlagSolved
                      ? "READY — INITIATE 30-MIN OPERATION"
                      : "READY — START OPERATION"}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                  <Clock className="w-4 h-4" />
                  <span>Operation Running ({formatTimer(localSecondsRemaining)} remaining)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
