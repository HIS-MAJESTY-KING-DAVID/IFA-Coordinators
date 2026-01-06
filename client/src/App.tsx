import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicBoard from './components/PublicBoard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(
    localStorage.getItem('isAdmin') === 'true'
  );

  const handleLogin = (success: boolean) => {
    setIsAdmin(success);
    if (success) {
      localStorage.setItem('isAdmin', 'true');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
  };

  return (
    <Router>
      <div className="min-h-screen bg-ifa-dark text-white motion-safe">
        <div className="ifa-ambient-bg" aria-hidden="true"></div>
        <header className="px-6 py-4 flex justify-between items-center bg-transparent sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="IFA" className="ifa-logo rounded-xl" />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">IFA Coordination</h1>
              <p className="text-xs text-gray-400 font-medium">Community Board</p>
            </div>
          </div>
          <div className="flex gap-4">
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="text-sm bg-red-900/30 text-red-400 px-3 py-1.5 rounded-lg border border-red-900/50 hover:bg-red-900/50 transition-all font-medium"
              >
                Logout Admin
              </button>
            ) : (
              <a
                href="/admin"
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                Admin Login
              </a>
            )}
          </div>
        </header>

        <main className="container mx-auto p-4 lg:p-8">
          <Routes>
            <Route path="/" element={<PublicBoard />} />
            <Route
              path="/admin"
              element={isAdmin ? <AdminDashboard /> : <Login onLogin={handleLogin} />}
            />
          </Routes>
        </main>

        <footer className="p-8 text-center text-gray-600 text-sm border-t border-gray-800 mt-20">
          &copy; {new Date().getFullYear()} IFA Bonamoussadi Weekly Coordination. All rights reserved.
        </footer>
      </div>
    </Router>
  );
};

export default App;
