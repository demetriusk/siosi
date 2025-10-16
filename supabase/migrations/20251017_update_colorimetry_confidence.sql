begin;

alter table public.colorimetry
  add column if not exists photo_confidence integer check (photo_confidence between 0 and 100),
  add column if not exists profile_confidence integer check (profile_confidence between 0 and 100),
  add column if not exists photo_season text check (photo_season in (
    'bright_winter', 'cool_winter', 'deep_winter',
    'bright_spring', 'warm_spring', 'light_spring',
    'light_summer', 'cool_summer', 'soft_summer',
    'soft_autumn', 'warm_autumn', 'deep_autumn'
  )),
  add column if not exists photo_season_confidence integer check (photo_season_confidence between 0 and 100),
  add column if not exists profile_season text check (profile_season in (
    'bright_winter', 'cool_winter', 'deep_winter',
    'bright_spring', 'warm_spring', 'light_spring',
    'light_summer', 'cool_summer', 'soft_summer',
    'soft_autumn', 'warm_autumn', 'deep_autumn'
  )),
  add column if not exists profile_season_confidence integer check (profile_season_confidence between 0 and 100),
  add column if not exists user_season text check (user_season in (
    'bright_winter', 'cool_winter', 'deep_winter',
    'bright_spring', 'warm_spring', 'light_spring',
    'light_summer', 'cool_summer', 'soft_summer',
    'soft_autumn', 'warm_autumn', 'deep_autumn'
  )),
  add column if not exists user_season_confidence integer check (user_season_confidence between 0 and 100);

update public.colorimetry
set profile_season = coalesce(profile_season, user_season),
    profile_season_confidence = coalesce(profile_season_confidence, user_season_confidence)
where profile_season is null and user_season is not null;

commit;
