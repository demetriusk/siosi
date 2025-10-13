-- Allow storing structured skin type codes alongside legacy labels
BEGIN;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_skin_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_skin_type_check
  CHECK (
    skin_type IS NULL
    OR skin_type = ANY (ARRAY['oily','dry','combination','normal','sensitive'])
    OR skin_type ~ '^[OND]-[CARS]-[WKN]$'
  );

COMMIT;
