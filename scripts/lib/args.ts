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

type DocsArgsToken =
  | {
      kind: 'option';
      name: string;
      rawName: string;
      index: number;
      value?: unknown;
      inlineValue?: boolean;
    }
  | { kind: 'positional'; index: number; value: string }
  | { kind: 'option-terminator'; index: number };

export const parseDocsArgs = (
  argv: string[],
  { defaultDocsDir }: ParseDocsArgsOptions,
): ParsedDocsArgs => {
  // We parse only a small set of "docs selection" flags and return the rest
  // unchanged so dev/build can forward args to Vite.
  //
  // Example:
  //   pnpm dev -- --docs ./my-docs -- --open
  //
  // Inside the script, argv becomes:
  //   ["--docs","./my-docs","--","--open"]
  //
  // We must remove "--docs ./my-docs" but keep the "-- --open" segment intact.
  let parsed: {
    values: Record<string, unknown>;
    tokens: DocsArgsToken[];
  };

  try {
    parsed = parseArgs({
      args: argv,
      options: {
        docs: { type: 'string' },
        input: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
      strict: false,
      tokens: true,
    }) as unknown as {
      values: Record<string, unknown>;
      tokens: DocsArgsToken[];
    };
  } catch (err) {
    throw new Error(
      `Invalid args: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const docsDirFromFlag =
    (typeof parsed.values.docs === 'string' && parsed.values.docs) ||
    (typeof parsed.values.input === 'string' && parsed.values.input) ||
    null;

  const removeIndexes = new Set<number>();

  for (const token of parsed.tokens) {
    if (token.kind !== 'option') continue;

    if (token.name === 'help') {
      removeIndexes.add(token.index);
      continue;
    }

    if (token.name === 'docs' || token.name === 'input') {
      removeIndexes.add(token.index);

      // When the value is provided as a separate arg (`--docs foo`), remove it.
      if (token.inlineValue === false) {
        removeIndexes.add(token.index + 1);
      }
    }
  }

  const rest = argv.filter((_, idx) => !removeIndexes.has(idx));

  return {
    docsDir: docsDirFromFlag ?? defaultDocsDir,
    rest,
    help: Boolean(parsed.values.help),
  };
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
