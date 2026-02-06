// Small argument parsing helpers for scripts.

import { parseArgs } from 'node:util';

export type ParseDocsArgsOptions = {
  defaultDocsDir: string;
};

export type ParsedDocsArgs = {
  docsDir: string;
  rest: string[];
  help: boolean;
};

export const parseDocsArgs = (
  argv: string[],
  { defaultDocsDir }: ParseDocsArgsOptions,
): ParsedDocsArgs => {
  // Parse only a small set of "docs selection" flags and return the rest so
  // dev/build can forward args to Vite.
  //
  // Supported forms:
  //   pnpm dev
  //   pnpm dev -- ./path/to/docs
  //   pnpm dev -- --docs ./path/to/docs
  //   pnpm dev -- ./path/to/docs --open
  //   pnpm dev -- --docs ./path/to/docs -- --open
  //
  // Notes:
  // - In pnpm scripts, the first "--" is required to pass args to the script.
  // - A second "--" is optional and can be used to explicitly separate
  //   dock5 args from Vite args. We must NOT forward that separator to Vite.

  const separatorIndex = argv.indexOf('--');
  const docsArgv = separatorIndex >= 0 ? argv.slice(0, separatorIndex) : argv;
  const forwardedArgv =
    separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : null;

  let docsDirFromFlag: string | null = null;
  let help = false;

  const remainingDocsArgv: string[] = [];

  for (let i = 0; i < docsArgv.length; i += 1) {
    const arg = docsArgv[i] ?? '';

    if (arg === '-h' || arg === '--help') {
      help = true;
      continue;
    }

    if (arg === '--docs' || arg === '--input') {
      const next = docsArgv[i + 1];
      if (typeof next !== 'string' || !next || next.startsWith('-')) {
        throw new Error(`Invalid args: ${arg} requires a directory`);
      }

      docsDirFromFlag = next;
      i += 1;
      continue;
    }

    remainingDocsArgv.push(arg);
  }

  // If no explicit flag is provided, treat the first non-flag token as the
  // docs directory, and forward any remaining tokens to Vite.
  let docsDirFromPositional: string | null = null;
  const remainingAfterPositional: string[] = [];

  for (let i = 0; i < remainingDocsArgv.length; i += 1) {
    const arg = remainingDocsArgv[i] ?? '';

    if (!docsDirFromPositional && !arg.startsWith('-') && arg !== '--') {
      docsDirFromPositional = arg;
      continue;
    }

    remainingAfterPositional.push(arg);
  }

  const docsDir = docsDirFromFlag ?? docsDirFromPositional ?? defaultDocsDir;

  // If the user provided an explicit separator, forward only the args after it.
  // Otherwise, forward any leftover args that weren't consumed as docs args.
  const rest = forwardedArgv ?? remainingAfterPositional;

  return { docsDir, rest, help };
};

export type ParseGenerateArgsDefaults = {
  defaultOutFile: string;
  defaultAssetsDir: string | null;
  defaultAssetsBase: string | null;
};

export type GenerateCliOptions = {
  inputDir: string | null;
  outFile: string;
  base: string | null;
  outDir: string | null;
  assetsDir: string | null;
  assetsBase: string | null;
};

export type ParseGenerateArgsResult = {
  opts: GenerateCliOptions;
  positional: string[];
  help: boolean;
};

export const parseGenerateArgs = (
  argv: string[],
  defaults: ParseGenerateArgsDefaults,
): ParseGenerateArgsResult => {
  let parsed: { values: Record<string, unknown>; positionals: string[] };

  try {
    parsed = parseArgs({
      args: argv,
      options: {
        help: { type: 'boolean', short: 'h' },
        input: { type: 'string' },
        docs: { type: 'string' },
        outFile: { type: 'string' },
        outDir: { type: 'string' },
        base: { type: 'string' },
        assetsDir: { type: 'string' },
        assetsBase: { type: 'string' },
      },
      allowPositionals: true,
      strict: true,
    }) as unknown as { values: Record<string, unknown>; positionals: string[] };
  } catch (err) {
    throw new Error(
      `Invalid args: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const positional = parsed.positionals ?? [];

  const inputDirFromFlag =
    (typeof parsed.values.input === 'string' && parsed.values.input) ||
    (typeof parsed.values.docs === 'string' && parsed.values.docs) ||
    null;

  const inputDir = inputDirFromFlag ?? positional[0] ?? 'docs';

  const outFile =
    (typeof parsed.values.outFile === 'string' && parsed.values.outFile) ||
    defaults.defaultOutFile;

  const outDir =
    (typeof parsed.values.outDir === 'string' && parsed.values.outDir) || null;

  const base =
    (typeof parsed.values.base === 'string' && parsed.values.base) || null;

  const assetsDir =
    (typeof parsed.values.assetsDir === 'string' && parsed.values.assetsDir) ||
    defaults.defaultAssetsDir;

  const assetsBase =
    (typeof parsed.values.assetsBase === 'string' &&
      parsed.values.assetsBase) ||
    defaults.defaultAssetsBase;

  return {
    opts: {
      inputDir,
      outFile,
      base,
      outDir,
      assetsDir,
      assetsBase,
    },
    positional,
    help: Boolean(parsed.values.help),
  };
};
