import * as fs from 'node:fs/promises';
import type { Plugin } from 'vite';
import { escapeHtml } from '../site/markdown/compiler/text.ts';

export const siteTitlePlugin = (manifestPath: string): Plugin => ({
  name: 'dock5-site-title',
  async transformIndexHtml(html) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as {
      title: string;
    };
    return html.replace(
      /<title>[\s\S]*?<\/title>/i,
      () => `<title>${escapeHtml(manifest.title)}</title>`,
    );
  },
});
