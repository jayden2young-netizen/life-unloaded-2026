export const RUNTIME_OPERATORS = Object.freeze([
  'eq',
  'neq',
  'gte',
  'lte',
  'gt',
  'lt',
  'in',
  'notIn',
  'includes',
  'truthy',
]);

export const COMMAND_TYPES = Object.freeze([
  'add',
  'set',
  'expose',
  'tag',
  'addLiability',
  'repayDebt',
  'restructureDebt',
  'resolveDebtEnforcement',
  'healthIncident',
  'healthRecovery',
  'resolveApplication',
  'resolveGraduateApplication',
  'resolveFirstJobApplication',
  'acceptFirstJobOffer',
  'applyEmploymentProfile',
  'scaleEmployment',
  'leaveEmployment',
  'takeCareLeave',
  'completeEmploymentHandover',
  'adjustJobTier',
  'resolveLayoff',
  'grantCredential',
  'resolveConception',
  'createPerson',
  'createSocialPerson',
  'updateSocialPerson',
  'transitionSocialToDating',
  'confirmPartnership',
  'createEmploymentReferral',
  'transitionPartner',
  'transitionHousing',
  'socialCoResidence',
  'resolveInheritance',
  'transition',
  'claimDesire',
]);

export const HOUSING_STATUS = Object.freeze([
  'family', 'renting', 'owned', 'mortgaged', 'supported', 'unstable',
]);
export const HOUSING_ARRANGEMENTS = Object.freeze([
  'originFamily', 'dormitory', 'solo', 'shared', 'partner', 'multigenerational', 'service',
]);
export const HOUSING_REGIONS = Object.freeze([
  'tier1', 'tier2', 'county', 'town', 'us', 'europe',
]);
export const HOUSING_STABILITY = Object.freeze(['stable', 'conditional', 'temporary']);
export const HOUSING_ACCESSIBILITY = Object.freeze(['standard', 'adapted', 'supported']);
export const HOUSING_COST_SHARES = Object.freeze(['self', 'joint', 'supported']);
export const HOUSING_CHOICE_KINDS = Object.freeze([
  'educationHousing',
  'firstIndependent',
  'workMigration',
  'partnerReconfiguration',
  'homePurchase',
  'laterFit',
  'socialCoResidence',
  'debtRelief',
]);

export const SOCIAL_SLOTS = Object.freeze(['primary', 'secondary']);
export const SOCIAL_SOURCES = Object.freeze([
  'childhood', 'campus', 'work', 'roommate', 'neighbor', 'interest', 'online',
]);
export const SOCIAL_TIES = Object.freeze([
  'acquaintance', 'friend', 'close', 'distant', 'ended',
]);
export const SOCIAL_PROXIMITIES = Object.freeze(['local', 'remote', 'unknown']);
export const SOCIAL_TURNS = Object.freeze([
  'met', 'deepened', 'drifted', 'conflicted', 'reconnected',
]);
export const SOCIAL_SUPPORT = Object.freeze([
  'unseen', 'showedUp', 'limited', 'refused', 'unable',
]);
export const EMPLOYMENT_REFERRAL_STATUS = Object.freeze([
  'none', 'available', 'used', 'expired',
]);
export const SOCIAL_OUTCOME_MAX_VARIANTS = 3;
export const SOCIAL_ACTOR_FIELDS = Object.freeze([
  'socialSource', 'socialTieAny', 'socialProximity', 'socialTurnAny', 'socialSupportAny',
]);

export const READ_PATHS = Object.freeze([
  'age',
  'originHousehold.assets',
  'activity.mode',
  'business.equity',
  'business.operatingSkill',
  'business.scale',
  'business.status',
  'capabilities.cashBuffer',
  'capabilities.network',
  'capabilities.portableSkill',
  'desires.reclaimed',
  'desires.creation.fulfillment',
  'development.careLoad',
  'development.languagePreparation',
  'development.routeExposure',
  'development.routeKnowledge',
  'development.schoolHarmResolved',
  'development.severeSchoolHarm',
  'education.applicationIntent',
  'education.applicationRoute',
  'education.applicationAttemptCount',
  'education.researchEvidence',
  'education.extraApplicationYearUsed',
  'education.fullTimeUndergraduateClosed',
  'education.changeIntent',
  'education.domesticEligible',
  'education.domesticEntryReady',
  'education.domesticFundingReady',
  'education.domesticOffer',
  'education.enrollmentRegion',
  'education.graduateApplicationIntent',
  'education.graduateFundingStatus',
  'education.graduateOfferRegion',
  'education.highestCompleted',
  'education.level',
  'education.nextStage',
  'education.credentials',
  'education.professionalQualificationIntent',
  'education.overseasDepartureReady',
  'education.overseasFundingReady',
  'education.overseasOffer',
  'education.overseasPrepared',
  'education.overseasRouteOpen',
  'education.postgraduateSystem',
  'education.scholarshipReady',
  'education.secondaryAcademicEligible',
  'education.status',
  'education.undergraduateSystem',
  'employment.applicationRegion',
  'employment.applicationStatus',
  'employment.arrangement',
  'employment.contractType',
  'employment.employerType',
  'employment.entryCredential',
  'employment.firstJobAge',
  'employment.firstJobOutcome',
  'employment.incomeStability',
  'employment.jobTier',
  'employment.lastJob',
  'employment.pendingOfferId',
  'employment.profileId',
  'employment.referralPersonId',
  'employment.referralStatus',
  'employment.sector',
  'employment.status',
  'location.id',
  'finance.available',
  'finance.cash',
  'finance.debtStage',
  'finance.dishonestStatus',
  'finance.enforcementDebtId',
  'finance.enforcementStatus',
  'finance.hasArrears',
  'finance.hasEnforceableArrears',
  'finance.mortgagePaymentStress',
  'finance.housingDisposition',
  'finance.reliefPending',
  'finance.repaymentAgreement',
  'finance.repaymentAgreementFulfilled',
  'finance.restrictedConsumption',
  'finance.seizedAssets',
  'finance.totalDebt',
  'habits.recoveryYears',
  'habits.risk',
  'habits.stage',
  'habits.type',
  'health.careNeed',
  'health.conditionSeverity',
  'health.currentCondition',
  'health.disability',
  'health.physical',
  'health.status',
  'later.care',
  'later.inheritance',
  'later.retirement',
  'later.will',
  'legacy.medicalDirective',
  'legacy.plan',
  'mobility.mode',
  'mobility.belonging',
  'mobility.chineseCommunityTies',
  'mobility.localTies',
  'mobility.lastOverseasSystem',
  'mobility.platformDependence',
  'originHousehold.context.emotionalSafety',
  'originHousehold.context.housingStability',
  'originHousehold.context.parentPresence',
  'originHousehold.context.resourceTier',
  'originHousehold.context.resources',
  'pressures.body',
  'pressures.career',
  'pressures.family',
  'pressures.loneliness',
  'pressures.money',
  'relationships.activePartnerId',
  'relationships.childCount',
  'relationships.parenthoodIntent',
  'relationships.familyPlanningOffered',
  'relationships.familyPlanningDeferred',
  'relationships.familyPlanningClosed',
  'relationships.plannedConceptionResolved',
  'relationships.unplannedConceptionChecked',
  'relationships.pregnancyStatus',
  'relationships.pregnancyDecision',
  'relationships.pregnancyDecisionDeferred',
  'relationships.adoptionOffered',
  'relationships.adoptionStatus',
  'relationships.partnerStatus',
  'relationships.network',
  'social.primaryPersonId',
  'social.secondaryPersonId',
  'social.latestIntent',
  'outcomeTags.finance:limited_guarantee',
  'outcomeTags.finance:joint_guarantee',
  'housing.status',
  'housing.value',
  'housing.arrangement',
  'housing.region',
  'housing.stability',
  'housing.accessibility',
  'housing.costShare',
  'housing.coResidentRefs',
  'housing.sinceAge',
  'housing.keyChoiceCount',
  'housing.history',
]);

export const WRITE_PATHS = Object.freeze([
  'activity.funding',
  'activity.mode',
  'agency',
  'business.control',
  'business.equity',
  'business.mode',
  'business.operatingSkill',
  'business.scale',
  'business.status',
  'capabilities.boundary',
  'capabilities.careSkill',
  'capabilities.cashBuffer',
  'capabilities.creativity',
  'capabilities.employability',
  'capabilities.evidence',
  'capabilities.healthLiteracy',
  'capabilities.learning',
  'capabilities.negotiation',
  'capabilities.network',
  'capabilities.portableSkill',
  'capabilities.publicCredential',
  'capabilities.resilience',
  'capabilities.riskSense',
  'capabilities.skill',
  'desires',
  'desires.body.fulfillment',
  'desires.creation.fulfillment',
  'desires.freedom.fulfillment',
  'desires.peace.fulfillment',
  'development.attendance',
  'development.careLoad',
  'development.languagePreparation',
  'development.learningHabit',
  'development.peerSupport',
  'development.routeExposure',
  'development.routeKnowledge',
  'development.schoolHarmResolved',
  'development.schoolHarmResponse',
  'development.schoolHarmType',
  'development.selfAdvocacy',
  'development.severeSchoolHarm',
  'development.teacherSupport',
  'development.traumaLoad',
  'education',
  'education.applicationIntent',
  'education.applicationRoute',
  'education.applicationAttemptCount',
  'education.applicationResult',
  'education.applicationStatus',
  'education.extraApplicationYearUsed',
  'education.fullTimeUndergraduateClosed',
  'education.gaokaoAttemptCount',
  'education.gapYears',
  'education.campusEvidence',
  'education.changeIntent',
  'education.changeResult',
  'education.courseworkEvidence',
  'education.credentials',
  'education.domesticOffer',
  'education.domesticOfferType',
  'education.enrollmentRegion',
  'education.entryPermitReady',
  'education.fundingStatus',
  'education.graduateApplicationIntent',
  'education.graduateApplicationResult',
  'education.graduateApplicationStatus',
  'education.graduateFundingStatus',
  'education.graduateOfferRegion',
  'education.highestCompleted',
  'education.lastApplicationOutcome',
  'education.nextStage',
  'education.overseasUndergradAttemptCount',
  'education.overseasOffer',
  'education.overseasOfferType',
  'education.postgraduateSystem',
  'education.professionalQualificationIntent',
  'education.practiceEvidence',
  'education.researchEvidence',
  'education.scholarshipAwarded',
  'education.status',
  'education.timelineOffsetYears',
  'education.undergraduateSystem',
  'employment',
  'employment.applicationChannel',
  'employment.applicationRegion',
  'employment.applicationStatus',
  'employment.arrangement',
  'employment.career',
  'employment.contract',
  'employment.contractType',
  'employment.employerType',
  'employment.entryCredential',
  'employment.experience',
  'employment.firstJobAge',
  'employment.firstJobEntryPath',
  'employment.firstJobOutcome',
  'employment.incomeAnnualGross',
  'employment.incomeStability',
  'employment.jobTier',
  'employment.lastJob',
  'employment.careLeaveUntilAge',
  'employment.pendingOfferId',
  'employment.profileId',
  'employment.referralPersonId',
  'employment.referralStatus',
  'employment.publicExperience',
  'employment.rank',
  'employment.salary',
  'employment.sector',
  'employment.status',
  'finance.cash',
  'finance.debtStage',
  'finance.dishonestStatus',
  'finance.enforcementDebtId',
  'finance.enforcementStatus',
  'finance.housingDisposition',
  'finance.liabilities',
  'finance.reliefPending',
  'finance.repaymentAgreement',
  'finance.repaymentAgreementFulfilled',
  'finance.restrictedConsumption',
  'finance.seizedAssets',
  'habits.recoveryYears',
  'habits.risk',
  'habits.stage',
  'habits.type',
  'health',
  'health.careNeed',
  'health.disability',
  'health.mental',
  'health.physical',
  'health.status',
  'history',
  'housing',
  'later.care',
  'later.inheritance',
  'later.retirement',
  'later.will',
  'legacy.medicalDirective',
  'legacy.plan',
  'mobility.belonging',
  'mobility.chineseCommunityTies',
  'mobility.dailyAdaptation',
  'mobility.discriminationLoad',
  'mobility.hostLanguage',
  'mobility.lastOverseasSystem',
  'mobility.localTies',
  'mobility.mode',
  'mobility.platformDependence',
  'mobility.rootlessness',
  'mobility.visaPressure',
  'originHousehold.assets',
  'originHousehold.debt',
  'people',
  'pressures.body',
  'pressures.career',
  'pressures.family',
  'pressures.loneliness',
  'pressures.money',
  'relationships.childBond',
  'relationships.network',
  'relationships.originBond',
  'relationships.parenthoodIntent',
  'relationships.familyPlanningOffered',
  'relationships.familyPlanningDeferred',
  'relationships.familyPlanningClosed',
  'relationships.plannedConceptionResolved',
  'relationships.unplannedConceptionChecked',
  'relationships.pregnancyStatus',
  'relationships.pregnancyDecision',
  'relationships.pregnancyDecisionDeferred',
  'relationships.adoptionOffered',
  'relationships.adoptionStatus',
  'relationships.partnerBond',
  'relationships.partnerStatus',
  'social',
  'social.primaryPersonId',
  'social.secondaryPersonId',
]);

// Open evidence registry. It is intentionally incomplete and may only grow when
// current authored content provides evidence. Missing relationships are neutral.
export const TRACK_DESIRE_EVIDENCE = Object.freeze([
  Object.freeze({
    track: 'leisure',
    desire: 'freedom',
    evidenceType: 'state-effect',
    evidencePath: 'desires.freedom.fulfillment',
    introducedIn: '0.6.2',
    note: '当前不工作与自由事件直接写入自由满足度。',
  }),
  Object.freeze({
    track: 'later',
    desire: 'peace',
    evidenceType: 'state-effect',
    evidencePath: 'desires.peace.fulfillment',
    introducedIn: '0.6.2',
    note: '当前晚年事件直接写入安宁满足度。',
  }),
  Object.freeze({
    track: 'health',
    desire: 'body',
    evidenceType: 'state-effect',
    evidencePath: 'desires.body.fulfillment',
    introducedIn: '0.6.2',
    note: '当前健康事件直接写入身体满足度。',
  }),
  Object.freeze({track:'children',desire:'familyBelonging',evidenceType:'state-effect',evidencePath:'relationships.childBond',introducedIn:'0.6.9',note:'子女事件直接改变真实子女关系。'}),
  Object.freeze({track:'finance',desire:'security',evidenceType:'state-effect',evidencePath:'finance.cash',introducedIn:'0.6.9',note:'财务事件直接改变可用现金。'}),
  Object.freeze({track:'education',desire:'achievement',evidenceType:'state-effect',evidencePath:'education.practiceEvidence',introducedIn:'0.6.9',note:'教育事件直接形成可核对的课程、实践和申请证据。'}),
  Object.freeze({track:'partnership',desire:'love',evidenceType:'state-effect',evidencePath:'relationships.partnerBond',introducedIn:'0.6.9',note:'伴侣事件只在真实伴侣存在时改变关系。'}),
  Object.freeze({track:'business',desire:'wealth',evidenceType:'state-effect',evidencePath:'business.equity',introducedIn:'0.6.9',note:'经营事件直接改变企业权益。'}),
  Object.freeze({track:'public',desire:'recognition',evidenceType:'state-effect',evidencePath:'capabilities.publicCredential',introducedIn:'0.6.9',note:'公共职业事件直接形成可核对的岗位资历。'}),
  Object.freeze({track:'later',desire:'creation',evidenceType:'state-effect',evidencePath:'desires.creation.fulfillment',introducedIn:'0.6.9',note:'晚年创作回响直接改变创造满足度。'}),
  Object.freeze({track:'later',desire:'care',evidenceType:'state-effect',evidencePath:'pressures.family',introducedIn:'0.6.9',note:'晚年照护选择直接改变真实家庭分工压力。'}),
]);

export const DESIRE_IDS = Object.freeze([
  'freedom',
  'security',
  'achievement',
  'wealth',
  'love',
  'familyBelonging',
  'recognition',
  'exploration',
  'peace',
  'care',
  'body',
  'status',
  'creation',
]);

export const OPPORTUNITY_GROUPS = Object.freeze([
  'business.opening',
  'career.firstJob',
  'education.qualification',
  'education.reeducation',
  'health.management',
  'housing.purchase',
  'housing.workMigration',
  'later.learning',
  'lifestyle.careerBreak',
  'relationship.start',
  'social.firstMeeting',
  'social.reconnect',
  'social.support',
]);

export const OPPORTUNITY_RESPONSES = Object.freeze(['protect', 'weight']);
export const CARD_INTERACTION_SCOPES = Object.freeze(['family', 'general']);

const habitEpisodeCatalogExceptions = [
  'alcohol',
  'gambling',
  'gaming',
  'medication',
  'shopping',
].flatMap((habit) =>
  ['formation', 'relapse', 'treatment'].map((stage) => `habit_${habit}_${stage}`)
);

export const EPISODE_CATALOG_EXCEPTIONS = Object.freeze({
  habits: Object.freeze([...habitEpisodeCatalogExceptions].sort()),
  standalone: Object.freeze([
    'acute_illness',
    'career_break',
    'guarantee_recourse',
    'layoff_reemployment',
    'public_exam',
    'shop_opening',
  ]),
});

export const EPISODE_CATALOG_EXCEPTION_IDS = Object.freeze(
  [...EPISODE_CATALOG_EXCEPTIONS.habits, ...EPISODE_CATALOG_EXCEPTIONS.standalone].sort()
);

const operatorSet = new Set(RUNTIME_OPERATORS);
const commandSet = new Set(COMMAND_TYPES);
const readPathSet = new Set(READ_PATHS);
const writePathSet = new Set(WRITE_PATHS);
const desireIdSet = new Set(DESIRE_IDS);
const opportunityGroupSet = new Set(OPPORTUNITY_GROUPS);
const opportunityResponseSet = new Set(OPPORTUNITY_RESPONSES);
const cardInteractionScopeSet = new Set(CARD_INTERACTION_SCOPES);

export const isRuntimeOperator = (value) => operatorSet.has(value);
export const isCommandType = (value) => commandSet.has(value);
export const isReadPath = (value) => readPathSet.has(value);
export const isWritePath = (value) => writePathSet.has(value);
export const isDesireId = (value) => desireIdSet.has(value);
export const isOpportunityGroup = (value) => opportunityGroupSet.has(value);
export const isOpportunityResponse = (value) => opportunityResponseSet.has(value);
export const isCardInteractionScope = (value) => cardInteractionScopeSet.has(value);

export function isOpportunityMetadata(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      isOpportunityGroup(value.group) &&
      Array.isArray(value.desires) &&
      value.desires.length > 0 &&
      new Set(value.desires).size === value.desires.length &&
      value.desires.every(isDesireId) &&
      isOpportunityResponse(value.response)
  );
}

export function isRouteSituations(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0 &&
      Object.entries(value).every(
        ([route, situation]) => route.length > 0 && typeof situation === 'string' && situation.trim()
      )
  );
}

export function compareByOperator(actual, op, expected) {
  if (!isRuntimeOperator(op)) throw new Error(`未知 operator：${String(op)}`);
  if (op === 'eq') return actual === expected;
  if (op === 'neq') return actual !== expected;
  if (op === 'gte') return Number(actual) >= Number(expected);
  if (op === 'lte') return Number(actual) <= Number(expected);
  if (op === 'gt') return Number(actual) > Number(expected);
  if (op === 'lt') return Number(actual) < Number(expected);
  if (op === 'in') return expected.includes(actual);
  if (op === 'notIn') return !expected.includes(actual);
  if (op === 'includes') return Array.isArray(actual) && actual.includes(expected);
  return Boolean(actual);
}

export function conflictWeightMultiplier(track, conflictDesires) {
  if (!track || !Array.isArray(conflictDesires)) return 1;
  return TRACK_DESIRE_EVIDENCE.some(
    (entry) => entry.track === track && conflictDesires.includes(entry.desire)
  )
    ? 1.2
    : 1;
}
