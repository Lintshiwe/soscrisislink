# SOSCrisisLink Deployment Guide

## Overview

SOSCrisisLink is a comprehensive emergency response platform for South Africa, featuring real-time disaster monitoring, SOS alerts, multi-language support, and offline functionality.

## System Requirements

### Production Environment

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher with PostGIS extension
- **Redis**: v6.0 or higher (for session storage and caching)
- **SSL Certificate**: Required for service worker and geolocation features
- **Domain**: HTTPS domain for production deployment

### Development Environment

- Node.js v18+
- PostgreSQL with PostGIS (optional - demo mode available)
- Git for version control

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-domain.com

# Database Configuration (PostgreSQL with PostGIS)
DATABASE_URL=postgresql://username:password@localhost:5432/crisislink
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crisislink
DB_USER=username
DB_PASSWORD=password

# External API Keys
OPENWEATHER_API_KEY=your_openweather_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Security
JWT_SECRET=your_super_secure_jwt_secret_key
SESSION_SECRET=your_session_secret_key

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# API Configuration
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_ENVIRONMENT=production

# Map Configuration
REACT_APP_MAPBOX_TOKEN=your_mapbox_access_token

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_PUSH_NOTIFICATIONS=true
```

## Database Setup

### PostgreSQL with PostGIS Installation

#### Ubuntu/Debian:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib postgis postgresql-postgis
```

#### CentOS/RHEL:

```bash
sudo yum install postgresql-server postgresql-contrib postgis
```

### Database Initialization

1. **Create Database and User:**

```sql
CREATE DATABASE crisislink;
CREATE USER crisislink_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE crisislink TO crisislink_user;
```

2. **Enable PostGIS Extension:**

```sql
\c crisislink
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
```

3. **Run Database Migrations:**

```bash
cd backend
npm run db:migrate
npm run db:seed
```

### Database Schema (Automated via Migrations)

The application will automatically create these tables:

- `sos_alerts` - Emergency SOS alerts with geospatial data
- `shelters` - Emergency shelter locations
- `disaster_zones` - Active disaster area boundaries
- `weather_alerts` - Weather-based emergency notifications
- `users` - User accounts and preferences
- `notifications` - Notification history and delivery status

## Deployment Steps

### 1. Server Preparation

#### Update System:

```bash
sudo apt update && sudo apt upgrade -y
```

#### Install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Install PM2 (Process Manager):

```bash
sudo npm install -g pm2
```

### 2. Application Deployment

#### Clone Repository:

```bash
git clone https://github.com/your-username/soscrisislink.git
cd soscrisislink
```

#### Backend Setup:

```bash
cd backend
npm install --production
```

#### Frontend Build:

```bash
cd ../frontend
npm install
npm run build
```

### 3. Process Management with PM2

#### Create PM2 Ecosystem File:

Create `ecosystem.config.js` in the root directory:

```javascript
module.exports = {
  apps: [
    {
      name: 'crisislink-backend',
      script: './backend/src/server.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend.log',
      time: true,
    },
  ],
}
```

#### Start Application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Web Server Configuration (Nginx)

#### Install Nginx:

```bash
sudo apt install nginx
```

#### Configure Nginx:

Create `/etc/nginx/sites-available/crisislink`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /path/to/ssl/certificate.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    # Frontend (React Build)
    location / {
        root /path/to/soscrisislink/frontend/build;
        try_files $uri $uri/ /index.html;

        # Service Worker Headers
        location /sw.js {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Support (if needed)
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

#### Enable Site:

```bash
sudo ln -s /etc/nginx/sites-available/crisislink /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Health Monitoring

### Application Health Checks

The backend includes health check endpoints:

- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system status including database and external services

### PM2 Monitoring:

```bash
pm2 monit          # Real-time monitoring
pm2 logs           # View logs
pm2 status         # Process status
```

### System Monitoring

Consider setting up:

- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Metrics**: Prometheus + Grafana
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Error Tracking**: Sentry

## Performance Optimization

### Frontend Optimizations

- ✅ Code splitting implemented
- ✅ Service worker for offline functionality
- ✅ Asset compression and caching
- ✅ Image optimization for disaster imagery

### Backend Optimizations

- ✅ Database connection pooling
- ✅ Response compression (gzip)
- ✅ Rate limiting for API endpoints
- ✅ Caching for weather and shelter data

### Database Optimizations

- ✅ Spatial indexes for geospatial queries
- ✅ Connection pooling
- ✅ Query optimization for emergency response times

## Security Considerations

### Application Security

- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF tokens
- ✅ Rate limiting
- ✅ Secure headers

### Infrastructure Security

- ✅ Firewall configuration
- ✅ SSL/TLS encryption
- ✅ Regular security updates
- ✅ Database access restrictions
- ✅ API key management

## Backup Strategy

### Database Backups

```bash
# Daily automated backup
pg_dump -h localhost -U crisislink_user -d crisislink | gzip > backup_$(date +%Y%m%d).sql.gz

# Restoration
gunzip < backup_20231201.sql.gz | psql -h localhost -U crisislink_user -d crisislink
```

### Application Backups

- Source code: Git repository with tags for releases
- Configuration: Environment files (encrypted)
- User uploads: Regular sync to cloud storage

## Disaster Recovery

### High Availability Setup

1. **Load Balancer**: Multiple backend instances
2. **Database Replication**: Master-slave PostgreSQL setup
3. **CDN**: CloudFlare or AWS CloudFront for static assets
4. **Multi-region Deployment**: Disaster recovery in different geographic region

### Failover Procedures

1. **Database Failover**: Automatic failover to read replica
2. **Application Failover**: PM2 cluster mode with auto-restart
3. **DNS Failover**: Health check-based DNS switching

## Troubleshooting

### Common Issues

#### Service Worker Not Updating

```bash
# Clear service worker cache
# In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister())
})
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostGIS extension
psql -d crisislink -c "SELECT PostGIS_Full_Version();"
```

#### API Connection Problems

```bash
# Check backend logs
pm2 logs crisislink-backend

# Check backend status
curl -f http://localhost:3001/health
```

### Log Locations

- **Backend Logs**: `./logs/backend.log`
- **Nginx Logs**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **PostgreSQL Logs**: `/var/log/postgresql/postgresql-14-main.log`
- **PM2 Logs**: `~/.pm2/logs/`

## Support and Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review logs and performance metrics
- **Monthly**: Security updates and dependency updates
- **Quarterly**: Database maintenance and optimization
- **Annually**: Security audit and disaster recovery testing

### Update Procedures

1. **Backup** current deployment
2. **Test** updates in staging environment
3. **Deploy** during maintenance window
4. **Monitor** application health post-deployment
5. **Rollback** if issues detected

## Contact and Support

For deployment issues or questions:

- **Documentation**: Check this guide and inline code comments
- **Logs**: Always check application and system logs first
- **Health Checks**: Use built-in health endpoints for diagnostics

---

**Emergency System Note**: This platform handles emergency communications. Always test thoroughly before deploying to production and ensure proper monitoring is in place for 24/7 availability.
