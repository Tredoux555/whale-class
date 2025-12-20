export type AgeRange = '0-3' | '3-6';

export type Area = 
  | 'practical-life'
  | 'sensorial'
  | 'math'
  | 'language'
  | 'cultural';

export interface Video {
  url?: string;
  youtubeId?: string;
  title?: string;
  description?: string;
}

export interface Material {
  name: string;
  description?: string;
  quantity?: number;
  commerceLink?: string;
  printable?: boolean;
}

export interface Level {
  id: string;
  name: string;
  description?: string;
  difficulty: number; // 1-10
  ageRange: AgeRange;
  prerequisites?: string[]; // Array of level IDs
  materials?: Material[];
  video?: Video;
  estimatedDuration?: number; // minutes
}

export interface Work {
  id: string;
  name: string;
  description?: string;
  area: Area;
  category: string;
  ageRange: AgeRange;
  levels: Level[];
  order: number; // Order within category
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  area: Area;
  ageRange: AgeRange;
  works: Work[];
  order: number; // Order within area
}

export interface AreaData {
  id: Area;
  name: string;
  description?: string;
  ageRange: AgeRange;
  categories: Category[];
  color?: string; // For visualization
}

export interface Curriculum {
  areas: AreaData[];
}

