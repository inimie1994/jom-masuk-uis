-- Enable RLS for all affected tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE npc_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_maps ENABLE ROW LEVEL SECURITY;

-- Policies for LEADS
-- Allow anyone to submit the enrollment form (Insert only)
CREATE POLICY "Allow public insert access" 
ON leads FOR INSERT 
WITH CHECK (true);

-- Restrict reading leads to authenticated users (admin/staff)
CREATE POLICY "Allow authenticated select access" 
ON leads FOR SELECT 
USING (auth.role() = 'authenticated');

-- Policies for GAME DATA (npc_data, tiles, campus_maps)
-- Allow anyone to read game data so the game can load
CREATE POLICY "Allow public read access to npc_data" 
ON npc_data FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to tiles" 
ON tiles FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to campus_maps" 
ON campus_maps FOR SELECT 
USING (true);

-- Restrict writing game data to authenticated users
CREATE POLICY "Allow authenticated write access to npc_data" 
ON npc_data FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated write access to tiles" 
ON tiles FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated write access to campus_maps" 
ON campus_maps FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
