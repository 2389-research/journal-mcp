// ABOUTME: Test-only mock implementation of Node.js fs/promises module
// ABOUTME: Provides in-memory file system with configurable failure modes for testing

import * as path from 'node:path';

export class FileSystemMock {
  private files = new Map<string, string>();
  private directories = new Set<string>();
  private failureMode: 'none' | 'permission' | 'disk-full' | 'network' = 'none';
  private calls: Array<{ method: string; args: any[] }> = [];
  private active = false;

  // Test control methods
  setFailureMode(mode: 'none' | 'permission' | 'disk-full' | 'network') {
    this.failureMode = mode;
  }

  activate() {
    this.active = true;
  }

  deactivate() {
    this.active = false;
  }

  isActive() {
    return this.active;
  }

  reset() {
    this.files.clear();
    this.directories.clear();
    this.failureMode = 'none';
    this.calls = [];
    this.active = false; // Reset activation state
  }

  getWrittenFiles() {
    return new Map(this.files);
  }

  getCalls() {
    return [...this.calls];
  }

  // Perfect API match to Node.js fs/promises
  async writeFile(
    filePath: string | Buffer | URL,
    data: string | Buffer,
    options?: any
  ): Promise<void> {
    this.calls.push({ method: 'writeFile', args: [filePath, data, options] });

    const pathStr = filePath.toString();

    if (this.failureMode === 'permission') {
      throw Object.assign(new Error('EACCES: permission denied'), {
        code: 'EACCES',
        errno: -13,
        syscall: 'open',
        path: pathStr,
      });
    }

    if (this.failureMode === 'disk-full') {
      throw Object.assign(new Error('ENOSPC: no space left on device'), {
        code: 'ENOSPC',
        errno: -28,
        syscall: 'write',
        path: pathStr,
      });
    }

    // Ensure directory exists in mock
    const dir = path.dirname(pathStr);
    this.directories.add(dir);

    this.files.set(pathStr, data.toString());
  }

  async readFile(filePath: string | Buffer | URL, options?: any): Promise<string | Buffer> {
    this.calls.push({ method: 'readFile', args: [filePath, options] });

    const pathStr = filePath.toString();
    const content = this.files.get(pathStr);

    if (!content) {
      throw Object.assign(new Error(`ENOENT: no such file or directory, open '${pathStr}'`), {
        code: 'ENOENT',
        errno: -2,
        syscall: 'open',
        path: pathStr,
      });
    }

    return content;
  }

  async mkdir(
    dirPath: string | Buffer | URL,
    options?: { recursive?: boolean; mode?: number }
  ): Promise<string | undefined> {
    this.calls.push({ method: 'mkdir', args: [dirPath, options] });

    const pathStr = dirPath.toString();

    if (this.failureMode === 'permission') {
      throw Object.assign(new Error('EACCES: permission denied'), {
        code: 'EACCES',
        errno: -13,
        syscall: 'mkdir',
        path: pathStr,
      });
    }

    this.directories.add(pathStr);

    // Add parent directories if recursive
    if (options?.recursive) {
      let current = pathStr;
      while (current !== path.dirname(current)) {
        this.directories.add(current);
        current = path.dirname(current);
      }
    }

    return pathStr;
  }

  async readdir(dirPath: string | Buffer | URL, options?: any): Promise<string[]> {
    this.calls.push({ method: 'readdir', args: [dirPath, options] });

    const pathStr = dirPath.toString();

    if (!this.directories.has(pathStr)) {
      throw Object.assign(new Error(`ENOENT: no such file or directory, scandir '${pathStr}'`), {
        code: 'ENOENT',
        errno: -2,
        syscall: 'scandir',
        path: pathStr,
      });
    }

    // Return files and subdirectories in this directory
    const contents: string[] = [];

    // Add files in this directory
    for (const [filePath, _] of this.files) {
      const dir = path.dirname(filePath);
      if (dir === pathStr) {
        contents.push(path.basename(filePath));
      }
    }

    // Add subdirectories
    for (const dir of this.directories) {
      const parent = path.dirname(dir);
      if (parent === pathStr && dir !== pathStr) {
        contents.push(path.basename(dir));
      }
    }

    return [...new Set(contents)].sort();
  }

  async stat(
    filePath: string | Buffer | URL
  ): Promise<{ isDirectory(): boolean; isFile(): boolean }> {
    this.calls.push({ method: 'stat', args: [filePath] });

    const pathStr = filePath.toString();

    if (this.files.has(pathStr)) {
      return {
        isDirectory: () => false,
        isFile: () => true,
      };
    }

    if (this.directories.has(pathStr)) {
      return {
        isDirectory: () => true,
        isFile: () => false,
      };
    }

    throw Object.assign(new Error(`ENOENT: no such file or directory, stat '${pathStr}'`), {
      code: 'ENOENT',
      errno: -2,
      syscall: 'stat',
      path: pathStr,
    });
  }

  async rm(
    filePath: string | Buffer | URL,
    options?: { recursive?: boolean; force?: boolean }
  ): Promise<void> {
    this.calls.push({ method: 'rm', args: [filePath, options] });

    const pathStr = filePath.toString();

    // Remove file if it exists
    this.files.delete(pathStr);

    // Remove directory if it exists
    if (options?.recursive) {
      // Remove all files and directories under this path
      for (const [file] of this.files) {
        if (file.startsWith(pathStr + '/') || file === pathStr) {
          this.files.delete(file);
        }
      }

      for (const dir of this.directories) {
        if (dir.startsWith(pathStr + '/') || dir === pathStr) {
          this.directories.delete(dir);
        }
      }
    } else {
      this.directories.delete(pathStr);
    }
  }

  async access(filePath: string | Buffer | URL, mode?: number): Promise<void> {
    this.calls.push({ method: 'access', args: [filePath, mode] });

    const pathStr = filePath.toString();

    if (!this.files.has(pathStr) && !this.directories.has(pathStr)) {
      throw Object.assign(new Error(`ENOENT: no such file or directory, access '${pathStr}'`), {
        code: 'ENOENT',
        errno: -2,
        syscall: 'access',
        path: pathStr,
      });
    }
  }

  // Create function that returns this instance for Jest module mock
  mkdtemp(prefix: string): Promise<string> {
    this.calls.push({ method: 'mkdtemp', args: [prefix] });

    const tempDir = `${prefix}${Math.random().toString(36).substring(2, 15)}`;
    this.directories.add(tempDir);
    return Promise.resolve(tempDir);
  }
}
