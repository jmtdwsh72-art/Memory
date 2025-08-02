export const API_EXAMPLES = {
  endpoints: {
    agentRequest: {
      method: 'POST',
      url: '/api/agent/:agentId',
      description: 'Send a request to a specific agent',
      parameters: {
        agentId: 'router | research | analysis | chat'
      },
      queryParams: {
        memory: 'true | false (optional) - Include previous context'
      },
      requestBody: {
        input: 'string (required) - User input text',
        context: 'string (optional) - Additional context',
        sessionId: 'string (optional) - UUID for session tracking'
      },
      responseBody: {
        reply: 'string - Agent response',
        agentName: 'string - Name of agent that processed request',
        memoryUsed: 'string[] - Array of memory entry IDs used',
        logsSaved: 'boolean - Whether interaction was logged',
        timestamp: 'string - ISO timestamp',
        sessionId: 'string - Session identifier'
      }
    },
    agentStatus: {
      method: 'GET',
      url: '/api/agent/:agentId/status',
      description: 'Get status of a specific agent',
      responseBody: {
        agentId: 'string - Agent identifier',
        status: 'string - Agent status',
        lastActivity: 'string (optional) - Last activity timestamp',
        timestamp: 'string - Current timestamp'
      }
    },
    agentsList: {
      method: 'GET',
      url: '/api/agents',
      description: 'Get list of available agents',
      responseBody: {
        agents: 'array - List of available agents',
        total: 'number - Total number of agents',
        timestamp: 'string - Current timestamp'
      }
    }
  },

  examples: {
    basicRequest: {
      url: 'POST /api/agent/research',
      body: {
        input: 'Research the latest developments in quantum computing'
      },
      response: {
        reply: 'Research Analysis for: "Research the latest developments in quantum computing"...',
        agentName: 'research',
        memoryUsed: [],
        logsSaved: true,
        timestamp: '2024-01-01T12:00:00.000Z'
      }
    },

    requestWithMemory: {
      url: 'POST /api/agent/research?memory=true',
      body: {
        input: 'What did we learn about quantum computing applications?',
        sessionId: '123e4567-e89b-12d3-a456-426614174000'
      },
      response: {
        reply: 'Based on our previous research on quantum computing...',
        agentName: 'research',
        memoryUsed: ['research_1640995200000_abc123def'],
        logsSaved: true,
        timestamp: '2024-01-01T12:00:00.000Z',
        sessionId: '123e4567-e89b-12d3-a456-426614174000'
      }
    },

    requestWithContext: {
      url: 'POST /api/agent/router',
      body: {
        input: 'How do I implement this pattern?',
        context: 'We are building a Node.js application with TypeScript and need to implement a singleton pattern for database connections.'
      },
      response: {
        reply: 'For implementing a singleton pattern in your Node.js TypeScript application...',
        agentName: 'router',
        memoryUsed: [],
        logsSaved: true,
        timestamp: '2024-01-01T12:00:00.000Z'
      }
    }
  },

  errorResponses: {
    validationError: {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      timestamp: '2024-01-01T12:00:00.000Z',
      details: [
        {
          field: 'input',
          message: 'Input must be a string between 1 and 10,000 characters'
        }
      ]
    },

    invalidAgentId: {
      error: 'Invalid agent ID',
      code: 'INVALID_AGENT_ID',
      timestamp: '2024-01-01T12:00:00.000Z',
      details: [
        {
          field: 'agentId',
          message: 'Invalid agent ID. Allowed agents: router, research, analysis, chat'
        }
      ]
    },

    rateLimitExceeded: {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: '2024-01-01T12:00:00.000Z'
    }
  },

  curlExamples: {
    basicRequest: `curl -X POST http://localhost:3000/api/agent/research \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Research the latest AI developments"}'`,

    requestWithMemory: `curl -X POST "http://localhost:3000/api/agent/research?memory=true" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "What did we learn about AI?", "sessionId": "123e4567-e89b-12d3-a456-426614174000"}'`,

    agentStatus: `curl -X GET http://localhost:3000/api/agent/research/status`,

    agentsList: `curl -X GET http://localhost:3000/api/agents`
  }
};