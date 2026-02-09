// components/home/HomeChildCard.tsx
// Child display card for dashboard
// Shows avatar (photo or initial), name, age, quick stats, recent activity

'use client';

import React, { useState, useEffect } from 'react';

export interface ChildStats {
  mastered: number;
  practicing: number;
  presented: number;
  notStarted: number;
}

export interface HomeChild {
  id: string;
  name: string;
  age?: number;
  dateOfBirth?: string;
  avatar?: string; // URL to avatar image
  avatarColor?: string; // Fallback color like 'emerald', 'blue', etc
  stats?: ChildStats;
  lastActivity?: string;
  lastActivityTime?: Date;
}

interface HomeChildCardProps {
  child: HomeChild;
  onClick?: () => void;
  showStats?: boolean;
  avatarSize?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}

const AVATAR_COLORS = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  pink: 'bg-pink-100 text-pink-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

const AVATAR_SIZES = {
  sm: 'w-10 h-10 text-lg',
  md: 'w-14 h-14 text-2xl',
  lg: 'w-20 h-20 text-4xl',
};

export default function HomeChildCard({
  child,
  onClick,
  showStats = true,
  avatarSize = 'md',
  compact = false,
}: HomeChildCardProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(child.avatar || null);
  const [avatarLoading, setAvatarLoading] = useState(!child.avatar);
  const [avatarError, setAvatarError] = useState(false);

  // Calculate age if DOB provided
  const calculateAge = (dob: string | undefined) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const displayAge = child.age || calculateAge(child.dateOfBirth);

  // Fetch avatar URL if needed
  useEffect(() => {
    if (child.avatar) {
      setAvatarUrl(child.avatar);
      setAvatarLoading(false);
      return;
    }

    const fetchAvatarUrl = async () => {
      try {
        // Assuming avatar storage path is child.id/avatar
        const response = await fetch(`/api/home/media/avatar?childId=${child.id}`);
        const data = await response.json();

        if (data.url) {
          setAvatarUrl(data.url);
        } else {
          setAvatarError(true);
        }
      } catch {
        setAvatarError(true);
      } finally {
        setAvatarLoading(false);
      }
    };

    fetchAvatarUrl();
  }, [child.id, child.avatar]);

  // Get initial letter
  const initial = child.name.charAt(0).toUpperCase();

  // Get avatar color class
  const colorKey = child.avatarColor as keyof typeof AVATAR_COLORS;
  const avatarColorClass = AVATAR_COLORS[colorKey] || AVATAR_COLORS.emerald;
  const sizeClass = AVATAR_SIZES[avatarSize];

  // Format recent activity time
  const formatActivityTime = (date: Date | undefined) => {
    if (!date) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (compact) {
    // Compact view for lists
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
      >
        {/* Avatar */}
        <div className={`flex-shrink-0 ${sizeClass} rounded-lg flex items-center justify-center font-bold ${avatarColorClass} relative overflow-hidden`}>
          {avatarLoading ? (
            <div className="animate-pulse">.</div>
          ) : avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt={child.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 text-sm">{child.name}</h3>
          {displayAge && (
            <p className="text-xs text-gray-500">Age {displayAge}</p>
          )}
          {child.lastActivity && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">
              {child.lastActivity}
            </p>
          )}
        </div>

        {/* Quick stats indicator */}
        {showStats && child.stats && child.stats.mastered > 0 && (
          <div className="flex-shrink-0">
            <div className="px-2 py-1 bg-emerald-100 rounded text-xs font-semibold text-emerald-700">
              {child.stats.mastered}
            </div>
          </div>
        )}
      </button>
    );
  }

  // Full card view
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden text-left active:scale-95 transition-transform"
    >
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 pb-0">
        {/* Avatar */}
        <div className={`${sizeClass} rounded-xl flex items-center justify-center font-bold ${avatarColorClass} mx-auto mb-3 relative overflow-hidden border-2 border-white shadow-sm`}>
          {avatarLoading ? (
            <div className="animate-pulse w-full h-full flex items-center justify-center">
              .
            </div>
          ) : avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt={child.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name & Age */}
        <h3 className="font-bold text-lg text-gray-800 text-center mb-1">
          {child.name}
        </h3>
        {displayAge && (
          <p className="text-sm text-gray-500 text-center mb-3">
            Age {displayAge}
          </p>
        )}

        {/* Recent Activity */}
        {child.lastActivity && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
            <p className="text-xs text-blue-700 font-medium">Latest Activity</p>
            <p className="text-xs text-blue-600 line-clamp-2">
              {child.lastActivity}
            </p>
            {child.lastActivityTime && (
              <p className="text-[10px] text-blue-500 mt-1">
                {formatActivityTime(child.lastActivityTime)}
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        {showStats && child.stats && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-emerald-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-emerald-700">
                {child.stats.mastered}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold">
                Mastered
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-700">
                {child.stats.practicing}
              </div>
              <div className="text-[10px] text-blue-600 font-semibold">
                Practicing
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-amber-700">
                {child.stats.presented}
              </div>
              <div className="text-[10px] text-amber-600 font-semibold">
                Presented
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-700">
                {child.stats.notStarted}
              </div>
              <div className="text-[10px] text-gray-600 font-semibold">
                New
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onClick}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          View Dashboard
        </button>
      </div>
    </button>
  );
}
