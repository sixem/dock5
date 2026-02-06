// Small path helpers to keep other modules platform-agnostic.
import * as path from 'node:path';

export const toPosixPath = (p: string) => p.split(path.sep).join('/');
