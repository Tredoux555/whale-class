'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2,
  Check,
  ShoppingCart,
  Package,
  DollarSign,
  Search,
  ExternalLink
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  price: number;
  essential: boolean;
  activity_name: string;
  activity_id: string;
  area: string;
  owned: boolean;
}

export default function MaterialsChecklist({ 
  params 
}: { 
  params: Promise<{ familyId: string }> 
}) {
  const { familyId } = use(params);
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'needed' | 'owned'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMaterials();
    loadOwned();
  }, [familyId]);

  const loadMaterials = async () => {
    try {
      const res = await fetch('/api/montree-home/curriculum?master=true');
      const data = await res.json();
      
      // Extract all materials from curriculum
      const allMaterials: Material[] = [];
      const seen = new Set<string>();

      (data.curriculum || []).forEach((item: any) => {
        const mats = typeof item.materials === 'string' 
          ? JSON.parse(item.materials || '[]') 
          : (item.materials || []);
        
        mats.forEach((m: any) => {
          const key = m.name.toLowerCase().trim();
          if (!seen.has(key) && m.name) {
            seen.add(key);
            allMaterials.push({
              id: key,
              name: m.name,
              price: m.price || 0,
              essential: m.essential !== false,
              activity_name: item.name,
              activity_id: item.id,
              area: item.area,
              owned: false
            });
          }
        });
      });

      // Sort by area, then essential, then name
      allMaterials.sort((a, b) => {
        if (a.area !== b.area) return a.area.localeCompare(b.area);
        if (a.essential !== b.essential) return a.essential ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setMaterials(allMaterials);
    } catch (err) {
      console.error('Error loading materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOwned = async () => {
    try {
      const res = await fetch(`/api/montree-home/materials?family_id=${familyId}`);
      const data = await res.json();
      setOwnedItems(new Set(data.owned || []));
    } catch (err) {
      console.error('Error loading owned:', err);
    }
  };

  const toggleOwned = async (materialId: string) => {
    const newOwned = new Set(ownedItems);
    if (newOwned.has(materialId)) {
      newOwned.delete(materialId);
    } else {
      newOwned.add(materialId);
    }
    setOwnedItems(newOwned);

    // Save to server
    try {
      await fetch('/api/montree-home/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          owned: Array.from(newOwned)
        })
      });
    } catch (err) {
      console.error('Error saving:', err);
    }
  };

  const getAreaEmoji = (area: string) => {
    const emojis: Record<string, string> = {
      practical_life: '🧹',
      sensorial: '👁️',
      mathematics: '🔢',
      language: '📚',
      cultural: '🌍'
    };
    return emojis[area] || '📖';
  };

  const formatAreaName = (area: string) => {
    return area.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const filteredMaterials = materials.filter(m => {
    if (filter === 'needed' && ownedItems.has(m.id)) return false;
    if (filter === 'owned' && !ownedItems.has(m.id)) return false;
    if (areaFilter !== 'all' && m.area !== areaFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCost = materials
    .filter(m => !ownedItems.has(m.id) && m.essential)
    .reduce((sum, m) => sum + m.price, 0);

  const essentialCount = materials.filter(m => m.essential).length;
  const ownedEssentialCount = materials.filter(m => m.essential && ownedItems.has(m.id)).length;

  const areas = [...new Set(materials.map(m => m.area))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(`/parent/home/${familyId}`)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Materials Checklist</h1>
            <p className="text-sm text-gray-500">{materials.length} items total</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Remaining</div>
            <div className="font-bold text-green-600">${totalCost}</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <Package className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900">{ownedEssentialCount}/{essentialCount}</div>
            <div className="text-xs text-gray-500">Essential Owned</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <ShoppingCart className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900">{essentialCount - ownedEssentialCount}</div>
            <div className="text-xs text-gray-500">Still Needed</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900">${totalCost}</div>
            <div className="text-xs text-gray-500">Est. Cost</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search materials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton>
            <FilterButton active={filter === 'needed'} onClick={() => setFilter('needed')}>Needed</FilterButton>
            <FilterButton active={filter === 'owned'} onClick={() => setFilter('owned')}>Owned</FilterButton>
            <div className="w-px bg-gray-200 mx-1" />
            <FilterButton active={areaFilter === 'all'} onClick={() => setAreaFilter('all')}>All Areas</FilterButton>
            {areas.map(area => (
              <FilterButton 
                key={area} 
                active={areaFilter === area} 
                onClick={() => setAreaFilter(area)}
              >
                {getAreaEmoji(area)} {formatAreaName(area)}
              </FilterButton>
            ))}
          </div>
        </div>

        {/* Materials List */}
        <div className="space-y-2">
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              className={`bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 transition-all ${
                ownedItems.has(material.id) ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => toggleOwned(material.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  ownedItems.has(material.id)
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {ownedItems.has(material.id) && <Check className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${ownedItems.has(material.id) ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {material.name}
                  </span>
                  {material.essential && (
                    <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                      Essential
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                  <span>{getAreaEmoji(material.area)}</span>
                  <span className="truncate">{material.activity_name}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {material.price > 0 && (
                  <div className="font-medium text-gray-900">${material.price}</div>
                )}
                <a
                  href={`https://www.amazon.com/s?k=${encodeURIComponent(material.name + ' montessori')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Shop <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredMaterials.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No materials match your filters</p>
          </div>
        )}
      </main>
    </div>
  );
}

function FilterButton({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
