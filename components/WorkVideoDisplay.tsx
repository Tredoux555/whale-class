// =====================================================
// WORK VIDEO DISPLAY COMPONENT
// =====================================================
'use client';

import React, { useEffect, useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import type { CurriculumVideo, CurriculumWork } from '@/lib/youtube/types';
import { formatDuration, formatViewCount } from '@/lib/youtube/types';

interface WorkVideoDisplayProps {
  work: CurriculumWork;
}

export function WorkVideoDisplay({ work }: WorkVideoDisplayProps) {
  const [video, setVideo] = useState<CurriculumVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg aspect-video"></div>
    );
  }

  if (error || !video) {
    return null; // Silently hide if no video
  }

  return (
    <div className="work-video-display space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Video Demonstration
        </h3>
        <VideoPlayer
          videoId={video.youtube_video_id}
          title={video.title}
        />
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p className="font-medium">{video.title}</p>
        <p className="text-gray-500">Channel: {video.channel_name}</p>
        
        <div className="flex items-center gap-4 text-xs">
          {video.duration_seconds && (
            <span>
              Duration: {formatDuration(video.duration_seconds)}
            </span>
          )}
          {video.view_count > 0 && (
            <span>
              Views: {formatViewCount(video.view_count)}
            </span>
          )}
          {video.relevance_score && (
            <span className={`font-medium ${
              video.relevance_score >= 85 ? 'text-green-600' :
              video.relevance_score >= 75 ? 'text-blue-600' :
              video.relevance_score >= 60 ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              Relevance: {video.relevance_score}/100
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

