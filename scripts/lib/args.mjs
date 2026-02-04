// Small argument parsing helpers for scripts.

export const parseDocsArgs = (argv, { defaultDocsDir }) => {
  let docsDir = defaultDocsDir;
  const rest = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === '--docs' || arg === '--input') {
      docsDir = argv[i + 1] ?? docsDir;
      i += 1;
      continue;
    }

    rest.push(arg);
  }

  return { docsDir, rest };
};
