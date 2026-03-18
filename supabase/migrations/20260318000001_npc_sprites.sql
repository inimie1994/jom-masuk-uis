-- Add sprite columns to npc_data
ALTER TABLE npc_data 
ADD COLUMN sprite_x INTEGER DEFAULT 0,
ADD COLUMN sprite_y INTEGER DEFAULT 0,
ADD COLUMN sprite_width INTEGER DEFAULT 48,
ADD COLUMN sprite_height INTEGER DEFAULT 48;
