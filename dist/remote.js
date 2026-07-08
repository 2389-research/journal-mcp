"use strict";
// ABOUTME: Remote server posting functionality for journal entries
// ABOUTME: Handles HTTP POST requests to external journal servers with authentication
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postToRemoteServer = postToRemoteServer;
exports.searchRemoteServer = searchRemoteServer;
exports.getRemoteEntries = getRemoteEntries;
exports.getRemoteEntryById = getRemoteEntryById;
exports.createRemoteConfig = createRemoteConfig;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function postToRemoteServer(config, payload) {
    if (!config.enabled) {
        return;
    }
    const url = `${config.serverUrl}/teams/${config.teamId}/journal/entries`;
    try {
        const response = await (0, node_fetch_1.default)(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.apiKey,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Remote server error: ${response.status} ${response.statusText} - ${errorText}`);
        }
    }
    catch (error) {
        throw error; // Re-throw for caller to handle gracefully
    }
}
async function searchRemoteServer(config, searchRequest) {
    if (!config.enabled) {
        throw new Error('Remote server not configured');
    }
    const url = `${config.serverUrl}/teams/${config.teamId}/journal/search`;
    try {
        const response = await (0, node_fetch_1.default)(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.apiKey,
            },
            body: JSON.stringify(searchRequest),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Remote search error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data = (await response.json());
        return data;
    }
    catch (error) {
        throw error;
    }
}
async function getRemoteEntries(config, limit, offset) {
    if (!config.enabled) {
        throw new Error('Remote server not configured');
    }
    const params = new URLSearchParams();
    if (limit)
        params.append('limit', limit.toString());
    if (offset !== undefined)
        params.append('offset', offset.toString());
    const url = `${config.serverUrl}/teams/${config.teamId}/journal/entries?${params}`;
    try {
        const response = await (0, node_fetch_1.default)(url, {
            method: 'GET',
            headers: {
                'X-API-Key': config.apiKey,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Remote entries error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data = (await response.json());
        return {
            entries: (data.entries || []),
            total_count: data.total_count || 0,
        };
    }
    catch (error) {
        throw error;
    }
}
async function getRemoteEntryById(config, entryId) {
    if (!config.enabled) {
        throw new Error('Remote server not configured');
    }
    const url = `${config.serverUrl}/teams/${config.teamId}/journal/entries/${entryId}`;
    try {
        const response = await (0, node_fetch_1.default)(url, {
            method: 'GET',
            headers: {
                'X-API-Key': config.apiKey,
            },
        });
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Remote entry fetch error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data = (await response.json());
        return data;
    }
    catch (error) {
        throw error;
    }
}
function createRemoteConfig() {
    const serverUrl = process.env.REMOTE_JOURNAL_SERVER_URL;
    const teamId = process.env.REMOTE_JOURNAL_TEAMID;
    const apiKey = process.env.REMOTE_JOURNAL_APIKEY;
    const remoteOnly = process.env.REMOTE_JOURNAL_ONLY === 'true';
    if (!serverUrl || !teamId || !apiKey) {
        return undefined;
    }
    return {
        serverUrl,
        teamId,
        apiKey,
        enabled: true,
        remoteOnly,
    };
}
//# sourceMappingURL=remote.js.map
