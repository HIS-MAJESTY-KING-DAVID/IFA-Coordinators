# ⚠️ Vercel Deployment Warning

## 1. Backend Persistence
You have deployed the project to Vercel, which is a **serverless** platform.
- The current backend uses local JSON files (`data/boards.json`) to store data.
- **Vercel does not support persistent file storage.** Any data written to these files will be **lost** whenever the server restarts or redeploys (which happens frequently).

### Solution:
To make the backend work on Vercel, you must migrate from local JSON files to a database.
**Recommended:** Use **Supabase** (PostgreSQL) for persistence.

## 2. Frontend Configuration
- The frontend has been configured to use `VITE_API_URL` environment variable.
- On Vercel, ensure you set the Environment Variable `VITE_API_URL` to your backend URL.
- If you haven't deployed the backend separately (e.g. on Render), the app will default to `localhost:5000` and fail.

## 3. Build Settings
If you see a 404, ensure your Vercel Project Settings are:
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
