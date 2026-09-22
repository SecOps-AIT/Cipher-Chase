# CIPHER CHASE - BACKUP & RECOVERY STRATEGY

## 🔐 CRITICAL DATA PROTECTION

### Critical Event Data (MUST SURVIVE)
- **Teams** - Team names, join codes, scores, timers
- **Team Members** - Names, emails, phones (leaders), join timestamps
- **Submissions** - All question attempts, correct/incorrect, timestamps
- **Score Events** - All scoring history, first blood awards
- **Round State** - Timer states, question releases, round progression
- **Audit Logs** - All team actions, admin actions, security events

### Non-Critical Data (Can be recreated)
- **Questions** - Static content, can be re-seeded
- **Challenges** - Round 2 auction content, can be re-seeded
- **Events** - Event metadata, can be recreated

## 📋 BACKUP STRATEGY

### 1. Supabase Automatic Backups
Supabase provides automatic daily backups:
- **Location**: Supabase Dashboard → Project → Database → Backups
- **Retention**: 7 days for free tier, 30 days for Pro
- **Schedule**: Daily at random time
- **Restore**: Point-in-time recovery available

### 2. Manual Pre-Event Backup
Before the competition starts:

```bash
# Create manual backup
pg_dump "$DATABASE_URL" > "cipher-chase-pre-event-$(date +%Y%m%d-%H%M%S).sql"

# Verify backup file
ls -la cipher-chase-pre-event-*.sql
head -50 cipher-chase-pre-event-*.sql
```

### 3. Live Event Backup (Every Hour)
During the active competition:

```bash
# Automated hourly backup during event
pg_dump "$DATABASE_URL" > "cipher-chase-live-$(date +%Y%m%d-%H%M%S).sql"

# Compress for storage
gzip cipher-chase-live-*.sql

# Store securely (cloud storage, etc.)
```

### 4. Critical Table Export
Export just the essential tables for quick recovery:

```sql
-- Export critical competition data only
COPY teams TO '/tmp/teams_backup.csv' WITH CSV HEADER;
COPY team_members TO '/tmp/members_backup.csv' WITH CSV HEADER;
COPY submissions TO '/tmp/submissions_backup.csv' WITH CSV HEADER;
COPY score_events TO '/tmp/scores_backup.csv' WITH CSV HEADER;
COPY audit_logs TO '/tmp/audit_backup.csv' WITH CSV HEADER;
```

## 🚨 DISASTER RECOVERY PROCEDURES

### Scenario 1: Database Corruption During Event

**Priority**: Restore service within 15 minutes

1. **Immediate Response**:
   ```bash
   # Check Supabase service status
   curl -I https://[your-project].supabase.co
   
   # Check application connectivity
   curl -I https://cipher-chase.vercel.app/api/team/me
   ```

2. **Quick Recovery**:
   - Access Supabase Dashboard → Database → Backups
   - Restore from most recent automatic backup
   - Verify data integrity with spot checks

3. **Verification**:
   - Test team login
   - Verify leaderboard displays correctly
   - Check admin dashboard shows live data
   - Confirm timer states are preserved

### Scenario 2: Accidental Data Deletion

**Examples**: Admin accidentally runs destructive query, team data lost

1. **Stop All Writes**:
   ```bash
   # Emergency: Disable API routes
   # Update Vercel environment variable:
   MAINTENANCE_MODE=true
   ```

2. **Assess Damage**:
   ```sql
   -- Check what data remains
   SELECT COUNT(*) FROM teams;
   SELECT COUNT(*) FROM submissions;
   SELECT COUNT(*) FROM score_events;
   
   -- Check most recent timestamps
   SELECT MAX(created_at) FROM submissions;
   SELECT MAX(created_at) FROM score_events;
   ```

3. **Point-in-Time Recovery**:
   - Use Supabase point-in-time restore to just before incident
   - Alternative: Restore from hourly backup during event

### Scenario 3: Complete Database Loss

**Worst case**: Supabase project deleted, complete data loss

1. **Restore from Manual Backup**:
   ```bash
   # Create new Supabase project
   # Get new DATABASE_URL and DIRECT_URL
   
   # Restore from latest manual backup
   psql "$NEW_DATABASE_URL" < cipher-chase-live-YYYYMMDD-HHMMSS.sql
   
   # Update Vercel environment variables
   # Deploy application
   ```

2. **Data Integrity Verification**:
   ```sql
   -- Verify team counts
   SELECT event_id, COUNT(*) as team_count FROM teams GROUP BY event_id;
   
   -- Verify scoring integrity
   SELECT t.name, t.score, 
          COALESCE(SUM(se.points), 0) as calculated_score
   FROM teams t
   LEFT JOIN score_events se ON t.id = se.team_id
   GROUP BY t.id, t.name, t.score
   HAVING t.score != COALESCE(SUM(se.points), 0);
   
   -- Verify timer states
   SELECT name, round1_started_at, round1_deadline_at 
   FROM teams 
   WHERE round1_started_at IS NOT NULL;
   ```

## ⚡ RECOVERY TIME OBJECTIVES (RTO)

| **Scenario** | **RTO Target** | **Recovery Method** |
|--------------|----------------|-------------------|
| Service Outage | < 5 minutes | Supabase service recovery |
| Data Corruption | < 15 minutes | Automatic backup restore |
| Accidental Deletion | < 30 minutes | Point-in-time recovery |
| Complete Loss | < 60 minutes | Manual backup restore |

## 🔍 MONITORING & ALERTS

### Critical Metrics to Monitor
- **Database Connections**: Monitor connection pool exhaustion
- **Query Performance**: Watch for slow queries during peak load
- **Error Rates**: Alert on >5% error rate in API routes
- **Disk Space**: Supabase storage utilization
- **Backup Status**: Verify daily backups are completing

### Supabase Dashboard Monitoring
1. **Database → Performance**: Query performance, connections
2. **Database → Logs**: Error logs, slow queries  
3. **Database → Backups**: Backup status and size
4. **API → Logs**: API request logs and errors

### Vercel Monitoring
1. **Functions**: Monitor function execution time and errors
2. **Analytics**: Track API route performance
3. **Edge Network**: Monitor global performance

## 📞 EMERGENCY CONTACTS & PROCEDURES

### During Event Hours
1. **Primary Admin**: [Contact Info]
2. **Technical Support**: [Contact Info]
3. **Supabase Support**: support@supabase.com (Pro plan)
4. **Vercel Support**: support@vercel.com

### Emergency Decision Tree
```
Database Issue Detected
├── Service Down? 
│   ├── Check Supabase Status Page
│   └── Contact Supabase Support
├── Data Corruption?
│   ├── Stop writes immediately
│   ├── Restore from backup
│   └── Verify data integrity
└── Performance Issues?
    ├── Check connection pool
    ├── Monitor slow queries
    └── Scale if necessary
```

## ✅ RECOVERY TESTING

### Pre-Event Testing (Required)
- [ ] **Backup Creation**: Verify manual backup process works
- [ ] **Backup Restoration**: Test restore to new database
- [ ] **Data Verification**: Confirm all critical data preserved
- [ ] **Application Recovery**: Verify app works with restored data
- [ ] **Performance**: Ensure restored database performs adequately

### Regular Testing Schedule
- **Weekly**: Verify automatic backups are occurring
- **Monthly**: Test manual backup and restore process
- **Pre-Event**: Full disaster recovery simulation

## 📊 BACKUP MONITORING CHECKLIST

- [ ] Automatic daily backups enabled in Supabase
- [ ] Manual pre-event backup completed and verified
- [ ] Backup files stored in secure, separate location
- [ ] Recovery procedures documented and tested
- [ ] Emergency contacts list updated
- [ ] Monitoring alerts configured
- [ ] RTO/RPO objectives communicated to stakeholders

**Remember**: The best backup is the one you've successfully restored from ✅