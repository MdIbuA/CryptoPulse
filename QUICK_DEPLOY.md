# CryptoPulse - Quick Deployment Guide

## ✅ What We've Set Up

1. ✅ Vercel CLI installed
2. ✅ Vercel account authenticated
3. ✅ Configuration files created

## 🚀 Easiest Way to Deploy: Use Vercel Dashboard

### Step 1: Build Your Frontend Locally

```bash
cd WebApplication/client
npm run build
```

This creates a `dist` folder with your production build.

### Step 2: Deploy via Vercel Dashboard

1. **Go to**: https://vercel.com/new
2. **Click**: "Deploy without Git"
3. **Upload**: The `WebApplication/client` folder (or just drag and drop)
4. **Project Name**: `cryptopulse-frontend` (or any name you like)
5. **Framework**: Select "Vite"
6. **Click**: Deploy

### Step 3: Your App is Live! 🎉

Vercel will give you a URL like: `https://cryptopulse-frontend.vercel.app`

## 🔧 Alternative: Deploy via CLI (Manual)

If you prefer CLI:

```bash
cd WebApplication/client
vercel --prod
```

Follow the prompts and it will deploy.

## ⚠️ Important Notes

### Backend is NOT Deployed Yet

Your frontend will be live, but the backend (FastAPI) needs separate deployment:

**Recommended: Deploy Backend to Render.com**

1. Go to https://render.com
2. Sign up/Login
3. Click "New +" → "Web Service"
4. Connect GitHub or upload code
5. Settings:
   - **Name**: `cryptopulse-backend`
   - **Root Directory**: `WebApplication/server`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3

6. Add Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://2005mohamedibrahim_db_user:cjK3sl57EdN4351u@cluster0.efmubad.mongodb.net/?appName=Cluster0
   MONGODB_DB=crypto_pulse
   JWT_SECRET=your-super-secret-key-change-in-production
   CORS_ORIGINS=https://your-vercel-frontend-url.vercel.app
   ```

### Update Frontend API URL

After deploying backend, update your frontend to point to the backend URL:

1. Create `WebApplication/client/.env.production`:
   ```
   VITE_API_URL=https://your-render-backend-url.onrender.com
   ```

2. Redeploy frontend

## 🎯 Current Status

- ✅ Frontend ready to deploy
- ⏳ Backend needs deployment (use Render.com)
- ⏳ Connect frontend to backend after both are deployed

## 📝 Next Steps

1. Deploy frontend to Vercel (easiest via dashboard)
2. Deploy backend to Render.com
3. Update frontend with backend URL
4. Test the full application

Need help? Check the full DEPLOYMENT.md guide!
