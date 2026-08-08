import {
  COMMAND_TYPES,
  HOUSING_ACCESSIBILITY,
  HOUSING_ARRANGEMENTS,
  HOUSING_CHOICE_KINDS,
  HOUSING_COST_SHARES,
  HOUSING_REGIONS,
  HOUSING_STABILITY,
  HOUSING_STATUS,
  READ_PATHS,
  RUNTIME_OPERATORS,
  TRACK_DESIRE_EVIDENCE,
  WRITE_PATHS,
  isCommandType,
  isReadPath,
  isRuntimeOperator,
  isWritePath,
} from '../runtime-content-contract.mjs';
import { isAuthorKey } from './author-slots.mjs';

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const fail = (location, message) => {
  throw new Error(`内容合同失败 @ ${location}: ${message}`);
};

const COMMAND_TARGETS = Object.freeze({
  expose: 'development.routeExposure',
  tag: 'history',
  addLiability: 'finance.liabilities',
  repayDebt: 'finance.liabilities',
  restructureDebt: 'finance.liabilities',
  healthIncident: 'health',
  healthRecovery: 'health',
  resolveApplication: 'education',
  resolveGraduateApplication: 'education',
  resolveFirstJobApplication: 'employment',
  acceptFirstJobOffer: 'employment',
  applyEmploymentProfile: 'employment',
  leaveEmployment: 'employment',
  adjustJobTier: 'employment',
  resolveLayoff: 'employment',
  grantCredential: 'education',
  createPerson: 'people',
  transitionPartner: 'people',
  transitionHousing: 'housing',
  transition: 'education',
  claimDesire: 'desires',
});

const COMMAND_EXTRA_FIELDS = Object.freeze({
  addLiability: ['kind', 'rate', 'guaranteed'],
  restructureDebt: ['rate'],
  healthIncident: ['condition'],
  healthRecovery: ['resolve'],
  createPerson: ['relation'],
  transition: ['status'],
  claimDesire: ['replace'],
});

function validateOperand(rule, location) {
  if (!Object.hasOwn(rule, 'value')) fail(location, `${rule.op} 缺少 value`);
  if (['in', 'notIn'].includes(rule.op) && !Array.isArray(rule.value))
    fail(location, `${rule.op} 的 value 必须是数组`);
  if (['gte', 'lte', 'gt', 'lt'].includes(rule.op) && !finite(rule.value))
    fail(location, `${rule.op} 的 value 必须是有限数值`);
  if (
    ['eq', 'neq', 'includes', 'truthy'].includes(rule.op) &&
    (rule.value === undefined ||
      (typeof rule.value === 'number' && !Number.isFinite(rule.value)) ||
      (typeof rule.value === 'object' && rule.value !== null))
  )
    fail(location, `${rule.op} 的 value 必须是标量`);
}

function validateHousingTransition(value, location) {
  if (!isObject(value)) fail(location, 'transitionHousing.value 必须是对象');
  const allowed = new Set([
    'status', 'value', 'arrangement', 'region', 'stability', 'accessibility', 'costShare',
    'coResidentRefs', 'kind', 'reason', 'housingChoiceKind', 'debtException',
  ]);
  for (const key of Object.keys(value))
    if (!allowed.has(key)) fail(`${location}.${key}`, '未知住房转换字段');
  const enumFields = [
    ['status', HOUSING_STATUS],
    ['arrangement', HOUSING_ARRANGEMENTS],
    ['region', HOUSING_REGIONS],
    ['stability', HOUSING_STABILITY],
    ['accessibility', HOUSING_ACCESSIBILITY],
    ['costShare', HOUSING_COST_SHARES],
  ];
  for (const [key, values] of enumFields)
    if (
      Object.hasOwn(value, key) &&
      !values.includes(value[key]) &&
      !(key === 'region' && ['$educationRegion', '$homeRegion'].includes(value[key]))
    )
      fail(`${location}.${key}`, `非法枚举：${String(value[key])}`);
  if (Object.hasOwn(value, 'value') && !finite(value.value)) fail(`${location}.value`, '必须是有限数值');
  if (Object.hasOwn(value, 'coResidentRefs') &&
      (!Array.isArray(value.coResidentRefs) || value.coResidentRefs.some((id) => typeof id !== 'string')))
    fail(`${location}.coResidentRefs`, '必须是字符串数组');
  if (!['origin', 'background', 'choice', 'forced', 'finance'].includes(value.kind))
    fail(`${location}.kind`, '必须声明合法 kind');
  if (typeof value.reason !== 'string' || !value.reason.trim())
    fail(`${location}.reason`, '必须是非空字符串');
  if (Object.hasOwn(value, 'housingChoiceKind') &&
      !HOUSING_CHOICE_KINDS.includes(value.housingChoiceKind))
    fail(`${location}.housingChoiceKind`, '非法住房选择类型');
  if (Object.hasOwn(value, 'debtException') && typeof value.debtException !== 'boolean')
    fail(`${location}.debtException`, '必须是布尔值');
  if (value.kind === 'choice' && !HOUSING_CHOICE_KINDS.includes(value.housingChoiceKind))
    fail(`${location}.housingChoiceKind`, '住房选择必须声明类型');
}

export function validatePredicate(rule, location = 'predicate') {
  if (!isObject(rule)) fail(location, 'predicate 必须是对象');
  for (const key of Object.keys(rule))
    if (!['path', 'op', 'value'].includes(key)) fail(`${location}.${key}`, '未知 predicate 字段');
  if (!isReadPath(rule.path)) fail(location, `未知 read path：${String(rule.path)}`);
  if (!isRuntimeOperator(rule.op)) fail(location, `未知 operator：${String(rule.op)}`);
  validateOperand(rule, location);
}

function validateRequirements(requirements, location) {
  if (Array.isArray(requirements)) {
    requirements.forEach((rule, index) => validatePredicate(rule, `${location}[${index}]`));
    return;
  }
  if (!isObject(requirements)) fail(location, 'requirements 必须是数组或分组对象');
  for (const key of Object.keys(requirements))
    if (!['all', 'any', 'none'].includes(key))
      fail(`${location}.${key}`, '未知 requirements 规则组');
  for (const group of ['all', 'any', 'none']) {
    const rules = requirements[group] ?? [];
    if (!Array.isArray(rules)) fail(`${location}.${group}`, '规则组必须是数组');
    rules.forEach((rule, index) => validatePredicate(rule, `${location}.${group}[${index}]`));
  }
}

function validateRecurrence(event, location) {
  if (event.recurrence === undefined) return;
  if (event.kind !== 'beat') fail(`${location}.recurrence`, '只允许 beat 声明复发');
  if (!isObject(event.recurrence)) fail(`${location}.recurrence`, 'recurrence 必须是对象');
  for (const key of Object.keys(event.recurrence))
    if (!['key', 'sameEventYears', 'sameGroupYears'].includes(key))
      fail(`${location}.recurrence.${key}`, '未知 recurrence 字段');
  if (typeof event.recurrence.key !== 'string' || !event.recurrence.key.trim())
    fail(`${location}.recurrence.key`, 'key 必须是非空稳定字符串');
  for (const key of ['sameEventYears', 'sameGroupYears'])
    if (!Number.isInteger(event.recurrence[key]) || event.recurrence[key] <= 0)
      fail(`${location}.recurrence.${key}`, '冷却年数必须是正整数');
}

export function validateCommand(command, location = 'command') {
  if (!isObject(command)) fail(location, 'command 必须是对象');
  if (!isCommandType(command.type)) fail(location, `未知 command：${String(command.type)}`);
  if (!Object.hasOwn(command, 'target')) fail(location, `${command.type} 缺少 target`);
  if (!Object.hasOwn(command, 'value')) fail(location, `${command.type} 缺少 value`);
  if (typeof command.target !== 'string' || !isWritePath(command.target))
    fail(location, `未知 write path：${String(command.target)}`);
  const requiredTarget = COMMAND_TARGETS[command.type];
  if (requiredTarget && command.target !== requiredTarget)
    fail(location, `${command.type} 当前只允许 target=${requiredTarget}`);
  const allowedFields = new Set([
    'type',
    'target',
    'value',
    ...(COMMAND_EXTRA_FIELDS[command.type] || []),
  ]);
  for (const key of Object.keys(command))
    if (!allowedFields.has(key)) fail(`${location}.${key}`, `${command.type} 不允许该字段`);

  if (command.type === 'transitionHousing') validateHousingTransition(command.value, `${location}.value`);

  if (
    [
      'add',
      'addLiability',
      'repayDebt',
      'restructureDebt',
      'healthIncident',
      'healthRecovery',
      'createPerson',
    ].includes(command.type) &&
    !finite(command.value)
  )
    fail(location, `${command.type}.value 必须是有限数值`);
  if (
    ['expose', 'tag', 'resolveApplication', 'resolveGraduateApplication', 'resolveFirstJobApplication',
      'acceptFirstJobOffer', 'applyEmploymentProfile', 'leaveEmployment', 'resolveLayoff',
      'grantCredential', 'transitionPartner', 'transition'].includes(command.type) &&
    typeof command.value !== 'string'
  )
    fail(location, `${command.type}.value 必须是字符串`);
  if (command.type === 'adjustJobTier' && !finite(command.value))
    fail(location, 'adjustJobTier.value 必须是有限数值');
  if (
    command.type === 'set' &&
    !(
      typeof command.value === 'string' ||
      typeof command.value === 'boolean' ||
      finite(command.value)
    )
  )
    fail(location, 'set.value 必须是字符串、布尔值或有限数值');
  if (
    command.type === 'claimDesire' &&
    (!Array.isArray(command.value) ||
      command.value.some((value) => typeof value !== 'string'))
  )
    fail(location, 'claimDesire.value 必须是字符串数组');
  if (
    command.type === 'claimDesire' &&
    Object.hasOwn(command, 'replace') &&
    typeof command.replace !== 'boolean'
  )
    fail(location, 'claimDesire.replace 必须是布尔值');
  if (command.type === 'createPerson' && typeof command.relation !== 'string')
    fail(location, 'createPerson.relation 必须是字符串');
  if (command.type === 'transition' && typeof command.status !== 'string')
    fail(location, 'transition.status 必须是字符串');
  if (command.type === 'healthIncident' && typeof command.condition !== 'string')
    fail(location, 'healthIncident.condition 必须是字符串');
  if (
    command.type === 'healthRecovery' &&
    Object.hasOwn(command, 'resolve') &&
    typeof command.resolve !== 'boolean'
  )
    fail(location, 'healthRecovery.resolve 必须是布尔值');
  if (
    command.type === 'addLiability' &&
    (typeof command.kind !== 'string' || !finite(command.rate))
  )
    fail(location, 'addLiability.kind/rate 不合法');
  if (
    command.type === 'addLiability' &&
    Object.hasOwn(command, 'guaranteed') &&
    typeof command.guaranteed !== 'boolean'
  )
    fail(location, 'addLiability.guaranteed 必须是布尔值');
  if (command.type === 'restructureDebt' && !finite(command.rate))
    fail(location, 'restructureDebt.rate 必须是有限数值');
  if (Object.values(command).some((value) => typeof value === 'number' && !Number.isFinite(value)))
    fail(location, 'command 含非有限数值');
}

function walkContracts(value, location = 'data') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkContracts(item, `${location}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const childLocation = `${location}.${key}`;
    if (['effects', 'patch'].includes(key)) {
      if (!Array.isArray(child)) fail(childLocation, 'command 容器必须是数组');
      child.forEach((command, index) => validateCommand(command, `${childLocation}[${index}]`));
      continue;
    }
    if (['requirements', 'showWhen', 'activeRequirements', 'activeShowWhen'].includes(key)) {
      validateRequirements(child, childLocation);
      continue;
    }
    if (['stateAny', 'stateAll'].includes(key)) {
      if (!Array.isArray(child)) fail(childLocation, 'predicate 容器必须是数组');
      child.forEach((rule, index) => validatePredicate(rule, `${childLocation}[${index}]`));
      continue;
    }
    walkContracts(child, childLocation);
  }
}

function assertUnique(items, domain, key = 'id') {
  const seen = new Map();
  for (let index = 0; index < items.length; index += 1) {
    const id = items[index]?.[key];
    if (typeof id !== 'string' || !id) fail(`${domain}[${index}]`, `缺少 ${key}`);
    if (seen.has(id)) fail(`${domain}[${index}].${key}`, `重复 ID：${id}`);
    seen.set(id, index);
  }
}

function assertNoAuthorKeys(value, location = 'data') {
  if (!value || typeof value !== 'object') {
    if (isAuthorKey(value)) fail(location, '作者键泄漏到正式输出');
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoAuthorKeys(item, `${location}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === '_authorKey' || key === 'authorKey')
      fail(`${location}.${key}`, '作者键字段泄漏到正式输出');
    assertNoAuthorKeys(child, `${location}.${key}`);
  }
}

function validateReferences(data) {
  const events = new Map(data.events.map((event) => [event.id, event]));
  const profiles = new Set(data.endingProfiles.map((profile) => profile.id));
  const episodePhases = new Map();
  for (const event of data.events.filter(
    (candidate) => candidate.kind === 'decision' && candidate.episode?.id
  )) {
    const key = `${event.episode.id}\0${event.episode.phase}`;
    if (episodePhases.has(key))
      fail(`events.${event.id}.episode`, `重复 episode phase：${event.episode.id}#${event.episode.phase}`);
    episodePhases.set(key, event);
  }

  for (const event of data.events) {
    validateRecurrence(event, `events.${event.id}`);
    if (event.episode?.ageAdvanceYears !== undefined) {
      if (event.track !== 'education' && event.episode.id !== 'pregnancy_decision')
        fail(`events.${event.id}.episode.ageAdvanceYears`, '只允许教育事件和怀孕短期复议声明年龄推进');
      if (event.episode.ageAdvanceYears !== 0)
        fail(`events.${event.id}.episode.ageAdvanceYears`, '当前只允许声明同龄续接 0');
    }
    if (event.requirements !== undefined)
      validateRequirements(event.requirements, `events.${event.id}.requirements`);
    for (const [choiceIndex, choice] of (event.choices || []).entries()) {
      validateRequirements(choice.requirements ?? [], `events.${event.id}.choices[${choiceIndex}]`);
      for (const [specIndex, spec] of (choice.consequences || []).entries()) {
        const consequence = events.get(spec.eventId);
        if (!consequence)
          fail(
            `events.${event.id}.choices[${choiceIndex}].consequences[${specIndex}]`,
            `断裂 consequence：${spec.eventId}`
          );
        if (consequence.kind !== 'consequence')
          fail(
            `events.${event.id}.choices[${choiceIndex}].consequences[${specIndex}]`,
            `目标不是 consequence：${spec.eventId}`
          );
        if (consequence.sourceDecisionId !== event.id)
          fail(
            `events.${event.id}.choices[${choiceIndex}].consequences[${specIndex}]`,
            `consequence 反向引用错误：${spec.eventId}`
          );
        if (!consequence.choiceOutcomes?.[choice.memoryKey])
          fail(
            `events.${event.id}.choices[${choiceIndex}]`,
            `consequence ${spec.eventId} 缺少 outcome ${choice.memoryKey}`
          );
      }
      for (const [commitmentIndex, commitment] of (choice.commitments || []).entries()) {
        if (commitment.type === 'episode') {
          const location = `events.${event.id}.choices[${choiceIndex}].commitments[${commitmentIndex}]`;
          const phase = episodePhases.get(`${commitment.id}\0${commitment.phase}`);
          if (!phase)
            fail(location, `断裂 episode phase：${commitment.id}#${commitment.phase}`);
          if (!phase.choices?.some((candidate) => candidate.route === commitment.route))
            fail(location, `断裂 episode route：${commitment.id}#${commitment.phase}/${commitment.route}`);
        }
      }
    }
    if (event.kind === 'consequence') {
      const source = events.get(event.sourceDecisionId);
      if (!source || source.kind !== 'decision')
        fail(`events.${event.id}.sourceDecisionId`, `断裂 source decision：${event.sourceDecisionId}`);
      const expectedOutcomes = new Set((source.choices || []).map((choice) => choice.memoryKey));
      for (const memoryKey of Object.keys(event.choiceOutcomes || {}))
        if (!expectedOutcomes.has(memoryKey))
          fail(`events.${event.id}.choiceOutcomes.${memoryKey}`, '不存在对应的 source choice');
    }
  }
  for (const [index, title] of data.endingTitles.entries())
    if (!profiles.has(title.profileId))
      fail(`endingTitles[${index}].profileId`, `断裂 ending profile：${title.profileId}`);
}

function validateEvidence(data) {
  const desires = new Set(Object.keys(data.desires));
  const tracks = new Set(data.events.map((event) => event.track));
  const pairs = new Set();
  for (const [index, entry] of TRACK_DESIRE_EVIDENCE.entries()) {
    const location = `TRACK_DESIRE_EVIDENCE[${index}]`;
    if (!tracks.has(entry.track)) fail(location, `不存在的轨道：${entry.track}`);
    if (!desires.has(entry.desire)) fail(location, `不存在的欲望：${entry.desire}`);
    const pair = `${entry.track}\0${entry.desire}`;
    if (pairs.has(pair)) fail(location, `重复映射：${entry.track} + ${entry.desire}`);
    pairs.add(pair);
    const hasEvidence = data.events
      .filter((event) => event.track === entry.track)
      .some((event) => {
        let found = false;
        const scan = (value) => {
          if (!value || typeof value !== 'object' || found) return;
          if (Array.isArray(value)) {
            value.forEach(scan);
            return;
          }
          for (const [key, child] of Object.entries(value)) {
            if (
              ['effects', 'patch'].includes(key) &&
              Array.isArray(child) &&
              child.some(
                (command) =>
                  command.type === 'add' && command.target === entry.evidencePath
              )
            ) {
              found = true;
              return;
            }
            scan(child);
          }
        };
        scan(event);
        return found;
      });
    if (!hasEvidence) fail(location, `找不到证据路径：${entry.evidencePath}`);
  }
}

function validateEmploymentCatalog(data) {
  const catalog=data.employmentCatalog;
  if(!isObject(catalog))fail('employmentCatalog','缺少统一职业目录');
  const tierIds=new Set(Object.keys(catalog.tiers||{}));
  const regionIds=new Set((data.locations||[]).map(location=>location.id));
  const profileIds=new Set();
  for(const [id,value] of Object.entries(catalog.regionalCoefficients||{})){
    if(!regionIds.has(id))fail(`employmentCatalog.regionalCoefficients.${id}`,'地区不存在');
    if(!finite(value)||value<=0)fail(`employmentCatalog.regionalCoefficients.${id}`,'地区系数必须为正数');
  }
  if(regionIds.size!==Object.keys(catalog.regionalCoefficients||{}).length)
    fail('employmentCatalog.regionalCoefficients','必须完整覆盖 location ID');
  for(const [index,profile] of (catalog.profiles||[]).entries()){
    const location=`employmentCatalog.profiles[${index}]`;
    if(profileIds.has(profile.id))fail(location,`重复职业 ID：${profile.id}`);
    profileIds.add(profile.id);
    if(!tierIds.has(profile.tier))fail(location,`未知 tier：${profile.tier}`);
    if(profile.tier==='T4'&&profile.firstJobEligible)fail(location,'T4 不得进入首份工作池');
    if(!Object.hasOwn(catalog.incomeModes||{},profile.incomeStability))
      fail(location,`未知收入形态：${profile.incomeStability}`);
    if(!Object.hasOwn(catalog.salaryBands||{},profile.salaryBand))
      fail(location,`未知薪资档：${profile.salaryBand}`);
    for(const region of profile.regions||[])
      if(!regionIds.has(region))fail(location,`未知地区：${region}`);
  }
  for(const [id,tier] of Object.entries(catalog.tiers||{}))
    if(id!=='T4'&&(!finite(tier.monthlyBase)||tier.monthlyBase<=0))
      fail(`employmentCatalog.tiers.${id}`,'T0-T3 月薪基准必须为正数');
  const profileById=new Map((catalog.profiles||[]).map(profile=>[profile.id,profile]));
  for(const [fromId,toId] of Object.entries(catalog.promotionMap||{})){
    const from=profileById.get(fromId),to=profileById.get(toId);
    if(!from||!to)fail(`employmentCatalog.promotionMap.${fromId}`,'晋升映射引用未知职业');
    const fromTier=Number(from.tier.slice(1)),toTier=Number(to.tier.slice(1));
    if(toTier!==fromTier+1)fail(`employmentCatalog.promotionMap.${fromId}`,'晋升映射必须恰好提高一级');
  }
  const scenarioIds=new Set();
  for(const [index,scenario] of (catalog.recruitmentScenarios||[]).entries()){
    const location=`employmentCatalog.recruitmentScenarios[${index}]`;
    if(scenarioIds.has(scenario.id))fail(location,`重复招聘场景 ID：${scenario.id}`);
    scenarioIds.add(scenario.id);
    if(!scenario.title||!scenario.situation||!scenario.prompt)fail(location,'缺少标题、情境或提问');
    if(!Array.isArray(scenario.age)||scenario.age.length!==2)fail(location,'年龄范围必须有上下限');
    if(!Array.isArray(scenario.tiers)||!scenario.tiers.length)fail(location,'至少需要一个职业层级');
    for(const tier of scenario.tiers)if(!tierIds.has(tier))fail(location,`未知 tier：${tier}`);
    for(const region of scenario.locations||[])if(!regionIds.has(region))fail(location,`未知地区：${region}`);
    for(const profileId of scenario.profileIds||[])if(!profileIds.has(profileId))fail(location,`未知职业：${profileId}`);
    if(!Array.isArray(scenario.choices)||scenario.choices.length!==3)fail(location,'招聘场景必须有三个可玩选择');
    for(const [choiceIndex,choice] of scenario.choices.entries()){
      if(!choice.text||!choice.resultText||typeof choice.offerIntent!=='boolean')
        fail(`${location}.choices[${choiceIndex}]`,'选择缺少文本、结果或录用意向');
      if(!choice.offerIntent)continue;
      const entryPath=choice.entryPath||scenario.entryPath;
      const allowedProfileIds=choice.profileIds||scenario.profileIds;
      const playableProfiles=(catalog.profiles||[]).filter(profile=>
        profile.firstJobEligible&&
        profile.tier!=='T4'&&
        scenario.tiers.includes(profile.tier)&&
        (!allowedProfileIds?.length||allowedProfileIds.includes(profile.id))&&
        (!scenario.locations?.length||(profile.regions||[]).some(region=>scenario.locations.includes(region)))&&
        (!entryPath||(profile.entryPaths||[]).includes(entryPath))
      );
      if(!playableProfiles.length)
        fail(`${location}.choices[${choiceIndex}]`,'录用选择找不到符合层级、地区和入口的职业');
      for(const tier of scenario.tiers)
        if(!playableProfiles.some(profile=>profile.tier===tier))
          fail(`${location}.choices[${choiceIndex}]`,`录用选择在 ${tier} 没有可达职业`);
    }
  }
  const expectedScenarioIds=Array.from({length:14},(_,index)=>`E${String(index+1).padStart(2,'0')}`);
  if(expectedScenarioIds.some(id=>!scenarioIds.has(id))||scenarioIds.size!==expectedScenarioIds.length)
    fail('employmentCatalog.recruitmentScenarios','必须完整且仅包含 E01-E14');
}

export function validateGeneratedData(data) {
  if (!isObject(data)) fail('data', '根数据必须是对象');
  assertUnique(data.locations, 'locations');
  assertUnique(data.conflicts, 'conflicts');
  assertUnique(data.familyArchetypes, 'familyArchetypes');
  assertUnique(data.familySecrets, 'familySecrets');
  assertUnique(data.cards, 'cards');
  assertUnique(data.events, 'events');
  assertUnique(data.endingProfiles, 'endingProfiles');
  assertUnique(data.endingTitles, 'endingTitles');
  assertUnique(data.codex, 'codex');
  assertUnique(
    data.events.flatMap((event) => event.choices || []),
    'choices'
  );
  walkContracts(data);
  validateReferences(data);
  validateEvidence(data);
  validateEmploymentCatalog(data);
  assertNoAuthorKeys(data);
  return {
    operators: [...RUNTIME_OPERATORS],
    commands: [...COMMAND_TYPES],
    readPaths: [...READ_PATHS],
    writePaths: [...WRITE_PATHS],
    evidenceRecords: TRACK_DESIRE_EVIDENCE.length,
  };
}
