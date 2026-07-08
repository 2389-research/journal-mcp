import { type RemoteConfig } from './remote';
export interface SearchResult {
    path: string;
    score: number;
    text: string;
    sections: string[];
    timestamp: number;
    excerpt: string;
    type: 'project' | 'user';
}
export interface SearchOptions {
    limit?: number;
    minScore?: number;
    sections?: string[];
    dateRange?: {
        start?: Date;
        end?: Date;
    };
    type?: 'project' | 'user' | 'both';
}
export declare class SearchService {
    private embeddingService;
    private projectPath;
    private userPath;
    private remoteConfig?;
    constructor(projectPath?: string, userPath?: string, embeddingModel?: string, remoteConfig?: RemoteConfig);
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    listRecent(options?: SearchOptions): Promise<SearchResult[]>;
    readEntry(filePath: string): Promise<string | null>;
    private searchRemote;
    private listRecentRemote;
    private extractTextFromRemoteResult;
    private extractSectionsFromRemoteResult;
    private loadEmbeddingsFromPath;
    private generateExcerpt;
}
//# sourceMappingURL=search.d.ts.map