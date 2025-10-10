import type { LabAnalysis, LabName, Verdict } from './types';

const LAB_NAMES: LabName[] = [
  'flashback',
  'pores',
  'texture',
  'undertone',
  'transfer',
  'longevity',
  'oxidation',
  'creasing',
  'blending',
  'shimmer',
  'transitions',
  'coverage',
];

const VALID_VERDICTS: Verdict[] = ['YAY', 'NAY', 'MAYBE'];

function isLabName(value: unknown): value is LabName {
  return typeof value === 'string' && (LAB_NAMES as readonly string[]).includes(value);
}

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flat()
      .map((item) => (typeof item === 'string' ? item : String(item)))
      .filter((item) => item.length > 0);
  }
  return [typeof value === 'string' ? value : String(value)].filter((item) => item.length > 0);
}

function coerceVerdict(value: unknown): Verdict {
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    if (VALID_VERDICTS.includes(upper as Verdict)) {
      return upper as Verdict;
    }
  }
  return 'MAYBE';
}

function coerceNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function generateId(): string {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && 'randomUUID' in globalThis.crypto) {
      return globalThis.crypto.randomUUID();
    }
  } catch (error) {
    // Ignore and fall through to fallback
  }
  // Lightweight fallback guaranteed to produce a string identifier
  return `lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeAnalysesPayload(raw: unknown): LabAnalysis[] {
  if (!raw) return [];

  const asArray = Array.isArray(raw)
    ? raw
    : Object.entries(raw as Record<string, unknown>).map(([labName, value]) => ({
        ...(value as Record<string, unknown>),
        lab_name: (value as any)?.lab_name ?? (value as any)?.name ?? labName,
      }));

  const normalized: LabAnalysis[] = [];

  for (const entry of asArray) {
    if (!entry) continue;

    const rawLabName = (entry as any)?.lab_name ?? (entry as any)?.name ?? (entry as any)?.lab;
    const labName = typeof rawLabName === 'string' ? rawLabName : undefined;
    if (!labName || !isLabName(labName)) {
      continue;
    }

    const detected = toStringArray((entry as any)?.detected);
    const recommendations = toStringArray((entry as any)?.recommendations);
    const zonesRaw = toStringArray((entry as any)?.zones_affected);
    const zones = zonesRaw.length > 0 ? zonesRaw : undefined;

    const verdict = coerceVerdict((entry as any)?.verdict);
    const confidence = Math.round(coerceNumber((entry as any)?.confidence));
    const score = Math.round(coerceNumber((entry as any)?.score) * 10) / 10;

    const createdAt = (entry as any)?.created_at;
    const createdAtIso = typeof createdAt === 'string' && createdAt.trim().length > 0
      ? createdAt
      : new Date().toISOString();

    const sessionId = (entry as any)?.session_id;

    const normalizedEntry: LabAnalysis = {
      id: (entry as any)?.id ?? generateId(),
      session_id: typeof sessionId === 'string' ? sessionId : undefined,
      lab_name: labName as LabName,
      name: (entry as any)?.name ?? (labName as LabName),
      verdict,
      confidence,
      score,
      detected,
      recommendations,
      zones_affected: zones,
      created_at: createdAtIso,
    };

    normalized.push(normalizedEntry);
  }

  return normalized;
}

export function calculateCriticalCountFromArray(analyses: LabAnalysis[]): number {
  if (!Array.isArray(analyses) || analyses.length === 0) return 0;
  return analyses.filter(
    (analysis) => analysis?.verdict === 'NAY' && (analysis?.confidence ?? 0) >= 80
  ).length;
}
