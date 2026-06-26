import React, { useState } from "react";
import { api } from "../services/api";
import { User } from "../types";
import { motion } from "motion/react";
import { KeyRound, Mail, Sparkles, AlertCircle } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function LoginView({ onLoginSuccess, addToast }: LoginProps) {
  // Sign In States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all credentials");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await api.login(email, password);
      addToast(
        "Welcome Back!",
        `Successfully logged in as ${data.user.name} (${data.user.role})`,
        "success"
      );
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check credentials.");
      addToast("Login Failed", err.message || "Invalid credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
      <div className="absolute -bottom-10 right-4 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full space-y-6 bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-100 shadow-xl relative z-10"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            AI Child Observation Summary
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-sans">
            AI Child Observation & Development Management System
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-100">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Login Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-sans"
                  placeholder="name@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-sans"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm pt-2">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-slate-600">
                Remember my login
              </label>
            </div>
            <button
              type="button"
              onClick={() => addToast("Support Requested", "Please contact Super Admin to reset password.", "info")}
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-300 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </div>
        </form>

        {/* Demo Roles Credentials Preset */}
        <div className="pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
            Demo Portal Presets
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => fillCredentials("admin@firstcry.com", "admin123")}
              className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all font-semibold text-slate-800 text-center cursor-pointer shadow-sm hover:shadow"
            >
              Super Admin
            </button>
            <button
              onClick={() => fillCredentials("teacher@firstcry.com", "admin123")}
              className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all font-semibold text-slate-800 text-center cursor-pointer shadow-sm hover:shadow"
            >
              Teacher
            </button>
            <button
              onClick={() => fillCredentials("head@firstcry.com", "admin123")}
              className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all font-semibold text-slate-800 text-center cursor-pointer shadow-sm hover:shadow"
            >
              Centre Head
            </button>
            <button
              onClick={() => fillCredentials("parent@firstcry.com", "admin123")}
              className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all font-semibold text-slate-800 text-center cursor-pointer shadow-sm hover:shadow"
            >
              Parent
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
