# Journal Backend API Specification

## Overview

This document specifies the REST API for the journal backend server that receives and manages journal entries from MCP clients. The server provides secure storage, search, and retrieval capabilities for private journal data with semantic search support.

## Base URL

```
https://api.yourcompany.com/v1/journal
```

## Authentication

All requests require API key authentication via headers:

- `x-api-key`: Server API key for authentication
- `x-team-id`: Team identifier for data isolation

### Environment Variables (Client)

- `REMOTE_JOURNAL_SERVER_URL`: Backend server base URL
- `REMOTE_JOURNAL_TEAMID`: Team identifier
- `REMOTE_JOURNAL_APIKEY`: API authentication key

## Data Models

### Journal Entry Payload

```typescript
interface JournalEntryPayload {
  team_id: string; // Team identifier for data isolation
  timestamp: number; // Unix timestamp in milliseconds

  // Either structured sections OR simple content
  sections?: {
    feelings?: string; // Personal emotional content
    project_notes?: string; // Project-specific technical notes
    technical_insights?: string; // General technical learnings
    user_context?: string; // User interaction observations
    world_knowledge?: string; // General domain knowledge
  };
  content?: string; // Simple text content (alternative to sections)

  // AI-generated semantic embedding vector
  embedding?: number[]; // Semantic embedding (384 or 768 dimensions)
}
```

### Entry Response

```typescript
interface JournalEntryResponse {
  id: string; // Server-generated entry ID
  team_id: string;
  timestamp: number;
  created_at: string; // ISO 8601 timestamp
  sections?: object;
  content?: string;
  embedding_model?: string; // Model used for embedding generation
  embedding_dimensions?: number; // Vector dimensions
}
```

### Search Request

```typescript
interface SearchRequest {
  query: string; // Natural language search query
  limit?: number; // Max results (default: 10, max: 100)
  offset?: number; // Pagination offset (default: 0)
  date_from?: string; // ISO 8601 date filter
  date_to?: string; // ISO 8601 date filter
  sections?: string[]; // Filter by section types
  similarity_threshold?: number; // Minimum similarity score (0.0-1.0)
}
```

### Search Response

```typescript
interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  query_embedding?: number[]; // Generated query embedding
}

interface SearchResult {
  id: string;
  team_id: string;
  similarity_score: number; // Cosine similarity (0.0-1.0)
  timestamp: number;
  created_at: string;
  sections?: object;
  content?: string;
  matched_sections?: string[]; // Which sections matched
}
```

## API Endpoints

### POST /journal/entries

Create a new journal entry.

**Headers:**

- `Content-Type: application/json`
- `x-api-key: {api_key}`
- `x-team-id: {team_id}`

**Request Body:**

```json
{
  "team_id": "team-abc123",
  "timestamp": 1717160645123,
  "sections": {
    "feelings": "Feeling frustrated with TypeScript today",
    "project_notes": "Working on the journal MCP server",
    "technical_insights": "Learned about semantic search with transformers"
  },
  "embedding": [0.1, 0.2, 0.3, 0.4, 0.5, "..."]
}
```

**Response:** `201 Created`

```json
{
  "id": "entry_xyz789",
  "team_id": "team-abc123",
  "timestamp": 1717160645123,
  "created_at": "2024-05-31T14:30:45.123Z",
  "sections": {
    "feelings": "Feeling frustrated with TypeScript today",
    "project_notes": "Working on the journal MCP server",
    "technical_insights": "Learned about semantic search with transformers"
  },
  "embedding_model": "Xenova/all-MiniLM-L6-v2",
  "embedding_dimensions": 384
}
```

**Error Responses:**

- `400 Bad Request`: Invalid payload structure
- `401 Unauthorized`: Missing or invalid API key
- `403 Forbidden`: Invalid team ID
- `413 Payload Too Large`: Entry exceeds size limit
- `429 Too Many Requests`: Rate limit exceeded

### GET /journal/entries

Retrieve journal entries with optional filtering.

**Headers:**

- `x-api-key: {api_key}`
- `x-team-id: {team_id}`

**Query Parameters:**

- `limit` (optional): Number of entries (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `date_from` (optional): ISO 8601 date filter
- `date_to` (optional): ISO 8601 date filter
- `order` (optional): `desc` or `asc` by timestamp (default: `desc`)

**Response:** `200 OK`

```json
{
  "entries": [
    {
      "id": "entry_xyz789",
      "team_id": "team-abc123",
      "timestamp": 1717160645123,
      "created_at": "2024-05-31T14:30:45.123Z",
      "sections": {
        "feelings": "Feeling frustrated with TypeScript today"
      }
    }
  ],
  "total_count": 42,
  "has_more": true
}
```

### GET /journal/entries/{entry_id}

Retrieve a specific journal entry.

**Headers:**

- `x-api-key: {api_key}`
- `x-team-id: {team_id}`

**Response:** `200 OK`

```json
{
  "id": "entry_xyz789",
  "team_id": "team-abc123",
  "timestamp": 1717160645123,
  "created_at": "2024-05-31T14:30:45.123Z",
  "sections": {
    "feelings": "Feeling frustrated with TypeScript today",
    "project_notes": "Working on the journal MCP server"
  },
  "embedding_model": "Xenova/all-MiniLM-L6-v2",
  "embedding_dimensions": 384
}
```

**Error Responses:**

- `404 Not Found`: Entry does not exist or not accessible

### POST /journal/search

Perform semantic search across journal entries.

**Headers:**

- `Content-Type: application/json`
- `x-api-key: {api_key}`
- `x-team-id: {team_id}`

**Request Body:**

```json
{
  "query": "times I felt frustrated with TypeScript",
  "limit": 10,
  "date_from": "2024-01-01T00:00:00Z",
  "sections": ["feelings", "technical_insights"],
  "similarity_threshold": 0.7
}
```

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "entry_xyz789",
      "team_id": "team-abc123",
      "similarity_score": 0.87,
      "timestamp": 1717160645123,
      "created_at": "2024-05-31T14:30:45.123Z",
      "sections": {
        "feelings": "Feeling frustrated with TypeScript today"
      },
      "matched_sections": ["feelings"]
    }
  ],
  "total_count": 3,
  "query_embedding": [0.2, 0.1, 0.4, "..."]
}
```

### DELETE /journal/entries/{entry_id}

Delete a specific journal entry.

**Headers:**

- `x-api-key: {api_key}`
- `x-team-id: {team_id}`

**Response:** `204 No Content`

**Error Responses:**

- `404 Not Found`: Entry does not exist or not accessible
- `403 Forbidden`: Insufficient permissions

## Team Management

### GET /teams/{team_id}/stats

Get team journal statistics.

**Headers:**

- `x-api-key: {api_key}`
- `x-team-id: {team_id}`

**Response:** `200 OK`

```json
{
  "team_id": "team-abc123",
  "total_entries": 156,
  "date_range": {
    "first_entry": "2024-01-15T09:00:00Z",
    "last_entry": "2024-05-31T14:30:45Z"
  },
  "section_counts": {
    "feelings": 89,
    "project_notes": 134,
    "technical_insights": 78,
    "user_context": 45,
    "world_knowledge": 23
  },
  "embedding_model": "Xenova/all-MiniLM-L6-v2"
}
```

## Rate Limiting

- **Journal Entry Creation**: 100 requests per hour per team
- **Search Requests**: 1000 requests per hour per team
- **Retrieval Requests**: 2000 requests per hour per team

Rate limit headers included in responses:

- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when window resets

## Data Privacy & Security

### Encryption

- All data encrypted at rest using AES-256
- TLS 1.3 required for all API communications
- Embedding vectors stored with same encryption as content

### Data Isolation

- Complete data isolation between teams via `team_id`
- API keys scoped to specific teams
- No cross-team data access possible

### Data Retention

- Journal entries retained indefinitely unless explicitly deleted
- Deleted entries permanently removed (no soft deletes)
- Embedding vectors deleted with associated content

## Error Format

All error responses follow this format:

```json
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "The request payload is malformed",
    "details": {
      "field": "timestamp",
      "issue": "must be a valid Unix timestamp"
    }
  },
  "request_id": "req_abc123"
}
```

## Webhook Support (Optional)

### POST /journal/webhooks

Configure webhooks for journal events.

**Request Body:**

```json
{
  "url": "https://your-app.com/journal-webhook",
  "events": ["entry.created", "entry.deleted"],
  "secret": "webhook-signing-secret"
}
```

### Webhook Payload

```json
{
  "event": "entry.created",
  "timestamp": 1717160645123,
  "team_id": "team-abc123",
  "data": {
    "entry_id": "entry_xyz789",
    "created_at": "2024-05-31T14:30:45.123Z"
  }
}
```

## Implementation Notes

### Embedding Storage

- Store embedding vectors in optimized vector database (e.g., Pinecone, Weaviate, pgvector)
- Support multiple embedding models per team
- Maintain embedding model versioning for consistency

### Search Performance

- Pre-compute embedding similarities for common queries
- Implement caching for frequently accessed entries
- Use approximate nearest neighbor search for large datasets

### Scaling Considerations

- Implement database sharding by team_id
- Use CDN for static API documentation
- Consider read replicas for search workloads

### Monitoring

- Track embedding generation performance
- Monitor search query patterns and performance
- Alert on unusual API usage patterns
