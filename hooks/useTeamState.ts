"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabaseRealtime } from "./useSupabaseRealtime";

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

export function useTeamState(pollIntervalMs: number = 3000) {
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

  // Subscribe to Team updates for score/status changes
  const { isAvailable: realtimeAvailable } = useSupabaseRealtime({
    table: "Team",
    event: "UPDATE",
    onChange: (payload) => {
      // Refresh team state when team is updated
      if (state?.team?.id && payload.new?.id === state.team.id) {
        fetchTeamState();
      }
    },
  });

  // Subscribe to TeamMember changes (joins/leaves)
  useSupabaseRealtime({
    table: "TeamMember",
    event: "*",
    onChange: (payload) => {
      // Refresh when members join or leave this team
      if (state?.team?.id && payload.new?.teamId === state.team.id) {
        fetchTeamState();
      }
    },
  });

  // Subscribe to ScoreEvent for instant score updates
  useSupabaseRealtime({
    table: "ScoreEvent",
    event: "INSERT",
    onChange: (payload) => {
      // Refresh when this team gets score events
      if (state?.team?.id && payload.new?.teamId === state.team.id) {
        fetchTeamState();
      }
    },
  });

  useEffect(() => {
    fetchTeamState();
    
    // Use longer poll interval when realtime is available
    const interval = realtimeAvailable ? pollIntervalMs * 2 : pollIntervalMs;
    const timer = setInterval(fetchTeamState, interval);
    
    return () => clearInterval(timer);
  }, [fetchTeamState, pollIntervalMs, realtimeAvailable]);

  return { state, loading, error, refresh: fetchTeamState };
}
