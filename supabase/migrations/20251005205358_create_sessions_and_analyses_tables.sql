/*
  # Create siosi.me database schema

  1. New Tables
    - `sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `created_at` (timestamptz) - When the session was created
      - `photo_url` (text) - URL to the uploaded photo in storage
      - `occasion` (text, optional) - What the makeup is for (photoshoot, wedding, etc.)
      - `concerns` (text[], optional) - Array of specific concerns (flash, lasting, etc.)
      - `skin_type` (text, optional) - User's skin type from profile
      - `skin_tone` (text, optional) - User's skin tone from profile
      - `lid_type` (text, optional) - User's lid type from profile
      - `overall_score` (numeric) - Overall prediction score 0-10
      - `critical_count` (integer) - Number of critical issues found
      - `confidence_avg` (numeric) - Average confidence score across all labs
    
    - `analyses`
      - `id` (uuid, primary key) - Unique analysis identifier
      - `session_id` (uuid, foreign key) - Links to sessions table
      - `lab_name` (text) - Name of the lab test (flashback, pores, etc.)
      - `verdict` (text) - YAY, NAY, or MAYBE
      - `confidence` (numeric) - Confidence score 0-100
      - `score` (numeric) - Lab score 0-10
      - `detected` (text[]) - Array of detected issues/points
      - `recommendations` (text[]) - Array of recommendations
      - `zones_affected` (text[], optional) - Specific zones affected
      - `created_at` (timestamptz) - When the analysis was created

  2. Security
    - Enable RLS on both tables
    - Public read access for sessions (no auth required for MVP)
    - Public insert access for sessions (no auth required for MVP)
    - Analyses inherit session permissions via foreign key

  3. Indexes
    - Index on session_id in analyses table for fast lookups
    - Index on created_at in sessions for chronological sorting
*/

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  photo_url text NOT NULL,
  occasion text,
  concerns text[],
  skin_type text,
  skin_tone text,
  lid_type text,
  overall_score numeric(3,1) DEFAULT 0 NOT NULL,
  critical_count integer DEFAULT 0 NOT NULL,
  confidence_avg numeric(4,1) DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  lab_name text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('YAY', 'NAY', 'MAYBE')),
  confidence numeric(4,1) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  score numeric(3,1) NOT NULL CHECK (score >= 0 AND score <= 10),
  detected text[] DEFAULT '{}' NOT NULL,
  recommendations text[] DEFAULT '{}' NOT NULL,
  zones_affected text[],
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analyses_session_id ON analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions are publicly readable"
  ON sessions FOR SELECT
  USING (true);

CREATE POLICY "Sessions are publicly insertable"
  ON sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sessions are publicly updatable"
  ON sessions FOR UPDATE
  USING (true);

CREATE POLICY "Analyses are publicly readable"
  ON analyses FOR SELECT
  USING (true);

CREATE POLICY "Analyses are publicly insertable"
  ON analyses FOR INSERT
  WITH CHECK (true);
