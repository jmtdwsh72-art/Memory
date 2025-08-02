# Memory AI Assistant API Documentation

Production-ready API endpoints for the multi-agent memory-enhanced AI assistant.

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### POST /api/agent/:agentId
Send a request to a specific agent and receive a response.

**Parameters:**
- `agentId` (path): Agent identifier (`router`, `research`, `analysis`, `chat`)
- `memory` (query, optional): Include previous context (`true`/`false`)

**Request Body:**
```json
{
  "input": "string (required, 1-10000 chars)",
  "context": "string (optional, max 5000 chars)",
  "sessionId": "string (optional, UUID)"
}
```

**Response:**
```json
{
  "reply": "Agent response message",
  "agentName": "research",
  "memoryUsed": ["memory_id_1", "memory_id_2"],
  "logsSaved": true,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "sessionId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### GET /api/agent/:agentId/status
Get the current status of an agent.

**Response:**
```json
{
  "agentId": "research",
  "status": "active",
  "lastActivity": "2024-01-01T11:45:00.000Z",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### GET /api/agents
Get list of available agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "router",
      "name": "Router Agent",
      "description": "Main routing agent that delegates to specialized sub-agents",
      "status": "active"
    }
  ],
  "total": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Example Requests

### Basic Research Request
```bash
curl -X POST http://localhost:3000/api/agent/research \
  -H "Content-Type: application/json" \
  -d '{"input": "Research quantum computing applications"}'
```

### Request with Memory Context
```bash
curl -X POST "http://localhost:3000/api/agent/research?memory=true" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "What did we learn about quantum applications?",
    "sessionId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Request with Additional Context
```bash
curl -X POST http://localhost:3000/api/agent/router \
  -H "Content-Type: application/json" \
  -d '{
    "input": "How do I implement this pattern?",
    "context": "Building a Node.js app with TypeScript, need singleton pattern for DB connections"
  }'
```

## Error Responses

All errors follow this format:
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "details": "Additional error information"
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400): Invalid request parameters
- `INVALID_AGENT_ID` (400): Unknown or invalid agent ID
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Sanitization**: XSS and injection protection
- **CORS**: Configurable origin restrictions
- **Helmet**: Security headers enabled
- **Validation**: Comprehensive input validation

## Memory Integration

The API integrates with the Supabase memory system:
- **Logs Storage**: All interactions stored with timestamps
- **Memory Recall**: Previous context retrieved when `memory=true`
- **Fallback**: File-based storage when Supabase unavailable
- **Context Building**: Automatic memory context enrichment

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Start API Server:**
   ```bash
   npm run dev:server
   ```

4. **Test Health Endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```

The API is now ready to process agent requests with full memory integration and Supabase logging.