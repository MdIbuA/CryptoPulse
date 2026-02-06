import { useRef, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";

// Get API base URL for static file URLs (uploads)
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// Helper to get full profile photo URL
const getProfilePhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  // If it's already a full URL (e.g., from Google OAuth), return as-is
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
    return photoPath;
  }
  // Otherwise, prepend API base URL
  return `${API_BASE}${photoPath}`;
};

export default function Profile() {
  const { user, setUser } = useAuth();
  const { isDark } = useTheme();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const [imageError, setImageError] = useState(false);

  // Change password states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  if (!user) return null;

  // Reset image error when profile photo URL changes
  useEffect(() => {
    setImageError(false);
  }, [user?.profile_photo]);

  // Reset image error when user.profile_photo changes
  const handleImageError = () => {
    setImageError(true);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post("/profile/photo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser({ ...user, profile_photo: data.profile_photo });
      setImageError(false); // Reset image error on successful upload
      setMessage("Profile photo updated");
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.detail || "Upload failed");
      setMessage(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    // Ensure UTC timestamps are properly parsed by adding 'Z' if not present
    let dateStr = dateString;
    if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
      dateStr = dateStr + 'Z';
    }
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "";
    // Ensure UTC timestamps are properly parsed
    let dateStr = dateString;
    if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
      dateStr = dateStr + 'Z';
    }
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return "";
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err) {
      setPasswordError(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      {/* Profile Header Card */}
      <div className={`rounded-3xl p-8 ${isDark
        ? "glass card-border"
        : "bg-white border border-slate-200 shadow-lg"
        }`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Profile Photo */}
          <div className="relative group">
            <div className={`h-28 w-28 rounded-full overflow-hidden shadow-2xl ${isDark ? "bg-white/10" : "bg-slate-100"
              }`}>
              {user.profile_photo && !imageError ? (
                <img
                  src={getProfilePhotoUrl(user.profile_photo)}
                  alt="profile"
                  className="h-full w-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-4xl font-bold ${isDark ? "text-slate-300 bg-gradient-to-br from-emerald-500/20 to-teal-500/20" : "text-slate-400 bg-gradient-to-br from-emerald-100 to-teal-100"
                  }`}>
                  {user.username?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 rounded-full bg-accent text-slate-900 hover:bg-emerald-400 transition-colors shadow-lg"
              title="Upload photo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              {user.username}
            </h1>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {user.email}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${isDark
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                }`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${isDark
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Active
              </span>
            </div>
          </div>

          <input type="file" className="hidden" ref={fileRef} onChange={handleUpload} accept="image/*" />
        </div>

        {/* Messages */}
        {message && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-200 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Account Details Card */}
      <div className={`rounded-3xl p-6 ${isDark
        ? "glass card-border"
        : "bg-white border border-slate-200 shadow-lg"
        }`}>
        <h2 className={`text-sm uppercase tracking-[0.2em] font-medium mb-4 ${isDark ? "text-accent" : "text-emerald-600"
          }`}>
          Account Details
        </h2>

        <div className="space-y-4">
          {/* Created At */}
          <div className={`flex items-center justify-between p-4 rounded-2xl ${isDark ? "bg-white/5" : "bg-slate-50"
            }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                <svg className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                  Account Created
                </div>
                <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  When you joined Crypto Pulse
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                {formatDate(user.created_at)}
              </div>
            </div>
          </div>

          {/* Last Login */}
          <div className={`flex items-center justify-between p-4 rounded-2xl ${isDark ? "bg-white/5" : "bg-slate-50"
            }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                <svg className={`w-5 h-5 ${isDark ? "text-emerald-400" : "text-emerald-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                  Last Login
                </div>
                <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Your most recent session
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                {formatDate(user.last_login_at)}
              </div>
              {user.last_login_at && (
                <div className={`text-xs ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                  {getRelativeTime(user.last_login_at)}
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div className={`flex items-center justify-between p-4 rounded-2xl ${isDark ? "bg-white/5" : "bg-slate-50"
            }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? "bg-purple-500/10" : "bg-purple-50"}`}>
                <svg className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <div className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                  Password
                </div>
                <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Securely encrypted
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`text-sm font-medium font-mono tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                ••••••••
              </div>
              {/* Show Change Password button for all users except Google-only accounts */}
              <button
                onClick={() => setShowPasswordModal(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark
                  ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30"
                  : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
                  }`}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className={`rounded-3xl p-6 ${isDark
        ? "glass card-border"
        : "bg-white border border-slate-200 shadow-lg"
        }`}>
        <h2 className={`text-sm uppercase tracking-[0.2em] font-medium mb-4 ${isDark ? "text-accent" : "text-emerald-600"
          }`}>
          Quick Actions
        </h2>

        <div className="grid sm:grid-cols-2 gap-3">
          <a
            href="/history"
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${isDark
              ? "bg-white/5 hover:bg-white/10 text-white"
              : "bg-slate-50 hover:bg-slate-100 text-slate-900"
              }`}
          >
            <div className={`p-2 rounded-xl ${isDark ? "bg-amber-500/10" : "bg-amber-50"}`}>
              <svg className={`w-5 h-5 ${isDark ? "text-amber-400" : "text-amber-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium">View History</div>
              <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                See your forecast history
              </div>
            </div>
            <svg className={`w-4 h-4 ml-auto ${isDark ? "text-slate-500" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <a
            href="/dashboard"
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${isDark
              ? "bg-white/5 hover:bg-white/10 text-white"
              : "bg-slate-50 hover:bg-slate-100 text-slate-900"
              }`}
          >
            <div className={`p-2 rounded-xl ${isDark ? "bg-teal-500/10" : "bg-teal-50"}`}>
              <svg className={`w-5 h-5 ${isDark ? "text-teal-400" : "text-teal-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium">Dashboard</div>
              <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                View market overview
              </div>
            </div>
            <svg className={`w-4 h-4 ml-auto ${isDark ? "text-slate-500" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePasswordModal}
          />

          {/* Modal */}
          <div className={`relative w-full max-w-md rounded-3xl p-6 ${isDark
            ? "bg-slate-900 border border-white/10"
            : "bg-white border border-slate-200 shadow-2xl"
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
                  <svg className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Change Password
                </h3>
              </div>
              <button
                onClick={closePasswordModal}
                className={`p-1.5 rounded-lg transition-colors ${isDark
                  ? "hover:bg-white/10 text-slate-400"
                  : "hover:bg-slate-100 text-slate-500"
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${isDark
                    ? "bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-purple-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  placeholder="Enter current password"
                />
              </div>

              {/* New Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${isDark
                    ? "bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-purple-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  placeholder="Enter new password (min. 6 characters)"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${isDark
                    ? "bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-purple-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  placeholder="Confirm new password"
                />
              </div>

              {/* Error Message */}
              {passwordError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {passwordError}
                </div>
              )}

              {/* Success Message */}
              {passwordSuccess && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {passwordSuccess}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${isDark
                    ? "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${passwordLoading
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                    } bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400`}
                >
                  {passwordLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Changing...
                    </span>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
