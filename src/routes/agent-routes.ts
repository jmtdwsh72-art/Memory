import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ApiHandler } from '../utils/api-handler';
import { AgentRequest, ApiError } from '../utils/api-types';
import { getAllAgents, getActiveAgents } from '../config/agent-config';
import { memoryEngine } from '../utils/memory-engine';
import { MemoryManager } from '../utils/memory-manager';
import { logAPIError, logMemoryError } from '../utils/error-logger';

const router = Router();
const apiHandler = ApiHandler.getInstance();

const validateAgentId = [
  param('agentId')
    .isString()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Agent ID must be alphanumeric with underscores or hyphens only')
];

const validateAgentRequest = [
  body('input')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Input must be a string between 1 and 10,000 characters'),
  body('context')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Context must be a string with maximum 5,000 characters'),
  body('sessionId')
    .optional()
    .isUUID()
    .withMessage('Session ID must be a valid UUID')
];

const validateMemoryQuery = [
  query('memory')
    .optional()
    .isBoolean()
    .withMessage('Memory parameter must be a boolean')
];

router.post('/agent/:agentId', 
  validateAgentId,
  validateAgentRequest,
  validateMemoryQuery,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const apiError: ApiError = {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
          details: errors.array()
        };
        return res.status(400).json(apiError);
      }

      const { agentId } = req.params;
      const requestData: AgentRequest = {
        input: apiHandler.sanitizeInput(req.body.input),
        context: req.body.context ? apiHandler.sanitizeInput(req.body.context) : undefined,
        sessionId: req.body.sessionId
      };

      const includeMemory = req.query.memory === 'true';

      const agentIdErrors = apiHandler.validateAgentId(agentId);
      if (agentIdErrors.length > 0) {
        const apiError: ApiError = {
          error: 'Invalid agent ID',
          code: 'INVALID_AGENT_ID',
          timestamp: new Date().toISOString(),
          details: agentIdErrors
        };
        return res.status(400).json(apiError);
      }

      const requestErrors = apiHandler.validateAgentRequest(requestData);
      if (requestErrors.length > 0) {
        const apiError: ApiError = {
          error: 'Invalid request data',
          code: 'INVALID_REQUEST_DATA',
          timestamp: new Date().toISOString(),
          details: requestErrors
        };
        return res.status(400).json(apiError);
      }

      const response = await apiHandler.processAgentRequest(agentId, requestData, includeMemory);
      
      res.status(200).json(response);
      return;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Agent request failed');
      
      // Log API error with request context
      await logAPIError(errorObj, {
        agentId: req.params.agentId,
        input: req.body.input,
        sessionId: req.body.sessionId,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      
      console.error('Agent request error:', error);
      
      const apiError: ApiError = {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        details: errorObj.message
      };
      
      res.status(500).json(apiError);
      return;
    }
  }
);

router.get('/agent/:agentId/status',
  validateAgentId,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const apiError: ApiError = {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
          details: errors.array()
        };
        return res.status(400).json(apiError);
      }

      const { agentId } = req.params;
      const status = await apiHandler.getAgentStatus(agentId);
      
      res.status(200).json({
        agentId,
        ...status,
        timestamp: new Date().toISOString()
      });
      return;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Agent status check failed');
      
      // Log API error for status check
      await logAPIError(errorObj, {
        agentId: req.params.agentId,
        operation: 'status_check',
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      
      console.error('Agent status error:', error);
      
      const apiError: ApiError = {
        error: 'Failed to get agent status',
        code: 'STATUS_ERROR',
        timestamp: new Date().toISOString(),
        details: errorObj.message
      };
      
      res.status(500).json(apiError);
      return;
    }
  }
);

router.get('/agents', async (req: Request, res: Response) => {
  try {
    const showAll = req.query.all === 'true';
    const agents = showAll ? getAllAgents() : getActiveAgents();

    const agentList = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      color: agent.color,
      status: agent.status,
      tools: agent.tools,
      keywords: agent.keywords
    }));

    res.status(200).json({
      agents: agentList,
      total: agentList.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Agents list retrieval failed');
    
    // Log API error for agents list
    await logAPIError(errorObj, {
      operation: 'agents_list',
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    
    console.error('Agents list error:', error);
    
    const apiError: ApiError = {
      error: 'Failed to get agents list',
      code: 'AGENTS_LIST_ERROR',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(apiError);
  }
});

router.get('/agents/config', async (_req: Request, res: Response) => {
  try {
    const agents = getAllAgents();

    res.status(200).json({
      agents,
      total: agents.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent config error:', error);
    
    const apiError: ApiError = {
      error: 'Failed to get agent configurations',
      code: 'AGENT_CONFIG_ERROR',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(apiError);
  }
});

router.get('/memory/:agentId', 
  validateAgentId,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const apiError: ApiError = {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
          details: errors.array()
        };
        return res.status(400).json(apiError);
      }

      const { agentId } = req.params;
      const userId = req.query.userId as string | undefined;
      const type = req.query.type as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const minRelevance = req.query.minRelevance ? parseFloat(req.query.minRelevance as string) : 0.1;

      // Get memory stats
      const stats = await memoryEngine.getMemoryStats(agentId, userId);

      // Get recent memories for display
      const memoryContext = await memoryEngine.recallMemory(
        agentId, 
        '', // Empty query to get all memories
        userId,
        {
          limit,
          minRelevance,
          types: type ? [type as any] : undefined,
          includePatterns: true
        }
      );

      res.status(200).json({
        agentId,
        userId,
        stats,
        recentMemories: memoryContext.entries.map(entry => ({
          id: entry.id,
          type: entry.type,
          summary: entry.summary,
          relevanceScore: entry.relevanceScore,
          frequency: entry.frequency,
          lastAccessed: entry.lastAccessed,
          createdAt: entry.createdAt,
          tags: entry.tags
        })),
        patterns: memoryContext.patterns,
        totalMatches: memoryContext.totalMatches,
        averageRelevance: memoryContext.averageRelevance,
        timestamp: new Date().toISOString()
      });
      return;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Memory retrieval failed');
      
      // Log memory error
      await logMemoryError(errorObj, {
        agentId: req.params.agentId,
        userId: req.query.userId as string,
        operation: 'memory_retrieval',
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      
      console.error('Memory retrieval error:', error);
      
      const apiError: ApiError = {
        error: 'Failed to retrieve memory',
        code: 'MEMORY_RETRIEVAL_ERROR',
        timestamp: new Date().toISOString(),
        details: errorObj.message
      };
      
      res.status(500).json(apiError);
      return;
    }
  }
);

router.delete('/memory/:agentId/cleanup',
  validateAgentId,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const apiError: ApiError = {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
          details: errors.array()
        };
        return res.status(400).json(apiError);
      }

      const { agentId } = req.params;
      const maxAge = req.query.maxAge ? parseInt(req.query.maxAge as string) : 90;
      const minRelevance = req.query.minRelevance ? parseFloat(req.query.minRelevance as string) : 0.1;
      const maxEntries = req.query.maxEntries ? parseInt(req.query.maxEntries as string) : 1000;

      const deletedCount = await memoryEngine.cleanupMemory(agentId, {
        maxAge,
        minRelevance,
        maxEntries
      });

      res.status(200).json({
        agentId,
        deletedCount,
        cleanupOptions: {
          maxAge,
          minRelevance,
          maxEntries
        },
        timestamp: new Date().toISOString()
      });
      return;

    } catch (error) {
      console.error('Memory cleanup error:', error);
      
      const apiError: ApiError = {
        error: 'Failed to cleanup memory',
        code: 'MEMORY_CLEANUP_ERROR',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(500).json(apiError);
      return;
    }
  }
);

router.get('/logs', async (req: Request, res: Response) => {
  try {
    const agentName = req.query.agent as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    // Validate limit
    if (limit < 1 || limit > 100) {
      const apiError: ApiError = {
        error: 'Limit must be between 1 and 100',
        code: 'INVALID_LIMIT',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(apiError);
    }

    const memoryManager = new MemoryManager();
    
    const logs = await memoryManager.getRecentLogs(agentName, limit);

    res.status(200).json({
      logs: logs.map(log => ({
        id: log.id,
        agentName: log.agentName,
        input: log.input,
        output: log.output,
        timestamp: log.timestamp,
        memoryUsed: log.memoryUsed || []
      })),
      total: logs.length,
      agent: agentName || 'all',
      limit,
      timestamp: new Date().toISOString()
    });
    return;

  } catch (error) {
    console.error('Logs retrieval error:', error);
    
    const apiError: ApiError = {
      error: 'Failed to retrieve logs',
      code: 'LOGS_RETRIEVAL_ERROR',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(apiError);
    return;
  }
});

router.delete('/memory/:agentId/:memoryId',
  validateAgentId,
  async (req: Request, res: Response) => {
    try {
      const { agentId, memoryId } = req.params;

      // Validate memory ID format
      if (!memoryId || typeof memoryId !== 'string') {
        const apiError: ApiError = {
          error: 'Memory ID is required',
          code: 'INVALID_MEMORY_ID',
          timestamp: new Date().toISOString()
        };
        return res.status(400).json(apiError);
      }

      const success = await memoryEngine.deleteMemory(agentId, memoryId);

      if (!success) {
        const apiError: ApiError = {
          error: 'Memory not found or could not be deleted',
          code: 'MEMORY_NOT_FOUND',
          timestamp: new Date().toISOString()
        };
        return res.status(404).json(apiError);
      }

      res.status(200).json({
        success: true,
        agentId,
        memoryId,
        message: 'Memory deleted successfully',
        timestamp: new Date().toISOString()
      });
      return;

    } catch (error) {
      console.error('Memory deletion error:', error);
      
      const apiError: ApiError = {
        error: 'Failed to delete memory',
        code: 'MEMORY_DELETION_ERROR',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(500).json(apiError);
      return;
    }
  }
);

export { router as agentRoutes };