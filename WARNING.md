# ⚠️ Vercel Deployment Warning

## 1. Backend Persistence
You have deployed the project to Vercel, which is a **serverless** platform.
- The backend now uses **Supabase PostgreSQL** for data storage.
- Persistent file storage is not used; do not rely on JSON files for production.

Important: Perform all coordinator name edits and board planning changes only on the live Vercel deployment via the Admin panel. Do not make these changes locally; local JSON edits are ignored and can be overwritten during pushes or redeploys.

### Solution
Data is persisted in **Supabase** (PostgreSQL). Configure environment variables accordingly.

## 2. Frontend Configuration
- The frontend uses `VITE_API_URL` to reach the backend.
- On Vercel, set `VITE_API_URL` to your deployed backend URL or `/api`.

## 3. Build Settings
If you see a 404, ensure your Vercel Project Settings are:
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

## 4. Supabase Configuration
- `SUPABASE_URL`: Project URL (e.g., `https://gbtpkfkurgdttivtqlpm.supabase.co`)
- `SUPABASE_ANON_KEY`: Client-side key
- `SERVICE_ROLE_KEY`: Server-side key for privileged operations
