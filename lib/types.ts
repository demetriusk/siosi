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
  | 'blending';

export type Occasion = 'photoshoot' | 'wedding' | 'party' | 'video' | 'testing';

export type Concern = 'flash' | 'lasting' | 'closeup' | 'weather' | 'transfer';

export type SkinType = 'dry' | 'normal' | 'combo' | 'oily' | 'not_sure';

export type SkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'deep' | 'rich';

export type LidType = 'hooded' | 'standard' | 'deep_set';

export interface LabAnalysis {
  id: string;
  session_id: string;
  lab_name: LabName;
  verdict: Verdict;
  confidence: number;
  score: number;
  detected: string[];
  recommendations: string[];
  zones_affected?: string[];
  created_at: string;
}

export interface Session {
  id: string;
  created_at: string;
  photo_url: string;
  occasion?: Occasion;
  concerns?: Concern[];
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
  skin_type?: SkinType;
  skin_tone?: SkinTone;
  lid_type?: LidType;
}
