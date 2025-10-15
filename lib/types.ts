import type { SkinTypeCode } from './skin-type';

export type Verdict = 'YAY' | 'NAY' | 'MAYBE';

export type LabName = 
  | 'flashback'
  | 'pores'
  | 'texture'
  | 'undertone'
  | 'transfer'
  | 'longevity'
  | 'oxidation'
  | 'creasing'
  | 'blending'
  | 'shimmer'
  | 'transitions'
  | 'coverage';

export interface LabAnalysis {
  // Primary identifiers (persisted shape from DB / mock outputs)
  id?: string;
  session_id?: string;
  lab_name: LabName;
  // Backwards-compatible alias (some code may still reference `name`)
  name?: LabName;

  verdict: Verdict;
  confidence: number;
  score: number;
  detected: string[];
  recommendations: string[];
  zones_affected?: string[];
  created_at?: string;
}

export type Undertone = 'warm' | 'cool' | 'neutral';

export interface ColorimetrySwatch {
  id?: string;
  hex: string;
  name: string;
  category: string;
  reason?: string | null;
  finish?: string | null;
  confidence?: number | null;
}

export interface ColorimetryPhotoPalette {
  undertone: Undertone;
  detected: ColorimetrySwatch[];
  recommended: ColorimetrySwatch[];
  avoid: ColorimetrySwatch[];
  notes?: string | null;
}

export interface ColorimetryProfilePalette {
  undertone?: Undertone | null;
  recommended: ColorimetrySwatch[];
  avoid: ColorimetrySwatch[];
  notes?: string | null;
}

export interface ColorimetryRecord {
  id?: string;
  session_id: string;
  photo: ColorimetryPhotoPalette;
  profile?: ColorimetryProfilePalette | null;
  created_at?: string;
  updated_at?: string;
}

export type LegacySkinType = 'oily' | 'dry' | 'combination' | 'normal' | 'sensitive';
export type SkinType = LegacySkinType | SkinTypeCode;
export type SkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'deep' | 'dark';
export type LidType =
  | 'almond-eyes'
  | 'round-eyes'
  | 'hooded-eyes'
  | 'monolid-eyes'
  | 'upturned-eyes'
  | 'downturned-eyes'
  | 'close-set-eyes'
  | 'wide-set-eyes'
  | 'deep-set-eyes'
  | 'protruding-eyes';

export type Occasion = 
  | 'everyday'
  | 'work'
  | 'date'
  | 'party'
  | 'wedding'
  | 'photoshoot'
  | 'stage'
  | 'special';

export type Concern = 
  | 'flash'
  | 'lasting'
  | 'closeup'
  | 'heat'
  | 'transfer'
  | 'sensitive';

export type IndoorOutdoor = 'indoor' | 'outdoor' | 'both';

export type Climate = 'dry' | 'normal' | 'humid' | 'hot_humid';

export interface Session {
  id: string;
  created_at: string;
  photo_url: string;
  user_id?: string;
  occasion?: Occasion;
  concerns?: Concern[];
  indoor_outdoor?: IndoorOutdoor;
  climate?: Climate;
  skin_type?: SkinType;
  skin_tone?: SkinTone;
  lid_type?: LidType;
  overall_score: number;
  critical_count: number;
  confidence_avg: number;
  save_count?: number;
  colorimetry?: ColorimetryRecord | null;
}

export interface SessionWithAnalyses extends Session {
  analyses: LabAnalysis[];
}

export interface UploadContext {
  occasion?: Occasion;
  concerns?: Concern[];
  indoor_outdoor?: IndoorOutdoor;
  climate?: Climate;
  skin_type?: SkinType;
  skin_tone?: SkinTone;
  lid_type?: LidType;
}

// Route params helper types
export interface ParamsWithLocale {
  params?: Promise<{ locale: string }>;
}

export interface ParamsWithLocaleAndId {
  params?: Promise<{ locale: string; id: string }>;
}