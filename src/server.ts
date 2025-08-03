import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { agentRoutes } from './routes/agent-routes';
import { ttsRoutes } from './routes/tts-routes';
import { transcribeRoutes } from './routes/transcribe-routes';
import { errorRoutes } from './routes/error-routes';
import { errorHandler } from './middleware/error-handler';
import SupabaseConnection from './db/supabase';

config();

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', agentRoutes);
app.use('/api', ttsRoutes);
app.use('/api', transcribeRoutes);
app.use('/api/errors', errorRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    const supabaseConnection = SupabaseConnection.getInstance();
    const isConnected = await supabaseConnection.testConnection();
    
    if (isConnected) {
      console.log('✅ Supabase connection established');
    } else {
      console.log('⚠️  Supabase connection failed - using file-based storage');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Memory AI Assistant API running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`🤖 Agent API: http://localhost:${PORT}/api/agent/:agentId`);
      console.log(`🔊 TTS API: http://localhost:${PORT}/api/tts`);
      console.log(`🎤 Transcribe API: http://localhost:${PORT}/api/transcribe`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;