import type { ColorimetryRecord, ColorimetrySwatch, Undertone } from './types';

const VALID_UNDERTONES: Undertone[] = ['warm', 'cool', 'neutral'];

export interface NormalizedColorimetry {
  photo: {
    undertone: Undertone;
    detected: ColorimetrySwatch[];
    recommended: ColorimetrySwatch[];
    avoid: ColorimetrySwatch[];
    notes?: string | null;
  };
  profile?: {
    undertone?: Undertone | null;
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
  return (VALID_UNDERTONES as string[]).includes(lowered) ? (lowered as Undertone) : null;
}

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX_PATTERN.test(trimmed)) return null;
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return hex.toUpperCase();
}

function normalizeCategory(value: unknown): string | null {
  const raw = normalizeString(value);
  if (!raw) return null;
  return raw.toUpperCase();
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

function normalizeSwatch(entry: unknown): ColorimetrySwatch | null {
  if (!entry || typeof entry !== 'object') return null;

  const hex = normalizeHex((entry as any).hex ?? (entry as any).color ?? null);
  const name = normalizeString((entry as any).name ?? (entry as any).label ?? null);
  const category = normalizeCategory((entry as any).category ?? (entry as any).area ?? null) ?? 'GENERAL';

  if (!hex || !name) {
    return null;
  }

  const reason = normalizeOptionalString((entry as any).reason ?? (entry as any).why ?? null);
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

function normalizeSwatchArray(value: unknown, { min = 0, max = 6 }: { min?: number; max?: number } = {}): ColorimetrySwatch[] {
  if (!value) return [];
  const source = Array.isArray(value) ? value : [value];
  const swatches: ColorimetrySwatch[] = [];

  for (const entry of source) {
    const swatch = normalizeSwatch(entry);
    if (!swatch) continue;
    swatches.push(swatch);
    if (max > 0 && swatches.length >= max) break;
  }

  if (swatches.length < min) {
    return [];
  }

  return swatches;
}

function normalizePhotoSection(value: unknown): NormalizedColorimetry['photo'] | null {
  if (!value || typeof value !== 'object') return null;

  const undertone = normalizeUndertone((value as any).undertone ?? (value as any).tone ?? null);
  if (!undertone) {
    return null;
  }

  const detected = normalizeSwatchArray((value as any).detected ?? (value as any).observed, { min: 1 });
  const recommended = normalizeSwatchArray((value as any).recommended, { min: 1 });
  const avoid = normalizeSwatchArray((value as any).avoid ?? (value as any).skip, { min: 1 });

  if (detected.length === 0 && recommended.length === 0 && avoid.length === 0) {
    return null;
  }

  const notes = normalizeOptionalString((value as any).notes ?? (value as any).summary ?? null);

  return {
    undertone,
    detected,
    recommended,
    avoid,
    notes,
  };
}

function normalizeProfileSection(value: unknown): NormalizedColorimetry['profile'] | null {
  if (!value || typeof value !== 'object') return null;

  const recommended = normalizeSwatchArray((value as any).recommended, { min: 1 });
  const avoid = normalizeSwatchArray((value as any).avoid ?? (value as any).skip, { min: 1 });

  if (recommended.length === 0 && avoid.length === 0) {
    return null;
  }

  const notes = normalizeOptionalString((value as any).notes ?? (value as any).summary ?? null);
  const undertone = normalizeUndertone((value as any).undertone ?? null);

  return {
    undertone: undertone ?? null,
    recommended,
    avoid,
    notes,
  };
}

export function normalizeColorimetryPayload(raw: unknown): NormalizedColorimetry | null {
  if (!raw || typeof raw !== 'object') return null;

  const photo = normalizePhotoSection((raw as any).photo ?? (raw as any).image ?? null);
  if (!photo) {
    return null;
  }

  const profile = normalizeProfileSection((raw as any).profile ?? (raw as any).user ?? null);

  return {
    photo,
    profile,
  };
}

export function buildColorimetryInsert(sessionId: string, normalized: NormalizedColorimetry) {
  return {
    session_id: sessionId,
    photo_undertone: normalized.photo.undertone,
    photo_detected: normalized.photo.detected,
    photo_recommended: normalized.photo.recommended,
    photo_avoid: normalized.photo.avoid,
    photo_notes: normalized.photo.notes ?? null,
    profile_undertone: normalized.profile?.undertone ?? null,
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

  const record: ColorimetryRecord = {
    id: typeof row.id === 'string' ? row.id : undefined,
    session_id: row.session_id,
    photo: {
      undertone: normalizeUndertone(row.photo_undertone) ?? 'neutral',
      detected: photoDetected,
      recommended: photoRecommended,
      avoid: photoAvoid,
      notes: normalizeOptionalString(row.photo_notes),
    },
    created_at: normalizeOptionalString(row.created_at) ?? undefined,
    updated_at: normalizeOptionalString(row.updated_at) ?? undefined,
  };

  const profileRecommended = Array.isArray(row.profile_recommended) ? row.profile_recommended : [];
  const profileAvoid = Array.isArray(row.profile_avoid) ? row.profile_avoid : [];

  if (profileRecommended.length > 0 || profileAvoid.length > 0 || row.profile_undertone || row.profile_notes) {
    record.profile = {
      undertone: normalizeUndertone(row.profile_undertone) ?? null,
      recommended: profileRecommended,
      avoid: profileAvoid,
      notes: normalizeOptionalString(row.profile_notes),
    };
  } else {
    record.profile = null;
  }

  return record;
}
