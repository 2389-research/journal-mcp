// ABOUTME: Remote server posting functionality for journal entries
// ABOUTME: Handles HTTP POST requests to external journal servers with authentication

import fetch from 'node-fetch';

export interface RemoteConfig {
  serverUrl: string;
  teamId: string;
  apiKey: string;
  enabled: boolean;
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

export async function postToRemoteServer(config: RemoteConfig, payload: RemoteJournalPayload): Promise<void> {
  if (!config.enabled) {
    return;
  }

  try {
    const response = await fetch(`${config.serverUrl}/journal/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'x-team-id': config.teamId
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Remote server error: ${response.status} ${response.statusText}`);
    }

    console.log('Remote journal post successful');
  } catch (error) {
    // Log error but don't rethrow - we want local journaling to continue
    console.error('Remote journal post failed:', error instanceof Error ? error.message : String(error));
    throw error; // Re-throw for caller to handle gracefully
  }
}

export function createRemoteConfig(): RemoteConfig | undefined {
  const serverUrl = process.env.REMOTE_JOURNAL_SERVER_URL;
  const teamId = process.env.REMOTE_JOURNAL_TEAMID;
  const apiKey = process.env.REMOTE_JOURNAL_APIKEY;

  if (!serverUrl || !teamId || !apiKey) {
    return undefined;
  }

  return {
    serverUrl,
    teamId,
    apiKey,
    enabled: true
  };
}