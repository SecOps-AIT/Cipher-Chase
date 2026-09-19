# Cipher Chase — Cybersecurity CTF Platform

Cipher Chase is a production-grade collegiate cybersecurity Capture the Flag (CTF) competition platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM (PostgreSQL)**.

---

## 🛡️ Key Features

* **Authoritative Server Engine**: All timers, question release batches, scoring calculations, wallet deductions, hints, speed bonuses, First Blood allocations, and tiebreakers are strictly computed and verified on the server. The browser is never trusted with game logic.
* **Round 1 — Themed CTF**:
  * **First Blood Mechanics (🩸)**: The first team globally to solve any challenge earns bonus points (e.g. +50 FB pts), receives the First Blood solver badge, and logs an explicit `ROUND1_FIRST_BLOOD` audit event. Subsequent solvers receive standard base points.
  * **Dynamic Batch Scheduling**: Admin controls allow instant activation, reset, and extension (+5m, +10m) of challenge release batches on the fly.
  * **Interactive Question Tracking & Mini-Leaderboard**: Selecting any challenge opens an interactive modal showing First Blood status, chronological live solvers list with timestamps, and instant flag submission.
  * **Multi-Device Team Concurrency**: Up to 4 members per team with shared real-time state. The first correct solve by any team member locks the question for the entire team and immediately updates the live leaderboard.
* **Round 2 — Cyber Auction**: Admin sets verbal auction winners and committed times. Synchronized server-side countdown timers that survive browser refreshes, progressive hint unlocks with wallet balance deductions, speed bonus calculations (<=25%, <=50%, <=75%), and failure penalties.
* **Admin Control Panel (`/admin`)**:
  * Live status controls: Start, Pause, Resume, End Round.
  * Real-time batch releases & question vault with secret flag viewers and First Blood stats.
  * Multi-device team registry with readable join codes (e.g., `CC-7X4K9`).
  * Top N qualification selector with automatic Round 1 score to Round 2 wallet initialization.
  * Full audit log with filtering by actor, action, and timestamp.
* **Public Projector Leaderboard (`/leaderboard`)**: High-contrast, dark-mode 1080p live standings with rank movement animations and tiebreaking calculations (score timestamp for Round 1, cumulative challenge completion time for Round 2).
* **Multi-Device Team Arena (`/team`)**: Shared live state across phones and laptops for all team members.

---

## 🚀 Quick Start Guide

### 1. Start PostgreSQL Database

The application requires PostgreSQL running on port `5432`.

#### Option A: Using Docker (Recommended)
If you have Docker Desktop installed, run:
```powershell
docker compose up -d
```

#### Option B: Using Windows PostgreSQL Service
If you have PostgreSQL installed natively on Windows:
```powershell
Start-Service postgresql*
```

Verify your connection string in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cipher_chase?schema=public"
```

---

### 2. Run Database Migrations

Generate the Prisma client and push the schema to PostgreSQL:
```bash
npx prisma db push
```
*(or `npx prisma migrate dev --name init`)*

---

### 3. Seed Initial Event, Teams & Challenges

Populate the database with the live event **Cipher Chase 2026**, 5 realistic cybersecurity teams, 15 Round 1 CTF challenges across 3 release batches, and 3 Round 2 Cyber Auction challenges with 3 progressive hints each:
```bash
npm run seed
```

Default Seeded Teams & Join Codes:
* **Cyber Wolves**: `CC-7X4K9`
* **Null Squad**: `CC-9B2M7`
* **Root Access**: `CC-4T8W1`
* **Byte Force**: `CC-6K3R5`
* **Hex Raiders**: `CC-2P9Y4`

---

### 4. Run the Application

Start the local development server:
```bash
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

Run the automated Vitest test suite covering critical game engine rules (release windows, submission rate-limiting, team locks, speed bonuses, wallet bounds, and tiebreakers):
```bash
npm run test
```

Run ESLint and production build validation:
```bash
npm run lint
npm run build
```
