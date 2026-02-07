'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Material, Work, Category, ExtensionDetail } from './types';
import {
  extensionDetails,
  initialSoundObjects,
  cvcWordFamilies,
  phonogramData,
  grammarSymbols,
  assessmentChecklist
} from './data';
import {
  detailedShelfOrganization,
  curriculumData,
} from './data';
import SequenceView from './components/SequenceView';

// =============================================================================
// COMPONENT
// =============================================================================

export default function EnglishProcurementPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'sequence' | 'shopping' | 'objects' | 'words' | 'phonograms' | 'grammar' | 'shelves' | 'checklist'>('sequence');
  const [essentialOnly, setEssentialOnly] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedPhonogramType, setSelectedPhonogramType] = useState<string>('all');
  const [expandedShelfItem, setExpandedShelfItem] = useState<string | null>(null);
  const [expandedExtension, setExpandedExtension] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTerm(text);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  // Collect all materials
  const allMaterials = curriculumData.flatMap(cat =>
    cat.works.flatMap(work =>
      work.materials.map(mat => ({
        ...mat,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        workName: work.name,
        categoryId: cat.id
      }))
    )
  ).filter((mat, index, self) =>
    mat.price !== '—' && 
    mat.search1688 !== '同上' &&
    index === self.findIndex(m => m.search1688 === mat.search1688)
  );

  const filteredMaterials = essentialOnly 
    ? allMaterials.filter(m => m.essential)
    : allMaterials;

  const selectedCategoryData = curriculumData.find(c => c.id === selectedCategory);
  const selectedWorkData = selectedCategoryData?.works.find(w => w.id === selectedWork);

  // Calculate totals
  const totalWorks = curriculumData.reduce((sum, cat) => sum + cat.works.length, 0);
  const essentialCount = allMaterials.filter(m => m.essential).length;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-indigo-200 hover:text-white text-sm mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold">AMI English Language Album</h1>
          <p className="text-indigo-200 mt-1">Complete Montessori literacy curriculum for ages 3-6</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="bg-slate-800/20 px-3 py-1 rounded-full">{curriculumData.length} Categories</span>
            <span className="bg-slate-800/20 px-3 py-1 rounded-full">{totalWorks} Works</span>
            <span className="bg-slate-800/20 px-3 py-1 rounded-full">{allMaterials.length} Materials</span>
            <span className="bg-green-400/30 px-3 py-1 rounded-full">{essentialCount} Essential</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* View Toggle */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setViewMode('sequence'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'sequence' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            📚 Curriculum Sequence
          </button>
          <button
            onClick={() => { setViewMode('shopping'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'shopping' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            🛒 Shopping List ({filteredMaterials.length})
          </button>
          <button
            onClick={() => { setViewMode('objects'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'objects' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            🔤 Objects A-Z
          </button>
          <button
            onClick={() => { setViewMode('words'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'words' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            📝 Word Families
          </button>
          <button
            onClick={() => { setViewMode('phonograms'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'phonograms' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            🔊 Phonograms
          </button>
          <button
            onClick={() => { setViewMode('grammar'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'grammar' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-gray-200 hover:bg-slate-600'
            }`}
          >
            📋 Grammar Boxes
          </button>
          <button
            onClick={() => { setViewMode('shelves'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'shelves' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            🗄️ Shelf Layout
          </button>
          <button
            onClick={() => { setViewMode('checklist'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'checklist' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            ✅ Assessment
          </button>
          {viewMode === 'shopping' && (
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={essentialOnly}
                onChange={(e) => setEssentialOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-200">Essential only ({essentialCount})</span>
            </label>
          )}
          <a
            href="/docs/1688_Procurement_Guide.pdf"
            download="1688_Procurement_Guide.pdf"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition ml-auto"
          >
            📄 Download Guide
          </a>
          <a
            href="https://www.1688.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition"
          >
            🔗 Open 1688.com
          </a>
        </div>

        {/* SHOPPING LIST VIEW */}
        {viewMode === 'shopping' && (
          <div className="bg-slate-800 rounded-xl shadow-sm">
            <div className="p-4 border-b border-slate-600 bg-slate-700">
              <h2 className="font-bold">Complete Materials List</h2>
              <p className="text-sm text-gray-300">Click any search term to copy for 1688.com</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Material</th>
                    <th className="text-left p-3 font-medium">1688 Search Term</th>
                    <th className="text-left p-3 font-medium">Specifications</th>
                    <th className="text-left p-3 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((mat, i) => (
                    <tr key={i} className={`border-b hover:bg-slate-700 ${mat.essential ? 'bg-green-50/50' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-start gap-2">
                          {mat.essential && <span className="text-green-600 text-xs">★</span>}
                          <div>
                            <div className="font-medium">{mat.name}</div>
                            <div className="text-gray-400 text-xs">{mat.categoryIcon} {mat.categoryName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => copyToClipboard(mat.search1688)}
                          className="text-left hover:bg-indigo-50 p-2 rounded transition w-full"
                        >
                          <div className="font-medium text-indigo-600">{mat.search1688}</div>
                          {mat.altSearch && (
                            <div className="text-gray-400 text-xs mt-1">Alt: {mat.altSearch}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {copiedTerm === mat.search1688 ? '✓ Copied!' : 'Click to copy'}
                          </div>
                        </button>
                      </td>
                      <td className="p-3 text-gray-300 text-xs">{mat.specs}</td>
                      <td className="p-3 font-medium text-green-700">{mat.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OBJECTS A-Z VIEW */}
        {viewMode === 'objects' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Initial Sound Objects (A-Z)</h2>
            <p className="text-gray-300 mb-6">Complete list of miniature objects for Sound Games and Object Boxes. Click a letter to see objects.</p>
            
            {/* Letter selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.keys(initialSoundObjects).map(letter => (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                  className={`w-10 h-10 rounded-lg font-bold transition ${
                    selectedLetter === letter 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                  }`}
                >
                  {letter.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => setSelectedLetter('all')}
                className={`px-4 h-10 rounded-lg font-medium transition ${
                  selectedLetter === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                }`}
              >
                Show All
              </button>
            </div>

            {/* Objects display */}
            {selectedLetter === 'all' ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(initialSoundObjects).map(([letter, objects]) => (
                  <div key={letter} className="border border-slate-600 rounded-lg p-4">
                    <div className="font-bold text-2xl text-indigo-600 mb-2">{letter.toUpperCase()}</div>
                    <div className="flex flex-wrap gap-1">
                      {objects.map((obj, i) => (
                        <span key={i} className="bg-slate-600 px-2 py-1 rounded text-sm">{obj}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedLetter ? (
              <div className="border border-slate-600 rounded-lg p-6">
                <div className="font-bold text-4xl text-indigo-600 mb-4">{selectedLetter.toUpperCase()}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {initialSoundObjects[selectedLetter]?.map((obj, i) => (
                    <div key={i} className="bg-slate-700 border border-slate-600 rounded-lg p-3 text-center">
                      <div className="font-medium">{obj}</div>
                      <div className="text-xs text-gray-400">/{selectedLetter}/ sound</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                Click a letter above to see objects for that sound
              </div>
            )}
          </div>
        )}

        {/* WORD FAMILIES VIEW */}
        {viewMode === 'words' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Complete Word Family Lists</h2>
            <p className="text-gray-300 mb-6">All CVC word families organized by vowel sound. Use for Pink Series materials and word family cards.</p>
            
            {/* Vowel tabs */}
            <div className="flex gap-2 mb-6 border-b pb-2">
              {['Short A', 'Short E', 'Short I', 'Short O', 'Short U'].map(vowel => (
                <button
                  key={vowel}
                  onClick={() => setSelectedLetter(vowel)}
                  className={`px-4 py-2 rounded-t-lg font-medium transition ${
                    selectedLetter === vowel 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                  }`}
                >
                  {vowel}
                </button>
              ))}
            </div>

            {/* Word families grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(cvcWordFamilies)
                .filter(([family]) => {
                  if (!selectedLetter) return true;
                  const vowelMap: Record<string, string[]> = {
                    'Short A': ['-at', '-an', '-ap', '-ad', '-ag', '-am', '-ab', '-ack', '-ash', '-ang', '-ank'],
                    'Short E': ['-et', '-en', '-ed', '-eg', '-ell', '-eck', '-est', '-ent', '-end'],
                    'Short I': ['-it', '-in', '-ig', '-ip', '-id', '-ill', '-ick', '-ing', '-ink'],
                    'Short O': ['-ot', '-op', '-og', '-ob', '-ock', '-ong'],
                    'Short U': ['-ut', '-un', '-ug', '-up', '-ub', '-uck', '-ump', '-unk', '-ung', '-uss']
                  };
                  return vowelMap[selectedLetter]?.includes(family);
                })
                .map(([family, words]) => (
                  <div key={family} className="border border-slate-600 rounded-lg p-4">
                    <div className="font-bold text-lg text-indigo-600 mb-2">{family}</div>
                    <div className="flex flex-wrap gap-1">
                      {words.map((word, i) => (
                        <span key={i} className="bg-pink-50 text-pink-700 px-2 py-1 rounded text-sm">{word}</span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">{words.length} words</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* PHONOGRAMS VIEW */}
        {viewMode === 'phonograms' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Complete Phonogram Reference</h2>
            <p className="text-gray-300 mb-6">All English phonograms with sounds, positions, and example words.</p>
            
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', label: 'All' },
                { id: 'consonant', label: 'Consonant Digraphs' },
                { id: 'long-a', label: 'Long A' },
                { id: 'long-e', label: 'Long E' },
                { id: 'long-i', label: 'Long I' },
                { id: 'long-o', label: 'Long O' },
                { id: 'long-u', label: 'Long U' },
                { id: 'r-controlled', label: 'R-Controlled' },
                { id: 'diphthong', label: 'Diphthongs' },
                { id: 'other', label: 'Other Patterns' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedPhonogramType(tab.id)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    selectedPhonogramType === tab.id 
                      ? 'bg-green-600 text-white' 
                      : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Phonograms grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(phonogramData)
                .filter(([phonogram]) => {
                  if (selectedPhonogramType === 'all') return true;
                  const categories: Record<string, string[]> = {
                    'consonant': ['sh', 'ch', 'th', 'wh', 'ck', 'ng', 'nk', 'ph', 'gh', 'kn', 'wr', 'gn', 'mb', 'tch', 'dge'],
                    'long-a': ['ai', 'ay', 'a_e', 'eigh', 'ey'],
                    'long-e': ['ee', 'ea', 'e_e', 'ie'],
                    'long-i': ['i_e', 'igh', 'y', 'ie'],
                    'long-o': ['oa', 'ow', 'o_e', 'oe'],
                    'long-u': ['u_e', 'ue', 'ew'],
                    'r-controlled': ['ar', 'or', 'er', 'ir', 'ur', 'ear', 'air', 'are'],
                    'diphthong': ['oo', 'ou', 'ow', 'oi', 'oy', 'aw', 'au'],
                    'other': ['tion', 'sion', 'ture', 'ous', 'ough', 'ful', 'less', 'able', 'ible']
                  };
                  return categories[selectedPhonogramType]?.includes(phonogram);
                })
                .map(([phonogram, data]) => (
                  <div key={phonogram} className="border border-slate-600 rounded-lg p-4 bg-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-green-600 text-white px-3 py-1 rounded-lg font-bold text-lg">{phonogram}</span>
                      <span className="text-gray-200">{data.sound}</span>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">Position: {data.position}</div>
                    <div className="flex flex-wrap gap-1">
                      {data.examples.map((word, i) => (
                        <span key={i} className="bg-slate-700 border border-slate-600 px-2 py-1 rounded text-sm text-gray-100">{word}</span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* GRAMMAR BOXES VIEW */}
        {viewMode === 'grammar' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Grammar Box Sentences</h2>
            <p className="text-gray-300 mb-6">Example sentences for each of the 9 Grammar Filling Boxes. Print these for classroom use.</p>
            
            <div className="space-y-6">
              {Object.entries(grammarBoxSentences).map(([box, data]) => (
                <div key={box} className="border border-slate-600 rounded-lg overflow-hidden">
                  <div className="bg-indigo-900/50 px-4 py-3 border-b border-slate-600">
                    <h3 className="font-bold text-indigo-300">{box}</h3>
                    <p className="text-sm text-indigo-400">{data.instruction}</p>
                  </div>
                  <div className="p-4 grid md:grid-cols-2 gap-2">
                    {data.sentences.map((sentence, i) => (
                      <div key={i} className="bg-slate-700 p-2 rounded text-sm font-mono text-gray-200">
                        {i + 1}. {sentence}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHELF LAYOUT VIEW */}
        {viewMode === 'shelves' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-600">
              <h2 className="text-2xl font-bold mb-2">🗄️ Complete Shelf Setup Guide</h2>
              <p className="text-gray-300 mb-4">Click any item for detailed specifications. Three tiers help you prioritize your budget.</p>
              
              {/* Tier Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-400 font-medium">Essential</span>
                  <span className="text-gray-400">- Minimum viable, budget-friendly</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                  <span className="text-blue-400 font-medium">Complete</span>
                  <span className="text-gray-400">- Professional AMI standard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-500"></span>
                  <span className="text-purple-400 font-medium">Premium</span>
                  <span className="text-gray-400">- Comprehensive, beautiful</span>
                </div>
              </div>
            </div>

            {/* Shelves */}
            {detailedShelfOrganization.map((shelf, shelfIndex) => (
              <div key={shelfIndex} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-600">
                {/* Shelf Header */}
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl text-white">{shelf.shelf}</h3>
                    <span className="text-amber-100 text-sm bg-amber-800/50 px-3 py-1 rounded-full">{shelf.position}</span>
                  </div>
                </div>
                
                {/* Shelf Note */}
                <div className="bg-blue-900/30 border-b border-blue-500/30 px-5 py-3">
                  <p className="text-blue-200 text-sm">💡 {shelf.notes}</p>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-700">
                  {shelf.items.map((item, itemIndex) => {
                    const itemKey = `${shelfIndex}-${itemIndex}`;
                    const isExpanded = expandedShelfItem === itemKey;
                    
                    return (
                      <div key={itemIndex} className="bg-slate-800">
                        {/* Item Header - Clickable */}
                        <button
                          onClick={() => setExpandedShelfItem(isExpanded ? null : itemKey)}
                          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-700/50 transition text-left"
                        >
                          <span className="font-medium text-gray-100">{item.name}</span>
                          <div className="flex items-center gap-3">
                            {/* Tier indicators */}
                            <div className="flex gap-1">
                              {item.details.some(d => d.tier === 'essential') && (
                                <span className="w-3 h-3 rounded-full bg-emerald-500" title="Essential"></span>
                              )}
                              {item.details.some(d => d.tier === 'complete') && (
                                <span className="w-3 h-3 rounded-full bg-blue-500" title="Complete"></span>
                              )}
                              {item.details.some(d => d.tier === 'premium') && (
                                <span className="w-3 h-3 rounded-full bg-purple-500" title="Premium"></span>
                              )}
                            </div>
                            <span className={`text-xl transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-5 pb-5 space-y-4">
                            {item.details.map((detail, detailIndex) => {
                              const tierColors = {
                                essential: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', badge: 'bg-emerald-500', text: 'text-emerald-300' },
                                complete: { bg: 'bg-blue-900/30', border: 'border-blue-500/40', badge: 'bg-blue-500', text: 'text-blue-300' },
                                premium: { bg: 'bg-purple-900/30', border: 'border-purple-500/40', badge: 'bg-purple-500', text: 'text-purple-300' }
                              };
                              const colors = tierColors[detail.tier];

                              return (
                                <div key={detailIndex} className={`rounded-lg p-5 ${colors.bg} border ${colors.border}`}>
                                  {/* Tier Badge */}
                                  <div className="flex items-center gap-2 mb-4">
                                    <span className={`${colors.badge} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>
                                      {detail.tier === 'essential' ? '🟢 Essential' : detail.tier === 'complete' ? '🔵 Complete' : '🟣 Premium'}
                                    </span>
                                    <span className={`${colors.text} font-medium`}>{detail.price}</span>
                                  </div>

                                  {/* What */}
                                  <div className="mb-4">
                                    <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">What is this?</h5>
                                    <p className="text-gray-200">{detail.what}</p>
                                  </div>

                                  {/* Grid of specs */}
                                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                      <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">📦 How Many?</h5>
                                      <p className="text-gray-200 text-sm">{detail.quantity}</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                      <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">📐 Size</h5>
                                      <p className="text-gray-200 text-sm">{detail.size}</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3 md:col-span-2">
                                      <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">📁 Container / Storage</h5>
                                      <p className="text-gray-200 text-sm">{detail.container}</p>
                                    </div>
                                  </div>

                                  {/* Contents if available */}
                                  {detail.contents && detail.contents.length > 0 && (
                                    <div className="mb-4">
                                      <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-2">📋 What to Include</h5>
                                      <div className="bg-slate-800/50 rounded-lg p-3">
                                        <ul className="space-y-1">
                                          {detail.contents.map((content, i) => (
                                            <li key={i} className="text-gray-200 text-sm">{content}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}

                                  {/* Tips */}
                                  <div className="bg-amber-900/40 border border-amber-500/30 rounded-lg p-3">
                                    <h5 className="text-xs uppercase tracking-wide text-amber-400 mb-1">💡 Practical Tips</h5>
                                    <p className="text-amber-200/90 text-sm">{detail.tips}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Budget Summary */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-600">
              <h3 className="text-xl font-bold mb-4">💰 Budget Summary (20 Children)</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-emerald-900/30 border border-emerald-500/40 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500"></span>
                    <span className="font-bold text-emerald-400">Essential Tier</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">¥5,500 - ¥10,000</div>
                  <div className="text-emerald-300 text-sm">Minimum viable classroom setup</div>
                  <ul className="text-gray-300 text-sm mt-3 space-y-1">
                    <li>• Basic vocabulary baskets</li>
                    <li>• 1 set sandpaper letters</li>
                    <li>• 2 moveable alphabets</li>
                    <li>• 1 Pink/Blue/Green series</li>
                  </ul>
                </div>
                <div className="bg-blue-900/30 border border-blue-500/40 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                    <span className="font-bold text-blue-400">Complete Tier</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">¥17,000 - ¥30,000</div>
                  <div className="text-blue-300 text-sm">Professional AMI standard</div>
                  <ul className="text-gray-300 text-sm mt-3 space-y-1">
                    <li>• Full vocabulary collection</li>
                    <li>• Quality card materials</li>
                    <li>• 3 moveable alphabets</li>
                    <li>• Grammar materials</li>
                  </ul>
                </div>
                <div className="bg-purple-900/30 border border-purple-500/40 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-4 h-4 rounded-full bg-purple-500"></span>
                    <span className="font-bold text-purple-400">Premium Tier</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">¥40,000 - ¥80,000</div>
                  <div className="text-purple-300 text-sm">Comprehensive, museum quality</div>
                  <ul className="text-gray-300 text-sm mt-3 space-y-1">
                    <li>• Nienhuis materials</li>
                    <li>• Custom wooden storage</li>
                    <li>• 4+ moveable alphabets</li>
                    <li>• Complete everything</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASSESSMENT CHECKLIST VIEW */}
        {viewMode === 'checklist' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Assessment Checklist</h2>
            <p className="text-gray-300 mb-6">Track child progress through the language curriculum. Print and use for individual student records.</p>
            
            <div className="space-y-6">
              {Object.entries(assessmentChecklist).map(([category, skills]) => (
                <div key={category} className="border border-slate-600 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 px-4 py-3 border-b">
                    <h3 className="font-bold text-purple-800">{category}</h3>
                  </div>
                  <div className="divide-y">
                    {skills.map((skill, i) => (
                      <div key={i} className="p-3 flex gap-4">
                        <input type="checkbox" className="mt-1 h-5 w-5 rounded" />
                        <div className="flex-1">
                          <div className="font-medium">{skill.skill}</div>
                          <div className="text-sm text-gray-400">{skill.indicators}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-slate-600 rounded-lg text-sm text-gray-300">
              <strong>Note:</strong> This checklist is interactive for preview purposes. For classroom use, print this page or export to create permanent student records.
            </div>
          </div>
        )}

        {/* SEQUENCE VIEW */}
        {viewMode === 'sequence' && (
          <SequenceView
            curriculumData={curriculumData}
            extensionDetails={extensionDetails}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedWork={selectedWork}
            setSelectedWork={setSelectedWork}
            copiedTerm={copiedTerm}
            copyToClipboard={copyToClipboard}
            expandedExtension={expandedExtension}
            setExpandedExtension={setExpandedExtension}
          />
        )}
      </div>
    </div>
  );
}
