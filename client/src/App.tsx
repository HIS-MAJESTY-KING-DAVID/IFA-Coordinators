import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
      <div className="min-h-screen bg-ifa-dark text-white">
        <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-ifa-card sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="IFA Logo" className="h-10 w-10 object-contain" />
            <h1 className="text-xl font-bold tracking-tight text-ifa-gold">IFA Coordination</h1>
          </div>
          <div className="flex gap-4">
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="text-sm bg-red-900/30 text-red-400 px-3 py-1 rounded border border-red-900/50 hover:bg-red-900/50 transition-all"
              >
                Logout Admin
              </button>
            ) : (
              <a
                href="/admin"
                className="text-sm text-gray-400 hover:text-ifa-gold transition-all"
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
              path="/login"
              element={<Login onLogin={handleLogin} />}
            />
            <Route
              path="/admin"
              element={isAdmin ? <AdminDashboard /> : <Navigate to="/login" />}
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
