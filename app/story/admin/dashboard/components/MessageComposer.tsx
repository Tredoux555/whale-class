'use client';

import VoiceDictate from '@/components/montree/voice/VoiceDictate';

interface MessageComposerProps {
  adminMessage: string;
  onMessageChange: (value: string) => void;
  imagePreview: string | null;
  onImageClear: () => void;
  selectedAudio: File | null;
  onAudioClear: () => void;
  selectedVideo: File | null;
  onVideoClear: () => void;
  selectedDocument: File | null;
  onDocumentClear: () => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDocumentSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  onClearAll: () => void;
  isSending: boolean;
  isUploadingImage: boolean;
  isUploadingAudio: boolean;
  isUploadingVideo: boolean;
  isUploadingDocument: boolean;
  messageSent: boolean;
  messageError: string;
  selectedImage: File | null;
  selectedVideo: File | null;
}

export function MessageComposer({
  adminMessage,
  onMessageChange,
  imagePreview,
  onImageClear,
  selectedAudio,
  onAudioClear,
  selectedVideo,
  onVideoClear,
  selectedDocument,
  onDocumentClear,
  onImageSelect,
  onAudioSelect,
  onVideoSelect,
  onDocumentSelect,
  onSendMessage,
  onClearAll,
  isSending,
  isUploadingImage,
  isUploadingAudio,
  isUploadingVideo,
  isUploadingDocument,
  messageSent,
  messageError,
  selectedImage,
}: MessageComposerProps) {
  return (
    <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 mb-6 backdrop-blur-md">
      <h2 className="text-lg font-bold text-white/90 mb-4">📝 Send Message to Students</h2>
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={adminMessage}
            onChange={(e) => onMessageChange(e.target.value.slice(0, 50000))}
            maxLength={50000}
            placeholder={selectedImage ? 'Add a caption (optional)...' : 'Write a message for your students...'}
            className="w-full px-4 py-3 bg-black/30 border border-[rgba(52,211,153,0.25)] rounded-lg text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            rows={3}
          />
          <div className="absolute top-2 right-2">
            <VoiceDictate
              size="sm"
              onAppend={(text) => onMessageChange((adminMessage ? adminMessage + ' ' + text : text).slice(0, 50000))}
            />
          </div>
        </div>
        <p className="text-xs text-white/40 text-right">{adminMessage.length.toLocaleString()} / 50,000</p>

        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="max-w-xs max-h-48 rounded-lg border border-white/10" />
            <button
              onClick={onImageClear}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}

        {selectedAudio && (
          <div className="flex items-center gap-3 p-3 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg">
            <span className="text-2xl">🎵</span>
            <div className="flex-1">
              <p className="font-medium text-white/90">{selectedAudio.name}</p>
              <p className="text-xs text-white/50">{(selectedAudio.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
            <button
              onClick={onAudioClear}
              className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}

        {selectedVideo && (
          <div className="flex items-center gap-3 p-3 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg">
            <span className="text-2xl">🎬</span>
            <div className="flex-1">
              <p className="font-medium text-white/90">{selectedVideo.name}</p>
              <p className="text-xs text-white/50">{(selectedVideo.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
            <button
              onClick={onVideoClear}
              className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}

        {selectedDocument && (
          <div className="flex items-center gap-3 p-3 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white/90 truncate">{selectedDocument.name}</p>
              <p className="text-xs text-white/50">{(selectedDocument.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
            <button
              onClick={onDocumentClear}
              className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <label className="px-4 py-2 bg-white/10 text-white/80 border border-white/10 rounded-lg hover:bg-white/15 cursor-pointer transition-colors font-medium flex items-center gap-2">
            📷 Add Photo
            <input
              type="file"
              accept="image/*"
              onChange={onImageSelect}
              className="hidden"
            />
          </label>

          <label className="px-4 py-2 bg-[rgba(52,211,153,0.10)] text-emerald-300 border border-[rgba(52,211,153,0.25)] rounded-lg hover:bg-[rgba(52,211,153,0.18)] cursor-pointer transition-colors font-medium flex items-center gap-2">
            🎵 Add Song
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac"
              onChange={onAudioSelect}
              className="hidden"
            />
          </label>

          <label className="px-4 py-2 bg-[rgba(52,211,153,0.10)] text-emerald-300 border border-[rgba(52,211,153,0.25)] rounded-lg hover:bg-[rgba(52,211,153,0.18)] cursor-pointer transition-colors font-medium flex items-center gap-2">
            🎬 Add Video
            <input
              type="file"
              accept="video/*,.mp4,.mov,.webm,.avi,.m4v,.3gp"
              onChange={onVideoSelect}
              className="hidden"
            />
          </label>

          <label className="px-4 py-2 bg-[rgba(52,211,153,0.10)] text-emerald-300 border border-[rgba(52,211,153,0.25)] rounded-lg hover:bg-[rgba(52,211,153,0.18)] cursor-pointer transition-colors font-medium flex items-center gap-2">
            📄 Add Document
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,.zip,.epub,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
              onChange={onDocumentSelect}
              className="hidden"
            />
          </label>

          <button
            onClick={onSendMessage}
            disabled={
              isSending ||
              isUploadingImage ||
              isUploadingAudio ||
              isUploadingVideo ||
              isUploadingDocument ||
              (!adminMessage.trim() && !selectedImage && !selectedAudio && !selectedVideo && !selectedDocument)
            }
            className="px-6 py-2 bg-emerald-500 text-[#0a1a0f] rounded-lg hover:bg-emerald-600 disabled:bg-white/15 disabled:text-white/40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isUploadingDocument
              ? '⟳ Uploading Document...'
              : isUploadingVideo
              ? '⟳ Uploading Video...'
              : isUploadingAudio
              ? '⟳ Uploading Song...'
              : isUploadingImage
              ? '⟳ Uploading...'
              : isSending
              ? '⟳ Sending...'
              : selectedDocument
              ? '✓ Send Document'
              : selectedVideo
              ? '✓ Send Video'
              : selectedAudio
              ? '✓ Send Song'
              : selectedImage
              ? '✓ Send Photo'
              : '✓ Send Message'}
          </button>

          <button
            onClick={onClearAll}
            className="px-4 py-2 text-white/70 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
          >
            Clear
          </button>
        </div>

        {messageSent && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm">
            ✓ Message sent successfully!
          </div>
        )}
        {messageError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm">
            ✗ {messageError}
          </div>
        )}
      </div>
    </div>
  );
}
