"use strict";
// ABOUTME: Core journal writing functionality for MCP server
// ABOUTME: Handles file system operations, timestamps, and markdown formatting
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
exports.JournalManager = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const embeddings_1 = require("./embeddings");
const paths_1 = require("./paths");
const remote_1 = require("./remote");
class JournalManager {
    constructor(projectJournalPath, userJournalPath, remoteConfig, embeddingModel) {
        this.projectJournalPath = projectJournalPath;
        this.userJournalPath = userJournalPath || (0, paths_1.resolveUserJournalPath)();
        this.embeddingService = embeddings_1.EmbeddingService.getInstance(embeddingModel);
        this.remoteConfig = remoteConfig;
    }
    async writeEntry(content) {
        const timestamp = new Date();
        // In remote-only mode, skip local file operations
        if (this.remoteConfig?.remoteOnly) {
            await this.tryRemotePost({ content }, timestamp);
            return;
        }
        const dateString = this.formatDate(timestamp);
        const timeString = this.formatTimestamp(timestamp);
        const dayDirectory = path.join(this.projectJournalPath, dateString);
        const fileName = `${timeString}.md`;
        const filePath = path.join(dayDirectory, fileName);
        await this.ensureDirectoryExists(dayDirectory);
        const formattedEntry = this.formatEntry(content, timestamp);
        await fs.writeFile(filePath, formattedEntry, 'utf8');
        // Generate and save embedding
        await this.generateEmbeddingForEntry(filePath, formattedEntry, timestamp);
        // Attempt remote posting
        await this.tryRemotePost({ content }, timestamp);
    }
    async writeThoughts(thoughts) {
        const timestamp = new Date();
        // In remote-only mode, skip local file operations
        if (this.remoteConfig?.remoteOnly) {
            await this.tryRemotePost(thoughts, timestamp);
            return;
        }
        // Split thoughts into project-local and user-global
        const projectThoughts = { project_notes: thoughts.project_notes };
        const userThoughts = {
            feelings: thoughts.feelings,
            user_context: thoughts.user_context,
            technical_insights: thoughts.technical_insights,
            world_knowledge: thoughts.world_knowledge,
        };
        // Write project notes to project directory
        if (projectThoughts.project_notes) {
            await this.writeThoughtsToLocation(projectThoughts, timestamp, this.projectJournalPath);
        }
        // Write user thoughts to user directory
        const hasUserContent = Object.values(userThoughts).some((value) => value !== undefined);
        if (hasUserContent) {
            await this.writeThoughtsToLocation(userThoughts, timestamp, this.userJournalPath);
        }
        // Attempt remote posting for all thoughts
        await this.tryRemotePost(thoughts, timestamp);
    }
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    formatTimestamp(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const microseconds = String(date.getMilliseconds() * 1000 + Math.floor(Math.random() * 1000)).padStart(6, '0');
        return `${hours}-${minutes}-${seconds}-${microseconds}`;
    }
    formatEntry(content, timestamp) {
        const timeDisplay = timestamp.toLocaleTimeString('en-US', {
            hour12: true,
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
        });
        const dateDisplay = timestamp.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        return `---
title: "${timeDisplay} - ${dateDisplay}"
date: ${timestamp.toISOString()}
timestamp: ${timestamp.getTime()}
---

${content}
`;
    }
    async writeThoughtsToLocation(thoughts, timestamp, basePath) {
        const dateString = this.formatDate(timestamp);
        const timeString = this.formatTimestamp(timestamp);
        const dayDirectory = path.join(basePath, dateString);
        const fileName = `${timeString}.md`;
        const filePath = path.join(dayDirectory, fileName);
        await this.ensureDirectoryExists(dayDirectory);
        const formattedEntry = this.formatThoughts(thoughts, timestamp);
        await fs.writeFile(filePath, formattedEntry, 'utf8');
        // Generate and save embedding
        await this.generateEmbeddingForEntry(filePath, formattedEntry, timestamp);
    }
    formatThoughts(thoughts, timestamp) {
        const timeDisplay = timestamp.toLocaleTimeString('en-US', {
            hour12: true,
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
        });
        const dateDisplay = timestamp.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const sections = [];
        if (thoughts.feelings) {
            sections.push(`## Feelings\n\n${thoughts.feelings}`);
        }
        if (thoughts.project_notes) {
            sections.push(`## Project Notes\n\n${thoughts.project_notes}`);
        }
        if (thoughts.user_context) {
            sections.push(`## User Context\n\n${thoughts.user_context}`);
        }
        if (thoughts.technical_insights) {
            sections.push(`## Technical Insights\n\n${thoughts.technical_insights}`);
        }
        if (thoughts.world_knowledge) {
            sections.push(`## World Knowledge\n\n${thoughts.world_knowledge}`);
        }
        return `---
title: "${timeDisplay} - ${dateDisplay}"
date: ${timestamp.toISOString()}
timestamp: ${timestamp.getTime()}
---

${sections.join('\n\n')}
`;
    }
    async generateEmbeddingForEntry(filePath, content, timestamp) {
        try {
            const { text, sections } = this.embeddingService.extractSearchableText(content);
            if (text.trim().length === 0) {
                return; // Skip empty entries
            }
            const embedding = await this.embeddingService.generateEmbedding(text);
            const embeddingData = {
                embedding,
                text,
                sections,
                timestamp: timestamp.getTime(),
                path: filePath,
            };
            await this.embeddingService.saveEmbedding(filePath, embeddingData);
        }
        catch (error) {
            // Don't throw - embedding failure shouldn't prevent journal writing
        }
    }
    async generateMissingEmbeddings() {
        let count = 0;
        const paths = [this.projectJournalPath, this.userJournalPath];
        for (const basePath of paths) {
            try {
                const dayDirs = await fs.readdir(basePath);
                for (const dayDir of dayDirs) {
                    const dayPath = path.join(basePath, dayDir);
                    const stat = await fs.stat(dayPath);
                    if (!stat.isDirectory() || !dayDir.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        continue;
                    }
                    const files = await fs.readdir(dayPath);
                    const mdFiles = files.filter((file) => file.endsWith('.md'));
                    for (const mdFile of mdFiles) {
                        const mdPath = path.join(dayPath, mdFile);
                        const embeddingPath = mdPath.replace(/\.md$/, '.embedding');
                        try {
                            await fs.access(embeddingPath);
                            // Embedding already exists, skip
                        }
                        catch {
                            // Generate missing embedding
                            const content = await fs.readFile(mdPath, 'utf8');
                            const timestamp = this.extractTimestampFromPath(mdPath) || new Date();
                            await this.generateEmbeddingForEntry(mdPath, content, timestamp);
                            count++;
                        }
                    }
                }
            }
            catch (error) {
                if (!(error instanceof Error &&
                    'code' in error &&
                    error.code === 'ENOENT')) {
                    // Silently handle directory scan errors
                }
            }
        }
        return count;
    }
    extractTimestampFromPath(filePath) {
        const filename = path.basename(filePath, '.md');
        const match = filename.match(/^(\d{2})-(\d{2})-(\d{2})-\d{6}$/);
        if (!match)
            return null;
        const [, hours, minutes, seconds] = match;
        const dirName = path.basename(path.dirname(filePath));
        const dateMatch = dirName.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!dateMatch)
            return null;
        const [, year, month, day] = dateMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds));
    }
    async ensureDirectoryExists(dirPath) {
        try {
            await fs.access(dirPath);
        }
        catch {
            try {
                await fs.mkdir(dirPath, { recursive: true });
            }
            catch (mkdirError) {
                throw new Error(`Failed to create journal directory at ${dirPath}: ${mkdirError instanceof Error ? mkdirError.message : mkdirError}`);
            }
        }
    }
    async tryRemotePost(thoughts, timestamp) {
        if (!this.remoteConfig?.enabled) {
            return;
        }
        try {
            const payload = {
                team_id: this.remoteConfig.teamId,
                timestamp: timestamp.getTime(),
            };
            // Generate content for embedding
            let fullContent;
            if (thoughts.content) {
                payload.content = thoughts.content;
                fullContent = thoughts.content;
            }
            else {
                // Structure as sections for thoughts
                payload.sections = {
                    feelings: thoughts.feelings,
                    project_notes: thoughts.project_notes,
                    user_context: thoughts.user_context,
                    technical_insights: thoughts.technical_insights,
                    world_knowledge: thoughts.world_knowledge,
                };
                // Combine all sections for embedding generation
                const sections = [];
                if (thoughts.feelings)
                    sections.push(`## Feelings\n\n${thoughts.feelings}`);
                if (thoughts.project_notes)
                    sections.push(`## Project Notes\n\n${thoughts.project_notes}`);
                if (thoughts.user_context)
                    sections.push(`## User Context\n\n${thoughts.user_context}`);
                if (thoughts.technical_insights)
                    sections.push(`## Technical Insights\n\n${thoughts.technical_insights}`);
                if (thoughts.world_knowledge)
                    sections.push(`## World Knowledge\n\n${thoughts.world_knowledge}`);
                fullContent = sections.join('\n\n');
            }
            // Generate embedding for the content
            try {
                const { text } = this.embeddingService.extractSearchableText(fullContent);
                if (text.trim().length > 0) {
                    const embedding = await this.embeddingService.generateEmbedding(text);
                    payload.embedding = Array.from(embedding);
                }
            }
            catch (embeddingError) {
                // Don't fail the remote post if embedding generation fails
            }
            await (0, remote_1.postToRemoteServer)(this.remoteConfig, payload);
        }
        catch (error) {
            // In remote-only mode, rethrow errors since there's no local fallback
            if (this.remoteConfig?.remoteOnly) {
                throw new Error(`Remote journal posting failed: ${error instanceof Error ? error.message : String(error)}`);
            }
            // Log but don't rethrow - local journaling should continue in hybrid mode
            // Silently handle remote posting failures in non-remote-only mode
        }
    }
}
exports.JournalManager = JournalManager;
//# sourceMappingURL=journal.js.map