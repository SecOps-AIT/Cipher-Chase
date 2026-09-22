# Performance Optimization for 100+ Concurrent Sessions

This document explains the performance optimizations implemented in CIPHER CHASE to support at least 100 simultaneously connected participant/admin browser sessions.

## Database Indexes

### Team Indexes
- `[eventId, score DESC, scoreReachedAt ASC]` - **Leaderboard queries** (most critical)
- `[eventId]` - Fast lookups by event
- `[joinCode]` - Fast team joining via join code
- `[round1DeadlineAt]` - Quick checks for expired team timers

### Submission Indexes
- `[teamId, questionId]` - Fast duplicate check during submission
- `[teamId, questionId, isCorrect]` - Find team's correct submissions quickly
- `[questionId, isCorrect]` - Count solves per question
- `[submittedAt]` - Recent submissions queries
- `[teamId, submittedAt]` - Rate limiting checks (5 submissions per 10 seconds)

### Question Indexes
- `[roundId, batchNumber, order]` - Batch-based question listing
- `[roundId, order]` - Question ordering
- `[roundId, isActive]` - Active questions filtering
- `[releaseAt]` - Upcoming questions lookup
- `[closeAt]` - Expired questions lookup

### ScoreEvent Indexes
- `[eventId, teamId]` - Team score history
- `[teamId, createdAt]` - Recent score changes
- `[eventId, createdAt]` - Global event timeline
- `[type]` - Filter by score event type

### Other Indexes
- TeamMember: `[teamId]` - Fast member lookup
- Round: `[eventId, number]` - Find rounds for event
- AuditLog: `[eventId, createdAt]`, `[actor, action]` - Log filtering

## Partial Unique Index (Manual Migration)

A partial unique index prevents duplicate correct submissions at database level:

```sql
CREATE UNIQUE INDEX "Submission_teamId_questionId_correct_unique" 
ON "Submission"("teamId", "questionId") 
WHERE "isCorrect" = true;
```

This ensures only ONE correct submission per team per question, allowing multiple incorrect attempts.

Location: `d:\SecOPS\prisma\migrations\add_unique_correct_submission.sql`

## Query Optimization Strategies

### 1. Database-Driven Aggregations
All analytics calculations use SQL aggregation, not client-side reduce/map:
- Leaderboard sorting (score DESC, scoreReachedAt ASC)
- Question solve counts
- Team statistics
- Submission accuracy

### 2. Transactional Integrity
Critical operations use Serializable isolation level:
- Question submission with duplicate prevention
- Team member joining with 3-member limit
- Score event creation

### 3. Efficient Polling
- Default poll interval: 3000ms (3 seconds)
- With Supabase Realtime: 6000ms (fallback only)
- Realtime updates trigger instant refresh

### 4. No Timer Database Writes
Timer countdown is calculated client-side from authoritative `deadlineAt`:
```typescript
secondsRemaining = Math.max(0, Math.floor((deadlineAt.getTime() - now.getTime()) / 1000))
```
No database write per second - only `startedAt` and `deadlineAt` stored once.

## Supabase Realtime Integration

Reduces polling load by subscribing to database changes:

### Leaderboard
- Subscribes to: `Team` (UPDATE), `ScoreEvent` (INSERT)
- Refreshes on: Score changes, new score events
- Fallback: 6-second polling

### Team Dashboard
- Subscribes to: `Team` (UPDATE), `TeamMember` (INSERT/DELETE), `ScoreEvent` (INSERT)
- Filters by: Current team ID
- Refreshes on: Team updates, member changes, score events
- Fallback: 6-second polling

### Round 1 Questions
- Subscribes to: `Submission` (INSERT), `Question` (UPDATE), `Team` (UPDATE)
- Refreshes on: New submissions, question releases, timer changes
- Fallback: 6-second polling

## Rate Limiting

### Submission Rate Limit
Server-side enforcement: Maximum 5 submissions per 10 seconds per team per question

```typescript
const recentAttemptsCount = await prisma.submission.count({
  where: {
    teamId,
    questionId,
    submittedAt: { gte: new Date(now.getTime() - 10000) },
  },
});

if (recentAttemptsCount >= 5) {
  return { success: false, message: "Rate limit exceeded" };
}
```

### Connection Limits
- Supabase Realtime: 10 events per second per client
- HTTP-only cookies for session management (no localStorage)
- JWT-based authentication with 24-hour expiry

## Scalability Recommendations

### 100-200 Concurrent Sessions (Current Target)
✅ Current architecture handles this without changes:
- PostgreSQL connection pooling via Prisma
- Indexed queries
- Realtime subscriptions reduce polling
- Transactional integrity

### 200-500 Concurrent Sessions
Consider:
- Increase PostgreSQL max connections
- Add read replicas for leaderboard queries
- Implement Redis caching for leaderboard
- Use CDN for static assets

### 500+ Concurrent Sessions
Consider:
- Horizontal scaling with load balancer
- Dedicated database for analytics (separate from transactional DB)
- Message queue for score events
- GraphQL subscriptions instead of REST polling

## Performance Testing Checklist

- [ ] 100 concurrent team join requests
- [ ] 100 concurrent question submissions to same question
- [ ] 50 teams simultaneously entering Round 1
- [ ] Leaderboard updates with 100+ teams
- [ ] Admin dashboard with 100+ teams
- [ ] Database query response times < 100ms
- [ ] Page load times < 2 seconds
- [ ] No memory leaks during 30-minute sessions
- [ ] Network reconnection handling
- [ ] Browser refresh preserves session

## Monitoring Recommendations

For production deployment:
1. Enable Supabase database metrics
2. Monitor connection pool usage
3. Track query execution times
4. Set up alerts for slow queries (> 500ms)
5. Monitor Realtime subscription count
6. Track JWT token validation time
7. Monitor database CPU/memory usage

## Known Performance Bottlenecks

### Potential Issues
1. **First Blood Race Condition**: First submission creates lock - handle gracefully
2. **Leaderboard N+1**: Avoided by using `include` with members/submissions
3. **Large Audit Logs**: Add pagination if audit log grows beyond 10,000 records
4. **Concurrent Timer Starts**: Handled by transaction with `round1StartedAt` check

### Mitigations in Place
- Serializable transaction isolation
- Database-level unique constraints
- Optimistic concurrency handling
- Error recovery for transaction conflicts
