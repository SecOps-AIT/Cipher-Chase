"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  KeyRound,
  User,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";

export default function TeamJoinPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<{
    teamName: string;
    memberCount: number;
    maxMembers: number;
    members: string[];
    currentMember: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError("Please enter your team's join code.");
      return;
    }
    if (!memberName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          joinCode: joinCode.trim().toUpperCase(),
          memberName: memberName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join team");
      }

      setJoinSuccess({
        teamName: data.team.name,
        memberCount: data.team.memberCount,
        maxMembers: data.team.maxMembers,
        members: data.team.members,
        currentMember: data.team.currentMember,
      });

      // Auto-redirect to /team/round-1 after brief confirmation
      setTimeout(() => {
        router.push("/team/round-1");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen cyber-grid flex flex-col justify-center items-center p-6 relative">
      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO HOME
        </Link>
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm relative z-10">
        {!joinSuccess ? (
          <>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 mb-3">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold font-mono tracking-wide text-white">
                JOIN YOUR TEAM
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your team code and name to claim your team slot
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-xs font-mono">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <div className="font-bold">JOIN FAILED</div>
                  <div className="mt-0.5">{error}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Team Code <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. CC-7X4K9"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base tracking-widest placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Your Name <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Anagesh"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    required
                    maxLength={50}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-sans text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !joinCode.trim() || !memberName.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-cyan-glow"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    VERIFYING...
                  </span>
                ) : (
                  <>
                    <span>JOIN TEAM</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
              <p className="text-xs text-slate-500 font-mono">
                Teams support 1 to 4 members. Reconnecting with the same name preserves your slot.
              </p>
            </div>
          </>
        ) : (
          /* SUCCESS STATE (Section 2 specification) */
          <div className="text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-2xl font-black font-mono text-white tracking-wide">
                {joinSuccess.teamName}
              </h2>
              <p className="text-xs font-mono text-emerald-400 mt-1">
                You joined successfully.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" /> TEAM MEMBERS
                </span>
                <span className="text-white font-bold">
                  {joinSuccess.memberCount} / {joinSuccess.maxMembers}
                </span>
              </div>
              <ul className="space-y-1 pt-1">
                {joinSuccess.members.map((m, idx) => (
                  <li
                    key={idx}
                    className="text-xs font-mono text-slate-300 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className={m === joinSuccess.currentMember ? "text-cyan-300 font-bold" : ""}>
                      {m} {m === joinSuccess.currentMember ? "(You)" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => router.push("/team")}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors shadow-cyan-glow"
            >
              <span>ENTER ARENA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
