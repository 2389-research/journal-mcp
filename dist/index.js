#!/usr/bin/env node
"use strict";
// ABOUTME: Main entry point for the private journal MCP server
// ABOUTME: Handles command line arguments and starts the server
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
const path = __importStar(require("node:path"));
const paths_1 = require("./paths");
const server_1 = require("./server");
function parseArguments() {
    const args = process.argv.slice(2);
    // Check for explicit journal path argument first
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--journal-path' && i + 1 < args.length) {
            return path.resolve(args[i + 1]);
        }
    }
    // Use shared path resolution logic
    return (0, paths_1.resolveProjectJournalPath)();
}
async function main() {
    try {
        const journalPath = parseArguments();
        const server = new server_1.PrivateJournalServer(journalPath);
        await server.run();
    }
    catch (error) {
        throw new Error(`Failed to start private journal MCP server: ${error}`);
    }
}
main().catch((error) => {
    process.stderr.write(`${error}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map