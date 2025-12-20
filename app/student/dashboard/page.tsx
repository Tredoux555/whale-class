'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Star, Award, LogOut } from 'lucide-react';

interface StudentSession {
  childId: string;
  childName: string;
  avatar: string;
  loginTime: number;
}

interface GameProgress {
  letterSounds: number; // Percentage
  wordBuilder: number;
  sentenceMatch: number;
  sentenceBuilder: number;
  letterMatch: number;
  letterTracer: number;
}

interface Badge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_icon: string;
  badge_description?: string;
  earned_date: string;
}

export default function StudentDashboard() {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [childInfo, setChildInfo] = useState<any>(null);
  const [progress, setProgress] = useState<GameProgress>({
    letterSounds: 0,
    wordBuilder: 0,
    sentenceMatch: 0,
    sentenceBuilder: 0,
    letterMatch: 0,
    letterTracer: 0,
  });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check session from localStorage (persists across browser closes)
    const sessionData = localStorage.getItem('student_session');
    if (!sessionData) {
      router.push('/auth/student-login');
      return;
    }

    try {
      const parsedSession = JSON.parse(sessionData);
      setSession(parsedSession);
      loadStudentData(parsedSession.childId);
    } catch (error) {
      localStorage.removeItem('student_session');
      router.push('/auth/student-login');
    }
  }, []);

  const loadStudentData = async (childId: string) => {
    try {
      // Load child info
      const childRes = await fetch(`/api/whale/children/${childId}`);
      if (childRes.ok) {
        const childData = await childRes.json();
        setChildInfo(childData.data);
      }

      // Load progress summary
      const progressRes = await fetch(`/api/student/progress-summary?childId=${childId}`);
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setProgress(progressData.data || progress);
      }

      // Load badges
      const badgesRes = await fetch(`/api/student/badges?childId=${childId}`);
      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        setBadges(badgesData.data || []);
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('student_session');
    router.push('/auth/student-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐋</div>
          <p className="text-xl text-slate-700">Loading...</p>
        </div>
      </div>
    );
  }

  const games = [
    {
      name: 'Letter Sounds',
      path: '/student/games/letter-sounds',
      icon: '🔤',
      color: 'from-blue-500 to-blue-600',
      progress: progress.letterSounds,
      description: 'Learn A-Z sounds',
    },
    {
      name: 'Word Builder',
      path: '/student/games/word-builder',
      icon: '📝',
      color: 'from-green-500 to-green-600',
      progress: progress.wordBuilder,
      description: 'Build CVC words',
    },
    {
      name: 'Sentence Match',
      path: '/student/games/sentence-match',
      icon: '🖼️',
      color: 'from-purple-500 to-purple-600',
      progress: progress.sentenceMatch,
      description: 'Match pictures to sentences',
    },
    {
      name: 'Sentence Builder',
      path: '/student/games/sentence-builder',
      icon: '✍️',
      color: 'from-pink-500 to-pink-600',
      progress: progress.sentenceBuilder,
      description: 'Build sentences',
    },
    {
      name: 'Letter Match',
      path: '/student/games/letter-match',
      icon: '🔄',
      color: 'from-orange-500 to-orange-600',
      progress: progress.letterMatch,
      description: 'Match big and small letters',
    },
    {
      name: 'Letter Tracer',
      path: '/student/games/letter-tracer',
      icon: '✏️',
      color: 'from-indigo-500 to-indigo-600',
      progress: progress.letterTracer,
      description: 'Practice writing letters',
    },
  ];

  const avatarDisplay = childInfo?.photo_url || childInfo?.avatar_emoji || session?.avatar || '🐋';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 pb-20" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">
                {childInfo?.photo_url ? (
                  <img 
                    src={childInfo.photo_url} 
                    alt={session?.childName} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center text-4xl border-2 border-indigo-500">
                    {avatarDisplay}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Welcome, {session?.childName}! 👋
                </h1>
                <p className="text-sm text-slate-600">Let's learn and play!</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-100"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Progress Summary Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
              My Progress
            </h2>
            <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
              <span className="text-2xl">⭐</span>
              <span className="text-xl font-bold text-yellow-700">{childInfo?.total_stars || 0}</span>
            </div>
          </div>
          
          {/* Badges Section */}
          {badges.length > 0 && (
            <div className="mb-6 pb-6 border-b">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Badges Earned ({badges.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-2 rounded-lg border border-yellow-200 shadow-sm"
                    title={badge.badge_description}
                  >
                    <span className="text-2xl">{badge.badge_icon}</span>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{badge.badge_name}</div>
                      <div className="text-xs text-slate-600">{badge.badge_description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bars */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {games.map((game) => (
              <div key={game.path} className="text-center">
                <div className="text-3xl mb-2">{game.icon}</div>
                <div className="text-sm font-medium text-slate-700 mb-1">{game.name}</div>
                <div className="w-full bg-slate-200 rounded-full h-3 mb-1">
                  <div
                    className={`bg-gradient-to-r ${game.color} h-3 rounded-full transition-all`}
                    style={{ width: `${game.progress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-slate-500">{game.progress}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Games Grid */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Learning Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <Link
                key={game.path}
                href={game.path}
                className="group relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all transform hover:scale-105 border border-slate-100"
              >
                <div className={`bg-gradient-to-br ${game.color} p-8 text-center`}>
                  <div className="text-7xl mb-4 transform group-hover:scale-110 transition-transform">
                    {game.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{game.name}</h3>
                  <div className="text-white/90 text-sm">{game.description}</div>
                </div>
                
                {/* Progress Indicators */}
                {game.progress > 0 && (
                  <div className="absolute top-4 right-4 bg-yellow-400 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                    <span className="text-xl">⭐</span>
                  </div>
                )}
                {game.progress === 100 && (
                  <div className="absolute top-4 left-4 bg-green-500 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                    <span className="text-2xl">✓</span>
                  </div>
                )}
                
                {/* Progress Bar at Bottom */}
                {game.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-200">
                    <div
                      className={`h-full bg-gradient-to-r ${game.color} transition-all`}
                      style={{ width: `${game.progress}%` }}
                    ></div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

