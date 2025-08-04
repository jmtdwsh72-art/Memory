-- Migration to add 'goal' memory type to existing databases
-- Run this after the initial setup if you already have a database

-- Drop the existing constraint
ALTER TABLE memory DROP CONSTRAINT IF EXISTS memory_type_check;

-- Add the new constraint with 'goal' type
ALTER TABLE memory ADD CONSTRAINT memory_type_check CHECK (type IN ('log', 'summary', 'pattern', 'correction', 'goal'));

-- Update any documentation
COMMENT ON TABLE memory IS 'Stores persistent memory summaries, logs, patterns, corrections, and goals';