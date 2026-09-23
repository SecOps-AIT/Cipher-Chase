"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Users,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  Phone,
  Mail,
  AlertCircle,
  Terminal,
} from "lucide-react";

export default function TeamJoinPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [memberName, setMemberName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Success state for display
  const [joinSuccess, setJoinSuccess] = useState<{
    teamName: string;
    teamCode?: string;
    memberCount: number;
    maxMembers: number;
    members: string[];
    currentMember: string;
    isLeader?: boolean;
  } | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Please enter a unit / team name.");
      return;
    }
    if (!memberName.trim()) {
      setError("Please enter the leader's operative name.");
      return;
    }
    if (!phone.trim()) {
      setError("Leader phone number is required for dispatch records.");
      return;
    }
    if (!email.trim()) {
      setError("Leader email address is required for dispatch records.");
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
        throw new Error(data.error || "Failed to create unit");
      }

      // DO NOT auto-redirect! Show credentials modal persistently
      setJoinSuccess({
        teamName: data.team.name,
        teamCode: data.team.joinCode,
        memberCount: data.team.memberCount,
        maxMembers: data.team.maxMembers,
        members: data.team.members,
        currentMember: data.team.currentMember,
        isLeader: true,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamCode.trim()) {
      setError("Please enter your team's join code (e.g., CC2601).");
      return;
    }
    if (!memberName.trim()) {
      setError("Please enter your operative name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          joinCode: teamCode.trim().toUpperCase(),
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
        teamCode: data.team.joinCode,
        memberCount: data.team.memberCount,
        maxMembers: data.team.maxMembers,
        members: data.team.members,
        currentMember: data.team.currentMember,
        isLeader: false,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!joinSuccess?.teamCode) return;
    navigator.clipboard.writeText(joinSuccess.teamCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // SUCCESS / CREDENTIALS ISSUED MODAL
  if (joinSuccess) {
    return (
      <main className="min-h-screen vault-bg flex flex-col justify-center items-center p-6 relative">
        <div className="w-full max-w-md bg-[#090D16] border border-[#1E293B] rounded-2xl p-7 shadow-2xl backdrop-blur-md relative z-10 corner-frame">
          <div className="text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">
                {joinSuccess.isLeader ? "OPERATION UNIT INITIALIZED" : "TERMINAL ACCESS GRANTED"}
              </span>
              <h2 className="text-2xl font-black font-mono text-white tracking-wide mt-1">
                {joinSuccess.teamName}
              </h2>
            </div>

            {/* Prominent Persistent Join Code Box */}
            {joinSuccess.teamCode && (
              <div className="p-4 bg-[#05070B] border border-cyan-500/40 rounded-xl relative overflow-hidden text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> UNIT JOIN CODE
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">1-3 OPERATORS</span>
                </div>

                <div className="flex items-center justify-between gap-3 mt-2">
                  <span className="text-3xl font-black font-mono text-white tracking-widest text-cyan-300">
                    {joinSuccess.teamCode}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 font-mono text-xs font-bold transition-all shadow-sm"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY CODE</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] font-mono text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
                  {joinSuccess.isLeader
                    ? "Share this code with your teammates. They will enter it to join your squad."
                    : "You are connected to this unit. Your submissions sync instantly."}
                </p>
              </div>
            )}

            {/* Roster */}
            <div className="p-3.5 bg-[#070B13] border border-slate-800 rounded-xl text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-2">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" /> UNIT ROSTER
                </span>
                <span className="text-white font-bold">
                  {joinSuccess.memberCount} / {joinSuccess.maxMembers}
                </span>
              </div>
              <ul className="space-y-1.5 pt-1">
                {joinSuccess.members.map((m, idx) => (
                  <li
                    key={idx}
                    className="text-xs font-mono text-slate-300 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className={m === joinSuccess.currentMember ? "text-cyan-300 font-bold" : ""}>
                        {m}
                      </span>
                    </span>
                    {m === joinSuccess.currentMember && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        YOU
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Explicit Proceed Button */}
            <button
              onClick={() => router.push("/team/round-1")}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-cyan-glow cursor-pointer"
            >
              <span>PROCEED TO MISSION TERMINAL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  // MODE SELECTION SCREEN
  if (mode === "select") {
    return (
      <main className="min-h-screen vault-bg flex flex-col justify-center items-center p-6 relative">
        <div className="absolute top-8 left-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO MISSION HQ
          </Link>
        </div>

        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-8">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 mb-3 inline-block">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black font-mono tracking-wider text-white">
              CIPHER CHASE
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-widest">
              SECURE OPERATOR ACCESS GATEWAY
            </p>
          </div>

          <button
            onClick={() => setMode("create")}
            className="w-full p-5 bg-[#090D16] hover:bg-[#0D1424] border border-[#1E293B] hover:border-cyan-500/40 rounded-2xl flex items-center gap-4 transition-all group corner-frame cursor-pointer"
          >
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 group-hover:scale-105 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <div className="text-base font-bold font-mono text-white flex items-center justify-between">
                <span>CREATE UNIT</span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-wider">NEW SQUAD</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Register a new team as Leader & get a CC26XX code
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode("join")}
            className="w-full p-5 bg-[#090D16] hover:bg-[#0D1424] border border-[#1E293B] hover:border-cyan-500/40 rounded-2xl flex items-center gap-4 transition-all group corner-frame cursor-pointer"
          >
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <div className="text-base font-bold font-mono text-white flex items-center justify-between">
                <span>JOIN EXISTING UNIT</span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">OPERATIVE</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Join with your leader&apos;s CC26XX code
              </div>
            </div>
          </button>
        </div>
      </main>
    );
  }

  // CREATE OR JOIN FORM
  return (
    <main className="min-h-screen vault-bg flex flex-col justify-center items-center p-6 relative">
      <div className="w-full max-w-md">
        <button
          onClick={() => {
            setMode("select");
            setError(null);
          }}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          CHANGE OPERATOR MODE
        </button>

        <div className="bg-[#090D16] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md relative corner-frame">
          <div className="mb-6">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">
              {mode === "create" ? "UNIT INITIALIZATION" : "UNIT ACCESS GATEWAY"}
            </span>
            <h2 className="text-xl font-black font-mono text-white mt-1">
              {mode === "create" ? "Register New Team" : "Enter Squad Join Code"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === "create"
                ? "Leader registers unit details and receives the CC26XX join code."
                : "Enter the CC26XX code given by your team leader."}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 font-mono text-xs mb-5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={mode === "create" ? handleCreateTeam : handleJoinTeam} className="space-y-4">
            {mode === "create" ? (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                    Team / Unit Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wolf, Null Squad, ShadowOps"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#05070B] border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                    Team Leader Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Akil, Alex"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#05070B] border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      Mobile Number <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
                      <input
                        type="tel"
                        required
                        placeholder="Mobile"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#05070B] border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
                      <input
                        type="email"
                        required
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#05070B] border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-[11px] font-mono text-slate-400 flex items-start gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    A unique <span className="text-cyan-300 font-bold">CC26XX</span> code will be generated upon creation for your teammates.
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                    Team Join Code <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. CC2601"
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#05070B] border border-slate-800 rounded-xl text-white font-mono text-base tracking-widest uppercase focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors placeholder:normal-case placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                    Your Operative Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Elena, Cipher"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#05070B] border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-cyan-glow cursor-pointer"
            >
              {loading ? (
                <span>INITIALIZING...</span>
              ) : mode === "create" ? (
                <>
                  <span>INITIALIZE UNIT & GET CODE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>CONNECT TO UNIT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
