"use strict";
// ABOUTME: Local embedding service using transformers for semantic journal search
// ABOUTME: Provides text embedding generation and similarity computation utilities
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
exports.EmbeddingService = void 0;
const fs = __importStar(require("node:fs/promises"));
const transformers_1 = require("@xenova/transformers");
class EmbeddingService {
    constructor(modelName) {
        this.extractor = null;
        this.initPromise = null;
        this.modelName = modelName || process.env.JOURNAL_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
    }
    static getInstance(modelName) {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService(modelName);
        }
        return EmbeddingService.instance;
    }
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = this.doInitialize();
        return this.initPromise;
    }
    async doInitialize() {
        try {
            this.extractor = await (0, transformers_1.pipeline)('feature-extraction', this.modelName);
        }
        catch (error) {
            throw new Error(`Failed to load embedding model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getModelName() {
        return this.modelName;
    }
    static resetInstance() {
        EmbeddingService.instance = null;
    }
    async generateEmbedding(text) {
        if (!this.extractor) {
            await this.initialize();
        }
        if (!this.extractor) {
            throw new Error('Embedding model not initialized');
        }
        try {
            const result = await this.extractor(text, { pooling: 'mean', normalize: true });
            return Array.from(result.data);
        }
        catch (error) {
            throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same length');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    async saveEmbedding(filePath, embeddingData) {
        const embeddingPath = filePath.replace(/\.md$/, '.embedding');
        await fs.writeFile(embeddingPath, JSON.stringify(embeddingData, null, 2), 'utf8');
    }
    async loadEmbedding(filePath) {
        const embeddingPath = filePath.replace(/\.md$/, '.embedding');
        try {
            const content = await fs.readFile(embeddingPath, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            if (error instanceof Error &&
                'code' in error &&
                error.code === 'ENOENT') {
                return null; // File doesn't exist
            }
            throw error;
        }
    }
    extractSearchableText(markdownContent) {
        // Remove YAML frontmatter
        const withoutFrontmatter = markdownContent.replace(/^---\n.*?\n---\n/s, '');
        // Extract sections
        const sections = [];
        const sectionMatches = withoutFrontmatter.match(/^## (.+)$/gm);
        if (sectionMatches) {
            sections.push(...sectionMatches.map((match) => match.replace('## ', '')));
        }
        // Clean up markdown for embedding
        const cleanText = withoutFrontmatter
            .replace(/^## .+$/gm, '') // Remove section headers
            .replace(/\n{3,}/g, '\n\n') // Normalize whitespace
            .trim();
        return {
            text: cleanText,
            sections,
        };
    }
}
exports.EmbeddingService = EmbeddingService;
EmbeddingService.instance = null;
//# sourceMappingURL=embeddings.js.map
