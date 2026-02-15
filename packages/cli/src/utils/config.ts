import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import envPaths from 'env-paths';

const paths = envPaths('skilljack', { suffix: '' });
const configFile = join(paths.config, 'config.json');

export type Config = {
  anthropicApiKey?: string;
};

export function loadConfig(): Config {
  try {
    return JSON.parse(readFileSync(configFile, 'utf-8')) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(cfg: Config): void {
  mkdirSync(paths.config, { recursive: true });
  writeFileSync(configFile, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
}

export function setApiKey(key: string): void {
  const cfg = loadConfig();
  cfg.anthropicApiKey = key;
  saveConfig(cfg);
}

export function getApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  return loadConfig().anthropicApiKey;
}
