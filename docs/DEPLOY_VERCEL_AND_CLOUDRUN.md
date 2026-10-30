# Delta Hybrid Deployment: Vercel (Frontend) + Google Cloud Run (Backend)

This guide details the complete deployment of Delta across **Vercel** (for high-speed global Edge CDN frontend delivery) and **Google Cloud Run** (for containerized autoscaling backend API, WhatsApp Cloud API compatibility engine, and Webhooks).

Target Google Cloud Account: `divagareofficial10@gmail.com`

---

## 🏗️ Architecture Diagram

```
                                  +------------------------------------------+
                                  |                 Users                    |
                                  +------------------------------------------+
                                           |                        |
                                           | (HTTPS Web App)        | (WhatsApp API / Webhooks)
                                           v                        v
+------------------------------------------+        +------------------------------------------+
|            VERCEL (Frontend)             |        |       GOOGLE CLOUD RUN (Backend)         |
|  - Next.js 15 PWA App Shell              |        |  - Containerized Docker Service          |
|  - Global Edge CDN                       |        |  - WhatsApp Cloud API Routes (/v19.0/..) |
|  - UI Components, Theme, Audio Players   |        |  - /api/v1/messages, /media, /webhooks   |
|  - Auto-proxies /api/* to Cloud Run      |------->|  - In-Memory & Supabase Postgres Store   |
|  - Variable: NEXT_PUBLIC_BACKEND_API_URL |        |  - Port 8080 (Managed Autoscaling 0..10) |
+------------------------------------------+        +------------------------------------------+
                                                                     |
                                                                     v
                                                    +----------------------------------+
                                                    |       SUPABASE POSTGRESQL        |
                                                    |  - RLS Policies & Auth Sessions  |
                                                    |  - Storage Buckets & Realtime    |
                                                    +----------------------------------+
```

---

## 🚀 Step 1: Deploy Backend to Google Cloud Run

### A. Prerequisites
- Google Cloud SDK (`gcloud`) installed.
- Target account: `divagareofficial10@gmail.com`.

### B. One-Click Deployment Script
Open your terminal in `C:\DELTA` and execute:

```powershell
.\scripts\deploy-cloudrun.ps1 -Account "divagareofficial10@gmail.com" -Region "asia-south1"
```
*(If you are on Linux or macOS, run `./scripts/deploy-cloudrun.sh`)*

### C. What the script does automatically:
1. Verifies/logs in to `divagareofficial10@gmail.com`.
2. Connects to your Google Cloud Project (or creates/selects one).
3. Enables `run.googleapis.com` and `cloudbuild.googleapis.com`.
4. Uses [`Dockerfile`](file:///C:/DELTA/Dockerfile) to build the standalone container.
5. Deploys the service to Google Cloud Run with:
   - Port: `8080`
   - Memory: `1Gi`
   - CPU: `1`
   - Autoscaling: `0 to 10 instances`
   - Public HTTPS endpoint: `https://delta-backend-xxxxxx.a.run.app`

### D. Set Backend Environment Variables on Google Cloud Run
In the Google Cloud Console (or via `gcloud run services update`):
```bash
gcloud run services update delta-backend \
  --region asia-south1 \
  --set-env-vars NEXT_PUBLIC_ENABLE_DEMO_MODE=false \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --set-env-vars NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... \
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... \
  --set-env-vars GEMINI_API_KEY=your_gemini_api_key
```

Save your live Cloud Run URL (e.g. `https://delta-backend-910708332824.asia-south1.run.app`).

---

## ⚡ Step 2: Deploy Frontend to Vercel

### A. Via GitHub Integration (Recommended)
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: configure Vercel frontend and Google Cloud Run backend deployment"
   git push origin main
   ```
2. Navigate to [vercel.com/new](https://vercel.com/new).
3. Import your GitHub repository (`DELTA`).
4. Framework Preset: **Next.js** (detected automatically).
5. Add the following **Environment Variables** in Vercel:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_BACKEND_API_URL` | `https://delta-backend-xxxxxx.a.run.app` | **Your Google Cloud Run URL** |
   | `NEXT_PUBLIC_APP_NAME` | `Delta` | Brand Name |
   | `NEXT_PUBLIC_ENABLE_DEMO_MODE` | `false` (or `true` for demo) | Mode Selector |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase Anon Key |
6. Click **Deploy**.

### B. Via Vercel CLI (Alternative)
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 🔗 How the Frontend & Backend Connect (Zero-CORS Magic)

In [`next.config.mjs`](file:///C:/DELTA/next.config.mjs), Next.js dynamic rewrites are active:
```javascript
async rewrites() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (!backendUrl) return [];

  return [
    {
      source: '/api/:path*',
      destination: `${backendUrl.replace(/\/$/, '')}/api/:path*`,
    },
    {
      source: '/:version/:id/:path*',
      destination: `${backendUrl.replace(/\/$/, '')}/:version/:id/:path*`,
    },
  ];
}
```

### Why this architecture is ideal:
1. **Zero CORS Issues:** The browser talks to `https://your-app.vercel.app/api/...`. Vercel's global CDN transparently reverse-proxies the request to Google Cloud Run.
2. **Meta WhatsApp Webhook Support:** Webhook subscriptions (`GET /api/v1/webhooks?hub.challenge=...`) and inbound message callbacks work directly through both Vercel and Google Cloud Run.
3. **Instant Scalability:** Vercel serves static web assets, images, and HTML at sub-20ms edge latency, while Cloud Run scales server compute instances from 0 to 10+ based on API traffic.
4. **Cost Efficiency:** Zero idle cost on Cloud Run (scales to 0 instances when not handling requests) and zero bandwidth markup on Vercel.

