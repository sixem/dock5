export type SiteLink = { label: string; href: string };
export type NavOverride = { label?: string; order?: number };
export type SiteConfig = {
  navigation: Record<string, NavOverride>;
  exclude: string[];
  defaultTheme: 'dark' | 'light';
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
    if (
      ![
        'title',
        'description',
        'logo',
        'favicon',
        'links',
        'defaultTheme',
        'navigation',
        'exclude',
      ].includes(key)
    ) {
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
  const navigation: Record<string, NavOverride> = {};
  if ('navigation' in config) {
    if (
      !config.navigation ||
      typeof config.navigation !== 'object' ||
      Array.isArray(config.navigation)
    )
      throw new Error('navigation must be an object');
    for (const [route, raw] of Object.entries(config.navigation)) {
      if (
        !/^\/(?:[^/#]+(?:\/[^/#]+)*)?$/.test(route) ||
        route.split('/').some((part) => part === '.' || part === '..')
      )
        throw new Error('navigation keys must be page or folder routes');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error(`navigation ${route} must be an object`);
      const entry = raw as Record<string, unknown>;
      if (Object.keys(entry).some((key) => !['label', 'order'].includes(key)))
        throw new Error(`unknown navigation option for ${route}`);
      if (
        'label' in entry &&
        (typeof entry.label !== 'string' || !entry.label.trim())
      )
        throw new Error(`navigation ${route} label must be a non-empty string`);
      if (
        'order' in entry &&
        (typeof entry.order !== 'number' || !Number.isFinite(entry.order))
      )
        throw new Error(`navigation ${route} order must be a finite number`);
      navigation[route] = {
        ...('label' in entry ? { label: (entry.label as string).trim() } : {}),
        ...('order' in entry ? { order: entry.order as number } : {}),
      };
    }
  }
  if ('exclude' in config && !Array.isArray(config.exclude))
    throw new Error('exclude must be an array');
  const exclude = ((config.exclude ?? []) as unknown[]).map((value) => {
    if (typeof value !== 'string')
      throw new Error(
        'exclude entries must be docs-relative file or folder paths',
      );
    const normalized = value
      .replaceAll('\\', '/')
      .replace(/^\.\//, '')
      .replace(/\/$/, '');
    if (
      !normalized ||
      /[:*?#]/.test(normalized) ||
      normalized
        .split('/')
        .some((part) => !part || part === '.' || part === '..')
    )
      throw new Error(
        'exclude entries must be docs-relative file or folder paths',
      );
    return normalized;
  });
  const defaultTheme = config.defaultTheme ?? 'dark';
  if (
    'defaultTheme' in config &&
    config.defaultTheme !== 'dark' &&
    config.defaultTheme !== 'light'
  ) {
    throw new Error('defaultTheme must be dark or light');
  }
  return {
    navigation,
    exclude,
    defaultTheme: defaultTheme as 'dark' | 'light',
    title: text('title'),
    description: text('description'),
    logo: asset('logo'),
    favicon: asset('favicon'),
    links,
  };
};
