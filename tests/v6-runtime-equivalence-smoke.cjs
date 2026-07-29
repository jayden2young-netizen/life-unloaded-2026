const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(__dirname, 'fixtures', 'v0.6.0-runtime-equivalence.json');
const URL = process.env.LIFE_URL || 'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY = 'life-unloaded-2026-v1';
const CHROME =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const RECORD = process.env.RECORD_EQUIVALENCE === '1';
const DEBUG_TRACE = process.env.DEBUG_EQUIVALENCE === '1';
const SEED = 'v061-readable-runtime-equivalence';
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const REPRESENTATIVE_EVENT = DATA.events.find(event => event.id === 'decision_043');
const REPRESENTATIVE_CHOICE = REPRESENTATIVE_EVENT.choices[0];
let browser;

function summarizeRun(run, label) {
  return {
    label,
    age: run.age,
    phase: run.phase,
    rngState: run.rngState,
    currentDecisionId: run.currentDecision?.id || null,
    sceneQueue: run.sceneQueue.map(scene => [
      scene.kind,
      scene.event?.id || scene.eventId || null,
      scene.choice?.id || scene.choiceId || null,
    ]),
    cards: [...run.cards],
    cardOptions: (run.cardOptions || []).map(card => card.id),
    attrs: [
      run.attrs.intellect,
      run.attrs.physique,
      run.attrs.looks,
      run.attrs.stability,
      run.attrs.social,
      run.attrs.ambition,
    ],
    capabilities: [
      run.capabilities.skill,
      run.capabilities.portableSkill,
      run.capabilities.employability,
      run.capabilities.evidence,
      run.capabilities.network,
      run.capabilities.healthLiteracy,
    ],
    education: [
      run.education.level,
      run.education.status,
      run.education.nextStage,
      run.education.achievement,
      run.education.readiness,
    ],
    employment: [
      run.employment.status,
      run.employment.occupation || null,
      run.employment.rank,
      run.employment.firstJobOutcome,
    ],
    finance: [
      run.finance.cash,
      run.finance.available,
      run.finance.totalDebt,
      run.finance.netWorth,
    ],
    health: [run.health.physical, run.health.mental, run.health.status],
    relationships: [
      run.relationships.partnerStatus,
      run.relationships.activePartnerId,
      run.people.filter(person => person.relation === 'child').length,
    ],
    decisionHistory: run.decisionHistory.slice(-2).map(item => ({
      eventId: item.eventId,
      choiceId: item.choiceId,
      result: item.result,
    })),
    timelineIds: run.timeline.slice(-8).map(item => item.id),
  };
}

async function snapshot(page, trace, label) {
  const run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  trace.push(summarizeRun(run, label));
  if (DEBUG_TRACE) process.stderr.write(`${label}: age=${run.age} phase=${run.phase}\n`);
  return run;
}

async function advanceDeterministically(page, trace, step) {
  let run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  if (run.phase === 'card') {
    const card = page.locator('[data-card]').first();
    assert.equal(await card.count(), 1, `step ${step}: missing card`);
    await card.click();
    await snapshot(page, trace, `advance-${step}:card`);
    return;
  }

  if (run.phase === 'decision') {
    if (run.sceneQueue[0]?.kind === 'situation' || run.sceneQueue[0]?.kind === 'result') {
      await page.locator('[data-act="episode-next"]').click();
      await snapshot(page, trace, `advance-${step}:${run.sceneQueue[0].kind}`);
      return;
    }
    const enabled = page.locator('[data-choice]:not([disabled])').first();
    assert.equal(await enabled.count(), 1, `step ${step}: missing enabled choice`);
    const index = Number(await enabled.getAttribute('data-choice'));
    const choiceId = run.currentDecision?.choices?.[index]?.id || `choice-${index}`;
    await enabled.click();
    await snapshot(page, trace, `advance-${step}:${choiceId}`);
    return;
  }

  await page.locator('[data-act="advance"]').click();
  await snapshot(page, trace, `advance-${step}:tap`);
}

(async () => {
  assert.deepEqual(
    [DATA.schemaVersion, DATA.contentRevision],
    [11, 21],
    'equivalence fixture only applies to the v0.6.3 Schema 11 runtime',
  );

  browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const context = await browser.newContext({
    viewport: { width: 360, height: 773 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  const initialSave = {
    schemaVersion: DATA.schemaVersion,
    gameVersion: DATA.version,
    meta: {
      schemaVersion: DATA.schemaVersion,
      gameVersion: DATA.version,
      histories: [],
      codex: [],
      settings: { haptic: false, reducedMotion: true },
      stats: { runs: 0 },
      seen: { events: {}, cards: {}, families: {}, endings: {} },
      recentSeeds: [],
    },
    run: {
      seed: SEED,
      schemaVersion: DATA.schemaVersion,
      gameVersion: DATA.version,
      contentRevision: DATA.contentRevision,
      phase: 'birth',
    },
  };

  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: initialSave },
  );
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__LIFE_BOOTED__ === true);

  const trace = [];
  await snapshot(page, trace, 'boot');
  await page.locator('[data-act="birth-next"]').click();
  await page.locator('[data-act="random-attributes"]').click();
  await snapshot(page, trace, 'random-attributes');
  await page.locator('[data-act="attributes-done"]').click();
  await snapshot(page, trace, 'card-draw-0');
  await page.locator('[data-card]').first().click();
  await snapshot(page, trace, 'card-selected-0');

  for (let step = 1; step <= 8; step += 1) {
    await advanceDeterministically(page, trace, step);
  }

  await page.evaluate(() => {
    const run = window.__LIFE_DEBUG__.snapshot();
    const cards = Array.from(new Set([...run.cards, 'card_01']));
    window.__LIFE_DEBUG__.patchRun({
      age: 18,
      phase: 'playing',
      cards,
      cardAges: [0],
      sceneQueue: [],
      currentDecision: null,
      yearStarted: true,
    });
  });
  assert.equal(
    await page.evaluate(() => window.__LIFE_DEBUG__.forceDecision('decision_043')),
    'decision_043',
  );
  await snapshot(page, trace, 'card-interaction:decision_043');
  assert.equal(await page.locator('[data-choice="0"]').isEnabled(), true);
  assert.match(await page.locator('[data-choice="0"] .card-effect').innerText(), /拆开看看/);
  await page.locator('[data-choice="0"]').click();
  const finalRun = await snapshot(page, trace, 'card-interaction:decision_043_choice_1');
  assert.equal(finalRun.decisionHistory.at(-1).choiceId, 'decision_043_choice_1');
  assert.ok(
    finalRun.decisionHistory.at(-1).result.includes(
      REPRESENTATIVE_CHOICE.cardInteraction.resultSuffix,
    ),
  );

  assert.deepEqual(errors, []);
  await browser.close();

  const output = {
    seed: SEED,
    schemaVersion: 11,
    contentRevision: 20,
    trace,
  };

  if (RECORD) {
    process.stdout.write(`${JSON.stringify(output)}\n`);
    return;
  }

  const expected = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.deepEqual(output, expected);
  console.log(
    JSON.stringify(
      {
        ok: true,
        seed: SEED,
        checkpoints: trace.length,
        finalRngState: finalRun.rngState,
        representativeInteraction: 'decision_043_choice_1 + card_01',
        errors,
      },
      null,
      2,
    ),
  );
})().catch(async error => {
  console.error(error);
  if (browser) await browser.close().catch(() => {});
  process.exitCode = 1;
});
