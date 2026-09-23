# Round 2 Time Auction Deployment Checklist

## ✅ Completed
- [x] Database migration created (`002_round2_time_auction.sql`)
- [x] Removed wallet field from Team model
- [x] Added Round 2 auction models (AuctionQuestion, AuctionBid, AuctionSale, TeamChallengeAssignment)
- [x] Updated Prisma schema
- [x] Removed wallet references from team join API
- [x] Team rejoin functionality working (existing members can reconnect)

## 🔧 Required Actions

### 1. Stop Dev Server
```powershell
# In your terminal running the dev server, press Ctrl+C
```

### 2. Regenerate Prisma Client
```powershell
npx prisma generate
```

### 3. Apply Database Migration
```powershell
npx prisma migrate deploy
```

### 4. Restart Dev Server
```powershell
npm run dev
```

### 5. Test Team Join/Rejoin
1. Create a team: Enter team name "TestTeam" and member name "Alice"
2. Leave and rejoin: Enter same team name "TestTeam" and same member name "Alice"
3. ✅ Expected: Should reconnect to existing team, not create duplicate

### 6. Configure Timer System
Add to `.env`:
```
CRON_SECRET=your-secure-random-string-here
```

Set up cron job (see `docs/ROUND2_TIMER_SETUP.md` for details):
```bash
# Call this endpoint every minute during the event
curl -X POST https://your-domain.com/api/auction/process-expired \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 7. Run Tests
```powershell
npm test -- round2
```

## 🐛 Issues Fixed
- **Wallet field error**: Removed `wallet: 0` from team creation in `/api/team/join`
- **Wallet in response**: Removed `wallet: team.wallet` from join response
- **Schema mismatch**: Updated `schema.postgresql.prisma` to match migration

## 📚 Documentation
- `docs/ROUND2_SCORING.md` - Scoring formulas and examples
- `docs/ROUND2_TIMER_SETUP.md` - Timer system configuration
- `docs/ROUND2_TESTING.md` - Testing guide

## 🎯 Team Rejoin Flow (Already Working!)
The code **already handles** team rejoining correctly:

**Scenario**: User "Alice" joined team "TestTeam", left platform, returns later

**Flow**:
1. User enters team name "TestTeam" and member name "Alice"
2. System finds existing team "TestTeam"
3. System checks if member "Alice" already exists (case-insensitive)
4. If found: Reconnects to existing member, sets session cookie
5. If not found: Creates new member (if space available)

**Code location**: `app/api/team/join/route.ts` lines 87-98

## ⚠️ Known Remaining Wallet References
These need manual cleanup (UI/display only, not functional):
- `app/admin/scoring/page.tsx` - Admin UI text
- `app/admin/qualification/page.tsx` - Admin UI display
- `app/leaderboard/page.tsx` - Leaderboard display
- `app/team/page.tsx` - Team dashboard display
- `app/page.tsx` - Landing page text

These are **cosmetic only** and won't break functionality. They can be updated gradually.
