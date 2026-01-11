'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
interface OnlineUser {
username: string;
lastLogin: string;
secondsAgo: number;
}
interface LoginLog {
id: number;
username: string;
login_time: string;
ip_address: string | null;
user_agent: string | null;
}
interface Message {
id: number;
week_start_date: string;
message_type: 'text' | 'image' | 'video' | 'audio';
message_content: string | null;
media_url: string | null;
media_filename: string | null;
author: string;
created_at: string;
is_expired: boolean;
}
interface Statistics {
message_type: string;
count: string;
}
interface VaultFile {
id: number;
filename: string;
file_size: number;
uploaded_by: string;
uploaded_at: string;
}
type TabType = 'online' | 'logs' | 'messages' | 'vault' | 'controls';

interface SystemStats {
  messages: number;
  users: number;
  loginLogs: number;
  vaultFiles: number;
}
export default function AdminDashboard() {
const router = useRouter();
const [activeTab, setActiveTab] = useState<TabType>('online');
const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
const [onlineCount, setOnlineCount] = useState(0);
const [totalUsers, setTotalUsers] = useState(0);
const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
const [messages, setMessages] = useState<Message[]>([]);
const [statistics, setStatistics] = useState<Statistics[]>([]);
const [showExpired, setShowExpired] = useState(false);
const [adminMessage, setAdminMessage] = useState('');
const [sendingMessage, setSendingMessage] = useState(false);
const [messageSent, setMessageSent] = useState(false);
const [messageError, setMessageError] = useState('');
const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [uploadingImage, setUploadingImage] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [vaultPassword, setVaultPassword] = useState('');
const [vaultUnlocked, setVaultUnlocked] = useState(false);
const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
const [uploadingVault, setUploadingVault] = useState(false);
const [vaultError, setVaultError] = useState('');
const [savingToVault, setSavingToVault] = useState<number | null>(null);
const [savedToVault, setSavedToVault] = useState<Set<number>>(new Set());
// System controls state
const [systemStats, setSystemStats] = useState<SystemStats>({ messages: 0, users: 0, loginLogs: 0, vaultFiles: 0 });
const [controlsLoading, setControlsLoading] = useState(false);
const [controlsMessage, setControlsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
const getSession = useCallback(() => {
return sessionStorage.getItem('story_admin_session');
}, []);
const verifySession = useCallback(async () => {
const session = getSession();
if (!session) {
router.push('/story/admin');
return false;
}
try {
const res = await fetch('/api/story/admin/auth', {
headers: { 'Authorization': `Bearer ${session}` }
});
if (!res.ok) {
sessionStorage.removeItem('story_admin_session');
router.push('/story/admin');
return false;
}
return true;
} catch {
router.push('/story/admin');
return false;
}
}, [router, getSession]);
const loadOnlineUsers = useCallback(async () => {
const session = getSession();
try {
const res = await fetch('/api/story/admin/online-users', {
headers: { 'Authorization': `Bearer ${session}` }
});
if (res.ok) {
const data = await res.json();
setOnlineUsers(data.onlineUsers || []);
setOnlineCount(data.onlineCount || 0);
setTotalUsers(data.totalUsers || 0);
}
} catch {
// Handle silently
}
}, [getSession]);
const loadLoginLogs = useCallback(async () => {
const session = getSession();
try {
const res = await fetch('/api/story/admin/login-logs?limit=50', {
headers: { 'Authorization': `Bearer ${session}` }
});
if (res.ok) {
const data = await res.json();
setLoginLogs(data.logs || []);
}
} catch {
// Handle silently
}
}, [getSession]);
const loadMessages = useCallback(async () => {
const session = getSession();
try {
const res = await fetch(`/api/story/admin/message-history?limit=50&showExpired=${showExpired}`, {
headers: { 'Authorization': `Bearer ${session}` }
});
if (res.ok) {
const data = await res.json();
setMessages(data.messages || []);
setStatistics(data.statistics || []);
}
} catch {
// Handle silently
}
}, [getSession, showExpired]);
const loadVaultFiles = useCallback(async () => {
const session = getSession();
try {
const res = await fetch('/api/story/admin/vault/list', {
headers: { 'Authorization': `Bearer ${session}` }
});
if (res.ok) {
const data = await res.json();
setVaultFiles(data.files || []);
}
} catch {
console.error('Failed to load vault files');
}
}, [getSession]);

const loadSystemStats = useCallback(async () => {
const session = getSession();
try {
const res = await fetch('/api/story/admin/system-controls', {
headers: { 'Authorization': `Bearer ${session}` }
});
if (res.ok) {
const data = await res.json();
setSystemStats(data.stats);
}
} catch {
console.error('Failed to load system stats');
}
}, [getSession]);

const executeSystemAction = async (action: string, confirmMessage: string) => {
if (!confirm(`${confirmMessage}\n\nThis action cannot be undone. Type CONFIRM to proceed.`)) return;

setControlsLoading(true);
setControlsMessage(null);

try {
const session = getSession();
const res = await fetch('/api/story/admin/system-controls', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${session}`
},
body: JSON.stringify({ action, confirmCode: 'CONFIRM' })
});

const data = await res.json();

if (res.ok && data.success) {
setControlsMessage({ type: 'success', text: data.message });
await loadSystemStats();
await Promise.all([loadMessages(), loadLoginLogs(), loadVaultFiles(), loadOnlineUsers()]);
} else {
setControlsMessage({ type: 'error', text: data.error || 'Action failed' });
}
} catch {
setControlsMessage({ type: 'error', text: 'Connection error' });
} finally {
setControlsLoading(false);
}
};
useEffect(() => {
const init = async () => {
const valid = await verifySession();
if (valid) {
await Promise.all([loadOnlineUsers(), loadLoginLogs(), loadMessages(), loadVaultFiles(), loadSystemStats()]);
}
setIsLoading(false);
};
init();
}, [verifySession, loadOnlineUsers, loadLoginLogs, loadMessages, loadVaultFiles, loadSystemStats]);
useEffect(() => {
if (activeTab === 'online') {
const interval = setInterval(loadOnlineUsers, 5000);
return () => clearInterval(interval);
}
}, [activeTab, loadOnlineUsers]);
useEffect(() => {
if (activeTab === 'messages') {
loadMessages();
// Auto-refresh messages every 10 seconds
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
const sendAdminMessage = async () => {
  if (!adminMessage.trim() && !selectedImage) return;
  setSendingMessage(true);
  setMessageSent(false);
  setMessageError('');
  try {
    const session = getSession();
    
    // If there's an image, upload it first
    if (selectedImage) {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('caption', adminMessage.trim());
      
      const res = await fetch('/api/story/admin/send-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}` },
        body: formData
      });
      
      const data = await res.json();
      setUploadingImage(false);
      
      if (res.ok) {
        setAdminMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setMessageSent(true);
        await loadMessages();
        setTimeout(() => setMessageSent(false), 3000);
      } else {
        setMessageError(data.error || 'Failed to send image');
      }
    } else {
      // Text only
      const res = await fetch('/api/story/admin/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ message: adminMessage.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage('');
        setMessageSent(true);
        await loadMessages();
        setTimeout(() => setMessageSent(false), 3000);
      } else {
        setMessageError(data.error || 'Failed to send');
      }
    }
  } catch {
    setMessageError('Connection error');
  } finally {
    setSendingMessage(false);
    setUploadingImage(false);
  }
};

const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
};

const clearImage = () => {
  setSelectedImage(null);
  setImagePreview(null);
};
const handleVaultUnlock = async () => {
const session = getSession();
try {
const res = await fetch('/api/story/admin/vault/unlock', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${session}`
},
body: JSON.stringify({ password: vaultPassword })
});
const data = await res.json();
if (res.ok) {
setVaultUnlocked(true);
setVaultPassword('');
await loadVaultFiles();
} else {
setVaultError('Invalid password');
}
} catch {
setVaultError('Error unlocking vault');
}
};
const handleVaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;
setUploadingVault(true);
setVaultError('');

try {
  const session = getSession();
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch('/api/story/admin/vault/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session}` },
    body: formData
  });
  
  const data = await res.json();
  if (res.ok) {
    await loadVaultFiles();
  } else {
    setVaultError(data.error || 'Upload failed');
  }
} catch {
  setVaultError('Upload failed');
} finally {
  setUploadingVault(false);
}
};
const handleVaultDownload = async (fileId: number, filename: string) => {
try {
const session = getSession();
const res = await fetch(`/api/story/admin/vault/download/${fileId}`, {
headers: { 'Authorization': `Bearer ${session}` }
});
if (res.ok) {
const blob = await res.blob();
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = filename;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
window.URL.revokeObjectURL(url);
} else {
alert('Download failed');
}
} catch (err) {
console.error('Download error:', err);
alert('Download failed');
}
};
const handleVaultDelete = async (fileId: number) => {
if (!confirm('Delete this file?')) return;
const session = getSession();
try {
  const res = await fetch(`/api/story/admin/vault/delete/${fileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${session}` }
  });
  if (res.ok) {
    await loadVaultFiles();
  }
} catch {
  setVaultError('Delete failed');
}
};
const saveMessageToVault = async (messageId: number, mediaUrl: string, filename: string | null) => {
  setSavingToVault(messageId);
  try {
    const session = getSession();
    const res = await fetch('/api/story/admin/vault/save-from-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session}`
      },
      body: JSON.stringify({ messageId, mediaUrl, filename })
    });
    if (res.ok) {
      setSavedToVault(prev => new Set(prev).add(messageId));
      await loadVaultFiles();
    } else {
      const data = await res.json();
      alert('Save failed: ' + (data.error || 'Unknown error'));
    }
  } catch {
    alert('Save to vault failed');
  } finally {
    setSavingToVault(null);
  }
};
const handleLogout = () => {
sessionStorage.removeItem('story_admin_session');
router.push('/story/admin');
};
const formatTime = (dateString: string) => {
  if (!dateString) return '—';
  
  try {
    // Parse the timestamp - Supabase TIMESTAMPTZ returns ISO format
    const date = new Date(dateString);
    
    // Check for invalid date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return dateString;
    }
    
    // Convert to Beijing time (UTC+8)
    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Date formatting error:', error, dateString);
    return dateString;
  }
};
const formatSecondsAgo = (seconds: number) => {
if (seconds < 60) return `${seconds}s`;
if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
return `${Math.floor(seconds / 3600)}h`;
};
const getTypeIcon = (type: string) => {
switch (type) {
case 'text': return '📝';
case 'image': return '🖼️';
case 'video': return '▶️';
case 'audio': return '🔊';
default: return '📎';
}
};
const getVaultFileIcon = (filename: string) => {
const ext = filename.split('.').pop()?.toLowerCase();
if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼️';
if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return '▶️';
return '📄';
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
{/* Top Navigation */}
<div className="bg-white border-b border-gray-200 shadow-sm">
<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="text-3xl">🏫</div>
<div>
<h1 className="text-2xl font-bold text-gray-800">Classroom Manager</h1>
<p className="text-sm text-gray-500">Manage student communications</p>
</div>
</div>
<button
         onClick={handleLogout}
         className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
       >
Sign Out
</button>
</div>
</div>
  <div className="max-w-7xl mx-auto p-6">
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm p-4 sticky top-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Navigation</h2>
          <div className="space-y-2">
            {(['online', 'logs', 'messages', 'vault', 'controls'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                  activeTab === tab
                    ? tab === 'controls' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
                    : tab === 'controls' ? 'text-red-700 hover:bg-red-50' : 'text-gray-700 hover:bg-indigo-50'
                }`}
              >
                {tab === 'online' && `👥 Active Users (${onlineCount})`}
                {tab === 'logs' && '📋 Activity Log'}
                {tab === 'messages' && '💬 Messages'}
                {tab === 'vault' && '🔒 Media Vault'}
                {tab === 'controls' && '⚙️ System Controls'}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-6 pt-4">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Students:</span>
                <span className="font-semibold text-indigo-600">{totalUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Now:</span>
                <span className="font-semibold text-green-600">{onlineCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Messages:</span>
                <span className="font-semibold text-blue-600">{messages.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        {/* Message Composer */}
        {activeTab !== 'vault' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📝 Send Message to Students</h2>
            <div className="space-y-3">
              <textarea
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                placeholder={selectedImage ? "Add a caption (optional)..." : "Write a message for your students..."}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
              />
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-w-xs max-h-48 rounded-lg border border-gray-200" />
                  <button
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
              
              <div className="flex gap-2 flex-wrap">
                {/* Image Upload Button */}
                <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors font-medium flex items-center gap-2">
                  📷 Add Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
                
                <button
                  onClick={sendAdminMessage}
                  disabled={sendingMessage || uploadingImage || (!adminMessage.trim() && !selectedImage)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {uploadingImage ? '⟳ Uploading...' : sendingMessage ? '⟳ Sending...' : selectedImage ? '✓ Send Photo' : '✓ Send Message'}
                </button>
                <button
                  onClick={() => { setAdminMessage(''); setMessageError(''); clearImage(); }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
              {messageSent && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  ✓ Message sent successfully!
                </div>
              )}
              {messageError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  ✗ {messageError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vault Panel */}
        {activeTab === 'vault' && (
          <div className="space-y-4">
            {!vaultUnlocked ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">🔒 Media Vault</h2>
                <p className="text-gray-600 mb-4">This vault is password protected. Enter your password to access stored photos and videos.</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="Enter vault password..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleVaultUnlock()}
                  />
                  <button
                    onClick={handleVaultUnlock}
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
                      onClick={() => { setVaultUnlocked(false); setVaultPassword(''); }}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Lock
                    </button>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo or Video</label>
                    <input
                      type="file"
                      onChange={handleVaultUpload}
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
                            <button
                              onClick={() => handleVaultDownload(file.id, file.filename)}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              ⬇ Download
                            </button>
                            <button
                              onClick={() => handleVaultDelete(file.id)}
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
        )}

        {/* Online Users Tab */}
        {activeTab === 'online' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">👥 Active Students</h2>
            {onlineUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">😴</div>
                <p>No students are currently online</p>
              </div>
            ) : (
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <div key={user.username} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{user.username}</p>
                          <p className="text-xs text-gray-600">Last active: {formatSecondsAgo(user.secondsAgo)} ago</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded-full">
                        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                        Online
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📋 Activity Log</h2>
            {loginLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No activity recorded</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Login Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Device</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{log.username}</td>
                        <td className="px-4 py-3 text-gray-600">{formatTime(log.login_time)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{log.ip_address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">💬 Message History</h2>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExpired}
                  onChange={(e) => setShowExpired(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                Show expired messages
              </label>
            </div>
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💭</div>
                <p>No messages sent yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`p-4 rounded-lg border ${msg.is_expired ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded">
                          {msg.author}
                        </span>
                        <span className="text-lg">{getTypeIcon(msg.message_type)}</span>
                        {msg.is_expired && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Expired</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>{formatTime(msg.created_at)}</div>
                      </div>
                    </div>
                    {msg.message_type === 'text' && (
                      <p className="text-gray-800">{msg.message_content}</p>
                    )}
                    {msg.message_type === 'image' && msg.media_url && (
                      <div className="mt-2">
                        <img src={msg.media_url} alt="Message" className="max-w-xs rounded-lg" />
                        <button
                          onClick={() => saveMessageToVault(msg.id, msg.media_url!, msg.media_filename)}
                          disabled={savingToVault === msg.id || savedToVault.has(msg.id)}
                          className="mt-2 px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {savedToVault.has(msg.id) ? '✓ Saved to Vault' : savingToVault === msg.id ? '⏳ Saving...' : '🔒 Save to Vault'}
                        </button>
                      </div>
                    )}
                    {msg.message_type === 'video' && msg.media_url && (
                      <div className="mt-2">
                        <video src={msg.media_url} controls className="max-w-xs rounded-lg" />
                        <button
                          onClick={() => saveMessageToVault(msg.id, msg.media_url!, msg.media_filename)}
                          disabled={savingToVault === msg.id || savedToVault.has(msg.id)}
                          className="mt-2 px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {savedToVault.has(msg.id) ? '✓ Saved to Vault' : savingToVault === msg.id ? '⏳ Saving...' : '🔒 Save to Vault'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* System Controls Tab */}
        {activeTab === 'controls' && (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">📊 System Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{systemStats.messages}</div>
                  <div className="text-sm text-gray-600">Messages</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{systemStats.users}</div>
                  <div className="text-sm text-gray-600">Users</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{systemStats.loginLogs}</div>
                  <div className="text-sm text-gray-600">Login Logs</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600">{systemStats.vaultFiles}</div>
                  <div className="text-sm text-gray-600">Vault Files</div>
                </div>
              </div>
            </div>

            {/* Status Message */}
            {controlsMessage && (
              <div className={`p-4 rounded-lg ${
                controlsMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {controlsMessage.type === 'success' ? '✓' : '✗'} {controlsMessage.text}
              </div>
            )}

            {/* Message Controls */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">💬 Message Controls</h2>
              <div className="space-y-3">
                <button
                  onClick={() => executeSystemAction('clear_expired_messages', 'Clear all EXPIRED messages only?')}
                  disabled={controlsLoading}
                  className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left hover:bg-yellow-100 disabled:opacity-50 transition-colors"
                >
                  <div className="font-semibold text-yellow-800">🧹 Clear Expired Messages</div>
                  <div className="text-sm text-yellow-600">Remove only messages that have expired</div>
                </button>
                <button
                  onClick={() => executeSystemAction('clear_messages', 'DELETE ALL MESSAGES? This will remove all message history!')}
                  disabled={controlsLoading}
                  className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <div className="font-semibold text-red-800">🗑️ Clear All Messages</div>
                  <div className="text-sm text-red-600">Permanently delete all message history</div>
                </button>
                <button
                  onClick={() => executeSystemAction('clear_all_media', 'Remove all media (images/videos) from messages but keep text?')}
                  disabled={controlsLoading}
                  className="w-full p-4 bg-orange-50 border border-orange-200 rounded-lg text-left hover:bg-orange-100 disabled:opacity-50 transition-colors"
                >
                  <div className="font-semibold text-orange-800">🖼️ Clear Media Only</div>
                  <div className="text-sm text-orange-600">Remove images and videos, keep text messages</div>
                </button>
              </div>
            </div>

            {/* User Controls */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">👥 User Controls</h2>
              <div className="space-y-3">
                <button
                  onClick={() => executeSystemAction('clear_login_logs', 'Clear all login history?')}
                  disabled={controlsLoading}
                  className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  <div className="font-semibold text-blue-800">📋 Clear Login Logs</div>
                  <div className="text-sm text-blue-600">Remove all login history records</div>
                </button>
                <button
                  onClick={() => executeSystemAction('reset_user_sessions', 'Reset all user sessions? Users will appear offline.')}
                  disabled={controlsLoading}
                  className="w-full p-4 bg-purple-50 border border-purple-200 rounded-lg text-left hover:bg-purple-100 disabled:opacity-50 transition-colors"
                >
                  <div className="font-semibold text-purple-800">🔄 Reset User Sessions</div>
                  <div className="text-sm text-purple-600">Mark all users as offline</div>
                </button>
                <button
                  onClick={() => executeSystemAction('delete_all_users', 'DELETE ALL USERS? This removes all student accounts!')}
                  disabled={controlsLoading}
                  className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <div className="font-semibold text-red-800">🚫 Delete All Users</div>
                  <div className="text-sm text-red-600">Permanently delete all student accounts</div>
                </button>
              </div>
            </div>

            {/* Vault Controls */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">🔒 Vault Controls</h2>
              <div className="space-y-3">
                <button
                  onClick={() => executeSystemAction('clear_vault', 'DELETE ALL VAULT FILES? This removes all saved photos and videos!')}
                  disabled={controlsLoading}
                  className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <div className="font-semibold text-red-800">🗑️ Clear Vault</div>
                  <div className="text-sm text-red-600">Permanently delete all vault files</div>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-900 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-white mb-4">⚠️ Danger Zone</h2>
              <p className="text-red-200 text-sm mb-4">These actions will permanently delete ALL data and cannot be undone.</p>
              <button
                onClick={() => executeSystemAction('factory_reset', 'FACTORY RESET - DELETE EVERYTHING?\n\nThis will delete:\n• All messages\n• All users\n• All login logs\n• All vault files\n\nThis CANNOT be undone!')}
                disabled={controlsLoading}
                className="w-full p-4 bg-red-700 border-2 border-red-500 rounded-lg text-left hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                <div className="font-bold text-white">💥 Factory Reset</div>
                <div className="text-sm text-red-200">Delete ALL data and start fresh</div>
              </button>
            </div>

            {controlsLoading && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 text-center">
                  <div className="text-4xl mb-2 animate-spin">⚙️</div>
                  <p className="font-semibold">Processing...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
</div>
);
}
