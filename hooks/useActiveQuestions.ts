"use client";

import { useEffect, useState, useCallback } from "react";
import { QuestionView } from "@/lib/round1";

interface QuestionsResponse {
  round: {
    id: string;
    name: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
  } | null;
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

export function useActiveQuestions(pollIntervalMs: number = 2000) {
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

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchQuestions, pollIntervalMs]);

  return { data, loading, error, refresh: fetchQuestions };
}
