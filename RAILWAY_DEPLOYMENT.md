# 🚂 Railway Deployment Guide with SSH Tunneling

Complete guide to deploy your backend to Railway with SSH tunnel database access.

---

## 📋 Overview

Railway is perfect for this use case because it:
- ✅ Supports persistent SSH connections
- ✅ Can run background services
- ✅ Handles environment variables securely
- ✅ Auto-deploys from GitHub
- ✅ Provides custom domains

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Railway       │
│                 │
│  ┌───────────┐  │
│  │  Backend  │  │
│  │  Service  │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │   SSH     │  │
│  │  Tunnel   │  │
│  │  Service  │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
         │ SSH Tunnel
         │ (Port 55432)
         │
┌────────▼────────┐
│  Database       │
│  Server         │
│  (plane.etlab)  │
└─────────────────┘
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Configure for Railway deployment"
   git push origin main
   ```

2. **Verify files are in place:**
   - ✅ `Procfile`
   - ✅ `railway.json`
   - ✅ `scripts/setup-ssh-tunnel.sh`
   - ✅ `package.json` (with updated scripts)

### Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### Step 3: Deploy Your Application

#### Option A: Deploy from GitHub (Recommended)

1. **Connect Repository:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect Node.js

2. **Railway will automatically:**
   - Detect `package.json`
   - Run `npm install`
   - Run build command from `Procfile`
   - Start the service

#### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Step 4: Configure Environment Variables

In Railway Dashboard → Your Service → Variables:

#### Required Variables:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration (via SSH Tunnel)
DB_HOST=localhost
DB_PORT=55432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name

# SSH Tunnel Configuration
SSH_KEY=-----BEGIN RSA PRIVATE KEY-----
... (paste your entire PEM key content here)
-----END RSA PRIVATE KEY-----
SSH_HOST=plane.etlab.co
SSH_USER=ubuntu

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Security
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

#### How to Add Variables:

1. Go to your service in Railway
2. Click **Variables** tab
3. Click **+ New Variable**
4. Add each variable one by one

**Important for SSH_KEY:**
- Copy the **entire content** of `C:\Kimbal\etl-mumbai.pem`
- Include the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines
- Paste it as a single multi-line value in Railway

### Step 5: Set Up SSH Tunnel Service

Railway supports multiple services. You have two options:

#### Option A: Single Service with Tunnel Script (Simpler)

Update your `Procfile`:

```procfile
web: chmod +x scripts/setup-ssh-tunnel.sh && scripts/setup-ssh-tunnel.sh & sleep 5 && npm run build && npm start
```

#### Option B: Separate Tunnel Service (Recommended)

1. **Create a new service in Railway:**
   - Click **+ New** → **Empty Service**
   - Name it "SSH Tunnel"

2. **Configure the tunnel service:**
   - **Start Command:** `chmod +x scripts/setup-ssh-tunnel.sh && ./scripts/setup-ssh-tunnel.sh`
   - **Root Directory:** `/` (root of your repo)

3. **Add environment variables to tunnel service:**
   - `SSH_KEY` (same as main service)
   - `SSH_HOST=plane.etlab.co`
   - `SSH_USER=ubuntu`

4. **Your main backend service:**
   - Will connect to `localhost:55432` (tunnel port)
   - No changes needed to backend code

### Step 6: Configure Build Settings

Railway should auto-detect, but verify:

1. **Build Command:** `npm run build`
2. **Start Command:** `npm start`
3. **Root Directory:** `/` (root)

### Step 7: Deploy and Monitor

1. **Trigger deployment:**
   - Push to GitHub (auto-deploy)
   - Or click "Redeploy" in Railway

2. **Monitor logs:**
   - Click on your service
   - View **Deployments** tab
   - Check **Logs** for errors

3. **Expected logs:**
   ```
   🚀 Starting application with SSH tunnel...
   📡 SSH tunnel configuration detected
   🔌 Starting SSH tunnel...
   🔌 Setting up SSH tunnel to database server...
   ✅ SSH configuration complete
   🚀 Starting SSH tunnel: localhost:55432 -> plane.etlab.co:5432
   ✅ SSH tunnel is active on port 55432 (PID: xxxx)
   📡 Monitoring SSH tunnel (PID: xxxx)...
   ✅ SSH tunnel is ready on port 55432
   🔨 Building application...
   ✅ Sequelize connection established
   ✅ Models initialized successfully
   🚀 Server running on port 3000 in production mode
   ```

   **Note:** If connection fails initially, you'll see retry attempts:
   ```
   ❌ Attempt 1/5 to connect to PostgreSQL failed: ...
   ⏳ Retrying in 5 seconds...
   ```

---

## 🔧 Configuration Files

### Procfile

```procfile
web: chmod +x scripts/setup-ssh-tunnel.sh scripts/start-with-tunnel.sh && ./scripts/start-with-tunnel.sh
```

**Note:** The `start-with-tunnel.sh` script will:
1. Check for SSH tunnel configuration
2. Start the SSH tunnel if configured
3. Wait for the tunnel to be ready (up to 30 seconds)
4. Build the application
5. Start the Node.js server

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "chmod +x scripts/setup-ssh-tunnel.sh scripts/start-with-tunnel.sh && ./scripts/start-with-tunnel.sh",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicy": {
      "maxRetries": 10,
      "wait": 20
    }
  }
}
```

---

## 🛠️ Troubleshooting

### Issue: "SSH tunnel failed to start"

**Solutions:**
1. ✅ Verify `SSH_KEY` is correctly formatted (include BEGIN/END lines)
2. ✅ Check `SSH_HOST` and `SSH_USER` are correct
3. ✅ Ensure PEM key has proper permissions (script handles this)
4. ✅ Check Railway logs for SSH connection errors

### Issue: "Database connection timeout" or "SequelizeConnectionRefusedError"

**Solutions:**
1. ✅ Verify SSH tunnel service is running (check logs for "✅ SSH tunnel is active")
2. ✅ Check `DB_HOST=localhost` and `DB_PORT=55432` in environment variables
3. ✅ The app now has automatic retry logic (5 retries with 5-second delays)
4. ✅ Check Railway logs to see if tunnel started successfully
5. ✅ Verify the tunnel port is listening: The script checks for port 55432 before starting the app
6. ✅ Ensure `SSH_KEY`, `SSH_HOST`, and `SSH_USER` are all set correctly

### Issue: "Permission denied (publickey)"

**Solutions:**
1. ✅ Verify SSH_KEY is complete (all lines)
2. ✅ Check key format (should be RSA or ED25519)
3. ✅ Ensure key matches the one on server
4. ✅ Try regenerating SSH key if needed

### Issue: "Port 55432 already in use"

**Solutions:**
1. ✅ Only one service should use the tunnel port
2. ✅ Use separate tunnel service (Option B)
3. ✅ Or use different port: `55433` and update `DB_PORT`

### Issue: "Build fails"

**Solutions:**
1. ✅ Check Node.js version (Railway uses latest LTS)
2. ✅ Verify `package.json` has correct engines
3. ✅ Check build logs for TypeScript errors
4. ✅ Ensure all dependencies are in `package.json`

---

## 🔐 Security Best Practices

1. ✅ **Never commit SSH keys** to repository
2. ✅ **Use Railway secrets** for sensitive data
3. ✅ **Rotate SSH keys** regularly
4. ✅ **Restrict CORS_ORIGIN** to your frontend domain
5. ✅ **Use strong JWT_SECRET**
6. ✅ **Enable Railway's built-in security** features

---

## 📊 Monitoring

### View Logs

```bash
# Via Railway Dashboard
# Go to Service → Logs tab

# Via Railway CLI
railway logs
```

### Health Checks

Railway automatically monitors:
- Service uptime
- Response times
- Error rates

Add custom health endpoint:
```bash
curl https://your-app.railway.app/health
```

---

## 🔄 Auto-Deployment

Railway auto-deploys when you push to:
- `main` branch (production)
- Other branches (preview deployments)

To disable auto-deploy:
1. Go to Service → Settings
2. Toggle "Auto Deploy"

---

## 🌐 Custom Domain

1. Go to Service → Settings → Domains
2. Click "Generate Domain" or "Add Custom Domain"
3. Update DNS records as instructed
4. Update `CORS_ORIGIN` environment variable

---

## 💰 Cost Considerations

- **Railway Hobby:** $5/month (includes $5 credit)
- **Railway Pro:** $20/month (includes $20 credit)
- **Usage-based:** Pay for what you use beyond credits

**Estimated costs:**
- Small backend: ~$5-10/month
- With database tunnel: ~$7-12/month

---

## 🚀 Quick Start Checklist

- [ ] Repository pushed to GitHub
- [ ] Railway account created
- [ ] Project created and connected to GitHub
- [ ] Environment variables configured
- [ ] SSH tunnel service set up (if using separate service)
- [ ] Build and deploy successful
- [ ] Health endpoint responding
- [ ] Database connection working
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up

---

## 📝 Environment Variables Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | `production` | Yes |
| `PORT` | Server port | `3000` | Yes |
| `DB_HOST` | Database host | `localhost` | Yes |
| `DB_PORT` | Database port | `55432` | Yes |
| `DB_USER` | Database user | `postgres` | Yes |
| `DB_PASSWORD` | Database password | `***` | Yes |
| `DB_NAME` | Database name | `meter_data` | Yes |
| `SSH_KEY` | SSH private key | `-----BEGIN...` | Yes |
| `SSH_HOST` | SSH server | `plane.etlab.co` | Yes |
| `SSH_USER` | SSH user | `ubuntu` | Yes |
| `JWT_SECRET` | JWT secret | `***` | Yes |
| `JWT_EXPIRES_IN` | JWT expiry | `24h` | No |
| `BCRYPT_ROUNDS` | Bcrypt rounds | `10` | No |
| `CORS_ORIGIN` | CORS origin | `https://...` | Yes |

---

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

---

## 🆘 Support

If you encounter issues:
1. Check Railway logs
2. Verify environment variables
3. Test SSH connection manually
4. Check Railway status page
5. Join Railway Discord for help

---

**Last Updated:** 2024

