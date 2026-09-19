"use client";

import { useEffect, useState } from "react";

export function useChallengeTimer(
  deadlineAt?: string | Date | null,
  serverTime?: string | Date | null
) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!deadlineAt) {
      setSecondsRemaining(0);
      return;
    }

    const deadlineMs = new Date(deadlineAt).getTime();
    const serverMs = serverTime ? new Date(serverTime).getTime() : Date.now();
    const clientOffset = Date.now() - serverMs; // drift offset

    const updateTimer = () => {
      const adjustedNow = Date.now() - clientOffset;
      const diffMs = deadlineMs - adjustedNow;
      const diffSec = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsRemaining(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [deadlineAt, serverTime]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  return {
    secondsRemaining,
    formattedTime,
    isExpired: secondsRemaining <= 0,
  };
}
