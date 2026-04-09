# Railway Setup — Step by Step

Get DAJO running on Railway in 20 minutes.

## Prerequisites (5 min)

1. **Create Railway Account** (free)
   - Go to https://railway.app
   - Sign up with GitHub
   - Authorize Railway to access your repos

2. **GitHub Repo Ready**
   - Repo: `/Users/jonas_m1/dev/dajo-3`
   - Branch: main (or your current branch)
   - Ensure code is committed and pushed

---

## Step 1: Create Railway Project (2 min)

1. Login to https://railway.app
2. Click **"+ New Project"**
3. Select **"Deploy from GitHub repo"**
4. Find and select: `dajo-3`
5. Click **"Deploy"**

Railway will detect Node.js automatically.

---

## Step 2: Deploy Node.js Service (5 min)

After project created:

1. **Configure Node.js Service**
   - Click the auto-detected service
   - Settings → Environment
   - Add variables:
     ```
     NODE_ENV=production
     PORT=3001
     ```

2. **Add API Key**
   - Settings → Environment → Add Variable
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-your-actual-key-here` (paste your key)

3. **Configure Flask URL**
   - Add Variable: `FLASK_API_URL`
   - Value: We'll fill this after Flask deploys

4. **Set Start Command**
   - Settings → Deploy → Start Command
   - Replace with: `npm run build && npm start`
   - Or if not showing, add to root `Procfile`:
     ```
     web: npm run build && npm start
     ```

5. **Wait for Deploy**
   - Railway builds and deploys automatically
   - Should show green status ✓
   - Note your service URL (e.g., `https://dajo-3.up.railway.app`)

---

## Step 3: Deploy Flask Service (5 min)

Now add Flask to same project:

1. **Add New Service**
   - Back to project page
   - Click **"+ Add Service"**
   - Select **"GitHub Repo"**
   - Choose same repo: `dajo-3`

2. **Configure as Python Service**
   - Railway might auto-detect, or:
   - Settings → Environment → Add:
     ```
     PYTHON_VERSION=3.11
     PORT=5002
     ```

3. **Set Python Start Command**
   - Settings → Deploy → Start Command
   - Set to: `cd chord-api && python app.py`

4. **Wait for Deploy**
   - Railway builds Python environment
   - Installs from `chord-api/requirements.txt`
   - Should show green status ✓
   - Note Flask service URL (e.g., `https://dajo-3-flask.up.railway.app`)

---

## Step 4: Connect Services (2 min)

Now link Flask URL to Node.js:

1. **Get Flask Service URL**
   - Go to Flask service in Railway
   - Copy the public URL

2. **Update Node.js Environment**
   - Go to Node.js service
   - Settings → Environment
   - Edit `FLASK_API_URL`
   - Set to: `https://[flask-service-url]` (the URL from Flask service)
   - Save and trigger redeploy

3. **Add Database** (Optional, for now test without)
   - If you want PostgreSQL:
   - Click "Add a plugin"
   - Select "PostgreSQL"
   - Get `DATABASE_URL` from plugin
   - Add to Node.js environment

---

## Step 5: Test Deployment (3 min)

### Test Node.js
```bash
curl https://[your-node-url]/api/health
# Should return: {"status":"ok"}
```

### Test Flask
```bash
curl https://[your-flask-url]/health
# Should return JSON with ChordMiniApp attribution
```

### Test Audio Import
1. Open https://[your-node-url] in browser
2. Go to Import
3. Upload test audio file
4. Should detect chord and show ChordMiniApp attribution

---

## Step 6: Environment Variables Reference

**Node.js Service needs:**
```
NODE_ENV=production
PORT=3001
ANTHROPIC_API_KEY=sk-ant-xxx
FLASK_API_URL=https://your-flask-service.railway.app
DATABASE_URL=postgresql://... (optional, for now)
```

**Flask Service needs:**
```
PYTHON_VERSION=3.11
PORT=5002
```

---

## Troubleshooting

### Service Won't Build
- Check logs: Railway shows build errors
- Common: Missing environment variables
- Solution: Check all env vars are set

### Audio Import Returns 500 Error
1. Check Flask logs
2. Verify FLASK_API_URL is correct
3. Test Flask health: `curl https://flask-url/health`
4. Check file size (max 100MB)

### Flask Service Slow
- Flask startup takes ~3-5 seconds
- Audio processing takes ~200ms per minute
- Consider upgrading machine size if needed

### Can't Connect Between Services
- Both services in same Railway project ✓
- FLASK_API_URL set correctly in Node.js ✓
- Check Flask service is running (green status)

---

## Monitoring

### View Logs
In Railway dashboard:
- Click service
- "Logs" tab
- Real-time output

### Health Checks
Set up monitoring in Railway (optional):
- Node.js: Monitor `/api/health` endpoint
- Flask: Monitor `/health` endpoint

---

## Scaling (Future)

When you get users:
1. Increase Node.js machine size
2. Increase Flask machine size (audio is CPU-heavy)
3. Add caching layer (Redis)
4. Monitor response times

---

## Next Steps After Deploy

1. **Test thoroughly**
   - Import PDFs
   - Import audio
   - Export setlists
   - Create songs

2. **Share with users**
   - Send them the production URL
   - Get feedback

3. **Integrate ChordMiniApp Models** (Advanced)
   - Current: Simple chroma detection
   - Next: Replace with trained Chord-CNN-LSTM models
   - Update Flask: `chord-api/app.py`

4. **Add Database** (When ready)
   - Save user accounts
   - Store songs in database
   - Implement authentication

---

## Useful Railway Commands

If using Railway CLI (optional):

```bash
# Login
railway login

# View project
railway link dajo-3

# View logs
railway logs

# Set environment variable
railway variables set ANTHROPIC_API_KEY sk-ant-xxx

# Trigger redeploy
railway redeploy
```

---

## Cost

Railway free tier covers:
- One small Node.js service
- One small Flask service
- Basic usage

**Expected cost**: $0-10/month depending on usage

---

## Support

- Railway docs: https://docs.railway.app
- Check Railway dashboard for error details
- Review service logs for debugging

---

**Ready?** Start with Step 1: Create Railway Project! 🚀
