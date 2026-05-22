'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Screensaver } from './components/Screensaver';

import { usePullToRefresh } from '@/lib/story/use-pull-to-refresh';
import PullRefreshIndicator from '@/lib/story/PullRefreshIndicator';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('online');
  const [isLoading, setIsLoading] = useState(true);

  // Secret screensaver: whenever the tab loses visibility for more than a
  // moment, arm the lock. When the tab comes back, show the fake Montree
  // roster. Tapping MaoMao unlocks. Everyone else sees a boring classroom.
  const [isLocked, setIsLocked] = useState(false);
  useEffect(() => {
    let hiddenAt: number | null = null;
    const GRACE_MS = 800; // ignore instant tab-switch flickers

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenAt !== null && Date.now() - hiddenAt > GRACE_MS) {
          setIsLocked(true);
        }
        hiddenAt = null;
      }
    };
    const onBlur = () => { hiddenAt = Date.now(); };
    const onFocus = () => {
      if (hiddenAt !== null && Date.now() - hiddenAt > GRACE_MS) {
        setIsLocked(true);
      }
      hiddenAt = null;
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const { getSession, verifySession, handleLogout } = useAuthSession();
  const { onlineUsers, onlineCount, totalUsers, loadOnlineUsers } = useOnlineUsers(getSession);
  const { loginLogs, visits, loginLogsError, loadLoginLogs } = useLoginLogs(getSession);
  // 🚨 Session 113 V2 Story audit F-2.1 — useVault must come BEFORE
  // useMessages so saveMessageToVault can read the live vault token via
  // getVaultToken. Reordering only — no behaviour change for other hooks.
  const {
    vaultPassword,
    setVaultPassword,
    vaultUnlocked,
    setVaultUnlocked,
    vaultFiles,
    uploadingVault,
    vaultError,
    setVaultError,
    viewingImage,
    loadingView,
    loadVaultFiles,
    handleVaultUnlock,
    handleVaultUpload,
    handleVaultDownload,
    handleVaultDelete,
    handleVaultView,
    handleCloseViewer,
    handleVaultLock,
    albumIndex,
    thumbnails,
    loadingThumbnails,
    failedThumbnails,
    navigateAlbum,
    loadThumbnail,
    getVaultToken,
  } = useVault(getSession);
  const {
    messages,
    statistics,
    showExpired,
    setShowExpired,
    savedToVault,
    savingToVault,
    loadMessages,
    saveMessageToVault
  } = useMessages(getSession, getVaultToken);
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
    selectedDocument,
    uploadingDocument,
    handleDocumentSelect,
    clearDocument,
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
      const tick = () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        loadOnlineUsers();
      };
      const interval = setInterval(tick, 5000);
      const onVis = () => { if (document.visibilityState === 'visible') loadOnlineUsers(); };
      document.addEventListener('visibilitychange', onVis);
      return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
    }
  }, [activeTab, loadOnlineUsers]);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLoginLogs();
      const tick = () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        loadLoginLogs();
      };
      const interval = setInterval(tick, 10000);
      const onVis = () => { if (document.visibilityState === 'visible') loadLoginLogs(); };
      document.addEventListener('visibilitychange', onVis);
      return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
    }
  }, [activeTab, loadLoginLogs]);

  useEffect(() => {
    if (activeTab === 'messages') {
      loadMessages();
      const tick = () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        loadMessages();
      };
      const interval = setInterval(tick, 10000);
      const onVis = () => { if (document.visibilityState === 'visible') loadMessages(); };
      document.addEventListener('visibilitychange', onVis);
      return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
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

  // Pull-to-refresh — refreshes whatever the active tab is showing, plus
  // online users (always visible in sidebar count). Disabled while the
  // session is still loading or when the screensaver is locked.
  const handlePullRefresh = useCallback(async () => {
    const tasks: Array<Promise<unknown> | void> = [loadOnlineUsers()];
    if (activeTab === 'messages') tasks.push(loadMessages());
    if (activeTab === 'logs') tasks.push(loadLoginLogs());
    if (activeTab === 'vault' && vaultUnlocked) tasks.push(loadVaultFiles());
    if (activeTab === 'files') tasks.push(loadSharedFiles());
    if (activeTab === 'system') tasks.push(loadSystemStats());
    await Promise.allSettled(tasks.map(t => Promise.resolve(t)));
  }, [
    activeTab,
    vaultUnlocked,
    loadOnlineUsers,
    loadMessages,
    loadLoginLogs,
    loadVaultFiles,
    loadSharedFiles,
    loadSystemStats,
  ]);

  const pullState = usePullToRefresh({
    onRefresh: handlePullRefresh,
    disabled: isLoading || isLocked,
  });

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
      <PullRefreshIndicator
        pullDistance={pullState.pullDistance}
        isRefreshing={pullState.isRefreshing}
        threshold={pullState.threshold}
        variant="admin"
      />
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
                selectedDocument={selectedDocument}
                onDocumentClear={clearDocument}
                onImageSelect={handleImageSelect}
                onAudioSelect={handleAudioSelect}
                onVideoSelect={handleVideoSelect}
                onDocumentSelect={handleDocumentSelect}
                onSendMessage={sendAdminMessage}
                onClearAll={clearAllMedia}
                isSending={sendingMessage}
                isUploadingImage={uploadingImage}
                isUploadingAudio={uploadingAudio}
                isUploadingVideo={uploadingVideo}
                isUploadingDocument={uploadingDocument}
                messageSent={messageSent}
                messageError={messageError}
                selectedImage={selectedImage}
              />
            )}

            {activeTab === 'online' && <OnlineUsersTab onlineUsers={onlineUsers} getSession={getSession} />}

            {activeTab === 'logs' && <ActivityLogTab visits={visits} error={loginLogsError} />}

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
                onVaultLock={handleVaultLock}
                vaultError={vaultError}
                vaultFiles={vaultFiles}
                uploadingVault={uploadingVault}
                onVaultUpload={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVaultUpload(file);
                }}
                onVaultDownload={handleVaultDownload}
                onVaultDelete={handleVaultDelete}
                viewingImage={viewingImage}
                loadingView={loadingView}
                onVaultView={handleVaultView}
                onCloseViewer={handleCloseViewer}
                albumIndex={albumIndex}
                thumbnails={thumbnails}
                loadingThumbnails={loadingThumbnails}
                failedThumbnails={failedThumbnails}
                onNavigateAlbum={navigateAlbum}
                onLoadThumbnail={loadThumbnail}
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

      {isLocked && <Screensaver onUnlock={() => setIsLocked(false)} />}
    </div>
  );
}
