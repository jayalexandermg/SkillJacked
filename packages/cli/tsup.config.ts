import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  noExternal: ['@skilljack/core'],
  external: ['@anthropic-ai/sdk', 'youtube-caption-extractor'],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
