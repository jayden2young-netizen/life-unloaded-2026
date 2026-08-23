(async () => {
  'use strict';

  const app = document.getElementById('app');
  let CONTRACT;
  try {
    CONTRACT = await import('./runtime-content-contract.mjs?v=0.7.0');
  } catch (error) {
    throw new Error(`共享内容合同加载失败：${error?.message || error}`);
  }
  const { UI_COPY } = await import('./content/zh-CN/ui.mjs');
  const APP_KEY = 'life-unloaded-2026-v1';
  const VERSION = '0.7.0',
    SCHEMA_VERSION = 14,
    CONTENT_REVISION = 35;
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
  const DECISION_DENSITY = Object.freeze({
    infancy: 0.12,
    childhood: 0.3,
    adolescence: 0.55,
    youth: 0.42,
    establishment: 0.28,
    midlife: 0.22,
    later: 0.16,
    elder: 0.1,
  });
  const QUIET_YEAR_LINES = Object.freeze({
    infancy: ['这一年你长高的刻度，画在了门框上。','家里的相册厚了几页，大多是同一个角度。','你学会的新词里，有一个把大人逗笑了。','旧衣服很快就小了，袖口往下放过一截。','睡整觉这件事，这一年总算谈成了。'],
    childhood: ['这一年的课本用完了，铅笔头攒了一小盒。','暑假过得比想象快，作业赶在最后两天。','你换了一颗牙，班里换了一次座位。','操场那圈跑道，你闭着眼都知道哪里有坑。','书包带断过一次，缝好了接着背。'],
    adolescence: ['这一年考了很多试，名次上上下下。','校服短了一截，家里说再穿一年。','这一年长得快，饭量把家里吓了一跳。','耳机分你一只的人，换过两个。','有些话你写在本子最后一页，没给人看过。'],
    youth: ['这一年搬过一次东西，扔了一半旧物。','存了一点钱，又花在说不上来的地方。','这一年认识了些人，留下联系的没几个。','换季时翻出旧衣服，才发现去年也这么想过。','年底才想起年初立过的计划，笑了一下。'],
    establishment: ['这一年没什么波澜，日历翻得比想象快。','常去的店换了两家，你的作息没换。','这一年添了几样东西，也修了几样旧的。','通讯录长了一截，常联系的还是那几个。','这一年的照片不多，翻起来倒都记得。'],
    midlife: ['这一年常走的那条路修了两次，你每次都绕同一个路口。','手边的东西越来越多，扔的速度赶不上添的。','这一年写过不少名字，越写越熟。','旧衣服又穿了一年，也没人说什么。','镜子里的变化，比日历慢半拍。'],
    later: ['这一年走得慢，该到的地方都到了。','日常要做的事排得清楚，日子也有了格子。','这一年种的葱活了，比去年那盆强。','翻出一件旧东西，想了半天它是哪年买的。','这一年没出什么大岔子，算是好年成。'],
    elder: ['这一年天冷得早，毛衣提前找了出来。','觉少了，早上的时间反而多了。','这一年想起不少旧事，也添了几件新事。','楼下的人换了一茬，见面还是点头。','这一年过得静，钟走的声音都听得见。'],
    default: ['这一年没有大事。日子还是往前走了。'],
  });
  const decisionStageBudgets = (run) => {
    const budgets = {};
    let total = 0;
    for (const [stage, density] of Object.entries(DECISION_DENSITY)) {
      const [lo, hi] = DATA.stages[stage];
      budgets[stage] = Math.max(stage === 'infancy' ? 0 : 1, Math.round(density * (hi - lo + 1)));
      total += budgets[stage];
    }
    const adjustable = ['youth', 'establishment', 'midlife', 'later', 'elder', 'adolescence'],
      order = [...adjustable].sort(
        (a, b) =>
          stable(run.seed, `decision-stage-extra:${a}`, 10000) -
          stable(run.seed, `decision-stage-extra:${b}`, 10000)
      );
    let diff = (run.targetDecisions || 22) - total;
    while (diff) {
      let changed = false;
      for (const stage of order) {
        if (!diff) break;
        const step = Math.sign(diff);
        if (budgets[stage] + step < 1) continue;
        budgets[stage] += step;
        diff -= step;
        changed = true;
      }
      if (!changed) break;
    }
    return budgets;
  };
  const weightedAt = (items, weightFn, rollUnit) => {
    if (!items.length) return null;
    let total = items.reduce((sum, item) => sum + Math.max(0, weightFn(item)), 0),
      roll = rollUnit * total;
    for (const item of items) {
      roll -= Math.max(0, weightFn(item));
      if (roll <= 0) return item;
    }
    return items.at(-1);
  };
  const weighted = (items, weightFn = (item) => item.weight || 1) =>
    weightedAt(items, weightFn, rng());
  const chance = (value) => rng() < value;
  const naturalDeathAgeForRoll = (value) => {
    const roll = clamp(Math.floor(Number(value) || 0), 0, 999);
    return roll < 60
      ? 52 + (roll % 23)
      : roll < 260
        ? 76 + (roll % 8)
        : roll < 820
          ? 84 + (roll % 9)
          : 93 + (roll % 13);
  };
  let DATA,
    INDEX,
    state,
    inputLocked = false,
    focusReturnSelector = null,
    streamGesture = null,
    suppressStreamAdvance = false;
  function rng() {
    let x = state.run?.rngState || hashSeed(makeSeed());
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    if (state.run) state.run.rngState = x >>> 0;
    return (x >>> 0) / 4294967296;
  }
  function peekRng(run) {
    let x = run?.rngState || hashSeed(run?.seed || 'preview');
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  }
  function stable(seed, key, max = 100) {
    return hashSeed(`${seed}:${key}`) % max;
  }

  const HOUSING_ANCHORS = Object.freeze({
    tier1: Object.freeze({ rent: 36000, purchase: 1800000 }),
    tier2: Object.freeze({ rent: 24000, purchase: 900000 }),
    county: Object.freeze({ rent: 12000, purchase: 420000 }),
    town: Object.freeze({ rent: 7200, purchase: 260000 }),
    us: Object.freeze({ rent: 96000, purchase: null }),
    europe: Object.freeze({ rent: 72000, purchase: null }),
  });
  const HOUSING_RELIABILITY = Object.freeze({
    fixed: 0.9,
    fixedPlusBonus: 0.8,
    piecework: 0.65,
    project: 0.6,
    business: 0.5,
    none: 0,
  });
  const housingSnapshot = (housing) => ({
    status: housing.status,
    value: Math.max(0, Number(housing.value) || 0),
    arrangement: housing.arrangement,
    region: housing.region,
    stability: housing.stability,
    accessibility: housing.accessibility,
    costShare: housing.costShare,
    coResidentRefs: [...(housing.coResidentRefs || [])],
  });
  function initialHousing(run) {
    const stability = run.originHousehold.context.housingStability >= 60 ? 'stable' : 'conditional',
      housing = {
        status: 'family',
        value: 0,
        arrangement: 'originFamily',
        region: run.location.id,
        stability,
        accessibility: 'standard',
        costShare: 'supported',
        coResidentRefs: [],
        sinceAge: 0,
        keyChoiceCount: 0,
        history: [],
      };
    housing.history.push({
      age: 0,
      year: 2026,
      kind: 'origin',
      reason: 'birthHousehold',
      sourceEventId: 'birth',
      choiceId: null,
      housingChoiceKind: null,
      debtException: false,
      state: housingSnapshot(housing),
    });
    return housing;
  }

  function defaultMeta() {
    return {
      schemaVersion: SCHEMA_VERSION,
      gameVersion: VERSION,
      histories: [],
      legacyHistories: [],
      codex: [],
      settings: { haptic: true, reducedMotion: false, echoAcrossRuns: false },
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
      growthType: 'none',
      growthCount: 0,
      lastGrowthAge: null,
      referralPersonId: null,
      referralStatus: 'none',
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
      debtStage: 'current',
      enforcementStatus: 'none',
      enforcementDebtId: null,
      dishonestStatus: 'clear',
      restrictedConsumption: false,
      seizedAssets: [],
      housingDisposition: 'none',
      repaymentAgreement: null,
      repaymentAgreementFulfilled: false,
      reliefPending: false,
      mortgagePaymentStress: false,
    };
    run.housing = initialHousing(run);
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
      lastParentLossAge: null,
      lastParentLossPersonId: null,
    };
    run.social = { primaryPersonId: null, secondaryPersonId: null };
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
    run.capabilitiesBirthBase = copy(run.capabilities);
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
      platformYears: 0,
    };
    run.business = {
      mode: 'none',
      status: 'none',
      operatingSkill: clamp(25 + family.riskTolerance / 3, 20, 60),
      equity: 0,
      scale: 'none',
      control: 100,
      activeYears: 0,
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
    run.pendingAttitude = null;
    run.attributesCommitted = false;
    run.yearQueue = [];
    run.yearStarted = false;
    run.decisionCount = 0;
    run.targetDecisions = 22 + stable(seed, 'decision-target', 7);
    run.lastDecisionAge = -5;
    run.stageDecisionCounts = {};
    run.lifecycleStageOverrides = {};
    run.secretRevealed = false;
    run.lastSwanAge = -20;
    run.swanCount = 0;
    run.swanPityAge = 30 + stable(seed, 'swan-pity', 30);
    run.agency = 0;
    run.deathCause = null;
    run.naturalDeathAge = naturalDeathAgeForRoll(stable(seed, 'lifespan', 1000));
    run.ending = null;
    const previousLife = state.meta?.histories?.[0];
    run.previousLifeHint =
      state.meta?.settings?.echoAcrossRuns && previousLife
        ? { familyName: previousLife.familyName || '旧人家' }
        : null;
    run.usedPreviousLifeHint = false;
    syncDerived(run);
    return run;
  }

  function normalizeSocialMetadata(source = {}, fallback = {}) {
    const value = source && typeof source === 'object' ? source : {};
    return {
      displayName: String(value.displayName || fallback.displayName || '旧识').slice(0, 24),
      source: CONTRACT.SOCIAL_SOURCES.includes(value.source)
        ? value.source
        : CONTRACT.SOCIAL_SOURCES.includes(fallback.source) ? fallback.source : 'online',
      metAtAge: clamp(
        Number.isFinite(value.metAtAge) ? value.metAtAge : fallback.metAtAge,
        0,
        105
      ),
      tie: CONTRACT.SOCIAL_TIES.includes(value.tie) ? value.tie : fallback.tie || 'acquaintance',
      proximity: CONTRACT.SOCIAL_PROXIMITIES.includes(value.proximity)
        ? value.proximity
        : fallback.proximity || 'unknown',
      turn: CONTRACT.SOCIAL_TURNS.includes(value.turn) ? value.turn : fallback.turn || 'met',
      support: CONTRACT.SOCIAL_SUPPORT.includes(value.support)
        ? value.support
        : fallback.support || 'unseen',
    };
  }

  function normalizeSocialState(run, source = {}) {
    run.people = (Array.isArray(run.people) ? run.people : []).filter(
      (item) => item && typeof item === 'object' && typeof item.id === 'string'
    );
    for (const item of run.people) {
      if (!item.social || typeof item.social !== 'object') continue;
      item.social = normalizeSocialMetadata(item.social, { metAtAge: Math.max(0, run.age) });
    }
    const socialPeople = run.people.filter((item) => item.social),
      assigned = Object.fromEntries(CONTRACT.SOCIAL_SLOTS.map((slot) => [slot, null])),
      claimed = new Set();
    for (const slot of CONTRACT.SOCIAL_SLOTS) {
      const id = source?.[`${slot}PersonId`];
      if (!id || claimed.has(id) || !socialPeople.some((item) => item.id === id)) continue;
      assigned[slot] = id;
      claimed.add(id);
    }
    for (const item of socialPeople) {
      if (claimed.has(item.id)) continue;
      const preferred = CONTRACT.SOCIAL_SLOTS.find((slot) => item.id === `social_${slot}` && !assigned[slot]),
        slot = preferred || CONTRACT.SOCIAL_SLOTS.find((name) => !assigned[name]);
      if (!slot) break;
      assigned[slot] = item.id;
      claimed.add(item.id);
    }
    const kept = new Set(Object.values(assigned).filter(Boolean));
    run.people = run.people.filter((item) => item.relation !== 'social' || kept.has(item.id));
    for (const item of run.people)
      if (item.social && !kept.has(item.id)) delete item.social;
    return {
      primaryPersonId: assigned.primary,
      secondaryPersonId: assigned.secondary,
    };
  }

  function normalizeHousing(run, source = {}) {
    const fresh = initialHousing(run),
      housing = { ...fresh, ...(source || {}) };
    housing.status = CONTRACT.HOUSING_STATUS.includes(housing.status) ? housing.status : fresh.status;
    housing.arrangement = CONTRACT.HOUSING_ARRANGEMENTS.includes(housing.arrangement)
      ? housing.arrangement
      : fresh.arrangement;
    housing.region = CONTRACT.HOUSING_REGIONS.includes(housing.region)
      ? housing.region
      : run.location.id;
    housing.stability = CONTRACT.HOUSING_STABILITY.includes(housing.stability)
      ? housing.stability
      : fresh.stability;
    housing.accessibility = CONTRACT.HOUSING_ACCESSIBILITY.includes(housing.accessibility)
      ? housing.accessibility
      : 'standard';
    housing.costShare = CONTRACT.HOUSING_COST_SHARES.includes(housing.costShare)
      ? housing.costShare
      : 'self';
    housing.value = ['owned', 'mortgaged'].includes(housing.status)
      ? Math.max(0, Number(housing.value) || 0)
      : 0;
    housing.coResidentRefs = Array.from(new Set(Array.isArray(housing.coResidentRefs)
      ? housing.coResidentRefs.filter((id) => run.people.some((item) => item.id === id && item.alive))
      : []));
    if (housing.arrangement === 'shared') {
      housing.coResidentRefs = housing.coResidentRefs.filter((id) =>
        isValidSocialCoResident(run, run.people.find((item) => item.id === id))
      ).slice(0, 1);
      housing.costShare = 'self';
    }
    housing.history = (Array.isArray(source?.history) ? source.history : fresh.history)
      .filter((record) => record && typeof record === 'object' && record.state)
      .map((record) => ({
        age: clamp(record.age, 0, 105),
        year: Number(record.year) || 2026 + clamp(record.age, 0, 105),
        kind: ['origin', 'background', 'choice', 'forced', 'finance'].includes(record.kind)
          ? record.kind
          : 'background',
        reason: String(record.reason || 'normalized'),
        sourceEventId: record.sourceEventId || null,
        choiceId: record.choiceId || null,
        housingChoiceKind: CONTRACT.HOUSING_CHOICE_KINDS.includes(record.housingChoiceKind)
          ? record.housingChoiceKind
          : null,
        debtException: Boolean(record.debtException),
        state: housingSnapshot({ ...fresh, ...(record.state || {}) }),
      }));
    if (!housing.history.length) housing.history = fresh.history;
    housing.sinceAge = clamp(housing.sinceAge, 0, run.age);
    housing.keyChoiceCount = housing.history.filter((record) => record.kind === 'choice').length;
    return housing;
  }

  function housingChoiceRecords(run) {
    return (run.housing.history || []).filter((record) => record.kind === 'choice');
  }
  function currentHousingContext(run) {
    return {
      ...housingSnapshot(run.housing),
      sinceAge: run.housing.sinceAge,
      keyChoiceCount: run.housing.keyChoiceCount,
      affordability: housingAffordability(run, run.housing, { current: true }),
    };
  }
  function validHousingPartner(run, housing = run.housing) {
    const id = run.relationships.activePartnerId,
      item = run.people.find((personItem) => personItem.id === id);
    return item && item.alive && item.relation === 'partner' &&
      ['dating', 'partnered', 'married'].includes(run.relationships.partnerStatus) &&
      housing.costShare === 'joint' && housing.coResidentRefs.includes(id)
      ? item
      : null;
  }
  function housingChoiceAllowed(run, housingChoiceKind, debtException = false) {
    if (!CONTRACT.HOUSING_CHOICE_KINDS.includes(housingChoiceKind))
      return { allowed: false, reason: '住房选择类型无效' };
    const records = housingChoiceRecords(run),
      kinds = new Set(records.map((record) => record.housingChoiceKind).filter(Boolean)),
      ordinaryCount = records.filter((record) => !record.debtException).length,
      exceptionUsed = records.some((record) => record.debtException);
    if (kinds.has(housingChoiceKind)) return { allowed: false, reason: '这类住房选择已经做过一次' };
    if (!debtException)
      return ordinaryCount < 3
        ? { allowed: true, reason: null }
        : { allowed: false, reason: '这一生的三次普通住房选择已经用完' };
    if (housingChoiceKind !== 'debtRelief' || exceptionUsed)
      return { allowed: false, reason: '债务住房例外已经使用或类型不符' };
    if (ordinaryCount < 3)
      return { allowed: false, reason: '尚未达到债务第四次住房选择的条件' };
    const withDebt = housingAffordability(run, run.housing, { current: true }),
      withoutDebt = housingAffordability(run, run.housing, { current: true, ignoreDebts: true });
    return withDebt.level === 'infeasible' && withoutDebt.level !== 'infeasible'
      ? { allowed: true, reason: null }
      : { allowed: false, reason: '债务没有把当前住处从可维持推到不成立' };
  }
  function transitionHousing(run, value = {}, context = {}, options = {}) {
    const previous = normalizeHousing(run, run.housing),
      kind = value.kind || 'background',
      sourceEventId = context.sourceEventId || context.eventId || context.id || value.sourceEventId || null,
      choiceId = context.choiceId || value.choiceId || null,
      housingChoiceKind = value.housingChoiceKind || null,
      debtException = Boolean(value.debtException),
      duplicate = previous.history.some((record) =>
        record.kind === kind && record.sourceEventId === sourceEventId && record.choiceId === choiceId &&
        record.housingChoiceKind === housingChoiceKind && record.reason === value.reason
      );
    if (duplicate) {
      run.housing = previous;
      return { applied: false, reason: 'duplicate' };
    }
    if (kind === 'choice' && !options.skipBudget) {
      const budget = housingChoiceAllowed(run, housingChoiceKind, debtException);
      if (!budget.allowed) return { applied: false, reason: budget.reason };
    }
    const transitionValue = { ...value };
    if (transitionValue.residenceOnly && ['owned', 'mortgaged'].includes(previous.status)) {
      delete transitionValue.status;
      delete transitionValue.value;
    }
    if (Array.isArray(transitionValue.coResidentRefs))
      transitionValue.coResidentRefs = transitionValue.coResidentRefs.flatMap((id) => {
        if (id === '$activePartner') return run.relationships.activePartnerId ? [run.relationships.activePartnerId] : [];
        if (id === '$firstChild') return childPeople(run)[0]?.id ? [childPeople(run)[0].id] : [];
        return [id];
      });
    const replacesProperty = ['owned', 'mortgaged'].includes(previous.status) &&
      Object.hasOwn(transitionValue, 'status') &&
      !['owned', 'mortgaged'].includes(transitionValue.status);
    if (
      replacesProperty &&
      !options.allowPropertyDisposition
    ) return { applied: false, reason: '名下产权住房必须先经过真实处置' };
    if (transitionValue.region === '$homeRegion') transitionValue.region = run.location.id;
    if (transitionValue.region === '$educationRegion') {
      const system = run.education.postgraduateSystem !== 'none'
        ? run.education.postgraduateSystem
        : run.education.undergraduateSystem !== 'none'
          ? run.education.undergraduateSystem
          : run.mobility.lastOverseasSystem;
      transitionValue.region = system === 'us' ? 'us' : system === 'europe' ? 'europe' : run.location.id;
    }
    if (housingChoiceKind === 'homePurchase' && transitionValue.status === 'mortgaged') {
      transitionValue.value = Number(transitionValue.value) ||
        Number(HOUSING_ANCHORS[transitionValue.region || previous.region]?.purchase) || 0;
      const affordability = housingAffordability(run, { ...previous, ...transitionValue });
      if (affordability.level === 'infeasible')
        return { applied: false, reason: affordability.reason };
    }
    const next = normalizeHousing(run, {
      ...previous,
      ...Object.fromEntries(Object.entries(transitionValue).filter(([key]) => [
        'status', 'value', 'arrangement', 'region', 'stability', 'accessibility', 'costShare',
        'coResidentRefs',
      ].includes(key))),
      history: previous.history,
    });
    if (next.arrangement === 'shared') {
      if (!options.allowSocialCoResident) next.coResidentRefs = [];
      next.costShare = 'self';
    }
    if (next.costShare === 'joint' && !validHousingPartner(run, next))
      return { applied: false, reason: '共同住房需要在世且有效的同住伴侣' };
    const changed = JSON.stringify(housingSnapshot(previous)) !== JSON.stringify(housingSnapshot(next));
    if (!changed && kind !== 'choice') {
      run.housing = previous;
      return { applied: false, reason: 'unchanged' };
    }
    if (housingChoiceKind === 'homePurchase' && next.status === 'mortgaged') {
      const purchase = housingAffordability(run, next);
      run.finance.cash -= purchase.cashRequired;
      addLiability(run, {
        value: purchase.purchasePrincipal,
        kind: 'mortgage',
        rate: 0.04,
      });
    } else if (
      kind === 'choice' &&
      (housingChoiceKind !== 'debtRelief' || options.chargeEntryCost) &&
      next.status === 'renting' &&
      changed
    ) {
      run.finance.cash -= Math.round((housingRentAnnual(next) / 12) * 2);
    }
    next.sinceAge = changed ? run.age : previous.sinceAge;
    next.history = [...previous.history, {
      age: run.age,
      year: run.world?.year || 2026 + run.age,
      kind,
      reason: String(value.reason || 'housingTransition'),
      sourceEventId,
      choiceId,
      housingChoiceKind,
      debtException,
      state: housingSnapshot(next),
    }];
    next.keyChoiceCount = next.history.filter((record) => record.kind === 'choice').length;
    run.housing = next;
    return { applied: true, reason: null };
  }

  function totalDebt(run) {
    return run.finance.liabilities
      .filter((item) => item.status !== 'settled')
      .reduce((sum, item) => sum + Math.max(0, item.principal), 0);
  }
  function debtSourceSpec(kind) {
    return (
      DATA?.debtSourceCatalog?.[kind] || {
        label: '未配置来源',
        enforcementEligible: false,
        housingSecured: false,
      }
    );
  }
  function unresolvedLiabilities(run) {
    return run.finance.liabilities.filter(
      (item) => item.status !== 'settled' && Number(item.principal) > 0
    );
  }
  function enforceableLiabilities(run) {
    return unresolvedLiabilities(run).filter((item) => item.enforcementEligible !== false);
  }
  function activeEnforcementDebt(run) {
    const selected = enforceableLiabilities(run).find(
      (item) => item.id === run.finance.enforcementDebtId
    );
    if (selected) return selected;
    return [...enforceableLiabilities(run)]
      .filter((item) => item.status === 'delinquent' || (item.arrears || 0) >= 2)
      .sort((a, b) => (b.arrears || 0) - (a.arrears || 0) || b.principal - a.principal)[0] || null;
  }
  function markDebtReliefIfDue(run) {
    const boundId = run.finance.enforcementDebtId,
      boundDebt = boundId
        ? run.finance.liabilities.find((item) => item.id === boundId)
        : null,
      boundUnresolved = Boolean(
        boundDebt && boundDebt.status !== 'settled' && Number(boundDebt.principal) > 0
      ),
      restricted =
      run.finance.dishonestStatus === 'listed' ||
      run.finance.restrictedConsumption ||
      ['active', 'consequence'].includes(run.finance.enforcementStatus);
    if (restricted) {
      const executionStillUnpaid = boundId
        ? boundUnresolved
        : enforceableLiabilities(run).length > 0;
      if (executionStillUnpaid) return false;
      run.finance.debtStage = 'resolved';
      run.finance.repaymentAgreementFulfilled = Boolean(
        run.finance.repaymentAgreement &&
          (!boundId || run.finance.repaymentAgreement.debtId === boundId)
      );
      run.finance.reliefPending = true;
      return true;
    }
    if (boundId && !boundUnresolved) {
      if (run.finance.repaymentAgreement?.debtId === boundId) {
        run.finance.repaymentAgreementFulfilled = true;
        run.finance.repaymentAgreement = {
          ...run.finance.repaymentAgreement,
          status: 'fulfilled',
          fulfilledAt: run.age,
        };
      }
      run.finance.enforcementDebtId = null;
      run.finance.enforcementStatus = 'resolved';
      run.finance.debtStage = unresolvedLiabilities(run).length ? 'current' : 'resolved';
    }
    if (!unresolvedLiabilities(run).length && run.finance.debtStage !== 'current')
      run.finance.debtStage = 'resolved';
    return false;
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
  function syncPeopleDerived(run) {
    run.relationships.childCount = childPeople(run).length;
    run.relationships.partnerHistoryCount = run.people.filter(
      (item) => item.relation === 'partner'
    ).length;
    run.relationships.parentLost = run.people.some(
      (item) => ['father', 'mother'].includes(item.relation) && item.alive === false
    );
    const activePartner = run.people.find(
      (item) =>
        item.id === run.relationships.activePartnerId && item.alive && item.relation === 'partner'
    );
    if (!activePartner) {
      const fallback = run.people.find((item) => item.alive && item.relation === 'partner');
      run.relationships.activePartnerId = fallback?.id || null;
    }
    return run;
  }
  function syncDerived(run) {
    run.age = clamp(run.age, 0, 105);
    if (
      run.age >= 30 &&
      !(run.education.level >= 4 && ['enrolled', 'completed'].includes(run.education.status))
    )
      run.education.fullTimeUndergraduateClosed = true;
    run.world = worldAt(run.age, run.location);
    syncPeopleDerived(run);
    run.finance.totalDebt = totalDebt(run);
    run.finance.everHadDebt = run.finance.liabilities.length > 0;
    run.finance.hasArrears = run.finance.liabilities.some(
      (item) => item.status === 'delinquent' || (item.arrears || 0) > 0
    );
    run.finance.hasEnforceableArrears = enforceableLiabilities(run).some(
      (item) => item.status === 'delinquent' || (item.arrears || 0) >= 2
    );
    const activeMortgage = unresolvedLiabilities(run).find((item) => item.kind === 'mortgage'),
      currentlyWorking = ['employed', 'selfEmployed', 'gig'].includes(run.employment.status),
      mortgageIncome = currentlyWorking
        ? Math.max(
            0,
            Number(run.employment.incomeAnnualGross) ||
              (Number(run.employment.salary) || 0) * 12 ||
              (run.employment.status === 'selfEmployed' ? Number(run.finance.lastIncome) || 0 : 0)
          )
        : 0,
      annualDebtDue = unresolvedLiabilities(run).reduce((sum, item) => sum + debtAnnualDue(item), 0);
    run.finance.mortgagePaymentStress = Boolean(
      activeMortgage && (mortgageIncome <= 0 || annualDebtDue / mortgageIncome > 0.3)
    );
    if (
      run.finance.hasEnforceableArrears &&
      ['current', 'resolved'].includes(run.finance.debtStage) &&
      !run.finance.reliefPending
    )
      run.finance.debtStage = 'overdue';
    if (
      !run.finance.hasEnforceableArrears &&
      run.finance.debtStage === 'overdue' &&
      !['active', 'consequence'].includes(run.finance.enforcementStatus)
    )
      run.finance.debtStage = 'current';
    markDebtReliefIfDue(run);
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
    for (const key of Object.keys(run.attrs)) run.attrs[key] = clamp(run.attrs[key], 1, 10);
    run.capabilities.presence = clamp(
      30 +
        (run.attrs.looks - 5) * 6 +
        (run.attrs.social - 5) * 4 +
        (run.capabilities.network || 0) * 3,
      0,
      100
    );
    run.capabilities.drive = clamp(
      30 +
        (run.attrs.ambition - 5) * 6 +
        (run.business.operatingSkill || 0) * 0.2 +
        (run.employment.growthCount || 0) * 3,
      0,
      100
    );
    run.capabilities.composure = clamp(
      30 +
        (run.attrs.stability - 5) * 6 +
        run.health.mental * 0.3 -
        run.pressures.money * 0.2,
      0,
      100
    );
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
    merged.stageDecisionCounts =
      run.stageDecisionCounts && typeof run.stageDecisionCounts === 'object'
        ? { ...run.stageDecisionCounts }
        : {};
    merged.lifecycleStageOverrides =
      run.lifecycleStageOverrides && typeof run.lifecycleStageOverrides === 'object'
        ? Object.fromEntries(
            Object.entries(run.lifecycleStageOverrides).map(([key, value]) => [
              key,
              value === true ? 1 : Math.max(0, Number(value) || 0),
            ])
          )
        : {};
    merged.timeline = (Array.isArray(run.timeline) ? run.timeline : []).map((item) => ({
      ...item,
      ...(item.attitude &&
      typeof item.attitude.key === 'string' &&
      typeof item.attitude.text === 'string'
        ? { attitude: { key: item.attitude.key, text: item.attitude.text } }
        : {}),
    }));
    merged.pendingAttitude =
      typeof run.pendingAttitude === 'string' && INDEX.event.get(run.pendingAttitude)?.attitudes
        && !merged.outcomeTags?.[`attitude-event:${run.pendingAttitude}`]
        ? run.pendingAttitude
        : null;
    merged.attributesCommitted = Boolean(run.attributesCommitted);
    merged.relationships.lastParentLossAge = Number.isFinite(
      run.relationships?.lastParentLossAge
    )
      ? clamp(run.relationships.lastParentLossAge, 0, 105)
      : null;
    merged.relationships.lastParentLossPersonId =
      typeof run.relationships?.lastParentLossPersonId === 'string' &&
      merged.people.some(
        (item) =>
          item.id === run.relationships.lastParentLossPersonId &&
          ['father', 'mother'].includes(item.relation) &&
          item.alive === false
      )
        ? run.relationships.lastParentLossPersonId
        : null;
    merged.capabilitiesBirthBase = {
      ...fresh.capabilitiesBirthBase,
      ...(run.capabilitiesBirthBase || {}),
    };
    merged.social = normalizeSocialState(merged, run.social || fresh.social);
    if (!CONTRACT.EMPLOYMENT_REFERRAL_STATUS.includes(merged.employment.referralStatus))
      merged.employment.referralStatus = 'none';
    const referral = merged.people.find(
      (item) => item.id === merged.employment.referralPersonId && item.social
    );
    if (!referral) {
      merged.employment.referralPersonId = null;
      merged.employment.referralStatus = 'none';
    } else if (!referral.alive || referral.social.tie === 'ended') {
      merged.employment.referralStatus = 'expired';
    }
    merged.housing = normalizeHousing(merged, run.housing || fresh.housing);
    merged.finance.liabilities = (Array.isArray(run.finance?.liabilities)
      ? run.finance.liabilities
      : []
    ).map((item) => {
      const kind = item.kind || item.sourceId || 'consumer',
        source = debtSourceSpec(kind);
      return {
        ...item,
        kind,
        sourceId: item.sourceId || kind,
        enforcementEligible: item.enforcementEligible ?? source.enforcementEligible,
        housingSecured: item.housingSecured ?? source.housingSecured,
      };
    });
    merged.finance.seizedAssets = Array.isArray(run.finance?.seizedAssets)
      ? Array.from(new Set(run.finance.seizedAssets))
      : [];
    if (merged.housing.status === 'mortgaged') {
      const mortgage = merged.finance.liabilities.find(
        (item) => item.housingSecured && item.status !== 'settled' && Number(item.principal) > 0
      );
      if (!(merged.housing.value > 0))
        transitionHousing(merged, {
          value: Math.max(260000, Number(mortgage?.principal) || 0),
          kind: 'finance',
          reason: 'mortgageValueNormalized',
        }, { sourceEventId: 'normalize' }, { skipBudget: true });
      if (!mortgage)
        transitionHousing(merged, {
          status: 'owned',
          kind: 'finance',
          reason: 'mortgageSettledOnNormalize',
        }, { sourceEventId: 'normalize' }, { skipBudget: true });
    }
    merged.episodes = { ...fresh.episodes, ...(run.episodes || {}) };
    merged.scheduledConsequences = Array.isArray(run.scheduledConsequences)
      ? run.scheduledConsequences.map((item) => ({ ...item }))
      : [];
    invalidateUndergraduateProceduralConsequences(merged);
    const firstJobStarted = ['active', 'resolved', 'abandoned'].includes(
        merged.episodes.first_job_application?.status
      ),
      diversionResolved = ['resolved', 'abandoned'].includes(
        merged.episodes.secondary_diversion?.status
      );
    if (
      !firstJobStarted &&
      !diversionResolved &&
      merged.education.status === 'completed' &&
      merged.education.level === 2 &&
      merged.education.path === 'middleSchool' &&
      merged.education.nextStage === 'firstJob'
    )
      merged.education.nextStage = 'secondary';
    if (
      !firstJobStarted &&
      merged.education.status === 'completed' &&
      merged.education.level === 3 &&
      ['highSchool', 'vocational'].includes(merged.education.path) &&
      merged.education.nextStage === 'firstJob'
    )
      merged.education.nextStage = 'undergraduateApplication';
    merged.sceneQueue = Array.isArray(run.sceneQueue) ? run.sceneQueue : [];
    if (
      merged.phase === 'episode' &&
      merged.sceneQueue[0]?.kind === 'situation' &&
      merged.sceneQueue[1]?.kind === 'choice' &&
      merged.sceneQueue[0].eventId === merged.sceneQueue[1].eventId
    ) {
      merged.currentDecision = merged.currentDecision
        ? { ...merged.currentDecision, situation: merged.sceneQueue[0].text }
        : merged.currentDecision;
      merged.sceneQueue = merged.sceneQueue.slice(1);
    }
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
        run.social &&
        new Set(CONTRACT.SOCIAL_SLOTS.map((slot) => run.social[`${slot}PersonId`]).filter(Boolean)).size ===
          CONTRACT.SOCIAL_SLOTS.map((slot) => run.social[`${slot}PersonId`]).filter(Boolean).length &&
        run.people.filter((item) => item.social).length <= 2 &&
        CONTRACT.SOCIAL_SLOTS.every((slot) =>
          run.social[`${slot}PersonId`] === null ||
          run.people.some((item) => item.id === run.social[`${slot}PersonId`] && item.social)
        ) &&
        run.finance &&
        run.housing &&
        Array.isArray(run.housing.history) &&
        Array.isArray(run.housing.coResidentRefs) &&
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
        compatibleRelease =
          oldSchema === SCHEMA_VERSION &&
          parsed.gameVersion === VERSION;
      state = base;
      base.meta = normalizeMeta(parsed.meta || {});
      if (compatibleRelease) base.run = parsed.run ? normalizeRun(parsed.run) : null;
      else {
        base.run = null;
        base.meta.migrationNotice = true;
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
    const actual = rule.path === 'age'
      ? run.age
      : rule.path === 'social.latestIntent'
        ? latestSocialIntent(run)
        : getPath(run, rule.path);
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
        (id) => {
          const candidate = INDEX.cards.get(id);
          return candidate?.mechanic === spec.primaryMechanic &&
            (candidate.interactionScope || 'general') === (spec.scope || 'general');
        }
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
  function actorCommandContext(event, run = state.run) {
    const actors = event ? resolveActors(event, run) || {} : {},
      actorIds = Object.fromEntries(Object.entries(actors).map(([slot, item]) => [slot, item.id]));
    return { actorIds, actorId: Object.values(actorIds)[0] || null };
  }
  function socialVariantLegal(variant, event, run) {
    if (!variant || typeof variant !== 'object') return false;
    if (variant.requirements && !requirementsMatch(variant.requirements, run)) return false;
    const context = actorCommandContext(event, run);
    for (const command of variant.effects || []) {
      const value = command.value && typeof command.value === 'object' ? command.value : {};
      if (command.type === 'createSocialPerson' &&
          (!socialSlotKey(run, value.slot) || run.social[`${value.slot}PersonId`]))
        return false;
      if (command.type === 'updateSocialPerson' && !commandSocialPerson(run, value, context))
        return false;
      if (command.type === 'transitionSocialToDating') {
        const item = commandSocialPerson(run, value, context);
        if (
          !item?.alive ||
          item.relation !== 'social' ||
          item.social.tie === 'ended' ||
          run.relationships.activePartnerId ||
          !['none', 'divorced', 'widowed'].includes(run.relationships.partnerStatus)
        ) return false;
      }
      if (command.type === 'createEmploymentReferral') {
        const item = commandSocialPerson(run, value, context);
        if (!item?.alive || item.social.tie === 'ended') return false;
      }
      if (command.type === 'socialCoResidence' &&
          !isValidSocialCoResident(run, commandSocialPerson(run, value, context))) return false;
    }
    return true;
  }
  function resolveSocialOutcome(choice, event, run = state.run) {
    const variants = choice?.socialOutcome?.variants;
    if (!Array.isArray(variants)) return { choice, variant: null };
    if (!event) return { choice: null, variant: null };
    const legal = variants
      .slice(0, CONTRACT.SOCIAL_OUTCOME_MAX_VARIANTS)
      .filter((variant) => socialVariantLegal(variant, event, run));
    if (!legal.length) return { choice: null, variant: null };
    const context = actorCommandContext(event, run),
      actorId = context.actorId || 'none',
      total = legal.reduce((sum, variant) => sum + Math.max(0, Number(variant.weight) || 0), 0),
      rollMax = Math.max(1, total),
      rolled = stable(run.seed, `${event.id}:${choice.id}:${actorId}:${run.age}`, rollMax);
    let cursor = rolled,
      selected = legal.at(-1);
    for (const variant of legal) {
      cursor -= Math.max(0, Number(variant.weight) || 0);
      if (cursor < 0) {
        selected = variant;
        break;
      }
    }
    const effective = copy(choice);
    effective.effects = [...(effective.effects || []), ...copy(selected.effects || [])];
    effective.outcomeTags = Array.from(new Set([
      ...(effective.outcomeTags || []),
      ...(selected.outcomeTags || []),
    ]));
    effective.resultText = selected.resultText || effective.resultText;
    effective.consequenceText = selected.consequenceText || effective.consequenceText;
    effective.consequences = selected.consequences
      ? copy(selected.consequences)
      : effective.consequences || [];
    effective.memoryKey = selected.memoryKey || `${effective.memoryKey}:${selected.id}`;
    effective.socialOutcomeVariantId = selected.id;
    effective.socialActorContext = actorCommandContext(event, run);
    return { choice: effective, variant: selected };
  }
  function resolveDecisionChoice(choice, event, run = state.run) {
    const card = resolveCardChoice(choice, run),
      social = resolveSocialOutcome(card.choice, event, run);
    return { ...card, choice: social.choice, variant: social.variant };
  }
  function choiceVisible(choice, run = state.run) {
    const effective = resolveCardChoice(choice, run).choice;
    return !effective?.showWhen || requirementsMatch(effective.showWhen, run);
  }
  function debtGateAllows(choice, run = state.run) {
    if (!choice?.debtGate) return true;
    if (choice.debtGate === 'housingDisposition')
      return (
        ['owned', 'mortgaged'].includes(run.housing.status) && Number(run.housing.value) > 0
      );
    const restricted =
      run.finance.restrictedConsumption || run.finance.dishonestStatus === 'listed';
    if (!restricted) return true;
    if (choice.debtGate === 'midHighJob') {
      const current = employmentProfile(run.employment.profileId),
        targetId = current && DATA.employmentCatalog?.promotionMap?.[current.id],
        target = targetId && employmentProfile(targetId);
      return !target || (JOB_TIER_INDEX[target.tier] ?? 0) < 3;
    }
    return ![
      'homePurchase',
      'highCostEducation',
      'businessFinance',
      'familyExpansion',
      'newCredit',
    ].includes(choice.debtGate);
  }
  function debtGateReason(choice, run = state.run) {
    if (debtGateAllows(choice, run)) return null;
    if (choice?.debtGate === 'housingDisposition') return '名下没有可处置的自有或按揭住房';
    if (choice?.debtGate === 'homePurchase') return '执行限制仍在，当前不能新增购房安排';
    if (choice?.debtGate === 'highCostEducation')
      return '执行未结，眼下不能兑现这笔高额教育费用';
    if (choice?.debtGate === 'businessFinance')
      return '执行未结，当前拿不到这笔新增经营融资';
    if (choice?.debtGate === 'familyExpansion')
      return '执行未结，眼下的收入和住处还撑不起主动备孕安排';
    if (choice?.debtGate === 'newCredit')
      return '执行未结，当前不能再开一笔新信贷';
    if (choice?.debtGate === 'midHighJob')
      return '这次中高阶岗位审查没有通过，基础工作仍可继续';
    return '眼下的债务执行还没收完，这项安排暂时做不了';
  }
  function choiceEnabled(choice, run = state.run, event = run?.currentDecision) {
    const effective = resolveDecisionChoice(choice, event, run).choice;
    return (
      Boolean(effective) &&
      (!effective.showWhen || requirementsMatch(effective.showWhen, run)) &&
      requirementsMatch(choiceRequirements(effective), run) &&
      debtGateAllows(effective, run) &&
      !((effective.effects || []).some(
        (command) => command.type === 'acceptFirstJobOffer' && command.value === 'bridge'
      ) && bridgeFirstJobCandidates(run).length === 0) &&
      !((effective.effects || []).some(
        (command) => command.type === 'resolveCareerGrowth' && command.value === 'accepted'
      ) && !careerGrowthAcceptanceReady(run)) &&
      housingChoiceGate(effective, run, event).allowed
    );
  }
  function housingTransitionCommand(choice) {
    return (choice?.effects || []).find((command) =>
      ['transitionHousing', 'socialCoResidence'].includes(command.type)
    ) || null;
  }
  function housingChoiceGate(choice, run = state.run, event = run?.currentDecision) {
    const kind = choice?.housingChoiceKind;
    if (!kind) return { allowed: true, reason: null, affordability: null };
    const ordinaryCount = housingChoiceRecords(run).filter((record) => !record.debtException).length,
      debtAction = (choice.effects || []).some((command) =>
        command.type === 'resolveDebtEnforcement' && command.value === 'consequence_housing'
      ),
      debtException = kind === 'debtRelief' && ordinaryCount >= 3,
      budget = housingChoiceAllowed(run, kind, debtException);
    if (!budget.allowed) return { ...budget, affordability: null };
    if (debtAction) {
      const hasHousing = ['owned', 'mortgaged'].includes(run.housing.status) && run.housing.value > 0;
      return hasHousing
        ? { allowed: true, reason: null, affordability: housingAffordability(run, run.housing, { current: true }) }
        : { allowed: false, reason: '名下没有可处置的自有或按揭住房', affordability: null };
    }
    const command = housingTransitionCommand(choice);
    if (!command) return { allowed: false, reason: '住房选择缺少住房转换', affordability: null };
    const stateFields = ['status','value','arrangement','region','stability','accessibility','costShare','coResidentRefs'];
    if (command.type !== 'socialCoResidence' && !stateFields.some((field) => Object.hasOwn(command.value || {}, field)))
      return { allowed: true, reason: null, affordability: null };
    const candidateValue = { ...command.value };
    if (command.type === 'socialCoResidence') {
      const item = commandSocialPerson(
        run,
        candidateValue,
        choice.socialActorContext || actorCommandContext(event, run)
      );
      if (!isValidSocialCoResident(run, item))
        return { allowed: false, reason: '这位朋友目前不能成为具体同住人', affordability: null };
      delete candidateValue.personId;
      delete candidateValue.slot;
      candidateValue.arrangement = 'shared';
      candidateValue.costShare = 'self';
      candidateValue.coResidentRefs = [item.id];
    }
    if (candidateValue.residenceOnly && ['owned', 'mortgaged'].includes(run.housing.status)) {
      delete candidateValue.status;
      delete candidateValue.value;
    }
    if (candidateValue.region === '$homeRegion') candidateValue.region = run.location.id;
    if (candidateValue.region === '$educationRegion') {
      const system = run.education.postgraduateSystem !== 'none'
        ? run.education.postgraduateSystem
        : run.education.undergraduateSystem !== 'none'
          ? run.education.undergraduateSystem
          : run.mobility.lastOverseasSystem;
      candidateValue.region = system === 'us' ? 'us' : system === 'europe' ? 'europe' : run.location.id;
    }
    if (Array.isArray(candidateValue.coResidentRefs))
      candidateValue.coResidentRefs = candidateValue.coResidentRefs.flatMap((id) =>
        id === '$activePartner'
          ? run.relationships.activePartnerId ? [run.relationships.activePartnerId] : []
          : id === '$firstChild'
            ? childPeople(run)[0]?.id ? [childPeople(run)[0].id] : []
            : [id]
      );
    const candidate = { ...run.housing, ...candidateValue };
    if (kind === 'homePurchase' && !candidate.value)
      candidate.value = HOUSING_ANCHORS[candidate.region]?.purchase || 0;
    if (
      ['owned', 'mortgaged'].includes(run.housing.status) &&
      Object.hasOwn(candidateValue, 'status') &&
      !['owned', 'mortgaged'].includes(candidate.status)
    ) return { allowed: false, reason: '名下产权住房必须先经过真实处置', affordability: null };
    if (JSON.stringify(housingSnapshot(normalizeHousing(run, candidate))) === JSON.stringify(housingSnapshot(run.housing)))
      return { allowed: true, reason: null, affordability: housingAffordability(run, run.housing, { current: true }) };
    if (['family', 'supported'].includes(candidate.status))
      return { allowed: true, reason: null, affordability: { level: 'feasible', reason: null } };
    const affordability = housingAffordability(run, candidate, { current: false });
    return affordability.level === 'infeasible'
      ? { allowed: false, reason: affordability.reason, affordability }
      : { allowed: true, reason: null, affordability };
  }
  function housingChoiceReason(choice, run = state.run) {
    const gate = housingChoiceGate(choice, run);
    return gate.allowed ? null : gate.reason;
  }
  function housingChoiceHint(choice, run = state.run) {
    const gate = housingChoiceGate(choice, run);
    if (!gate.allowed || gate.affordability?.level !== 'strained') return null;
    return `可承受但吃紧：${gate.affordability.reason}${gate.affordability.partnerContribution > 0 ? '；伴侣贡献中断时需重新核对' : ''}`;
  }
  function personAge(item, run = state.run) {
    return run.age - item.bornAt;
  }
  function socialPersonLabel(item) {
    if (!item?.social) return null;
    const tie = {
        acquaintance: '认识的人',
        friend: '朋友',
        close: '很亲近的朋友',
        distant: '渐渐疏远',
        ended: '已经断开联系',
      }[item.social.tie] || '旧识',
      proximity = item.social.proximity === 'remote'
        ? ' · 在远处'
        : item.social.proximity === 'local' ? ' · 在附近' : '';
    return `${item.social.displayName} · ${item.alive ? tie : '已经去世'}${item.alive ? proximity : ''}`;
  }
  function actorMatches(item, spec, run) {
    if (item.social && (!item.alive || item.social.tie === 'ended')) return false;
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
    if (spec.socialSource && item.social?.source !== spec.socialSource) return false;
    if (spec.socialTieAny && !spec.socialTieAny.includes(item.social?.tie)) return false;
    if (spec.socialProximity && item.social?.proximity !== spec.socialProximity) return false;
    if (spec.socialTurnAny && !spec.socialTurnAny.includes(item.social?.turn)) return false;
    if (spec.socialSupportAny && !spec.socialSupportAny.includes(item.social?.support)) return false;
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
  function episodeHousingChoiceKind(id) {
    return null;
  }
  function episodeEligible(event, run) {
    if (!event.episode) return true;
    const episode = event.episode,
      record = run.episodes[episode.id];
    if (episode.role === 'start') {
      const housingChoiceKind = episodeHousingChoiceKind(episode.id);
      if (housingChoiceKind && !housingChoiceAllowed(run, housingChoiceKind, false).allowed)
        return false;
      const immediateEducationGateway =
        episode.id === 'secondary_diversion' && episodePhaseCount(episode.id) === 1;
      return (
        (!record || record.status === 'inactive') &&
        (immediateEducationGateway ||
          (activeEpisodes(run).length < 2 &&
            (!activeEpisodes(run).some((item) => item.lane === episode.lane) ||
              (episode.id === 'postgraduate_application' &&
                activeEpisodes(run).some(
                  (item) =>
                    item.id.startsWith('undergraduate_') &&
                    item.phase === episodePhaseCount(item.id)
                )))))
      );
    }
    return Boolean(
      record &&
        record.status === 'active' &&
        record.phase === episode.phase &&
        run.age >= record.nextPhaseAge &&
        run.age < record.deadlineAge
    );
  }
  function firstJobFailureAge(run) {
    const ages = (run.decisionHistory || []).flatMap((record) => {
      const event = INDEX.event.get(record.eventId);
      if (event?.episode?.id !== 'first_job_application') return [];
      const choice = (event.choices || []).find((item) => item.id === record.choiceId),
        route = choice?.route;
      return ['decline_offer', 'continue_search', 'continued_search', 'paused', 'long_search']
        .includes(route)
        ? [record.age]
        : [];
    });
    const episode = run.episodes?.first_job_application;
    if (!ages.length && ['abandoned', 'resolved'].includes(episode?.status))
      ages.push(Number(episode.nextPhaseAge) || Number(episode.startedAt) || 0);
    return ages.length ? Math.max(...ages) : null;
  }
  function lifecycleCheckpointAge(run, lifecycle) {
    const [minimum = 55, maximum = 65] = lifecycle.checkpointRange || [];
    return minimum + stable(
      run.seed,
      `lifecycle-checkpoint:${lifecycle.kind}`,
      Math.max(1, maximum - minimum + 1)
    );
  }
  function lifecycleEligible(event, run) {
    const lifecycle = event.episode?.lifecycle;
    if (!lifecycle || event.episode.role !== 'start') return true;
    if (lifecycle.kind === 'careerGrowth') return careerGrowthReady(run);
    if (lifecycle.kind === 'workTransition')
      return run.age >= lifecycleCheckpointAge(run, lifecycle) && sustainedWorkHistory(run);
    if (lifecycle.relativeTo === 'firstJobFailureOrDecline') {
      const failureAge = firstJobFailureAge(run);
      if (failureAge === null || run.age < failureAge + (lifecycle.minYearsAfter || 0)) return false;
    }
    if (lifecycle.minTenureYears) {
      const tenure = Math.max(
        Number(run.employment.tenure) || 0,
        Number(run.employment.lastJob?.tenure) || 0
      );
      if (tenure < lifecycle.minTenureYears) return false;
    }
    return true;
  }
  function eligible(event, run = state.run) {
    if (
      !event ||
      run.age < event.ageMin ||
      run.age > event.ageMax
    )
      return false;
    if (
      event.id === 'decision_154' &&
      (!run.outcomeTags['parentLoss:firstCall'] || run.outcomeTags['parentLoss:inheritance'])
    )
      return false;
    if (
      event.id === 'decision_214' &&
      run.age !== run.relationships.lastParentLossAge
    )
      return false;
    const parentLossStartedAt = run.episodes?.parent_loss?.startedAt;
    if (
      event.id === 'decision_215' &&
      (!Number.isFinite(parentLossStartedAt) ||
        run.age - parentLossStartedAt < 1 ||
        run.age - parentLossStartedAt > 3)
    )
      return false;
    if (
      event.id === 'decision_216' &&
      (!Number.isFinite(parentLossStartedAt) || run.age - parentLossStartedAt < 5)
    )
      return false;
    if (event.recurrence) {
      if (event.kind !== 'beat') return false;
      const sameEventAge = Math.max(
          -Infinity,
          ...run.timeline.filter((item) => item.id === event.id).map((item) => item.age)
        ),
        sameGroupAge = Math.max(
          -Infinity,
          ...run.timeline
            .filter(
              (item) => INDEX.event.get(item.id)?.recurrence?.key === event.recurrence.key
            )
            .map((item) => item.age)
        );
      if (run.age - sameEventAge < event.recurrence.sameEventYears) return false;
      if (run.age - sameGroupAge < event.recurrence.sameGroupYears) return false;
      if (run.yearQueue.some((item) => item.recurrence?.key === event.recurrence.key))
        return false;
    } else if (run.usedEvents.includes(event.id)) return false;
    if (!(event.stage || []).includes(stageForAge(run.age))) return false;
    if (
      !requirementsMatch(event.requirements, run) ||
      !lifecycleEligible(event, run) ||
      !episodeEligible(event, run)
    ) return false;
    if (
      event.kind === 'decision' &&
      (event.choices || []).length &&
      !(event.choices || []).some((choice) => choiceEnabled(choice, run))
    )
      return false;
    if (
      event.kind === 'decision' &&
      event.choices?.length &&
      event.choices.every((choice) => choice.housingChoiceKind) &&
      !event.choices.some((choice) => choiceEnabled(choice, run))
    ) return false;
    return Boolean(resolveActors(event, run));
  }

  function addTag(run, tag) {
    run.outcomeTags[tag] = (run.outcomeTags[tag] || 0) + 1;
  }
  function addLiability(run, command) {
    const kind = command.kind || 'consumer',
      value = Math.max(0, Number(command.value) || 0),
      source = debtSourceSpec(kind);
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
      sourceId: kind,
      enforcementEligible: source.enforcementEligible,
      housingSecured: source.housingSecured,
      startedAt: run.age,
      arrears: 0,
    };
    run.finance.liabilities.push(liability);
    if (run.finance.debtStage === 'resolved') run.finance.debtStage = 'current';
    return liability;
  }
  function repayDebt(run, amount, debtId = null) {
    let remaining = Math.max(0, Number(amount) || 0),
      matched = false;
    for (const debt of [...run.finance.liabilities]
      .filter((item) => item.status !== 'settled' && (!debtId || item.id === debtId))
      .sort((a, b) => (b.rate || 0) - (a.rate || 0))) {
      matched = true;
      const paid = Math.min(remaining, debt.principal);
      debt.principal -= paid;
      remaining -= paid;
      debt.arrears = 0;
      if (debt.principal <= 0) {
        debt.principal = 0;
        debt.status = 'settled';
        if (
          debt.housingSecured &&
          run.housing.status === 'mortgaged' &&
          !unresolvedLiabilities(run).some((item) => item.housingSecured)
        )
          transitionHousing(run, {
            status: 'owned',
            kind: 'finance',
            reason: 'mortgageRepaid',
          }, { sourceEventId: `repayDebt:${run.age}` }, { skipBudget: true });
      } else debt.status = 'current';
      if (remaining <= 0) break;
    }
    if (amount > remaining) addTag(run, 'finance:repaid');
    markDebtReliefIfDue(run);
    return matched;
  }
  function restructureDebt(run, rate = 0.05, debtId = null) {
    let matched = false;
    for (const debt of run.finance.liabilities) {
      if (debt.status === 'settled' || (debtId && debt.id !== debtId)) continue;
      matched = true;
      debt.rate = Math.min(debt.rate || rate, rate);
      debt.arrears = 0;
      debt.status = 'current';
    }
    run.pressures.money = clamp(run.pressures.money - 10, 0, 100);
    if (!run.finance.hasEnforceableArrears && run.finance.debtStage === 'overdue')
      run.finance.debtStage = 'current';
    if (matched) addTag(run, 'finance:restructured');
    return matched;
  }
  function resolveDebtEnforcement(run, action, context = {}) {
    const debt = activeEnforcementDebt(run);
    if (!debt) return false;
    run.finance.enforcementDebtId = debt.id;
    const agreement = (type) => {
      run.finance.repaymentAgreement = {
        type,
        debtId: debt.id,
        startedAt: run.age,
        status: 'active',
      };
      run.finance.repaymentAgreementFulfilled = false;
    };
    const enterEnforcement = () => {
      run.finance.debtStage = 'enforcement';
      run.finance.enforcementStatus = 'active';
      run.finance.dishonestStatus = 'listed';
      run.finance.restrictedConsumption = true;
      run.finance.seizedAssets = Array.from(
        new Set([...(run.finance.seizedAssets || []), 'account'])
      );
      addTag(run, 'finance:enforcement');
    };
    if (action === 'overdue_agreement') {
      debt.rate = Math.min(debt.rate || 0.05, 0.05);
      debt.arrears = 0;
      debt.status = 'current';
      run.finance.debtStage = 'current';
      run.finance.enforcementStatus = 'agreement';
      agreement('preEnforcement');
      run.pressures.money = clamp(run.pressures.money - 6, 0, 100);
      return true;
    }
    if (action === 'overdue_consult' || action === 'overdue_refuse') {
      run.finance.debtStage = 'overdue';
      run.finance.enforcementStatus =
        action === 'overdue_consult' ? 'noticePending' : 'noticeExpired';
      run.pressures.money = clamp(
        run.pressures.money + (action === 'overdue_refuse' ? 5 : 1),
        0,
        100
      );
      return true;
    }
    if (action.startsWith('enforcement_')) {
      enterEnforcement();
      if (action === 'enforcement_income') {
        agreement('incomeDeduction');
        run.finance.seizedAssets.push('income');
        run.pressures.money = clamp(run.pressures.money + 4, 0, 100);
      } else if (action === 'enforcement_report') {
        agreement('reportedInstallment');
        run.pressures.money = clamp(run.pressures.money + 3, 0, 100);
      } else {
        run.pressures.money = clamp(run.pressures.money + 9, 0, 100);
        run.pressures.family = clamp(run.pressures.family + 4, 0, 100);
      }
      run.finance.seizedAssets = Array.from(new Set(run.finance.seizedAssets));
      return true;
    }
    if (action === 'consequence_housing') {
      const hasHousing =
        ['owned', 'mortgaged'].includes(run.housing.status) && Number(run.housing.value) > 0;
      if (!hasHousing) return false;
      const debtException = housingChoiceRecords(run).filter((record) => !record.debtException).length >= 3,
        budget = housingChoiceAllowed(run, 'debtRelief', debtException);
      if (!budget.allowed) return false;
      run.finance.debtStage = 'consequence';
      run.finance.enforcementStatus = 'consequence';
      const proceeds = Math.max(0, Number(run.housing.value) || 0);
      run.finance.housingDisposition = 'disposed';
      run.finance.seizedAssets = Array.from(
        new Set([...(run.finance.seizedAssets || []), 'housing'])
      );
      let remaining = proceeds;
      const securedDebts = unresolvedLiabilities(run).filter((item) => item.housingSecured),
        targets = [...securedDebts, debt].filter(
          (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
        );
      for (const target of targets) {
        const paid = Math.min(remaining, Math.max(0, Number(target.principal) || 0));
        target.principal -= paid;
        remaining -= paid;
        target.arrears = 0;
        target.status = target.principal <= 0 ? 'settled' : 'current';
        if (remaining <= 0) break;
      }
      run.finance.cash += remaining;
      const sharedRental = {
          status: 'renting',
          value: 0,
          arrangement: 'shared',
          region: run.housing.region,
          stability: 'temporary',
          accessibility: 'standard',
          costShare: 'self',
          coResidentRefs: [],
        },
        canRent = housingAffordability(run, sharedRental, { current: false }).level !== 'infeasible',
        destination = canRent
          ? sharedRental
          : {
              status: 'unstable',
              value: 0,
              arrangement: 'solo',
              region: run.housing.region,
              stability: 'temporary',
              accessibility: 'standard',
              costShare: 'self',
              coResidentRefs: [],
            };
      transitionHousing(run, {
        ...destination,
        kind: 'choice',
        reason: canRent ? 'debtHousingDispositionRental' : 'debtHousingDispositionTemporary',
        housingChoiceKind: 'debtRelief',
        debtException,
      }, context, {
        skipBudget: true,
        allowPropertyDisposition: true,
        chargeEntryCost: canRent,
      });
      if (proceeds > remaining) addTag(run, 'finance:repaid');
      run.pressures.family = clamp(run.pressures.family + 8, 0, 100);
      addTag(run, 'finance:housingDisposed');
      markDebtReliefIfDue(run);
      return true;
    } else {
      run.finance.debtStage = 'consequence';
      run.finance.enforcementStatus = 'consequence';
    }
    if (action === 'consequence_installment') {
      agreement('incomeDeduction');
      run.pressures.money = clamp(run.pressures.money + 3, 0, 100);
    } else if (action === 'consequence_minimum') {
      agreement('minimumLiving');
      run.pressures.money = clamp(run.pressures.money + 5, 0, 100);
      run.pressures.family = clamp(run.pressures.family + 2, 0, 100);
    } else {
      run.finance.repaymentAgreement = null;
      run.pressures.money = clamp(run.pressures.money + 10, 0, 100);
      run.pressures.family = clamp(run.pressures.family + 5, 0, 100);
      run.health.mental = clamp(run.health.mental - 3, 0, 100);
    }
    markDebtReliefIfDue(run);
    return true;
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
      : ' 这轮没有拿到可用录取；现有成绩和材料还留着，接下来可以补申或转向别的路。';
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
      return ' 没有一份录取能真正拿去报到，你开始找工作。';
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
      locationFactor = catalog?.regionalCoefficients?.[run.location.id] || 1,
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
    if (!['bridgeJob', 'careerChange'].includes(value)) return { profile: null };
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
    if (
      run.employment.referralStatus === 'available' &&
      run.employment.applicationChannel === 'bridge'
    ) run.employment.referralStatus = 'used';
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
      ['declined', 'offerDeclined', 'retired', 'careLeave', 'leisure', 'careerBreak', 'paused'].includes(outcome)
        ? 'withdrawn'
        : 'searching';
    if (run.employment.referralStatus === 'available' && run.employment.applicationStatus === 'searching') {
      run.employment.applicationChannel = 'bridge';
      run.employment.firstJobEntryPath = 'referral';
    }
    if (run.employment.firstJobAge === null) run.employment.firstJobOutcome = 'longSearch';
    run.activity.mode = retired
      ? 'retired'
      : careLeave
        ? 'flexible'
        : outcome === 'leisure' || outcome === 'careerBreak' || outcome === 'paused'
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
      debtMaximum =
        run.finance.dishonestStatus === 'listed' || run.finance.restrictedConsumption
          ? Math.min(maximum, 2)
          : maximum,
      region = run.location.id,
      overseas = ['us', 'europe'].includes(run.employment.applicationRegion),
      authorizationReady = !overseas || run.mobility.workAuthorization === 'verified',
      entryPath = run.employment.firstJobEntryPath;
    if (overseas || !authorizationReady) return [];
    return employmentProfiles().filter((profile) => {
      const tier = JOB_TIER_INDEX[profile.tier];
      return (
        profile.firstJobEligible &&
        tier >= minimum &&
        tier <= debtMaximum &&
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
    if (route === 'overseas' || (overseas && route !== 'return')) {
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
  function bridgeFirstJobCandidates(run) {
    const [minimum, maximum] = educationTierRange(run, false),
      lowerBound = Math.max(0, minimum - 1),
      debtMaximum =
        run.finance.dishonestStatus === 'listed' || run.finance.restrictedConsumption
          ? Math.min(maximum, 2)
          : maximum,
      overseas = ['us', 'europe'].includes(run.location.id),
      authorizationReady = !overseas || run.mobility.workAuthorization === 'verified';
    if (!authorizationReady) return [];
    return employmentProfiles().filter((candidate) => {
      const tier = JOB_TIER_INDEX[candidate.tier];
      return (
        candidate.firstJobEligible &&
        tier >= lowerBound &&
        tier <= debtMaximum &&
        (candidate.regions || []).includes(run.location.id) &&
        profileCredentialsReady(run, candidate)
      );
    });
  }
  function acceptFirstJobOffer(run, route) {
    let profile = employmentProfile(run.employment.pendingOfferId);
    if (!profile && route === 'reentry') {
      run.employment.firstJobEntryPath = 'reentry';
      profile = selectFirstJobOffer(run, 'reentry', true);
    }
    if (!profile && route === 'bridge') {
      const candidates = bridgeFirstJobCandidates(run);
      profile = candidates[
        stable(run.seed, `first-job-bridge:${run.age}:${run.location.id}`, Math.max(1, candidates.length))
      ];
      if (profile) {
        run.employment.pendingOfferId = profile.id;
        run.employment.firstJobEntryPath = 'bridge';
      }
    }
    const allowedCandidates = route === 'bridge'
      ? [profile].filter(Boolean)
      : firstJobCandidates(run, { reentry: route === 'reentry' });
    const validPending =
      profile &&
      profile.firstJobEligible &&
      profile.tier !== 'T4' &&
      profileCredentialsReady(run, profile) &&
      allowedCandidates.some((candidate) => candidate.id === profile.id);
    if (!validPending) {
      leaveEmployment(run, 'longSearch');
      return false;
    }
    return applyEmploymentProfile(run, profile.id, { firstJob: true });
  }
  function careerGrowthReady(run) {
    if (!['employed', 'gig'].includes(run.employment.status) || run.employment.tenure < 3)
      return false;
    return Boolean(employmentProfile(run.employment.profileId));
  }
  function careerGrowthAcceptanceReady(run) {
    if (!careerGrowthReady(run)) return false;
    const current = employmentProfile(run.employment.profileId);
    const targetId = DATA.employmentCatalog?.promotionMap?.[current.id],
      target = targetId ? employmentProfile(targetId) : null;
    if (!target) return true;
    if (!profileCredentialsReady(run, target)) return false;
    return !(
      (run.finance.dishonestStatus === 'listed' || run.finance.restrictedConsumption) &&
      JOB_TIER_INDEX[target.tier] >= 3
    );
  }
  function resolveCareerGrowth(run, route) {
    if (!careerGrowthReady(run)) return false;
    if (route !== 'accepted') return ['declined', 'failed'].includes(route);
    if (!careerGrowthAcceptanceReady(run)) return false;
    const current = employmentProfile(run.employment.profileId),
      targetId = DATA.employmentCatalog?.promotionMap?.[current.id],
      target = targetId ? employmentProfile(targetId) : null,
      tenure = run.employment.tenure;
    if (target) {
      if (!applyEmploymentProfile(run, target.id)) return false;
      run.employment.tenure = tenure;
      run.employment.growthType = 'promotion';
    } else {
      const professional = JOB_TIER_INDEX[current.tier] >= 2 ||
        ['technology', 'health', 'professional', 'research'].includes(current.sector);
      const factor = professional ? 1.1 : run.employment.status === 'gig' ? 1.08 : 1.06;
      run.employment.salary = Math.round(run.employment.salary * factor);
      run.employment.incomeAnnualGross = Math.round(run.employment.incomeAnnualGross * factor);
      run.employment.schedule.stability = clamp(
        run.employment.schedule.stability + (professional ? 5 : 10),
        0,
        100
      );
      run.employment.growthType = professional ? 'professional' : 'responsibility';
    }
    run.employment.growthCount++;
    run.employment.lastGrowthAge = run.age;
    return true;
  }
  function sustainedWorkHistory(run) {
    const currentlyWorking = ['employed', 'gig', 'selfEmployed'].includes(run.employment.status),
      currentTenure = currentlyWorking ? Number(run.employment.tenure) || 0 : 0,
      previousTenure = Number(run.employment.lastJob?.tenure) || 0;
    return currentTenure >= 3 || previousTenure >= 3 ||
      (run.employment.status === 'careLeave' && previousTenure >= 3);
  }
  function resolveWorkTransition(run, route) {
    if (!sustainedWorkHistory(run)) return false;
    const selfEmployed = run.employment.status === 'selfEmployed',
      careLeave = run.employment.status === 'careLeave',
      working = ['employed', 'gig', 'selfEmployed'].includes(run.employment.status),
      workingOrLeave = working || careLeave,
      restoreLeave = () => {
        if (!careLeave) return true;
        const previous = copy(run.employment.lastJob),
          restored = previous?.profileId && applyEmploymentProfile(run, previous.profileId);
        if (!restored) return false;
        run.employment.salary = Math.max(0, Number(previous.salary) || run.employment.salary);
        run.employment.incomeAnnualGross = Math.max(
          0,
          Number(previous.incomeAnnualGross) || run.employment.incomeAnnualGross
        );
        run.employment.tenure = Math.max(0, Number(previous.tenure) || 0);
        return true;
      };
    if (route === 'stopped' && workingOrLeave) {
      if (selfEmployed && run.business.status === 'operating') run.business.status = 'closed';
      leaveEmployment(run, 'retired');
      run.later.retirement = 'retired';
      return true;
    }
    if (route === 'reduced' && workingOrLeave) {
      if (!restoreLeave()) return false;
      scaleEmployment(run, 0.55);
      run.later.retirement = 'semiRetired';
      return true;
    }
    if (route === 'continued' && workingOrLeave) {
      if (!restoreLeave()) return false;
      run.later.retirement = 'working';
      return true;
    }
    if (route === 'leftSearch' && !working) {
      leaveEmployment(run, 'leisure');
      run.later.retirement = 'leftSearch';
      return true;
    }
    if (route === 'lightWork' && !working) {
      const previous = copy(run.employment.lastJob),
        previousProfile = employmentProfile(previous?.profileId),
        previousTier = JOB_TIER_INDEX[previous?.tier] ?? 1,
        fallbackProfiles = employmentProfiles().filter(
          (profile) =>
            profile.incomeStability !== 'business' &&
            profile.firstJobEligible &&
            JOB_TIER_INDEX[profile.tier] <= Math.max(0, previousTier - 1) &&
            (profile.regions || []).includes(run.location.id) &&
            profileCredentialsReady(run, profile)
        ),
        fallback = fallbackProfiles[
          stable(run.seed, `later-light-work:${run.age}`, Math.max(1, fallbackProfiles.length))
        ],
        profileId = previousProfile?.incomeStability === 'business'
          ? fallback?.id
          : previous?.profileId,
        restored = profileId && applyEmploymentProfile(run, profileId);
      if (!restored) return false;
      scaleEmployment(run, 0.35);
      run.employment.tenure = 0;
      run.later.retirement = 'lightWork';
      return true;
    }
    if (route === 'keptSearching' && !working) {
      run.employment.status = 'unemployed';
      run.employment.applicationStatus = 'searching';
      run.activity.mode = 'seeking';
      run.later.retirement = 'keptSearching';
      return true;
    }
    return false;
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
      if (
        target &&
        (run.finance.dishonestStatus === 'listed' || run.finance.restrictedConsumption) &&
        JOB_TIER_INDEX[target.tier] >= 3
      )
        return false;
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
  function scaleEmployment(run, factor) {
    const ratio = clamp(Number(factor) || 1, 0.05, 1);
    run.employment.incomeAnnualGross = Math.round((run.employment.incomeAnnualGross || 0) * ratio);
    run.employment.salary = Math.round((run.employment.salary || 0) * ratio);
    run.employment.workHours = Math.max(8, Math.round((run.employment.workHours || 40) * ratio));
    run.employment.arrangement = 'reducedHours';
    run.activity.mode = 'flexible';
  }
  function resolveInheritance(run, route) {
    const transferable = Math.max(
      0,
      Math.round((run.originHousehold.assets || 0) - (run.originHousehold.debt || 0))
    );
    if (route === 'renounced') return 0;
    if (route === 'disputed') {
      run.finance.cash -= 8000;
      return -8000;
    }
    const parents = run.people.filter((item) => ['father', 'mother'].includes(item.relation)),
      deadParents = parents.filter((item) => !item.alive).length,
      siblingCount = run.people.filter((item) => item.relation === 'sibling' && item.alive).length,
      deceasedShare = parents.length > 0 ? Math.min(1, deadParents / parents.length) : 0,
      heirShare = transferable * deceasedShare / Math.max(1, 1 + siblingCount),
      cap = route === 'accepted' ? 120000 : 40000,
      routeShare = route === 'accepted' ? 1 : 0.35,
      amount = Math.min(cap, Math.max(0, Math.round(heirShare * routeShare / 100) * 100));
    run.finance.cash += amount;
    run.originHousehold.assets = Math.max(0, run.originHousehold.assets - amount);
    return amount;
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
  function conceptionCarrier(run) {
    if (run.gender === 'female')
      return { age: run.age, health: run.health.physical, source: 'player' };
    const partner = run.people.find(
      (item) =>
        item.id === run.relationships.activePartnerId &&
        item.alive &&
        item.relation === 'partner' &&
        item.gender === 'female'
    );
    return partner
      ? { age: personAge(partner, run), health: Number(partner.health) || 65, source: 'partner' }
      : null;
  }
  function conceptionChance(run) {
    const carrier = conceptionCarrier(run);
    if (!carrier) return 0;
    const ageAdjustment = carrier.age <= 29 ? 5 : carrier.age <= 34 ? 0 : carrier.age <= 37 ? -10 : -20,
      healthAdjustment = carrier.health >= 75 ? 5 : carrier.health < 50 ? -10 : 0;
    return clamp(80 + ageAdjustment + healthAdjustment, 50, 90);
  }
  function resolveConception(run, key = 'planned') {
    if (run.relationships.plannedConceptionResolved) return run.relationships.pregnancyStatus;
    run.relationships.plannedConceptionResolved = true;
    const chanceValue = conceptionChance(run),
      conceived = chanceValue > 0 && stable(run.seed, `conception:${key}:${run.age}`, 100) < chanceValue;
    run.relationships.pregnancyStatus = conceived ? 'confirmed' : 'notPregnant';
    return run.relationships.pregnancyStatus;
  }
  function firstJobApplicationResult(run) {
    return run.employment.applicationStatus === 'offered'
      ? ' 一份能核合同、岗位和报到条件的录用留下了。'
      : ' 录用通知没有来。招聘网页还得继续打开。';
  }
  function socialSlotKey(run, requested) {
    return CONTRACT.SOCIAL_SLOTS.includes(requested) ? requested : null;
  }
  function commandSocialPerson(run, value = {}, context = {}) {
    let id = value.personId;
    if (id === '$actor') id = context.actorId || Object.values(context.actorIds || {})[0] || null;
    if (typeof id === 'string' && id.startsWith('$actor:'))
      id = context.actorIds?.[id.slice(7)] || null;
    if (!id && value.slot) {
      const slot = socialSlotKey(run, value.slot);
      id = slot ? run.social[`${slot}PersonId`] : null;
    }
    return run.people.find((item) => item.id === id && item.social) || null;
  }
  function isValidSocialCoResident(run, item) {
    return Boolean(
      item?.alive &&
      item.social &&
      item.social.tie !== 'ended' &&
      item.social.proximity === 'local' &&
      Object.values(run.social || {}).includes(item.id)
    );
  }
  function createSocialPerson(run, value = {}) {
    const slot = socialSlotKey(run, value.slot);
    if (!slot || run.social[`${slot}PersonId`]) return null;
    const occupied = new Set(CONTRACT.SOCIAL_SLOTS.map((name) => run.social[`${name}PersonId`]).filter(Boolean));
    if (occupied.size >= CONTRACT.SOCIAL_SLOTS.length) return null;
    const id = `social_${slot}`;
    if (run.people.some((item) => item.id === id)) return null;
    const peerAge = clamp(
        run.age + stable(run.seed, `social-age:${id}`, 9) - 4,
        0,
        105
      ),
      bornAt = Number.isFinite(value.bornAt)
        ? clamp(value.bornAt, run.age - 105, run.age)
        : run.age - peerAge,
      item = person(id, 'social', bornAt, {
        bond: 55,
        social: normalizeSocialMetadata(value, {
          displayName: value.displayName || (slot === 'primary' ? '一位旧识' : '另一位旧识'),
          source: value.source,
          metAtAge: run.age,
          tie: 'acquaintance',
          proximity: 'local',
          turn: 'met',
          support: 'unseen',
        }),
      });
    run.people.push(item);
    run.social[`${slot}PersonId`] = item.id;
    return item;
  }
  function updateSocialPerson(run, value = {}, context = {}) {
    const item = commandSocialPerson(run, value, context);
    if (!item) return null;
    const next = { ...item.social };
    for (const key of ['displayName', 'source', 'tie', 'proximity', 'turn', 'support'])
      if (Object.hasOwn(value, key)) next[key] = value[key];
    item.social = normalizeSocialMetadata(next, item.social);
    if (
      item.id === run.employment.referralPersonId &&
      item.social.tie === 'ended' &&
      run.employment.referralStatus === 'available'
    ) run.employment.referralStatus = 'expired';
    if (item.social.tie === 'ended' || item.social.proximity !== 'local')
      cleanupHousingCoResidents(run, 'socialNoLongerCoResident', `social:${item.id}:${run.age}`);
    return item;
  }
  function transitionSocialToDating(run, value = {}, context = {}) {
    const item = commandSocialPerson(run, value, context),
      canStart =
        item?.alive &&
        item.relation === 'social' &&
        item.social.tie !== 'ended' &&
        !run.relationships.activePartnerId &&
        ['none', 'divorced', 'widowed'].includes(run.relationships.partnerStatus);
    if (!canStart) return false;
    item.relation = 'partner';
    initializePartnerIdentity(run, item);
    initializePartnerHousingProfile(run, item);
    run.relationships.activePartnerId = item.id;
    run.relationships.partnerStatus = 'dating';
    run.relationships.partnerBond = clamp(Number(item.bond) || 55, 0, 100);
    return true;
  }
  function createEmploymentReferral(run, value = {}, context = {}) {
    const item = commandSocialPerson(run, value, context),
      status = CONTRACT.EMPLOYMENT_REFERRAL_STATUS.includes(value.status)
        ? value.status
        : 'available';
    if (!item?.alive || item.social.tie === 'ended') return false;
    run.employment.referralPersonId = item.id;
    run.employment.referralStatus = status;
    if (
      status === 'available' &&
      ['none', 'searching'].includes(run.employment.applicationStatus) &&
      run.employment.pendingOfferId === 'none'
    ) {
      run.employment.applicationChannel = 'bridge';
      run.employment.firstJobEntryPath = 'referral';
    }
    return true;
  }
  function socialCoResidence(run, value = {}, context = {}) {
    const item = commandSocialPerson(run, value, context);
    if (!isValidSocialCoResident(run, item))
      return { applied: false, reason: '这位朋友目前不能成为具体同住人' };
    const transitionValue = { ...value };
    for (const key of ['personId', 'slot', 'arrangement', 'costShare', 'coResidentRefs'])
      delete transitionValue[key];
    return transitionHousing(run, {
      ...transitionValue,
      arrangement: 'shared',
      costShare: 'self',
      coResidentRefs: [item.id],
      kind: transitionValue.kind || 'choice',
      reason: transitionValue.reason || 'socialCoResidence',
      housingChoiceKind: transitionValue.housingChoiceKind || 'socialCoResidence',
    }, context, { allowSocialCoResident: true });
  }
  function createRelatedPerson(run, command) {
    const relation = command.relation || 'child',
      index = run.people.filter((item) => item.id.startsWith(`${relation}_`)).length + 1,
      partnerAge = relation === 'partner'
        ? clamp(run.age + stable(run.seed, `partner-age:${index}`, 9) - 4, 16, 100)
        : null,
      item = person(`${relation}_${index}`, relation, relation === 'partner' ? run.age - partnerAge : run.age, {
        bond: 60,
        legalStatus: relation === 'adoptedChild' ? 'adopted' : 'biological',
        ...(relation === 'partner' ? { gender: run.gender === 'female' ? 'male' : 'female' } : {}),
      });
    run.people.push(item);
    if (relation === 'partner') {
      initializePartnerIdentity(run, item);
      initializePartnerHousingProfile(run, item);
      run.relationships.activePartnerId = item.id;
      run.relationships.partnerStatus = 'dating';
    }
    if (['child', 'adoptedChild', 'stepChild'].includes(relation))
      run.relationships.parenthoodIntent = 'parent';
    return item;
  }
  function initializePartnerHousingProfile(run, item) {
    if (!item || item.housingIncomeAnnualGross !== undefined) return item;
    const modes = ['fixed', 'fixedPlusBonus', 'piecework', 'project', 'business'],
      stability = modes[stable(run.seed, `partner-housing-stability:${item.id}`, modes.length)],
      region = run.housing?.region || run.location.id,
      regionFactor = region === 'us' ? 2.4 : region === 'europe' ? 1.9
        : DATA.employmentCatalog?.regionalCoefficients?.[region] || 1,
      playerTier = JOB_TIER_INDEX[run.employment.jobTier] ?? 1,
      partnerTierIndex = clamp(
        playerTier + stable(run.seed, `partner-housing-tier:${item.id}`, 3) - 1,
        0,
        3
      ),
      tierId = `T${partnerTierIndex}`,
      monthlyBase = DATA.employmentCatalog?.tiers?.[tierId]?.monthlyBase || 6000,
      variation = 0.85 + stable(run.seed, `partner-housing-income:${item.id}`, 31) / 100,
      gross = Math.round(monthlyBase * 12 * regionFactor * variation / 100) * 100;
    item.housingIncomeStability = stability;
    item.housingIncomeAnnualGross = Math.max(24000, gross);
    return item;
  }
  function initializePartnerIdentity(run, item) {
    if (!item || item.relation !== 'partner') return item;
    item.gender = run.gender === 'female' ? 'male' : 'female';
    if (personAge(item, run) < 16) {
      const offset = stable(run.seed, `partner-age:${item.id}`, 9) - 4,
        age = clamp(run.age + offset, 16, 100);
      item.bornAt = run.age - age;
    }
    item.health = clamp(Number(item.health) || 65, 1, 100);
    return item;
  }
  function cleanupHousingCoResidents(run, reason, sourceEventId) {
    const refs = (run.housing.coResidentRefs || []).filter((id) => {
        const personItem = run.people.find((item) => item.id === id);
        return Boolean(
          personItem?.alive &&
          (
            ['partner', 'child', 'adoptedChild', 'stepChild', 'father', 'mother', 'sibling'].includes(personItem.relation) ||
            (reason !== 'partnerNoLongerCoResident' && isValidSocialCoResident(run, personItem))
          )
        );
      }),
      partner = run.people.find((item) => item.id === run.relationships.activePartnerId),
      jointValid = run.housing.costShare !== 'joint' || Boolean(
        partner?.alive && partner.relation === 'partner' && refs.includes(partner.id) &&
        ['dating', 'partnered', 'married'].includes(run.relationships.partnerStatus)
      );
    if (refs.length === (run.housing.coResidentRefs || []).length && jointValid) return false;
    const arrangement = run.housing.arrangement === 'partner' && !jointValid
      ? (run.housing.status === 'family' ? 'originFamily' : 'solo')
      : run.housing.arrangement;
    return transitionHousing(run, {
      arrangement,
      costShare: jointValid ? run.housing.costShare : 'self',
      coResidentRefs: refs,
      kind: 'background',
      reason,
    }, { sourceEventId }, { skipBudget: true }).applied;
  }
  function transitionPartner(run, command) {
    const restoring = command.value === 'partner',
      id = restoring ? run.relationships.lastPartnerId : run.relationships.activePartnerId,
      item = run.people.find((personItem) => personItem.id === id);
    if (!item) return false;
    if (restoring) {
      for (const other of run.people)
        if (other.id !== item.id && other.relation === 'partner') other.relation = 'exPartner';
      item.relation = 'partner';
      run.relationships.activePartnerId = item.id;
    } else {
      item.relation = 'exPartner';
      run.relationships.lastPartnerId = item.id;
      run.relationships.activePartnerId = null;
      cleanupHousingCoResidents(run, 'partnerNoLongerCoResident', `partner:${run.age}`);
    }
    return true;
  }
  function confirmPartnership(run) {
    const id = run.relationships.activePartnerId,
      item = run.people.find((personItem) => personItem.id === id);
    if (!item?.alive || item.relation !== 'partner') return false;
    if (run.relationships.partnerStatus === 'dating')
      run.relationships.partnerStatus = 'partnered';
    return ['partnered', 'married'].includes(run.relationships.partnerStatus);
  }
  function rollbackCommands(before, context, error) {
    return { ok: false, before, after: copy(state.run), context, error: String(error || '结算失败') };
  }
  function ongoingModifiers(run) {
    return new Set(
      (run.cards || [])
        .flatMap((id) => INDEX.cards.get(id)?.ongoingModifiers || [])
    );
  }
  function applyCommands(commands = [], context = {}) {
    const target = state.run,
      before = copy(target),
      run = copy(target);
    for (const command of commands) {
      if (!CONTRACT.isCommandType(command?.type) || !CONTRACT.isWritePath(command?.target)) {
        const location = context.eventId || context.choiceId || context.source || 'unknown';
        return rollbackCommands(
          before,
          context,
          `非法 command @ ${location}：${String(command?.type)} → ${String(command?.target)}`
        );
      }
      if (command.type === 'add') {
        const adjustedValue =
          command.target === 'relationships.partnerBond' &&
          Number(command.value) > 0 &&
          ongoingModifiers(run).has('guardedPartnerBond')
            ? Math.max(0, Number(command.value) * 0.7)
            : command.value;
        if (command.target === 'finance.cash' && Number(command.value) < 0 && run.age < 18) {
          const cost = Math.abs(Number(command.value)),
            fromAssets = Math.min(run.originHousehold.assets, cost);
          run.originHousehold.assets -= fromAssets;
          run.originHousehold.debt += cost - fromAssets;
          run.pressures.family = clamp(run.pressures.family + 2, 0, 100);
        } else addPath(run, command.target, adjustedValue);
        if (command.target === 'relationships.partnerBond')
          for (const item of partnerPeople(run))
            item.bond = clamp(item.bond + Number(adjustedValue), 0, 100);
        if (command.target === 'relationships.childBond')
          for (const item of childPeople(run))
            item.bond = clamp(item.bond + Number(command.value), 0, 100);
      } else if (command.type === 'set') setPath(run, command.target, command.value);
      else if (command.type === 'expose') {
        const values = getPath(run, command.target);
        if (Array.isArray(values) && !values.includes(command.value)) values.push(command.value);
      } else if (command.type === 'tag') addTag(run, command.value);
      else if (command.type === 'addLiability') {
        const liability = addLiability(run, command);
        if (command.bindEpisode && liability && run.episodes[command.bindEpisode])
          run.episodes[command.bindEpisode].boundDebtId = liability.id;
      }
      else if (command.type === 'repayDebt') {
        const debtId = command.scope === 'episodeBound'
          ? run.episodes[context.episode?.id]?.boundDebtId || null
          : null;
        if (command.scope === 'episodeBound' && !debtId)
          return rollbackCommands(before, context, '当前事件没有绑定债务');
        if (!repayDebt(run, command.value, debtId) && command.scope === 'episodeBound')
          return rollbackCommands(before, context, '当前事件绑定的债务已经结清或失效');
      }
      else if (command.type === 'restructureDebt') {
        const debtId = command.scope === 'episodeBound'
          ? run.episodes[context.episode?.id]?.boundDebtId || null
          : null;
        if (command.scope === 'episodeBound' && !debtId)
          return rollbackCommands(before, context, '当前事件没有绑定债务');
        if (!restructureDebt(run, command.rate, debtId) && command.scope === 'episodeBound')
          return rollbackCommands(before, context, '当前事件绑定的债务已经结清或失效');
      }
      else if (command.type === 'resolveDebtEnforcement') {
        if (!resolveDebtEnforcement(run, command.value, context))
          return rollbackCommands(before, context, '债务处置条件已经失效');
      }
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
      else if (command.type === 'acceptFirstJobOffer') {
        if (!acceptFirstJobOffer(run, command.value))
          return rollbackCommands(before, context, '录用条件已经失效');
      }
      else if (command.type === 'resolveCareerGrowth') {
        if (!resolveCareerGrowth(run, command.value))
          return rollbackCommands(before, context, '职业成长条件已经失效');
      }
      else if (command.type === 'resolveWorkTransition') {
        if (!resolveWorkTransition(run, command.value))
          return rollbackCommands(before, context, '工作转段条件已经失效');
      }
      else if (command.type === 'applyEmploymentProfile') {
        if (!applyEmploymentProfile(run, command.value))
          return rollbackCommands(before, context, '职业条件已经失效');
      }
      else if (command.type === 'scaleEmployment') scaleEmployment(run, command.value);
      else if (command.type === 'leaveEmployment')
        leaveEmployment(run, command.value);
      else if (command.type === 'takeCareLeave')
        takeCareLeave(run);
      else if (command.type === 'completeEmploymentHandover') {
        if (!completeEmploymentHandover(run))
          return rollbackCommands(before, context, '就业交接条件已经失效');
      }
      else if (command.type === 'adjustJobTier') {
        if (!adjustJobTier(run, command.value))
          return rollbackCommands(before, context, '岗位调整条件已经失效');
      }
      else if (command.type === 'resolveLayoff')
        resolveLayoff(run, command.value);
      else if (command.type === 'grantCredential')
        grantCredential(run, command.value);
      else if (command.type === 'resolveConception')
        resolveConception(run, command.value);
      else if (command.type === 'createPerson') createRelatedPerson(run, command);
      else if (command.type === 'createSocialPerson') {
        if (!createSocialPerson(run, command.value))
          return rollbackCommands(before, context, '这一生的两个持续关系位置已经用完');
      }
      else if (command.type === 'updateSocialPerson') {
        if (!updateSocialPerson(run, command.value, context))
          return rollbackCommands(before, context, '社交人物已经失效');
      }
      else if (command.type === 'transitionSocialToDating') {
        if (!transitionSocialToDating(run, command.value, context))
          return rollbackCommands(before, context, '当前不能与这位朋友进入约会');
      }
      else if (command.type === 'createEmploymentReferral') {
        if (!createEmploymentReferral(run, command.value, context))
          return rollbackCommands(before, context, '工作线索提供者已经失效');
      }
      else if (command.type === 'transitionPartner') {
        if (!transitionPartner(run, command))
          return rollbackCommands(before, context, '关系人物已经失效');
      }
      else if (command.type === 'confirmPartnership') {
        if (!confirmPartnership(run))
          return rollbackCommands(before, context, '当前没有可以确认的伴侣关系');
      }
      else if (command.type === 'transitionHousing') {
        const transition = transitionHousing(run, command.value, context);
        if (!transition.applied && !['duplicate', 'unchanged'].includes(transition.reason)) {
          return rollbackCommands(before, context, transition.reason);
        }
      }
      else if (command.type === 'socialCoResidence') {
        const transition = socialCoResidence(run, command.value, context);
        if (!transition.applied && !['duplicate', 'unchanged'].includes(transition.reason))
          return rollbackCommands(before, context, transition.reason);
      }
      else if (command.type === 'resolveInheritance') resolveInheritance(run, command.value);
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
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, run);
    state.run = target;
    return { ok: true, before, after: copy(target), context };
  }

  function scheduleConsequence(event, choice) {
    const socialActorIds = event.track === 'social'
      ? { ...(choice.socialActorContext?.actorIds || actorCommandContext(event).actorIds) }
      : null;
    if (socialActorIds) {
      for (const command of choice.effects || []) {
        if (command.type !== 'createSocialPerson') continue;
        const slot = socialSlotKey(state.run, command.value?.slot),
          id = slot ? state.run.social[`${slot}PersonId`] : null;
        if (id) socialActorIds[slot] = id;
      }
    }
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
        socialOutcomeVariantId: choice.socialOutcomeVariantId || null,
        sourceDecisionId: event.id,
        sourceChoiceId: choice.id,
        ...(socialActorIds ? { actorIds: copy(socialActorIds) } : {}),
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
    HABIT_EPISODE_LABELS = {
      gambling: { formation: '反复下注', treatment: '正在处理下注问题', relapse: '又开始下注' },
      alcohol: { formation: '喝酒开始失控', treatment: '正在处理饮酒问题', relapse: '又开始喝' },
      gaming: { formation: '熬夜和失约', treatment: '正在调整游戏时间', relapse: '又开始通宵' },
      shopping: { formation: '订单和分期失控', treatment: '正在处理购物问题', relapse: '又开始连买' },
      medication: { formation: '用量开始失控', treatment: '正在重新看用药', relapse: '又自行加量' },
    };
  function episodeLabel(id) {
    const match =
      /^habit_(gambling|alcohol|gaming|shopping|medication)_(formation|treatment|relapse)$/.exec(
        id
      );
    return match
      ? `${HABIT_TYPE_LABELS[match[1]]}：${HABIT_EPISODE_LABELS[match[1]][match[2]]}`
      : episodeCatalog(id).label || EPISODE_LABELS[id] || id;
  }
  function episodeMetadata(id) {
    const catalog = episodeCatalog(id),
      spec = episodeSpec(id);
    return {
      id,
      label: episodeLabel(id),
      lane: spec?.lane || null,
      cataloged: INDEX.episodes.has(id),
      ageBound: Boolean(catalog.ageBound),
      organization: catalog.organization || EPISODE_ORGANIZATIONS[id] || null,
    };
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
      debtStage: run.finance.debtStage,
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
      if (episode.id === 'parent_loss' && episode.phase === 2) {
        record.nextPhaseAge = Math.max(30, record.startedAt + 5);
        record.deadlineAge = Math.min(105, record.nextPhaseAge + 6);
      }
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
      overseas = ['us', 'europe'].includes(run.employment.applicationRegion),
      candidates = scenarios.filter((scenario) =>
        recruitmentScenarioEligible(run, scenario) && (!overseas || scenario.id === 'E08')
      );
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
    if (event.episode?.id !== 'first_job_application') return event;
    if (event.episode.phase === 5 && bridgeFirstJobCandidates(run).length === 0)
      return {
        ...event,
        situation:
          '又找了一年。眼下没有一份资格、地区和合同条件都允许你报到的桥接岗位；继续等，还是先停下来，都要由你决定。',
      };
    if (event.episode.phase !== 3) return event;
    const scenario = recruitmentScenarioFor(run);
    if (!scenario) return event;
    return {
      ...event,
      situation: scenario.situation,
      prompt: scenario.prompt,
      recruitmentScenarioId: scenario.id,
      choices: scenario.choices.map((scenarioChoice, index) => {
        const route = scenarioChoice.route || 'domestic',
          effects = [
            { type: 'tag', target: 'history', value: `research:${scenario.id}` },
            { type: 'add', target: 'agency', value: scenarioChoice.offerIntent ? 2 : 1 },
          ];
        if (scenarioChoice.offerIntent) {
          if (route === 'return')
            effects.push({ type: 'set', target: 'employment.applicationRegion', value: 'domestic' });
          effects.push({
            type: 'resolveFirstJobApplication',
            target: 'employment',
            value: route,
            scenarioId: scenario.id,
            scenarioChoiceIndex: index,
          });
        } else {
          const withdrawn = scenario.id === 'E08' && index === 1;
          effects.push(
            { type: 'set', target: 'employment.pendingOfferId', value: 'none' },
            { type: 'set', target: 'employment.applicationStatus', value: withdrawn ? 'withdrawn' : 'searching' },
            { type: 'set', target: 'employment.firstJobOutcome', value: withdrawn ? 'withdrawn' : 'longSearch' },
            { type: 'set', target: 'activity.mode', value: withdrawn ? 'leisure' : 'seeking' }
          );
        }
        return {
          id: `${event.id}_${scenario.id}_${index + 1}`,
          text: scenarioChoice.text,
          resultText: scenarioChoice.resultText,
          effects,
          route: scenarioChoice.offerIntent ? `${scenario.id}_${index + 1}` : scenario.id === 'E08' && index === 1 ? 'withdrawn' : 'long_search',
          memoryKey: `${event.id}:${scenario.id}:${index + 1}`,
          requirements: { all: [], any: [], none: [] },
          showWhen: { all: [], any: [], none: [] },
          consequences: [],
          commitments: [],
          mechanicTags: [],
          cardInteraction: null,
          outcomeTags: ['employment', `recruitment:${scenario.id}`, 'episode:first_job_application'],
        };
      }),
    };
  }
  function prepareCareerGrowthDecision(event, run) {
    if (event.episode?.id !== 'career_growth') return event;
    const current = employmentProfile(run.employment.profileId),
      targetId = current && DATA.employmentCatalog?.promotionMap?.[current.id],
      target = targetId ? employmentProfile(targetId) : null,
      professional = current &&
        (JOB_TIER_INDEX[current.tier] >= 2 ||
          ['technology', 'health', 'professional', 'research'].includes(current.sector));
    if (target)
      return {
        ...event,
        situation: `你做${current.name}已经满三年。现在有一份${target.name}的正式安排摆到面前：岗位、职责、收入和生效日都要写清，不能只口头叫你“往上走”。`,
      };
    if (professional)
      return {
        ...event,
        situation: `你做${current?.name || '这份专业工作'}已经满三年。最近谈的是项目责任、专业级别和收入档，不是空头称呼；接下以后，交付范围也会一起变。`,
      };
    return {
      ...event,
      situation: `你做${current?.name || '这份工作'}已经满三年。最近有人问你愿不愿意带班、培训新人，或接一份更稳定的安排。新增的活、工时和收入得一起说清。`,
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
      event = prepareCareerGrowthDecision(prepareRecruitmentDecision(event, run), run);
    const workTransitionSituation = event.episode?.id === 'retirement_transition'
        ? event.routeSituations?.[
            run.employment.status === 'careLeave'
              ? 'careLeave'
              : ['employed', 'gig', 'selfEmployed'].includes(run.employment.status)
                ? 'working'
                : 'former'
          ]
        : null,
      routeSituation = event.routeSituations?.[run.episodes[event.episode.id]?.route],
      situationText = event.episode?.id === 'parental_inheritance' && event.episode.phase === 1
      ? (() => {
          const parents = run.people.filter((item) => ['father', 'mother'].includes(item.relation));
          if (parents.length === 1)
            return '唯一登记的父母已去世。钥匙、死亡证明、账户资料和欠款通知放到了一起；遗产有多少、债有多少，都要按现有文件查清。';
          return parents.length >= 2 && parents.every((item) => !item.alive)
            ? '父母都已去世。两边留下的钥匙、死亡证明、账户资料和欠款通知放到了一起；遗产有多少、债有多少、还涉及谁，都要按现有文件查清。'
            : '一位父母去世后，另一位仍在世。旧钥匙、死亡证明、账户资料和欠款通知一起到了；哪些属于遗产、哪些仍属于在世父母，必须分别查清。';
        })()
      : workTransitionSituation || routeSituation || event.situation;
    run.currentDecision = { ...event, situation: situationText };
    run.phase = 'episode';
    run.sceneQueue = [{ kind: 'choice', eventId: event.id }];
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
      result = applyCommands(choice.effects, {
        ...event,
        sourceEventId: event.id,
        choiceId: choice.id,
        housingChoiceKind: choice.housingChoiceKind || null,
      });
    if (!result.ok) {
      showToast(`这项选择没有结算：${result.error}`);
      inputLocked = false;
      save();
      render();
      return;
    }
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
      resolvedDebtHousing = choice.effects.some(
        (command) =>
          command.type === 'resolveDebtEnforcement' && command.value === 'consequence_housing'
      ),
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
              : resolvedDebtHousing
                ? before.housing.status === 'mortgaged'
                  ? ' 成交款先抵了按揭和执行款，剩下的余额才是以后要继续对的数字。'
                  : ' 成交款按执行余额扣划，房本从你的账本里消失了。'
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
    invalidateUndergraduateProceduralConsequences(run);
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
      housingChoiceKind: choice.housingChoiceKind || null,
      debtException: Boolean(run.housing.history.at(-1)?.choiceId === choice.id && run.housing.history.at(-1)?.debtException),
      impact: scene.impact,
    });
    run.usedEvents.push(event.id);
    run.decisionCount++;
    run.lastDecisionAge = run.age;
    recordDecisionBudgetUse(run, event);
    addTimeline(
      event,
      `${choice.text}${/[。！？!?]$/.test(choice.text) ? '' : '。'}${resultText}`,
      'chosen'
    );
    run.currentDecision = null;
    run.sceneQueue = [];
    run.phase = 'playing';
    openFamilyPlanningIfEligible(run);
    if (event.id === 'decision_154') addTag(run, 'parentLoss:inheritance');
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
            candidate.episode?.id === event.episode.id &&
            eligible(candidate, run)
        ),
      canContinuePregnancySameAge =
        event.episode.id === 'pregnancy_decision' &&
        event.episode.ageAdvanceYears === 0 &&
        pregnancyEventsThisAge < 2 &&
        INDEX.kinds.decision.some(
          (candidate) => candidate.episode?.id === 'pregnancy_decision' && eligible(candidate, run)
        ),
      canContinueFamilyPlanningSameAge = familyPlanningStartReady(run);
    if (canContinueEducationSameAge || canContinuePregnancySameAge || canContinueFamilyPlanningSameAge) {
      queueSameAgeFollowup(run, {
        educationEpisodeId: canContinueEducationSameAge ? event.episode.id : null,
        pregnancy: canContinuePregnancySameAge,
        family: canContinueFamilyPlanningSameAge,
      });
      run.yearStarted = true;
      save();
      render();
      return;
    }
    if (event.fromAnnualPlan) {
      run.yearStarted = true;
      save();
      render();
      return;
    }
    run.yearStarted = false;
    settleYear(run);
    if (run.finance.reliefPending) {
      queueDebtRelief(run, true);
      return;
    }
    run.age++;
    syncDerived(run);
    save();
    render();
  }
  function episodeBindingInvalid(id, record, run) {
    const housingChoiceKind = episodeHousingChoiceKind(id);
    if (
      record.phase > 1 &&
      housingChoiceKind &&
      !housingChoiceAllowed(run, housingChoiceKind, false).allowed
    ) return true;
    if (
      id === 'undergraduate_application' &&
      (
        run.education.fullTimeUndergraduateClosed ||
        run.education.highestCompleted === 'undergraduate' ||
        (run.education.status === 'enrolled' && run.education.nextStage === 'undergraduate')
      )
    )
      return true;
    if (
      id === 'adoption_process' &&
      (run.health.physical < 45 ||
        run.health.careNeed >= 2 ||
        run.relationships.activePartnerId ||
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
    if (
      id === 'debt_enforcement' &&
      (!run.finance.enforcementDebtId ||
        !run.finance.liabilities.some(
          (item) =>
            item.id === run.finance.enforcementDebtId &&
            item.status !== 'settled' &&
            item.enforcementEligible !== false
        ))
    )
      return true;
    if (id === 'acute_illness' && record.phase > 1 && run.health.status === 'well') return true;
    if (
      id === 'long_term_care' &&
      record.phase > 1 &&
      run.health.careNeed < 1 &&
      run.health.status !== 'limited' &&
      run.health.disability === 'none'
    )
      return true;
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
        '从第一次考察起，五年了。你不再往里投，清了货，退了租，最后一天把卷帘门拉了下来。',
      invalidated:
        '门店已经退了，品牌支持也停了。剩下的库存装箱，设备处理了，该结的结了。开店这条路，走完了。',
    },
    public_exam: {
      deadline:
        '两轮招录过去了。你不再等名单，材料袋收好，招聘软件重新开始推别的工作。',
      invalidated:
        '你已经进了公共部门。原报考单位的邮件留在收件箱里，这份报名材料也不用再往下补。',
    },
    layoff_reemployment: {
      deadline:
        '解除通知下来两年了。补偿和备用金已经花掉一部分。你留着失业登记和求职记录，先用短活儿撑着。',
      invalidated:
        '你签了新合同，报到完了。原单位的离职证明装进档案。这次裁员后的重新落脚，提前结束。',
    },
    career_break: {
      deadline:
        '第三次对账了。房租和日常不能还只靠备用金。你不再拖了，开始接能马上结算的活儿。这段主动不工作，到底被钱催着收了。',
      invalidated: '后来没再按原来的计划过。预算表停在最后记下的那一页，接下来的日子另算。',
    },
    guarantee_recourse: {
      deadline:
        '这件担保拖了三年。合同、催收单、还款凭证和债权人回复都摊开了。真正付出去多少、追回多少，只认账上的数。',
      invalidated:
        '这笔担保结了，或失效了。结清证明和往来记录你收好。不再走一条已经不存在的追偿路。',
    },
    acute_illness: {
      deadline:
        '检查后第四年了。最后一次评估做完。以后怎么复诊、怎么安排日常，都按现在的身体来。',
      invalidated:
        '复查确认了——现在的问题不再需要这条治疗路线。检查与结案记录你留着。以后只按普通身体状态管。',
    },
  };
  function habitEpisodeClosure(id, reason) {
    const type = id.split('_')[1],
      copyByType = {
        gambling: {
          deadline: '两年了。下过的注和改过的限额都印在流水上。这一页翻过去了，账没跟着翻过去。',
          invalidated: '原来的办法停了。流水还在，账从今天的余额接着算。',
        },
        alcohol: {
          deadline: '两年了。喝过多少、睡没睡好、第二天请没请假，都落在记录里。身体记着账，你自己也记得。',
          invalidated: '原来的安排停了。喝过多少、身体怎样，都记在那。想重来，得从真的数算起。',
        },
        gaming: {
          deadline: '两年了。几点关机、第二天漏了什么事，作息自己记得。那一局打完了，天亮还有别的事等着。',
          invalidated: '原来的计划不再走。熬过的夜还在，第二天的事没等你。',
        },
        shopping: {
          deadline: '两年了。退过的包裹、没退的分期，账单上都列着。下单的手比眼睛快，这个月的账还是得照付。',
          invalidated: '原来的办法停了。订单和账单没消失，该还的还在还款日等你。',
        },
        medication: {
          deadline: '两年了。药盒空了几次、实际吃过多少，病历上都写得清。药不能替你回忆，记录可以。',
          invalidated: '原来的调法停了。药盒和病历还在，原来的病也得按真实情况继续看。',
        },
      };
    return copyByType[type]?.[reason] || '这段安排到这里停了。';
  }
  function episodeClosureText(id, reason) {
    return episodeCatalog(id)[reason] ||
      EPISODE_CLOSURES[id]?.[reason] ||
      (id.startsWith('habit_')
        ? habitEpisodeClosure(id, reason)
        : '这件事已经没法再继续。');
  }
  function prepareEpisodeClosure(run, id, record, reason) {
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
    return { kind: 'result', forced: true, episodeId: id, reason, text: episodeClosureText(id, reason) };
  }
  function queueEpisodeClosures(closures) {
    const run = state.run;
    run.sceneQueue = closures.map(({ id, record, reason }) =>
      prepareEpisodeClosure(run, id, record, reason)
    );
    if (!run.sceneQueue.length) return false;
    run.currentDecision = null;
    run.phase = 'episode';
    save();
    render();
    return true;
  }
  function queueEpisodeClosure(id, record, reason) {
    return queueEpisodeClosures([{ id, record, reason }]);
  }
  function queueDebtRelief(run, advanceAge) {
    if (!run.finance.reliefPending) return false;
    run.sceneQueue = [
      {
        kind: 'result',
        debtRelief: true,
        advanceAge: Boolean(advanceAge),
        text: '履约证明交上去后，查询页没有立刻变化。几天后，限制状态显示解除。已经扣走的钱和搬离的住处没有跟着回来。',
      },
    ];
    run.currentDecision = null;
    run.phase = 'episode';
    save();
    render();
    return true;
  }
  function queueFamilyPlanningEcho(run) {
    const text = episodeCatalog('becoming_parent')?.latePartnerEcho;
    if (typeof text !== 'string' || !text.trim()) return false;
    run.sceneQueue = [{
      kind: 'result',
      familyPlanningEcho: true,
      text,
    }];
    run.currentDecision = null;
    run.phase = 'episode';
    save();
    render();
    return true;
  }
  function finishFamilyPlanningEcho(scene) {
    const run = state.run;
    addTimeline(
      { id: `family_planning_late_echo_${run.age}`, kind: 'consequence', track: 'children', icon: '♡' },
      scene.text,
      'chosen'
    );
    run.sceneQueue = [];
    run.currentDecision = null;
    run.phase = 'playing';
    run.yearStarted = false;
    save();
    render();
  }
  function finishDebtRelief(scene) {
    const run = state.run;
    run.finance.debtStage = unresolvedLiabilities(run).length ? 'current' : 'resolved';
    run.finance.enforcementStatus = 'resolved';
    run.finance.dishonestStatus = 'clear';
    run.finance.restrictedConsumption = false;
    run.finance.seizedAssets = [];
    run.finance.reliefPending = false;
    run.finance.enforcementDebtId = null;
    if (run.finance.repaymentAgreement)
      run.finance.repaymentAgreement = {
        ...run.finance.repaymentAgreement,
        status: 'fulfilled',
        fulfilledAt: run.age,
      };
    const episode = run.episodes.debt_enforcement;
    if (episode?.status === 'active') {
      episode.status = 'resolved';
      episode.closureReason = 'relieved';
      episode.nextPhaseAge = run.age;
    }
    addTag(run, 'finance:relieved');
    addTimeline(
      { id: `debt_relief_${run.age}`, kind: 'consequence', track: 'finance', icon: '¥' },
      scene.text,
      'chosen'
    );
    run.sceneQueue = [];
    run.currentDecision = null;
    run.phase = 'playing';
    run.yearStarted = false;
    if (scene.advanceAge) run.age++;
    syncDerived(run);
    save();
    render();
  }
  function episodeClosureReason(id, record, run) {
    if (record.status !== 'active') return null;
    if (episodeBindingInvalid(id, record, run)) return 'invalidated';
    if (
      id === 'parent_loss' &&
      record.phase === 2 &&
      run.age - record.startedAt > 3
    )
      return 'deadline';
    if (run.age >= record.deadlineAge) return 'deadline';
    if (run.age < record.nextPhaseAge) return null;
    const candidate = INDEX.kinds.decision.find(
        (event) =>
          event.episode?.id === id &&
          event.episode.phase === record.phase &&
          !run.usedEvents.includes(event.id)
      ),
      phaseReady = candidate &&
        run.age >= candidate.ageMin && run.age <= candidate.ageMax &&
        (candidate.stage || []).includes(stageForAge(run.age)) &&
        requirementsMatch(candidate.requirements, run);
    return phaseReady &&
      (candidate.choices || []).length &&
      !(candidate.choices || []).some((choice) => choiceEnabled(choice, run))
      ? 'invalidated'
      : null;
  }
  function pendingEpisodeClosures(run) {
    return Object.entries(run.episodes).flatMap(([id, record]) => {
      const reason = episodeClosureReason(id, record, run);
      return reason ? [{ id, record, reason }] : [];
    });
  }
  function dueEpisodeClosure(run) {
    const closures = pendingEpisodeClosures(run);
    return closures.length ? queueEpisodeClosures(closures) : false;
  }
  function plannedEpisodeClosure(run, closure) {
    const event = INDEX.kinds.decision.find((item) => item.episode?.id === closure.id);
    return {
      id: `episode_closure_${closure.id}_${closure.reason}_${run.age}`,
      kind: 'consequence',
      track: event?.track || 'ordinary',
      icon: '↩',
      text: episodeClosureText(closure.id, closure.reason),
      annualRole: 'episodeClosure',
      episodeId: closure.id,
      reason: closure.reason,
    };
  }
  function launchPlannedEpisodeClosure(planned) {
    const run = state.run,
      record = run.episodes[planned.episodeId],
      reason = record ? episodeClosureReason(planned.episodeId, record, run) : null;
    if (!record || !reason) return false;
    const scene = prepareEpisodeClosure(run, planned.episodeId, record, reason);
    scene.fromAnnualPlan = true;
    run.sceneQueue = [scene];
    run.currentDecision = null;
    run.phase = 'episode';
    save();
    render();
    return true;
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
    run.sceneQueue.shift();
    run.currentDecision = null;
    if (run.sceneQueue.length) {
      save();
      render();
      return;
    }
    run.phase = 'playing';
    if (scene.fromAnnualPlan) {
      run.yearStarted = true;
      save();
      render();
      return;
    }
    run.yearStarted = false;
    settleYear(run);
    if (run.finance.reliefPending) {
      queueDebtRelief(run, true);
      return;
    }
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
      if (scene.debtRelief) finishDebtRelief(scene);
      else if (scene.familyPlanningEcho) finishFamilyPlanningEcho(scene);
      else if (scene.forced) finishForcedEpisode(scene);
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
      resolvedChoice = resolveDecisionChoice(originalChoice, event, run),
      choice = resolvedChoice.choice;
    if (!choice || inputLocked || !choiceEnabled(originalChoice, run)) return;
    inputLocked = true;
    const snapshot = copy(run),
      result = applyCommands(choice.effects, {
        ...event,
        ...actorCommandContext(event, run),
        sourceEventId: event.id,
        choiceId: choice.id,
        housingChoiceKind: choice.housingChoiceKind || null,
      });
    if (!result.ok) {
      showToast(`这项选择没有结算：${result.error}`);
      inputLocked = false;
      save();
      render();
      return;
    }
    openFamilyPlanningIfEligible(run);
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
      housingChoiceKind: choice.housingChoiceKind || null,
      debtException: Boolean(run.housing.history.at(-1)?.choiceId === choice.id && run.housing.history.at(-1)?.debtException),
      socialOutcomeVariantId: choice.socialOutcomeVariantId || null,
      memoryKey: choice.memoryKey,
      impact: impactScore(result.before, result.after, choice),
    });
    run.usedEvents.push(event.id);
    run.decisionCount++;
    run.lastDecisionAge = run.age;
    recordDecisionBudgetUse(run, event);
    addTimeline(
      event,
      `${choice.text}${/[。！？!?]$/.test(choice.text) ? '' : '。'}${choice.resultText}`,
      'chosen'
    );
    run.currentDecision = null;
    run.phase = 'playing';
    if (familyPlanningStartReady(run)) {
      queueSameAgeFollowup(run, { family: true });
      run.yearStarted = true;
      save();
      render();
      setTimeout(() => (inputLocked = false), 180);
      return;
    }
    if (event.fromAnnualPlan) {
      run.yearStarted = true;
      save();
      render();
      setTimeout(() => (inputLocked = false), 180);
      return;
    }
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
    later: '晚年生活',
    housing: '住房',
    social: '社交',
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
  function housingRentAnnual(housing) {
    const anchor = HOUSING_ANCHORS[housing.region]?.rent || 0;
    if (housing.status !== 'renting') return 0;
    if (housing.arrangement === 'shared') return Math.round(anchor * 0.6);
    if (['partner', 'multigenerational'].includes(housing.arrangement))
      return Math.round(anchor * 1.15);
    return anchor;
  }
  function debtAnnualDue(debt) {
    if (!debt || debt.status === 'settled' || !(Number(debt.principal) > 0)) return 0;
    return Math.round(
      debt.principal * (Number(debt.rate) || 0.06) +
      debt.principal * (debt.kind === 'mortgage' ? 0.04 : 0.08)
    );
  }
  function playerHousingIncome(run) {
    const stability = run.employment.incomeStability || 'none',
      annual = stability === 'business'
        ? Math.max(0, Number(run.finance.lastIncome) || 0)
        : Math.max(0, Number(run.employment.incomeAnnualGross) || baseSalary(run));
    return { gross: annual, stability, reliable: annual * (HOUSING_RELIABILITY[stability] || 0) };
  }
  function partnerHousingIncome(run, housing = run.housing) {
    const partner = validHousingPartner(run, housing);
    if (!partner) return { gross: 0, stability: 'none', reliable: 0, partner: null };
    const stability = partner.housingIncomeStability || 'none',
      gross = Math.max(0, Number(partner.housingIncomeAnnualGross) || 0);
    return { gross, stability, reliable: gross * (HOUSING_RELIABILITY[stability] || 0), partner };
  }
  function nonHousingLivingCost(run) {
    if (
      run.age < 18 ||
      run.activity.mode === 'childhood' ||
      (run.activity.mode === 'study' && run.activity.funding === 'family')
    ) return 0;
    const base = 16000 * (run.location.mods.cost / 100),
      children = childPeople(run).filter((child) => personAge(child, run) < 18).length * 9000,
      care = run.activity.mode === 'care' ? 8000 : 0;
    return Math.max(0, Math.round(base + children + care));
  }
  function housingPaymentBreakdown(run, housing = run.housing, options = {}) {
    let gross = housingRentAnnual(housing);
    if (housing.status === 'mortgaged') {
      if (options.purchasePrincipal)
        gross = Math.round(options.purchasePrincipal * 0.08);
      else {
        const mortgage = unresolvedLiabilities(run).find((debt) => debt.kind === 'mortgage');
        gross = debtAnnualDue(mortgage);
      }
    }
    const partner = partnerHousingIncome(run, housing),
      contribution = Math.round(Math.min(gross * 0.5, partner.reliable * 0.3));
    return { gross, partnerContribution: contribution, playerDue: Math.max(0, gross - contribution) };
  }
  function housingAffordability(run, candidate = run.housing, options = {}) {
    const housing = normalizeHousing(run, { ...run.housing, ...candidate, history: run.housing.history }),
      anchor = HOUSING_ANCHORS[housing.region],
      purchase = housing.status === 'mortgaged' && !options.current,
      purchaseValue = purchase ? Number(housing.value) || Number(anchor?.purchase) || 0 : 0,
      purchasePrincipal = purchase ? Math.round(purchaseValue * 0.8) : 0,
      payment = options.ignoreDebts && options.current && housing.status === 'mortgaged'
        ? { gross: 0, partnerContribution: 0, playerDue: 0 }
        : housingPaymentBreakdown(run, housing, { purchasePrincipal }),
      playerIncome = playerHousingIncome(run),
      partnerIncome = partnerHousingIncome(run, housing),
      reliableIncome = playerIncome.reliable + partnerIncome.reliable,
      availableIncome = playerIncome.reliable + payment.partnerContribution,
      existingDebts = options.ignoreDebts
        ? 0
        : unresolvedLiabilities(run)
            .filter((debt) => !(options.current && housing.status === 'mortgaged' && debt.kind === 'mortgage'))
            .reduce((sum, debt) => sum + debtAnnualDue(debt), 0),
      cashRequired = options.current
        ? 0
        : purchase
          ? Math.round(purchaseValue * 0.23)
          : housing.status === 'renting'
            ? Math.round((housingRentAnnual(housing) / 12) * 2)
            : 0,
      remaining = availableIncome - nonHousingLivingCost(run) - existingDebts - payment.gross,
      supportedHousing = ['family', 'supported'].includes(housing.status),
      restricted = purchase && (
        run.finance.restrictedConsumption ||
        run.finance.dishonestStatus === 'listed' ||
        ['active', 'consequence'].includes(run.finance.enforcementStatus)
      ),
      secondHome = purchase && ['owned', 'mortgaged'].includes(run.housing.status),
      overseasPurchase = purchase && !anchor?.purchase,
      cashShort = run.finance.cash < cashRequired;
    let level = 'feasible', reason = null;
    if (restricted) [level, reason] = ['infeasible', '执行或消费限制仍在，不能新增购房安排'];
    else if (secondHome) [level, reason] = ['infeasible', '原有自有或按揭住房尚未处置'];
    else if (overseasPurchase) [level, reason] = ['infeasible', '本版不开放海外购房'];
    else if (cashShort) [level, reason] = ['infeasible', `现金还差 ${money(cashRequired - run.finance.cash)}`];
    else if (!supportedHousing && remaining < 0)
      [level, reason] = ['infeasible', '可靠收入扣除必要开支和债务后不足'];
    else if (!supportedHousing) {
      const unstable = ['piecework', 'project', 'business'].includes(playerIncome.stability) ||
          (payment.partnerContribution > 0 &&
            ['piecework', 'project', 'business'].includes(partnerIncome.stability)),
        ratio = availableIncome > 0 ? (existingDebts + payment.gross) / availableIncome : Infinity;
      if (remaining < Math.max(12000, availableIncome * 0.15) || ratio > 0.4 || unstable) {
        level = 'strained';
        reason = unstable
          ? '主要住房收入会随计件、项目或经营结果波动'
          : ratio > 0.4
            ? '住房与债务年度应付超过可靠收入四成'
            : '付完必要开支后的年度余量较薄';
      }
    }
    return {
      level,
      reason,
      cashRequired,
      reliableIncome: Math.round(reliableIncome),
      availableIncome: Math.round(availableIncome),
      necessaryExpense: nonHousingLivingCost(run),
      existingDebtDue: Math.round(existingDebts),
      housingDue: payment.gross,
      partnerContribution: payment.partnerContribution,
      playerHousingDue: payment.playerDue,
      remaining: Math.round(remaining),
      purchaseValue,
      purchasePrincipal,
    };
  }
  function livingCost(run) {
    if (
      run.age < 18 ||
      run.activity.mode === 'childhood' ||
      (run.activity.mode === 'study' && run.activity.funding === 'family')
    )
      return 0;
    const payment = housingPaymentBreakdown(run, run.housing);
    return nonHousingLivingCost(run) + (run.housing.status === 'renting' ? payment.playerDue : 0);
  }
  function settleLiabilities(run) {
    for (const debt of run.finance.liabilities) {
      if (debt.status === 'settled') continue;
      const interest = Math.round(debt.principal * (debt.rate || 0.06)),
        principalPayment = Math.round(debt.principal * (debt.kind === 'mortgage' ? 0.04 : 0.08)),
        due = interest + principalPayment,
        partnerContribution = debt.kind === 'mortgage' && run.housing.status === 'mortgaged'
          ? housingPaymentBreakdown(run, run.housing).partnerContribution
          : 0,
        playerDue = Math.max(0, due - partnerContribution);
      if (run.finance.cash >= playerDue) {
        run.finance.cash -= playerDue;
        debt.principal = Math.max(0, debt.principal - principalPayment);
        debt.arrears = Math.max(0, (debt.arrears || 0) - 1);
        debt.status = debt.principal === 0 ? 'settled' : 'current';
        if (
          debt.status === 'settled' &&
          debt.housingSecured &&
          run.housing.status === 'mortgaged' &&
          !unresolvedLiabilities(run).some((item) => item.housingSecured)
        )
          transitionHousing(run, {
            status: 'owned',
            kind: 'finance',
            reason: 'mortgageSettled',
          }, { sourceEventId: `annual:${run.age}` }, { skipBudget: true });
      } else {
        const paid = Math.max(0, run.finance.cash) + partnerContribution;
        run.finance.cash = 0;
        debt.principal = Math.max(0, debt.principal + interest - paid);
        debt.arrears = (debt.arrears || 0) + 1;
        debt.status = 'delinquent';
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
    if (run.later.retirement === 'semiRetired') flow = Math.round(flow * 0.55);
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
  function driftAttributes(run) {
    const marker = `attribute-drift:${run.age}`;
    if (run.usedEvents.includes(marker)) return;
    const drift = (key, delta) => {
      run.attrs[key] = clamp(run.attrs[key] + delta, 1, 10);
    };
    if (run.age >= 55 && run.age % 6 === 0) drift('physique', -1);
    if (run.health.status === 'limited' && run.age % 4 === 0) drift('physique', -1);
    if (
      run.age >= 40 &&
      run.age % 10 === 0 &&
      !(run.health.physical >= 80 && run.age < 60)
    )
      drift('looks', -1);
    if (
      run.activity.mode === 'seeking' &&
      (currentSeekingYears(run) || 0) >= 3 &&
      run.age % 3 === 0
    )
      drift('ambition', -1);
    if (Number.isFinite(run.employment.lastGrowthAge) && run.employment.lastGrowthAge === run.age)
      drift('ambition', 1);
    if (run.pressures.money >= 70 && run.pressures.body >= 50) drift('stability', -1);
    else if (run.age > 0 && run.age % 8 === 0 && run.pressures.money < 30)
      drift('stability', 1);
    if (run.pressures.loneliness >= 70 && run.age % 5 === 0) drift('social', -1);
    run.usedEvents.push(marker);
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
    if (run.employment.contractType === 'platform') run.mobility.platformYears++;
    if (run.business.status === 'operating') run.business.activeYears++;
    const coResidents = new Set(run.housing.coResidentRefs || []),
      currentCareResponsibility = run.people.some((item) => {
        if (!item.alive) return false;
        if (
          ['child', 'adoptedChild', 'stepChild'].includes(item.relation) &&
          personAge(item, run) < 18
        )
          return true;
        return (
          ['father', 'mother'].includes(item.relation) &&
          personAge(item, run) >= 70 &&
          coResidents.has(item.id)
        );
      });
    if (ongoingModifiers(run).has('reliableCarePressure') && currentCareResponsibility)
      run.pressures.family = clamp(run.pressures.family + 2, 0, 100);
    run.finance.lastIncome = income;
    run.finance.lastExpense = expense;
    run.finance.cash += income - expense;
    settleLiabilities(run);
    if (
      ['enforcement', 'consequence'].includes(run.finance.debtStage) &&
      !run.finance.reliefPending
    ) {
      run.pressures.money = clamp(run.pressures.money + 4, 0, 100);
      run.pressures.family = clamp(run.pressures.family + 2, 0, 100);
      run.pressures.body = clamp(run.pressures.body + 1, 0, 100);
      run.health.mental = clamp(run.health.mental - 1, 0, 100);
    }
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
    run.employment.tenure = ['employed', 'gig', 'selfEmployed'].includes(run.employment.status)
      ? run.employment.tenure + 1
      : 0;
    run.activity.years++;
    run.health.physical = clamp(run.health.physical, 0, 100);
    run.health.mental = clamp(run.health.mental, 0, 100);
    driftAttributes(run);
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
      run.education.nextStage = 'secondary';
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
      run.education.nextStage = 'undergraduateApplication';
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
        if (['father', 'mother'].includes(item.relation)) {
          run.relationships.lastParentLossAge = run.age;
          run.relationships.lastParentLossPersonId = item.id;
          item.diedAt = run.age;
        }
        if (item.id === run.relationships.activePartnerId) {
          run.relationships.lastPartnerId = item.id;
          run.relationships.activePartnerId = null;
          run.relationships.partnerStatus = 'widowed';
          addTag(run, 'widowed');
        }
        if (item.id === run.employment.referralPersonId && run.employment.referralStatus === 'available')
          run.employment.referralStatus = 'expired';
        cleanupHousingCoResidents(run, 'coResidentDied', `personLoss:${item.id}:${run.age}`);
        addTimeline(
          {
            id: `person_loss_${item.id}_${run.age}`,
            icon: '·',
            kind: 'consequence',
            track: 'later',
          },
          `${item.social?.displayName || (item.relation === 'father' ? '父亲' : item.relation === 'mother' ? '母亲' : item.relation === 'partner' ? '伴侣' : '一位家人')}走了。`
        );
      }
    }
    syncPeopleDerived(run);
  }
  function mortalityCause(run, source = 'age') {
    if (source === 'health') return '长期健康问题带来的风险';
    if (source === 'habit') return '长期失控带来的健康风险';
    return run.age >= 65 ? '自然衰老' : '一次未记录具体原因的突发状况';
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
    if (run.age >= run.naturalDeathAge) {
      run.deathCause = mortalityCause(run, 'age');
      if (run.age < 45) addTag(run, 'earlyDeath');
      return true;
    }
    const roll = rng(),
      totalRisk = Math.min(0.85, ageRisk + healthRisk + habitRisk);
    if (roll < totalRisk) {
      const source = roll < healthRisk
        ? 'health'
        : roll < healthRisk + habitRisk
          ? 'habit'
          : 'age';
      run.deathCause = mortalityCause(run, source);
      if (run.age < 45) addTag(run, 'earlyDeath');
      return true;
    }
    return false;
  }

  function scheduledConsequenceEvent(run, schedule) {
    const event = INDEX.event.get(schedule?.eventId),
      sourceEvent = INDEX.event.get(schedule?.sourceDecisionId),
      sourceChoice = sourceEvent?.choices?.find((choice) => choice.id === schedule?.sourceChoiceId),
      outcome = event?.choiceOutcomes?.[schedule?.memoryKey],
      active =
        schedule?.status === 'scheduled' &&
        schedule.dueAge <= run.age &&
        schedule.expiresAge >= run.age;
    if (
      !active ||
      event?.kind !== 'consequence' ||
      sourceEvent?.kind !== 'decision' ||
      !sourceChoice ||
      sourceChoice.memoryKey !== schedule.memoryKey ||
      !outcome ||
      undergraduateProceduralScheduleExpired(run, schedule, sourceEvent)
    ) {
      schedule.status = 'invalidated';
      return null;
    }
    const scheduledSocialActorInvalid = sourceEvent?.track === 'social' && (
      Object.entries(schedule.actorIds || {}).some(([slot, id]) => {
        const item = run.people.find((personItem) => personItem.id === id);
        return !item?.alive || !item.social || item.social.tie === 'ended' ||
          (CONTRACT.SOCIAL_SLOTS.includes(slot) && run.social[`${slot}PersonId`] !== id);
      }) ||
      (sourceEvent.actors || []).some((spec) => {
        const id = schedule.actorIds?.[spec.slot];
        if (!id) return !spec.optional;
        return Boolean(spec.personIdPath && getPath(run, spec.personIdPath) !== id);
      })
    );
    if (scheduledSocialActorInvalid) {
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
  function undergraduateProceduralScheduleExpired(run, schedule, sourceEvent = null) {
    const source = sourceEvent || INDEX.event.get(schedule?.sourceDecisionId),
      episode = source?.episode,
      enrolled =
        run.education.status === 'enrolled' && run.education.nextStage === 'undergraduate',
      completed = run.education.highestCompleted === 'undergraduate';
    if ((enrolled || completed) && episode?.id === 'undergraduate_application') return true;
    if (!completed) return false;
    if (episode?.id === 'undergraduate_overseas_orientation') return true;
    return (
      ['undergraduate_domestic', 'undergraduate_us', 'undergraduate_europe'].includes(episode?.id) &&
      episode.phase === 1
    );
  }
  function invalidateUndergraduateProceduralConsequences(run) {
    const enrolled =
        run.education.status === 'enrolled' && run.education.nextStage === 'undergraduate',
      completed = run.education.highestCompleted === 'undergraduate',
      application = run.episodes?.undergraduate_application;
    if ((enrolled || completed) && application?.status === 'active') {
      application.status = 'resolved';
      application.nextPhaseAge = run.age;
      application.closureReason = completed
        ? 'undergraduate_completed'
        : 'undergraduate_enrolled';
    }
    for (const schedule of run.scheduledConsequences || []) {
      if (schedule.status !== 'scheduled') continue;
      const sourceEvent = INDEX.event.get(schedule.sourceDecisionId);
      if (undergraduateProceduralScheduleExpired(run, schedule, sourceEvent))
        schedule.status = 'invalidated';
    }
  }
  function dueConsequences(run) {
    return run.scheduledConsequences
      .filter(
        (item) =>
          item.status === 'scheduled' && item.dueAge <= run.age && item.expiresAge >= run.age
      )
      .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.dueAge - b.dueAge)
      .map((schedule) => scheduledConsequenceEvent(run, schedule))
      .filter(Boolean);
  }
  function dueConsequence(run) {
    return dueConsequences(run)[0] || null;
  }
  function validPlanningPartner(run) {
    const partner = run.people.find(
      (item) => item.id === run.relationships.activePartnerId
    );
    return Boolean(
      partner?.alive &&
        partner.relation === 'partner' &&
        ['female', 'male'].includes(partner.gender) &&
        partner.gender !== run.gender &&
        ['dating', 'partnered', 'married'].includes(run.relationships.partnerStatus)
    );
  }
  function openFamilyPlanningIfEligible(run) {
    const relationships = run.relationships;
    if (
      relationships.familyPlanningOffered ||
      relationships.familyPlanningClosed ||
      run.age < 23 ||
      run.age > 39 ||
      !validPlanningPartner(run)
    ) return false;
    relationships.familyPlanningOffered = true;
    return true;
  }
  function familyPlanningStartReady(run) {
    return run.age === 39 && INDEX.kinds.decision.some(
      (event) =>
        event.episode?.id === 'becoming_parent' &&
        event.episode.phase === 1 &&
        eligible(event, run)
    );
  }
  function prepareFamilyState(run) {
    const relationships = run.relationships;
    openFamilyPlanningIfEligible(run);
    if (
      !relationships.familyPlanningOffered &&
      !relationships.familyPlanningClosed &&
      run.age > 39 &&
      validPlanningPartner(run)
    ) {
      relationships.familyPlanningOffered = true;
      relationships.familyPlanningClosed = true;
      return queueFamilyPlanningEcho(run);
    }
    if (
      !relationships.adoptionOffered &&
      run.age >= 30 &&
      !relationships.activePartnerId &&
      ['none', 'divorced', 'widowed'].includes(relationships.partnerStatus) &&
      relationships.childCount <= 1 &&
      run.health.physical >= 45 &&
      Number(run.health.careNeed || 0) < 2
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
  function claimedDesireIds(run) {
    return Object.entries(run.desires || {})
      .filter(([, desire]) => desire && typeof desire === 'object' && desire.claimed)
      .map(([id]) => id);
  }
  function opportunityMatchesClaim(event, run) {
    const claimed = new Set(claimedDesireIds(run));
    return Boolean(event.opportunity?.desires?.some((desire) => claimed.has(desire)));
  }
  function eventTextureKey(event) {
    if (event.recurrence?.key) return `recurrence:${event.recurrence.key}`;
    const text = `${event.text || ''} ${event.situation || ''}`;
    const marker = [
      '求职', '债务', '扣款', '报销', '群聊', '照护', '搬家', '住房', '排班', '加班',
      '生病', '治疗', '孩子', '伴侣', '社交', '工作',
    ].find((item) => text.includes(item));
    return marker ? `texture:${marker}` : `event:${event.id}`;
  }
  function recentTextureCount(run, event, years = 5) {
    const key = eventTextureKey(event);
    return run.timeline.filter((item) => {
      const prior = INDEX.event.get(item.id);
      return item.age >= run.age - years + 1 && prior && eventTextureKey(prior) === key;
    }).length;
  }
  function factReactionMultiplier(event, run) {
    const evidence = JSON.stringify({
        requirements: event.requirements,
        actors: event.actors,
        effects: event.runtimeEffects || event.effects,
        choices: (event.choices || []).map((choice) => ({
          requirements: choice.requirements,
          effects: choice.effects,
        })),
        text: `${event.text || ''} ${event.situation || ''} ${event.prompt || ''}`,
      }),
      familyFact = Boolean(
        run.relationships.childCount ||
        !['none', 'divorced', 'widowed'].includes(run.relationships.partnerStatus)
      ),
      debtFact = run.finance.totalDebt > 0 || run.finance.debtStage !== 'current',
      workFact = Boolean(
        ['employed', 'gig', 'selfEmployed', 'careLeave'].includes(run.employment.status) ||
        run.employment.lastJob
      ),
      healthFact = run.health.status !== 'well' || run.health.conditionSeverity >= 20;
    let multiplier = 1;
    if (
      familyFact &&
      ['housing', 'employment', 'finance'].includes(event.track) &&
      /relationships\.|child|partner|孩子|伴侣|家庭|照护/.test(evidence)
    ) multiplier *= 1.12;
    if (
      debtFact &&
      ['housing', 'health', 'partnership'].includes(event.track) &&
      /finance\.|debt|债|欠款|还款/.test(evidence)
    ) multiplier *= 1.12;
    if (
      workFact &&
      ['housing', 'finance', 'later'].includes(event.track) &&
      /employment\.|activity\.|工作|岗位|合同|排班/.test(evidence)
    ) multiplier *= 1.12;
    if (
      healthFact &&
      ['employment', 'children', 'later'].includes(event.track) &&
      /health\.|careNeed|身体|疾病|治疗|复诊|照护/.test(evidence)
    ) multiplier *= 1.12;
    return Math.min(1.35, multiplier);
  }
  const ATTR_TRACK_AFFINITY = Object.freeze({
    looks: { up: ['partnership', 'social'], down: [] },
    ambition: { up: ['business', 'employment', 'public', 'remote'], down: ['leisure'] },
    intellect: { up: ['education'], down: [] },
    social: { up: ['social', 'partnership'], down: [] },
    stability: { up: [], down: ['finance', 'habits'] },
  });
  function attributeWeightMultiplier(event, run) {
    let multiplier = 1;
    for (const [key, affinity] of Object.entries(ATTR_TRACK_AFFINITY)) {
      const offset = (run.attrs[key] - 5) * 0.04;
      if (affinity.up.includes(event.track)) multiplier *= 1 + offset;
      if (affinity.down.includes(event.track)) multiplier *= 1 - offset;
    }
    return clamp(multiplier, 0.65, 1.5);
  }
  function eventWeight(event, run = state.run, { continuity = false } = {}) {
    let weight = event.weight || 10;
    const conflict = DATA.conflicts.find((item) => item.id === run.mainConflict);
    const conflictMultiplier = CONTRACT.conflictWeightMultiplier(event.track, conflict?.desires),
      claimedMultiplier = opportunityMatchesClaim(event, run) ? 1.35 : 1;
    weight *= Math.min(1.5, conflictMultiplier * claimedMultiplier);
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
    if (continuity) {
      weight *= factReactionMultiplier(event, run);
      weight *= attributeWeightMultiplier(event, run);
      if (event.helpDelay && ongoingModifiers(run).has('delayHelpSeeking')) weight *= 1.25;
      const saturation = recentTextureCount(run, event);
      if (saturation >= 2) weight *= 0.55;
      if (
        run.timeline.at(-1) &&
        eventTextureKey(INDEX.event.get(run.timeline.at(-1).id) || run.timeline.at(-1)) ===
          eventTextureKey(event)
      ) weight *= 0.45;
    }
    if (state.meta.seen.events[event.id]) weight *= 0.75;
    return Math.max(0.1, weight);
  }
  function selectBeat(run, excludedIds = new Set()) {
    const pool = INDEX.kinds.beat.filter(
      (event) =>
        !event.id.startsWith('origin_context_') &&
        !excludedIds.has(event.id) &&
        eligible(event, run)
    );
    return weighted(pool, (event) => eventWeight(event, run, { continuity: true }));
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
  function activeEpisodeCandidates(run) {
    const candidates = [];
    for (const [id, record] of Object.entries(run.episodes || {})) {
      if (record.status !== 'active' || run.age < record.nextPhaseAge) continue;
      if (episodeClosureReason(id, record, run)) continue;
      const candidate = INDEX.kinds.decision.find(
        (event) =>
          event.episode?.id === id &&
          event.episode.phase === record.phase &&
          !run.usedEvents.includes(event.id)
      );
      if (candidate && eligible(candidate, run)) candidates.push(candidate);
    }
    return candidates;
  }
  function mandatoryDecision(run) {
    const parentLossMoment = INDEX.kinds.decision.find(
        (event) => event.id === 'decision_214' && eligible(event, run)
      ),
      pendingPregnancy = INDEX.kinds.decision.find(
        (event) =>
          event.episode?.id === 'pregnancy_decision' &&
          event.episode.role === 'start' &&
          eligible(event, run)
      ),
      globals = INDEX.kinds.decision.filter((event) => !event.episode && eligible(event, run)),
      hasClaimedDesire = Object.values(run.desires).some(
        (value) => value && typeof value === 'object' && value.claimed
      );
    if (parentLossMoment) return parentLossMoment;
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
    const stage = stageForAge(run.age);
    return decisionStageBudgets(run)[stage] || 0;
  }
  function crisisDecisionCandidates(run) {
    if (run.age - run.lastDecisionAge < 2) return [];
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
    if (!track || trackDecisionCount(run, track) >= 4) return [];
    const episodic = ['health', 'habits'].includes(track);
    return INDEX.kinds.decision.filter(
      (event) =>
        event.track === track &&
        (episodic ? event.episode?.role === 'start' : !event.episode) &&
        eligible(event, run)
    );
  }
  const URGENT_AGE_BOUND_EPISODES = new Set([
    'pregnancy_decision',
    'debt_enforcement',
    'school_entry',
    'first_job_application',
    'undergraduate_domestic',
    'undergraduate_overseas_orientation',
    'undergraduate_us',
    'undergraduate_europe',
    'postgraduate_domestic',
    'postgraduate_us',
    'postgraduate_europe',
  ]);
  function urgentAgeBoundEpisode(event, run) {
    const id = event.episode?.id;
    if (!id || !episodeCatalog(id).ageBound) return false;
    if (id === 'school_harm')
      return run.development.severeSchoolHarm && !run.development.schoolHarmResolved;
    if (id === 'becoming_parent') return run.age >= 39;
    return URGENT_AGE_BOUND_EPISODES.has(id);
  }
  function ageBoundEpisodeCandidates(run) {
    const candidates = INDEX.kinds.decision.filter(
        (event) =>
          event.episode?.role === 'start' &&
          urgentAgeBoundEpisode(event, run) &&
          !event.episode.lifecycle &&
          eligible(event, run)
      ),
      unresolvedSchoolHarm = candidates.find(
        (event) =>
          event.episode.id === 'school_harm' &&
          run.development.severeSchoolHarm &&
          !run.development.schoolHarmResolved
      ),
      familyPlanning = candidates.find((event) => event.episode.id === 'becoming_parent');
    const reserved = new Set(
      [familyPlanning, unresolvedSchoolHarm]
        .filter(Boolean)
        .map((event) => event.id)
    );
    return familyPlanning
      ? [familyPlanning]
      : unresolvedSchoolHarm
          ? [unresolvedSchoolHarm]
          : candidates.filter((event) => !reserved.has(event.id));
  }
  function educationGatewayDecision(run) {
    return (
      INDEX.kinds.decision.find(
        (event) =>
          event.episode?.role === 'start' &&
          ['secondary_diversion', 'undergraduate_application'].includes(event.episode.id) &&
          eligible(event, run)
      ) || null
    );
  }
  function deferEpisodesForEducationGateway(run, event) {
    if (!['secondary_diversion', 'undergraduate_application'].includes(event.episode?.id)) return;
    for (const record of Object.values(run.episodes || {})) {
      if (record.status !== 'active' || run.age < record.nextPhaseAge) continue;
      record.nextPhaseAge = run.age + 1;
      if (Number.isFinite(record.deadlineAge)) record.deadlineAge += 1;
    }
  }
  function ordinaryDecisionCandidates(run) {
    return INDEX.kinds.decision.filter((event) => {
      if (!eligible(event, run) || event.track === 'identity') return false;
      if (!event.episode) return true;
      if (event.episode.role !== 'start') return false;
      if (event.episode.lifecycle) return false;
      if (event.episode.id === 'pregnancy_decision') return false;
      if (['secondary_diversion', 'undergraduate_application'].includes(event.episode.id))
        return false;
      return !urgentAgeBoundEpisode(event, run);
    });
  }
  function lifecycleDecisionCandidates(run) {
    return INDEX.kinds.decision.filter(
      (event) =>
        event.episode?.role === 'start' &&
        event.episode.lifecycle &&
        eligible(event, run)
    );
  }
  function lifecycleDecisionDue(event, run) {
    const lifecycle = event.episode?.lifecycle;
    if (!lifecycle) return false;
    if (lifecycle.kind === 'workTransition')
      return run.age >= lifecycleCheckpointAge(run, lifecycle);
    if (lifecycle.relativeTo === 'firstJobFailureOrDecline') {
      const failureAge = firstJobFailureAge(run);
      return failureAge !== null && run.age >= failureAge + (lifecycle.minYearsAfter || 0);
    }
    return false;
  }
  function protectionAvailable(run) {
    if (!claimedDesireIds(run).length) return false;
    let claimIndex = -1;
    for (let index = run.decisionHistory.length - 1; index >= 0; index--) {
      if (['decision_161', 'decision_162'].includes(run.decisionHistory[index].eventId)) {
        claimIndex = index;
        break;
      }
    }
    if (claimIndex < 0) return false;
    return !run.decisionHistory.slice(claimIndex + 1).some((record) => {
      const event = INDEX.event.get(record.eventId);
      return event?.opportunity?.response === 'protect' && opportunityMatchesClaim(event, run);
    });
  }
  function decisionCandidateLayers(run) {
    const ordinary = ordinaryDecisionCandidates(run),
      lifecycle = lifecycleDecisionCandidates(run),
      protectedCandidates = protectionAvailable(run)
        ? ordinary.filter(
            (event) =>
              event.opportunity?.response === 'protect' && opportunityMatchesClaim(event, run)
          )
        : [];
    return {
      mandatory: [mandatoryDecision(run)].filter(Boolean),
      educationGateway: [educationGatewayDecision(run)].filter(Boolean),
      activeEpisode: activeEpisodeCandidates(run),
      ageBound: ageBoundEpisodeCandidates(run),
      dueLifecycle: lifecycle.filter((event) => lifecycleDecisionDue(event, run)),
      crisis: crisisDecisionCandidates(run),
      protected: protectedCandidates,
      matureLifecycle: lifecycle.filter((event) => !lifecycleDecisionDue(event, run)),
      ordinary,
    };
  }
  const DECISION_LAYER_ORDER = Object.freeze([
    'mandatory',
    'educationGateway',
    'activeEpisode',
    'ageBound',
    'dueLifecycle',
    'crisis',
    'protected',
    'matureLifecycle',
    'ordinary',
  ]);
  const PROTECTED_OVER_LIMIT_LAYER_ORDER = Object.freeze([
    'mandatory',
    'educationGateway',
    'activeEpisode',
    'ageBound',
    'dueLifecycle',
    'protected',
    'matureLifecycle',
  ]);
  function decisionQuotaOpen(run) {
    const stage = stageForAge(run.age);
    if (!Object.hasOwn(DECISION_DENSITY, stage)) return false;
    return (run.stageDecisionCounts[stage] || 0) < decisionAllowance(run);
  }
  function lifecycleOverrideAvailable(run) {
    const stage = stageForAge(run.age);
    const limit = ['later', 'elder'].includes(stage) ? 2 : 1;
    return (
      Object.hasOwn(DECISION_DENSITY, stage) &&
      (run.lifecycleStageOverrides[stage] || 0) < limit
    );
  }
  function selectedDecisionLayer(run) {
    const layers = decisionCandidateLayers(run),
      layerOrder = decisionQuotaOpen(run)
        ? DECISION_LAYER_ORDER
        : PROTECTED_OVER_LIMIT_LAYER_ORDER.filter(
            (key) => key !== 'matureLifecycle' || lifecycleOverrideAvailable(run)
          );
    return { layers, key: layerOrder.find((item) => layers[item].length) || null };
  }
  function startDecision(run, { preview = false, rollUnit = null } = {}) {
    const selection = selectedDecisionLayer(run),
      layers = selection.layers,
      selectedLayer = selection.key,
      candidates = selectedLayer ? layers[selectedLayer] : [];
    if (!candidates.length) return null;
    const weightFn = (event) => eventWeight(event, run, { continuity: selectedLayer === 'ordinary' });
    if (Number.isFinite(rollUnit)) return weightedAt(candidates, weightFn, rollUnit);
    return preview ? weightedAt(candidates, weightFn, peekRng(run)) : weighted(candidates, weightFn);
  }
  function shouldOfferDecision(run) {
    const layers = decisionCandidateLayers(run);
    if (
      ['mandatory', 'educationGateway', 'activeEpisode', 'ageBound', 'dueLifecycle']
        .some((key) => layers[key].length)
    )
      return true;
    if (!decisionQuotaOpen(run)) {
      if (layers.matureLifecycle.length && lifecycleOverrideAvailable(run)) return true;
      if (run.age - run.lastDecisionAge < 2) return false;
      return layers.protected.length > 0;
    }
    if (layers.crisis.length) return true;
    if (layers.matureLifecycle.length) return true;
    if (run.age - run.lastDecisionAge < 2) return false;
    if (layers.protected.length) return true;
    if (!layers.ordinary.length) return false;
    const stage = stageForAge(run.age),
      remaining = Math.max(1, (DATA.stages[stage]?.[1] || run.age) - run.age + 1),
      needed = Math.max(0, decisionAllowance(run) - (run.stageDecisionCounts[stage] || 0)),
      threshold = Math.min(remaining > 20 ? 0.9 : 0.72, (needed / remaining) * 1.25),
      offerRoll = stable(run.seed, `decision-offer:${run.age}`, 10000) / 10000;
    return offerRoll < threshold;
  }

  function addTimeline(event, text, variant = 'event') {
    const run = state.run;
    const row = {
      id: event.id,
      age: run.age,
      year: 2026 + run.age,
      kind: event.kind,
      track: event.track,
      icon: event.icon || '·',
      text,
      variant,
    };
    run.timeline.push(row);
    state.meta.seen.events[event.id] = (state.meta.seen.events[event.id] || 0) + 1;
    return row;
  }
  function recordDecisionBudgetUse(run, event) {
    const stage = stageForAge(run.age),
      count = run.stageDecisionCounts[stage] || 0;
    if (
      event.episode?.role === 'start' &&
      event.episode.lifecycle &&
      count >= decisionAllowance(run)
    ) run.lifecycleStageOverrides[stage] = (run.lifecycleStageOverrides[stage] || 0) + 1;
    run.stageDecisionCounts[stage] = count + 1;
  }
  function revealEvent(event) {
    const run = state.run;
    const result = applyCommands(event.runtimeEffects || event.effects || [], {
      ...event,
      ...actorCommandContext(event, run),
    });
    if (!result.ok) {
      showToast(`这一年没有结算：${result.error}`);
      save();
      render();
      return;
    }
    for (const tag of event.runtimeTags || []) addTag(run, tag);
    addTimeline(event, event.runtimeText || event.text);
    if (
      Array.isArray(event.attitudes) &&
      event.attitudes.length === 2 &&
      run.age >= 6 &&
      !run.outcomeTags[`attitude-event:${event.id}`]
    )
      run.pendingAttitude = event.id;
    if (!event.recurrence) run.usedEvents.push(event.id);
    if (event.kind === 'secret') run.secretRevealed = true;
    if (event.scheduleId) {
      const schedule = run.scheduledConsequences.find((item) => item.id === event.scheduleId);
      if (schedule) schedule.status = 'used';
      run.usedConsequences.push(event.scheduleId);
    }
    save();
    render();
  }
  function currentAgeTimelineCount(run) {
    return run.timeline.filter((item) => item.age === run.age).length;
  }
  function annualTargetSize(obligationCount) {
    return obligationCount >= 2 ? 3 : obligationCount === 1 ? 2 : 1;
  }
  function selectBeatAt(run, excludedIds, rollUnit) {
    const pool = INDEX.kinds.beat.filter(
      (event) =>
        !event.id.startsWith('origin_context_') &&
        !excludedIds.has(event.id) &&
        eligible(event, run)
    );
    return weightedAt(pool, (event) => eventWeight(event, run, { continuity: true }), rollUnit);
  }
  function planYearQueue(run) {
    const planToken = Math.floor(rng() * 0xffffffff),
      planRoll = (label) =>
        stable(run.seed, `year-plan:${run.age}:${planToken}:${label}`, 1000000) / 1000000,
      closureFacts = pendingEpisodeClosures(run).map((closure) =>
        plannedEpisodeClosure(run, closure)
      ),
      facts = [...closureFacts, ...dueConsequences(run), dueSecret(run)].filter(Boolean),
      origin = originMilestone(run),
      projectedDecision = shouldOfferDecision(run)
        ? startDecision(run, { rollUnit: planRoll('decision') })
        : null,
      existingCount = currentAgeTimelineCount(run),
      obligationCount =
        existingCount + facts.length + (origin ? 1 : 0) + (projectedDecision ? 1 : 0),
      targetSize = annualTargetSize(obligationCount),
      planned = [...facts];
    if (origin) planned.unshift(origin);
    if (projectedDecision)
      planned.push({ ...projectedDecision, annualRole: 'decision', annualPlanToken: planToken });

    const openSlots = () => targetSize - existingCount - planned.length;
    const swanRate = blackSwanRate(run);
    if (
      openSlots() > 0 &&
      run.swanCount < 3 &&
      run.age - run.lastSwanAge >= 10 &&
      planRoll('swan-chance') < swanRate
    ) {
      const swan = weightedAt(
        INDEX.kinds.blackSwan.filter((event) => eligible(event, run)),
        (event) => eventWeight(event, run),
        planRoll('swan-pick')
      );
      if (swan) {
        planned.push(swan);
        run.swanCount++;
        run.lastSwanAge = run.age;
      }
    }

    const excludedIds = new Set(planned.map((event) => event.id));
    let beatIndex = 0;
    while (openSlots() > 0) {
      const beat = selectBeatAt(run, excludedIds, planRoll(`beat:${beatIndex++}`));
      if (!beat) break;
      planned.push(beat);
      excludedIds.add(beat.id);
    }
    if (!planned.length && existingCount === 0) {
      const stage = stageForAge(run.age),
        lines = [...(QUIET_YEAR_LINES[stage] || QUIET_YEAR_LINES.default)];
      if (
        run.previousLifeHint &&
        !run.usedPreviousLifeHint &&
        ['establishment', 'later'].includes(stage)
      ) {
        lines.push(
          `闲聊时有人提起${run.previousLifeHint.familyName}，讲到一半说：那都是上一辈子的事了。`
        );
      }
      const quietText = lines[stable(run.seed, `quiet:${run.age}`, lines.length)];
      if (quietText.includes('上一辈子的事了'))
        run.usedPreviousLifeHint = true;
      planned.push({
        id: `quiet_${run.age}`,
        kind: 'beat',
        track: 'ordinary',
        icon: '·',
        text: quietText,
        effects: [],
      });
    }
    return {
      queue: planned,
      kind: targetSize === 1 ? 'quiet' : targetSize === 2 ? 'progression' : 'collision',
      targetSize,
      existingCount,
      projectedDecisionId: projectedDecision?.id || null,
      factIds: facts.map((event) => event.id),
    };
  }

  function blackSwanRate(run) {
    const baseRate = run.age < 18 ? 0.004 : run.age < 65 ? 0.008 : 0.006;
    return run.swanCount === 0 && run.age >= run.swanPityAge ? 0.06 : baseRate;
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
    if (run.finance.reliefPending && queueDebtRelief(run, false)) return true;
    run.yearStarted = true;
    run.yearQueue = [];
    run.yearQueue = planYearQueue(run).queue;
    const dueCard = [0, 18, 35, 55].find((age) => run.age >= age && !run.cardAges.includes(age));
    if (dueCard !== undefined) {
      startCardDraw(dueCard);
      return true;
    }
    return false;
  }
  function launchPlannedDecision(event) {
    const run = state.run,
      planned = { ...event, fromAnnualPlan: true };
    delete planned.annualRole;
    delete planned.annualPlanToken;
    if (!eligible(planned, run)) return false;
    deferEpisodesForEducationGateway(run, planned);
    if (planned.episode) startEpisodePhase(planned);
    else {
      run.currentDecision = planned;
      run.phase = 'decision';
      save();
      render();
    }
    return true;
  }
  function currentQueuedEvent(run, planned) {
    if (!planned || typeof planned.id !== 'string') return null;
    if (planned.scheduleId) {
      const schedule = run.scheduledConsequences.find((item) => item.id === planned.scheduleId);
      return schedule ? scheduledConsequenceEvent(run, schedule) : null;
    }
    if (planned.id.startsWith('quiet_') && planned.kind === 'beat') return planned;
    const current = INDEX.event.get(planned.id);
    if (!current) return null;
    const refreshed = {
      ...current,
      ...(planned.annualRole ? { annualRole: planned.annualRole } : {}),
      ...(planned.annualPlanToken ? { annualPlanToken: planned.annualPlanToken } : {}),
    };
    return eligible(refreshed, run) ? refreshed : null;
  }
  function queueSameAgeFollowup(run, allowed = {}) {
    const candidates = INDEX.kinds.decision.filter((event) => {
      if (!eligible(event, run)) return false;
      if (
        allowed.educationEpisodeId &&
        event.track === 'education' &&
        event.episode?.id === allowed.educationEpisodeId
      ) return true;
      if (allowed.pregnancy && event.episode?.id === 'pregnancy_decision') return true;
      return Boolean(
        allowed.family &&
        event.episode?.id === 'becoming_parent' &&
        event.episode.role === 'start'
      );
    });
    if (!candidates.length) return false;
    const roll = stable(
        run.seed,
        `same-age-followup:${run.age}:${run.decisionHistory.length}`,
        1000000
      ) / 1000000,
      event = weightedAt(candidates, (item) => eventWeight(item, run), roll);
    run.yearQueue.unshift({
      ...event,
      annualRole: 'decision',
      annualPlanToken: `followup:${run.decisionHistory.length}`,
    });
    return true;
  }
  function finishYear() {
    const run = state.run;
    settleYear(run);
    if (run.finance.reliefPending) return queueDebtRelief(run, true);
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
      if (run.pendingAttitude) {
        run.outcomeTags[`attitude-event:${run.pendingAttitude}`] = 1;
        run.pendingAttitude = null;
        save();
      }
      for (let guard = 0; guard < 6; guard++) {
        if (!run.yearStarted && beginYear()) return true;
        if (run.phase !== 'playing') return true;
        if (run.yearQueue.length) {
          const queued = run.yearQueue.shift();
          if (queued.annualRole === 'episodeClosure') {
            if (launchPlannedEpisodeClosure(queued)) return true;
            save();
            continue;
          }
          const planned = currentQueuedEvent(run, queued);
          if (!planned) {
            save();
            continue;
          }
          if (planned.annualRole === 'decision') {
            if (launchPlannedDecision(planned)) return true;
            save();
            continue;
          }
          revealEvent(planned);
          return true;
        }
        if (finishYear()) return true;
      }
      return false;
    } finally {
      if (!force) setTimeout(() => (inputLocked = false), 150);
    }
  }

  function chooseAttitude(key) {
    const run = state.run,
      eventId = run?.pendingAttitude,
      event = eventId ? INDEX.event.get(eventId) : null,
      attitude = event?.attitudes?.find((item) => item.key === key);
    if (!event || !attitude || run.outcomeTags[`attitude-event:${eventId}`]) return false;
    const result = applyCommands(attitude.effects || [], {
      eventId,
      source: 'attitude',
    });
    if (!result.ok) {
      showToast(`这句话没有结算：${result.error}`);
      return false;
    }
    addTag(run, `attitude:${attitude.key}`);
    run.outcomeTags[`attitude-event:${eventId}`] = 1;
    const row = [...run.timeline].reverse().find((item) => item.id === eventId && !item.attitude);
    if (row) row.attitude = { key: attitude.key, text: attitude.text };
    run.pendingAttitude = null;
    save();
    render();
    return true;
  }

  function startCardDraw(age) {
    const pool = DATA.cards.filter(
      (card) =>
        card.drawAge === age &&
        !state.run.cards.includes(card.id) &&
        requirementsMatch(card.requirements, state.run)
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
      card = INDEX.cards.get(id),
      resumesStartedYear = run.yearStarted;
    if (!card || run.phase !== 'card') return;
    const result = applyCommands(card.effects, card);
    if (!result.ok) {
      showToast(`卡牌没有结算：${result.error}`);
      return;
    }
    run.cards.push(card.id);
    run.cardAges.push(run.cardAge);
    addTimeline(
      { id: card.id, kind: 'card', track: 'identity', icon: '◇' },
      `你有了“${card.displayName}”：${card.text}`,
      'chosen'
    );
    run.phase = run.cardAge === 0 ? 'playing' : 'playing';
    run.cardOptions = [];
    if (!resumesStartedYear) run.yearStarted = false;
    save();
    render();
  }

  function unlockCodex(finalLife = false) {
    const run = state.run,
      recordedTags = new Set(
        (run.decisionHistory || []).flatMap((record) => record.outcomeTags || [])
      );
    const hasLateSoloFriend =
      run.age >= 60 &&
      run.housing.arrangement === 'solo' &&
      (run.outcomeTags['social:reconnect:close'] ||
        run.outcomeTags['social:support:showedUp']) &&
      run.people.some(
        (item) =>
          item.alive &&
          item.social &&
          ['friend', 'close'].includes(item.social.tie)
      );
    if (hasLateSoloFriend) run.outcomeTags['social:soloLateFriend'] = 1;
    if (finalLife && stayedRooted(run)) run.outcomeTags.stayedRooted = 1;
    for (const entry of DATA.codex) {
      if (state.meta.codex.includes(entry.id)) continue;
      const rule = entry.unlockRules || {},
        tagOk = rule.outcomeTagsAny?.some((tag) => run.outcomeTags[tag] || recordedTags.has(tag)),
        anyOk = rule.stateAny?.some((item) => predicateMatches(item, run)),
        allOk = rule.stateAll?.every((item) => predicateMatches(item, run));
      if (tagOk || anyOk || allOk) state.meta.codex.push(entry.id);
    }
  }

  function stayedRooted(run) {
    const migrated = (run.housing.history || []).some(
      (item) => item.state?.region && item.state.region !== run.location.id
    );
    return (
      run.age >= 70 &&
      run.mobility.lastOverseasSystem === 'none' &&
      !migrated &&
      (run.housing.history || []).every(
        (item) => !item.state?.region || item.state.region === run.location.id
      )
    );
  }

  function decisionChoice(run, record) {
    return INDEX.event
      .get(record.eventId)
      ?.choices?.find((choice) => choice.id === record.choiceId);
  }

  function hasChoiceEvidence(run, predicate) {
    return (run.decisionHistory || []).some((record) => {
      const choice = decisionChoice(run, record);
      return Boolean(choice && predicate(choice, record));
    });
  }

  function hasCreationEvidence(run) {
    return (
      Boolean(run.outcomeTags['card:creativity']) ||
      (run.cards || []).some((id) =>
        (INDEX.cards.get(id)?.effects || []).some(
          (command) =>
            command.type === 'add' &&
            command.target === 'desires.creation.fulfillment' &&
            Number(command.value) > 0
        )
      )
    );
  }

  function finalSignals(run) {
    const signals = new Set(
        Object.entries(run.outcomeTags)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
      ),
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
    const socialSignal = socialEndingSignal(run),
      decisionRecords = run.decisionHistory || [],
      overseasNow = ['us', 'europe'].includes(run.housing.region),
      repaidDebt = decisionRecords.some((item) =>
        (item.outcomeTags || []).some((tag) =>
          ['finance:repaid', 'finance:restructured'].includes(tag)
        )
      );
    if (
      run.development.careLoad >= 40 ||
      decisionRecords.some((item) =>
        (item.outcomeTags || []).some((tag) =>
          ['caregiver:deliberate', 'care:gave', 'children:care'].includes(tag)
        )
      )
    )
      signals.add('careGiver');
    if (run.mobility.lastOverseasSystem !== 'none' && overseasNow) signals.add('overseasSettled');
    if (run.mobility.platformYears >= 10) signals.add('platformDecade');
    if (
      decisionRecords.some(
        (item) =>
          item.age >= 30 &&
          INDEX.event.get(item.eventId)?.episode?.id === 'adult_reeducation' &&
          (item.outcomeTags || []).some((tag) =>
            [
              'education:enrolled',
              'education:reduced',
              'education:completed',
              'education:low_intensity',
              'education:non_degree',
            ].includes(tag)
          )
      )
    )
      signals.add('lateStudy');
    if (
      run.relationships.parenthoodIntent === 'childfree' &&
      run.relationships.childCount === 0 &&
      decisionRecords.some((item) =>
        (item.outcomeTags || []).some((tag) =>
          tag === 'children:childfree'
        )
      )
    )
      signals.add('deliberateSolo');
    if (repaidDebt && run.finance.totalDebt === 0) signals.add('debtCleared');
    const managedChoice = hasChoiceEvidence(run, (choice) =>
        (choice.outcomeTags || []).some((tag) =>
          ['health:managed', 'health:negotiated'].includes(tag)
        )
      ),
      creationChoice = hasCreationEvidence(run);
    if (
      run.health.status === 'managed' &&
      run.health.conditionSeverity > 0 &&
      run.age >= 70 &&
      managedChoice
    )
      signals.add('chronicCompanion');
    if (run.desires.creation.fulfillment >= 65 && creationChoice)
      signals.add('creationFulfilled');
    if (socialSignal.kind === 'activeSolitude') signals.add('activeSolitude');
    if (socialSignal.kind === 'closeFriend') signals.add('closeFriend');
    if (run.age >= 100) signals.add('centenarian');
    if (stayedRooted(run)) signals.add('stayedRooted');
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
            profile.id !== fallback.id &&
            profile.id !== 'earlyExit' &&
            profile.signals.every((signal) => signals.has(signal))
        )
        .sort(
          (a, b) =>
            (rarity[b.rarity] || 0) - (rarity[a.rarity] || 0) ||
            stable(run.seed, a.id, 100) - stable(run.seed, b.id, 100)
        );
    if (exact.length) return exact[0];
    const earlyExit = DATA.endingProfiles.find((profile) => profile.id === 'earlyExit');
    if (earlyExit?.signals.every((signal) => signals.has(signal))) return earlyExit;
    return fallback;
  }
  function latestSocialIntent(run) {
    for (let index = (run.decisionHistory || []).length - 1; index >= 0; index--) {
      const tags = run.decisionHistory[index]?.outcomeTags || [];
      if (tags.includes('social:intent:solitude')) return 'solitude';
      if (tags.includes('social:intent:connect')) return 'connect';
    }
    return null;
  }
  function socialEndingSignal(run) {
    const people = CONTRACT.SOCIAL_SLOTS
        .map((slot) => run.people.find((item) => item.id === run.social?.[`${slot}PersonId`]))
        .filter(Boolean),
      close = people.some((item) => item.social?.tie === 'close'),
      available = people.some(
        (item) => item.alive && ['friend', 'close'].includes(item.social?.tie)
      ),
      intent = latestSocialIntent(run),
      loneliness = Number(run.pressures.loneliness) || 0;
    if (close) return { kind: 'closeFriend', adjustment: 12, floor: 0 };
    if (intent === 'connect' && !available && loneliness >= 50)
      return { kind: 'passiveLoneliness', adjustment: -12, ceiling: 38 };
    if (intent === 'solitude' && loneliness < 40)
      return { kind: 'activeSolitude', adjustment: 0, floor: 55 };
    if (people.filter((item) => item.alive && item.social?.tie !== 'ended').length >= 2 && run.relationships.network >= 65)
      return { kind: 'broadNetwork', adjustment: 6, floor: 0 };
    return { kind: 'neutral', adjustment: 0, floor: 0 };
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
    let support =
        (run.relationships.network +
          run.relationships.originBond +
          Math.max(0, run.relationships.partnerBond) +
          Math.max(0, run.relationships.childBond)) / 4;
    const socialSignal = socialEndingSignal(run);
    support += socialSignal.adjustment;
    if (socialSignal.floor) support = Math.max(socialSignal.floor, support);
    if (socialSignal.ceiling) support = Math.min(socialSignal.ceiling, support);
    const
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
  function currentSeekingYears(run) {
    if (run.activity.mode !== 'seeking') return null;
    let sinceAge = null;
    for (const item of run.decisionHistory || []) {
      const before = item.stateBefore?.activity, after = item.stateAfter?.activity;
      if (!after) continue;
      if (after === 'seeking' && before !== 'seeking') sinceAge = item.age;
      else if (after !== 'seeking') sinceAge = null;
    }
    if (sinceAge === null) return null;
    return Math.max(0, run.age - sinceAge);
  }
  function pivotalFacts(run) {
    const candidates = (run.decisionHistory || []).map((item) => {
      const milestone = decisionMilestone(item);
      return {
        age: item.age,
        title: item.choice,
        result: item.result,
        source: item.eventId,
        episodeKey: milestone.episodeKey,
        category: milestone.category,
        score: milestone.score,
      };
    });
    for (const item of run.timeline || []) {
      if (!['blackSwan', 'secret', 'consequence'].includes(item.kind)) continue;
      const isLoss = item.id.startsWith('person_loss_'),
        isBirth = item.id.startsWith('person_birth_'),
        event = INDEX.event.get(item.id);
      candidates.push({
        age: item.age,
        title:
          isLoss || isBirth
            ? item.text
            : item.kind === 'secret'
              ? '家里的旧事被说开'
              : item.kind === 'blackSwan'
                ? '没有预告的一天'
                : '以前的选择有了后果',
        result:
          isLoss
            ? '从那以后，家里少了这个人。'
            : isBirth
              ? '从那以后，家里多了这个人。'
              : item.text,
        source: item.id,
        episodeKey: event?.sourceDecisionId || item.id,
        category: isLoss ? 'person-loss' : isBirth ? 'person-birth' : item.kind,
        score: isLoss ? 76 : isBirth ? 68 : item.kind === 'blackSwan' ? 66 : 54,
      });
    }
    const working = ['employed', 'gig', 'selfEmployed'].includes(run.employment.status),
      seekingYears = currentSeekingYears(run),
      longFirstJobSearch =
        run.activity.mode === 'seeking' &&
        run.employment.firstJobAge === null &&
        run.employment.firstJobOutcome === 'longSearch';
    if (!working && ((seekingYears !== null && seekingYears >= 3) || longFirstJobSearch))
      candidates.push({
        age: run.age,
        title:
          seekingYears !== null && seekingYears >= 3
            ? `求职拖了 ${seekingYears} 年`
            : '稳定工作一直没有落下来',
        result: '到这一生结束时，稳定工作仍没有落下来。',
        source: 'final-long-unemployment',
        episodeKey: 'final-long-unemployment',
        category: 'employment',
        score: 78,
      });
    if (run.finance.totalDebt > Math.max(50000, run.finance.lastIncome || 0))
      candidates.push({
        age: run.age,
        title: `还有 ${money(run.finance.totalDebt)} 债务没有清完`,
        result: '这些账跟着你走到了这一生结束。',
        source: 'final-debt',
        episodeKey: 'final-debt',
        category: 'finance',
        score: 82,
      });
    if (run.finance.housingDisposition === 'disposed')
      candidates.push({
        age: run.age,
        title: '原来的住房已经被处置',
        result: `走到最后，你住在${housingLabel(run)}。`,
        source: 'final-housing-disposition',
        episodeKey: 'final-housing-disposition',
        category: 'housing',
        score: 74,
      });
    if (run.later.retirement !== 'none')
      candidates.push({
        age: run.age,
        title: '工作走到了晚年的安排',
        result: laterStatusLabel(run),
        source: 'final-retirement',
        episodeKey: 'retirement_transition',
        category: 'retirement',
        score: 70,
      });
    if (run.health.status === 'limited' || run.health.conditionSeverity >= 35)
      candidates.push({
        age: run.age,
        title: '身体的限制留了下来',
        result: healthStatusLabel(run),
        source: 'final-health',
        episodeKey: 'final-health',
        category: 'health',
        score: 72,
      });

    const selected = [], usedEpisodes = new Set(), usedCategories = new Set(), eraCounts = new Map(),
      era = (age) => age < 25 ? 'early' : age < 55 ? 'middle' : 'late';
    for (const item of candidates.sort((a, b) => b.score - a.score || b.age - a.age)) {
      if (selected.length >= 3) break;
      const itemEra = era(item.age);
      if (
        usedEpisodes.has(item.episodeKey) ||
        usedCategories.has(item.category) ||
        (eraCounts.get(itemEra) || 0) >= 2
      )
        continue;
      selected.push(item);
      usedEpisodes.add(item.episodeKey);
      usedCategories.add(item.category);
      eraCounts.set(itemEra, (eraCounts.get(itemEra) || 0) + 1);
    }
    const decisions = selected.map(({ age, title, result, source }) => ({
      age,
      title,
      result,
      source,
    }));
    const used = new Set(decisions.map((item) => `${item.age}:${item.source}`));
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
        result: `这一生停在 ${run.age} 岁。日历没有再往后翻。`,
        source: 'death',
      },
    ];
    for (const item of realFallbacks) {
      if (decisions.length >= 3) break;
      const itemEra = era(item.age),
        earlyDeathCompletion = item.source === 'death' && run.age < 25;
      if (
        !used.has(`${item.age}:${item.source}`) &&
        (earlyDeathCompletion || (eraCounts.get(itemEra) || 0) < 2)
      ) {
        decisions.push(item);
        eraCounts.set(itemEra, (eraCounts.get(itemEra) || 0) + 1);
      }
    }
    return decisions.slice(0, 3).sort((a, b) => a.age - b.age);
  }
  function decisionMilestone(item) {
    const event = INDEX.event.get(item.eventId),
      before = item.stateBefore || {},
      after = item.stateAfter || {},
      tags = item.outcomeTags || [],
      episodeKey = event?.episode?.id || item.eventId;
    let category = event?.track || 'ordinary', score = Math.min(28, Number(item.impact || 0));
    if (before.children !== after.children) ({ category, score } = { category: 'parenthood', score: 82 });
    else if (before.partner !== after.partner) ({ category, score } = { category: 'partnership', score: 76 });
    else if (item.housingChoiceKind) ({ category, score } = { category: 'housing', score: 74 });
    else if (event?.episode?.id === 'retirement_transition')
      ({ category, score } = { category: 'retirement', score: 72 });
    else if (event?.episode?.id === 'career_growth')
      ({ category, score } = { category: 'career-growth', score: 74 });
    else if (before.employment !== after.employment || runFirstJobAt(item))
      ({ category, score } = { category: 'employment', score: 72 });
    else if (event?.track === 'finance' || tags.some((tag) => tag.startsWith('finance:')))
      ({ category, score } = { category: 'finance', score: 62 });
    else if (event?.track === 'health' || before.health !== after.health)
      ({ category, score } = { category: 'health', score: 60 });
    else if (event?.track === 'business') ({ category, score } = { category: 'business', score: 60 });
    else if (event?.track === 'remote') ({ category, score } = { category: 'mobility', score: 58 });
    else if (event?.episode) score += 18;
    if (item.age >= 45) score += 5;
    if (item.age >= 60) score += 3;
    return { category, score, episodeKey };
  }
  function runFirstJobAt(item) {
    return item.stateBefore?.employment !== item.stateAfter?.employment &&
      ['employed', 'gig', 'selfEmployed'].includes(item.stateAfter?.employment);
  }
  function ordinaryEndingSummary(run, profileSummary, facts = pivotalFacts(run)) {
    const working = ['employed', 'gig', 'selfEmployed'].includes(run.employment.status);
    let primary = profileSummary;
    if (run.finance.totalDebt > 0 && run.activity.mode === 'retired')
      primary = `退休以后，仍有 ${money(run.finance.totalDebt)} 债务没有清完。`;
    else if (
      run.finance.totalDebt > 0 &&
      run.activity.mode === 'seeking' &&
      run.employment.firstJobAge === null
    )
      primary = `走到最后，稳定工作仍没有落下来，未清债务还有 ${money(run.finance.totalDebt)}。`;
    else if (run.finance.totalDebt > 0)
      primary = `走到最后，仍有 ${money(run.finance.totalDebt)} 债务没有清完。`;
    else if (run.relationships.childCount)
      primary = `这一生有了孩子。最后的住处是${housingLabel(run)}。`;
    else if (run.health.status !== 'well' || run.health.conditionSeverity > 0)
      primary = `走到最后，身体仍是${healthStatusLabel(run)}。`;
    else if (working) primary = `走到最后，你仍在做${employmentDetailLabel(run)}。`;
    const distinguishingFact = facts.find(
      (item) => !['origin', 'origin-household', 'death'].includes(item.source)
    );
    return distinguishingFact && !primary.includes(distinguishingFact.title)
      ? `${primary.replace(/。$/, '')}；这一生还经历过“${distinguishingFact.title}”。`
      : primary;
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
      decisionTracks = new Set(
        (run.decisionHistory || []).map((item) => INDEX.event.get(item.eventId)?.track)
      ),
      items = Object.entries(historical)
        .map(([track, label]) => ({
          label,
          count: Object.keys(run.outcomeTags)
            .filter((tag) => tag.startsWith(`${track}:`))
            .reduce((sum, tag) => sum + run.outcomeTags[tag], 0),
          track,
        }))
        .filter((item) => item.count > 0 && decisionTracks.has(item.track));
    if (run.finance.hasArrears || run.finance.totalDebt > Math.max(50000, run.finance.lastIncome))
      items.push({ label: '债务人生', count: 100 });
    else if (
      (run.outcomeTags['finance:repaid'] || run.outcomeTags['finance:restructured']) &&
      (run.decisionHistory || []).some((item) =>
        (item.outcomeTags || []).some((tag) =>
          ['finance:repaid', 'finance:restructured'].includes(tag)
        )
      )
    )
      items.push({ label: '财务重建', count: 60 });
    if (
      run.health.status === 'limited' ||
      run.health.conditionSeverity >= 35 ||
      run.health.physical < 35
    )
      items.push({ label: '健康危机', count: 100 });
    else if (run.health.status === 'managed' && run.health.conditionSeverity > 0)
      items.push({ label: '与健康问题共处', count: 55 });
    else if (
      run.outcomeTags['health:recovered'] &&
      (run.decisionHistory || []).some((item) =>
        (item.outcomeTags || []).includes('health:recovered')
      )
    )
      items.push({ label: '康复者', count: 60 });
    const socialSignal = socialEndingSignal(run);
    if (socialSignal.kind === 'closeFriend') items.push({ label: '有过真朋友', count: 70 });
    else if (socialSignal.kind === 'broadNetwork') items.push({ label: '人脉很广', count: 55 });
    else if (socialSignal.kind === 'activeSolitude') items.push({ label: '主动独处', count: 55 });
    else if (socialSignal.kind === 'passiveLoneliness') items.push({ label: '无人可找', count: 70 });
    return items
      .sort((a, b) => b.count - a.count)
      .filter(
        (item, index, array) => array.findIndex((other) => other.label === item.label) === index
      )
      .slice(0, 3)
      .map((item) => item.label);
  }
  function compatibleEndingTitles(run, profile, titles) {
    if (profile.id !== 'ordinaryContent') return titles;
    const exclusions = {
        简历和账单之间: () =>
          run.finance.totalDebt === 0 &&
          run.activity.mode !== 'seeking' &&
          run.employment.firstJobAge !== null,
        家里一直有人等: () =>
          !run.relationships.childCount &&
          run.later.care === 'none' &&
          ['none', 'divorced', 'widowed'].includes(run.relationships.partnerStatus),
        按身体能走的路: () =>
          run.health.status === 'well' && run.health.conditionSeverity === 0,
        工作停在这一天: () => !['retired', 'leftSearch'].includes(run.later.retirement),
        工牌后面的几年: () =>
          run.employment.firstJobAge === null && !run.employment.lastJob,
        把日子过到这里: () => false,
      },
      kept = titles.filter((item) => !(exclusions[item.title]?.() || false));
    return kept.length ? kept : titles;
  }
  function endingNearMisses(run, selectedProfile) {
    const signals = finalSignals(run),
      rarity = { 常见: 1, 少见: 2, 罕见: 3, 极罕: 4, 传奇: 5 };
    return DATA.endingProfiles
      .filter(
        (profile) =>
          profile.id !== selectedProfile.id &&
          !['ordinaryContent', 'earlyExit', 'wealthApex'].includes(profile.id) &&
          profile.nearMissHint &&
          profile.signals.filter((signal) => !signals.has(signal)).length === 1 &&
          nearMissThresholdMet(profile, run)
      )
      .sort(
        (a, b) =>
          (rarity[b.rarity] || 0) - (rarity[a.rarity] || 0) ||
          stable(run.seed, `near-miss:${a.id}`, 1000) -
            stable(run.seed, `near-miss:${b.id}`, 1000)
      )
      .slice(0, 2)
      .map((profile) => profile.id);
  }
  function nearMissThresholdMet(profile, run) {
    const records = run.decisionHistory || [],
      hasRecordedTag = (tags) =>
        records.some((record) =>
          (record.outcomeTags || []).some((tag) => tags.includes(tag))
        );
    if (profile.id === 'centenarian') return run.age >= 95;
    if (profile.id === 'platformYears') return run.mobility.platformYears >= 7;
    if (profile.id === 'overseasLife')
      return run.mobility.lastOverseasSystem !== 'none';
    if (profile.id === 'debtRebuilt')
      return (
        hasRecordedTag(['finance:repaid', 'finance:restructured']) &&
        run.finance.totalDebt > 0 &&
        run.finance.totalDebt <= Math.max(30000, run.finance.lastIncome * 0.5)
      );
    if (profile.id === 'managedYears')
      return (
        run.age >= 65 &&
        run.health.status === 'managed' &&
        hasRecordedTag(['health:managed', 'health:negotiated'])
      );
    if (profile.id === 'creationFulfilled')
      return run.desires.creation.fulfillment >= 55 && hasCreationEvidence(run);
    if (profile.id === 'caregiver') return run.development.careLoad >= 30;
    if (profile.id === 'stayedHome')
      return (
        run.age >= 65 &&
        run.mobility.lastOverseasSystem === 'none' &&
        (run.housing.history || []).every(
          (item) => !item.state?.region || item.state.region === run.location.id
        )
      );
    if (profile.id === 'activeSolitudeLife')
      return run.social.latestIntent === 'solitude' && run.pressures.loneliness < 50;
    if (profile.id === 'closeFriendLife')
      return run.people.some(
        (item) => item.alive && item.social && ['friend', 'close'].includes(item.social.tie)
      );
    return false;
  }
  function attitudeEndingLine(run) {
    const counts = Object.fromEntries(
        ['swallow', 'pushBack', 'deadpan', 'note', 'lean', 'refuse'].map((key) => [
          key,
          Number(run.outcomeTags[`attitude:${key}`]) || 0,
        ])
      ),
      total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    if (total < 5) return '';
    const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]),
      [dominant, dominantCount] = ordered[0],
      tied = ordered.filter(([, value]) => value === dominantCount).length > 1;
    if (tied) return '几种回应在你身上差不多，没有一种占了上风。';
    if (dominant === 'swallow')
      return `你最常做的是先忍一下；有 ${total - counts.swallow} 次没有。`;
    if (dominant === 'pushBack') return '小事上你不吃亏。大事来的时候，反而安静。';
    if (dominant === 'deadpan') return '你最常用玩笑把话接过去，包括不好笑的那些。';
    if (dominant === 'note') return '许多事你当时没说，后来都记得很清楚。';
    if (dominant === 'lean') return '能靠近的时候，你很少先退开。';
    return '不愿意的事，你往往把那声“不”说了出来。';
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
    unlockCodex(true);
    const profile = endingProfile(run),
      titles = compatibleEndingTitles(
        run,
        profile,
        DATA.endingTitles.filter((title) => title.profileId === profile.id)
      ),
      title = titles[stable(run.seed, `ending:${profile.id}`, titles.length)] || titles[0],
      facts = pivotalFacts(run),
      axes = endingAxes(run);
    run.ending = {
      profileId: profile.id,
      title: title?.title || '这一生',
      summary: profile.id === 'ordinaryContent' ? ordinaryEndingSummary(run, profile.summary, facts) : profile.summary,
      rarity: profile.rarity,
      basis: [...profile.signals],
      axes,
      facts,
      tags: routeTags(run),
      seed: run.seed,
      age: run.age,
      deathCause: run.deathCause || '自然衰老',
      netWorth: run.finance.netWorth,
      nearMisses: endingNearMisses(run, profile),
      attitudeLine: attitudeEndingLine(run),
    };
    state.meta.seen.endings[profile.id] = (state.meta.seen.endings[profile.id] || 0) + 1;
    state.meta.seen.endings[`title:${run.ending.title}`] = 1;
    for (const id of run.cards)
      state.meta.seen.cards[id] = (state.meta.seen.cards[id] || 0) + 1;
    state.meta.seen.families[run.originHousehold.familyId] =
      (state.meta.seen.families[run.originHousehold.familyId] || 0) + 1;
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
      facts: facts.map(({ age, title, result }) => ({ age, title, result })),
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
    return `${habit} · ${support}`;
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
      adaptation =
        run.mobility.dailyAdaptation >= 65
          ? '日常已经上手'
          : run.mobility.dailyAdaptation >= 42
            ? '日常还在适应'
            : '日常处处要重新学',
      chineseTies =
        run.mobility.chineseCommunityTies >= 65
          ? '华人联系稳定'
          : run.mobility.chineseCommunityTies >= 42
            ? '有一些华人联系'
            : '华人联系很少',
      localTies =
        run.mobility.localTies >= 65
          ? '本地联系稳定'
          : run.mobility.localTies >= 42
            ? '认识一些本地人'
            : '本地联系很少',
      authorization =
        { unknown: '工作资格待核', verified: '工作资格已核', restricted: '工作资格受限' }[
          run.mobility.workAuthorization
        ] || '工作资格待核';
    return `${system} · ${adaptation} · ${chineseTies} · ${localTies} · ${authorization}`;
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
    const socialCoResident = (run.housing.coResidentRefs || []).some((id) =>
        run.people.some((item) => item.id === id && item.social)
      ),
      status = {
        family: '与原生家庭同住',
        renting: '租住',
        owned: '自有住房',
        mortgaged: '按揭住房',
        supported: socialCoResident ? '由朋友临时提供' : '由家人或伴侣提供',
        unstable: '临时住所',
      }[run.housing.status] || run.housing.status,
      arrangement = {
        originFamily: '原生家庭', dormitory: '宿舍', solo: '独住',
        shared: socialCoResident ? '与朋友合住' : '匿名合租',
        partner: '伴侣同住', multigenerational: '多代同住', service: '服务型居住',
      }[run.housing.arrangement] || run.housing.arrangement,
      region = { tier1: '一线', tier2: '二线', county: '县城', town: '乡镇', us: '美国', europe: '欧洲' }[run.housing.region],
      stability = { stable: '稳定', conditional: '有条件', temporary: '临时' }[run.housing.stability];
    return `${status} · ${arrangement} · ${region} · ${stability}`;
  }
  function housingCostLabel(run) {
    const affordability = housingAffordability(run, run.housing, { current: true }),
      level = { feasible: '目前能承担', strained: '能承担，但很吃紧', infeasible: '目前承担不了' }[affordability.level],
      sharing = run.housing.costShare === 'joint'
        ? `共同分担${affordability.partnerContribution ? ` · 伴侣参考抵扣 ${money(affordability.partnerContribution)}/年` : ''}`
        : run.housing.costShare === 'supported' ? '由家庭、单位或服务支持' : '自行承担';
    return `${level} · ${sharing}`;
  }
  function debtStatusLabel(run) {
    const stage =
        {
          current: '正常偿还',
          overdue: '已经逾期',
          enforcement: '执行中',
          consequence: '执行后果持续',
          resolved: '已结清',
        }[run.finance.debtStage] || '还要查清',
      flags = [];
    if (run.finance.dishonestStatus === 'listed') flags.push('游戏内失信');
    if (run.finance.restrictedConsumption) flags.push('限制消费');
    if (run.finance.reliefPending) flags.push('等待解除');
    if (run.finance.housingDisposition === 'disposed') flags.push('原住房已处置');
    return `${stage}${flags.length ? ` · ${flags.join(' · ')}` : ''}`;
  }
  function laterStatusLabel(run) {
    const labels = {
        retirement: {
          reviewing: '资格核对中',
          phased: '分阶段退出',
          delayed: '明确延后',
          retired: '已退出工作',
          semiRetired: '半退休',
          working: '继续工作',
          leftSearch: '不再全职求职',
          lightWork: '只留少量工作',
          keptSearching: '继续寻找工作',
          forced: '被迫退出',
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
      names = { retirement: '退休安排', inheritance: '继承', care: '照护', will: '遗嘱' },
      items = Object.entries(run.later || {})
        .filter(([, value]) => value && value !== 'none')
        .map(([key, value]) => `${names[key]}·${labels[key]?.[value] || value}`);
    return items.join('；') || '眼下还没安排到这些事';
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
          dependent: '总想翻本',
          uncontrolled: '已经停不下',
          treatment: '治疗中',
          relapse: '复发',
        },
        alcohol: {
          exposed: '开始留意杯数',
          repeating: '反复饮酒',
          dependent: '酒精依赖',
          uncontrolled: '饮酒失控',
          treatment: '治疗中',
          relapse: '复饮',
        },
        gaming: {
          exposed: '开始留意超时',
          repeating: '反复超时',
          dependent: '游戏依赖',
          uncontrolled: '游戏失控',
          treatment: '治疗中',
          relapse: '复发',
        },
        shopping: {
          exposed: '开始留意冲动下单',
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
    const active = state.run && state.run.phase !== 'ended',
      endingCount = Object.keys(state.meta.seen.endings || {}).filter(
        (key) => !key.startsWith('title:')
      ).length;
    return `<main class="screen center"><span class="version">v${VERSION}</span><div><h1>人生尚未加载</h1><p class="hero-sub">${esc(UI_COPY.homeTagline)}</p></div>${state.meta.migrationNotice ? '<section class="card migration-note"><strong>游戏内容已经更新</strong><p class="tiny">旧版本的活动人生已结束；人生档案、图鉴、设置和跨局记录仍被保留。</p></section>' : ''}${state.recovery ? `<section class="card migration-note"><strong>存档已重置</strong><p class="tiny">${esc(state.recovery.message)}</p></section>` : ''}<div class="mt stack">${active ? `<button class="btn primary" data-act="continue">继续这一生</button><button class="btn restart-life" data-act="restart-life"><span>${esc(UI_COPY.restartActive)}</span><small>${esc(UI_COPY.restartActiveHint)}</small></button>` : '<button class="btn primary" data-act="new">开始新人生</button>'}<p class="tiny collection-progress">已走完 ${state.meta.stats.runs || 0} 局 · 结局 ${endingCount}/${DATA.endingProfiles.length} · 图鉴 ${state.meta.codex.length}/${DATA.codex.length}</p><div class="menu-list"><button class="menu-item" data-nav="archive"><strong>人生档案</strong><span>›</span></button><button class="menu-item" data-nav="codex"><strong>${esc(UI_COPY.codexTitle)}</strong><span>›</span></button><button class="menu-item" data-nav="settings"><strong>设置</strong><span>›</span></button></div></div><p class="tiny">离线运行 · 自动存档</p></main>`;
  }
  function birthView() {
    const run = state.run,
      origin = run.originHousehold,
      archetype = DATA.familyArchetypes.find((item) => item.id === origin.familyId),
      compactOriginSummary = {
        较早接触升学信息: '升学信息较多',
        住处相对稳定: '住处相对稳定',
        遇到变动时更快找到新过法: '适应变化更快',
        额外费用会压缩选择: '额外开支挤压选择',
        照顾者经常不在场: '照顾者经常不在场',
        家里说话和做决定都有压力: '家里做决定压力较大',
        照护会抢走很多时间: '照护占用很多时间',
        现金流不是每个月都宽松: '现金流经常吃紧',
      },
      advantageSource = archetype?.advantages?.[1] || archetype?.advantages?.[0],
      riskSource = archetype?.risks?.[1] || archetype?.risks?.[0],
      originAdvantage = compactOriginSummary[advantageSource] || advantageSource,
      originRisk = compactOriginSummary[riskSource] || riskSource,
      parents = origin.people.filter((item) => ['father', 'mother'].includes(item.relation)),
      siblings = origin.people.filter((item) => item.relation === 'sibling' && item.bornAt <= 0);
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home" aria-label="返回主菜单">‹</button><div class="title">${esc(UI_COPY.birthTitle)}</div><span></span></div><section class="card hero"><div class="muted">${run.gender === 'female' ? '女性' : '男性'} · ${run.location.name}</div><div class="birth-place">${esc(origin.familyName)}</div><p>${esc(UI_COPY.birthHouseholdNote)}</p>${originAdvantage || originRisk ? `<div class="origin-summary">${originAdvantage ? `<div><span>优势</span><p>${esc(originAdvantage)}</p></div>` : ''}${originRisk ? `<div><span>压力</span><p>${esc(originRisk)}</p></div>` : ''}</div>` : ''}</section><dl class="spec-list"><div class="spec"><dt>家庭环境</dt><dd>${esc(familyContextLabel(run))}</dd></div><div class="spec"><dt>父母</dt><dd>${parents.map((item) => `${item.relation === 'father' ? '父亲' : '母亲'}：${item.occupation} · ${item.timeAvailability >= 60 ? '时间较稳定' : '常常抽不开身'}`).join('；') || '由其他照护者抚养'}</dd></div><div class="spec"><dt>兄弟姐妹</dt><dd>${siblings.length ? `${siblings.length}人` : '目前没有'}</dd></div><div class="spec"><dt>家庭住房</dt><dd>${esc(origin.housing)} · ${origin.context.housingStability >= 60 ? '居住较稳定' : '住处可能变化'}</dd></div><div class="spec"><dt>家庭账面</dt><dd>资产约 ${money(origin.assets)} · 债务约 ${money(origin.debt)}</dd></div><div class="spec"><dt>升学信息</dt><dd>${origin.context.educationCapital >= 65 ? '家里熟悉流程' : origin.context.educationCapital >= 42 ? '主要靠学校通知' : '需要自己另外寻找'}</dd></div><div class="spec"><dt>准备费用</dt><dd>${origin.context.educationBudget >= 68 ? '能承担较多' : origin.context.educationBudget >= 42 ? '需要取舍' : '很难长期承担'}</dd></div></dl><div class="bottom-actions"><button class="btn primary" data-act="birth-next">${esc(UI_COPY.birthNext)}</button></div></main>`;
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
    return `<main class="screen attributes-screen"><div class="topbar"><button class="iconbtn" data-act="attributes-back" aria-label="返回出生信息">‹</button><div class="title">${esc(UI_COPY.attributesTitle)}</div><span></span></div><div class="remain"><div class="row"><span class="muted">剩余点数</span><b class="big-number">${run.points}</b></div></div><section class="card">${Object.entries(
      attrMeta
    )
      .map(
        ([key, [name, desc]]) =>
          `<div class="attr-row"><div><div class="attr-name">${name}</div><div class="attr-desc">${desc}</div></div><div class="stepper"><button data-attr="${key}" data-delta="-1" aria-label="减少${name}">−</button><b>${run.attrs[key]}</b><button data-attr="${key}" data-delta="1" aria-label="增加${name}">＋</button></div></div>`
      )
      .join(
        ''
      )}</section><div class="bottom-actions attributes-actions"><button class="btn ghost" data-act="random-attributes">随机分配</button><button class="btn primary" data-act="attributes-done" ${run.points ? 'disabled' : ''}>${esc(UI_COPY.attributesConfirm)}</button></div></main>`;
  }
  function timelineImportance(item, run) {
    if (
      item.id.startsWith('person_birth_') ||
      item.id.startsWith('person_loss_') ||
      ['blackSwan', 'secret'].includes(item.kind)
    )
      return 'critical';
    if (item.variant === 'chosen') {
      const record = [...(run.decisionHistory || [])]
        .reverse()
        .find((entry) => entry.age === item.age && entry.eventId === item.id);
      if (record && decisionMilestone(record).score >= 60) return 'critical';
      return 'standard';
    }
    const event = INDEX.event.get(item.id);
    if (item.kind === 'consequence' || item.kind === 'card' || event?.intensity === 'high')
      return 'standard';
    return 'texture';
  }
  function streamRows(run) {
    if (!run.timeline.length) return `<div class="stream-empty">${esc(UI_COPY.streamEmpty)}</div>`;
    const groups = [];
    for (const item of run.timeline) {
      const group = groups.at(-1);
      if (!group || group.age !== item.age) groups.push({ age: item.age, items: [item] });
      else group.items.push(item);
    }
    return groups.map((group) => group.items.map((item, index) =>
      `<div class="stream-row ${timelineImportance(item, run)} ${item.variant === 'chosen' ? 'chosen' : ''}"><span class="stream-age">${index ? '' : `${group.age}岁`}</span><span class="stream-icon">${item.icon || '·'}</span><div><p>${esc(item.text)}</p>${item.attitude ? `<p class="attitude-note">——${esc(item.attitude.text)}。</p>` : ''}<div class="stream-hints"><span>${esc(TRACK_LABELS[item.track] || '生活')}</span>${item.kind === 'consequence' ? `<span>${esc(UI_COPY.consequenceLabel)}</span>` : ''}</div></div></div>`
    ).join('')).join('');
  }
  function lifeFactSummary(run) {
    const facts = [], seekingYears = currentSeekingYears(run);
    if (run.activity.mode === 'seeking')
      facts.push({
        priority: 95,
        text:
          seekingYears !== null && seekingYears >= 2
            ? `求职已经拖了 ${seekingYears} 年，下一份工作还没有落下来。`
            : run.employment.firstJobAge === null
              ? '目前还在求职，稳定工作还没有落下来。'
              : '目前还在求职，下一份工作还没有落下来。',
      });
    if (run.finance.totalDebt > 0)
      facts.push({
        priority: 90,
        text: `未清债务还有 ${money(run.finance.totalDebt)}，目前是${debtStatusLabel(run)}。`,
      });
    if (run.relationships.childCount)
      facts.push({
        priority: 82,
        text: `家里有 ${run.relationships.childCount} 个孩子；现在${housingLabel(run)}。`,
      });
    if (run.health.status !== 'well' || run.health.conditionSeverity >= 18)
      facts.push({
        priority: 78,
        text: `身体目前是${healthStatusLabel(run)}${run.health.careNeed > 0 ? '，日常还需要照护安排' : ''}。`,
      });
    if (run.housing.status === 'unstable')
      facts.push({ priority: 75, text: `住处目前是${housingLabel(run)}。` });
    if (run.mobility.mode !== 'home' && run.mobility.lastOverseasSystem !== 'none')
      facts.push({ priority: 70, text: `这些年在海外生活；现在${housingLabel(run)}。` });
    if (['employed', 'gig', 'selfEmployed'].includes(run.employment.status) && run.employment.tenure >= 3) {
      const growthBelongsToCurrentJob =
        run.employment.growthCount > 0 &&
        Number.isFinite(run.employment.lastGrowthAge) &&
        run.employment.lastGrowthAge >= run.age - run.employment.tenure;
      facts.push({
        priority: growthBelongsToCurrentJob ? 76 : 64,
        text: growthBelongsToCurrentJob
          ? `${run.employment.career}已经有过一次写进职责或收入的成长，现在仍在继续。`
          : `${run.employment.career}已经连续做了 ${run.employment.tenure} 年。`,
      });
    }
    if (run.later.retirement !== 'none')
      facts.push({ priority: 68, text: `晚年的工作安排是：${laterStatusLabel(run)}。` });
    return facts
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 2)
      .map((item) => item.text);
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
    return `<div class="modal-wrap locked-modal"><section class="choice-sheet" role="dialog" aria-modal="true" aria-labelledby="choice-dialog-title" tabindex="-1"><div class="handle"></div><div class="decision-emoji">${event.icon || '◎'}</div><h2 id="choice-dialog-title">${esc(event.prompt)}</h2>${event.situation ? `<p class="episode-copy">${esc(event.situation)}</p>` : ''}${cards.length ? `<div class="card-hand"><span>${esc(UI_COPY.heldCardsLabel)}</span><div>${cards.map((card) => `<i>${esc(card.displayName)}</i>`).join('')}</div></div>` : ''}${
      Object.keys(actors).length
        ? `<p>${esc(UI_COPY.involvedLabel)}：${Object.values(actors)
            .map((item) =>
              item.social
                ? item.social.displayName
                : item.relation === 'partner'
                ? '伴侣'
                : item.relation.includes('child')
                  ? '子女'
                  : '家人'
            )
            .join('、')}</p>`
        : ''
    }<div class="choices">${choices
      .map(({ choice, index }) => {
        const resolved = resolveDecisionChoice(choice, event),
          effective = resolved.choice,
          display = effective || choice,
          enabled = choiceEnabled(choice);
        const housingHint = effective ? housingChoiceHint(effective) : null,
          enabledDetail = resolved.card
            ? `<small class="card-effect"><b>◇ “${esc(resolved.card.displayName)}”</b>${resolved.spec.explanation ? `<span> · ${esc(resolved.spec.explanation)}</span>` : ''}${housingHint ? `<span> · ${esc(housingHint)}</span>` : ''}</small>`
            : housingHint
              ? `<small>${esc(housingHint)}</small>`
              : display.hints?.length
                ? `<small>${esc(display.hints.join(' · '))}</small>`
                : '';
        return `<button class="choice ${enabled ? '' : 'locked'} ${resolved.card ? 'card-active' : ''}" data-choice="${index}" ${enabled ? '' : 'disabled'}>${esc(display.text)}${!enabled ? `<small>暂不可选：${esc(housingChoiceReason(display) || debtGateReason(display) || display.reason || '当前条件不足')}</small>` : enabledDetail}</button>`;
      })
      .join('')}</div></section></div>`;
  }
  function episodeSheet(run) {
    const scene = run.sceneQueue[0];
    if (!scene) return '';
    if (scene.kind === 'choice') return choiceSheet(run.currentDecision);
    if (scene.kind === 'result')
      return `<div class="modal-wrap locked-modal"><section class="choice-sheet episode-sheet" role="dialog" aria-modal="true" aria-label="结果" tabindex="-1"><div class="handle"></div><p id="episode-dialog-title" class="episode-result-copy">${esc(scene.text)}</p><button class="btn primary mt" data-act="episode-next">继续</button></section></div>`;
    return `<div class="modal-wrap locked-modal"><section class="choice-sheet episode-sheet" role="dialog" aria-modal="true" aria-labelledby="episode-dialog-title" tabindex="-1"><div class="handle"></div><h2 id="episode-dialog-title">${esc(scene.text)}</h2><button class="btn primary mt" data-act="episode-next">做出选择</button></section></div>`;
  }
  function cardSheet(run) {
    const prompt = UI_COPY.cardPrompts?.[run.cardAge] || '这些年，你留下了什么？';
    return `<div class="modal-wrap locked-modal"><section class="choice-sheet card-sheet card-draw-pulse" role="dialog" aria-modal="true" aria-labelledby="card-dialog-title" tabindex="-1"><div class="handle"></div><h2 id="card-dialog-title">${esc(prompt)}</h2><div class="choices">${run.cardOptions.map((card) => `<button class="choice clear-card" data-card="${card.id}"><span class="omen-icon">◇</span><span><span class="fate-title">${esc(card.displayName)}</span><span class="fate-text">${esc(card.text)}</span></span><span aria-hidden="true">›</span></button>`).join('')}</div></section></div>`;
  }
  function traitSummary(run) {
    const labels = { intellect: '理解', physique: '体魄', looks: '外貌', stability: '稳定', social: '社交', ambition: '野心' };
    return Object.entries(run.attrs)
      .map(([key, value]) => ({ key, value, distance: Math.abs(value - 5) }))
      .filter((item) => item.value <= 3 || item.value >= 6)
      .sort((a, b) => b.distance - a.distance || a.key.localeCompare(b.key))
      .slice(0, 2)
      .map(({ key, value }) => `${labels[key]}${value >= 8 ? '强' : value >= 6 ? '尚可' : value === 1 ? '弱' : '偏弱'}`)
      .join(' · ');
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
      episodes = activeEpisodes(run),
      socialPeople = CONTRACT.SOCIAL_SLOTS
        .map((slot) => run.people.find((item) => item.id === run.social?.[`${slot}PersonId`]))
        .filter((item) => item?.alive && item.social?.tie !== 'ended'),
      friendSummary = socialPeople.length
        ? socialPeople.map((item) => esc(socialPersonLabel(item))).join('<br>')
        : latestSocialIntent(run) === 'solitude' && (Number(run.pressures.loneliness) || 0) < 40
          ? '主要独来独往'
          : '认识一些人，但没有常联系的朋友',
      facts = lifeFactSummary(run),
      traits = traitSummary(run);
    return `<div class="drawer-wrap" data-act="close-drawer"><section class="drawer" data-stop role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1"><div class="handle"></div><div class="row"><div><div class="eyebrow">${run.age}岁 · ${run.world.year}年</div><div class="sheet-title" id="drawer-title">${esc(run.originHousehold.familyName)}</div></div><button class="iconbtn" data-act="close-drawer" aria-label="关闭状态面板">×</button></div>${traits ? `<div class="section-title">特质</div><p>${esc(traits)}</p>` : ""}${facts.length ? `<div class="section-title">${esc(UI_COPY.lifeFactsTitle)}</div><div class="life-facts">${facts.map((item) => `<p>${esc(item)}</p>`).join('')}</div>` : ''}<div class="section-title">成长与教育</div><dl class="spec-list"><div class="spec"><dt>家庭起点</dt><dd>${esc(familyContextLabel(run))}</dd></div><div class="spec"><dt>学习与支持</dt><dd>${esc(developmentLabel(run))}</dd></div><div class="spec"><dt>学历</dt><dd>${educationLabel(run)}</dd></div><div class="spec"><dt>高等教育</dt><dd>${esc(higherEducationLabel(run))}</dd></div>${run.mobility.lastOverseasSystem !== 'none' ? `<div class="spec"><dt>海外生活</dt><dd>${esc(overseasLifeLabel(run))}</dd></div>` : ''}</dl><div class="section-title">现在的生活</div><dl class="spec-list"><div class="spec"><dt>${esc(UI_COPY.activityField)}</dt><dd>${activityLabel(run)}</dd></div><div class="spec"><dt>工作</dt><dd>${esc(employmentDetailLabel(run))}</dd></div><div class="spec"><dt>婚恋</dt><dd>${partner}</dd></div><div class="spec"><dt>朋友</dt><dd>${friendSummary}</dd></div><div class="spec"><dt>子女</dt><dd>${
      run.relationships.childCount
        ? childPeople(run)
            .map((child) => `${personAge(child, run)}岁`)
            .join('、')
        : '无'
    }</dd></div><div class="spec"><dt>住房</dt><dd>${housingLabel(run)}</dd></div><div class="spec"><dt>住房负担</dt><dd>${housingCostLabel(run)}</dd></div><div class="spec"><dt>${esc(UI_COPY.netWorthField)}</dt><dd>${money(run.finance.netWorth)}</dd></div><div class="spec"><dt>债务</dt><dd>${liabilities.length ? `${liabilities.length}笔 · ${money(run.finance.totalDebt)} · ${esc(debtStatusLabel(run))}` : run.finance.housingDisposition === 'disposed' ? `无未清债务 · ${esc(debtStatusLabel(run))}` : '无'}</dd></div><div class="spec"><dt>健康</dt><dd>${constitutionLabel(run)} · ${healthStatusLabel(run)} · ${Math.round(run.health.physical)}／${Math.round(run.health.mental)}</dd></div><div class="spec"><dt>${esc(UI_COPY.habitField)}</dt><dd>${habitLabel(run)}</dd></div><div class="spec"><dt>晚年状态</dt><dd>${esc(laterStatusLabel(run))}</dd></div><div class="spec"><dt>压力</dt><dd>${pressureLevel(run)}</dd></div></dl><div class="section-title">最在意的事</div><div class="desire-list">${topDesires(
      run
    )
      .map(
        (item) =>
          `<span>${esc(item.name)}${item.claimed ? ' · 现在最在意' : ''}</span>`
      )
      .join(
        ''
      )}</div><div class="section-title">${esc(UI_COPY.activeArcsTitle)}</div><div class="taglist left">${episodes.map((item) => `<span class="pill">${esc(episodeLabel(item.id))}</span>`).join('') || `<span class="tiny">${esc(UI_COPY.noActiveArcs)}</span>`}</div></section></div>`;
  }
  function attitudeControls(run) {
    const event = run.pendingAttitude ? INDEX.event.get(run.pendingAttitude) : null;
    if (!event?.attitudes?.length || run.phase !== 'playing') return '';
    return `<div class="attitude-controls" aria-label="这一刻的态度">${event.attitudes
      .map(
        (item) =>
          `<button type="button" data-attitude="${esc(item.key)}">${esc(item.text)}</button>`
      )
      .join('')}</div>`;
  }
  function gameView() {
    const run = state.run;
    return `<main class="screen stream-screen"><header class="game-header"><div class="row"><div><div class="age">${run.age}岁</div><div class="role">${esc(roleLine(run))}</div></div><button class="iconbtn" data-act="open-drawer" aria-label="打开状态面板">☰</button></div><div class="resource-strip"><div class="res"><span>现金</span><b>${money(run.finance.cash)}</b></div><div class="res"><span>净值</span><b>${money(run.finance.netWorth)}</b></div><div class="res"><span>身体</span><b>${Math.round(run.health.physical)}</b></div><div class="res"><span>精神</span><b>${Math.round(run.health.mental)}</b></div></div></header><div class="conflict-line">${esc(UI_COPY.coreConflictLabel)} · ${esc(DATA.conflicts.find((item) => item.id === run.mainConflict)?.name || '还不清楚')}</div><div class="life-stream" tabindex="0" data-act="advance" data-timeline-length="${run.timeline.length}"><div class="stream-content"><div class="stream-rows">${streamRows(run)}</div><div class="stream-cursor"><i></i>${esc(UI_COPY.advancePrompt)}</div></div></div>${attitudeControls(run)}${DEBUG ? `<div class="debug-panel">debug · seed ${esc(run.seed)} · choices ${run.decisionCount}/${run.targetDecisions}</div>` : ''}</main>${run.phase === 'decision' ? choiceSheet(run.currentDecision) : ''}${run.phase === 'episode' ? episodeSheet(run) : ''}${run.phase === 'card' ? cardSheet(run) : ''}${state.drawer ? statusDrawer(run) : ''}`;
  }

  function endingPortraitFacts(run) {
    const people = [],
      coResidence = {
        originFamily: '与原生家庭同住',
        dormitory: '住在宿舍',
        solo: '独自居住',
        shared: '与人合住',
        partner: '与伴侣同住',
        multigenerational: '多代同住',
        service: '住在服务型住所',
      }[run.housing.arrangement];
    if (run.relationships.partnerStatus !== 'none')
      people.push({
        dating: '恋爱中',
        partnered: '有稳定伴侣',
        married: '已婚',
        separated: '与伴侣分居',
        divorced: '离异',
        widowed: '伴侣已经离世',
      }[run.relationships.partnerStatus]);
    if (run.relationships.childCount) people.push(`${run.relationships.childCount} 个孩子`);
    const friendCount = CONTRACT.SOCIAL_SLOTS
      .map((slot) => run.people.find((item) => item.id === run.social?.[`${slot}PersonId`]))
      .filter((item) => item?.alive && ['friend', 'close'].includes(item.social?.tie)).length;
    if (friendCount) people.push(`${friendCount} 位仍有来往的朋友`);
    if (coResidence && !people.some((item) => item.includes(coResidence)))
      people.push(coResidence);
    return [
      { label: '工作', value: employmentDetailLabel(run) },
      { label: '关系与同住', value: people.join('；') || '没有记录到稳定关系或同住安排' },
      { label: '住处', value: housingLabel(run) },
      run.finance.totalDebt > 0
        ? { label: '未清债务', value: `${money(run.finance.totalDebt)} · ${debtStatusLabel(run)}` }
        : { label: '身体', value: healthStatusLabel(run) },
    ];
  }

  function endingView() {
    const run = state.run,
      e = run.ending,
      previous = state.meta.histories[1],
      nearMisses = (e.nearMisses || [])
        .map((id) => DATA.endingProfiles.find((profile) => profile.id === id)?.nearMissHint)
        .filter(Boolean);
    return `<main class="screen ending-screen"><div class="ending-share-card"><div class="eyebrow ending-kicker">人生尚未加载 · 2026</div><div class="lifespan">活到 <b>${e.age}</b> 岁</div><div class="ending-title">《${esc(e.title)}》</div><p class="ending-review sharp-summary">${esc(e.summary)}</p>${e.attitudeLine ? `<p class="tiny attitude-ending">${esc(e.attitudeLine)}</p>` : ''}<div class="ending-rarity"><span class="pill rare">人生稀有度 · ${esc(e.rarity)}</span><span class="pill">种子 ${esc(e.seed)}</span></div><div class="section-title">${esc(UI_COPY.endingTurnsTitle)}</div><section class="card timeline">${e.facts.map((item) => `<div class="time-item"><span class="time-age">${item.age}岁</span><div><strong>${esc(item.title)}</strong><p class="tiny">${esc(item.result)}</p></div></div>`).join('')}</section><div class="taglist">${e.tags.map((tag) => `<span class="pill">${esc(tag)}</span>`).join('') || '<span class="pill">未归类人生</span>'}</div></div>${nearMisses.length ? `<div class="section-title">差一点的人生</div><section class="card">${nearMisses.map((hint) => `<p>${esc(hint)}</p>`).join('')}</section>` : ''}${previous ? `<div class="section-title">上一局</div><section class="card"><strong>《${esc(previous.title)}》 · ${previous.age}岁</strong><p class="tiny mt">${esc(previous.facts?.[0]?.result || previous.facts?.[0]?.title || '那一生已经收进档案。')}</p></section>` : ''}<div class="section-title">${esc(UI_COPY.endingPortraitTitle)}</div><section class="card ending-portrait">${endingPortraitFacts(run).map((item) => `<div class="ending-fact"><span>${esc(item.label)}</span><b>${esc(item.value)}</b></div>`).join('')}</section><section class="card soft mt"><div class="spec"><dt>最终净值</dt><dd>${money(e.netWorth)}</dd></div><div class="spec"><dt>死亡原因</dt><dd>${esc(e.deathCause)}</dd></div><div class="spec"><dt>亲手选择</dt><dd>${run.decisionCount} 次</dd></div></section><div class="stack mt"><button class="btn primary" data-act="new">${esc(UI_COPY.restart)}</button><button class="btn ghost" data-nav="archive">查看人生档案</button></div></main>`;
  }
  function archiveView() {
    const all = [...state.meta.histories, ...state.meta.legacyHistories],
      collection = DATA.endingProfiles
        .map((profile) => {
          const unlocked = Boolean(state.meta.seen.endings[profile.id]),
            titles = DATA.endingTitles.filter((item) => item.profileId === profile.id),
            titleCount = titles.filter((item) => state.meta.seen.endings[`title:${item.title}`]).length;
          return `<div class="codex-item ${unlocked ? '' : 'locked'}"><span class="codex-category">${esc(profile.rarity)}</span><h3>${unlocked ? esc(titles.find((item) => state.meta.seen.endings[`title:${item.title}`])?.title || profile.summary) : '还没有人活成这样'}</h3><p>${unlocked ? `标题 ${titleCount}/${titles.length}` : esc(profile.nearMissHint || '继续走不同的路。')}</p></div>`;
        })
        .join('');
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home" aria-label="返回主菜单">‹</button><div class="title">人生档案</div><span></span></div><div class="section-title">结局图鉴</div><section class="card ending-collection">${collection}</section><div class="section-title">走过的人生</div><section class="card">${all.length ? all.map((item) => `<div class="archive-item"><div class="archive-title">《${esc(item.title || '旧人生')}》</div><div class="archive-meta">${item.age ?? '?'}岁 · ${esc(item.rarity || '旧版本')} · ${esc(item.familyName || '历史档案')}</div>${item.seed ? `<button class="btn ghost compact" data-seed-start="${esc(item.seed)}">用这个种子重开</button>` : ''}</div>`).join('') : '<p>还没有走完过一整局。</p>'}</section></main>`;
  }
  function codexView() {
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home" aria-label="返回主菜单">‹</button><div class="title">${esc(UI_COPY.codexTitle)} ${state.meta.codex.length}/${DATA.codex.length}</div><span></span></div><section class="card">${DATA.codex
      .map((item) => {
        const unlocked = state.meta.codex.includes(item.id);
        return `<div class="codex-item ${unlocked ? '' : 'locked'}"><span class="codex-category">${esc(item.category)}</span><h3>${unlocked ? esc(item.name) : esc(UI_COPY.codexLocked)}</h3><p>${unlocked ? esc(item.unlockedText || UI_COPY.codexUnlocked) : esc(item.lockedHint)}</p></div>`;
      })
      .join('')}</section></main>`;
  }
  function settingsView() {
    return `<main class="screen" aria-labelledby="settings-title"><div class="topbar"><button class="iconbtn" data-nav="home" aria-label="返回主菜单">‹</button><div class="title" id="settings-title">设置</div><span></span></div><section class="card"><button class="menu-item" data-act="toggle-haptic" aria-pressed="${state.meta.settings.haptic}"><strong>轻触反馈</strong><span>${state.meta.settings.haptic ? '已开启' : '已关闭'}</span><span class="switch ${state.meta.settings.haptic ? 'on' : ''}" aria-hidden="true"><i></i></span></button><button class="menu-item" data-act="toggle-echo" aria-pressed="${state.meta.settings.echoAcrossRuns}"><strong>隔世回声</strong><span>${state.meta.settings.echoAcrossRuns ? '已开启' : '已关闭'}</span><span class="switch ${state.meta.settings.echoAcrossRuns ? 'on' : ''}" aria-hidden="true"><i></i></span></button><p class="tiny">新的一生里，偶尔会听人提起上一局那户人家。</p><div class="seed-start"><label for="seed-input"><strong>用种子开始新人生</strong></label><input id="seed-input" data-seed-input placeholder="粘贴一颗种子" maxlength="80"><p class="tiny">同一颗种子，同一个出身。</p><button class="btn ghost" data-act="seed-start">开始</button></div><button class="menu-item" data-act="export"><strong>导出存档</strong><span aria-hidden="true">›</span></button><button class="menu-item" data-act="clear-data"><strong class="danger-text">清除全部数据</strong><span aria-hidden="true">›</span></button></section><p class="tiny mt">版本更新只保留人生档案、图鉴、设置和跨局记录，不延续旧版本的活动人生。</p></main>`;
  }

  function render() {
    if (!state) return;
    const previousDialog = app.querySelector('[role="dialog"]'),
      previousStream = app.querySelector('.life-stream'),
      previousStreamState = previousStream
        ? {
            scrollTop: previousStream.scrollTop,
            timelineLength: Number(previousStream.dataset.timelineLength) || 0,
          }
        : null,
      active = document.activeElement;
    if (!previousDialog && active instanceof HTMLElement && app.contains(active)) {
      if (active.dataset.act) focusReturnSelector = `[data-act="${active.dataset.act}"]`;
      else if (active.dataset.nav) focusReturnSelector = `[data-nav="${active.dataset.nav}"]`;
      else focusReturnSelector = null;
    }
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
      if (stream) {
        const timelineLength = Number(stream.dataset.timelineLength) || 0;
        stream.scrollTop =
          previousStreamState && previousStreamState.timelineLength === timelineLength
            ? previousStreamState.scrollTop
            : stream.scrollHeight;
      }
      const ending = app.querySelector('.ending-screen');
      if (ending) {
        ending.tabIndex = 0;
        ending.scrollTop = 0;
        ending.focus({ preventScroll: true });
      }
      const dialog = app.querySelector('[role="dialog"]');
      if (dialog) {
        const first = dialog.querySelector('button:not([disabled]), [href], [tabindex="0"]');
        (first || dialog).focus();
      } else if (previousDialog && focusReturnSelector) {
        app.querySelector(focusReturnSelector)?.focus();
        focusReturnSelector = null;
      }
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
    link.download = '人生尚未加载-v0.7.0-存档.json';
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
  function newLife(seed = null) {
    state.run = createRun(seed ? String(seed).trim().slice(0, 80) : makeSeed());
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
    const base = run.capabilitiesBirthBase || {};
    run.capabilities.portableSkill = Math.max(
      run.originHousehold.digitalLiteracy >= 60 ? 1 : 0,
      Math.floor((run.attrs.intellect - 1) / 3)
    );
    run.capabilities.employability = clamp(
      40 + run.attrs.stability * 3 + run.attrs.social * 2,
      0,
      100
    );
    run.capabilities.network = clamp(
      (base.network || 0) +
        Math.floor((run.attrs.looks - 1) / 3) +
        Math.floor((run.attrs.social - 1) / 3),
      0,
      10
    );
    run.capabilities.negotiation = clamp(
      (base.negotiation || 0) + Math.floor((run.attrs.ambition - 1) / 3),
      0,
      10
    );
    run.capabilities.riskSense = clamp(
      (base.riskSense || 0) +
        Math.floor((run.attrs.stability - 5) / 3) -
        Math.floor((run.attrs.ambition - 5) / 4),
      0,
      10
    );
    run.business.operatingSkill = clamp(
      25 + run.originHousehold.riskTolerance / 3 + (run.attrs.ambition - 5) * 2,
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
      if (!state.run.attributesCommitted) {
        syncInitialCapabilities(state.run);
        state.run.attributesCommitted = true;
      }
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
    } else if (name === 'toggle-echo') {
      state.meta.settings.echoAcrossRuns = !state.meta.settings.echoAcrossRuns;
      save();
      render();
    } else if (name === 'seed-start') {
      const seed = app.querySelector('[data-seed-input]')?.value?.trim();
      if (seed) newLife(seed);
      else showToast('先粘贴一颗种子');
    } else if (name === 'export') exportSave();
    else if (name === 'clear-data') clearAllData();
  }
  app.addEventListener('pointerdown', (event) => {
    const stream = event.target.closest('.life-stream');
    if (!stream) return;
    streamGesture = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: stream.scrollTop,
      moved: false,
    };
    suppressStreamAdvance = false;
  });
  app.addEventListener('pointermove', (event) => {
    if (!streamGesture || streamGesture.pointerId !== event.pointerId) return;
    const stream = event.target.closest('.life-stream') || app.querySelector('.life-stream');
    if (
      Math.abs(event.clientY - streamGesture.startY) > 10 ||
      Math.abs((stream?.scrollTop || 0) - streamGesture.startScrollTop) > 4
    )
      streamGesture.moved = true;
  });
  app.addEventListener(
    'scroll',
    (event) => {
      if (streamGesture && event.target.classList?.contains('life-stream'))
        streamGesture.moved = true;
    },
    true
  );
  const finishStreamGesture = (event) => {
    if (!streamGesture || streamGesture.pointerId !== event.pointerId) return;
    suppressStreamAdvance = streamGesture.moved;
    streamGesture = null;
    setTimeout(() => (suppressStreamAdvance = false), 0);
  };
  app.addEventListener('pointerup', finishStreamGesture);
  app.addEventListener('pointercancel', finishStreamGesture);
  app.addEventListener('click', (event) => {
    if (
      event.target.closest('[data-stop]') &&
      event.target.closest('[data-act="close-drawer"]') === null
    )
      event.stopPropagation();
    const seedStart = event.target.closest('[data-seed-start]');
    if (seedStart) {
      newLife(seedStart.dataset.seedStart);
      return;
    }
    const attitude = event.target.closest('[data-attitude]');
    if (attitude) {
      event.stopPropagation();
      chooseAttitude(attitude.dataset.attitude);
      return;
    }
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
      if (action.dataset.act === 'advance' && suppressStreamAdvance) {
        event.preventDefault();
        suppressStreamAdvance = false;
        return;
      }
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
    const ending = event.target.closest?.('.ending-screen');
    if (ending && ['Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const pageStep = Math.max(80, ending.clientHeight * 0.85),
        delta =
          event.key === 'PageUp'
            ? -pageStep
            : event.key === 'PageDown'
              ? pageStep
              : event.key === 'ArrowUp'
                ? -44
                : event.key === 'ArrowDown'
                  ? 44
                  : 0;
      event.preventDefault();
      if (event.key === 'Home') ending.scrollTop = 0;
      else if (event.key === 'End') ending.scrollTop = ending.scrollHeight;
      else ending.scrollTop += delta;
      return;
    }
    const dialog = app.querySelector('[role="dialog"]');
    if (dialog && event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
      } else {
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (dialog && event.key === 'Escape' && state.drawer) {
      event.preventDefault();
      state.drawer = false;
      render();
      return;
    }
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
      if (actor.optional) continue;
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
        initializePartnerIdentity(run, found);
        initializePartnerHousingProfile(run, found);
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
              debtStage: run.finance.debtStage,
              enforcementStatus: run.finance.enforcementStatus,
              enforcementDebtId: run.finance.enforcementDebtId,
              dishonestStatus: run.finance.dishonestStatus,
              restrictedConsumption: run.finance.restrictedConsumption,
              seizedAssets: run.finance.seizedAssets,
              housingDisposition: run.finance.housingDisposition,
              repaymentAgreement: run.finance.repaymentAgreement,
              repaymentAgreementFulfilled: run.finance.repaymentAgreementFulfilled,
              reliefPending: run.finance.reliefPending,
            },
            housing: run.housing,
            social: run.social,
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
                  displayName: item.social?.displayName || null,
                  social: item.social || null,
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
                      reason: housingChoiceReason(choice, run) || debtGateReason(choice, run) || choice.reason || null,
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
    '<main class="loading-screen"><div><div class="loading-mark">◌</div><h2>正在准备这一生</h2><p>出身、年份和要遇见的人正在就位。</p></div></main>';
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
          nextDecisionId: () => startDecision(state.run, { preview: true })?.id || null,
          decisionCandidateLayers: () => Object.fromEntries(
            Object.entries(decisionCandidateLayers(state.run)).map(([key, events]) => [
              key,
              events.map((event) => event.id),
            ])
          ),
          episodeMetadata: (id) => copy(episodeMetadata(String(id))),
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
          updatePeople: () => {
            updatePeople(state.run);
            save();
            render();
            return copy(state.run);
          },
          forceEpisodeClosure: (id = 'shop_opening', reason = 'deadline') => {
            const record = state.run.episodes[id];
            return record?.status === 'active' ? queueEpisodeClosure(id, record, reason) : false;
          },
          forceEpisodeClosures: (ids = [], reason = 'deadline') =>
            queueEpisodeClosures(
              ids.flatMap((id) => {
                const record = state.run.episodes[id];
                return record?.status === 'active' ? [{ id, record, reason }] : [];
              })
            ),
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
          endingProfile: () => copy(endingProfile(state.run)),
          endingNearMisses: () => copy(endingNearMisses(state.run, endingProfile(state.run))),
          finalSignals: () => [...finalSignals(state.run)],
          unlockCodex: (finalLife = false) => {
            unlockCodex(Boolean(finalLife));
            return copy(state.meta.codex);
          },
          ongoingModifiers: () => [...ongoingModifiers(state.run)],
          chooseAttitude,
          mortalityCause: (source = 'age') => mortalityCause(state.run, source),
          latestSocialIntent: () => latestSocialIntent(state.run),
          socialEndingSignal: () => copy(socialEndingSignal(state.run)),
          dueConsequence: () => copy(dueConsequence(state.run)),
          routeTags: () => routeTags(state.run),
          lifeFactSummary: () => copy(lifeFactSummary(state.run)),
          pivotalFacts: () => copy(pivotalFacts(state.run)),
          ordinaryEndingSummary: (fallback = '') => ordinaryEndingSummary(state.run, fallback),
          endingPortraitFacts: () => copy(endingPortraitFacts(state.run)),
          timelineImportance: (item) => timelineImportance(item, state.run),
          annualTargetSize,
          continuityWeight: (id, continuity = false) => {
            const event = INDEX.event.get(String(id));
            return event ? eventWeight(event, state.run, { continuity: Boolean(continuity) }) : null;
          },
          ensureYearPlan: () => {
            if (!state.run.yearStarted) beginYear();
            save();
            render();
            return {
              phase: state.run.phase,
              yearStarted: state.run.yearStarted,
              rngState: state.run.rngState,
              queue: state.run.yearQueue.map((event) => event.id),
              queueRoles: state.run.yearQueue.map((event) => event.annualRole || event.kind),
              currentAgeTimelineCount: currentAgeTimelineCount(state.run),
            };
          },
          decisionAllowance: () => decisionAllowance(state.run),
          decisionQuotaOpen: () => decisionQuotaOpen(state.run),
          decisionStageBudgets: () => copy(decisionStageBudgets(state.run)),
          naturalDeathAgeForRoll,
          blackSwanRate: () => blackSwanRate(state.run),
          attributeWeightMultiplier: (id) => {
            const event = INDEX.event.get(String(id));
            return event ? attributeWeightMultiplier(event, state.run) : null;
          },
          bridgeFirstJobCandidates: () => bridgeFirstJobCandidates(state.run).map((profile) => profile.id),
          firstJobFailureAge: () => firstJobFailureAge(state.run),
          lifecycleCheckpointAge: (id) => {
            const event = INDEX.kinds.decision.find((item) => item.episode?.id === id);
            return event?.episode?.lifecycle
              ? lifecycleCheckpointAge(state.run, event.episode.lifecycle)
              : null;
          },
          housingContext: () => copy(currentHousingContext(state.run)),
          housingAffordability: (candidate = state.run.housing, options = {}) =>
            copy(housingAffordability(state.run, candidate, options)),
          housingChoiceAllowed: (kind, debtException = false) =>
            copy(housingChoiceAllowed(state.run, kind, debtException)),
          transitionHousing: (value, context = { sourceEventId: 'debug', choiceId: 'debug' }) => {
            const result = transitionHousing(state.run, value, context);
            syncDerived(state.run);
            render();
            return { result, housing: copy(state.run.housing) };
          },
          applyCommands: (commands, context = { sourceEventId: 'debug', choiceId: 'debug' }) => {
            const result = applyCommands(commands, context);
            syncDerived(state.run);
            render();
            return { result, run: copy(state.run) };
          },
          conceptionProfile: () => ({
            carrier: copy(conceptionCarrier(state.run)),
            chance: conceptionChance(state.run),
          }),
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
