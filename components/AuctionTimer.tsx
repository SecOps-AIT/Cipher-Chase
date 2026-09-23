"use client";

import { Clock, AlertTriangle } from "lucide-react";
import { useAssignmentTimer } from "@/hooks/useAuctionTimers";
import { formatTime } from "@/lib/round2-auction";

interface AuctionTimerProps {
  assignmentId: string;
  deadlineAt: string | null;
  bidTimeSeconds: number;
  serverTime?: string | Date | null;
  variant?: "compact" | "full" | "minimal";
  showProgress?: boolean;
}

/**
 * Visual timer component for Round 2 auction assignments
 * Displays countdown with color-coded warning states
 */
export function AuctionTimer({
  assignmentId,
  deadlineAt,
  bidTimeSeconds,
  serverTime,
  variant = "full",
  showProgress = true,
}: AuctionTimerProps) {
  const timer = useAssignmentTimer(assignmentId, deadlineAt, bidTimeSeconds, serverTime);

  // Color schemes based on warning level
  const colorScheme = {
    safe: {
      text: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      progress: "bg-cyan-500",
    },
    warning: {
      text: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      progress: "bg-yellow-500",
    },
    critical: {
      text: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      progress: "bg-rose-500",
    },
    expired: {
      text: "text-rose-400",
      bg: "bg-rose-500/20",
      border: "border-rose-500/40",
      progress: "bg-rose-600",
    },
  };

  const colors = colorScheme[timer.warningLevel];

  if (!deadlineAt) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm font-mono">
        <Clock className="w-4 h-4" />
        <span>NOT STARTED</span>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <span className={`font-mono font-bold ${colors.text}`}>
        {timer.formattedTime}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors.bg} ${colors.border}`}>
        <Clock className={`w-4 h-4 ${colors.text}`} />
        <span className={`font-mono font-bold text-sm ${colors.text}`}>
          {timer.formattedTime}
        </span>
        {timer.warningLevel === "critical" && (
          <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
        )}
      </div>
    );
  }

  // Full variant with progress bar
  return (
    <div className={`p-4 rounded-xl border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${colors.text}`} />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            {timer.isExpired ? "EXPIRED" : "TIME REMAINING"}
          </span>
        </div>
        {timer.warningLevel === "critical" && !timer.isExpired && (
          <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
        )}
      </div>

      <div className={`text-3xl font-black font-mono tracking-tight ${colors.text}`}>
        {timer.formattedTime}
      </div>

      {showProgress && (
        <>
          <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${colors.progress}`}
              style={{ width: `${timer.percentageUsed}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-mono text-slate-500">
            <span>0:00</span>
            <span>{formatTime(bidTimeSeconds)}</span>
          </div>
        </>
      )}

      {timer.isExpired && (
        <div className="mt-2 text-xs font-mono text-rose-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>Time limit exceeded</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact timer badge for use in lists
 */
export function TimerBadge({
  timeRemaining,
  isExpired,
  size = "md",
}: {
  timeRemaining: number;
  isExpired: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const color = isExpired
    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
    : timeRemaining < 60
    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
    : timeRemaining < 300
    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold rounded border ${color} ${sizeClasses[size]}`}
    >
      <Clock className="w-3 h-3" />
      {isExpired ? "EXPIRED" : formatTime(timeRemaining)}
    </span>
  );
}

/**
 * Large display timer for challenge detail pages
 */
export function ChallengeClock({
  timeRemaining,
  totalTime,
  isExpired,
}: {
  timeRemaining: number;
  totalTime: number;
  isExpired: boolean;
}) {
  const percentageUsed = totalTime > 0 
    ? Math.min(100, Math.max(0, ((totalTime - timeRemaining) / totalTime) * 100))
    : 100;

  const color = isExpired
    ? "text-rose-400"
    : percentageUsed >= 90
    ? "text-rose-400"
    : percentageUsed >= 75
    ? "text-yellow-400"
    : "text-cyan-400";

  return (
    <div className="text-center p-6 bg-slate-950 border border-slate-800 rounded-2xl">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Clock className={`w-6 h-6 ${color}`} />
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          {isExpired ? "TIME EXPIRED" : "TIME REMAINING"}
        </span>
      </div>
      
      <div className={`text-6xl font-black font-mono tracking-tight ${color}`}>
        {formatTime(timeRemaining)}
      </div>

      <div className="mt-4 h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isExpired ? "bg-rose-600" : percentageUsed >= 90 ? "bg-rose-500" : percentageUsed >= 75 ? "bg-yellow-500" : "bg-cyan-500"
          }`}
          style={{ width: `${percentageUsed}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs font-mono text-slate-500">
        <span>START</span>
        <span>{Math.floor(percentageUsed)}% USED</span>
        <span>DEADLINE</span>
      </div>
    </div>
  );
}
