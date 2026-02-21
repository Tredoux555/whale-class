// @ts-nocheck
'use client';

import { useState } from 'react';
import Link from 'next/link';

const AREA_OPTIONS = [
  { key: 'practical_life', name: 'Practical Life', color: '#ec4899' },
  { key: 'sensorial', name: 'Sensorial', color: '#8b5cf6' },
  { key: 'mathematics', name: 'Mathematics', color: '#3b82f6' },
  { key: 'language', name: 'Language', color: '#22c55e' },
  { key: 'cultural', name: 'Cultural', color: '#f97316' },
];

const AGE_OPTIONS = [
  { key: 'all', label: 'All Ages' },
  { key: 'primary_year1', label: 'Year 1 (2.5-4)' },
  { key: 'primary_year2', label: 'Year 2 (4-5)' },
  { key: 'primary_year3', label: 'Year 3 (5-6)' },
];

export default function UploadPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState('');
  const [ageRange, setAgeRange] = useState('all');
  const [materialsInput, setMaterialsInput] = useState('');
  const [directAimsInput, setDirectAimsInput] = useState('');
  const [indirectAimsInput, setIndirectAimsInput] = useState('');
  const [controlOfError, setControlOfError] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [contributorSchool, setContributorSchool] = useState('');
  const [contributorCountry, setContributorCountry] = useState('');

  // File state
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [pdfs, setPdfs] = useState<File[]>([]);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 10 - photos.length;
    const newPhotos = files.slice(0, remaining);
    setPhotos(prev => [...prev, ...newPhotos]);
    setPhotoCaptions(prev => [...prev, ...newPhotos.map(() => '')]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoCaptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !area || !contributorName) {
      setError('Please fill in the required fields: Title, Description, Area, and Your Name.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.set('title', title);
      formData.set('description', description);
      formData.set('detailed_description', detailedDescription);
      formData.set('area', area);
      formData.set('category', category);
      formData.set('age_range', ageRange);
      formData.set('materials', JSON.stringify(materialsInput.split('\n').map(s => s.trim()).filter(Boolean)));
      formData.set('direct_aims', JSON.stringify(directAimsInput.split('\n').map(s => s.trim()).filter(Boolean)));
      formData.set('indirect_aims', JSON.stringify(indirectAimsInput.split('\n').map(s => s.trim()).filter(Boolean)));
      formData.set('control_of_error', controlOfError);
      formData.set('prerequisites', '[]');
      formData.set('presentation_steps', '[]');
      formData.set('variations', '[]');
      formData.set('extensions', '[]');
      formData.set('contributor_name', contributorName);
      formData.set('contributor_email', contributorEmail);
      formData.set('contributor_school', contributorSchool);
      formData.set('contributor_country', contributorCountry);

      // Add photos
      photos.forEach((photo, i) => {
        formData.set(`photo_${i}`, photo);
        formData.set(`photo_${i}_caption`, photoCaptions[i] || '');
      });

      // Add videos
      videos.forEach((video, i) => {
        formData.set(`video_${i}`, video);
      });

      // Add PDFs
      pdfs.forEach((pdf, i) => {
        formData.set(`pdf_${i}`, pdf);
      });

      const res = await fetch('/api/montree/community/works', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900">Work Submitted!</h2>
          <p className="text-gray-500 mt-2">
            Thank you for sharing! Your work will appear in the library once it's been reviewed and approved.
          </p>
          <div className="flex gap-3 mt-6">
            <Link href="/montree/library" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-200">
              Browse Library
            </Link>
            <button onClick={() => { setSubmitted(false); setTitle(''); setDescription(''); setDetailedDescription(''); setPhotos([]); setPhotoCaptions([]); setVideos([]); setPdfs([]); }} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600">
              Share Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0D3330] text-white px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/montree/library" className="text-emerald-300 text-sm hover:underline">← Back to Library</Link>
          <h1 className="text-2xl font-bold mt-1">Share a Montessori Work</h1>
          <p className="text-emerald-200 text-sm mt-1">Help teachers around the world by sharing your materials and activities.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {/* About You */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-lg mb-3">About You</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Your Name *</label>
              <input type="text" value={contributorName} onChange={e => setContributorName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="e.g. Sarah Johnson" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Email (optional)</label>
                <input type="email" value={contributorEmail} onChange={e => setContributorEmail(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="you@email.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Country (optional)</label>
                <input type="text" value={contributorCountry} onChange={e => setContributorCountry(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="e.g. South Africa" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">School (optional)</label>
              <input type="text" value={contributorSchool} onChange={e => setContributorSchool(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="e.g. Sunshine Montessori" />
            </div>
          </div>
        </div>

        {/* Work Details */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-lg mb-3">Work Details</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="e.g. Sandpaper Letters Variation" required maxLength={200} />
            </div>

            {/* Area selector */}
            <div>
              <label className="text-sm font-medium text-gray-700">Area *</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AREA_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setArea(opt.key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      area === opt.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={area === opt.key ? { backgroundColor: opt.color } : {}}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="e.g. Oral Language" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Age Range</label>
                <select value={ageRange} onChange={e => setAgeRange(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg">
                  {AGE_OPTIONS.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Short Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" rows={3} placeholder="What is this work? What does the child do?" required maxLength={2000} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Detailed Description / How-To Guide</label>
              <textarea value={detailedDescription} onChange={e => setDetailedDescription(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" rows={6} placeholder="Describe in detail how to present this work, step by step. Include what you say, what you do, and what the child does." maxLength={10000} />
              <p className="text-xs text-gray-400 mt-1">The more detail you provide, the more useful this will be for other teachers.</p>
            </div>
          </div>
        </div>

        {/* Materials & Pedagogy */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-lg mb-3">Materials & Learning Goals</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Materials Needed (one per line)</label>
              <textarea value={materialsInput} onChange={e => setMaterialsInput(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" rows={4} placeholder={"Sandpaper letters (lowercase)\nSmall tray\nBlindfolding cloth"} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">What Children Learn (one per line)</label>
              <textarea value={directAimsInput} onChange={e => setDirectAimsInput(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" rows={3} placeholder={"Letter recognition\nPhonetic sounds\nPre-writing preparation"} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Indirect Benefits (one per line)</label>
              <textarea value={indirectAimsInput} onChange={e => setIndirectAimsInput(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" rows={2} placeholder={"Fine motor development\nConcentration"} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Control of Error</label>
              <input type="text" value={controlOfError} onChange={e => setControlOfError(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="How does the child know they made a mistake?" />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-lg mb-1">Photos</h2>
          <p className="text-sm text-gray-500 mb-3">Add photos of the material, setup, or children working (up to 10)</p>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(photo)} alt="" className="w-full h-24 object-cover rounded-lg" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                  <input
                    type="text"
                    value={photoCaptions[i] || ''}
                    onChange={e => { const c = [...photoCaptions]; c[i] = e.target.value; setPhotoCaptions(c); }}
                    placeholder="Caption..."
                    className="w-full mt-1 px-2 py-1 text-xs border border-gray-200 rounded"
                  />
                </div>
              ))}
            </div>
          )}

          {photos.length < 10 && (
            <label className="flex items-center justify-center w-full py-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
              <span className="text-gray-500 text-sm">+ Add Photos</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} className="hidden" />
            </label>
          )}
        </div>

        {/* Videos */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-lg mb-1">Videos</h2>
          <p className="text-sm text-gray-500 mb-3">Add demonstration videos (up to 2, max 50MB each)</p>

          {videos.map((v, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded-lg">
              <span className="text-lg">🎬</span>
              <span className="text-sm text-gray-700 truncate flex-1">{v.name}</span>
              <button type="button" onClick={() => setVideos(prev => prev.filter((_, j) => j !== i))} className="text-red-500 text-sm">Remove</button>
            </div>
          ))}

          {videos.length < 2 && (
            <label className="flex items-center justify-center w-full py-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
              <span className="text-gray-500 text-sm">+ Add Video</span>
              <input type="file" accept="video/*" onChange={e => { if (e.target.files?.[0]) setVideos(prev => [...prev, e.target.files![0]]); }} className="hidden" />
            </label>
          )}
        </div>

        {/* PDFs */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-lg mb-1">Printable Files (PDF)</h2>
          <p className="text-sm text-gray-500 mb-3">Worksheets, card templates, labels, etc. (up to 3)</p>

          {pdfs.map((p, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded-lg">
              <span className="text-lg">📄</span>
              <span className="text-sm text-gray-700 truncate flex-1">{p.name}</span>
              <button type="button" onClick={() => setPdfs(prev => prev.filter((_, j) => j !== i))} className="text-red-500 text-sm">Remove</button>
            </div>
          ))}

          {pdfs.length < 3 && (
            <label className="flex items-center justify-center w-full py-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
              <span className="text-gray-500 text-sm">+ Add PDF</span>
              <input type="file" accept=".pdf" onChange={e => { if (e.target.files?.[0]) setPdfs(prev => [...prev, e.target.files![0]]); }} className="hidden" />
            </label>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-[#0D3330] text-white rounded-xl font-medium text-lg disabled:opacity-50 hover:bg-[#164440] transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Work for Review'}
        </button>
        <p className="text-center text-xs text-gray-400 pb-6">
          Your work will be reviewed before appearing in the library. This usually takes less than 24 hours.
        </p>
      </form>
    </div>
  );
}
