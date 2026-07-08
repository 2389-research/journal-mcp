export interface RemoteConfig {
    serverUrl: string;
    teamId: string;
    apiKey: string;
    enabled: boolean;
    remoteOnly?: boolean;
}
export interface RemoteJournalPayload {
    team_id: string;
    timestamp: number;
    sections?: {
        feelings?: string;
        project_notes?: string;
        technical_insights?: string;
        user_context?: string;
        world_knowledge?: string;
    };
    content?: string;
    embedding?: number[];
}
export interface RemoteSearchRequest {
    query: string;
    limit?: number;
    offset?: number;
    date_from?: string;
    date_to?: string;
    sections?: string[];
    similarity_threshold?: number;
}
export interface RemoteSearchResult {
    id: string;
    team_id: string;
    similarity_score: number;
    timestamp: number;
    created_at: string;
    sections?: {
        feelings?: string;
        project_notes?: string;
        technical_insights?: string;
        user_context?: string;
        world_knowledge?: string;
    };
    content?: string;
    matched_sections?: string[];
}
export interface RemoteSearchResponse {
    results: RemoteSearchResult[];
    total_count: number;
    query_embedding?: number[];
}
export declare function postToRemoteServer(config: RemoteConfig, payload: RemoteJournalPayload): Promise<void>;
export declare function searchRemoteServer(config: RemoteConfig, searchRequest: RemoteSearchRequest): Promise<RemoteSearchResponse>;
export declare function getRemoteEntries(config: RemoteConfig, limit?: number, offset?: number): Promise<{
    entries: RemoteSearchResult[];
    total_count: number;
}>;
export declare function getRemoteEntryById(config: RemoteConfig, entryId: string): Promise<RemoteSearchResult | null>;
export declare function createRemoteConfig(): RemoteConfig | undefined;
//# sourceMappingURL=remote.d.ts.map
