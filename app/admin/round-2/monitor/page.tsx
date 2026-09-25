"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  Pause,
  Trophy,
  TrendingUp
} from "lucide-react";

interface Assignment {
  id: string;
  questionTitle: string;
  topic: string;
  points: number;
  status: string;
  bidTimeSeconds: number;
  startedAt: string | null;
  deadlineAt: string | null;
  completedAt: string | null;
  timeRemaining: number | null;
  progress: number;
  finalScore: number;
}

interface TeamMonitoring {
  teamId: string;
  teamName: string;
  joinCode: string;
  currentScore: number;
  hintsUsedR2: number;
  assignments: Assignment[];
  stats: {
    total: number;
    ready: number;
    active: number;
    completed: number;
    failed: number;
    totalPoints: number;
  };
}

interface MonitoringData {
  timestamp: string;
  overallStats: {
    totalQualifiedTeams: number;
    totalAssignments: number;
    readyCount: number;
    activeCount: number;
    completedCount: number;
    failedCount: number;
  };
  teams: TeamMonitoring[];
}

export default function Round2MonitorPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const inFlightRef = useRef(false);

  const fetchData = async () => {
    // Skip this tick if the previous request hasn't resolved yet — prevents
    // requests piling up unboundedly when the DB round-trip is slower than
    // the poll interval (e.g. cross-region latency).
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch("/api/admin/round-2/monitor");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch monitoring data:", error);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatBidTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "READY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-xs font-mono">
            <Pause className="w-3 h-3" /> READY
          </span>
        );
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-xs font-mono">
            <PlayCircle className="w-3 h-3" /> ACTIVE
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-xs font-mono">
            <CheckCircle2 className="w-3 h-3" /> SOLVED
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-xs font-mono">
            <XCircle className="w-3 h-3" /> FAILED
          </span>
        );
      default:
        return <span className="text-slate-500 text-xs">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading monitoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <p className="text-slate-400">Failed to load monitoring data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-mono text-cyan-400">
                Round 2 Monitoring
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Real-time tracking of purchased questions and team progress
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
                autoRefresh
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
            </button>
            <button
              onClick={fetchData}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 uppercase font-mono">Teams</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {data.overallStats.totalQualifiedTeams}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 uppercase font-mono">Total</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {data.overallStats.totalAssignments}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Pause className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400 uppercase font-mono">Ready</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {data.overallStats.readyCount}
            </div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-cyan-400 uppercase font-mono">Active</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {data.overallStats.activeCount}
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400 uppercase font-mono">Solved</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {data.overallStats.completedCount}
            </div>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span className="text-xs text-rose-400 uppercase font-mono">Failed</span>
            </div>
            <div className="text-2xl font-bold text-rose-400">
              {data.overallStats.failedCount}
            </div>
          </div>
        </div>

        {/* Team Details */}
        <div className="space-y-4">
          {data.teams.map((team) => (
            <div
              key={team.teamId}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-5"
            >
              {/* Team Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-mono text-sm">
                    {team.joinCode}
                  </div>
                  <h3 className="text-lg font-bold text-white">{team.teamName}</h3>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="text-slate-400">
                    Score: <span className="text-white font-bold">{team.currentScore}</span>
                  </div>
                  <div className="text-slate-400">
                    Hints R2: <span className="text-amber-400 font-bold">{team.hintsUsedR2}</span>
                  </div>
                  <div className="text-slate-400">
                    Questions: <span className="text-white font-bold">{team.stats.total}</span>
                  </div>
                </div>
              </div>

              {/* Assignments */}
              {team.assignments.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  No questions purchased yet
                </div>
              ) : (
                <div className="space-y-2">
                  {team.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(assignment.status)}
                            <h4 className="text-sm font-bold text-white truncate">
                              {assignment.questionTitle}
                            </h4>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>Bid: {formatBidTime(assignment.bidTimeSeconds)}</span>
                            <span>Points: {assignment.points}</span>
                            {assignment.status === "COMPLETED" && (
                              <span className="text-emerald-400">
                                Earned: +{assignment.finalScore}
                              </span>
                            )}
                          </div>

                          {/* Progress Bar for ACTIVE */}
                          {assignment.status === "ACTIVE" && assignment.timeRemaining !== null && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-400">Time Remaining</span>
                                <span className={`font-mono font-bold ${
                                  assignment.timeRemaining < 60 ? "text-rose-400" : "text-cyan-400"
                                }`}>
                                  {formatTime(assignment.timeRemaining)}
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    assignment.progress > 80 ? "bg-rose-500" : "bg-cyan-500"
                                  }`}
                                  style={{ width: `${assignment.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Team Stats Summary */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-amber-400">
                      {team.stats.ready} Ready
                    </span>
                    <span className="text-cyan-400">
                      {team.stats.active} Active
                    </span>
                    <span className="text-emerald-400">
                      {team.stats.completed} Solved
                    </span>
                    <span className="text-rose-400">
                      {team.stats.failed} Failed
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Total R2 Points: <span className="text-emerald-400 font-bold">+{team.stats.totalPoints}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
