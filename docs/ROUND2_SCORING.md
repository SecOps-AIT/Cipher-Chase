# Round 2 Time Auction Scoring System

## Overview

The Round 2 scoring system rewards teams for aggressive time bids and fast problem-solving. Unlike traditional CTF scoring, teams earn **bonus points** based on how much time they save compared to the baseline.

## Scoring Philosophy

**Core Principle**: Risk-reward balance through time commitments

- **Aggressive bids** (less time) = higher potential bonuses
- **Conservative bids** (more time) = lower bonuses but safer
- **Missing deadlines** = lose the bonus as a penalty
- **Base points always awarded** for correct solutions (even if timer expires)

## Scoring Formula

### Success (Solved Within Time)

```
Total Points = Base Points + Time Bonus

Time Bonus = (Time Saved / Base Time) × Base Points
```

**Example:**
- Base time: 10:00 (600 seconds)
- Base points: 200
- Team bids: 6:00 (360 seconds)
- Time saved: 240 seconds (40%)
- **Time bonus: 0.40 × 200 = 80 points**
- **Total: 280 points**

### Failure (Timer Expires)

```
Penalty = -Time Bonus (the bonus they would have earned)

Team Score = Team Score - Time Bonus
```

**Example (continuing from above):**
- Team bid 6:00 but took longer
- Timer expired
- **Penalty: -80 points**
- Team loses 80 points from their total score

### Important: Base Points Protection

Even if a team times out but later solves the question, they still get the base points. The penalty is only the lost bonus opportunity.

## Scoring Scenarios

### Scenario 1: Conservative Bidder Wins

**Setup:**
- Question: "SQL Injection Challenge"
- Base time: 10:00 (600s)
- Base points: 200

**Team Bid:** 9:00 (540s)
- Time saved: 60s (10%)
- Potential bonus: 20 points
- Potential total: **220 points**

**Outcome:** Solved in 8:30
- ✅ **Awarded: 220 points**
- Safe strategy paid off!

### Scenario 2: Aggressive Bidder Wins Big

**Setup:** Same question

**Team Bid:** 4:00 (240s)
- Time saved: 360s (60%)
- Potential bonus: 120 points
- Potential total: **320 points**

**Outcome:** Solved in 3:45
- ✅ **Awarded: 320 points**
- High risk, high reward!

### Scenario 3: Aggressive Bidder Fails

**Setup:** Same question

**Team Bid:** 4:00 (240s)
- Potential bonus: 120 points

**Outcome:** Took 5:00 - timer expired
- ❌ **Penalty: -120 points**
- Team score decreased by 120
- Risk didn't pay off this time

### Scenario 4: Late Solve After Expiration

**Setup:** Same question

**Team Bid:** 4:00 (240s)

**Timeline:**
1. Timer started at 14:00
2. Timer expired at 14:04 → **Penalty applied: -120 pts**
3. Team finally solved at 14:10

**Result:**
- Assignment marked as FAILED (timer expired)
- Penalty remains: -120 points
- **No additional points for late solve**
- Question remains unsolved for that team

### Scenario 5: Multiple Assignment Strategy

**Team has 3 active questions:**

1. **Easy Question** (Conservative)
   - Bid: 8:00 / Base: 10:00
   - Bonus: 40 pts
   - Strategy: Safe points

2. **Medium Question** (Balanced)
   - Bid: 6:00 / Base: 10:00  
   - Bonus: 80 pts
   - Strategy: Moderate risk

3. **Hard Question** (Aggressive)
   - Bid: 3:00 / Base: 10:00
   - Bonus: 140 pts
   - Strategy: High risk/reward

**Outcome if all succeed:** +460 points total
**Outcome if hard fails:** +120 - 140 = -20 points net

## Bonus Calculation Details

### Time Reduction Percentage

```typescript
timeReduction = baseTime - bidTime
reductionPercentage = timeReduction / baseTime
```

### Bonus Points

```typescript
bonusPoints = Math.floor(reductionPercentage × basePoints)
```

**Examples:**
| Base Time | Bid Time | Reduction | Percentage | Base Pts | Bonus Pts |
|-----------|----------|-----------|------------|----------|-----------|
| 10:00     | 9:00     | 1:00      | 10%        | 200      | 20        |
| 10:00     | 7:00     | 3:00      | 30%        | 200      | 60        |
| 10:00     | 5:00     | 5:00      | 50%        | 200      | 100       |
| 10:00     | 3:00     | 7:00      | 70%        | 200      | 140       |
| 10:00     | 1:00     | 9:00      | 90%        | 200      | 180       |

### Edge Cases

**Bid equals base time:**
- Time reduction = 0
- Bonus = 0 points
- Just gets base points if solved

**Bid exceeds base time:**
- System prevents this during bid validation
- Bids must be less than base time

**Bid is very low (< 1 minute):**
- Allowed but very risky
- Could earn huge bonus or lose it all
- Admin can set minimum bid time per question

## Implementation

### Database Schema

```prisma
model TeamChallengeAssignment {
  bidTimeSeconds    Int      // Team's time bid
  bonusPoints       Int      // Pre-calculated bonus
  startedAt         DateTime?
  deadlineAt        DateTime? // startedAt + bidTimeSeconds
  completedAt       DateTime?
  failedAt          DateTime?
  finalScoreChange  Int?     // Actual score change (+ or -)
  status            AssignmentStatus
  // READY, ACTIVE, COMPLETED, FAILED
}

model ScoreEvent {
  type    String  
  // ROUND_2_SOLVE - successful completion
  // ROUND_2_TIMEOUT_PENALTY - timer expired
  points  Int     // Positive for success, negative for penalty
  reason  String  // Details for audit trail
}
```

### Core Functions

#### Calculate Bonus (Pre-Auction)

```typescript
function calculateBonus(
  baseTimeSeconds: number,
  bidTimeSeconds: number,
  basePoints: number
): BonusCalculation {
  const timeReduction = Math.max(0, baseTimeSeconds - bidTimeSeconds);
  const reductionPercentage = baseTimeSeconds > 0 
    ? (timeReduction / baseTimeSeconds) 
    : 0;
  
  const bonusPoints = Math.floor(reductionPercentage * basePoints);
  const potentialScore = basePoints + bonusPoints;
  const failurePenalty = -bonusPoints;

  return {
    baseTime: baseTimeSeconds,
    bidTime: bidTimeSeconds,
    timeReduction,
    bonusPoints,
    potentialScore,
    failurePenalty
  };
}
```

#### Award Success Score

```typescript
// On correct answer submission
const scoreChange = basePoints + bonusPoints;

await prisma.team.update({
  where: { id: teamId },
  data: {
    score: { increment: scoreChange }
  }
});

await prisma.scoreEvent.create({
  data: {
    teamId,
    type: "ROUND_2_SOLVE",
    points: scoreChange,
    reason: `Solved "${questionTitle}" in ${timeUsed}s`
  }
});
```

#### Apply Timeout Penalty

```typescript
// When timer expires
const penalty = bonusPoints * -1;

await prisma.team.update({
  where: { id: teamId },
  data: {
    score: { increment: penalty } // Negative value
  }
});

await prisma.scoreEvent.create({
  data: {
    teamId,
    type: "ROUND_2_TIMEOUT_PENALTY",
    points: penalty,
    reason: `Time auction failure penalty for "${questionTitle}"`
  }
});
```

## Strategic Considerations

### For Teams

**Bidding Strategy:**
1. **Assess difficulty** - Look at topic and outline
2. **Know your strengths** - Bid aggressively on familiar topics
3. **Portfolio approach** - Mix conservative and aggressive bids
4. **Resource allocation** - Consider team member availability

**Time Management:**
1. **Start immediately** - Timer starts on first open
2. **Parallelize** - Multiple members can work together
3. **Cut losses** - If stuck, focus on other questions
4. **Track time** - Watch the countdown closely

### For Admins

**Question Configuration:**
1. **Base time** - Should be generous but not trivial
2. **Base points** - Match difficulty to points
3. **Auction timing** - Space out auctions to manage load

**Balance Considerations:**
1. **Risk/reward ratio** - 1:1 (bonus equals penalty) is fair
2. **Question variety** - Mix easy, medium, hard
3. **Auction frequency** - Don't overwhelm teams

## Leaderboard Impact

### Score Volatility

Round 2 scoring creates dynamic leaderboards:
- Big jumps from successful aggressive bids
- Falls from expired timers
- Constant position changes

### Comeback Potential

Trailing teams can catch up:
- Aggressive bidding on remaining auctions
- High-risk, high-reward strategy
- One big win can change standings

### Safe Leading

Leading teams might:
- Bid conservatively to protect lead
- Focus on base points over bonuses
- Avoid penalties

## Analytics and Metrics

### Team Performance Metrics

```sql
-- Average bonus percentage earned
SELECT 
  t.name,
  AVG(tca.bonusPoints) as avg_bonus,
  AVG(CASE 
    WHEN tca.status = 'COMPLETED' 
    THEN (tca.bonusPoints::float / aq.basePoints) * 100 
    ELSE 0 
  END) as avg_bonus_percentage
FROM "Team" t
JOIN "TeamChallengeAssignment" tca ON t.id = tca.teamId
JOIN "AuctionQuestion" aq ON tca.auctionQuestionId = aq.id
GROUP BY t.id, t.name;
```

### Question Difficulty Analysis

```sql
-- Success rate by question
SELECT 
  aq.title,
  COUNT(*) as total_assignments,
  SUM(CASE WHEN tca.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
  AVG(CASE 
    WHEN tca.completedAt IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (tca.completedAt - tca.startedAt))
    ELSE NULL 
  END) as avg_solve_time
FROM "AuctionQuestion" aq
JOIN "TeamChallengeAssignment" tca ON aq.id = tca.auctionQuestionId
GROUP BY aq.id, aq.title;
```

### Bidding Behavior

```sql
-- Average bid aggressiveness
SELECT 
  t.name,
  AVG((aq.baseTimeSeconds - tca.bidTimeSeconds)::float / aq.baseTimeSeconds * 100) as avg_time_reduction_pct
FROM "Team" t
JOIN "TeamChallengeAssignment" tca ON t.id = tca.teamId
JOIN "AuctionQuestion" aq ON tca.auctionQuestionId = aq.id
GROUP BY t.id, t.name
ORDER BY avg_time_reduction_pct DESC;
```

## Testing Scoring

### Unit Tests

```typescript
describe('Bonus calculation', () => {
  it('should calculate 50% bonus correctly', () => {
    const result = calculateBonus(600, 300, 200);
    expect(result.bonusPoints).toBe(100);
    expect(result.potentialScore).toBe(300);
    expect(result.failurePenalty).toBe(-100);
  });
});
```

### Integration Tests

```typescript
describe('Score awarding', () => {
  it('should award base + bonus on success', async () => {
    const team = await createTestTeam();
    const assignment = await createTestAssignment(team.id);
    
    await submitCorrectAnswer(assignment.id);
    
    const updatedTeam = await getTeam(team.id);
    expect(updatedTeam.score).toBe(
      initialScore + basePoints + bonusPoints
    );
  });

  it('should apply penalty on timeout', async () => {
    const team = await createTestTeam();
    const assignment = await createExpiredAssignment(team.id);
    
    await processExpiredTimers();
    
    const updatedTeam = await getTeam(team.id);
    expect(updatedTeam.score).toBe(
      initialScore - bonusPoints
    );
  });
});
```

## FAQ

**Q: What if a team solves after the timer expires?**
A: The penalty already applied remains. No additional points are awarded. The assignment stays as FAILED.

**Q: Can a team go negative in score?**
A: No, team scores have a floor of 0. Penalties cannot take a team below zero.

**Q: What if there's a technical issue during the timer?**
A: Admins can manually adjust scores using the score adjustment API. All adjustments are logged in the audit trail.

**Q: Can teams see the bonus calculation before bidding?**
A: Yes, the UI shows potential bonus when teams adjust their bid time.

**Q: How are ties broken in auctions?**
A: First bid submitted wins if times are equal. Timestamp is the tiebreaker.

**Q: Can admins change the scoring formula mid-event?**
A: The formula is baked into the code. Changing it mid-event would be unfair and require code changes + testing.

## Best Practices

### For Event Organizers

1. **Test thoroughly** - Run through full auction lifecycle before event
2. **Set clear rules** - Explain scoring in participant briefing
3. **Monitor actively** - Watch for timer issues or bugs
4. **Be fair** - Manual adjustments only for technical issues
5. **Document everything** - Use audit logs for dispute resolution

### For Participants

1. **Understand the math** - Know how bonuses are calculated
2. **Practice time management** - Use Round 1 to assess your speed
3. **Communicate** - Coordinate bids with your team
4. **Track progress** - Monitor your timer closely
5. **Learn from failures** - Adjust bidding strategy based on performance
