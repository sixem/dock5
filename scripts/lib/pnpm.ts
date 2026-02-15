// Small helper to run pnpm commands in a cross-platform way.
import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

export const runPnpm = async (
  args: string[],
  options?: { env?: Record<string, string | undefined> },
): Promise<void> => {
  const command = isWindows ? (process.env.COMSPEC ?? 'cmd.exe') : 'pnpm';
  const commandArgs = isWindows ? ['/d', '/s', '/c', 'pnpm', ...args] : args;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      env: { ...process.env, ...(options?.env ?? {}) },
    });

    child.on('exit', (code: number | null) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed (${code}): pnpm ${args.join(' ')}`));
    });

    child.on('error', reject);
  });
};
