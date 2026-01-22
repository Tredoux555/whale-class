// /components/montree/ParentAccessModal.tsx
// Modal to generate and share parent access code/QR
'use client';

import { useState } from 'react';

interface ParentAccessModalProps {
  childId: string;
  childName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ParentAccessModal({ childId, childName, isOpen, onClose }: ParentAccessModalProps) {
  const [loading, setLoading] = useState(false);
  const [accessData, setAccessData] = useState<{
    code: string;
    qr_url: string;
    parent_url: string;
    expires_at: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/montree/parent/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setAccessData(data);
      } else {
        setError(data.error || 'Failed to generate code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!accessData) return;
    
    try {
      await navigator.clipboard.writeText(accessData.parent_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = accessData.parent_url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToWeChat = () => {
    copyLink();
    // Show instruction since WeChat doesn't have direct share API from web
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Share with Parent</h2>
              <p className="text-white/80 text-sm mt-1">{childName}&apos;s access link</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {!accessData ? (
            // Generate code view
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">👨‍👩‍👧</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Invite {childName}&apos;s Parents
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Generate a one-time access code for parents to view their child&apos;s progress.
              </p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                  {error}
                </div>
              )}
              
              <button
                onClick={generateCode}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50"
              >
                {loading ? '⏳ Generating...' : '🔗 Generate Access Code'}
              </button>
            </div>
          ) : (
            // Show code/QR view
            <div className="space-y-5">
              {/* QR Code */}
              <div className="text-center">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 inline-block mb-3">
                  <img 
                    src={accessData.qr_url} 
                    alt="QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-gray-500">Scan with WeChat or phone camera</p>
              </div>

              {/* Access Code */}
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Or enter code manually:</p>
                <p className="text-3xl font-mono font-bold tracking-wider text-gray-900">
                  {accessData.code}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyLink}
                  className={`py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    copied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {copied ? (
                    <>✓ Copied!</>
                  ) : (
                    <>📋 Copy Link</>
                  )}
                </button>
                
                <button
                  onClick={shareToWeChat}
                  className="py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                >
                  💚 WeChat
                </button>
              </div>

              {/* Expiry Info */}
              <p className="text-xs text-gray-400 text-center">
                Code expires {new Date(accessData.expires_at).toLocaleDateString()}
              </p>

              {/* Generate New */}
              <button
                onClick={() => setAccessData(null)}
                className="w-full py-2 text-emerald-600 text-sm hover:underline"
              >
                Generate new code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
