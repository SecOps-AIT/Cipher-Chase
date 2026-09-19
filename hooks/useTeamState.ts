"use client";

import { useEffect, useState, useCallback } from "react";

export interface TeamState {
  team: {
    id: string;
    name: string;
    joinCode: string;
    score: number;
    wallet: number;
    qualified: boolean;
    members: string[];
    memberCount: number;
    maxMembers: number;
    currentMember?: string;
    memberId?: string;
    solvesCount: number;
  } | null;
  currentRound: {
    id: string;
    number: number;
    name: string;
    status: string;
  } | null;
  serverTime: string;
}

export function useTeamState(pollIntervalMs: number = 2000) {
  const [state, setState] = useState<TeamState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamState = useCallback(async () => {
    try {
      const res = await fetch("/api/team/me", { cache: "no-store" });
      if (res.status === 401) {
        setState(null);
        setError("UNAUTHORIZED");
        return;
      }
      if (!res.ok) throw new Error("Failed to load team data");
      const json = await res.json();
      setState(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamState();
    const interval = setInterval(fetchTeamState, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTeamState, pollIntervalMs]);

  return { state, loading, error, refresh: fetchTeamState };
}
