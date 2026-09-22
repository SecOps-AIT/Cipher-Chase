# Deployment Guide: Vercel + Supabase

This guide walks you through deploying CIPHER CHASE to production using Vercel for hosting and Supabase for PostgreSQL database.

---

## Prerequisites

- [Vercel account](https://vercel.com/signup) (free tier works)
- [Supabase account](https://supabase.com) (free tier works)
- [GitHub account](https://github.com) (for repository connection)
- Git installed locally
- Node.js 18+ and npm installed

---

## Part 1: Supabase Database Setup

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `cipher-chase-prod` (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for testing; upgrade for production

4. Wait 2-3 minutes for project to initialize

### 1.2 Get Database Connection String

1. In your Supabase project, go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **"URI"** tab
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. **Save this securely** - you'll need it for Vercel

### 1.3 Get Supabase API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following values (you'll need them later):
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)

### 1.4 Enable Realtime (Optional but Recommended)

1. Go to **Database** → **Replication** in Supabase dashboard
2. Enable replication for these tables:
   - `Team`
   - `Submission`
   - `ScoreEvent`
   - `TeamMember`
   - `Question`

3. Click **Save** to apply changes

---

## Part 2: Push Code to GitHub

### 2.1 Initialize Git Repository (if not already done)

```powershell
cd d:\SecOPS
git init
git add .
git commit -m "Initial commit: CIPHER CHASE production ready"
```

### 2.2 Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository:
   - **Name**: `cipher-chase`
   - **Visibility**: Private (recommended)
   - **Do NOT initialize with README** (you already have code)

3. Push your code:
   ```powershell
   git remote add origin https://github.com/YOUR-USERNAME/cipher-chase.git
   git branch -M main
   git push -u origin main
   ```

---

## Part 3: Deploy to Vercel

### 3.1 Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Choose your `cipher-chase` repository
5. Click **"Import"**

### 3.2 Configure Project Settings

On the project configuration page:

**Framework Preset**: Next.js (should be auto-detected)

**Root Directory**: `./` (leave as default)

**Build Command**: `npm run build` (default)

**Output Directory**: `.next` (default)

**Install Command**: `npm install` (default)

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add the following:

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@db.XXX.supabase.co:5432/postgres` | From Supabase Step 1.2 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` | From Supabase Step 1.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1N...` | From Supabase Step 1.3 |
| `SESSION_SECRET` | `[GENERATE-RANDOM-32-CHAR-STRING]` | Use: `openssl rand -base64 32` |
| `ADMIN_EMAIL` | `admin@cipherchase.local` | Admin login email |
| `ADMIN_PASSWORD` | `[STRONG-PASSWORD]` | Admin login password |

**Important**: 
- Mark `DATABASE_URL` and `SESSION_SECRET` as **secret** (not visible in logs)
- Variables starting with `NEXT_PUBLIC_` will be exposed to the browser (this is intentional)

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like: `https://cipher-chase-xxx.vercel.app`

---

## Part 4: Initialize Database Schema

### 4.1 Run Prisma Migrations

After successful Vercel deployment, you need to initialize the database schema.

**Option A: Using Vercel CLI (Recommended)**

1. Install Vercel CLI:
   ```powershell
   npm install -g vercel
   ```

2. Link your project:
   ```powershell
   vercel link
   ```

3. Pull environment variables:
   ```powershell
   vercel env pull .env.local
   ```

4. Run Prisma push:
   ```powershell
   npx prisma db push
   ```

5. Apply the partial unique index:
   ```powershell
   psql $DATABASE_URL -f prisma/migrations/add_unique_correct_submission.sql
   ```

**Option B: Using Supabase SQL Editor**

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **"New Query"**
3. Copy the Prisma schema and convert it manually (not recommended), OR
4. Use Option A above (much easier)

### 4.2 Seed Initial Data (Optional)

If you want to seed demo data:

```powershell
npm run seed
```

This creates:
- Default event: "Cipher Chase 2026"
- 5 demo teams with join codes
- 15 Round 1 CTF challenges
- 3 Round 2 Cyber Auction challenges

---

## Part 5: Verify Deployment

### 5.1 Test Public Pages

1. Visit your deployment URL: `https://cipher-chase-xxx.vercel.app`
2. Check home page loads
3. Visit `/leaderboard` - should show empty or seeded leaderboard
4. Visit `/team/join` - should show team join form

### 5.2 Test Admin Login

1. Visit `/admin/login`
2. Login with:
   - Email: Value from `ADMIN_EMAIL` env var
   - Password: Value from `ADMIN_PASSWORD` env var
3. Should redirect to `/admin` dashboard

### 5.3 Test Team Join Flow

1. Go to `/team/join`
2. If seeded, try joining team with code: `CC-7X4K9` (Cyber Wolves)
3. Enter your name
4. Click "Join Team"
5. Should redirect to team dashboard

### 5.4 Test Realtime Features

1. Open leaderboard in one browser tab
2. Open admin scoring page in another tab
3. Qualify a team or adjust score
4. Leaderboard should update automatically (within 1-3 seconds)

---

## Part 6: Custom Domain (Optional)

### 6.1 Add Custom Domain in Vercel

1. Go to Vercel Project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain: `cipherchase.yourdomain.com`
4. Follow DNS configuration instructions

### 6.2 Update Domain in DNS

Add the following DNS records at your domain provider:

**For subdomain** (`cipherchase.yourdomain.com`):
```
Type: CNAME
Name: cipherchase
Value: cname.vercel-dns.com
```

**For root domain** (`yourdomain.com`):
```
Type: A
Name: @
Value: 76.76.21.21
```

### 6.3 Wait for SSL Certificate

Vercel automatically provisions SSL certificates. Wait 5-10 minutes, then your site will be available at `https://cipherchase.yourdomain.com`

---

## Part 7: Production Checklist

Before launching your competition:

- [ ] Database is initialized with Prisma schema
- [ ] Partial unique index is created (prevents duplicate scores)
- [ ] All environment variables are set correctly
- [ ] Admin login works
- [ ] Team join flow works
- [ ] Round 1 timer starts correctly
- [ ] Question submission works
- [ ] Leaderboard updates in real-time
- [ ] Supabase Realtime is enabled for critical tables
- [ ] Admin analytics page loads
- [ ] Audit logs are recording actions
- [ ] Session persists after browser refresh
- [ ] Mobile responsive UI works
- [ ] SSL certificate is active (HTTPS)
- [ ] Changed default admin password from `.env.example`

---

## Troubleshooting

### Build Fails on Vercel

**Error**: `Prisma Client could not be generated`

**Solution**: Ensure `postinstall` script in `package.json` includes:
```json
"postinstall": "prisma generate"
```

---

### Database Connection Fails

**Error**: `Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` in Vercel environment variables
2. Ensure Supabase project is active (not paused)
3. Check database password is correct (no special characters escaped incorrectly)
4. Verify connection pooling is enabled in Supabase

---

### Realtime Not Working

**Symptoms**: Leaderboard doesn't update automatically

**Solutions**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
2. Check Supabase Realtime replication is enabled for tables
3. Open browser console - look for Realtime connection messages
4. Ensure tables are published: Supabase → Database → Replication → Enable for tables

---

### Admin Login Fails

**Error**: `Invalid credentials`

**Solutions**:
1. Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables
2. Check for typos in credentials
3. Ensure variables are deployed (Vercel → Project → Settings → Environment Variables)
4. Redeploy after adding/changing environment variables

---

### Session Lost After Refresh

**Error**: User logged out after browser refresh

**Solutions**:
1. Verify `SESSION_SECRET` is set and is at least 32 characters
2. Check cookies are enabled in browser
3. Ensure `httpOnly` cookies are working (check Network tab)
4. In development, ensure you're using `http://localhost:3000` not `127.0.0.1:3000`

---

### Timer Not Syncing Across Devices

**Symptoms**: Different team members see different timer values

**Solutions**:
1. This is normal if clocks are not synchronized
2. The **server deadline** is authoritative - client calculates from that
3. Ensure `round1StartedAt` and `round1DeadlineAt` are set in database
4. Check that `/api/round-1/start` endpoint returns correct timer data

---

## Monitoring and Maintenance

### Monitor Database Performance

1. **Supabase Dashboard** → **Reports**
   - Check query performance
   - Monitor connection pool usage
   - Track table sizes

2. **Set up alerts**:
   - Slow queries (> 500ms)
   - High connection count (> 80% of pool)
   - Database CPU > 80%

### Monitor Vercel Logs

1. **Vercel Dashboard** → **Your Project** → **Logs**
2. Filter by:
   - Status: 500 (server errors)
   - Status: 404 (broken links)
   - Duration: > 2000ms (slow requests)

### Backup Database

Supabase provides automatic daily backups on paid plans. For free tier:

1. **Manual Backup**:
   ```powershell
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Schedule Regular Backups**:
   - Set up GitHub Actions to run pg_dump weekly
   - Store backups in cloud storage (S3, Google Cloud Storage)

---

## Scaling Beyond 100 Users

If you expect more than 200 concurrent users:

1. **Upgrade Supabase Plan**:
   - Pro plan: Supports higher connection limits
   - Enable read replicas

2. **Enable Vercel Caching**:
   - Add `Cache-Control` headers to static leaderboard data
   - Use `revalidate` in Next.js data fetching

3. **Database Connection Pooling**:
   - Use PgBouncer (included in Supabase Pro)
   - Configure connection pool size: `?pgbouncer=true&connection_limit=10`

4. **CDN for Static Assets**:
   - Vercel automatically uses CDN
   - Optimize images with Next.js Image component

---

## Support and Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs

---

## Rollback Procedure

If you need to rollback to a previous version:

1. **In Vercel Dashboard**:
   - Go to **Deployments**
   - Find previous working deployment
   - Click **"..." menu** → **"Promote to Production"**

2. **Database Rollback**:
   - If schema changed, restore from backup:
   ```powershell
   psql $DATABASE_URL < backup-YYYYMMDD.sql
   ```

---

## Security Notes

- Never commit `.env` file to Git (it's in `.gitignore`)
- Rotate `SESSION_SECRET` periodically (every 90 days)
- Use strong `ADMIN_PASSWORD` (16+ characters, mixed case, numbers, symbols)
- Enable Supabase RLS (Row Level Security) for additional data protection
- Monitor Supabase auth logs for suspicious activity
- Keep dependencies updated: `npm audit` and `npm update`

---

## Production Deployment Complete! 🎉

Your CIPHER CHASE platform is now live and ready to host cybersecurity competitions.

**Next Steps**:
1. Test all features with your team
2. Create real teams and challenges
3. Schedule a test run before the actual competition
4. Monitor performance during the event
5. Gather feedback and iterate

Good luck with your competition! 🔐🏆
