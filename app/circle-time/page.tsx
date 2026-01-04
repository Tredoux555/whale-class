'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CIRCLE_TIME_CURRICULUM, CircleTimePlan } from '@/lib/circle-time/curriculum-data';

interface LessonDocument {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  public_url: string;
  created_at: string;
}

function isVideo(fileType: string): boolean {
  return fileType.startsWith('video/');
}

function isImage(fileType: string): boolean {
  return fileType.startsWith('image/');
}

function getWeekOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

export default function PublicCircleTimePage() {
  const [selectedWeek, setSelectedWeek] = useState<number>(17); // Default to current curriculum week
  const [documents, setDocuments] = useState<LessonDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const plan = CIRCLE_TIME_CURRICULUM.find(p => p.week === selectedWeek);
  const year = new Date().getFullYear();

  useEffect(() => {
    fetchDocuments();
  }, [selectedWeek]);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/lesson-documents/list?weekNumber=${selectedWeek}&year=${year}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }

  const videos = documents.filter(d => isVideo(d.file_type));
  const images = documents.filter(d => isImage(d.file_type));
  const otherDocs = documents.filter(d => !isVideo(d.file_type) && !isImage(d.file_type));

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <p>Week not found</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100"
      style={{ fontFamily: "'Comic Sans MS', cursive" }}
    >
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              ← Home
            </Link>
            <h1 className="text-xl font-bold text-gray-900">🌅 Circle Time</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Week Selector */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {CIRCLE_TIME_CURRICULUM.slice(0, 20).map((week) => (
              <button
                key={week.week}
                onClick={() => setSelectedWeek(week.week)}
                className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all text-sm ${
                  selectedWeek === week.week
                    ? 'text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-orange-100'
                }`}
                style={selectedWeek === week.week ? { backgroundColor: week.color } : {}}
              >
                {week.icon} W{week.week}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Header */}
        <div 
          className="rounded-2xl p-6 mb-6 text-white"
          style={{ backgroundColor: plan.color }}
        >
          <div className="flex items-center gap-4">
            <span className="text-5xl">{plan.icon}</span>
            <div>
              <h2 className="text-2xl font-bold">Week {plan.week}: {plan.theme}</h2>
              <p className="opacity-90">🎵 {plan.song.title}</p>
            </div>
          </div>
        </div>

        {/* Videos Section */}
        {videos.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-3">🎬 This Week's Videos</h3>
            <div className="space-y-4">
              {videos.map((video) => (
                <div key={video.id} className="rounded-lg overflow-hidden bg-black">
                  <video 
                    controls 
                    className="w-full"
                    preload="metadata"
                    poster=""
                  >
                    <source src={video.public_url} type={video.file_type} />
                    Your browser does not support video playback.
                  </video>
                  <div className="bg-gray-900 text-white text-sm px-3 py-2">
                    {video.original_filename}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vocabulary */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-2">📇 Vocabulary Words</h3>
          <div className="flex flex-wrap gap-2">
            {plan.vocabulary.map((word, i) => (
              <span key={i} className="px-3 py-1 bg-amber-100 rounded-full text-sm">
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* Song */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-2">🎵 Theme Song</h3>
          <p className="font-medium text-lg">{plan.song.title}</p>
          <p className="text-gray-600 mt-1">Actions: {plan.song.actions}</p>
        </div>

        {/* Books */}
        {plan.books && plan.books.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-2">📚 This Week's Books</h3>
            <div className="space-y-2">
              {plan.books.map((book, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xl">📖</span>
                  <span>{book.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Images */}
        {images.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-3">🖼️ Photos</h3>
            <div className="grid grid-cols-2 gap-3">
              {images.map((img) => (
                <a 
                  key={img.id} 
                  href={img.public_url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg overflow-hidden"
                >
                  <img 
                    src={img.public_url} 
                    alt={img.original_filename}
                    className="w-full h-32 object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Other Documents */}
        {otherDocs.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-3">📄 Resources</h3>
            <div className="space-y-2">
              {otherDocs.map((doc) => (
                <a 
                  key={doc.id}
                  href={doc.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span>📎</span>
                  <span className="text-sm">{doc.original_filename}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-4 text-gray-500">
            Loading materials...
          </div>
        )}

        {/* Week Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek === 1}
            className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
          >
            ← Previous
          </button>
          <button
            onClick={() => setSelectedWeek(Math.min(36, selectedWeek + 1))}
            disabled={selectedWeek === 36}
            className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </main>
    </div>
  );
}
