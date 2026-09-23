"use client";

import { useState, useEffect } from "react";
import {
  Calculator,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sliders,
} from "lucide-react";

export default function AdminScoringPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [topCount, setTopCount] = useState<number>(4);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStandings = async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
  }, []);

  const handleQualify = async () => {
    if (topCount < 1 || topCount > leaderboard.length) {
      alert("Invalid top team count.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to qualify the TOP ${topCount} teams? This will mark them as qualified for Round 2 Time Auction and mark Round 1 as FINISHED.`
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            STAGE PROGRESSION
          </span>
          <h1 className="text-2xl font-bold font-mono text-white">QUALIFICATION</h1>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-center gap-3 text-emerald-300 font-mono text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Qualification Action Card */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-mono text-white">
              ROUND 1 QUALIFICATION SELECTOR
            </h3>
            <p className="text-xs text-slate-400">
              Select how many top-ranking teams advance to the Round 2 Time Auction.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-300">Qualifying teams:</span>
            <input
              type="number"
              min={1}
              max={leaderboard.length || 10}
              value={topCount}
              onChange={(e) => setTopCount(parseInt(e.target.value, 10))}
              className="w-20 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm text-center"
            />
          </div>

          <button
            onClick={handleQualify}
            disabled={qualifying || leaderboard.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold font-mono text-xs tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-purple-glow"
          >
            <Sparkles className="w-4 h-4" />
            {qualifying ? "QUALIFYING..." : `QUALIFY TOP ${topCount}`}
          </button>
        </div>
      </div>

      {/* Standings Table with Qualification Preview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> TOURNAMENT STANDINGS
          </h4>
          <span className="text-xs font-mono text-slate-500">
            Top {topCount} will qualify
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-6 text-center">#</th>
                <th className="py-3 px-6">Team Name</th>
                <th className="py-3 px-6 text-center">R1 Solves</th>
                <th className="py-3 px-6 text-center">Score</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Loading standings...
                  </td>
                </tr>
              ) : (
                leaderboard.map((team, idx) => {
                  const wouldQualify = idx < topCount;
                  return (
                    <tr
                      key={team.teamId}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        wouldQualify ? "bg-purple-950/10" : ""
                      }`}
                    >
                      <td className="py-4 px-6 text-center font-bold text-slate-500">
                        {team.rank}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-white text-sm">{team.teamName}</span>
                        <div className="text-[11px] text-slate-500">
                          {team.members.join(", ")}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center text-slate-300">
                        {team.solvesCount}
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-white text-sm">
                        {team.score} pts
                      </td>
                      <td className="py-4 px-6 text-right">
                        {team.qualified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full text-[10px]">
                            <Sparkles className="w-3 h-3 text-purple-400" /> QUALIFIED
                          </span>
                        ) : wouldQualify ? (
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px]">
                            PROJECTED QUALIFIER
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">NOT QUALIFIED</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
