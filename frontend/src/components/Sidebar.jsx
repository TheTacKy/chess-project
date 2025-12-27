import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import SidebarButton from './SidebarButton';
import { authAPI } from '../api';
import ChessLogo from './ChessLogo';

function Sidebar({ isDark, toggleTheme }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.user);
      } catch (err) {
        if (err.response?.status !== 401) {
          console.error('Auth check error:', err);
        }
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      navigate('/');
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="w-64 h-screen flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Logo at top */}
      <div className="px-4 pt-4 pb-6">
        <ChessLogo />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 space-y-1">
        <SidebarButton
          to="/"
          icon="♟️"
          isActive={isActive('/')}
        >
          <span className="font-bold">Play</span>
        </SidebarButton>

        <SidebarButton
          to="/puzzles"
          icon="🧩"
          isActive={isActive('/puzzles')}
        >
          <span className="font-bold">Puzzles</span>
        </SidebarButton>

        <SidebarButton
          to="/news"
          icon="📰"
          isActive={isActive('/news')}
        >
          <span className="font-bold">News</span>
        </SidebarButton>
      </nav>

      {/* Settings and Theme Toggle */}
      <div className="px-4 space-y-1">
        <SidebarButton
          to="/settings"
          icon="⚙️"
          isActive={isActive('/settings')}
        >
          <span className="font-bold">Settings</span>
        </SidebarButton>
        
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
        >
          <span className="text-xl">
            {isDark ? '☀️' : '🌙'}
          </span>
          <span className="font-bold">
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>

      {/* Auth Buttons */}
      <div className="px-4 pb-4 pt-4 space-y-2">
        {user ? (
          <>
            <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
              {user.username}
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link
              to="/signup"
              className="block w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              className="block w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
            >
              Log In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default Sidebar;

