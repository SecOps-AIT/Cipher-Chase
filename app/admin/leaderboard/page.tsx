"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Trophy, Clock, Sparkles, Zap, Award, Timer, Users, Target, Activity, RefreshCw } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  score: number;
  qualified: boolean;
  round1Solved?: number;
  round1Total?: number;
  round1TimeRemaining?: number;
  round2Challenges?: number;
  scoreReachedAt?: string;
}

interface LeaderboardData {
  event: { id: string; name: string; status: string } | null;
  currentRound: { id: string; name: string; number: number; status: string } | null;
  leaderboard: LeaderboardEntry[];
  roundStats?: {
    totalQuestions: number;
    totalSolves: number;
    uniqueSolvers: number;
  };
  serverTime: string;
}

export default function AdminLeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [localTimers, setLocalTimers] = useState<{[teamId: string]: number}>({});

  const inFlightRef = useRef(false);

  const fetchLeaderboard = async () => {
    // Skip this tick if the previous request hasn't resolved yet — prevents
    // requests piling up unboundedly when the DB round-trip is slower than
    // the poll interval (e.g. cross-region latency).
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      const leaderboardData = await res.json();
      setData(leaderboardData);
      setError(null);

      // Initialize timers for Round 1
      if (leaderboardData.leaderboard) {
        const timers: {[teamId: string]: number} = {};
        leaderboardData.leaderboard.forEach((team: LeaderboardEntry) => {
          if (team.round1TimeRemaining !== undefined) {
            timers[team.teamId] = team.round1TimeRemaining;
          }
        });
        setLocalTimers(timers);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    if (autoRefresh) {
      const interval = setInterval(fetchLeaderboard, 3000); // Auto-refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Countdown timer effect for Round 1
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(teamId => {
          if (updated[teamId] > 0) {
            updated[teamId] = Math.max(0, updated[teamId] - 1);
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeSince = (timestamp: string): string => {
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const event = data?.event;
  const round = data?.currentRound;
  const leaderboard = data?.leaderboard || [];
  const roundStats = data?.roundStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            ADMIN VIEW • LIVE STANDINGS
          </span>
          <h1 className="text-2xl font-bold font-mono text-white">
            {event?.name || "CIPHER CHASE 2026"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 ${
              autoRefresh
                ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
                : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <Activity className={`w-4 h-4 ${autoRefresh ? "animate-pulse" : ""}`} />
            {autoRefresh ? "AUTO-REFRESH ON" : "AUTO-REFRESH OFF"}
          </button>

          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-400 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-300 font-mono text-sm">
          Error: {error}
        </div>
      )}

      {/* Round Status */}
      {round && (
        <div className="flex items-center gap-4">
          <div className="px-5 py-3 bg-slate-900 border border-slate-700 rounded-2xl flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase block">
                ACTIVE ROUND
              </span>
              <span className="text-sm font-bold font-mono text-white">
                {round.name} ({round.status})
              </span>
            </div>
          </div>

          {roundStats && round.number === 1 && (
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1 text-cyan-400">
                  <Target className="w-3 h-3" />
                  <span>{roundStats.totalSolves} solves</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Users className="w-3 h-3" />
                  <span>{roundStats.uniqueSolvers} teams</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-950 text-left border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider text-center">
                  Rank
                </th>
                <th className="px-6 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Team Name
                </th>
                <th className="px-6 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider text-center">
                  Score
                </th>
                {round?.number === 1 && (
                  <>
                    <th className="px-6 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider text-center">
                      Solved
                    </th>
                    <th className="px-6 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider text-center">
                      Time Left
                    </th>
                  </>
                )}
                <th className="px-6 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider text-center">
                  Last Update
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-mono">
                    Loading leaderboard...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-mono">
                    No teams registered yet
                  </td>
                </tr>
              ) : (
                leaderboard.map((team, idx) => {
                  const isTop1 = team.rank === 1;
                  const isTop3 = team.rank <= 3;

                  return (
                    <tr
                      key={team.teamId}
                      className={`border-t border-slate-800 transition-colors ${
                        isTop1
                          ? "bg-amber-500/5"
                          : isTop3
                          ? "bg-slate-800/30"
                          : "hover:bg-slate-950/50"
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          {isTop1 ? (
                            <Trophy className="w-6 h-6 text-amber-400" />
                          ) : isTop3 ? (
                            <Award className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <span className="text-lg font-bold font-mono text-slate-400">
                              {team.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Team Name */}
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-white">
                          {team.teamName}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-2xl font-bold font-mono text-cyan-400">
                          {team.score}
                        </span>
                      </td>

                      {/* Round 1 Progress */}
                      {round?.number === 1 && (
                        <>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-mono text-emerald-400">
                              {team.round1Solved || 0}/{team.round1Total || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {localTimers[team.teamId] !== undefined ? (
                              <span
                                className={`text-sm font-mono ${
                                  localTimers[team.teamId] < 300
                                    ? "text-red-400"
                                    : "text-slate-300"
                                }`}
                              >
                                {formatTimer(localTimers[team.teamId])}
                              </span>
                            ) : (
                              <span className="text-sm font-mono text-slate-500">--:--</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        {team.qualified ? (
                          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-full text-xs font-mono font-bold">
                            QUALIFIED
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-full text-xs font-mono">
                            COMPETING
                          </span>
                        )}
                      </td>

                      {/* Last Update */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-mono text-slate-500">
                          {team.scoreReachedAt ? getTimeSince(team.scoreReachedAt) : "--"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{autoRefresh ? "LIVE UPDATE • 3S INTERVAL" : "AUTO-REFRESH DISABLED"}</span>
        </div>
        {data?.serverTime && (
          <span>Server Time: {new Date(data.serverTime).toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}
