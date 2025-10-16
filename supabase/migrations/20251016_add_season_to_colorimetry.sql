-- Add season columns to existing colorimetry table
ALTER TABLE colorimetry 
ADD COLUMN photo_season text CHECK (photo_season IN (
  'bright_winter', 'cool_winter', 'deep_winter',
  'bright_spring', 'warm_spring', 'light_spring',
  'light_summer', 'cool_summer', 'soft_summer',
  'soft_autumn', 'warm_autumn', 'deep_autumn'
)),
ADD COLUMN user_season text CHECK (user_season IN (
  'bright_winter', 'cool_winter', 'deep_winter',
  'bright_spring', 'warm_spring', 'light_spring',
  'light_summer', 'cool_summer', 'soft_summer',
  'soft_autumn', 'warm_autumn', 'deep_autumn'
));
