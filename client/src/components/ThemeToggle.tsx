import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isLight = theme === 'light';

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
        isLight
          ? 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
          : 'bg-ifa-card text-white border-gray-800 hover:bg-white/10'
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
          isLight ? 'bg-yellow-400/20 text-yellow-500' : 'bg-blue-500/20 text-blue-300'
        }`}
      >
        {isLight ? <Sun size={16} /> : <Moon size={16} />}
      </div>
      <span className="text-xs font-bold uppercase tracking-widest">
        {isLight ? 'Light' : 'Dark'}
      </span>
    </button>
  );
};

export default ThemeToggle;
