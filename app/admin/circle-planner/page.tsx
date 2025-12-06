"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Song {
  id: string;
  title: string;
  type: string;
  lyrics?: string;
  youtubeUrl?: string;
  notes?: string;
}

interface Story {
  id: string;
  title: string;
  author?: string;
  type: string;
  description?: string;
  amazonUrl?: string;
  notes?: string;
}

interface Game {
  id: string;
  title: string;
  type: string;
  description: string;
  materials?: string;
  instructions?: string;
  printableUrl?: string;
  notes?: string;
}

interface Craft {
  id: string;
  title: string;
  materials: string;
  instructions: string;
  pinterestUrl?: string;
  notes?: string;
}

interface Printable {
  id: string;
  title: string;
  type: string;
  url?: string;
  description?: string;
  notes?: string;
}

interface DramaticPlay {
  id: string;
  title: string;
  setup: string;
  roles: string;
  props: string;
  notes?: string;
}

interface MovementActivity {
  id: string;
  title: string;
  description: string;
  examples?: string;
  materials?: string;
  notes?: string;
}

interface DailyPlan {
  focus: string;
  activities: string[];
}

interface Theme {
  id: string;
  name: string;
  weekStart: string;
  weekEnd: string;
  status: "current" | "upcoming" | "completed";
  color: string;
  emoji: string;
  description: string;
  discussionQuestions: string[];
  songs: Song[];
  stories: Story[];
  games: Game[];
  crafts: Craft[];
  printables: Printable[];
  dramaticPlay: DramaticPlay[];
  movementActivities: MovementActivity[];
  dailyPlan: {
    monday: DailyPlan;
    tuesday: DailyPlan;
    wednesday: DailyPlan;
    thursday: DailyPlan;
    friday: DailyPlan;
  };
  teacherNotes: string;
  createdAt: string;
  updatedAt: string;
}

type TabType = "overview" | "daily" | "songs" | "stories" | "games" | "crafts" | "printables" | "drama" | "movement";

export default function CirclePlannerPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedDay, setSelectedDay] = useState<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">("monday");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generateForm, setGenerateForm] = useState({
    themeName: "",
    weekStart: "",
    weekEnd: "",
    ageGroup: "kindergarten",
  });
  const router = useRouter();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/circle-plans");
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await response.json();
      setThemes(data.themes || []);
      
      // Auto-select current theme or first theme
      const currentTheme = data.themes?.find((t: Theme) => t.status === "current");
      if (currentTheme) {
        setSelectedTheme(currentTheme);
        setTeacherNotes(currentTheme.teacherNotes || "");
      } else if (data.themes?.length > 0) {
        setSelectedTheme(data.themes[0]);
        setTeacherNotes(data.themes[0].teacherNotes || "");
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveTeacherNotes = async () => {
    if (!selectedTheme) return;
    
    try {
      const response = await fetch("/api/circle-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTheme.id,
          teacherNotes: teacherNotes
        })
      });
      
      if (response.ok) {
        setEditingNotes(false);
        fetchPlans();
      }
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayDate = (dayName: string) => {
    if (!selectedTheme) return "";
    const start = new Date(selectedTheme.weekStart);
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const dayIndex = days.indexOf(dayName.toLowerCase());
    if (dayIndex === -1) return "";
    const date = new Date(start);
    date.setDate(start.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">📚</div>
          <p className="text-amber-800 text-xl font-semibold">Loading Circle Time Planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 text-white shadow-xl">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl drop-shadow-lg">🌈</div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Circle Time Planner</h1>
                <p className="text-amber-100 text-sm mt-1">Plan engaging lessons for your little learners</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin"
                className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl transition-all text-sm font-medium backdrop-blur-sm border border-white/20"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Theme Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span> Weekly Themes
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  setSelectedTheme(theme);
                  setTeacherNotes(theme.teacherNotes || "");
                  setActiveTab("overview");
                }}
                className={`flex-shrink-0 p-5 rounded-2xl border-2 transition-all min-w-[220px] text-left ${
                  selectedTheme?.id === theme.id
                    ? "border-amber-400 bg-white shadow-xl scale-105"
                    : "border-transparent bg-white/70 hover:bg-white hover:shadow-lg"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{theme.emoji}</span>
                  <div>
                    <div className="font-bold text-amber-900 text-lg">{theme.name}</div>
                    <div className="text-xs text-amber-600">
                      {formatDate(theme.weekStart)} - {formatDate(theme.weekEnd)}
                    </div>
                  </div>
                </div>
                <div className={`text-xs px-3 py-1 rounded-full inline-block font-semibold ${
                  theme.status === "current" 
                    ? "bg-green-100 text-green-700" 
                    : theme.status === "upcoming"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {theme.status === "current" ? "📍 This Week" : theme.status === "upcoming" ? "⏭️ Next Week" : "✓ Completed"}
                </div>
              </button>
            ))}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-shrink-0 p-5 rounded-2xl border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 hover:border-purple-400 transition-all min-w-[180px] flex flex-col items-center justify-center gap-2"
            >
              <span className="text-4xl">✨</span>
              <span className="text-amber-700 font-semibold">Add New Theme</span>
            </button>
          </div>
        </div>

        {selectedTheme && (
          <>
            {/* Theme Header */}
            <div 
              className="rounded-3xl p-6 mb-6 text-white shadow-xl"
              style={{ background: `linear-gradient(135deg, ${selectedTheme.color}, ${selectedTheme.color}dd)` }}
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-6xl drop-shadow-lg">{selectedTheme.emoji}</span>
                <div>
                  <h2 className="text-4xl font-bold">{selectedTheme.name}</h2>
                  <p className="text-white/80 text-lg mt-1">{selectedTheme.description}</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-2xl shadow-lg mb-6 p-2 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {[
                  { id: "overview", label: "Overview", icon: "📋" },
                  { id: "daily", label: "Daily Plans", icon: "📆" },
                  { id: "songs", label: "Songs", icon: "🎵" },
                  { id: "stories", label: "Stories", icon: "📖" },
                  { id: "games", label: "Games", icon: "🎮" },
                  { id: "crafts", label: "Crafts", icon: "✂️" },
                  { id: "printables", label: "Printables", icon: "🖨️" },
                  { id: "drama", label: "Dramatic Play", icon: "🎭" },
                  { id: "movement", label: "Movement", icon: "🏃" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                        : "text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl p-5 text-center">
                      <div className="text-4xl mb-2">🎵</div>
                      <div className="text-3xl font-bold text-rose-700">{selectedTheme.songs.length}</div>
                      <div className="text-rose-600 text-sm font-medium">Songs</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-5 text-center">
                      <div className="text-4xl mb-2">📖</div>
                      <div className="text-3xl font-bold text-indigo-700">{selectedTheme.stories.length}</div>
                      <div className="text-indigo-600 text-sm font-medium">Stories</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl p-5 text-center">
                      <div className="text-4xl mb-2">🎮</div>
                      <div className="text-3xl font-bold text-emerald-700">{selectedTheme.games.length}</div>
                      <div className="text-emerald-600 text-sm font-medium">Games</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl p-5 text-center">
                      <div className="text-4xl mb-2">✂️</div>
                      <div className="text-3xl font-bold text-violet-700">{selectedTheme.crafts.length}</div>
                      <div className="text-violet-600 text-sm font-medium">Crafts</div>
                    </div>
                  </div>

                  {/* Discussion Questions */}
                  <div>
                    <h3 className="text-2xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                      <span className="text-3xl">💬</span> Discussion Questions
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {selectedTheme.discussionQuestions.map((question, i) => (
                        <div 
                          key={i} 
                          className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border-l-4 border-amber-400"
                        >
                          <span className="text-amber-500 font-bold mr-2">{i + 1}.</span>
                          <span className="text-amber-900">{question}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teacher Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                        <span className="text-3xl">📝</span> My Notes
                      </h3>
                      {!editingNotes && (
                        <button
                          onClick={() => setEditingNotes(true)}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          ✏️ Edit Notes
                        </button>
                      )}
                    </div>
                    {editingNotes ? (
                      <div className="space-y-3">
                        <textarea
                          value={teacherNotes}
                          onChange={(e) => setTeacherNotes(e.target.value)}
                          className="w-full h-40 p-4 border-2 border-amber-200 rounded-xl focus:border-amber-400 focus:outline-none resize-none"
                          placeholder="Add your personal notes, reminders, or observations here..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveTeacherNotes}
                            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                          >
                            💾 Save Notes
                          </button>
                          <button
                            onClick={() => {
                              setEditingNotes(false);
                              setTeacherNotes(selectedTheme.teacherNotes || "");
                            }}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 min-h-[100px]">
                        {teacherNotes ? (
                          <p className="text-amber-900 whitespace-pre-wrap">{teacherNotes}</p>
                        ) : (
                          <p className="text-amber-400 italic">No notes yet. Click &quot;Edit Notes&quot; to add your own!</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Daily Plans Tab */}
              {activeTab === "daily" && (
                <div>
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {["monday", "tuesday", "wednesday", "thursday", "friday"].map((day) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day as typeof selectedDay)}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all capitalize flex-shrink-0 ${
                          selectedDay === day
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        <div>{day}</div>
                        <div className="text-xs opacity-80">{getDayDate(day)}</div>
                      </button>
                    ))}
                  </div>

                  {selectedTheme.dailyPlan[selectedDay] && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-6">
                        <h4 className="text-xl font-bold text-amber-900 mb-2 flex items-center gap-2">
                          <span className="text-2xl">🎯</span> Focus: {selectedTheme.dailyPlan[selectedDay].focus}
                        </h4>
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-bold text-amber-900 mb-4">Daily Schedule</h4>
                        <div className="space-y-3">
                          {selectedTheme.dailyPlan[selectedDay].activities.map((activity, i) => (
                            <div 
                              key={i} 
                              className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-amber-100 hover:border-amber-300 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold shadow-md">
                                {i + 1}
                              </div>
                              <p className="text-amber-900 font-medium">{activity}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Songs Tab */}
              {activeTab === "songs" && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
                    <span className="text-3xl">🎵</span> Songs & Music ({selectedTheme.songs.length})
                  </h3>
                  {selectedTheme.songs.map((song) => (
                    <div key={song.id} className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-xl font-bold text-rose-900">{song.title}</h4>
                          <span className="text-xs bg-rose-200 text-rose-700 px-2 py-1 rounded-full font-medium">
                            {song.type === "action-song" ? "🏃 Action Song" : "🎤 Sing-along"}
                          </span>
                        </div>
                        {song.youtubeUrl && (
                          <a
                            href={song.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2"
                          >
                            <span>▶️</span> Play on YouTube
                          </a>
                        )}
                      </div>
                      {song.lyrics && (
                        <div className="bg-white/70 rounded-xl p-4 mb-3">
                          <p className="text-rose-800 italic whitespace-pre-line">&quot;{song.lyrics}&quot;</p>
                        </div>
                      )}
                      {song.notes && (
                        <div className="flex items-start gap-2 text-rose-700">
                          <span>💡</span>
                          <p className="text-sm">{song.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Stories Tab */}
              {activeTab === "stories" && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
                    <span className="text-3xl">📖</span> Stories & Books ({selectedTheme.stories.length})
                  </h3>
                  {selectedTheme.stories.map((story) => (
                    <div key={story.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-xl font-bold text-indigo-900">{story.title}</h4>
                          {story.author && (
                            <p className="text-indigo-600">by {story.author}</p>
                          )}
                        </div>
                        {story.amazonUrl && (
                          <a
                            href={story.amazonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
                          >
                            📚 Find Book
                          </a>
                        )}
                      </div>
                      {story.description && (
                        <p className="text-indigo-800 mb-3">{story.description}</p>
                      )}
                      {story.notes && (
                        <div className="flex items-start gap-2 text-indigo-700 bg-white/70 rounded-xl p-3">
                          <span>💡</span>
                          <p className="text-sm">{story.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Games Tab */}
              {activeTab === "games" && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
                    <span className="text-3xl">🎮</span> Games & Activities ({selectedTheme.games.length})
                  </h3>
                  {selectedTheme.games.map((game) => (
                    <div key={game.id} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-xl font-bold text-emerald-900">{game.title}</h4>
                          <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-1 rounded-full font-medium">
                            {game.type.replace("-", " ")}
                          </span>
                        </div>
                        {game.printableUrl && (
                          <a
                            href={game.printableUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
                          >
                            🖨️ Get Printable
                          </a>
                        )}
                      </div>
                      <p className="text-emerald-800 mb-3">{game.description}</p>
                      {game.materials && (
                        <div className="bg-white/70 rounded-xl p-3 mb-3">
                          <p className="text-sm text-emerald-700"><strong>Materials:</strong> {game.materials}</p>
                        </div>
                      )}
                      {game.instructions && (
                        <div className="bg-emerald-100 rounded-xl p-3 mb-3">
                          <p className="text-sm text-emerald-800"><strong>How to play:</strong> {game.instructions}</p>
                        </div>
                      )}
                      {game.notes && (
                        <div className="flex items-start gap-2 text-emerald-700">
                          <span>💡</span>
                          <p className="text-sm">{game.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Crafts Tab */}
              {activeTab === "crafts" && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
                    <span className="text-3xl">✂️</span> Craft Activities ({selectedTheme.crafts.length})
                  </h3>
                  {selectedTheme.crafts.map((craft) => (
                    <div key={craft.id} className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-200">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="text-xl font-bold text-violet-900">{craft.title}</h4>
                        {craft.pinterestUrl && (
                          <a
                            href={craft.pinterestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#E60023] hover:bg-[#c7001f] text-white px-4 py-2 rounded-xl font-semibold transition-colors"
                          >
                            📌 See Examples
                          </a>
                        )}
                      </div>
                      <div className="bg-white/70 rounded-xl p-4 mb-4">
                        <p className="text-sm text-violet-700 font-semibold mb-1">📦 Materials Needed:</p>
                        <p className="text-violet-800">{craft.materials}</p>
                      </div>
                      <div className="bg-violet-100 rounded-xl p-4 mb-3">
                        <p className="text-sm text-violet-700 font-semibold mb-2">📝 Instructions:</p>
                        <p className="text-violet-800 whitespace-pre-line">{craft.instructions}</p>
                      </div>
                      {craft.notes && (
                        <div className="flex items-start gap-2 text-violet-700">
                          <span>💡</span>
                          <p className="text-sm">{craft.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Printables Tab */}
              {activeTab === "printables" && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
                    <span className="text-3xl">🖨️</span> Printable Materials ({selectedTheme.printables.length})
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedTheme.printables.map((printable) => (
                      <div key={printable.id} className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-2xl p-6 border border-cyan-200">
                        <h4 className="text-lg font-bold text-sky-900 mb-2">{printable.title}</h4>
                        <span className="text-xs bg-sky-200 text-sky-700 px-2 py-1 rounded-full font-medium">
                          {printable.type}
                        </span>
                        {printable.description && (
                          <p className="text-sky-800 mt-3 mb-3">{printable.description}</p>
                        )}
                        {printable.notes && (
                          <div className="flex items-start gap-2 text-sky-700 mb-3">
                            <span>💡</span>
                            <p className="text-sm">{printable.notes}</p>
                          </div>
                        )}
                        {printable.url && (
                          <a
                            href={printable.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors mt-2"
                          >
                            🔗 Get Printable
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dramatic Play Tab */}
              {activeTab === "drama" && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
                    <span className="text-3xl">🎭</span> Dramatic Play Ideas ({selectedTheme.dramaticPlay.length})
                  </h3>
                  {selectedTheme.dramaticPlay.map((drama) => (
                    <div key={drama.id} className="bg-gradient-to-r from-fuchsia-50 to-pink-50 rounded-2xl p-6 border border-fuchsia-200">
                      <h4 className="text-xl font-bold text-fuchsia-900 mb-4">{drama.title}</h4>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white/70 rounded-xl p-4">
                          <p className="text-sm text-fuchsia-700 font-semibold mb-2">🏗️ Setup:</p>
                          <p className="text-fuchsia-800">{drama.setup}</p>
                        </div>
                        <div className="bg-white/70 rounded-xl p-4">
                          <p className="text-sm text-fuchsia-700 font-semibold mb-2">👥 Roles:</p>
                          <p className="text-fuchsia-800">{drama.roles}</p>
                        </div>
                      </div>
                      <div className="bg-fuchsia-100 rounded-xl p-4 mb-3">
                        <p className="text-sm text-fuchsia-700 font-semibold mb-2">🎪 Props Needed:</p>
                        <p className="text-fuchsia-800">{drama.props}</p>
                      </div>
                      {drama.notes && (
                        <div className="flex items-start gap-2 text-fuchsia-700">
                          <span>💡</span>
                          <p className="text-sm">{drama.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Movement Tab */}
              {activeTab === "movement" && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
                    <span className="text-3xl">🏃</span> Movement Activities ({selectedTheme.movementActivities.length})
                  </h3>
                  {selectedTheme.movementActivities.map((activity) => (
                    <div key={activity.id} className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
                      <h4 className="text-xl font-bold text-orange-900 mb-3">{activity.title}</h4>
                      <p className="text-orange-800 mb-3">{activity.description}</p>
                      {activity.examples && (
                        <div className="bg-white/70 rounded-xl p-4 mb-3">
                          <p className="text-sm text-orange-700 font-semibold mb-1">🎯 Examples:</p>
                          <p className="text-orange-800 italic">{activity.examples}</p>
                        </div>
                      )}
                      {activity.materials && (
                        <div className="bg-orange-100 rounded-xl p-3 mb-3">
                          <p className="text-sm text-orange-800"><strong>Materials:</strong> {activity.materials}</p>
                        </div>
                      )}
                      {activity.notes && (
                        <div className="flex items-start gap-2 text-orange-700">
                          <span>💡</span>
                          <p className="text-sm">{activity.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedTheme && themes.length === 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <div className="text-8xl mb-6">📚</div>
            <h2 className="text-3xl font-bold text-amber-900 mb-4">Welcome to Circle Time Planner!</h2>
            <p className="text-amber-600 text-lg mb-8">
              Start by creating your first weekly theme to organize your lessons.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
            >
              <span>✨</span>
              <span>Generate First Theme with AI</span>
            </button>
          </div>
        )}
      </main>

      {/* Print-friendly footer */}
      <footer className="bg-amber-100 border-t border-amber-200 py-4 mt-12 print:hidden">
        <div className="container mx-auto px-4 text-center text-amber-700">
          <p>🌈 Happy Teaching! Remember: Every child is unique and learns differently.</p>
        </div>
      </footer>

      {/* Generate Theme Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                <span className="text-3xl">✨</span> Generate New Theme with AI
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setGenerateError("");
                  setGenerateForm({ themeName: "", weekStart: "", weekEnd: "", ageGroup: "kindergarten" });
                }}
                className="text-amber-600 hover:text-amber-800 text-2xl"
                disabled={generating}
              >
                ×
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 mb-6 border border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>🤖 AI-Powered Generation:</strong> Claude will create a complete theme package including songs, stories, games, crafts, dramatic play ideas, movement activities, and a full 5-day plan!
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!generateForm.themeName || !generateForm.weekStart || !generateForm.weekEnd) {
                  setGenerateError("Please fill in all required fields");
                  return;
                }

                setGenerating(true);
                setGenerateError("");

                try {
                  const response = await fetch("/api/circle-plans/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      themeName: generateForm.themeName,
                      weekStart: generateForm.weekStart,
                      weekEnd: generateForm.weekEnd,
                      ageGroup: generateForm.ageGroup,
                    }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(data.error || "Failed to generate theme");
                  }

                  // Success! Refresh themes and close modal
                  await fetchPlans();
                  setShowAddModal(false);
                  setGenerateForm({ themeName: "", weekStart: "", weekEnd: "", ageGroup: "kindergarten" });
                  
                  // Select the newly generated theme
                  if (data.theme) {
                    setSelectedTheme(data.theme);
                    setTeacherNotes(data.theme.teacherNotes || "");
                  }
                } catch (error) {
                  console.error("Error generating theme:", error);
                  const errorMessage = error instanceof Error ? error.message : "Unknown error";
                  setGenerateError(errorMessage);
                } finally {
                  setGenerating(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-2">
                  Theme Name *
                </label>
                <input
                  type="text"
                  value={generateForm.themeName}
                  onChange={(e) => setGenerateForm({ ...generateForm, themeName: e.target.value })}
                  placeholder="e.g., Ocean Animals, Space Exploration, Farm Life"
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                  required
                  disabled={generating}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-2">
                    Week Start *
                  </label>
                  <input
                    type="date"
                    value={generateForm.weekStart}
                    onChange={(e) => setGenerateForm({ ...generateForm, weekStart: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                    required
                    disabled={generating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-2">
                    Week End *
                  </label>
                  <input
                    type="date"
                    value={generateForm.weekEnd}
                    onChange={(e) => setGenerateForm({ ...generateForm, weekEnd: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                    required
                    disabled={generating}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-2">
                  Age Group
                </label>
                <select
                  value={generateForm.ageGroup}
                  onChange={(e) => setGenerateForm({ ...generateForm, ageGroup: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                  disabled={generating}
                >
                  <option value="preschool">Preschool (3-4 years)</option>
                  <option value="kindergarten">Kindergarten (5-6 years)</option>
                  <option value="early-elementary">Early Elementary (6-7 years)</option>
                </select>
              </div>

              {generateError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-red-800 text-sm">
                    <strong>Error:</strong> {generateError}
                    {generateError.includes("ANTHROPIC_API_KEY") && (
                      <span className="block mt-2 text-xs">
                        Please add your Anthropic API key to Vercel environment variables.
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setGenerateError("");
                    setGenerateForm({ themeName: "", weekStart: "", weekEnd: "", ageGroup: "kindergarten" });
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold transition-colors"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || !generateForm.themeName || !generateForm.weekStart || !generateForm.weekEnd}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Generate Theme</span>
                    </>
                  )}
                </button>
              </div>

              {generating && (
                <div className="text-center pt-4">
                  <p className="text-sm text-amber-600">
                    This may take 30-60 seconds. Please don't close this window...
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




