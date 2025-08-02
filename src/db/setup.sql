-- Memory AI Assistant Database Schema
-- Run this in your Supabase SQL Editor

-- Logs table for storing agent interactions
CREATE TABLE IF NOT EXISTS logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_name TEXT NOT NULL,
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    memory_used TEXT[] DEFAULT NULL
);

-- Enhanced Memory table for long-term persistent storage
CREATE TABLE IF NOT EXISTS memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id TEXT NOT NULL,
    user_id TEXT DEFAULT NULL,
    type TEXT NOT NULL CHECK (type IN ('log', 'summary', 'pattern', 'correction')),
    input TEXT NOT NULL,
    summary TEXT NOT NULL,
    context TEXT DEFAULT NULL,
    relevance_score DECIMAL(4,3) DEFAULT 1.0,
    frequency INTEGER DEFAULT 1,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tags TEXT[] DEFAULT NULL
);

-- User table for preferences and usage tracking
CREATE TABLE IF NOT EXISTS user (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tone_preference TEXT DEFAULT NULL,
    agent_usage JSONB DEFAULT NULL,
    feedback TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_logs_agent_timestamp ON logs(agent_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);

-- Enhanced memory indexes for long-term memory system
CREATE INDEX IF NOT EXISTS idx_memory_agent_id ON memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_agent_user ON memory(agent_id, user_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory(type);
CREATE INDEX IF NOT EXISTS idx_memory_relevance ON memory(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memory_frequency ON memory(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_memory_last_accessed ON memory(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_tags ON memory USING GIN(tags);

-- Text search indexes for better semantic matching
CREATE INDEX IF NOT EXISTS idx_memory_input_text ON memory USING GIN(to_tsvector('english', input));
CREATE INDEX IF NOT EXISTS idx_memory_summary_text ON memory USING GIN(to_tsvector('english', summary));

CREATE INDEX IF NOT EXISTS idx_user_created_at ON user(created_at DESC);

-- RLS (Row Level Security) policies - Enable if needed
-- ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user ENABLE ROW LEVEL SECURITY;

-- Example policy (uncomment and modify as needed):
-- CREATE POLICY "Enable all operations for authenticated users" ON logs
--     FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE logs IS 'Stores all agent input/output interactions';
COMMENT ON TABLE memory IS 'Stores persistent memory summaries and logs';
COMMENT ON TABLE user IS 'Stores user preferences and usage analytics';