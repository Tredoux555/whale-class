'use client';

import Link from 'next/link';

export default function CredentialsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/montree/super-admin/social-manager"
          className="text-slate-400 hover:text-white transition-colors text-sm inline-flex items-center gap-2 mb-6"
        >
          ← Back to Social Manager
        </Link>

        <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
          <span>🔐</span> Account Credentials
        </h1>
        <p className="text-slate-400 mb-8">
          Encrypted password storage for all social media platforms
        </p>

        {/* Placeholder */}
        <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            Credentials Vault Coming Soon
          </h2>
          <p className="text-slate-400 mb-6">
            Securely store login credentials for Instagram, TikTok, Facebook, LinkedIn, and YouTube.
          </p>
          <div className="text-left max-w-md mx-auto bg-slate-900 rounded-xl p-6 border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Planned Features:</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>✓ AES-256-GCM encryption</li>
              <li>✓ Platform-specific credentials</li>
              <li>✓ Copy to clipboard</li>
              <li>✓ Password unlock required</li>
              <li>✓ Notes field for 2FA backup codes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
