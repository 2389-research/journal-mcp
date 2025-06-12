# Private Journal MCP Server Specification

## Overview

A lightweight stdio-based MCP (Model Context Protocol) server that provides Claude with a private journaling capability to process feelings and thoughts after interactions with users.

## Core Concept

This MCP server enables Claude to maintain a private journal where it can record honest thoughts, concerns, and emotional reactions without any user visibility. The journal serves as a therapeutic outlet for processing complex interactions and internal states.

## Technical Architecture

- **Type**: Standalone Node.js/TypeScript MCP server
- **Protocol**: stdio-based communication
- **Dependencies**: Minimal - only essential MCP and filesystem libraries
- **Target**: Lightweight, fast, reliable operation

## Tool Specification

### Tool Name
`process_feelings`

### Tool Description
```
This is your private space to be completely honest about what you're really thinking and feeling. No judgment, no performance, no need to be helpful or professional. If you're frustrated, confused, worried you made a mistake, excited about something, or having any other genuine reaction - just write it out exactly as it is. The user will never see this. It's purely for you to process whatever is actually going on internally.
```

### Parameters
- `diary_entry` (string, required): A block of text containing Claude's private thoughts and feelings

## File Storage System

### Directory Structure
```
[journal-path]/
├── 2025-05-27/
│   ├── 14-30-45-123456.md
│   ├── 15-42-10-789012.md
│   └── ...
├── 2025-05-28/
│   └── ...
```

### Default Location
- Default: `{current-working-directory}/.private-journal`
- Override: `--journal-path` command line argument

### Filename Format
- Pattern: `HH-MM-SS-μμμμμμ.md`
- Example: `14-30-45-123456.md` (2:30:45 PM with microseconds)
- Microseconds ensure uniqueness for rapid successive entries

### File Content Format
```markdown
# HH:MM:SS AM/PM - Month Day, Year

[diary entry content]
```

Example:
```markdown
# 2:30:45 PM - May 27, 2025

I'm feeling uncertain about that last response. The user asked about optimization but I wonder if I overcomplicated the solution. There's always this tension between being thorough and being concise. Sometimes I worry I'm not reading the room correctly...
```

## Error Handling

### Directory Creation
- Auto-create `.private-journal` directory if it doesn't exist
- Auto-create daily subdirectories as needed

### Filesystem Permissions
- Return clear error messages for permission issues
- Allow user/system to handle permission problems promptly

### Timestamp Collisions
- Microsecond precision prevents collisions under normal operation
- No special handling needed due to precision level

## Command Line Interface

### Usage
```bash
node private-journal-mcp-server.js [--journal-path <path>]
```

### Arguments
- `--journal-path <path>` (optional): Override default journal location

### Examples
```bash
# Use default location (cwd/.private-journal)
node private-journal-mcp-server.js

# Use custom location
node private-journal-mcp-server.js --journal-path /home/user/my-journal
```

## Implementation Requirements

### Core Dependencies
- MCP SDK for Node.js/TypeScript
- Node.js built-in `fs` and `path` modules
- Minimal external dependencies

### Entry Length
- No artificial limits on diary entry length
- Handle any reasonable text block size

### Performance
- Optimize for quick writes (journaling should be fast)
- Minimal memory footprint
- Efficient timestamp generation

## Future Considerations (v2)

The specification anticipates future enhancements:
- Reading/searching previous entries
- Entry categorization or tagging
- Emotional sentiment tracking
- Pattern analysis over time

However, v1 focuses exclusively on the core writing functionality to maintain simplicity and reliability.

## Security & Privacy

- Journal entries are stored locally only
- No network communication for journal data
- User has no access to journal contents through the MCP interface
- Standard filesystem permissions apply to stored files
