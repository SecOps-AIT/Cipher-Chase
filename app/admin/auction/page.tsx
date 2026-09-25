"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Gavel,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertCircle,
  Award,
  Users,
  Target,
  Search,
  Filter,
  RefreshCw,
  Check,
  ChevronRight,
  Shield,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import { formatTime, parseTimeToSeconds } from "@/lib/round2-auction";

interface AuctionQuestion {
  id: string;
  questionId: string;
  title: string;
  topic: string;
  outline: string;
  baseTimeSeconds: number;
  points: number; // Admin-set points, no bonus
  hintPenalty?: number; // Admin-set hint penalty
  status: "DRAFT" | "OPEN" | "CLOSED" | "SOLD";
  displayedAt: string | null;
  auctionClosedAt: string | null;
  bidCount: number;
  lowestBid: {
    teamName: string;
    bidTimeSeconds: number;
  } | null;
  sale: {
    teamName: string;
    winningBidSeconds: number;
    soldAt: string;
  } | null;
}

interface TeamOption {
  id: string;
  name: string;
  joinCode: string;
  score: number;
  qualified: boolean;
}

interface ActiveAssignment {
  id: string;
  teamName: string;
  questionTitle: string;
  topic: string;
  status: string;
  bidTime: number;
  startedAt: string | null;
  deadlineAt: string | null;
  timeRemaining: number | null;
  potentialBonus: number;
  outcome: string;
}

export default function AdminLiveAuctionPage() {
  const [auctionQuestions, setAuctionQuestions] = useState<AuctionQuestion[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<ActiveAssignment[]>([]);
  const [round2Id, setRound2Id] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lot Queue & Celebration Modal State
  const [queueOrder, setQueueOrder] = useState<string[]>([]);
  const [soldModalData, setSoldModalData] = useState<{
    isOpen: boolean;
    questionTitle: string;
    teamName: string;
    joinCode: string;
    bidTime: string;
    points: number; // Admin-set points (no bonus)
    potentialScore: number;
    penaltyPoints: number;
  } | null>(null);

  // Selected question for live auction
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "AVAILABLE" | "SOLD">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Settlement Form State
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [bidMinutes, setBidMinutes] = useState<number>(4);
  const [bidSeconds, setBidSeconds] = useState<number>(30);
  const [settleLoading, setSettleLoading] = useState(false);

  // View tab
  const [activeTab, setActiveTab] = useState<"auction" | "monitor">("auction");

  const loadDataInFlightRef = useRef(false);

  const loadData = useCallback(async () => {
    // Skip this tick if the previous request hasn't resolved yet — prevents
    // requests piling up unboundedly when the DB round-trip is slower than
    // the poll interval (e.g. cross-region latency).
    if (loadDataInFlightRef.current) return;
    loadDataInFlightRef.current = true;
    try {
      // 1. Fetch auction questions directly
      const aqRes = await fetch("/api/admin/auction/questions");
      if (aqRes.ok) {
        const { auctionQuestions: aqList } = await aqRes.json();
        setAuctionQuestions(aqList || []);
        if (aqList && aqList.length > 0) {
          if (!selectedQuestionId) {
            setSelectedQuestionId(aqList[0].id);
            setBidMinutes(Math.floor(aqList[0].baseTimeSeconds / 60));
            setBidSeconds(aqList[0].baseTimeSeconds % 60);
          }
          setQueueOrder((prev) => (prev.length === 0 ? aqList.map((q: AuctionQuestion) => q.id) : prev));
        }
      }

      // 2. Fetch active assignments for monitor
      const monRes = await fetch("/api/admin/auction/monitor");
      if (monRes.ok) {
        const { assignments } = await monRes.json();
        setActiveAssignments(assignments || []);
      }

      // 3. Fetch registered teams
      const teamsRes = await fetch("/api/admin/teams");
      if (teamsRes.ok) {
        const { teams: teamList } = await teamsRes.json();
        setTeams(teamList || []);
        const qual = (teamList || []).filter((t: TeamOption) => t.qualified);
        if (!selectedTeamId && qual.length > 0) {
          setSelectedTeamId(qual[0].id);
        } else if (!selectedTeamId && teamList && teamList.length > 0) {
          setSelectedTeamId(teamList[0].id);
        }
      }
    } catch (err: any) {
      console.error("Error loading auction data:", err);
      setError(err.message || "Failed to load live auction data");
    } finally {
      setLoading(false);
      loadDataInFlightRef.current = false;
    }
  }, [round2Id, selectedQuestionId, selectedTeamId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2500);
    return () => clearInterval(interval);
  }, [loadData]);

  // Qualified teams for Round 2 auction
  const qualifiedTeams = useMemo(() => teams.filter((t) => t.qualified), [teams]);

  // Selected Auction Question object
  const activeQuestion = useMemo(() => {
    return auctionQuestions.find((q) => q.id === selectedQuestionId) || null;
  }, [auctionQuestions, selectedQuestionId]);

  // When question changes, auto-set default bid time
  const handleSelectQuestion = (q: AuctionQuestion) => {
    setSelectedQuestionId(q.id);
    setSuccessMessage(null);
    if (q.status !== "SOLD") {
      // Suggest 80% of base time or base time
      const suggested = Math.max(30, q.baseTimeSeconds - 30);
      setBidMinutes(Math.floor(suggested / 60));
      setBidSeconds(suggested % 60);
    }
  };

  // Queue Navigators
  const handleShuffleQueue = () => {
    const shuffled = [...auctionQuestions].sort(() => Math.random() - 0.5).map((q) => q.id);
    setQueueOrder(shuffled);
    const nextQ =
      auctionQuestions.find((q) => q.id === shuffled[0] && q.status !== "SOLD") ||
      auctionQuestions.find((q) => q.status !== "SOLD");
    if (nextQ) {
      handleSelectQuestion(nextQ);
    }
  };

  const handleNextLot = () => {
    const available = auctionQuestions.filter((q) => q.status !== "SOLD");
    if (available.length === 0) {
      alert("All targets in the catalogue have been sold!");
      return;
    }
    const currentIndex = queueOrder.indexOf(selectedQuestionId);
    for (let i = 1; i <= queueOrder.length; i++) {
      const nextId = queueOrder[(currentIndex + i) % queueOrder.length];
      const candidate = auctionQuestions.find((q) => q.id === nextId && q.status !== "SOLD");
      if (candidate) {
        handleSelectQuestion(candidate);
        return;
      }
    }
    handleSelectQuestion(available[0]);
  };

  // Filtered catalogue
  const filteredQuestions = useMemo(() => {
    return auctionQuestions.filter((q) => {
      const matchesSearch =
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === "AVAILABLE") {
        return q.status !== "SOLD";
      }
      if (filterStatus === "SOLD") {
        return q.status === "SOLD";
      }
      return true;
    });
  }, [auctionQuestions, searchQuery, filterStatus]);

  // Settle / Sell Question to Team
  const handleSettleAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion) return;
    if (!selectedTeamId) {
      alert("Please select a winning team.");
      return;
    }

    const totalSeconds = bidMinutes * 60 + bidSeconds;
    if (totalSeconds < 15) {
      alert("Winning bid time must be at least 15 seconds.");
      return;
    }

    setSettleLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/auction/${activeQuestion.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winningTeamId: selectedTeamId,
          winningBidSeconds: totalSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to settle auction");
      }

      const teamObj = teams.find((t) => t.id === selectedTeamId);
      // NO BONUS CALCULATION - Admin-set points only
      const points = activeQuestion.points || 200; // Use admin-set points

      setSoldModalData({
        isOpen: true,
        questionTitle: activeQuestion.title,
        teamName: teamObj?.name || "Squad",
        joinCode: teamObj?.joinCode || "",
        bidTime: formatTime(totalSeconds),
        points: points, // Fixed points, no bonus
        potentialScore: points, // Same as points
        penaltyPoints: 0, // No penalty in new rules
      });

      setSuccessMessage(
        `✓ Sold "${activeQuestion.title}" to ${teamObj?.name || "Team"} for ${formatTime(
          totalSeconds
        )}! Question is now in squad dashboard in READY status.`
      );

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#00f0ff", "#10b981", "#f59e0b", "#ec4899"],
      });

      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to settle auction");
    } finally {
      setSettleLoading(false);
    }
  };

  // Quick Time Adjusters
  const adjustTime = (deltaSeconds: number) => {
    const current = bidMinutes * 60 + bidSeconds;
    const next = Math.max(30, current + deltaSeconds);
    setBidMinutes(Math.floor(next / 60));
    setBidSeconds(next % 60);
  };

  const soldCount = auctionQuestions.filter((q) => q.status === "SOLD").length;
  const availableCount = auctionQuestions.length - soldCount;
  const activeCount = activeAssignments.filter((a) => a.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block font-bold">
            STAGE 2 MANAGEMENT
          </span>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2.5">
            <Gavel className="w-6 h-6 text-amber-400" />
            ROUND 2 LIVE AUCTION DESK
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Catalogue: {auctionQuestions.length} Targets • {availableCount} Available • {soldCount} Sold • {activeCount} Active Missions
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab("auction")}
            className={`px-4 py-2 font-mono text-xs font-bold rounded-lg transition-all ${
              activeTab === "auction"
                ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Live Auction Stage
          </button>
          <button
            onClick={() => setActiveTab("monitor")}
            className={`px-4 py-2 font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "monitor"
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Live Mission Monitor</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TAB 1: LIVE AUCTION STAGE */}
      {activeTab === "auction" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: TARGET CATALOGUE (5 COLS) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                PREPARED TARGETS ({filteredQuestions.length})
              </h3>
              <button
                onClick={loadData}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                title="Refresh targets"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* LOT QUEUE CONTROLS */}
            <div className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={handleShuffleQueue}
                className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-mono text-[11px] font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                title="Shuffle queue randomly"
              >
                <span>🔀 SHUFFLE QUEUE</span>
              </button>
              <button
                type="button"
                onClick={handleNextLot}
                className="flex-1 py-1.5 px-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold rounded-lg border border-cyan-500/40 flex items-center justify-center gap-1 transition-colors"
                title="Put next available target on auction stage"
              >
                <span>NEXT LOT →</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search targets or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono">
                {(["ALL", "AVAILABLE", "SOLD"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                      filterStatus === st
                        ? "bg-slate-800 text-cyan-400 border border-slate-700"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {st === "ALL" ? `ALL (${auctionQuestions.length})` : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No targets found matching criteria
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isSelected = q.id === selectedQuestionId;
                  const isSold = q.status === "SOLD";

                  return (
                    <div
                      key={q.id}
                      onClick={() => handleSelectQuestion(q)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-800 border-cyan-400/80 shadow-md ring-1 ring-cyan-400/40"
                          : isSold
                          ? "bg-slate-950/60 border-slate-800/80 opacity-75 hover:opacity-100"
                          : "bg-slate-950/90 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                          {q.topic}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isSold ? (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold rounded">
                              SOLD
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold rounded">
                              AVAILABLE
                            </span>
                          )}
                          <span className="text-[11px] font-mono font-bold text-amber-300">
                            {q.points || 200} pts
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold font-mono text-white line-clamp-1">
                        {q.title}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 pt-1.5 border-t border-slate-900">
                        <span>Base: {formatTime(q.baseTimeSeconds)}</span>
                        {q.sale ? (
                          <span className="text-emerald-400 font-bold truncate max-w-[140px]">
                            → {q.sale.teamName} ({formatTime(q.sale.winningBidSeconds)})
                          </span>
                        ) : (
                          <span className="text-cyan-400 font-bold flex items-center gap-1">
                            Auction Now <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: SHOWCASE & RECORDING TERMINAL (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            {activeQuestion ? (
              <>
                {/* 1. Target Showcase Card */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
                          {activeQuestion.topic}
                        </span>
                        {activeQuestion.status === "SOLD" ? (
                          <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                            SOLD & ASSIGNED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                            READY FOR AUCTION
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold font-mono text-white">
                        {activeQuestion.title}
                      </h2>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                        BASE VALUE
                      </span>
                      <span className="text-2xl font-black font-mono text-amber-400">
                        {activeQuestion.points || 200}{" "}
                        <span className="text-xs text-slate-500 font-normal">PTS</span>
                      </span>
                    </div>
                  </div>

                  {/* Key Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Base Allotted Time
                      </span>
                      <span className="text-base font-bold font-mono text-cyan-400">
                        {formatTime(activeQuestion.baseTimeSeconds)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Base Points
                      </span>
                      <span className="text-base font-bold font-mono text-emerald-400">
                        +{activeQuestion.points || 200} pts
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Time Bid
                      </span>
                      <span className="text-base font-bold font-mono text-cyan-400">
                        {bidMinutes}:{bidSeconds.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Status
                      </span>
                      <span className="text-base font-bold font-mono text-slate-300">
                        NO PENALTY
                      </span>
                    </div>
                  </div>

                  {/* Outline / Description */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                      Target Overview & Objective:
                    </span>
                    <p className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl leading-relaxed font-sans">
                      {activeQuestion.outline}
                    </p>
                  </div>

                  {/* If Sold Already */}
                  {activeQuestion.sale && (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">
                          Current Owner
                        </span>
                        <h4 className="text-base font-bold font-mono text-white">
                          {activeQuestion.sale.teamName}
                        </h4>
                        <span className="text-xs text-slate-400 font-mono">
                          Winning Time: {formatTime(activeQuestion.sale.winningBidSeconds)} • Sold:{" "}
                          {new Date(activeQuestion.sale.soldAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold rounded-lg border border-emerald-500/30">
                        IN TEAM DASHBOARD
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. LIVE AUCTION SETTLEMENT TERMINAL */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                    <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                      <Gavel className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-mono text-white">
                        RECORD LIVE AUCTION SALE
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Select the team that won the verbal/hall auction and their committed time
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSettleAuction} className="space-y-5">
                    {/* Winning Team Selector - ONLY QUALIFIED TEAMS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider">
                          1. Winning Qualified Squad <span className="text-cyan-400">*</span>
                        </label>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {qualifiedTeams.length} Qualified Squads
                        </span>
                      </div>

                      {qualifiedTeams.length === 0 ? (
                        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300 flex items-center justify-between">
                          <span>No squads qualified yet from Round 1.</span>
                          <a
                            href="/admin/qualification"
                            className="px-2.5 py-1 bg-rose-500 text-slate-950 font-bold rounded hover:bg-rose-400 transition-colors"
                          >
                            Qualify Squads →
                          </a>
                        </div>
                      ) : (
                        <select
                          value={selectedTeamId}
                          onChange={(e) => setSelectedTeamId(e.target.value)}
                          required
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">-- Choose Winning Qualified Squad --</option>
                          {qualifiedTeams.map((t) => (
                            <option key={t.id} value={t.id}>
                              [{t.joinCode}] {t.name} (Round 1 Score: {t.score} pts)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Winning Time Input */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider">
                          2. Winning Committed Time (MM:SS) <span className="text-cyan-400">*</span>
                        </label>
                        <span className="text-xs font-mono text-cyan-400 font-bold">
                          Total: {bidMinutes * 60 + bidSeconds} seconds
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block mb-1">Minutes</span>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={bidMinutes}
                            onChange={(e) => setBidMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base text-center focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block mb-1">Seconds</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={bidSeconds}
                            onChange={(e) =>
                              setBidSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                            }
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base text-center focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>

                      {/* Quick Adjust Buttons */}
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <span className="text-[11px] font-mono text-slate-500">Presets:</span>
                        <button
                          type="button"
                          onClick={() => adjustTime(-30)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
                        >
                          -30s
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustTime(30)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
                        >
                          +30s
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBidMinutes(3);
                            setBidSeconds(0);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
                        >
                          3:00
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBidMinutes(4);
                            setBidSeconds(0);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
                        >
                          4:00
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBidMinutes(Math.floor(activeQuestion.baseTimeSeconds / 60));
                            setBidSeconds(activeQuestion.baseTimeSeconds % 60);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded font-mono text-xs"
                        >
                          Base ({formatTime(activeQuestion.baseTimeSeconds)})
                        </button>
                      </div>

                      {/* Live Telemetry Calculation Box */}
                      <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 mt-4">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-400">Base Time Allowed:</span>
                          <span className="text-white font-bold">{formatTime(activeQuestion.baseTimeSeconds)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-400">Winning Bid Time:</span>
                          <span className="text-cyan-400 font-bold">{formatTime(bidMinutes * 60 + bidSeconds)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-400">Time Reduced:</span>
                          <span className="text-amber-400 font-bold">
                            {Math.max(0, activeQuestion.baseTimeSeconds - (bidMinutes * 60 + bidSeconds))} seconds
                          </span>
                        </div>
                        <div className="h-px bg-slate-800 my-1" />
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-emerald-400 font-bold">Points if Solved:</span>
                          <span className="text-emerald-400 font-bold">
                            +{activeQuestion.points || 200} PTS
                            <span className="text-[10px] text-slate-500 ml-1">
                              (No time bonus)
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-rose-400 font-bold">Penalty if Failed / Expired:</span>
                          <span className="text-rose-400 font-bold">
                            -{Math.max(0, activeQuestion.baseTimeSeconds - (bidMinutes * 60 + bidSeconds))} PTS
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={settleLoading || !selectedTeamId}
                      className="w-full py-4 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black font-mono text-sm tracking-wider rounded-xl transition-all shadow-xl hover:shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Gavel className="w-5 h-5 fill-slate-950" />
                      <span>
                        {settleLoading
                          ? "RECORDING SALE & ASSIGNING..."
                          : activeQuestion.status === "SOLD"
                          ? "RE-ASSIGN / UPDATE WINNING SALE"
                          : "RECORD SALE & SEND TO TEAM"}
                      </span>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 font-mono text-sm">
                Select a target from the catalogue on the left to begin the auction
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE MISSION & ASSIGNMENT MONITOR */}
      {activeTab === "monitor" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                LIVE MISSION TIMERS & ASSIGNMENTS MONITOR
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Real-time tracking of team assignments, countdown deadlines, and solves
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {activeAssignments.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-sm">
              No active assignments recorded yet. Sell questions in the Live Auction Stage to begin missions!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Challenge Target</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Committed Time</th>
                    <th className="py-3 px-4 text-center">Time Remaining</th>
                    <th className="py-3 px-4 text-right">Potential Bonus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {activeAssignments.map((a) => {
                    const isReady = a.status === "READY";
                    const isActive = a.status === "ACTIVE";
                    const isCompleted = a.status === "COMPLETED";
                    const isExpired = a.outcome === "EXPIRED" || a.status === "FAILED";

                    return (
                      <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-4 font-bold text-white text-sm">
                          {a.teamName}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-200">{a.questionTitle}</div>
                          <div className="text-[11px] text-slate-500">{a.topic}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono ${
                              isCompleted
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : isExpired
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : isActive
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {isReady ? "READY (NOT STARTED)" : isExpired ? "EXPIRED" : a.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-white">
                          {formatTime(a.bidTime)}
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-sm">
                          {isActive && a.timeRemaining !== null ? (
                            <span className="text-cyan-400 font-mono">
                              {formatTime(a.timeRemaining)}
                            </span>
                          ) : isReady ? (
                            <span className="text-amber-400 font-mono text-[11px]">
                              Awaiting Click
                            </span>
                          ) : isCompleted ? (
                            <span className="text-emerald-400 font-mono text-[11px]">Solved</span>
                          ) : (
                            <span className="text-rose-400 font-mono text-[11px]">00:00</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-emerald-400">
                          +{a.potentialBonus} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TARGET SOLD CONGRATULATION POP-UP MODAL */}
      {soldModalData?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-emerald-500/80 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
                🎉
              </div>
              <span className="text-xs font-mono text-emerald-400 font-black uppercase tracking-widest block">
                CONGRATS! TARGET SOLD & DISPATCHED
              </span>
              <h3 className="text-xl font-bold font-mono text-white">
                {soldModalData.questionTitle}
              </h3>
            </div>

            <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Winning Squad:</span>
                <span className="text-cyan-300 font-bold">
                  [{soldModalData.joinCode}] {soldModalData.teamName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auctioned Solve Time:</span>
                <span className="text-white font-bold">{soldModalData.bidTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Potential Solve Payout:</span>
                <span className="text-emerald-400 font-bold">
                  +{soldModalData.potentialScore} PTS
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Failure Penalty Risk:</span>
                <span className="text-slate-400 font-bold">No Penalty</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Squad Console Status:</span>
                <span className="text-amber-400 font-bold">READY (Awaiting Team Open)</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSoldModalData(null);
                  handleNextLot();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-mono font-black text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <span>NEXT LOT IN QUEUE →</span>
              </button>
              <button
                onClick={() => setSoldModalData(null)}
                className="px-4 py-3 bg-slate-800 text-slate-300 font-mono text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
