import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { 
  getQuestionHintData, 
  claimQuestionHint, 
  manageQuestionHints,
  getQuestionsWithHintStats
} from '../lib/round1';

const prisma = new PrismaClient();

// Configure longer timeout for database operations
const TEST_TIMEOUT = 15000;

describe('Hint System', () => {
  let testEvent: any;
  let testTeam: any;
  let round1: any;
  let testQuestion: any;

  beforeAll(async () => {
    // Create test event
    testEvent = await prisma.event.create({
      data: {
        name: 'Hint System Test Event',
        status: 'ACTIVE'
      }
    });

    // Create Round 1
    round1 = await prisma.round.create({
      data: {
        eventId: testEvent.id,
        name: 'Round 1 — Themed CTF',
        number: 1,
        status: 'LIVE',
        startedAt: new Date()
      }
    });

    // Create test team
    testTeam = await prisma.team.create({
      data: {
        eventId: testEvent.id,
        name: 'Test Team',
        joinCode: 'TEST123',
        score: 100, // Start with 100 score points
        qualified: false,
        round1Duration: 1200
      }
    });

    // Create test question
    testQuestion = await prisma.question.create({
      data: {
        roundId: round1.id,
        title: 'Test Question with Hints',
        description: 'A test question for hint system',
        answer: 'CC{test_answer}',
        points: 100,
        difficulty: 'MEDIUM',
        category: 'Test',
        answerMode: 'TRIMMED',
        isActive: true,
        isCore: true,
        isReleased: true,
        order: 1
      }
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up test data
    await prisma.hintClaim.deleteMany({ where: { teamId: testTeam.id } });
    await prisma.questionHint.deleteMany({ 
      where: { 
        OR: [
          { questionId: testQuestion.id },
          { question: { roundId: round1.id } }
        ]
      } 
    });
    await prisma.auditLog.deleteMany({ where: { eventId: testEvent.id } });
    await prisma.submission.deleteMany({ where: { questionId: testQuestion.id } });
    await prisma.question.deleteMany({ where: { roundId: round1.id } });
    await prisma.round.delete({ where: { id: round1.id } });
    await prisma.team.delete({ where: { id: testTeam.id } });
    await prisma.event.delete({ where: { id: testEvent.id } });
    await prisma.$disconnect();
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    // Reset team score and thoroughly clear all hint-related data
    await prisma.team.update({
      where: { id: testTeam.id },
      data: { score: 100 }
    });
    
    // Delete all hint claims for this team
    await prisma.hintClaim.deleteMany({ where: { teamId: testTeam.id } });
    
    // Delete all hints for test questions to ensure clean state
    await prisma.questionHint.deleteMany({ 
      where: { 
        OR: [
          { questionId: testQuestion.id },
          // Also clean hints from any other test questions that might exist
          { question: { roundId: round1.id } }
        ]
      } 
    });
  }, TEST_TIMEOUT);

  describe('Hint Management (Admin)', () => {
    it('should create hints for a question', async () => {
      const hints = [
        {
          title: 'First Hint',
          content: 'This is the first hint',
          cost: 2,
          order: 1
        },
        {
          title: 'Second Hint', 
          content: 'This is the second hint',
          cost: 3,
          order: 2
        }
      ];

      const result = await manageQuestionHints(testQuestion.id, hints);
      
      expect(result.success).toBe(true);
      expect(result.hints).toHaveLength(2);
      expect(result.hints![0].title).toBe('First Hint');
      expect(result.hints![1].cost).toBe(3);
    }, TEST_TIMEOUT);

    it('should update existing hints', async () => {
      // First create some hints
      await manageQuestionHints(testQuestion.id, [
        { title: 'Original Hint', content: 'Original content', cost: 2, order: 1 }
      ]);

      const existingHints = await prisma.questionHint.findMany({
        where: { questionId: testQuestion.id }
      });

      // Now update the hint
      const updatedHints = [
        {
          id: existingHints[0].id,
          title: 'Updated Hint',
          content: 'Updated content',
          cost: 5,
          order: 1
        }
      ];

      const result = await manageQuestionHints(testQuestion.id, updatedHints);
      
      expect(result.success).toBe(true);
      expect(result.hints![0].title).toBe('Updated Hint');
      expect(result.hints![0].cost).toBe(5);
    }, TEST_TIMEOUT);

    it('should delete hints not in the update list', async () => {
      // Create 3 hints
      await manageQuestionHints(testQuestion.id, [
        { title: 'Hint 1', content: 'Content 1', cost: 2, order: 1 },
        { title: 'Hint 2', content: 'Content 2', cost: 3, order: 2 },
        { title: 'Hint 3', content: 'Content 3', cost: 4, order: 3 }
      ]);

      const existingHints = await prisma.questionHint.findMany({
        where: { questionId: testQuestion.id },
        orderBy: { order: 'asc' }
      });

      // Update to keep only the first 2 hints
      const result = await manageQuestionHints(testQuestion.id, [
        { id: existingHints[0].id, title: 'Hint 1', content: 'Content 1', cost: 2, order: 1 },
        { id: existingHints[1].id, title: 'Hint 2', content: 'Content 2', cost: 3, order: 2 }
      ]);

      expect(result.success).toBe(true);
      expect(result.hints).toHaveLength(2);

      // Verify only 2 hints remain in database
      const remainingHints = await prisma.questionHint.findMany({
        where: { questionId: testQuestion.id }
      });
      expect(remainingHints).toHaveLength(2);
    }, TEST_TIMEOUT);
  });

  describe('Hint Data Retrieval', () => {
    beforeEach(async () => {
      // Create test hints
      await manageQuestionHints(testQuestion.id, [
        { title: 'Hint 1', content: 'First clue', cost: 2, order: 1 },
        { title: 'Hint 2', content: 'Second clue', cost: 3, order: 2 }
      ]);
    });

    it('should get hint data for a question without claims', async () => {
      const hintData = await getQuestionHintData(testQuestion.id, testTeam.id);
      
      expect(hintData).toBeTruthy();
      expect(hintData!.questionId).toBe(testQuestion.id);
      expect(hintData!.questionTitle).toBe(testQuestion.title);
      expect(hintData!.availableHints).toHaveLength(2);
      expect(hintData!.teamScore).toBe(100);
      expect(hintData!.totalHintsClaimed).toBe(0);
      expect(hintData!.totalCostPaid).toBe(0);
      
      expect(hintData!.availableHints[0].isClaimed).toBe(false);
      expect(hintData!.availableHints[1].isClaimed).toBe(false);
    }, TEST_TIMEOUT);

    it('should return null for non-existent question', async () => {
      const hintData = await getQuestionHintData('non-existent-id', testTeam.id);
      expect(hintData).toBeNull();
    }, TEST_TIMEOUT);
  });

  describe('Hint Claiming', () => {
    let testHint: any;

    beforeEach(async () => {
      // Create test hints
      const result = await manageQuestionHints(testQuestion.id, [
        { title: 'Test Hint', content: 'This is a test hint', cost: 5, order: 1 }
      ]);
      
      const hints = await prisma.questionHint.findMany({
        where: { questionId: testQuestion.id }
      });
      testHint = hints[0];
    });

    it('should claim a hint and deduct score points', async () => {
      const result = await claimQuestionHint(testHint.id, testTeam.id);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Hint claimed');
      expect(result.remainingScore).toBe(95); // 100 - 5
      expect(result.hint!.isClaimed).toBe(true);

      // Verify claim exists in database
      const claim = await prisma.hintClaim.findUnique({
        where: {
          teamId_questionHintId: {
            teamId: testTeam.id,
            questionHintId: testHint.id
          }
        }
      });
      expect(claim).toBeTruthy();
      expect(claim!.cost).toBe(5);
    }, TEST_TIMEOUT);

    it('should prevent claiming the same hint twice', async () => {
      // Claim once
      await claimQuestionHint(testHint.id, testTeam.id);
      
      // Try to claim again
      const result = await claimQuestionHint(testHint.id, testTeam.id);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('already claimed');
    }, TEST_TIMEOUT);

    it('should prevent claiming when score is insufficient', async () => {
      // Reduce score to less than hint cost
      await prisma.team.update({
        where: { id: testTeam.id },
        data: { score: 3 } // Hint costs 5
      });

      const result = await claimQuestionHint(testHint.id, testTeam.id);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient score points');
    }, TEST_TIMEOUT);

    it('should fail for non-existent hint', async () => {
      const result = await claimQuestionHint('non-existent-hint', testTeam.id);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Hint not found');
    }, TEST_TIMEOUT);
  });

  describe('Hint Data with Claims', () => {
    let testHint1: any;
    let testHint2: any;

    beforeEach(async () => {
      // Create test hints
      await manageQuestionHints(testQuestion.id, [
        { title: 'Hint 1', content: 'First clue', cost: 2, order: 1 },
        { title: 'Hint 2', content: 'Second clue', cost: 3, order: 2 }
      ]);

      const hints = await prisma.questionHint.findMany({
        where: { questionId: testQuestion.id },
        orderBy: { order: 'asc' }
      });
      testHint1 = hints[0];
      testHint2 = hints[1];

      // Claim the first hint
      await claimQuestionHint(testHint1.id, testTeam.id);
    });

    it('should show claim status correctly', async () => {
      const hintData = await getQuestionHintData(testQuestion.id, testTeam.id);
      
      expect(hintData!.totalHintsClaimed).toBe(1);
      expect(hintData!.totalCostPaid).toBe(2);
      expect(hintData!.teamScore).toBe(98); // 100 - 2
      
      expect(hintData!.availableHints[0].isClaimed).toBe(true);
      expect(hintData!.availableHints[0].claimedAt).toBeTruthy();
      expect(hintData!.availableHints[1].isClaimed).toBe(false);
    }, TEST_TIMEOUT);
  });

  describe('Question Hint Statistics', () => {
    let question2: any;

    beforeAll(async () => {
      // Create second question for statistics testing
      question2 = await prisma.question.create({
        data: {
          roundId: round1.id,
          title: 'Second Question',
          description: 'Another test question',
          answer: 'CC{test_answer_2}',
          points: 150,
          difficulty: 'HARD',
          category: 'Test',
          answerMode: 'TRIMMED',
          isActive: true,
          isCore: true,
          isReleased: true,
          order: 2
        }
      });
    }, TEST_TIMEOUT);

    afterAll(async () => {
      await prisma.questionHint.deleteMany({ where: { questionId: question2.id } });
      await prisma.question.delete({ where: { id: question2.id } });
    }, TEST_TIMEOUT);

    it('should calculate hint statistics correctly', async () => {
      // Add hints to both questions
      await manageQuestionHints(testQuestion.id, [
        { title: 'Q1 Hint 1', content: 'Content 1', cost: 2, order: 1 },
        { title: 'Q1 Hint 2', content: 'Content 2', cost: 4, order: 2 }
      ]);

      await manageQuestionHints(question2.id, [
        { title: 'Q2 Hint 1', content: 'Content 1', cost: 3, order: 1 }
      ]);

      // Claim some hints
      const q1Hints = await prisma.questionHint.findMany({
        where: { questionId: testQuestion.id }
      });
      const q2Hints = await prisma.questionHint.findMany({
        where: { questionId: question2.id }
      });

      await claimQuestionHint(q1Hints[0].id, testTeam.id); // Claim first hint from Q1
      await claimQuestionHint(q2Hints[0].id, testTeam.id); // Claim hint from Q2

      const stats = await getQuestionsWithHintStats(round1.id);
      
      expect(stats).toHaveLength(2);
      
      const q1Stats = stats.find(s => s.id === testQuestion.id);
      const q2Stats = stats.find(s => s.id === question2.id);
      
      expect(q1Stats!.totalHints).toBe(2);
      expect(q1Stats!.totalClaims).toBe(1);
      expect(q1Stats!.avgHintCost).toBe(3); // (2+4)/2 = 3
      
      expect(q2Stats!.totalHints).toBe(1);
      expect(q2Stats!.totalClaims).toBe(1);
      expect(q2Stats!.avgHintCost).toBe(3);
    }, TEST_TIMEOUT);
  });
});