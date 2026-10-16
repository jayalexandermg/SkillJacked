import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { content, headings, ordinaryLines } from './heading-fixture.mjs';

const testDir = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(testDir, '..');
const repoDir = resolve(webDir, '../..');
const require = createRequire(join(webDir, 'package.json'));
const rootRequire = createRequire(join(repoDir, 'package.json'));
const { build } = createRequire(rootRequire.resolve('tsx'))('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const JSZip = require('jszip');
const artifacts = resolve(process.env.ARTIFACT_DIR || join(tmpdir(), 'skilljacked-heading-review'));
const baselineRef = process.env.BASELINE_REF;
const gold = 'rgb(224, 200, 102)';
const temporary = await mkdtemp(join(tmpdir(), 'skilljacked-heading-fixture-'));
await mkdir(artifacts, { recursive: true });

try {
  const inputCss = join(temporary, 'input.css');
  const outputCss = join(temporary, 'styles.css');
  await writeFile(inputCss, (await readFile(join(webDir, 'src/styles/globals.css'), 'utf8'))
    .replace(/^@import url\([^\n]+\);\n/m, ''));
  execFileSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-i', inputCss,
    '-o', outputCss, '-c', join(webDir, 'tailwind.config.ts')], { cwd: webDir, stdio: 'pipe' });
  let baselinePath;
  if (baselineRef) {
    baselinePath = join(temporary, 'baseline-skill-lines.tsx');
    await writeFile(baselinePath, execFileSync('git', ['show', `${baselineRef}:packages/web/src/components/skill-lines.tsx`],
      { cwd: repoDir }));
  }
  for (const version of baselineRef ? ['before', 'after'] : ['after']) {
    await build({
      entryPoints: [join(testDir, 'heading-surfaces.fixture.tsx')],
      outfile: join(temporary, `${version}.js`),
      bundle: true,
      platform: 'browser',
      format: 'esm',
      jsx: 'automatic',
      tsconfig: join(webDir, 'tsconfig.json'),
      nodePaths: [join(webDir, 'node_modules')],
      define: { 'process.env.NODE_ENV': '"development"' },
      alias: version === 'before' ? { '@/components/skill-lines': baselinePath } : {},
      plugins: [{
        name: 'fixture-auth-boundary',
        setup(plugin) {
          plugin.onResolve({ filter: /^@clerk\/nextjs$/ }, () => ({ path: 'clerk', namespace: 'fixture' }));
          plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            contents: 'export function SignUpButton({children}) { return children; }', loader: 'js',
          }));
        },
      }],
    });
  }
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (['/before.js', '/after.js', '/styles.css'].includes(pathname)) {
        response.setHeader('Content-Type', pathname.endsWith('.css') ? 'text/css' : 'text/javascript');
        response.end(await readFile(join(temporary, pathname.slice(1))));
      } else if (pathname === '/') {
        const version = new URL(request.url, 'http://localhost').searchParams.get('version') === 'before' ? 'before' : 'after';
        response.setHeader('Content-Type', 'text/html');
        response.end(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><style>:root { --font-syne: sans-serif; --font-dm-sans: sans-serif; --font-jetbrains-mono: monospace; }</style></head><body><div id="root"></div><script type="module" src="/${version}.js"></script></body></html>`);
      } else {
        response.writeHead(404).end();
      }
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1300 },
      permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    const unexpectedRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin && ['/', '/before.js', '/after.js', '/styles.css'].includes(url.pathname)) {
        return route.continue();
      }
      unexpectedRequests.push(url.href);
      return route.abort();
    });
    const checks = [];
    const pass = (message) => { checks.push(message); console.log(`PASS ${message}`); };
    for (const version of baselineRef ? ['before', 'after'] : ['after']) {
      for (const surface of ['preview', 'library', 'share']) {
        await page.goto(`${origin}/?surface=${surface}&version=${version}`);
        if (surface === 'preview') await page.getByRole('button', { name: 'Preview 3 skills' }).click();
        const reader = page.locator('pre').first();
        await reader.waitFor();
        const lineData = await reader.locator(':scope > div').evaluateAll((elements) => elements.map((element) => ({
          text: element.textContent,
          color: getComputedStyle(element).color,
          weight: getComputedStyle(element).fontWeight,
          height: element.getBoundingClientRect().height,
        })));
        assert.deepEqual(lineData.map((line) => line.text), content.split('\n').map((line) => line || '\u00a0'));
        const frontmatterKeys = await reader.locator('span.text-accent').evaluateAll((elements) =>
          elements.map((element) => ({ text: element.textContent, color: getComputedStyle(element).color })));
        assert.deepEqual(frontmatterKeys, ['name:', 'description:', 'source:', 'generated_by:']
          .map((text) => ({ text, color: gold })));
        for (const heading of headings) {
          const line = lineData.find((line) => line.text === heading);
          assert.equal(line.color, version === 'after' ? gold : 'rgb(248, 250, 252)', `${surface}: ${heading}`);
          assert.ok(Number(line.weight) >= 600);
          assert.ok(line.height >= 20, `${surface}: readable line spacing`);
        }
        if (version === 'after') {
          for (const ordinary of ordinaryLines) {
            const line = lineData.find((line) => line.text === ordinary);
            assert.notEqual(line.color, gold, `${surface}: ordinary/code text stays unaccented`);
            assert.ok(Number(line.weight) < 600, `${surface}: ordinary/code text stays unbolded`);
          }
        }
        pass(`${version} ${surface}: literal source, frontmatter, heading color/weight/spacing${version === 'after' ? ', fence and body exclusions' : ''}`);
        await page.screenshot({ path: join(artifacts, `${surface}-${version}.png`), fullPage: true });
        if (surface !== 'share') {
          const dialog = page.getByRole('dialog');
          await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
          assert.equal(await page.evaluate(() => navigator.clipboard.readText()), content);
          const downloadPromise = page.waitForEvent('download');
          await dialog.getByRole('button', { name: 'Download', exact: true }).click();
          const download = await downloadPromise;
          assert.equal(download.suggestedFilename(), 'detect-and-avoid-zombie-ui.zip');
          const zip = await JSZip.loadAsync(await readFile(await download.path()));
          const files = Object.values(zip.files).filter((file) => !file.dir);
          assert.deepEqual(files.map((file) => file.name), ['detect-and-avoid-zombie-ui/SKILL.md']);
          assert.deepEqual(await files[0].async('nodebuffer'), Buffer.from(content, 'utf8'));
          pass(`${version} ${surface}: actual clipboard and downloaded SKILL.md bytes unchanged`);
        }
        if (surface === 'preview') {
          for (const lockedName of ['preview-placeholder', 'locked-placeholder']) {
            const dialog = page.getByRole('dialog');
            await dialog.getByRole('button', { name: lockedName, exact: true }).click();
            const placeholder = dialog.locator('pre');
            assert.equal(await placeholder.getAttribute('aria-hidden'), 'true');
            assert.match(await placeholder.getAttribute('class'), /blur-sm/);
            assert.match(await placeholder.textContent(), /unlocked-after-sign-up/);
            assert.doesNotMatch(await placeholder.textContent(), /Detect and Avoid Zombie UI/);
            assert.equal(await dialog.getByRole('button', { name: 'Copy', exact: true }).count(), 0);
            assert.equal(await dialog.getByRole('button', { name: 'Download', exact: true }).count(), 0);
            await dialog.getByRole('button', { name: 'Sign up free', exact: true }).waitFor();
          }
          pass(`${version} preview: preview/locked tiers keep placeholders, blur and action gating`);
        }
      }
    }
    assert.deepEqual(errors, [], 'no browser runtime errors');
    assert.deepEqual(unexpectedRequests, [], 'no API or external requests');
    pass('no browser runtime errors, API calls, or external requests');
    await writeFile(join(artifacts, 'results.json'), JSON.stringify({ checks, baselineRef: baselineRef ?? null,
      browser: browser.version(), viewport: { width: 1440, height: 1300 },
      note: 'Actual UI components with local fixtures and system font fallbacks; Clerk sign-up wrapper is inert.' }, null, 2));
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
