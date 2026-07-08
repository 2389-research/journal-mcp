export declare class PrivateJournalServer {
    private server;
    private journalManager;
    private searchService;
    private remoteConfig?;
    constructor(journalPath: string);
    private setupToolHandlers;
    private getJournalResources;
    private createJournalUri;
    private isValidJournalUri;
    private readJournalResource;
    private isPathSafe;
    private generatePrompt;
    private generateDailyReflectionPrompt;
    private generateProjectRetrospectivePrompt;
    private generateLearningCapturePrompt;
    private generateEmotionalProcessingPrompt;
    run(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map
