'use client';

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
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">📝 Send Message to Students</h2>
      <div className="space-y-3">
        <textarea
          value={adminMessage}
          onChange={(e) => onMessageChange(e.target.value.slice(0, 50000))}
          maxLength={50000}
          placeholder={selectedImage ? 'Add a caption (optional)...' : 'Write a message for your students...'}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={3}
        />
        <p className="text-xs text-gray-400 text-right">{adminMessage.length.toLocaleString()} / 50,000</p>

        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="max-w-xs max-h-48 rounded-lg border border-gray-200" />
            <button
              onClick={onImageClear}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}

        {selectedAudio && (
          <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-2xl">🎵</span>
            <div className="flex-1">
              <p className="font-medium text-purple-800">{selectedAudio.name}</p>
              <p className="text-xs text-purple-600">{(selectedAudio.size / (1024 * 1024)).toFixed(1)} MB</p>
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
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-2xl">🎬</span>
            <div className="flex-1">
              <p className="font-medium text-red-800">{selectedVideo.name}</p>
              <p className="text-xs text-red-600">{(selectedVideo.size / (1024 * 1024)).toFixed(1)} MB</p>
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
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-800 truncate">{selectedDocument.name}</p>
              <p className="text-xs text-blue-600">{(selectedDocument.size / (1024 * 1024)).toFixed(1)} MB</p>
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
          <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors font-medium flex items-center gap-2">
            📷 Add Photo
            <input
              type="file"
              accept="image/*"
              onChange={onImageSelect}
              className="hidden"
            />
          </label>

          <label className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 cursor-pointer transition-colors font-medium flex items-center gap-2">
            🎵 Add Song
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac"
              onChange={onAudioSelect}
              className="hidden"
            />
          </label>

          <label className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 cursor-pointer transition-colors font-medium flex items-center gap-2">
            🎬 Add Video
            <input
              type="file"
              accept="video/*,.mp4,.mov,.webm,.avi,.m4v,.3gp"
              onChange={onVideoSelect}
              className="hidden"
            />
          </label>

          <label className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 cursor-pointer transition-colors font-medium flex items-center gap-2">
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
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
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
  );
}
