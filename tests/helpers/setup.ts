import { afterEach, vi } from 'vitest';
import { loadLocalEnvironment } from '../../src/server/config';

loadLocalEnvironment();

afterEach(() => {
  vi.restoreAllMocks();
});

