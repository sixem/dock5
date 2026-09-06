import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const ignored = new Set(['node_modules', '.git', 'dist', '.vite']);

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
export type WatchDocsDirHandle = { absDir: string; close: () => void };

// Polling also detects edits made by Windows applications on WSL-mounted drives.
export const watchDocsDir = async ({
  dir,
  onEvent,
}: WatchDocsDirOptions): Promise<WatchDocsDirHandle> => {
  const absDir = path.resolve(dir);
  const snapshot = async () => {
    const files = new Map<string, string>();
    const walk = async (directory: string) => {
      for (const entry of await fs.readdir(directory, {
        withFileTypes: true,
      })) {
        if (entry.name.startsWith('.') || ignored.has(entry.name)) continue;
        const file = path.join(directory, entry.name);
        try {
          if (entry.isDirectory()) await walk(file);
          else if (entry.isFile()) {
            const stat = await fs.stat(file);
            files.set(file, `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`);
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }
    };
    await walk(absDir);
    return files;
  };
  let previous = await snapshot();
  let closed = false;
  let timer: ReturnType<typeof setTimeout>;
  const emit = (file: string, eventType: 'rename' | 'change') =>
    onEvent?.({
      baseDir: absDir,
      eventType,
      filename: path.relative(absDir, file),
      filePath: file,
    });
  const poll = async () => {
    try {
      const next = await snapshot();
      if (closed) return;
      for (const [file, stamp] of next) {
        if (!previous.has(file)) emit(file, 'rename');
        else if (previous.get(file) !== stamp) emit(file, 'change');
      }
      for (const file of previous.keys())
        if (!next.has(file)) emit(file, 'rename');
      previous = next;
    } catch (error) {
      if (!closed)
        onEvent?.({
          baseDir: absDir,
          eventType: 'error',
          filename: null,
          filePath: null,
          error,
        });
    } finally {
      if (!closed) timer = setTimeout(poll, 500);
    }
  };
  timer = setTimeout(poll, 500);
  return {
    absDir,
    close: () => {
      closed = true;
      clearTimeout(timer);
    },
  };
};
