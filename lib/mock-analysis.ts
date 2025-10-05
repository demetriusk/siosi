import { LabName, Verdict, LabAnalysis, UploadContext } from './types';

interface LabConfig {
  name: LabName;
  possibleDetected: string[];
  possibleRecommendations: string[];
}

const labConfigs: LabConfig[] = [
  {
    name: 'flashback',
    possibleDetected: [
      'SPF-containing products detected in T-zone',
      'Visible white cast on forehead and nose',
      'Foundation contains titanium dioxide',
      'Setting powder shows reflective properties',
      'Concealer appears lighter under flash simulation',
    ],
    possibleRecommendations: [
      'Switch to flash-friendly foundation without SPF for photos',
      'Use HD powder instead of traditional setting powder',
      'Avoid titanium dioxide and zinc oxide in base products',
      'Test makeup with phone flash before the event',
      'Apply thinner layers of product in flash-prone areas',
    ],
  },
  {
    name: 'pores',
    possibleDetected: [
      'Visible texture on cheeks and nose area',
      'Pore pattern showing through foundation',
      'Product settling into pores on T-zone',
      'Enlarged pores visible on close inspection',
      'Uneven texture on chin and forehead',
    ],
    possibleRecommendations: [
      'Apply pore-filling primer before foundation',
      'Use stippling motion instead of rubbing when applying',
      'Try a silicone-based primer for smoother finish',
      'Set with finely-milled translucent powder',
      'Consider skin-texture-appropriate foundation formula',
    ],
  },
  {
    name: 'texture',
    possibleDetected: [
      'Dry patches visible on cheeks',
      'Cakey appearance around smile lines',
      'Foundation emphasizing skin texture',
      'Uneven product distribution detected',
      'Fine lines highlighted by powder',
    ],
    possibleRecommendations: [
      'Exfoliate and moisturize before makeup application',
      'Use hydrating primer for smoother base',
      'Apply foundation with damp sponge for seamless finish',
      'Set only T-zone, leave rest of face dewy',
      'Mix facial oil with foundation for smoother application',
    ],
  },
  {
    name: 'undertone',
    possibleDetected: [
      'Foundation appears slightly orange/yellow',
      'Mismatch between face and neck detected',
      'Color correction needed for even tone',
      'Foundation oxidizing to different shade',
      'Concealer shade not matching base',
    ],
    possibleRecommendations: [
      'Match foundation to neck rather than face',
      'Consider cool-toned foundation for better match',
      'Use color-correcting primer before foundation',
      'Blend foundation down to neck and décolletage',
      'Test foundation in natural light before purchasing',
    ],
  },
  {
    name: 'transfer',
    possibleDetected: [
      'Products likely to transfer to clothing',
      'Foundation not fully set on jawline',
      'High-pigment products prone to smudging',
      'Lipstick shows transfer risk',
      'Cream products need better setting',
    ],
    possibleRecommendations: [
      'Set all cream products with matching powder',
      'Use setting spray for transfer resistance',
      'Apply thin layers and allow to dry between',
      'Use long-wear formulas for high-contact areas',
      'Set makeup with translucent powder thoroughly',
    ],
  },
  {
    name: 'longevity',
    possibleDetected: [
      'Makeup likely to fade after 4-6 hours',
      'Oil breakthrough expected in T-zone',
      'Foundation formula not long-wearing',
      'Setting method insufficient for all-day wear',
      'Primer-foundation compatibility issues',
    ],
    possibleRecommendations: [
      'Prime with mattifying primer on oily areas',
      'Use long-wear foundation formula',
      'Set with powder and finishing spray',
      'Blot oil periodically without disturbing makeup',
      'Touch up with pressed powder instead of liquid',
    ],
  },
  {
    name: 'oxidation',
    possibleDetected: [
      'Foundation likely to oxidize darker',
      'Color shift expected after 2-3 hours',
      'Current shade may turn orange',
      'Product contains oxidation-prone ingredients',
      'Need lighter starting shade to compensate',
    ],
    possibleRecommendations: [
      'Choose shade one tone lighter than perfect match',
      'Use primer to create barrier against oxidation',
      'Look for oxidation-resistant foundation formulas',
      'Test foundation for 2+ hours before purchasing',
      'Set immediately with powder to slow oxidation',
    ],
  },
  {
    name: 'creasing',
    possibleDetected: [
      'Concealer likely to crease under eyes',
      'Foundation settling into expression lines',
      'Product buildup in smile lines',
      'Powder accentuating fine lines',
      'Excess product in wrinkle-prone areas',
    ],
    possibleRecommendations: [
      'Use less product under eyes and on lines',
      'Set with minimal powder using pressing motion',
      'Choose hydrating concealer formula',
      'Apply eye cream and let absorb before makeup',
      'Use setting spray instead of powder on creasing areas',
    ],
  },
  {
    name: 'blending',
    possibleDetected: [
      'Harsh contour lines visible',
      'Blush placement needs adjustment',
      'Color transition not seamless',
      'Edges of products visible',
      'Insufficient blending on jawline',
    ],
    possibleRecommendations: [
      'Blend with clean brush in circular motions',
      'Use transition shades between colors',
      'Ensure hairline and jawline are seamlessly blended',
      'Use fluffy brush for final diffusing',
      'Check blending in natural light before finishing',
    ],
  },
];

function getRandomConfidence(min: number = 65, max: number = 95): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomVerdict(confidence: number): Verdict {
  const rand = Math.random();

  if (confidence >= 80) {
    if (rand < 0.3) return 'NAY';
    if (rand < 0.6) return 'MAYBE';
    return 'YAY';
  } else if (confidence >= 70) {
    if (rand < 0.35) return 'NAY';
    if (rand < 0.65) return 'MAYBE';
    return 'YAY';
  } else {
    if (rand < 0.4) return 'NAY';
    if (rand < 0.75) return 'MAYBE';
    return 'YAY';
  }
}

function getRandomScore(verdict: Verdict): number {
  if (verdict === 'YAY') {
    return Math.floor(Math.random() * 30 + 70) / 10;
  } else if (verdict === 'MAYBE') {
    return Math.floor(Math.random() * 40 + 40) / 10;
  } else {
    return Math.floor(Math.random() * 40 + 10) / 10;
  }
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function generateMockAnalysis(
  sessionId: string,
  context?: UploadContext
): Promise<LabAnalysis[]> {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 3000));

  const numLabs = Math.floor(Math.random() * 6) + 4;
  const selectedLabs = getRandomItems(labConfigs, numLabs);

  return selectedLabs.map(lab => {
    const confidence = getRandomConfidence();
    const verdict = getRandomVerdict(confidence);
    const score = getRandomScore(verdict);
    const detectedCount = Math.floor(Math.random() * 3) + 2;
    const recommendationCount = Math.floor(Math.random() * 3) + 2;

    return {
      id: crypto.randomUUID(),
      session_id: sessionId,
      lab_name: lab.name,
      verdict,
      confidence: Math.round(confidence * 10) / 10,
      score: Math.round(score * 10) / 10,
      detected: getRandomItems(lab.possibleDetected, detectedCount),
      recommendations: getRandomItems(lab.possibleRecommendations, recommendationCount),
      zones_affected: verdict === 'NAY' ? ['T-zone', 'cheeks', 'forehead'].slice(0, Math.floor(Math.random() * 2) + 1) : undefined,
      created_at: new Date().toISOString(),
    };
  });
}

export function calculateOverallScore(analyses: LabAnalysis[]): number {
  const totalScore = analyses.reduce((sum, analysis) => sum + analysis.score, 0);
  return Math.round((totalScore / analyses.length) * 10) / 10;
}

export function calculateCriticalCount(analyses: LabAnalysis[]): number {
  return analyses.filter(
    analysis => analysis.verdict === 'NAY' && analysis.confidence >= 80
  ).length;
}

export function calculateConfidenceAverage(analyses: LabAnalysis[]): number {
  const totalConfidence = analyses.reduce((sum, analysis) => sum + analysis.confidence, 0);
  return Math.round((totalConfidence / analyses.length) * 10) / 10;
}
