'use client';

import React, { useState, useRef } from 'react';
import { Upload, Play, Trash2, Loader } from 'lucide-react';

interface ActivityVideoSectionProps {
  activityId: string;
  videoUrl?: string;
  onVideoUpload?: (url: string) => void;
}

export const ActivityVideoSection: React.FC<ActivityVideoSectionProps> = ({
  activityId,
  videoUrl,
  onVideoUpload,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(videoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a valid video file');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('Video file must be less than 100MB');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('activityId', activityId);
      formData.append('type', 'activity-video');

      // Upload to Supabase Storage via API route
      const response = await fetch('/api/whale/activity-videos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      setUploadedUrl(data.url);
      onVideoUpload?.(data.url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload video'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-50', 'border-blue-400');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-400');
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50', 'border-blue-400');

    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Simulate file input event
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const fileInput = fileInputRef.current;
      if (fileInput) {
        fileInput.files = dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
      }
    }
  };

  const handleRemoveVideo = () => {
    setUploadedUrl(undefined);
    if (videoRef.current) {
      videoRef.current.src = '';
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Play className="w-5 h-5 text-blue-600" />
        Instruction Video
      </h3>

      {uploadedUrl ? (
        /* Video Player */
        <div className="space-y-4">
          <div className="bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              src={uploadedUrl}
              controls
              className="w-full h-full"
            />
          </div>

          {/* Remove button */}
          <div className="flex gap-3">
            <button
              onClick={handleRemoveVideo}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove Video
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Replace Video
            </button>
          </div>
        </div>
      ) : (
        /* Upload Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            {isUploading ? (
              <>
                <Loader className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-blue-600 font-medium">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-gray-900 font-semibold">
                    Drop video here or click to upload
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    MP4, WebM, or Ogg (Max 100MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-600 mt-4">
        📹 Upload instructional videos showing how to perform this activity.
        Teachers will use this when preparing the lesson.
      </p>
    </div>
  );
};


