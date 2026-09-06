import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect, it, vi } from 'vitest';
import { type WatchDocsEvent, watchDocsDir } from './watchDocs';

it('detects edits, atomic saves, new nested files, and deletions', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-watch-'));
  const file = path.join(dir, 'index.md');
  const events: WatchDocsEvent[] = [];
  await fs.writeFile(file, '# Initial');
  const watcher = await watchDocsDir({
    dir,
    onEvent: (event) => events.push(event),
  });
  const waitFor = (filePath: string, eventType: string) =>
    vi.waitFor(
      () =>
        expect(
          events.some(
            (event) =>
              event.filePath === filePath && event.eventType === eventType,
          ),
        ).toBe(true),
      { timeout: 4000, interval: 50 },
    );
  try {
    await fs.writeFile(file, '# Updated content');
    await waitFor(file, 'change');
    events.length = 0;
    const replacement = path.join(dir, '.save');
    await fs.writeFile(replacement, '# Atomic replacement');
    await fs.rename(replacement, file);
    await waitFor(file, 'change');
    const nested = path.join(dir, 'new', 'guide.md');
    await fs.mkdir(path.dirname(nested));
    await fs.writeFile(nested, '# Guide');
    await waitFor(nested, 'rename');
    events.length = 0;
    await fs.rm(nested);
    await waitFor(nested, 'rename');
    expect(events.every((event) => event.eventType !== 'error')).toBe(true);
  } finally {
    watcher.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
