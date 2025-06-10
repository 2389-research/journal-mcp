# Private Journal MCP Server

A comprehensive MCP (Model Context Protocol) server that provides Claude with private journaling and semantic search capabilities for processing thoughts, feelings, and insights.

## Features

### Journaling
- **Multi-section journaling**: Separate categories for feelings, project notes, user context, technical insights, and world knowledge
- **Dual storage**: Project notes stay with projects, personal thoughts in user home directory
- **Timestamped entries**: Each entry automatically dated with microsecond precision
- **YAML frontmatter**: Structured metadata for each entry

### Search & Discovery
- **Semantic search**: Natural language queries using local AI embeddings
- **Vector similarity**: Find conceptually related entries, not just keyword matches
- **Local AI processing**: Uses @xenova/transformers - no external API calls required
- **Automatic indexing**: Embeddings generated for all entries on startup and ongoing

### Privacy & Performance
- **Completely private**: All processing happens locally, no data leaves your machine
- **Fast operation**: Optimized file structure and in-memory similarity calculations
- **Robust fallbacks**: Intelligent path resolution across platforms

## Installation

```bash
npm install -g private-journal-mcp
```

Or install locally:

```bash
npm install private-journal-mcp
```

## Usage

### Basic Usage
```bash
private-journal-mcp
```

This creates journal entries in `.private-journal/` in the current working directory.

### Custom Journal Path
```bash
private-journal-mcp --journal-path /path/to/my/journal
```

### Embedding Model Configuration

You can customize the AI model used for generating semantic embeddings:

```bash
export JOURNAL_EMBEDDING_MODEL="Xenova/all-distilroberta-v1"
```

**Available Models:**
- `Xenova/all-MiniLM-L6-v2` (default) - Fast, 384 dimensions, good general performance
- `Xenova/all-distilroberta-v1` - Larger, 768 dimensions, better accuracy
- `Xenova/paraphrase-MiniLM-L6-v2` - Optimized for paraphrase detection
- `Xenova/all-mpnet-base-v2` - High quality, 768 dimensions, slower but more accurate

The embedding model affects:
- **Local search quality** - More sophisticated models provide better semantic understanding
- **Vector dimensions** - Impacts remote server storage and search capabilities
- **Processing speed** - Larger models are slower but more accurate
- **Memory usage** - Bigger models require more RAM

### Remote Server Integration

To enable optional remote posting of journal entries to a team server, set these environment variables:

```bash
export REMOTE_JOURNAL_SERVER_URL="https://api.yourteam.com"
export REMOTE_JOURNAL_TEAMID="your-team-id"
export REMOTE_JOURNAL_APIKEY="your-api-key"
```

When configured, journal entries will be posted to your remote server in addition to being saved locally. Local journaling always takes priority - if the remote posting fails, the local entry is still saved.

#### Remote Payload Format

The server sends JSON payloads with this structure:

**For simple entries:**
```json
{
  "team_id": "your-team-id",
  "timestamp": 1717160645123,
  "content": "Journal entry text",
  "embedding": [0.1, 0.2, 0.3, 0.4, 0.5, "..."]
}
```

**For structured thoughts:**
```json
{
  "team_id": "your-team-id", 
  "timestamp": 1717160645123,
  "sections": {
    "feelings": "I feel great about this feature",
    "project_notes": "Architecture is solid",
    "technical_insights": "TypeScript provides great type safety",
    "user_context": "Harper prefers concise responses",
    "world_knowledge": "Semantic search is powerful"
  },
  "embedding": [0.1, 0.2, 0.3, 0.4, 0.5, "..."]
}
```

#### Embedding Vectors

Each journal entry includes a semantic embedding vector generated using local AI models (@xenova/transformers). These vectors enable:
- **Semantic search** on the remote server
- **Similarity matching** across team entries  
- **Content clustering** and analysis
- **AI-powered insights** without exposing raw content

The embedding is a numeric array representing the semantic meaning of the journal entry content. Vector dimensions depend on the model used (typically 384 or 512 dimensions).

The remote server should expect POST requests to `/journal/entries` with `x-api-key` and `x-team-id` headers.

### MCP Configuration

#### Claude Code (One-liner)
```bash
claude mcp add-json private-journal '{"type":"stdio","command":"npx","args":["github:obra/private-journal-mcp"]}' -s user
```

#### Manual Configuration
Add to your MCP settings (e.g., Claude Desktop configuration):

```json
{
  "mcpServers": {
    "private-journal": {
      "command": "npx",
      "args": ["github:obra/private-journal-mcp"]
    }
  }
}
```

The server will automatically find a suitable location for the journal files.

## MCP Tools

The server provides comprehensive journaling and search capabilities:

### `process_thoughts`
Multi-section private journaling with these optional categories:
- **feelings**: Private emotional processing space
- **project_notes**: Technical insights specific to current project  
- **user_context**: Notes about collaborating with humans
- **technical_insights**: General software engineering learnings
- **world_knowledge**: Domain knowledge and interesting discoveries

### `search_journal`
Semantic search across all journal entries:
- **query** (required): Natural language search query
- **limit**: Maximum results (default: 10)
- **type**: Search scope - 'project', 'user', or 'both' (default: 'both')
- **sections**: Filter by specific categories

### `read_journal_entry`
Read full content of specific entries:
- **path** (required): File path from search results

### `list_recent_entries`
Browse recent entries chronologically:
- **limit**: Maximum entries (default: 10)
- **type**: Entry scope - 'project', 'user', or 'both' (default: 'both')
- **days**: Days back to search (default: 30)

## File Structure

### Project Journal (per project)
```
.private-journal/
├── 2025-05-31/
│   ├── 14-30-45-123456.md          # Project notes entry
│   ├── 14-30-45-123456.embedding   # Search index
│   └── ...
```

### User Journal (global)
```
~/.private-journal/
├── 2025-05-31/
│   ├── 14-32-15-789012.md          # Personal thoughts entry
│   ├── 14-32-15-789012.embedding   # Search index
│   └── ...
```

### Entry Format
Each markdown file contains YAML frontmatter and structured sections:

```markdown
---
title: "2:30:45 PM - May 31, 2025"
date: 2025-05-31T14:30:45.123Z
timestamp: 1717160645123
---

## Feelings

I'm excited about this new search feature...

## Technical Insights

Vector embeddings provide semantic understanding...
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

### Improving Claude's Performance

To help Claude learn and improve over time, consider adding journal usage guidance to your `~/.claude/CLAUDE.md` file:

```markdown
## Learning and Memory Management

- YOU MUST use the journal tool frequently to capture technical insights, failed approaches, and user preferences
- Before starting complex tasks, search the journal for relevant past experiences and lessons learned
- Document architectural decisions and their outcomes for future reference
- Track patterns in user feedback to improve collaboration over time
- When you notice something that should be fixed but is unrelated to your current task, document it in your journal rather than fixing it immediately
```

This enables Claude to build persistent memory across conversations, leading to better engineering decisions and collaboration patterns.

## Author

Jesse Vincent <jesse@fsck.com>

Read more about the motivation and design in the [blog post](https://blog.fsck.com/2025/05/28/dear-diary-the-user-asked-me-if-im-alive/).

## License

MIT