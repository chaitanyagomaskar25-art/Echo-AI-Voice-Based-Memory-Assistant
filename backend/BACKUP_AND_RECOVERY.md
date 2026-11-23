# Echo Backend Backup & Disaster Recovery Guide

This operational runbook documents backup, disaster recovery, and point-in-time recovery (PITR) procedures for the **Echo – AI Voice-Based Memory Assistant** database and storage.

---

## 1. Automated MongoDB Atlas Cloud Backups (Production Recommended)

When deploying to MongoDB Atlas in production:
1. **Continuous Cloud Backups**:
   - Enable Continuous Cloud Backups in the Atlas Cluster configuration.
   - Set RPO (Recovery Point Objective) to 1 minute via Atlas oplog tailing.
   - Set RTO (Recovery Time Objective) under 15 minutes.
2. **Snapshot Retention Policy**:
   - Hourly snapshots retained for 24 hours.
   - Daily snapshots retained for 30 days.
   - Weekly snapshots retained for 12 weeks.
   - Monthly snapshots retained for 1 year.
3. **Point-In-Time Restore (PITR)**:
   - Atlas allows rolling back any unintended data mutation down to the exact second within the last 7 days.

---

## 2. On-Demand CLI Backup (`mongodump` & `mongorestore`)

For automated cron jobs, staging environments, or local operations:

### Create Dump
```bash
mongodump --uri="mongodb://127.0.0.1:27018/echo_memory_db" --out="/path/to/backups/dump_$(date +%Y%m%d_%H%M%S)" --gzip
```

### Restore Dump
```bash
mongorestore --uri="mongodb://127.0.0.1:27018/echo_memory_db" --dir="/path/to/backups/<backup_folder>/echo_memory_db" --gzip --drop
```

---

## 3. Node.js Script-Based JSON Backup & Recovery

Echo includes built-in programmatic backup and restore utilities:

### Run Full Backup
```bash
node backend/scripts/backupDatabase.js
```
Exports all collections (`memories`, `tasks`, `reminders`, `conversations`, `recaps`, `users`, `tags`) into timestamped JSON files under `backend/backups/backup_<timestamp>/` with an automated `manifest.json`.

### Restore from Latest Backup
```bash
node backend/scripts/restoreDatabase.js
```

### Restore from Specific Backup Folder
```bash
node backend/scripts/restoreDatabase.js /absolute/path/to/backend/backups/backup_2026-11-23T14-00-00-000Z
```

---

## 4. Audio Storage Backup (`backend/uploads/`)

Physical audio recordings stored on disk in `backend/uploads/` must be synchronized:
- **Local/Self-hosted**: Use `rsync` with automated hourly cron:
  ```bash
  rsync -avz --delete /home/pratiksha/Desktop/Echo\ –\ AI\ Voice-Based\ Memory\ Assistant/backend/uploads/ /mnt/secure_backup/echo_audio_uploads/
  ```
- **Cloud Object Storage (S3 / Google Cloud Storage)**:
  - Configure lifecycle policies for cold-storage archiving after 90 days.
  - Enable bucket versioning to protect against accidental file deletion.
