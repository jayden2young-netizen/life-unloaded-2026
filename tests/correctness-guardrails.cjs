const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { launchChromium } = require('./playwright-runtime.cjs');

const ROOT = path.resolve(__dirname, '..');
const URL = process.env.LIFE_URL || 'http://127.0.0.1:8765/?debug=1';
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const SAVE_KEY = 'life-unloaded-2026-v1';
let browser;

const clone = value => structuredClone(value);

function findObject(root, predicate) {
  let found;
  const walk = value => {
    if (found || !value || typeof value !== 'object') return;
    if (predicate(value)) {
      found = value;
      return;
    }
    Object.values(value).forEach(walk);
  };
  walk(root);
  return found;
}

function collect(root, predicate) {
  const found = [];
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (predicate(value)) found.push(value);
    Object.values(value).forEach(walk);
  };
  walk(root);
  return found;
}

function expectContractFailure(validate, mutate, pattern) {
  const fixture = clone(DATA);
  mutate(fixture);
  assert.throws(() => validate(fixture), pattern);
}

function runGeneratorScenario(source, name, expectSuccess = true) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `life-v062-${name}-`));
  const output = path.join(tempRoot, 'data.json');
  try {
    const result = childProcess.spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', source],
      {
        cwd: ROOT,
        env: { ...process.env, LIFE_DATA_OUTPUT: output },
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        timeout: 60_000,
      },
    );
    if (expectSuccess) {
      assert.equal(
        result.status,
        0,
        `${name} generation failed\n${result.stdout}\n${result.stderr}`,
      );
      return JSON.parse(fs.readFileSync(output, 'utf8'));
    }
    assert.notEqual(result.status, 0, `${name} generation unexpectedly passed`);
    return `${result.stdout}\n${result.stderr}`;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function neutralTrace(multiplier) {
  const candidates = [
    { id: 'employment', track: 'employment', weight: 11 },
    { id: 'public', track: 'public', weight: 13 },
    { id: 'finance', track: 'finance', weight: 9 },
  ];
  const desires = ['exploration', 'status'];
  let state = 0x61c0ffee;
  const next = () => {
    let x = state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    state = x >>> 0;
    return state / 4294967296;
  };
  const selections = [];
  const keyState = Object.fromEntries(candidates.map(item => [item.track, 0]));
  for (let step = 0; step < 12; step += 1) {
    const weights = candidates.map(item => item.weight * multiplier(item.track, desires));
    let roll = next() * weights.reduce((sum, value) => sum + value, 0);
    let selected = candidates.at(-1);
    for (let index = 0; index < candidates.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) {
        selected = candidates[index];
        break;
      }
    }
    keyState[selected.track] += 1;
    selections.push([selected.id, state, { ...keyState }]);
  }
  return selections;
}

(async () => {
  const contract = await import(pathToFileURL(path.join(ROOT, 'runtime-content-contract.mjs')));
  const validator = await import(
    pathToFileURL(path.join(ROOT, 'tools', 'validate-content-contract.mjs'))
  );
  const authorSlots = await import(pathToFileURL(path.join(ROOT, 'tools', 'author-slots.mjs')));

  const summary = validator.validateGeneratedData(DATA);
  assert.deepEqual([DATA.version, DATA.schemaVersion, DATA.contentRevision], ['0.6.11', 13, 31]);
  assert.deepEqual(
    DATA.events.reduce((counts,event)=>({...counts,[event.kind]:(counts[event.kind]||0)+1}),{}),
    {beat:480,decision:205,consequence:205,blackSwan:20},
  );
  const guaranteeDecision = DATA.events.find(event => event.id === 'decision_107');
  const guaranteeEcho = DATA.events.find(event => event.id === 'echo_107');
  assert.equal(guaranteeDecision?.prompt, '这份担保，你签不签？', 'guarantee decision ID drifted');
  assert.equal(guaranteeEcho?.sourceDecisionId, 'decision_107', 'guarantee echo ID drifted');
  assert.equal(summary.evidenceRecords, 11);
  for (const type of ['resolveConception','resolveDebtEnforcement','transitionHousing','scaleEmployment','resolveInheritance','createSocialPerson','updateSocialPerson','transitionSocialToDating','createEmploymentReferral','socialCoResidence'])
    assert.ok(contract.COMMAND_TYPES.includes(type));
  for (const pathName of [
    'relationships.familyPlanningOffered','relationships.familyPlanningDeferred','relationships.familyPlanningClosed',
    'relationships.plannedConceptionResolved','relationships.unplannedConceptionChecked','relationships.pregnancyStatus',
    'relationships.pregnancyDecision','relationships.pregnancyDecisionDeferred','relationships.adoptionOffered','relationships.adoptionStatus',
    'finance.debtStage','finance.enforcementStatus','finance.enforcementDebtId','finance.dishonestStatus',
    'finance.restrictedConsumption','finance.seizedAssets','finance.housingDisposition','finance.repaymentAgreement',
    'finance.repaymentAgreementFulfilled','finance.reliefPending','later.inheritance',
    'finance.mortgagePaymentStress',
    'housing.status','housing.arrangement','housing.region','housing.stability','housing.accessibility',
    'housing.costShare','housing.coResidentRefs','housing.sinceAge','housing.keyChoiceCount','housing.history',
    'relationships.network','pressures.loneliness','mobility.localTies',
    'social.primaryPersonId','social.secondaryPersonId','employment.referralPersonId','employment.referralStatus',
  ]) {
    assert.ok(contract.READ_PATHS.includes(pathName), `missing family read path ${pathName}`);
  }
  assert.ok(contract.WRITE_PATHS.includes('housing'), 'missing atomic housing write path');
  assert.equal(
    collect(DATA, value => value.type === 'set' && String(value.target || '').startsWith('housing.')).length,
    0,
    'housing fields must not be written with set commands',
  );
  const housingTransitions = collect(DATA, value => value.type === 'transitionHousing');
  assert.ok(housingTransitions.length >= 6, 'housing track must use atomic transitions');
  assert.ok(
    housingTransitions
      .filter(command => command.value.arrangement === 'shared')
      .every(command => !command.value.coResidentRefs?.length),
    'anonymous shared housing must not create person references',
  );
  assert.deepEqual(
    new Set(DATA.events.filter(event=>event.kind==='decision'&&event.track==='housing').flatMap(event=>event.choices.map(choice=>choice.housingChoiceKind))),
    new Set(['educationHousing','firstIndependent','workMigration','partnerReconfiguration','homePurchase','laterFit']),
  );
  const socialBeats=DATA.events.filter(event=>event.kind==='beat'&&event.track==='social');
  const socialDecisions=DATA.events.filter(event=>event.kind==='decision'&&event.track==='social');
  const socialConsequences=DATA.events.filter(event=>event.kind==='consequence'&&event.track==='social');
  assert.deepEqual([socialBeats.length,socialDecisions.length,socialConsequences.length],[24,8,8]);
  assert.ok([...socialBeats,...socialDecisions].every(event=>!event.episode&&!event.recurrence));
  assert.deepEqual(socialDecisions.map(event=>event.choices.length).sort(),[2,2,2,3,3,3,4,4]);
  assert.equal(socialDecisions.filter(event=>event.choices.some(choice=>choice.socialOutcome)).length,4);
  assert.ok(socialDecisions.every(event=>event.choices.filter(choice=>choice.cardInteraction).length===1));
  const socialRefusalRoutes=new Set(['leftAlone','keptSpace','changedCircle','declinedClearly','leftOnTime','refusedFavor','declinedHousing','choseSolitude','usedFormalRoute','activeSolitude']);
  assert.ok(socialDecisions.every(event=>event.choices.some(choice=>socialRefusalRoutes.has(choice.route))));
  assert.ok(socialDecisions.flatMap(event=>event.choices).filter(choice=>choice.socialOutcome).every(choice=>
    choice.socialOutcome.variants.length<=3&&
    choice.socialOutcome.variants.every(variant=>variant.memoryKey&&variant.resultText&&variant.consequenceText)
  ));
  assert.equal(DATA.codex.length,34);
  assert.ok(DATA.codex.some(entry=>entry.id==='codex_33')&&DATA.codex.some(entry=>entry.id==='codex_34'));
  const socialOutcomeTags=new Set(socialDecisions.flatMap(event=>event.choices.flatMap(choice=>[
    ...(choice.outcomeTags||[]),
    ...(choice.socialOutcome?.variants||[]).flatMap(variant=>variant.outcomeTags||[])
  ])));
  for(const codexId of['codex_33','codex_34']){
    const entry=DATA.codex.find(item=>item.id===codexId);
    assert.ok(entry.unlockRules.outcomeTagsAny.some(tag=>socialOutcomeTags.has(tag)),`${codexId}: no authored social outcome can unlock this entry`);
  }
  assert.equal(collect(DATA.events.filter(event=>event.track==='social'),value=>value?.path==='bond'||String(value?.path||'').endsWith('.bond')).length,0);
  const childBeats = DATA.events.filter(event=>event.kind==='beat'&&event.track==='children');
  assert.equal(childBeats.length,32);
  assert.ok(childBeats.slice(1).every(event=>event.actors.length===1&&event.actors[0].optional===false));
  assert.ok(childBeats.every(event=>!event.actors.length||event.actors[0].ageMin<=event.actors[0].ageMax));
  assert.equal(new Set(DATA.familySecrets.map(secret=>secret.text)).size,44);
  assert.ok(DATA.familySecrets.every(secret=>!secret.text.includes('原始凭据')));
  const contingentGuarantee=DATA.familySecrets.find(secret=>secret.id==='secret_02');
  assert.ok(contingentGuarantee,'missing contingent guarantee family secret');
  assert.ok(!contingentGuarantee.effects.some(effect=>effect.target==='originHousehold.debt'),'unclaimed guarantee became settled household debt');
  assert.ok(DATA.events.filter(event=>event.kind==='blackSwan').every(event=>event.requirements&&Array.isArray(event.effects)&&event.effects.length>=2));
  const wageCorrectionSwan=DATA.events.find(event=>event.kind==='blackSwan'&&event.text.includes('少发款'));
  assert.ok(wageCorrectionSwan.requirements.all.some(rule=>rule.path==='employment.status'&&rule.op==='eq'&&rule.value==='employed'));
  assert.ok(!DATA.events.some(event=>event.kind==='blackSwan'&&event.effects.some(command=>command.type==='addLiability'&&command.kind==='guarantee')));
  const mortgagePressure=DATA.events.find(event=>event.kind==='decision'&&event.prompt.includes('房贷加其他还款'));
  assert.ok(mortgagePressure.requirements.all.some(rule=>rule.path==='housing.status'&&rule.op==='eq'&&rule.value==='mortgaged'));
  assert.ok(mortgagePressure.requirements.all.some(rule=>rule.path==='finance.mortgagePaymentStress'&&rule.op==='eq'&&rule.value===true));
  const allChoices=DATA.events.filter(event=>event.kind==='decision').flatMap(event=>event.choices);
  assert.equal(allChoices.filter(choice=>choice.cardInteraction).length,214);
  const cardSource=fs.readFileSync(path.join(ROOT,'content/zh-CN/card-interactions.mjs'),'utf8');
  assert.doesNotMatch(cardSource,/universalRotation|genericInteraction|genericPatch|authoredMechanics|eventAuthoredInteraction|\(index\s*\+/);
  assert.match(cardSource,/EXPLICIT_CARD_INTERACTIONS/);
  const indexSource=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.doesNotMatch(indexSource,/user-scalable\s*=\s*no/i);
  const activeCardChoices=allChoices.filter(choice=>choice.cardInteraction);
  assert.ok(activeCardChoices.every(choice=>choice.cardInteraction.source==='eventAuthored'));
  assert.equal(activeCardChoices.filter(choice=>choice.cardInteraction.explanation).length,8);
  assert.equal(activeCardChoices.filter(choice=>choice.cardInteraction.resultSuffix).length,2);
  assert.ok(activeCardChoices.every(choice=>!choice.cardInteraction.explanation?.includes('准备')&&!choice.cardInteraction.resultSuffix?.includes('你这次走的是')));

  const predicates = collect(
    DATA,
    value => typeof value.path === 'string' && typeof value.op === 'string',
  );
  const generatedOperators = new Set(predicates.map(rule => rule.op));
  for (const op of generatedOperators)
    assert.ok(contract.RUNTIME_OPERATORS.includes(op), `generated operator ${op}`);
  const cardPredicates = DATA.events.flatMap(event =>
    (event.choices || []).flatMap(choice =>
      collect(
        choice.cardInteraction,
        value => typeof value.path === 'string' && typeof value.op === 'string',
      ),
    ),
  );
  const cardOperators = new Set(cardPredicates.map(rule => rule.op));
  assert.ok(cardOperators.size > 0, 'card interactions must exercise contract operators');
  for (const op of cardOperators)
    assert.ok(contract.RUNTIME_OPERATORS.includes(op), `card operator ${op}`);

  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      findObject(data, value => value.type === 'add').type = 'inventedCommand';
    },
    /未知 command/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      delete findObject(data, value => value.type === 'add').type;
    },
    /未知 command/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      delete findObject(data, value => value.type === 'add').target;
    },
    /缺少 target/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      findObject(data, value => value.type === 'add').target = 'future.unknown';
    },
    /未知 write path/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      findObject(data, value => value.path && value.op).op = 'approximately';
    },
    /未知 operator/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      delete findObject(data, value => value.path && value.op).op;
    },
    /未知 operator/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      delete findObject(data, value => value.path && value.op).path;
    },
    /未知 read path/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      findObject(data, value => value.path && value.op).path = 'future.unknown';
    },
    /未知 read path/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      findObject(data, value => value.type === 'add').value = Number.NaN;
    },
    /有限数值/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      delete findObject(data, value => value.type === 'add').value;
    },
    /缺少 value/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      delete findObject(data, value => value.type === 'set').value;
    },
    /缺少 value/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      findObject(data, value => value.type === 'transitionHousing').value.status = 'investmentVilla';
    },
    /非法枚举/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      const requirements = findObject(
        data,
        value => value.all && Array.isArray(value.all) && value.all.length,
      );
      requirements.al = requirements.all;
      delete requirements.all;
    },
    /未知 requirements 规则组/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      const command = findObject(data, value => value.type === 'claimDesire');
      command.target = 'finance.cash';
    },
    /claimDesire 当前只允许 target=desires/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => data.events.push(clone(data.events[0])),
    /重复 ID/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      findObject(data, value => Array.isArray(value.consequences) && value.consequences.length)
        .consequences[0].eventId = 'echo_missing';
    },
    /断裂 consequence/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      findObject(
        data,
        value =>
          Array.isArray(value.commitments) &&
          value.commitments.some(commitment => commitment.type === 'episode'),
      ).commitments.find(commitment => commitment.type === 'episode').phase = 999;
    },
    /断裂 episode phase/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      data.leakedAuthorKey = authorSlots.beatAuthorKey('education', 'leak');
    },
    /作者键/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      for (const event of data.events.filter(event => event.track === 'leisure'))
        for (const command of collect(event, value => value.target === 'desires.freedom.fulfillment'))
          command.target = 'desires.creation.fulfillment';
      data.metadata = { target: 'desires.freedom.fulfillment' };
    },
    /找不到证据路径/,
  );
  assert.equal(
    collect(DATA, value => value.type === 'add' && !Number.isFinite(value.value)).length,
    0,
    'all add commands must have finite values',
  );

  assert.equal(contract.conflictWeightMultiplier('leisure', ['freedom']), 1.2);
  assert.equal(contract.conflictWeightMultiplier('later', ['peace']), 1.2);
  assert.equal(contract.conflictWeightMultiplier('health', ['body']), 1.2);
  assert.equal(contract.conflictWeightMultiplier('employment', ['security', 'achievement']), 1);
  for (const [track,desire] of [
    ['children','familyBelonging'],['finance','security'],['education','achievement'],
    ['partnership','love'],['business','wealth'],['public','recognition'],['later','creation'],['later','care'],
  ]) assert.equal(contract.conflictWeightMultiplier(track,[desire]),1.2,`${track} must have ${desire} evidence`);
  assert.equal(contract.conflictWeightMultiplier('future-track', ['future-desire']), 1);

  const baselineTrace = neutralTrace(() => 1);
  const guardedTrace = neutralTrace(contract.conflictWeightMultiplier);
  assert.deepEqual(guardedTrace, baselineTrace, 'neutral trace must preserve selection and RNG');

  const registry = authorSlots.createAuthorSlotRegistry();
  const twoBeats = DATA.events.filter(event => event.kind === 'beat').slice(0, 2);
  for (const event of [...twoBeats].reverse()) {
    const slot = authorSlots.resolveAuthorSlot(
      registry,
      'beats',
      authorSlots.beatAuthorKey(event.track, event.text),
      event.id,
    );
    assert.equal(slot.id, event.id);
  }
  const syntheticKey = authorSlots.beatAuthorKey('future-track', 'registered insertion');
  authorSlots.registerAuthorSlot(
    registry,
    'beats',
    syntheticKey,
    { id: 'beat_999', track: 'future-track', localIndex: 0 },
    'synthetic insertion',
  );
  assert.deepEqual(
    authorSlots.resolveAuthorSlot(registry, 'beats', syntheticKey, 'synthetic insertion'),
    { id: 'beat_999', track: 'future-track', localIndex: 0 },
  );
  assert.deepEqual(
    authorSlots.registerAuthorSlot(
      registry,
      'beats',
      syntheticKey,
      { id: 'beat_999', track: 'future-track', localIndex: 0 },
      'synthetic insertion repeat',
    ),
    { id: 'beat_999', track: 'future-track', localIndex: 0 },
  );
  for (const event of twoBeats)
    assert.equal(
      authorSlots.resolveAuthorSlot(
        registry,
        'beats',
        authorSlots.beatAuthorKey(event.track, event.text),
        event.id,
      ).id,
      event.id,
    );
  assert.throws(
    () =>
      authorSlots.resolveAuthorSlot(
        registry,
        'beats',
        authorSlots.beatAuthorKey('future-track', 'registered nowhere'),
        'synthetic insertion',
      ),
    /未登记定义/,
  );

  const gameSource = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
  assert.match(gameSource,/aria-pressed/);
  assert.match(gameSource,/role="dialog"/);
  assert.match(gameSource,/aria-modal="true"/);
  const generatorUrl = pathToFileURL(path.join(ROOT, 'tools', 'generate-v5-data.mjs')).href;
  const trackCopyUrl = pathToFileURL(
    path.join(ROOT, 'content', 'zh-CN', 'tracks', 'index.mjs'),
  ).href;
  const cardsUrl = pathToFileURL(path.join(ROOT, 'content', 'zh-CN', 'cards.mjs')).href;
  const authorSlotsUrl = pathToFileURL(path.join(ROOT, 'tools', 'author-slots.mjs')).href;
  const manifestUrl = pathToFileURL(
    path.join(ROOT, 'tools', 'author-slot-manifest.mjs'),
  ).href;
  const movedData = runGeneratorScenario(
    `
      import { TRACK_COPY } from ${JSON.stringify(trackCopyUrl)};
      import { CARD_COPY } from ${JSON.stringify(cardsUrl)};
      [TRACK_COPY.education.beats[0], TRACK_COPY.education.beats[1]] =
        [TRACK_COPY.education.beats[1], TRACK_COPY.education.beats[0]];
      [TRACK_COPY.employment.decisions[0], TRACK_COPY.employment.decisions[1]] =
        [TRACK_COPY.employment.decisions[1], TRACK_COPY.employment.decisions[0]];
      [CARD_COPY[0][0], CARD_COPY[0][1]] = [CARD_COPY[0][1], CARD_COPY[0][0]];
      await import(${JSON.stringify(generatorUrl)});
    `,
    'author-move',
  );
  assert.deepEqual(movedData, DATA, 'moving authored definitions must preserve generated data');

  const insertedData = runGeneratorScenario(
    `
      import { TRACK_COPY } from ${JSON.stringify(trackCopyUrl)};
      import { beatAuthorKey } from ${JSON.stringify(authorSlotsUrl)};
      import { BEAT_SLOT_REGISTRATIONS } from ${JSON.stringify(manifestUrl)};
      const text = 'registered author-slot insertion';
      TRACK_COPY.leisure.beats.splice(1, 0, { ...TRACK_COPY.leisure.beats[0], text });
      BEAT_SLOT_REGISTRATIONS.push({
        key: beatAuthorKey('leisure', text),
        slot: { id: 'beat_481', track: 'leisure', localIndex: 32 },
      });
      await import(${JSON.stringify(generatorUrl)});
    `,
    'author-insert',
  );
  const insertedBeat = insertedData.events.find(event => event.id === 'beat_481');
  assert.equal(insertedBeat.track, 'leisure');
  insertedData.events = insertedData.events.filter(event => event.id !== 'beat_481');
  insertedData.trackCoverage.leisure.beats -= 1;
  assert.deepEqual(
    insertedData,
    DATA,
    'registered insertion must preserve unrelated IDs, effects, echoes, interactions, and witnesses',
  );

  const unregisteredFailure = runGeneratorScenario(
    `
      import { TRACK_COPY } from ${JSON.stringify(trackCopyUrl)};
      TRACK_COPY.leisure.beats.splice(1, 0, {
        ...TRACK_COPY.leisure.beats[0],
        text: 'unregistered author-slot insertion',
      });
      await import(${JSON.stringify(generatorUrl)});
    `,
    'author-unregistered',
    false,
  );
  assert.match(unregisteredFailure, /未登记定义/);

  assert.ok(
    gameSource.indexOf("import('./runtime-content-contract.mjs?v=0.6.11')") <
      gameSource.indexOf('fetch(`./data.json?v=${VERSION}`'),
    'shared contract import must precede data fetch',
  );

  browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 360, height: 773 } });
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on('request', request => requests.push(new globalThis.URL(request.url()).pathname));
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: data.schemaVersion,
          gameVersion: data.version,
          meta: {
            schemaVersion: data.schemaVersion,
            gameVersion: data.version,
            histories: [],
            codex: [],
            settings: { haptic: false, reducedMotion: true },
            stats: { runs: 0 },
            seen: { events: {}, cards: {}, families: {}, endings: {} },
            recentSeeds: [],
          },
          run: {
            seed: 'v062-correctness-guardrails',
            schemaVersion: data.schemaVersion,
            gameVersion: data.version,
            contentRevision: data.contentRevision,
            phase: 'birth',
          },
        }),
      );
    },
    { key: SAVE_KEY, data: DATA },
  );
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__LIFE_BOOTED__ === true);
  const contractRequest = requests.findIndex(item => item.endsWith('/runtime-content-contract.mjs'));
  const dataRequest = requests.findIndex(item => item.endsWith('/data.json'));
  assert.ok(contractRequest >= 0 && dataRequest > contractRequest, 'contract must load before data');

  const tracks = ['leisure', 'later', 'health'];
  const conflicts = ['freedom_belonging', 'wealth_peace', 'care_body'];
  for (let index = 0; index < tracks.length; index += 1) {
    const event = DATA.events.find(item => item.kind === 'beat' && item.track === tracks[index]);
    const [neutral, mapped] = await page.evaluate(
      ({ id, conflict }) => [
        window.__LIFE_DEBUG__.eventWeight(id, 'security_achievement'),
        window.__LIFE_DEBUG__.eventWeight(id, conflict),
      ],
      { id: event.id, conflict: conflicts[index] },
    );
    assert.ok(Math.abs(mapped / neutral - 1.2) < 1e-10, `${tracks[index]} weight`);
  }
  assert.equal(
    await page.evaluate(() =>
      window.__LIFE_DEBUG__.requirementsMatch([
        { path: 'age', op: 'gte', value: 999 },
      ])
    ),
    false,
    'non-empty array requirements must behave as an all-group',
  );

  await page.evaluate(() =>
    window.__LIFE_DEBUG__.patchRun({
      age: 30,
      timeline: [{ id: 'guardrail-a' }, { id: 'guardrail-b' }],
      health: { physical: 1, mental: 1, status: 'well' },
      habits: { stage: 'uncontrolled' },
    }),
  );
  const lowHealth = await page.evaluate(() => window.__LIFE_DEBUG__.settleYear().health);
  assert.ok(lowHealth.physical >= 0 && lowHealth.mental >= 0);
  await page.evaluate(() =>
    window.__LIFE_DEBUG__.patchRun({
      health: { physical: 150, mental: 150, status: 'well' },
      habits: { stage: 'none' },
    }),
  );
  const highHealth = await page.evaluate(() => window.__LIFE_DEBUG__.settleYear().health);
  assert.ok(highHealth.physical <= 100 && highHealth.mental <= 100);
  assert.deepEqual(errors, []);
  await context.close();

  const missingContext = await browser.newContext({ viewport: { width: 360, height: 773 } });
  const missingPage = await missingContext.newPage();
  await missingPage.route('**/runtime-content-contract.mjs*', route => route.abort());
  await missingPage.goto(URL, { waitUntil: 'domcontentloaded' });
  await missingPage.waitForFunction(
    () => document.body.innerText.includes('启动失败') && document.body.innerText.includes('共享内容合同'),
  );
  assert.equal(await missingPage.evaluate(() => window.__LIFE_BOOTED__), false);
  await missingContext.close();
  await browser.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        operators: [...generatedOperators].sort(),
        cardOperators: [...cardOperators].sort(),
        neutralCheckpoints: guardedTrace.length,
        authorGeneration: {
          movedDomains: ['beat', 'decision', 'card'],
          registeredInsertion: insertedBeat.id,
          unregisteredInsertionRejected: true,
        },
        evidenceRecords: summary.evidenceRecords,
        contractBeforeData: true,
        healthBounds: { low: lowHealth, high: highHealth },
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
