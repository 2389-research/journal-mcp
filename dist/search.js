"use strict";
// ABOUTME: Journal search functionality with vector similarity and text matching
// ABOUTME: Provides unified search across project and user journal entries
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
exports.SearchService = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const embeddings_1 = require("./embeddings");
const paths_1 = require("./paths");
const remote_1 = require("./remote");
class SearchService {
    constructor(projectPath, userPath, embeddingModel, remoteConfig) {
        this.embeddingService = embeddings_1.EmbeddingService.getInstance(embeddingModel);
        this.projectPath = projectPath || (0, paths_1.resolveProjectJournalPath)();
        this.userPath = userPath || (0, paths_1.resolveUserJournalPath)();
        this.remoteConfig = remoteConfig;
    }
    async search(query, options = {}) {
        const { limit = 10, minScore = 0.1, sections, dateRange, type = 'both' } = options || {};
        // Use remote search if in remote-only mode
        if (this.remoteConfig?.remoteOnly) {
            return this.searchRemote(query, options);
        }
        // Generate query embedding
        const queryEmbedding = await this.embeddingService.generateEmbedding(query);
        // Collect all embeddings
        const allEmbeddings = [];
        if (type === 'both' || type === 'project') {
            const projectEmbeddings = await this.loadEmbeddingsFromPath(this.projectPath, 'project');
            allEmbeddings.push(...projectEmbeddings);
        }
        if (type === 'both' || type === 'user') {
            const userEmbeddings = await this.loadEmbeddingsFromPath(this.userPath, 'user');
            allEmbeddings.push(...userEmbeddings);
        }
        // Filter by criteria
        const filtered = allEmbeddings.filter((embedding) => {
            // Filter by sections if specified
            if (sections && sections.length > 0) {
                const hasMatchingSection = sections.some((section) => embedding.sections.some((embeddingSection) => embeddingSection.toLowerCase().includes(section.toLowerCase())));
                if (!hasMatchingSection)
                    return false;
            }
            // Filter by date range
            if (dateRange) {
                const entryDate = new Date(embedding.timestamp);
                if (dateRange.start && entryDate < dateRange.start)
                    return false;
                if (dateRange.end && entryDate > dateRange.end)
                    return false;
            }
            return true;
        });
        // Calculate similarities and sort
        const results = filtered
            .map((embedding) => {
            const score = this.embeddingService.cosineSimilarity(queryEmbedding, embedding.embedding);
            const excerpt = this.generateExcerpt(embedding.text, query);
            return {
                path: embedding.path,
                score,
                text: embedding.text,
                sections: embedding.sections,
                timestamp: embedding.timestamp,
                excerpt,
                type: embedding.type,
            };
        })
            .filter((result) => result.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        return results;
    }
    async listRecent(options = {}) {
        const { limit = 10, type = 'both', dateRange } = options;
        // Use remote listing if in remote-only mode
        if (this.remoteConfig?.remoteOnly) {
            return this.listRecentRemote(options);
        }
        const allEmbeddings = [];
        if (type === 'both' || type === 'project') {
            const projectEmbeddings = await this.loadEmbeddingsFromPath(this.projectPath, 'project');
            allEmbeddings.push(...projectEmbeddings);
        }
        if (type === 'both' || type === 'user') {
            const userEmbeddings = await this.loadEmbeddingsFromPath(this.userPath, 'user');
            allEmbeddings.push(...userEmbeddings);
        }
        // Filter by date range
        const filtered = dateRange
            ? allEmbeddings.filter((embedding) => {
                const entryDate = new Date(embedding.timestamp);
                if (dateRange.start && entryDate < dateRange.start)
                    return false;
                if (dateRange.end && entryDate > dateRange.end)
                    return false;
                return true;
            })
            : allEmbeddings;
        // Sort by timestamp (most recent first) and limit
        const results = filtered
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
            .map((embedding) => ({
            path: embedding.path,
            score: 1, // No similarity score for recent entries
            text: embedding.text,
            sections: embedding.sections,
            timestamp: embedding.timestamp,
            excerpt: this.generateExcerpt(embedding.text, '', 150),
            type: embedding.type,
        }));
        return results;
    }
    async readEntry(filePath) {
        // In remote-only mode, handle differently based on whether it looks like a file path or entry ID
        if (this.remoteConfig?.remoteOnly) {
            // If it looks like a local file path (contains path separators), reject it
            if (filePath.includes('/') || filePath.includes('\\')) {
                throw new Error('Cannot read local files in remote-only mode. Use search to find entry content.');
            }
            // Otherwise, treat it as an entry ID and fetch from remote server
            try {
                const entry = await (0, remote_1.getRemoteEntryById)(this.remoteConfig, filePath);
                if (!entry) {
                    return null;
                }
                // Convert remote entry to text format
                return this.extractTextFromRemoteResult(entry);
            }
            catch (error) {
                throw new Error(`Failed to fetch remote entry: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        try {
            return await fs.readFile(filePath, 'utf8');
        }
        catch (error) {
            if (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    async searchRemote(query, options) {
        if (!this.remoteConfig) {
            throw new Error('Remote configuration not available');
        }
        const { limit = 10, minScore = 0.1, sections, dateRange } = options;
        const searchRequest = {
            query,
            limit,
            similarity_threshold: minScore,
        };
        if (sections && sections.length > 0) {
            searchRequest.sections = sections;
        }
        if (dateRange) {
            if (dateRange.start) {
                searchRequest.date_from = dateRange.start.toISOString();
            }
            if (dateRange.end) {
                searchRequest.date_to = dateRange.end.toISOString();
            }
        }
        try {
            const response = await (0, remote_1.searchRemoteServer)(this.remoteConfig, searchRequest);
            if (!response.results || !Array.isArray(response.results)) {
                return [];
            }
            return response.results.map((result) => ({
                path: result.id, // Use remote ID as path
                score: result.similarity_score,
                text: this.extractTextFromRemoteResult(result),
                sections: result.matched_sections || [],
                timestamp: result.timestamp,
                excerpt: this.generateExcerpt(this.extractTextFromRemoteResult(result), query),
                type: 'project', // Remote entries don't distinguish project/user
            }));
        }
        catch (error) {
            throw new Error(`Remote search failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listRecentRemote(options) {
        if (!this.remoteConfig) {
            throw new Error('Remote configuration not available');
        }
        const { limit = 10 } = options;
        try {
            const response = await (0, remote_1.getRemoteEntries)(this.remoteConfig, limit);
            if (!response.entries || !Array.isArray(response.entries)) {
                return [];
            }
            return response.entries.map((entry) => ({
                path: entry.id, // Use remote ID as path
                score: 1, // No similarity score for listing
                text: this.extractTextFromRemoteResult(entry),
                sections: this.extractSectionsFromRemoteResult(entry),
                timestamp: entry.timestamp,
                excerpt: this.generateExcerpt(this.extractTextFromRemoteResult(entry), '', 150),
                type: 'project', // Remote entries don't distinguish project/user
            }));
        }
        catch (error) {
            throw new Error(`Remote listing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    extractTextFromRemoteResult(result) {
        if (result.content) {
            return result.content;
        }
        if (result.sections) {
            const sections = [];
            if (result.sections.feelings)
                sections.push(`## Feelings\n\n${result.sections.feelings}`);
            if (result.sections.project_notes)
                sections.push(`## Project Notes\n\n${result.sections.project_notes}`);
            if (result.sections.user_context)
                sections.push(`## User Context\n\n${result.sections.user_context}`);
            if (result.sections.technical_insights)
                sections.push(`## Technical Insights\n\n${result.sections.technical_insights}`);
            if (result.sections.world_knowledge)
                sections.push(`## World Knowledge\n\n${result.sections.world_knowledge}`);
            return sections.join('\n\n');
        }
        return '';
    }
    extractSectionsFromRemoteResult(result) {
        const sections = [];
        if (result.sections) {
            if (result.sections.feelings)
                sections.push('Feelings');
            if (result.sections.project_notes)
                sections.push('Project Notes');
            if (result.sections.user_context)
                sections.push('User Context');
            if (result.sections.technical_insights)
                sections.push('Technical Insights');
            if (result.sections.world_knowledge)
                sections.push('World Knowledge');
        }
        return sections;
    }
    async loadEmbeddingsFromPath(basePath, type) {
        const embeddings = [];
        try {
            const dayDirs = await fs.readdir(basePath);
            for (const dayDir of dayDirs) {
                const dayPath = path.join(basePath, dayDir);
                const stat = await fs.stat(dayPath);
                if (!stat.isDirectory() || !dayDir.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    continue;
                }
                const files = await fs.readdir(dayPath);
                const embeddingFiles = files.filter((file) => file.endsWith('.embedding'));
                for (const embeddingFile of embeddingFiles) {
                    try {
                        const embeddingPath = path.join(dayPath, embeddingFile);
                        const content = await fs.readFile(embeddingPath, 'utf8');
                        const embeddingData = JSON.parse(content);
                        embeddings.push({ ...embeddingData, type });
                    }
                    catch (error) {
                        // Continue with other files on embedding load failure
                    }
                }
            }
        }
        catch (error) {
            if (!(error instanceof Error &&
                'code' in error &&
                error.code === 'ENOENT')) {
                // Silently handle directory read errors
            }
            // Return empty array if directory doesn't exist
        }
        return embeddings;
    }
    generateExcerpt(text, query, maxLength = 200) {
        if (!query || query.trim() === '') {
            return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
        }
        const queryWords = query.toLowerCase().split(/\s+/);
        const textLower = text.toLowerCase();
        // Find the best position to start the excerpt
        let bestPosition = 0;
        let bestScore = 0;
        for (let i = 0; i <= text.length - maxLength; i += 20) {
            const window = textLower.slice(i, i + maxLength);
            const score = queryWords.reduce((sum, word) => {
                return sum + (window.includes(word) ? 1 : 0);
            }, 0);
            if (score > bestScore) {
                bestScore = score;
                bestPosition = i;
            }
        }
        let excerpt = text.slice(bestPosition, bestPosition + maxLength);
        if (bestPosition > 0)
            excerpt = `...${excerpt}`;
        if (bestPosition + maxLength < text.length)
            excerpt += '...';
        return excerpt;
    }
}
exports.SearchService = SearchService;
//# sourceMappingURL=search.js.map