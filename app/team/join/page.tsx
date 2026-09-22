"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  User,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Users,
  UserPlus,
  Phone,
  Mail,
} from "lucide-react";

export default function TeamJoinPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [teamName, setTeamName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<{
    teamName: string;
    memberCount: number;
    maxMembers: number;
    members: string[];
    currentMember: string;
  } | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Please enter a team name.");
      return;
    }
    if (!memberName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: teamName.trim(),
          memberName: memberName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          isLeader: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      setJoinSuccess({
        teamName: data.team.name,
        memberCount: data.team.memberCount,
        maxMembers: data.team.maxMembers,
        members: data.team.members,
        currentMember: data.team.currentMember,
      });

      setTimeout(() => {
        router.push("/team");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Please enter the team name.");
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
          teamName: teamName.trim(),
          memberName: memberName.trim(),
          isLeader: false,
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

      setTimeout(() => {
        router.push("/team");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (joinSuccess) {
    return (
      <main className="min-h-screen cyber-grid flex flex-col justify-center items-center p-6 relative">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm relative z-10">
          <div className="text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-2xl font-black font-mono text-white tracking-wide">
                {joinSuccess.teamName}
              </h2>
              <p className="text-xs font-mono text-emerald-400 mt-1">
                You joined successfully!
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
        </div>
      </main>
    );
  }

  if (mode === "select") {
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

        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-8">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 mb-3 inline-block">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold font-mono tracking-wide text-white">
              CIPHER CHASE
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Create a new team or join an existing one
            </p>
          </div>

          <button
            onClick={() => setMode("create")}
            className="w-full p-6 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20 border border-cyan-500/30 rounded-2xl flex items-center gap-4 transition-all group"
          >
            <div className="p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold font-mono text-white">CREATE TEAM</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Start a new team (1-3 members)
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode("join")}
            className="w-full p-6 bg-gradient-to-r from-purple-500/10 to-indigo-600/10 hover:from-purple-500/20 hover:to-indigo-600/20 border border-purple-500/30 rounded-2xl flex items-center gap-4 transition-all group"
          >
            <div className="p-3 bg-purple-500/20 border border-purple-500/40 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold font-mono text-white">JOIN TEAM</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Join your teammates
              </div>
            </div>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen cyber-grid flex flex-col justify-center items-center p-6 relative">
      <div className="absolute top-8 left-8">
        <button
          onClick={() => {
            setMode("select");
            setError(null);
          }}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`p-3 ${mode === "create" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-purple-500/10 border-purple-500/30 text-purple-400"} border rounded-xl mb-3`}>
            {mode === "create" ? <UserPlus className="w-8 h-8" /> : <Users className="w-8 h-8" />}
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-wide text-white">
            {mode === "create" ? "CREATE TEAM" : "JOIN TEAM"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "create" 
              ? "Enter your team details and contact information" 
              : "Enter the team name and your name"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold">ERROR</div>
              <div className="mt-0.5">{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={mode === "create" ? handleCreateTeam : handleJoinTeam} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
              Team Name <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Shield className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. Cyber Wolves"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                maxLength={50}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-sans text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
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

          {mode === "create" && (
            <>
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Phone Number <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={20}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-sans text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Email Address <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="e.g. anagesh@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={100}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-sans text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || !teamName.trim() || !memberName.trim() || (mode === "create" && (!phone.trim() || !email.trim()))}
            className={`w-full py-3.5 ${mode === "create" ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500" : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500"} text-slate-950 font-bold font-mono tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-cyan-glow`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                {mode === "create" ? "CREATING..." : "JOINING..."}
              </span>
            ) : (
              <>
                <span>{mode === "create" ? "CREATE TEAM" : "JOIN TEAM"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-500 font-mono">
            {mode === "create" 
              ? "As team leader, your contact info will be stored for event coordination" 
              : "Teams support 1 to 3 members. Team names are unique."}
          </p>
        </div>
      </div>
    </main>
  );
}
