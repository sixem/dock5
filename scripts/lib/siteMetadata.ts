import * as fs from 'node:fs/promises';
import type { HtmlTagDescriptor, Plugin } from 'vite';
import { escapeHtml } from '../site/markdown/compiler/text.ts';

export const siteMetadataPlugin = (manifestPath: string): Plugin => ({
  name: 'dock5-site-metadata',
  async transformIndexHtml(html) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as {
      title: string;
      defaultTheme?: 'dark' | 'light';
      description?: string | null;
      favicon?: string | null;
    };
    const defaultTheme = manifest.defaultTheme === 'light' ? 'light' : 'dark';
    const tags: HtmlTagDescriptor[] = [
      {
        tag: 'script',
        children: `(()=>{let theme="${defaultTheme}";try{const saved=localStorage.getItem('dock5.theme');if(saved==='dark'||saved==='light')theme=saved}catch{}document.documentElement.dataset.theme=theme})()`,
        injectTo: 'head-prepend',
      },
    ];
    if (manifest.description)
      tags.push({
        tag: 'meta',
        attrs: { name: 'description', content: manifest.description },
        injectTo: 'head' as const,
      });
    if (manifest.favicon) {
      html = html.replace(/<link\b[^>]*\brel=["']icon["'][^>]*>/gi, '');
      tags.push({
        tag: 'link',
        attrs: { rel: 'icon', href: manifest.favicon },
        injectTo: 'head' as const,
      });
    }
    return {
      tags,
      html: html.replace(
        /<title>[\s\S]*?<\/title>/i,
        () => `<title>${escapeHtml(manifest.title)}</title>`,
      ),
    };
  },
});
