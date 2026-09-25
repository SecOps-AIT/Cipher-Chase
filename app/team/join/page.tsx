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
  UserCog,
  X,
  Plus,
} from "lucide-react";

interface TeamMember {
  name: string;
  phone: string;
  email: string;
  isLeader: boolean;
}

export default function TeamJoinPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // New: Leader registers all members upfront
  const [members, setMembers] = useState<TeamMember[]>([
    { name: "", phone: "", email: "", isLeader: true }, // Leader (Member 1)
  ]);

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

  const addMemberSlot = () => {
    if (members.length < 3) {
      setMembers([...members, { name: "", phone: "", email: "", isLeader: false }]);
    }
  };

  const removeMemberSlot = (index: number) => {
    if (index === 0) return; // Can't remove leader
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof TeamMember, value: string | boolean) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Please enter a team name.");
      return;
    }

    // Validate leader (first member)
    const leader = members[0];
    if (!leader.name.trim()) {
      setError("Leader name is required.");
      return;
    }
    if (!leader.phone.trim()) {
      setError("Leader phone number is required.");
      return;
    }
    if (!leader.email.trim()) {
      setError("Leader email address is required.");
      return;
    }

    // Validate additional members (if any)
    const additionalMembers = members.slice(1).filter(m => m.name.trim());
    for (const member of additionalMembers) {
      if (!member.name.trim()) {
        setError("All member names must be filled or remove empty slots.");
        return;
      }
      // Phone and email are optional for non-leaders, but if provided must be valid
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: teamName.trim(),
          members: members.map(m => ({
            name: m.name.trim(),
            phone: m.phone.trim() || undefined,
            email: m.email.trim() || undefined,
            isLeader: m.isLeader,
          })).filter(m => m.name), // Only include members with names
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      setJoinSuccess({
        teamName: data.team.name,
        teamCode: data.team.joinCode,
        memberCount: data.team.memberCount,
        maxMembers: data.team.maxMembers,
        members: data.team.members,
        currentMember: leader.name.trim(),
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
                {joinSuccess.isLeader ? "TEAM REGISTERED SUCCESSFULLY" : "TERMINAL ACCESS GRANTED"}
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
                    <KeyRound className="w-3.5 h-3.5" /> TEAM ACCESS CODE
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">MAX 3 MEMBERS</span>
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
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] font-mono text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
                  {joinSuccess.isLeader
                    ? "All registered members can use this code to access the competition platform."
                    : "You are connected to this team. Your submissions sync instantly."}
                </p>
              </div>
            )}

            {/* Roster */}
            <div className="p-3.5 bg-[#070B13] border border-slate-800 rounded-xl text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-2">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" /> TEAM ROSTER
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
                    {idx === 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        LEADER
                      </span>
                    )}
                    {m === joinSuccess.currentMember && idx !== 0 && (
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
              <UserCog className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <div className="text-base font-bold font-mono text-white flex items-center justify-between">
                <span>REGISTER NEW TEAM</span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-wider">LEADER</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Leader registers all team members (1-3) and gets CC26XX code
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
                <span>ACCESS EXISTING TEAM</span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">MEMBER</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Access your team with the CC26XX code
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
      <div className="w-full max-w-2xl">
        <button
          onClick={() => {
            setMode("select");
            setError(null);
          }}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          CHANGE MODE
        </button>

        <div className="bg-[#090D16] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md relative corner-frame">
          <div className="mb-6">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">
              {mode === "create" ? "TEAM REGISTRATION" : "TEAM ACCESS"}
            </span>
            <h2 className="text-xl font-black font-mono text-white mt-1">
              {mode === "create" ? "Register All Team Members" : "Enter Team Access Code"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === "create"
                ? "Leader registers all team members upfront (1-3 members total)."
                : "Enter the CC26XX code provided by your team leader."}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 font-mono text-xs mb-5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {mode === "create" ? (
            <form onSubmit={handleCreateTeam} className="space-y-5">
              {/* Team Name */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  Team Name <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wolf Squad, Null Ops, Shadow Team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#05070B] border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>

              {/* Team Members */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Team Members ({members.length}/3)
                  </label>
                  {members.length < 3 && (
                    <button
                      type="button"
                      onClick={addMemberSlot}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-mono font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      ADD MEMBER
                    </button>
                  )}
                </div>

                {members.map((member, index) => (
                  <div
                    key={index}
                    className="p-4 bg-[#05070B] border border-slate-800 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-300 font-bold">
                        {index === 0 ? "👑 LEADER (Member 1)" : `Member ${index + 1}`}
                      </span>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeMemberSlot(index)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Member name *"
                        value={member.name}
                        onChange={(e) => updateMember(index, "name", e.target.value)}
                        className="w-full px-3 py-2 bg-[#000000] border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="tel"
                        required={index === 0}
                        placeholder={index === 0 ? "Phone number *" : "Phone (optional)"}
                        value={member.phone}
                        onChange={(e) => updateMember(index, "phone", e.target.value)}
                        className="w-full px-3 py-2 bg-[#000000] border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      <input
                        type="email"
                        required={index === 0}
                        placeholder={index === 0 ? "Email address *" : "Email (optional)"}
                        value={member.email}
                        onChange={(e) => updateMember(index, "email", e.target.value)}
                        className="w-full px-3 py-2 bg-[#000000] border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-[11px] font-mono text-slate-400 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  A unique <span className="text-cyan-300 font-bold">CC26XX</span> code will be generated. All registered members can use it to access the platform.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-cyan-glow cursor-pointer"
              >
                {loading ? (
                  <span>REGISTERING TEAM...</span>
                ) : (
                  <>
                    <span>REGISTER TEAM & GET CODE</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  Team Access Code <span className="text-cyan-400">*</span>
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
                  Your Name <span className="text-cyan-400">*</span>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-cyan-glow cursor-pointer"
              >
                {loading ? (
                  <span>CONNECTING...</span>
                ) : (
                  <>
                    <span>ACCESS TEAM</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
