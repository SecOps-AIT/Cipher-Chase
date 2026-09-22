# Cipher Chase — Cybersecurity CTF Platform

Cipher Chase is a production-grade collegiate cybersecurity Capture the Flag (CTF) competition platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **PostgreSQL** (via Supabase).

---

## 🛡️ Key Features

* **Authoritative Server Engine**: All timers, scoring calculations, and game logic are strictly computed and verified on the server. The browser is never trusted with game logic.
* **Per-Team Round 1 Timer**: Each team gets its own 30-minute timer (configurable) that starts when the first member enters Round 1. All team members share the same deadline.
* **Round 1 — Themed CTF**:
  * **First Blood Mechanics (🩸)**: The first team globally to solve any challenge earns bonus points
  * **Dynamic Batch Scheduling**: Admin controls for instant activation and extension of challenge release batches
  * **Atomic Question Locking**: First correct solve by any team member locks the question for the entire team
  * **Multi-Device Team Concurrency**: Up to 3 members per team with shared real-time state
* **Round 2 — Cyber Auction**: Admin-controlled auction with synchronized countdown timers, progressive hint unlocks, and speed bonus calculations
* **Admin Control Panel (`/admin`)**:
  * Live status controls: Start, Pause, Resume, End Round
  * Real-time batch releases & question vault
  * Multi-device team registry with readable join codes (e.g., `CC-7X4K9`)
  * Top N qualification selector
  * Full audit log with filtering
* **Public Projector Leaderboard (`/leaderboard`)**: High-contrast, dark-mode 1080p live standings
* **Supabase Realtime Integration**: Live updates for leaderboard, scores, and team status

---

## 🚀 Quick Start Guide

### 1. Start PostgreSQL Database

**Option A: Using Docker (Recommended)**
```powershell
docker compose up -d
```

**Option B: Using Supabase (Production)**
See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for full Supabase setup instructions.

---

### 2. Configure Environment Variables

Copy the example environment file:
```powershell
cp .env.example .env
```

Edit `.env` and configure:
```env
# Supabase PostgreSQL Database (Production)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-region.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-region.pooler.supabase.com:5432/postgres"
SESSION_SECRET="cipher-chase-super-secret-key-32-chars-long-2026"
ADMIN_EMAIL="admin@cipherchase.local"
ADMIN_PASSWORD="cipher-admin-secret-2026"

# Optional: Supabase Realtime (for live updates)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
```

---

### 3. Install Dependencies

```powershell
npm install
```

---

### 4. Run Database Migrations

Generate the Prisma client and push the schema to PostgreSQL:
```powershell
npx prisma db push
```

Apply the partial unique index for duplicate score prevention:
```powershell
# For local PostgreSQL:
psql -U postgres -d cipher_chase -f prisma/migrations/add_unique_correct_submission.sql

# For Supabase, use the SQL Editor in dashboard
```

---

### 5. Seed Initial Event, Teams & Challenges

Populate the database with demo data:
```powershell
npm run seed
```

Default Seeded Teams & Join Codes:
* **Cyber Wolves**: `CC-7X4K9`
* **Null Squad**: `CC-9B2M7`
* **Root Access**: `CC-4T8W1`
* **Byte Force**: `CC-6K3R5`
* **Hex Raiders**: `CC-2P9Y4`

---

### 6. Run the Application

Start the local development server:
```powershell
npm run dev
```

Open your browser:
* **Home**: [http://localhost:3000](http://localhost:3000)
* **Team Arena**: [http://localhost:3000/team/join](http://localhost:3000/team/join)
* **Public Live Leaderboard**: [http://localhost:3000/leaderboard](http://localhost:3000/leaderboard)
* **Admin Control Panel**: [http://localhost:3000/admin](http://localhost:3000/admin)

Default Admin Credentials:
* **Email**: `admin@cipherchase.local`
* **Password**: `cipher-admin-secret-2026`

---

## 🧪 Testing & Verification

Run the automated Vitest test suite:
```powershell
npm run test
```

Run ESLint and production build validation:
```powershell
npm run lint
npm run build
```

---

## 📚 Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Complete Vercel + Supabase deployment instructions
- **[Performance Guide](docs/PERFORMANCE.md)** - Optimization strategies for 100+ concurrent sessions
- **[Architecture Overview](#architecture)** - System design and data flow

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- React 18
- Tailwind CSS
- Lucide Icons

**Backend:**
- Next.js API Routes / Server Actions
- Prisma ORM
- Zod validation
- JWT-based authentication (HTTP-only cookies)

**Database:**
- PostgreSQL (via Supabase or Docker)
- Optimized indexes for 100+ concurrent sessions
- Transactional integrity with Serializable isolation

**Realtime:**
- Supabase Realtime (optional)
- Fallback polling for compatibility

**Hosting:**
- Vercel (recommended)
- Any Node.js hosting platform

---

## 🎯 Critical Game Rules

### Team Structure
- **1-3 members per team** (enforced server-side with transactions)
- Leader creates team, others join via join code or team name
- All members share the same team score and timer

### Per-Team Round 1 Timer
- **30 minutes default** (admin configurable: 10, 15, 20, 30, 45, or 60 minutes)
- Timer starts when **first member enters Round 1**
- All team members share the same deadline
- **No pausing** - timer runs continuously
- Questions freeze when team timer expires

### Atomic Scoring
- First correct submission by **any team member** locks the question
- Points awarded once per team per question
- Database transaction with Serializable isolation prevents duplicate scoring
- First Blood bonus awarded to first team globally to solve

### Session Persistence
- JWT-based HTTP-only cookies
- Sessions survive browser refresh and reconnection
- Timer calculated from authoritative server deadline

---

## 🚀 Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for complete deployment instructions for:
- Supabase PostgreSQL setup
- Vercel deployment configuration
- Environment variable management
- Custom domain configuration
- Production checklist
- Monitoring and maintenance

---

## 📊 Performance

Optimized for **100+ concurrent browser sessions**:
- Database indexes on critical query paths
- Server-side aggregations (no client-side reduce/map)
- Supabase Realtime for live updates (doubles poll interval as fallback)
- Rate limiting: 5 submissions per 10 seconds per team per question
- Connection pooling via Prisma

See [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) for detailed performance analysis.

---

## 🔒 Security

- All game logic validated server-side
- HTTP-only cookies for session management
- Zod validation on all user inputs
- Database constraints prevent race conditions
- Transactional integrity for critical operations
- Admin authentication required for privileged actions
- Audit logging for all critical events

---

## 🛠️ Development Commands

```powershell
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run tests
npm run test

# Seed database
npm run seed

# Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push
```

---

## 📝 License

This project is built for collegiate cybersecurity competitions. Modify and use as needed for educational purposes.

---

## 🤝 Contributing

Contributions welcome! Please ensure:
- All tests pass (`npm run test`)
- Linter passes (`npm run lint`)
- Build succeeds (`npm run build`)
- Follow existing code style and patterns

---

## 🎓 Built For

Collegiate cybersecurity competitions and CTF events. Designed to support high-concurrency team-based competitions with real-time scoring and live leaderboards.

---

**Ready to host your cybersecurity competition?** Follow the [Deployment Guide](docs/DEPLOYMENT.md) to get started! 🔐🏆
