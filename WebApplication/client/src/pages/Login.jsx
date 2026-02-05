import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function Login() {
  const { login, googleLogin, googleClientId, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Email validation
  const emailTouched = email.length > 0;
  const isEmailValid = useMemo(() => isValidEmail(email), [email]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!googleClientId || typeof window === 'undefined') return;

    const initGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-button"),
          {
            theme: "filled_black",
            size: "large",
            width: "100%",
            text: "continue_with",
            shape: "pill",
          }
        );
      }
    };

    if (!window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogleSignIn;
      document.body.appendChild(script);
    } else {
      initGoogleSignIn();
    }
  }, [googleClientId]);

  const handleGoogleResponse = async (response) => {
    setError(null);
    try {
      await googleLogin(response.credential);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Google sign-in failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed");
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-emerald-500/25 rounded-full blur-[120px] -top-48 left-1/4" />
        <div className="absolute w-[400px] h-[400px] bg-teal-500/20 rounded-full blur-[100px] bottom-0 right-1/4" />
        <div className="absolute w-[300px] h-[300px] bg-cyan-500/15 rounded-full blur-[80px] top-1/2 right-0" />
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-md animate-fadeIn">
        {/* Transparent glass card */}
        <div
          className="relative rounded-2xl p-8 backdrop-blur-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}
        >
          {/* Subtle green accent line at top */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 bg-emerald-500/10 border border-emerald-500/20">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to access your forecasting dashboards
            </p>
          </div>

          {/* Google Sign-In Button */}
          {googleClientId && (
            <>
              <div id="google-signin-button" className="w-full flex justify-center mb-6" />

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#0a0f1a] text-slate-500">or continue with email</span>
                </div>
              </div>
            </>
          )}

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-11 pr-10 py-3 bg-white/[0.03] border rounded-xl text-white placeholder-slate-500 outline-none focus:bg-white/[0.05] transition-all duration-200 ${emailTouched && !isEmailValid
                      ? 'border-rose-500/60 focus:border-rose-500/60'
                      : 'border-white/10 focus:border-emerald-500/40'
                    }`}
                  placeholder="you@example.com"
                  required
                />
                {/* Valid/Invalid indicator */}
                {emailTouched && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    {isEmailValid ? (
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
              {/* Email validation message */}
              {emailTouched && !isEmailValid && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Please enter a valid email address
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-emerald-500/40 focus:bg-white/[0.05] transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-rose-300">{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !isEmailValid}
              className="w-full py-3 rounded-xl font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
