import type { ColorimetryCategory, ColorimetryRecord, ColorimetrySwatch, Season, Undertone } from './types';

const VALID_UNDERTONES: Undertone[] = ['warm', 'cool', 'neutral'];
const VALID_SEASONS: Season[] = [
  'bright_winter',
  'cool_winter',
  'deep_winter',
  'bright_spring',
  'warm_spring',
  'light_spring',
  'light_summer',
  'cool_summer',
  'soft_summer',
  'soft_autumn',
  'warm_autumn',
  'deep_autumn',
];
const VALID_CATEGORIES: ColorimetryCategory[] = ['EYES', 'LIPS', 'CHEEKS', 'FACE', 'HIGHLIGHT', 'BROWS', 'LINER', 'GENERAL'];
const CATEGORY_ALIASES: Record<string, ColorimetryCategory> = {
  eye: 'EYES',
  eyeshadow: 'EYES',
  liner: 'LINER',
  lash: 'EYES',
  lashes: 'EYES',
  lip: 'LIPS',
  lipstick: 'LIPS',
  gloss: 'LIPS',
  cheek: 'CHEEKS',
  blush: 'CHEEKS',
  bronzer: 'FACE',
  contour: 'FACE',
  contouring: 'FACE',
  highlight: 'HIGHLIGHT',
  highlighter: 'HIGHLIGHT',
  brow: 'BROWS',
  brows: 'BROWS',
  face: 'FACE',
  base: 'FACE',
  general: 'GENERAL',
};

export interface NormalizedColorimetry {
  photo: {
    undertone: Undertone;
    confidence: number | null;
    season: Season | null;
    seasonConfidence: number | null;
    detected: ColorimetrySwatch[];
    recommended: ColorimetrySwatch[];
    avoid: ColorimetrySwatch[];
    notes?: string | null;
  };
  profile?: {
    undertone: Undertone | null;
    confidence: number | null;
    season: Season | null;
    seasonConfidence: number | null;
    recommended: ColorimetrySwatch[];
    avoid: ColorimetrySwatch[];
    notes?: string | null;
  } | null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ?? null;
}

function normalizeUndertone(value: unknown): Undertone | null {
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase();

  if ((VALID_UNDERTONES as string[]).includes(lowered)) {
    return lowered as Undertone;
  }

  if (lowered.includes('warm')) return 'warm';
  if (lowered.includes('cool')) return 'cool';
  if (lowered.includes('neutral') || lowered.includes('olive') || lowered.includes('balanced')) {
    return 'neutral';
  }

  return null;
}

function normalizeSeason(value: unknown): Season | null {
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if ((VALID_SEASONS as string[]).includes(lowered)) {
    return lowered as Season;
  }

  return null;
}

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX_PATTERN.test(trimmed)) return null;
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return hex.toUpperCase();
}

function normalizeCategory(value: unknown): ColorimetryCategory {
  if (typeof value !== 'string') return 'GENERAL';
  const trimmed = value.trim();
  if (!trimmed) return 'GENERAL';

  const upper = trimmed.replace(/[\s-]+/g, '_').toUpperCase();
  if ((VALID_CATEGORIES as string[]).includes(upper)) {
    return upper as ColorimetryCategory;
  }

  const lowered = upper.toLowerCase();
  const alias = CATEGORY_ALIASES[lowered] ?? CATEGORY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  if (upper.endsWith('S')) {
    const singular = upper.slice(0, -1);
    if ((VALID_CATEGORIES as string[]).includes(singular)) {
      return singular as ColorimetryCategory;
    }
    const singularAlias = CATEGORY_ALIASES[singular.toLowerCase()];
    if (singularAlias) return singularAlias;
  }

  return 'GENERAL';
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const clamped = Math.max(0, Math.min(100, value));
    return Math.round(clamped);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      const clamped = Math.max(0, Math.min(100, parsed));
      return Math.round(clamped);
    }
  }
  return null;
}

interface NormalizeSwatchOptions {
  max?: number;
  requireReason?: boolean;
}

function normalizeSwatch(entry: unknown, { requireReason = false }: NormalizeSwatchOptions = {}): ColorimetrySwatch | null {
  if (!entry || typeof entry !== 'object') return null;

  const hex = normalizeHex((entry as any).hex ?? (entry as any).color ?? null);
  const name = normalizeString((entry as any).name ?? (entry as any).label ?? null);
  const category = normalizeCategory((entry as any).category ?? (entry as any).area ?? null);

  if (!hex || !name) {
    return null;
  }

  const reason = normalizeOptionalString((entry as any).reason ?? (entry as any).why ?? null);
  if (requireReason && !reason) {
    return null;
  }

  const finish = normalizeOptionalString((entry as any).finish ?? (entry as any).texture ?? null);
  const confidence = normalizeConfidence((entry as any).confidence);

  const swatch: ColorimetrySwatch = {
    hex,
    name,
    category,
  };

  if (reason) swatch.reason = reason;
  if (finish) swatch.finish = finish;
  if (typeof confidence === 'number') swatch.confidence = confidence;
  if ((entry as any).id && typeof (entry as any).id === 'string') {
    swatch.id = (entry as any).id;
  }

  return swatch;
}

function normalizeSwatchArray(value: unknown, options: NormalizeSwatchOptions = {}): ColorimetrySwatch[] {
  const { max = 6, requireReason = false } = options;
  if (!value) return [];
  const source = Array.isArray(value) ? value : [value];
  const swatches: ColorimetrySwatch[] = [];

  for (const entry of source) {
    const swatch = normalizeSwatch(entry, { requireReason });
    if (!swatch) continue;
    swatches.push(swatch);
    if (max > 0 && swatches.length >= max) break;
  }

  return swatches;
}

function normalizePhotoSection(value: unknown): NormalizedColorimetry['photo'] | null {
  if (!value || typeof value !== 'object') return null;

  const rawUndertone = normalizeUndertone((value as any).undertone ?? (value as any).tone ?? null);
  const undertone = rawUndertone ?? 'neutral';

  const detected = normalizeSwatchArray((value as any).detected ?? (value as any).observed, {
    max: 6,
  });
  const recommended = normalizeSwatchArray((value as any).recommended, {
    max: 12,
  });
  const avoid = normalizeSwatchArray((value as any).avoid ?? (value as any).skip, {
    max: 8,
    requireReason: true,
  });

  const notes = normalizeOptionalString((value as any).notes ?? (value as any).summary ?? null);
  const confidence = normalizeConfidence((value as any).confidence ?? (value as any).confidence_score ?? null);
  const season = normalizeSeason((value as any).season ?? (value as any).photo_season ?? null);
  const seasonConfidence = normalizeConfidence((value as any).season_confidence ?? (value as any).seasonConfidence ?? null);

  if (detected.length === 0 && recommended.length === 0 && avoid.length === 0 && !notes && !rawUndertone && !season) {
    return null;
  }

  return {
    undertone,
    confidence,
    season: season ?? null,
    seasonConfidence,
    detected,
    recommended,
    avoid,
    notes,
  };
}

function normalizeProfileSection(value: unknown): NormalizedColorimetry['profile'] | null {
  if (!value || typeof value !== 'object') return null;

  const recommended = normalizeSwatchArray((value as any).recommended, {
    max: 12,
  });
  const avoid = normalizeSwatchArray((value as any).avoid ?? (value as any).skip, {
    max: 8,
    requireReason: true,
  });

  const notes = normalizeOptionalString((value as any).notes ?? (value as any).summary ?? null);
  const undertone = normalizeUndertone((value as any).undertone ?? null);
  const confidence = normalizeConfidence((value as any).confidence ?? (value as any).confidence_score ?? null);
  const season = normalizeSeason((value as any).season ?? (value as any).profile_season ?? (value as any).user_season ?? null);
  const seasonConfidence = normalizeConfidence((value as any).season_confidence ?? (value as any).seasonConfidence ?? null);

  if (recommended.length === 0 && avoid.length === 0 && !notes && !undertone && !season) {
    return null;
  }

  return {
    undertone: undertone ?? null,
    confidence,
    season: season ?? null,
    seasonConfidence,
    recommended,
    avoid,
    notes,
  };
}

export function normalizeColorimetryPayload(raw: unknown): NormalizedColorimetry | null {
  if (!raw || typeof raw !== 'object') return null;

  const photo = normalizePhotoSection(
    (raw as any).photo_person ?? (raw as any).photo ?? (raw as any).image ?? null
  );
  if (!photo) {
    return null;
  }

  const profile = normalizeProfileSection((raw as any).user ?? (raw as any).profile ?? null);

  return {
    photo,
    profile,
  };
}

export function buildColorimetryInsert(sessionId: string, normalized: NormalizedColorimetry) {
  return {
    session_id: sessionId,
    photo_undertone: normalized.photo.undertone,
    photo_confidence: normalized.photo.confidence ?? null,
    photo_season: normalized.photo.season ?? null,
    photo_season_confidence: normalized.photo.seasonConfidence ?? null,
    photo_detected: normalized.photo.detected,
    photo_recommended: normalized.photo.recommended,
    photo_avoid: normalized.photo.avoid,
    photo_notes: normalized.photo.notes ?? null,
    profile_undertone: normalized.profile?.undertone ?? null,
    profile_confidence: normalized.profile?.confidence ?? null,
    profile_season: normalized.profile?.season ?? null,
    profile_season_confidence: normalized.profile?.seasonConfidence ?? null,
    user_season: normalized.profile?.season ?? null,
    user_season_confidence: normalized.profile?.seasonConfidence ?? null,
    profile_recommended: normalized.profile?.recommended ?? null,
    profile_avoid: normalized.profile?.avoid ?? null,
    profile_notes: normalized.profile?.notes ?? null,
  };
}

export function mapColorimetryRow(row: any): ColorimetryRecord | null {
  if (!row || typeof row !== 'object') return null;
  if (!row.session_id || typeof row.session_id !== 'string') return null;

  const photoDetected = Array.isArray(row.photo_detected) ? row.photo_detected : [];
  const photoRecommended = Array.isArray(row.photo_recommended) ? row.photo_recommended : [];
  const photoAvoid = Array.isArray(row.photo_avoid) ? row.photo_avoid : [];
  const photoSeason = normalizeSeason(row.photo_season ?? row.photoSeason);
  const photoSeasonConfidence = normalizeConfidence(row.photo_season_confidence ?? row.photoSeasonConfidence);

  const record: ColorimetryRecord = {
    id: typeof row.id === 'string' ? row.id : undefined,
    session_id: row.session_id,
    photo: {
      undertone: normalizeUndertone(row.photo_undertone) ?? 'neutral',
      confidence: normalizeConfidence(row.photo_confidence),
      season: photoSeason ?? null,
      seasonConfidence: photoSeasonConfidence,
      detected: photoDetected,
      recommended: photoRecommended,
      avoid: photoAvoid,
      notes: normalizeOptionalString(row.photo_notes),
    },
    photo_season: photoSeason ?? undefined,
    created_at: normalizeOptionalString(row.created_at) ?? undefined,
    updated_at: normalizeOptionalString(row.updated_at) ?? undefined,
  };

  const profileRecommended = Array.isArray(row.profile_recommended) ? row.profile_recommended : [];
  const profileAvoid = Array.isArray(row.profile_avoid) ? row.profile_avoid : [];
  const rawProfileSeason = row.profile_season ?? row.user_season ?? row.profileSeason ?? row.userSeason;
  const profileSeason = normalizeSeason(rawProfileSeason);
  const profileSeasonConfidence = normalizeConfidence(row.profile_season_confidence ?? row.user_season_confidence ?? row.profileSeasonConfidence);
  const profileUndertone = normalizeUndertone(row.profile_undertone);

  if (profileRecommended.length > 0 || profileAvoid.length > 0 || row.profile_undertone || row.profile_notes || rawProfileSeason) {
    record.profile = {
      undertone: profileUndertone ?? null,
      confidence: normalizeConfidence(row.profile_confidence),
      season: profileSeason ?? null,
      seasonConfidence: profileSeasonConfidence,
      recommended: profileRecommended,
      avoid: profileAvoid,
      notes: normalizeOptionalString(row.profile_notes),
    };
  } else {
    record.profile = null;
  }

  record.user_season = profileSeason ?? undefined;

  return record;
}
