const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'test-results', 'v0.5.0.4-start-refresh');
const URL = process.env.LIFE_URL || 'http://127.0.0.1:8765/?start-refresh=1';
fs.mkdirSync(OUT, { recursive: true });

const readState = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 360, height: 773 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__LIFE_BOOTED__ === true);
  await page.click('[data-act="new"]');
  const seed = (await readState(page)).run.seed;

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__LIFE_BOOTED__ === true);
  let state = await readState(page);
  assert.equal(state.view, 'birth', 'refresh during birth opened the timeline');
  assert.equal(state.run.phase, 'birth', 'birth phase changed during refresh');
  assert.equal(state.run.seed, seed, 'refresh replaced the started life');
  assert(await page.getByText('出生信息', { exact: true }).isVisible(), 'birth information is not visible after refresh');
  assert(await page.locator('[data-act="birth-next"]').isVisible(), 'birth continuation is unreachable after refresh');
  await page.screenshot({ path: path.join(OUT, 'birth-restored-360x773.png'), fullPage: true });

  await page.click('[data-nav="home"]');
  assert(await page.locator('[data-act="continue"]').isVisible(), 'home does not expose the active life');
  await page.click('[data-act="continue"]');
  state = await readState(page);
  assert.equal(state.view, 'birth', 'continue opened timeline instead of the saved birth step');

  await page.click('[data-act="birth-next"]');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__LIFE_BOOTED__ === true);
  state = await readState(page);
  assert.equal(state.view, 'attributes', 'refresh during attribute allocation opened the timeline');
  assert.equal(state.run.phase, 'attributes', 'attribute phase changed during refresh');
  assert(await page.locator('[data-act="random-attributes"]').isVisible(), 'random allocation is unreachable after refresh');
  await page.screenshot({ path: path.join(OUT, 'attributes-restored-360x773.png'), fullPage: true });

  await page.click('[data-act="attributes-back"]');
  await page.click('[data-nav="home"]');
  await page.click('[data-nav="settings"]');
  assert(await page.locator('[data-act="clear-data"]').isVisible(), 'settings clear-data action is unreachable from an unfinished start');
  assert.equal(errors.length, 0, errors.join(' | '));
  console.log(JSON.stringify({ seed, birthRefresh: true, continueRestoresBirth: true, attributesRefresh: true, settingsReachable: true, errors, screenshots: ['birth-restored-360x773.png', 'attributes-restored-360x773.png'] }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
