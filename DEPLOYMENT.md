# DAJO 3.0 Deployment Guide

Deploy DAJO to production on Railway with Express.js API and Flask audio service.

## Overview

DAJO requires two services:
1. **Node.js API** (port 3001) — Main application server
2. **Flask Service** (port 5002) — Audio chord detection

Both services should be deployed to Railway.

## Prerequisites

- Railway account (free tier available)
- GitHub repository connected
- Environment variables configured

## Environment Variables

### Node.js Service (`.env`)
```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:pass@host/dbname
PORT=3001
NODE_ENV=production
FLASK_API_URL=http://flask-service:5002
```

### Flask Service
The Flask service doesn't require explicit environment variables but needs:
- Port mapping to 5002
- Python 3.11+ runtime
- `/tmp` directory for audio temp files

## Deployment Steps

### 1. Prepare Repository

Ensure your repository has:
```
.
├── server/                 # Node.js source
├── chord-api/              # Flask source
│   ├── app.py
│   └── requirements.txt
├── client/                 # React client
├── package.json            # Node.js config
└── railway.json            # (Optional) Railway config
```

### 2. Deploy Node.js Service

#### Via Railway CLI

```bash
# Login
railway login

# Create project
railway init

# Deploy Node.js
railway up

# Set environment variables
railway variables set ANTHROPIC_API_KEY sk-ant-...
railway variables set DATABASE_URL postgresql://...
railway variables set FLASK_API_URL https://flask-service.railway.app
```

#### Via Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. New Project → GitHub Repo
3. Select this repo
4. Configure Environment:
   - Select Node.js template
   - Add environment variables
   - Specify npm script: `npm run build && npm start`
   - Port: 3001

### 3. Deploy Flask Service

#### Via Railway CLI

```bash
# In chord-api directory
cd chord-api

# Create new Railway project for Flask
railway init

# Set Python runtime
railway variables set PYTHON_VERSION 3.11

# Deploy
railway up
```

#### Via Railway Dashboard

1. Create new service in same project
2. Use Python template
3. Connect to chord-api directory
4. Set Python version: 3.11
5. Set start command: `python app.py`
6. Port: 5002

## Configuration

### Railway File (`railway.json`)

```json
{
  "services": {
    "api": {
      "root": ".",
      "buildCommand": "npm ci && npm run build",
      "startCommand": "npm start",
      "environmentVariables": {
        "PORT": 3001
      }
    },
    "audio": {
      "root": "chord-api",
      "buildCommand": "pip install -r requirements.txt",
      "startCommand": "python app.py",
      "environmentVariables": {
        "PORT": 5002
      }
    }
  }
}
```

## Service Communication

### Local Development
Flask and Node.js communicate on `localhost`:
```
http://localhost:5002/detect_chords
```

### Production (Railway)
Configure Node.js to connect to Flask service:

```typescript
// server/ai-import.ts
const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5002";

const flaskResponse = await fetch(`${FLASK_API_URL}/detect_chords`, {
  method: "POST",
  body: audioBuffer,
});
```

Set environment variable in Railway:
```
FLASK_API_URL=https://flask-service.railway.app
```

## Database Setup

### PostgreSQL on Railway

1. Add PostgreSQL plugin to project
2. Set `DATABASE_URL` from plugin
3. Run migrations:
   ```bash
   npm run migrate
   ```

## Health Checks

### Node.js Health
```bash
curl https://your-app.railway.app/api/health
```

### Flask Health
```bash
curl https://flask-service.railway.app/health
```

## Monitoring

### Railway Dashboard
- Monitor builds and deployments
- View logs: `railway logs`
- Check resource usage

### Application Logs
```bash
# Node.js logs
railway logs -s api

# Flask logs
railway logs -s audio
```

## Scaling

### Node.js Service
- Increase machine size for more CPU/RAM
- Enable auto-scaling if available

### Flask Service
- Flask is CPU-intensive for audio processing
- Recommend: Standard or Performance tier
- Monitor CPU usage: `railway logs -s audio`

## Troubleshooting

### Flask Service Times Out
- Increase timeout in Node.js:
```typescript
const response = await fetch(url, {
  timeout: 30000, // 30 seconds
  method: "POST",
});
```

### Audio Processing Fails
1. Check Flask logs: `railway logs -s audio`
2. Verify temp directory exists: `/tmp/dajo_audio`
3. Check audio file format supported
4. Monitor disk space

### Service-to-Service Communication Fails
1. Check Railway networking (services in same project)
2. Verify `FLASK_API_URL` environment variable
3. Test endpoint: `curl $FLASK_API_URL/health`

## Performance Tips

1. **Caching**: Cache chord detection results
   ```typescript
   const cache = new Map<string, DetectionResult>();
   ```

2. **Streaming**: For large files, process in chunks
   
3. **CDN**: Use Railway's built-in CDN for static assets

4. **Database**: Add connection pooling
   ```typescript
   const pool = new Pool({ max: 20 });
   ```

## CI/CD

### GitHub Actions

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: railway-app/action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
```

## Cost Estimation

### Railway Pricing (as of 2024)
- **Compute**: $0.000579 per CPU-hour
- **Memory**: $0.000231 per GB-hour
- **Bandwidth**: $0.10 per GB (outbound)

Typical setup: $10-30/month for both services

## Rollback Procedures

### Revert to Previous Deployment
```bash
railway environment switch [previous-deployment-id]
```

### Manual Rollback
1. Go to Railway Dashboard
2. Select deployment
3. Click "Revert"

## Next Steps

1. Set up GitHub Actions for CI/CD
2. Configure custom domain
3. Set up error tracking (Sentry)
4. Add monitoring and alerts
5. Document API in OpenAPI/Swagger

## Support

- [Railway Documentation](https://docs.railway.app)
- [Flask Deployment Guide](https://flask.palletsprojects.com/deployment/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Last Updated**: April 2026
