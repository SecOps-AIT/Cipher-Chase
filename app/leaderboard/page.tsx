"use client";

import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Shield, Trophy, Clock, Sparkles, Zap, Award } from "lucide-react";
import Link from "next/link";

export default function PublicLeaderboardPage() {
  const { data, loading } = useLeaderboard(1500);

  const event = data?.event;
  const round = data?.currentRound;
  const leaderboard = data?.leaderboard || [];

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

        {/* Current Round Indicator */}
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
        </div>
      </header>

      {/* Main Leaderboard Table */}
      <main className="my-auto py-8 max-w-6xl mx-auto w-full">
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
            {/* Table Header */}
            <div className="grid grid-cols-12 px-6 py-3 text-xs font-mono text-slate-400 tracking-wider uppercase border-b border-slate-800">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5 sm:col-span-6">TEAM NAME</div>
              <div className="col-span-3 sm:col-span-2 text-center">SOLVES / TIME</div>
              <div className="col-span-3 text-right">TOTAL SCORE</div>
            </div>

            {/* Team Rows */}
            {leaderboard.map((t) => {
              const isTop1 = t.rank === 1;
              const isTop3 = t.rank <= 3;

              return (
                <div
                  key={t.teamId}
                  className={`grid grid-cols-12 items-center px-6 py-4 rounded-2xl border transition-all duration-300 ${
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
                  <div className="col-span-5 sm:col-span-6 pl-2 sm:pl-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg sm:text-xl font-black font-mono text-white tracking-wide">
                        {t.teamName}
                      </span>
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

                  {/* Tiebreak Metric / Solves */}
                  <div className="col-span-3 sm:col-span-2 text-center">
                    <span className="inline-block px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
                      {round && round.number >= 2
                        ? t.timeFormatted
                        : `${t.solvesCount} solves`}
                    </span>
                  </div>

                  {/* Score Column */}
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
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Projector Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-6 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>PROJECTOR DISPLAY MODE — AUTO REFRESH 1.5S</span>
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
