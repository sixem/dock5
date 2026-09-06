export type SiteLink = { label: string; href: string };
export type SiteConfig = {
  title: string | null;
  description: string | null;
  logo: string | null;
  favicon: string | null;
  links: SiteLink[];
};

export const parseSiteConfig = (value: unknown): SiteConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('expected an object');
  }
  const config = value as Record<string, unknown>;
  for (const key of Object.keys(config)) {
    if (!['title', 'description', 'logo', 'favicon', 'links'].includes(key)) {
      throw new Error(`unknown option "${key}"`);
    }
  }
  const text = (key: string): string | null => {
    if (!(key in config)) return null;
    const result = config[key];
    if (typeof result !== 'string' || !result.trim()) {
      throw new Error(`${key} must be a non-empty string`);
    }
    return result.trim();
  };
  const asset = (key: string) => {
    const result = text(key);
    if (result === null) return null;
    const normalized = result.replaceAll('\\', '/').replace(/^\.\//, '');
    if (
      !normalized ||
      normalized.startsWith('/') ||
      /[:?#]/.test(normalized) ||
      normalized.split('/').some((part) => !part || part.startsWith('.'))
    ) {
      throw new Error(`${key} must be a file path inside the docs folder`);
    }
    return normalized;
  };
  if ('links' in config && !Array.isArray(config.links)) {
    throw new Error('links must be an array');
  }
  const links = ((config.links ?? []) as unknown[]).map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`links[${index}] must be an object`);
    }
    const link = entry as Record<string, unknown>;
    if (
      Object.keys(link).some((key) => key !== 'label' && key !== 'href') ||
      typeof link.label !== 'string' ||
      !link.label.trim() ||
      typeof link.href !== 'string' ||
      !link.href.trim()
    ) {
      throw new Error(`links[${index}] requires label and href strings`);
    }
    const href = link.href.trim();
    if (!href.startsWith('#/')) {
      let url: URL;
      try {
        url = new URL(href);
      } catch {
        throw new Error(
          `links[${index}].href must be an absolute URL or #/page link`,
        );
      }
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
        throw new Error(`links[${index}].href uses an unsupported protocol`);
      }
    }
    return { label: link.label.trim(), href };
  });
  return {
    title: text('title'),
    description: text('description'),
    logo: asset('logo'),
    favicon: asset('favicon'),
    links,
  };
};
