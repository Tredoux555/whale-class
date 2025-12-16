'use client';

import React, { useEffect, useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import type { CurriculumVideo, CurriculumWork } from '@/lib/youtube/types';
import { formatDuration, formatViewCount } from '@/lib/youtube/types';

interface WorkVideoDisplayProps {
  work: CurriculumWork;
  childId?: string;
  onWatchComplete?: (workId: string) => void;
}

export function WorkVideoDisplay({ work, childId, onWatchComplete }: WorkVideoDisplayProps) {
  const [video, setVideo] = useState<CurriculumVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  useEffect(() => {
    async function fetchVideo() {
      try {
        const response = await fetch(`/api/youtube/video/${work.id}`);
        const data = await response.json();
        if (data.video) {
          setVideo(data.video);
        }
      } catch (err) {
        console.error('Error fetching video:', err);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    }

    fetchVideo();
  }, [work.id]);

  const handleWatchComplete = (workId: string) => {
    console.log(`🎉 Work ${workId} completed via video watch!`);
    
    // Show completion message
    setShowCompletionMessage(true);
    setTimeout(() => setShowCompletionMessage(false), 5000);

    // Call parent callback if provided
    if (onWatchComplete) {
      onWatchComplete(workId);
    }
  };

  if (loading) {
    return (
      <div className="work-video-display">
        <div className="animate-pulse bg-gray-200 rounded-lg aspect-video"></div>
        <div className="mt-3 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return null; // Silently hide if no video
  }

  return (
    <div className="work-video-display space-y-4">
      {/* Completion notification */}
      {showCompletionMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
          <svg 
            className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
              clipRule="evenodd" 
            />
          </svg>
          <div>
            <p className="font-semibold text-green-900">Work completed! 🎉</p>
            <p className="text-sm text-green-700 mt-1">
              Great job watching the video! This work has been marked as complete.
            </p>
          </div>
        </div>
      )}

      {/* Video title and metadata */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {video.title}
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {video.duration_seconds && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {formatDuration(video.duration_seconds)}
            </span>
          )}
          {video.view_count && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              {formatViewCount(video.view_count)} views
            </span>
          )}
          {video.relevance_score && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {Math.round(video.relevance_score * 100)}% match
            </span>
          )}
        </div>
      </div>

      {/* Video player with tracking */}
      <VideoPlayer
        videoId={video.youtube_video_id}
        title={video.title}
        childId={childId}
        curriculumVideoId={video.id}
        curriculumWorkId={work.id}
        onWatchComplete={handleWatchComplete}
      />

      {/* Additional info */}
      {childId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <p className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              Watch at least 80% of this video to automatically complete the work!
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
