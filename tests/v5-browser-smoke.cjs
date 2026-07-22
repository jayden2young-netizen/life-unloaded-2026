const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'test-results', 'v5-browser');
const URL = process.env.LIFE_URL || 'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY = 'life-unloaded-2026-v1';
const BACKUP_KEY = 'life-unloaded-2026-v4.1.0-backup';
fs.mkdirSync(OUT, { recursive: true });

async function waitBoot(page) {
  await page.waitForFunction(() => window.__LIFE_BOOTED__ === true);
}

async function forceChoice(page, id, index) {
  const forced = await page.evaluate(idValue => window.__LIFE_DEBUG__.forceDecision(idValue), id);
  assert.equal(forced, id, `cannot force ${id}`);
  await page.locator(`[data-choice="${index}"]`).click();
  await page.waitForTimeout(240);
  return page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
}

async function fit(page, label) {
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    buttons: [...document.querySelectorAll('button')].map(button => {
      const box = button.getBoundingClientRect();
      return { text: button.textContent.trim().slice(0, 24), left: box.left, right: box.right };
    })
  }));
  assert.ok(result.scrollWidth <= result.innerWidth + 1, `${label}: horizontal overflow`);
  for (const button of result.buttons) {
    assert.ok(button.left >= -1 && button.right <= result.innerWidth + 1, `${label}: button outside viewport: ${button.text}`);
  }
}

let browser;
(async () => {
  browser = await chromium.launch({ headless: true });
  const errors = [];
  const preparePage = async contextValue => {
    const pageValue = await contextValue.newPage();
    pageValue.setDefaultTimeout(6000);
    pageValue.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    pageValue.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    return pageValue;
  };
  let context = await browser.newContext({ viewport: { width: 360, height: 773 }, deviceScaleFactor: 1 });
  let page = await preparePage(context);

  const legacy = {
    schemaVersion: 6,
    gameVersion: '4.1.0',
    meta: { histories: [], codex: [], settings: { haptic: false }, stats: { runs: 2 } },
    run: {
      schemaVersion: 6, seed: 'migration-fixture', age: 24, phase: 'playing', decisionCount: 3,
      res: { cash: 18000, assets: 9000, debt: 12000, health: 74, spirit: 68 },
      lifeFacts: { education: '大学毕业' },
      employment: { status: 'employed', career: '行政助理', salary: 52000 },
      relationships: { partner: { status: 'dating', bond: 63 }, children: [] },
      timeline: [{ age: 23, id: 'legacy-event', kind: 'beat', text: '旧人生仍被保留。' }]
    }
  };
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value: legacy });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitBoot(page);
  const migrated = await page.evaluate(({ key, backup }) => ({
    state: JSON.parse(localStorage.getItem(key)), backup: JSON.parse(localStorage.getItem(backup)),
    run: window.__LIFE_DEBUG__.snapshot()
  }), { key: SAVE_KEY, backup: BACKUP_KEY });
  assert.equal(migrated.state.schemaVersion, 7);
  assert.equal(migrated.backup.gameVersion, '4.1.0');
  assert.equal(migrated.run.age, 24);
  assert.equal(migrated.run.employment.status, 'employed');
  assert.equal(migrated.run.finance.totalDebt, 12000);

  await context.close();
  context = await browser.newContext({ viewport: { width: 360, height: 773 }, deviceScaleFactor: 1 });
  page = await preparePage(context);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitBoot(page);
  await page.locator('[data-act="new"]').click();
  await page.screenshot({ path: path.join(OUT, 'birth-360x773.png'), fullPage: true });
  let run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.finance.netWorth, run.finance.cash, 'family assets leaked into personal net worth');
  assert.equal(run.relationships.childCount, 0);
  assert.ok(run.people.filter(person => person.relation === 'sibling' && person.alive).every(person => run.age >= person.bornAt));

  await page.locator('[data-act="birth-next"]').click();
  for (const key of ['intellect', 'physique', 'stability', 'social']) {
    for (let i = 0; i < 5; i++) await page.locator(`[data-attr="${key}"][data-delta="1"]`).click();
  }
  await page.locator('[data-act="attributes-done"]').click();
  await page.locator('[data-card]').first().click();

  run = await forceChoice(page, 'decision_097', 0);
  assert.ok(Object.values(run.desires).some(value => value && typeof value === 'object' && value.claimed));
  run = await forceChoice(page, 'decision_099', 1);
  assert.equal(run.employment.status, 'employed');
  assert.ok(run.scheduledConsequences.some(item => item.sourceDecisionId === 'decision_099'));

  const due = run.scheduledConsequences.find(item => item.sourceDecisionId === 'decision_099');
  await page.evaluate(schedule => window.__LIFE_DEBUG__.patchRun({ cardAges: [0, 18, 35, 55], scheduledConsequences: [schedule] }), due);
  await page.evaluate(age => window.__LIFE_DEBUG__.forceAge(age), due.dueAge);
  await page.evaluate(() => window.__LIFE_DEBUG__.advance());
  await page.evaluate(() => window.__LIFE_DEBUG__.advance());
  run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  assert.ok(run.usedConsequences.includes(due.id), `scheduled consequence did not return: ${JSON.stringify({ age: run.age, phase: run.phase, yearStarted: run.yearStarted, queue: run.yearQueue.map(item => item.id), schedule: run.scheduledConsequences, timeline: run.timeline.slice(-3) })}`);

  run = await forceChoice(page, 'decision_049', 0);
  assert.equal(run.relationships.partnerStatus, 'dating');
  run = await forceChoice(page, 'decision_057', 0);
  assert.equal(run.relationships.parenthoodIntent, 'planned');
  assert.equal(run.relationships.childCount, 0);
  run = await forceChoice(page, 'decision_058', 0);
  assert.equal(run.relationships.childCount, 1);
  run = await forceChoice(page, 'decision_081', 2);
  assert.equal(run.habits.stage, 'dependent');
  run = await forceChoice(page, 'decision_041', 0);
  assert.equal(run.activity.mode, 'sabbatical');
  run = await forceChoice(page, 'decision_025', 0);
  assert.equal(run.employment.arrangement, 'remote');
  run = await forceChoice(page, 'decision_033', 0);
  assert.ok(['testing', 'operating'].includes(run.business.status));

  await page.locator('[data-act="open-drawer"]').click();
  await page.waitForTimeout(320);
  await fit(page, 'drawer-360x773');
  await page.screenshot({ path: path.join(OUT, 'state-drawer-360x773.png'), fullPage: true });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitBoot(page);
  run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.relationships.childCount, 1);
  assert.equal(run.habits.stage, 'dependent');
  assert.ok(run.scheduledConsequences.length >= 1);

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    age: 70,
    business: { equity: 1.2e12, scale: 'global', status: 'operating' },
    finance: { cash: 8e8, liabilities: [] },
    legacy: { plan: 'documented', medicalDirective: 'documented' },
    health: { physical: 71, mental: 58 }
  }));
  const ending = await page.evaluate(() => window.__LIFE_DEBUG__.finish());
  assert.equal(ending.profileId, 'wealthApex');
  assert.deepEqual([...ending.basis].sort(), ['business', 'wealthApex']);
  assert.equal(Object.keys(ending.axes).length, 6);
  assert.equal(ending.facts.length, 3);
  assert.ok(['常见', '少见', '罕见', '极罕', '传奇'].includes(ending.rarity));
  assert.ok(ending.seed);
  assert.equal(await page.locator('.score-ring').count(), 0);
  assert.equal(await page.locator('[data-act="new"]').count(), 1);

  for (const [width, height] of [[360, 773], [360, 640], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await fit(page, `ending-${width}x${height}`);
    await page.screenshot({ path: path.join(OUT, `ending-${width}x${height}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, migration: true, consequence: due.eventId, ending: ending.title, screenshots: fs.readdirSync(OUT).sort(), errors }, null, 2));
  await browser.close();
  browser = null;
})().catch(error => {
  console.error(error);
  if (browser) browser.close().catch(() => {});
  process.exitCode = 1;
});
