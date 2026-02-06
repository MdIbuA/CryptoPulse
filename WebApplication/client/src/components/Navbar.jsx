import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import logo from "../logo.png";

// Theme Toggle Button Component
const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all duration-300 group"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5">
        {/* Sun Icon */}
        <svg
          className={`absolute inset-0 w-5 h-5 text-amber-400 transition-all duration-300 ${isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
            }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        {/* Moon Icon */}
        <svg
          className={`absolute inset-0 w-5 h-5 text-indigo-300 transition-all duration-300 ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
            }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>
    </button>
  );
};

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const NavLink = ({ to, children }) => (
    <Link
      to={to}
      onClick={() => setMobileMenuOpen(false)}
      className={`relative text-sm font-medium transition-colors duration-200 ${isActive(to)
        ? "text-accent"
        : isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
        } after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-accent after:transition-all after:duration-200 hover:after:w-full ${isActive(to) ? "after:w-full" : ""
        }`}
    >
      {children}
    </Link>
  );

  return (
    <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b shadow-lg ${isDark
        ? "bg-[#070819]/80 border-white/5 shadow-black/10"
        : "bg-white/90 border-slate-200 shadow-slate-200/50"
      }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 rounded-xl blur-lg group-hover:bg-accent/30 transition-all duration-300"></div>
            <img src={logo} alt="logo" className="relative h-9 w-9 rounded-xl shadow-lg" />
          </div>
          <div className="flex flex-col">
            <span className={`font-bold text-lg tracking-tight group-hover:text-accent transition-colors duration-200 ${isDark ? "text-white" : "text-slate-900"
              }`}>
              Crypto Pulse
            </span>
            <span className={`text-[10px] tracking-wide uppercase ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              ML Forecasting
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/news">Top News</NavLink>
          <NavLink to="/about">About</NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/history">History</NavLink>
            </>
          )}
        </div>

        {/* Desktop Auth Buttons + Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${isDark
                    ? "bg-white/5 text-slate-200 hover:bg-white/10"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-accent to-emerald-600 flex items-center justify-center text-xs font-bold text-slate-900">
                  {user?.username?.charAt(0)?.toUpperCase() || "U"}
                </div>
                {user?.username || "Profile"}
              </Link>
              <button
                onClick={handleLogout}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${isDark
                    ? "border-white/10 text-slate-200 hover:border-rose-500/50 hover:text-rose-400"
                    : "border-slate-200 text-slate-600 hover:border-rose-400 hover:text-rose-500"
                  }`}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-gradient-to-r from-accent to-emerald-600 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-200"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`w-6 h-0.5 transition-all duration-300 ${isDark ? "bg-slate-300" : "bg-slate-600"} ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-6 h-0.5 transition-all duration-300 ${isDark ? "bg-slate-300" : "bg-slate-600"} ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-6 h-0.5 transition-all duration-300 ${isDark ? "bg-slate-300" : "bg-slate-600"} ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-96 border-t border-white/5' : 'max-h-0'}`}>
        <div className={`px-4 py-4 space-y-3 backdrop-blur-xl ${isDark ? "bg-[#070819]/95" : "bg-white/95"}`}>
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive('/')
                ? 'bg-accent/10 text-accent'
                : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive('/dashboard')
                ? 'bg-accent/10 text-accent'
                : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Dashboard
          </Link>
          <Link
            to="/news"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive('/news')
                ? 'bg-accent/10 text-accent'
                : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Top News
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive('/about')
                ? 'bg-accent/10 text-accent'
                : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            About
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/history"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive('/history')
                    ? 'bg-accent/10 text-accent'
                    : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                History
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive('/profile')
                    ? 'bg-accent/10 text-accent'
                    : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                Profile
              </Link>
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className={`pt-2 border-t space-y-2 ${isDark ? "border-white/5" : "border-slate-200"}`}>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium text-center ${isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-emerald-600 text-slate-900 text-center"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
