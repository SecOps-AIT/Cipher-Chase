# 🎯 CIPHER CHASE - Complete Implementation Plan

## Database Connection Issue - PRIORITY 1
**Error**: Can't reach database at `aws-0-ap-southeast-2.pooler.supabase.com:5432`

**Check**:
1. Is your Supabase project active?
2. Is the password correct? (`Cipherchase2026`)
3. Try testing connection directly in Supabase dashboard

---

## Phase 1: Team Registration & Join Flow Improvements

### Current Issues
- Team creation uses generic join code format
- Members join by team name (confusing)
- No leader information captured
- Join code not in CC26XX format

### Required Changes

#### 1. Team Creation Flow (Leader Registration)
**What teams provide:**
- ✅ Team Name (e.g., "Cyber Wolves")
- ✅ Leader Name (e.g., "Anagesh")
- ✅ Leader Mobile (e.g., "+91 9876543210")
- ✅ Leader Email (e.g., "anagesh@example.com")
- ✅ Auto-generate join code in format: **CC26XX** (e.g., CC2601, CC2602, CC2699)

**Files to modify:**
- `app/team/join/page.tsx` - Update UI form
- `app/api/team/join/route.ts` - Update team creation logic
- `lib/teams.ts` - Add CC26XX code generator function
- `prisma/schema.prisma` - Ensure TeamMember has phone & email fields

#### 2. Member Join Flow
**What members provide:**
- ✅ Team Code (e.g., "CC2601")
- ✅ Their Name (e.g., "Vishnu")

**Current behavior is correct** - just need to display team code prominently

#### 3. Dashboard Display
**Show on team dashboard:**
- ✅ Team Name (e.g., "Cyber Wolves")
- ✅ Team Code (e.g., "CC2601")
- ✅ Current Member Name

**This is already implemented!** Just verify it's working.

---

## Phase 2: UI/UX Improvements - HackTheBox Style + Heist Theme

### Design Direction
**Theme**: Bank Heist / Ocean's Eleven style
- Dark, sophisticated, cinematic
- Money vault aesthetics
- Blueprint/schematic overlays
- Security camera/CCTV effects
- Gold/money accents instead of cyan

### Visual Elements to Add
1. **Background**: Vault door imagery, security grids
2. **Colors**: 
   - Primary: Dark slate (#0a0e14)
   - Accent: Gold (#d4af37), Dark green (money)
   - Danger: Red (#dc2626) for alarms
3. **Typography**: Monospace for codes, elegant serif for titles
4. **Icons**: 
   - Vault icons for challenges
   - Money bags for points
   - Timer as countdown clock
   - Lock/unlock animations

### Pages to Redesign
- Landing page (`app/page.tsx`)
- Team join page (`app/team/join/page.tsx`)
- Team dashboard (`app/team/page.tsx`)
- Leaderboard (`app/leaderboard/page.tsx`)

**Subtle Heist Elements** (without saying "heist"):
- "INFILTRATION" instead of "Round 1"
- "THE VAULT" instead of "Round 2"
- "CREW" instead of "Team"
- "OPERATION" instead of "Challenge"
- "INTEL" instead of "Hints"
- Timer labeled as "TIME REMAINING" with alarm clock styling

---

## Phase 3: Round 2 Auction Flow - Complete Implementation

### Admin Side: Live Auction Hosting

#### Step 1: Admin Opens Live Auction
**UI Flow:**
1. Admin navigates to `/admin/round-2` (new page to create)
2. Click "START LIVE AUCTION SESSION"
3. Select a question from available pool
4. Display on projection screen:
   - Question title
   - Topic/Category
   - Point value
   - Base time estimate
   - Brief description (what contestants see)

#### Step 2: Teams Bid Manually (Verbal Auction)
**Physical Process:**
- Teams shout out time bids verbally (e.g., "15 minutes!")
- Admin tracks bids on paper/whiteboard
- Admin announces "Going once, going twice, SOLD!"

#### Step 3: Admin Records Sale
**UI Flow:**
1. Admin enters winning time (e.g., "12:30" for 12 minutes 30 seconds)
2. Admin enters winning team ID or selects from dropdown
3. Click "RECORD SALE"
4. System creates TeamChallengeAssignment record

**Backend:**
```typescript
POST /api/admin/auction/record-sale
{
  "questionId": "...",
  "teamId": "...",
  "committedTimeSeconds": 750, // 12:30 = 750 seconds
  "basePoints": 100
}
```

#### Step 4: Question Appears in Team Dashboard
**Team Side:**
- Team sees new question in "Active Challenges" section
- Shows: Title, description, committed time, points
- Button: "START CHALLENGE" (timer NOT started yet)

#### Step 5: Team Member Clicks Challenge
**Timer Starts:**
- ANY team member clicks "START CHALLENGE"
- Server records `startedAt = new Date()`
- Server calculates `deadlineAt = startedAt + committedTimeSeconds`
- Timer starts counting down for ALL team members

**Backend:**
```typescript
POST /api/auction/assignments/[id]/start
// Sets startedAt, calculates deadlineAt
```

#### Step 6: Team Submits Answer
**Submission:**
- Team enters flag/answer
- If correct: Award base points + time bonus
- If wrong/expired: Apply penalty

**Backend:**
```typescript
POST /api/auction/assignments/[id]/submit
{
  "answer": "FLAG{...}"
}
```

---

## Phase 4: Question Management System

### Admin Question Bank
**New page: `/admin/questions`**

Features needed:
1. ✅ Create questions (title, description, answer, points, category, difficulty)
2. ✅ Edit questions
3. ✅ Delete questions
4. ✅ Assign questions to Round 1 or Round 2
5. ✅ Add hints to questions (progressive hints with cost)

**This already exists!** (`app/admin/questions/page.tsx`)

### Demo Questions to Add
Create seed data with 10 sample questions:
- 5 for Round 1 (CTF style)
- 5 for Round 2 (Auction challenges)

---

## Phase 5: Admin Portal Security

### Current Issue
Admin portal is accessible without authentication

### Required Changes

#### 1. Admin Login Page
**Create: `app/admin/login/page.tsx`**
- Simple login form
- Email + Password
- Store session in HTTP-only cookie

#### 2. Admin Middleware
**Update: `middleware.ts`** or create admin auth wrapper
- Check for admin session cookie
- Redirect to `/admin/login` if not authenticated
- Protect all `/admin/*` routes

#### 3. Environment Variables
```env
ADMIN_EMAIL=admin@cipherchase.local
ADMIN_PASSWORD=cipher-2026
```

**This is already in .env!** Just need to implement the login page.

---

## Phase 6: Testing & Verification

### Admin Side Testing
1. ✅ Login to admin portal with credentials
2. ✅ Create teams with CC26XX codes
3. ✅ Add questions to question bank
4. ✅ Start Round 1, verify questions appear
5. ✅ Qualify teams for Round 2
6. ✅ Host live auction, record sale
7. ✅ Verify question appears in team dashboard
8. ✅ Monitor timer countdown
9. ✅ Verify scoring calculations

### Team Side Testing
1. ✅ Create team with leader info
2. ✅ Members join using CC26XX code
3. ✅ View team dashboard (name + code displayed)
4. ✅ Start Round 1, solve questions
5. ✅ Get qualified for Round 2
6. ✅ See purchased question after auction
7. ✅ Click to start timer
8. ✅ Submit answer
9. ✅ Verify score updates

---

## Priority Order

### TODAY (Critical Path)
1. ✅ **Fix database connection** (check Supabase)
2. ✅ **Implement CC26XX join code generator**
3. ✅ **Update team creation form** (leader name, phone, email)
4. ✅ **Create demo questions** (10 sample questions)
5. ✅ **Test basic team registration flow**

### TOMORROW (Polish & Auction)
6. ✅ **Create `/admin/round-2` live auction page**
7. ✅ **Implement "Record Sale" functionality**
8. ✅ **Test complete Round 2 auction flow**
9. ✅ **Add admin login/authentication**
10. ✅ **UI improvements** (heist theme)

### DEPLOYMENT DAY (Final Testing)
11. ✅ **End-to-end testing** (admin + 3 test teams)
12. ✅ **Verify all timers work correctly**
13. ✅ **Check scoring calculations**
14. ✅ **Test on multiple devices**
15. ✅ **Setup projection screen for live auction**

---

## Files That Need Changes

### Team Registration (CC26XX codes)
- `lib/teams.ts` - Add generateJoinCode() function
- `app/team/join/page.tsx` - Update form UI
- `app/api/team/join/route.ts` - Use new code generator

### Round 2 Live Auction
- `app/admin/round-2/page.tsx` - NEW: Live auction hosting page
- `app/api/admin/auction/record-sale/route.ts` - NEW: Record auction sale
- `app/api/auction/assignments/[id]/start/route.ts` - Already exists ✅
- `app/api/auction/assignments/[id]/submit/route.ts` - Already exists ✅

### Admin Security
- `app/admin/login/page.tsx` - NEW: Admin login page
- `lib/auth.ts` - Update admin auth functions
- `middleware.ts` - Add admin route protection

### UI/Theme Updates
- `app/globals.css` - Add heist theme colors
- `tailwind.config.ts` - Update color palette
- All dashboard pages - Subtle heist terminology

---

## Current Status

✅ **Working:**
- Database schema (with Round 2 auction models)
- Team join/rejoin functionality
- Round 1 CTF implementation
- Admin question management
- Timer system backend
- Scoring system

❌ **Needs Work:**
- Database connection (check Supabase)
- CC26XX join code format
- Leader info capture (phone/email)
- Live auction hosting UI
- Admin authentication
- Heist theme styling

---

## Next Steps

1. **Fix database connection first** - check Supabase dashboard
2. **Then I'll implement CC26XX codes**
3. **Then create live auction admin page**
4. **Then add admin login**
5. **Finally polish UI with heist theme**

Ready to proceed?
