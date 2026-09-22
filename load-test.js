/**
 * CIPHER CHASE - Load Test for 100+ Concurrent Users
 * 
 * This script simulates realistic CTF competition behavior:
 * - Team creation and joining
 * - Round 1 timer activation
 * - Question submission bursts
 * - Leaderboard monitoring
 * 
 * Run after deploying to Vercel to verify production readiness.
 */

const VERCEL_URL = process.env.LOAD_TEST_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 100;
const BURST_SUBMISSIONS = 30; // Simulate 30 answers submitted simultaneously

// Test data
const TEAM_NAMES = [
  'Cyber Eagles', 'Code Warriors', 'Hash Hunters', 'Binary Bandits', 
  'SQL Samurai', 'Crypto Crusaders', 'Null Pointers', 'Bit Busters',
  'Logic Lords', 'Data Dragons', 'Script Slingers', 'Bug Hunters',
  'Shell Shockers', 'Packet Pirates', 'Firewall Fighters', 'Hex Heroes'
];

const MEMBER_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia', 'Paul',
  'Quinn', 'Ruby', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xander'
];

// Test metrics
let metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageLatency: 0,
  p95Latency: 0,
  p99Latency: 0,
  latencies: [],
  errors: [],
  teamsCreated: 0,
  membersJoined: 0,
  timersStarted: 0,
  submissionsAttempted: 0,
  submissionsSuccessful: 0
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// HTTP request wrapper with metrics
async function request(method, endpoint, data = null) {
  const startTime = Date.now();
  metrics.totalRequests++;
  
  try {
    const response = await fetch(`${VERCEL_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : null,
    });
    
    const latency = Date.now() - startTime;
    metrics.latencies.push(latency);
    
    if (response.ok) {
      metrics.successfulRequests++;
      const result = await response.json();
      return { success: true, data: result, latency };
    } else {
      metrics.failedRequests++;
      const error = await response.text();
      metrics.errors.push({ endpoint, status: response.status, error });
      return { success: false, error, status: response.status, latency };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    metrics.latencies.push(latency);
    metrics.failedRequests++;
    metrics.errors.push({ endpoint, error: error.message });
    return { success: false, error: error.message, latency };
  }
}

// Simulate realistic user behavior
async function simulateUser(userId) {
  const teamName = `${randomChoice(TEAM_NAMES)}-${userId}`;
  const memberName = `${randomChoice(MEMBER_NAMES)}-${userId}`;
  const isLeader = userId % 3 === 0; // Every 3rd user is a team leader
  
  try {
    // Step 1: Create or join team
    let teamResult;
    if (isLeader) {
      // Team leader creates team
      teamResult = await request('POST', '/api/team/join', {
        teamName,
        memberName,
        phone: `555-${String(userId).padStart(4, '0')}`,
        email: `${memberName.toLowerCase()}@loadtest.com`,
        isLeader: true
      });
      
      if (teamResult.success) {
        metrics.teamsCreated++;
        console.log(`✓ Team created: ${teamName} by ${memberName}`);
      }
    } else {
      // Member joins existing team (try to join a team that should exist)
      const targetTeamId = Math.max(1, userId - 2);
      const targetTeamName = `${randomChoice(TEAM_NAMES)}-${targetTeamId}`;
      
      teamResult = await request('POST', '/api/team/join', {
        teamName: targetTeamName,
        memberName,
        isLeader: false
      });
      
      if (teamResult.success) {
        metrics.membersJoined++;
        console.log(`✓ Member joined: ${memberName} → ${targetTeamName}`);
      }
    }
    
    if (!teamResult.success) {
      console.log(`✗ Team creation/join failed for ${memberName}: ${teamResult.error}`);
      return;
    }
    
    // Step 2: Brief pause to simulate reading lobby
    await delay(randomInt(1000, 3000));
    
    // Step 3: Enter Round 1 (starts timer)
    const timerResult = await request('POST', '/api/round-1/start');
    if (timerResult.success) {
      metrics.timersStarted++;
      console.log(`✓ Timer started for ${memberName}'s team`);
    }
    
    // Step 4: Simulate question submission activity
    await delay(randomInt(2000, 5000));
    
    // Simulate 2-5 question attempts per user
    const attemptCount = randomInt(2, 5);
    for (let i = 0; i < attemptCount; i++) {
      metrics.submissionsAttempted++;
      
      // Simulate getting questions list first
      const questionsResult = await request('GET', '/api/round-1/questions');
      
      if (questionsResult.success && questionsResult.data.questions?.length > 0) {
        const question = randomChoice(questionsResult.data.questions);
        
        // Submit a random answer (most will be wrong, simulating real behavior)
        const answer = Math.random() < 0.1 ? question.answer : `wrong-answer-${randomInt(1, 100)}`;
        
        const submitResult = await request('POST', '/api/round-1/submit', {
          questionId: question.id,
          answer: answer,
          memberName: memberName
        });
        
        if (submitResult.success) {
          metrics.submissionsSuccessful++;
          if (submitResult.data.isCorrect) {
            console.log(`🎉 Correct answer by ${memberName}! Points: ${submitResult.data.points}`);
          }
        }
      }
      
      // Realistic pause between submissions
      await delay(randomInt(10000, 30000));
    }
    
    // Step 5: Occasionally check leaderboard
    if (Math.random() < 0.3) {
      await request('GET', '/api/leaderboard');
    }
    
  } catch (error) {
    console.error(`User ${userId} simulation failed:`, error.message);
    metrics.errors.push({ userId, error: error.message });
  }
}

// Simulate burst of simultaneous submissions (stress test)
async function simulateBurstSubmissions() {
  console.log(`\n🚀 Starting burst submission test (${BURST_SUBMISSIONS} simultaneous submissions)...`);
  
  const burstPromises = [];
  
  for (let i = 0; i < BURST_SUBMISSIONS; i++) {
    burstPromises.push(request('POST', '/api/round-1/submit', {
      questionId: 'test-question-id',
      answer: 'burst-test-answer',
      memberName: `BurstUser-${i}`
    }));
  }
  
  const results = await Promise.all(burstPromises);
  const successful = results.filter(r => r.success).length;
  
  console.log(`✓ Burst test completed: ${successful}/${BURST_SUBMISSIONS} successful`);
}

// Calculate performance metrics
function calculateMetrics() {
  if (metrics.latencies.length === 0) return;
  
  metrics.latencies.sort((a, b) => a - b);
  const total = metrics.latencies.reduce((sum, lat) => sum + lat, 0);
  
  metrics.averageLatency = Math.round(total / metrics.latencies.length);
  metrics.p95Latency = metrics.latencies[Math.floor(metrics.latencies.length * 0.95)];
  metrics.p99Latency = metrics.latencies[Math.floor(metrics.latencies.length * 0.99)];
}

// Main load test execution
async function runLoadTest() {
  console.log(`🔥 CIPHER CHASE Load Test Starting...`);
  console.log(`Target: ${VERCEL_URL}`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`============================================\n`);
  
  const startTime = Date.now();
  
  // Phase 1: Concurrent user simulation
  console.log(`Phase 1: Spawning ${CONCURRENT_USERS} concurrent users...`);
  const userPromises = [];
  
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    userPromises.push(simulateUser(i));
    
    // Stagger user creation to simulate realistic onboarding
    if (i % 10 === 0) {
      await delay(500);
    }
  }
  
  await Promise.all(userPromises);
  console.log(`✓ Phase 1 completed`);
  
  // Phase 2: Burst submission test
  await simulateBurstSubmissions();
  
  const totalTime = (Date.now() - startTime) / 1000;
  
  // Calculate and display results
  calculateMetrics();
  
  console.log(`\n📊 LOAD TEST RESULTS`);
  console.log(`============================================`);
  console.log(`Duration: ${totalTime.toFixed(2)}s`);
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful: ${metrics.successfulRequests} (${(metrics.successfulRequests/metrics.totalRequests*100).toFixed(1)}%)`);
  console.log(`Failed: ${metrics.failedRequests} (${(metrics.failedRequests/metrics.totalRequests*100).toFixed(1)}%)`);
  console.log(`Average Latency: ${metrics.averageLatency}ms`);
  console.log(`P95 Latency: ${metrics.p95Latency}ms`);
  console.log(`P99 Latency: ${metrics.p99Latency}ms`);
  console.log(`\nApplication Metrics:`);
  console.log(`Teams Created: ${metrics.teamsCreated}`);
  console.log(`Members Joined: ${metrics.membersJoined}`);
  console.log(`Timers Started: ${metrics.timersStarted}`);
  console.log(`Submissions: ${metrics.submissionsSuccessful}/${metrics.submissionsAttempted}`);
  
  if (metrics.errors.length > 0) {
    console.log(`\n❌ First 10 Errors:`);
    metrics.errors.slice(0, 10).forEach((error, i) => {
      console.log(`${i + 1}. ${error.endpoint || 'N/A'}: ${error.error}`);
    });
  }
  
  // Success criteria
  const errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;
  const avgLatencyOk = metrics.averageLatency < 2000; // < 2s average
  const p99LatencyOk = metrics.p99Latency < 10000; // < 10s P99
  const errorRateOk = errorRate < 5; // < 5% error rate
  
  console.log(`\n🎯 PRODUCTION READINESS:`);
  console.log(`Error Rate: ${errorRate.toFixed(1)}% ${errorRateOk ? '✅' : '❌'} (target: <5%)`);
  console.log(`Avg Latency: ${metrics.averageLatency}ms ${avgLatencyOk ? '✅' : '❌'} (target: <2000ms)`);
  console.log(`P99 Latency: ${metrics.p99Latency}ms ${p99LatencyOk ? '✅' : '❌'} (target: <10000ms)`);
  
  const overallPass = errorRateOk && avgLatencyOk && p99LatencyOk;
  console.log(`\n${overallPass ? '🎉 LOAD TEST PASSED - READY FOR PRODUCTION!' : '🚨 LOAD TEST FAILED - REQUIRES OPTIMIZATION'}`);
}

// Run the load test
if (require.main === module) {
  runLoadTest().catch(console.error);
}

module.exports = { runLoadTest, simulateUser };