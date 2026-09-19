"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  ArrowRight,
  Users,
  Wallet,
} from "lucide-react";

export default function AdminQualificationPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [topCount, setTopCount] = useState<number>(4);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStandings = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        if (data.leaderboard && data.leaderboard.length > 0 && topCount > data.leaderboard.length) {
          setTopCount(Math.min(4, data.leaderboard.length));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [topCount]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  const handleQualify = async () => {
    if (topCount < 1 || topCount > leaderboard.length) {
      alert("Invalid top team count.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to qualify the TOP ${topCount} teams? This will finalize Round 1 rankings, mark qualified = true, and initialize their Round 2 wallet equal to their Round 1 score.`
      )
    ) {
      return;
    }

    setQualifying(true);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topCount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Qualification failed");

      setSuccessMessage(
        `Successfully qualified Top ${data.qualifiedCount} teams! Round 2 wallets initialized.`
      );
      fetchStandings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setQualifying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            STAGE PROGRESSION & ADVANCEMENT
          </span>
          <h1 className="text-2xl font-bold font-mono text-white">ROUND 1 — QUALIFICATION</h1>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-center gap-3 text-emerald-300 font-mono text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Qualification Control Card */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold font-mono text-white">
              ROUND 2 ADVANCEMENT CONTROL
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Select the cutoff rank for teams advancing to Round 2 (Cyber Auction).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              QUALIFY TOP:
            </span>
            <input
              type="number"
              min={1}
              max={leaderboard.length || 10}
              value={topCount}
              onChange={(e) => setTopCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-center font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
            />
            <span className="text-xs font-mono text-slate-500">TEAMS</span>
          </div>

          <button
            onClick={handleQualify}
            disabled={qualifying || leaderboard.length === 0}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-950/50"
          >
            <Sparkles className="w-4 h-4" />
            {qualifying ? "QUALIFYING..." : "CONFIRM QUALIFICATION"}
          </button>
        </div>
      </div>

      {/* Final Standings Table */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            FINAL RANKINGS (ROUND 1)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {leaderboard.length} teams participating
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">
            Calculating official standings...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">
            No teams recorded yet.
          </div>
        ) : (
          <div className="space-y-2 font-mono text-xs">
            {leaderboard.map((team, idx) => {
              const willQualify = idx < topCount;
              const isAlreadyQualified = team.qualified;

              return (
                <div
                  key={team.teamId}
                  className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition-all ${
                    willQualify
                      ? "bg-purple-950/20 border-purple-500/40 shadow-sm"
                      : "bg-slate-950/60 border-slate-800/80 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : idx === 1
                          ? "bg-slate-400/20 text-slate-300 border border-slate-400/40"
                          : idx === 2
                          ? "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                          : "bg-slate-900 text-slate-500 border border-slate-800"
                      }`}
                    >
                      {team.rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{team.teamName}</span>
                        {isAlreadyQualified && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] rounded font-bold">
                            QUALIFIED
                          </span>
                        )}
                        {willQualify && !isAlreadyQualified && (
                          <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] rounded">
                            PROJECTED QUALIFIER
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Code: {team.joinCode || "N/A"} • Solves: {team.solvesCount}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block">SCORE</span>
                      <span className="text-base font-bold text-cyan-400">{team.score} pts</span>
                    </div>

                    <div className="text-right pl-4 border-l border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-amber-400" /> WALLET
                      </span>
                      <span className="text-base font-bold text-amber-300">{team.wallet} pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
