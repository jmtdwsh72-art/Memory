-- Migration to add extended memory types to existing databases
-- Run this after the initial setup if you already have a database
-- This adds support for: goal_progress, session_summary, session_decision

-- Drop the existing constraint
ALTER TABLE memory DROP CONSTRAINT IF EXISTS memory_type_check;

-- Add the new constraint with all 8 memory types
ALTER TABLE memory ADD CONSTRAINT memory_type_check CHECK (
  type IN (
    'log', 
    'summary', 
    'pattern', 
    'correction', 
    'goal', 
    'goal_progress', 
    'session_summary', 
    'session_decision'
  )
);

-- Add optional goal-specific columns if they don't exist
DO $$ 
BEGIN
    -- Add goal_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memory' AND column_name = 'goal_id') THEN
        ALTER TABLE memory ADD COLUMN goal_id TEXT DEFAULT NULL;
    END IF;
    
    -- Add goal_summary column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memory' AND column_name = 'goal_summary') THEN
        ALTER TABLE memory ADD COLUMN goal_summary TEXT DEFAULT NULL;
    END IF;
    
    -- Add goal_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memory' AND column_name = 'goal_status') THEN
        ALTER TABLE memory ADD COLUMN goal_status TEXT CHECK (goal_status IN ('new', 'in_progress', 'completed', 'abandoned')) DEFAULT NULL;
    END IF;
END $$;

-- Create indexes for new goal columns
CREATE INDEX IF NOT EXISTS idx_memory_goal_id ON memory(goal_id);
CREATE INDEX IF NOT EXISTS idx_memory_goal_status ON memory(goal_status);
CREATE INDEX IF NOT EXISTS idx_memory_type_extended ON memory(type) WHERE type IN ('goal_progress', 'session_summary', 'session_decision');

-- Update documentation
COMMENT ON TABLE memory IS 'Stores persistent memory summaries, logs, patterns, corrections, goals, goal progress, session summaries, and session decisions';
COMMENT ON COLUMN memory.goal_id IS 'Optional reference to goal for goal_progress and goal types';
COMMENT ON COLUMN memory.goal_summary IS 'Summary of goal content for goal-related entries';
COMMENT ON COLUMN memory.goal_status IS 'Status of goal for goal_progress entries';

-- Create a view for easy goal tracking
CREATE OR REPLACE VIEW goal_tracking AS
SELECT 
    id,
    agent_id,
    user_id,
    goal_id,
    goal_summary,
    goal_status,
    summary,
    created_at,
    last_accessed,
    relevance_score
FROM memory 
WHERE type IN ('goal', 'goal_progress')
ORDER BY created_at DESC;

COMMENT ON VIEW goal_tracking IS 'Simplified view for tracking goals and their progress across sessions';