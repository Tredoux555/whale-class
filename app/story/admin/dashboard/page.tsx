'use client';

import { useEffect, useState } from 'react';
import { useAuthSession } from './hooks/useAuthSession';
import { useOnlineUsers } from './hooks/useOnlineUsers';
import { useLoginLogs } from './hooks/useLoginLogs';
import { useMessages } from './hooks/useMessages';
import { useVault } from './hooks/useVault';
import { useSharedFiles } from './hooks/useSharedFiles';
import { useAdminMessage } from './hooks/useAdminMessage';
import { useSystemControls } from './hooks/useSystemControls';
import { TabType } from './types';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MessageComposer } from './components/MessageComposer';
import { OnlineUsersTab } from './components/OnlineUsersTab';
import { ActivityLogTab } from './components/ActivityLogTab';
import { MessagesTab } from './components/MessagesTab';
import { VaultTab } from './components/VaultTab';
import { FilesTab } from './components/FilesTab';
import { SystemControlsTab } from './components/SystemControlsTab';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('online');
  const [isLoading, setIsLoading] = useState(true);

  const { getSession, verifySession, handleLogout } = useAuthSession();
  const { onlineUsers, onlineCount, totalUsers, loadOnlineUsers } = useOnlineUsers(getSession);
  const { loginLogs, loadLoginLogs } = useLoginLogs(getSession);
  const {
    messages,
    statistics,
    showExpired,
    setShowExpired,
    savedToVault,
    savingToVault,
    loadMessages,
    saveMessageToVault
  } = useMessages(getSession);
  const {
    vaultPassword,
    setVaultPassword,
    vaultUnlocked,
    setVaultUnlocked,
    vaultFiles,
    uploadingVault,
    vaultError,
    setVaultError,
    loadVaultFiles,
    handleVaultUnlock,
    handleVaultUpload,
    handleVaultDownload,
    handleVaultDelete
  } = useVault(getSession);
  const {
    sharedFiles,
    selectedFile,
    fileDescription,
    setFileDescription,
    uploadingFile,
    fileError,
    fileSuccess,
    loadSharedFiles,
    handleFileSelect,
    clearSelectedFile,
    handleFileUpload,
    handleFileDelete
  } = useSharedFiles(getSession);
  const {
    adminMessage,
    setAdminMessage,
    sendingMessage,
    messageSent,
    messageError,
    selectedImage,
    imagePreview,
    uploadingImage,
    selectedAudio,
    uploadingAudio,
    selectedVideo,
    uploadingVideo,
    handleImageSelect,
    clearImage,
    handleAudioSelect,
    clearAudio,
    handleVideoSelect,
    clearVideo,
    sendAdminMessage,
    clearAllMedia
  } = useAdminMessage(getSession, loadMessages);
  const {
    systemStats,
    controlsLoading,
    controlsMessage,
    loadSystemStats,
    executeSystemAction
  } = useSystemControls(getSession);

  useEffect(() => {
    const init = async () => {
      const valid = await verifySession();
      if (valid) {
        await Promise.all([
          loadOnlineUsers(),
          loadLoginLogs(),
          loadMessages(),
          loadVaultFiles(),
          loadSharedFiles(),
          loadSystemStats()
        ]);
      }
      setIsLoading(false);
    };
    init();
  }, [verifySession, loadOnlineUsers, loadLoginLogs, loadMessages, loadVaultFiles, loadSharedFiles, loadSystemStats]);

  useEffect(() => {
    if (activeTab === 'online') {
      const interval = setInterval(loadOnlineUsers, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadOnlineUsers]);

  useEffect(() => {
    if (activeTab === 'messages') {
      loadMessages();
      const interval = setInterval(() => loadMessages(), 10000);
      return () => clearInterval(interval);
    }
  }, [showExpired, activeTab, loadMessages]);

  useEffect(() => {
    if (activeTab === 'vault' && vaultUnlocked) {
      loadVaultFiles();
    }
  }, [activeTab, vaultUnlocked, loadVaultFiles]);

  useEffect(() => {
    if (activeTab === 'controls') {
      loadSystemStats();
    }
  }, [activeTab, loadSystemStats]);

  useEffect(() => {
    if (activeTab === 'files') {
      loadSharedFiles();
    }
  }, [activeTab, loadSharedFiles]);

  const handleExecuteSystemAction = async (action: string, confirmMessage: string) => {
    await executeSystemAction(
      action,
      confirmMessage,
      () =>
        Promise.all([loadMessages(), loadLoginLogs(), loadVaultFiles(), loadOnlineUsers()])
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏫</div>
          <div className="text-lg font-semibold text-gray-700">Loading classroom...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onlineCount={onlineCount}
            totalUsers={totalUsers}
            messagesLength={messages.length}
            filesLength={sharedFiles.length}
          />

          <div className="lg:col-span-3">
            {activeTab !== 'vault' && (
              <MessageComposer
                adminMessage={adminMessage}
                onMessageChange={setAdminMessage}
                imagePreview={imagePreview}
                onImageClear={clearImage}
                selectedAudio={selectedAudio}
                onAudioClear={clearAudio}
                selectedVideo={selectedVideo}
                onVideoClear={clearVideo}
                onImageSelect={handleImageSelect}
                onAudioSelect={handleAudioSelect}
                onVideoSelect={handleVideoSelect}
                onSendMessage={sendAdminMessage}
                onClearAll={clearAllMedia}
                isSending={sendingMessage}
                isUploadingImage={uploadingImage}
                isUploadingAudio={uploadingAudio}
                isUploadingVideo={uploadingVideo}
                messageSent={messageSent}
                messageError={messageError}
                selectedImage={selectedImage}
                selectedVideo={selectedVideo}
              />
            )}

            {activeTab === 'online' && <OnlineUsersTab onlineUsers={onlineUsers} />}

            {activeTab === 'logs' && <ActivityLogTab loginLogs={loginLogs} />}

            {activeTab === 'messages' && (
              <MessagesTab
                messages={messages}
                showExpired={showExpired}
                onShowExpiredChange={setShowExpired}
                savingToVault={savingToVault}
                savedToVault={savedToVault}
                onSaveToVault={saveMessageToVault}
              />
            )}

            {activeTab === 'vault' && (
              <VaultTab
                vaultUnlocked={vaultUnlocked}
                vaultPassword={vaultPassword}
                onVaultPasswordChange={setVaultPassword}
                onVaultUnlock={handleVaultUnlock}
                onVaultLock={() => {
                  setVaultUnlocked(false);
                  setVaultPassword('');
                }}
                vaultError={vaultError}
                vaultFiles={vaultFiles}
                uploadingVault={uploadingVault}
                onVaultUpload={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVaultUpload(file);
                }}
                onVaultDownload={handleVaultDownload}
                onVaultDelete={handleVaultDelete}
              />
            )}

            {activeTab === 'files' && (
              <FilesTab
                sharedFiles={sharedFiles}
                selectedFile={selectedFile}
                fileDescription={fileDescription}
                onFileDescriptionChange={setFileDescription}
                uploadingFile={uploadingFile}
                fileError={fileError}
                fileSuccess={fileSuccess}
                onFileSelect={handleFileSelect}
                onClearSelectedFile={clearSelectedFile}
                onFileUpload={handleFileUpload}
                onFileDelete={handleFileDelete}
              />
            )}

            {activeTab === 'controls' && (
              <SystemControlsTab
                systemStats={systemStats}
                controlsMessage={controlsMessage}
                controlsLoading={controlsLoading}
                onExecuteAction={handleExecuteSystemAction}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
