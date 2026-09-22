"use client";

import { useEffect, useState, useCallback } from "react";
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
  batchInfo: {
    currentBatch: number;
    totalBatches: number;
    activeQuestionsCount: number;
    batchCloseAt: string | null;
    secondsRemaining: number;
  };
  questions: QuestionView[];
  serverTime: string;
}

export function useActiveQuestions(pollIntervalMs: number = 3000) {
  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
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
