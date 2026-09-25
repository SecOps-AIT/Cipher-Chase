"use client";

import { useEffect, useState, useRef } from "react";
import { formatTime } from "@/lib/round2-auction";

interface AssignmentTimer {
  assignmentId: string;
  deadlineAt: string | null;
  startedAt: string | null;
  bidTimeSeconds: number;
  timeRemaining: number;
  formattedTime: string;
  isExpired: boolean;
  percentageUsed: number;
}

/**
 * Hook to manage multiple assignment timers with server time sync
 * Provides real-time countdown for all active Round 2 challenge assignments
 */
export function useAuctionTimers(
  assignments: Array<{
    id: string;
    deadlineAt: string | null;
    startedAt: string | null;
    bidTimeSeconds: number;
    status: string;
  }>,
  serverTime?: string | Date | null
) {
  const [timers, setTimers] = useState<Map<string, AssignmentTimer>>(new Map());

  useEffect(() => {
    // Calculate client-server time offset for accurate timing
    const serverMs = serverTime ? new Date(serverTime).getTime() : Date.now();
    const clientOffset = Date.now() - serverMs;

    const updateTimers = () => {
      const newTimers = new Map<string, AssignmentTimer>();
      const adjustedNow = Date.now() - clientOffset;

      assignments.forEach((assignment) => {
        if (!assignment.deadlineAt || assignment.status !== "ACTIVE") {
          // Not started or not active
          newTimers.set(assignment.id, {
            assignmentId: assignment.id,
            deadlineAt: assignment.deadlineAt,
            startedAt: assignment.startedAt,
            bidTimeSeconds: assignment.bidTimeSeconds,
            timeRemaining: assignment.bidTimeSeconds,
            formattedTime: formatTime(assignment.bidTimeSeconds),
            isExpired: false,
            percentageUsed: 0,
          });
          return;
        }

        const deadlineMs = new Date(assignment.deadlineAt).getTime();
        const diffMs = deadlineMs - adjustedNow;
        const diffSec = Math.max(0, Math.ceil(diffMs / 1000));
        const isExpired = diffSec <= 0;
        
        // Calculate percentage of time used
        const timeUsed = assignment.bidTimeSeconds - diffSec;
        const percentageUsed = assignment.bidTimeSeconds > 0 
          ? Math.min(100, Math.max(0, (timeUsed / assignment.bidTimeSeconds) * 100))
          : 100;

        newTimers.set(assignment.id, {
          assignmentId: assignment.id,
          deadlineAt: assignment.deadlineAt,
          startedAt: assignment.startedAt,
          bidTimeSeconds: assignment.bidTimeSeconds,
          timeRemaining: diffSec,
          formattedTime: formatTime(diffSec),
          isExpired,
          percentageUsed,
        });
      });

      setTimers(newTimers);
    };

    // Initial update
    updateTimers();

    // Update every 500ms for smooth countdown
    const interval = setInterval(updateTimers, 500);

    return () => clearInterval(interval);
  }, [assignments, serverTime]);

  return {
    timers,
    getTimer: (assignmentId: string) => timers.get(assignmentId),
    hasExpiredTimers: Array.from(timers.values()).some((t) => t.isExpired),
    activeTimersCount: Array.from(timers.values()).filter((t) => !t.isExpired && t.timeRemaining < t.bidTimeSeconds).length,
  };
}

/**
 * Hook for a single assignment timer with detailed status
 */
export function useAssignmentTimer(
  assignmentId: string,
  deadlineAt: string | null,
  bidTimeSeconds: number,
  serverTime?: string | Date | null
) {
  const [status, setStatus] = useState({
    timeRemaining: bidTimeSeconds,
    formattedTime: formatTime(bidTimeSeconds),
    isExpired: false,
    percentageUsed: 0,
    warningLevel: "safe" as "safe" | "warning" | "critical" | "expired",
  });

  useEffect(() => {
    if (!deadlineAt) {
      setStatus({
        timeRemaining: bidTimeSeconds,
        formattedTime: formatTime(bidTimeSeconds),
        isExpired: false,
        percentageUsed: 0,
        warningLevel: "safe",
      });
      return;
    }

    const serverMs = serverTime ? new Date(serverTime).getTime() : Date.now();
    const clientOffset = Date.now() - serverMs;
    const deadlineMs = new Date(deadlineAt).getTime();

    const updateTimer = () => {
      const adjustedNow = Date.now() - clientOffset;
      const diffMs = deadlineMs - adjustedNow;
      const diffSec = Math.max(0, Math.ceil(diffMs / 1000));
      const isExpired = diffSec <= 0;

      // Calculate percentage
      const timeUsed = bidTimeSeconds - diffSec;
      const percentageUsed = bidTimeSeconds > 0
        ? Math.min(100, Math.max(0, (timeUsed / bidTimeSeconds) * 100))
        : 100;

      // Determine warning level
      let warningLevel: "safe" | "warning" | "critical" | "expired" = "safe";
      if (isExpired) {
        warningLevel = "expired";
      } else if (percentageUsed >= 90) {
        warningLevel = "critical";
      } else if (percentageUsed >= 75) {
        warningLevel = "warning";
      }

      setStatus({
        timeRemaining: diffSec,
        formattedTime: formatTime(diffSec),
        isExpired,
        percentageUsed,
        warningLevel,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [assignmentId, deadlineAt, bidTimeSeconds, serverTime]);

  return status;
}

/**
 * Hook to fetch current server time for accurate timer synchronization
 */
export function useServerTime(pollingInterval: number = 30000) {
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const fetchServerTime = async () => {
      // Skip this tick if the previous request hasn't resolved yet — prevents
      // requests piling up unboundedly when the DB round-trip is slower than
      // the poll interval (e.g. cross-region latency).
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const requestStart = Date.now();
        const res = await fetch("/api/auction/time");
        const requestEnd = Date.now();
        
        if (res.ok) {
          const { serverTime: serverTimeStr } = await res.json();
          const serverMs = new Date(serverTimeStr).getTime();
          
          // Account for network latency (approximate)
          const latency = (requestEnd - requestStart) / 2;
          const adjustedServerTime = new Date(serverMs + latency);
          
          setServerTime(adjustedServerTime);
          setOffset(Date.now() - adjustedServerTime.getTime());
        }
      } catch (error) {
        console.error("Failed to sync server time:", error);
      } finally {
        inFlightRef.current = false;
      }
    };

    // Initial fetch
    fetchServerTime();

    // Periodic sync to handle clock drift
    const interval = setInterval(fetchServerTime, pollingInterval);

    return () => clearInterval(interval);
  }, [pollingInterval]);

  return {
    serverTime,
    offset,
    getAdjustedNow: () => Date.now() - offset,
  };
}
