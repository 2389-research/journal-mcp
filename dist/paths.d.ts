/**
 * Resolves the best available directory for journal storage
 * @param subdirectory - subdirectory name (e.g., '.private-journal')
 * @param includeCurrentDirectory - whether to consider current working directory
 * @returns resolved path to journal directory
 */
export declare function resolveJournalPath(subdirectory?: string, includeCurrentDirectory?: boolean): string;
/**
 * Resolves user home directory for personal journal storage
 * @returns path to user's private journal directory
 */
export declare function resolveUserJournalPath(): string;
/**
 * Resolves project directory for project-specific journal storage
 * @returns path to project's private journal directory
 */
export declare function resolveProjectJournalPath(): string;
//# sourceMappingURL=paths.d.ts.map