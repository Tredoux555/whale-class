// =============================================================================
// TYPE DEFINITIONS FOR ENGLISH PROCUREMENT CURRICULUM
// =============================================================================

export interface Material {
  name: string;
  nameZh: string;
  search1688: string;
  altSearch?: string;
  specs: string;
  price: string;
  essential: boolean;
}

export interface Work {
  id: string;
  name: string;
  age: string;
  directAim: string;
  indirectAims: string[];
  prerequisites: string;
  presentation: string[];
  materials: Material[];
  controlOfError: string;
  pointOfInterest: string;
  extensions: string[];
  notes?: string;
  videoUrl?: string;
  videoSearchTerm?: string;
  beginnerGuide?: {
    whatIsThis: string;
    whyItMatters: string;
    beforeYouStart: string[];
    exactScript: string[];
    commonMistakes: string[];
    successIndicators: string[];
    sessionLength: string;
    frequency: string;
  };
}

export interface ExtensionDetail {
  name: string;
  what: string;
  howTo: string;
  materials?: string;
  readiness: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sequence: number;
  description: string;
  amiNotes?: string;
  works: Work[];
}

export interface ShelfItemDetail {
  name: string;
  tier: 'essential' | 'complete' | 'premium';
  what: string;
  quantity: string;
  size: string;
  container: string;
  contents?: string[];
  tips: string;
  price: string;
}

export interface ShelfItem {
  name: string;
  details: ShelfItemDetail[];
}

export interface ShelfData {
  shelf: string;
  position: string;
  items: ShelfItem[];
  notes: string;
}

export interface GrammarSymbol {
  part: string;
  shape: string;
  color: string;
  meaning: string;
}

export interface AssessmentSkill {
  skill: string;
  indicators: string;
}
