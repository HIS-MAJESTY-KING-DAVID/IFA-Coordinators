# IFA Bonamoussadi Weekly Coordination Board

A high-aesthetic, automated platform for planning and managing church meeting coordinators for Friday (Prayer/Teaching) and Sunday services.

## ✨ Premium Features
- **Smart Scheduling**: 6-month automated planning using a weighted star credit system.
- **Star Credit Model**: Admin assigns stars to coordinators; one is consumed per assignment to ensure equitable rotation.
- **Visual Distinction**: High-contrast theme with Blue (Friday) and Gold (Sunday) meeting cards.
- **Share Board**: One-click "SHARE AS JPEG" feature to export the board for WhatsApp/social sharing.
- **Smart Shuffle**: Manual name overrides that cause monthly duplicates automatically trigger a shuffle for upcoming weeks to maintain fairness.
- **Admin Dashboard**: Secure control (KDave237) over 18 names, credits, and manual overrides.
- **Privacy**: Public view is restricted to the current and next month only.

## 🛠️ Tech Stack
- **Frontend**: Vite + React + Tailwind CSS 4 (Advanced HSL color tokens)
- **Backend**: Express on Vercel Functions
- **Storage**: Supabase PostgreSQL (managed cloud database)
- **Export**: html-to-image (primary) with html2canvas fallback

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Installation
```bash
# Clone the repository
cd IFA-Coordinators

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Running the App
```bash
# Start the frontend (Port 5173)
cd ../client
npm run dev
```

### 4. Admin Access
- Navigate to `/login`
- **Password**: `KDave237`

## 🔒 Constraints Logic
- **Monthly Exclusion**: A coordinator cannot be scheduled more than once in the same calendar month.
- **Weekly Shuffle**: A coordinator cannot handle both Friday and Sunday of the same week.
- **Weighting**: Candidates with more stars have a higher probability of being picked, ensuring those who haven't served recently are prioritized.

## 📦 Persistence
- Production data is stored in Supabase PostgreSQL.
- Ensure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SERVICE_ROLE_KEY` are configured in environment.
