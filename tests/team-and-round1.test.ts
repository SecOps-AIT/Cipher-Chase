import { describe, it, expect } from "vitest";

describe("Cipher Chase — Team System & Round 1 Core Logic", () => {
  describe("Team Capacity & Member Management (Section 1, 4)", () => {
    interface Member {
      id: string;
      name: string;
    }
    interface Team {
      id: string;
      name: string;
      members: Member[];
    }

    const MAX_MEMBERS = 3;

    const joinTeamSim = (team: Team, memberName: string) => {
      const cleanName = memberName.trim();
      const existing = team.members.find(
        (m) => m.name.toLowerCase() === cleanName.toLowerCase()
      );

      // Reconnect/refresh scenario
      if (existing) {
        return {
          success: true,
          reconnected: true,
          member: existing,
          memberCount: team.members.length,
        };
      }

      // Capacity check
      if (team.members.length >= MAX_MEMBERS) {
        return {
          success: false,
          error: "TEAM_FULL",
          message: "This team already has 3 members.",
          memberCount: team.members.length,
        };
      }

      // New member joins
      const newMember = { id: `m_${team.members.length + 1}`, name: cleanName };
      team.members.push(newMember);
      return {
        success: true,
        reconnected: false,
        member: newMember,
        memberCount: team.members.length,
      };
    };

    it("allows 1st member to join", () => {
      const team: Team = { id: "t1", name: "Cyber Wolves", members: [] };
      const res = joinTeamSim(team, "Alice");
      expect(res.success).toBe(true);
      expect(res.memberCount).toBe(1);
    });

    it("allows 2nd and 3rd members to join, rejects 4th", () => {
      const team: Team = { id: "t1", name: "Cyber Wolves", members: [] };
      joinTeamSim(team, "Alice");
      joinTeamSim(team, "Bob");
      joinTeamSim(team, "Charlie");
      const res = joinTeamSim(team, "Dave");
      expect(res.success).toBe(false);
      expect(res.error).toBe("TEAM_FULL");
      expect(res.memberCount).toBe(3);
    });

    it("rejects 4th member server-side with TEAM_FULL", () => {
      const team: Team = { id: "t1", name: "Cyber Wolves", members: [] };
      joinTeamSim(team, "Alice");
      joinTeamSim(team, "Bob");
      joinTeamSim(team, "Charlie");

      const res = joinTeamSim(team, "Dave");
      expect(res.success).toBe(false);
      expect(res.error).toBe("TEAM_FULL");
      expect(res.memberCount).toBe(3);
    });

    it("does not consume another slot when existing member reconnects / refreshes", () => {
      const team: Team = { id: "t1", name: "Cyber Wolves", members: [] };
      joinTeamSim(team, "Alice");
      joinTeamSim(team, "Bob");
      expect(team.members.length).toBe(2);

      // Alice refreshes page / reconnects
      const res = joinTeamSim(team, "Alice");
      expect(res.success).toBe(true);
      expect(res.reconnected).toBe(true);
      expect(res.memberCount).toBe(2);
      expect(team.members.length).toBe(2);
    });

    it("handles simultaneous joins safely when at 3/3 capacity", () => {
      const team: Team = {
        id: "t1",
        name: "Cyber Wolves",
        members: [
          { id: "m1", name: "Alice" },
          { id: "m2", name: "Bob" },
          { id: "m3", name: "Charlie" },
        ],
      };

      // Member A attempts to join when team is full
      const resA = joinTeamSim(team, "Dave");
      expect(resA.success).toBe(false);
      expect(resA.error).toBe("TEAM_FULL");
      expect(team.members.length).toBe(3);

      // Member B also attempts to join
      const resB = joinTeamSim(team, "Eve");
      expect(resB.success).toBe(false);
      expect(resB.error).toBe("TEAM_FULL");
      expect(team.members.length).toBe(3);
    });
  });

  describe("Answer Normalization Modes (Section 15)", () => {
    const validateAnswer = (
      submitted: string,
      expected: string,
      mode: "EXACT" | "TRIMMED" | "CASE_INSENSITIVE" = "TRIMMED"
    ) => {
      const raw = submitted || "";
      const clean = raw.trim();
      if (mode === "EXACT") {
        return raw === expected;
      }
      if (mode === "CASE_INSENSITIVE") {
        return clean.toLowerCase() === expected.trim().toLowerCase();
      }
      // TRIMMED (default)
      return clean === expected.trim();
    };

    it("TRIMMED mode ignores leading/trailing whitespace but preserves case", () => {
      const flag = "CC{rsa_small_e_is_vulnerable}";
      expect(validateAnswer("  CC{rsa_small_e_is_vulnerable} \n", flag, "TRIMMED")).toBe(true);
      expect(validateAnswer("cc{rsa_small_e_is_vulnerable}", flag, "TRIMMED")).toBe(false);
    });

    it("EXACT mode enforces character-for-character precision", () => {
      const flag = "CC{exact_match_flag}";
      expect(validateAnswer("CC{exact_match_flag}", flag, "EXACT")).toBe(true);
      expect(validateAnswer(" CC{exact_match_flag}", flag, "EXACT")).toBe(false);
    });

    it("CASE_INSENSITIVE mode allows case variations", () => {
      const flag = "CC{jwt_alg_none}";
      expect(validateAnswer("cc{jwt_alg_none}", flag, "CASE_INSENSITIVE")).toBe(true);
      expect(validateAnswer("CC{JWT_ALG_NONE}", flag, "CASE_INSENSITIVE")).toBe(true);
    });
  });

  describe("First Correct Submission & Team Solve Locking (Section 13)", () => {
    interface Submission {
      teamId: string;
      questionId: string;
      isCorrect: boolean;
      submittedAt: Date;
    }

    const processSubmission = ({
      submissions,
      team,
      question,
      isCorrect,
    }: {
      submissions: Submission[];
      team: { id: string; score: number };
      question: { id: string; points: number };
      isCorrect: boolean;
    }) => {
      // Uniqueness check: teamId + questionId for correct solve
      const alreadySolved = submissions.some(
        (s) => s.teamId === team.id && s.questionId === question.id && s.isCorrect
      );

      if (alreadySolved) {
        return {
          awarded: false,
          alreadySolved: true,
          message: "This question has already been solved by your team.",
        };
      }

      submissions.push({
        teamId: team.id,
        questionId: question.id,
        isCorrect,
        submittedAt: new Date(),
      });

      if (isCorrect) {
        team.score += question.points;
        return {
          awarded: true,
          points: question.points,
          teamScore: team.score,
        };
      }

      return {
        awarded: false,
        points: 0,
        teamScore: team.score,
      };
    };

    it("awards points on first correct solve and locks question for team", () => {
      const team = { id: "teamA", score: 0 };
      const question = { id: "q11", points: 150 };
      const submissions: Submission[] = [];

      // Member A solves Q11
      const resA = processSubmission({
        submissions,
        team,
        question,
        isCorrect: true,
      });

      expect(resA.awarded).toBe(true);
      expect(team.score).toBe(150);

      // Member B on same team submits Q11 right after
      const resB = processSubmission({
        submissions,
        team,
        question,
        isCorrect: true,
      });

      expect(resB.awarded).toBe(false);
      expect(resB.alreadySolved).toBe(true);
      // Score remains 150 (NOT 300)
      expect(team.score).toBe(150);
    });

    it("does not award points on wrong answer and does not lock question", () => {
      const team = { id: "teamA", score: 0 };
      const question = { id: "q11", points: 150 };
      const submissions: Submission[] = [];

      // Wrong attempt
      const res = processSubmission({
        submissions,
        team,
        question,
        isCorrect: false,
      });

      expect(res.awarded).toBe(false);
      expect(team.score).toBe(0);

      // Can still submit again and solve
      const solveRes = processSubmission({
        submissions,
        team,
        question,
        isCorrect: true,
      });

      expect(solveRes.awarded).toBe(true);
      expect(team.score).toBe(150);
    });
  });

  describe("First Blood Bonus System (CTF Flag Mechanics)", () => {
    interface Submission {
      teamId: string;
      questionId: string;
      isCorrect: boolean;
      isFirstBlood: boolean;
      pointsAwarded: number;
    }

    const solveWithFirstBlood = ({
      submissions,
      team,
      question,
    }: {
      submissions: Submission[];
      team: { id: string; name: string; score: number };
      question: { id: string; points: number; firstBloodBonus: number };
    }) => {
      const alreadySolved = submissions.some(
        (s) => s.teamId === team.id && s.questionId === question.id && s.isCorrect
      );
      if (alreadySolved) return { success: false, reason: "ALREADY_SOLVED" };

      // Check if global first solve
      const globalFirst = !submissions.some(
        (s) => s.questionId === question.id && s.isCorrect
      );

      const bonus = globalFirst ? question.firstBloodBonus : 0;
      const totalPoints = question.points + bonus;

      submissions.push({
        teamId: team.id,
        questionId: question.id,
        isCorrect: true,
        isFirstBlood: globalFirst,
        pointsAwarded: totalPoints,
      });

      team.score += totalPoints;

      return {
        success: true,
        isFirstBlood: globalFirst,
        firstBloodBonus: bonus,
        pointsAwarded: totalPoints,
        newTeamScore: team.score,
      };
    };

    it("awards First Blood bonus to the very first team to solve", () => {
      const submissions: Submission[] = [];
      const teamA = { id: "teamA", name: "Cyber Wolves", score: 0 };
      const teamB = { id: "teamB", name: "Null Squad", score: 0 };
      const question = { id: "q1", points: 100, firstBloodBonus: 50 };

      // Team A solves first
      const resA = solveWithFirstBlood({ submissions, team: teamA, question });
      expect(resA.isFirstBlood).toBe(true);
      expect(resA.firstBloodBonus).toBe(50);
      expect(resA.pointsAwarded).toBe(150); // 100 base + 50 FB
      expect(teamA.score).toBe(150);

      // Team B solves second
      const resB = solveWithFirstBlood({ submissions, team: teamB, question });
      expect(resB.isFirstBlood).toBe(false);
      expect(resB.firstBloodBonus).toBe(0);
      expect(resB.pointsAwarded).toBe(100); // 100 base only
      expect(teamB.score).toBe(100);
    });
  });

  describe("Core and Backup Question System", () => {
    const createCoreBackupQuestions = (roundId: string) => {
      const coreQuestions = Array.from({ length: 20 }, (_, i) => ({
        id: `q-core-${i + 1}`,
        roundId,
        title: `Core Question ${i + 1}`,
        order: i + 1,
        isCore: true,
        isReleased: true,
        isActive: true,
      }));
      
      const backupQuestions = Array.from({ length: 10 }, (_, i) => ({
        id: `q-backup-${i + 21}`,
        roundId,
        title: `Backup Question ${i + 21}`,
        order: i + 21,
        isCore: false,
        isReleased: false, // Backup questions start as not released
        isActive: true,
      }));
      
      return { coreQuestions, backupQuestions };
    };

    it("creates 20 core questions available immediately", () => {
      const roundId = "round-1-test";
      const { coreQuestions } = createCoreBackupQuestions(roundId);

      expect(coreQuestions).toHaveLength(20);
      coreQuestions.forEach((q, index) => {
        expect(q.order).toBe(index + 1);
        expect(q.isCore).toBe(true);
        expect(q.isReleased).toBe(true);
        expect(q.title).toBe(`Core Question ${index + 1}`);
      });
    });

    it("creates 10 backup questions that are initially locked", () => {
      const roundId = "round-1-test";
      const { backupQuestions } = createCoreBackupQuestions(roundId);

      expect(backupQuestions).toHaveLength(10);
      backupQuestions.forEach((q, index) => {
        expect(q.order).toBe(index + 21);
        expect(q.isCore).toBe(false);
        expect(q.isReleased).toBe(false); // Locked initially
        expect(q.title).toBe(`Backup Question ${index + 21}`);
      });
    });
  });

  describe("Round 1 State Transitions (Section 21)", () => {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["READY", "LIVE"],
      READY: ["LIVE", "DRAFT"],
      LIVE: ["PAUSED", "FINISHED"],
      PAUSED: ["LIVE", "FINISHED"],
      FINISHED: [],
    };

    const canTransition = (from: string, to: string) => {
      const allowed = validTransitions[from] || [];
      return allowed.includes(to);
    };

    it("allows DRAFT -> READY and DRAFT -> LIVE", () => {
      expect(canTransition("DRAFT", "READY")).toBe(true);
      expect(canTransition("DRAFT", "LIVE")).toBe(true);
    });

    it("allows READY -> LIVE", () => {
      expect(canTransition("READY", "LIVE")).toBe(true);
    });

    it("allows LIVE -> PAUSED and PAUSED -> LIVE", () => {
      expect(canTransition("LIVE", "PAUSED")).toBe(true);
      expect(canTransition("PAUSED", "LIVE")).toBe(true);
    });

    it("allows LIVE -> FINISHED and PAUSED -> FINISHED", () => {
      expect(canTransition("LIVE", "FINISHED")).toBe(true);
      expect(canTransition("PAUSED", "FINISHED")).toBe(true);
    });

    it("rejects invalid transitions such as FINISHED -> LIVE or DRAFT -> FINISHED", () => {
      expect(canTransition("FINISHED", "LIVE")).toBe(false);
      expect(canTransition("FINISHED", "READY")).toBe(false);
      expect(canTransition("DRAFT", "FINISHED")).toBe(false);
    });
  });
});
