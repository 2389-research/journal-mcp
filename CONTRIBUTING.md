# Contributing to Private Journal MCP Server

Thank you for your interest in contributing to the Private Journal MCP Server! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style and Standards](#code-style-and-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Architecture Guidelines](#architecture-guidelines)
- [Security Considerations](#security-considerations)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript knowledge
- Familiarity with MCP (Model Context Protocol)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/journal-mcp.git
   cd journal-mcp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Start Development Mode**
   ```bash
   npm run dev
   ```

### Development Commands

From CLAUDE.md, here are the key development commands:

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Development mode with TypeScript watcher
npm run dev

# Check code with Biome (lint + format)
npm run check

# Lint the code
npm run lint

# Format the code
npm run format

# Start the server
npm start

# Run a single test file
npx jest tests/journal.test.ts
```

## Code Style and Standards

### Code Formatting

We use [Biome](https://biomejs.dev/) for code formatting and linting:

- **Indentation**: 2 spaces
- **Line Width**: 100 characters
- **Quote Style**: Single quotes for JavaScript/TypeScript
- **Trailing Commas**: ES5 style

Run formatting before committing:
```bash
npm run format
npm run lint
```

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use meaningful interface names
- Add JSDoc comments for public APIs

### File Structure

- `src/`: Source TypeScript files
- `tests/`: Jest test files
- `docs/`: Documentation files
- `dist/`: Compiled JavaScript (generated)

### Naming Conventions

- **Files**: kebab-case (`journal-manager.ts`)
- **Classes**: PascalCase (`JournalManager`)
- **Functions/Variables**: camelCase (`writeEntry`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_MODEL`)
- **Interfaces**: PascalCase with descriptive names (`JournalEntry`)

## Testing

### Test Structure

We use Jest with comprehensive test coverage:

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **Mock Tests**: Use mocks for external dependencies (transformers, filesystem)

### Writing Tests

1. **Test Files**: Place tests in `tests/` directory
2. **Naming**: Use `.test.ts` suffix
3. **Coverage**: Aim for >90% code coverage on core functionality
4. **Mocking**: Mock external dependencies and filesystem operations

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific test file
npx jest tests/journal.test.ts

# With coverage
npm test -- --coverage
```

### Test Categories

Focus testing on these core areas:
- `src/journal.ts` - File system operations and entry creation
- `src/embeddings.ts` - AI model integration and search
- `src/search.ts` - Semantic search functionality
- `src/paths.ts` - Path resolution logic
- `src/types.ts` - Type definitions

## Submitting Changes

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow code style guidelines
   - Add/update tests
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   npm test
   npm run check
   npm run build
   ```

4. **Commit Messages**
   Use conventional commit format:
   ```
   feat: add new search functionality
   fix: resolve embedding model loading issue
   docs: update contributing guidelines
   test: add integration tests for remote server
   ```

5. **Submit Pull Request**
   - Clear description of changes
   - Reference related issues
   - Include test results
   - Update documentation as needed

### Code Review Checklist

Before submitting:
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No security vulnerabilities introduced
- [ ] Backward compatibility maintained
- [ ] Performance impact considered

## Architecture Guidelines

### Core Principles

1. **Privacy First**: All processing happens locally by default
2. **Minimal Dependencies**: Keep external dependencies to a minimum
3. **Platform Agnostic**: Support cross-platform operation
4. **MCP Compliance**: Follow MCP 0.4.0 specification exactly
5. **Error Resilience**: Graceful degradation and clear error messages

### Key Components

- **JournalManager**: Handles file operations and entry creation
- **EmbeddingService**: Manages AI model for semantic search
- **SearchService**: Provides search functionality across entries
- **PrivateJournalServer**: MCP server implementation
- **RemoteConfig**: Optional team server integration

### Adding New Features

1. **Start with Tests**: Write tests first (TDD approach)
2. **Update Types**: Add TypeScript interfaces
3. **Implement Core Logic**: Focus on business logic
4. **Add MCP Integration**: Expose via tools/resources/prompts
5. **Update Documentation**: Document new capabilities

## Security Considerations

### Privacy Requirements

- **Local First**: Default to local-only operation
- **No Data Leakage**: Ensure personal data stays private
- **Path Sanitization**: Validate all file paths
- **Input Validation**: Sanitize all user inputs

### Security Best Practices

- **Avoid Path Traversal**: Use path.resolve() and validate paths
- **Minimize Attack Surface**: Limit external network calls
- **Safe Defaults**: Default to most secure configuration
- **Error Handling**: Don't expose internal details in error messages

### Remote Server Features

When adding remote server functionality:
- Make it explicitly opt-in
- Use secure transport (HTTPS)
- Validate API responses
- Handle authentication securely
- Provide clear privacy implications

## Documentation

### What to Document

- **New Features**: Add to README.md and appropriate docs
- **API Changes**: Update type definitions and examples
- **Breaking Changes**: Document migration path
- **Configuration**: Update environment variable documentation

### Documentation Style

- Use clear, concise language
- Provide working examples
- Include troubleshooting information
- Reference related concepts

## Getting Help

### Resources

- **Issues**: GitHub issues for bugs and feature requests
- **Discussions**: GitHub discussions for questions
- **MCP Documentation**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **Code Reference**: See CLAUDE.md for development context

### Contact

- **Maintainer**: Jesse Vincent <jesse@fsck.com>
- **GitHub**: [journal-mcp repository](https://github.com/2389-research/journal-mcp)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
