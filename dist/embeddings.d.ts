export interface EmbeddingData {
    embedding: number[];
    text: string;
    sections: string[];
    timestamp: number;
    path: string;
}
export declare class EmbeddingService {
    private static instance;
    private extractor;
    private readonly modelName;
    private initPromise;
    private constructor();
    static getInstance(modelName?: string): EmbeddingService;
    initialize(): Promise<void>;
    private doInitialize;
    getModelName(): string;
    static resetInstance(): void;
    generateEmbedding(text: string): Promise<number[]>;
    cosineSimilarity(a: number[], b: number[]): number;
    saveEmbedding(filePath: string, embeddingData: EmbeddingData): Promise<void>;
    loadEmbedding(filePath: string): Promise<EmbeddingData | null>;
    extractSearchableText(markdownContent: string): {
        text: string;
        sections: string[];
    };
}
//# sourceMappingURL=embeddings.d.ts.map