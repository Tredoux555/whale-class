"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyLoading, setProxyLoading] = useState(false);
  const router = useRouter();

  // Check proxy mode on mount
  useEffect(() => {
    checkProxyMode();
  }, []);

  const checkProxyMode = async () => {
    try {
      const response = await fetch("/api/admin/proxy-mode");
      const data = await response.json();
      setProxyEnabled(data.proxyEnabled || false);
    } catch (error) {
      console.error("Error checking proxy mode:", error);
    }
  };

  const toggleProxyMode = async (enabled: boolean) => {
    setProxyLoading(true);
    try {
      // Try to toggle - will fail if not logged in, but that's OK
      // We'll set the cookie client-side as fallback
      const response = await fetch("/api/admin/proxy-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setProxyEnabled(enabled);
        // Also set cookie client-side as backup
        document.cookie = `video-proxy-enabled=${enabled}; path=/; max-age=${60 * 60 * 24 * 30}`;
      } else {
        // If not logged in yet, set cookie client-side anyway
        // This allows proxy to work immediately after login
        document.cookie = `video-proxy-enabled=${enabled}; path=/; max-age=${60 * 60 * 24 * 30}`;
        setProxyEnabled(enabled);
      }
    } catch (error) {
      console.error("Error toggling proxy mode:", error);
      // Set cookie client-side as fallback
      document.cookie = `video-proxy-enabled=${enabled}; path=/; max-age=${60 * 60 * 24 * 30}`;
      setProxyEnabled(enabled);
    } finally {
      setProxyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', { username, password: '***' });
    setError("");
    setLoading(true);

    try {
      console.log('Making fetch request to /api/auth/login');
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      console.log('Response received', { status: response.status, ok: response.ok });

      let data;
      try {
        data = await response.json();
        console.log('Response data', data);
      } catch (jsonError) {
        console.error('Failed to parse JSON response', jsonError);
        setError("Invalid response from server");
        setLoading(false);
        return;
      }

      if (response.ok) {
        console.log('Login successful, redirecting...');
        // After successful login, sync proxy mode with server
        if (proxyEnabled) {
          try {
            await fetch("/api/admin/proxy-mode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ enabled: true }),
            });
          } catch (proxyError) {
            console.error('Proxy mode sync failed', proxyError);
            // Don't fail login if proxy sync fails
          }
        }
        router.push("/admin");
        router.refresh();
      } else {
        console.error('Login failed', data);
        setError(data.error || "Login failed");
        setLoading(false);
      }
    } catch (error) {
      console.error('Login exception', error);
      setError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your connection.`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🐋</div>
          <h1 className="text-3xl font-bold text-[#2C5F7C] mb-2">Admin Login</h1>
          <p className="text-[#2C5F7C]/70">Whale Class Admin Portal</p>
        </div>

        {/* Proxy Mode Toggle */}
        <div className="mb-6 p-4 bg-[#E8F4F8] rounded-lg border-2 border-[#B8E0F0]">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-semibold text-[#2C5F7C] mb-1">
                Video Proxy Mode
              </label>
              <p className="text-xs text-[#2C5F7C]/70">
                Enable to bypass firewall restrictions (China)
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleProxyMode(!proxyEnabled)}
              disabled={proxyLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:ring-offset-2 ${
                proxyEnabled ? "bg-[#4A90E2]" : "bg-gray-300"
              } ${proxyLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  proxyEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {proxyEnabled && (
            <p className="mt-2 text-xs text-green-600 font-medium">
              ✓ Proxy enabled - Videos will use proxy when you login
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-[#2C5F7C] mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2] text-[#2C5F7C]"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-[#2C5F7C] mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#B8E0F0] rounded-lg focus:outline-none focus:border-[#4A90E2] text-[#2C5F7C]"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A90E2] text-white py-3 rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-[#4A90E2] hover:text-[#2C5F7C] text-sm"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

