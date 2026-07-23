const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'test-results', 'v0.5.0.4-natural-random');
const URL = process.env.LIFE_URL || `http://127.0.0.1:8765/?natural=${Date.now()}`;
fs.mkdirSync(OUT, { recursive: true });

const stateText = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));

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
  await page.click('[data-act="birth-next"]');
  await page.click('[data-act="random-attributes"]');
  await page.click('[data-act="attributes-done"]');

  const snapshots = [];
  let lastRecordedAge = -5;
  for (let step = 0; step < 600; step++) {
    const view = await stateText(page);
    const run = view.run;
    if (run && run.age >= lastRecordedAge + 5) {
      snapshots.push({ age: run.age, cash: run.finance.cash, debt: run.finance.totalDebt, physical: run.health.physical, mental: run.health.mental, healthStatus: run.health.status, choices: run.decisionCount, employment: run.employment.status, activity: run.activity.mode });
      lastRecordedAge = run.age;
    }
    if (view.view === 'ending') break;
    const cards = page.locator('[data-card]');
    if (await cards.count()) {
      await cards.nth(Math.floor(Math.random() * await cards.count())).click();
    } else {
      const choices = page.locator('[data-choice]');
      if (await choices.count()) await choices.nth(Math.floor(Math.random() * await choices.count())).click();
      else await page.locator('[data-act="advance"]').click();
    }
    await page.waitForTimeout(190);
  }

  await page.waitForSelector('.ending-share-card', { timeout: 10000 });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('life-unloaded-2026-v1')));
  const run = save.run;
  await page.screenshot({ path: path.join(OUT, 'ending.png'), fullPage: true });
  assert.equal(errors.length, 0, errors.join(' | '));
  assert(!snapshots.some(item => item.age < 18 && item.debt > 0), 'natural run created personal debt before adulthood');
  const healthDecisionAges = run.decisionHistory.filter(item => /^decision_07[3-9]$|^decision_080$/.test(item.eventId)).map(item => item.age);
  const firstHealthDecisionAge = healthDecisionAges[0] ?? null;
  if (firstHealthDecisionAge !== null) {
    const before = run.decisionHistory.find(item => item.age === firstHealthDecisionAge && /^decision_07[3-9]$|^decision_080$/.test(item.eventId));
    assert(before, 'health decision lacks decision history');
  }
  const crisisTag = run.ending.tags.includes('健康危机');
  const actualCrisis = run.health.status === 'limited' || run.health.conditionSeverity >= 35 || run.health.physical < 35;
  assert.equal(crisisTag, actualCrisis, 'ending health-crisis tag disagrees with final health state');
  const trackCounts = Object.fromEntries(Object.entries(Object.groupBy(run.decisionHistory, item => item.eventId)).map(([id, items]) => [id, items.length]));
  const report = { seed: run.seed, gender: run.gender, origin: `${run.location.name} · ${run.originHousehold.familyName}`, attrs: run.attrs, lifespan: run.age, decisions: run.decisionCount, firstHealthDecisionAge, final: { cash: run.finance.cash, debt: run.finance.totalDebt, netWorth: run.finance.netWorth, physical: run.health.physical, mental: run.health.mental, healthStatus: run.health.status, conditionSeverity: run.health.conditionSeverity, safety: run.ending.axes.安全, tags: run.ending.tags, title: run.ending.title }, snapshots, decisionIds: trackCounts, errors, screenshot: path.join(OUT, 'ending.png') };
  fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
