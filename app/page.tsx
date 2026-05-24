"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_CREDENTIALS, setSession, isAuthenticated } from "./lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, skip login
  useEffect(() => {
    if (isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  function handleLogin() {
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    // Simulate a brief network delay for realism
    setTimeout(() => {
      if (
        email.trim().toLowerCase() === ADMIN_CREDENTIALS.email &&
        password === ADMIN_CREDENTIALS.password
      ) {
        setSession();
        router.push("/dashboard");
      } else {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
      }
    }, 600);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleLogin();
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-[family-name:var(--font-geist-sans)]">

      {/* ── LEFT PANEL — dark hero ── */}
      <div className="relative hidden lg:flex flex-1 flex-col items-center justify-center overflow-hidden bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop"
          alt="POS dashboard background"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-emerald-950/60 to-slate-900/90" />

        <div className="relative z-10 flex flex-col items-center text-center px-10 xl:px-16 max-w-2xl">
          <div className="mb-8 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time Analytics
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
            Track Profit, Loss &amp; Sales{" "}
            <span className="text-emerald-400">Instantly</span>
          </h2>
          <p className="mt-5 text-base text-slate-300 leading-relaxed">
            Your all-in-one POS intelligence platform. Monitor revenue, shrinkage, refunds, and margins — all from a single dashboard.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 w-full">
            {[
              { label: "Today's Revenue", value: "₱ 84,320", trend: "+12.4%", up: true },
              { label: "Net Profit",       value: "₱ 31,870", trend: "+8.1%",  up: true },
              { label: "Shrinkage / Loss", value: "₱ 1,204",  trend: "-3.2%",  up: false },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-4 text-left">
                <p className="text-xs text-slate-400 leading-snug">{stat.label}</p>
                <p className="mt-1 text-lg font-bold text-white">{stat.value}</p>
                <p className={`mt-0.5 text-xs font-medium ${stat.up ? "text-emerald-400" : "text-rose-400"}`}>
                  {stat.trend} vs yesterday
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {["Sales Forecasting","Loss Prevention","Inventory Alerts","Multi-branch","Live Reports"].map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <p className="text-xs text-slate-500">Privacy Policy &amp; Terms of Use</p>
        </div>
      </div>

      {/* ── MOBILE hero ── */}
      <div className="flex lg:hidden flex-col items-center justify-center bg-slate-900 px-8 py-12 text-center">
        <div className="mb-4 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Real-time Analytics
        </div>
        <h2 className="text-2xl font-bold text-white leading-tight">
          Track Profit, Loss &amp; Sales <span className="text-emerald-400">Instantly</span>
        </h2>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-sm">
          Your all-in-one POS intelligence platform.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-sm">
          {[
            { label: "Revenue", value: "₱84K", trend: "+12%", up: true },
            { label: "Profit",  value: "₱31K", trend: "+8%",  up: true },
            { label: "Loss",    value: "₱1.2K", trend: "-3%", up: false },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left">
              <p className="text-[10px] text-slate-400">{stat.label}</p>
              <p className="mt-0.5 text-base font-bold text-white">{stat.value}</p>
              <p className={`text-[10px] font-medium ${stat.up ? "text-emerald-400" : "text-rose-400"}`}>{stat.trend}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — login form ── */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-16 lg:max-w-[480px] xl:max-w-[520px] bg-white">
        <div className="mb-12">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            POS<span className="text-emerald-500">Track</span>
          </span>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-400">
            Point of Sale Intelligence
          </p>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 leading-tight">Hi, Welcome Back!</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage your store's performance</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-5" onKeyDown={handleKeyDown}>
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@postrack.io"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Keep signed in + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-500"
              />
              <span className="text-sm text-slate-600">Keep me signed in</span>
            </label>
            <a href="#" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition">
              Forgot password?
            </a>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="mt-1 w-full rounded-lg bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Signing in…
              </>
            ) : "Sign In"}
          </button>
        </div>

        {/* Hint for dev — remove this block in production */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-400 font-medium mb-1">Demo credentials</p>
            <p className="text-xs text-slate-500 font-[family-name:var(--font-geist-mono)]">
              {process.env.NEXT_PUBLIC_ADMIN_EMAIL} / {process.env.NEXT_PUBLIC_ADMIN_PASSWORD}
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} POSTrack. All rights reserved.
        </p>
      </div>

    </div>
  );
}