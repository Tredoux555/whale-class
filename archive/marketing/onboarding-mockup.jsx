import React, { useState } from 'react';

// Sample data for demonstration
const sampleStudents = [
  {
    id: 1,
    name: "Emma Chen",
    age: "3y 4m",
    timeAtSchool: "2 months",
    practicalLife: "Pouring, Spooning",
    sensorial: "Pink Tower (exploring)",
    math: "Not yet presented",
    language: "Sound games",
    cultural: "Globe work",
    temperament: "High energy, cautious with new activities, persistent once engaged",
    teacherFocus: "Building concentration through practical life sequence",
    guruRecommendations: null,
    approved: false
  },
  {
    id: 2,
    name: "Marcus Williams",
    age: "4y 1m",
    timeAtSchool: "8 months",
    practicalLife: "Mastered basics, working on food prep",
    sensorial: "Brown Stair, Color Tablets",
    math: "Number rods 1-5",
    language: "Sandpaper letters (vowels)",
    cultural: "Land/water forms",
    temperament: "Wanderer, needs help choosing work, responds to one-on-one",
    teacherFocus: "Finding 'his' work - observe what captures attention",
    guruRecommendations: null,
    approved: false
  },
  {
    id: 3,
    name: "Sofia Reyes",
    age: "5y 2m",
    timeAtSchool: "1 year 3 months",
    practicalLife: "Mastered - occasional return visits",
    sensorial: "Binomial cube, geometric cabinet",
    math: "Golden beads, teen boards",
    language: "Moveable alphabet, beginning reading",
    cultural: "Puzzle maps, timeline work",
    temperament: "Independent, helpful with younger children, loves order",
    teacherFocus: "Extending math into operations, peer mentoring role",
    guruRecommendations: null,
    approved: false
  }
];

// Guru recommendation examples
const guruRecommendations = {
  1: {
    insight: "Emma's high energy combined with only 2 months at school suggests she's still in the adjustment period. Her persistence once engaged is a strength to build on.",
    recommendations: [
      { work: "Wet Pouring (pitcher to pitcher)", area: "PL", priority: 1, reason: "Builds on her pouring success, adds sensory element for focus" },
      { work: "Tonging (cotton balls)", area: "PL", priority: 2, reason: "Prepares hand strength for later pencil work" },
      { work: "Pink Tower (guided presentation)", area: "SE", priority: 3, reason: "Move from exploring to purposeful work" },
      { work: "Silence Game", area: "PL", priority: 4, reason: "Channel high energy into self-regulation" }
    ],
    prerequisites: "Note: If Emma attempts writing work, redirect to tonging/spooning first",
    timeline: "2-3 weeks to establish concentration cycle"
  },
  2: {
    insight: "Marcus's wandering after 8 months signals he hasn't found his 'hook' material yet. His response to one-on-one suggests he needs guided choice, not open exploration.",
    recommendations: [
      { work: "Food Preparation (banana slicing)", area: "PL", priority: 1, reason: "Tangible result, purposeful, may capture interest" },
      { work: "Spindle Boxes", area: "MA", priority: 2, reason: "Extends number rods with tactile counting" },
      { work: "Sound Cylinders", area: "SE", priority: 3, reason: "Novel sensory experience to spark curiosity" },
      { work: "Mystery Bag", area: "SE", priority: 4, reason: "Game-like quality may engage his attention" }
    ],
    prerequisites: "Observe: What does he touch when wandering? Follow that interest",
    timeline: "2-4 weeks of targeted presentations to find connection"
  },
  3: {
    insight: "Sofia is normalized and ready for extension work. Her love of order and helpfulness suggests readiness for leadership roles and more abstract concepts.",
    recommendations: [
      { work: "Golden Bead Addition", area: "MA", priority: 1, reason: "Natural extension of golden bead familiarity" },
      { work: "Phonogram Introduction", area: "LA", priority: 2, reason: "Bridge to reading fluency" },
      { work: "Peer Teaching (Pink Tower)", area: "PL", priority: 3, reason: "Develops leadership, reinforces concepts" },
      { work: "Timeline of Life", area: "CU", priority: 4, reason: "Extends timeline interest to bigger picture" }
    ],
    prerequisites: "Ensure command cards are available for independent math practice",
    timeline: "Ongoing extension - she's ready for second plane preparation"
  }
};

export default function OnboardingSpreadsheet() {
  const [students, setStudents] = useState(sampleStudents);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState({});
  const [editingCell, setEditingCell] = useState(null);

  const askGuru = (studentId) => {
    setShowRecommendations(prev => ({ ...prev, [studentId]: true }));
  };

  const approveRecommendations = (studentId) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, approved: true } : s
    ));
  };

  const areaColors = {
    PL: 'bg-amber-100 text-amber-800',
    SE: 'bg-pink-100 text-pink-800',
    MA: 'bg-blue-100 text-blue-800',
    LA: 'bg-green-100 text-green-800',
    CU: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Student Onboarding</h1>
          <p className="text-gray-600 mt-1">Enter student information, then Ask Guru for personalized recommendations</p>
        </div>

        {/* Main Spreadsheet */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">Age</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">Time at School</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider bg-amber-50">Practical Life</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-pink-700 uppercase tracking-wider bg-pink-50">Sensorial</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider bg-blue-50">Math</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">Language</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider bg-purple-50">Cultural</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Temperament</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Teacher Focus</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className={student.approved ? 'bg-green-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{student.age}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{student.timeAtSchool}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 bg-amber-50/50 max-w-40">
                      <div className="truncate" title={student.practicalLife}>{student.practicalLife}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 bg-pink-50/50 max-w-40">
                      <div className="truncate" title={student.sensorial}>{student.sensorial}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 bg-blue-50/50 max-w-40">
                      <div className="truncate" title={student.math}>{student.math}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 bg-green-50/50 max-w-40">
                      <div className="truncate" title={student.language}>{student.language}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 bg-purple-50/50 max-w-40">
                      <div className="truncate" title={student.cultural}>{student.cultural}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-48">
                      <div className="truncate" title={student.temperament}>{student.temperament}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-48">
                      <div className="truncate" title={student.teacherFocus}>{student.teacherFocus}</div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {student.approved ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Set Up
                        </span>
                      ) : showRecommendations[student.id] ? (
                        <button
                          onClick={() => setSelectedStudent(student.id)}
                          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        >
                          View Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => askGuru(student.id)}
                          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Ask Guru
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Empty row for new entry */}
                <tr className="bg-gray-50">
                  <td className="px-3 py-3">
                    <input type="text" placeholder="New student..." className="w-full text-sm border-0 bg-transparent focus:ring-0 placeholder-gray-400" />
                  </td>
                  <td className="px-3 py-3">
                    <input type="text" placeholder="3y 0m" className="w-full text-sm border-0 bg-transparent focus:ring-0 placeholder-gray-400" />
                  </td>
                  <td className="px-3 py-3">
                    <input type="text" placeholder="New" className="w-full text-sm border-0 bg-transparent focus:ring-0 placeholder-gray-400" />
                  </td>
                  <td className="px-3 py-3 bg-amber-50/30" colSpan="5">
                    <span className="text-gray-400 text-sm italic">Fill in current level for each area...</span>
                  </td>
                  <td className="px-3 py-3">
                    <input type="text" placeholder="Notes..." className="w-full text-sm border-0 bg-transparent focus:ring-0 placeholder-gray-400" />
                  </td>
                  <td className="px-3 py-3">
                    <input type="text" placeholder="Focus..." className="w-full text-sm border-0 bg-transparent focus:ring-0 placeholder-gray-400" />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-gray-400 text-xs">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Voice Input Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            Voice Input Mode
          </button>
          <span className="text-sm text-gray-500">Click any cell, then speak to fill it in</span>
        </div>

        {/* Guru Recommendations Panel */}
        {selectedStudent && guruRecommendations[selectedStudent] && (
          <div className="bg-white rounded-lg shadow-lg border-2 border-indigo-200 overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Guru Recommendations for {students.find(s => s.id === selectedStudent)?.name}
                  </h2>
                  <p className="text-indigo-200 text-sm mt-1">Review and approve to set up this week's work plan</p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-indigo-200 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Insight */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Insight</h3>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{guruRecommendations[selectedStudent].insight}</p>
              </div>

              {/* Recommended Works */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommended Works This Week</h3>
                <div className="space-y-3">
                  {guruRecommendations[selectedStudent].recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${areaColors[rec.area]} text-sm font-bold`}>
                          {rec.priority}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{rec.work}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${areaColors[rec.area]}`}>
                            {rec.area}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <input type="checkbox" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-gray-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prerequisites Note */}
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-800">Prerequisite Alert</h4>
                    <p className="text-sm text-amber-700 mt-1">{guruRecommendations[selectedStudent].prerequisites}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Expected Timeline</h3>
                <p className="text-gray-700">{guruRecommendations[selectedStudent].timeline}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    approveRecommendations(selectedStudent);
                    setSelectedStudent(null);
                  }}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Approve & Set Up Child's Profile
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Modify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">How it works:</h3>
          <ol className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
              <span>Fill in each student's current level in each curriculum area (use voice or typing)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
              <span>Add temperament notes and what you want to focus on this term</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
              <span>Click <strong>Ask Guru</strong> to get AI-powered recommendations based on Montessori principles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
              <span>Review recommendations, modify if needed, then <strong>Approve</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">5</span>
              <span>Works automatically appear in the child's profile tab, ready for this week</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
