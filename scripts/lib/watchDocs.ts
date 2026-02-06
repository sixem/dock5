// File watching helpers for the docs generator.
//
// The goal is "good enough" cross-platform watching without adding dependencies.
// On Windows/macOS we can use a single recursive watcher. On Linux we fall back to
// watching each directory and re-scanning on rename events.
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

const isRecursiveWatchSupported =
  process.platform === 'win32' || process.platform === 'darwin';

const DEFAULT_IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  '.vite',
]);

const toName = (filename: string | Buffer | undefined | null) => {
  if (!filename) return null;
  return typeof filename === 'string' ? filename : filename.toString();
};

const shouldIgnoreDirName = (name: string) =>
  name.startsWith('.') || DEFAULT_IGNORED_DIR_NAMES.has(name);

const listDirectories = async (rootDir: string) => {
  const dirs: string[] = [];

  const walk = async (dir: string) => {
    dirs.push(dir);

    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (shouldIgnoreDirName(entry.name)) continue;
      await walk(path.join(dir, entry.name));
    }
  };

  await walk(rootDir);
  return dirs;
};

export type WatchDocsEvent = {
  baseDir: string;
  eventType: 'rename' | 'change' | 'error';
  filename: string | null;
  filePath: string | null;
  error?: unknown;
};

export type WatchDocsDirOptions = {
  dir: string;
  onEvent?: (event: WatchDocsEvent) => void;
};

export type WatchDocsDirHandle = {
  absDir: string;
  close: () => void;
};

export const watchDocsDir = async ({
  dir,
  onEvent,
}: WatchDocsDirOptions): Promise<WatchDocsDirHandle> => {
  const absDir = path.resolve(dir);

  const watchers = new Map<string, fs.FSWatcher>();

  let closed = false;
  let rescanTimer: ReturnType<typeof setTimeout> | null = null;

  const close = () => {
    if (closed) return;
    closed = true;

    if (rescanTimer) {
      clearTimeout(rescanTimer);
      rescanTimer = null;
    }

    for (const watcher of watchers.values()) watcher.close();
    watchers.clear();
  };

  const emit = (
    baseDir: string,
    eventType: 'rename' | 'change',
    filename: string | Buffer | undefined | null,
  ) => {
    if (closed) return;
    const name = toName(filename);
    const filePath = name ? path.join(baseDir, name) : null;
    onEvent?.({ baseDir, eventType, filename: name, filePath });
  };

  const scanAndWatch = async () => {
    const dirs = await listDirectories(absDir);
    const next = new Set(dirs);

    for (const dirPath of dirs) {
      if (watchers.has(dirPath)) continue;
      const watcher = fs.watch(
        dirPath,
        (eventType: 'rename' | 'change', filename) => {
          emit(dirPath, eventType, filename);
          if (eventType === 'rename') scheduleRescan();
        },
      );

      watcher.on('error', (error) => {
        // Directory watchers can get invalidated on Linux; a rescan is cheap.
        scheduleRescan();
        onEvent?.({
          baseDir: dirPath,
          eventType: 'error',
          filename: null,
          filePath: null,
          error,
        });
      });

      watchers.set(dirPath, watcher);
    }

    for (const dirPath of [...watchers.keys()]) {
      if (next.has(dirPath)) continue;
      watchers.get(dirPath)?.close();
      watchers.delete(dirPath);
    }
  };

  const scheduleRescan = () => {
    if (closed) return;
    if (rescanTimer) clearTimeout(rescanTimer);
    rescanTimer = setTimeout(() => {
      rescanTimer = null;
      scanAndWatch().catch((error) =>
        onEvent?.({
          baseDir: absDir,
          eventType: 'error',
          filename: null,
          filePath: null,
          error,
        }),
      );
    }, 150);
  };

  if (isRecursiveWatchSupported) {
    const watcher = fs.watch(
      absDir,
      { recursive: true },
      (eventType: 'rename' | 'change', filename) =>
        emit(absDir, eventType, filename),
    );

    watcher.on('error', (error) =>
      onEvent?.({
        baseDir: absDir,
        eventType: 'error',
        filename: null,
        filePath: null,
        error,
      }),
    );

    watchers.set(absDir, watcher);
    return { absDir, close };
  }

  await scanAndWatch();
  return { absDir, close };
};
