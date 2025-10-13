siosi

## Skin Type Quiz

- Dedicated flow lives at `app/[locale]/skin-type-quiz` and persists state client-side until completion.
- Quiz metadata and scoring logic are defined in `lib/skin-type.ts` consuming `quiz-questions.json` and `skin-types.json`.
- Completing the quiz automatically saves the resulting skin type code to the authenticated profile via `/api/profile/save`.
- Profile view now surfaces quiz results through `SkinTypeCard`, offering quick retake links and expandable recommendations.
