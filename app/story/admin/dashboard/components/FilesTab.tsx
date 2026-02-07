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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">📁 Share Documents</h2>
        <p className="text-gray-600 text-sm mb-4">Upload Word, Excel, PDF, PowerPoint, or other files to share with students.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
            <input
              type="file"
              onChange={onFileSelect}
              disabled={uploadingFile}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp"
              className="block w-full text-sm text-gray-600 border border-gray-300 rounded-lg p-3 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500">Supported: PDF, Word, Excel, PowerPoint, Images, Text, Archives (max 100MB)</p>
          </div>

          {selectedFile && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(selectedFile.type, selectedFile.name)}</span>
                  <div>
                    <p className="font-medium text-gray-800">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={fileDescription}
                  onChange={(e) => onFileDescriptionChange(e.target.value)}
                  placeholder="e.g., Week 3 homework sheet"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={onFileUpload}
                disabled={uploadingFile}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {uploadingFile ? '⟳ Uploading...' : '📤 Upload File'}
              </button>
            </div>
          )}

          {fileSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              ✓ {fileSuccess}
            </div>
          )}
          {fileError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              ✗ {fileError}
            </div>
          )}
        </div>
      </div>

      {sharedFiles.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">📂</div>
          <p>No files shared yet. Upload documents to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Shared Files ({sharedFiles.length})</h3>
          <div className="space-y-2">
            {sharedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">{getFileIcon(file.mime_type, file.original_filename)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.original_filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)} • {formatTime(file.created_at)}
                      {file.description && <span className="ml-2 text-blue-600">— {file.description}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-2">
                  <a
                    href={file.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    ⬇ Download
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(file.public_url).then(() => alert('Link copied!'))}
                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    🔗 Copy Link
                  </button>
                  <button
                    onClick={() => onFileDelete(file.id, file.original_filename)}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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
