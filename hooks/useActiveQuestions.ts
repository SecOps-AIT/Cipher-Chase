"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { QuestionView } from "@/lib/round1";
import { useSupabaseRealtime } from "./useSupabaseRealtime";

interface QuestionsResponse {
  round: {
    id: string;
    name: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
  } | null;
  teamTimer: {
    started: boolean;
    startedAt: string | null;
    deadlineAt: string | null;
    duration: number;
    secondsRemaining: number;
    status: "NOT_STARTED" | "ACTIVE" | "EXPIRED";
  };
  questions: QuestionView[];
  coreCount: number;
  backupCount: number;
  releasedBackupCount: number;
  serverTime: string;
}

export function useActiveQuestions(pollIntervalMs: number = 3000) {
  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const fetchQuestions = useCallback(async () => {
    // Skip this tick if the previous request hasn't resolved yet — prevents
    // requests piling up unboundedly when the DB round-trip is slower than
    // the poll interval (e.g. cross-region latency).
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch("/api/round-1/questions", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load questions");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // Subscribe to Submission events (when questions are solved)
  const { isAvailable: realtimeAvailable } = useSupabaseRealtime({
    table: "Submission",
    event: "INSERT",
    onChange: () => {
      // Refresh questions when any submission is recorded
      fetchQuestions();
    },
  });

  // Subscribe to Question updates (when questions are released/closed)
  useSupabaseRealtime({
    table: "Question",
    event: "UPDATE",
    onChange: () => {
      fetchQuestions();
    },
  });

  // Subscribe to Team updates (for timer changes)
  useSupabaseRealtime({
    table: "Team",
    event: "UPDATE",
    onChange: () => {
      fetchQuestions();
    },
  });

  useEffect(() => {
    fetchQuestions();
    
    // Use longer poll interval when realtime is available
    const interval = realtimeAvailable ? pollIntervalMs * 2 : pollIntervalMs;
    const timer = setInterval(fetchQuestions, interval);
    
    return () => clearInterval(timer);
  }, [fetchQuestions, pollIntervalMs, realtimeAvailable]);

  return { data, loading, error, refresh: fetchQuestions };
}
