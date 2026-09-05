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
  assert.deepEqual([DATA.version, DATA.schemaVersion, DATA.contentRevision], ['0.7.0', 14, 37]);
  const acuteStart = DATA.events.find(event => event.id === 'decision_114');
  assert.deepEqual(
    acuteStart.presentationVariants.map(variant => [variant.id, variant.ageMin, variant.ageMax]),
    [['minor', 3, 17]],
  );
  expectContractFailure(
    validator.validateGeneratedData,
    fixture => {
      const event = fixture.events.find(item => item.id === 'decision_114');
      event.presentationVariants.push({ ...clone(event.presentationVariants[0]), id: 'overlap' });
    },
    /年龄范围不得重叠/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    fixture => {
      fixture.events.find(item => item.id === 'decision_114').presentationVariants[0].ageMin = 2;
    },
    /年龄范围不得越过事件范围/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    fixture => {
      fixture.events.find(item => item.id === 'decision_114').presentationVariants[0].choices.pop();
    },
    /选择覆盖数量必须与原选择一致/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    fixture => {
      fixture.events.find(item => item.id === 'decision_114').presentationVariants[0].choices[0].route = 'confirmed';
    },
    /选择覆盖不得携带机制字段/,
  );
  const employmentProfiles = new Set(DATA.employmentCatalog.profiles.map(profile => profile.id));
  const profileGate = eventId => {
    const event = DATA.events.find(item => item.id === eventId);
    assert.ok(event, `${eventId}: missing employment context fixture`);
    const rule = event.requirements.all.find(item => item.path === 'employment.profileId' && item.op === 'in');
    assert.ok(rule, `${eventId}: missing finite employment profile gate`);
    assert.ok(rule.value.every(id => employmentProfiles.has(id)), `${eventId}: context gate references an unknown profile`);
    return new Set(rule.value);
  };
  const officeProfiles = profileGate('beat_033');
  const projectProfiles = profileGate('beat_059');
  const shiftProfiles = profileGate('beat_038');
  for (const id of ['admin_assistant', 'rd_engineer']) assert.ok(officeProfiles.has(id), `${id}: matching office beat was made unreachable`);
  for (const id of ['station_rider', 'food_hourly']) assert.equal(officeProfiles.has(id), false, `${id}: office badge copy remained reachable`);
  assert.ok(projectProfiles.has('rd_engineer'),'R&D lost matching project-delivery copy');
  for (const id of ['station_rider','food_hourly','admin_assistant']) assert.equal(projectProfiles.has(id),false,`${id}: project-owner copy remained reachable`);
  for (const id of ['station_rider','food_hourly']) assert.ok(shiftProfiles.has(id),`${id}: matching shift copy was made unreachable`);
  for (const id of ['admin_assistant','rd_engineer']) assert.equal(shiftProfiles.has(id),false,`${id}: shift-site copy remained reachable`);
  const genericPayBeat=DATA.events.find(event=>event.kind==='beat'&&event.text==='工资到账那天，几笔固定开销也刚好扣走。');
  assert.ok(genericPayBeat&&!genericPayBeat.requirements.all.some(rule=>rule.path==='employment.profileId'),'a cross-occupation pay fact was over-gated');
  const recoveryWorkstation=DATA.events.find(event=>event.id==='beat_309');
  const recoveryOfficeRules=recoveryWorkstation.requirements.any.filter(rule=>['employment.profileId','employment.lastJob.profileId'].includes(rule.path));
  assert.equal(recoveryOfficeRules.length,2,'beat_309 did not cover both active work and care-leave job identity');
  assert.ok(recoveryOfficeRules.every(rule=>rule.value.includes('admin_assistant')&&rule.value.includes('rd_engineer')));
  assert.ok(recoveryOfficeRules.every(rule=>!rule.value.includes('station_rider')&&!rule.value.includes('food_hourly')),'beat_309 office copy remained reachable to shift-site profiles');
  assert.deepEqual(
    DATA.events.reduce((counts,event)=>({...counts,[event.kind]:(counts[event.kind]||0)+1}),{}),
    {beat:517,decision:214,consequence:214,blackSwan:20},
  );
  const generatedDecisions=DATA.events.filter(event=>event.kind==='decision');
  const episodeDecisions=generatedDecisions.filter(event=>event.episode);
  const generatedEpisodeIds=[...new Set(episodeDecisions.map(event=>event.episode.id))].sort();
  assert.deepEqual(
    [DATA.cards.length,generatedEpisodeIds.length,Object.keys(DATA.episodeCatalog).length,episodeDecisions.length,generatedDecisions.length-episodeDecisions.length],
    [83,64,44,148,66],
  );
  assert.deepEqual(
    generatedEpisodeIds.filter(id=>!Object.hasOwn(DATA.episodeCatalog,id)),
    contract.EPISODE_CATALOG_EXCEPTION_IDS,
  );
  const opportunities=generatedDecisions.filter(event=>event.opportunity);
  assert.equal(opportunities.length,14);
  assert.ok(opportunities.every(event=>contract.isOpportunityMetadata(event.opportunity)));
  assert.ok(opportunities.every(event=>!event.episode||event.episode.role==='start'));
  assert.deepEqual(
    DATA.events.filter(event=>event.kind==='beat'&&/^beat_(48[1-9]|49\d|50[0-5])$/.test(event.id)).map(event=>event.id),
    Array.from({length:25},(_,index)=>`beat_${481+index}`),
  );
  assert.deepEqual(
    generatedDecisions.filter(event=>Number(event.id.slice(9))>=209).map(event=>event.id),
    Array.from({length:8},(_,index)=>`decision_${209+index}`),
  );
  assert.deepEqual(
    DATA.cards.filter(card=>Number(card.id.slice(5))>=74).map(card=>card.id),
    Array.from({length:10},(_,index)=>`card_${74+index}`),
  );
  const attitudeEvents=DATA.events.filter(event=>event.attitudes);
  assert.equal(attitudeEvents.length,60);
  assert.ok(attitudeEvents.every(event=>event.attitudes.length===2));
  assert.deepEqual(
    DATA.cards.filter(card=>card.ongoingModifiers).map(card=>[card.id,card.ongoingModifiers]),
    [['card_79',['reliableCarePressure']],['card_81',['guardedPartnerBond']],['card_83',['delayHelpSeeking']]],
  );
  assert.deepEqual(DATA.events.filter(event=>event.helpDelay).map(event=>event.id),['beat_299','beat_301','beat_303','decision_114','decision_211']);
  const parentLossStages=generatedDecisions.filter(event=>event.episode?.id==='parent_loss');
  assert.deepEqual(parentLossStages.map(event=>[event.id,event.episode.phase,event.episode.role]),[
    ['decision_214',1,'start'],['decision_215',2,'progress'],['decision_216',3,'resolve'],
  ]);
  const adultIdentity=generatedDecisions.find(event=>event.id==='decision_162');
  assert.deepEqual(adultIdentity.choices[1].effects.find(effect=>effect.type==='claimDesire').value,['wealth','security']);
  assert.equal(adultIdentity.choices[1].text,'先把家底做厚，再谈下一步');
  const certificationResolve=generatedDecisions.find(event=>event.id==='decision_009');
  assert.deepEqual(Object.keys(certificationResolve.routeSituations).sort(),['skill_route','verified']);
  assert.ok(!certificationResolve.choices.some(choice=>choice.resultText.includes('岗位没有把这张证当准入')));
  const oldColleague=DATA.events.find(event=>event.kind==='beat'&&event.text.includes('旧同事转来'));
  assert.ok(oldColleague.requirements.all.some(rule=>rule.path==='employment.lastJob'&&rule.op==='truthy'));
  const wageRent=DATA.events.find(event=>event.kind==='beat'&&event.text.includes('工资到账后，房租'));
  assert.ok(wageRent.requirements.all.some(rule=>rule.path==='employment.status'&&rule.value==='employed'));
  assert.ok(!DATA.events.some(event=>event.text?.includes('存款多了一点')));
  const successfulRepayment=DATA.events.find(event=>event.kind==='beat'&&event.text.includes('本月还款已经成功'));
  assert.ok(successfulRepayment.requirements.all.some(rule=>rule.path==='finance.hasArrears'&&rule.op==='eq'&&rule.value===false));
  assert.ok(!DATA.events.some(event=>event.text?.includes('你补了一笔逾期款')));
  assert.ok(!DATA.events.some(event=>event.text?.includes('重复扣款核对后退了回来')));
  const badgeReturn=DATA.events.find(event=>event.kind==='beat'&&event.text.includes('交回工牌那天'));
  assert.ok(badgeReturn.requirements.all.some(rule=>rule.path==='employment.lastJob'&&rule.op==='truthy'));
  const parentalLeave=DATA.events.find(event=>event.kind==='beat'&&event.text.includes('谁请育儿假'));
  assert.ok(parentalLeave.requirements.all.some(rule=>rule.path==='employment.status'&&rule.value==='employed'));
  const landlordOffice=DATA.events.find(event=>event.kind==='beat'&&event.text.includes('房东不让注册办公地址'));
  assert.ok(landlordOffice.requirements.all.some(rule=>rule.path==='housing.status'&&rule.value==='renting'));
  const sharedRent=DATA.events.find(event=>event.kind==='beat'&&event.text.includes('房租能省一半'));
  assert.ok(sharedRent.requirements.all.some(rule=>rule.path==='housing.status'&&rule.value==='renting'));
  assert.ok(sharedRent.requirements.all.some(rule=>rule.path==='housing.arrangement'&&rule.value==='partner'));
  assert.ok(sharedRent.requirements.all.some(rule=>rule.path==='housing.costShare'&&rule.value==='joint'));
  assert.ok(!DATA.events.some(event=>event.text?.includes('房租到账后')));
  assert.ok(!DATA.events.some(event=>event.text?.includes('你和家里人把睡眠')));
  assert.ok(!DATA.events.some(event=>event.text?.includes('复诊或搬家那天')));
  const longTreatment=generatedDecisions.find(event=>event.id==='decision_121');
  assert.ok(longTreatment.requirements.all.some(rule=>rule.path==='health.conditionSeverity'&&rule.op==='gte'));
  assert.ok(longTreatment.requirements.any.some(rule=>rule.path==='health.status'||rule.path==='health.currentCondition'));
  assert.ok(longTreatment.choices.every(choice=>!choice.resultText.includes('剩下的日子只求别疼')));
  const leaveRecovery=DATA.events.find(event=>event.id==='beat_309');
  assert.ok(leaveRecovery.requirements.all.some(rule=>rule.path==='employment.status'&&rule.op==='in'));
  const decision091=generatedDecisions.find(event=>event.id==='decision_091');
  assert.ok(decision091.choices.every(choice=>!/(一年多|双方家里|逢年过节)/.test(choice.resultText)));
  const childBoundary=DATA.cards.find(card=>card.id==='card_71'),generalBoundary=DATA.cards.find(card=>card.id==='card_73');
  const portableCard=DATA.cards.find(card=>card.id==='card_65');
  assert.equal(portableCard.displayName,'一种能反复练的本事');
  assert.doesNotMatch(portableCard.text,/证书|资格|原单位/);
  assert.equal(childBoundary.interactionScope,'family');
  assert.ok(childBoundary.requirements.all.some(rule=>rule.path==='relationships.childCount'&&rule.op==='gte'&&rule.value===1));
  assert.equal(generalBoundary.interactionScope,'general');
  assert.ok(generalBoundary.requirements.all.some(rule=>rule.path==='relationships.childCount'&&rule.op==='eq'&&rule.value===0));
  const age55Cards=DATA.cards.filter(card=>card.drawAge===55);
  for(const childCount of[0,1])assert.ok(age55Cards.filter(card=>(card.requirements.all||[]).every(rule=>rule.path!=='relationships.childCount'||contract.compareByOperator(childCount,rule.op,rule.value))).length>=3);
  assert.equal(collect(DATA,value=>value?.cardInteraction&&value.cardInteraction.scope==='family').length,2);
  assert.ok(contract.COMMAND_TYPES.includes('confirmPartnership'));
  assert.ok(collect(DATA,value=>value.type==='confirmPartnership').length>=2);
  assert.equal(typeof DATA.episodeCatalog.becoming_parent.latePartnerEcho,'string');
  assert.doesNotMatch(DATA.episodeCatalog.becoming_parent.latePartnerEcho,/不孕|不可能怀孕|系统|窗口/);
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
  const legacySocialDecisions=socialDecisions.filter(event=>event.id!=='decision_210');
  assert.deepEqual([socialBeats.length,socialDecisions.length,socialConsequences.length],[27,9,9]);
  assert.ok([...socialBeats,...socialDecisions].every(event=>!event.episode&&!event.recurrence));
  assert.deepEqual(legacySocialDecisions.map(event=>event.choices.length).sort(),[2,2,2,3,3,3,4,4]);
  assert.equal(legacySocialDecisions.filter(event=>event.choices.some(choice=>choice.socialOutcome)).length,4);
  assert.ok(legacySocialDecisions.every(event=>event.choices.filter(choice=>choice.cardInteraction).length===1));
  const socialRefusalRoutes=new Set(['leftAlone','keptSpace','changedCircle','declinedClearly','leftOnTime','refusedFavor','declinedHousing','choseSolitude','usedFormalRoute','activeSolitude']);
  assert.ok(legacySocialDecisions.every(event=>event.choices.some(choice=>socialRefusalRoutes.has(choice.route))));
  assert.ok(socialDecisions.flatMap(event=>event.choices).filter(choice=>choice.socialOutcome).every(choice=>
    choice.socialOutcome.variants.length<=3&&
    choice.socialOutcome.variants.every(variant=>variant.memoryKey&&variant.resultText&&variant.consequenceText)
  ));
  assert.equal(DATA.codex.length,42);
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
  const wageCorrectionSwan=DATA.events.find(event=>event.id==='swan_09');
  assert.ok(wageCorrectionSwan.requirements.all.some(rule=>rule.path==='employment.status'&&rule.op==='eq'&&rule.value==='employed'));
  assert.ok(!DATA.events.some(event=>event.kind==='blackSwan'&&event.effects.some(command=>command.type==='addLiability'&&command.kind==='guarantee')));
  const mortgagePressure=DATA.events.find(event=>event.kind==='decision'&&event.prompt.includes('房贷加其他还款'));
  assert.ok(mortgagePressure.requirements.all.some(rule=>rule.path==='housing.status'&&rule.op==='eq'&&rule.value==='mortgaged'));
  assert.ok(mortgagePressure.requirements.all.some(rule=>rule.path==='finance.mortgagePaymentStress'&&rule.op==='eq'&&rule.value===true));
  const allChoices=DATA.events.filter(event=>event.kind==='decision').flatMap(event=>event.choices);
  assert.equal(allChoices.filter(choice=>choice.cardInteraction).length,212);
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
  const fableProfiles=['caregiver','overseasLife','platformYears','lateStudy','deliberateSolo','debtRebuilt','managedYears','creationFulfilled','activeSolitudeLife','closeFriendLife','centenarian','stayedHome'];
  assert.ok(fableProfiles.every(id=>DATA.endingProfiles.some(profile=>profile.id===id)));
  assert.equal(DATA.endingProfiles.find(profile=>profile.id==='wealthApex').nearMissHint,undefined);

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
    data => {
      data.events.find(event=>event.opportunity).opportunity.group='housing.everything';
    },
    /非法 opportunity/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      data.events.find(event=>event.routeSituations).routeSituations={verified:'只剩一路'};
    },
    /必须覆盖前序可继续路线/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      data.cards.find(card=>card.id==='card_71').interactionScope='children-only';
    },
    /非法卡牌 scope/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      data.events.find(event=>event.attitudes).attitudes[0].key='shrug';
    },
    /非法态度 key/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      data.events.find(event=>event.attitudes).attitudes[0].effects[0]={type:'add',target:'finance.cash',value:1};
    },
    /态度只允许幅度不超过 2 的软 add/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      data.cards.find(card=>card.ongoingModifiers).ongoingModifiers=['futureModifier'];
    },
    /非法持续卡牌效果/,
  );
  expectContractFailure(
    validator.validateGeneratedData,
    data => {
      findObject(data,value=>value.type==='confirmPartnership').value='dating';
    },
    /只允许 partnered/,
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
  assert.ok(!gameSource.includes(DATA.episodeCatalog.becoming_parent.latePartnerEcho),'late family-planning echo bypassed generated author source');
  assert.match(gameSource,/aria-pressed/);
  assert.match(gameSource,/role="dialog"/);
  assert.match(gameSource,/aria-modal="true"/);
  assert.match(gameSource,/event\.helpDelay && ongoingModifiers\(run\)\.has\('delayHelpSeeking'\)/);
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
        slot: { id: 'beat_506', track: 'leisure', localIndex: 36 },
      });
      await import(${JSON.stringify(generatorUrl)});
    `,
    'author-insert',
  );
  const insertedBeat = insertedData.events.find(event => event.id === 'beat_506');
  assert.equal(insertedBeat.track, 'leisure');
  insertedData.events = insertedData.events.filter(event => event.id !== 'beat_506');
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
    gameSource.indexOf("import('./runtime-content-contract.mjs?v=0.7.0')") <
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

  const pacingContract = await page.evaluate(() => {
    const debug = window.__LIFE_DEBUG__, run = debug.snapshot(), budgets = debug.decisionStageBudgets();
    const lifespans = Array.from({ length: 1000 }, (_, roll) => debug.naturalDeathAgeForRoll(roll)).sort((a,b)=>a-b);
    return {
      target: run.targetDecisions,
      budgets,
      budgetTotal: Object.values(budgets).reduce((sum,value)=>sum+value,0),
      lifespan: { minimum: lifespans[0], maximum: lifespans.at(-1), median: (lifespans[499]+lifespans[500])/2 },
    };
  });
  assert.ok(pacingContract.target>=22&&pacingContract.target<=28);
  assert.equal(pacingContract.budgetTotal,pacingContract.target);
  assert.ok(pacingContract.budgets.infancy+pacingContract.budgets.childhood>=1&&pacingContract.budgets.infancy+pacingContract.budgets.childhood<=3);
  assert.ok(pacingContract.budgets.elder>=1);
  assert.deepEqual(pacingContract.lifespan,{minimum:52,maximum:105,median:87});
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({age:40,swanCount:0,swanPityAge:40,lastSwanAge:-20}));
  assert.equal(await page.evaluate(() => window.__LIFE_DEBUG__.blackSwanRate()),0.06);
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({swanCount:1}));
  assert.equal(await page.evaluate(() => window.__LIFE_DEBUG__.blackSwanRate()),0.008);

  const employmentBeat=DATA.events.find(event=>event.kind==='beat'&&event.track==='employment');
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({attrs:{looks:5,ambition:5,intellect:5,social:5,stability:5,physique:5}}));
  const neutralAttributeWeights=await page.evaluate(id=>({ordinary:window.__LIFE_DEBUG__.continuityWeight(id,false),continuity:window.__LIFE_DEBUG__.continuityWeight(id,true),multiplier:window.__LIFE_DEBUG__.attributeWeightMultiplier(id)}),employmentBeat.id);
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({attrs:{looks:5,ambition:10,intellect:5,social:5,stability:5,physique:5}}));
  const highAttributeWeights=await page.evaluate(id=>({ordinary:window.__LIFE_DEBUG__.continuityWeight(id,false),continuity:window.__LIFE_DEBUG__.continuityWeight(id,true),multiplier:window.__LIFE_DEBUG__.attributeWeightMultiplier(id)}),employmentBeat.id);
  assert.equal(highAttributeWeights.ordinary,neutralAttributeWeights.ordinary,'attributes changed a protected/non-continuity event weight');
  assert.ok(highAttributeWeights.continuity>neutralAttributeWeights.continuity);
  assert.ok(highAttributeWeights.multiplier>=0.65&&highAttributeWeights.multiplier<=1.5);

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    age:60,phase:'playing',timeline:[{id:'attribute-drift-fixture',age:60}],outcomeTags:{},
    attrs:{looks:6,ambition:6,intellect:6,social:6,stability:6,physique:6},
    activity:{mode:'seeking',years:5},employment:{status:'unemployed',lastGrowthAge:null},
    pressures:{money:80,family:10,career:10,body:60,loneliness:80},health:{status:'limited',physical:55,mental:55},finance:{cash:500000,liabilities:[]}
  }));
  const firstDrift=await page.evaluate(() => {const run=window.__LIFE_DEBUG__.settleYear();return {attrs:run.attrs,derived:{presence:run.capabilities.presence,drive:run.capabilities.drive,composure:run.capabilities.composure}}});
  const secondDrift=await page.evaluate(() => window.__LIFE_DEBUG__.settleYear().attrs);
  assert.deepEqual(secondDrift,firstDrift.attrs,'attribute drift settled twice at the same age');
  assert.ok(!(await page.evaluate(() => Object.keys(window.__LIFE_DEBUG__.snapshot().outcomeTags).some(key=>key.startsWith('attribute-drift:')))),'attribute idempotency markers leaked into ending signals');
  assert.ok(Object.values(firstDrift.attrs).every(value=>value>=1&&value<=10));
  assert.ok(Object.values(firstDrift.derived).every(value=>value>=0&&value<=100));

  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({
    age:40,usedEvents:[],outcomeTags:{},employment:{status:'gig',contractType:'platform'},
    mobility:{platformYears:0,platformDependence:0},finance:{cash:500000,liabilities:[]},
    pressures:{money:10,family:10,career:10,body:10,loneliness:10},health:{status:'well',physical:80,mental:80}
  }));
  assert.equal((await page.evaluate(() => window.__LIFE_DEBUG__.settleYear())).mobility.platformYears,1,'an active platform-work year was not accumulated');
  await page.evaluate(() => window.__LIFE_DEBUG__.patchRun({employment:{status:'employed',contractType:'openEnded'}}));
  assert.equal((await page.evaluate(() => window.__LIFE_DEBUG__.settleYear())).mobility.platformYears,1,'a non-platform year was counted as platform history');

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
