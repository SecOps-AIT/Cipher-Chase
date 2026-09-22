# CIPHER CHASE - PRODUCTION DEPLOYMENT CHECKLIST

## 🚨 SECURITY INCIDENT RESPONSE - COMPLETED
- [x] Detected exposed database credentials in previous configuration
- [x] Cleared credentials from .env file (now requires rotation)
- [x] Verified .env is in .gitignore 
- [x] Confirmed no credentials in Git history
- [x] Updated connection configuration for proper serverless deployment

## 📋 PRODUCTION READINESS CHECKLIST

### 1. SECURITY REQUIREMENTS
- [ ] **Database password rotated** in Supabase dashboard
- [ ] **New credentials tested** and working
- [ ] **Connection pooling configured** (port 6543 with pgbouncer=true)
- [ ] **Connection limit set** to 1 for serverless deployment
- [ ] **No credentials in source control** verified
- [ ] **Server secrets properly configured** (not NEXT_PUBLIC_*)

### 2. DATABASE ARCHITECTURE
- [x] **Prisma 5.21.1** with directUrl support configured
- [x] **Singleton pattern** implemented for serverless deployment
- [x] **Transaction isolation** set to Serializable for critical operations
- [x] **Partial unique index** applied for submission constraints
- [x] **Connection pooling** configured for Vercel serverless

### 3. CORE GAME MECHANICS - ATOMIC SAFETY
- [x] **Team capacity enforcement** (1-3 members) with atomic transactions
- [x] **Concurrent join protection** - race condition safe
- [x] **Per-team timer system** (round1StartedAt, round1DeadlineAt)
- [x] **Timer cannot restart** - stored in database, not browser
- [x] **Concurrent submission safety** - Serializable isolation level
- [x] **Duplicate correct answer prevention** - database constraints
- [x] **Rate limiting** implemented (5 submissions per 10 seconds)

### 4. USER FLOW VERIFICATION
- [ ] **Landing page** accessible
- [ ] **Team creation** works (team leader with phone/email)
- [ ] **Team joining** works (members with name only)
- [ ] **Team lobby** shows correct member count and status
- [ ] **Round 1 entry** starts per-team timer atomically
- [ ] **Question submission** respects timer deadline
- [ ] **Timer expiration** blocks further submissions
- [ ] **Leaderboard updates** on correct submissions
- [ ] **Admin dashboard** shows live statistics

### 5. LOAD TESTING REQUIREMENTS
- [ ] **100+ concurrent sessions** tested
- [ ] **Burst submission testing** (20-30 answers in short period)
- [ ] **Connection pool monitoring** (no exhaustion)
- [ ] **Database performance** measured (query latency)
- [ ] **Memory usage** verified under load
- [ ] **Error rate** under 1% during peak load

### 6. VERCEL DEPLOYMENT
- [ ] **Repository connected** to Vercel
- [ ] **Environment variables configured** in Vercel dashboard:
  - `DATABASE_URL` (Supabase pooled connection)
  - `DIRECT_URL` (Supabase direct connection)  
  - `SESSION_SECRET` (32+ characters)
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `NEXT_PUBLIC_APP_NAME`
  - Optional: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **Production build** successful on Vercel
- [ ] **All 39 routes** accessible in production

### 7. PRODUCTION SMOKE TEST
- [ ] **Create test team** (3 members)
- [ ] **Enter Round 1** and verify timer starts
- [ ] **Submit correct answer** and verify scoring
- [ ] **Check leaderboard** updates in real-time
- [ ] **Test admin dashboard** shows live data
- [ ] **Verify timer expiration** blocks submissions
- [ ] **Test reconnection** preserves timer state

### 8. MONITORING & OBSERVABILITY  
- [ ] **Error tracking** configured (Vercel dashboard)
- [ ] **Database monitoring** via Supabase dashboard
- [ ] **Performance monitoring** for API routes
- [ ] **Admin emergency controls** verified

### 9. BACKUP & RECOVERY
- [ ] **Database backup strategy** documented
- [ ] **Critical data identified** (teams, submissions, scores, timers)
- [ ] **Recovery procedure** tested
- [ ] **Migration rollback plan** prepared

### 10. EVENT DAY READINESS
- [ ] **Admin credentials** confirmed working
- [ ] **Event configuration** verified (duration, questions)
- [ ] **Emergency procedures** documented
- [ ] **Support contact** information available

## ⚠️ IMMEDIATE ACTIONS REQUIRED

### 1. Rotate Database Password
1. Go to Supabase Dashboard → Project Settings → Database
2. Change the database password
3. Update .env with new credentials:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[NEW-PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[NEW-PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"
   ```

### 2. Test Database Connection
```bash
npm run dev
# Test team creation at http://localhost:3000/team/join
```

### 3. Load Test Preparation
Create a simple load test script to verify 100+ concurrent users before going live.

## 🎯 SUCCESS CRITERIA
- All checklist items completed
- Load test passes with <1% error rate
- Production deployment verified
- All core game mechanics working
- Admin monitoring functional

**DO NOT** announce the live URL until all checklist items are verified ✅