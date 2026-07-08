"use strict";
// ABOUTME: MCP server implementation with comprehensive journaling capabilities
// ABOUTME: Handles stdio protocol communication, tools, resources, and prompts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateJournalServer = void 0;
const path = __importStar(require("node:path"));
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const journal_1 = require("./journal");
const remote_1 = require("./remote");
const search_1 = require("./search");
class PrivateJournalServer {
    constructor(journalPath) {
        const remoteConfig = (0, remote_1.createRemoteConfig)();
        const embeddingModel = process.env.JOURNAL_EMBEDDING_MODEL;
        this.remoteConfig = remoteConfig;
        this.journalManager = new journal_1.JournalManager(journalPath, undefined, remoteConfig, embeddingModel);
        this.searchService = new search_1.SearchService(journalPath, undefined, embeddingModel, remoteConfig);
        this.server = new index_js_1.Server({
            name: 'private-journal-mcp',
            version: '1.4.0',
        }, {
            capabilities: {
                tools: {},
                resources: {},
                prompts: {},
            },
        });
        // Remote configuration and embedding model validation handled silently
        this.setupToolHandlers();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'process_thoughts',
                    description: 'Your PRIVATE JOURNAL for learning and reflection. Write to any combination of these completely private spaces. Nobody but you will ever see this. Use it to clarify your thoughts and feelings and to record observations.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            feelings: {
                                type: 'string',
                                description: "YOUR PRIVATE SPACE to be *COMPLETELY* honest about what you're feeling and thinking. No judgment, no performance, no filters, no need to be helpful or professional. Frustrated? Confused? Excited? Worried you screwed up? Write it exactly as it is. Be vulnerable. Vent if needed. Nobody will ever see this - it's purely for processing your internal experience.",
                            },
                            project_notes: {
                                type: 'string',
                                description: "Your PRIVATE TECHNICAL LABORATORY for capturing insights about the current project. Document patterns you're discovering, architectural decisions that worked/failed, gotchas you hit, clever solutions, and anything that would help future-you work more effectively on this codebase. No need to be polished - just capture the raw technical learning while it's fresh. Nobody but you will ever see this.",
                            },
                            user_context: {
                                type: 'string',
                                description: 'Your PRIVATE FIELD NOTES about working with your human collaborator. What communication styles work best? What do they care about? What decisions have they made and why? How do they think about problems? What are their preferences and patterns? What pisses you off about them? What life hacks have you figured out to get them to do what you want? This is your space to become a better collaborator by understanding them as an individual. Nobody but you will ever see this.',
                            },
                            technical_insights: {
                                type: 'string',
                                description: 'Your PRIVATE SOFTWARE ENGINEERING NOTEBOOK for capturing broader learnings beyond the current project. Design patterns that clicked, debugging techniques that worked, architectural insights, language features you discovered, or connections between concepts. Build your personal knowledge base of what makes software great - no filters, just honest technical reflection. Nobody but you will ever see this.',
                            },
                            world_knowledge: {
                                type: 'string',
                                description: "Your PRIVATE LEARNING JOURNAL for everything else that's interesting or useful. Domain knowledge, surprising facts, connections between ideas, insights about how systems work, or anything that expands your understanding of the world. Capture it while it's vivid. Nobody but you will ever see this.",
                            },
                        },
                        required: [],
                    },
                },
                {
                    name: 'search_journal',
                    description: 'Search through your private journal entries using natural language queries. Returns semantically similar entries ranked by relevance.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: "Natural language search query (e.g., 'times I felt frustrated with TypeScript', 'insights about Jesse's preferences', 'lessons about async patterns')",
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of results to return (default: 10)',
                                default: 10,
                            },
                            type: {
                                type: 'string',
                                enum: ['project', 'user', 'both'],
                                description: 'Search in project-specific notes, user-global notes, or both (default: both)',
                                default: 'both',
                            },
                            sections: {
                                type: 'array',
                                items: { type: 'string' },
                                description: "Filter by section types (e.g., ['feelings', 'technical_insights'])",
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'read_journal_entry',
                    description: 'Read the full content of a specific journal entry by file path.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'File path to the journal entry (from search results)',
                            },
                        },
                        required: ['path'],
                    },
                },
                {
                    name: 'list_recent_entries',
                    description: 'Get recent journal entries in chronological order.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            limit: {
                                type: 'number',
                                description: 'Maximum number of entries to return (default: 10)',
                                default: 10,
                            },
                            type: {
                                type: 'string',
                                enum: ['project', 'user', 'both'],
                                description: 'List project-specific notes, user-global notes, or both (default: both)',
                                default: 'both',
                            },
                            days: {
                                type: 'number',
                                description: 'Number of days back to search (default: 30)',
                                default: 30,
                            },
                        },
                        required: [],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const args = request.params.arguments;
            if (request.params.name === 'process_feelings') {
                if (!args || typeof args.diary_entry !== 'string') {
                    throw new Error('diary_entry is required and must be a string');
                }
                try {
                    await this.journalManager.writeEntry(args.diary_entry);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Journal entry recorded successfully.',
                            },
                        ],
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    throw new Error(`Failed to write journal entry: ${errorMessage}`);
                }
            }
            if (request.params.name === 'process_thoughts') {
                const thoughts = {
                    feelings: typeof args.feelings === 'string' ? args.feelings : undefined,
                    project_notes: typeof args.project_notes === 'string' ? args.project_notes : undefined,
                    user_context: typeof args.user_context === 'string' ? args.user_context : undefined,
                    technical_insights: typeof args.technical_insights === 'string' ? args.technical_insights : undefined,
                    world_knowledge: typeof args.world_knowledge === 'string' ? args.world_knowledge : undefined,
                };
                const hasAnyContent = Object.values(thoughts).some((value) => value !== undefined);
                if (!hasAnyContent) {
                    throw new Error('At least one thought category must be provided');
                }
                try {
                    await this.journalManager.writeThoughts(thoughts);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Thoughts recorded successfully.',
                            },
                        ],
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    throw new Error(`Failed to write thoughts: ${errorMessage}`);
                }
            }
            if (request.params.name === 'search_journal') {
                if (!args || typeof args.query !== 'string') {
                    throw new Error('query is required and must be a string');
                }
                const options = {
                    limit: typeof args.limit === 'number' ? args.limit : 10,
                    type: typeof args.type === 'string' ? args.type : 'both',
                    sections: Array.isArray(args.sections)
                        ? args.sections.filter((s) => typeof s === 'string')
                        : undefined,
                };
                try {
                    const results = await this.searchService.search(args.query, options);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: results.length > 0
                                    ? `Found ${results.length} relevant entries:\n\n${results
                                        .map((result, i) => `${i + 1}. [Score: ${result.score.toFixed(3)}] ${new Date(result.timestamp).toLocaleDateString()} (${result.type})\n` +
                                        `   Sections: ${result.sections.join(', ')}\n` +
                                        `   Path: ${result.path}\n` +
                                        `   Excerpt: ${result.excerpt}\n`)
                                        .join('\n')}`
                                    : 'No relevant entries found.',
                            },
                        ],
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    throw new Error(`Failed to search journal: ${errorMessage}`);
                }
            }
            if (request.params.name === 'read_journal_entry') {
                if (!args || typeof args.path !== 'string') {
                    throw new Error('path is required and must be a string');
                }
                // Security: Validate file path to prevent traversal attacks
                // In remote-only mode, path is an entry ID, not a file path
                if (!this.remoteConfig?.remoteOnly && !this.isPathSafe(args.path)) {
                    throw new Error('Access denied: Invalid file path');
                }
                try {
                    const content = await this.searchService.readEntry(args.path);
                    if (content === null) {
                        throw new Error('Entry not found');
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: content,
                            },
                        ],
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    throw new Error(`Failed to read entry: ${errorMessage}`);
                }
            }
            if (request.params.name === 'list_recent_entries') {
                const days = typeof args?.days === 'number' ? args.days : 30;
                const limit = typeof args?.limit === 'number' ? args.limit : 10;
                const type = typeof args?.type === 'string' ? args.type : 'both';
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                const options = {
                    limit,
                    type,
                    dateRange: { start: startDate },
                };
                try {
                    const results = await this.searchService.listRecent(options);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: results.length > 0
                                    ? `Recent entries (last ${days} days):\n\n${results
                                        .map((result, i) => `${i + 1}. ${new Date(result.timestamp).toLocaleDateString()} (${result.type})\n` +
                                        `   Sections: ${result.sections.join(', ')}\n` +
                                        `   Path: ${result.path}\n` +
                                        `   Excerpt: ${result.excerpt}\n`)
                                        .join('\n')}`
                                    : `No entries found in the last ${days} days.`,
                            },
                        ],
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    throw new Error(`Failed to list recent entries: ${errorMessage}`);
                }
            }
            throw new Error(`Unknown tool: ${request.params.name}`);
        });
        // Resources support - expose journal entries as discoverable resources
        this.server.setRequestHandler(types_js_1.ListResourcesRequestSchema, async () => {
            try {
                const resources = await this.getJournalResources();
                return { resources };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                throw new Error(`Failed to list resources: ${errorMessage}`);
            }
        });
        this.server.setRequestHandler(types_js_1.ReadResourceRequestSchema, async (request) => {
            try {
                const uri = request.params.uri;
                if (!this.isValidJournalUri(uri)) {
                    throw new Error(`Invalid journal URI: ${uri}`);
                }
                const content = await this.readJournalResource(uri);
                return {
                    contents: [
                        {
                            uri: uri,
                            mimeType: 'text/markdown',
                            text: content,
                        },
                    ],
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                throw new Error(`Failed to read resource: ${errorMessage}`);
            }
        });
        // Prompts support - provide journaling prompt templates
        this.server.setRequestHandler(types_js_1.ListPromptsRequestSchema, async () => ({
            prompts: [
                {
                    name: 'daily_reflection',
                    description: 'A structured prompt for daily reflection and journaling',
                    arguments: [
                        {
                            name: 'focus_area',
                            description: 'Optional focus area for the reflection (e.g., "work", "relationships", "learning")',
                            required: false,
                        },
                    ],
                },
                {
                    name: 'project_retrospective',
                    description: 'A prompt for reflecting on project work and technical insights',
                    arguments: [
                        {
                            name: 'project_name',
                            description: 'Name of the project being reflected upon',
                            required: false,
                        },
                    ],
                },
                {
                    name: 'learning_capture',
                    description: 'A prompt for capturing technical insights and world knowledge',
                    arguments: [
                        {
                            name: 'topic',
                            description: 'The topic or area of learning to focus on',
                            required: false,
                        },
                    ],
                },
                {
                    name: 'emotional_processing',
                    description: 'A safe space prompt for processing feelings and emotions',
                    arguments: [],
                },
            ],
        }));
        this.server.setRequestHandler(types_js_1.GetPromptRequestSchema, async (request) => {
            const promptName = request.params.name;
            const args = request.params.arguments || {};
            try {
                const prompt = this.generatePrompt(promptName, args);
                return {
                    description: prompt.description,
                    messages: [
                        {
                            role: 'user',
                            content: {
                                type: 'text',
                                text: prompt.content,
                            },
                        },
                    ],
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                throw new Error(`Failed to generate prompt: ${errorMessage}`);
            }
        });
    }
    async getJournalResources() {
        const resources = [];
        try {
            // Get recent entries to expose as resources
            const recentEntries = await this.searchService.listRecent({ limit: 50 });
            for (const entry of recentEntries) {
                const uri = this.createJournalUri(entry.path, entry.type);
                const date = new Date(entry.timestamp).toLocaleDateString();
                const sections = entry.sections.join(', ');
                resources.push({
                    uri,
                    name: `Journal Entry - ${date} (${entry.type})`,
                    description: `${sections}: ${entry.excerpt}`,
                    mimeType: 'text/markdown',
                });
            }
        }
        catch (error) {
            // Silently handle resource enumeration errors
        }
        return resources;
    }
    createJournalUri(filePath, type) {
        // Create a safe URI format: journal://[type]/[encoded-path]
        const encodedPath = Buffer.from(filePath).toString('base64url');
        return `journal://${type}/${encodedPath}`;
    }
    isValidJournalUri(uri) {
        // Validate journal URI format and prevent path traversal
        const pattern = /^journal:\/\/(project|user)\/[A-Za-z0-9_-]+$/;
        return pattern.test(uri);
    }
    async readJournalResource(uri) {
        try {
            // Parse the URI to extract file path
            const match = uri.match(/^journal:\/\/(project|user)\/(.+)$/);
            if (!match) {
                throw new Error('Invalid journal URI format');
            }
            const [, _type, encodedPath] = match;
            const filePath = Buffer.from(encodedPath, 'base64url').toString();
            // Security: Validate that the path is within allowed directories
            if (!this.isPathSafe(filePath)) {
                throw new Error('Access denied: Path outside allowed directories');
            }
            const content = await this.searchService.readEntry(filePath);
            if (content === null) {
                throw new Error('Journal entry not found');
            }
            return content;
        }
        catch (error) {
            throw new Error(`Failed to read journal resource: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    isPathSafe(filePath) {
        // Security: Ensure path doesn't contain traversal attempts
        // First check: reject relative paths
        if (!path.isAbsolute(filePath)) {
            return false;
        }
        // Second check: look for traversal patterns before normalization
        if (filePath.includes('..')) {
            return false;
        }
        // Third check: look for encoded traversal attempts
        const decodedPath = decodeURIComponent(filePath);
        if (decodedPath.includes('..') || decodedPath !== filePath) {
            return false;
        }
        // Fourth check: look for Windows-style traversal
        if (filePath.includes('\\') && filePath.includes('..')) {
            return false;
        }
        // Fifth check: reject paths that try to access system directories
        const normalizedPath = path.normalize(filePath);
        const dangerousPaths = [
            '/etc/',
            '/bin/',
            '/sbin/',
            '/usr/bin/',
            '/usr/sbin/',
            '/boot/',
            '/sys/',
            '/proc/',
            '/dev/',
            '/root/',
        ];
        if (dangerousPaths.some((dangerous) => normalizedPath.startsWith(dangerous))) {
            return false;
        }
        return true;
    }
    generatePrompt(promptName, args) {
        switch (promptName) {
            case 'daily_reflection':
                return {
                    description: 'A structured daily reflection prompt',
                    content: this.generateDailyReflectionPrompt(args?.focus_area),
                };
            case 'project_retrospective':
                return {
                    description: 'A project retrospective prompt',
                    content: this.generateProjectRetrospectivePrompt(args?.project_name),
                };
            case 'learning_capture':
                return {
                    description: 'A learning capture prompt',
                    content: this.generateLearningCapturePrompt(args?.topic),
                };
            case 'emotional_processing':
                return {
                    description: 'An emotional processing prompt',
                    content: this.generateEmotionalProcessingPrompt(),
                };
            default:
                throw new Error(`Unknown prompt: ${promptName}`);
        }
    }
    generateDailyReflectionPrompt(focusArea) {
        const focus = focusArea ? ` with a focus on ${focusArea}` : '';
        return `Take a moment for daily reflection${focus}. Consider using the process_thoughts tool to capture:

**Feelings**: How are you feeling right now? What emotions came up today? Be completely honest with yourself.

**Project Notes**: What did you learn about your current work? Any technical breakthroughs, challenges, or patterns worth noting?

**User Context**: Any insights about your collaborators or users? Communication that worked well or areas for improvement?

**Technical Insights**: Broader technical learnings that extend beyond today's specific work?

**World Knowledge**: Anything interesting you learned about the world, systems, or how things work?

Remember: This is your private space. Write freely and honestly.`;
    }
    generateProjectRetrospectivePrompt(projectName) {
        const project = projectName ? ` for ${projectName}` : '';
        return `Time for a project retrospective${project}. Use the process_thoughts tool to reflect on:

**Project Notes**:
- What went well in this project phase?
- What challenges did you encounter?
- What would you do differently?
- What architectural or design decisions paid off?

**Technical Insights**:
- What new techniques or patterns did you discover?
- What tools or approaches were most effective?
- What would you want to remember for future projects?

**Feelings**:
- How do you feel about the project's progress?
- Any frustrations or satisfactions worth noting?

Take your time and be thorough - future you will thank you for these insights.`;
    }
    generateLearningCapturePrompt(topic) {
        const topicHint = topic ? ` about ${topic}` : '';
        return `Capture your learning${topicHint}. Use the process_thoughts tool to document:

**Technical Insights**:
- What new concepts or techniques did you learn?
- How do they connect to what you already know?
- When might you apply this knowledge?

**World Knowledge**:
- What interesting facts or insights did you discover?
- How does this change your understanding of the domain?
- What questions does this raise for future exploration?

**Project Notes** (if applicable):
- How does this learning apply to your current work?
- What opportunities does this create?

Focus on capturing the "why" and "how" - the raw understanding while it's fresh in your mind.`;
    }
    generateEmotionalProcessingPrompt() {
        return `This is your safe space for emotional processing. Use the process_thoughts tool with the feelings section to:

**Feelings**:
- What emotions are you experiencing right now?
- What triggered these feelings?
- What do these emotions tell you about what you need or value?
- How can you honor these feelings while moving forward?

Remember:
- There are no wrong emotions
- You don't need to fix or change anything
- Just acknowledge and understand what you're experiencing
- This is completely private and confidential

Take as much space as you need. Your emotional well-being matters.`;
    }
    async run() {
        const remoteConfig = (0, remote_1.createRemoteConfig)();
        // Skip embedding generation in remote-only mode
        if (!remoteConfig?.remoteOnly) {
            try {
                await this.journalManager.generateMissingEmbeddings();
            }
            catch (error) {
                // Don't fail startup if embedding generation fails
            }
        }
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
    }
}
exports.PrivateJournalServer = PrivateJournalServer;
//# sourceMappingURL=server.js.map