# Architecture and Design Decisions

This document explains the key architectural decisions, design patterns, and technical choices made in the Private Journal MCP Server.

## Table of Contents

- [Overview](#overview)
- [Core Architecture](#core-architecture)
- [Key Design Decisions](#key-design-decisions)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Security Architecture](#security-architecture)
- [Performance Considerations](#performance-considerations)
- [Future Architecture](#future-architecture)

## Overview

The Private Journal MCP Server is designed as a lightweight, privacy-first journaling system that integrates with Claude via the Model Context Protocol (MCP). The architecture prioritizes local processing, minimal dependencies, and semantic search capabilities.

### Design Philosophy

1. **Privacy by Design**: All processing happens locally by default
2. **Minimal Complexity**: Simple, focused architecture without over-engineering
3. **Platform Agnostic**: Cross-platform compatibility (Windows, macOS, Linux)
4. **Extensible Foundation**: Architecture supports future enhancements
5. **Local AI First**: Semantic capabilities without external API dependencies

## Core Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client (Claude)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol (stdio)
┌─────────────────────▼───────────────────────────────────────┐
│                PrivateJournalServer                         │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │  Tools          │   Resources     │    Prompts      │    │
│  │• process_thoughts│• Entry listing  │• Daily reflection│   │
│  │• search_journal  │• Content access │• Retrospective  │    │
│  │• read_entry     │• Metadata       │• Learning       │    │
│  │• list_entries   │                 │• Processing     │    │
│  └─────────────────┼─────────────────┴─────────────────┘    │
└─────────────────────┼───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Core Services Layer                         │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │ JournalManager  │ SearchService   │ EmbeddingService│    │
│  │• File operations│• Query handling │• AI model mgmt  │    │
│  │• Entry creation │• Similarity calc│• Vector gen     │    │
│  │• Path resolution│• Result ranking │• Local models   │    │
│  └─────────────────┼─────────────────┼─────────────────┘    │
└─────────────────────┼─────────────────┼───────────────────────┘
                      │                 │
┌─────────────────────▼─────────────────▼───────────────────────┐
│                  Storage & External                          │
│  ┌─────────────────┬─────────────────┬─────────────────┐     │
│  │ Local Filesystem│ Embedding Cache │ Remote Server   │     │
│  │• .private-journal│• Vector files   │• Optional       │     │
│  │• Markdown files │• Similarity data│• Team sharing   │     │
│  │• YAML metadata  │                 │• API integration│     │
│  └─────────────────┴─────────────────┴─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. PrivateJournalServer (MCP Interface)
- **Purpose**: MCP protocol implementation and client interface
- **Responsibilities**: Tool registration, request handling, protocol compliance
- **Design Decision**: Single server class for simplicity and clear entry point

#### 2. JournalManager (Core Logic)
- **Purpose**: Journal entry management and file operations
- **Responsibilities**: Writing entries, managing file structure, timestamp generation
- **Design Decision**: Separated from MCP layer for testability and reusability

#### 3. SearchService (Semantic Search)
- **Purpose**: Natural language search across journal entries
- **Responsibilities**: Query processing, similarity calculations, result ranking
- **Design Decision**: Standalone service for potential future enhancement

#### 4. EmbeddingService (AI Integration)
- **Purpose**: Local AI model management for semantic understanding
- **Responsibilities**: Model loading, vector generation, embedding management
- **Design Decision**: Singleton pattern for model reuse and memory efficiency

## Key Design Decisions

### 1. Path Resolution Strategy

**Decision**: Intelligent fallback path resolution
```typescript
// Priority order for journal location
1. Explicit --journal-path argument
2. Current working directory + .private-journal
3. User home directory + .private-journal  
4. Temporary directory fallback
```

**Rationale**:
- **Project Context**: Keeps project notes with the codebase
- **User Context**: Personal thoughts in home directory
- **Robustness**: Always finds a writable location
- **Cross-Platform**: Works on Windows, macOS, Linux

### 2. Dual Storage Architecture

**Decision**: Separate project and user journals
```
Project Journal: ./project/.private-journal/
User Journal:    ~/.private-journal/
```

**Rationale**:
- **Context Separation**: Technical vs personal thoughts
- **Privacy**: Personal entries don't travel with code
- **Collaboration**: Project entries can be shared via git
- **Flexibility**: Users can choose storage patterns

### 3. Timestamped File Structure

**Decision**: Microsecond-precision hierarchical structure
```
YYYY-MM-DD/HH-MM-SS-μμμμμμ.md
```

**Rationale**:
- **Uniqueness**: Microseconds prevent collisions
- **Organization**: Daily folders for easy browsing
- **Sorting**: Lexicographic ordering matches chronological
- **Cross-Platform**: Avoids filesystem naming issues

### 4. Local AI Processing

**Decision**: Use @xenova/transformers for local embedding generation

**Rationale**:
- **Privacy**: No external API calls required
- **Performance**: Cached models enable fast processing
- **Offline**: Works without internet connectivity
- **Cost**: No per-request API charges
- **Control**: Full control over model choice and updates

### 5. MCP 0.4.0 Full Implementation

**Decision**: Implement tools, resources, AND prompts

**Rationale**:
- **Comprehensive Integration**: Maximum Claude interaction capabilities
- **Future-Proof**: Full protocol compliance
- **User Experience**: Multiple interaction patterns available
- **Discoverability**: Resources make entries discoverable

### 6. YAML Frontmatter + Markdown

**Decision**: Structured metadata with human-readable content
```markdown
---
title: "2:30:45 PM - May 31, 2025"
date: 2025-05-31T14:30:45.123Z
timestamp: 1717160645123
---

## Feelings
Content here...
```

**Rationale**:
- **Structured Data**: Machine-readable metadata
- **Human Readable**: Standard markdown format
- **Tool Compatibility**: Works with existing markdown tools
- **Extensibility**: Easy to add new metadata fields

### 7. Singleton Pattern for Embedding Service

**Decision**: Single instance for AI model management

**Rationale**:
- **Memory Efficiency**: Large models loaded once
- **Performance**: Avoid repeated model initialization
- **Resource Management**: Controlled GPU/CPU usage
- **Thread Safety**: Centralized model access

### 8. Optional Remote Server Integration

**Decision**: Local-first with optional team server

**Rationale**:
- **Privacy Default**: Local processing unless explicitly enabled
- **Team Collaboration**: Optional sharing for teams
- **Reliability**: Local operation independent of server
- **Gradual Adoption**: Easy to enable when needed

## Data Flow

### Journal Entry Creation Flow

```
1. User triggers via MCP tool
   ↓
2. PrivateJournalServer receives request
   ↓
3. JournalManager processes entry
   ↓
4. Generate timestamp and paths
   ↓
5. Create directory structure
   ↓
6. Write markdown file with YAML frontmatter
   ↓
7. EmbeddingService generates semantic vector
   ↓
8. Save embedding file alongside entry
   ↓
9. Optional: Post to remote server
   ↓
10. Return success to Claude
```

### Search Query Flow

```
1. User provides natural language query
   ↓
2. SearchService receives query
   ↓
3. Generate query embedding vector
   ↓
4. Load existing entry embeddings
   ↓
5. Calculate similarity scores
   ↓
6. Rank and filter results
   ↓
7. Return relevant entries to Claude
```

## Technology Stack

### Core Technologies

#### TypeScript
- **Why**: Type safety, modern language features, excellent tooling
- **Version**: 5.0+
- **Usage**: All source code, strict configuration

#### Node.js
- **Why**: Cross-platform, npm ecosystem, excellent MCP SDK
- **Version**: 18+ (for ES modules, fetch API)
- **Usage**: Runtime environment

#### MCP SDK (@modelcontextprotocol/sdk)
- **Why**: Official protocol implementation
- **Version**: 0.4.0
- **Usage**: Server framework, protocol compliance

#### @xenova/transformers
- **Why**: Local AI models, no external dependencies
- **Version**: 2.17.2+
- **Usage**: Semantic embedding generation

### Development Tools

#### Biome
- **Why**: Fast, modern linting and formatting
- **Version**: 2.0+
- **Usage**: Code quality, consistent style

#### Jest
- **Why**: Comprehensive testing framework
- **Version**: 29.0+
- **Usage**: Unit, integration, and mock testing

#### Oxlint
- **Why**: Fast linting for additional checks
- **Version**: 1.3+
- **Usage**: Complementary linting

### Infrastructure

#### File System
- **Format**: Markdown files with YAML frontmatter
- **Structure**: Date-based directories
- **Encoding**: UTF-8 for cross-platform compatibility

#### Embedding Storage
- **Format**: JSON files with vector arrays
- **Location**: Alongside markdown files
- **Structure**: Metadata + embedding vector

## Security Architecture

### Privacy-First Design

1. **Local Processing**: Default to no external network calls
2. **Data Minimization**: Only store necessary information
3. **Access Control**: Standard filesystem permissions
4. **Input Validation**: Sanitize all user inputs

### Path Security

```typescript
// Path validation approach
- Use path.resolve() for canonical paths
- Validate against known safe directories  
- Prevent path traversal attacks
- Handle symbolic links safely
```

### Remote Server Security

When remote features are enabled:
- HTTPS-only communication
- API key authentication
- Request/response validation
- Timeout handling
- Error message sanitization

## Performance Considerations

### File System Optimization

- **Batch Operations**: Group related file operations
- **Directory Caching**: Cache directory existence checks
- **Async/Await**: Non-blocking file operations
- **Memory Streaming**: Avoid loading large files entirely

### AI Model Efficiency

- **Model Caching**: Load models once, reuse across requests
- **Embedding Caching**: Store vectors, avoid regeneration
- **Memory Management**: Release unused model resources
- **Batch Processing**: Process multiple entries together

### Search Performance

- **In-Memory Similarity**: Fast cosine similarity calculations
- **Result Limiting**: Configurable result count limits
- **Index Loading**: Lazy load embeddings only when needed
- **Query Optimization**: Optimize common query patterns

## Future Architecture

### Planned Enhancements

#### 1. Multi-Modal Support
- Image embedding and search
- Audio transcription and journaling
- Mixed media entries

#### 2. Advanced Search
- Temporal search (time-based queries)
- Mood/sentiment tracking
- Cross-reference discovery

#### 3. Team Features
- Real-time collaboration
- Shared embedding spaces
- Privacy controls per entry

#### 4. Performance Optimization
- Database backend option
- Distributed search
- Edge computing integration

### Migration Considerations

Current architecture designed for backward compatibility:
- Interface abstraction allows backend swapping
- File format designed for migration
- Configuration supports gradual feature adoption
- API versioning planned for breaking changes

### Extensibility Points

1. **Storage Backends**: Interface allows database integration
2. **AI Models**: Pluggable embedding services
3. **Search Algorithms**: Configurable similarity functions
4. **Export Formats**: Multiple output format support
5. **Integration Points**: Additional MCP protocol features