"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Sliders,
  X,
  Edit2,
  Lock,
  ChevronRight,
  Layers,
  Sparkles,
  PlusCircle,
  RotateCcw,
} from "lucide-react";

export default function AdminRound1ControlPage() {
  const [round, setRound] = useState<any>(null);
  const [roundStats, setRoundStats] = useState<{
    teamsCount: number;
    questionsCount: number;
    solvesCount: number;
  }>({ teamsCount: 0, questionsCount: 0, solvesCount: 0 });
  const [questions, setQuestions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [showEndModal, setShowEndModal] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionDetail, setQuestionDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  // Manual score adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  // Current time ticker
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [qRes, lbRes, statusRes] = await Promise.all([
        fetch("/api/admin/questions", { cache: "no-store" }),
        fetch("/api/leaderboard", { cache: "no-store" }),
        fetch("/api/admin/round/status", { cache: "no-store" }),
      ]);

      const qData = qRes.ok ? await qRes.json() : { questions: [] };
      const lbData = lbRes.ok ? await lbRes.json() : { leaderboard: [] };
      const statusData = statusRes.ok ? await statusRes.json() : null;

      setQuestions(qData.questions || []);
      setLeaderboard(lbData.leaderboard || []);
      if (statusData) {
        setRound(statusData.round);
        setRoundStats(statusData.stats);
      } else {
        setRound(lbData.currentRound);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch question detail for modal
  const handleOpenDetail = async (qId: string) => {
    setSelectedQuestionId(qId);
    setDetailLoading(true);
    setIsEditingQuestion(false);
    try {
      const res = await fetch(`/api/admin/questions/${qId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setQuestionDetail(data.question);
        setEditFormData({
          title: data.question.title,
          category: data.question.category,
          difficulty: data.question.difficulty,
          points: data.question.points,
          firstBloodBonus: data.question.firstBloodBonus || 50,
          answer: data.question.answer,
          answerMode: data.question.answerMode,
        });
      }
    } catch (err) {
      console.error("Failed to load question details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseQuestion = async (qId: string) => {
    if (!confirm("Are you sure you want to CLOSE this question now? Submissions will be expired immediately.")) return;
    try {
      const res = await fetch(`/api/admin/questions/${qId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE" }),
      });
      if (!res.ok) throw new Error("Failed to close question");
      fetchData();
      handleOpenDetail(qId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionId) return;
    try {
      const res = await fetch(`/api/admin/questions/${selectedQuestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      if (!res.ok) throw new Error("Failed to update question");
      setIsEditingQuestion(false);
      fetchData();
      handleOpenDetail(selectedQuestionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateRoundStatus = async (status: string) => {
    if (!round?.id) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/round/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update round status");
      }
      setShowEndModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Batch management: Activate, Reset, Extend
  const handleActivateBatch = async (batchNumber: number = 1, resetAll: boolean = false) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/round-1/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: resetAll ? "RESET_ALL" : "ACTIVATE",
          batchNumber,
          durationMinutes: 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to activate batch");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendBatch = async (extraMinutes: number = 5) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/round-1/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "EXTEND",
          extraMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend batch");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !adjustReason.trim()) return;

    try {
      const res = await fetch("/api/admin/score-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId,
          points: adjustPoints,
          reason: adjustReason.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to adjust score");
      setShowAdjustModal(false);
      setAdjustPoints(0);
      setAdjustReason("");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Group questions by batch/time
  const activeQuestions = questions.filter(
    (q) => new Date(q.releaseAt) <= now && new Date(q.closeAt) > now && q.isActive
  );
  const upcomingQuestions = questions.filter((q) => new Date(q.releaseAt) > now && q.isActive);
  const closedQuestions = questions.filter((q) => new Date(q.closeAt) <= now || !q.isActive);

  // Group upcoming questions by batch
  const upcomingBatches = useMemo(() => {
    const batchesMap = new Map<number, typeof questions>();
    upcomingQuestions.forEach((q) => {
      const bNum = q.batchNumber || 1;
      const list = batchesMap.get(bNum) || [];
      list.push(q);
      batchesMap.set(bNum, list);
    });
    return Array.from(batchesMap.entries())
      .map(([batchNumber, batchQuestions]) => {
        const earliestRelease = new Date(
          Math.min(...batchQuestions.map((q) => new Date(q.releaseAt).getTime()))
        );
        const secondsUntil = Math.max(0, Math.ceil((earliestRelease.getTime() - now.getTime()) / 1000));
        return {
          batchNumber,
          questions: batchQuestions,
          earliestRelease,
          secondsUntil,
        };
      })
      .sort((a, b) => a.batchNumber - b.batchNumber);
  }, [upcomingQuestions, now]);

  // Current batch calculation
  const totalBatches = useMemo(() => {
    const bNums = questions.map((q) => q.batchNumber || 1);
    return bNums.length > 0 ? Math.max(...bNums) : 1;
  }, [questions]);

  const currentBatchNumber = activeQuestions.length > 0 ? (activeQuestions[0].batchNumber || 1) : 1;

  // Time remaining for currently active batch
  const activeBatchSecondsRemaining = useMemo(() => {
    if (activeQuestions.length === 0) return 0;
    const latestClose = new Date(Math.max(...activeQuestions.map((q) => new Date(q.closeAt).getTime())));
    return Math.max(0, Math.ceil((latestClose.getTime() - now.getTime()) / 1000));
  }, [activeQuestions, now]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLive = round?.status === "LIVE";
  const isPaused = round?.status === "PAUSED";
  const isFinished = round?.status === "FINISHED";

  return (
    <div className="space-y-8">
      {/* Top Operational Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            STAGE OPERATIONAL CONTROL
          </span>
          <h1 className="text-2xl font-bold font-mono text-white">ROUND 1 — THEMED CTF</h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleUpdateRoundStatus("LIVE")}
            disabled={actionLoading || isLive || isFinished}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-950/50"
          >
            <PlayCircle className="w-4 h-4" />
            START / RESUME
          </button>

          <button
            onClick={() => handleUpdateRoundStatus("PAUSED")}
            disabled={actionLoading || !isLive}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            <PauseCircle className="w-4 h-4" />
            PAUSE
          </button>

          <button
            onClick={() => setShowEndModal(true)}
            disabled={actionLoading || isFinished}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            END ROUND
          </button>
        </div>
      </div>

      {/* Round Status & Quick Batch Activation Bar */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
            CURRENT STATUS
          </span>
          <div className="text-3xl font-black font-mono text-white mt-1 flex items-center gap-3">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                isLive
                  ? "bg-emerald-400 animate-pulse"
                  : isPaused
                  ? "bg-amber-400"
                  : isFinished
                  ? "bg-rose-400"
                  : "bg-slate-400"
              }`}
            />
            {round?.status || "DRAFT"}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-xs font-mono text-slate-400 block">CURRENT BATCH</span>
            <span className="text-xl font-bold font-mono text-cyan-400">
              {activeQuestions.length > 0 ? `Batch ${currentBatchNumber} / ${totalBatches}` : "Idle"}
            </span>
          </div>
          <div className="text-center pl-6 border-l border-slate-800">
            <span className="text-xs font-mono text-slate-400 block">ACTIVE</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{activeQuestions.length} challenges</span>
          </div>
          <div className="text-center pl-6 border-l border-slate-800">
            <span className="text-xs font-mono text-slate-400 block">UPCOMING</span>
            <span className="text-xl font-bold font-mono text-purple-400">{upcomingQuestions.length} challenges</span>
          </div>
          <div className="text-center pl-6 border-l border-slate-800">
            <span className="text-xs font-mono text-slate-400 block">EXPIRED</span>
            <span className="text-xl font-bold font-mono text-slate-400">{closedQuestions.length} challenges</span>
          </div>
        </div>
      </div>

      {/* QUICK BATCH LAUNCH CONTROLS */}
      <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 font-mono text-xs text-slate-300">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span><strong>Batch Scheduling Controls:</strong> Launch batches or extend timers live:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleActivateBatch(1, true)}
            disabled={actionLoading}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            title="Reset Batch 1, 2, 3 timings starting from right now (15m each)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            START / RESET BATCH 1
          </button>

          <button
            onClick={() => handleActivateBatch(2, false)}
            disabled={actionLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono text-xs rounded-lg transition-colors"
          >
            ACTIVATE BATCH 2
          </button>

          <button
            onClick={() => handleActivateBatch(3, false)}
            disabled={actionLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono text-xs rounded-lg transition-colors"
          >
            ACTIVATE BATCH 3
          </button>

          <button
            onClick={() => handleExtendBatch(5)}
            disabled={actionLoading || activeQuestions.length === 0}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 disabled:opacity-30 font-mono text-xs rounded-lg transition-colors"
          >
            +5 MINS
          </button>
        </div>
      </div>

      {/* Main Grid: Batches on Left, Live Score Feed on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches Overview (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* CURRENT BATCH SECTION */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                  CURRENT BATCH
                </span>
                <h3 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Batch {currentBatchNumber} / {totalBatches}
                </h3>
              </div>

              {activeQuestions.length > 0 ? (
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">TIME REMAINING</span>
                  <span className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                    {formatTimer(activeBatchSecondsRemaining)}
                  </span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500">Batch Expired / Inactive</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {activeQuestions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => handleOpenDetail(q.id)}
                  className="p-4 bg-slate-950 border border-slate-800/90 hover:border-cyan-500/50 rounded-xl flex items-center justify-between text-xs font-mono cursor-pointer transition-all hover:bg-slate-900/80 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-400 font-bold group-hover:text-cyan-300">
                      Q{q.order.toString().padStart(2, "0")} — {q.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 font-normal">
                      {q.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* First Blood indicator */}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1 font-bold">
                      🩸 +{q.firstBloodBonus || 50} FB
                    </span>
                    <span className="text-cyan-300 font-bold">+{q.points}</span>
                    <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
                      {q.totalSolves || 0} solves
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
              ))}

              {activeQuestions.length === 0 && (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-slate-400 font-mono">
                    No questions currently active. Ready to launch the competition?
                  </p>
                  <button
                    onClick={() => handleActivateBatch(1, true)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    ACTIVATE BATCH 1 NOW
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* UPCOMING BATCHES SECTION */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold font-mono text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" /> UPCOMING BATCHES
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {upcomingBatches.length} queued
              </span>
            </div>

            {upcomingBatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingBatches.map((b) => (
                  <div
                    key={b.batchNumber}
                    className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        Batch {b.batchNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {b.questions.map((q) => `Q${q.order.toString().padStart(2, "0")}`).join(", ")} ({b.questions.length} questions)
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase">Starts in</span>
                        <span className="font-bold text-purple-300">
                          {formatTimer(b.secondsUntil)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleActivateBatch(b.batchNumber, false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-purple-600/30 border border-slate-700 hover:border-purple-500/50 text-slate-200 text-[11px] rounded-lg transition-colors"
                      >
                        Launch Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 font-mono text-xs">
                NO UPCOMING BATCHES
              </div>
            )}
          </div>
        </div>

        {/* Live Leaderboard (Right Col) */}
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                LIVE LEADERBOARD
              </h3>
              <button
                onClick={() => setShowAdjustModal(true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono rounded-lg transition-colors flex items-center gap-1"
              >
                <Sliders className="w-3.5 h-3.5" /> Adjust
              </button>
            </div>

            <div className="space-y-2">
              {leaderboard.map((team) => (
                <div
                  key={team.teamId}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-slate-500 font-bold">{team.rank}.</span>
                    <span className="text-white font-bold">{team.teamName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-bold">{team.score} pts</span>
                    <span className="text-slate-500 block text-[10px]">{team.solvesCount} solves</span>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-xs text-slate-500 font-mono py-4 text-center">No teams registered yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION DETAIL INSPECTION & SOLVES MODAL */}
      {selectedQuestionId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedQuestionId(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {detailLoading ? (
              <div className="py-12 text-center text-slate-400 font-mono text-sm">
                Loading challenge details...
              </div>
            ) : questionDetail ? (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">
                    CHALLENGE INSPECTION & LIVE SOLVE TRACKING
                  </span>
                  <h3 className="text-xl font-bold font-mono text-white mt-1">
                    {questionDetail.title}
                  </h3>
                </div>

                {/* FIRST BLOOD LIVE STATUS BANNER */}
                <div className="p-3.5 bg-slate-950 border border-rose-500/30 rounded-xl flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🩸</span>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        FIRST BLOOD TRACKER
                      </span>
                      {questionDetail.firstBlood ? (
                        <span className="text-rose-300 font-bold">
                          Claimed by <strong className="text-white">{questionDetail.firstBlood.teamName}</strong> at{" "}
                          {new Date(questionDetail.firstBlood.solvedAt).toLocaleTimeString()} (+{questionDetail.firstBlood.bonus} bonus)
                        </span>
                      ) : (
                        <span className="text-amber-300 font-bold">
                          AVAILABLE (+{questionDetail.firstBloodBonus || 50} pts bonus for 1st solver)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isEditingQuestion ? (
                  <form onSubmit={handleSaveEdit} className="space-y-4 font-mono text-xs">
                    <div>
                      <label className="block text-slate-400 uppercase mb-1">Title</label>
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 uppercase mb-1">Category</label>
                        <input
                          type="text"
                          value={editFormData.category}
                          onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 uppercase mb-1">Base Points</label>
                        <input
                          type="number"
                          value={editFormData.points}
                          onChange={(e) => setEditFormData({ ...editFormData, points: parseInt(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 uppercase mb-1">First Blood Bonus Pts</label>
                        <input
                          type="number"
                          value={editFormData.firstBloodBonus}
                          onChange={(e) => setEditFormData({ ...editFormData, firstBloodBonus: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-amber-300 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 uppercase mb-1">Difficulty</label>
                        <select
                          value={editFormData.difficulty}
                          onChange={(e) => setEditFormData({ ...editFormData, difficulty: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                        >
                          <option value="EASY">EASY</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HARD">HARD</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 uppercase mb-1">Flag Answer (Secret)</label>
                      <input
                        type="text"
                        value={editFormData.answer}
                        onChange={(e) => setEditFormData({ ...editFormData, answer: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-emerald-400 font-mono"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingQuestion(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono">
                      <div>
                        <span className="text-slate-500 uppercase block">Category:</span>
                        <span className="text-white font-bold">{questionDetail.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block">Difficulty:</span>
                        <span className="text-amber-400 font-bold">{questionDetail.difficulty}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block">Points:</span>
                        <span className="text-cyan-400 font-bold">+{questionDetail.points}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block">FB Bonus:</span>
                        <span className="text-rose-400 font-bold">+{questionDetail.firstBloodBonus || 50} pts</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono">
                      <span className="text-slate-400 block mb-1">Question Prompt:</span>
                      <p className="text-slate-200 whitespace-pre-wrap">{questionDetail.description}</p>
                    </div>

                    {/* Solves Chronological Mini-Leaderboard */}
                    <div>
                      <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2 font-bold flex items-center justify-between">
                        <span>LIVE SOLVES TRACKING ({questionDetail.solves?.length || 0})</span>
                      </h4>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {questionDetail.solves && questionDetail.solves.length > 0 ? (
                          questionDetail.solves.map((s: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-mono border ${
                                s.isFirstBlood
                                  ? "bg-rose-950/20 border-rose-500/40 text-white"
                                  : "bg-slate-950 border-slate-800/80 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 text-slate-500 font-bold">{idx + 1}.</span>
                                <span className="text-white font-bold">{s.teamName}</span>
                                {s.isFirstBlood && (
                                  <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] rounded font-bold">
                                    🩸 FIRST BLOOD
                                  </span>
                                )}
                                {s.solvedBy && (
                                  <span className="text-slate-500 text-[10px]">({s.solvedBy})</span>
                                )}
                              </div>
                              <span className="text-slate-400">
                                {new Date(s.solvedAt).toLocaleTimeString()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 font-mono py-2">No team solves yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Wrong Attempts Section */}
                    <div>
                      <h4 className="text-xs font-mono text-rose-400 uppercase tracking-wider mb-2 font-bold">
                        FAILED ATTEMPTS TELEMETRY
                      </h4>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {questionDetail.wrongAttempts && questionDetail.wrongAttempts.length > 0 ? (
                          questionDetail.wrongAttempts.map((w: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs font-mono"
                            >
                              <span className="text-slate-300">{w.teamName}</span>
                              <span className="text-rose-400 font-bold">{w.count} attempts</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 font-mono py-2">0 wrong attempts.</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setIsEditingQuestion(true)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          EDIT
                        </button>
                        {questionDetail.globalStatus === "ACTIVE" && (
                          <button
                            onClick={() => handleCloseQuestion(questionDetail.id)}
                            className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            CLOSE QUESTION
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedQuestionId(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* END ROUND 1 CONFIRMATION MODAL */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-mono text-white">END ROUND 1?</h3>
                <p className="text-xs text-slate-400 font-mono">
                  This will stop all Round 1 submissions.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
              <div className="text-slate-400 font-bold uppercase tracking-wider mb-2">Current:</div>
              <div className="flex justify-between text-slate-300">
                <span>Participating Teams:</span>
                <span className="text-white font-bold">{roundStats.teamsCount} teams</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Active/Total Questions:</span>
                <span className="text-white font-bold">{roundStats.questionsCount} questions</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Correct Solves:</span>
                <span className="text-emerald-400 font-bold">{roundStats.solvesCount} solves</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded-xl transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => handleUpdateRoundStatus("FINISHED")}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-rose-950/50"
              >
                {actionLoading ? "ENDING..." : "END ROUND"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL SCORE ADJUSTMENT MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAdjustModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold font-mono text-white mb-4">
              MANUAL SCORE ADJUSTMENT
            </h3>

            <form onSubmit={handleAdjustScore} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase mb-2">
                  Select Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">-- Choose a team --</option>
                  {leaderboard.map((t) => (
                    <option key={t.teamId} value={t.teamId}>
                      {t.teamName} (Current: {t.score} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase mb-2">
                  Points Adjustment (+/-)
                </label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. 50 or -50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase mb-2">
                  Reason for Audit Log
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  rows={3}
                  placeholder="e.g. Hint penalty, challenge defect compensation"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold rounded-xl transition-colors"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
