'use client';

import { VaultFile } from '../types';
import { formatTime, getVaultFileIcon, isImageFile } from '../utils';
import { VaultImageViewer } from '@/components/story/admin/VaultImageViewer';

interface VaultTabProps {
  vaultUnlocked: boolean;
  vaultPassword: string;
  onVaultPasswordChange: (password: string) => void;
  onVaultUnlock: () => void;
  onVaultLock: () => void;
  vaultError: string;
  vaultFiles: VaultFile[];
  uploadingVault: boolean;
  onVaultUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVaultDownload: (fileId: number, filename: string) => void;
  onVaultDelete: (fileId: number) => void;
  viewingImage: { url: string; filename: string } | null;
  loadingView: boolean;
  onVaultView: (fileId: number, filename: string) => void;
  onCloseViewer: () => void;
}

export function VaultTab({
  vaultUnlocked,
  vaultPassword,
  onVaultPasswordChange,
  onVaultUnlock,
  onVaultLock,
  vaultError,
  vaultFiles,
  uploadingVault,
  onVaultUpload,
  onVaultDownload,
  onVaultDelete,
  viewingImage,
  loadingView,
  onVaultView,
  onCloseViewer
}: VaultTabProps) {
  return (
    <>
      {viewingImage && (
        <VaultImageViewer
          imageUrl={viewingImage.url}
          filename={viewingImage.filename}
          onClose={onCloseViewer}
        />
      )}
    <div className="space-y-4">
      {!vaultUnlocked ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🔒 Media Vault</h2>
          <p className="text-gray-600 mb-4">This vault is password protected. Enter your password to access stored photos and videos.</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={vaultPassword}
              onChange={(e) => onVaultPasswordChange(e.target.value)}
              placeholder="Enter vault password..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && onVaultUnlock()}
            />
            <button
              onClick={onVaultUnlock}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Unlock
            </button>
          </div>
          {vaultError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              ✗ {vaultError}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">🔓 Vault Unlocked</h2>
              <button
                onClick={onVaultLock}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Lock
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo or Video</label>
              <input
                type="file"
                onChange={onVaultUpload}
                disabled={uploadingVault}
                accept="image/*,video/*"
                className="block w-full text-sm text-gray-600 border border-gray-300 rounded-lg p-3 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              />
              <p className="mt-1 text-xs text-gray-500">Supported: Images and videos (max 500MB)</p>
            </div>
            {uploadingVault && <p className="text-sm text-indigo-600">⟳ Uploading...</p>}
            {vaultError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                ✗ {vaultError}
              </div>
            )}
          </div>

          {vaultFiles.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📁</div>
              <p>Vault is empty. Upload photos or videos to get started.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Stored Files ({vaultFiles.length})</h3>
              <div className="space-y-2">
                {vaultFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg">{getVaultFileIcon(file.filename)}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{file.filename}</p>
                        <p className="text-xs text-gray-500">{formatTime(file.uploaded_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isImageFile(file.filename) && (
                        <button
                          onClick={() => onVaultView(file.id, file.filename)}
                          disabled={loadingView}
                          className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors disabled:opacity-50"
                        >
                          {loadingView ? '⟳ Loading...' : '👁 View'}
                        </button>
                      )}
                      <button
                        onClick={() => onVaultDownload(file.id, file.filename)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        ⬇ Download
                      </button>
                      <button
                        onClick={() => onVaultDelete(file.id)}
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
      )}
    </div>
    </>
  );
}
