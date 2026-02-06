# 🐍 Backend Deployment Guide - Render.com

## ✅ Files Created for Deployment

1. ✅ `requirements.txt` - Python dependencies
2. ✅ `.python-version` - Python version specification
3. ✅ `Procfile` - Start command for Render
4. ✅ `render.yaml` - Render configuration

## 🚀 Deploy to Render.com (Recommended)

### Step 1: Sign Up / Login to Render

1. **Go to**: https://render.com
2. **Sign up** with GitHub (recommended) or email
3. **Verify** your email if needed

### Step 2: Create New Web Service

1. **Click**: "New +" button (top right)
2. **Select**: "Web Service"
3. **Choose**: "Build and deploy from a Git repository"

### Step 3: Connect Your Code

**Option A: Connect GitHub Repository (Best)**
1. Click "Connect GitHub"
2. Authorize Render to access your repos
3. Select your `CryptoPulse` repository
4. Click "Connect"

**Option B: Upload Code Manually**
1. Click "Public Git repository"
2. Enter: `https://github.com/MdIbuA/CryptoPulse.git`
3. Click "Continue"

### Step 4: Configure Service

Fill in these settings:

**Basic Settings:**
- **Name**: `cryptopulse-api` (or any name you like)
- **Region**: Oregon (US West) - Free tier available
- **Branch**: `main`
- **Root Directory**: `WebApplication/server`

**Build Settings:**
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Instance Type:**
- **Plan**: `Free` (select the free tier)

### Step 5: Add Environment Variables

Click "Advanced" and add these environment variables:

```
MONGODB_URI = mongodb+srv://2005mohamedibrahim_db_user:cjK3sl57EdN4351u@cluster0.efmubad.mongodb.net/?appName=Cluster0

MONGODB_DB = crypto_pulse

JWT_SECRET = your-super-secret-key-change-in-production-please-use-a-strong-random-key

CORS_ORIGINS = https://client-omega-lac.vercel.app

ALLOW_DB_OFFLINE_DEV = False
```

**Important**: 
- Keep `MONGODB_URI` and `JWT_SECRET` as **secret** (don't expose them)
- Update `CORS_ORIGINS` with your actual Vercel URL

### Step 6: Deploy!

1. **Click**: "Create Web Service"
2. **Wait**: Render will build and deploy (takes 3-5 minutes)
3. **Monitor**: Check the logs for any errors

### Step 7: Get Your Backend URL

Once deployed, you'll get a URL like:
```
https://cryptopulse-api.onrender.com
```

**Copy this URL** - you'll need it for the frontend!

## 🔗 Connect Frontend to Backend

### Update Frontend API Configuration

1. **Create** `WebApplication/client/.env.production`:
   ```bash
   VITE_API_URL=https://cryptopulse-api.onrender.com
   ```

2. **Update** your API client (if needed)

3. **Rebuild and redeploy** frontend:
   ```bash
   cd WebApplication/client
   npm run build
   vercel --prod
   ```

## ✅ Verify Deployment

### Test Backend Health

Visit: `https://your-backend-url.onrender.com/health`

You should see:
```json
{
  "status": "ok",
  "db": true,
  "tf": true
}
```

### Test API Endpoints

1. **Health Check**: `GET /health`
2. **Google Client ID**: `GET /auth/google-client-id`
3. **Signup**: `POST /auth/signup`

## ⚠️ Important Notes

### Free Tier Limitations

- **Sleep after 15 min inactivity** - First request after sleep takes ~30 seconds
- **750 hours/month** - More than enough for testing
- **Automatic HTTPS** - SSL certificates included

### MongoDB Atlas IP Whitelist

Make sure MongoDB Atlas allows connections from Render:

1. Go to MongoDB Atlas Dashboard
2. Network Access → IP Access List
3. **Add**: `0.0.0.0/0` (allow all IPs)
   - Or add Render's specific IPs if you want to be more secure

### Model Files

Your ML models are large and may not deploy. Options:

1. **Exclude models** from deployment (use API-only features)
2. **Upload models** to cloud storage (AWS S3, Google Cloud Storage)
3. **Use smaller models** or model compression

## 🐛 Troubleshooting

### Build Fails

**Check logs** in Render dashboard:
- Missing dependencies? Update `requirements.txt`
- Python version issues? Check `.python-version`

### Database Connection Fails

- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist
- Ensure database user has proper permissions

### CORS Errors

- Update `CORS_ORIGINS` with your Vercel URL
- Make sure it matches exactly (including https://)

### App Crashes

- Check Render logs for errors
- Verify all environment variables are set
- Test locally first with same env vars

## 🎯 Alternative: Railway.app

If Render doesn't work, try Railway:

1. **Go to**: https://railway.app
2. **Sign up** with GitHub
3. **New Project** → Deploy from GitHub repo
4. **Select**: `WebApplication/server` as root
5. **Add** same environment variables
6. **Deploy** - Railway auto-detects Python

## 📊 Deployment Checklist

- [ ] Render account created
- [ ] Web service created
- [ ] Root directory set to `WebApplication/server`
- [ ] Environment variables added
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Deployment successful
- [ ] Health endpoint working
- [ ] MongoDB connected
- [ ] Frontend updated with backend URL
- [ ] Frontend redeployed
- [ ] Full app tested

## 🎉 Success!

Once deployed:
- ✅ Backend running on Render
- ✅ Frontend running on Vercel
- ✅ MongoDB Atlas connected
- ✅ Full-stack app live!

---

**Need help?** Check Render logs or contact support at https://render.com/docs
