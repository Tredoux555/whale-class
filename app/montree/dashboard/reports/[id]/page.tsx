// app/montree/dashboard/reports/[id]/page.tsx
// Single report view - edit, preview, approve, send, share
// Phase 3 - Session 54
// Phase 5 - AI Enhancement Added - Session 56
// Phase 6 - Share Link Added - Session 57

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ReportEditor from '@/components/montree/reports/ReportEditor';
import ReportPreview from '@/components/montree/reports/ReportPreview';
import type { MontreeWeeklyReport, ReportContent } from '@/lib/montree/reports/types';

type ViewMode = 'edit' | 'preview';

interface Child {
  id: string;
  name: string;
  gender: string;
}

interface ShareToken {
  id: string;
  token: string;
  share_url: string;
  expires_at: string;
  access_count: number;
  is_active: boolean;
  created_at: string;
}

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  // State
  const [report, setReport] = useState<MontreeWeeklyReport | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [existingTokens, setExistingTokens] = useState<ShareToken[]>([]);
  const [copied, setCopied] = useState(false);

  // ============================================
  // FETCH REPORT
  // ============================================

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/montree/reports/${reportId}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load report');
        return;
      }

      setReport(data.report);
      setChild(data.child);

      // Fetch thumbnail URLs for all highlights
      const paths = data.report.content.highlights
        .map((h: { storage_path?: string }) => h.storage_path)
        .filter(Boolean);

      if (paths.length > 0) {
        const urlsResponse = await fetch('/api/montree/media/urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths }),
        });
        const urlsData = await urlsResponse.json();
        if (urlsData.urls) {
          setThumbnailUrls(urlsData.urls);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSave = async (content: Partial<ReportContent>) => {
    if (!report) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/montree/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (data.success) {
        setReport(data.report);
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!report) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/montree/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      const data = await response.json();

      if (data.success) {
        setReport(data.report);
      } else {
        alert(data.error || 'Failed to approve');
      }
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve report');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    // For now, just mark as sent
    // In the future, this would open a modal to select recipients
    if (!confirm('Mark this report as sent to parents?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/montree/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });

      const data = await response.json();

      if (data.success) {
        setReport(data.report);
        alert('Report marked as sent!');
      } else {
        alert(data.error || 'Failed to send');
      }
    } catch (err) {
      console.error('Send error:', err);
      alert('Failed to send report');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!report || report.status !== 'draft') return;
    if (!confirm('Delete this draft report? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/montree/reports/${reportId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/montree/dashboard/reports');
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete report');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/montree/reports/${reportId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header
      const disposition = response.headers.get('Content-Disposition');
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || 'report.pdf';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  // ============================================
  // AI ENHANCEMENT HANDLER
  // ============================================

  const handleEnhance = async () => {
    if (!report) return;

    // Only drafts can be enhanced
    if (report.status !== 'draft') {
      alert('Only draft reports can be enhanced with AI.');
      return;
    }

    // Check if already enhanced
    if (report.content.generated_with_ai) {
      if (!confirm('This report was already enhanced with AI. Enhance again? This will overwrite the previous AI content.')) {
        return;
      }
    }

    setEnhancing(true);
    try {
      const response = await fetch(`/api/montree/reports/${reportId}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setReport(data.report);
        // Show success message with timing
        const seconds = data.stats?.ai_generation_time_ms 
          ? (data.stats.ai_generation_time_ms / 1000).toFixed(1) 
          : '?';
        alert(`✨ Report enhanced! (${seconds}s)\n\nThe summary, observations, and home extensions have been professionally written. You can still edit them manually.`);
      } else {
        alert(`Enhancement failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Enhance error:', err);
      alert('Failed to enhance report. Please check your connection and try again.');
    } finally {
      setEnhancing(false);
    }
  };

  // ============================================
  // SHARE HANDLERS
  // ============================================

  const handleOpenShare = async () => {
    setShowShareModal(true);
    setShareLoading(true);
    setCopied(false);

    try {
      // Fetch existing tokens
      const response = await fetch(`/api/montree/reports/${reportId}/share`);
      const data = await response.json();

      if (data.success && data.tokens) {
        setExistingTokens(data.tokens);
        // Use the most recent active token if exists
        const activeToken = data.tokens.find((t: ShareToken) => t.is_active);
        if (activeToken) {
          setShareUrl(activeToken.share_url);
        }
      }
    } catch (err) {
      console.error('Fetch tokens error:', err);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    setShareLoading(true);
    try {
      const response = await fetch(`/api/montree/reports/${reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_days: 30 }),
      });

      const data = await response.json();

      if (data.success) {
        setShareUrl(data.share_url);
        // Refresh tokens list
        const tokensRes = await fetch(`/api/montree/reports/${reportId}/share`);
        const tokensData = await tokensRes.json();
        if (tokensData.success) {
          setExistingTokens(tokensData.tokens);
        }
      } else {
        alert(data.error || 'Failed to create share link');
      }
    } catch (err) {
      console.error('Create share link error:', err);
      alert('Failed to create share link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Revoke this share link? Parents will no longer be able to access the report with this link.')) {
      return;
    }

    try {
      const response = await fetch(`/api/montree/reports/${reportId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenId }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh tokens list
        const tokensRes = await fetch(`/api/montree/reports/${reportId}/share`);
        const tokensData = await tokensRes.json();
        if (tokensData.success) {
          setExistingTokens(tokensData.tokens);
          // Clear share URL if it was the revoked one
          const stillActive = tokensData.tokens.find((t: ShareToken) => t.is_active);
          setShareUrl(stillActive?.share_url || null);
        }
      } else {
        alert(data.error || 'Failed to revoke link');
      }
    } catch (err) {
      console.error('Revoke error:', err);
      alert('Failed to revoke link');
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report || !child) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-600 mb-4">{error || 'Report not found'}</p>
          <Link
            href="/montree/dashboard/reports"
            className="text-blue-500 hover:underline"
          >
            ← Back to reports
          </Link>
        </div>
      </div>
    );
  }

  // Check if report is already AI-enhanced
  const isAIEnhanced = report.content.generated_with_ai;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/montree/dashboard/reports"
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              {child.name}'s Report
            </h1>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              {report.report_type === 'parent' ? 'Parent Report' : 'Teacher Report'}
              {isAIEnhanced && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                  ✨ AI
                </span>
              )}
            </p>
          </div>
        </div>

        {/* View mode toggle + Actions */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'edit'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👁️ Preview
            </button>
          </div>

          {/* AI Enhance Button (drafts only) */}
          {report.status === 'draft' && (
            <button
              onClick={handleEnhance}
              disabled={enhancing}
              className={`px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                enhancing
                  ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                  : isAIEnhanced
                    ? 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-sm'
              }`}
              title={isAIEnhanced ? 'Re-enhance with AI' : 'Enhance with AI'}
            >
              {enhancing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full" />
                  <span className="hidden sm:inline">Enhancing...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span className="hidden sm:inline">{isAIEnhanced ? 'Re-enhance' : 'Enhance'}</span>
                </>
              )}
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={handleOpenShare}
            className="w-10 h-10 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-lg"
            title="Share with parents"
          >
            🔗
          </button>

          {/* Download PDF button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-10 h-10 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-50"
            title="Download PDF"
          >
            {downloading ? (
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            ) : (
              '📥'
            )}
          </button>

          {/* Delete button (drafts only) */}
          {report.status === 'draft' && (
            <button
              onClick={handleDelete}
              className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg"
              title="Delete draft"
            >
              🗑️
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-24">
        {viewMode === 'edit' ? (
          <ReportEditor
            report={report}
            childName={child.name}
            thumbnailUrls={thumbnailUrls}
            onSave={handleSave}
            onApprove={handleApprove}
            onSend={handleSend}
            saving={saving}
          />
        ) : (
          <ReportPreview
            report={report}
            childName={child.name}
            thumbnailUrls={thumbnailUrls}
          />
        )}
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          shareUrl={shareUrl}
          existingTokens={existingTokens}
          loading={shareLoading}
          copied={copied}
          onClose={() => setShowShareModal(false)}
          onCreateLink={handleCreateShareLink}
          onCopyLink={handleCopyLink}
          onRevokeToken={handleRevokeToken}
        />
      )}
    </div>
  );
}

// ============================================
// SHARE MODAL COMPONENT
// ============================================

function ShareModal({
  shareUrl,
  existingTokens,
  loading,
  copied,
  onClose,
  onCreateLink,
  onCopyLink,
  onRevokeToken,
}: {
  shareUrl: string | null;
  existingTokens: ShareToken[];
  loading: boolean;
  copied: boolean;
  onClose: () => void;
  onCreateLink: () => void;
  onCopyLink: () => void;
  onRevokeToken: (tokenId: string) => void;
}) {
  const activeTokens = existingTokens.filter(t => t.is_active);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🔗 Share Report
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1">
            Create a magic link for parents to view this report
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent" />
            </div>
          ) : shareUrl ? (
            <>
              {/* Share URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate"
                  />
                  <button
                    onClick={onCopyLink}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Parents can view the report without logging in. Link expires in 30 days.
                </p>
              </div>

              {/* Create New Link Button */}
              <button
                onClick={onCreateLink}
                className="w-full py-2 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
              >
                + Create new link
              </button>
            </>
          ) : (
            <>
              {/* No Link Yet */}
              <div className="text-center py-4">
                <div className="text-4xl mb-3">📤</div>
                <p className="text-gray-600 mb-4">
                  No share link yet. Create one to share with parents.
                </p>
                <button
                  onClick={onCreateLink}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium shadow-sm hover:from-green-600 hover:to-emerald-600 transition-all"
                >
                  Create Share Link
                </button>
              </div>
            </>
          )}

          {/* Existing Links */}
          {activeTokens.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Active Links ({activeTokens.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeTokens.map(token => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <div>
                      <div className="text-gray-600 truncate max-w-[180px]">
                        ...{token.token.slice(-12)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {token.access_count} views • Expires {formatDate(token.expires_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => onRevokeToken(token.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// UTILITY
// ============================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
