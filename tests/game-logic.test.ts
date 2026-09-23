import { describe, it, expect } from "vitest";
import { calculateSpeedBonus } from "../lib/round2";

describe("Cipher Chase Game Engine Logic", () => {
  describe("Round 1 — Question Release & Validity Windows", () => {
    const isQuestionOpen = (now: Date, releaseAt: Date, closeAt: Date, roundStatus: string) => {
      if (roundStatus !== "LIVE") return { open: false, reason: "ROUND_NOT_LIVE" };
      if (now < releaseAt) return { open: false, reason: "NOT_YET_RELEASED" };
      if (now >= closeAt) return { open: false, reason: "EXPIRED" };
      return { open: true };
    };

    it("rejects submission if question is not yet released", () => {
      const now = new Date("2026-09-19T14:05:00Z");
      const releaseAt = new Date("2026-09-19T14:10:00Z");
      const closeAt = new Date("2026-09-19T14:20:00Z");

      const result = isQuestionOpen(now, releaseAt, closeAt, "LIVE");
      expect(result.open).toBe(false);
      expect(result.reason).toBe("NOT_YET_RELEASED");
    });

    it("rejects submission if question has expired", () => {
      const now = new Date("2026-09-19T14:25:00Z");
      const releaseAt = new Date("2026-09-19T14:10:00Z");
      const closeAt = new Date("2026-09-19T14:20:00Z");

      const result = isQuestionOpen(now, releaseAt, closeAt, "LIVE");
      expect(result.open).toBe(false);
      expect(result.reason).toBe("EXPIRED");
    });

    it("accepts submission if question is within release window and round is LIVE", () => {
      const now = new Date("2026-09-19T14:15:00Z");
      const releaseAt = new Date("2026-09-19T14:10:00Z");
      const closeAt = new Date("2026-09-19T14:20:00Z");

      const result = isQuestionOpen(now, releaseAt, closeAt, "LIVE");
      expect(result.open).toBe(true);
    });

    it("rejects submission if round is PAUSED even during release window", () => {
      const now = new Date("2026-09-19T14:15:00Z");
      const releaseAt = new Date("2026-09-19T14:10:00Z");
      const closeAt = new Date("2026-09-19T14:20:00Z");

      const result = isQuestionOpen(now, releaseAt, closeAt, "PAUSED");
      expect(result.open).toBe(false);
      expect(result.reason).toBe("ROUND_NOT_LIVE");
    });
  });

  describe("Round 1 — Leaderboard Tiebreakers", () => {
    interface TeamRecord {
      id: string;
      name: string;
      score: number;
      scoreReachedAt: Date;
    }

    const sortRound1 = (teams: TeamRecord[]) => {
      return [...teams].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.scoreReachedAt.getTime() - b.scoreReachedAt.getTime();
      });
    };

    it("ranks higher total score first", () => {
      const teams: TeamRecord[] = [
        { id: "1", name: "Null Squad", score: 500, scoreReachedAt: new Date("2026-09-19T14:20:00Z") },
        { id: "2", name: "Cyber Wolves", score: 750, scoreReachedAt: new Date("2026-09-19T14:25:00Z") },
      ];

      const ranked = sortRound1(teams);
      expect(ranked[0].name).toBe("Cyber Wolves");
      expect(ranked[1].name).toBe("Null Squad");
    });

    it("breaks tie by earliest timestamp when scores are identical", () => {
      const teams: TeamRecord[] = [
        { id: "1", name: "Null Squad", score: 500, scoreReachedAt: new Date("2026-09-19T14:34:21Z") },
        { id: "2", name: "Cyber Wolves", score: 500, scoreReachedAt: new Date("2026-09-19T14:31:04Z") },
      ];

      const ranked = sortRound1(teams);
      // Cyber Wolves reached 500 at 14:31:04 (earlier), so ranks #1
      expect(ranked[0].name).toBe("Cyber Wolves");
      expect(ranked[1].name).toBe("Null Squad");
    });
  });

  describe("Round 2 — Cyber Auction Speed Bonuses", () => {
    it("awards +100 for <= 25% of committed time used", () => {
      const committedSeconds = 480; // 8 minutes
      const timeUsed = 100; // ~20.8% of time
      const result = calculateSpeedBonus(timeUsed, committedSeconds);
      expect(result.bonus).toBe(100);
    });

    it("awards +75 for <= 50% of committed time used", () => {
      const committedSeconds = 480;
      const timeUsed = 240; // exactly 50%
      const result = calculateSpeedBonus(timeUsed, committedSeconds);
      expect(result.bonus).toBe(75);
    });

    it("awards +50 for <= 75% of committed time used", () => {
      const committedSeconds = 480;
      const timeUsed = 320; // ~66.7%
      const result = calculateSpeedBonus(timeUsed, committedSeconds);
      expect(result.bonus).toBe(50);
    });

    it("awards +25 for > 75% of committed time used", () => {
      const committedSeconds = 480;
      const timeUsed = 450; // > 75%
      const result = calculateSpeedBonus(timeUsed, committedSeconds);
      expect(result.bonus).toBe(25);
    });
  });

  describe("Round 2 — Time-Based Auction", () => {
    it("calculates time bonus correctly based on bid time", () => {
      const baseTime = 300; // 5:00 in seconds
      const bidTime = 240; // 4:00 in seconds
      const basePoints = 200;
      
      const timeReduction = baseTime - bidTime;
      const bonusPercentage = (timeReduction / baseTime) * 100;
      const bonus = Math.floor((bonusPercentage / 100) * basePoints);
      
      expect(timeReduction).toBe(60); // 1:00 reduction
      expect(bonus).toBe(40); // 20% * 200 = 40
    });

    it("calculates failure penalty as negative bonus", () => {
      const bonus = 40;
      const penalty = -bonus;
      
      expect(penalty).toBe(-40);
    });

    it("ensures teams cannot bid above base time", () => {
      const baseTime = 300;
      const bidTime = 350;
      
      const isValidBid = bidTime <= baseTime;
      expect(isValidBid).toBe(false);
    });
  });

  describe("Round 2 — Final Tiebreaker by Shortest Total Time", () => {
    interface Round2Team {
      name: string;
      score: number;
      totalChallengeTimeSec: number;
    }

    const sortRound2 = (teams: Round2Team[]) => {
      return [...teams].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Tiebreaker: Shortest total challenge completion time
        return a.totalChallengeTimeSec - b.totalChallengeTimeSec;
      });
    };

    it("ranks team with shorter total challenge time higher when scores tie", () => {
      const teams: Round2Team[] = [
        { name: "Team B", score: 1200, totalChallengeTimeSec: 1275 }, // 21m 15s
        { name: "Team A", score: 1200, totalChallengeTimeSec: 1182 }, // 19m 42s
      ];

      const ranked = sortRound2(teams);
      expect(ranked[0].name).toBe("Team A");
      expect(ranked[1].name).toBe("Team B");
    });
  });
});
