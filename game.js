(async () => {
  'use strict';

  const app = document.getElementById('app');
  let CONTRACT;
  try {
    CONTRACT = await import('./runtime-content-contract.mjs?v=0.6.5');
  } catch (error) {
    throw new Error(`共享内容合同加载失败：${error?.message || error}`);
  }
  const { UI_COPY } = await import('./content/zh-CN/ui.mjs');
  const APP_KEY = 'life-unloaded-2026-v1';
  const VERSION = '0.6.5',
    SCHEMA_VERSION = 11,
    CONTENT_REVISION = 23;
  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
    );
  const money = (value) => {
    const n = Number(value) || 0,
      abs = Math.abs(n);
    if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}万亿`;
    if (abs >= 1e8) return `${(n / 1e8).toFixed(2)}亿`;
    if (abs >= 1e4) return `${(n / 1e4).toFixed(abs >= 1e6 ? 0 : 1)}万`;
    return Math.round(n).toLocaleString('zh-CN');
  };
  const hashSeed = (value) => {
    let h = 2166136261;
    for (const char of String(value)) {
      h ^= char.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const makeSeed = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const getPath = (object, path) =>
    String(path)
      .split('.')
      .reduce((value, key) => value?.[key], object);
  const setPath = (object, path, value) => {
    const keys = String(path).split('.');
    let target = object;
    for (const key of keys.slice(0, -1)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      target = target[key];
    }
    target[keys.at(-1)] = value;
    return value;
  };
  const addPath = (object, path, value) =>
    setPath(object, path, (Number(getPath(object, path)) || 0) + Number(value || 0));
  const stageForAge = (age) =>
    Object.entries(DATA.stages).find(([, range]) => age >= range[0] && age <= range[1])?.[0] ||
    'elder';
  const weighted = (items, weightFn = (item) => item.weight || 1) => {
    if (!items.length) return null;
    let total = items.reduce((sum, item) => sum + Math.max(0, weightFn(item)), 0),
      roll = rng() * total;
    for (const item of items) {
      roll -= Math.max(0, weightFn(item));
      if (roll <= 0) return item;
    }
    return items.at(-1);
  };
  const chance = (value) => rng() < value;
  let DATA,
    INDEX,
    state,
    inputLocked = false;
  function rng() {
    let x = state.run?.rngState || hashSeed(makeSeed());
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    if (state.run) state.run.rngState = x >>> 0;
    return (x >>> 0) / 4294967296;
  }
  function stable(seed, key, max = 100) {
    return hashSeed(`${seed}:${key}`) % max;
  }

  function defaultMeta() {
    return {
      schemaVersion: SCHEMA_VERSION,
      gameVersion: VERSION,
      histories: [],
      legacyHistories: [],
      codex: [],
      settings: { haptic: true, reducedMotion: false },
      stats: { runs: 0 },
      seen: { events: {}, cards: {}, families: {}, endings: {} },
      recentSeeds: [],
      migrationNotice: false,
    };
  }
  function normalizeMeta(meta = {}) {
    const fresh = defaultMeta();
    return {
      ...fresh,
      ...meta,
      schemaVersion: SCHEMA_VERSION,
      gameVersion: VERSION,
      settings: { ...fresh.settings, ...(meta.settings || {}) },
      stats: { ...fresh.stats, ...(meta.stats || {}) },
      seen: { ...fresh.seen, ...(meta.seen || meta.seenContent || {}) },
      histories: Array.isArray(meta.histories) ? meta.histories.slice(0, 40) : [],
      legacyHistories: Array.isArray(meta.legacyHistories) ? meta.legacyHistories.slice(0, 40) : [],
      codex: Array.isArray(meta.codex) ? meta.codex.filter((id) => INDEX.codex.has(id)) : [],
      recentSeeds: Array.isArray(meta.recentSeeds) ? meta.recentSeeds.slice(0, 8) : [],
    };
  }
  function buildIndex() {
    const kinds = {},
      event = new Map(),
      cards = new Map(DATA.cards.map((card) => [card.id, card])),
      codex = new Map(DATA.codex.map((item) => [item.id, item])),
      episodes = new Map(Object.entries(DATA.episodeCatalog || {}));
    for (const item of DATA.events) {
      event.set(item.id, item);
      (kinds[item.kind] || (kinds[item.kind] = [])).push(item);
    }
    return { event, kinds, cards, codex, episodes };
  }

  function worldAt(age, location) {
    const year = 2026 + age,
      decades = Math.floor(age / 10),
      mods = location.mods;
    return {
      year,
      era: age < 20 ? '转型初期' : age < 50 ? '高流动时代' : age < 80 ? '老龄社会' : '远期社会',
      priceIndex: Number((1.025 ** age).toFixed(4)),
      laborMarket: clamp(
        62 - decades * 2 + stable(location.id, `labor-${decades}`, 20) - 10,
        25,
        85
      ),
      housingCost: mods.cost,
      medicalAccess: mods.medical,
      retirementBase: age < 40 ? 63 : 65,
      digitalization: clamp(65 + decades * 4, 0, 100),
    };
  }
  function rangePick([min, max], key, seed) {
    return min + stable(seed, key, max - min + 1);
  }
  function person(id, relation, bornAt, extra = {}) {
    return { id, relation, bornAt, alive: true, health: 65, bond: 55, ...extra };
  }
  function occupationInfluence(occupation = '') {
    const influence = {
      educationCapital: 0,
      caregiverAvailability: 0,
      parentPresence: 0,
      housingStability: 0,
      educationBudget: 0,
    };
    if (/教师|教务|教育机构/.test(occupation))
      Object.assign(influence, {
        educationCapital: 10,
        caregiverAvailability: 1,
        housingStability: 5,
        educationBudget: 3,
      });
    else if (/护士|医生|医技|医院/.test(occupation))
      Object.assign(influence, {
        educationCapital: 7,
        caregiverAvailability: -12,
        parentPresence: -6,
        housingStability: 5,
        educationBudget: 3,
      });
    else if (/工程技术|会计|基层职员|事业单位|社区干部|窗口办事/.test(occupation))
      Object.assign(influence, {
        educationCapital: 6,
        caregiverAvailability: -2,
        housingStability: 7,
        educationBudget: 4,
      });
    else if (/自由撰稿|摄影|设计接单|工作室|演出|美术|编辑|文化场馆/.test(occupation))
      Object.assign(influence, {
        educationCapital: 4,
        caregiverAvailability: 2,
        housingStability: -7,
        educationBudget: -2,
      });
    else if (/平台|骑手|网约车|货运|物流|建筑|家政|流水线|工厂|餐饮/.test(occupation))
      Object.assign(influence, {
        educationCapital: -2,
        caregiverAvailability: -10,
        parentPresence: -5,
        housingStability: -5,
        educationBudget: -3,
      });
    else if (/经营者|店主|批发|直播运营|电商客服/.test(occupation))
      Object.assign(influence, {
        educationCapital: 1,
        caregiverAvailability: -8,
        parentPresence: -4,
        housingStability: -3,
      });
    else if (/务农|农机|乡镇工人/.test(occupation))
      Object.assign(influence, {
        educationCapital: -3,
        caregiverAvailability: -5,
        housingStability: -2,
        educationBudget: -3,
      });
    else if (/技术|电工|焊工|数控|维修|质检/.test(occupation))
      Object.assign(influence, {
        educationCapital: 2,
        caregiverAvailability: -4,
        housingStability: 3,
        educationBudget: 1,
      });
    return influence;
  }
  function chooseFamily(run, location) {
    const recent = new Set(state.meta.histories.slice(0, 4).map((item) => item.familyId));
    return weighted(
      DATA.familyArchetypes,
      (family) =>
        (family.weight || 10) *
        (family.locationAffinity.includes(location.id) ? 1.8 : 1) *
        (recent.has(family.id) ? 0.35 : 1)
    );
  }
  function createOrigin(run, location, family) {
    const people = [],
      parentCount = family.parentCount,
      siblingCount = rangePick(family.siblingRange, 'siblings', run.seed),
      jobs = family.parentJobs,
      vary = (key, span = 9) =>
        clamp(
          (family.contextDefaults?.[key] ?? 50) +
            stable(run.seed, `family-context-${key}`, span * 2 + 1) -
            span,
          0,
          100
        );
    const plans = [
        ['father', 'male'],
        ['mother', 'female'],
      ]
        .slice(0, parentCount)
        .map(([slot, gender]) => {
          const occupation = jobs[stable(run.seed, `${slot}-job`, jobs.length)];
          return { slot, gender, occupation, influence: occupationInfluence(occupation) };
        }),
      mean = (key) =>
        plans.reduce((sum, item) => sum + item.influence[key], 0) / Math.max(1, plans.length);
    const context = {
      resources: vary('resources'),
      educationCapital: clamp(vary('educationCapital') + mean('educationCapital'), 0, 100),
      caregiverAvailability: clamp(
        vary('caregiverAvailability') + mean('caregiverAvailability'),
        0,
        100
      ),
      parentPresence: clamp(vary('parentPresence') + mean('parentPresence'), 0, 100),
      housingStability: clamp(vary('housingStability') + mean('housingStability'), 0, 100),
      emotionalSafety: vary('emotionalSafety'),
      educationBudget: clamp(vary('educationBudget') + mean('educationBudget'), 0, 100),
    };
    context.resourceTier =
      context.resources < 42 ? 'strained' : context.resources >= 68 ? 'comfortable' : 'stable';
    const parentExtra = (plan) => ({
      gender: plan.gender,
      occupation: plan.occupation,
      occupationImpact: plan.influence,
      bond: clamp(25 + context.emotionalSafety * 0.48 + context.parentPresence * 0.16, 25, 88),
      timeAvailability: clamp(
        context.caregiverAvailability +
          plan.influence.caregiverAvailability +
          stable(run.seed, `${plan.slot}-time`, 17) -
          8,
        10,
        95
      ),
      educationExposure: clamp(
        context.educationCapital +
          plan.influence.educationCapital +
          stable(run.seed, `${plan.slot}-education`, 15) -
          7,
        10,
        95
      ),
      workStability: clamp(
        context.housingStability +
          plan.influence.housingStability +
          stable(run.seed, `${plan.slot}-work`, 21) -
          10,
        10,
        95
      ),
    });
    for (const plan of plans)
      people.push(
        person(
          plan.slot,
          plan.slot,
          -(plan.slot === 'father' ? 24 : 22) -
            stable(run.seed, `${plan.slot}-age`, plan.slot === 'father' ? 18 : 16),
          parentExtra(plan)
        )
      );
    for (let i = 0; i < siblingCount; i++) {
      const bornAt = stable(run.seed, `sibling-older-${i}`, 2)
        ? -(2 + stable(run.seed, `sibling-age-${i}`, 8))
        : 2 + stable(run.seed, `sibling-age-${i}`, 7);
      people.push(
        person(`sibling_${i + 1}`, 'sibling', bornAt, {
          gender: stable(run.seed, `sibling-gender-${i}`, 2) ? 'female' : 'male',
          bond: 50,
          alive: bornAt <= 0,
          status: bornAt <= 0 ? 'living' : 'unborn',
        })
      );
    }
    return {
      familyId: family.id,
      familyName: family.name,
      familyClass: family.familyClass,
      people,
      housing:
        family.housingOptions[stable(run.seed, 'family-house', family.housingOptions.length)],
      assets: rangePick(family.assetRange, 'family-assets', run.seed),
      debt: rangePick(family.debtRange, 'family-debt', run.seed),
      cashflow: family.cashflow,
      control: family.control,
      expression: family.expression,
      careBurden: family.careBurden,
      riskTolerance: family.riskTolerance,
      digitalLiteracy: family.digitalLiteracy,
      context,
      secret:
        DATA.familySecrets.filter((secret) => secret.familyClasses.includes(family.familyClass))[
          stable(
            run.seed,
            'secret',
            DATA.familySecrets.filter((secret) => secret.familyClasses.includes(family.familyClass))
              .length
          )
        ] || DATA.familySecrets[0],
    };
  }
  function initDesires(run) {
    run.desires = {};
    for (const [key, spec] of Object.entries(DATA.desires)) {
      const familyBias =
        key === 'freedom'
          ? (run.originHousehold.control - 50) * 0.25
          : key === 'familyBelonging'
            ? (run.originHousehold.expression - 50) * 0.2
            : 0;
      run.desires[key] = {
        name: spec.name,
        drive: clamp(42 + stable(run.seed, `desire-${key}`, 30) + familyBias, 15, 90),
        fulfillment: 50,
        claimed: false,
      };
    }
    run.desires.reclaimed = false;
  }
  function chooseConflict(run) {
    return [...DATA.conflicts].sort(
      (a, b) =>
        b.desires.reduce((sum, key) => sum + run.desires[key].drive, 0) -
        a.desires.reduce((sum, key) => sum + run.desires[key].drive, 0) +
        stable(run.seed, b.id, 9) -
        stable(run.seed, a.id, 9)
    )[0].id;
  }

  function createRun(seed = makeSeed()) {
    const run = {
      seed,
      rngState: hashSeed(seed),
      schemaVersion: SCHEMA_VERSION,
      gameVersion: VERSION,
      contentRevision: CONTENT_REVISION,
      phase: 'birth',
      age: 0,
      gender: stable(seed, 'gender', 2) ? 'female' : 'male',
    };
    state.run = run;
    const location = weighted(DATA.locations),
      family = chooseFamily(run, location);
    run.location = location;
    run.originHousehold = createOrigin(run, location, family);
    run.people = [...run.originHousehold.people];
    run.attrs = { intellect: 1, physique: 1, looks: 1, stability: 1, social: 1, ambition: 1 };
    run.points = 20;
    const context = run.originHousehold.context;
    run.world = worldAt(0, location);
    run.education = {
      status: 'notStarted',
      level: 0,
      path: null,
      field: null,
      credentials: [],
      years: 0,
      achievement: 45,
      readiness: 45,
      localThreshold: 55,
      secondaryAcademicEligible: false,
      domesticEligible: false,
      domesticOfferReady: false,
      domesticFundingReady: false,
      overseasRouteOpen: false,
      overseasPrepared: false,
      overseasOfferReady: false,
      overseasConditionsMet: false,
      scholarshipReady: false,
      overseasFundingReady: false,
      overseasDepartureReady: false,
      domesticOffer: false,
      overseasOffer: false,
      domesticOfferType: 'none',
      overseasOfferType: 'none',
      applicationResult: 'none',
      scholarshipAwarded: false,
      fundingStatus: 'none',
      entryPermitReady: false,
      domesticEntryReady: false,
      overseasEntryReady: false,
      applicationIntent: 'none',
      applicationRoute: 'none',
      applicationAttemptCount: 0,
      extraApplicationYearUsed: false,
      gaokaoAttemptCount: 0,
      overseasUndergradAttemptCount: 0,
      lastApplicationOutcome: 'none',
      gapYears: 0,
      fullTimeUndergraduateClosed: false,
      timelineOffsetYears: 0,
      applicationStatus: 'none',
      enrollmentRegion: 'none',
      nextStage: 'secondary',
      undergraduateSystem: 'none',
      postgraduateSystem: 'none',
      highestCompleted: 'secondary',
      courseworkEvidence: 0,
      campusEvidence: 0,
      practiceEvidence: 0,
      researchEvidence: 0,
      changeIntent: 'none',
      changeResult: 'none',
      graduateApplicationIntent: 'none',
      graduateApplicationStatus: 'none',
      graduateApplicationResult: 'none',
      graduateOfferRegion: 'none',
      graduateFundingStatus: 'none',
      credentials: [],
      professionalQualificationIntent: 'none',
    };
    run.development = {
      learningHabit: clamp(35 + context.educationCapital * 0.2, 25, 60),
      attendance: clamp(88 + context.housingStability * 0.05, 80, 96),
      teacherSupport: 50,
      peerSupport: 50,
      selfAdvocacy: clamp(30 + context.emotionalSafety * 0.2, 25, 55),
      careLoad: clamp(
        (100 - context.caregiverAvailability) * 0.25 + family.careBurden * 0.15,
        0,
        45
      ),
      traumaLoad: clamp(
        (100 - context.emotionalSafety) * 0.25 + (100 - context.parentPresence) * 0.08,
        0,
        40
      ),
      routeKnowledge: clamp(context.educationCapital * 0.25, 5, 30),
      languagePreparation: context.educationCapital >= 70 ? 8 : 0,
      severeSchoolHarm: false,
      schoolHarmResolved: false,
      schoolHarmType: 'none',
      schoolHarmResponse: 'none',
      routeExposure: [],
    };
    run.roles = ['child'];
    run.employment = {
      status: 'none',
      profileId: 'none',
      career: '尚未进入社会',
      sector: 'none',
      employerType: 'none',
      rank: 0,
      contract: 'none',
      contractType: 'none',
      salary: 0,
      incomeAnnualGross: 0,
      incomeStability: 'none',
      jobTier: null,
      firstJobEntryPath: 'none',
      firstJobAge: null,
      pendingOfferId: 'none',
      lastJob: null,
      careLeaveUntilAge: null,
      benefits: 0,
      tenure: 0,
      experience: 0,
      publicExperience: 0,
      arrangement: 'onsite',
      entryCredential: 'none',
      applicationRegion: 'none',
      applicationChannel: 'none',
      applicationStatus: 'none',
      firstJobOutcome: 'none',
      schedule: { stability: 70, splitGapHours: 0, timezoneLoad: 0 },
    };
    run.activity = { mode: 'childhood', funding: 'family', years: 0 };
    run.finance = {
      cash: stable(seed, 'child-cash', 1500),
      available: 0,
      assets: [],
      liabilities: [],
      equity: 0,
      totalDebt: 0,
      netWorth: 0,
      lastIncome: 0,
      lastExpense: 0,
    };
    run.housing = { status: 'family', value: 0 };
    run.relationships = {
      originBond: 55,
      partnerStatus: 'none',
      partnerBond: 0,
      activePartnerId: null,
      lastPartnerId: null,
      parenthoodIntent: 'undecided',
      familyPlanningOffered: false,
      familyPlanningDeferred: false,
      familyPlanningClosed: false,
      plannedConceptionResolved: false,
      unplannedConceptionChecked: false,
      pregnancyStatus: 'none',
      pregnancyDecision: 'none',
      pregnancyDecisionDeferred: false,
      adoptionOffered: false,
      adoptionStatus: 'none',
      childCount: 0,
      childBond: 0,
      network: clamp(35 + location.mods.network / 3, 30, 75),
    };
    run.health = {
      physical: clamp(62 + stable(seed, 'health', 30), 50, 92),
      mental: 72,
      status: 'well',
      conditionSeverity: 0,
      currentCondition: null,
      lastIncidentAge: -20,
      recoveryYears: 0,
      chronic: [],
      disability: 'none',
      careNeed: 0,
    };
    run.habits = { stage: 'none', risk: 0, type: 'none', recoveryYears: 0 };
    run.capabilities = {
      skill: 0,
      portableSkill: family.digitalLiteracy >= 60 ? 1 : 0,
      employability: 50,
      publicCredential: 0,
      evidence: 0,
      network: 0,
      resilience: 0,
      cashBuffer: 0,
      healthLiteracy: 0,
      boundary: 0,
      learning: 0,
      riskSense: 0,
      creativity: 0,
      careSkill: 0,
      negotiation: 0,
    };
    run.mobility = {
      mode: 'home',
      platformDependence: 0,
      rootlessness: 0,
      visaPressure: 0,
      hostLanguage: 0,
      dailyAdaptation: 0,
      localTies: 0,
      chineseCommunityTies: 0,
      belonging: 0,
      discriminationLoad: 0,
      lastOverseasSystem: 'none',
      workAuthorization: 'unknown',
    };
    run.business = {
      mode: 'none',
      status: 'none',
      operatingSkill: clamp(25 + family.riskTolerance / 3, 20, 60),
      equity: 0,
      scale: 'none',
      control: 100,
    };
    run.later = { retirement: 'none', inheritance: 'none', care: 'none', will: 'none' };
    run.pressures = { money: 0, family: 0, career: 0, body: 0, loneliness: 0 };
    run.legacy = { plan: 'none', medicalDirective: 'none' };
    run.obligations = [];
    run.episodes = {};
    run.sceneQueue = [];
    initDesires(run);
    run.mainConflict = chooseConflict(run);
    run.outcomeTags = {};
    run.decisionHistory = [];
    run.scheduledConsequences = [];
    run.usedConsequences = [];
    run.usedEvents = [];
    run.cards = [];
    run.cardAges = [];
    run.timeline = [];
    run.yearQueue = [];
    run.yearStarted = false;
    run.decisionCount = 0;
    run.targetDecisions = 16 + stable(seed, 'decision-target', 5);
    run.lastDecisionAge = -5;
    run.stageDecisionCounts = {};
    run.secretRevealed = false;
    run.lastSwanAge = -20;
    run.swanCount = 0;
    run.agency = 0;
    run.deathCause = null;
    run.naturalDeathAge = 58 + stable(seed, 'lifespan', 48);
    run.ending = null;
    syncDerived(run);
    return run;
  }

  function totalDebt(run) {
    return run.finance.liabilities
      .filter((item) => item.status !== 'settled')
      .reduce((sum, item) => sum + Math.max(0, item.principal), 0);
  }
  function personalAssets(run) {
    return (
      run.finance.assets.reduce((sum, item) => sum + (item.value || 0), 0) +
      (run.housing.status === 'owned' || run.housing.status === 'mortgaged'
        ? run.housing.value
        : 0) +
      run.business.equity
    );
  }
  function childPeople(run) {
    return run.people.filter(
      (item) => item.alive && ['child', 'adoptedChild', 'stepChild'].includes(item.relation)
    );
  }
  function partnerPeople(run) {
    const active = run.relationships.activePartnerId;
    return run.people.filter(
      (item) => item.alive && item.relation === 'partner' && (!active || item.id === active)
    );
  }
  function syncDerived(run) {
    run.age = clamp(run.age, 0, 105);
    if (
      run.age >= 30 &&
      !(run.education.level >= 4 && ['enrolled', 'completed'].includes(run.education.status))
    )
      run.education.fullTimeUndergraduateClosed = true;
    run.world = worldAt(run.age, run.location);
    run.relationships.childCount = childPeople(run).length;
    const activePartner = run.people.find(
      (item) =>
        item.id === run.relationships.activePartnerId && item.alive && item.relation === 'partner'
    );
    if (!activePartner) {
      const fallback = run.people.find((item) => item.alive && item.relation === 'partner');
      run.relationships.activePartnerId = fallback?.id || null;
    }
    run.finance.totalDebt = totalDebt(run);
    run.finance.hasArrears = run.finance.liabilities.some(
      (item) => item.status === 'delinquent' || (item.arrears || 0) > 0
    );
    run.finance.available = run.finance.cash;
    run.business.control = clamp(run.business.control, 0, 100);
    run.finance.netWorth = run.finance.cash + personalAssets(run) - run.finance.totalDebt;
    run.relationships.partnerBond =
      partnerPeople(run)[0]?.bond ??
      (['none', 'divorced', 'widowed'].includes(run.relationships.partnerStatus)
        ? 0
        : run.relationships.partnerBond);
    const context = run.originHousehold.context,
      development = run.development;
    for (const key of [
      'learningHabit',
      'attendance',
      'teacherSupport',
      'peerSupport',
      'selfAdvocacy',
      'careLoad',
      'traumaLoad',
      'routeKnowledge',
      'languagePreparation',
    ])
      development[key] = clamp(development[key], 0, 100);
    for (const key of [
      'courseworkEvidence',
      'campusEvidence',
      'practiceEvidence',
      'researchEvidence',
    ])
      run.education[key] = clamp(run.education[key], 0, 100);
    for (const key of [
      'hostLanguage',
      'dailyAdaptation',
      'localTies',
      'chineseCommunityTies',
      'belonging',
      'discriminationLoad',
    ])
      run.mobility[key] = clamp(run.mobility[key], 0, 100);
    development.routeExposure = Array.from(
      new Set(Array.isArray(development.routeExposure) ? development.routeExposure : [])
    );
    const familySupport =
      context.educationCapital * 0.28 +
      context.emotionalSafety * 0.26 +
      context.parentPresence * 0.2 +
      context.caregiverAvailability * 0.16 +
      context.housingStability * 0.1;
    run.education.achievement = clamp(
      Math.round(
        30 +
          run.attrs.intellect * 4 +
          development.learningHabit * 0.22 +
          development.teacherSupport * 0.12 +
          development.attendance * 0.1 -
          development.careLoad * 0.12 -
          development.traumaLoad * 0.15
      ),
      0,
      100
    );
    run.education.readiness = clamp(
      Math.round(
        run.education.achievement * 0.55 +
          development.routeKnowledge * 0.15 +
          development.selfAdvocacy * 0.1 +
          development.attendance * 0.1 +
          development.teacherSupport * 0.05 +
          familySupport * 0.05 -
          development.careLoad * 0.08 -
          development.traumaLoad * 0.1
      ),
      0,
      100
    );
    run.education.localThreshold = clamp(
      Math.round(
        50 +
          (run.location.mods.education - 78) * 0.25 +
          stable(run.seed, 'education-local-threshold', 9) -
          4
      ),
      48,
      68
    );
    run.education.secondaryAcademicEligible =
      run.education.readiness >= run.education.localThreshold - 6 &&
      run.education.achievement >= 48;
    const overseasExposed = development.routeExposure.includes('overseas');
    run.education.domesticEligible =
      run.education.readiness >= run.education.localThreshold && run.education.achievement >= 55;
    run.education.domesticOfferReady =
      run.education.domesticEligible &&
      run.education.readiness >= run.education.localThreshold + 6 &&
      run.education.achievement >= 70;
    run.education.domesticFundingReady =
      context.educationBudget >= 35 ||
      run.originHousehold.assets - run.originHousehold.debt >= 30000 ||
      run.finance.cash >= 8000 ||
      development.routeExposure.includes('studentAid');
    run.education.overseasRouteOpen =
      overseasExposed && development.languagePreparation >= 8 && development.routeKnowledge >= 18;
    run.education.overseasPrepared =
      run.education.overseasRouteOpen &&
      run.education.achievement >= 55 &&
      development.languagePreparation >= 20 &&
      development.routeKnowledge >= 28;
    run.education.overseasOfferReady =
      run.education.overseasPrepared &&
      run.education.readiness >= 65 &&
      run.education.achievement >= 60;
    run.education.overseasConditionsMet =
      run.education.overseasOfferType === 'direct' ||
      (run.education.overseasOfferType === 'conditional' &&
        development.languagePreparation >= 28 &&
        run.education.achievement >= 60);
    run.education.scholarshipReady =
      run.education.overseasPrepared &&
      development.routeExposure.includes('scholarship') &&
      run.education.readiness >= 70 &&
      development.languagePreparation >= 30;
    run.education.overseasFundingReady =
      context.educationBudget >= 68 ||
      run.originHousehold.assets - run.originHousehold.debt >= 220000;
    run.education.domesticEntryReady =
      run.education.domesticOffer &&
      (run.education.fundingStatus === 'domesticConfirmed' ||
        (run.education.extraApplicationYearUsed && run.education.domesticFundingReady));
    run.education.overseasDepartureReady =
      run.education.overseasOffer &&
      run.education.overseasConditionsMet &&
      (['overseasFamily', 'overseasScholarship'].includes(run.education.fundingStatus) ||
        (run.education.extraApplicationYearUsed &&
          (run.education.overseasFundingReady || run.education.scholarshipReady)));
    run.education.overseasEntryReady =
      run.education.overseasDepartureReady && run.education.entryPermitReady;
    if (run.employment.status === 'employed' && !run.roles.includes('employee'))
      run.roles.push('employee');
    if (run.relationships.childCount && !run.roles.includes('parent')) run.roles.push('parent');
    if (['retired'].includes(run.activity.mode) && !run.roles.includes('retiree'))
      run.roles.push('retiree');
    return run;
  }

  function normalizeRun(run) {
    const fresh = createRun(run.seed || makeSeed()),
      merged = { ...fresh, ...run };
    for (const key of [
      'education',
      'development',
      'employment',
      'activity',
      'finance',
      'relationships',
      'health',
      'habits',
      'capabilities',
      'mobility',
      'business',
      'later',
      'pressures',
      'legacy',
      'world',
    ])
      merged[key] = { ...fresh[key], ...(run[key] || {}) };
    merged.originHousehold = {
      ...fresh.originHousehold,
      ...(run.originHousehold || {}),
      context: { ...fresh.originHousehold.context, ...(run.originHousehold?.context || {}) },
    };
    merged.development.routeExposure = Array.isArray(run.development?.routeExposure)
      ? run.development.routeExposure
      : [];
    merged.education.credentials = Array.isArray(run.education?.credentials)
      ? Array.from(new Set(run.education.credentials))
      : [];
    merged.employment.schedule = {
      ...fresh.employment.schedule,
      ...(run.employment?.schedule || {}),
    };
    merged.employment.lastJob =
      run.employment?.lastJob && typeof run.employment.lastJob === 'object'
        ? copy(run.employment.lastJob)
        : null;
    merged.episodes = { ...fresh.episodes, ...(run.episodes || {}) };
    merged.sceneQueue = Array.isArray(run.sceneQueue) ? run.sceneQueue : [];
    for (const key of Object.keys(fresh.desires))
      if (key !== 'reclaimed')
        merged.desires[key] = { ...fresh.desires[key], ...(run.desires?.[key] || {}) };
    merged.schemaVersion = SCHEMA_VERSION;
    merged.gameVersion = VERSION;
    merged.contentRevision = CONTENT_REVISION;
    return syncDerived(merged);
  }
  function validateRun(run) {
    return Boolean(
      run &&
        run.location &&
        run.originHousehold?.context &&
        run.education &&
        run.development &&
        run.employment &&
        run.finance &&
        Array.isArray(run.people) &&
        run.relationships &&
        run.health &&
        run.habits &&
        run.later &&
        run.episodes &&
        Array.isArray(run.sceneQueue) &&
        Array.isArray(run.decisionHistory) &&
        Number.isFinite(run.age) &&
        Number.isFinite(run.finance.cash)
    );
  }
  function gameStorageKeys() {
    return Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index)
    ).filter((key) => key?.startsWith('life-unloaded-2026-'));
  }
  function removeLegacySnapshots() {
    for (const key of gameStorageKeys()) if (key !== APP_KEY) localStorage.removeItem(key);
  }
  function viewForRunPhase(run) {
    if (!run) return 'home';
    if (run.phase === 'birth') return 'birth';
    if (run.phase === 'attributes') return 'attributes';
    if (run.phase === 'ended') return 'ending';
    return 'game';
  }
  function loadState() {
    const base = {
      schemaVersion: SCHEMA_VERSION,
      gameVersion: VERSION,
      meta: defaultMeta(),
      run: null,
      view: 'home',
      drawer: false,
      recovery: null,
    };
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) {
      removeLegacySnapshots();
      return base;
    }
    try {
      const parsed = JSON.parse(raw),
        oldSchema = Number(parsed.schemaVersion || parsed.run?.schemaVersion || 0),
        sameRelease = oldSchema === SCHEMA_VERSION && parsed.gameVersion === VERSION;
      state = base;
      base.meta = normalizeMeta(parsed.meta || {});
      if (sameRelease) base.run = parsed.run ? normalizeRun(parsed.run) : null;
      else {
        base.run = null;
        base.meta.migrationNotice = true;
        base.meta.seen.events = Object.fromEntries(
          Object.entries(base.meta.seen.events || {}).filter(
            ([id]) => !/^(beat|decision|consequence)_\d+$/.test(id)
          )
        );
      }
      removeLegacySnapshots();
      if (base.run && base.run.phase !== 'ended') base.view = viewForRunPhase(base.run);
      persist(base, true);
      return base;
    } catch (error) {
      localStorage.removeItem(APP_KEY);
      removeLegacySnapshots();
      return { ...base, recovery: { message: '存档读不出来了。坏掉的数据已经清掉，重新开始。' } };
    }
  }
  function persist(value = state, force = false) {
    if (!value || (!force && value.run?.simulation)) return;
    try {
      localStorage.setItem(
        APP_KEY,
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          gameVersion: VERSION,
          meta: value.meta,
          run: value.run,
        })
      );
    } catch (error) {
      showToast('空间不够了，先把档案导出来吧');
    }
  }
  const save = (force) => persist(state, force);

  function compare(actual, op, expected) {
    try {
      return CONTRACT.compareByOperator(actual, op, expected);
    } catch (error) {
      if (DEBUG) throw error;
      console.error(`[内容合同] ${error.message}`);
      return false;
    }
  }
  function predicateMatches(rule, run = state.run) {
    if (!CONTRACT.isReadPath(rule?.path)) {
      const error = new Error(`未知 read path：${String(rule?.path)}`);
      if (DEBUG) throw error;
      console.error(`[内容合同] ${error.message}`);
      return false;
    }
    const actual = rule.path === 'age' ? run.age : getPath(run, rule.path);
    return compare(actual, rule.op, rule.value);
  }
  function requirementsMatch(requirements = {}, run = state.run) {
    if (Array.isArray(requirements))
      requirements = { all: requirements, any: [], none: [] };
    const all = requirements.all || [],
      any = requirements.any || [],
      none = requirements.none || [];
    const invalid = [...all, ...any, ...none].find(
      (rule) => !CONTRACT.isReadPath(rule?.path) || !CONTRACT.isRuntimeOperator(rule?.op)
    );
    if (invalid) {
      const error = new Error(
        `非法 predicate：${String(invalid.path)} ${String(invalid.op)}`
      );
      if (DEBUG) throw error;
      console.error(`[内容合同] ${error.message}`);
      return false;
    }
    return (
      all.every((rule) => predicateMatches(rule, run)) &&
      (!any.length || any.some((rule) => predicateMatches(rule, run))) &&
      !none.some((rule) => predicateMatches(rule, run))
    );
  }
  function choiceRequirements(choice) {
    return Array.isArray(choice?.requirements)
      ? { all: choice.requirements, any: [], none: [] }
      : choice?.requirements || {};
  }
  function resolveCardChoice(choice, run = state.run) {
    const spec = choice?.cardInteraction;
    if (!spec || !run) return { choice, card: null, spec: null };
    const cardId = (run.cards || []).find(
        (id) => INDEX.cards.get(id)?.mechanic === spec.primaryMechanic
      ),
      card = cardId ? INDEX.cards.get(cardId) : null;
    if (!card) return { choice, card: null, spec: null };
    const effective = copy(choice);
    if (spec.activeRequirements) effective.requirements = copy(spec.activeRequirements);
    if (spec.activeShowWhen) effective.showWhen = copy(spec.activeShowWhen);
    effective.effects = [...(effective.effects || []), ...copy(spec.patch || [])];
    if (spec.resultSuffix)
      effective.resultText = `${effective.resultText}${/[。！？]$/.test(effective.resultText) ? '' : '。'}${spec.resultSuffix}`;
    return { choice: effective, card, spec };
  }
  function choiceVisible(choice, run = state.run) {
    const effective = resolveCardChoice(choice, run).choice;
    return !effective?.showWhen || requirementsMatch(effective.showWhen, run);
  }
  function choiceEnabled(choice, run = state.run) {
    const effective = resolveCardChoice(choice, run).choice;
    return choiceVisible(effective, run) && requirementsMatch(choiceRequirements(effective), run);
  }
  function personAge(item, run = state.run) {
    return run.age - item.bornAt;
  }
  function actorMatches(item, spec, run) {
    if (spec.personIdPath && item.id !== getPath(run, spec.personIdPath)) return false;
    if (spec.relation && item.relation !== spec.relation) return false;
    if (spec.relationAny && !spec.relationAny.includes(item.relation)) return false;
    if (spec.alive !== undefined && item.alive !== spec.alive) return false;
    if (spec.ageMin !== undefined && personAge(item, run) < spec.ageMin) return false;
    if (spec.ageMax !== undefined && personAge(item, run) > spec.ageMax) return false;
    if (
      spec.statusAny &&
      item.relation === 'partner' &&
      !spec.statusAny.includes(run.relationships.partnerStatus)
    )
      return false;
    return true;
  }
  function resolveActors(event, run = state.run) {
    const resolved = {};
    for (const spec of event.actors || []) {
      const found = run.people.find((item) => actorMatches(item, spec, run));
      if (!found && !spec.optional) return null;
      if (found) resolved[spec.slot] = found;
    }
    return resolved;
  }
  function activeEpisodes(run) {
    return Object.entries(run.episodes || {})
      .filter(([, record]) => record.status === 'active')
      .map(([id, record]) => ({ ...record, id, lane: episodeSpec(id)?.lane }));
  }
  function episodeEligible(event, run) {
    if (!event.episode) return true;
    const episode = event.episode,
      record = run.episodes[episode.id];
    if (episode.role === 'start')
      return (
        (!record || record.status === 'inactive') &&
        activeEpisodes(run).length < 2 &&
        (!activeEpisodes(run).some((item) => item.lane === episode.lane) ||
          (episode.id === 'postgraduate_application' &&
            activeEpisodes(run).some(
              (item) =>
                item.id.startsWith('undergraduate_') &&
                item.phase === episodePhaseCount(item.id)
            )))
      );
    return Boolean(
      record &&
        record.status === 'active' &&
        record.phase === episode.phase &&
        run.age >= record.nextPhaseAge &&
        run.age < record.deadlineAge
    );
  }
  function eligible(event, run = state.run) {
    if (
      !event ||
      run.usedEvents.includes(event.id) ||
      run.age < event.ageMin ||
      run.age > event.ageMax
    )
      return false;
    if (!(event.stage || []).includes(stageForAge(run.age))) return false;
    if (!requirementsMatch(event.requirements, run) || !episodeEligible(event, run)) return false;
    return Boolean(resolveActors(event, run));
  }

  function addTag(run, tag) {
    run.outcomeTags[tag] = (run.outcomeTags[tag] || 0) + 1;
  }
  function addLiability(run, command) {
    const kind = command.kind || 'consumer',
      value = Math.max(0, Number(command.value) || 0);
    if (kind === 'living') {
      const existing = run.finance.liabilities.find(
        (item) => item.kind === 'living' && item.status !== 'settled'
      );
      if (existing) {
        existing.principal += value;
        existing.rate = Math.min(existing.rate || 0.06, Number(command.rate) || 0.06);
        return existing;
      }
    }
    const liability = {
      id: `debt_${run.age}_${run.finance.liabilities.length + 1}`,
      kind,
      principal: value,
      rate: Number(command.rate) || 0.06,
      status: 'current',
      guaranteed: Boolean(command.guaranteed),
      startedAt: run.age,
      arrears: 0,
    };
    run.finance.liabilities.push(liability);
    return liability;
  }
  function repayDebt(run, amount) {
    let remaining = Math.max(0, Number(amount) || 0);
    for (const debt of [...run.finance.liabilities]
      .filter((item) => item.status !== 'settled')
      .sort((a, b) => (b.rate || 0) - (a.rate || 0))) {
      const paid = Math.min(remaining, debt.principal);
      debt.principal -= paid;
      remaining -= paid;
      debt.arrears = 0;
      if (debt.principal <= 0) {
        debt.principal = 0;
        debt.status = 'settled';
      } else debt.status = 'current';
      if (remaining <= 0) break;
    }
    if (amount > remaining) addTag(run, 'finance:repaid');
  }
  function restructureDebt(run, rate = 0.05) {
    for (const debt of run.finance.liabilities) {
      if (debt.status === 'settled') continue;
      debt.rate = Math.min(debt.rate || rate, rate);
      debt.arrears = 0;
      debt.status = 'current';
    }
    run.pressures.money = clamp(run.pressures.money - 10, 0, 100);
    addTag(run, 'finance:restructured');
  }
  function constitutionProtection(run) {
    return (
      (run.attrs.physique - 5) * 2 +
      run.capabilities.healthLiteracy * 1.2 +
      run.capabilities.resilience * 0.6 -
      Math.max(0, run.age - 70) * 0.12
    );
  }
  function healthIncident(run, command) {
    const variation =
        stable(
          run.seed,
          `health-incident:${run.age}:${run.health.lastIncidentAge}:${command.condition || 'general'}`,
          7
        ) - 3,
      severity = clamp(
        Math.round((Number(command.value) || 10) - constitutionProtection(run) + variation),
        3,
        40
      );
    run.health.conditionSeverity = clamp(run.health.conditionSeverity + severity, 0, 100);
    run.health.currentCondition = command.condition || run.health.currentCondition || 'general';
    run.health.lastIncidentAge = run.age;
    run.health.recoveryYears = 0;
    run.health.status = run.health.conditionSeverity >= 45 ? 'limited' : 'monitoring';
    run.health.careNeed =
      run.health.conditionSeverity >= 45 ? Math.max(1, run.health.careNeed) : run.health.careNeed;
    run.health.physical = clamp(
      run.health.physical - Math.max(1, Math.round(severity / 4)),
      0,
      100
    );
    run.pressures.body = clamp(run.pressures.body + Math.max(2, Math.round(severity / 3)), 0, 100);
    addTag(run, 'health:incident');
  }
  function healthRecovery(run, command) {
    const before = run.health.conditionSeverity,
      effort =
        (Number(command.value) || 6) +
        Math.max(0, run.attrs.physique - 1) * 1.4 +
        run.capabilities.healthLiteracy * 1.1 +
        run.capabilities.resilience * 0.5 -
        Math.max(0, run.age - 75) * 0.12,
      recovered = clamp(Math.round(effort), 2, 40),
      activeHealthEpisode = Object.entries(run.episodes).some(
        ([id, record]) => record.status === 'active' && id === 'acute_illness'
      ),
      resolvingHealthDecision =
        run.currentDecision?.episode?.id === 'acute_illness' &&
        run.currentDecision?.episode?.role === 'resolve',
      canResolve = command.resolve && (!activeHealthEpisode || resolvingHealthDecision);
    run.health.conditionSeverity = clamp(before - recovered, 0, 100);
    run.health.physical = clamp(
      run.health.physical + Math.max(1, Math.round(recovered / 5)),
      0,
      100
    );
    run.health.recoveryYears = (run.health.recoveryYears || 0) + 1;
    run.pressures.body = clamp(run.pressures.body - Math.max(2, Math.round(recovered / 4)), 0, 100);
    if (run.health.conditionSeverity <= 4 && canResolve) {
      run.health.conditionSeverity = 0;
      run.health.currentCondition = null;
      run.health.status = 'well';
      run.health.careNeed = 0;
      if (run.health.disability !== 'persistent') run.health.disability = 'none';
      addTag(run, 'health:recovered');
    } else if (run.health.conditionSeverity < 18) run.health.status = 'recovering';
    else if (run.health.conditionSeverity < 45) run.health.status = 'treating';
    else run.health.status = 'limited';
  }
  function transitionEducation(run, command) {
    const levels = {
      none: 0,
      primary: 1,
      middleSchool: 2,
      highSchool: 3,
      vocational: 3,
      college: 4,
      postgraduate: 5,
    };
    run.education.path = command.value;
    run.education.level = levels[command.value] ?? run.education.level;
    run.education.status = command.status || 'enrolled';
    run.activity.mode = run.education.status === 'enrolled' ? 'study' : run.activity.mode;
    if (run.education.status === 'enrolled' && !run.roles.includes('student'))
      run.roles.push('student');
  }
  function resolveUndergraduateApplication(run, route) {
    const retrying = run.education.applicationStatus === 'retrying',
      attempt = retrying ? 2 : 1;
    if (
      run.education.applicationAttemptCount >= attempt &&
      run.education.lastApplicationOutcome !== 'none'
    )
      return;
    const lockedRoute =
        attempt === 1
          ? route
          : run.education.applicationRoute === 'none'
            ? route
            : run.education.applicationRoute,
      domesticSubmitted = ['domestic', 'dual'].includes(lockedRoute),
      overseasSubmitted = ['overseas', 'dual'].includes(lockedRoute),
      adjacentShift = stable(run.seed, `undergraduate-application-${attempt}-${lockedRoute}`, 3) - 1,
      domesticBase = !run.education.domesticEligible
        ? 0
        : run.education.domesticOfferReady
          ? 2
          : 1,
      overseasBase = !run.education.overseasPrepared
        ? 0
        : run.education.overseasOfferReady
          ? 2
          : 1,
      domesticTier = domesticBase ? clamp(domesticBase + adjacentShift, 0, 2) : 0,
      overseasTier = overseasBase ? clamp(overseasBase + adjacentShift, 0, 2) : 0,
      domesticOffer = domesticSubmitted && domesticTier > 0,
      overseasOffer = overseasSubmitted && overseasTier > 0;
    run.education.applicationRoute = lockedRoute;
    run.education.applicationAttemptCount = attempt;
    if (domesticSubmitted) run.education.gaokaoAttemptCount++;
    if (overseasSubmitted) run.education.overseasUndergradAttemptCount++;
    run.education.domesticOffer = domesticOffer;
    run.education.overseasOffer = overseasOffer;
    run.education.domesticOfferType = domesticOffer ? 'admitted' : 'none';
    run.education.overseasOfferType = overseasOffer
      ? overseasTier >= 2
        ? 'direct'
        : 'conditional'
      : 'none';
    run.education.applicationResult =
      domesticOffer && overseasOffer
        ? 'dual'
        : domesticOffer
          ? 'domestic'
          : overseasOffer
            ? 'overseas'
            : 'none';
    run.education.applicationStatus =
      run.education.applicationResult === 'none' ? 'notAdmitted' : 'offered';
    run.education.lastApplicationOutcome =
      run.education.applicationResult === 'none'
        ? 'notAdmitted'
        : run.education.overseasOfferType === 'conditional' &&
            run.education.applicationResult === 'overseas'
          ? 'conditional'
          : run.education.applicationResult;
    run.education.nextStage =
      run.education.applicationResult === 'none' ? 'reapply' : 'undergraduateApplication';
  }
  function undergraduateApplicationResult(run) {
    const results = [];
    if (run.education.domesticOffer) results.push('国内有一份正式录取');
    if (run.education.overseasOffer)
      results.push(
        run.education.overseasOfferType === 'direct' ? '海外直接录取' : '海外录取，需补条件'
      );
    return results.length
      ? ` ${results.join('；')}。`
      : ' 两边都没有形成可用录取。本轮以落选记录收口。';
  }
  function resolveGraduateApplication(run, route) {
    const intent =
        route === 'domestic'
          ? 'domestic'
          : ['us', 'europe'].includes(run.education.graduateApplicationIntent)
            ? run.education.graduateApplicationIntent
            : ['us', 'europe'].includes(run.mobility.lastOverseasSystem)
              ? run.mobility.lastOverseasSystem
              : 'us',
      evidence =
        run.education.courseworkEvidence * 0.55 +
        run.education.researchEvidence * 0.8 +
        run.education.practiceEvidence * 0.5 +
        run.education.campusEvidence * 0.2,
      base = run.education.readiness * 0.4 + evidence,
      languageReady =
        intent === 'domestic' ||
        run.development.languagePreparation >= 28 ||
        run.mobility.hostLanguage >= 20,
      offered = base >= (intent === 'domestic' ? 48 : 55) && languageReady,
      fundingReady =
        intent === 'domestic' ||
        run.originHousehold.context.educationBudget >= 68 ||
        run.originHousehold.assets - run.originHousehold.debt >= 220000 ||
        run.education.scholarshipAwarded ||
        run.finance.cash >= 80000;
    run.education.graduateOfferRegion = offered ? intent : 'none';
    run.education.graduateApplicationResult = offered ? 'offered' : 'none';
    run.education.graduateApplicationStatus = offered ? 'offered' : 'notAdmitted';
    run.education.graduateFundingStatus = offered ? (fundingReady ? 'ready' : 'gap') : 'none';
    if (!offered) run.education.nextStage = 'firstJob';
  }
  function graduateApplicationResult(run) {
    if (run.education.graduateApplicationStatus === 'notAdmitted')
      return ' 没有形成可用录取，本轮转入求职。';
    const region =
      { domestic: '国内', us: '美国', europe: '欧洲' }[run.education.graduateOfferRegion] || '当前';
    return ` ${region}录取已经形成；${run.education.graduateFundingStatus === 'ready' ? '资金条件可进入报到' : '资金仍有缺口，不能直接报到'}。`;
  }
  const JOB_TIER_INDEX = Object.freeze({ T0: 0, T1: 1, T2: 2, T3: 3, T4: 4 });
  function employmentProfiles() {
    return Array.isArray(DATA.employmentCatalog?.profiles) ? DATA.employmentCatalog.profiles : [];
  }
  function employmentProfile(id) {
    return employmentProfiles().find((profile) => profile.id === id) || null;
  }
  function educationTierRange(run, reentry = false) {
    const credential = run.employment.entryCredential,
      completed = run.education.highestCompleted;
    let range =
      credential === 'postgraduate' || completed === 'postgraduate'
        ? [2, 3]
        : credential === 'bachelor' || completed === 'undergraduate'
          ? [1, 2]
          : credential === 'middleSchool' || completed === 'middleSchool'
            ? [0, 0]
            : [0, 1];
    if (reentry) range = [Math.max(0, range[0] - 1), range[1]];
    return range;
  }
  function profileCredentialsReady(run, profile) {
    const held = new Set(run.education.credentials || []);
    return (profile.credentials || []).every((credential) => held.has(credential));
  }
  function profileIncome(run, profile, salaryBandOverride = null) {
    const catalog = DATA.employmentCatalog,
      tier = catalog?.tiers?.[profile.tier],
      overseasReference = ['us', 'europe'].includes(run.employment.applicationRegion),
      locationFactor = overseasReference
        ? catalog?.regionalCoefficients?.tier1 || 1.2
        : catalog?.regionalCoefficients?.[run.location.id] || 1,
      bandName = salaryBandOverride || profile.salaryBand || 'mid',
      band = catalog?.salaryBands?.[bandName] || 1,
      monthlyBase =
        profile.tier === 'T4'
          ? Math.max(25000, (catalog?.tiers?.T3?.monthlyBase || 20000) * 1.25)
          : tier?.monthlyBase || 0,
      monthly = profile.incomeStability === 'business'
        ? 0
        : Math.round((monthlyBase * locationFactor * band) / 100) * 100;
    let annual = monthly * 12;
    if (profile.incomeStability === 'fixedPlusBonus')
      annual = Math.round(monthly * 13 * (.92 + stable(run.seed, `income:${profile.id}:${run.age}`, 17) / 100));
    if (profile.incomeStability === 'piecework')
      annual = Math.round(monthly * 12 * (.8 + stable(run.seed, `income:${profile.id}:${run.age}`, 41) / 100));
    if (profile.incomeStability === 'project')
      annual = Math.round(monthly * 12 * (.7 + stable(run.seed, `income:${profile.id}:${run.age}`, 61) / 100));
    if (profile.incomeStability === 'business') annual = 0;
    return { monthly, annual: Math.max(0, annual), bandName };
  }
  function snapshotCurrentJob(run) {
    if (!['employed', 'gig', 'selfEmployed'].includes(run.employment.status)) return;
    run.employment.lastJob = {
      profileId: run.employment.profileId,
      career: run.employment.career,
      tier: run.employment.jobTier,
      sector: run.employment.sector,
      employerType: run.employment.employerType,
      contractType: run.employment.contractType,
      salary: run.employment.salary,
      incomeAnnualGross: run.employment.incomeAnnualGross,
      incomeStability: run.employment.incomeStability,
      tenure: run.employment.tenure,
    };
  }
  function resolveProfileAlias(run, value) {
    if (!value.includes(':') && employmentProfile(value)) {
      const profile = employmentProfile(value);
      return { profile: profileCredentialsReady(run, profile) ? profile : null };
    }
    const current = employmentProfile(run.employment.profileId);
    if (value.startsWith('current:') && current && profileCredentialsReady(run, current))
      return { profile: current, salaryBand: value.split(':')[1] };
    const previous = run.employment.lastJob,
      previousTier = JOB_TIER_INDEX[previous?.tier] ?? JOB_TIER_INDEX[run.employment.jobTier] ?? 1,
      previousSector = previous?.sector || run.employment.sector;
    if (value === 'sameField' && previous?.profileId) {
      const profile = employmentProfile(previous.profileId);
      return { profile: profile && profileCredentialsReady(run, profile) ? profile : null };
    }
    let candidates = employmentProfiles();
    if (value === 'bridgeJob')
      candidates = candidates.filter(
        (profile) => JOB_TIER_INDEX[profile.tier] === Math.max(0, previousTier - 1)
      );
    if (value === 'careerChange')
      candidates = candidates.filter(
        (profile) =>
          profile.sector !== previousSector &&
          [previousTier, Math.max(0, previousTier - 1)].includes(JOB_TIER_INDEX[profile.tier])
      );
    candidates = candidates.filter(
      (profile) => profile.firstJobEligible && profileCredentialsReady(run, profile)
    );
    const profile = candidates[stable(run.seed, `profile-alias:${value}:${run.age}`, Math.max(1, candidates.length))];
    return { profile: profile || null };
  }
  function applyEmploymentProfile(run, value, { firstJob = false } = {}) {
    const resolved = resolveProfileAlias(run, value),
      profile = resolved.profile;
    if (!profile) return false;
    if (
      ['employed', 'gig', 'selfEmployed'].includes(run.employment.status) &&
      run.employment.profileId !== profile.id
    ) {
      snapshotCurrentJob(run);
      run.employment.tenure = 0;
    }
    const income = profileIncome(run, profile, resolved.salaryBand);
    run.employment.profileId = profile.id;
    run.employment.career = profile.name;
    run.employment.jobTier = profile.tier;
    run.employment.rank = JOB_TIER_INDEX[profile.tier];
    run.employment.sector = profile.sector;
    run.employment.employerType = profile.employerType;
    run.employment.contractType = profile.contractType;
    run.employment.contract = profile.contractType;
    run.employment.arrangement = profile.arrangement;
    run.employment.schedule = {
      stability: ['fixed', 'fixedPlusBonus'].includes(profile.incomeStability) ? 78 : 55,
      splitGapHours: profile.arrangement === 'splitShift' ? 4 : 0,
      timezoneLoad: profile.arrangement === 'remote' ? 4 : 0,
    };
    run.employment.incomeStability = profile.incomeStability;
    run.employment.salary = income.monthly;
    run.employment.incomeAnnualGross = income.annual;
    run.employment.status =
      profile.incomeStability === 'business'
        ? 'selfEmployed'
        : ['platform', 'dayLabor', 'project'].includes(profile.contractType)
          ? 'gig'
          : 'employed';
    run.employment.applicationStatus = 'employed';
    run.employment.pendingOfferId = 'none';
    run.employment.careLeaveUntilAge = null;
    run.activity.mode = run.employment.status === 'gig' ? 'flexible' : 'work';
    if (firstJob || run.employment.firstJobAge === null) {
      run.employment.firstJobAge = run.age;
      run.employment.firstJobOutcome = profile.id;
      if (run.employment.firstJobEntryPath === 'none')
        run.employment.firstJobEntryPath = profile.entryPaths?.[0] || 'openRecruitment';
    }
    return true;
  }
  function leaveEmployment(run, outcome = 'unemployed') {
    if (
      ['businessClosed', 'businessSold'].includes(outcome) &&
      run.employment.incomeStability !== 'business'
    )
      return false;
    snapshotCurrentJob(run);
    const retired = outcome === 'retired',
      careLeave = outcome === 'careLeave';
    run.employment.status = retired ? 'retired' : careLeave ? 'careLeave' : 'unemployed';
    run.employment.profileId = 'none';
    run.employment.career = retired ? '已退休' : careLeave ? '停薪留职' : '待业中';
    run.employment.sector = 'none';
    run.employment.employerType = 'none';
    run.employment.contractType = 'none';
    run.employment.contract = 'none';
    run.employment.arrangement = 'onsite';
    run.employment.schedule = { stability: 70, splitGapHours: 0, timezoneLoad: 0 };
    run.employment.salary = 0;
    run.employment.incomeAnnualGross = 0;
    run.employment.incomeStability = 'none';
    run.employment.jobTier = null;
    run.employment.rank = 0;
    run.employment.tenure = 0;
    run.employment.pendingOfferId = 'none';
    run.employment.careLeaveUntilAge = null;
    run.employment.applicationStatus =
      ['declined', 'offerDeclined', 'retired', 'careLeave', 'leisure', 'careerBreak'].includes(outcome)
        ? 'withdrawn'
        : 'searching';
    if (run.employment.firstJobAge === null) run.employment.firstJobOutcome = 'longSearch';
    run.activity.mode = retired
      ? 'retired'
      : careLeave
        ? 'flexible'
        : outcome === 'leisure' || outcome === 'careerBreak'
          ? 'leisure'
          : 'seeking';
    return true;
  }
  function takeCareLeave(run) {
    const returnAge = run.age + 1;
    if (!leaveEmployment(run, 'careLeave')) return false;
    run.employment.careLeaveUntilAge = returnAge;
    return true;
  }
  function completeEmploymentHandover(run) {
    if (!['employed', 'gig'].includes(run.employment.status)) return false;
    snapshotCurrentJob(run);
    const previous = copy(run.employment.lastJob),
      handoverIncome = Math.round(
        (run.employment.incomeAnnualGross || run.employment.salary * 12) / 4
      );
    run.finance.cash += Math.max(0, handoverIncome);
    leaveEmployment(run, 'contractEnded');
    run.employment.lastJob = previous;
    return true;
  }
  function resumeCareLeaveIfDue(run) {
    if (
      run.employment.status !== 'careLeave' ||
      !Number.isFinite(run.employment.careLeaveUntilAge) ||
      run.age < run.employment.careLeaveUntilAge
    )
      return false;
    const previous = copy(run.employment.lastJob),
      restored = previous?.profileId && applyEmploymentProfile(run, previous.profileId);
    if (!restored) {
      leaveEmployment(run, 'longSearch');
      return false;
    }
    run.employment.salary = Math.max(0, Number(previous.salary) || 0);
    run.employment.incomeAnnualGross = Math.max(0, Number(previous.incomeAnnualGross) || 0);
    run.employment.incomeStability = previous.incomeStability || run.employment.incomeStability;
    run.employment.tenure = Math.max(0, Number(previous.tenure) || 0);
    return true;
  }
  function firstJobCandidates(run, { reentry = false } = {}) {
    const [minimum, maximum] = educationTierRange(run, reentry),
      region = run.location.id,
      overseas = ['us', 'europe'].includes(run.employment.applicationRegion),
      authorizationReady = !overseas || run.mobility.workAuthorization === 'verified',
      entryPath = run.employment.firstJobEntryPath;
    if (!authorizationReady) return [];
    return employmentProfiles().filter((profile) => {
      const tier = JOB_TIER_INDEX[profile.tier];
      return (
        profile.firstJobEligible &&
        tier >= minimum &&
        tier <= maximum &&
        (profile.regions || []).includes(region) &&
        profileCredentialsReady(run, profile) &&
        (entryPath === 'none' ||
          (reentry && entryPath === 'reentry' && (profile.entryPaths || []).includes('reentry')) ||
          (profile.entryPaths || []).includes(entryPath))
      );
    });
  }
  function selectFirstJobOffer(run, route = 'domestic', reentry = false, scenario = null, choice = null) {
    let candidates = firstJobCandidates(run, { reentry });
    const profileIds = choice?.profileIds || scenario?.profileIds,
      tiers = scenario?.tiers;
    if (profileIds?.length) candidates = candidates.filter((profile) => profileIds.includes(profile.id));
    if (tiers?.length) candidates = candidates.filter((profile) => tiers.includes(profile.tier));
    const credentialProfiles = candidates.filter(
      (profile) => (profile.credentials || []).length && profileCredentialsReady(run, profile)
    );
    if (credentialProfiles.length) candidates = credentialProfiles;
    if (!candidates.length) return null;
    const evidence =
        run.education.practiceEvidence * .8 +
        run.education.courseworkEvidence * .35 +
        run.education.researchEvidence * (run.employment.entryCredential === 'postgraduate' ? .65 : .25) +
        run.capabilities.employability * .35,
      threshold = run.employment.entryCredential === 'postgraduate' ? 47 : 34;
    if (!reentry && evidence < threshold) return null;
    return candidates[
      stable(
        run.seed,
        `first-job:${route}:${run.employment.firstJobEntryPath}:${scenario?.id || 'base'}:${choice?.index ?? 0}`,
        candidates.length
      )
    ];
  }
  function resolveFirstJobApplication(run, route, scenarioId = null, choiceIndex = 0) {
    const currentRegion = run.employment.applicationRegion,
      region =
        route === 'return'
          ? 'domestic'
          : route === 'overseas'
            ? ['us', 'europe'].includes(currentRegion)
              ? currentRegion
              : ['us', 'europe'].includes(run.mobility.lastOverseasSystem)
                ? run.mobility.lastOverseasSystem
                : 'none'
            : ['us', 'europe'].includes(currentRegion)
              ? currentRegion
              : 'domestic',
      overseas = ['us', 'europe'].includes(region);
    if (route === 'overseas' && !overseas) {
      run.employment.pendingOfferId = 'none';
      run.employment.applicationStatus = 'searching';
      run.employment.firstJobOutcome = 'longSearch';
      return;
    }
    if (overseas && !['verified', 'restricted'].includes(run.mobility.workAuthorization))
      run.mobility.workAuthorization =
        run.mobility.hostLanguage >= 12 && run.mobility.visaPressure < 85 ? 'verified' : 'restricted';
    run.employment.applicationRegion = region;
    const scenario =
        DATA.employmentCatalog?.recruitmentScenarios?.find((item) => item.id === scenarioId) || null,
      choice = scenario?.choices?.[choiceIndex] ? { ...scenario.choices[choiceIndex], index: choiceIndex } : null;
    if (choice?.entryPath || scenario?.entryPath)
      run.employment.firstJobEntryPath = choice?.entryPath || scenario.entryPath;
    const offer = selectFirstJobOffer(run, route, false, scenario, choice);
    run.employment.pendingOfferId = offer?.id || 'none';
    run.employment.applicationStatus = offer ? 'offered' : 'searching';
    run.employment.firstJobOutcome = offer ? 'pending' : 'longSearch';
  }
  function acceptFirstJobOffer(run, route) {
    let profile = employmentProfile(run.employment.pendingOfferId);
    if (!profile && route === 'reentry') {
      run.employment.firstJobEntryPath = 'reentry';
      profile = selectFirstJobOffer(run, 'reentry', true);
    }
    const validPending =
      profile &&
      profile.firstJobEligible &&
      profile.tier !== 'T4' &&
      profileCredentialsReady(run, profile) &&
      firstJobCandidates(run, { reentry: route === 'reentry' }).some(
        (candidate) => candidate.id === profile.id
      );
    if (!validPending) {
      leaveEmployment(run, 'longSearch');
      return false;
    }
    return applyEmploymentProfile(run, profile.id, { firstJob: true });
  }
  function adjustJobTier(run, delta) {
    const current = employmentProfile(run.employment.profileId);
    if (!current) return false;
    const step = clamp(Math.trunc(Number(delta) || 0), -1, 1);
    if (step === 0) return applyEmploymentProfile(run, `current:${current.salaryBand || 'mid'}`);
    const targetIndex = clamp(JOB_TIER_INDEX[current.tier] + step, 0, 4);
    if (step > 0) {
      const targetId = DATA.employmentCatalog?.promotionMap?.[current.id],
        target = targetId ? employmentProfile(targetId) : null;
      return target && profileCredentialsReady(run, target)
        && JOB_TIER_INDEX[target.tier] === targetIndex
        ? applyEmploymentProfile(run, target.id)
        : false;
    }
    const candidates = employmentProfiles().filter(
      (profile) =>
        JOB_TIER_INDEX[profile.tier] === targetIndex &&
        profileCredentialsReady(run, profile) &&
        profile.sector === current.sector
    );
    const target =
      candidates[stable(run.seed, `tier:${current.id}:${targetIndex}:${run.age}`, Math.max(1, candidates.length))];
    return target ? applyEmploymentProfile(run, target.id) : false;
  }
  function resolveLayoff(run, route) {
    const monthly = Math.round((run.employment.incomeAnnualGross || run.employment.salary * 12) / 12),
      months = ['fixedTerm', 'openEnded', 'service'].includes(run.employment.contractType)
        ? route === 'documented'
          ? 2
          : 1
        : 0;
    run.finance.cash += Math.max(0, monthly * months);
    leaveEmployment(run, 'layoff');
  }
  function grantCredential(run, value) {
    const credential =
      value === 'selected' ? run.education.professionalQualificationIntent : value;
    if (!['medical_practice', 'legal_practice', 'university_teaching'].includes(credential)) return;
    if (!run.education.credentials.includes(credential)) run.education.credentials.push(credential);
  }
  function conceptionChance(run) {
    const ageAdjustment = run.age <= 29 ? 5 : run.age <= 34 ? 0 : run.age <= 37 ? -10 : -20,
      healthAdjustment = run.health.physical >= 75 ? 5 : run.health.physical < 50 ? -10 : 0;
    return clamp(80 + ageAdjustment + healthAdjustment, 50, 90);
  }
  function resolveConception(run, key = 'planned') {
    if (run.relationships.plannedConceptionResolved) return run.relationships.pregnancyStatus;
    run.relationships.plannedConceptionResolved = true;
    const conceived = stable(run.seed, `conception:${key}:${run.age}`, 100) < conceptionChance(run);
    run.relationships.pregnancyStatus = conceived ? 'confirmed' : 'notPregnant';
    return run.relationships.pregnancyStatus;
  }
  function firstJobApplicationResult(run) {
    return run.employment.applicationStatus === 'offered'
      ? ' 一份能核合同、岗位和报到条件的录用留下了。'
      : ' 没有形成可用录用；申请记录转入持续求职。';
  }
  function createRelatedPerson(run, command) {
    const relation = command.relation || 'child',
      index = run.people.filter((item) => item.id.startsWith(`${relation}_`)).length + 1,
      item = person(`${relation}_${index}`, relation, run.age, {
        bond: 60,
        legalStatus: relation === 'adoptedChild' ? 'adopted' : 'biological',
      });
    run.people.push(item);
    if (relation === 'partner') {
      run.relationships.activePartnerId = item.id;
      run.relationships.partnerStatus = 'dating';
    }
    if (['child', 'adoptedChild', 'stepChild'].includes(relation))
      run.relationships.parenthoodIntent = 'parent';
    return item;
  }
  function transitionPartner(run, command) {
    const restoring = command.value === 'partner',
      id = restoring ? run.relationships.lastPartnerId : run.relationships.activePartnerId,
      item = run.people.find((personItem) => personItem.id === id);
    if (!item) return;
    if (restoring) {
      for (const other of run.people)
        if (other.id !== item.id && other.relation === 'partner') other.relation = 'exPartner';
      item.relation = 'partner';
      run.relationships.activePartnerId = item.id;
    } else {
      item.relation = 'exPartner';
      run.relationships.lastPartnerId = item.id;
      run.relationships.activePartnerId = null;
    }
  }
  function applyCommands(commands = [], context = {}) {
    const run = state.run,
      before = copy(run);
    for (const command of commands) {
      if (!CONTRACT.isCommandType(command?.type) || !CONTRACT.isWritePath(command?.target)) {
        const location = context.eventId || context.choiceId || context.source || 'unknown';
        const error = new Error(
          `非法 command @ ${location}：${String(command?.type)} → ${String(command?.target)}`
        );
        if (DEBUG) throw error;
        console.error(`[内容合同] ${error.message}`);
        continue;
      }
      if (command.type === 'add') {
        if (command.target === 'finance.cash' && Number(command.value) < 0 && run.age < 18) {
          const cost = Math.abs(Number(command.value)),
            fromAssets = Math.min(run.originHousehold.assets, cost);
          run.originHousehold.assets -= fromAssets;
          run.originHousehold.debt += cost - fromAssets;
          run.pressures.family = clamp(run.pressures.family + 2, 0, 100);
        } else addPath(run, command.target, command.value);
        if (command.target === 'relationships.partnerBond')
          for (const item of partnerPeople(run))
            item.bond = clamp(item.bond + Number(command.value), 0, 100);
        if (command.target === 'relationships.childBond')
          for (const item of childPeople(run))
            item.bond = clamp(item.bond + Number(command.value), 0, 100);
      } else if (command.type === 'set') setPath(run, command.target, command.value);
      else if (command.type === 'expose') {
        const values = getPath(run, command.target);
        if (Array.isArray(values) && !values.includes(command.value)) values.push(command.value);
      } else if (command.type === 'tag') addTag(run, command.value);
      else if (command.type === 'addLiability') addLiability(run, command);
      else if (command.type === 'repayDebt') repayDebt(run, command.value);
      else if (command.type === 'restructureDebt') restructureDebt(run, command.rate);
      else if (command.type === 'healthIncident') healthIncident(run, command);
      else if (command.type === 'healthRecovery') healthRecovery(run, command);
      else if (command.type === 'resolveApplication')
        resolveUndergraduateApplication(run, command.value);
      else if (command.type === 'resolveGraduateApplication')
        resolveGraduateApplication(run, command.value);
      else if (command.type === 'resolveFirstJobApplication')
        resolveFirstJobApplication(
          run,
          command.value,
          command.scenarioId,
          command.scenarioChoiceIndex
        );
      else if (command.type === 'acceptFirstJobOffer')
        acceptFirstJobOffer(run, command.value);
      else if (command.type === 'applyEmploymentProfile')
        applyEmploymentProfile(run, command.value);
      else if (command.type === 'leaveEmployment')
        leaveEmployment(run, command.value);
      else if (command.type === 'takeCareLeave')
        takeCareLeave(run);
      else if (command.type === 'completeEmploymentHandover')
        completeEmploymentHandover(run);
      else if (command.type === 'adjustJobTier')
        adjustJobTier(run, command.value);
      else if (command.type === 'resolveLayoff')
        resolveLayoff(run, command.value);
      else if (command.type === 'grantCredential')
        grantCredential(run, command.value);
      else if (command.type === 'resolveConception')
        resolveConception(run, command.value);
      else if (command.type === 'createPerson') createRelatedPerson(run, command);
      else if (command.type === 'transitionPartner') transitionPartner(run, command);
      else if (command.type === 'transition' && command.target === 'education')
        transitionEducation(run, command);
      else if (command.type === 'claimDesire') {
        for (const [key, desire] of Object.entries(run.desires)) {
          if (key === 'reclaimed') continue;
          if (command.replace) desire.claimed = false;
        }
        for (const key of command.value || [])
          if (run.desires[key]) {
            run.desires[key].claimed = true;
            run.desires[key].drive = clamp(run.desires[key].drive + 12, 15, 100);
          }
        if (command.replace) run.desires.reclaimed = true;
      }
    }
    run.health.physical = clamp(run.health.physical, 0, 100);
    run.health.mental = clamp(run.health.mental, 0, 100);
    run.habits.risk = clamp(run.habits.risk, 0, 100);
    for (const key of Object.keys(run.pressures))
      run.pressures[key] = clamp(run.pressures[key], 0, 100);
    run.relationships.partnerBond = clamp(run.relationships.partnerBond, 0, 100);
    run.relationships.childBond = clamp(run.relationships.childBond, 0, 100);
    run.relationships.network = clamp(run.relationships.network, 0, 100);
    run.finance.cash = Math.max(-1e13, run.finance.cash);
    run.business.equity = Math.max(0, run.business.equity);
    syncDerived(run);
    return { before, after: copy(run), context };
  }

  function scheduleConsequence(event, choice) {
    for (const spec of choice.consequences || []) {
      const consequence = INDEX.event.get(spec.eventId);
      if (!consequence?.choiceOutcomes?.[choice.memoryKey]) continue;
      const dueAge =
          state.run.age + spec.delayMin + Math.floor(rng() * (spec.delayMax - spec.delayMin + 1)),
        id = `${spec.eventId}:${choice.memoryKey}:${state.run.age}`;
      if (state.run.scheduledConsequences.some((item) => item.id === id)) continue;
      state.run.scheduledConsequences.push({
        id,
        eventId: spec.eventId,
        memoryKey: choice.memoryKey,
        sourceDecisionId: event.id,
        sourceChoiceId: choice.id,
        dueAge,
        expiresAge: Math.min(105, dueAge + 6),
        priority: Number(spec.priority) || 0,
        status: 'scheduled',
      });
    }
  }
  function episodeSpec(id) {
    return INDEX.kinds.decision.find((event) => event.episode?.id === id)?.episode || null;
  }
  function episodeCatalog(id) {
    return INDEX.episodes.get(id) || {};
  }
  function episodePhaseCount(id) {
    return INDEX.kinds.decision.filter((event) => event.episode?.id === id).length;
  }
  const EPISODE_LABELS = {
    shop_opening: '开店',
    public_exam: '公务员招录',
    layoff_reemployment: '裁员再就业',
    career_break: '主动不工作',
    guarantee_recourse: '担保追偿',
    acute_illness: '急性疾病',
  };
  const HABIT_TYPE_LABELS = {
      gambling: '赌博',
      alcohol: '酒精',
      gaming: '游戏',
      shopping: '消费',
      medication: '药物',
    },
    HABIT_EPISODE_LABELS = { formation: '问题形成', treatment: '治疗', relapse: '复发' };
  function episodeLabel(id) {
    const match =
      /^habit_(gambling|alcohol|gaming|shopping|medication)_(formation|treatment|relapse)$/.exec(
        id
      );
    return match
      ? `${HABIT_TYPE_LABELS[match[1]]}·${HABIT_EPISODE_LABELS[match[2]]}`
      : episodeCatalog(id).label || EPISODE_LABELS[id] || id;
  }
  const EPISODE_ORGANIZATIONS = {
    shop_opening: '本轮考察的门店',
    public_exam: '本轮报考单位',
    layoff_reemployment: '原用人单位',
    guarantee_recourse: '本轮担保债权人',
  };
  function episodeBindings(event, run) {
    const bindings = {};
    for (const [slot, item] of Object.entries(resolveActors(event, run) || {}))
      bindings[slot] = { kind: 'person', id: item.id, alive: item.alive };
    const label =
      episodeCatalog(event.episode.id).organization || EPISODE_ORGANIZATIONS[event.episode.id];
    if (label)
      bindings.organization = { kind: 'organization', id: `${event.episode.id}:${run.age}`, label };
    return bindings;
  }
  function episodeState(run) {
    return {
      activity: run.activity.mode,
      employment: run.employment.status,
      education: run.education.applicationStatus,
      partner: run.relationships.partnerStatus,
      children: run.relationships.childCount,
      netWorth: run.finance.netWorth,
      health: run.health.physical,
      habit: run.habits.stage,
    };
  }
  function updateEpisode(event, choice) {
    const run = state.run,
      episode = event.episode,
      catalog = episodeCatalog(episode.id),
      fallbackEarly = ['withdrawn', 'internal_transfer', 'declined', 'ordinary_exit'],
      fallbackAbandoned = [
        'stop_loss',
        'debt_failure',
        'withdrawn',
        'market_exit',
        'long_search',
        'forced_return',
        'declined',
        'ordinary_exit',
        'relationship_break',
        'default_failure',
        'treatment_exit',
        'support_exit',
        'uncontrolled',
        'relapse',
      ],
      abandoned =
        (catalog.abandonedRoutes || fallbackAbandoned).includes(choice.route),
      earlyClosure = abandoned || fallbackEarly.includes(choice.route),
      resolvedEarly = (catalog.resolvedRoutes || []).includes(choice.route),
      terminal = episode.role === 'resolve' || episodePhaseCount(episode.id) === 1 || earlyClosure || resolvedEarly,
      terminalReason = choice.route;
    let record = run.episodes[episode.id];
    if (episode.role === 'start') {
      record = {
        status: 'active',
        phase: episode.phase,
        startedAt: run.age,
        nextPhaseAge: run.age,
        deadlineAge: run.age + clamp(episode.deadlineYears, 1, 5),
        route: null,
        boundActors: episodeBindings(event, run),
        commitments: [],
        closureReason: null,
      };
    }
    if (
      catalog.bindActivePartnerAfterChoice &&
      run.relationships.activePartnerId &&
      !record.boundActors.partner
    ) {
      const partner = run.people.find((item) => item.id === run.relationships.activePartnerId);
      record.boundActors.partner = {
        kind: 'person',
        id: run.relationships.activePartnerId,
        alive: partner?.alive ?? true,
      };
    }
    record.route = terminalReason || record.route;
    record.commitments.push(...(choice.commitments || []));
    if (terminal) {
      record.status = abandoned ? 'abandoned' : 'resolved';
      record.phase = episode.phase;
      record.nextPhaseAge = run.age;
      record.closureReason = terminalReason;
    } else {
      record.status = 'active';
      record.phase = episode.phase + 1;
      record.nextPhaseAge = run.age + clamp(episode.delayYears, 0, 5);
      if (
        episode.id === 'undergraduate_application' &&
        episode.phase === 3 &&
        run.education.applicationStatus === 'retrying'
      )
        record.nextPhaseAge = run.age + 1;
    }
    run.episodes[episode.id] = record;
  }
  function recruitmentScenarioEligible(run, scenario) {
    const [minimum, maximum] = educationTierRange(run, false),
      channel =
        run.employment.applicationChannel === 'none'
          ? 'openRecruitment'
          : run.employment.applicationChannel || 'openRecruitment',
      region = run.employment.applicationRegion;
    return (
      run.age >= scenario.age[0] &&
      run.age <= scenario.age[1] &&
      scenario.tiers.some((tier) => {
        const index = JOB_TIER_INDEX[tier];
        return index >= minimum && index <= maximum;
      }) &&
      (!scenario.locations?.length || scenario.locations.includes(run.location.id)) &&
      (!scenario.applicationRegions?.length || scenario.applicationRegions.includes(region)) &&
      (!scenario.applicationChannels?.length || scenario.applicationChannels.includes(channel))
    );
  }
  function recruitmentScenarioFor(run) {
    const scenarios = DATA.employmentCatalog?.recruitmentScenarios || [],
      candidates = scenarios.filter((scenario) => recruitmentScenarioEligible(run, scenario));
    if (!candidates.length) return null;
    return candidates[
      stable(
        run.seed,
        `recruitment:${run.age}:${run.location.id}:${run.employment.applicationRegion}:${run.employment.applicationChannel}`,
        candidates.length
      )
    ];
  }
  function prepareRecruitmentDecision(event, run) {
    if (event.episode?.id !== 'first_job_application' || event.episode.phase !== 3) return event;
    const scenario = recruitmentScenarioFor(run);
    if (!scenario) return event;
    return {
      ...event,
      situation: scenario.situation,
      prompt: scenario.prompt,
      recruitmentScenarioId: scenario.id,
      choices: scenario.choices.map((scenarioChoice, index) => {
        const base = event.choices[Math.min(index, event.choices.length - 1)],
          route = scenarioChoice.route || 'domestic',
          effects = [
            { type: 'tag', target: 'history', value: `research:${scenario.id}` },
            { type: 'add', target: 'agency', value: scenarioChoice.offerIntent ? 2 : 1 },
          ];
        if (scenarioChoice.offerIntent)
          effects.push({
            type: 'resolveFirstJobApplication',
            target: 'employment',
            value: route,
            scenarioId: scenario.id,
            scenarioChoiceIndex: index,
          });
        else
          effects.push(
            { type: 'set', target: 'employment.pendingOfferId', value: 'none' },
            { type: 'set', target: 'employment.applicationStatus', value: 'searching' },
            { type: 'set', target: 'employment.firstJobOutcome', value: 'longSearch' },
            { type: 'set', target: 'activity.mode', value: 'seeking' }
          );
        return {
          ...base,
          text: scenarioChoice.text,
          resultText: scenarioChoice.resultText,
          effects,
          route: `${scenario.id}_${index + 1}`,
          outcomeTags: ['employment', `recruitment:${scenario.id}`, 'episode:first_job_application'],
        };
      }),
    };
  }
  function startEpisodePhase(event) {
    const run = state.run;
    if (
      event.episode.id === 'undergraduate_application' &&
      event.episode.phase === 4 &&
      run.education.applicationStatus === 'retrying'
    ) {
      resolveUndergraduateApplication(
        run,
        run.education.applicationRoute === 'none'
          ? run.education.applicationIntent
          : run.education.applicationRoute
      );
      if (run.education.domesticOffer && run.education.domesticFundingReady)
        run.education.fundingStatus = 'domesticConfirmed';
      else if (run.education.overseasOffer && run.education.scholarshipReady) {
        run.education.fundingStatus = 'overseasScholarship';
        run.education.scholarshipAwarded = true;
      } else if (run.education.overseasOffer && run.education.overseasFundingReady)
        run.education.fundingStatus = 'overseasFamily';
      syncDerived(run);
    }
    event = prepareRecruitmentDecision(event, run);
    run.currentDecision = event;
    run.phase = 'episode';
    run.sceneQueue = [
      { kind: 'situation', eventId: event.id, text: event.situation },
      { kind: 'choice', eventId: event.id },
    ];
    save();
    render();
  }
  function chooseEpisodeDecision(index) {
    const run = state.run,
      event = run.currentDecision,
      scene = run.sceneQueue[0],
      originalChoice = event?.choices?.[index],
      choice = resolveCardChoice(originalChoice, run).choice;
    if (
      !event?.episode ||
      scene?.kind !== 'choice' ||
      !choice ||
      inputLocked ||
      !choiceEnabled(originalChoice, run)
    )
      return;
    inputLocked = true;
    const before = copy(run),
      result = applyCommands(choice.effects, event);
    for (const tag of choice.outcomeTags || []) addTag(run, tag);
    const resolvedApplication =
        event.episode.id === 'undergraduate_application' &&
        event.episode.phase === 2 &&
        choice.effects.some((command) => command.type === 'resolveApplication'),
      resolvedGraduate = choice.effects.some(
        (command) => command.type === 'resolveGraduateApplication'
      ),
      resolvedJob = choice.effects.some((command) => command.type === 'resolveFirstJobApplication'),
      resolvedConception = choice.effects.some((command) => command.type === 'resolveConception'),
      suffix = resolvedApplication
        ? undergraduateApplicationResult(run)
        : resolvedGraduate
          ? graduateApplicationResult(run)
          : resolvedJob
          ? firstJobApplicationResult(run)
          : resolvedConception
            ? run.relationships.pregnancyStatus === 'confirmed'
              ? ' 检查确认了怀孕，接下来由你决定是否继续。'
              : ' 这段时间没有确认怀孕。一次未成功没有被写成诊断。'
            : '',
      resultText = `${choice.resultText}${suffix}`;
    run.sceneQueue = [
      {
        kind: 'result',
        eventId: event.id,
        choiceIndex: index,
        text: resultText,
        stateBefore: episodeState(before),
        impact: impactScore(result.before, result.after, choice),
      },
    ];
    save();
    render();
    setTimeout(() => (inputLocked = false), 180);
  }
  function finishEpisodeResult(scene) {
    const run = state.run,
      event =
        run.currentDecision?.id === scene.eventId
          ? run.currentDecision
          : INDEX.event.get(scene.eventId),
      choice = event?.choices?.[scene.choiceIndex];
    if (!event?.episode || !choice) return;
    const resultText = scene.text || choice.resultText;
    scheduleConsequence(event, choice);
    updateEpisode(event, choice);
    run.decisionHistory.push({
      age: run.age,
      eventId: event.id,
      choiceId: choice.id,
      choice: choice.text,
      result: resultText,
      stateBefore: scene.stateBefore,
      stateAfter: episodeState(run),
      outcomeTags: [...(choice.outcomeTags || [])],
      commitments: choice.commitments || [],
      impact: scene.impact,
    });
    run.usedEvents.push(event.id);
    run.decisionCount++;
    run.lastDecisionAge = run.age;
    run.stageDecisionCounts[stageForAge(run.age)] =
      (run.stageDecisionCounts[stageForAge(run.age)] || 0) + 1;
    addTimeline(event, `${choice.text}。${resultText}`, 'chosen');
    run.currentDecision = null;
    run.sceneQueue = [];
    run.phase = 'playing';
    const educationEventsThisAge = run.decisionHistory.filter(
        (item) =>
          item.age === run.age &&
          INDEX.event.get(item.eventId)?.track === 'education' &&
          INDEX.event.get(item.eventId)?.episode
      ).length,
      pregnancyEventsThisAge = run.decisionHistory.filter(
        (item) =>
          item.age === run.age &&
          INDEX.event.get(item.eventId)?.episode?.id === 'pregnancy_decision'
      ).length,
      canContinueEducationSameAge =
        event.track === 'education' &&
        event.episode.ageAdvanceYears === 0 &&
        educationEventsThisAge < 2 &&
        INDEX.kinds.decision.some(
          (candidate) =>
            candidate.track === 'education' &&
            candidate.episode &&
            eligible(candidate, run)
        ),
      canContinuePregnancySameAge =
        event.episode.id === 'pregnancy_decision' &&
        event.episode.ageAdvanceYears === 0 &&
        pregnancyEventsThisAge < 2 &&
        INDEX.kinds.decision.some(
          (candidate) => candidate.episode?.id === 'pregnancy_decision' && eligible(candidate, run)
        );
    if (canContinueEducationSameAge || canContinuePregnancySameAge) {
      run.yearStarted = true;
      save();
      render();
      return;
    }
    run.yearStarted = false;
    settleYear(run);
    run.age++;
    syncDerived(run);
    save();
    render();
  }
  function episodeBindingInvalid(id, record, run) {
    if (
      id === 'undergraduate_application' &&
      run.education.fullTimeUndergraduateClosed &&
      run.education.status !== 'enrolled'
    )
      return true;
    if (
      id === 'adoption_process' &&
      (run.relationships.activePartnerId ||
        !['none', 'divorced', 'widowed'].includes(run.relationships.partnerStatus))
    )
      return true;
    for (const binding of Object.values(record.boundActors || {})) {
      if (
        binding?.kind === 'person' &&
        !run.people.some((item) => item.id === binding.id && item.alive === binding.alive)
      )
        return true;
      if (
        binding?.kind === 'organization' &&
        binding.id.startsWith('shop_opening:') &&
        run.business.status === 'closed'
      )
        return true;
    }
    if (
      id === 'public_exam' &&
      record.phase > 1 &&
      run.employment.status === 'employed' &&
      run.employment.employerType === 'public'
    )
      return true;
    if (id === 'layoff_reemployment' && record.phase > 1 && run.employment.status === 'employed')
      return true;
    if (id === 'career_break' && record.phase > 1 && run.activity.mode === 'work') return true;
    if (
      id === 'guarantee_recourse' &&
      record.phase > 2 &&
      !run.finance.liabilities.some((item) => item.guaranteed && item.status !== 'settled')
    )
      return true;
    if (id === 'acute_illness' && record.phase > 1 && run.health.status === 'well') return true;
    if (id === 'business_expansion' && record.phase > 1 && run.business.status !== 'operating')
      return true;
    if (
      id === 'wealth_peak' &&
      record.phase > 1 &&
      (run.business.status !== 'operating' || !['national', 'global'].includes(run.business.scale))
    )
      return true;
    const habit = /^habit_(gambling|alcohol|gaming|shopping|medication)_/.exec(id);
    if (habit && record.phase > 1 && run.habits.type !== habit[1]) return true;
    const next = INDEX.kinds.decision.find(
      (event) => event.episode?.id === id && event.episode.phase === record.phase
    );
    if (
      next &&
      run.age >= record.nextPhaseAge &&
      (run.age > next.ageMax ||
        !requirementsMatch(next.requirements, run) ||
        !resolveActors(next, run))
    )
      return true;
    return false;
  }
  const EPISODE_CLOSURES = {
    shop_opening: {
      deadline:
        '从第一次考察起，五年了。租约、设备和库存不能再悬着。你不再往里投了，清了货，退了租。这家店，停在这。',
      invalidated:
        '门店已经退了，品牌支持也停了。剩下的库存装箱，设备处理了，该结的结了。开店这条路，走完了。',
    },
    public_exam: {
      deadline:
        '两轮招录过去了。报名账号里的记录归档。你不再等名单，材料袋收好，回去找工作。这次招录，退了。',
      invalidated:
        '你已经通过另一项招录进了公共部门。原报考单位的邮件不再回复。这次重复报名，到此结束。',
    },
    layoff_reemployment: {
      deadline:
        '解除通知下来两年了。补偿和备用金不能还当收入。你留着失业登记和求职记录，先用短活儿撑着。这次落脚，停在这。',
      invalidated:
        '你签了新合同，报到完了。原单位的离职证明装进档案。这次裁员后的重新落脚，提前结束。',
    },
    career_break: {
      deadline:
        '第三次对账了。房租和日常不能还只靠备用金。你不再拖了，开始接能马上结算的活儿。这段主动不工作，到底被钱催着收了。',
      invalidated: '你恢复了全职。工作日闹钟又响了。原来的空窗预算表，停在这。',
    },
    guarantee_recourse: {
      deadline:
        '从签担保起，三年了。合同、催收单、还款凭证和债权人回复——你放进同一份清单。不再口头拖。这次担保，以没追回来的实际损失收场。',
      invalidated:
        '这笔担保结了，或失效了。结清证明和往来记录你收好。不再走一条已经不存在的追偿路。',
    },
    acute_illness: {
      deadline:
        '检查后第四年了。复诊、治疗和功能评估不能再悬着。你按现在的能力做了最后一次康复评估。这次疾病，以长期管理和功能调整收场。',
      invalidated:
        '复查确认了——现在的问题不再需要这条治疗路线。检查与结案记录你留着。以后只按普通身体状态管。',
    },
  };
  function habitEpisodeClosure(id, reason) {
    const label = episodeLabel(id);
    return reason === 'invalidated'
      ? `${label}——类型或治疗状态变了。记录、账单和复诊日期你留着。这次处理，停在了真实状态处。`
      : `${label}开始两年了。最近的使用记录、现实功能和支持安排——你复核了一遍。按当前的治疗或恢复状态，收在这。`;
  }
  function queueEpisodeClosure(id, record, reason) {
    const run = state.run,
      text =
        episodeCatalog(id)[reason] ||
        EPISODE_CLOSURES[id]?.[reason] ||
        (id.startsWith('habit_')
          ? habitEpisodeClosure(id, reason)
          : `${episodeLabel(id) || '当前事件'}已到结束条件。`);
    if (
      id === 'relationship_start' &&
      reason === 'invalidated' &&
      run.relationships.partnerStatus === 'dating'
    ) {
      if (run.relationships.activePartnerId) transitionPartner(run, { value: 'exPartner' });
      run.relationships.partnerStatus = 'none';
      syncDerived(run);
    }
    if (id === 'adoption_process' && reason === 'invalidated')
      run.relationships.adoptionStatus = 'invalidated';
    record.status = 'abandoned';
    record.closureReason = reason;
    record.phase = Math.max(1, record.phase);
    record.nextPhaseAge = run.age;
    run.sceneQueue = [{ kind: 'result', forced: true, episodeId: id, reason, text }];
    run.currentDecision = null;
    run.phase = 'episode';
    save();
    render();
    return true;
  }
  function dueEpisodeClosure(run) {
    for (const [id, record] of Object.entries(run.episodes)) {
      if (record.status !== 'active') continue;
      if (episodeBindingInvalid(id, record, run))
        return queueEpisodeClosure(id, record, 'invalidated');
      if (run.age >= record.deadlineAge) return queueEpisodeClosure(id, record, 'deadline');
    }
    return false;
  }
  function finishForcedEpisode(scene) {
    const run = state.run,
      event = INDEX.kinds.decision.find((item) => item.episode?.id === scene.episodeId);
    addTimeline(
      {
        id: `episode_${scene.episodeId}_${scene.reason}_${run.age}`,
        kind: 'consequence',
        track: event?.track || 'ordinary',
        icon: '↩',
      },
      scene.text,
      'chosen'
    );
    run.sceneQueue = [];
    run.currentDecision = null;
    run.phase = 'playing';
    run.yearStarted = false;
    settleYear(run);
    run.age++;
    syncDerived(run);
    save();
    render();
  }
  function advanceEpisodeScene() {
    const run = state.run,
      scene = run?.sceneQueue?.[0];
    if (run?.phase !== 'episode' || !scene || inputLocked) return;
    if (scene.kind === 'situation') {
      run.sceneQueue.shift();
      save();
      render();
      return;
    }
    if (scene.kind === 'result') {
      if (scene.forced) finishForcedEpisode(scene);
      else finishEpisodeResult(scene);
    }
  }
  function impactScore(before, after, choice) {
    let score = 2;
    score += Math.min(8, Math.abs(after.finance.netWorth - before.finance.netWorth) / 20000);
    score +=
      Math.abs(after.health.physical - before.health.physical) / 3 +
      Math.abs(after.health.mental - before.health.mental) / 3;
    score += (choice.commitments?.length || 0) * 2;
    score += choice.outcomeTags?.length || 0;
    return Math.round(score);
  }
  function chooseDecision(index) {
    const run = state.run,
      event = run.currentDecision;
    if (event?.episode) {
      chooseEpisodeDecision(index);
      return;
    }
    const originalChoice = event?.choices?.[index],
      choice = resolveCardChoice(originalChoice, run).choice;
    if (!choice || inputLocked || !choiceEnabled(originalChoice, run)) return;
    inputLocked = true;
    const snapshot = copy(run),
      result = applyCommands(choice.effects, event);
    for (const tag of choice.outcomeTags || []) addTag(run, tag);
    scheduleConsequence(event, choice);
    run.decisionHistory.push({
      age: run.age,
      eventId: event.id,
      choiceId: choice.id,
      choice: choice.text,
      result: choice.resultText,
      stateBefore: {
        activity: snapshot.activity.mode,
        employment: snapshot.employment.status,
        partner: snapshot.relationships.partnerStatus,
        children: snapshot.relationships.childCount,
        netWorth: snapshot.finance.netWorth,
        health: snapshot.health.physical,
        habit: snapshot.habits.stage,
      },
      stateAfter: {
        activity: run.activity.mode,
        employment: run.employment.status,
        partner: run.relationships.partnerStatus,
        children: run.relationships.childCount,
        netWorth: run.finance.netWorth,
        health: run.health.physical,
        habit: run.habits.stage,
      },
      outcomeTags: [...(choice.outcomeTags || [])],
      commitments: choice.commitments || [],
      impact: impactScore(result.before, result.after, choice),
    });
    run.usedEvents.push(event.id);
    run.decisionCount++;
    run.lastDecisionAge = run.age;
    run.stageDecisionCounts[stageForAge(run.age)] =
      (run.stageDecisionCounts[stageForAge(run.age)] || 0) + 1;
    addTimeline(event, `${choice.text}。${choice.resultText}`, 'chosen');
    run.currentDecision = null;
    run.phase = 'playing';
    run.yearStarted = false;
    settleYear(run);
    run.age++;
    syncDerived(run);
    save();
    render();
    setTimeout(() => (inputLocked = false), 180);
  }

  const TRACK_LABELS = {
    education: '教育',
    employment: '工作',
    public: '公共职业',
    remote: '远程生活',
    business: '经营',
    leisure: '不工作',
    partnership: '关系',
    children: '子女',
    finance: '财务',
    health: '健康',
    habits: '成瘾与戒断',
    later: '晚年',
    origin: '出身',
    identity: '欲望',
  };
  function baseSalary(run) {
    if (!['employed', 'gig'].includes(run.employment.status)) return 0;
    return Math.max(
      0,
      Math.round(
        Number(run.employment.incomeAnnualGross) ||
          (Number(run.employment.salary) || 0) * 12
      )
    );
  }
  function livingCost(run) {
    if (
      run.age < 18 ||
      run.activity.mode === 'childhood' ||
      (run.activity.mode === 'study' && run.activity.funding === 'family')
    )
      return 0;
    const base = 16000 * (run.location.mods.cost / 100),
      children = childPeople(run).filter((child) => personAge(child, run) < 18).length * 9000,
      housing = run.housing.status === 'renting' ? 12000 * (run.location.mods.cost / 100) : 0,
      care = run.activity.mode === 'care' ? 8000 : 0;
    return Math.max(0, Math.round(base + children + housing + care));
  }
  function settleLiabilities(run) {
    for (const debt of run.finance.liabilities) {
      if (debt.status === 'settled') continue;
      const interest = Math.round(debt.principal * (debt.rate || 0.06)),
        principalPayment = Math.round(debt.principal * (debt.kind === 'mortgage' ? 0.04 : 0.08)),
        due = interest + principalPayment;
      if (run.finance.cash >= due) {
        run.finance.cash -= due;
        debt.principal = Math.max(0, debt.principal - principalPayment);
        debt.arrears = Math.max(0, (debt.arrears || 0) - 1);
        debt.status = debt.principal === 0 ? 'settled' : 'current';
      } else {
        const paid = Math.max(0, run.finance.cash);
        run.finance.cash = 0;
        debt.principal = Math.max(0, debt.principal + interest - paid);
        debt.arrears = (debt.arrears || 0) + 1;
        debt.status = debt.arrears >= 2 ? 'delinquent' : 'current';
        run.pressures.money = clamp(run.pressures.money + (debt.arrears >= 2 ? 8 : 4), 0, 100);
      }
    }
  }
  function settleBusiness(run) {
    if (run.business.status !== 'operating') return 0;
    const skill = run.business.operatingSkill,
      locationCost = run.location.mods.cost,
      lock = run.business.mode === 'franchise' ? 18 : 0,
      readiness =
        skill * 0.6 +
        (100 - locationCost) * 0.25 +
        stable(run.seed, `business-${run.age}`, 100) * 0.15;
    let flow = Math.round((readiness - 48) * 3500 - lock * 1200);
    if (run.business.mode === 'franchise') flow -= 16000;
    if (flow < 0) {
      run.pressures.money = clamp(run.pressures.money + 6, 0, 100);
      run.pressures.family = clamp(run.pressures.family + 3, 0, 100);
    } else {
      run.business.operatingSkill = clamp(run.business.operatingSkill + 2, 0, 100);
      run.business.equity = Math.max(
        run.business.equity,
        Math.round(flow * 4 + run.business.equity * 1.08)
      );
      if (run.business.equity >= 1e6) run.business.scale = 'regional';
      if (run.business.equity >= 1e8) run.business.scale = 'national';
      if (run.business.equity >= 1e12) {
        run.business.scale = 'global';
        addTag(run, 'wealthApex');
      }
    }
    return flow;
  }
  function settleYear(run) {
    if (run.age === 0 && run.timeline.length < 2) return;
    resumeCareLeaveIfDue(run);
    run.world = worldAt(run.age, run.location);
    let income = baseSalary(run),
      expense = livingCost(run);
    if (run.activity.mode === 'leisure' || run.activity.mode === 'sabbatical') {
      income =
        run.activity.funding === 'family'
          ? Math.round(run.originHousehold.cashflow * 250)
          : run.activity.funding === 'partner'
            ? Math.round(expense * 0.7)
            : 0;
      if (run.activity.mode === 'leisure')
        run.capabilities.employability = clamp(run.capabilities.employability - 2, 0, 100);
    }
    if (run.activity.mode === 'retired')
      income = Math.round(run.employment.publicExperience * 350 + 12000);
    income += settleBusiness(run);
    if (run.employment.arrangement === 'remote' || run.employment.arrangement === 'hybrid')
      expense = Math.max(0, expense - 4000);
    if (run.mobility.mode === 'overseasNomad') expense += 18000;
    if (run.employment.arrangement === 'splitShift') {
      run.pressures.body = clamp(run.pressures.body + 5, 0, 100);
      run.pressures.family = clamp(
        run.pressures.family + Math.round(run.employment.schedule.splitGapHours / 2),
        0,
        100
      );
    }
    if (run.mobility.rootlessness > 50)
      run.pressures.loneliness = clamp(run.pressures.loneliness + 4, 0, 100);
    if (run.mobility.platformDependence > 60)
      income = Math.round(income * (0.72 + stable(run.seed, `platform-${run.age}`, 55) / 100));
    run.finance.lastIncome = income;
    run.finance.lastExpense = expense;
    run.finance.cash += income - expense;
    settleLiabilities(run);
    if (run.finance.cash < 0) {
      addLiability(run, { value: Math.abs(run.finance.cash), kind: 'living', rate: 0.06 });
      run.finance.cash = 0;
      run.pressures.money = clamp(run.pressures.money + 7, 0, 100);
    }
    const bodyLoad =
      run.pressures.body - (run.attrs.physique - 5) * 3 - run.capabilities.resilience;
    if (bodyLoad >= 70) run.health.physical -= 3;
    else if (bodyLoad >= 40) run.health.physical -= 1;
    if (run.health.status === 'recovering' && run.pressures.body < 55)
      healthRecovery(run, { value: 2, resolve: true });
    else if (run.health.status === 'well' && run.health.physical < 75 && run.attrs.physique >= 7)
      run.health.physical += 1;
    if (['dependent', 'uncontrolled', 'relapse'].includes(run.habits.stage)) {
      const severe = run.habits.stage === 'uncontrolled' || run.habits.stage === 'relapse';
      run.health.physical -= severe ? 4 : 3;
      run.health.mental -= severe ? 5 : 4;
      run.finance.cash -= severe ? 18000 : 12000;
    }
    if (run.habits.stage === 'recovery') {
      run.habits.recoveryYears++;
      run.habits.risk = clamp(run.habits.risk - 4, 0, 100);
      run.health.mental = clamp(run.health.mental + 2, 0, 100);
      if (run.habits.recoveryYears >= 3) addTag(run, 'recovery');
    }
    for (const key of Object.keys(run.pressures))
      if (run.pressures[key] > 0) run.pressures[key] = clamp(run.pressures[key] - 1, 0, 100);
    run.employment.tenure = run.employment.status === 'employed' ? run.employment.tenure + 1 : 0;
    run.activity.years++;
    run.health.physical = clamp(run.health.physical, 0, 100);
    run.health.mental = clamp(run.health.mental, 0, 100);
    syncDerived(run);
    unlockCodex();
  }

  function educationMilestones(run) {
    if (run.age === 6 && run.education.status === 'notStarted')
      transitionEducation(run, { value: 'primary', status: 'enrolled' });
    if (run.age === 12 && run.education.path === 'primary')
      transitionEducation(run, { value: 'middleSchool', status: 'enrolled' });
    if (
      run.age === 14 &&
      run.education.path === 'middleSchool' &&
      run.education.status === 'enrolled'
    ) {
      run.education.status = 'completed';
      run.education.highestCompleted = 'middleSchool';
      run.education.nextStage = 'firstJob';
      run.employment.entryCredential = 'middleSchool';
    }
    if (
      run.age === 17 &&
      ['highSchool', 'vocational'].includes(run.education.path) &&
      run.education.status === 'enrolled'
    ) {
      run.education.status = 'completed';
      run.education.highestCompleted =
        run.education.path === 'vocational' ? 'vocational' : 'secondary';
      run.education.nextStage = 'firstJob';
      run.employment.entryCredential =
        run.education.path === 'vocational' ? 'vocational' : 'highSchool';
    }
  }
  function updatePeople(run) {
    for (const item of run.people) {
      if (item.status === 'unborn' && run.age >= item.bornAt) {
        item.status = 'living';
        item.alive = true;
        addTimeline(
          {
            id: `person_birth_${item.id}_${run.age}`,
            icon: '·',
            kind: 'consequence',
            track: 'origin',
          },
          '家里多了一个孩子。'
        );
      }
      if (!item.alive) continue;
      const age = personAge(item, run);
      if (
        age > 78 &&
        stable(run.seed, `${item.id}:death:${run.age}`, 100) < Math.min(45, (age - 74) * 3)
      ) {
        item.alive = false;
        item.status = 'deceased';
        if (item.id === run.relationships.activePartnerId) {
          run.relationships.lastPartnerId = item.id;
          run.relationships.activePartnerId = null;
          run.relationships.partnerStatus = 'widowed';
          addTag(run, 'widowed');
        }
        addTimeline(
          {
            id: `person_loss_${item.id}_${run.age}`,
            icon: '·',
            kind: 'consequence',
            track: 'later',
          },
          `${item.relation === 'father' ? '父亲' : item.relation === 'mother' ? '母亲' : item.relation === 'partner' ? '伴侣' : '一位家人'}走了。`
        );
      }
    }
  }
  function mortality(run) {
    if (run.deathCause) return true;
    const ageRisk =
        run.age < 1
          ? 0.002
          : run.age < 12
            ? 0.0003
            : run.age < 40
              ? 0.0006
              : run.age < 60
                ? 0.002
                : run.age < 75
                  ? 0.012
                  : 0.035 + (run.age - 75) * 0.005,
      healthRisk = run.health.physical < 20 ? 0.18 : run.health.physical < 40 ? 0.04 : 0,
      habitHarm = ['dependent', 'uncontrolled', 'relapse'].includes(run.habits.stage),
      habitRisk = habitHarm ? 0.018 : 0;
    if (
      run.age >= run.naturalDeathAge ||
      chance(Math.min(0.85, ageRisk + healthRisk + habitRisk))
    ) {
      run.deathCause =
        run.age < 18
          ? '疾病，或一次事故'
          : run.health.physical < 30
            ? '长期健康问题拖到了最后'
            : habitHarm
              ? '失控留下的身体后果'
              : '自然衰老';
      if (run.age < 45) addTag(run, 'earlyDeath');
      return true;
    }
    return false;
  }

  function dueConsequence(run) {
    const schedule = run.scheduledConsequences
      .filter(
        (item) =>
          item.status === 'scheduled' && item.dueAge <= run.age && item.expiresAge >= run.age
      )
      .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.dueAge - b.dueAge)[0];
    if (!schedule) return null;
    const event = INDEX.event.get(schedule.eventId),
      outcome = event?.choiceOutcomes?.[schedule.memoryKey];
    if (!event || !outcome) {
      schedule.status = 'invalidated';
      return null;
    }
    return {
      ...event,
      runtimeText: outcome.text,
      runtimeEffects: outcome.effects,
      runtimeTags: outcome.outcomeTags,
      scheduleId: schedule.id,
    };
  }
  function validPlanningPartner(run) {
    return Boolean(
      run.relationships.activePartnerId &&
        ['dating', 'partnered', 'married'].includes(run.relationships.partnerStatus)
    );
  }
  function prepareFamilyState(run) {
    const relationships = run.relationships;
    if (
      !relationships.familyPlanningOffered &&
      !relationships.familyPlanningClosed &&
      run.age >= 23 &&
      run.age <= 39 &&
      validPlanningPartner(run)
    ) {
      relationships.familyPlanningOffered = true;
      if (stable(run.seed, 'family-planning-opportunity', 100) >= 85)
        relationships.familyPlanningClosed = true;
    }
    if (
      !relationships.adoptionOffered &&
      run.age >= 30 &&
      !relationships.activePartnerId &&
      ['none', 'divorced', 'widowed'].includes(relationships.partnerStatus) &&
      relationships.childCount <= 1
    ) {
      relationships.adoptionOffered = true;
      relationships.adoptionStatus =
        stable(run.seed, 'single-adoption-opportunity', 100) < 50 ? 'offered' : 'notOffered';
    }
    const planning = run.episodes.becoming_parent;
    const conceptionDue =
      planning &&
      !relationships.plannedConceptionResolved &&
      ((planning.status === 'active' &&
        planning.phase === 2 &&
        run.age >= planning.nextPhaseAge &&
        ['planned', 'deferred'].includes(planning.route)) ||
        (planning.status === 'resolved' &&
          planning.route === 'planned_review' &&
          run.age > planning.nextPhaseAge));
    if (conceptionDue && !validPlanningPartner(run))
      return queueEpisodeClosure('becoming_parent', planning, 'invalidated');
    const adoption = run.episodes.adoption_process;
    if (
      adoption &&
      relationships.adoptionStatus === 'waiting' &&
      validPlanningPartner(run)
    )
      return queueEpisodeClosure('adoption_process', adoption, 'invalidated');
    if (
      planning?.status === 'resolved' &&
      planning.route === 'planned_review' &&
      !relationships.plannedConceptionResolved &&
      run.age > planning.nextPhaseAge
    ) {
      resolveConception(run, `review:${planning.startedAt}`);
      planning.closureReason =
        relationships.pregnancyStatus === 'confirmed' ? 'conceived' : 'notPregnant';
      if (relationships.pregnancyStatus === 'confirmed') return false;
      relationships.parenthoodIntent = 'undecided';
      return queueEpisodeClosure('becoming_parent', planning, 'notPregnant');
    }
    if (
      !planning ||
      planning.status !== 'active' ||
      planning.phase !== 2 ||
      run.age < planning.nextPhaseAge
    )
      return false;
    if (planning.route === 'planned' && !relationships.plannedConceptionResolved) {
      resolveConception(run, `initial:${planning.startedAt}`);
      relationships.familyPlanningClosed = true;
      if (relationships.pregnancyStatus === 'confirmed') {
        planning.status = 'resolved';
        planning.closureReason = 'conceived';
        planning.nextPhaseAge = run.age;
        return false;
      }
      relationships.parenthoodIntent = 'undecided';
      return queueEpisodeClosure('becoming_parent', planning, 'notPregnant');
    }
    if (planning.route === 'deferred' && !relationships.unplannedConceptionChecked) {
      relationships.unplannedConceptionChecked = true;
      if (stable(run.seed, `unplanned-conception:${planning.startedAt}`, 100) < 10) {
        relationships.pregnancyStatus = 'confirmed';
        relationships.familyPlanningClosed = true;
        planning.status = 'resolved';
        planning.closureReason = 'unplannedPregnancy';
        planning.nextPhaseAge = run.age;
      }
    }
    return false;
  }
  function dueSecret(run) {
    const secret = run.originHousehold.secret;
    if (run.secretRevealed || !secret || run.age < secret.age) return null;
    return {
      id: secret.id,
      kind: 'secret',
      track: 'origin',
      ageMin: secret.age,
      ageMax: 105,
      icon: '⌂',
      text: `${secret.name}：${secret.text}`,
      effects: secret.effects,
      requirements: secret.requirements,
      actors: [],
      assertions: [],
      contentRevision: CONTENT_REVISION,
    };
  }
  function eventWeight(event) {
    const run = state.run;
    let weight = event.weight || 10;
    const conflict = DATA.conflicts.find((item) => item.id === run.mainConflict);
    weight *= CONTRACT.conflictWeightMultiplier(event.track, conflict?.desires);
    if (event.track === 'remote') weight *= 1 + run.capabilities.portableSkill * 0.12;
    if (event.track === 'business') weight *= 1 + run.business.operatingSkill / 180;
    if (event.track === 'health') {
      const commands = event.runtimeEffects || event.effects || [],
        incident = commands.some((command) => command.type === 'healthIncident'),
        recovery = commands.some((command) => command.type === 'healthRecovery');
      if (incident) {
        const risk = clamp(
          0.12 +
            (6 - run.attrs.physique) * 0.045 +
            run.pressures.body / 240 +
            (70 - run.health.physical) / 300,
          0.08,
          0.72
        );
        weight *= risk;
      } else if (recovery && run.health.status !== 'well') weight *= 1.8;
      else if (run.health.status === 'well') weight *= 0.55;
      if (run.health.physical < 50) weight *= 1.35;
    }
    if (event.track === 'finance' && (run.finance.totalDebt > 0 || run.pressures.money > 50))
      weight *= 1.6;
    if (event.track === 'habits' && run.habits.risk > 30) weight *= 1.5;
    if (event.track === 'children' && run.relationships.childCount) weight *= 1.35;
    if (
      event.episode?.id === 'relationship_start' &&
      ['none', 'divorced', 'widowed'].includes(run.relationships.partnerStatus)
    )
      weight *= 3;
    if (event.track === 'partnership' && run.relationships.partnerStatus !== 'none') weight *= 1.25;
    if (run.timeline.at(-1)?.track === event.track) weight *= 0.45;
    if (state.meta.seen.events[event.id]) weight *= 0.75;
    return Math.max(0.1, weight);
  }
  function selectBeat(run) {
    const pool = INDEX.kinds.beat.filter(
      (event) => !event.id.startsWith('origin_context_') && eligible(event, run)
    );
    return weighted(pool, eventWeight);
  }
  function originMilestone(run) {
    return (
      INDEX.kinds.beat
        .filter(
          (event) =>
            event.track === 'origin' &&
            event.id.startsWith(`origin_context_${run.age}_`) &&
            eligible(event, run)
        )
        .sort(
          (a, b) => (b.requirements?.all?.length || 0) - (a.requirements?.all?.length || 0)
        )[0] || null
    );
  }
  function activeEpisodeDecision(run) {
    for (const [id, record] of Object.entries(run.episodes)) {
      if (record.status !== 'active' || run.age < record.nextPhaseAge) continue;
      const candidate = INDEX.kinds.decision.find(
        (event) =>
          event.episode?.id === id &&
          event.episode.phase === record.phase &&
          !run.usedEvents.includes(event.id)
      );
      if (candidate && eligible(candidate, run)) return candidate;
    }
    return null;
  }
  function mandatoryDecision(run) {
    const pendingPregnancy = INDEX.kinds.decision.find(
        (event) =>
          event.episode?.id === 'pregnancy_decision' &&
          event.episode.role === 'start' &&
          eligible(event, run)
      ),
      globals = INDEX.kinds.decision.filter((event) => !event.episode && eligible(event, run)),
      hasClaimedDesire = Object.values(run.desires).some(
        (value) => value && typeof value === 'object' && value.claimed
      );
    if (pendingPregnancy) return pendingPregnancy;
    if (run.age >= 14 && !hasClaimedDesire) {
      const event = globals.find((item) => item.track === 'identity' && item.ageMin === 14);
      if (event) return event;
    }
    return globals.find((item) => item.track === 'identity' && item.ageMin === 30) || null;
  }
  function trackDecisionCount(run, track) {
    return run.decisionHistory.filter((item) => INDEX.event.get(item.eventId)?.track === track)
      .length;
  }
  function decisionAllowance(run) {
    if (run.age < 14) return 1;
    if (run.age <= 18) return 3;
    if (run.age <= 25) return 6;
    if (run.age <= 35) return 9;
    if (run.age <= 45) return 12;
    if (run.age <= 60) return 15;
    if (run.age <= 75) return Math.min(18, run.targetDecisions);
    return run.targetDecisions;
  }
  function crisisDecision(run) {
    if (run.age - run.lastDecisionAge < 2) return null;
    const track =
      run.finance.totalDebt > Math.max(50000, run.finance.lastIncome * 1.5)
        ? 'finance'
        : run.health.status !== 'well' && run.health.conditionSeverity >= 35
          ? 'health'
          : ['dependent', 'uncontrolled', 'relapse'].includes(run.habits.stage)
            ? 'habits'
            : ['none', 'unemployed'].includes(run.employment.status) &&
                run.activity.mode === 'seeking' &&
                run.activity.years >= 2
              ? 'employment'
              : null;
    if (!track || trackDecisionCount(run, track) >= 4) return null;
    const episodic = ['health', 'habits'].includes(track);
    return weighted(
      INDEX.kinds.decision.filter(
        (event) =>
          event.track === track &&
          (episodic ? event.episode?.role === 'start' : !event.episode) &&
          eligible(event, run)
      ),
      eventWeight
    );
  }
  function ageBoundEpisodeStart(run) {
    const candidates = INDEX.kinds.decision.filter(
        (event) =>
          event.episode?.role === 'start' &&
          episodeCatalog(event.episode.id).ageBound &&
          eligible(event, run)
      ),
      unresolvedSchoolHarm = candidates.find(
        (event) =>
          event.episode.id === 'school_harm' &&
          run.development.severeSchoolHarm &&
          !run.development.schoolHarmResolved
      ),
      familyPlanning = candidates.find((event) => event.episode.id === 'becoming_parent'),
      singleAdoption = candidates.find((event) => event.episode.id === 'adoption_process'),
      firstJobReentry = candidates.find(
        (event) =>
          event.episode.id === 'long_term_first_job_reentry' &&
          run.age >= 32 &&
          run.employment.firstJobAge === null &&
          ['none', 'unemployed'].includes(run.employment.status)
      );
    return familyPlanning || singleAdoption || unresolvedSchoolHarm || firstJobReentry || weighted(candidates, eventWeight);
  }
  function startDecision(run) {
    const forced = mandatoryDecision(run),
      episode = activeEpisodeDecision(run),
      ageBound = ageBoundEpisodeStart(run),
      crisis = crisisDecision(run);
    if (ageBound?.episode?.id === 'long_term_first_job_reentry') return ageBound;
    if (forced || episode || ageBound || crisis) return forced || episode || ageBound || crisis;
    const starts = INDEX.kinds.decision.filter(
      (event) => event.episode?.role === 'start' && eligible(event, run)
    );
    return (
      weighted(starts, eventWeight) ||
      weighted(
        INDEX.kinds.decision.filter((event) => eligible(event, run)),
        eventWeight
      )
    );
  }
  function shouldOfferDecision(run) {
    if (mandatoryDecision(run) || activeEpisodeDecision(run) || ageBoundEpisodeStart(run))
      return true;
    if (run.decisionCount >= run.targetDecisions || run.decisionCount >= decisionAllowance(run))
      return false;
    if (crisisDecision(run)) return true;
    if (run.age - run.lastDecisionAge < 2) return false;
    const remaining = Math.max(1, (run.naturalDeathAge - run.age) / 4),
      needed = run.targetDecisions - run.decisionCount;
    return chance(Math.min(0.55, (needed / remaining) * 0.35));
  }

  function addTimeline(event, text, variant = 'event') {
    const run = state.run;
    run.timeline.push({
      id: event.id,
      age: run.age,
      year: 2026 + run.age,
      kind: event.kind,
      track: event.track,
      icon: event.icon || '·',
      text,
      variant,
    });
    run.timeline = run.timeline.slice(-180);
    state.meta.seen.events[event.id] = (state.meta.seen.events[event.id] || 0) + 1;
  }
  function revealEvent(event) {
    const run = state.run;
    applyCommands(event.runtimeEffects || event.effects || [], event);
    for (const tag of event.runtimeTags || []) addTag(run, tag);
    addTimeline(event, event.runtimeText || event.text);
    run.usedEvents.push(event.id);
    if (event.kind === 'secret') run.secretRevealed = true;
    if (event.scheduleId) {
      const schedule = run.scheduledConsequences.find((item) => item.id === event.scheduleId);
      if (schedule) schedule.status = 'used';
      run.usedConsequences.push(event.scheduleId);
    }
    save();
    render();
  }
  function beginYear() {
    const run = state.run;
    if (run.age > 105 || mortality(run)) {
      finishLife();
      return true;
    }
    educationMilestones(run);
    updatePeople(run);
    if (prepareFamilyState(run)) return true;
    run.yearStarted = true;
    run.yearQueue = [];
    if (dueEpisodeClosure(run)) return true;
    const dueCard = [0, 18, 35, 55].find((age) => run.age >= age && !run.cardAges.includes(age));
    if (dueCard !== undefined) {
      startCardDraw(dueCard);
      return true;
    }
    const special = dueConsequence(run) || dueSecret(run),
      primary = originMilestone(run) ||
        selectBeat(run) || {
          id: `quiet_${run.age}`,
          kind: 'beat',
          track: 'ordinary',
          icon: '·',
          text: '这一年没有大事。日子还是往前走了。',
          effects: [],
        };
    run.yearQueue.push(primary);
    if (special) run.yearQueue.push(special);
    else if (chance(0.18)) {
      const second = selectBeat(run);
      if (second && second.id !== primary.id) run.yearQueue.push(second);
    }
    const rate = run.age < 18 ? 0.004 : run.age < 65 ? 0.008 : 0.006;
    if (run.swanCount < 2 && run.age - run.lastSwanAge >= 10 && chance(rate)) {
      const swan = weighted(
        INDEX.kinds.blackSwan.filter((event) => eligible(event, run)),
        eventWeight
      );
      if (swan) {
        const index = primary.id.startsWith('origin_context_')
          ? 1
          : Math.min(1, run.yearQueue.length - 1);
        if (index === run.yearQueue.length) run.yearQueue.push(swan);
        else run.yearQueue[index] = swan;
        run.swanCount++;
        run.lastSwanAge = run.age;
      }
    }
    run.yearQueue = run.yearQueue.slice(0, 2);
    return false;
  }
  function finishYear() {
    const run = state.run;
    if (shouldOfferDecision(run)) {
      const event = startDecision(run);
      if (event) {
        if (event.episode) startEpisodePhase(event);
        else {
          run.currentDecision = event;
          run.phase = 'decision';
          save();
          render();
        }
        return true;
      }
    }
    settleYear(run);
    run.yearStarted = false;
    run.age++;
    syncDerived(run);
    save();
    return false;
  }
  function advanceOneBeat(force = false) {
    const run = state.run;
    if (!run || run.phase !== 'playing' || (!force && state.view !== 'game') || inputLocked)
      return false;
    if (!force) inputLocked = true;
    try {
      for (let guard = 0; guard < 6; guard++) {
        if (!run.yearStarted && beginYear()) return true;
        if (run.phase !== 'playing') return true;
        if (run.yearQueue.length) {
          revealEvent(run.yearQueue.shift());
          return true;
        }
        if (finishYear()) return true;
      }
      return false;
    } finally {
      if (!force) setTimeout(() => (inputLocked = false), 150);
    }
  }

  function startCardDraw(age) {
    const pool = DATA.cards.filter(
      (card) => card.drawAge === age && !state.run.cards.includes(card.id)
    );
    state.run.phase = 'card';
    state.run.cardAge = age;
    state.run.cardOptions = [...pool]
      .sort(
        (a, b) =>
          stable(state.run.seed, `${age}:${a.id}`, 100) -
          stable(state.run.seed, `${age}:${b.id}`, 100)
      )
      .slice(0, 3);
    save();
    render();
  }
  function chooseCard(id) {
    const run = state.run,
      card = INDEX.cards.get(id);
    if (!card || run.phase !== 'card') return;
    run.cards.push(card.id);
    run.cardAges.push(run.cardAge);
    applyCommands(card.effects, card);
    addTimeline(
      { id: card.id, kind: 'card', track: 'identity', icon: '◇' },
      `你有了“${card.displayName}”：${card.text}`,
      'chosen'
    );
    run.phase = run.cardAge === 0 ? 'playing' : 'playing';
    run.cardOptions = [];
    run.yearStarted = false;
    save();
    render();
  }

  function unlockCodex() {
    const run = state.run;
    for (const entry of DATA.codex) {
      if (state.meta.codex.includes(entry.id)) continue;
      const rule = entry.unlockRules || {},
        tagOk = rule.outcomeTagsAny?.some((tag) => run.outcomeTags[tag]),
        anyOk = rule.stateAny?.some((item) => predicateMatches(item, run)),
        allOk = rule.stateAll?.every((item) => predicateMatches(item, run));
      if (tagOk || anyOk || allOk) state.meta.codex.push(entry.id);
    }
  }

  function finalSignals(run) {
    const signals = new Set(Object.keys(run.outcomeTags)),
      has = (tag) => Boolean(run.outcomeTags[tag]);
    signals.add('lifeEnded');
    if (new Set(run.decisionHistory.map((item) => item.eventId)).size >= 2)
      signals.add('decisionDiversity');
    if (run.desires.peace.fulfillment >= 65) signals.add('peace');
    if (run.finance.totalDebt === 0 && run.finance.cash >= 30000) signals.add('stable');
    if (run.desires.freedom.fulfillment >= 65) signals.add('freedom');
    if (run.business.equity >= 1e12) signals.add('wealthApex');
    if (run.finance.totalDebt >= 1e6) signals.add('debtCrisis');
    if (run.habits.stage === 'recovery' && run.habits.recoveryYears >= 3) signals.add('recovery');
    if (run.age < 45) signals.add('earlyDeath');
    if (
      run.health.status === 'limited' ||
      run.health.conditionSeverity >= 35 ||
      run.health.physical < 35
    )
      signals.add('health');
    const manageableDebt = run.finance.totalDebt <= Math.max(30000, run.finance.lastIncome * 0.5);
    if (
      has('children:deliberate') &&
      has('finance:deliberate') &&
      manageableDebt &&
      !run.finance.hasArrears &&
      run.relationships.childBond >= 50
    )
      signals.add('cycleBroken');
    if (
      (has('children:negotiated') || has('children:risk')) &&
      has('finance:risk') &&
      (run.finance.hasArrears || run.finance.totalDebt > Math.max(30000, run.finance.lastIncome))
    )
      signals.add('familyControlCycle');
    return signals;
  }
  function endingProfile(run) {
    const signals = finalSignals(run),
      fallback =
        DATA.endingProfiles.find((profile) => profile.id === 'ordinaryContent') ||
        DATA.endingProfiles[0],
      rarity = { 常见: 1, 少见: 2, 罕见: 3, 极罕: 4, 传奇: 5 },
      exact = DATA.endingProfiles
        .filter(
          (profile) =>
            profile.id !== fallback.id && profile.signals.every((signal) => signals.has(signal))
        )
        .sort(
          (a, b) =>
            (rarity[b.rarity] || 0) - (rarity[a.rarity] || 0) ||
            stable(run.seed, a.id, 100) - stable(run.seed, b.id, 100)
        );
    if (exact.length) return exact[0];
    return fallback.signals.every((signal) => signals.has(signal))
      ? fallback
      : DATA.endingProfiles.find(
          (profile) =>
            profile.id === 'earlyExit' && profile.signals.every((signal) => signals.has(signal))
        ) || fallback;
  }
  function endingAxes(run) {
    const claimed = Object.values(run.desires).filter(
        (value) => value && typeof value === 'object' && value.claimed
      ),
      fulfillment =
        (claimed.length
          ? claimed
          : Object.values(run.desires)
              .filter((value) => value && typeof value === 'object')
              .sort((a, b) => b.drive - a.drive)
              .slice(0, 3)
        ).reduce((sum, item) => sum + item.fulfillment, 0) / (claimed.length || 3);
    const support =
        (run.relationships.network +
          run.relationships.originBond +
          Math.max(0, run.relationships.partnerBond) +
          Math.max(0, run.relationships.childBond)) /
        4,
      netWorth = run.finance.netWorth,
      wealthEffect =
        netWorth >= 0
          ? Math.log10(1 + netWorth / 1000) * 8
          : -Math.log10(1 + Math.abs(netWorth) / 1000) * 10,
      debtRatio = run.finance.totalDebt / Math.max(18000, run.finance.lastIncome || 0),
      safety = clamp(
        50 + wealthEffect - Math.min(38, debtRatio * 10) - (run.finance.hasArrears ? 15 : 0),
        0,
        100
      ),
      impact = clamp(
        run.business.scale === 'global'
          ? 100
          : run.business.scale === 'national'
            ? 85
            : run.employment.rank * 12 +
              run.capabilities.skill * 4 +
              Object.keys(run.outcomeTags).length,
        0,
        100
      );
    return {
      自主: clamp(45 + run.agency * 1.5 - run.pressures.family / 3, 0, 100),
      关系: clamp(support, 0, 100),
      健康: clamp((run.health.physical + run.health.mental) / 2, 0, 100),
      安全: safety,
      欲望兑现: clamp(fulfillment, 0, 100),
      社会影响: impact,
    };
  }
  function pivotalFacts(run) {
    const decisions = [...run.decisionHistory]
      .sort((a, b) => b.impact - a.impact || a.age - b.age)
      .slice(0, 3)
      .sort((a, b) => a.age - b.age)
      .map((item) => ({
        age: item.age,
        title: item.choice,
        result: item.result,
        source: item.eventId,
      }));
    const used = new Set(decisions.map((item) => `${item.age}:${item.source}`));
    for (const item of run.timeline
      .filter((item) => ['blackSwan', 'secret', 'consequence'].includes(item.kind))
      .reverse()) {
      if (decisions.length >= 3) break;
      const key = `${item.age}:${item.id}`;
      if (!used.has(key)) {
        decisions.push({
          age: item.age,
          title: item.text,
          result: '这件事改变了后面能走的路。',
          source: item.id,
        });
        used.add(key);
      }
    }
    const realFallbacks = [
      {
        age: 0,
        title: `出生在${run.location.name}的${run.originHousehold.familyName}`,
        result: '出身决定了一开始的资源、关系和能看见的路。',
        source: 'origin',
      },
      {
        age: 0,
        title: `原生家庭有${run.originHousehold.people.filter((item) => item.relation === 'sibling').length}名兄弟姐妹`,
        result: `家庭住房为${run.originHousehold.housing}，家庭债务约${money(run.originHousehold.debt)}。`,
        source: 'origin-household',
      },
      {
        age: run.age,
        title: `生命因${run.deathCause || '自然衰老'}结束`,
        result: '这次能走到多少岁，也是种子决定的。',
        source: 'death',
      },
    ];
    for (const item of realFallbacks) {
      if (decisions.length >= 3) break;
      if (!used.has(`${item.age}:${item.source}`)) decisions.push(item);
    }
    return decisions.slice(0, 3).sort((a, b) => a.age - b.age);
  }
  function routeTags(run) {
    const historical = {
        business: '经营者',
        remote: '远程迁移',
        leisure: '主动不工作',
        public: '公共职业',
        habits: '成瘾与戒断',
        children: '代际关系',
        partnership: '亲密关系',
        employment: '受雇工作',
      },
      items = Object.entries(historical)
        .map(([track, label]) => ({
          label,
          count: Object.keys(run.outcomeTags)
            .filter((tag) => tag.startsWith(`${track}:`))
            .reduce((sum, tag) => sum + run.outcomeTags[tag], 0),
        }))
        .filter((item) => item.count > 0);
    if (run.finance.hasArrears || run.finance.totalDebt > Math.max(50000, run.finance.lastIncome))
      items.push({ label: '债务人生', count: 100 });
    else if (run.outcomeTags['finance:repaid'] || run.outcomeTags['finance:restructured'])
      items.push({ label: '财务重建', count: 60 });
    if (
      run.health.status === 'limited' ||
      run.health.conditionSeverity >= 35 ||
      run.health.physical < 35
    )
      items.push({ label: '健康危机', count: 100 });
    else if (run.health.status === 'managed' && run.health.conditionSeverity > 0)
      items.push({ label: '与健康问题共处', count: 55 });
    else if (run.outcomeTags['health:recovered']) items.push({ label: '康复者', count: 60 });
    return items
      .sort((a, b) => b.count - a.count)
      .filter(
        (item, index, array) => array.findIndex((other) => other.label === item.label) === index
      )
      .slice(0, 3)
      .map((item) => item.label);
  }
  function finishLife() {
    const run = state.run;
    if (run.phase === 'ended' && run.ending) {
      state.view = 'ending';
      render();
      return;
    }
    run.phase = 'ended';
    run.age = clamp(run.age, 0, 105);
    syncDerived(run);
    unlockCodex();
    const profile = endingProfile(run),
      titles = DATA.endingTitles.filter((title) => title.profileId === profile.id),
      title = titles[stable(run.seed, `ending:${profile.id}`, titles.length)] || titles[0],
      facts = pivotalFacts(run),
      axes = endingAxes(run);
    run.ending = {
      profileId: profile.id,
      title: title?.title || '这一生',
      summary: profile.summary,
      rarity: profile.rarity,
      basis: [...profile.signals],
      axes,
      facts,
      tags: routeTags(run),
      seed: run.seed,
      age: run.age,
      deathCause: run.deathCause || '自然衰老',
      netWorth: run.finance.netWorth,
    };
    state.meta.stats.runs = (state.meta.stats.runs || 0) + 1;
    state.meta.histories.unshift({
      title: run.ending.title,
      profileId: profile.id,
      rarity: profile.rarity,
      age: run.age,
      seed: run.seed,
      familyId: run.originHousehold.familyId,
      familyName: run.originHousehold.familyName,
      tags: run.ending.tags,
      axes,
      endedAt: Date.now(),
    });
    state.meta.histories = state.meta.histories.slice(0, 40);
    state.meta.recentSeeds.unshift(run.seed);
    state.meta.recentSeeds = state.meta.recentSeeds.slice(0, 8);
    state.view = 'ending';
    save(true);
    render();
  }

  function topDesires(run = state.run) {
    return Object.entries(run.desires)
      .filter(([, value]) => value && typeof value === 'object')
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => Number(b.claimed) - Number(a.claimed) || b.drive - a.drive)
      .slice(0, 3);
  }
  function pressureLevel(run = state.run) {
    const value = Math.max(...Object.values(run.pressures));
    return value >= 80 ? '危机' : value >= 60 ? '严重' : value >= 30 ? '明显' : '可控';
  }
  function educationLabel(run) {
    const system = { domestic: '国内', us: '美国', europe: '欧洲' },
      paths = {
        primary: '小学',
        middleSchool: '初中',
        highSchool: '高中',
        vocational: '职业教育',
        college: system[run.education.undergraduateSystem]
          ? `${system[run.education.undergraduateSystem]}本科`
          : run.education.enrollmentRegion === 'overseas'
            ? '海外本科'
            : run.education.enrollmentRegion === 'domestic'
              ? '国内本科'
              : '本科',
        postgraduate: system[run.education.postgraduateSystem]
          ? `${system[run.education.postgraduateSystem]}研究生`
          : '研究生',
      },
      fallback = ['未入学', '小学', '初中', '高中', '本科', '研究生'],
      name = paths[run.education.path] || fallback[run.education.level] || '未入学';
    return `${name}${run.education.status === 'enrolled' ? '在读' : run.education.status === 'interrupted' ? '中断' : run.education.level ? '毕业' : ''}`;
  }
  function familyContextLabel(run) {
    const context = run.originHousehold.context,
      resource = { strained: '资源紧张', stable: '收支普通', comfortable: '资源充足' }[
        context.resourceTier
      ],
      presence =
        context.parentPresence >= 65
          ? '照顾者较在场'
          : context.parentPresence >= 42
            ? '陪伴不稳定'
            : '长期缺席',
      safety =
        context.emotionalSafety >= 65
          ? '关系安全'
          : context.emotionalSafety >= 42
            ? '表达有限'
            : '控制或冲突明显';
    return `${resource} · ${presence} · ${safety}`;
  }
  function developmentLabel(run) {
    const development = run.development,
      habit =
        development.learningHabit >= 70
          ? '习惯稳定'
          : development.learningHabit >= 45
            ? '习惯形成中'
            : '学习节奏松散',
      support =
        Math.max(development.teacherSupport, development.peerSupport) >= 65
          ? '校内支持明确'
          : Math.max(development.teacherSupport, development.peerSupport) >= 42
            ? '校内支持一般'
            : '校内支持不足';
    return `${habit} · ${support} · 准备度${Math.round(run.education.readiness)}`;
  }
  function applicationLabel(run) {
    return (
      {
        none: '本科未申请',
        planning: '本科准备中',
        submitted: '本科已提交',
        offered: '本科已录取',
        notAdmitted: '本科未录取',
        funded: '本科待报到',
        deferred: '本科已延期',
        retrying: '本科准备再申请',
        withdrawn: '本科已退出',
        vocationalExit: '本科改走职教',
        enrolled: '本科已入学',
      }[run.education.applicationStatus] || '本科未记录'
    );
  }
  function graduateApplicationLabel(run) {
    return (
      {
        none: '研究生未申请',
        planning: '研究生准备中',
        submitted: '研究生已提交',
        offered: '研究生已录取',
        waitlisted: '研究生候补中',
        notAdmitted: '研究生未录取',
        deferred: '研究生已延期',
        retrying: '研究生准备再申请',
        withdrawn: '研究生已退出',
        enrolled: '研究生已入学',
      }[run.education.graduateApplicationStatus] || '研究生未记录'
    );
  }
  function higherEducationLabel(run) {
    const evidence = [
        ['课程', Math.max(0, Number(run.education.courseworkEvidence) || 0)],
        ['校园', Math.max(0, Number(run.education.campusEvidence) || 0)],
        ['实践', Math.max(0, Number(run.education.practiceEvidence) || 0)],
        ['研究', Math.max(0, Number(run.education.researchEvidence) || 0)],
      ],
      maximum = Math.max(...evidence.map(([, value]) => value)),
      leaders = maximum > 0 ? evidence.filter(([, value]) => value === maximum) : [],
      focus =
        leaders.length === 0
          ? '尚无明显侧重'
          : leaders.length === 1
            ? `侧重${leaders[0][0]}`
            : leaders.length === 2
              ? `${leaders[0][0]}与${leaders[1][0]}并重`
              : '方向较均衡';
    return `${focus} · ${applicationLabel(run)} · ${graduateApplicationLabel(run)}`;
  }
  function overseasLifeLabel(run) {
    if (run.mobility.lastOverseasSystem === 'none') return '尚无海外在读生活';
    const system = { us: '美国', europe: '欧洲' }[run.mobility.lastOverseasSystem] || '海外',
      support = `华人联系${Math.round(run.mobility.chineseCommunityTies)}／本地联系${Math.round(run.mobility.localTies)}`,
      authorization =
        { unknown: '工作资格待核', verified: '工作资格已核', restricted: '工作资格受限' }[
          run.mobility.workAuthorization
        ] || '工作资格待核';
    return `${system} · 生活适应${Math.round(run.mobility.dailyAdaptation)} · ${support} · 归属${Math.round(run.mobility.belonging)} · ${authorization}`;
  }
  function activityLabel(run) {
    return (
      {
        childhood: '童年',
        study: '学习',
        work: '工作',
        seeking: '求职',
        care: '照护',
        sabbatical: '计划休息',
        leisure: '不工作',
        retired: '退休',
        flexible: '灵活安排',
      }[run.activity.mode] || run.activity.mode
    );
  }
  function employmentLabel(run) {
    return (
      {
        none: '未进入劳动市场',
        employed: '受雇工作',
        gig: '灵活就业',
        selfEmployed: '自主经营',
        unemployed: '求职中',
        retired: '已退休',
        careLeave: '停薪留职',
      }[run.employment.status] || run.employment.status
    );
  }
  function employmentDetailLabel(run) {
    if (!['employed', 'gig', 'selfEmployed'].includes(run.employment.status))
      return employmentLabel(run);
    const contract =
        {
          fixedTerm: '固定期限合同',
          openEnded: '无固定期限合同',
          service: '聘用或服务合同',
          dispatch: '劳务派遣',
          platform: '平台接单',
          dayLabor: '日结零工',
          hourly: '小时工',
          project: '项目合同',
          business: '经营收入',
        }[run.employment.contractType] || run.employment.contractType,
      stability =
        {
          fixed: '固定收入',
          fixedPlusBonus: '固定收入加奖金',
          piecework: '计件浮动',
          project: '项目浮动',
          business: '经营浮动',
        }[run.employment.incomeStability] || run.employment.incomeStability,
      overseasReference = ['us', 'europe'].includes(run.employment.applicationRegion),
      monthly = run.employment.salary
        ? `${money(run.employment.salary)}/${run.employment.incomeStability === 'fixed' || run.employment.incomeStability === 'fixedPlusBonus' ? '月' : '月均参考'}`
        : '按经营结果结算',
      annual = run.employment.incomeAnnualGross
        ? `${money(run.employment.incomeAnnualGross)}/年${overseasReference ? '（人民币折合参考）' : ''}`
        : '年收入随经营结算';
    return `${run.employment.career} · ${contract} · ${monthly} · ${annual} · ${stability}`;
  }
  function constitutionLabel(run) {
    return run.attrs.physique >= 8 ? '体质强健' : run.attrs.physique >= 5 ? '体质尚稳' : '体质偏弱';
  }
  function healthStatusLabel(run) {
    return (
      {
        well: '状态良好',
        monitoring: '观察中',
        treating: '治疗中',
        recovering: '恢复中',
        managed: '长期管理',
        limited: '功能受限',
      }[run.health.status] || '状态未知'
    );
  }
  function housingLabel(run) {
    return (
      {
        family: '与原生家庭同住',
        renting: '租住',
        owned: '自有住房',
        mortgaged: '按揭住房',
        supported: '由家人或伴侣提供',
        unstable: '临时住所',
      }[run.housing.status] || run.housing.status
    );
  }
  function laterStatusLabel(run) {
    const labels = {
        retirement: {
          reviewing: '资格核对中',
          phased: '分阶段退出',
          delayed: '明确延后',
          retired: '已退休',
          semiRetired: '半退休',
          working: '继续工作',
          forced: '被动退休',
        },
        inheritance: {
          inventory: '清点中',
          delegated: '委托核验',
          renouncing: '准备放弃',
          accepted: '接受继承',
          limited: '限于遗产承担',
          renounced: '已放弃',
          disputed: '争议中',
        },
        care: {
          assessed: '需求已评估',
          adapted: '居家已适配',
          refused: '暂拒评估',
          homeCombined: '居家与服务组合',
          institutional: '机构照护',
          familyOnly: '家庭承担',
          stable: '安排稳定',
          changed: '已经调整',
          minimum: '最低支持',
          familyBreak: '关系破裂',
        },
        will: {
          inventory: '清点中',
          partial: '部分文件',
          debtFirst: '先处理债务',
          documented: '已书面确认',
          deferred: '暂缓',
          invalidated: '失效重做',
        },
      },
      names = { retirement: '退休', inheritance: '继承', care: '照护', will: '遗嘱' },
      items = Object.entries(run.later || {})
        .filter(([, value]) => value && value !== 'none')
        .map(([key, value]) => `${names[key]}·${labels[key]?.[value] || value}`);
    return items.join('；') || '尚未进入晚年安排';
  }
  function habitLabel(run) {
    const type = {
      gambling: '赌博',
      alcohol: '酒精',
      gaming: '游戏',
      shopping: '消费',
      medication: '药物',
    }[run.habits.type];
    if (!type || run.habits.stage === 'none') return '暂无持续问题';
    if (run.habits.stage === 'recovery')
      return `${type}·${run.habits.recoveryYears ? `恢复${run.habits.recoveryYears}年` : '恢复中'}`;
    const stage =
      {
        gambling: {
          exposed: '已接触',
          repeating: '反复下注',
          dependent: '追损依赖',
          uncontrolled: '追损失控',
          treatment: '治疗中',
          relapse: '复发',
        },
        alcohol: {
          exposed: '开始记录',
          repeating: '反复饮酒',
          dependent: '酒精依赖',
          uncontrolled: '饮酒失控',
          treatment: '治疗中',
          relapse: '复饮',
        },
        gaming: {
          exposed: '开始记录',
          repeating: '反复超时',
          dependent: '游戏依赖',
          uncontrolled: '游戏失控',
          treatment: '治疗中',
          relapse: '复发',
        },
        shopping: {
          exposed: '开始记录',
          repeating: '反复下单',
          dependent: '消费难停',
          uncontrolled: '消费失控',
          treatment: '干预中',
          relapse: '复发',
        },
        medication: {
          exposed: '评估中',
          repeating: '偏离医嘱',
          dependent: '药物依赖',
          uncontrolled: '用药失控',
          treatment: '减量治疗中',
          relapse: '复发',
        },
      }[run.habits.type]?.[run.habits.stage] || run.habits.stage;
    return `${type}·${stage}`;
  }
  function roleLine(run) {
    const job = ['employed', 'gig', 'selfEmployed'].includes(run.employment.status)
      ? run.employment.career
      : activityLabel(run),
      partner = {
        none: '单身',
        dating: '恋爱中',
        partnered: '稳定伴侣',
        married: '已婚',
        separated: '分居',
        divorced: '离异',
        widowed: '丧偶',
      }[run.relationships.partnerStatus];
    return `${job} · ${partner} · ${run.relationships.childCount ? `${run.relationships.childCount}名子女` : '无子女'}`;
  }

  function homeView() {
    const active = state.run && state.run.phase !== 'ended';
    return `<main class="screen center"><span class="version">v${VERSION}</span><div><h1>人生尚未加载</h1><p class="hero-sub">${esc(UI_COPY.homeTagline)}</p></div>${state.meta.migrationNotice ? '<section class="card migration-note"><strong>游戏内容已经更新</strong><p class="tiny">旧版本的活动人生已结束；人生档案、图鉴、设置和跨局记录仍被保留。</p></section>' : ''}${state.recovery ? `<section class="card migration-note"><strong>存档已重置</strong><p class="tiny">${esc(state.recovery.message)}</p></section>` : ''}<div class="mt stack">${active ? `<button class="btn primary" data-act="continue">继续这一生</button><button class="btn restart-life" data-act="restart-life"><span>${esc(UI_COPY.restartActive)}</span><small>${esc(UI_COPY.restartActiveHint)}</small></button>` : '<button class="btn primary" data-act="new">开始新人生</button>'}<div class="menu-list"><button class="menu-item" data-nav="archive"><strong>人生档案</strong><span>›</span></button><button class="menu-item" data-nav="codex"><strong>${esc(UI_COPY.codexTitle)}</strong><span>›</span></button><button class="menu-item" data-nav="settings"><strong>设置</strong><span>›</span></button></div></div><p class="tiny">离线运行 · 自动存档</p></main>`;
  }
  function birthView() {
    const run = state.run,
      origin = run.originHousehold,
      parents = origin.people.filter((item) => ['father', 'mother'].includes(item.relation)),
      siblings = origin.people.filter((item) => item.relation === 'sibling' && item.bornAt <= 0);
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">${esc(UI_COPY.birthTitle)}</div><span></span></div><section class="card hero"><div class="muted">${run.gender === 'female' ? '女性' : '男性'} · ${run.location.name}</div><div class="birth-place">${esc(origin.familyName)}</div><p>${esc(UI_COPY.birthHouseholdNote)}</p><p class="tiny origin-hint">起点优势：${esc(DATA.familyArchetypes.find((item) => item.id === origin.familyId)?.advantages.join(' · '))} · 潜在压力：${esc(DATA.familyArchetypes.find((item) => item.id === origin.familyId)?.risks.join(' · '))}</p></section><dl class="spec-list"><div class="spec"><dt>家庭环境</dt><dd>${esc(familyContextLabel(run))}</dd></div><div class="spec"><dt>父母</dt><dd>${parents.map((item) => `${item.relation === 'father' ? '父亲' : '母亲'}：${item.occupation} · ${item.timeAvailability >= 60 ? '时间较稳定' : '常常抽不开身'}`).join('；') || '由其他照护者抚养'}</dd></div><div class="spec"><dt>兄弟姐妹</dt><dd>${siblings.length ? `${siblings.length}人` : '目前没有'}</dd></div><div class="spec"><dt>家庭住房</dt><dd>${esc(origin.housing)} · ${origin.context.housingStability >= 60 ? '居住较稳定' : '住处可能变化'}</dd></div><div class="spec"><dt>家庭账面</dt><dd>资产约 ${money(origin.assets)} · 债务约 ${money(origin.debt)}</dd></div><div class="spec"><dt>教育起点</dt><dd>${origin.context.educationCapital >= 65 ? '较早接触升学信息' : origin.context.educationCapital >= 42 ? '信息主要来自学校' : '需要额外寻找路线信息'} · ${origin.context.educationBudget >= 68 ? '可承担较多准备成本' : '费用会限制部分选择'}</dd></div></dl><div class="bottom-actions"><button class="btn primary" data-act="birth-next">${esc(UI_COPY.birthNext)}</button></div></main>`;
  }
  const attrMeta = {
    intellect: ['理解', '学习、证据与复杂判断'],
    physique: ['体魄', '恢复、疾病与劳动承受'],
    looks: ['外貌', '初见与被看见的机会'],
    stability: ['稳定', '现金流、节奏与压力控制'],
    social: ['社交', '关系、协商与支持网络'],
    ambition: ['野心', '职业、财富与风险承受'],
  };
  function attributesView() {
    const run = state.run;
    return `<main class="screen attributes-screen"><div class="topbar"><button class="iconbtn" data-act="attributes-back">‹</button><div class="title">${esc(UI_COPY.attributesTitle)}</div><span></span></div><div class="remain"><div class="row"><span class="muted">剩余点数</span><b class="big-number">${run.points}</b></div><p class="tiny">${esc(UI_COPY.attributesLead)}</p></div><section class="card">${Object.entries(
      attrMeta
    )
      .map(
        ([key, [name, desc]]) =>
          `<div class="attr-row"><div><div class="attr-name">${name}</div><div class="attr-desc">${desc}</div></div><div class="stepper"><button data-attr="${key}" data-delta="-1">−</button><b>${run.attrs[key]}</b><button data-attr="${key}" data-delta="1">＋</button></div></div>`
      )
      .join(
        ''
      )}</section><div class="bottom-actions attributes-actions"><button class="btn ghost" data-act="random-attributes">随机分配</button><button class="btn primary" data-act="attributes-done" ${run.points ? 'disabled' : ''}>${esc(UI_COPY.attributesConfirm)}</button></div></main>`;
  }
  function streamRows(run) {
    if (!run.timeline.length) return `<div class="stream-empty">${esc(UI_COPY.streamEmpty)}</div>`;
    return run.timeline
      .slice(-12)
      .map(
        (item) =>
          `<div class="stream-row ${item.variant === 'chosen' ? 'chosen' : ''}"><span class="stream-age">${item.age}岁</span><span class="stream-icon">${item.icon || '·'}</span><div><p>${esc(item.text)}</p><div class="stream-hints"><span>${esc(TRACK_LABELS[item.track] || '生活')}</span>${item.kind === 'consequence' ? `<span>${esc(UI_COPY.consequenceLabel)}</span>` : ''}</div></div></div>`
      )
      .join('');
  }
  function heldCards(run) {
    return (run.cards || []).map((id) => INDEX.cards.get(id)).filter(Boolean);
  }
  function choiceSheet(event) {
    const actors = resolveActors(event) || {},
      choices = event.choices
        .map((choice, index) => ({ choice, index }))
        .filter(({ choice }) => choiceVisible(choice)),
      cards = heldCards(state.run);
    return `<div class="modal-wrap locked-modal"><section class="choice-sheet"><div class="handle"></div><div class="decision-emoji">${event.icon || '◎'}</div><h2>${esc(event.prompt)}</h2>${cards.length ? `<div class="card-hand"><span>${esc(UI_COPY.heldCardsLabel)}</span><div>${cards.map((card) => `<i>${esc(card.displayName)}</i>`).join('')}</div></div>` : ''}${
      Object.keys(actors).length
        ? `<p>${esc(UI_COPY.involvedLabel)}：${Object.values(actors)
            .map((item) =>
              item.relation === 'partner'
                ? '伴侣'
                : item.relation.includes('child')
                  ? '子女'
                  : '家人'
            )
            .join('、')}</p>`
        : ''
    }<div class="choices">${choices
      .map(({ choice, index }) => {
        const resolved = resolveCardChoice(choice),
          effective = resolved.choice,
          enabled = choiceEnabled(choice);
        return `<button class="choice ${enabled ? '' : 'locked'} ${resolved.card ? 'card-active' : ''}" data-choice="${index}" ${enabled ? '' : 'disabled'}>${esc(effective.text)}${resolved.card ? `<small class="card-effect"><b>◇ “${esc(resolved.card.displayName)}”</b><span> · ${esc(resolved.spec.explanation)}</span></small>` : enabled && effective.hints?.length ? `<small>${esc(effective.hints.join(' · '))}</small>` : !enabled ? `<small>暂不可选：${esc(effective.reason || '当前条件不足')}</small>` : ''}</button>`;
      })
      .join('')}</div></section></div>`;
  }
  function episodeSheet(run) {
    const scene = run.sceneQueue[0];
    if (!scene) return '';
    if (scene.kind === 'choice') return choiceSheet(run.currentDecision);
    const result = scene.kind === 'result';
    return `<div class="modal-wrap locked-modal"><section class="choice-sheet episode-sheet"><div class="handle"></div><div class="eyebrow">${result ? '阶段结果' : '当前情况'} · ${run.age}岁</div><div class="decision-emoji">${result ? '✓' : '◇'}</div><h2>${result ? '这一步已经落定' : '先看清发生了什么'}</h2><p class="episode-copy">${esc(scene.text)}</p><button class="btn primary mt" data-act="episode-next">${result ? '记到账上' : '做出选择'}</button></section></div>`;
  }
  function cardSheet(run) {
    const prompt = UI_COPY.cardPrompts?.[run.cardAge] || '这些年，你留下了什么？';
    return `<div class="modal-wrap locked-modal"><section class="choice-sheet card-sheet card-draw-pulse"><div class="handle"></div><h2>${esc(prompt)}</h2><div class="choices">${run.cardOptions.map((card) => `<button class="choice clear-card" data-card="${card.id}"><span class="omen-icon">◇</span><span><span class="fate-title">${esc(card.displayName)}</span><span class="fate-text">${esc(card.text)}</span></span><span>›</span></button>`).join('')}</div></section></div>`;
  }
  function statusDrawer(run) {
    const partner = {
        none: '单身',
        dating: '恋爱中',
        partnered: '稳定伴侣',
        married: '已婚',
        separated: '分居',
        divorced: '离异',
        widowed: '丧偶',
      }[run.relationships.partnerStatus],
      liabilities = run.finance.liabilities.filter((item) => item.status !== 'settled'),
      episodes = activeEpisodes(run);
    return `<div class="drawer-wrap" data-act="close-drawer"><section class="drawer" data-stop><div class="handle"></div><div class="row"><div><div class="eyebrow">${run.age}岁 · ${run.world.year}年</div><div class="sheet-title">${esc(run.originHousehold.familyName)}</div></div><button class="iconbtn" data-act="close-drawer">×</button></div><div class="section-title">成长与教育</div><dl class="spec-list"><div class="spec"><dt>家庭起点</dt><dd>${esc(familyContextLabel(run))}</dd></div><div class="spec"><dt>成长证据</dt><dd>${esc(developmentLabel(run))}</dd></div><div class="spec"><dt>学历</dt><dd>${educationLabel(run)}</dd></div><div class="spec"><dt>高等教育</dt><dd>${esc(higherEducationLabel(run))}</dd></div>${run.mobility.lastOverseasSystem !== 'none' ? `<div class="spec"><dt>海外生活</dt><dd>${esc(overseasLifeLabel(run))}</dd></div>` : ''}</dl><div class="section-title">现在的生活</div><dl class="spec-list"><div class="spec"><dt>${esc(UI_COPY.activityField)}</dt><dd>${activityLabel(run)}</dd></div><div class="spec"><dt>工作</dt><dd>${esc(employmentDetailLabel(run))}</dd></div><div class="spec"><dt>婚恋</dt><dd>${partner} · 关系 ${Math.round(run.relationships.partnerBond)}</dd></div><div class="spec"><dt>子女</dt><dd>${
      run.relationships.childCount
        ? childPeople(run)
            .map((child) => `${personAge(child, run)}岁`)
            .join('、')
        : '无'
    }</dd></div><div class="spec"><dt>住房</dt><dd>${housingLabel(run)}</dd></div><div class="spec"><dt>${esc(UI_COPY.netWorthField)}</dt><dd>${money(run.finance.netWorth)}</dd></div><div class="spec"><dt>债务</dt><dd>${liabilities.length ? `${liabilities.length}笔 · ${money(run.finance.totalDebt)}` : '无'}</dd></div><div class="spec"><dt>健康</dt><dd>${constitutionLabel(run)} · ${healthStatusLabel(run)} · ${Math.round(run.health.physical)}／${Math.round(run.health.mental)}</dd></div><div class="spec"><dt>${esc(UI_COPY.habitField)}</dt><dd>${habitLabel(run)}</dd></div><div class="spec"><dt>晚年安排</dt><dd>${esc(laterStatusLabel(run))}</dd></div><div class="spec"><dt>压力</dt><dd>${pressureLevel(run)}</dd></div></dl><div class="section-title">最在意的事</div><div class="desire-list">${topDesires(
      run
    )
      .map(
        (item) =>
          `<span>${esc(item.name)} ${item.claimed ? '· 已认领' : ''} · ${Math.round(item.fulfillment)}</span>`
      )
      .join(
        ''
      )}</div><div class="section-title">${esc(UI_COPY.activeArcsTitle)}</div><div class="taglist left">${episodes.map((item) => `<span class="pill">${esc(episodeLabel(item.id))} · 第${item.phase}阶段</span>`).join('') || `<span class="tiny">${esc(UI_COPY.noActiveArcs)}</span>`}</div></section></div>`;
  }
  function gameView() {
    const run = state.run;
    return `<main class="screen stream-screen"><header class="game-header"><div class="row"><div><div class="age">${run.age}岁</div><div class="role">${esc(roleLine(run))}</div></div><button class="iconbtn" data-act="open-drawer">☰</button></div><div class="resource-strip"><div class="res"><span>现金</span><b>${money(run.finance.cash)}</b></div><div class="res"><span>净值</span><b>${money(run.finance.netWorth)}</b></div><div class="res"><span>身体</span><b>${Math.round(run.health.physical)}</b></div><div class="res"><span>精神</span><b>${Math.round(run.health.mental)}</b></div></div></header><div class="conflict-line">${esc(UI_COPY.coreConflictLabel)} · ${esc(DATA.conflicts.find((item) => item.id === run.mainConflict)?.name || '还不清楚')}</div><div class="life-stream" tabindex="0" data-act="advance">${streamRows(run)}<div class="stream-cursor"><i></i>${esc(UI_COPY.advancePrompt)}</div></div>${DEBUG ? `<div class="debug-panel">debug · seed ${esc(run.seed)} · choices ${run.decisionCount}/${run.targetDecisions}</div>` : ''}</main>${run.phase === 'decision' ? choiceSheet(run.currentDecision) : ''}${run.phase === 'episode' ? episodeSheet(run) : ''}${run.phase === 'card' ? cardSheet(run) : ''}${state.drawer ? statusDrawer(run) : ''}`;
  }

  function endingView() {
    const run = state.run,
      e = run.ending;
    return `<main class="screen ending-screen"><div class="ending-share-card"><div class="eyebrow ending-kicker">人生尚未加载 · 2026</div><div class="lifespan">活到 <b>${e.age}</b> 岁</div><div class="ending-title">《${esc(e.title)}》</div><p class="ending-review sharp-summary">${esc(e.summary)}</p><div class="ending-rarity"><span class="pill rare">人生稀有度 · ${esc(e.rarity)}</span><span class="pill">种子 ${esc(e.seed)}</span></div><div class="section-title">${esc(UI_COPY.endingTurnsTitle)}</div><section class="card timeline">${e.facts.map((item) => `<div class="time-item"><span class="time-age">${item.age}岁</span><div><strong>${esc(item.title)}</strong><p class="tiny">${esc(item.result)}</p></div></div>`).join('')}</section><div class="taglist">${e.tags.map((tag) => `<span class="pill">${esc(tag)}</span>`).join('') || '<span class="pill">未归类人生</span>'}</div></div><div class="section-title">${esc(UI_COPY.endingLedgerTitle)}</div><section class="card ending-portrait">${Object.entries(
      e.axes
    )
      .map(
        ([name, value]) =>
          `<div class="portrait-row"><div class="row"><span>${esc(UI_COPY.axisLabels[name] || name)}</span><b>${Math.round(value)}</b></div><div class="meter"><i style="width:${clamp(value, 0, 100)}%"></i></div></div>`
      )
      .join(
        ''
      )}</section><section class="card soft mt"><div class="spec"><dt>最终净值</dt><dd>${money(e.netWorth)}</dd></div><div class="spec"><dt>死亡原因</dt><dd>${esc(e.deathCause)}</dd></div><div class="spec"><dt>亲手选择</dt><dd>${run.decisionCount} 次</dd></div></section><div class="stack mt"><button class="btn primary" data-act="new">${esc(UI_COPY.restart)}</button><button class="btn ghost" data-nav="archive">查看人生档案</button></div></main>`;
  }
  function archiveView() {
    const all = [...state.meta.histories, ...state.meta.legacyHistories];
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">人生档案</div><span></span></div><section class="card">${all.length ? all.map((item) => `<div class="archive-item"><div class="archive-title">《${esc(item.title || '旧人生')}》</div><div class="archive-meta">${item.age ?? '?'}岁 · ${esc(item.rarity || '旧版本')} · ${esc(item.familyName || '历史档案')}${item.seed ? ` · ${esc(item.seed)}` : ''}</div></div>`).join('') : '<p>还没有走完过一整局。</p>'}</section></main>`;
  }
  function codexView() {
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">${esc(UI_COPY.codexTitle)} ${state.meta.codex.length}/${DATA.codex.length}</div><span></span></div><section class="card">${DATA.codex
      .map((item) => {
        const unlocked = state.meta.codex.includes(item.id);
        return `<div class="codex-item ${unlocked ? '' : 'locked'}"><span class="codex-category">${esc(item.category)}</span><h3>${unlocked ? esc(item.name) : esc(UI_COPY.codexLocked)}</h3><p>${unlocked ? esc(UI_COPY.codexUnlocked) : esc(item.lockedHint)}</p></div>`;
      })
      .join('')}</section></main>`;
  }
  function settingsView() {
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">设置</div><span></span></div><section class="card"><button class="menu-item" data-act="toggle-haptic"><strong>轻触反馈</strong><span class="switch ${state.meta.settings.haptic ? 'on' : ''}"><i></i></span></button><button class="menu-item" data-act="export"><strong>导出存档</strong><span>›</span></button><button class="menu-item" data-act="clear-data"><strong class="danger-text">清除全部数据</strong><span>›</span></button></section><p class="tiny mt">版本更新只保留人生档案、图鉴、设置和跨局记录，不延续旧版本的活动人生。</p></main>`;
  }

  function render() {
    if (!state) return;
    const views = {
      home: homeView,
      birth: birthView,
      attributes: attributesView,
      game: gameView,
      ending: endingView,
      archive: archiveView,
      codex: codexView,
      settings: settingsView,
    };
    if (state.view === 'game' && state.run) state.view = viewForRunPhase(state.run);
    const showGlobalHome = state.view !== 'home';
    app.classList.toggle('has-global-home', showGlobalHome);
    app.innerHTML = `${showGlobalHome ? `<button class="global-home" data-act="return-home" aria-label="${esc(UI_COPY.mainMenu)}">‹ ${esc(UI_COPY.mainMenu)}</button>` : ''}${(views[state.view] || homeView)()}`;
    requestAnimationFrame(() => {
      const stream = app.querySelector('.life-stream');
      if (stream) stream.scrollTop = stream.scrollHeight;
    });
  }
  function showToast(message) {
    document.querySelector('.toast')?.remove();
    const element = document.createElement('div');
    element.className = 'toast';
    element.textContent = message;
    document.body.append(element);
    setTimeout(() => element.remove(), 1800);
  }
  function haptic(duration = 12) {
    if (state.meta.settings.haptic && navigator.vibrate) navigator.vibrate(duration);
  }
  function exportSave() {
    const blob = new Blob(
        [
          JSON.stringify(
            {
              schemaVersion: SCHEMA_VERSION,
              gameVersion: VERSION,
              meta: state.meta,
              run: state.run,
            },
            null,
            2
          ),
        ],
        { type: 'application/json' }
      ),
      url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = '人生尚未加载-v0.6.5-存档.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  function clearAllData() {
    if (
      !window.confirm(
        '确定清除全部数据？人生档案、图鉴、设置、当前人生和旧版本遗留数据都会删除。清掉就没了。'
      )
    )
      return;
    for (const key of gameStorageKeys()) localStorage.removeItem(key);
    state = null;
    location.reload();
  }
  function newLife() {
    state.run = createRun();
    state.view = 'birth';
    state.drawer = false;
    save(true);
    render();
  }
  function returnHome() {
    state.view = 'home';
    state.drawer = false;
    save();
    render();
  }
  function restartLife() {
    if (!state.run || state.run.phase === 'ended' || !window.confirm(UI_COPY.restartActiveConfirm))
      return;
    newLife();
  }
  function syncInitialCapabilities(run) {
    run.capabilities.portableSkill = Math.max(
      run.originHousehold.digitalLiteracy >= 60 ? 1 : 0,
      Math.floor((run.attrs.intellect - 1) / 3)
    );
    run.capabilities.employability = clamp(
      40 + run.attrs.stability * 3 + run.attrs.social * 2,
      0,
      100
    );
    syncDerived(run);
  }
  function changeAttribute(key, delta) {
    const run = state.run,
      current = run.attrs[key];
    if (delta > 0 && run.points > 0 && current < 10) {
      run.attrs[key]++;
      run.points--;
    }
    if (delta < 0 && current > 1) {
      run.attrs[key]--;
      run.points++;
    }
    syncInitialCapabilities(run);
    render();
  }
  function randomizeAttributes() {
    const run = state.run,
      keys = Object.keys(run.attrs);
    for (const key of keys) run.attrs[key] = 1;
    run.points = 20;
    while (run.points) {
      const available = keys.filter((key) => run.attrs[key] < 10),
        key = available[Math.floor(rng() * available.length)];
      run.attrs[key]++;
      run.points--;
    }
    syncInitialCapabilities(run);
    haptic(8);
    save();
    render();
  }
  function handleAction(name) {
    if (name === 'new') newLife();
    else if (name === 'continue') {
      state.view = viewForRunPhase(state.run);
      render();
    } else if (name === 'return-home') returnHome();
    else if (name === 'restart-life') restartLife();
    else if (name === 'birth-next') {
      state.run.phase = 'attributes';
      state.view = 'attributes';
      save();
      render();
    } else if (name === 'attributes-back') {
      state.run.phase = 'birth';
      state.view = 'birth';
      save();
      render();
    } else if (name === 'random-attributes') randomizeAttributes();
    else if (name === 'attributes-done' && !state.run.points) {
      state.view = 'game';
      startCardDraw(0);
    } else if (name === 'advance') advanceOneBeat();
    else if (name === 'episode-next') advanceEpisodeScene();
    else if (name === 'open-drawer') {
      state.drawer = true;
      render();
    } else if (name === 'close-drawer') {
      state.drawer = false;
      render();
    } else if (name === 'toggle-haptic') {
      state.meta.settings.haptic = !state.meta.settings.haptic;
      save();
      render();
    } else if (name === 'export') exportSave();
    else if (name === 'clear-data') clearAllData();
  }
  app.addEventListener('click', (event) => {
    if (
      event.target.closest('[data-stop]') &&
      event.target.closest('[data-act="close-drawer"]') === null
    )
      event.stopPropagation();
    const choice = event.target.closest('[data-choice]');
    if (choice) {
      chooseDecision(Number(choice.dataset.choice));
      return;
    }
    const card = event.target.closest('[data-card]');
    if (card) {
      chooseCard(card.dataset.card);
      return;
    }
    const attr = event.target.closest('[data-attr]');
    if (attr) {
      changeAttribute(attr.dataset.attr, Number(attr.dataset.delta));
      return;
    }
    const action = event.target.closest('[data-act]');
    if (action) {
      handleAction(action.dataset.act);
      return;
    }
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      state.view = nav.dataset.nav;
      state.drawer = false;
      render();
    }
  });
  app.addEventListener('keydown', (event) => {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      event.target.matches('[data-act="advance"]')
    ) {
      event.preventDefault();
      advanceOneBeat();
    }
  });

  function patchRun(patch) {
    if (!state.run) return null;
    for (const [key, value] of Object.entries(patch || {})) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        state.run[key] &&
        typeof state.run[key] === 'object'
      )
        state.run[key] = { ...state.run[key], ...copy(value) };
      else state.run[key] = copy(value);
    }
    state.run = normalizeRun(state.run);
    save(true);
    render();
    return copy(state.run);
  }
  function forceDecision(id) {
    const event = INDEX.event.get(id);
    if (!state.run || event?.kind !== 'decision') return null;
    const run = state.run;
    run.age = Math.max(event.ageMin, Math.min(event.ageMax, run.age));
    if (event.track === 'remote')
      run.capabilities.portableSkill = Math.max(1, run.capabilities.portableSkill);
    if (event.episode?.id === 'platform_dependence' || event.episode?.id === 'overseas_visa')
      run.employment.arrangement = 'remote';
    if (event.episode?.id === 'establish_base') run.mobility.mode = 'domesticNomad';
    if (event.track === 'business') run.finance.cash = Math.max(20000, run.finance.cash);
    if (event.track === 'public') run.education.level = Math.max(3, run.education.level);
    for (const actor of event.actors || []) {
      let actorId = actor.personIdPath ? getPath(run, actor.personIdPath) : null,
        found = run.people.find((item) => item.id === actorId && actorMatches(item, actor, run));
      if (found) continue;
      const relation = actor.relation || actor.relationAny?.[0] || 'child',
        age = Number.isFinite(actor.ageMin) ? actor.ageMin : 30;
      found = person(
        actorId || `debug_${actor.slot}_${run.people.length + 1}`,
        relation,
        run.age - age,
        {
          bond: 60,
          alive: actor.alive ?? true,
          status: actor.alive === false ? 'deceased' : 'living',
        }
      );
      run.people.push(found);
      if (actor.personIdPath === 'relationships.activePartnerId') {
        run.relationships.activePartnerId = found.id;
        run.relationships.partnerStatus =
          run.relationships.partnerStatus === 'none'
            ? 'partnered'
            : run.relationships.partnerStatus;
      }
      if (actor.personIdPath === 'relationships.lastPartnerId') {
        run.relationships.lastPartnerId = found.id;
        run.relationships.partnerStatus = 'divorced';
      }
    }
    syncDerived(run);
    run.yearStarted = true;
    state.view = 'game';
    if (event.episode) {
      if (event.episode.role !== 'start' && !run.episodes[event.episode.id])
        run.episodes[event.episode.id] = {
          status: 'active',
          phase: event.episode.phase,
          startedAt: Math.max(0, run.age - event.episode.phase + 1),
          nextPhaseAge: run.age,
          deadlineAge: run.age + Math.max(1, event.episode.deadlineYears - event.episode.phase + 1),
          route: null,
          boundActors: episodeBindings(event, run),
          commitments: [],
          closureReason: null,
        };
      if (event.episode.id === 'shop_opening')
        run.business.status = event.episode.phase > 1 ? 'operating' : 'none';
      startEpisodePhase(event);
    } else {
      run.currentDecision = event;
      run.phase = 'decision';
      render();
    }
    return event.id;
  }
  function renderGameToText() {
    const run = state.run;
    return JSON.stringify({
      view: state.view,
      version: VERSION,
      run: run
        ? {
            phase: run.phase,
            age: run.age,
            year: run.world.year,
            seed: run.seed,
            originContext: run.originHousehold.context,
            development: run.development,
            education: run.education,
            activity: run.activity,
            employment: run.employment,
            finance: {
              cash: run.finance.cash,
              totalDebt: run.finance.totalDebt,
              netWorth: run.finance.netWorth,
              liabilities: run.finance.liabilities,
            },
            relationships: {
              partnerStatus: run.relationships.partnerStatus,
              activePartnerId: run.relationships.activePartnerId,
              lastPartnerId: run.relationships.lastPartnerId,
              children: childPeople(run).map((child) => personAge(child, run)),
              livingPeople: run.people
                .filter((item) => item.alive)
                .map((item) => ({
                  id: item.id,
                  relation: item.relation,
                  age: personAge(item, run),
                })),
            },
            health: run.health,
            habits: run.habits,
            mobility: run.mobility,
            business: run.business,
            later: run.later,
            episodes: run.episodes,
            sceneQueue: run.sceneQueue,
            scheduledConsequences: run.scheduledConsequences.filter(
              (item) => item.status === 'scheduled'
            ),
            decisionCount: run.decisionCount,
            decision: run.currentDecision
              ? {
                  id: run.currentDecision.id,
                  prompt: run.currentDecision.prompt,
                  choices: run.currentDecision.choices
                    .map((choice, index) => ({
                      index,
                      text: choice.text,
                      memoryKey: choice.memoryKey,
                      visible: choiceVisible(choice, run),
                      enabled: choiceEnabled(choice, run),
                      reason: choice.reason || null,
                    }))
                    .filter((choice) => choice.visible),
                }
              : null,
            visibleTimeline: run.timeline.slice(-6),
            ending: run.ending,
          }
        : null,
    });
  }
  window.render_game_to_text = renderGameToText;
  window.advanceTime = () => renderGameToText();

  app.innerHTML =
    '<main class="loading-screen"><div><div class="loading-mark">◌</div><h2>正在加载人生账本</h2><p>每一步，都会留下凭据。</p></div></main>';
  fetch(`./data.json?v=${VERSION}`, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`人生数据库加载失败（HTTP ${response.status}）`);
      return response.json();
    })
    .then((data) => {
      DATA = data;
      if (DATA.schemaVersion !== SCHEMA_VERSION)
        throw new Error(`数据版本不兼容：需要 ${SCHEMA_VERSION}，实际 ${DATA.schemaVersion}`);
      INDEX = buildIndex();
      state = loadState();
      render();
      window.__LIFE_BOOTED__ = true;
      if (DEBUG)
        window.__LIFE_DEBUG__ = {
          snapshot: () => copy(state.run),
          advance: () => advanceOneBeat(true),
          forceAge: (age) =>
            patchRun({ age: clamp(age, 0, 105), yearStarted: false, yearQueue: [] }),
          forceDecision,
          nextDecisionId: () => startDecision(state.run)?.id || null,
          forceCardDraw: (age) => {
            startCardDraw(Number(age));
            return copy(state.run.cardOptions);
          },
          patchRun,
          eligibleIds: (kind) =>
            (INDEX.kinds[kind] || []).filter((event) => eligible(event)).map((event) => event.id),
          settleYear: () => {
            settleYear(state.run);
            render();
            return copy(state.run);
          },
          forceEpisodeClosure: (id = 'shop_opening', reason = 'deadline') => {
            const record = state.run.episodes[id];
            return record?.status === 'active' ? queueEpisodeClosure(id, record, reason) : false;
          },
          healthIncident: (value = 20) => {
            healthIncident(state.run, { value, condition: 'debug' });
            syncDerived(state.run);
            render();
            return copy(state.run.health);
          },
          healthRecovery: (value = 10, resolve = true) => {
            healthRecovery(state.run, { value, resolve });
            syncDerived(state.run);
            render();
            return copy(state.run.health);
          },
          endingAxes: () => endingAxes(state.run),
          routeTags: () => routeTags(state.run),
          decisionAllowance: () => decisionAllowance(state.run),
          eventWeight: (eventId, mainConflict = state.run.mainConflict) => {
            const event = INDEX.event.get(eventId);
            if (!event) throw new Error(`未知事件：${eventId}`);
            const previous = state.run.mainConflict;
            state.run.mainConflict = mainConflict;
            try {
              return eventWeight(event);
            } finally {
              state.run.mainConflict = previous;
            }
          },
          contentContract: () => ({
            operators: [...CONTRACT.RUNTIME_OPERATORS],
            commands: [...CONTRACT.COMMAND_TYPES],
            evidence: copy(CONTRACT.TRACK_DESIRE_EVIDENCE),
          }),
          requirementsMatch: (requirements) => requirementsMatch(requirements, state.run),
          finish: () => {
            state.run.deathCause = '调试结束';
            finishLife();
            return copy(state.run.ending);
          },
          counts: () =>
            Object.fromEntries(
              Object.entries(INDEX.kinds).map(([kind, items]) => [kind, items.length])
            ),
        };
    })
    .catch((error) => {
      console.error(error);
      app.innerHTML = `<main class="boot-fallback"><div><div class="boot-label">启动失败</div><h1>人生数据库没有加载成功</h1><p>${esc(error.message || error)}</p></div><div class="boot-card"><p>请确认 index.html、style.css、game.js 与 data.json 位于同一目录。</p><button class="btn primary mt" onclick="location.reload()">重新加载</button></div></main>`;
    });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state?.run) save(true);
  });
  window.addEventListener('pagehide', () => state?.run && save(true));
})();
