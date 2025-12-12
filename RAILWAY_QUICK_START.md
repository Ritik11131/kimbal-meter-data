# 🚂 Railway Quick Start Guide

## Prerequisites

1. GitHub repository with your code
2. Railway account (sign up at [railway.app](https://railway.app))
3. SSH key file: `C:\Kimbal\etl-mumbai.pem`

---

## 🚀 Quick Deployment (5 Minutes)

### 1. Push to GitHub

```bash
git add .
git commit -m "Configure for Railway"
git push origin main
```

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will auto-detect and start building

### 3. Add Environment Variables

In Railway Dashboard → Your Service → **Variables** tab:

**Copy and paste these (replace with your values):**

```env
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=55432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name

SSH_KEY=-----BEGIN RSA PRIVATE KEY-----
[Paste entire content of C:\Kimbal\etl-mumbai.pem here]
-----END RSA PRIVATE KEY-----
SSH_HOST=plane.etlab.co
SSH_USER=ubuntu

JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=10
CORS_ORIGIN=*
```

**To get SSH_KEY:**
1. Open `C:\Kimbal\etl-mumbai.pem` in a text editor
2. Copy **everything** including `-----BEGIN` and `-----END` lines
3. Paste into Railway's `SSH_KEY` variable

### 4. Verify Configuration

The `Procfile` is already configured to:
- ✅ Automatically start the SSH tunnel if `SSH_KEY`, `SSH_HOST`, and `SSH_USER` are set
- ✅ Wait for the tunnel to be ready (up to 30 seconds)
- ✅ Build and start your application

**No additional setup needed!** The tunnel will start automatically when the service starts.

### 5. Deploy

Railway will automatically:
- ✅ Install dependencies
- ✅ Build the project
- ✅ Set up SSH tunnel (if configured)
- ✅ Wait for tunnel to be ready
- ✅ Start your backend with automatic database connection retries

### 6. Verify

1. Check **Logs** tab in Railway
2. Look for: `✅ SSH tunnel is active on port 55432`
3. Look for: `✅ PostgreSQL connection authenticated successfully`
4. Look for: `🚀 Server running on port 3000`
5. Test: `https://your-app.railway.app/health`

**Note:** If you see connection retries, that's normal. The app will retry up to 5 times with 5-second delays.

---

## ✅ Success Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] Environment variables added (including `SSH_KEY`, `SSH_HOST`, `SSH_USER`)
- [ ] SSH tunnel started automatically (check logs)
- [ ] Backend service running
- [ ] Health endpoint responding (`/health`)
- [ ] Database connection working (check for "✅ PostgreSQL connection authenticated")

---

## 🔧 Common Issues

**"SSH tunnel failed"**
→ Check SSH_KEY includes BEGIN/END lines

**"Database connection timeout" or "SequelizeConnectionRefusedError"**
→ The app now automatically retries 5 times. Check that:
  - SSH tunnel is running (look for "✅ SSH tunnel is active")
  - `DB_HOST=localhost` and `DB_PORT=55432` are set
  - All SSH variables (`SSH_KEY`, `SSH_HOST`, `SSH_USER`) are configured

**"Build failed"**
→ Check Node.js version (should be 18+)

---

## 📚 Full Documentation

See `RAILWAY_DEPLOYMENT.md` for complete guide.

---

**That's it! Your backend is now live on Railway! 🎉**

