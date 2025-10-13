import {
  QUIZ_DATA as RAW_QUIZ_DATA,
  SKIN_TYPES_DATA as RAW_SKIN_TYPES_DATA,
  QuizAxis,
  RawSkinTypeProfile,
} from './skin-type-data';

export type { QuizAxis } from './skin-type-data';

export type OilLevelCode = 'O' | 'N' | 'D';
export type ConcernCode = 'C' | 'A' | 'R' | 'S';
export type UndertoneCode = 'W' | 'K' | 'N';
export type SkinTypeCode = `${OilLevelCode}-${ConcernCode}-${UndertoneCode}`;

export interface QuizAnswerOption {
  id: string;
  text: string;
  weights: Record<string, number>;
}

export interface QuizQuestion {
  id: string;
  axis: QuizAxis;
  question: string;
  answers: QuizAnswerOption[];
}

export interface QuizAnswerSelection {
  questionId: string;
  answerId: string;
  weights: Record<string, number>;
}

export interface MakeupNeeds {
  primer: string[];
  foundation: string[];
  concealer: string[];
  powder: string[];
  blush: string[];
  highlighter: string[];
}

export interface SkinTypeProfile {
  code: SkinTypeCode;
  oil_level: string;
  concern: string;
  undertone: string;
  profile_summary: string;
  description: string;
  makeup_needs: MakeupNeeds;
}

export const QUIZ_METADATA = {
  version: RAW_QUIZ_DATA.version,
  title: RAW_QUIZ_DATA.title,
  description: RAW_QUIZ_DATA.description,
};

export const QUIZ_AXIS_DEFAULTS: Record<QuizAxis, string> = {
  oil_level: RAW_QUIZ_DATA.axes.oil_level.default_tie,
  concerns: RAW_QUIZ_DATA.axes.concerns.default_tie,
  undertone: RAW_QUIZ_DATA.axes.undertone.default_tie,
};

export const QUIZ_AXIS_CODES: Record<QuizAxis, string[]> = {
  oil_level: RAW_QUIZ_DATA.axes.oil_level.codes,
  concerns: RAW_QUIZ_DATA.axes.concerns.codes,
  undertone: RAW_QUIZ_DATA.axes.undertone.codes,
};

const QUIZ_QUESTIONS: QuizQuestion[] = RAW_QUIZ_DATA.questions.map((question) => ({
  id: question.id,
  axis: question.axis,
  question: question.question,
  answers: question.answers.map((answer) => ({
    id: answer.id,
    text: answer.text,
    weights: { ...answer.weights },
  })),
}));

const QUESTION_MAP = new Map<string, QuizQuestion>(
  QUIZ_QUESTIONS.map((question) => [question.id, question])
);

const SKIN_TYPE_MAP = new Map<SkinTypeCode, SkinTypeProfile>(
  RAW_SKIN_TYPES_DATA.types.reduce<[SkinTypeCode, SkinTypeProfile][]>((acc, rawProfile: RawSkinTypeProfile) => {
    if (!rawProfile.code) {
      return acc;
    }

    const normalizedCode = rawProfile.code.toUpperCase() as SkinTypeCode;
    acc.push([
      normalizedCode,
      {
        code: normalizedCode,
        oil_level: rawProfile.oil_level ?? '',
        concern: rawProfile.concern ?? '',
        undertone: rawProfile.undertone ?? '',
        profile_summary: rawProfile.profile_summary ?? '',
        description: rawProfile.description ?? '',
        makeup_needs: {
          primer: rawProfile.makeup_needs?.primer ?? [],
          foundation: rawProfile.makeup_needs?.foundation ?? [],
          concealer: rawProfile.makeup_needs?.concealer ?? [],
          powder: rawProfile.makeup_needs?.powder ?? [],
          blush: rawProfile.makeup_needs?.blush ?? [],
          highlighter: rawProfile.makeup_needs?.highlighter ?? [],
        },
      },
    ]);

    return acc;
  }, [])
);

const DEFAULT_PROFILE: SkinTypeProfile =
  SKIN_TYPE_MAP.get('N-C-N') ?? {
    code: 'N-C-N',
    oil_level: 'Normal / Combination',
    concern: 'Clear & Low-Maintenance',
    undertone: 'Neutral',
    profile_summary: 'Please Retake Quiz',
    description:
      "We couldn't find your skin type profile. Please retake the quiz to update your results.",
    makeup_needs: {
      primer: [],
      foundation: [],
      concealer: [],
      powder: [],
      blush: [],
      highlighter: [],
    },
  };

export const QUIZ_TOTAL_QUESTIONS = QUIZ_QUESTIONS.length;

export function getQuizQuestions(): QuizQuestion[] {
  return QUIZ_QUESTIONS;
}

export function getQuizQuestion(questionId: string): QuizQuestion | undefined {
  return QUESTION_MAP.get(questionId);
}

export function getAxisName(axis: QuizAxis): string {
  return RAW_QUIZ_DATA.axes[axis].name;
}

export function getAxisCodes(axis: QuizAxis): string[] {
  return [...QUIZ_AXIS_CODES[axis]];
}

export function calculateSkinType(answers: QuizAnswerSelection[]): SkinTypeCode {
  const scores: Record<QuizAxis, Record<string, number>> = {
    oil_level: initAxisScores('oil_level'),
    concerns: initAxisScores('concerns'),
    undertone: initAxisScores('undertone'),
  };

  answers.forEach((answer) => {
    const question = QUESTION_MAP.get(answer.questionId);
    if (!question) return;

    const axis = question.axis;
    const axisScores = scores[axis];

    Object.entries(answer.weights).forEach(([code, weight]) => {
      if (typeof weight !== 'number') return;
      if (!(code in axisScores)) return;

      axisScores[code] += weight;
    });
  });

  const oilLevel = selectWinner(scores.oil_level, QUIZ_AXIS_DEFAULTS.oil_level) as OilLevelCode;
  const concern = selectWinner(scores.concerns, QUIZ_AXIS_DEFAULTS.concerns) as ConcernCode;
  const undertone = selectWinner(scores.undertone, QUIZ_AXIS_DEFAULTS.undertone) as UndertoneCode;

  return `${oilLevel}-${concern}-${undertone}`;
}

function initAxisScores(axis: QuizAxis): Record<string, number> {
  return QUIZ_AXIS_CODES[axis].reduce<Record<string, number>>((acc, code) => {
    acc[code] = 0;
    return acc;
  }, {});
}

function selectWinner(scores: Record<string, number>, defaultCode: string): string {
  const entries = Object.entries(scores);
  if (entries.length === 0) return defaultCode;

  let winner = defaultCode;
  let maxScore = -Infinity;
  const tiedCodes: string[] = [];

  entries.forEach(([code, score]) => {
    if (score > maxScore) {
      winner = code;
      maxScore = score;
      tiedCodes.length = 0;
      tiedCodes.push(code);
      return;
    }

    if (score === maxScore) {
      tiedCodes.push(code);
    }
  });

  return tiedCodes.length > 1 ? defaultCode : winner;
}

export function getSkinTypeProfile(code: string | null | undefined): SkinTypeProfile {
  if (!code) return DEFAULT_PROFILE;

  const normalizedCode = code.toUpperCase() as SkinTypeCode;
  return SKIN_TYPE_MAP.get(normalizedCode) ?? { ...DEFAULT_PROFILE, code: normalizedCode };
}

export function listSkinTypeProfiles(): SkinTypeProfile[] {
  return Array.from(SKIN_TYPE_MAP.values());
}

export function prepareSkinTypeForAI(code: string | null | undefined): string {
  const profile = getSkinTypeProfile(code);

  const keyNeeds = [
    ...profile.makeup_needs.primer.slice(0, 2),
    ...profile.makeup_needs.foundation.slice(0, 2),
  ];

  return [
    `User's Skin Profile:`,
    `- Code: ${profile.code}`,
    `- Oil Level: ${profile.oil_level}`,
    `- Concern: ${profile.concern}`,
    `- Undertone: ${profile.undertone}`,
    keyNeeds.length > 0 ? `- Key Needs: ${keyNeeds.join(', ')}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

export function splitSkinTypeCode(code: string | null | undefined): {
  oilLevel: OilLevelCode | null;
  concern: ConcernCode | null;
  undertone: UndertoneCode | null;
} {
  if (!code) {
    return {
      oilLevel: null,
      concern: null,
      undertone: null,
    };
  }

  const [oilLevel, concern, undertone] = code.toUpperCase().split('-') as [OilLevelCode?, ConcernCode?, UndertoneCode?];

  return {
    oilLevel: (oilLevel && QUIZ_AXIS_CODES.oil_level.includes(oilLevel)) ? oilLevel : null,
    concern: (concern && QUIZ_AXIS_CODES.concerns.includes(concern)) ? concern : null,
    undertone: (undertone && QUIZ_AXIS_CODES.undertone.includes(undertone)) ? undertone : null,
  };
}
