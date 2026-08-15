const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { launchChromium } = require('./playwright-runtime.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.BROWSER_SMOKE_OUT || path.join(os.tmpdir(), 'life-unloaded-core-browser');
const URL = process.env.LIFE_URL || 'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY = 'life-unloaded-2026-v1';
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const DECISIONS = DATA.events.filter(event => event.kind === 'decision');
fs.mkdirSync(OUT, { recursive: true });

function decisionId(criteria) {
  const pool = DECISIONS.filter(event => {
    if (criteria.episodeId !== undefined && event.episode?.id !== criteria.episodeId) return false;
    if (criteria.episodePhase !== undefined && event.episode?.phase !== criteria.episodePhase) return false;
    if (criteria.track !== undefined && event.track !== criteria.track) return false;
    if (criteria.noEpisode === true && event.episode) return false;
    return true;
  });
  const event = pool[criteria.index ?? 0];
  assert.ok(event, `no decision matches ${JSON.stringify(criteria)}`);
  return event.id;
}

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
  browser = await launchChromium();
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
      seen: { events: { beat_001: 1, swan_001: 1, 'archive-note': 1 }, cards: {}, families: {}, endings: {} },
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
  assert.equal(migrated.state.schemaVersion, 13);
  assert.equal(migrated.state.gameVersion, '0.6.13');
  assert.equal(migrated.run, null, 'old active life should not survive a version update');
  assert.deepEqual(migrated.legacyKeys, [], 'legacy snapshots should be removed');
  assert.equal(migrated.state.meta.histories[0].title, '保留的人生记录');
  assert.deepEqual(migrated.state.meta.codex, ['codex_01']);
  assert.equal(migrated.state.meta.settings.haptic, false);
  assert.equal(migrated.state.meta.stats.runs, 2);
  assert.equal(migrated.state.meta.seen.events.beat_001, undefined, 'legacy generated event IDs should be removed during migration');
  assert.equal(migrated.state.meta.seen.events.swan_001, undefined, 'legacy black-swan IDs should be removed during migration');
  assert.equal(migrated.state.meta.seen.events['archive-note'], 1, 'non-generated cross-run records should survive migration');
  assert.deepEqual(migrated.state.meta.recentSeeds, ['finished-life']);
  assert.equal(await page.locator('[data-act="new"]').count(), 1);
  assert.match(await page.locator('.migration-note').innerText(), /旧版本的活动人生已结束/);

  await context.close();
  context = await browser.newContext({ viewport: { width: 360, height: 773 }, deviceScaleFactor: 1 });
  page = await preparePage(context);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitBoot(page);
  await page.locator('[data-act="new"]').click();
  assert.equal(await page.locator('[data-act="return-home"]').count(), 1);
  const birthSeed = (await page.evaluate(() => window.__LIFE_DEBUG__.snapshot())).seed;
  await page.locator('[data-act="return-home"]').click();
  assert.equal(await page.locator('[data-act="continue"]').count(), 1);
  assert.equal(await page.locator('[data-act="restart-life"]').count(), 1);
  await page.waitForTimeout(320);
  await page.screenshot({ path: path.join(OUT, 'home-restart-360x773.png'), fullPage: true });
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('[data-act="restart-life"]').click();
  assert.equal((await page.evaluate(key => JSON.parse(localStorage.getItem(key)).run.seed, SAVE_KEY)), birthSeed);
  await page.locator('[data-act="continue"]').click();
  assert.equal(await page.locator('[data-act="birth-next"]').count(), 1);
  await page.waitForTimeout(900);
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
  const cardOptionsBeforeHome = await page.locator('[data-card]').count();
  assert.equal(cardOptionsBeforeHome, 3);
  await page.locator('[data-act="return-home"]').click();
  assert.equal(await page.locator('[data-act="continue"]').count(), 1);
  await page.locator('[data-act="continue"]').click();
  assert.equal(await page.locator('[data-card]').count(), cardOptionsBeforeHome);
  await page.locator('[data-card]').first().click();
  assert.deepEqual(
    await page.evaluate(() => [0, 1, 2, 4].map(value => window.__LIFE_DEBUG__.annualTargetSize(value))),
    [1, 2, 3, 3],
    'quiet/progression/collision annual capacities changed'
  );

  run = await forceChoice(page, decisionId({ track: 'identity', index: 0 }), 0);
  assert.ok(Object.values(run.desires).some(value => value && typeof value === 'object' && value.claimed));
  const employmentDecisionId = decisionId({ track: 'employment', noEpisode: true, index: 0 });
  const employmentDecision = DECISIONS.find(event => event.id === employmentDecisionId);
  const employmentChoice = employmentDecision.choices[1];
  run = await forceChoice(page, employmentDecisionId, 1);
  assert.equal(run.employment.status, 'employed');
  assert.equal(run.employment.profileId, 'sales_representative');
  assert.equal(run.employment.career, '销售代表');
  assert.equal(run.employment.employerType, 'private');
  assert.equal(run.employment.sector, 'sales');
  assert.equal(run.employment.jobTier, 'T1');
  assert.equal(run.employment.rank, 1);
  assert.equal(run.employment.contractType, 'fixedTerm');
  assert.equal(run.employment.contract, 'fixedTerm');
  assert.equal(run.employment.incomeStability, 'fixedPlusBonus');
  assert.ok(run.employment.salary > 0);
  assert.ok(run.employment.incomeAnnualGross > 0);
  assert.equal(run.timeline.at(-1).text, `${employmentChoice.text}。${employmentChoice.resultText}`);
  assert.ok(run.scheduledConsequences.some(item => item.sourceDecisionId === employmentDecisionId));

  await page.locator('[data-act="open-drawer"]').click();
  const employmentDrawer = await page.locator('.drawer').innerText();
  for (const label of ['现在在干嘛', '手里净资产', '成瘾与戒断', '还有几件事没完']) {
    assert.match(employmentDrawer, new RegExp(label));
  }
  assert.match(employmentDrawer, /销售代表/);
  assert.match(employmentDrawer, /固定期限合同/);
  assert.match(employmentDrawer, /固定收入加奖金/);
  assert.doesNotMatch(employmentDrawer, /尚未进入社会/);
  await page.locator('.drawer [data-act="close-drawer"]').click();

  const due = run.scheduledConsequences.find(item => item.sourceDecisionId === employmentDecisionId);
  const secondDue = { ...due, id: `${due.id}-same-age-second` };
  const invalidDue = { ...due, id: `${due.id}-invalid`, eventId: 'missing-consequence', priority: 999 };
  const employmentEcho = DATA.events.find(event => event.kind === 'consequence' && event.sourceDecisionId === employmentDecisionId);
  await page.evaluate(schedules => window.__LIFE_DEBUG__.patchRun({ cardAges: [0, 18, 35, 55], scheduledConsequences: schedules }), [invalidDue, due, secondDue]);
  await page.evaluate(age => window.__LIFE_DEBUG__.forceAge(age), due.dueAge);
  const plannedYear = await page.evaluate(() => window.__LIFE_DEBUG__.ensureYearPlan());
  assert.equal(plannedYear.queue.filter(id => id === employmentEcho.id).length, 2, 'same-age due consequences were not all preserved in the annual plan');
  assert.equal((await page.evaluate(() => window.__LIFE_DEBUG__.snapshot())).scheduledConsequences.find(item => item.id.endsWith('-invalid')).status, 'invalidated', 'invalid top-priority consequence blocked later valid facts');
  assert.equal(
    plannedYear.queueRoles.filter(role => ['beat', 'blackSwan'].includes(role)).length,
    0,
    'replaceable annual content was appended after due facts and the planned decision filled the collision year'
  );
  const plannedSnapshot = await page.evaluate(() => {
    const value = window.__LIFE_DEBUG__.snapshot();
    return { queue: value.yearQueue.map(item => item.id), rngState: value.rngState };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitBoot(page);
  assert.deepEqual(await page.evaluate(() => {
    const value = window.__LIFE_DEBUG__.snapshot();
    return { queue: value.yearQueue.map(item => item.id), rngState: value.rngState };
  }), plannedSnapshot, 'refresh redrew the annual plan or consumed RNG');
  await page.evaluate(() => window.__LIFE_DEBUG__.advance());
  await page.evaluate(() => window.__LIFE_DEBUG__.advance());
  run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  assert.ok(run.usedConsequences.includes(due.id), `scheduled consequence did not return: ${JSON.stringify({ age: run.age, phase: run.phase, yearStarted: run.yearStarted, queue: run.yearQueue.map(item => item.id), schedule: run.scheduledConsequences, timeline: run.timeline.slice(-3) })}`);
  assert.ok(run.usedConsequences.includes(secondDue.id), 'second same-age consequence was deferred or dropped');
  const returnedConsequence = run.timeline.find(item => item.id === employmentEcho.id && item.age === due.dueAge);
  assert.equal(returnedConsequence?.text, employmentEcho.choiceOutcomes[employmentChoice.memoryKey].text);
  assert.equal(returnedConsequence?.kind, 'consequence');

  run = await forceChoice(page, decisionId({ episodeId: 'relationship_start', episodePhase: 1 }), 0);
  assert.equal(run.relationships.partnerStatus, 'dating');
  const createdPartner = run.people.find(person => person.id === run.relationships.activePartnerId);
  assert.ok(createdPartner && createdPartner.gender !== run.gender, 'new partner did not receive the opposite simplified gender');
  assert.ok(Math.abs((run.age - createdPartner.bornAt) - run.age) <= 4, 'new partner age was not close to the player');
  assert.ok(createdPartner.health >= 1 && createdPartner.health <= 100, 'new partner health was not recorded');
  run = await forceChoice(page, decisionId({ episodeId: 'becoming_parent', episodePhase: 1 }), 0);
  assert.equal(run.relationships.parenthoodIntent, 'planned');
  assert.equal(run.relationships.childCount, 0);
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({ relationships: { pregnancyStatus: 'confirmed', plannedConceptionResolved: true }, episodes: { relationship_start: { status: 'resolved' }, becoming_parent: { status: 'resolved' } }, scheduledConsequences: [] }));
  run = await forceChoice(page, decisionId({ episodeId: 'pregnancy_decision', episodePhase: 1 }), 0);
  assert.equal(run.relationships.pregnancyStatus, 'continued');
  assert.equal(run.relationships.childCount, 0);
  const birth = run.scheduledConsequences.find(item => item.sourceDecisionId === decisionId({ episodeId: 'pregnancy_decision', episodePhase: 1 }));
  assert.ok(birth);
  await page.evaluate(age => window.__LIFE_DEBUG__.forceAge(age), birth.dueAge);
  for (let guard = 0; guard < 6; guard++) {
    const current = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
    if (current.usedConsequences.includes(birth.id)) break;
    await page.evaluate(() => window.__LIFE_DEBUG__.advance());
  }
  run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.relationships.childCount, 1, JSON.stringify({age:run.age,phase:run.phase,yearStarted:run.yearStarted,queue:run.yearQueue.map(item=>item.id),schedule:run.scheduledConsequences,used:run.usedConsequences,scene:run.sceneQueue,current:run.currentDecision?.id}));
  assert.equal(run.relationships.pregnancyStatus, 'completed');
  run = await forceChoice(page, decisionId({ episodeId: 'habit_gambling_formation', episodePhase: 1 }), 2);
  assert.equal(run.habits.type, 'gambling');
  assert.equal(run.habits.stage, 'repeating');
  run = await forceChoice(page, decisionId({ episodeId: 'career_break', episodePhase: 1 }), 0);
  assert.equal(run.activity.mode, 'sabbatical');
  run = await forceChoice(page, decisionId({ episodeId: 'first_remote_contract', episodePhase: 1 }), 0);
  assert.equal(run.employment.arrangement, 'remote');
  run = await forceChoice(page, decisionId({ episodeId: 'shop_opening', episodePhase: 1 }), 0);
  assert.ok(['testing', 'operating'].includes(run.business.status));

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    phase: 'playing', sceneQueue: [], currentDecision: null, cardOptions: []
  }));
  await page.locator('[data-act="open-drawer"]').click();
  await page.waitForTimeout(320);
  assert.equal(await page.locator('.drawer[role="dialog"][aria-modal="true"][aria-labelledby="drawer-title"]').count(), 1);
  assert.equal(await page.evaluate(() => document.querySelector('.drawer')?.contains(document.activeElement)), true, 'drawer did not receive focus');
  assert.equal(await page.locator('[data-act="close-drawer"][aria-label="关闭状态面板"]').count(), 1);
  const lifeFactCount = await page.locator('.life-facts p').count();
  assert.ok(lifeFactCount >= 1 && lifeFactCount <= 2, 'state summary should show one or two evidence-backed facts');
  assert.match(await page.locator('.drawer').innerText(), /这几年绕不开的事/);
  for (let index = 0; index < 8; index += 1) await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.querySelector('.drawer')?.contains(document.activeElement)), true, 'focus escaped the open drawer');
  await fit(page, 'drawer-360x773');
  await page.screenshot({ path: path.join(OUT, 'state-drawer-360x773.png'), fullPage: true });
  await page.locator('.drawer [data-act="close-drawer"]').click();
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.act), 'open-drawer', 'drawer close did not restore focus');
  await page.locator('[data-act="open-drawer"]').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitBoot(page);
  run = await page.evaluate(() => window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.relationships.childCount, 1);
  assert.equal(run.habits.stage, 'repeating');
  assert.ok(run.scheduledConsequences.length >= 1);

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    age: 62,
    phase: 'playing',
    activity: { mode: 'seeking', years: 5 },
    employment: { status: 'unemployed', firstJobAge: null, firstJobOutcome: 'longSearch' },
    finance: { liabilities: [{ id: 'ending-debt', kind: 'consumer', principal: 304000, rate: 0, status: 'overdue', source: 'test', holder: 'test', enforcementEligible: true }] },
    timeline: [
      { id: 'early-choice', age: 18, kind: 'decision', track: 'education', icon: '·', text: '早年的选择。', variant: 'chosen' },
      { id: 'person_loss_test_45', age: 45, kind: 'consequence', track: 'later', icon: '·', text: '一位家人走了。', variant: 'event' }
    ]
  }));
  const semanticFacts = await page.evaluate(() => window.__LIFE_DEBUG__.pivotalFacts());
  assert.ok(semanticFacts.some(item => item.source === 'final-long-unemployment'), 'long unemployment was not recognized as an ending turn');
  assert.ok(semanticFacts.some(item => item.source === 'final-debt'), 'severe debt was not recognized as an ending turn');
  assert.ok(semanticFacts.some(item => item.source.startsWith('person_loss_')), 'a close-person death was not recognized as an ending turn');
  assert.ok(new Set(semanticFacts.map(item => item.age)).size >= 2, 'ending turns collapsed into one terminal age');
  const semanticEraCounts = semanticFacts.reduce((counts, item) => {
    const key = item.age < 25 ? 'early' : item.age < 55 ? 'middle' : 'late';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  assert.ok(Object.values(semanticEraCounts).every(count => count <= 2), 'one life era occupied all ending turns');
  assert.deepEqual(
    await page.locator('.stream-age').evaluateAll(items => items.map(item => item.textContent.trim()).filter(Boolean)),
    ['18岁', '45岁'],
    'timeline repeated or lost an age heading'
  );
  assert.equal(await page.locator('.stream-row.critical').count(), 1, 'critical timeline fact lost its visual tier');
  assert.equal(await page.locator('.stream-row.standard').count(), 1, 'ordinary choice lost its standard visual tier');
  const milestoneFixtures = [
    { name: 'first employment', eventId: decisionId({ track: 'employment', noEpisode: true }), before: { employment: 'none' }, after: { employment: 'employed' } },
    { name: 'parenthood', eventId: decisionId({ episodeId: 'adoption_process', episodePhase: 2 }), before: { children: 0 }, after: { children: 1 } },
    { name: 'partnership', eventId: decisionId({ episodeId: 'relationship_start', episodePhase: 2 }), before: { partner: 'dating' }, after: { partner: 'married' } },
    { name: 'housing', eventId: decisionId({ track: 'housing', noEpisode: true }), before: {}, after: {}, housingChoiceKind: 'firstIndependent' },
    { name: 'health', eventId: decisionId({ track: 'health', noEpisode: true }), before: { health: 80 }, after: { health: 40 } },
    { name: 'retirement', eventId: decisionId({ episodeId: 'retirement_transition', episodePhase: 1 }), before: {}, after: {} }
  ];
  for (const fixture of milestoneFixtures) {
    const facts = await page.evaluate(value => {
      const debug = window.__LIFE_DEBUG__;
      debug.patchRun({
        age: 70,
        activity: { mode: 'leisure', years: 0 },
        employment: { status: 'none', firstJobAge: null },
        finance: { liabilities: [], housingDisposition: 'none' },
        health: { status: 'well', conditionSeverity: 0, physical: 70 },
        later: { retirement: 'none', inheritance: 'none', care: 'none', will: 'none' },
        timeline: [],
        decisionHistory: [{
          age: 40,
          eventId: value.eventId,
          choiceId: `${value.eventId}-choice`,
          choice: value.name,
          result: `${value.name} happened`,
          stateBefore: value.before,
          stateAfter: value.after,
          outcomeTags: [],
          commitments: [],
          housingChoiceKind: value.housingChoiceKind || null,
          impact: 2
        }]
      });
      return debug.pivotalFacts();
    }, fixture);
    assert.ok(facts.some(item => item.source === fixture.eventId), `${fixture.name} was not recognized as an ending milestone`);
  }
  const fallbackEraFacts = await page.evaluate(eventId => {
    const debug = window.__LIFE_DEBUG__;
    debug.patchRun({
      age: 70,
      timeline: [],
      decisionHistory: [{
        age: 18,
        eventId,
        choiceId: 'early-only',
        choice: '早年的一次选择',
        result: '这件事发生了。',
        stateBefore: { employment: 'none' },
        stateAfter: { employment: 'employed' },
        outcomeTags: [],
        commitments: [],
        impact: 2
      }]
    });
    return debug.pivotalFacts();
  }, milestoneFixtures[0].eventId);
  assert.ok(fallbackEraFacts.filter(item => item.age < 25).length <= 2, 'fallback facts bypassed the era limit');
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    employment: { status: 'unemployed' },
    finance: { liabilities: [{ id: 'ordinary-debt', kind: 'consumer', principal: 88000, rate: 0, status: 'overdue', source: 'test', holder: 'test', enforcementEligible: true }] },
    health: { status: 'well', conditionSeverity: 0 }
  }));
  const debtOrdinarySummary = await page.evaluate(() => window.__LIFE_DEBUG__.ordinaryEndingSummary('fallback'));
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    employment: { status: 'none' },
    finance: { liabilities: [] },
    health: { status: 'limited', conditionSeverity: 45 }
  }));
  const healthOrdinarySummary = await page.evaluate(() => window.__LIFE_DEBUG__.ordinaryEndingSummary('fallback'));
  assert.notEqual(debtOrdinarySummary, healthOrdinarySummary, 'different ordinary lives received the same fallback summary');
  const sameWorkSummaries = [];
  for (const fixture of [milestoneFixtures[0], milestoneFixtures[2]]) {
    await page.evaluate(value => window.__LIFE_DEBUG__.patchRun({
      employment: { status: 'employed', career: '行政助理' },
      activity: { mode: 'work' },
      finance: { liabilities: [] },
      health: { status: 'well', conditionSeverity: 0 },
      relationships: { partnerStatus: value.name === 'partnership' ? 'married' : 'none' },
      decisionHistory: [{
        age: 40,
        eventId: value.eventId,
        choiceId: `${value.eventId}-ordinary`,
        choice: value.name,
        result: `${value.name} happened`,
        stateBefore: value.before,
        stateAfter: value.after,
        outcomeTags: [],
        commitments: [],
        impact: 2
      }]
    }), fixture);
    sameWorkSummaries.push(await page.evaluate(() => window.__LIFE_DEBUG__.ordinaryEndingSummary('fallback')));
  }
  assert.notEqual(sameWorkSummaries[0], sameWorkSummaries[1], 'same-work ordinary lives ignored different lived milestones');
  const saturationBeatId = DATA.events.find(item => item.kind === 'beat' && item.track === 'later').id;
  await page.evaluate(id => window.__LIFE_DEBUG__.patchRun({
    age: 62,
    timeline: [58, 59, 60].map(age => ({ id, age, kind: 'beat', track: 'later', icon: '·', text: '同一件日常生活纹理。' }))
  }), saturationBeatId);
  const saturationWeights = await page.evaluate(id => ({
    protectedWeight: window.__LIFE_DEBUG__.continuityWeight(id, false),
    ordinaryWeight: window.__LIFE_DEBUG__.continuityWeight(id, true)
  }), saturationBeatId);
  assert.ok(saturationWeights.ordinaryWeight < saturationWeights.protectedWeight, 'same-event saturation did not lower replaceable content');
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    outcomeTags: { 'health:recovered': 1 },
    decisionHistory: [],
    relationships: { network: 80 },
    social: { primaryPersonId: null, secondaryPersonId: null }
  }));
  const unsupportedTags = await page.evaluate(() => window.__LIFE_DEBUG__.routeTags());
  assert.ok(!unsupportedTags.includes('康复者'), 'recovery tag appeared without a displayed recovery decision');
  assert.ok(!unsupportedTags.includes('人脉很广'), 'network tag appeared without actual social people');
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    outcomeTags: { 'leisure:deliberate': 1 },
    desires: { freedom: { fulfillment: 70, claimed: true, drive: 70 } },
    employment: { firstJobAge: 20, growthCount: 1, status: 'retired' },
    later: { retirement: 'retired' }
  }));
  const freeLifeEnding = await page.evaluate(() => window.__LIFE_DEBUG__.endingProfile());
  assert.equal(freeLifeEnding.id, 'freeLife');
  assert.doesNotMatch(freeLifeEnding.summary, /没有工牌/, 'free-life ending erased a real employment history');
  assert.ok(!DATA.endingTitles.some(ending => ending.title === '无工牌生活实验'), 'unsupported no-badge title remained in the generated ending set');
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({age:20,health:{physical:90,status:'well'},habits:{stage:'none'}}));
  assert.equal(await page.evaluate(() => window.__LIFE_DEBUG__.mortalityCause()), '一次未记录具体原因的突发状况');
  assert.equal(await page.evaluate(() => window.__LIFE_DEBUG__.mortalityCause('health')), '长期健康问题带来的风险');
  assert.equal(await page.evaluate(() => window.__LIFE_DEBUG__.mortalityCause('habit')), '长期失控带来的健康风险');
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({age:60}));
  assert.equal(await page.evaluate(() => window.__LIFE_DEBUG__.mortalityCause()), '一次未记录具体原因的突发状况');
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({age:70}));
  assert.equal(await page.evaluate(() => window.__LIFE_DEBUG__.mortalityCause()), '自然衰老');
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({age:20,deathCause:'一次未记录具体原因的突发状况',timeline:[],decisionHistory:[]}));
  const earlyFacts = await page.evaluate(() => window.__LIFE_DEBUG__.pivotalFacts());
  assert.equal(earlyFacts.length, 3, 'an early death could not fill all three factual pivots');
  assert.ok(earlyFacts.some(item => item.source === 'origin'));
  assert.ok(earlyFacts.some(item => item.source === 'death'));

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
  assert.equal(await page.locator('.portrait-row').count(), 0, 'raw 0-100 ending axes remained visible');
  assert.equal(await page.locator('.ending-fact').count(), 4, 'ending fact portrait did not replace raw axes');
  assert.equal(await page.locator('[data-act="new"]').count(), 1);

  for (const [width, height] of [[360, 773], [360, 640], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await fit(page, `ending-${width}x${height}`);
    await page.screenshot({ path: path.join(OUT, `ending-${width}x${height}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 360, height: 773 });
  await page.locator('[data-act="new"]').click();
  await page.locator('[data-nav="home"]').click();
  const beforeRestart = await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key));
    return { seed: saved.run.seed, meta: saved.meta };
  }, SAVE_KEY);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-act="restart-life"]').click();
  assert.equal(await page.locator('[data-act="birth-next"]').count(), 1);
  const afterRestart = await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key));
    return { seed: saved.run.seed, meta: saved.meta };
  }, SAVE_KEY);
  assert.notEqual(afterRestart.seed, beforeRestart.seed);
  assert.deepEqual(afterRestart.meta, beforeRestart.meta);
  await page.locator('[data-act="return-home"]').click();
  await page.locator('[data-nav="settings"]').click();
  await page.waitForTimeout(320);
  assert.equal(await page.locator('[data-act="clear-data"]').count(), 1);
  assert.equal(await page.locator('.iconbtn:not([aria-label])').count(), 0, 'symbol button without accessible name');
  const hapticToggle = page.locator('[data-act="toggle-haptic"]');
  const hapticBefore = await hapticToggle.getAttribute('aria-pressed');
  assert.match(await hapticToggle.innerText(), /已开启|已关闭/);
  await hapticToggle.click();
  assert.notEqual(await page.locator('[data-act="toggle-haptic"]').getAttribute('aria-pressed'), hapticBefore, 'haptic aria-pressed did not update');
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
