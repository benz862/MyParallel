# MyParallel Server Deployment Guide

## ✅ Build Complete!

Your frontend has been successfully built and is ready for production deployment.

## Build Output

**Location**: `dist/` directory

**Files Generated:**
```
dist/
├── index.html                    (1.28 KB) - Main HTML entry point
├── assets/
│   ├── index-DA3nlp95.css       (42.24 KB) - All CSS styles
│   └── index-D0nXCcne.js        (685.21 KB) - All JavaScript
├── Logo_MyParallel.png           (109 KB) - Logo image
└── logo.png                      (67 KB) - Secondary logo
```

**Build Sizes:**
- HTML: 1.28 KB (gzipped: 0.55 KB)
- CSS: 42.24 KB (gzipped: 7.55 KB)  
- JavaScript: 685.21 KB (gzipped: 168.59 KB)
- **Total: 728.73 KB (gzipped: 176.14 KB)**

## Deployment Structure

Your server will need:

```
server/
├── public/                      ← Serve the "dist" folder here
│   ├── index.html
│   ├── assets/
│   └── images/
│
├── backend-server.js            ← Node.js express server (port 8081)
│
├── .env                          ← Environment variables
│
└── node_modules/                ← Dependencies (from npm install)
```

## Files to Upload to Your Server

### 1. Frontend Build
```
dist/                           ← UPLOAD ENTIRE FOLDER
├── index.html
├── assets/
├── Logo_MyParallel.png
└── logo.png
```

### 2. Backend Files
```
backend-server.js               ← Express server
package.json                    ← Dependencies list
.env                            ← Environment variables
voice-relay.js                  ← Optional voice relay server
```

### 3. Additional Files
```
supabase-schema.sql             ← Database schema
scripts/                        ← Utility scripts (optional)
utils/                          ← Shared utilities
constants.ts                    ← App constants
types.ts                        ← TypeScript types
```

## Step-by-Step Deployment

### Step 1: Set Up Server Environment
```bash
# SSH into your server
ssh user@your-server.com

# Create project directory
mkdir -p /home/user/myparallel
cd /home/user/myparallel

# Copy files to server
scp -r dist/ user@your-server.com:/home/user/myparallel/
scp backend-server.js user@your-server.com:/home/user/myparallel/
scp package.json user@your-server.com:/home/user/myparallel/
scp .env user@your-server.com:/home/user/myparallel/
scp -r node_modules/ user@your-server.com:/home/user/myparallel/
```

### Step 2: Install Dependencies
```bash
cd /home/user/myparallel
npm install
```

### Step 3: Configure Environment
```bash
# Edit .env with production values
nano .env

# Add/update:
PORT=8081
VITE_API_URL=https://your-domain.com
API_KEY=your-gemini-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

### Step 4: Start Services

**Option A: Using PM2 (Recommended)**
```bash
# Install PM2 globally
npm install -g pm2

# Start backend server
pm2 start backend-server.js --name "myparallel-backend"

# Start voice relay (optional)
pm2 start voice-relay.js --name "myparallel-voice-relay"

# Make PM2 start on system reboot
pm2 startup
pm2 save
```

**Option B: Using systemd Service**
```bash
# Create service file
sudo nano /etc/systemd/system/myparallel.service

# Add content:
[Unit]
Description=MyParallel Wellness Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/user/myparallel
ExecStart=/usr/bin/node backend-server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable myparallel
sudo systemctl start myparallel
```

### Step 5: Configure Web Server

**Nginx Configuration:**
```nginx
upstream backend {
    server localhost:8081;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS (optional but recommended)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Serve frontend static files
    location / {
        root /home/user/myparallel/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache settings
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support (for Gemini Live API)
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Apache Configuration:**
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    # Redirect to HTTPS
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/your-domain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/your-domain.com/privkey.pem
    
    # Serve frontend
    DocumentRoot /home/user/myparallel/dist
    
    <Directory /home/user/myparallel/dist>
        Options -MultiViews
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteRule ^ index.html [QSA,L]
    </Directory>
    
    # Proxy API requests
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:8081/api/
    ProxyPassReverse /api/ http://localhost:8081/api/
    
    # WebSocket support
    ProxyPass /ws ws://localhost:8081/ws
    ProxyPassReverse /ws ws://localhost:8081/ws
</VirtualHost>
```

### Step 6: Set Up SSL Certificate
```bash
# Using Let's Encrypt (free)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com

# Nginx will auto-renew, but you can also manually renew:
sudo certbot renew
```

### Step 7: Database Migration
```bash
# In your Supabase dashboard:
1. Go to SQL Editor
2. Run the migration from supabase-schema.sql
3. Verify tables created:
   - user_profiles
   - resource_deliveries (new)
   - messages
   - etc.
```

## Verification Checklist

- [ ] Frontend files served correctly at `https://your-domain.com`
- [ ] Backend server running on port 8081
- [ ] API endpoints respond: `curl https://your-domain.com/api/`
- [ ] Gemini Live API works (test with voice demo)
- [ ] Twilio SMS configured and working
- [ ] Supabase connection verified
- [ ] SSL certificate valid and auto-renewing
- [ ] Environment variables all set
- [ ] Logs being recorded correctly
- [ ] Error handling working

## Monitoring & Maintenance

### Check Backend Status
```bash
# If using PM2
pm2 status
pm2 logs myparallel-backend

# If using systemd
sudo systemctl status myparallel
sudo journalctl -u myparallel -f
```

### Monitor Logs
```bash
# Real-time logs
pm2 logs

# Check disk space
df -h

# Check memory usage
free -h

# Check processes
ps aux | grep node
```

### Regular Maintenance
```bash
# Update Node.js
nvm install node

# Update dependencies
npm update

# Clear old logs
pm2 flush

# Restart services
pm2 restart all
```

## Troubleshooting

### Issue: Frontend shows 404
**Solution**: Ensure Nginx/Apache is serving `dist/index.html` for all routes

### Issue: API calls fail
**Solution**: Check proxy configuration, verify backend is running on port 8081

### Issue: WebSocket connection fails
**Solution**: Ensure proxy supports WebSockets (Upgrade headers)

### Issue: CORS errors
**Solution**: Verify CORS is enabled in backend-server.js

### Issue: Environment variables not loaded
**Solution**: Check `.env` file in working directory, restart backend after changes

## Performance Optimization

### Caching
- Static assets cached for 1 hour
- Use CDN for images (logo, assets)
- Enable gzip compression

### Database
- Indexes created on `resource_deliveries` table
- Connection pooling configured
- Queries optimized

### Backend
- Express compression enabled
- CORS configured
- Rate limiting recommended

## Security Best Practices

1. **Always use HTTPS**
   ```bash
   # Force HTTPS redirect
   ```

2. **Secure Environment Variables**
   - Never commit `.env` to git
   - Use restricted file permissions: `chmod 600 .env`
   - Store in secure vault on production

3. **Enable Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
   app.use(limiter);
   ```

4. **Monitor API Usage**
   - Log all resource delivery requests
   - Monitor SMS costs
   - Alert on failures

5. **Regular Backups**
   ```bash
   # Backup database daily
   # Backup configuration files
   ```

## Server Requirements

**Minimum:**
- 1 GB RAM
- 1 CPU core
- 10 GB storage
- Node.js 18+

**Recommended:**
- 2-4 GB RAM
- 2-4 CPU cores
- 50+ GB storage
- Node.js LTS
- Redis for sessions (optional)

## Post-Deployment

After deployment:

1. ✅ Test voice chat on production
2. ✅ Verify resource delivery works
3. ✅ Test SMS sending
4. ✅ Check error logging
5. ✅ Monitor performance
6. ✅ Set up automated backups
7. ✅ Configure alerts
8. ✅ Document server setup

## Support & Documentation

- **Backend Issues**: Check backend logs with `pm2 logs`
- **Frontend Issues**: Check browser console for errors
- **API Issues**: Test endpoints with `curl`
- **Database Issues**: Check Supabase dashboard

For detailed setup, see:
- `RESOURCE_DELIVERY_QUICKSTART.md`
- `RESOURCE_DELIVERY_FEATURE.md`
- `LOCAL_DEVELOPMENT.md`

---

**Your build is ready for production! 🚀**
