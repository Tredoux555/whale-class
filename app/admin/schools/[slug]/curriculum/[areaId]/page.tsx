// app/admin/schools/[slug]/curriculum/[areaId]/page.tsx
// Curriculum Area - Shows all works in this area
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Work {
  id: string;
  name: string;
  description?: string;
  sequence: number;
  isActive: boolean;
}

// Area metadata
const AREAS: Record<string, { name: string; icon: string; color: string }> = {
  practical_life: { name: 'Practical Life', icon: '🧹', color: 'from-amber-500 to-orange-500' },
  sensorial: { name: 'Sensorial', icon: '👁️', color: 'from-pink-500 to-rose-500' },
  math: { name: 'Mathematics', icon: '🔢', color: 'from-blue-500 to-indigo-500' },
  language: { name: 'Language', icon: '📚', color: 'from-green-500 to-emerald-500' },
  cultural: { name: 'Cultural', icon: '🌍', color: 'from-purple-500 to-violet-500' },
};

// Mock works - will be replaced with API call to curriculum_roadmap
const MOCK_WORKS: Record<string, Work[]> = {
  practical_life: [
    { id: 'pl1', name: 'Pouring - Dry', description: 'Pouring beans or rice between containers', sequence: 1, isActive: true },
    { id: 'pl2', name: 'Pouring - Wet', description: 'Pouring water between containers', sequence: 2, isActive: true },
    { id: 'pl3', name: 'Spooning', description: 'Transferring with a spoon', sequence: 3, isActive: true },
    { id: 'pl4', name: 'Tonging', description: 'Transferring with tongs', sequence: 4, isActive: true },
    { id: 'pl5', name: 'Tweezing', description: 'Transferring with tweezers', sequence: 5, isActive: true },
    { id: 'pl6', name: 'Threading - Large Beads', description: 'Threading large wooden beads', sequence: 6, isActive: true },
    { id: 'pl7', name: 'Threading - Small Beads', description: 'Threading small beads', sequence: 7, isActive: true },
    { id: 'pl8', name: 'Buttoning Frame', description: 'Dressing frame - buttons', sequence: 8, isActive: true },
    { id: 'pl9', name: 'Zipping Frame', description: 'Dressing frame - zipper', sequence: 9, isActive: true },
    { id: 'pl10', name: 'Snapping Frame', description: 'Dressing frame - snaps', sequence: 10, isActive: true },
    { id: 'pl11', name: 'Buckling Frame', description: 'Dressing frame - buckles', sequence: 11, isActive: true },
    { id: 'pl12', name: 'Bow Tying Frame', description: 'Dressing frame - bows', sequence: 12, isActive: true },
    { id: 'pl13', name: 'Folding Cloths', description: 'Folding napkins and cloths', sequence: 13, isActive: true },
    { id: 'pl14', name: 'Table Washing', description: 'Washing and drying a table', sequence: 14, isActive: true },
    { id: 'pl15', name: 'Dish Washing', description: 'Washing dishes', sequence: 15, isActive: true },
    { id: 'pl16', name: 'Plant Care', description: 'Watering and caring for plants', sequence: 16, isActive: true },
    { id: 'pl17', name: 'Flower Arranging', description: 'Arranging flowers in a vase', sequence: 17, isActive: true },
    { id: 'pl18', name: 'Food Preparation - Banana', description: 'Slicing bananas', sequence: 18, isActive: true },
    { id: 'pl19', name: 'Food Preparation - Cucumber', description: 'Cutting cucumbers', sequence: 19, isActive: true },
    { id: 'pl20', name: 'Polishing - Wood', description: 'Polishing wooden objects', sequence: 20, isActive: true },
  ],
  sensorial: [
    { id: 's1', name: 'Cylinder Blocks', description: 'Visual discrimination of dimension', sequence: 1, isActive: true },
    { id: 's2', name: 'Pink Tower', description: 'Visual discrimination - cubes decreasing', sequence: 2, isActive: true },
    { id: 's3', name: 'Brown Stair', description: 'Visual discrimination - prisms', sequence: 3, isActive: true },
    { id: 's4', name: 'Red Rods', description: 'Visual discrimination - length', sequence: 4, isActive: true },
    { id: 's5', name: 'Color Tablets Box 1', description: 'Primary colors', sequence: 5, isActive: true },
    { id: 's6', name: 'Color Tablets Box 2', description: 'Secondary colors', sequence: 6, isActive: true },
    { id: 's7', name: 'Color Tablets Box 3', description: 'Color grading', sequence: 7, isActive: true },
    { id: 's8', name: 'Geometric Cabinet', description: 'Visual discrimination - shapes', sequence: 8, isActive: true },
    { id: 's9', name: 'Constructive Triangles', description: 'Triangle combinations', sequence: 9, isActive: true },
    { id: 's10', name: 'Binomial Cube', description: '3D puzzle - algebraic formula', sequence: 10, isActive: true },
    { id: 's11', name: 'Trinomial Cube', description: 'Advanced 3D puzzle', sequence: 11, isActive: true },
    { id: 's12', name: 'Sound Cylinders', description: 'Auditory discrimination', sequence: 12, isActive: true },
    { id: 's13', name: 'Touch Boards', description: 'Tactile discrimination - rough/smooth', sequence: 13, isActive: true },
    { id: 's14', name: 'Fabric Box', description: 'Tactile - fabric types', sequence: 14, isActive: true },
    { id: 's15', name: 'Thermic Tablets', description: 'Temperature discrimination', sequence: 15, isActive: true },
    { id: 's16', name: 'Baric Tablets', description: 'Weight discrimination', sequence: 16, isActive: true },
    { id: 's17', name: 'Smelling Bottles', description: 'Olfactory discrimination', sequence: 17, isActive: true },
    { id: 's18', name: 'Tasting Bottles', description: 'Gustatory discrimination', sequence: 18, isActive: true },
  ],
  math: [
    { id: 'm1', name: 'Number Rods', description: 'Introduction to quantity 1-10', sequence: 1, isActive: true },
    { id: 'm2', name: 'Sandpaper Numbers', description: 'Writing numerals 0-9', sequence: 2, isActive: true },
    { id: 'm3', name: 'Number Rods & Cards', description: 'Association quantity and symbol', sequence: 3, isActive: true },
    { id: 'm4', name: 'Spindle Boxes', description: 'Concept of zero, counting', sequence: 4, isActive: true },
    { id: 'm5', name: 'Cards & Counters', description: 'Odd and even, counting', sequence: 5, isActive: true },
    { id: 'm6', name: 'Golden Beads - Intro', description: 'Introduction to decimal system', sequence: 6, isActive: true },
    { id: 'm7', name: 'Golden Beads - Formation', description: 'Number formation with beads', sequence: 7, isActive: true },
    { id: 'm8', name: 'Golden Beads - Addition', description: 'Static addition', sequence: 8, isActive: true },
    { id: 'm9', name: 'Golden Beads - Subtraction', description: 'Static subtraction', sequence: 9, isActive: true },
    { id: 'm10', name: 'Golden Beads - Multiplication', description: 'Introduction to multiplication', sequence: 10, isActive: true },
    { id: 'm11', name: 'Teen Board 1', description: 'Numbers 11-19', sequence: 11, isActive: true },
    { id: 'm12', name: 'Teen Board 2', description: 'Teen numbers with beads', sequence: 12, isActive: true },
    { id: 'm13', name: 'Ten Board 1', description: 'Numbers 10-99', sequence: 13, isActive: true },
    { id: 'm14', name: 'Ten Board 2', description: 'Tens with beads', sequence: 14, isActive: true },
    { id: 'm15', name: 'Hundred Board', description: 'Linear counting to 100', sequence: 15, isActive: true },
    { id: 'm16', name: 'Bead Chains - 100', description: 'Skip counting', sequence: 16, isActive: true },
    { id: 'm17', name: 'Bead Chains - 1000', description: 'Skip counting to 1000', sequence: 17, isActive: true },
    { id: 'm18', name: 'Addition Strip Board', description: 'Memorization of addition', sequence: 18, isActive: true },
    { id: 'm19', name: 'Subtraction Strip Board', description: 'Memorization of subtraction', sequence: 19, isActive: true },
    { id: 'm20', name: 'Multiplication Board', description: 'Memorization of multiplication', sequence: 20, isActive: true },
  ],
  language: [
    { id: 'l1', name: 'I Spy - Beginning Sounds', description: 'Phonemic awareness - initial sounds', sequence: 1, isActive: true },
    { id: 'l2', name: 'I Spy - Ending Sounds', description: 'Phonemic awareness - final sounds', sequence: 2, isActive: true },
    { id: 'l3', name: 'I Spy - Middle Sounds', description: 'Phonemic awareness - medial vowels', sequence: 3, isActive: true },
    { id: 'l4', name: 'Sandpaper Letters', description: 'Letter formation and sounds', sequence: 4, isActive: true },
    { id: 'l5', name: 'Moveable Alphabet - CVC', description: 'Word building with CVC words', sequence: 5, isActive: true },
    { id: 'l6', name: 'Object Box 1', description: 'Reading CVC words with objects', sequence: 6, isActive: true },
    { id: 'l7', name: 'Pink Series - Lists', description: 'Reading CVC word lists', sequence: 7, isActive: true },
    { id: 'l8', name: 'Pink Series - Sentences', description: 'Reading simple sentences', sequence: 8, isActive: true },
    { id: 'l9', name: 'Pink Series - Books', description: 'Reading phonetic readers', sequence: 9, isActive: true },
    { id: 'l10', name: 'Blue Series - Blends', description: 'Consonant blends introduction', sequence: 10, isActive: true },
    { id: 'l11', name: 'Blue Series - Lists', description: 'Reading blend word lists', sequence: 11, isActive: true },
    { id: 'l12', name: 'Blue Series - Sentences', description: 'Sentences with blends', sequence: 12, isActive: true },
    { id: 'l13', name: 'Green Series - Phonograms', description: 'Introduction to phonograms', sequence: 13, isActive: true },
    { id: 'l14', name: 'Green Series - Lists', description: 'Reading phonogram words', sequence: 14, isActive: true },
    { id: 'l15', name: 'Metal Insets', description: 'Preparation for writing', sequence: 15, isActive: true },
    { id: 'l16', name: 'Chalkboard Writing', description: 'Large letter formation', sequence: 16, isActive: true },
    { id: 'l17', name: 'Paper Writing', description: 'Writing on lined paper', sequence: 17, isActive: true },
  ],
  cultural: [
    { id: 'c1', name: 'Globe - Land & Water', description: 'Introduction to Earth', sequence: 1, isActive: true },
    { id: 'c2', name: 'Globe - Continents', description: 'Continent colors and names', sequence: 2, isActive: true },
    { id: 'c3', name: 'World Map Puzzle', description: 'Continents puzzle', sequence: 3, isActive: true },
    { id: 'c4', name: 'Continent Folders', description: 'Animals, landmarks per continent', sequence: 4, isActive: true },
    { id: 'c5', name: 'Asia Map Puzzle', description: 'Countries of Asia', sequence: 5, isActive: true },
    { id: 'c6', name: 'China Folder', description: 'Chinese culture and geography', sequence: 6, isActive: true },
    { id: 'c7', name: 'Botany Cabinet', description: 'Leaf shapes', sequence: 7, isActive: true },
    { id: 'c8', name: 'Parts of a Plant', description: 'Root, stem, leaf, flower', sequence: 8, isActive: true },
    { id: 'c9', name: 'Parts of a Flower', description: 'Flower anatomy', sequence: 9, isActive: true },
    { id: 'c10', name: 'Life Cycles - Plant', description: 'Seed to plant cycle', sequence: 10, isActive: true },
    { id: 'c11', name: 'Life Cycles - Butterfly', description: 'Metamorphosis', sequence: 11, isActive: true },
    { id: 'c12', name: 'Life Cycles - Frog', description: 'Tadpole to frog', sequence: 12, isActive: true },
    { id: 'c13', name: 'Animal Classification', description: 'Vertebrates and invertebrates', sequence: 13, isActive: true },
    { id: 'c14', name: 'Solar System', description: 'Planets and sun', sequence: 14, isActive: true },
    { id: 'c15', name: 'Days of the Week', description: 'Calendar work', sequence: 15, isActive: true },
    { id: 'c16', name: 'Months of the Year', description: 'Calendar sequence', sequence: 16, isActive: true },
    { id: 'c17', name: 'Seasons', description: 'Four seasons cycle', sequence: 17, isActive: true },
  ],
};

export default function CurriculumAreaPage() {
  const params = useParams();
  const slug = params.slug as string;
  const areaId = params.areaId as string;
  
  const area = AREAS[areaId];
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load works - mock for now, will connect to API
    setTimeout(() => {
      setWorks(MOCK_WORKS[areaId] || []);
      setLoading(false);
    }, 300);
  }, [areaId]);

  if (!area) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-white mb-2">Area Not Found</h2>
          <Link href={`/admin/schools/${slug}/curriculum`} className="text-amber-400">
            ← Back to Curriculum
          </Link>
        </div>
      </div>
    );
  }

  const filteredWorks = works.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeWorks = works.filter(w => w.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className={`bg-gradient-to-r ${area.color} sticky top-0 z-20`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/schools/${slug}/curriculum`} className="text-white/70 hover:text-white transition-colors text-sm">
              ← Curriculum
            </Link>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">{area.icon}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{area.name}</h1>
              <p className="text-white/70 text-sm">{works.length} works</p>
            </div>
          </div>
          
          <button className="px-4 py-2 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors text-sm">
            + Add Work
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Stats & Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <div className="bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
              <span className="text-2xl font-bold text-white">{works.length}</span>
              <span className="text-slate-400 text-sm ml-2">total</span>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
              <span className="text-2xl font-bold text-green-400">{activeWorks}</span>
              <span className="text-slate-400 text-sm ml-2">active</span>
            </div>
          </div>
          
          <input
            type="text"
            placeholder="Search works..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 w-64"
          />
        </div>

        {/* Works List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWorks.map((work) => (
              <div
                key={work.id}
                className={`bg-slate-800 border rounded-xl p-4 transition-all ${
                  work.isActive ? 'border-slate-700 hover:border-slate-600' : 'border-slate-800 opacity-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Sequence */}
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-slate-300">
                    {work.sequence}
                  </div>
                  
                  {/* Work Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white">{work.name}</h3>
                    {work.description && (
                      <p className="text-sm text-slate-400 truncate">{work.description}</p>
                    )}
                  </div>
                  
                  {/* Status */}
                  <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    work.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'
                  }`}>
                    {work.isActive ? '✓ Active' : 'Hidden'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredWorks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-slate-400">
              {searchTerm ? 'No works match your search' : 'No works in this area yet'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
