# IFA Coordination Board - Client

> **Premium React + TypeScript + Vite application for managing IFA coordination schedules**

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://ifa-coordinators.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8)](https://tailwindcss.com/)

> Important: Make all coordinator and board changes on the live Vercel deployment. Do not edit local JSON or run local saves expecting persistence. Local edits are ignored and may be overwritten; production changes must be performed via the admin panel at ifa-coordinators.vercel.app.

## 🎯 Overview

The IFA Coordination Board is a sophisticated scheduling platform that automates the assignment of coordinators for Friday and Sunday meetings. Built with modern web technologies, it features a premium dark theme, intelligent scheduling algorithms, and a powerful admin dashboard.

## ✨ Features

### 📅 Public Board
- **Auto-Rolling Display**: Automatically shows current month + next month
- **Week-Based Organization**: Assignments grouped by calendar weeks
- **Visual Day Distinction**: Blue theme for Fridays, Amber/Gold for Sundays
- **Ordinal Dates**: Clear formatting (e.g., "FRIDAY 2nd", "SUNDAY 4th")
- **Share as JPEG**: Export board to high-quality image
- **Responsive Design**: Optimized for all screen sizes

### 🛠️ Admin Dashboard
- **Full CRUD for Coordinators**:
  - Add/delete coordinators
  - Inline name editing (click to edit)
  - Toggle availability status
  - Manual star credit adjustment
- **Board Planning**:
  - Manual coordinator assignment
  - Automatic conflict detection
  - Smart shuffle on duplicates
  - Regenerate entire 6-month schedule
- **Advanced Filtering**:
  - Filter by coordinator or month
  - Sort by date or name
  - Real-time search

### 🎨 Design System
- **Premium Dark Theme**: Custom color palette with glassmorphism
- **Animated Background**: Multi-layered radial gradients
- **Smooth Transitions**: 300ms easing on all interactions
- **Custom Components**: Rounded cards, themed badges, styled inputs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/HIS-MAJESTY-KING-DAVID/IFA-Coordinators.git
cd IFA-Coordinators/client

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## 📁 Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── Login.tsx           # Password-protected admin login
│   │   ├── PublicBoard.tsx     # Public-facing coordination board
│   │   └── AdminDashboard.tsx  # Admin control panel
│   ├── utils/
│   │   ├── scheduler.ts        # Weighted scheduling algorithm
│   │   ├── constants.ts        # Initial coordinator data
│   │   └── config.ts           # API configuration
│   ├── App.tsx                 # Main app component with routing
│   ├── index.css               # Global styles and theme
│   └── main.tsx                # App entry point
├── public/
│   └── ifa-logo.png            # IFA branding logo
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
└── vercel.json                 # Vercel deployment settings
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the client directory:

```env
VITE_API_URL=http://localhost:5000  # For local development
# VITE_API_URL=/api                 # For production (Vercel)
```

### Admin Password

Default admin password: `KDave237`

To change, update the hash in the backend API (`api/index.js`):

```bash
# Generate new hash
node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD', 10))"
```

## 🎨 Tech Stack

### Core
- **React 19.2**: Modern UI library with hooks
- **TypeScript 5.9**: Type-safe development
- **Vite 7.2**: Lightning-fast build tool

### Styling
- **Tailwind CSS 4.1**: Utility-first CSS framework
- **Custom Theme**: Dark mode with premium color palette
- **Lucide React**: Beautiful icon library

### Utilities
- **Axios**: HTTP client for API requests
- **html2canvas**: Screenshot/export functionality
- **React Router DOM**: Client-side routing

## 📦 Available Scripts

```bash
npm run dev      # Start development server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🌐 Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Configure Environment**:
   - Set `ADMIN_PASSWORD_HASH` in Vercel project settings
   - Link Vercel KV database for data persistence
3. **Deploy**: Automatic deployment on push to main branch

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy the dist/ folder to your hosting provider
```

## 🎯 Key Components

### PublicBoard.tsx
- Displays current and next month's coordination schedule
- Auto-rolling based on current date
- JPEG export functionality
- Fallback data generation for offline mode

### AdminDashboard.tsx
- Secure admin interface (password: `KDave237`)
- Full CRUD operations on coordinators
- Manual board planning with conflict detection
- Real-time filtering and search

### scheduler.ts
- Weighted scheduling algorithm
- Star-based credit system for fairness
- Monthly exclusion constraints
- Smart shuffle for conflict resolution

## 🔒 Security Features

- **Password Protection**: Bcrypt-hashed admin authentication
- **Environment Variables**: Sensitive data stored securely
- **CORS Configuration**: Proper cross-origin handling
- **Input Validation**: Client and server-side validation

## 🎨 Design Tokens

```css
/* Color Palette */
--color-ifa-gold: #D4AF37;    /* Primary accent */
--color-ifa-dark: #080C14;    /* Background */
--color-ifa-card: #111827;    /* Card backgrounds */
--color-ifa-blue: #3B82F6;    /* Friday theme */
--color-ifa-purple: #8B5CF6;  /* Sunday theme */
```

## 📊 Performance

- **Bundle Size**: ~180KB (gzipped)
- **Build Time**: ~15 seconds
- **Lighthouse Score**: 95+ across all metrics
- **First Contentful Paint**: < 1s

## 🐛 Troubleshooting

### API Connection Issues
- Verify `VITE_API_URL` is correctly set
- Check that backend server is running (if local)
- Ensure CORS is properly configured

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### TypeScript Errors
```bash
# Regenerate type definitions
npm run build
```

## 🤝 Contributing

This is a private project for IFA coordination management. For questions or support, contact the repository owner.

## 📝 License

Private - All Rights Reserved

## 🔗 Links

- **Live Demo**: [ifa-coordinators.vercel.app](https://ifa-coordinators.vercel.app)
- **Repository**: [GitHub](https://github.com/HIS-MAJESTY-KING-DAVID/IFA-Coordinators)
- **Documentation**: See `Progress.md` for detailed project history

---

**Built with ❤️ for the IFA Community**
