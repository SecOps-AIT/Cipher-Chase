"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  ArrowRight,
  Users,
  Check,
  Sparkles,
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
        `Are you sure you want to qualify the TOP ${topCount} teams? This will finalize Round 1 rankings and mark them as qualified for Round 2 Time Auction.`
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
        `Successfully qualified Top ${data.qualifiedCount} teams for Round 2 Time Auction!`
      );
      fetchStandings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setQualifying(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E293B] pb-6">
        <div>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">
            STAGE PROGRESSION & ADVANCEMENT
          </span>
          <h1 className="text-2xl font-black font-mono text-white tracking-wide mt-0.5">
            ROUND 1 — QUALIFICATION CONTROL
          </h1>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-center gap-3 text-emerald-300 font-mono text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Qualification Control Card */}
      <div className="p-6 bg-[#090D16] border border-[#1E293B] rounded-2xl relative corner-frame">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-white tracking-wider uppercase">
                ADVANCE TOP UNITS TO ROUND 2
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Select the cutoff rank for teams advancing to Round 2 (Time Auction). Qualifying teams marks Round 1 as FINISHED and unlocks Round 2 access for qualifiers.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-[#05070B] border border-slate-800 rounded-xl px-3 py-2">
              <span className="text-xs font-mono text-slate-400">CUTOFF: TOP</span>
              <input
                type="number"
                min="1"
                max={leaderboard.length || 100}
                value={topCount}
                onChange={(e) => setTopCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-transparent text-white font-mono font-bold text-center focus:outline-none text-sm"
              />
              <span className="text-xs font-mono text-slate-400">UNITS</span>
            </div>

            <button
              onClick={handleQualify}
              disabled={qualifying || leaderboard.length === 0}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl transition-all shadow-cyan-glow flex items-center gap-2 cursor-pointer"
            >
              {qualifying ? (
                <span>CONFIRMING...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>CONFIRM ADVANCEMENT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Standings & Projected Qualifiers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            STANDINGS & PROJECTED ADVANCEMENT ({leaderboard.length} UNITS REGISTERED)
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            Syncing leaderboard standings...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs border border-slate-800 rounded-2xl bg-[#090D16]">
            No teams registered yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {leaderboard.map((team, idx) => {
              const willQualify = idx < topCount;
              const isAlreadyQualified = team.qualified;

              return (
                <div
                  key={team.teamId}
                  className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition-all ${
                    willQualify
                      ? "bg-cyan-950/20 border-cyan-500/40 shadow-sm"
                      : "bg-[#090D16]/60 border-[#1E293B] opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                        idx === 0
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : idx === 1
                          ? "bg-slate-400/20 text-slate-300 border border-slate-400/40"
                          : idx === 2
                          ? "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                          : "bg-slate-900 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {team.rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-white text-sm">
                          {team.teamName}
                        </span>
                        {isAlreadyQualified && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] rounded font-mono font-bold">
                            QUALIFIED
                          </span>
                        )}
                        {willQualify && !isAlreadyQualified && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] rounded font-mono">
                            PROJECTED QUALIFIER
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-[#05070B] border border-cyan-500/30 text-cyan-300 font-bold">
                          {team.joinCode || "PENDING"}
                        </span>
                        <span>•</span>
                        <span>{team.solvesCount} Solves</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                        TOTAL SCORE
                      </span>
                      <span className="text-base font-black font-mono text-cyan-400">
                        {team.score} PTS
                      </span>
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
