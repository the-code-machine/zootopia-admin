"use client";
import React, { useState } from "react";
import { Eye, EyeOff, Lock, KeyRound, CheckCircle } from "lucide-react";
import { BASE_URL } from "@/utils/config";

// In a real app, this would come from an environment variable
const API_BASE_URL = BASE_URL;
const setCookie = (name: string, value: string, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
};
export const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
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
const ChangePasswordPage = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    const token = getCookie("authToken");
    if (!token) {
      setError("Authentication token not found. Please log in first.");
      setLoading(false);
      // Optional: redirect to login page after a delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin-cred/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ oldPassword, newPassword }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to change password.");
      }

      setSuccess(
        "Password changed successfully! You will be redirected to log in."
      );
      deleteCookie("authToken"); // Log the user out so they must use the new password
      setOldPassword("");
      setNewPassword("");

      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
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
            Change Admin Password
          </h1>
          <p className="text-[#C7C7CC]">Update your credentials below</p>
        </div>

        {/* Message Area */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-6 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-6 text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div>
            <label
              htmlFor="oldPassword"
              className="block text-sm font-medium text-[#222222] mb-2"
            >
              Old Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#C7C7CC] w-5 h-5" />
              <input
                id="oldPassword"
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3cd3e1] transition-all"
                placeholder="Enter your old password"
                required
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#C7C7CC] hover:text-[#222222]"
              >
                {showOldPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-[#222222] mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#C7C7CC] w-5 h-5" />
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3cd3e1] transition-all"
                placeholder="Enter your new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#C7C7CC] hover:text-[#222222]"
              >
                {showNewPassword ? (
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
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/login"
            className="text-sm text-[#3cd3e1] hover:underline font-medium"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
