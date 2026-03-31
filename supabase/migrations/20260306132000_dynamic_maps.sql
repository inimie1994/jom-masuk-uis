-- Create tiles table
CREATE TABLE IF NOT EXISTS tiles (
  tile_id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  sprite_url TEXT,
  is_collidable BOOLEAN DEFAULT false,
  is_trigger BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Update campus_maps table (if it exists, we will drop and recreate to match new schema for simplicity)
DROP TABLE IF EXISTS campus_maps;

CREATE TABLE IF NOT EXISTS campus_maps (
  map_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  grid_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial tile vocabulary
INSERT INTO tiles (tile_id, label, sprite_url, is_collidable, is_trigger, metadata) VALUES
(0, 'Grass', NULL, false, false, '{}'::jsonb),
(1, 'Wall', NULL, true, false, '{}'::jsonb),
(2, 'Path', NULL, false, false, '{}'::jsonb),
(3, 'Building Interaction', NULL, false, true, '{"description": "A notable location on campus. Complete tasks here."}'::jsonb);

-- Insert initial map data
INSERT INTO campus_maps (map_id, name, grid_data) VALUES
(1, 'Main Campus', '[
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 2, 0, 3, 0, 0, 1],
    [1, 0, 0, 0, 2, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 2, 2, 2, 2, 0, 1],
    [1, 0, 1, 0, 2, 0, 0, 2, 0, 1],
    [1, 0, 0, 0, 2, 0, 3, 2, 0, 1],
    [1, 0, 0, 0, 2, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
]'::jsonb);
