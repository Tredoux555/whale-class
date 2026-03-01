// @ts-nocheck
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';

const AREA_OPTIONS = [
  { key: 'practical_life', nameKey: 'area.practical_life', color: '#ec4899', icon: 'P' },
  { key: 'sensorial', nameKey: 'area.sensorial', color: '#8b5cf6', icon: 'S' },
  { key: 'mathematics', nameKey: 'area.mathematics', color: '#3b82f6', icon: 'M' },
  { key: 'language', nameKey: 'area.language', color: '#22c55e', icon: 'L' },
  { key: 'cultural', nameKey: 'area.cultural', color: '#f97316', icon: 'C' },
];

export default function UploadPage() {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Only the essentials
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photos.length;
    setPhotos(prev => [...prev, ...files.slice(0, remaining)]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !area) {
      setError(t('library.uploadValidation'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.set('title', title);
      formData.set('description', description || title);
      formData.set('area', area);
      formData.set('contributor_name', contributorName || t('library.anonymousTeacher' as any));
      formData.set('age_range', 'all');
      formData.set('materials', '[]');
      formData.set('direct_aims', '[]');
      formData.set('indirect_aims', '[]');
      formData.set('prerequisites', '[]');
      formData.set('presentation_steps', '[]');
      formData.set('variations', '[]');
      formData.set('extensions', '[]');

      photos.forEach((photo, i) => {
        formData.set(`photo_${i}`, photo);
        formData.set(`photo_${i}_caption`, '');
      });

      const res = await fetch('/api/montree/community/works', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('library.uploadFailed'));
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || t('library.uploadError'));
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-sm">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900">{t('library.workSubmitted')}</h2>
          <p className="text-gray-500 mt-2 text-sm">
            {t('library.submittedMessage')}
          </p>
          <div className="flex gap-3 mt-6">
            <Link href="/montree/library/browse" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-200 text-sm">
              {t('library.browse')}
            </Link>
            <button onClick={() => { setSubmitted(false); setTitle(''); setDescription(''); setPhotos([]); setArea(''); }} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 text-sm">
              {t('library.shareAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0D3330] text-white px-4 py-4">
        <div className="max-w-lg mx-auto">
          <Link href="/montree/library/browse" className="text-emerald-300 text-sm hover:underline">← {t('library.back')}</Link>
          <h1 className="text-xl font-bold mt-1">{t('library.shareWork')}</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {/* Area — big tappable pills */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">{t('library.area')} *</label>
          <div className="flex flex-wrap gap-2">
            {AREA_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setArea(opt.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  area === opt.key ? 'text-white shadow-sm scale-[1.02]' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
                style={area === opt.key ? { backgroundColor: opt.color } : {}}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: opt.color }}>
                  {opt.icon}
                </span>
                {t(opt.nameKey as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Work name */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">{t('library.workName')} *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-gray-800"
            placeholder={t('library.workNamePlaceholder')}
            required
            maxLength={200}
          />
        </div>

        {/* Short description — optional */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">{t('library.quickNote')} <span className="text-gray-400 font-normal">{t('library.optional')}</span></label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-gray-800"
            rows={2}
            placeholder={t('library.quickNotePlaceholder')}
            maxLength={500}
          />
        </div>

        {/* Photos — simple */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">{t('library.photos')} <span className="text-gray-400 font-normal">{t('library.upTo5')}</span></label>

          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(photo)} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-sm">×</button>
                </div>
              ))}
            </div>
          )}

          {photos.length < 5 && (
            <label className="flex items-center justify-center w-full py-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
              <span className="text-gray-400 text-sm">+ {t('library.addPhotos')}</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} className="hidden" />
            </label>
          )}
        </div>

        {/* Your name — optional */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">{t('library.yourName')} <span className="text-gray-400 font-normal">{t('library.optional')}</span></label>
          <input
            type="text"
            value={contributorName}
            onChange={e => setContributorName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-gray-800"
            placeholder={t('library.yourNamePlaceholder')}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !title || !area}
          className="w-full py-4 bg-[#0D3330] text-white rounded-xl font-medium text-lg disabled:opacity-40 hover:bg-[#164440] transition-colors"
        >
          {submitting ? t('library.sharing') : t('library.shareWork')}
        </button>
      </form>
    </div>
  );
}
