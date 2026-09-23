"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Trophy,
  Users,
  Clock,
  Copy,
  Check,
  LogOut,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

interface CommandHeaderProps {
  teamName: string;
  joinCode: string;
  memberName?: string;
  memberCount?: number;
  maxMembers?: number;
  score: number;
  roundNumber?: number;
  roundTitle?: string;
  timeRemaining?: number | null; // seconds
  timerStatus?: "NOT_STARTED" | "ACTIVE" | "EXPIRED" | "PAUSED";
  onBriefingClick?: () => void;
  onLogout?: () => void;
}

export function CommandHeader({
  teamName,
  joinCode,
  memberName,
  memberCount = 1,
  maxMembers = 3,
  score,
  roundNumber = 1,
  roundTitle,
  timeRemaining,
  timerStatus = "ACTIVE",
  onBriefingClick,
  onLogout,
}: CommandHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format timer
  const formatTime = (secs: number | null | undefined) => {
    if (secs === null || secs === undefined || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isWarning = timeRemaining !== null && timeRemaining !== undefined && timeRemaining > 0 && timeRemaining <= 300;
  const isCritical = timeRemaining !== null && timeRemaining !== undefined && timeRemaining > 0 && timeRemaining <= 60;
  const isExpired = timerStatus === "EXPIRED" || (timeRemaining !== null && timeRemaining !== undefined && timeRemaining <= 0);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#070B12]/95 backdrop-blur-md border-b border-[#1E293B] shadow-vault-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Brand & Team Identity */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Platform Emblem */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-black tracking-wider text-white">
                    CIPHER CHASE
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-fast" />
                </div>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block -mt-0.5">
                  OPS CONSOLE
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block shrink-0" />

            {/* Team Info & Join Code - ENHANCED BOLD & LARGE */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-extrabold hidden lg:inline">
                    UNIT:
                  </span>
                  <span className="font-mono font-black text-white text-sm sm:text-base tracking-wide uppercase truncate drop-shadow-sm">
                    {teamName || "OPERATIVE"}
                  </span>
                </div>
                {memberName && (
                  <div className="text-xs font-mono text-slate-400 truncate flex items-center gap-1">
                    <span>OP:</span>
                    <span className="text-cyan-300 font-bold text-xs uppercase tracking-wide">{memberName}</span>
                  </div>
                )}
              </div>

              {/* Join Code Badge with One-Click Copy */}
              {joinCode && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Click to copy Join Code for teammates"
                  className="group flex items-center gap-1.5 px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 hover:border-cyan-400/60 transition-all text-cyan-300 font-mono text-xs font-bold shrink-0"
                >
                  <span className="tracking-wider">{joinCode}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 text-cyan-400 group-hover:text-cyan-200 shrink-0" />
                  )}
                </button>
              )}

              {/* Members Count Badge */}
              <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded border border-slate-800 bg-slate-900/60 text-[11px] font-mono text-slate-400">
                <Users className="w-3 h-3 text-slate-400" />
                <span>
                  {memberCount}/{maxMembers}
                </span>
              </div>
            </div>
          </div>

          {/* Center / Right: Score, Timer & Actions */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Score Display */}
            <div className="text-right">
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                UNIT SCORE
              </div>
              <div className="font-mono font-black text-sm sm:text-base text-cyan-400 tracking-tight leading-none">
                {score} <span className="text-[10px] text-slate-400 font-normal">PTS</span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800 shrink-0" />

            {/* Tactical Timer */}
            {timeRemaining !== undefined && timeRemaining !== null && (
              <div
                className={`flex items-center gap-2 px-2.5 py-1 rounded border font-mono transition-colors ${
                  isExpired
                    ? "bg-rose-950/40 border-rose-600/50 text-rose-300"
                    : isCritical
                    ? "bg-rose-950/30 border-rose-500/60 text-rose-300 animate-pulse-fast"
                    : isWarning
                    ? "bg-amber-950/30 border-amber-500/50 text-amber-300"
                    : "bg-slate-900/80 border-slate-700/80 text-white"
                }`}
              >
                <Clock
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isCritical
                      ? "text-rose-400"
                      : isWarning
                      ? "text-amber-400"
                      : "text-cyan-400"
                  }`}
                />
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-400 font-medium leading-none">
                    {isExpired
                      ? "EXPIRED"
                      : timerStatus === "NOT_STARTED"
                      ? "STANDBY"
                      : "OPERATION"}
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-bold tracking-wider leading-none mt-0.5 ${
                      isExpired
                        ? "text-rose-400"
                        : isCritical
                        ? "text-rose-400"
                        : isWarning
                        ? "text-amber-400"
                        : "text-white"
                    }`}
                  >
                    {isExpired ? "00:00" : formatTime(timeRemaining)}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              {onBriefingClick && (
                <button
                  type="button"
                  onClick={onBriefingClick}
                  title="Mission Briefing"
                  className="p-1.5 rounded border border-slate-800 hover:border-cyan-500/40 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              )}

              <Link
                href="/leaderboard"
                target="_blank"
                title="Live Scoreboard"
                className="p-1.5 rounded border border-slate-800 hover:border-amber-500/40 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors"
              >
                <Trophy className="w-4 h-4" />
              </Link>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Disconnect Terminal"
                  className="p-1.5 rounded border border-slate-800 hover:border-rose-500/40 bg-slate-900/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
