'use client';

import { useEffect } from 'react';
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
  // Album props
  albumIndex: number;
  thumbnails: Record<number, string>;
  loadingThumbnails: Record<number, boolean>;
  onNavigateAlbum: (direction: 'prev' | 'next') => void;
  onLoadThumbnail: (fileId: number) => void;
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
  onCloseViewer,
  albumIndex,
  thumbnails,
  loadingThumbnails,
  onNavigateAlbum,
  onLoadThumbnail,
}: VaultTabProps) {
  const imageFiles = vaultFiles.filter(f => isImageFile(f.filename));
  const nonImageFiles = vaultFiles.filter(f => !isImageFile(f.filename));

  // Trigger thumbnail loading for visible images
  useEffect(() => {
    if (!vaultUnlocked) return;
    imageFiles.forEach(f => {
      if (!thumbnails[f.id] && !loadingThumbnails[f.id]) {
        onLoadThumbnail(f.id);
      }
    });
  }, [vaultUnlocked, imageFiles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {viewingImage && (
        <VaultImageViewer
          imageUrl={viewingImage.url}
          filename={viewingImage.filename}
          onClose={onCloseViewer}
          onPrev={() => onNavigateAlbum('prev')}
          onNext={() => onNavigateAlbum('next')}
          albumIndex={albumIndex}
          albumTotal={imageFiles.length}
          loading={loadingView}
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

            <div className="mb-2">
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
            <>
              {/* Photo Album Grid */}
              {imageFiles.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">
                    Photos ({imageFiles.length})
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {imageFiles.map((file) => {
                      const thumbUrl = thumbnails[file.id];
                      const isLoading = loadingThumbnails[file.id];

                      return (
                        <div
                          key={file.id}
                          className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                          onClick={() => onVaultView(file.id, file.filename)}
                        >
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={file.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {isLoading ? (
                                <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                              ) : (
                                <span className="text-2xl">🖼️</span>
                              )}
                            </div>
                          )}

                          {/* Hover overlay with date + actions */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            <p className="text-white text-[10px] truncate mb-1">{file.filename}</p>
                            <p className="text-white/60 text-[9px]">{formatTime(file.uploaded_at)}</p>
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); onVaultDownload(file.id, file.filename); }}
                                className="px-1.5 py-0.5 text-[9px] bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
                              >
                                ⬇
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onVaultDelete(file.id); }}
                                className="px-1.5 py-0.5 text-[9px] bg-red-500/40 text-white rounded hover:bg-red-500/60 transition-colors"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Non-image files list */}
              {nonImageFiles.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">Other Files ({nonImageFiles.length})</h3>
                  <div className="space-y-2">
                    {nonImageFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-lg">{getVaultFileIcon(file.filename)}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{file.filename}</p>
                            <p className="text-xs text-gray-500">{formatTime(file.uploaded_at)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
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
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
}
