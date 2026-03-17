// components/montree/PhotoBankPicker.tsx
// Reusable picture bank picker component for embedding in content creation tools
// Provides search, category filter, scrollable gallery grid, and selection/drag support
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface PhotoBankPhoto {
  id: string;
  filename: string;
  label: string;
  tags: string[];
  category: string;
  public_url: string;
  thumbnail_url?: string;
}

interface PhotoBankCategory {
  name: string;
  display_name: string;
  icon: string;
}

interface PhotoBankPickerProps {
  /** Called when user clicks a photo to select it. Receives the photo data URL and label. */
  onSelectPhoto: (dataUrl: string, label: string, filename: string) => void;
  /** Max height for the gallery grid (default: 400px) */
  maxHeight?: number;
  /** Whether to show the category filter bar */
  showCategories?: boolean;
  /** Whether to allow multiple selections */
  multiSelect?: boolean;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
}

export default function PhotoBankPicker({
  onSelectPhoto,
  maxHeight = 400,
  showCategories = true,
  multiSelect = false,
  searchPlaceholder = 'Search photos... (e.g. "cat", "apple", "red")',
}: PhotoBankPickerProps) {
  const [photos, setPhotos] = useState<PhotoBankPhoto[]>([]);
  const [categories, setCategories] = useState<PhotoBankCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Multi-word search: groups results by search term
  const [multiWordResults, setMultiWordResults] = useState<{ word: string; photos: PhotoBankPhoto[] }[]>([]);
  const [isMultiWord, setIsMultiWord] = useState(false);

  // Fetch photos from API (single query)
  const fetchPhotos = useCallback(async (query: string, category: string, pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '50',
      });
      if (query) params.set('q', query);
      if (category && category !== 'all') params.set('category', category);

      const res = await fetch(`/api/montree/photo-bank?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      if (pageNum === 1) {
        setPhotos(data.photos);
      } else {
        setPhotos((prev: PhotoBankPhoto[]) => [...prev, ...data.photos]);
      }
      setCategories(data.categories || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('PhotoBankPicker fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch photos for multiple words in parallel
  const fetchMultiWord = useCallback(async (words: string[], category: string) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        words.map(async (word) => {
          const params = new URLSearchParams({ page: '1', limit: '20' });
          params.set('q', word);
          if (category && category !== 'all') params.set('category', category);
          const res = await fetch(`/api/montree/photo-bank?${params}`);
          if (!res.ok) return { word, photos: [] };
          const data = await res.json();
          return { word, photos: data.photos || [] };
        })
      );
      setMultiWordResults(results);
      // Also set flat photos + total for category loading
      const allPhotos = results.flatMap(r => r.photos);
      setPhotos(allPhotos);
      setTotal(allPhotos.length);
      // Load categories from first result that has them
      for (const r of results) {
        const res = await fetch(`/api/montree/photo-bank?page=1&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.categories) setCategories(data.categories);
        }
        break;
      }
    } catch (err) {
      console.error('PhotoBankPicker multi-word fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPhotos('', 'all', 1);
  }, [fetchPhotos]);

  // Debounced search — detect multi-word (newline-separated)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      const lines = searchQuery.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        setIsMultiWord(true);
        fetchMultiWord(lines, selectedCategory);
      } else {
        setIsMultiWord(false);
        setMultiWordResults([]);
        fetchPhotos(searchQuery.trim(), selectedCategory, 1);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, selectedCategory, fetchPhotos, fetchMultiWord]);

  // Handle photo selection — fetch full image and convert to dataURL
  const handleSelectPhoto = async (photo: PhotoBankPhoto) => {
    setLoadingPhoto(photo.id);
    try {
      const response = await fetch(photo.public_url);
      const blob = await response.blob();

      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          onSelectPhoto(reader.result as string, photo.label, photo.filename);
          setLoadingPhoto(null);
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('Failed to load photo:', err);
      setLoadingPhoto(null);
    }
  };

  // Handle drag start for drag-and-drop into tools
  const handleDragStart = (e: React.DragEvent, photo: PhotoBankPhoto) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'photo-bank',
      url: photo.public_url,
      label: photo.label,
      filename: photo.filename,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPhotos(searchQuery, selectedCategory, nextPage);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Search Bar — textarea for multi-word support */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder + '\n(One word per line for bulk search)'}
            rows={searchQuery.includes('\n') ? Math.min(searchQuery.split('\n').length + 1, 8) : 1}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
              resize: 'vertical',
              minHeight: '40px',
              fontFamily: 'inherit',
              lineHeight: '1.4',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#10b981'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; }}
          />
          <span style={{
            position: 'absolute',
            left: '10px',
            top: '12px',
            fontSize: '16px',
            opacity: 0.5,
          }}>
            🔍
          </span>
        </div>
      </div>

      {/* Category Filter Bar */}
      {showCategories && categories.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '12px',
          overflowX: 'auto',
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch',
        }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: 'none',
              fontSize: '12px',
              fontWeight: selectedCategory === 'all' ? '700' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: selectedCategory === 'all' ? '#10b981' : '#f0f0f0',
              color: selectedCategory === 'all' ? '#fff' : '#555',
              transition: 'all 0.2s',
            }}
          >
            📸 All
          </button>
          {categories.filter(c => c.name !== 'general').map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: 'none',
                fontSize: '12px',
                fontWeight: selectedCategory === cat.name ? '700' : '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                backgroundColor: selectedCategory === cat.name ? '#10b981' : '#f0f0f0',
                color: selectedCategory === cat.name ? '#fff' : '#555',
                transition: 'all 0.2s',
              }}
            >
              {cat.icon} {cat.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      <div style={{
        fontSize: '12px',
        color: '#888',
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>
          {loading ? 'Searching...' : isMultiWord
            ? `${multiWordResults.length} words · ${total} photo${total !== 1 ? 's' : ''} found`
            : `${total} photo${total !== 1 ? 's' : ''} found${searchQuery ? ` for "${searchQuery}"` : ''}`
          }
        </span>
        <span style={{ color: '#10b981', fontSize: '11px' }}>
          Click to add · Drag to drop
        </span>
      </div>

      {/* Photo Gallery Grid */}
      <div style={{
        maxHeight: `${maxHeight}px`,
        overflowY: 'auto',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        padding: '8px',
        backgroundColor: '#fafafa',
      }}>
        {photos.length === 0 && !loading ? (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            color: '#999',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {searchQuery ? `No photos found for "${searchQuery.split('\n')[0]}"` : 'No photos in the bank yet'}
            </p>
          </div>
        ) : isMultiWord ? (
          /* Multi-word mode: grouped by search term */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {multiWordResults.map(({ word, photos: wordPhotos }) => (
              <div key={word}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '6px',
                  padding: '4px 8px',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '6px',
                  display: 'inline-block',
                }}>
                  {word} <span style={{ fontWeight: '400', color: '#888' }}>({wordPhotos.length})</span>
                </div>
                {wordPhotos.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#999', padding: '4px 8px' }}>
                    No photos found
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '8px',
                  }}>
                    {wordPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, photo)}
                        onClick={() => handleSelectPhoto(photo)}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: loadingPhoto === photo.id ? 'wait' : 'pointer',
                          border: '2px solid transparent',
                          transition: 'all 0.15s ease',
                          opacity: loadingPhoto === photo.id ? 0.6 : 1,
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#10b981';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <img
                          src={photo.thumbnail_url || photo.public_url}
                          alt={photo.label}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '4px 6px',
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                          color: '#fff', fontSize: '11px', fontWeight: '600',
                          textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {photo.label}
                        </div>
                        {loadingPhoto === photo.id && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: 'rgba(255,255,255,0.7)',
                          }}>
                            <div style={{
                              width: '20px', height: '20px',
                              border: '2px solid #10b981', borderTopColor: 'transparent',
                              borderRadius: '50%', animation: 'spin 0.6s linear infinite',
                            }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Single-word mode: flat grid */
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '8px',
            }}>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, photo)}
                  onClick={() => handleSelectPhoto(photo)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: loadingPhoto === photo.id ? 'wait' : 'pointer',
                    border: '2px solid transparent',
                    transition: 'all 0.15s ease',
                    opacity: loadingPhoto === photo.id ? 0.6 : 1,
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <img
                    src={photo.thumbnail_url || photo.public_url}
                    alt={photo.label}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  {/* Label overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '4px 6px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '600',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {photo.label}
                  </div>
                  {/* Loading spinner */}
                  {loadingPhoto === photo.id && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid #10b981',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                      }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Load More */}
            {photos.length < total && (
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    backgroundColor: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    color: '#555',
                  }}
                >
                  {loading ? 'Loading...' : `Load more (${photos.length}/${total})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
