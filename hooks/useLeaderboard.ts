"use client";

import { useEffect, useState, useCallback } from "react";
import { LeaderboardEntry } from "@/lib/leaderboard";

interface LeaderboardData {
  event: { id: string; name: string; status: string } | null;
  currentRound: { id: string; name: string; number: number; status: string } | null;
  leaderboard: LeaderboardEntry[];
  serverTime: string;
}

export function useLeaderboard(pollIntervalMs: number = 1500) {
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

  useEffect(() => {
    fetchLeaderboard();
    const timer = setInterval(fetchLeaderboard, pollIntervalMs);
    return () => clearInterval(timer);
  }, [fetchLeaderboard, pollIntervalMs]);

  return { data, loading, error, refresh: fetchLeaderboard };
}
