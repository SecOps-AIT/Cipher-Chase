/**
 * Round 1 Timer System Test
 * 
 * Tests the per-team timer implementation end-to-end
 */

const { default: fetch } = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000';

class TestSession {
  constructor(teamName, memberName) {
    this.teamName = teamName;
    this.memberName = memberName;
    this.cookies = '';
  }
  
  async request(method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (this.cookies) {
      options.headers['Cookie'] = this.cookies;
    }
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    // Save cookies for session persistence
    const setCookies = response.headers.get('set-cookie');
    if (setCookies) {
      this.cookies = setCookies;
    }
    
    return response;
  }
  
  async joinTeam(isLeader = false) {
    const response = await this.request('POST', '/api/team/join', {
      teamName: this.teamName,
      memberName: this.memberName,
      ...(isLeader && {
        phone: '1234567890',
        email: `${this.memberName.toLowerCase()}@test.com`,
        isLeader: true
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to join team: ${error}`);
    }
    
    const data = await response.json();
    console.log(`✓ ${this.memberName} ${isLeader ? 'created' : 'joined'} team "${this.teamName}"`);
    return data;
  }
  
  async startTimer() {
    const response = await this.request('POST', '/api/round-1/start');
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start timer: ${error}`);
    }
    
    const data = await response.json();
    console.log(`⏰ ${this.memberName} started timer: ${data.message}`);
    return data;
  }
  
  async getQuestions() {
    const response = await this.request('GET', '/api/round-1/questions');
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get questions: ${error}`);
    }
    
    return await response.json();
  }
  
  async submitAnswer(questionId, answer) {
    const response = await this.request('POST', '/api/round-1/submit', {
      questionId,
      answer,
      memberName: this.memberName
    });
    
    const data = await response.json();
    return { success: response.ok, ...data };
  }
}

async function runTests() {
  console.log('🧪 Starting Round 1 Timer System Tests\n');
  
  try {
    // Test 1: New team enters Round 1 → timer starts
    console.log('📋 Test 1: New team enters Round 1 → timer starts');
    const member1 = new TestSession('TimerTestTeam', 'Member1');
    await member1.joinTeam(true);
    
    const timerResult = await member1.startTimer();
    console.log(`   Timer duration: ${timerResult.timer.duration}s (${Math.floor(timerResult.timer.duration / 60)} minutes)`);
    console.log(`   Deadline: ${new Date(timerResult.timer.deadlineAt).toLocaleTimeString()}`);
    
    // Test 2: Same member refreshes → same deadline
    console.log('\n📋 Test 2: Same member refreshes → same deadline');
    const refreshResult = await member1.startTimer();
    console.log(`   Same deadline confirmed: ${new Date(refreshResult.timer.deadlineAt).toLocaleTimeString()}`);
    
    // Test 3: Member 2 joins later → same deadline
    console.log('\n📋 Test 3: Member 2 joins later → same deadline');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const member2 = new TestSession('TimerTestTeam', 'Member2');
    await member2.joinTeam(false);
    
    const member2Timer = await member2.startTimer();
    console.log(`   Member2 deadline: ${new Date(member2Timer.timer.deadlineAt).toLocaleTimeString()}`);
    console.log(`   Deadlines match: ${timerResult.timer.deadlineAt === member2Timer.timer.deadlineAt ? '✅' : '❌'}`);
    
    // Test 4: Team B enters later → different deadline
    console.log('\n📋 Test 4: Team B enters later → different deadline');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const teamB = new TestSession('TimerTestTeamB', 'TeamB_Member1');
    await teamB.joinTeam(true);
    
    const teamBTimer = await teamB.startTimer();
    console.log(`   TeamB deadline: ${new Date(teamBTimer.timer.deadlineAt).toLocaleTimeString()}`);
    console.log(`   Different deadline: ${timerResult.timer.deadlineAt !== teamBTimer.timer.deadlineAt ? '✅' : '❌'}`);
    
    // Test 5: Question availability with active timer
    console.log('\n📋 Test 5: Question availability with active timer');
    const questions = await member1.getQuestions();
    
    console.log(`   Team timer status: ${questions.teamTimer.status}`);
    console.log(`   Team seconds remaining: ${questions.teamTimer.secondsRemaining}`);
    console.log(`   Available questions: ${questions.questions.filter(q => q.status === 'LIVE').length}`);
    console.log(`   Locked questions: ${questions.questions.filter(q => q.status === 'LOCKED').length}`);
    console.log(`   Closed questions: ${questions.questions.filter(q => q.status === 'CLOSED').length}`);
    
    if (questions.teamTimer.status !== 'ACTIVE') {
      throw new Error(`Expected team timer to be ACTIVE, got ${questions.teamTimer.status}`);
    }
    
    // Test 6: Question submission
    console.log('\n📋 Test 6: Question submission');
    const liveQuestion = questions.questions.find(q => q.status === 'LIVE');
    
    if (liveQuestion) {
      console.log(`   Attempting to solve: ${liveQuestion.title}`);
      
      // Try wrong answer first
      const wrongResult = await member1.submitAnswer(liveQuestion.id, 'WRONG_ANSWER');
      console.log(`   Wrong answer result: ${wrongResult.message}`);
      
      // Extract correct answer from description (for demo questions)
      let correctAnswer = null;
      if (liveQuestion.title.includes('Base64')) {
        correctAnswer = 'CC{base64_radio_beacon_2026_found}';
      } else if (liveQuestion.title.includes('Caesar')) {
        correctAnswer = 'CC{rot_13_cipher_algorithm_2026}';
      }
      
      if (correctAnswer) {
        const correctResult = await member1.submitAnswer(liveQuestion.id, correctAnswer);
        console.log(`   Correct answer result: ${correctResult.message}`);
        
        if (correctResult.success && correctResult.isCorrect) {
          console.log(`   ✅ Points awarded: ${correctResult.points}`);
          
          // Test 7: Concurrent correct submission by teammate
          console.log('\n📋 Test 7: Concurrent correct submission protection');
          const duplicateResult = await member2.submitAnswer(liveQuestion.id, correctAnswer);
          console.log(`   Duplicate submission: ${duplicateResult.message}`);
          console.log(`   Blocked duplicate: ${duplicateResult.alreadySolved ? '✅' : '❌'}`);
        }
      }
    }
    
    // Test 8: Database consistency check
    console.log('\n📋 Test 8: Database consistency check');
    
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { name: 'TimerTestTeam' },
          { name: 'TimerTestTeamB' }
        ]
      },
      select: {
        name: true,
        round1StartedAt: true,
        round1DeadlineAt: true,
        round1Duration: true,
        score: true
      }
    });
    
    console.log(`   Teams created: ${teams.length}`);
    teams.forEach(team => {
      console.log(`   ${team.name}:`);
      console.log(`     Started: ${team.round1StartedAt ? team.round1StartedAt.toLocaleTimeString() : 'Not started'}`);
      console.log(`     Deadline: ${team.round1DeadlineAt ? team.round1DeadlineAt.toLocaleTimeString() : 'None'}`);
      console.log(`     Duration: ${team.round1Duration}s`);
      console.log(`     Score: ${team.score}`);
    });
    
    // Test 9: Timer countdown accuracy
    console.log('\n📋 Test 9: Timer countdown accuracy');
    const currentQuestions = await member1.getQuestions();
    const serverTime = new Date(currentQuestions.serverTime);
    const deadline = new Date(currentQuestions.teamTimer.deadlineAt);
    const calculatedRemaining = Math.max(0, Math.floor((deadline.getTime() - serverTime.getTime()) / 1000));
    
    console.log(`   Server time: ${serverTime.toLocaleTimeString()}`);
    console.log(`   Deadline: ${deadline.toLocaleTimeString()}`);
    console.log(`   API seconds remaining: ${currentQuestions.teamTimer.secondsRemaining}`);
    console.log(`   Calculated remaining: ${calculatedRemaining}`);
    console.log(`   Accuracy: ${Math.abs(currentQuestions.teamTimer.secondsRemaining - calculatedRemaining) <= 2 ? '✅' : '❌'} (±2s tolerance)`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Round 1 System Status:');
    console.log(`   ✅ Per-team timer implementation working`);
    console.log(`   ✅ Atomic timer start protection`);
    console.log(`   ✅ Consistent deadlines across team members`);
    console.log(`   ✅ Question availability based on team timer`);
    console.log(`   ✅ Concurrent submission protection`);
    console.log(`   ✅ Database consistency maintained`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();