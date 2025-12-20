'use client';

import React from 'react';

interface Props {
  pdfData: string | null;
  filename: string;
  loading: boolean;
  error: string | null;
  onDownload: () => void;
}

export default function MaterialPreview({
  pdfData,
  filename,
  loading,
  error,
  onDownload,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-500 mb-4" />
          <p className="text-gray-500">Generating your materials...</p>
          <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          <p className="font-medium">Generation Failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {pdfData && !loading && (
        <div className="space-y-4">
          {/* Success message */}
          <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-medium">PDF Ready!</p>
              <p className="text-sm text-green-600">{filename}</p>
            </div>
          </div>

          {/* PDF Preview */}
          <div className="border rounded-lg overflow-hidden bg-gray-100">
            <iframe
              src={pdfData}
              className="w-full h-96"
              title="PDF Preview"
            />
          </div>

          {/* Download Button */}
          <button
            onClick={onDownload}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>

          {/* Print Instructions */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">🖨️ Printing Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use cardstock (200-300gsm) for durability</li>
              <li>• Print at 100% scale (no fitting)</li>
              <li>• Cut along the dotted lines</li>
              <li>• Laminate for long-term use</li>
              <li>• Round corners with a corner punch (optional)</li>
            </ul>
          </div>
        </div>
      )}

      {!pdfData && !loading && !error && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">📄</div>
          <p>Select a material type and click Generate</p>
          <p className="text-sm mt-1">Your PDF will appear here</p>
        </div>
      )}
    </div>
  );
}

