# Round 2 Testing Guide

## Overview

This document describes the comprehensive test suite for the Round 2 time auction system. The tests cover all critical functionality including auction management, bidding, timer system, scoring, and hint integration.

## Test Structure

### Test Files

1. **`tests/round2-auction.test.ts`** - Auction core functionality
   - Time format utilities
   - Bonus calculations
   - Auction question creation
   - Bidding system
   - Auction settlement
   - Full lifecycle integration

2. **`tests/round2-timer.test.ts`** - Timer system
   - Timer start and validation
   - Timer status and countdown
   - Answer submission with timing
   - Expired timer processing
   - Edge cases and security

## Running Tests

### Run All Round 2 Tests

```bash
npm test -- round2
```

### Run Specific Test Files

```bash
# Auction tests only
npm test -- round2-auction.test

# Timer tests only
npm test -- round2-timer.test
```

### Run Individual Test Suites

```bash
# Specific test suite
npm test -- round2-auction.test -t "Bonus Calculation"

# Single test
npm test -- round2-auction.test -t "should calculate 50% bonus correctly"
```

### Watch Mode (Development)

```bash
npm test -- round2 --watch
```

## Test Coverage

### Auction System Tests

#### Time Utilities (8 tests)
- ✅ Format seconds to MM:SS
- ✅ Parse MM:SS to seconds
- ✅ Handle various time formats

#### Bonus Calculation (6 tests)
- ✅ 0% bonus (bid = base time)
- ✅ 50% bonus calculation
- ✅ 75% bonus calculation
- ✅ 90% bonus calculation
- ✅ Different base points
- ✅ Floor bonus to integer

#### Auction Creation (3 tests)
- ✅ Create valid auction question
- ✅ Reject invalid base time
- ✅ Reject invalid base points

#### Bidding System (7 tests)
- ✅ Accept valid bid
- ✅ Reject bid exceeding base time
- ✅ Update bid with lower time
- ✅ Reject bid update with higher time
- ✅ Multiple teams bidding
- ✅ Reject bid on closed auction
- ✅ Timestamp-based tiebreaking

#### Auction Settlement (3 tests)
- ✅ Settle with lowest bidder
- ✅ Reject settlement of non-closed auction
- ✅ Prevent double settlement

#### Integration (1 test)
- ✅ Complete auction lifecycle

**Total Auction Tests: 28**

### Timer System Tests

#### Timer Start (4 tests)
- ✅ Start timer successfully
- ✅ Reject starting twice
- ✅ Reject non-READY assignment
- ✅ Reject wrong team

#### Timer Status (3 tests)
- ✅ Get active timer status
- ✅ Calculate time remaining correctly
- ✅ Return null for non-started

#### Answer Submission (5 tests)
- ✅ Accept correct answer within time
- ✅ Reject incorrect answer
- ✅ Handle case-insensitive answers
- ✅ Award decreasing bonus
- ✅ Reject after expiration

#### Expired Processing (3 tests)
- ✅ Process expired and apply penalties
- ✅ Skip non-expired timers
- ✅ Handle multiple expired timers

#### Edge Cases (4 tests)
- ✅ Very short time limits
- ✅ Very long time limits
- ✅ Prevent timer manipulation
- ✅ Concurrent access

**Total Timer Tests: 19**

**Grand Total: 47 comprehensive tests**

## Test Data Setup

### Test Event Structure

```typescript
Event: "Round 2 Test Event"
  └── Round 2: "Time Auction"
      ├── Team Alpha (qualified, score: 1000)
      ├── Team Beta (qualified, score: 1000)
      └── Question: "Test Crypto Challenge"
          └── AuctionQuestion: "Crypto Auction #1"
              ├── Base Time: 10:00 (600s)
              ├── Base Points: 200
              ├── Status: DRAFT → OPEN → CLOSED → SOLD
              ├── Bids: [Team Alpha: 7:30, Team Beta: 5:50]
              └── Winner: Team Beta
```

### Database Isolation

Each test suite:
1. Creates fresh test data in `beforeAll`
2. Cleans up in `afterAll`
3. Uses transactions where possible
4. Avoids test interference

## Key Test Scenarios

### Scenario 1: Conservative Bidder Wins

```typescript
// Team bids 9:00 on 10:00 question (10% time savings)
// Expected: 20 point bonus (10% of 200)
// If solved: 220 points awarded
// If timeout: -20 points penalty
```

### Scenario 2: Aggressive Bidder Success

```typescript
// Team bids 5:00 on 10:00 question (50% time savings)
// Expected: 100 point bonus (50% of 200)
// Solves in 4:30: 300 points awarded
```

### Scenario 3: Aggressive Bidder Failure

```typescript
// Team bids 4:00 on 10:00 question (60% bonus)
// Timer expires at 4:00
// Expected: -120 points penalty
```

### Scenario 4: Bid Update Strategy

```typescript
// Team initially bids 7:00
// Sees competitor bid 6:00
// Updates bid to 5:30 (allowed - lower)
// Tries to update to 6:30 (rejected - higher)
```

### Scenario 5: Last-Second Submission

```typescript
// Timer: 5:00 bid time
// Solves at 4:59 (1 second remaining)
// Full bonus awarded + base points
```

## Assertions and Validations

### Timing Assertions

```typescript
// Timer accuracy (allow 1-second margin)
expect(timeRemaining).toBeCloseTo(expectedTime, 1);

// Duration checks
const duration = deadlineTime - startTime;
expect(duration / 1000).toBeCloseTo(bidTimeSeconds, 1);
```

### Score Assertions

```typescript
// Bonus calculation
const expectedBonus = Math.floor(
  (reductionPercentage) * basePoints
);
expect(actualBonus).toBe(expectedBonus);

// Score changes
const initialScore = team.score;
// ... action ...
const finalScore = team.score;
expect(finalScore - initialScore).toBe(expectedChange);
```

### Status Transitions

```typescript
// Auction lifecycle
expect(auction.status).toBe("DRAFT");
// ... open ...
expect(auction.status).toBe("OPEN");
// ... close ...
expect(auction.status).toBe("CLOSED");
// ... settle ...
expect(auction.status).toBe("SOLD");

// Assignment lifecycle
expect(assignment.status).toBe("READY");
// ... start ...
expect(assignment.status).toBe("ACTIVE");
// ... solve or expire ...
expect(assignment.status).toBeIn(["COMPLETED", "FAILED"]);
```

## Mocking and Stubbing

### Time Mocking

```typescript
// For deterministic timer tests
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

// Advance time
jest.advanceTimersByTime(2000); // 2 seconds

// Restore
jest.useRealTimers();
```

### Database Transactions

```typescript
// Ensure test isolation
await prisma.$transaction(async (tx) => {
  // Test operations
  // Auto-rollback on test failure
});
```

## Performance Benchmarks

### Expected Performance

| Operation | Expected Time | Max Time |
|-----------|--------------|----------|
| Create auction | < 100ms | 200ms |
| Submit bid | < 50ms | 100ms |
| Settle auction | < 150ms | 300ms |
| Start timer | < 100ms | 200ms |
| Get timer status | < 30ms | 50ms |
| Process expired (10 timers) | < 500ms | 1000ms |

### Performance Tests

```typescript
it("should complete bid submission quickly", async () => {
  const start = Date.now();
  
  await submitBid({
    auctionQuestionId,
    teamId,
    bidTimeSeconds: 300
  });
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(100);
});
```

## Error Testing

### Validation Errors

```typescript
// Invalid bid time
const result = await submitBid({
  auctionQuestionId,
  teamId,
  bidTimeSeconds: -100 // Invalid
});
expect(result.success).toBe(false);
expect(result.error).toContain("positive");

// Bid exceeds base time
const result = await submitBid({
  auctionQuestionId,
  teamId,
  bidTimeSeconds: 700 // Base is 600
});
expect(result.success).toBe(false);
expect(result.error).toContain("exceed");
```

### State Errors

```typescript
// Starting non-READY assignment
await prisma.teamChallengeAssignment.update({
  where: { id },
  data: { status: "COMPLETED" }
});

const result = await startQuestionTimer({ assignmentId: id, teamId });
expect(result.success).toBe(false);
expect(result.error).toContain("not in READY state");
```

### Security Errors

```typescript
// Wrong team accessing assignment
const result = await getTimerStatus(
  assignmentId,
  differentTeamId
);
expect(result.success).toBe(false);
```

## Integration Testing

### End-to-End Auction Flow

```typescript
it("should complete full auction flow", async () => {
  // 1. Admin creates auction
  const auction = await createAuction({ ... });
  
  // 2. Admin opens auction
  await openAuction(auction.id);
  
  // 3. Teams bid
  await submitBid({ teamId: team1, bidTime: 450 });
  await submitBid({ teamId: team2, bidTime: 400 });
  
  // 4. Admin closes auction
  await closeAuction(auction.id);
  
  // 5. Admin settles with winner
  await settleAuction({ auctionId, winnerId: team2 });
  
  // 6. Winner starts challenge
  const assignment = await getAssignment(team2);
  await startTimer(assignment.id);
  
  // 7. Winner solves within time
  await submitAnswer({ assignmentId, answer: "correct" });
  
  // 8. Verify final state
  const finalTeam = await getTeam(team2);
  expect(finalTeam.score).toBeGreaterThan(initialScore);
});
```

## Continuous Integration

### CI Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:round2
      - run: npm run test:coverage
```

### Coverage Requirements

- **Minimum coverage: 80%**
- **Critical paths: 95%+**
  - Auction creation and settlement
  - Timer start and expiration
  - Score calculations
  - Security validations

### Pre-commit Hooks

```bash
# Run tests before commit
npm test -- round2 --bail
```

## Debugging Tests

### Enable Debug Logging

```bash
DEBUG=round2:* npm test -- round2-auction.test
```

### Inspect Database State

```typescript
// Add after test failure
console.log("Assignment:", await prisma.teamChallengeAssignment.findUnique({
  where: { id: testAssignmentId },
  include: { team: true, auctionQuestion: true }
}));
```

### Run Single Test in Isolation

```bash
npm test -- round2-auction.test -t "should calculate 50% bonus correctly"
```

## Future Test Additions

### Planned Tests

- [ ] Concurrent bid submissions (race conditions)
- [ ] Network latency simulation for timers
- [ ] Large-scale auction (100+ teams)
- [ ] Timer drift correction over long periods
- [ ] Database connection failure recovery
- [ ] API rate limiting
- [ ] WebSocket real-time updates (when implemented)

### Load Testing

```typescript
// Example load test structure
describe("Load Testing", () => {
  it("should handle 50 concurrent bids", async () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      submitBid({
        auctionQuestionId,
        teamId: teams[i].id,
        bidTimeSeconds: 300 + i
      })
    );
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    expect(successful).toBe(50);
  });
});
```

## Troubleshooting

### Common Issues

**Problem**: Tests fail with "Transaction timeout"
**Solution**: Increase transaction timeout or reduce test database load

**Problem**: Timer tests flaky due to timing
**Solution**: Use generous margins (±2 seconds) for time comparisons

**Problem**: Database conflicts between parallel tests
**Solution**: Use unique test data for each test file

## Reporting

### Generate Coverage Report

```bash
npm run test:coverage
```

### View HTML Report

```bash
open coverage/lcov-report/index.html
```

### CI Test Results

Test results are automatically reported in:
- GitHub Actions summary
- Pull request comments
- Coverage badges in README

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Clean state** - Always clean up test data
3. **Meaningful names** - Test names should describe expected behavior
4. **Arrange-Act-Assert** - Follow AAA pattern
5. **Test edge cases** - Don't just test happy paths
6. **Mock external dependencies** - Use test database, mock time when needed
7. **Fast tests** - Keep individual tests under 1 second
8. **Descriptive failures** - Use custom error messages in assertions
