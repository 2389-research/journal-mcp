// ABOUTME: Core journal writing functionality for MCP server
// ABOUTME: Handles file system operations, timestamps, and markdown formatting

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type EmbeddingData, EmbeddingService } from './embeddings';
import { resolveUserJournalPath } from './paths';
import { postToRemoteServer, type RemoteConfig, type RemoteJournalPayload } from './remote';

export class JournalManager {
  private projectJournalPath: string;
  private userJournalPath: string;
  private embeddingService: EmbeddingService;
  private remoteConfig?: RemoteConfig;

  constructor(
    projectJournalPath: string,
    userJournalPath?: string,
    remoteConfig?: RemoteConfig,
    embeddingModel?: string
  ) {
    this.projectJournalPath = projectJournalPath;
    this.userJournalPath = userJournalPath || resolveUserJournalPath();
    this.embeddingService = EmbeddingService.getInstance(embeddingModel);
    this.remoteConfig = remoteConfig;
  }

  async writeEntry(content: string): Promise<void> {
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

  async writeThoughts(thoughts: {
    feelings?: string;
    project_notes?: string;
    user_context?: string;
    technical_insights?: string;
    world_knowledge?: string;
  }): Promise<void> {
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

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTimestamp(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const microseconds = String(
      date.getMilliseconds() * 1000 + Math.floor(Math.random() * 1000)
    ).padStart(6, '0');
    return `${hours}-${minutes}-${seconds}-${microseconds}`;
  }

  private formatEntry(content: string, timestamp: Date): string {
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

  private async writeThoughtsToLocation(
    thoughts: {
      feelings?: string;
      project_notes?: string;
      user_context?: string;
      technical_insights?: string;
      world_knowledge?: string;
    },
    timestamp: Date,
    basePath: string
  ): Promise<void> {
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

  private formatThoughts(
    thoughts: {
      feelings?: string;
      project_notes?: string;
      user_context?: string;
      technical_insights?: string;
      world_knowledge?: string;
    },
    timestamp: Date
  ): string {
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

  private async generateEmbeddingForEntry(
    filePath: string,
    content: string,
    timestamp: Date
  ): Promise<void> {
    try {
      const { text, sections } = this.embeddingService.extractSearchableText(content);

      if (text.trim().length === 0) {
        return; // Skip empty entries
      }

      const embedding = await this.embeddingService.generateEmbedding(text);

      const embeddingData: EmbeddingData = {
        embedding,
        text,
        sections,
        timestamp: timestamp.getTime(),
        path: filePath,
      };

      await this.embeddingService.saveEmbedding(filePath, embeddingData);
    } catch (error) {
      // Don't throw - embedding failure shouldn't prevent journal writing
    }
  }

  async generateMissingEmbeddings(): Promise<number> {
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
            } catch {
              // Generate missing embedding
              const content = await fs.readFile(mdPath, 'utf8');
              const timestamp = this.extractTimestampFromPath(mdPath) || new Date();
              await this.generateEmbeddingForEntry(mdPath, content, timestamp);
              count++;
            }
          }
        }
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            'code' in error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
          )
        ) {
          // Silently handle directory scan errors
        }
      }
    }

    return count;
  }

  private extractTimestampFromPath(filePath: string): Date | null {
    const filename = path.basename(filePath, '.md');
    const match = filename.match(/^(\d{2})-(\d{2})-(\d{2})-\d{6}$/);

    if (!match) return null;

    const [, hours, minutes, seconds] = match;
    const dirName = path.basename(path.dirname(filePath));
    const dateMatch = dirName.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!dateMatch) return null;

    const [, year, month, day] = dateMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (mkdirError) {
        throw new Error(
          `Failed to create journal directory at ${dirPath}: ${mkdirError instanceof Error ? mkdirError.message : mkdirError}`
        );
      }
    }
  }

  private async tryRemotePost(
    thoughts: {
      content?: string;
      feelings?: string;
      project_notes?: string;
      user_context?: string;
      technical_insights?: string;
      world_knowledge?: string;
    },
    timestamp: Date
  ): Promise<void> {
    if (!this.remoteConfig?.enabled) {
      return;
    }

    try {
      const payload: RemoteJournalPayload = {
        team_id: this.remoteConfig.teamId,
        timestamp: timestamp.getTime(),
      };

      // Generate content for embedding
      let fullContent: string;
      if (thoughts.content) {
        payload.content = thoughts.content;
        fullContent = thoughts.content;
      } else {
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
        if (thoughts.feelings) sections.push(`## Feelings\n\n${thoughts.feelings}`);
        if (thoughts.project_notes) sections.push(`## Project Notes\n\n${thoughts.project_notes}`);
        if (thoughts.user_context) sections.push(`## User Context\n\n${thoughts.user_context}`);
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
      } catch (embeddingError) {
        // Don't fail the remote post if embedding generation fails
      }

      await postToRemoteServer(this.remoteConfig, payload);
    } catch (error) {
      // In remote-only mode, rethrow errors since there's no local fallback
      if (this.remoteConfig?.remoteOnly) {
        throw new Error(
          `Remote journal posting failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      // Log but don't rethrow - local journaling should continue in hybrid mode
      // Silently handle remote posting failures in non-remote-only mode
    }
  }
}
