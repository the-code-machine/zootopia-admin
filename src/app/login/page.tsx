"use client";
import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User, LogIn } from "lucide-react";
import { BASE_URL } from "@/utils/config";

// --- Utility Functions (Previously in authUtils) ---
const setCookie = (name: string, value: string, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};
// --- End of Utility Functions ---

// In a real app, this would come from an environment variable
const API_BASE_URL = BASE_URL;

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check for an existing auth token on component mount
  useEffect(() => {
    const token = getCookie("authToken");
    if (token) {
      // If a token already exists, the user is likely logged in.
      // Redirect them to the main admin dashboard.
      window.location.href = "/";
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin-cred/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed. Please check your credentials."
        );
      }

      // On successful login, save the token and redirect
      setCookie("authToken", data.token, 1); // Save token for 1 day
      window.location.href = "/"; // Redirect to admin dashboard
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA] p-8 w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#222222] mb-2">
            Admin Sign In
          </h1>
          <p className="text-[#C7C7CC]">Please sign in to your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#222222] mb-2"
            >
              Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#C7C7CC] w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3cd3e1] transition-all"
                placeholder="admin@example.com"
                required
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#222222] mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#C7C7CC] w-5 h-5" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3cd3e1] transition-all"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#C7C7CC] hover:text-[#222222]"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3cd3e1] text-white py-3 rounded-xl font-semibold hover:bg-[#2bc5d3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3cd3e1] disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <LogIn className="w-5 h-5 mr-2" />
            )}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/change-password"
            className="text-sm text-[#3cd3e1] hover:underline font-medium"
          >
            Forgot or want to change your password?
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
