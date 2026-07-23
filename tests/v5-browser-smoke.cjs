const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'test-results', 'v5-browser');
const URL = process.env.LIFE_URL || 'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY = 'life-unloaded-2026-v1';
fs.mkdirSync(OUT, { recursive: true });

async function waitBoot(page) {
  await page.waitForFunction(() => window.__LIFE_BOOTED__ === true);
}

async function forceChoice(page, id, index) {
  const forced = await page.evaluate(idValue => window.__LIFE_DEBUG__.forceDecision(idValue), id);
  assert.equal(forced, id, `cannot force ${id}`);
  if (await page.locator('[data-act="episode-next"]').count()) await page.locator('[data-act="episode-next"]').click();
  await page.locator(`[data-choice="${index}"]`).click();
  if (await page.locator('[data-act="episode-next"]').count()) await page.locator('[data-act="episode-next"]').click();
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
    schemaVersion: 7,
    gameVersion: '0.5.4',
    meta: {
      histories: [{ title: '保留的人生记录', age: 72, seed: 'finished-life' }],
      codex: ['codex_01'], settings: { haptic: false }, stats: { runs: 2 },
      seen: { events: { beat_001: 1 }, cards: {}, families: {}, endings: {} },
      recentSeeds: ['finished-life']
    },
    run: {
      schemaVersion: 7, gameVersion: '0.5.4', seed: 'migration-fixture', age: 24, phase: 'playing', decisionCount: 3,
      res: { cash: 18000, assets: 9000, debt: 12000, health: 74, spirit: 68 },
      lifeFacts: { education: '大学毕业' },
      employment: { status: 'employed', career: '行政助理', salary: 52000 },
      relationships: { partner: { status: 'dating', bond: 63 }, children: [] },
      timeline: [{ age: 23, id: 'legacy-event', kind: 'beat', text: '旧人生仍被保留。' }]
    }
  };
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('life-unloaded-2026-v0.4.1-backup', 'legacy-backup');
  }, { key: SAVE_KEY, value: legacy });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitBoot(page);
  const migrated = await page.evaluate(key => ({
    state: JSON.parse(localStorage.getItem(key)),
    legacyKeys: Object.keys(localStorage).filter(item => item.startsWith('life-unloaded-2026-') && item !== key),
    run: window.__LIFE_DEBUG__.snapshot()
  }), SAVE_KEY);
  assert.equal(migrated.state.schemaVersion, 8);
  assert.equal(migrated.state.gameVersion, '0.5.6');
  assert.equal(migrated.run, null, 'old active life should not survive a version update');
  assert.deepEqual(migrated.legacyKeys, [], 'legacy snapshots should be removed');
  assert.equal(migrated.state.meta.histories[0].title, '保留的人生记录');
  assert.deepEqual(migrated.state.meta.codex, ['codex_01']);
  assert.equal(migrated.state.meta.settings.haptic, false);
  assert.equal(migrated.state.meta.stats.runs, 2);
  assert.equal(migrated.state.meta.seen.events.beat_001, 1);
  assert.deepEqual(migrated.state.meta.recentSeeds, ['finished-life']);
  assert.equal(await page.locator('[data-act="new"]').count(), 1);
  assert.match(await page.locator('.migration-note').innerText(), /旧版本的活动人生已结束/);

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
  await page.waitForTimeout(320);
  assert.equal(await page.locator('[data-act="random-attributes"]').count(), 1);
  await page.locator('[data-act="random-attributes"]').click();
  await page.waitForTimeout(320);
  run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.points, 0);
  assert.equal(Object.values(run.attrs).reduce((sum, value) => sum + value, 0), 26);
  assert.ok(Object.values(run.attrs).every(value => value >= 1 && value <= 10));
  assert.equal(await page.locator('[data-act="attributes-done"]:not([disabled])').count(), 1);
  await fit(page, 'random-attributes-360x773');
  await page.screenshot({ path: path.join(OUT, 'random-attributes-360x773.png'), fullPage: true });
  await page.locator('[data-act="attributes-done"]').click();
  await page.locator('[data-card]').first().click();

  run = await forceChoice(page, 'decision_103', 0);
  assert.ok(Object.values(run.desires).some(value => value && typeof value === 'object' && value.claimed));
  run = await forceChoice(page, 'decision_105', 1);
  assert.equal(run.employment.status, 'employed');
  assert.ok(run.scheduledConsequences.some(item => item.sourceDecisionId === 'decision_105'));

  const due = run.scheduledConsequences.find(item => item.sourceDecisionId === 'decision_105');
  await page.evaluate(schedule => window.__LIFE_DEBUG__.patchRun({ cardAges: [0, 18, 35, 55], scheduledConsequences: [schedule] }), due);
  await page.evaluate(age => window.__LIFE_DEBUG__.forceAge(age), due.dueAge);
  await page.evaluate(() => window.__LIFE_DEBUG__.advance());
  await page.evaluate(() => window.__LIFE_DEBUG__.advance());
  run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  assert.ok(run.usedConsequences.includes(due.id), `scheduled consequence did not return: ${JSON.stringify({ age: run.age, phase: run.phase, yearStarted: run.yearStarted, queue: run.yearQueue.map(item => item.id), schedule: run.scheduledConsequences, timeline: run.timeline.slice(-3) })}`);

  run = await forceChoice(page, 'decision_048', 0);
  assert.equal(run.relationships.partnerStatus, 'dating');
  run = await forceChoice(page, 'decision_056', 0);
  assert.equal(run.relationships.parenthoodIntent, 'planned');
  assert.equal(run.relationships.childCount, 0);
  run = await forceChoice(page, 'decision_057', 0);
  assert.equal(run.relationships.childCount, 1);
  run = await forceChoice(page, 'decision_080', 2);
  assert.equal(run.habits.type, 'gambling');
  assert.equal(run.habits.stage, 'repeating');
  run = await forceChoice(page, 'decision_040', 0);
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
  assert.equal(run.habits.stage, 'repeating');
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

  await page.setViewportSize({ width: 360, height: 773 });
  await page.locator('[data-act="new"]').click();
  await page.locator('[data-nav="home"]').click();
  await page.locator('[data-nav="settings"]').click();
  await page.waitForTimeout(320);
  assert.equal(await page.locator('[data-act="clear-data"]').count(), 1);
  await fit(page, 'settings-360x773');
  await page.screenshot({ path: path.join(OUT, 'settings-clear-data-360x773.png'), fullPage: true });
  await page.evaluate(() => localStorage.setItem('life-unloaded-2026-v0.4.1-backup', 'legacy-backup'));
  page.once('dialog', dialog => dialog.accept());
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.locator('[data-act="clear-data"]').click()
  ]);
  await waitBoot(page);
  const remainingGameKeys = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('life-unloaded-2026-')));
  assert.deepEqual(remainingGameKeys, []);
  assert.equal(await page.locator('[data-act="new"]').count(), 1);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, migration: { recordsPreserved: true, activeRunCleared: true, backupsRemoved: true }, clearData: true, consequence: due.eventId, ending: ending.title, screenshots: fs.readdirSync(OUT).sort(), errors }, null, 2));
  await browser.close();
  browser = null;
})().catch(error => {
  console.error(error);
  if (browser) browser.close().catch(() => {});
  process.exitCode = 1;
});
