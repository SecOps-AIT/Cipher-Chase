"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  FileQuestion,
  Trophy,
  PlayCircle,
  Gavel,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const fetchOverview = async () => {
    // Skip this tick if the previous request hasn't resolved yet — prevents
    // requests piling up unboundedly when the DB round-trip is slower than
    // the poll interval (e.g. cross-region latency).
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const [lbRes, teamsRes, qRes] = await Promise.all([
        fetch("/api/leaderboard", { cache: "no-store" }),
        fetch("/api/admin/teams", { cache: "no-store" }),
        fetch("/api/admin/questions", { cache: "no-store" }),
      ]);

      const lb = lbRes.ok ? await lbRes.json() : null;
      const teams = teamsRes.ok ? await teamsRes.json() : { teams: [] };
      const questions = qRes.ok ? await qRes.json() : { questions: [] };

      setData({
        event: lb?.event,
        currentRound: lb?.currentRound,
        leaderboard: lb?.leaderboard || [],
        teams: teams.teams || [],
        questions: questions.questions || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-slate-500 font-mono text-sm">
        Loading management metrics...
      </div>
    );
  }

  const teamsCount = data?.teams?.length || 0;
  const qualifiedCount = data?.teams?.filter((t: any) => t.qualified)?.length || 0;
  const questionsCount = data?.questions?.length || 0;
  const totalSolves = data?.questions?.reduce((sum: number, q: any) => sum + (q.totalSolves || 0), 0) || 0;
  const leader = data?.leaderboard?.[0];

  return (
    <div className="space-y-8">
      {/* Top Title Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            ADMIN CONSOLE
          </span>
          <h1 className="text-3xl font-bold font-mono text-white tracking-tight">
            CIPHER CHASE CONTROL
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs rounded-xl">
            Event: <strong className="text-white">{data?.event?.name || "Cipher Chase 2026"}</strong>
          </span>
          <span className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs rounded-xl">
            {data?.currentRound?.name || "Round 1"} ({data?.currentRound?.status || "LIVE"})
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Teams Metric */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono tracking-wider">TEAMS REGISTERED</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{teamsCount}</div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            {qualifiedCount} qualified for Round 2
          </p>
        </div>

        {/* Questions Metric */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono tracking-wider">TOTAL CHALLENGES</span>
            <FileQuestion className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{questionsCount}</div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            {totalSolves} verified flag solves
          </p>
        </div>

        {/* Current Leader Metric */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono tracking-wider">CURRENT LEADER</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-300 truncate">
            {leader ? leader.teamName : "None"}
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            Top Score: <strong className="text-white">{leader ? leader.score : 0} pts</strong>
          </p>
        </div>

        {/* Round Status */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono tracking-wider">ACTIVE STAGE</span>
            <PlayCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white truncate">
            {data?.currentRound?.name || "Round 1"}
          </div>
          <p className="text-[11px] font-mono text-emerald-400 mt-1">
            Status: {data?.currentRound?.status || "LIVE"}
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/round-1"
          className="p-6 bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <PlayCircle className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all" />
          </div>
          <h3 className="text-lg font-bold font-mono text-white mb-1">Round 1 Control</h3>
          <p className="text-xs text-slate-400">
            Start, pause, resume, or finish Round 1. Monitor live submissions and release backup questions.
          </p>
        </Link>

        <Link
          href="/admin/auction"
          className="p-6 bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 rounded-2xl transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
              <Gavel className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 group-hover:text-purple-400 transition-all" />
          </div>
          <h3 className="text-lg font-bold font-mono text-white mb-1">Round 2 Cyber Auction</h3>
          <p className="text-xs text-slate-400">
            Record verbal auction winners, enter committed time, start live challenge countdowns and award speed bonuses.
          </p>
        </Link>

        <Link
          href="/admin/scoring"
          className="p-6 bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 group-hover:text-amber-400 transition-all" />
          </div>
          <h3 className="text-lg font-bold font-mono text-white mb-1">Qualification & Wallets</h3>
          <p className="text-xs text-slate-400">
            Select Top N qualifiers, initialize Round 2 wallet balances from Round 1 scores, and perform manual adjustments.
          </p>
        </Link>
      </div>
    </div>
  );
}
