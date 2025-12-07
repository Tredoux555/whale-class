"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DailyGame {
  name: string;
  duration: string;
  objective: string;
  materials: string;
  setup: string;
  howToPlay: string[];
  teacherScript: string;
  inclusionTip: string;
  excitement: string;
}

interface PhonicssPlan {
  id: string;
  letters: string[];
  weekStart: string;
  weekEnd: string;
  status: string;
  color: string;
  description: string;
  letterSong: {
    title: string;
    lyrics: string;
    actions: string;
  };
  letterChant: {
    chant: string;
    rhythm: string;
  };
  dailyGames?: {
    monday: DailyGame;
    tuesday: DailyGame;
    wednesday: DailyGame;
    thursday: DailyGame;
    friday: DailyGame;
  };
  dailyPlan: {
    monday: { focus: string; game?: string; activities?: string[] };
    tuesday: { focus: string; game?: string; activities?: string[] };
    wednesday: { focus: string; game?: string; activities?: string[] };
    thursday: { focus: string; game?: string; activities?: string[] };
    friday: { focus: string; game?: string; activities?: string[] };
  };
  // Legacy fields for backward compatibility
  warmUp?: {
    name: string;
    duration: string;
    instructions: string;
  };
  mainGame?: {
    name: string;
    duration: string;
    description: string;
    materials: string;
    howToPlay: string;
    variations: string;
  };
  quickActivities?: Array<{
    name: string;
    duration: string;
    description: string;
    type: string;
  }>;
  tips: string[];
  createdAt: string;
}

type TabType = "overview" | "daily" | "games" | "songs";

export default function PhonicssPlannerPage() {
  const [plans, setPlans] = useState<PhonicssPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PhonicssPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedDay, setSelectedDay] = useState<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">("monday");
  const [showAddModal, setShowAddModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [generateForm, setGenerateForm] = useState({
    letters: [""],
    weekStart: "",
    weekEnd: "",
  });
  const router = useRouter();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/phonics-plans");
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await response.json();
      setPlans(data.plans || []);
      
      if (data.plans?.length > 0) {
        setSelectedPlan(data.plans[0]);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (planId: string, letters: string[]) => {
    if (!confirm(`Delete phonics plan for "${letters.join(", ")}"?`)) return;

    setDeletingPlanId(planId);
    try {
      const response = await fetch(`/api/phonics-plans?id=${planId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (selectedPlan?.id === planId) {
          setSelectedPlan(null);
        }
        await fetchPlans();
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete plan");
    } finally {
      setDeletingPlanId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayDate = (dayName: string) => {
    if (!selectedPlan) return "";
    const start = new Date(selectedPlan.weekStart);
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const dayIndex = days.indexOf(dayName.toLowerCase());
    if (dayIndex === -1) return "";
    const date = new Date(start);
    date.setDate(start.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const addLetterField = () => {
    if (generateForm.letters.length < 3) {
      setGenerateForm({
        ...generateForm,
        letters: [...generateForm.letters, ""],
      });
    }
  };

  const removeLetterField = (index: number) => {
    if (generateForm.letters.length > 1) {
      const newLetters = generateForm.letters.filter((_, i) => i !== index);
      setGenerateForm({ ...generateForm, letters: newLetters });
    }
  };

  const updateLetter = (index: number, value: string) => {
    const newLetters = [...generateForm.letters];
    newLetters[index] = value.toUpperCase().slice(0, 1);
    setGenerateForm({ ...generateForm, letters: newLetters });
  };

  // Get detailed instructions for each phonics activity
  const getPhonicsActivityDetails = (activity: string) => {
    if (!selectedPlan) return null;

    const activityLower = activity.toLowerCase();
    const letters = selectedPlan.letters.join(", ");
    
    const details: {
      type: string;
      icon: string;
      duration: string;
      detailedSteps: string[];
      tips: string[];
      relatedContent?: { type: string; content: any };
    } = {
      type: "activity",
      icon: "📌",
      duration: "",
      detailedSteps: [],
      tips: [],
    };

    // Extract duration
    const durationMatch = activity.match(/\((\d+)\s*min\)/i);
    if (durationMatch) {
      details.duration = `${durationMatch[1]} minutes`;
    }

    // Song activities
    if (activityLower.includes("song") || activityLower.includes("sing")) {
      details.type = "song";
      details.icon = "🎵";
      details.detailedSteps = [
        "Gather children in a circle, sitting comfortably",
        "Introduce the song: 'Today we're going to sing about the letter " + letters + "!'",
        "Demonstrate the song once with actions",
        "Invite children to join in - start slowly",
        "Repeat 2-3 times, getting faster/louder each time",
        "End with praise: 'Great singing! You're letter superstars!'"
      ];
      details.tips = [
        "Use exaggerated mouth movements when making the letter sound",
        "Add actions for each verse to keep children engaged",
        "Let children take turns being the 'song leader'"
      ];
      if (selectedPlan.letterSong) {
        details.relatedContent = { type: "song", content: selectedPlan.letterSong };
      }
    }
    // Chant activities
    else if (activityLower.includes("chant") || activityLower.includes("closing") || activityLower.includes("goodbye")) {
      details.type = "chant";
      details.icon = "🥁";
      details.detailedSteps = [
        "Have children stand up and get ready",
        "Demonstrate the rhythm pattern (clap, stomp, etc.)",
        "Say the chant slowly first, children repeat",
        "Add the rhythm/movement",
        "Speed up gradually as children learn it",
        "End with a big finish - arms up, cheer!"
      ];
      details.tips = [
        "Use a consistent rhythm pattern",
        "Make the letter sound LOUD and clear in the chant",
        "This is a great transition to end circle time"
      ];
      if (selectedPlan.letterChant) {
        details.relatedContent = { type: "chant", content: selectedPlan.letterChant };
      }
    }
    // Game activities
    else if (activityLower.includes("game") || activityLower.includes("hunt") || activityLower.includes("sorting")) {
      details.type = "game";
      details.icon = "🎮";
      details.detailedSteps = [
        "Explain the game rules simply: 'We're going to play a game with the letter " + letters + "!'",
        "Demonstrate with one example before starting",
        "Make sure all children can see the materials",
        "Play the first round together as a group",
        "Let children take turns or play in small groups",
        "Celebrate correct answers: 'Yes! That starts with " + letters + "!'",
        "If a child makes a mistake, gently redirect: 'Good try! Listen to the sound...'"
      ];
      details.tips = [
        "Keep the game moving - children have short attention spans",
        "Praise effort, not just correct answers",
        "Use visual cues alongside sounds"
      ];
      if (selectedPlan.mainGame) {
        details.relatedContent = { type: "game", content: selectedPlan.mainGame };
      }
    }
    // Warm-up activities
    else if (activityLower.includes("warm") || activityLower.includes("sound warm") || activityLower.includes("opening")) {
      details.type = "warmup";
      details.icon = "🌅";
      details.detailedSteps = [
        "Get children's attention: 'Let's warm up our mouths!'",
        "Start with mouth stretches: big smile, round O, tongue out",
        "Practice the letter sound: '" + letters + " says...'",
        "Have children repeat the sound 3 times",
        "Make it fun: whisper the sound, then shout it, then normal",
        "Connect to the day's focus: 'Today we're going to find things that start with " + letters + "!'"
      ];
      details.tips = [
        "Make exaggerated faces to show how to form the sound",
        "Use a mirror if possible so children can see their mouths",
        "Keep it energetic to capture attention"
      ];
      if (selectedPlan.warmUp) {
        details.relatedContent = { type: "warmup", content: selectedPlan.warmUp };
      }
    }
    // Flashcard activities
    else if (activityLower.includes("flashcard") || activityLower.includes("picture") || activityLower.includes("card")) {
      details.type = "flashcard";
      details.icon = "🖼️";
      details.detailedSteps = [
        "Hold up the first flashcard high so all can see",
        "Ask: 'What do you see in this picture?'",
        "Say the word clearly, emphasizing the " + letters + " sound",
        "Have children repeat: 'Apple! /a/ /a/ Apple!'",
        "Ask: 'What sound do you hear at the beginning?'",
        "Continue with 4-6 flashcards, keeping it quick",
        "End with a review: show cards quickly, children call out words"
      ];
      details.tips = [
        "Use pictures of familiar objects",
        "Keep a steady pace - don't linger too long on one card",
        "Let children take turns holding the cards"
      ];
    }
    // Movement activities
    else if (activityLower.includes("movement") || activityLower.includes("body") || activityLower.includes("air writing")) {
      details.type = "movement";
      details.icon = "🏃";
      details.detailedSteps = [
        "Have children stand with space around them",
        "Demonstrate: 'Watch me make the letter " + letters + " with my body/in the air!'",
        "Guide children step by step: 'First we go up... then down...'",
        "Practice together 3-4 times",
        "Make it fun: 'Now let's make a GIANT letter!'",
        "Add variations: make it tiny, make it with your elbow, etc."
      ];
      details.tips = [
        "Face the same direction as children so they can mirror you",
        "Use verbal cues: 'up, down, around'",
        "Connect movement to the letter sound: make the sound while forming"
      ];
    }
    // Review/sharing activities
    else if (activityLower.includes("review") || activityLower.includes("share") || activityLower.includes("learned") || activityLower.includes("favorite")) {
      details.type = "review";
      details.icon = "⭐";
      details.detailedSteps = [
        "Gather children in a comfortable circle",
        "Ask: 'What did we learn about the letter " + letters + " this week?'",
        "Give children time to think and respond",
        "Celebrate their answers: 'Yes! Great remembering!'",
        "Ask: 'What was your favorite activity?'",
        "End with: 'You are all " + letters + " superstars!'"
      ];
      details.tips = [
        "Use prompts if children are shy: 'Remember when we...'",
        "Praise all contributions",
        "Take a photo or do a special cheer to mark the celebration"
      ];
    }
    // Default/other activities
    else {
      details.detailedSteps = [
        "Get children's attention and explain what you'll do",
        "Demonstrate the activity first",
        "Guide children through step by step",
        "Encourage participation and praise effort",
        "Wrap up with a review of the " + letters + " sound"
      ];
      details.tips = [
        "Keep instructions simple and clear",
        "Use the letter sound throughout the activity",
        "Maintain a positive, encouraging tone"
      ];
    }

    return details;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">🔤</div>
          <p className="text-indigo-800 text-xl font-semibold">Loading Phonics Planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 text-white shadow-xl">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl drop-shadow-lg">🔤</div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Phonics Letter Planner</h1>
                <p className="text-indigo-100 text-sm mt-1">10-minute letter circle time activities</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/circle-planner"
                className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl transition-all text-sm font-medium backdrop-blur-sm border border-white/20"
              >
                🌈 Circle Planner
              </Link>
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
        {/* Plan Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span> Weekly Letter Plans
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex-shrink-0 relative group">
                <button
                  onClick={() => {
                    setSelectedPlan(plan);
                    setActiveTab("overview");
                  }}
                  className={`w-full p-5 rounded-2xl border-2 transition-all min-w-[200px] text-left ${
                    selectedPlan?.id === plan.id
                      ? "border-indigo-400 bg-white shadow-xl scale-105"
                      : "border-transparent bg-white/70 hover:bg-white hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-4xl font-bold text-indigo-600">
                      {plan.letters.join("")}
                    </div>
                    <div>
                      <div className="font-bold text-indigo-900">
                        {plan.letters.length === 1 ? "Letter" : "Letters"} {plan.letters.join(", ")}
                      </div>
                      <div className="text-xs text-indigo-600">
                        {formatDate(plan.weekStart)} - {formatDate(plan.weekEnd)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full inline-block font-semibold">
                    ⏱️ 10-min sessions
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePlan(plan.id, plan.letters);
                  }}
                  disabled={deletingPlanId === plan.id}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="Delete plan"
                >
                  {deletingPlanId === plan.id ? "⏳" : "🗑️"}
                </button>
              </div>
            ))}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-shrink-0 p-5 rounded-2xl border-2 border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all min-w-[180px] flex flex-col items-center justify-center gap-2"
            >
              <span className="text-4xl">✨</span>
              <span className="text-indigo-700 font-semibold">New Letter Week</span>
            </button>
          </div>
        </div>

        {selectedPlan && (
          <>
            {/* Plan Header */}
            <div 
              className="rounded-3xl p-6 mb-6 text-white shadow-xl"
              style={{ background: `linear-gradient(135deg, ${selectedPlan.color || '#6366f1'}, ${selectedPlan.color || '#6366f1'}dd)` }}
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-6xl font-bold drop-shadow-lg">{selectedPlan.letters.join("")}</span>
                <div>
                  <h2 className="text-4xl font-bold">
                    {selectedPlan.letters.length === 1 ? "Letter" : "Letters"} {selectedPlan.letters.join(" & ")}
                  </h2>
                  <p className="text-white/80 text-lg mt-1">{selectedPlan.description}</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-2xl shadow-lg mb-6 p-2 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {[
                  { id: "overview", label: "Overview", icon: "📋" },
                  { id: "daily", label: "Daily Plan", icon: "📆" },
                  { id: "games", label: "Games & Activities", icon: "🎮" },
                  { id: "songs", label: "Songs & Chants", icon: "🎵" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                        : "text-indigo-700 hover:bg-indigo-50"
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
                    <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-5 text-center">
                      <div className="text-4xl mb-2">⏱️</div>
                      <div className="text-3xl font-bold text-indigo-700">10</div>
                      <div className="text-indigo-600 text-sm font-medium">Minutes/Day</div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl p-5 text-center">
                      <div className="text-4xl mb-2">🎮</div>
                      <div className="text-3xl font-bold text-rose-700">1</div>
                      <div className="text-rose-600 text-sm font-medium">Main Game</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl p-5 text-center">
                      <div className="text-4xl mb-2">🎵</div>
                      <div className="text-3xl font-bold text-emerald-700">1</div>
                      <div className="text-emerald-600 text-sm font-medium">Letter Song</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-5 text-center">
                      <div className="text-4xl mb-2">⚡</div>
                      <div className="text-3xl font-bold text-amber-700">{selectedPlan.quickActivities?.length || 0}</div>
                      <div className="text-amber-600 text-sm font-medium">Quick Activities</div>
                    </div>
                  </div>

                  {/* Main Game Preview */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
                    <h3 className="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                      <span className="text-3xl">🎮</span> Main Game: {selectedPlan.mainGame?.name}
                    </h3>
                    <p className="text-indigo-700 mb-4">{selectedPlan.mainGame?.description}</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4">
                        <p className="text-sm font-semibold text-indigo-900 mb-1">📦 Materials:</p>
                        <p className="text-indigo-700">{selectedPlan.mainGame?.materials}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4">
                        <p className="text-sm font-semibold text-indigo-900 mb-1">⏱️ Duration:</p>
                        <p className="text-indigo-700">{selectedPlan.mainGame?.duration}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tips */}
                  <div>
                    <h3 className="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                      <span className="text-3xl">💡</span> Teaching Tips
                    </h3>
                    <div className="space-y-3">
                      {selectedPlan.tips?.map((tip, i) => (
                        <div key={i} className="bg-amber-50 p-4 rounded-xl border-l-4 border-amber-400">
                          <p className="text-amber-900">{tip}</p>
                        </div>
                      ))}
                    </div>
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
                            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                            : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        }`}
                      >
                        <div>{day}</div>
                        <div className="text-xs opacity-80">{getDayDate(day)}</div>
                      </button>
                    ))}
                  </div>

                  {selectedPlan.dailyPlan?.[selectedDay] && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl p-6">
                        <h4 className="text-xl font-bold text-indigo-900 mb-2 flex items-center gap-2">
                          <span className="text-2xl">🎯</span> Focus: {selectedPlan.dailyPlan[selectedDay].focus}
                        </h4>
                      </div>

                      {/* Today's Game - New Format */}
                      {selectedPlan.dailyGames?.[selectedDay] ? (
                        <div className="space-y-4">
                          <h4 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                            <span className="text-2xl">🎮</span> Today&apos;s Game
                          </h4>
                          
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
                            {/* Game Header */}
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-2xl font-bold text-emerald-900">
                                {selectedPlan.dailyGames[selectedDay].name}
                              </h3>
                              <span className="bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-sm font-semibold">
                                ⏱️ {selectedPlan.dailyGames[selectedDay].duration}
                              </span>
                            </div>

                            {/* What Makes It Fun */}
                            <div className="bg-yellow-100 rounded-xl p-4 mb-4 border border-yellow-300">
                              <p className="text-yellow-800 font-medium flex items-center gap-2">
                                <span className="text-xl">🌟</span>
                                <span>{selectedPlan.dailyGames[selectedDay].excitement}</span>
                              </p>
                            </div>

                            {/* Objective */}
                            <div className="mb-4">
                              <h5 className="font-bold text-emerald-900 mb-1 flex items-center gap-2">
                                <span>🎯</span> Learning Objective:
                              </h5>
                              <p className="text-emerald-700">{selectedPlan.dailyGames[selectedDay].objective}</p>
                            </div>

                            {/* Materials */}
                            <div className="bg-white rounded-xl p-4 mb-4 border border-emerald-200">
                              <h5 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                                <span>📦</span> Materials Needed:
                              </h5>
                              <p className="text-emerald-700">{selectedPlan.dailyGames[selectedDay].materials}</p>
                            </div>

                            {/* Setup */}
                            <div className="bg-indigo-100 rounded-xl p-4 mb-4 border border-indigo-200">
                              <h5 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                <span>🔧</span> Quick Setup:
                              </h5>
                              <p className="text-indigo-700">{selectedPlan.dailyGames[selectedDay].setup}</p>
                            </div>

                            {/* Teacher Script */}
                            <div className="bg-purple-100 rounded-xl p-4 mb-4 border border-purple-200">
                              <h5 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                                <span>💬</span> What to Say (Teacher Script):
                              </h5>
                              <p className="text-purple-700 italic">&ldquo;{selectedPlan.dailyGames[selectedDay].teacherScript}&rdquo;</p>
                            </div>

                            {/* Step-by-Step Instructions */}
                            <div className="bg-white rounded-xl p-4 mb-4 border-2 border-emerald-300">
                              <h5 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                                <span>📋</span> Step-by-Step Instructions:
                              </h5>
                              <ol className="space-y-3">
                                {selectedPlan.dailyGames[selectedDay].howToPlay.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start gap-3">
                                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                                      {stepIndex + 1}
                                    </span>
                                    <span className="text-emerald-800 pt-1">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Inclusion Tip */}
                            <div className="bg-rose-100 rounded-xl p-4 border border-rose-200">
                              <h5 className="font-bold text-rose-900 mb-2 flex items-center gap-2">
                                <span>💝</span> Helping ALL Children Participate:
                              </h5>
                              <p className="text-rose-700">{selectedPlan.dailyGames[selectedDay].inclusionTip}</p>
                            </div>
                          </div>

                          {/* Quick 10-min Schedule */}
                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                            <h5 className="font-bold text-indigo-900 mb-2">⏱️ Quick 10-Minute Schedule:</h5>
                            <div className="grid grid-cols-4 gap-2 text-center text-sm">
                              <div className="bg-white rounded-lg p-2">
                                <div className="font-bold text-indigo-700">1-2 min</div>
                                <div className="text-indigo-600">🎵 Song</div>
                              </div>
                              <div className="bg-emerald-100 rounded-lg p-2 border-2 border-emerald-400">
                                <div className="font-bold text-emerald-700">5-6 min</div>
                                <div className="text-emerald-600">🎮 Game</div>
                              </div>
                              <div className="bg-white rounded-lg p-2">
                                <div className="font-bold text-indigo-700">1-2 min</div>
                                <div className="text-indigo-600">🥁 Chant</div>
                              </div>
                              <div className="bg-white rounded-lg p-2">
                                <div className="font-bold text-indigo-700">1 min</div>
                                <div className="text-indigo-600">👏 End</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : selectedPlan.dailyPlan[selectedDay].activities ? (
                        /* Legacy Format - Old plans */
                        <div>
                          <h4 className="text-lg font-bold text-indigo-900 mb-4">10-Minute Schedule</h4>
                          <div className="space-y-3">
                            {selectedPlan.dailyPlan[selectedDay].activities?.map((activity, i) => (
                              <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-indigo-100">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold shadow-md">
                                  {i + 1}
                                </div>
                                <p className="text-indigo-900 font-medium">{activity}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Games Tab */}
              {activeTab === "games" && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                    <span className="text-3xl">🎮</span> All Week&apos;s Games
                  </h3>
                  <p className="text-indigo-600 -mt-4">One unique game each day - click any card to see full instructions</p>

                  {selectedPlan.dailyGames ? (
                    <div className="space-y-4">
                      {(["monday", "tuesday", "wednesday", "thursday", "friday"] as const).map((day) => {
                        const game = selectedPlan.dailyGames?.[day];
                        if (!game) return null;
                        const dayColors: Record<string, { bg: string; border: string; text: string }> = {
                          monday: { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", text: "text-blue-900" },
                          tuesday: { bg: "from-green-50 to-emerald-50", border: "border-green-200", text: "text-green-900" },
                          wednesday: { bg: "from-purple-50 to-violet-50", border: "border-purple-200", text: "text-purple-900" },
                          thursday: { bg: "from-orange-50 to-amber-50", border: "border-orange-200", text: "text-orange-900" },
                          friday: { bg: "from-pink-50 to-rose-50", border: "border-pink-200", text: "text-pink-900" },
                        };
                        const colors = dayColors[day];

                        return (
                          <div key={day} className={`bg-gradient-to-r ${colors.bg} rounded-2xl p-6 border ${colors.border}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl capitalize font-bold {colors.text}">{day}</span>
                                <span className={`text-xl font-bold ${colors.text}`}>{game.name}</span>
                              </div>
                              <span className="bg-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                                ⏱️ {game.duration}
                              </span>
                            </div>
                            
                            <p className={`${colors.text} opacity-80 mb-3`}>{game.objective}</p>
                            
                            <div className="bg-yellow-100 rounded-lg p-3 mb-3">
                              <p className="text-yellow-800 text-sm flex items-center gap-2">
                                <span>🌟</span> <strong>Fun factor:</strong> {game.excitement}
                              </p>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-3 mb-3">
                              <div className="bg-white rounded-lg p-3">
                                <p className="text-sm"><strong>📦 Materials:</strong> {game.materials}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3">
                                <p className="text-sm"><strong>🔧 Setup:</strong> {game.setup}</p>
                              </div>
                            </div>
                            
                            <details className="bg-white rounded-lg p-4">
                              <summary className="font-bold cursor-pointer text-indigo-900 hover:text-indigo-700">
                                📋 Click to see step-by-step instructions
                              </summary>
                              <ol className="mt-3 space-y-2">
                                {game.howToPlay.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start gap-2 text-sm">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                      {stepIndex + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                              <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                                <p className="text-sm text-purple-800"><strong>💬 Say:</strong> &ldquo;{game.teacherScript}&rdquo;</p>
                              </div>
                              <div className="mt-2 p-3 bg-rose-50 rounded-lg">
                                <p className="text-sm text-rose-800"><strong>💝 Inclusion tip:</strong> {game.inclusionTip}</p>
                              </div>
                            </details>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Legacy format for old plans */
                    <div className="space-y-6">
                      {selectedPlan.mainGame && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
                          <h3 className="text-2xl font-bold text-indigo-900 mb-4">🎮 {selectedPlan.mainGame.name}</h3>
                          <p className="text-indigo-700">{selectedPlan.mainGame.description}</p>
                        </div>
                      )}
                      {selectedPlan.quickActivities?.map((activity, i) => (
                        <div key={i} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                          <h4 className="font-bold text-emerald-900">{activity.name}</h4>
                          <p className="text-emerald-700 text-sm">{activity.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Songs Tab */}
              {activeTab === "songs" && (
                <div className="space-y-6">
                  {/* Letter Song */}
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-200">
                    <h3 className="text-2xl font-bold text-rose-900 mb-4 flex items-center gap-2">
                      <span className="text-3xl">🎵</span> Letter Song: {selectedPlan.letterSong?.title}
                    </h3>
                    <div className="bg-white rounded-xl p-4 mb-4">
                      <h5 className="font-bold text-rose-900 mb-2">🎤 Lyrics:</h5>
                      <p className="text-rose-700 italic whitespace-pre-line">{selectedPlan.letterSong?.lyrics}</p>
                    </div>
                    <div className="bg-rose-100 rounded-xl p-4">
                      <h5 className="font-bold text-rose-900 mb-2">👐 Actions:</h5>
                      <p className="text-rose-700">{selectedPlan.letterSong?.actions}</p>
                    </div>
                  </div>

                  {/* Letter Chant */}
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-200">
                    <h3 className="text-2xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                      <span className="text-3xl">🥁</span> Letter Chant
                    </h3>
                    <div className="bg-white rounded-xl p-4 mb-4">
                      <h5 className="font-bold text-purple-900 mb-2">📢 Chant:</h5>
                      <p className="text-purple-700 text-lg font-medium italic">&ldquo;{selectedPlan.letterChant?.chant}&rdquo;</p>
                    </div>
                    <div className="bg-purple-100 rounded-xl p-4">
                      <h5 className="font-bold text-purple-900 mb-2">👏 Rhythm:</h5>
                      <p className="text-purple-700">{selectedPlan.letterChant?.rhythm}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedPlan && plans.length === 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <div className="text-8xl mb-6">🔤</div>
            <h2 className="text-3xl font-bold text-indigo-900 mb-4">Welcome to Phonics Planner!</h2>
            <p className="text-indigo-600 text-lg mb-8">
              Create your first weekly letter plan with fun games and activities.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg"
            >
              <span>✨ Create First Letter Plan</span>
            </button>
          </div>
        )}
      </main>

      {/* Generate Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                <span className="text-3xl">✨</span> Generate Phonics Plan
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setGenerateError("");
                  setGenerateForm({ letters: [""], weekStart: "", weekEnd: "" });
                }}
                className="text-indigo-600 hover:text-indigo-800 text-2xl"
                disabled={generating}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const validLetters = generateForm.letters.filter(l => l.trim());
                if (validLetters.length === 0) {
                  setGenerateError("Enter at least one letter");
                  return;
                }
                if (!generateForm.weekStart || !generateForm.weekEnd) {
                  setGenerateError("Please select week dates");
                  return;
                }

                setGenerating(true);
                setGenerateError("");

                try {
                  const response = await fetch("/api/phonics-plans/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      letters: validLetters,
                      weekStart: generateForm.weekStart,
                      weekEnd: generateForm.weekEnd,
                    }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(data.error || "Failed to generate");
                  }

                  await fetchPlans();
                  setShowAddModal(false);
                  setGenerateForm({ letters: [""], weekStart: "", weekEnd: "" });
                  
                  if (data.plan) {
                    setSelectedPlan(data.plan);
                  }
                } catch (error) {
                  setGenerateError(error instanceof Error ? error.message : "Unknown error");
                } finally {
                  setGenerating(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-indigo-900 mb-2">
                  Letter(s) for this week *
                </label>
                <div className="space-y-2">
                  {generateForm.letters.map((letter, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={letter}
                        onChange={(e) => updateLetter(index, e.target.value)}
                        placeholder="A"
                        maxLength={1}
                        className="w-20 px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-400 text-indigo-900 text-center text-2xl font-bold uppercase"
                        disabled={generating}
                      />
                      {generateForm.letters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLetterField(index)}
                          className="text-red-500 hover:text-red-700"
                          disabled={generating}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {generateForm.letters.length < 3 && (
                  <button
                    type="button"
                    onClick={addLetterField}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                    disabled={generating}
                  >
                    + Add another letter (max 3)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-indigo-900 mb-2">
                    Week Start *
                  </label>
                  <input
                    type="date"
                    value={generateForm.weekStart}
                    onChange={(e) => setGenerateForm({ ...generateForm, weekStart: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-400 text-indigo-900"
                    disabled={generating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-indigo-900 mb-2">
                    Week End *
                  </label>
                  <input
                    type="date"
                    value={generateForm.weekEnd}
                    onChange={(e) => setGenerateForm({ ...generateForm, weekEnd: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-400 text-indigo-900"
                    disabled={generating}
                  />
                </div>
              </div>

              {generateError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-red-800 text-sm">{generateError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setGenerateError("");
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {generating ? "⏳ Generating..." : "✨ Generate Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

