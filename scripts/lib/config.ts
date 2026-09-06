import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseSiteConfig } from '../../src/docs/siteConfig.ts';

export const CONFIG_FILE = 'dock5.config.json';

export const loadSiteConfig = async (inputDir: string) => {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(inputDir, CONFIG_FILE), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return parseSiteConfig({});
    throw error;
  }
  try {
    return parseSiteConfig(JSON.parse(raw));
  } catch (error) {
    throw new Error(
      `Invalid ${CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};
