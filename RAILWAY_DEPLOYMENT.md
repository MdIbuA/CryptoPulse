# Railway Deployment Guide - FREE Alternative

## 🚂 Why Railway?

- ✅ **Generous free tier** ($5 credit/month - enough for small projects)
- ✅ **No credit card required** to start
- ✅ **Auto-deploys** from GitHub
- ✅ **Easier setup** than Render
- ✅ **Better performance** on free tier

## 🚀 Deploy to Railway (5 Minutes)

### Step 1: Sign Up

1. **Go to**: https://railway.app
2. **Click**: "Start a New Project"
3. **Sign in with GitHub** (recommended)

### Step 2: Deploy from GitHub

1. **Click**: "Deploy from GitHub repo"
2. **Select**: Your `CryptoPulse` repository
3. **Click**: "Deploy Now"

### Step 3: Configure Service

Railway will auto-detect Python. You just need to:

1. **Click on your service** (it will be deploying)
2. **Go to "Settings" tab**
3. **Set Root Directory**: `WebApplication/server`
4. **Set Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 4: Add Environment Variables

1. **Click "Variables" tab**
2. **Add these variables**:

```
MONGODB_URI=mongodb+srv://2005mohamedibrahim_db_user:cjK3sl57EdN4351u@cluster0.efmubad.mongodb.net/?appName=Cluster0
MONGODB_DB=crypto_pulse
JWT_SECRET=your-super-secret-key-change-in-production
CORS_ORIGINS=https://client-omega-lac.vercel.app
ALLOW_DB_OFFLINE_DEV=False
PORT=8000
```

### Step 5: Deploy!

Railway will automatically:
- ✅ Detect Python
- ✅ Install dependencies from requirements.txt
- ✅ Deploy your app
- ✅ Give you a public URL

## 🎯 Your Backend URL

Once deployed, you'll get a URL like:
```
https://cryptopulse-production.up.railway.app
```

## ✅ Advantages Over Render

| Feature | Railway | Render (Free) |
|---------|---------|---------------|
| Credit Card | Not required | Required |
| Free Tier | $5/month credit | Very limited |
| Sleep Time | 500 hours/month | After 15 min |
| Setup | Easier | More complex |
| Auto-deploy | Yes | Yes |

## 🔗 After Deployment

1. **Copy your Railway URL**
2. **Update frontend** (we'll do this next)
3. **Test your app!**

---

**Railway is the best free option for your backend!** 🚂
