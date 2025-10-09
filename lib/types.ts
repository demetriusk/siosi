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

export type SkinType = 'oily' | 'dry' | 'combination' | 'normal' | 'sensitive';
export type SkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'deep' | 'dark';
export type LidType = 'monolid' | 'hooded' | 'deep_set' | 'protruding' | 'downturned' | 'upturned' | 'almond';

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