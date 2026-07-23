const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const URL = process.env.LIFE_URL || 'http://127.0.0.1:8765/?debug=1';

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

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    age: 5,
    activity: { mode: 'childhood', funding: 'family' },
    employment: { status: 'none' },
    finance: { cash: 500, liabilities: [], totalDebt: 0 },
    cardAges: [0, 18, 35, 55]
  }));
  let run = await page.evaluate(() => window.__LIFE_DEBUG__.settleYear());
  assert.equal(run.finance.liabilities.length, 0, 'a child received personal living debt');
  assert.equal(run.finance.lastExpense, 0, 'family-funded childhood charged personal living costs');
  await page.evaluate(() => window.__LIFE_DEBUG__.forceDecision('decision_001'));
  await page.locator('[data-choice="0"]').click();
  await page.waitForTimeout(240);
  run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.finance.liabilities.length, 0, 'a minor education cost became personal debt');

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    age: 30,
    activity: { mode: 'seeking', funding: 'self' },
    employment: { status: 'unemployed' },
    finance: { cash: 0, liabilities: [], totalDebt: 0 },
    housing: { status: 'family', value: 0 }
  }));
  run = await page.evaluate(() => window.__LIFE_DEBUG__.settleYear());
  run = await page.evaluate(() => window.__LIFE_DEBUG__.settleYear());
  assert.equal(run.finance.liabilities.filter(item => item.kind === 'living').length, 1, 'living deficits created duplicate liabilities');
  assert(run.finance.totalDebt < 100000, `two ordinary deficit years became implausible debt: ${run.finance.totalDebt}`);

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    age: 30,
    attrs: { physique: 2 },
    health: { physical: 80, mental: 72, status: 'well', conditionSeverity: 0, currentCondition: null, lastIncidentAge: -20, recoveryYears: 0, disability: 'none', careNeed: 0 },
    capabilities: { healthLiteracy: 1, resilience: 0 }
  }));
  const weakIncident = await page.evaluate(() => window.__LIFE_DEBUG__.healthIncident(20));
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    attrs: { physique: 9 },
    health: { physical: 80, mental: 72, status: 'well', conditionSeverity: 0, currentCondition: null, lastIncidentAge: -20, recoveryYears: 0, disability: 'none', careNeed: 0 }
  }));
  const strongIncident = await page.evaluate(() => window.__LIFE_DEBUG__.healthIncident(20));
  assert(strongIncident.conditionSeverity < weakIncident.conditionSeverity, 'strong constitution did not reduce incident severity');

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    attrs: { physique: 2 },
    health: { physical: 60, status: 'monitoring', conditionSeverity: 25, currentCondition: 'test', lastIncidentAge: 30, recoveryYears: 0 },
    capabilities: { healthLiteracy: 2, resilience: 0 }
  }));
  const weakRecovery = await page.evaluate(() => window.__LIFE_DEBUG__.healthRecovery(10, true));
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    attrs: { physique: 9 },
    health: { physical: 60, status: 'monitoring', conditionSeverity: 25, currentCondition: 'test', lastIncidentAge: 30, recoveryYears: 0 },
    capabilities: { healthLiteracy: 2, resilience: 0 }
  }));
  const strongRecovery = await page.evaluate(() => window.__LIFE_DEBUG__.healthRecovery(10, true));
  assert(strongRecovery.conditionSeverity < weakRecovery.conditionSeverity, 'strong constitution did not improve recovery');
  assert.equal(strongRecovery.status, 'well', 'reachable treatment route did not cure a strong-constitution character');
  const healthStartIds = await page.evaluate(() => {
    window.__LIFE_DEBUG__.patchRun({ health: { status: 'well', conditionSeverity: 0, disability: 'none' }, usedEvents: [], arcs: {}, arcSlots: { career: null, family: null, personal: null } });
    return window.__LIFE_DEBUG__.eligibleIds('decision').filter(id => ['decision_073', 'decision_077'].includes(id));
  });
  assert.deepEqual(healthStartIds, [], 'healthy character can start an illness arc');
  assert(!(await page.evaluate(() => window.__LIFE_DEBUG__.routeTags())).includes('健康危机'), 'cured character still receives health-crisis route tag');

  const negativeSafety = await page.evaluate(() => {
    window.__LIFE_DEBUG__.patchRun({ finance: { cash: 0, liabilities: [{ id: 'test', kind: 'consumer', principal: 1000000, rate: .06, status: 'delinquent', arrears: 2 }], lastIncome: 40000 } });
    return window.__LIFE_DEBUG__.endingAxes().安全;
  });
  const positiveSafety = await page.evaluate(() => {
    window.__LIFE_DEBUG__.patchRun({ finance: { cash: 1000000, liabilities: [], lastIncome: 40000 } });
    return window.__LIFE_DEBUG__.endingAxes().安全;
  });
  assert(negativeSafety < positiveSafety && negativeSafety < 20, `negative net worth improved safety: ${negativeSafety}/${positiveSafety}`);

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({ age: 38, decisionCount: 9, targetDecisions: 18 }));
  assert.equal(await page.evaluate(() => window.__LIFE_DEBUG__.decisionAllowance()), 12, 'midlife choice reserve is missing');
  assert.equal(errors.length, 0, errors.join(' | '));
  console.log(JSON.stringify({ childDebt: 0, consolidatedLivingDebts: 1, weakIncident: weakIncident.conditionSeverity, strongIncident: strongIncident.conditionSeverity, weakRecovery: weakRecovery.conditionSeverity, strongRecovery: strongRecovery.conditionSeverity, safety: { negative: negativeSafety, positive: positiveSafety }, errors }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
