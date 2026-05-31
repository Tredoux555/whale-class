'use client';

import { SharedFile } from '../types';
import { formatFileSize, formatTime, getFileIcon } from '../utils';

interface FilesTabProps {
  sharedFiles: SharedFile[];
  selectedFile: File | null;
  fileDescription: string;
  onFileDescriptionChange: (description: string) => void;
  uploadingFile: boolean;
  fileError: string;
  fileSuccess: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSelectedFile: () => void;
  onFileUpload: () => void;
  onFileDelete: (fileId: number, filename: string) => void;
}

export function FilesTab({
  sharedFiles,
  selectedFile,
  fileDescription,
  onFileDescriptionChange,
  uploadingFile,
  fileError,
  fileSuccess,
  onFileSelect,
  onClearSelectedFile,
  onFileUpload,
  onFileDelete
}: FilesTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white/90 mb-4">📁 Share Documents</h2>
        <p className="text-white/60 text-sm mb-4">Upload Word, Excel, PDF, PowerPoint, or other files to share with students.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Select File</label>
            <input
              type="file"
              onChange={onFileSelect}
              disabled={uploadingFile}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp"
              className="block w-full text-sm text-white/60 bg-black/30 border border-[rgba(52,211,153,0.25)] rounded-lg p-3 hover:bg-black/40 disabled:opacity-50 cursor-pointer"
            />
            <p className="mt-1 text-xs text-white/50">Supported: PDF, Word, Excel, PowerPoint, Images, Text, Archives (max 100MB)</p>
          </div>

          {selectedFile && (
            <div className="p-4 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(selectedFile.type, selectedFile.name)}</span>
                  <div>
                    <p className="font-medium text-white/90">{selectedFile.name}</p>
                    <p className="text-xs text-white/50">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  onClick={onClearSelectedFile}
                  className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
                >
                  ×
                </button>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-white/70 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={fileDescription}
                  onChange={(e) => onFileDescriptionChange(e.target.value)}
                  placeholder="e.g., Week 3 homework sheet"
                  className="w-full px-3 py-2 bg-black/30 border border-[rgba(52,211,153,0.25)] rounded-lg text-sm text-white/90 placeholder-white/40 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={onFileUpload}
                disabled={uploadingFile}
                className="w-full px-4 py-2 bg-emerald-500 text-[#0a1a0f] rounded-lg hover:bg-emerald-600 disabled:bg-white/15 disabled:text-white/40 transition-colors font-medium"
              >
                {uploadingFile ? '⟳ Uploading...' : '📤 Upload File'}
              </button>
            </div>
          )}

          {fileSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm">
              ✓ {fileSuccess}
            </div>
          )}
          {fileError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm">
              ✗ {fileError}
            </div>
          )}
        </div>
      </div>

      {sharedFiles.length === 0 ? (
        <div className="bg-black/20 border border-white/10 rounded-lg p-8 text-center text-white/50">
          <div className="text-4xl mb-2">📂</div>
          <p>No files shared yet. Upload documents to get started.</p>
        </div>
      ) : (
        <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white/90 mb-4">Shared Files ({sharedFiles.length})</h3>
          <div className="space-y-2">
            {sharedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">{getFileIcon(file.mime_type, file.original_filename)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">{file.original_filename}</p>
                    <p className="text-xs text-white/50">
                      {formatFileSize(file.file_size)} • {formatTime(file.created_at)}
                      {file.description && <span className="ml-2 text-emerald-300">— {file.description}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-2">
                  <a
                    href={file.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs bg-[rgba(52,211,153,0.12)] text-emerald-300 border border-[rgba(52,211,153,0.25)] rounded hover:bg-[rgba(52,211,153,0.20)] transition-colors"
                  >
                    ⬇ Download
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(file.public_url).then(() => alert('Link copied!'))}
                    className="px-3 py-1 text-xs bg-white/10 text-white/70 border border-white/10 rounded hover:bg-white/15 transition-colors"
                  >
                    🔗 Copy Link
                  </button>
                  <button
                    onClick={() => onFileDelete(file.id, file.original_filename)}
                    className="px-3 py-1 text-xs bg-red-500/15 text-red-300 border border-red-500/30 rounded hover:bg-red-500/25 transition-colors"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
