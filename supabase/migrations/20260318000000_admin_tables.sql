-- Create players table for visitor tracking
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  ic_no TEXT NOT NULL,
  gender TEXT NOT NULL,
  spm_result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add CTA fields to npc_data
ALTER TABLE npc_data 
ADD COLUMN IF NOT EXISTS cta_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cta_link TEXT,
ADD COLUMN IF NOT EXISTS cta_text TEXT;

-- Create event_grids table
CREATE TABLE IF NOT EXISTS event_grids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grid_config JSONB NOT NULL, -- Detailed configuration for the event grid
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_grids ENABLE ROW LEVEL SECURITY;

-- Policies for players
CREATE POLICY "Allow authenticated select on players" ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public insert on players" ON players FOR INSERT WITH CHECK (true);

-- Policies for event_grids
CREATE POLICY "Allow public select on event_grids" ON event_grids FOR SELECT USING (true);
CREATE POLICY "Allow authenticated all on event_grids" ON event_grids FOR ALL TO authenticated USING (true) WITH CHECK (true);
