# CryptoPulse Vercel Deployment Guide

## 🚀 Deployment Overview

This guide will help you deploy CryptoPulse to Vercel.

### Architecture
- **Frontend**: React + Vite (deployed to Vercel)
- **Backend**: FastAPI (needs separate deployment - Render/Railway recommended)

## 📦 Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed globally
3. MongoDB Atlas connection string
4. GitHub repository (optional but recommended)

## 🔧 Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## 🌐 Step 2: Deploy Frontend to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy from project root**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Set up and deploy? `Y`
   - Which scope? Select your account
   - Link to existing project? `N`
   - Project name: `cryptopulse` (or your choice)
   - In which directory is your code located? `./`
   - Want to override settings? `Y`
   - Build Command: `cd WebApplication/client && npm run build`
   - Output Directory: `WebApplication/client/dist`
   - Development Command: `cd WebApplication/client && npm run dev`

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Option B: Deploy via GitHub (Easier)

1. **Push code to GitHub** (once the secret issue is resolved)
2. **Go to Vercel Dashboard**: https://vercel.com/dashboard
3. **Click "Add New Project"**
4. **Import your GitHub repository**
5. **Configure build settings**:
   - Framework Preset: `Vite`
   - Root Directory: `./`
   - Build Command: `cd WebApplication/client && npm install && npm run build`
   - Output Directory: `WebApplication/client/dist`
6. **Add Environment Variables** (if needed for frontend)
7. **Click Deploy**

## 🔐 Step 3: Set Environment Variables

After deployment, add these environment variables in Vercel Dashboard:

```
VITE_API_URL=<your-backend-url>
```

## 🐍 Step 4: Deploy Backend (FastAPI)

Vercel has limited Python support. Better options:

### Recommended: Deploy to Render.com

1. Go to https://render.com
2. Create new "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `WebApplication/server`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: `Python 3`

5. Add environment variables:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   MONGODB_DB=crypto_pulse
   JWT_SECRET=<your-jwt-secret>
   CORS_ORIGINS=<your-vercel-frontend-url>
   ```

### Alternative: Railway.app

1. Go to https://railway.app
2. Create new project from GitHub repo
3. Select `WebApplication/server` as root
4. Railway will auto-detect Python and deploy
5. Add environment variables

## 🔗 Step 5: Connect Frontend to Backend

1. Get your backend URL from Render/Railway
2. Update frontend API configuration
3. Redeploy frontend if needed

## ✅ Verification

1. Visit your Vercel URL
2. Test signup/login functionality
3. Check if API calls work
4. Verify MongoDB connection

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify build command paths

### API Not Working
- Check CORS settings in backend
- Verify environment variables
- Check backend logs

### MongoDB Connection Issues
- Verify connection string
- Check IP whitelist in MongoDB Atlas (add 0.0.0.0/0 for Render/Railway)

## 📝 Notes

- Free tier limits apply
- Backend may sleep after inactivity (free tier)
- Consider upgrading for production use
