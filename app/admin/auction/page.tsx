"use client";

import { useState, useEffect } from "react";
import {
  Gavel,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Award,
} from "lucide-react";
import { useChallengeTimer } from "@/hooks/useChallengeTimer";

export default function AdminAuctionPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [qualifiedTeams, setQualifiedTeams] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [committedMinutes, setCommittedMinutes] = useState<number>(8);
  const [committedSeconds, setCommittedSeconds] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/challenges", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load challenges");
      const data = await res.json();
      setChallenges(data.challenges || []);
      setQualifiedTeams(data.qualifiedTeams || []);
      if (!selectedChallengeId && data.challenges?.length > 0) {
        setSelectedChallengeId(data.challenges[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeChallenge = challenges.find((c) => c.id === selectedChallengeId);
  const { formattedTime, isExpired } = useChallengeTimer(activeChallenge?.deadlineAt);

  // Set verbal auction winner & committed time
  const handleSetWinner = async () => {
    if (!selectedChallengeId || !selectedTeamId) {
      alert("Please select a challenge and winning team.");
      return;
    }

    const totalSec = committedMinutes * 60 + committedSeconds;
    if (totalSec < 10) {
      alert("Committed time must be at least 10 seconds.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/auction/set-winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: selectedChallengeId,
          teamId: selectedTeamId,
          committedSeconds: totalSec,
        }),
      });
      if (!res.ok) throw new Error("Failed to set auction winner");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Start the challenge countdown
  const handleStartChallenge = async () => {
    if (!selectedChallengeId) return;
    if (!confirm("Start challenge countdown now? Authoritative timer will begin.")) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/auction/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: selectedChallengeId }),
      });
      if (!res.ok) throw new Error("Failed to start challenge");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark challenge success or failed
  const handleResolveChallenge = async (success: boolean) => {
    if (!selectedChallengeId) return;
    const actionName = success ? "SUCCESSFUL" : "FAILED";
    if (!confirm(`Mark this challenge as ${actionName}? Points/penalties will be authoritatively calculated.`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/auction/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: selectedChallengeId, success }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve challenge");

      if (success) {
        alert(`Success! Base: +${data.basePoints}, Speed Bonus: +${data.speedBonus}. Total: +${data.totalAwarded} pts!`);
      } else {
        alert(`Challenge marked failed. Penalty: -${data.penaltyDeducted} pts deducted.`);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-purple-400 uppercase tracking-widest block">
            ROUND 2 MANAGEMENT
          </span>
          <h1 className="text-2xl font-bold font-mono text-white">CYBER AUCTION ARENA</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            Qualified Teams: <strong className="text-white">{qualifiedTeams.length}</strong>
          </span>
        </div>
      </div>

      {qualifiedTeams.length === 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-300 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            No teams have been qualified for Round 2 yet. Please visit the <strong>Qualification</strong> page to qualify the Top N teams first.
          </span>
        </div>
      )}

      {/* Challenge Selector Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {challenges.map((c, idx) => (
          <button
            key={c.id}
            onClick={() => setSelectedChallengeId(c.id)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-colors whitespace-nowrap ${
              selectedChallengeId === c.id
                ? "bg-purple-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            #{idx + 1}: {c.title.split("—")[0]} ({c.status})
          </button>
        ))}
      </div>

      {activeChallenge && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Auction Winner Configuration & Timer */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-mono text-white">
                  {activeChallenge.title}
                </h3>
                <span className="px-3 py-1 bg-slate-800 text-cyan-400 font-mono text-xs rounded-full">
                  STATUS: {activeChallenge.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {activeChallenge.description}
              </p>

              <div className="pt-2 flex items-center gap-4 text-xs font-mono text-slate-400">
                <span>Base Reward: <strong className="text-emerald-400">+{activeChallenge.basePoints} pts</strong></span>
                <span>•</span>
                <span>Failure Penalty: <strong className="text-rose-400">-{activeChallenge.failurePenalty} pts</strong></span>
              </div>
            </div>

            {/* Auction Bidding Input Form */}
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
              <h4 className="text-xs font-mono text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Gavel className="w-4 h-4" /> VERBAL AUCTION WINNER & COMMITTED TIME
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase mb-2">
                    Winning Team (Qualified)
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                  >
                    <option value="">-- Select Winner --</option>
                    {qualifiedTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Wallet: {t.wallet} pts)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase mb-2">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={committedMinutes}
                      onChange={(e) => setCommittedMinutes(parseInt(e.target.value || "0", 10))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase mb-2">
                      Seconds
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={committedSeconds}
                      onChange={(e) => setCommittedSeconds(parseInt(e.target.value || "0", 10))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSetWinner}
                  disabled={actionLoading || !selectedTeamId}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl transition-colors"
                >
                  SET WINNER
                </button>

                <button
                  onClick={handleStartChallenge}
                  disabled={
                    actionLoading ||
                    !activeChallenge.winningTeamId ||
                    activeChallenge.status === "LIVE"
                  }
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-cyan-glow"
                >
                  <Play className="w-3.5 h-3.5" />
                  START CHALLENGE TIMER
                </button>
              </div>
            </div>

            {/* Live Timer & Resolution Card */}
            {activeChallenge.status === "LIVE" && (
              <div className="p-6 bg-slate-950 border border-purple-500/40 rounded-2xl text-center space-y-4 shadow-purple-glow">
                <span className="text-xs font-mono text-purple-300 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-400" /> LIVE CHALLENGE COUNTDOWN
                </span>
                <div className="text-6xl font-black font-mono tracking-tight text-white font-mono-num">
                  {isExpired ? "TIME EXPIRED" : formattedTime}
                </div>

                {/* Mark Success / Failed Buttons */}
                <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => handleResolveChallenge(true)}
                    disabled={actionLoading}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-xl flex items-center gap-2 shadow-neon-glow"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    MARK SUCCESS (BASE + SPEED BONUS)
                  </button>

                  <button
                    onClick={() => handleResolveChallenge(false)}
                    disabled={actionLoading}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-xs rounded-xl flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    MARK FAILED (-{activeChallenge.failurePenalty} PTS)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Hints Configuration */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-400" /> CHALLENGE HINTS & COSTS
            </h4>

            <div className="space-y-3">
              {activeChallenge.hints && activeChallenge.hints.length > 0 ? (
                activeChallenge.hints.map((h: any) => (
                  <div key={h.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-white">{h.title}</span>
                      <span className="text-xs font-mono text-amber-400">{h.cost} pts</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono leading-relaxed bg-slate-950 p-2 rounded border border-slate-800">
                      {h.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs font-mono text-slate-500">No hints found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
