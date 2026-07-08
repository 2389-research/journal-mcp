"use strict";
// ABOUTME: Path resolution utilities for journal storage locations
// ABOUTME: Provides cross-platform fallback logic for finding suitable directories
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
exports.resolveJournalPath = resolveJournalPath;
exports.resolveUserJournalPath = resolveUserJournalPath;
exports.resolveProjectJournalPath = resolveProjectJournalPath;
const path = __importStar(require("node:path"));
/**
 * Resolves the best available directory for journal storage
 * @param subdirectory - subdirectory name (e.g., '.private-journal')
 * @param includeCurrentDirectory - whether to consider current working directory
 * @returns resolved path to journal directory
 */
function resolveJournalPath(subdirectory = '.private-journal', includeCurrentDirectory = true) {
    const possiblePaths = [];
    // Try current working directory only if requested and it's reasonable
    if (includeCurrentDirectory) {
        try {
            const cwd = process.cwd();
            // Don't use root directories or other system directories
            if (cwd !== '/' && cwd !== 'C:\\' && cwd !== '/System' && cwd !== '/usr') {
                possiblePaths.push(path.join(cwd, subdirectory));
            }
        }
        catch {
            // Ignore errors getting cwd
        }
    }
    // Try home directories (cross-platform)
    if (process.env.HOME) {
        possiblePaths.push(path.join(process.env.HOME, subdirectory));
    }
    if (process.env.USERPROFILE) {
        possiblePaths.push(path.join(process.env.USERPROFILE, subdirectory));
    }
    // Try temp directories as last resort
    possiblePaths.push(path.join('/tmp', subdirectory));
    if (process.env.TEMP) {
        possiblePaths.push(path.join(process.env.TEMP, subdirectory));
    }
    if (process.env.TMP) {
        possiblePaths.push(path.join(process.env.TMP, subdirectory));
    }
    // Filter out null/undefined and return first valid path
    const validPaths = possiblePaths.filter(Boolean);
    return validPaths[0] || path.join('/tmp', subdirectory);
}
/**
 * Resolves user home directory for personal journal storage
 * @returns path to user's private journal directory
 */
function resolveUserJournalPath() {
    return resolveJournalPath('.private-journal', false);
}
/**
 * Resolves project directory for project-specific journal storage
 * @returns path to project's private journal directory
 */
function resolveProjectJournalPath() {
    return resolveJournalPath('.private-journal', true);
}
//# sourceMappingURL=paths.js.map