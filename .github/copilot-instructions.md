This repository is a Next.js 15 app (App Router) for "siOsi" — an AI-powered makeup analysis web app. Keep guidance short and actionable so an AI coding agent can be productive immediately.

1) Big picture (what and why)
- Frontend: Next.js 15 App Router under `app/`. Routes are locale-scoped: `app/[locale]/...` and use `next-intl` for translations.
- Backend/API: Edge/route handlers live in `app/api/*` (e.g. `app/api/analyze/route.ts`) and call OpenAI for image analysis.
- Persistence: Supabase for storage (photos) and Postgres tables (sessions, analyses). Supabase helper is `lib/supabase.ts` and DB helpers in `lib/db.ts` and `lib/save-session.ts`.
- Why structured this way: localizable app + serverless/edge analysis routes keep image processing and LLM calls server-side while the client uploads images to Supabase Storage.

2) Key developer workflows / commands
- Run dev server: `pnpm dev` or `npm run dev` (script: `next dev`).
- Build: `pnpm build` / `npm run build` (script: `next build`).
- Typecheck: `npm run typecheck` (runs `tsc --noEmit`).
This repository is a Next.js 15 app (App Router) for "siOsi" — an AI-powered makeup analysis web app. Keep guidance short and actionable so an AI coding agent can be productive immediately.

1) Big picture (what and why)
- Frontend: Next.js 15 App Router under `app/`. Routes are locale-scoped: `app/[locale]/...` and use `next-intl` for translations.
- Backend/API: Edge/route handlers live in `app/api/*` (notably `app/api/analyze/route.ts`) and call OpenAI for image analysis.
- Persistence: Supabase for storage (photos) and Postgres tables (`sessions`, `usage_tracking`). Helpers: `lib/supabase.ts`, `lib/db.ts`, `lib/save-session.ts`.

2) Key dev workflows & commands
- Dev server: `pnpm dev` or `npm run dev`.
- Build: `pnpm build` / `npm run build`.
- Typecheck: `npm run typecheck` (tsc --noEmit).
- Lint: `npm run lint`.
- Validate translations: `npm run validate:i18n` (scripts/validate-messages.js).

3) Environment variables (exact names)
- `OPENAI_API_KEY` — used only on server routes (`app/api/*`).
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — server-side Supabase credentials.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client-side Supabase keys for uploads.

4) Project conventions & patterns
- Locale-first routing: use `next-intl` server helpers (`i18n.ts`) and `NextIntlClientProvider` in `app/[locale]/layout.tsx`.
- Supabase: always call `getSupabase()` from `lib/supabase.ts`. Client uploads use the public keys and `.storage.from('makeup-photos').upload(...)` then call `/api/analyze` with the public URL.
- OpenAI & analysis route: `app/api/analyze/route.ts` expects to send a deterministic prompt and parse strict JSON back from the model. If you change schema, update `lib/types.ts` and DB shape.
- Types: prefer `lib/types.ts` for Session/LabAnalysis shapes.
- UI: reuse components in `components/` and `components/ui/` (e.g., `UploadZone`, `Header`, `Button`).

5) Labs & inputs — what AI can do vs human-only
 - Auto-run (from image alone):
   - Flashback Lab (flash/white-cast detection)
   - Texture Trigger (shimmer vs texture)

 - Image-inferable but lower confidence (may run if image is clear):
   - Pore Proof (pore visibility)
   - Undertone Truth (if wrist/neck visible)

 - Require additional context (human-only inputs):
   - Melt Meter (location, datetime, temp, humidity, activity, skin_type)
   - Transfer Test (area, product_type, finish, set_steps, activities, duration_hours)
   - Crease Police (lid_type, product_type, primer_used)
   - Lash Shadow Check (lash_style, band_thickness, lid_type)
   - Oxidation Watch (formula_base, wear_time, brand_known, self_tan_days)
   - Brow Lock (product_type, habits)
   - Glitter Fallout Gate (glitter_type, adhesive_use, activity_level)
   - Veil/Collar Transfer (base_finish, cream_products_used, fabric_type)
   - First-Kiss OK? (liner_used, application_steps)
   - Breakout Risk Radar (product list, skin triggers, current skin condition)
   - ...and others that need product/process context

 - Labs that explicitly require product info: Transfer Test, Crease Police, Brow Lock, Glitter Fallout Gate, Veil/Collar Transfer, First-Kiss OK?, Pore Proof (product compatibility), Breakout Risk Radar, Retouch Timer, Oily Skin Timer.

Minimal input pattern: auto-fill what the image can provide; prompt the user only for the small set of human-only fields to unlock specific labs. Example (Transfer Test minimal JSON):
{
  "area": "lips",
  "product_type": "liquid_matte",
  "finish": "matte",
  "set_steps": ["liner","blot","powder"],
  "activities": ["eating","kissing"],
  "duration_hours": 4
}

6) Implementation pointers & examples
- See `app/[locale]/analyze/page.tsx` for the upload → Supabase storage → POST /api/analyze flow and how the client logs `{ uploadData, uploadError }`.
- See `app/api/analyze/route.ts` for the OpenAI prompt structure and JSON parsing expectations. Keep the assistant response strictly JSON.
- `lib/normalize-analyses.ts` converts OpenAI responses into the canonical session shape and exposes helpers like `calculateCriticalCountFromArray`.
- `lib/save-session.ts` and `lib/db.ts` show DB insert/select patterns; follow `.insert(...).select().single()`.

7) Debugging & observability
- Preserve existing logging shapes: Supabase upload callers log `{ uploadData, uploadError }` and API routes log errors and return `{ error: '...' }` JSON.
- Add processing metrics to session records when possible (ai_processing_time_ms, ai_cost_usd) — schema examples appear in the project planning prompts.

8) Where to look (quick links)
- `app/[locale]/analyze/page.tsx` — upload + quick-context UI
- `app/api/analyze/route.ts` — OpenAI analysis logic and prompt
- `lib/supabase.ts`, `lib/db.ts`, `lib/save-session.ts` — storage & DB helpers
- `lib/types.ts` — canonical types for sessions and lab analyses
- `lib/normalize-analyses.ts` — normalization helpers for analysis results

If you'd like, I can add a minimal user-input form (only the human-only fields grouped by lab) or a JSON schema for each lab to validate user-provided context before calling the analyzer. Tell me which labs to prioritize and I'll generate the form + validation schema.
