// /montree/library/tools/phonics-fast/three-part-cards/page.tsx
// Phonics 3-Part Cards — wraps the ORIGINAL CardGenerator with phonics word data
// Auto-resolves Photo Bank images where available; falls back to emoji
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ALL_PHASES, type PhonicsWord, type PhonicsPhase } from '@/lib/montree/phonics/phonics-data';
import CardGenerator from '@/components/card-generator/CardGenerator';
import type { Card } from '@/components/card-generator/types';
import { resolvePhotoBankImages, urlToDataUrl } from '@/lib/montree/phonics/photo-bank-resolver';

// Render an emoji (or text) onto a canvas and return a data URL
function emojiToDataUrl(emoji: string, size = 400): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Use a large font size relative to canvas
  ctx.font = `${Math.round(size * 0.6)}px serif`;
  ctx.fillText(emoji, size / 2, size / 2);
  return canvas.toDataURL('image/png');
}

export default function ThreePartCardsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPhase = searchParams.get('phase') || 'initial';

  const [selectedPhase, setSelectedPhase] = useState(initialPhase);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [generatedCards, setGeneratedCards] = useState<Card[] | undefined>(undefined);
  const [generating, setGenerating] = useState(false);

  // Photo Bank: resolved on mount, used during card generation
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());
  const [photosReady, setPhotosReady] = useState(false);

  const currentPhase = ALL_PHASES.find(p => p.id === selectedPhase);

  // Resolve Photo Bank images once on mount (background, non-blocking)
  useEffect(() => {
    const controller = new AbortController();
    resolvePhotoBankImages(controller.signal).then((map) => {
      if (!controller.signal.aborted) {
        setPhotoMap(map);
        setPhotosReady(true);
      }
    });
    return () => { controller.abort(); };
  }, []);

  // Select all groups by default when phase changes
  useEffect(() => {
    if (currentPhase) {
      setSelectedGroups(currentPhase.groups.map(g => g.id));
    }
  }, [selectedPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedWords: PhonicsWord[] = currentPhase
    ? currentPhase.groups
        .filter(g => selectedGroups.includes(g.id))
        .flatMap(g => g.words)
    : [];

  // Convert phonics words to Card[] format for the original CardGenerator
  // Uses Photo Bank images where available, emoji fallback otherwise
  const generateCards = useCallback(async () => {
    if (selectedWords.length === 0) return;
    setGenerating(true);

    try {
      const cards: Card[] = await Promise.all(
        selectedWords.map(async (word, idx) => {
          let imageUrl: string;

          // Priority: Photo Bank > customImageUrl > emoji
          const photoBankUrl = photoMap.get(word.word.toLowerCase());
          if (photoBankUrl) {
            const dataUrl = await urlToDataUrl(photoBankUrl);
            imageUrl = dataUrl || emojiToDataUrl(word.image);
          } else if (word.customImageUrl) {
            imageUrl = word.customImageUrl;
          } else {
            imageUrl = emojiToDataUrl(word.image);
          }

          return {
            id: Date.now() + idx + Math.random(),
            originalImage: imageUrl,
            croppedImage: imageUrl,
            label: word.word,
            width: 400,
            height: 400,
          };
        })
      );
      setGeneratedCards(cards);
    } catch (err) {
      console.error('Card generation error:', err);
    } finally {
      setGenerating(false);
    }
  }, [selectedWords, photoMap]);

  // If cards haven't been generated yet, show the phase/group selector
  if (generatedCards) {
    return (
      <CardGenerator
        initialCards={generatedCards}
        headerConfig={{
          showBackButton: true,
          backButtonLabel: '←',
          onBackClick: () => setGeneratedCards(undefined),
          title: `🃏 Phonics 3-Part Cards`,
          subtitle: `${currentPhase?.name || 'Phonics'} — ${generatedCards.length} words loaded. Replace any image via Photo Bank or upload!`,
          gradientStart: currentPhase?.color || '#10b981',
          gradientEnd: '#0D3330',
          centered: false,
        }}
      />
    );
  }

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        padding: '24px',
        background: `linear-gradient(135deg, ${currentPhase?.color || '#10b981'} 0%, #0D3330 100%)`,
        borderRadius: '16px',
        color: '#fff'
      }}>
        <button
          onClick={() => router.push('/montree/library/tools/phonics-fast')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '12px',
          }}
        >
          ← Phonics Fast
        </button>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: '800' }}>
          🃏 Phonics 3-Part Cards
        </h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
          Select a phase and word groups, then generate cards using the full Card Generator
        </p>
      </div>

      {/* Phase Selector */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#333' }}>Phase</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ALL_PHASES.map(phase => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                backgroundColor: selectedPhase === phase.id ? phase.color : '#e5e7eb',
                color: selectedPhase === phase.id ? '#fff' : '#4b5563',
                transition: 'all 0.15s',
              }}
            >
              {phase.name} ({phase.groups.flatMap(g => g.words).length})
            </button>
          ))}
        </div>
      </div>

      {/* Group Selector */}
      {currentPhase && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>Word Groups</h2>
            <button
              onClick={() => {
                const allIds = currentPhase.groups.map(g => g.id);
                setSelectedGroups(prev => prev.length === allIds.length ? [] : allIds);
              }}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#6b7280',
              }}
            >
              {selectedGroups.length === currentPhase.groups.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {currentPhase.groups.map(group => {
              const isSelected = selectedGroups.includes(group.id);
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setSelectedGroups(prev =>
                      isSelected
                        ? prev.filter(id => id !== group.id)
                        : [...prev, group.id]
                    );
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? currentPhase.color : 'transparent'}`,
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    backgroundColor: isSelected ? `${currentPhase.color}15` : '#f3f4f6',
                    color: isSelected ? currentPhase.color : '#6b7280',
                    transition: 'all 0.15s',
                  }}
                >
                  {group.label} ({group.words.length})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Word Preview */}
      {selectedWords.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#333' }}>
            Preview — {selectedWords.length} words
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {selectedWords.map((word, idx) => {
              const photoUrl = photoMap.get(word.word.toLowerCase());
              return (
                <span
                  key={`${word.word}-${idx}`}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: photoUrl ? '#ecfdf5' : '#f0fdf4',
                    border: `1px solid ${photoUrl ? '#6ee7b7' : '#bbf7d0'}`,
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt={word.word} style={{ width: '20px', height: '20px', objectFit: 'cover', borderRadius: '3px' }} />
                  ) : (
                    <span style={{ fontSize: '18px' }}>{word.image}</span>
                  )}
                  <span style={{ fontWeight: '500' }}>{word.word}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateCards}
        disabled={selectedWords.length === 0 || generating}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: selectedWords.length === 0 ? '#d1d5db' : (currentPhase?.color || '#10b981'),
          color: '#fff',
          cursor: selectedWords.length === 0 ? 'not-allowed' : 'pointer',
          fontWeight: '700',
          fontSize: '16px',
          transition: 'all 0.15s',
          opacity: generating ? 0.7 : 1,
        }}
      >
        {generating
          ? '⏳ Loading images & generating cards...'
          : `🃏 Generate ${selectedWords.length} Cards → Open Card Generator`
        }
      </button>

      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '12px' }}>
        Cards will open in the full Card Generator where you can upload photos, crop images, adjust borders, and print.
        {photosReady && photoMap.size > 0 && ' Photo Bank images auto-matched where available.'}
      </p>
    </div>
  );
}
