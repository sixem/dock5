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
  // pnpm forwards an optional leading "--" to the script. A later separator
  // marks arguments that belong exclusively to Vite.
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  let docsDir = defaultDocsDir;
  let hasDocsDir = false;
  let help = false;
  const rest: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--') {
      rest.push(...args.slice(i + 1));
      break;
    }

    if (arg === '-h' || arg === '--help') {
      help = true;
      continue;
    }

    if (arg === '--docs' || arg === '--input') {
      const next = args[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error(`Invalid args: ${arg} requires a directory`);
      }
      docsDir = next;
      hasDocsDir = true;
      i += 1;
      continue;
    }

    // Only a leading positional can select docs. Once Vite arguments begin,
    // their values (ports, hosts, output paths, etc.) must remain untouched.
    if (!hasDocsDir && rest.length === 0 && !arg.startsWith('-')) {
      docsDir = arg;
      hasDocsDir = true;
      continue;
    }

    rest.push(arg);
  }

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
      args: argv[0] === '--' ? argv.slice(1) : argv,
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
