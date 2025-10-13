export type QuizAxis = 'oil_level' | 'concerns' | 'undertone';

export interface RawQuizAnswer {
  id: string;
  text: string;
  weights: Record<string, number>;
}

export interface RawQuizQuestion {
  id: string;
  axis: QuizAxis;
  question: string;
  answers: RawQuizAnswer[];
}

export interface RawQuizAxisInfo {
  name: string;
  codes: string[];
  default_tie: string;
}

export interface RawQuizData {
  version: string;
  title: string;
  description: string;
  scoring_method: string;
  axes: Record<QuizAxis, RawQuizAxisInfo>;
  questions: RawQuizQuestion[];
}

export interface RawSkinTypeProfile {
  code: string;
  oil_level: string;
  concern: string;
  undertone: string;
  profile_summary: string;
  description: string;
  makeup_needs: {
    primer: string[];
    foundation: string[];
    concealer: string[];
    powder: string[];
    blush: string[];
    highlighter: string[];
  };
}

export interface RawSkinTypeData {
  version: string;
  system_name: string;
  total_types: number;
  types: RawSkinTypeProfile[];
}

const oilLevelMeta = {
  O: {
    label: 'Oily',
    persona: 'Shine Strategist',
    description: 'Your complexion produces plentiful natural oils, so shine management and long-wear textures are key.',
    needs: {
      primer: ['oil-control primer', 'grip primer'],
      foundation: ['long-wear matte foundation', 'soft-matte skin tint'],
      concealer: ['crease-resistant concealer'],
      powder: ['oil-absorbing loose powder', 'blurring setting powder'],
      blush: ['powder blush', 'gel-to-powder blush'],
      highlighter: ['soft-focus powder highlighter'],
    },
  },
  N: {
    label: 'Normal / Combination',
    persona: 'Balance Curator',
    description: 'Your skin stays mostly balanced with the occasional shift between T-zone and cheeks, so flexible textures thrive.',
    needs: {
      primer: ['balancing primer', 'radiance serum primer'],
      foundation: ['natural-finish foundation', 'lightweight complexion tint'],
      concealer: ['flexible cream concealer'],
      powder: ['finishing powder', 'pressed veil powder'],
      blush: ['cream-to-powder blush', 'multi-stick blush'],
      highlighter: ['balm highlighter', 'pearl sheen illuminator'],
    },
  },
  D: {
    label: 'Dry',
    persona: 'Velvet Hydrator',
    description: 'Your skin leans thirstier, craving emollient textures and strategic radiance to maintain comfort.',
    needs: {
      primer: ['hydrating primer', 'glow booster'],
      foundation: ['moisturizing foundation', 'serum foundation'],
      concealer: ['hydrating concealer'],
      powder: ['satin finishing powder'],
      blush: ['cream blush', 'liquid blush'],
      highlighter: ['dew stick highlighter'],
    },
  },
} as const;

const concernMeta = {
  C: {
    label: 'Clear & Low-Maintenance',
    persona: 'Everyday Minimalist',
    description: 'You rarely battle persistent texture or blemishes, so lightweight products can stay the focus.',
    needs: {
      primer: ['soft-focus primer'],
      foundation: ['sheer skin tint'],
      concealer: ['light-reflecting concealer'],
      powder: ['micro-fine finishing powder'],
      blush: ['sheer wash blush'],
      highlighter: ['subtle radiance highlighter'],
    },
  },
  A: {
    label: 'Blemish or Congestion Prone',
    persona: 'Clarity Defender',
    description: 'Breakouts or congestion guide your routine, so non-comedogenic, breathable textures keep skin calm.',
    needs: {
      primer: ['salicylic balancing primer'],
      foundation: ['non-comedogenic foundation'],
      concealer: ['spot treatment concealer'],
      powder: ['antibacterial blotting powder'],
      blush: ['oil-free powder blush'],
      highlighter: ['cooling gel highlighter'],
    },
  },
  R: {
    label: 'Redness or Rosacea',
    persona: 'Calm Canvas',
    description: 'Sensitivity or flushing benefits from calming formulas that keep tones even and soothed.',
    needs: {
      primer: ['green-correcting primer'],
      foundation: ['calming complexion serum'],
      concealer: ['color-correcting concealer'],
      powder: ['soothing mineral powder'],
      blush: ['neutral rose blush'],
      highlighter: ['cool-toned sheen highlighter'],
    },
  },
  S: {
    label: 'Reactive or Sensitive',
    persona: 'Barrier Guardian',
    description: 'Your focus is keeping the barrier happy with simplified, fragrance-free formulas that stay kind.',
    needs: {
      primer: ['barrier-support primer'],
      foundation: ['hypoallergenic foundation'],
      concealer: ['skin-calming concealer'],
      powder: ['talc-free setting powder'],
      blush: ['fragrance-free cream blush'],
      highlighter: ['dermatologist-tested luminizer'],
    },
  },
} as const;

const undertoneMeta = {
  W: {
    label: 'Warm',
    persona: 'Golden Glow',
    description: 'Your skin carries golden, peach, or honey notes, thriving with sun-kissed hues and bronzy accents.',
    needs: {
      primer: ['radiance primer'],
      foundation: ['warm-neutral foundation'],
      concealer: ['peach correcting concealer'],
      powder: ['golden setting powder'],
      blush: ['terracotta blush'],
      highlighter: ['warm champagne highlighter'],
    },
  },
  N: {
    label: 'Neutral',
    persona: 'Balanced Beacon',
    description: 'You pull from both warm and cool families, giving you freedom to flex finishes and tones easily.',
    needs: {
      primer: ['grip primer'],
      foundation: ['true-neutral foundation'],
      concealer: ['neutral concealer'],
      powder: ['translucent blurring powder'],
      blush: ['soft mauve blush'],
      highlighter: ['universal pearlescent highlighter'],
    },
  },
  K: {
    label: 'Cool',
    persona: 'Moonlit Muse',
    description: 'Pink, rose, or blue undertones shine with cool neutrals and lit-from-within radiance.',
    needs: {
      primer: ['tone-evening primer'],
      foundation: ['cool-neutral foundation'],
      concealer: ['rosy brightening concealer'],
      powder: ['soft rose finishing powder'],
      blush: ['berry cream blush'],
      highlighter: ['icy sheen highlighter'],
    },
  },
} as const;

const dedupe = (items: string[]): string[] => Array.from(new Set(items));

const buildSkinTypeProfiles = (): RawSkinTypeProfile[] => {
  const profiles: RawSkinTypeProfile[] = [];

  (['O', 'N', 'D'] as const).forEach((oilCode) => {
    (['C', 'A', 'R', 'S'] as const).forEach((concernCode) => {
      (['W', 'N', 'K'] as const).forEach((undertoneCode) => {
        const code = `${oilCode}-${concernCode}-${undertoneCode}`;
        const oil = oilLevelMeta[oilCode];
        const concern = concernMeta[concernCode];
        const undertone = undertoneMeta[undertoneCode];

        const primer = dedupe([
          ...oil.needs.primer,
          ...concern.needs.primer,
          ...undertone.needs.primer,
        ]);
        const foundation = dedupe([
          ...oil.needs.foundation,
          ...concern.needs.foundation,
          ...undertone.needs.foundation,
        ]);
        const concealer = dedupe([
          ...oil.needs.concealer,
          ...concern.needs.concealer,
          ...undertone.needs.concealer,
        ]);
        const powder = dedupe([
          ...oil.needs.powder,
          ...concern.needs.powder,
          ...undertone.needs.powder,
        ]);
        const blush = dedupe([
          ...oil.needs.blush,
          ...concern.needs.blush,
          ...undertone.needs.blush,
        ]);
        const highlighter = dedupe([
          ...oil.needs.highlighter,
          ...concern.needs.highlighter,
          ...undertone.needs.highlighter,
        ]);

        const profile: RawSkinTypeProfile = {
          code,
          oil_level: oil.label,
          concern: concern.label,
          undertone: undertone.label,
          profile_summary: `The ${undertone.persona} ${concern.persona}`,
          description: `${oil.description} ${concern.description} ${undertone.description}`,
          makeup_needs: {
            primer,
            foundation,
            concealer,
            powder,
            blush,
            highlighter,
          },
        };

        profiles.push(profile);
      });
    });
  });

  return profiles;
};

const quizQuestions: RawQuizQuestion[] = [
  {
    id: 'q1',
    axis: 'oil_level',
    question: 'How does your skin feel 2-3 hours after cleansing (no products applied)?',
    answers: [
      {
        id: 'q1_a1',
        text: 'Tight or flaky across most areas',
        weights: { D: 3 },
      },
      {
        id: 'q1_a2',
        text: 'Comfortable with a soft finish',
        weights: { N: 3 },
      },
      {
        id: 'q1_a3',
        text: 'Slightly shiny in the T-zone only',
        weights: { N: 1, O: 2 },
      },
      {
        id: 'q1_a4',
        text: 'Noticeably shiny across cheeks, forehead, and chin',
        weights: { O: 3 },
      },
    ],
  },
  {
    id: 'q2',
    axis: 'oil_level',
    question: 'How long does your base makeup stay intact before you consider touching up?',
    answers: [
      {
        id: 'q2_a1',
        text: 'Needs refreshing in under 3 hours',
        weights: { O: 3 },
      },
      {
        id: 'q2_a2',
        text: 'Looks fresh for 4-6 hours before minor touch-ups',
        weights: { N: 2, O: 1 },
      },
      {
        id: 'q2_a3',
        text: 'Lasts 6-8 hours with little maintenance',
        weights: { N: 3 },
      },
      {
        id: 'q2_a4',
        text: 'Breaks up or clings to dry patches quickly',
        weights: { D: 3 },
      },
    ],
  },
  {
    id: 'q3',
    axis: 'oil_level',
    question: 'How often do you blot or powder your face during an average day?',
    answers: [
      {
        id: 'q3_a1',
        text: 'Rarely or never',
        weights: { D: 2, N: 1 },
      },
      {
        id: 'q3_a2',
        text: 'Maybe once around midday',
        weights: { N: 2, O: 1 },
      },
      {
        id: 'q3_a3',
        text: 'Two or three times throughout the day',
        weights: { O: 3 },
      },
      {
        id: 'q3_a4',
        text: 'Only before important events or photos',
        weights: { N: 2 },
      },
    ],
  },
  {
    id: 'q4',
    axis: 'concerns',
    question: 'Which statement best matches your current skin priorities?',
    answers: [
      {
        id: 'q4_a1',
        text: 'Keeping breakouts under control is top of mind',
        weights: { A: 3 },
      },
      {
        id: 'q4_a2',
        text: 'Calming redness or flushing is my main goal',
        weights: { R: 3 },
      },
      {
        id: 'q4_a3',
        text: 'Avoiding irritation or reactions shapes my routine',
        weights: { S: 3 },
      },
      {
        id: 'q4_a4',
        text: 'I mostly focus on enhancing glow and longevity',
        weights: { C: 3 },
      },
    ],
  },
  {
    id: 'q5',
    axis: 'concerns',
    question: 'How would you describe your skin’s typical texture up close?',
    answers: [
      {
        id: 'q5_a1',
        text: 'Active blemishes or clogged pores are common',
        weights: { A: 3 },
      },
      {
        id: 'q5_a2',
        text: 'Diffuse redness or hot spots appear often',
        weights: { R: 3 },
      },
      {
        id: 'q5_a3',
        text: 'Texture is mostly smooth with minor seasonal changes',
        weights: { C: 3 },
      },
      {
        id: 'q5_a4',
        text: 'Skin reacts quickly to new formulas or friction',
        weights: { S: 3 },
      },
    ],
  },
  {
    id: 'q6',
    axis: 'concerns',
    question: 'How does your skin typically respond to long-wear or full-coverage products?',
    answers: [
      {
        id: 'q6_a1',
        text: 'They can clog or trigger breakouts if I’m not careful',
        weights: { A: 3 },
      },
      {
        id: 'q6_a2',
        text: 'They emphasize redness unless I color-correct first',
        weights: { R: 3 },
      },
      {
        id: 'q6_a3',
        text: 'My skin tolerates most formulas without issue',
        weights: { C: 3 },
      },
      {
        id: 'q6_a4',
        text: 'They often feel itchy, sting, or cause flare ups',
        weights: { S: 3 },
      },
    ],
  },
  {
    id: 'q7',
    axis: 'undertone',
    question: 'Which jewelry metal tends to look most flattering on your skin?',
    answers: [
      {
        id: 'q7_a1',
        text: 'Gold tones bring out my glow',
        weights: { W: 3 },
      },
      {
        id: 'q7_a2',
        text: 'Silver or platinum feels more natural',
        weights: { K: 3 },
      },
      {
        id: 'q7_a3',
        text: 'Both look equally good',
        weights: { N: 3 },
      },
      {
        id: 'q7_a4',
        text: 'Rose gold is my favorite',
        weights: { W: 1, K: 1 },
      },
    ],
  },
  {
    id: 'q8',
    axis: 'undertone',
    question: 'How would you describe your natural flush or the veins on your wrist?',
    answers: [
      {
        id: 'q8_a1',
        text: 'Peachy, golden, or olive and veins lean green',
        weights: { W: 3 },
      },
      {
        id: 'q8_a2',
        text: 'Pink, rosy, or bluish with cooler veins',
        weights: { K: 3 },
      },
      {
        id: 'q8_a3',
        text: 'A balanced mix that’s hard to categorize',
        weights: { N: 3 },
      },
      {
        id: 'q8_a4',
        text: 'Olive yet flushes rosy in the cold',
        weights: { W: 1, K: 1 },
      },
    ],
  },
  {
    id: 'q9',
    axis: 'undertone',
    question: 'Which makeup shades do you reach for when you want a guaranteed match?',
    answers: [
      {
        id: 'q9_a1',
        text: 'Golden, caramel, bronze, or warm coral tones',
        weights: { W: 3 },
      },
      {
        id: 'q9_a2',
        text: 'Cool berry, mauve, porcelain, or blue-reds',
        weights: { K: 3 },
      },
      {
        id: 'q9_a3',
        text: 'Neutral taupes, beige, or adaptable nudes',
        weights: { N: 3 },
      },
      {
        id: 'q9_a4',
        text: 'I mix undertones depending on the season',
        weights: { W: 1, N: 1, K: 1 },
      },
    ],
  },
];

const SKIN_TYPE_PROFILES = buildSkinTypeProfiles();

export const QUIZ_DATA: RawQuizData = {
  version: '1.0',
  title: 'Siosi Skin Type Quiz',
  description: 'Find your perfect makeup match based on oil level, skin concerns, and undertone.',
  scoring_method: 'highest_weighted_sum',
  axes: {
    oil_level: {
      name: 'Oil Level',
      codes: ['O', 'N', 'D'],
      default_tie: 'N',
    },
    concerns: {
      name: 'Primary Concern',
      codes: ['C', 'A', 'R', 'S'],
      default_tie: 'C',
    },
    undertone: {
      name: 'Undertone',
      codes: ['W', 'N', 'K'],
      default_tie: 'N',
    },
  },
  questions: quizQuestions,
};

export const SKIN_TYPES_DATA: RawSkinTypeData = {
  version: '1.0',
  system_name: 'Siosi Skin Types',
  total_types: SKIN_TYPE_PROFILES.length,
  types: SKIN_TYPE_PROFILES,
};
