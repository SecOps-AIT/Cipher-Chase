# Round 2 Timer System Setup

## Overview

The Round 2 auction system uses server-authoritative timers that track when teams complete challenges within their bid time. This document explains how to set up and maintain the timer system.

## Architecture

### Server-Side Timers
- **Database-driven**: Timer state stored in `TeamChallengeAssignment` table
- **Server-authoritative**: All time calculations happen on the server
- **Deadline-based**: Timers store `deadlineAt` timestamp instead of counting down

### Client-Side Timers
- **Synchronized**: Clients sync with server time to handle clock drift
- **Visual only**: Client timers are for display, not enforcement
- **Real-time**: Updates every 500ms for smooth countdown

## Timer Lifecycle

### 1. Assignment Creation (Auction Settlement)
```
Admin settles auction → TeamChallengeAssignment created
Status: READY
startedAt: null
deadlineAt: null
```

### 2. Timer Start (First Team Member Opens Question)
```
Team member clicks "START CHALLENGE" → POST /api/auction/assignments/:id/start
Status: ACTIVE
startedAt: [current timestamp]
deadlineAt: [startedAt + bidTimeSeconds]
```

### 3. Active Timer
```
Client polls timer status every 2-3 seconds
Server calculates timeRemaining = deadlineAt - now()
Client displays countdown using synchronized time
```

### 4. Timer Expiration
```
Automated process checks for expired timers
If deadlineAt < now() and status === ACTIVE:
  - Set outcome = EXPIRED
  - Set status = FAILED
  - Apply time penalty to team score
```

### 5. Early Completion
```
Team submits correct answer before deadline
Status: COMPLETED
Score: basePoints + timeBonus calculated
```

## Automated Timer Processing

### Option 1: External Cron Job (Recommended for Production)

Set up a cron job to call the expired timer processor every minute:

```bash
# Add to crontab (crontab -e)
* * * * * curl -X POST https://your-domain.com/api/admin/auction/process-expired \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Environment Variable:**
```env
CRON_SECRET=your-secure-random-token-here
```

### Option 2: Vercel Cron Jobs

Create `vercel.json` in project root:

```json
{
  "crons": [{
    "path": "/api/admin/auction/process-expired",
    "schedule": "* * * * *"
  }]
}
```

Update the API route to accept Vercel cron headers:

```typescript
// In app/api/admin/auction/process-expired/route.ts
const isVercelCron = request.headers.get("x-vercel-cron-id");
if (!isVercelCron && authHeader !== `Bearer ${expectedToken}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Option 3: Client-Side Polling (Development Only)

For development, the admin panel can trigger processing manually or on page load.

**DO NOT USE IN PRODUCTION** - unreliable if admin isn't logged in.

## Timer Synchronization

### Client-Server Time Sync

Clients fetch server time periodically to handle clock drift:

```typescript
// Automatic sync every 30 seconds
const { serverTime, offset } = useServerTime(30000);
```

### Network Latency Compensation

The system accounts for network round-trip time:

```typescript
const requestStart = Date.now();
const serverTime = await fetchServerTime();
const requestEnd = Date.now();
const latency = (requestEnd - requestStart) / 2;
const adjustedTime = serverTime + latency;
```

## Timer Components

### React Hooks

**`useAuctionTimers`** - Manages multiple assignment timers
```typescript
const { timers, getTimer, hasExpiredTimers } = useAuctionTimers(
  assignments,
  serverTime
);
```

**`useAssignmentTimer`** - Single assignment timer with warning levels
```typescript
const timer = useAssignmentTimer(
  assignmentId,
  deadlineAt,
  bidTimeSeconds,
  serverTime
);
// Returns: { timeRemaining, formattedTime, isExpired, percentageUsed, warningLevel }
```

**`useServerTime`** - Server time synchronization
```typescript
const { serverTime, offset, getAdjustedNow } = useServerTime();
```

### UI Components

**`<AuctionTimer>`** - Full timer with progress bar
```tsx
<AuctionTimer
  assignmentId={id}
  deadlineAt={deadline}
  bidTimeSeconds={300}
  serverTime={serverTime}
  variant="full"
  showProgress={true}
/>
```

**`<TimerBadge>`** - Compact timer for lists
```tsx
<TimerBadge
  timeRemaining={180}
  isExpired={false}
  size="md"
/>
```

**`<ChallengeClock>`** - Large display for challenge pages
```tsx
<ChallengeClock
  timeRemaining={240}
  totalTime={300}
  isExpired={false}
/>
```

## API Endpoints

### Timer Management

- `POST /api/auction/assignments/:id/start` - Start timer for assignment
- `GET /api/auction/assignments/:id/timer` - Get current timer status
- `GET /api/auction/time` - Get server time for synchronization

### Timer Processing

- `POST /api/admin/auction/process-expired` - Process expired timers (automated)

### Answer Submission

- `POST /api/auction/assignments/:id/submit` - Submit answer (stops timer if correct)

## Database Schema

```prisma
model TeamChallengeAssignment {
  id              String   @id @default(cuid())
  teamId          String
  questionId      String
  bidTimeSeconds  Int      // Team's time commitment
  startedAt       DateTime? // When timer actually started
  deadlineAt      DateTime? // startedAt + bidTimeSeconds
  completedAt     DateTime?
  status          AssignmentStatus // READY, ACTIVE, COMPLETED, FAILED
  outcome         String?  // SUCCESS, EXPIRED, INCORRECT
  // ... other fields
}
```

## Monitoring and Debugging

### Check Timer Status

```sql
-- Find active assignments with time remaining
SELECT 
  t.name as team_name,
  q.title as question_title,
  tca.startedAt,
  tca.deadlineAt,
  tca.bidTimeSeconds,
  EXTRACT(EPOCH FROM (tca.deadlineAt - NOW())) as seconds_remaining,
  tca.status
FROM "TeamChallengeAssignment" tca
JOIN "Team" t ON tca.teamId = t.id
JOIN "Question" q ON tca.questionId = q.id
WHERE tca.status = 'ACTIVE'
ORDER BY tca.deadlineAt ASC;
```

### Find Expired But Unprocessed Timers

```sql
SELECT 
  id,
  teamId,
  deadlineAt,
  status,
  outcome
FROM "TeamChallengeAssignment"
WHERE status = 'ACTIVE'
  AND deadlineAt < NOW()
  AND (outcome IS NULL OR outcome != 'EXPIRED');
```

### Test Timer Processing Manually

```bash
curl -X POST http://localhost:3000/api/admin/auction/process-expired \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Issue: Timers not expiring automatically

**Cause**: Cron job not running or misconfigured

**Solution**:
1. Check cron job is running: `curl` the endpoint manually
2. Verify `CRON_SECRET` environment variable is set
3. Check server logs for processing errors
4. Ensure database connection is stable

### Issue: Client timers show wrong time

**Cause**: Client-server clock drift

**Solution**:
- The `useServerTime` hook handles this automatically
- Ensure server time endpoint is working: `GET /api/auction/time`
- Check browser console for sync errors

### Issue: Timer starts twice

**Cause**: Multiple team members clicking "Start" simultaneously

**Solution**:
- The API has database-level locking to prevent this
- Only the first request will succeed
- Subsequent requests return existing timer data

### Issue: Time penalties not applied

**Cause**: `processExpiredTimers` not running or failing

**Solution**:
1. Check audit logs: `AuditLog` table for timer expiration events
2. Run processor manually to test
3. Check team scores before/after processing

## Performance Considerations

### Database Indexes

Ensure these indexes exist for timer queries:

```sql
CREATE INDEX idx_tca_status_deadline 
  ON "TeamChallengeAssignment"(status, deadlineAt) 
  WHERE status = 'ACTIVE';

CREATE INDEX idx_tca_team_status 
  ON "TeamChallengeAssignment"(teamId, status);
```

### Polling Intervals

- Client timer updates: 500ms (smooth visual countdown)
- Assignment data refresh: 2-3 seconds
- Server time sync: 30 seconds
- Expired timer processing: 1 minute

### Scalability

For large events (100+ teams):
- Consider Redis for timer state caching
- Batch timer updates instead of individual queries
- Use database connection pooling
- Monitor database query performance

## Security Considerations

1. **Timer Start**: Only authenticated team members can start their own timers
2. **Timer Manipulation**: All time calculations happen server-side
3. **Clock Sync**: Client time sync is for display only, never trusted
4. **Cron Protection**: Expired timer endpoint requires secret token
5. **Answer Submission**: Validated against server-calculated deadline

## Testing

### Unit Tests

```typescript
// Test timer expiration logic
describe('Timer expiration', () => {
  it('should mark assignment as expired when deadline passes', async () => {
    // Create assignment with deadline in past
    // Run processExpiredTimers()
    // Verify status = FAILED, outcome = EXPIRED
  });
});
```

### Integration Tests

```typescript
// Test full timer lifecycle
describe('Timer lifecycle', () => {
  it('should complete full timer flow', async () => {
    // 1. Create assignment (auction settlement)
    // 2. Start timer (team member opens question)
    // 3. Submit answer within time
    // 4. Verify score with bonus
  });
});
```

## Future Enhancements

- [ ] Real-time timer updates using WebSockets
- [ ] Timer pause/resume for technical issues
- [ ] Timer extension API for admin emergencies
- [ ] Historical timer analytics dashboard
- [ ] Timer notification system (browser notifications)
- [ ] Mobile app timer synchronization
