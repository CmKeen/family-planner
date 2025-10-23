# 🚀 Family Planner - Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-23

This guide covers deploying the Family Planner application to production.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Database Setup](#database-setup)
6. [Security Configuration](#security-configuration)
7. [Monitoring & Logs](#monitoring--logs)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Docker** 20.10+ and Docker Compose 2.0+
- **Node.js** 20+ (for manual deployment)
- **PostgreSQL** 14+ (if not using Docker)
- **Git** for code deployment

### Required Accounts/Services (Optional)
- Domain name and DNS access
- SSL certificate (Let's Encrypt recommended)
- Sentry account for error tracking
- Log aggregation service (Datadog, ELK, CloudWatch)

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/family-planner.git
cd family-planner
```

### 2. Create Production Environment Files

#### Backend Environment (`.env.production`)

```bash
# Copy the example file
cp .env.production.example .env.production

# Edit with your production values
nano .env.production
```

**Required Variables:**

```env
# Node Environment
NODE_ENV=production
PORT=3001

# Database (PostgreSQL recommended for production)
DATABASE_URL=postgresql://familyplanner:CHANGE_PASSWORD@postgres:5432/family_planner

# JWT Authentication
JWT_SECRET=GENERATE_STRONG_64_CHAR_SECRET_HERE
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Application
APP_NAME=Family Planner

# Optional: Error Tracking
SENTRY_DSN=your_sentry_dsn_here

# Optional: Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

#### Frontend Environment (`.env.production`)

```bash
cd frontend
cp .env.example .env.production
nano .env.production
```

```env
VITE_API_URL=https://your-api-domain.com/api
```

### 3. Generate Secrets

#### Generate JWT Secret (64 characters):

```bash
openssl rand -base64 64
```

#### Generate Strong Passwords:

```bash
openssl rand -base64 32
```

---

## Docker Deployment

### Option 1: Using Docker Compose (Recommended)

#### 1. Configure docker-compose.yml

The provided `docker-compose.yml` uses environment variables. Ensure your `.env.production` is in the project root.

#### 2. Build and Start Services

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

#### 3. Run Database Migrations

```bash
docker-compose exec backend npx prisma migrate deploy
```

#### 4. (Optional) Seed Database

```bash
docker-compose exec backend npm run prisma:seed
```

### Option 2: Using Pre-built Images

```bash
# Pull images from registry
docker pull ghcr.io/yourusername/family-planner-backend:latest
docker pull ghcr.io/yourusername/family-planner-frontend:latest

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## Manual Deployment

### Backend Deployment

#### 1. Install Dependencies

```bash
cd backend
npm ci --production
```

#### 2. Generate Prisma Client

```bash
npx prisma generate
```

#### 3. Run Database Migrations

```bash
npx prisma migrate deploy
```

#### 4. Build TypeScript

```bash
npm run build
```

#### 5. Start with PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start dist/index.js --name family-planner-api

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

### Frontend Deployment

#### 1. Build Production Bundle

```bash
cd frontend
npm ci
npm run build
```

#### 2. Deploy with Nginx

```bash
# Copy build to nginx directory
sudo cp -r dist/* /var/www/family-planner/

# Configure nginx (see below)
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        root /var/www/family-planner;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

---

## Database Setup

### PostgreSQL Production Setup

#### 1. Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
```

#### 2. Create Database and User

```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Create database
CREATE DATABASE family_planner;

-- Create user
CREATE USER familyplanner WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE family_planner TO familyplanner;

-- Exit
\q
```

#### 3. Configure PostgreSQL for Production

Edit `/etc/postgresql/14/main/postgresql.conf`:

```conf
# Connection settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

#### 4. Backup Strategy

```bash
# Create backup script
cat > /opt/backup-family-planner.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/family-planner"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U familyplanner family_planner | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_$DATE.sql.gz"
EOF

chmod +x /opt/backup-family-planner.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/backup-family-planner.sh
```

---

## Security Configuration

### 1. Firewall Setup

```bash
# Ubuntu/Debian with UFW
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable

# Deny direct access to backend port
sudo ufw deny 3001/tcp
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### 3. Environment Security

```bash
# Secure .env files
chmod 600 .env.production
chown www-data:www-data .env.production  # or your app user

# Never commit secrets to Git
echo ".env.production" >> .gitignore
```

### 4. Database Security

```sql
-- Revoke public schema access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO familyplanner;

-- Use SSL connections
-- Edit postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
```

---

## Monitoring & Logs

### Health Checks

The application provides several health check endpoints:

- `GET /health` - Basic health check
- `GET /health/detailed` - Comprehensive system metrics
- `GET /health/ready` - Readiness probe (Kubernetes/Docker)
- `GET /health/live` - Liveness probe (Kubernetes/Docker)

### Log Management

#### View Logs (Docker)

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

#### View Logs (PM2)

```bash
# Real-time logs
pm2 logs family-planner-api

# Last 100 lines
pm2 logs family-planner-api --lines 100

# Error logs only
pm2 logs family-planner-api --err
```

#### Log Rotation (PM2)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Monitoring Setup

#### Prometheus + Grafana (Optional)

```bash
# Add to docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

#### 2. Port Already in Use

```bash
# Find process using port
sudo lsof -i :3001
sudo lsof -i :5173

# Kill process
sudo kill -9 <PID>
```

#### 3. CORS Errors

Check that `CORS_ORIGIN` in backend `.env` matches your frontend domain:

```env
CORS_ORIGIN=https://your-frontend-domain.com
```

#### 4. JWT Errors

```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Generate new secret if needed
openssl rand -base64 64
```

#### 5. Docker Build Failures

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Debug Mode

Enable detailed logging:

```env
# In .env.production
NODE_ENV=development  # Temporarily
LOG_LEVEL=debug
```

### Support

For additional help:
- Check logs: `docker-compose logs`
- Review health endpoint: `curl http://localhost:3001/health/detailed`
- GitHub Issues: https://github.com/yourusername/family-planner/issues

---

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate installed and valid
- [ ] Firewall rules configured
- [ ] Health checks passing
- [ ] Backups configured and tested
- [ ] Monitoring set up
- [ ] Error tracking configured (Sentry)
- [ ] Log rotation configured
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

## Rollback Procedure

If you need to rollback:

```bash
# Docker deployment
docker-compose down
git checkout <previous-commit>
docker-compose up -d

# Manual deployment
pm2 stop family-planner-api
git checkout <previous-commit>
npm run build
pm2 restart family-planner-api

# Database rollback
psql $DATABASE_URL < /var/backups/family-planner/db_<timestamp>.sql
```

---

**✅ Deployment Complete!**

Your Family Planner application should now be running in production.

Visit: https://your-domain.com

Monitor: https://your-domain.com/health/detailed
