-- Create table for storing lead generation data
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for storing NPC dialogues and faculty info
CREATE TABLE IF NOT EXISTS npc_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tile_type INTEGER DEFAULT 3, -- 3 for Faculty, 4 for NPC senior student etc.
  faculty_name TEXT,
  content TEXT NOT NULL,
  quest_id TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for maps
CREATE TABLE IF NOT EXISTS campus_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grid JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert sample faculty data
INSERT INTO npc_data (tile_type, faculty_name, content) VALUES
(3, 'Faculty of IT', 'Welcome to the Faculty of Information Technology! Here we produce tech leaders.'),
(3, 'Faculty of Business', 'Explore the world of entrepreneurship and finance at the Faculty of Business.'),
(3, 'Library', 'Shhh! This is the University Library. Find the Scholarship Guide here.');
