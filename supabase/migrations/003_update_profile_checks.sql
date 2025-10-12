-- Align profile enum checks with canonical values and allow NULL clears
BEGIN;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_lid_type_check;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_skin_tone_check;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_skin_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_skin_tone_check
  CHECK (
    skin_tone IS NULL
    OR skin_tone = ANY (ARRAY['fair','light','medium','tan','deep','dark'])
  );

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_skin_type_check
  CHECK (
    skin_type IS NULL
    OR skin_type = ANY (ARRAY['oily','dry','combination','normal','sensitive'])
  );

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_lid_type_check
  CHECK (
    lid_type IS NULL
    OR lid_type = ANY (
      ARRAY[
        'almond-eyes',
        'round-eyes',
        'hooded-eyes',
        'monolid-eyes',
        'upturned-eyes',
        'downturned-eyes',
        'close-set-eyes',
        'wide-set-eyes',
        'deep-set-eyes',
        'protruding-eyes'
      ]
    )
  );

COMMIT;
