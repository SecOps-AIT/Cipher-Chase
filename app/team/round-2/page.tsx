"use client";

import { useState, useEffect, useRef } from "react";
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
  Timer,
  Gavel,
  Eye,
  Target,
  TrendingUp,
  DollarSign,
  Play,
  Square,
  Lightbulb,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useTeamState } from "@/hooks/useTeamState";
import { formatTime, parseTimeToSeconds } from "@/lib/round2-auction";
import { useAuctionTimers } from "@/hooks/useAuctionTimers";
import { AuctionTimer, TimerBadge } from "@/components/AuctionTimer";
import { CommandHeader } from "@/components/ui/CommandHeader";

interface LiveAuction {
  id: string;
  title: string;
  topic: string;
  outline: string;
  baseTimeSeconds: number;
  points: number; // Admin-set points (no bonus)
  status: "DRAFT" | "OPEN" | "CLOSED" | "SOLD";
  bidCount: number;
  lowestBid: {
    teamName: string;
    bidTimeSeconds: number;
  } | null;
  userBid: {
    bidTimeSeconds: number;
    submittedAt: string;
  } | null;
}

interface TeamAssignment {
  id: string;
  questionTitle: string;
  topic: string;
  status: "READY" | "ACTIVE" | "COMPLETED" | "FAILED";
  bidTimeSeconds: number;
  startedAt: string | null;
  deadlineAt: string | null;
  timeRemaining: number | null;
  potentialBonus: number;
  outcome: string;
  question?: {
    id: string;
    description: string;
    difficulty: string;
    category: string;
    hints?: Array<{
      id: string;
      title: string;
      cost: number;
      order: number;
      isClaimed: boolean;
      content: string | null;
      claimedAt: string | null;
    }>;
  } | null;
}

export default function TeamRound2Page() {
  const router = useRouter();
  const { state: teamState, loading: teamLoading, refresh: refreshTeam } = useTeamState(2000);
  
  // Server time sync for accurate timers
  const [serverTime, setServerTime] = useState<Date | null>(null);

  // Auction state
  const [liveAuctions, setLiveAuctions] = useState<LiveAuction[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bidding modal state
  const [selectedAuction, setSelectedAuction] = useState<LiveAuction | null>(null);
  const [bidTimeInput, setBidTimeInput] = useState("4:30"); // MM:SS format
  const [bidLoading, setBidLoading] = useState(false);
  const [bidFeedback, setBidFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Question modal state
  const [selectedAssignment, setSelectedAssignment] = useState<TeamAssignment | null>(null);
  const [flagInput, setFlagInput] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    success: boolean;
    message: string;
    isCorrect?: boolean;
    points?: number;
  } | null>(null);

  // Hint state
  const [claimingHintId, setClaimingHintId] = useState<string | null>(null);
  const [hintFeedback, setHintFeedback] = useState<string | null>(null);

  // Load auction data for team
  useEffect(() => {
    if (teamState?.team) {
      loadAuctionData();
      
      // Set up polling for real-time updates
      const interval = setInterval(loadAuctionData, 2500);
      return () => clearInterval(interval);
    }
  }, [teamState?.team]);

  const loadAuctionDataInFlightRef = useRef(false);

  const loadAuctionData = async () => {
    // Skip this tick if the previous request hasn't resolved yet — prevents
    // requests piling up unboundedly when the DB round-trip is slower than
    // the poll interval (e.g. cross-region latency).
    if (loadAuctionDataInFlightRef.current) return;
    loadAuctionDataInFlightRef.current = true;
    try {
      setError(null);

      // Load server time for timer sync
      const timeRes = await fetch("/api/auction/time");
      if (timeRes.ok) {
        const { serverTime: serverTimeStr } = await timeRes.json();
        setServerTime(new Date(serverTimeStr));
      }

      // Load live auctions
      const auctionsRes = await fetch("/api/auction/live");
      if (auctionsRes.ok) {
        const { auctions } = await auctionsRes.json();
        setLiveAuctions(auctions || []);
      }

      // Load team assignments
      const assignmentsRes = await fetch("/api/auction/assignments");
      if (assignmentsRes.ok) {
        const { assignments } = await assignmentsRes.json();
        setAssignments(assignments || []);
      }

    } catch (error) {
      console.error("Error loading auction data:", error);
      setError("Failed to load auction data");
    } finally {
      setLoading(false);
      loadAuctionDataInFlightRef.current = false;
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/team/join");
  };

  // Handle bidding
  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuction || !bidTimeInput.trim()) return;

    setBidLoading(true);
    setBidFeedback(null);

    try {
      const bidTimeSeconds = parseTimeToSeconds(bidTimeInput);
      
      const res = await fetch("/api/auction/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auctionQuestionId: selectedAuction.id,
          bidTimeSeconds
        })
      });

      const data = await res.json();

      if (res.ok) {
        setBidFeedback({
          success: true,
          message: data.message || "Bid submitted successfully!"
        });
        setBidTimeInput("4:30");
        setSelectedAuction(null);
        loadAuctionData();
        refreshTeam();
      } else {
        setBidFeedback({
          success: false,
          message: data.error || "Failed to submit bid"
        });
      }
    } catch (error) {
      console.error("Error submitting bid:", error);
      setBidFeedback({
        success: false,
        message: "Network error. Please try again."
      });
    } finally {
      setBidLoading(false);
    }
  };

  // Handle starting a question
  const handleStartQuestion = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/auction/assignments/${assignmentId}/start`, {
        method: "POST"
      });

      if (res.ok) {
        // Starting the assignment begins its timer. Fetch the question only after
        // that action so a team cannot read it before choosing to start.
        const questionRes = await fetch(`/api/auction/assignments/${assignmentId}/question`);
        if (!questionRes.ok) throw new Error("Question could not be opened");
        const questionData = await questionRes.json();
        const assignmentsRes = await fetch("/api/auction/assignments");
        if (assignmentsRes.ok) {
          const { assignments: fresh } = await assignmentsRes.json();
          setAssignments(fresh || []);
          const target = fresh?.find((a: any) => a.id === assignmentId);
          if (target) {
            setSelectedAssignment({
              ...target,
              timeRemaining: questionData.timer?.timeRemaining ?? target.timeRemaining,
              question: questionData.question,
            });
            setFlagInput("");
            setSubmitFeedback(null);
          }
        }
        refreshTeam();
      } else {
        const { error } = await res.json();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error("Error starting question:", error);
      alert("Error starting question");
    }
  };

  // Handle flag submission
  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !flagInput.trim()) return;

    setSubmitLoading(true);
    setSubmitFeedback(null);

    try {
      const res = await fetch(`/api/auction/assignments/${selectedAssignment.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: flagInput.trim()
        })
      });

      const data = await res.json();

      if (res.ok && (data.isCorrect || data.result?.isCorrect)) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#00f0ff", "#00ff66", "#9d4edd"],
        });
        const pointsAwarded = data.totalPoints ?? data.scoreChange ?? data.result?.scoreChange ?? 0;
        setSubmitFeedback({
          success: true,
          isCorrect: true,
          points: pointsAwarded,
          message: `Target breached successfully! +${pointsAwarded} points awarded.`
        });
        setFlagInput("");
        setSelectedAssignment(null);
        loadAuctionData();
        refreshTeam();
      } else if (!data.isCorrect) {
        setSubmitFeedback({
          success: false,
          isCorrect: false,
          message: data.message || "Incorrect flag. Try again!"
        });
      } else {
        setSubmitFeedback({
          success: false,
          message: data.error || "Submission failed"
        });
      }
    } catch (error) {
      console.error("Error submitting flag:", error);
      setSubmitFeedback({
        success: false,
        message: "Network error. Please try again."
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle hint claiming
  const handleClaimHint = async (hintId: string) => {
    if (!selectedAssignment) return;

    setClaimingHintId(hintId);
    setHintFeedback(null);

    try {
      const res = await fetch(`/api/auction/assignments/${selectedAssignment.id}/hints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hintId })
      });

      const data = await res.json();

      if (res.ok) {
        setHintFeedback(data.message);
        // Update the assignment with new hint data
        if (selectedAssignment.question && selectedAssignment.question.hints) {
          const updatedHints = selectedAssignment.question.hints.map(h =>
            h.id === hintId
              ? { ...h, isClaimed: true, content: data.hint.content, claimedAt: data.hint.claimedAt }
              : h
          );
          setSelectedAssignment({
            ...selectedAssignment,
            question: {
              ...selectedAssignment.question,
              hints: updatedHints
            }
          });
        }
        refreshTeam();
      } else {
        setHintFeedback(data.error || "Failed to claim hint");
      }
    } catch (error) {
      console.error("Error claiming hint:", error);
      setHintFeedback("Network error. Please try again.");
    } finally {
      setClaimingHintId(null);
    }
  };

  const getAuctionStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { bg: "bg-slate-600/20", text: "text-slate-300", border: "border-slate-600/30" },
      OPEN: { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-500/30" },
      CLOSED: { bg: "bg-yellow-500/20", text: "text-yellow-300", border: "border-yellow-500/30" },
      SOLD: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${config.bg} ${config.text} border ${config.border}`}>
        {status}
      </span>
    );
  };

  const getAssignmentStatusBadge = (status: string, outcome: string) => {
    if (outcome === "EXPIRED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          EXPIRED
        </span>
      );
    }
    
    const statusConfig = {
      READY: { bg: "bg-slate-600/20", text: "text-slate-300", border: "border-slate-600/30" },
      ACTIVE: { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-500/30" },
      COMPLETED: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" },
      FAILED: { bg: "bg-rose-500/20", text: "text-rose-300", border: "border-rose-500/30" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.READY;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${config.bg} ${config.text} border ${config.border}`}>
        {status}
      </span>
    );
  };

  if (teamLoading || loading) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-cyan-400 tracking-wider">CONNECTING TO AUCTION ARENA...</p>
        </div>
      </div>
    );
  }

  if (!teamState?.team?.qualified) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center">
          <Lock className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-mono text-white mb-2">ROUND 2 LOCKED</h2>
          <p className="text-sm text-slate-400 mb-6">Your team needs to qualify in Round 1 first.</p>
          <Link
            href="/team/round-1"
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-sm rounded-xl inline-block"
          >
            RETURN TO ROUND 1
          </Link>
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
    <div className="min-h-screen vault-bg flex flex-col">
      {/* Operational Tactical Command Bar */}
      <CommandHeader
        teamName={team.name}
        joinCode={team.joinCode}
        memberName={team.currentMember}
        memberCount={team.members?.length || 1}
        maxMembers={3}
        score={team.score}
        roundNumber={2}
        roundTitle="TIME AUCTION"
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
                ROUND 2 — TIME AUCTION
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs rounded-full">
              STATUS: {currentRound?.status || "LIVE"}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Assignments: <strong className="text-white">{assignments.length}</strong>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Your Assignments Section */}
        {assignments.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  YOUR PURCHASED CHALLENGES
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Questions you won in auctions — solve within your committed time to earn bonuses
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {assignments.map((assignment) => {
                const isActive = assignment.status === "ACTIVE";
                const isReady = assignment.status === "READY";
                const isCompleted = assignment.status === "COMPLETED";
                const isFailed = assignment.status === "FAILED" || assignment.outcome === "EXPIRED";

                return (
                  <div
                    key={assignment.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCompleted
                        ? "bg-emerald-950/20 border-emerald-500/40 shadow-neon-glow"
                        : isFailed
                        ? "bg-rose-950/20 border-rose-500/40"
                        : isActive
                        ? "bg-slate-900/80 border-cyan-500/50 shadow-cyan-glow"
                        : "bg-slate-900/80 border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getAssignmentStatusBadge(assignment.status, assignment.outcome)}
                          <span className="text-xs font-mono text-slate-400">
                            {assignment.topic}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold font-mono text-white">
                          {assignment.questionTitle}
                        </h4>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-slate-400">YOUR BID</p>
                        <p className="text-lg font-bold text-cyan-400 font-mono">
                          {formatTime(assignment.bidTimeSeconds)}
                        </p>
                      </div>
                    </div>

                    {isActive && assignment.timeRemaining !== null && (
                      <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400 uppercase">TIME REMAINING</span>
                          <span className={`text-2xl font-bold font-mono ${
                            assignment.timeRemaining > 0 ? "text-cyan-400" : "text-rose-400"
                          }`}>
                            {assignment.timeRemaining > 0 
                              ? formatTime(assignment.timeRemaining)
                              : "EXPIRED"
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs font-mono text-slate-400">POTENTIAL BONUS</p>
                          <p className="text-sm font-bold text-emerald-400 font-mono">
                            +{assignment.potentialBonus} pts
                          </p>
                        </div>
                        {assignment.startedAt && (
                          <div>
                            <p className="text-xs font-mono text-slate-400">STARTED</p>
                            <p className="text-xs font-mono text-slate-300">
                              {new Date(assignment.startedAt).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {isReady && (
                        <button
                          onClick={() => handleStartQuestion(assignment.id)}
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          START CHALLENGE
                        </button>
                      )}

                      {isActive && (
                        <button
                          onClick={async () => {
                            const questionRes = await fetch(`/api/auction/assignments/${assignment.id}/question`);
                            if (!questionRes.ok) return;
                            const data = await questionRes.json();
                            setSelectedAssignment({ ...assignment, timeRemaining: data.timer?.timeRemaining ?? assignment.timeRemaining, question: data.question });
                            setSubmitFeedback(null);
                            setFlagInput("");
                          }}
                          className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:text-white font-mono text-xs font-bold rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Target className="w-4 h-4" />
                          SOLVE CHALLENGE
                        </button>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          COMPLETED
                        </div>
                      )}

                      {isFailed && (
                        <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold">
                          <X className="w-4 h-4" />
                          {assignment.outcome === "EXPIRED" ? "TIME EXPIRED" : "FAILED"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Live Auctions Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-cyan-400" />
                LIVE AUCTIONS
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Bid TIME not money — lowest valid time wins the challenge
              </p>
            </div>
          </div>

          {liveAuctions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveAuctions.map((auction) => {
                const isOpen = auction.status === "OPEN";
                const isClosed = auction.status === "CLOSED";
                const isSold = auction.status === "SOLD";
                const hasBid = auction.userBid !== null;

                return (
                  <div
                    key={auction.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isSold
                        ? "bg-slate-900/30 border-slate-800/40 opacity-60"
                        : isClosed
                        ? "bg-yellow-950/20 border-yellow-500/40"
                        : hasBid
                        ? "bg-cyan-950/20 border-cyan-500/40 shadow-cyan-glow"
                        : "bg-slate-900/80 border-slate-800 hover:border-cyan-500/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getAuctionStatusBadge(auction.status)}
                          <span className="text-xs font-mono text-slate-400">
                            {auction.topic}
                          </span>
                        </div>
                        <h4 className="text-base font-bold font-mono text-white mb-1">
                          {auction.title}
                        </h4>
                        <p className="text-xs text-slate-300 font-mono line-clamp-2">
                          {auction.outline}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Base Time:</span>
                        <span className="text-white font-bold">{formatTime(auction.baseTimeSeconds)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Points:</span>
                        <span className="text-emerald-400 font-bold">{auction.points} pts</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Total Bids:</span>
                        <span className="text-cyan-400 font-bold">{auction.bidCount}</span>
                      </div>
                    </div>

                    {auction.lowestBid && (
                      <div className="mb-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <p className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider mb-1">
                          CURRENT LEADER
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-white font-bold truncate">
                            {auction.lowestBid.teamName}
                          </span>
                          <span className="text-sm font-bold text-cyan-400 font-mono">
                            {formatTime(auction.lowestBid.bidTimeSeconds)}
                          </span>
                        </div>
                      </div>
                    )}

                    {hasBid && auction.userBid && (
                      <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <p className="text-[10px] font-mono text-purple-300 uppercase tracking-wider mb-1">
                          YOUR BID
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            {new Date(auction.userBid.submittedAt).toLocaleTimeString()}
                          </span>
                          <span className="text-sm font-bold text-purple-400 font-mono">
                            {formatTime(auction.userBid.bidTimeSeconds)}
                          </span>
                        </div>
                      </div>
                    )}

                    {isOpen && (
                      <button
                        onClick={() => {
                          setSelectedAuction(auction);
                          setBidFeedback(null);
                          setBidTimeInput(formatTime(Math.floor(auction.baseTimeSeconds * 0.9)));
                        }}
                        className="w-full py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:text-white font-mono text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Gavel className="w-4 h-4" />
                        {hasBid ? "UPDATE BID" : "PLACE BID"}
                      </button>
                    )}

                    {isClosed && (
                      <div className="text-center py-2 text-xs font-mono text-yellow-400">
                        BIDDING CLOSED — AWAITING SETTLEMENT
                      </div>
                    )}

                    {isSold && (
                      <div className="text-center py-2 text-xs font-mono text-slate-500">
                        SOLD TO ANOTHER TEAM
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-slate-400 font-mono text-xs">
              <Timer className="w-8 h-8 mx-auto mb-3 text-slate-500" />
              <p>No active auctions at the moment.</p>
              <p className="text-[10px] text-slate-500 mt-1">Check back soon for new challenges!</p>
            </div>
          )}
        </section>

        {/* Info Box */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
          <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" /> HOW IT WORKS
          </h4>
          <ul className="space-y-1 text-xs text-slate-300 font-mono">
            <li>• Bid the TIME you think you can solve a challenge in (not money)</li>
            <li>• LOWEST valid time wins the auction</li>
            <li>• Timer starts when ANY team member first opens the challenge</li>
            <li>• Solve within your bid time to earn a speed bonus</li>
            <li>• Miss the deadline and you&apos;ll lose points</li>
          </ul>
        </div>
      </main>

      {/* Bidding Modal */}
      {selectedAuction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedAuction(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-mono text-white">PLACE YOUR BID</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedAuction.title}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Topic:</span>
                  <span className="text-white">{selectedAuction.topic}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Base Time:</span>
                  <span className="text-cyan-400 font-bold">{formatTime(selectedAuction.baseTimeSeconds)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Points:</span>
                  <span className="text-emerald-400 font-bold">{selectedAuction.points} pts</span>
                </div>
              </div>

              {selectedAuction.lowestBid && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-xs font-mono text-cyan-300 uppercase tracking-wider mb-1">
                    CURRENT LOWEST BID TO BEAT
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-white">{selectedAuction.lowestBid.teamName}</span>
                    <span className="text-lg font-bold text-cyan-400 font-mono">
                      {formatTime(selectedAuction.lowestBid.bidTimeSeconds)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {bidFeedback && (
              <div
                className={`mb-5 p-3.5 rounded-xl border flex items-start gap-3 text-xs font-mono ${
                  bidFeedback.success
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/40 text-rose-300"
                }`}
              >
                {bidFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{bidFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  YOUR TIME BID (MM:SS) <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="4:30"
                  value={bidTimeInput}
                  onChange={(e) => setBidTimeInput(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-lg tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors text-center"
                />
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Format: MM:SS (e.g., 4:30 for 4 minutes 30 seconds)
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAuction(null)}
                  className="px-4 py-2.5 text-xs font-mono text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={bidLoading || !bidTimeInput.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center gap-2 shadow-cyan-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {bidLoading ? (
                    <span>SUBMITTING...</span>
                  ) : (
                    <>
                      <span>SUBMIT BID</span>
                      <Gavel className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question/Answer Modal */}
      {selectedAssignment && selectedAssignment.question && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedAssignment(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {selectedAssignment.question.category}
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                {selectedAssignment.question.difficulty}
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400 ml-auto">
                BID: {formatTime(selectedAssignment.bidTimeSeconds)}
              </span>
            </div>

            <h3 className="text-xl font-bold font-mono text-white mb-2">
              {selectedAssignment.questionTitle}
            </h3>

            {selectedAssignment.timeRemaining !== null && (
              <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> TIME REMAINING
                  </span>
                  <span className={`text-xl font-bold font-mono ${
                    selectedAssignment.timeRemaining > 0 ? "text-cyan-400" : "text-rose-400"
                  }`}>
                    {selectedAssignment.timeRemaining > 0 
                      ? formatTime(selectedAssignment.timeRemaining)
                      : "EXPIRED"
                    }
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl mb-6 text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {selectedAssignment.question.description}
            </div>

            {/* Hints Section */}
            {selectedAssignment.question.hints && selectedAssignment.question.hints.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" /> PROGRESSIVE HINTS
                </h4>

                {hintFeedback && (
                  <div className="mb-3 p-2.5 bg-purple-500/10 border border-purple-500/30 text-xs font-mono text-purple-300 rounded-lg">
                    {hintFeedback}
                  </div>
                )}

                <div className="space-y-2">
                  {selectedAssignment.question.hints.map((hint) => (
                    <div
                      key={hint.id}
                      className={`p-3 rounded-lg border transition-all ${
                        hint.isClaimed
                          ? "bg-purple-950/20 border-purple-500/40"
                          : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-white">
                          {hint.title}
                        </span>
                        <span className="text-xs font-mono text-amber-400">
                          -{hint.cost} pts
                        </span>
                      </div>

                      {hint.isClaimed && hint.content ? (
                        <p className="text-xs text-purple-200 font-mono leading-relaxed p-2 bg-purple-900/30 rounded border border-purple-800/40">
                          {hint.content}
                        </p>
                      ) : (
                        <button
                          onClick={() => handleClaimHint(hint.id)}
                          disabled={claimingHintId === hint.id || (teamState?.team?.score ?? 0) < hint.cost}
                          className="w-full py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-mono text-xs rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {claimingHintId === hint.id
                            ? "UNLOCKING..."
                            : (teamState?.team?.score ?? 0) < hint.cost
                            ? "INSUFFICIENT SCORE"
                            : `UNLOCK (-${hint.cost} pts)`}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            <form onSubmit={handleSubmitFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Submit Flag / Solution
                </label>
                <input
                  type="text"
                  placeholder="FLAG{...}"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
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
