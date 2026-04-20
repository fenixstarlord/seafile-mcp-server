import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError, loadConfig } from '../config.js';

describe('loadConfig', () => {
  const env = { ...process.env };

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...env };
  });

  it('defaults to repo-token mode', () => {
    vi.stubEnv('SEAFILE_URL', 'https://seafile.example.com');
    vi.stubEnv('SEAFILE_TOKEN', 'repo-token');
    delete process.env.SEAFILE_AUTH_MODE;
    delete process.env.SEAFILE_REPO_ID;

    const config = loadConfig();

    expect(config.SEAFILE_AUTH_MODE).toBe('repo-token');
    expect(config.SEAFILE_REPO_ID).toBeUndefined();
  });

  it('requires repo id in account-token mode', () => {
    vi.stubEnv('SEAFILE_URL', 'https://seafile.example.com');
    vi.stubEnv('SEAFILE_TOKEN', 'account-token');
    vi.stubEnv('SEAFILE_AUTH_MODE', 'account-token');
    delete process.env.SEAFILE_REPO_ID;

    expect(() => loadConfig()).toThrowError(ConfigError);
    expect(() => loadConfig()).toThrowError(/SEAFILE_REPO_ID is required/);
  });

  it('accepts account-token mode with repo id', () => {
    vi.stubEnv('SEAFILE_URL', 'https://seafile.example.com');
    vi.stubEnv('SEAFILE_TOKEN', 'account-token');
    vi.stubEnv('SEAFILE_AUTH_MODE', 'account-token');
    vi.stubEnv('SEAFILE_REPO_ID', '550e8400-e29b-41d4-a716-446655440000');

    const config = loadConfig();

    expect(config.SEAFILE_AUTH_MODE).toBe('account-token');
    expect(config.SEAFILE_REPO_ID).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
