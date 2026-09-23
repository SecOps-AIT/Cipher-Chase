"use client";

import { useState, useEffect } from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Shield, Trophy, Clock, Sparkles, Zap, Award, Timer, Users, Target, Activity } from "lucide-react";
import Link from "next/link";

export default function PublicLeaderboardPage() {
  const { data, loading } = useLeaderboard(1500);
  const [localTimers, setLocalTimers] = useState<{[teamId: string]: number}>({});

  const event = data?.event;
  const round = data?.currentRound;
  const leaderboard = data?.leaderboard || [];
  const roundStats = data?.roundStats;

  // Initialize and update local timers for Round 1
  useEffect(() => {
    if (!leaderboard) return;

    const initialTimers: {[teamId: string]: number} = {};
    leaderboard.forEach(team => {
      if (team.round1TimeRemaining !== undefined) {
        initialTimers[team.teamId] = team.round1TimeRemaining;
      }
    });
    setLocalTimers(initialTimers);
  }, [leaderboard]);

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

  return (
    <div className="min-h-screen bg-[#04060a] cyber-grid text-slate-100 flex flex-col justify-between p-6 md:p-10 select-none overflow-x-hidden">
      {/* Top Projector Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase block">
              OFFICIAL LIVE STANDINGS
            </span>
            <h1 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {event?.name || "CIPHER CHASE 2026"}
            </h1>
          </div>
        </div>

        {/* Current Round & Stats */}
        <div className="flex items-center gap-4">
          <div className="px-5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse-fast" />
            <div>
              <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase block">
                ACTIVE ROUND
              </span>
              <span className="text-sm font-bold font-mono text-white">
                {round?.name || "ROUND 1 — THEMED CTF"} ({round?.status || "LIVE"})
              </span>
            </div>
          </div>

          {/* Round 1 Stats */}
          {roundStats && round?.number === 1 && (
            <div className="px-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1 text-cyan-400">
                  <Target className="w-3 h-3" />
                  <span>{roundStats.totalSolves} solves</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Users className="w-3 h-3" />
                  <span>{roundStats.teamsActive} active</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Leaderboard */}
      <main className="my-auto py-8 max-w-7xl mx-auto w-full">
        {loading && leaderboard.length === 0 ? (
          <div className="text-center py-24 text-slate-500 font-mono text-lg">
            Synchronizing live tournament data...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-24 text-slate-500 font-mono text-lg">
            No teams registered yet.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Enhanced Table Header for Round 1 */}
            {round?.number === 1 ? (
              <div className="grid grid-cols-16 px-6 py-3 text-xs font-mono text-slate-400 tracking-wider uppercase border-b border-slate-800">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-4">TEAM NAME</div>
                <div className="col-span-2 text-center">TIMER STATUS</div>
                <div className="col-span-2 text-center">PROGRESS</div>
                <div className="col-span-4">RECENT ACTIVITY</div>
                <div className="col-span-3 text-right">SCORE</div>
              </div>
            ) : (
              <div className="grid grid-cols-12 px-6 py-3 text-xs font-mono text-slate-400 tracking-wider uppercase border-b border-slate-800">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5 sm:col-span-6">TEAM NAME</div>
                <div className="col-span-3 sm:col-span-2 text-center">SOLVES / TIME</div>
                <div className="col-span-3 text-right">TOTAL SCORE</div>
              </div>
            )}

            {/* Team Rows */}
            {leaderboard.map((t) => {
              const isTop1 = t.rank === 1;
              const isTop3 = t.rank <= 3;
              const timerSeconds = localTimers[t.teamId] || 0;

              return (
                <div
                  key={t.teamId}
                  className={`grid ${round?.number === 1 ? 'grid-cols-16' : 'grid-cols-12'} items-center px-6 py-4 rounded-2xl border transition-all duration-300 ${
                    isTop1
                      ? "bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5"
                      : t.rank === 2
                      ? "bg-slate-900/80 border-slate-700/80"
                      : t.rank === 3
                      ? "bg-slate-900/70 border-slate-800"
                      : "bg-slate-900/40 border-slate-800/60"
                  }`}
                >
                  {/* Rank Column */}
                  <div className="col-span-1 flex items-center justify-center">
                    {isTop1 ? (
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-black font-mono text-lg">
                        1
                      </div>
                    ) : t.rank === 2 ? (
                      <div className="w-9 h-9 rounded-xl bg-slate-400/20 border border-slate-400/50 flex items-center justify-center text-slate-300 font-black font-mono text-lg">
                        2
                      </div>
                    ) : t.rank === 3 ? (
                      <div className="w-9 h-9 rounded-xl bg-amber-700/20 border border-amber-700/50 flex items-center justify-center text-amber-600 font-black font-mono text-lg">
                        3
                      </div>
                    ) : (
                      <span className="text-base font-mono font-bold text-slate-500">
                        {t.rank}
                      </span>
                    )}
                  </div>

                  {/* Team Name Column */}
                  <div className={`${round?.number === 1 ? 'col-span-4' : 'col-span-5 sm:col-span-6'} pl-2 sm:pl-4`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg sm:text-xl font-black font-mono text-white tracking-wide">
                        {t.teamName}
                      </span>
                      {t.joinCode && (
                        <span className="px-1.5 py-0.5 rounded bg-[#05070B] border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                          {t.joinCode}
                        </span>
                      )}
                      {t.qualified && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <Sparkles className="w-3 h-3 text-purple-400" /> QUALIFIED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {t.members.length > 0 ? t.members.join(" • ") : "No members listed"}
                    </p>
                  </div>

                  {round?.number === 1 ? (
                    <>
                      {/* Timer Status Column */}
                      <div className="col-span-2 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono border ${
                          t.round1TimerStatus === "ACTIVE" 
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                            : t.round1TimerStatus === "EXPIRED"
                            ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                            : "bg-slate-800/50 border-slate-700 text-slate-400"
                        }`}>
                          <Timer className="w-3 h-3" />
                          <span>
                            {t.round1TimerStatus === "ACTIVE" 
                              ? formatTimer(timerSeconds)
                              : t.round1TimerStatus === "EXPIRED"
                              ? "TIME UP"
                              : "NOT STARTED"}
                          </span>
                        </div>
                      </div>

                      {/* Progress Column */}
                      <div className="col-span-2 text-center text-xs font-mono text-slate-300">
                        <span>{t.solvesCount} / {roundStats?.coreQuestions || 20} core</span>
                      </div>

                      {/* Recent Activity Column */}
                      <div className="col-span-4 text-xs">
                        {t.recentActivity && t.recentActivity.length > 0 ? (
                          <div className="space-y-1">
                            {t.recentActivity.slice(0, 2).map((activity, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-slate-400">
                                <Activity className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span className="truncate">{activity.description}</span>
                                <span className="text-slate-500 text-[10px] shrink-0">
                                  {getTimeSince(activity.timestamp)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">No recent activity</span>
                        )}
                      </div>

                      {/* Score Column */}
                      <div className="col-span-3 text-right">
                        <span
                          className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                            isTop1
                              ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200"
                              : "text-white"
                          }`}
                        >
                          {t.score}
                        </span>
                        <span className="text-xs text-slate-500 font-mono ml-1">pts</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Standard Tiebreak Metric / Solves */}
                      <div className="col-span-3 sm:col-span-2 text-center">
                        <span className="inline-block px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
                          {round && round.number >= 2
                            ? t.timeFormatted
                            : `${t.solvesCount} solves`}
                        </span>
                      </div>

                      {/* Standard Score Column */}
                      <div className="col-span-3 text-right">
                        <span
                          className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                            isTop1
                              ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200"
                              : "text-white"
                          }`}
                        >
                          {t.score}
                        </span>
                        <span className="text-xs text-slate-500 font-mono ml-1">pts</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Enhanced Projector Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-6 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>LIVE LEADERBOARD — AUTO REFRESH 1.5S</span>
          </div>
          {roundStats && round?.number === 1 && (
            <div className="hidden sm:flex items-center gap-4 text-[11px]">
              <span className="text-cyan-400">20 Operation challenges active</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-slate-400 transition-colors">
            HOME
          </Link>
          <span>•</span>
          <Link href="/team" className="hover:text-slate-400 transition-colors">
            TEAM ARENA
          </Link>
        </div>
      </footer>
    </div>
  );
}
