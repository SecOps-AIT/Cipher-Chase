"use client";

import { useEffect, useState, useCallback } from "react";
import { LeaderboardEntry } from "@/lib/leaderboard";
import { useSupabaseRealtime } from "./useSupabaseRealtime";

interface LeaderboardData {
  event: { id: string; name: string; status: string } | null;
  currentRound: { id: string; name: string; number: number; status: string } | null;
  leaderboard: LeaderboardEntry[];
  roundStats?: {
    totalQuestions: number;
    coreQuestions: number;
    backupQuestions: number;
    releasedBackupQuestions: number;
    totalSolves: number;
    teamsActive: number;
  };
  serverTime: string;
}

export function useLeaderboard(pollIntervalMs: number = 3000) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to Team score updates via Supabase Realtime
  const { isAvailable: realtimeAvailable } = useSupabaseRealtime({
    table: "Team",
    event: "UPDATE",
    onChange: () => {
      // Refresh leaderboard when any team's score changes
      fetchLeaderboard();
    },
  });

  // Subscribe to ScoreEvent inserts for instant updates
  useSupabaseRealtime({
    table: "ScoreEvent",
    event: "INSERT",
    onChange: () => {
      // Refresh leaderboard when new score events are created
      fetchLeaderboard();
    },
  });

  // Initial fetch and polling fallback
  useEffect(() => {
    fetchLeaderboard();
    
    // If realtime is available, use longer poll interval as fallback
    // If not available, use shorter poll interval
    const interval = realtimeAvailable ? pollIntervalMs * 2 : pollIntervalMs;
    const timer = setInterval(fetchLeaderboard, interval);
    
    return () => clearInterval(timer);
  }, [fetchLeaderboard, pollIntervalMs, realtimeAvailable]);

  return { data, loading, error, refresh: fetchLeaderboard };
}
