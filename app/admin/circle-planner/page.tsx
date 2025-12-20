"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music, Image, Video, FileText } from "lucide-react";

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

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
  uploadedAt?: string;
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
  files?: UploadedFile[];
  createdAt: string;
  updatedAt: string;
}

type TabType = "overview" | "materials" | "daily" | "songs" | "stories" | "games" | "crafts" | "printables" | "drama" | "movement";

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [deletingThemeId, setDeletingThemeId] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [classProfile, setClassProfile] = useState({
    classSize: 15,
    englishLevel: "beginner",
    phonicsGoals: "",
    learningGoals: "",
    availableMaterials: "Basic art supplies (paper, crayons, glue, scissors), simple props for dramatic play",
    specialNeeds: "",
  });
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
      
      // Load class profile/settings
      if (data.settings) {
        setClassProfile({
          classSize: data.settings.classSize || 15,
          englishLevel: data.settings.englishLevel || "beginner",
          phonicsGoals: data.settings.phonicsGoals || "",
          learningGoals: data.settings.learningGoals || "",
          availableMaterials: data.settings.availableMaterials || "Basic art supplies (paper, crayons, glue, scissors), simple props for dramatic play",
          specialNeeds: data.settings.specialNeeds || "",
        });
      }
      
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

  const deleteTheme = async (themeId: string, themeName: string) => {
    if (!confirm(`Are you sure you want to delete "${themeName}"? This cannot be undone.`)) {
      return;
    }

    setDeletingThemeId(themeId);
    try {
      const response = await fetch(`/api/circle-plans?id=${themeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // If we deleted the selected theme, clear selection
        if (selectedTheme?.id === themeId) {
          setSelectedTheme(null);
          setTeacherNotes("");
        }
        // Refresh themes list
        await fetchPlans();
      } else {
        const data = await response.json();
        alert(`Failed to delete theme: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting theme:", error);
      alert("Failed to delete theme. Please try again.");
    } finally {
      setDeletingThemeId(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedTheme) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("themeId", selectedTheme.id);

      const response = await fetch("/api/circle-plans/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      const newFile = data.file;

      // Update theme with new file
      const updatedFiles = [...(selectedTheme.files || []), newFile];
      
      const updateResponse = await fetch("/api/circle-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTheme.id,
          files: updatedFiles,
        }),
      });

      if (updateResponse.ok) {
        await fetchPlans();
        setShowFileUpload(false);
      } else {
        throw new Error("Failed to save file metadata");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileDelete = async (file: UploadedFile) => {
    if (!selectedTheme) return;
    if (!confirm(`Delete "${file.name}"?`)) return;

    try {
      // Delete from storage
      const deleteResponse = await fetch(`/api/circle-plans/files/delete?path=${encodeURIComponent(file.path)}`, {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        throw new Error("Failed to delete file");
      }

      // Update theme to remove file
      const updatedFiles = (selectedTheme.files || []).filter(f => f.id !== file.id);
      
      const updateResponse = await fetch("/api/circle-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTheme.id,
          files: updatedFiles,
        }),
      });

      if (updateResponse.ok) {
        await fetchPlans();
      } else {
        throw new Error("Failed to update theme");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
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

  // Get activity details and find related resources
  const getActivityDetails = (activity: string) => {
    if (!selectedTheme) return null;
    
    const activityLower = activity.toLowerCase();
    const details: {
      type: string;
      icon: string;
      color: string;
      duration: string;
      tips: string[];
      relatedSong?: Song;
      relatedStory?: Story;
      relatedGame?: Game;
      relatedMovement?: MovementActivity;
    } = {
      type: "activity",
      icon: "📌",
      color: "amber",
      duration: "",
      tips: [],
    };

    // Extract duration from parentheses
    const durationMatch = activity.match(/\((\d+)\s*min\)/i);
    if (durationMatch) {
      details.duration = `${durationMatch[1]} minutes`;
    }

    // Determine activity type and find related resources
    if (activityLower.includes("song") || activityLower.includes("music") || activityLower.includes("sing")) {
      details.type = "song";
      details.icon = "🎵";
      details.color = "rose";
      details.tips = [
        "Have children stand in a circle for action songs",
        "Use hand motions to reinforce vocabulary",
        "Repeat songs 2-3 times for familiarity"
      ];
      // Find a matching song
      details.relatedSong = selectedTheme.songs[0];
    } else if (activityLower.includes("story") || activityLower.includes("book") || activityLower.includes("read")) {
      details.type = "story";
      details.icon = "📖";
      details.color = "indigo";
      details.tips = [
        "Show pictures to all children",
        "Ask prediction questions before turning pages",
        "Use different voices for characters"
      ];
      details.relatedStory = selectedTheme.stories[0];
    } else if (activityLower.includes("game") || activityLower.includes("play")) {
      details.type = "game";
      details.icon = "🎮";
      details.color = "emerald";
      details.tips = [
        "Demonstrate the game before playing",
        "Start with simple rules, add complexity",
        "Praise participation, not just winning"
      ];
      details.relatedGame = selectedTheme.games[0];
    } else if (activityLower.includes("movement") || activityLower.includes("dance") || activityLower.includes("exercise")) {
      details.type = "movement";
      details.icon = "🏃";
      details.color = "orange";
      details.tips = [
        "Clear space for safe movement",
        "Model movements first",
        "Encourage creativity in movements"
      ];
      details.relatedMovement = selectedTheme.movementActivities[0];
    } else if (activityLower.includes("discussion") || activityLower.includes("question") || activityLower.includes("talk")) {
      details.type = "discussion";
      details.icon = "💬";
      details.color = "purple";
      details.tips = [
        "Give children time to think before answering",
        "Accept all answers positively",
        "Use the theme's discussion questions"
      ];
    } else if (activityLower.includes("craft") || activityLower.includes("art") || activityLower.includes("create")) {
      details.type = "craft";
      details.icon = "✂️";
      details.color = "violet";
      details.tips = [
        "Prepare all materials before circle time",
        "Show a finished example",
        "Focus on process, not perfection"
      ];
    } else if (activityLower.includes("flashcard") || activityLower.includes("picture") || activityLower.includes("visual")) {
      details.type = "flashcard";
      details.icon = "🖼️";
      details.color = "cyan";
      details.tips = [
        "Hold cards high for all to see",
        "Ask children to name/describe pictures",
        "Use repetition for vocabulary building"
      ];
    } else if (activityLower.includes("welcome") || activityLower.includes("hello") || activityLower.includes("opening")) {
      details.type = "welcome";
      details.icon = "👋";
      details.color = "amber";
      details.tips = [
        "Greet each child by name",
        "Use a consistent opening routine",
        "Set expectations for circle time behavior"
      ];
    } else if (activityLower.includes("goodbye") || activityLower.includes("closing") || activityLower.includes("wrap")) {
      details.type = "closing";
      details.icon = "🌟";
      details.color = "amber";
      details.tips = [
        "Summarize what was learned",
        "Preview tomorrow's activities",
        "End with a familiar goodbye song/chant"
      ];
    } else if (activityLower.includes("role") || activityLower.includes("pretend") || activityLower.includes("drama")) {
      details.type = "drama";
      details.icon = "🎭";
      details.color = "fuchsia";
      details.tips = [
        "Set up props before starting",
        "Assign roles or let children choose",
        "Join in the play to model language"
      ];
    } else if (activityLower.includes("review") || activityLower.includes("share")) {
      details.type = "review";
      details.icon = "📝";
      details.color = "teal";
      details.tips = [
        "Ask open-ended questions about the week",
        "Let children share their favorite activities",
        "Celebrate their learning achievements"
      ];
    }

    return details;
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
    <div 
      className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
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
              <button
                onClick={() => setShowSettingsModal(true)}
                className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl transition-all text-sm font-medium backdrop-blur-sm border border-white/20 flex items-center gap-2"
                title="Edit Class Profile"
              >
                <span>👥</span>
                <span>Class Profile</span>
              </button>
              <Link
                href="/admin"
                prefetch={false}
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
              <div
                key={theme.id}
                className="flex-shrink-0 relative group"
              >
                <button
                  onClick={() => {
                    setSelectedTheme(theme);
                    setTeacherNotes(theme.teacherNotes || "");
                    setActiveTab("overview");
                  }}
                  className={`w-full p-5 rounded-2xl border-2 transition-all min-w-[220px] text-left ${
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTheme(theme.id, theme.name);
                  }}
                  disabled={deletingThemeId === theme.id}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="Delete theme"
                >
                  {deletingThemeId === theme.id ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span>🗑️</span>
                  )}
                </button>
              </div>
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
                  { id: "materials", label: "Materials", icon: "📚" },
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

                  {/* Files Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                        <span className="text-3xl">📎</span> Files & Documents
                      </h3>
                      <button
                        onClick={() => setShowFileUpload(true)}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <span>📤</span>
                        <span>Upload File</span>
                      </button>
                    </div>
                    {selectedTheme.files && selectedTheme.files.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {selectedTheme.files.map((file) => (
                          <div key={file.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-3xl">📄</span>
                              <div className="flex-1 min-w-0">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-900 font-medium hover:text-indigo-700 truncate block"
                                >
                                  {file.name}
                                </a>
                                <p className="text-indigo-600 text-sm">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleFileDelete(file)}
                              className="text-red-500 hover:text-red-700 p-2"
                              title="Delete file"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 text-center">
                        <p className="text-indigo-400 italic">No files uploaded yet. Click &quot;Upload File&quot; to add documents, PDFs, or images!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Materials Tab */}
              {activeTab === "materials" && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-indigo-900 mb-2">📚 Class Materials for {selectedTheme.name}</h3>
                    <p className="text-indigo-600">Upload worksheets, PDFs, audio files, and other materials specific to this theme</p>
                  </div>

                  {/* Files Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                        <span className="text-2xl">📎</span> Files & Documents
                      </h4>
                      <button
                        onClick={() => setShowFileUpload(true)}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md flex items-center gap-2"
                      >
                        <span>📤</span>
                        <span>Upload File</span>
                      </button>
                    </div>
                    {selectedTheme.files && selectedTheme.files.length > 0 ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedTheme.files.map((file) => (
                          <div key={file.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {getFileIcon(file.type)}
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-900 font-semibold hover:text-indigo-700 truncate block text-sm"
                                  >
                                    {file.name}
                                  </a>
                                  <p className="text-indigo-600 text-xs">{formatFileSize(file.size)}</p>
                                  {file.uploadedAt && (
                                    <p className="text-indigo-500 text-xs">{new Date(file.uploadedAt).toLocaleDateString()}</p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleFileDelete(file)}
                                className="text-red-500 hover:text-red-700 p-1 ml-2"
                                title="Delete file"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-xl border border-indigo-200 text-center">
                        <div className="text-4xl mb-4">📚</div>
                        <p className="text-indigo-700 font-medium mb-2">No materials uploaded yet</p>
                        <p className="text-indigo-400 text-sm mb-4">Upload worksheets, PDFs, audio files, or other teaching materials for this theme</p>
                        <button
                          onClick={() => setShowFileUpload(true)}
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md inline-flex items-center gap-2"
                        >
                          <span>📤</span>
                          <span>Upload Your First File</span>
                        </button>
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
                        onClick={() => {
                          setSelectedDay(day as typeof selectedDay);
                          setExpandedActivity(null);
                        }}
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
                        <h4 className="text-lg font-bold text-amber-900 mb-4">30-Minute Circle Time Schedule</h4>
                        <p className="text-sm text-amber-600 mb-4">👆 Click on any activity to see detailed instructions and tips</p>
                        <div className="space-y-3">
                          {selectedTheme.dailyPlan[selectedDay].activities.map((activity, i) => {
                            const activityKey = `${selectedDay}-${i}`;
                            const isExpanded = expandedActivity === activityKey;
                            const details = getActivityDetails(activity);
                            
                            return (
                              <div key={i} className="transition-all">
                                <button
                                  onClick={() => setExpandedActivity(isExpanded ? null : activityKey)}
                                  className={`w-full text-left flex items-center gap-4 p-4 bg-white rounded-xl border-2 transition-all ${
                                    isExpanded 
                                      ? "border-amber-400 shadow-lg" 
                                      : "border-amber-100 hover:border-amber-300"
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold shadow-md flex-shrink-0">
                                    {i + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">{details?.icon}</span>
                                      <p className="text-amber-900 font-medium">{activity}</p>
                                    </div>
                                  </div>
                                  <div className={`text-amber-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                                    ▼
                                  </div>
                                </button>
                                
                                {isExpanded && details && (
                                  <div className="mt-2 ml-14 p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 space-y-4">
                                    {/* Duration */}
                                    {details.duration && (
                                      <div className="flex items-center gap-2 text-amber-700">
                                        <span>⏱️</span>
                                        <span className="font-semibold">Duration:</span>
                                        <span>{details.duration}</span>
                                      </div>
                                    )}

                                    {/* Tips */}
                                    <div>
                                      <h5 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                                        <span>💡</span> Tips for this activity:
                                      </h5>
                                      <ul className="space-y-2">
                                        {details.tips.map((tip, tipIndex) => (
                                          <li key={tipIndex} className="flex items-start gap-2 text-amber-800">
                                            <span className="text-amber-500">•</span>
                                            <span>{tip}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* Related Song */}
                                    {details.relatedSong && (
                                      <div className="bg-white rounded-lg p-4 border border-rose-200">
                                        <h5 className="font-bold text-rose-900 mb-2 flex items-center gap-2">
                                          <span>🎵</span> Suggested Song: {details.relatedSong.title}
                                        </h5>
                                        {details.relatedSong.lyrics && (
                                          <p className="text-rose-700 text-sm italic mb-2">&ldquo;{details.relatedSong.lyrics.substring(0, 150)}...&rdquo;</p>
                                        )}
                                        {details.relatedSong.notes && (
                                          <p className="text-rose-600 text-sm">📝 {details.relatedSong.notes}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Related Story */}
                                    {details.relatedStory && (
                                      <div className="bg-white rounded-lg p-4 border border-indigo-200">
                                        <h5 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                          <span>📖</span> Suggested Book: {details.relatedStory.title}
                                          {details.relatedStory.author && <span className="font-normal text-sm">by {details.relatedStory.author}</span>}
                                        </h5>
                                        {details.relatedStory.description && (
                                          <p className="text-indigo-700 text-sm mb-2">{details.relatedStory.description}</p>
                                        )}
                                        {details.relatedStory.notes && (
                                          <p className="text-indigo-600 text-sm">📝 {details.relatedStory.notes}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Related Game */}
                                    {details.relatedGame && (
                                      <div className="bg-white rounded-lg p-4 border border-emerald-200">
                                        <h5 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                                          <span>🎮</span> Suggested Game: {details.relatedGame.title}
                                        </h5>
                                        {details.relatedGame.description && (
                                          <p className="text-emerald-700 text-sm mb-2">{details.relatedGame.description}</p>
                                        )}
                                        {details.relatedGame.materials && (
                                          <p className="text-emerald-600 text-sm mb-1"><strong>Materials:</strong> {details.relatedGame.materials}</p>
                                        )}
                                        {details.relatedGame.instructions && (
                                          <p className="text-emerald-600 text-sm"><strong>How to play:</strong> {details.relatedGame.instructions}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Related Movement */}
                                    {details.relatedMovement && (
                                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                                        <h5 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                                          <span>🏃</span> Suggested Movement: {details.relatedMovement.title}
                                        </h5>
                                        {details.relatedMovement.description && (
                                          <p className="text-orange-700 text-sm mb-2">{details.relatedMovement.description}</p>
                                        )}
                                        {details.relatedMovement.examples && (
                                          <p className="text-orange-600 text-sm">🎯 {details.relatedMovement.examples}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* View more in tab */}
                                    <div className="pt-2 border-t border-amber-200">
                                      <p className="text-sm text-amber-600">
                                        💡 See the <strong>{details.type === "song" ? "Songs" : details.type === "story" ? "Stories" : details.type === "game" ? "Games" : "other"}</strong> tab for all related resources!
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
              <p className="text-sm text-purple-800 mb-2">
                <strong>🤖 AI-Powered Generation:</strong> Claude will create a complete theme package including songs, stories, games, crafts, dramatic play ideas, movement activities, and a full 5-day plan!
              </p>
              <p className="text-xs text-purple-700">
                💡 The AI considers your class profile below to generate personalized, age-appropriate activities.
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
                      classProfile: classProfile,
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

              {/* Class Profile Section */}
              <div className="border-t-2 border-amber-200 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                    <span>👥</span> Class Profile (Helps AI Generate Better Plans)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(true)}
                    className="text-xs text-amber-600 hover:text-amber-800 underline"
                    disabled={generating}
                  >
                    Edit Profile
                  </button>
                </div>
                
                <div className="bg-amber-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-900">Class Size:</span>
                    <span className="text-amber-700">{classProfile.classSize} children</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-900">English Level:</span>
                    <span className="text-amber-700 capitalize">{classProfile.englishLevel}</span>
                  </div>
                  {classProfile.phonicsGoals && (
                    <div>
                      <span className="font-semibold text-amber-900">Phonics Goals:</span>
                      <span className="text-amber-700 ml-2">{classProfile.phonicsGoals}</span>
                    </div>
                  )}
                  {classProfile.learningGoals && (
                    <div>
                      <span className="font-semibold text-amber-900">Learning Goals:</span>
                      <span className="text-amber-700 ml-2">{classProfile.learningGoals}</span>
                    </div>
                  )}
                  {themes.length > 0 && (
                    <div>
                      <span className="font-semibold text-amber-900">Previous Themes:</span>
                      <span className="text-amber-700 ml-2">{themes.slice(0, 3).map(t => t.name).join(", ")}</span>
                    </div>
                  )}
                </div>
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

      {/* Class Profile Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                <span className="text-3xl">👥</span> Class Profile Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-amber-600 hover:text-amber-800 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>💡 Why this matters:</strong> The AI uses this information to generate personalized themes that match your class's needs, English level, phonics goals, and available resources.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                // Save settings to API (we'll create this endpoint)
                try {
                  const response = await fetch("/api/circle-plans/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ settings: classProfile }),
                  });

                  if (response.ok) {
                    setShowSettingsModal(false);
                    // Refresh to get updated settings
                    await fetchPlans();
                  }
                } catch (error) {
                  console.error("Error saving settings:", error);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-2">
                    Class Size *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={classProfile.classSize}
                    onChange={(e) => setClassProfile({ ...classProfile, classSize: parseInt(e.target.value) || 15 })}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-2">
                    English Level *
                  </label>
                  <select
                    value={classProfile.englishLevel}
                    onChange={(e) => setClassProfile({ ...classProfile, englishLevel: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                    required
                  >
                    <option value="beginner">Beginner (ESL/New to English)</option>
                    <option value="intermediate">Intermediate (Some English)</option>
                    <option value="advanced">Advanced (Fluent English)</option>
                    <option value="mixed">Mixed Levels</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-2">
                  Phonics Goals
                </label>
                <textarea
                  value={classProfile.phonicsGoals}
                  onChange={(e) => setClassProfile({ ...classProfile, phonicsGoals: e.target.value })}
                  placeholder="e.g., Learning letter sounds A-F, blending CVC words, recognizing sight words"
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                  rows={3}
                />
                <p className="text-xs text-amber-600 mt-1">What phonics skills are you focusing on this term?</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-2">
                  Learning Goals
                </label>
                <textarea
                  value={classProfile.learningGoals}
                  onChange={(e) => setClassProfile({ ...classProfile, learningGoals: e.target.value })}
                  placeholder="e.g., Social skills, fine motor development, counting to 20, following directions"
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                  rows={3}
                />
                <p className="text-xs text-amber-600 mt-1">What are your main learning objectives for the class?</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-2">
                  Available Materials
                </label>
                <textarea
                  value={classProfile.availableMaterials}
                  onChange={(e) => setClassProfile({ ...classProfile, availableMaterials: e.target.value })}
                  placeholder="List materials you have available for activities"
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                  rows={3}
                />
                <p className="text-xs text-amber-600 mt-1">The AI will only suggest activities using these materials.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-2">
                  Special Considerations
                </label>
                <textarea
                  value={classProfile.specialNeeds}
                  onChange={(e) => setClassProfile({ ...classProfile, specialNeeds: e.target.value })}
                  placeholder="e.g., Children with sensory needs, limited space, outdoor activities preferred"
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 text-amber-900"
                  rows={2}
                />
                <p className="text-xs text-amber-600 mt-1">Any special needs or considerations for your class?</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-3 rounded-xl font-semibold transition-all shadow-lg"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showFileUpload && selectedTheme && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                <span className="text-3xl">📤</span> Upload File
              </h3>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-amber-600 hover:text-amber-800 text-2xl"
                disabled={uploadingFile}
              >
                ×
              </button>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>📎 Supported files:</strong> PDFs, images (JPG, PNG), Word documents, and other files up to 10MB.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const file = formData.get("file") as File | null;
                if (file) {
                  await handleFileUpload(file);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-2">
                  Select File
                </label>
                <input
                  name="file"
                  type="file"
                  required
                  disabled={uploadingFile}
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-400"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xls,.xlsx"
                />
                <p className="text-xs text-amber-600 mt-1">Max file size: 10MB</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFileUpload(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold transition-colors"
                  disabled={uploadingFile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50"
                >
                  {uploadingFile ? "⏳ Uploading..." : "📤 Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




