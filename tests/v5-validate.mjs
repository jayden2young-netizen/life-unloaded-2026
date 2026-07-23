import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};
const keys=(value,allowed,label)=>{for(const key of Object.keys(value||{}))check(allowed.includes(key),`${label}: unknown field ${key}`)};
const kinds=Object.groupBy(data.events,event=>event.kind);
const eventMap=new Map(data.events.map(event=>[event.id,event]));
const tracks=['education','employment','public','remote','business','leisure','partnership','children','finance','health','habits','later'];
const rootFields=['version','gameVersion','schemaVersion','contentRevision','stages','locations','desires','conflicts','familyArchetypes','familySecrets','cards','events','episodeCatalog','endingProfiles','endingTitles','codex','realityRules','trackCoverage'];
const eventFields={beat:['id','kind','track','stage','ageMin','ageMax','icon','text','tone','intensity','requirements','actors','effects','assertions','weight','contentRevision'],decision:['id','kind','track','stage','ageMin','ageMax','icon','prompt','situation','requirements','actors','choices','arc','episode','assertions','weight','priority','contentRevision'],consequence:['id','kind','track','stage','ageMin','ageMax','icon','text','sourceDecisionId','requirements','actors','choiceOutcomes','assertions','weight','contentRevision'],blackSwan:['id','kind','track','stage','ageMin','ageMax','icon','text','intensity','requirements','actors','effects','assertions','valence','weight','contentRevision']};
const choiceFields=['id','text','resultText','hints','requirements','effects','commitments','consequences','outcomeTags','memoryKey','route','arcExit'];
const commandFields=['type','target','value','kind','rate','guaranteed','relation','status','replace','condition','resolve'];
const commandTypes=['add','set','tag','addLiability','repayDebt','restructureDebt','healthIncident','healthRecovery','createPerson','transitionPartner','transition','claimDesire'];
const employmentStates=['none','employed','gig','selfEmployed','unemployed','retired','careLeave'];
const habitStages=['none','exposed','repeating','dependent','uncontrolled','treatment','recovery','relapse'];
const habitTypes=['none','gambling','alcohol','gaming','shopping','medication'];
const allowedPrefixes=['age','world.','originHousehold.','education','education.','roles','employment.','activity.','finance.','housing.','relationships.','health','health.','habits.','capabilities.','mobility.','business.','pressures.','desires.','legacy.','agency'];
const pathAllowed=path=>allowedPrefixes.some(prefix=>prefix.endsWith('.')?String(path).startsWith(prefix):path===prefix||String(path).startsWith(`${prefix}.`));
const predicateFields=['path','op','value'],ops=['eq','neq','gte','lte','gt','lt','in','notIn','includes','truthy'];
const actorFields=['slot','relation','relationAny','alive','statusAny','optional','ageMin','ageMax','personIdPath'];
const episodeFields=['id','lane','phase','role','delayYears','deadlineYears'];
const stageOverlap=event=>(event.stage||[]).some(stage=>{const range=data.stages[stage];return range&&Math.max(range[0],event.ageMin)<=Math.min(range[1],event.ageMax)});
const hasPredicate=(event,path,op,value)=>[...(event.requirements?.all||[]),...(event.requirements?.any||[]),...(event.requirements?.none||[])].some(rule=>rule.path===path&&(!op||rule.op===op)&&(value===undefined||JSON.stringify(rule.value)===JSON.stringify(value)));
const inspectPredicates=(requirements,label)=>{keys(requirements,['all','any','none'],label);for(const group of['all','any','none'])for(const rule of requirements?.[group]||[]){keys(rule,predicateFields,`${label}:${group}`);check(pathAllowed(rule.path),`${label}: unsupported predicate path ${rule.path}`);check(ops.includes(rule.op),`${label}: unsupported predicate op ${rule.op}`)}};
const inspectCommands=(commands,label)=>{check(Array.isArray(commands),`${label}: effects must be command array`);for(const command of commands||[]){keys(command,commandFields,label);check(commandTypes.includes(command.type),`${label}: unknown command ${command.type}`);if(!['tag','createPerson','transitionPartner','claimDesire'].includes(command.type))check(pathAllowed(command.target),`${label}: unsupported command target ${command.target}`);if(command.type==='add'&&command.target==='finance.cash'&&command.value)check(Math.abs(command.value)<=70000,`${label}: ordinary cash delta exceeds 70000`);if(command.type==='set'&&command.target==='employment.status')check(employmentStates.includes(command.value),`${label}: invalid employment state ${command.value}`);if(command.type==='set'&&command.target==='habits.stage')check(habitStages.includes(command.value),`${label}: invalid habit stage ${command.value}`);if(command.type==='set'&&command.target==='habits.type')check(habitTypes.includes(command.value),`${label}: invalid habit type ${command.value}`);if(command.type==='addLiability'){check(command.value>0,`${label}: nonpositive liability`);check(command.rate>0&&command.rate<=.2,`${label}: unrealistic liability rate`)}}};

keys(data,rootFields,'root');
check(data.version==='0.5.8'&&data.gameVersion==='0.5.8','version is not 0.5.8');
check(data.schemaVersion===8,'schemaVersion is not 8');
check(data.contentRevision===15,'contentRevision is not 15');
check((kinds.beat||[]).length===400,'annual beats must remain 400');
check((kinds.decision||[]).length===124,'v0.5.8 must contain 124 decisions');
check((kinds.consequence||[]).length===124,'every major decision must own a consequence');
check((kinds.blackSwan||[]).length===20,'black swans must remain 20');
check(data.events.length===668,'v0.5.8 causal coverage must total 668 nodes');
check(data.cards.length===72,'cards must remain 72');
check(data.familyArchetypes.length===30,'families must remain 30');
check(data.familySecrets.length===44,'secrets must remain 44');
check(data.endingProfiles.length===16&&data.endingTitles.length===64,'ending catalog must be 16 profiles / 64 titles');
check(data.codex.length===30,'codex must remain 30');

const eventIds=new Set(),choiceIds=new Set(),memoryKeys=new Set(),texts=new Set();
for(const event of data.events){
  keys(event,eventFields[event.kind]||[],event.id);check(!eventIds.has(event.id),`${event.id}: duplicate event id`);eventIds.add(event.id);check(Number.isFinite(event.ageMin)&&Number.isFinite(event.ageMax)&&event.ageMin<=event.ageMax,`${event.id}: invalid age range`);check(stageOverlap(event),`${event.id}: stage and age do not overlap`);check(event.contentRevision===15,`${event.id}: stale content revision`);inspectPredicates(event.requirements,event.id);
  if(event.episode){keys(event.episode,episodeFields,`${event.id}:episode`);check(event.episode.id&&['career','family','personal','lifestyle','finance','relationship','parenting','mobility'].includes(event.episode.lane),`${event.id}: invalid episode identity or lane`);check(Number.isInteger(event.episode.phase)&&event.episode.phase>=1,`${event.id}: invalid episode phase`);check(['start','continue','resolve'].includes(event.episode.role),`${event.id}: invalid episode role`);check(Number.isInteger(event.episode.delayYears)&&event.episode.delayYears>=0,`${event.id}: invalid episode delay`);check(Number.isInteger(event.episode.deadlineYears)&&event.episode.deadlineYears>=1&&event.episode.deadlineYears<=5,`${event.id}: invalid episode deadline`);check(typeof event.situation==='string'&&event.situation.length>0,`${event.id}: episode situation missing`);check(event.arc===null,`${event.id}: episode cannot also be an arc`)}
  for(const actor of event.actors||[]){keys(actor,actorFields,`${event.id}:actor`);check(actor.slot,`${event.id}: actor missing slot`);check(actor.relation||actor.relationAny,`${event.id}: actor missing relation query`)}
  const visible=event.text||event.prompt;check(typeof visible==='string'&&visible.length>0,`${event.id}: missing visible text`);if(event.kind==='beat'){check(!texts.has(visible),`${event.id}: duplicate beat text`);texts.add(visible)}
  if(event.kind==='beat'||event.kind==='blackSwan')inspectCommands(event.effects,event.id);
  for(const assertion of event.assertions||[])check((event.actors||[]).some(actor=>actor.slot===assertion.actor),`${event.id}: assertion references missing actor`);
}

for(const track of tracks){
  const beats=(kinds.beat||[]).filter(event=>event.track===track),decisions=(kinds.decision||[]).filter(event=>event.track===track&&event.arc),expectedDecisions=track==='business'?4:['education','later'].includes(track)?8:0;check(beats.length===32,`${track}: needs 32 authored beats`);check(decisions.length===expectedDecisions,`${track}: needs ${expectedDecisions} legacy arc decisions`);check(JSON.stringify(data.trackCoverage[track]?.roles)==='["entry","development","daily","conflict","crisis","recovery","exit","legacy"]',`${track}: incomplete coverage roles`);
  const intensities=Object.groupBy(beats,event=>event.intensity);check((intensities.low||[]).length===8&&(intensities.medium||[]).length===16&&(intensities.high||[]).length===8,`${track}: intensity coverage must be 8/16/8`);
  const arcs=Object.groupBy(decisions,event=>event.arc?.id);for(const [id,events]of Object.entries(arcs)){const expectedNodes=track==='habits'?[1,2,3]:[1,2,3,4];check(events.length===expectedNodes.length,`${id}: arc must have ${expectedNodes.length} nodes`);check(JSON.stringify(events.map(event=>event.arc.node))===JSON.stringify(expectedNodes),`${id}: arc nodes must be sequential`);check(events[0].arc.role==='start'&&events.at(-1).arc.role==='resolve',`${id}: arc lacks explicit start/resolve`);check(events.every((event,index)=>index===0||event.ageMin>=events[index-1].ageMin),`${id}: later node can start younger than its source`)}}

for(const decision of kinds.decision||[]){
  const singlePhase=decision.episode&&(kinds.decision||[]).filter(event=>event.episode?.id===decision.episode.id).length===1;check(decision.choices.length===(decision.episode?.role==='resolve'||singlePhase?4:3),`${decision.id}: unexpected choice count`);const signature=decision.choices.map(choice=>choice.text).join('|');check(!texts.has(signature),`${decision.id}: repeated choice set`);texts.add(signature);
  for(const choice of decision.choices){keys(choice,choiceFields,choice.id);check(!choiceIds.has(choice.id),`${choice.id}: duplicate choice id`);choiceIds.add(choice.id);check(choice.memoryKey&&!memoryKeys.has(choice.memoryKey),`${choice.id}: missing or duplicate memory key`);memoryKeys.add(choice.memoryKey);inspectCommands(choice.effects,choice.id);check(choice.outcomeTags.length>=2,`${choice.id}: lacks specific outcome tags`);check(choice.consequences.length===1,`${choice.id}: major choice lacks scheduled consequence`);const spec=choice.consequences[0],echo=eventMap.get(spec.eventId);check(echo?.kind==='consequence',`${choice.id}: consequence event missing`);check(echo?.sourceDecisionId===decision.id,`${choice.id}: consequence source mismatch`);check(Boolean(echo?.choiceOutcomes?.[choice.memoryKey]),`${choice.id}: no choice-specific outcome`);check(spec.delayMin>=1&&spec.delayMax>=spec.delayMin,`${choice.id}: consequence can occur before choice`)}
}

for(const consequence of kinds.consequence||[]){const source=eventMap.get(consequence.sourceDecisionId);check(source?.kind==='decision',`${consequence.id}: source decision missing`);check(consequence.ageMin>=Math.min(105,source.ageMin+1),`${consequence.id}: consequence age precedes source`);check(Object.keys(consequence.choiceOutcomes||{}).length===source?.choices?.length,`${consequence.id}: must cover every option`);for(const[key,outcome]of Object.entries(consequence.choiceOutcomes||{})){check(memoryKeys.has(key),`${consequence.id}: unknown memory ${key}`);keys(outcome,['text','effects','outcomeTags'],`${consequence.id}:${key}`);check(typeof outcome.text==='string'&&!outcome.text.includes('[object Object]'),`${consequence.id}:${key}: invalid text`);inspectCommands(outcome.effects,`${consequence.id}:${key}`);check(outcome.outcomeTags.includes('echo'),`${consequence.id}:${key}: lacks echo tag`)}}

const shopEpisodes=(kinds.decision||[]).filter(event=>event.episode?.id==='shop_opening');
check(JSON.stringify(shopEpisodes.map(event=>event.episode.phase))==='[1,2,3]','shop episode phases are not sequential');
check(shopEpisodes[0]?.episode.role==='start'&&shopEpisodes[1]?.episode.role==='continue'&&shopEpisodes[2]?.episode.role==='resolve','shop episode lacks start/continue/resolve');
check(shopEpisodes.every(event=>event.episode.deadlineYears===5),'shop episode must end within five years');
check(JSON.stringify(shopEpisodes[2]?.choices.map(choice=>choice.route))==='["survived","independent","stop_loss","debt_failure"]','shop episode endings are incomplete');
const episodeExpectations={
  public_exam:{roles:['start','resolve'],deadline:2,routes:['appointed','retake','market_exit','withdrawn']},
  layoff_reemployment:{roles:['start','resolve'],deadline:2,routes:['same_field','bridge_job','retrained','long_search']},
  career_break:{roles:['start','continue','resolve'],deadline:3,routes:['continue','low_intensity','full_time','forced_return']},
  guarantee_recourse:{roles:['start','continue','resolve'],deadline:3,routes:['recovered','restructured','relationship_break','default_failure']},
  acute_illness:{roles:['start','continue','continue','resolve'],deadline:4,routes:['cured','managed','limited','treatment_exit']},
  relationship_start:{roles:['start','resolve'],deadline:2,routes:['stable','cohabiting','separate','ended']},
  marriage_crisis:{roles:['start','resolve'],deadline:2,routes:['repaired','coexist','divorce_prepared','broken']},
  divorce:{roles:['start','resolve'],deadline:2,routes:['settled','interim','paused','conflict']},
  reconciliation:{roles:['start','resolve'],deadline:2,routes:['restored','friends','exited','repeated_break']},
  late_companionship:{roles:['start','resolve'],deadline:3,routes:['stable','near_living','exited','invalidated']},
  becoming_parent:{roles:['start','resolve'],deadline:3,routes:['born','waiting','stopped','invalidated']},
  adoption_process:{roles:['start','continue','resolve'],deadline:3,routes:['adopted','waiting','withdrawn','invalidated']},
  school_entry:{roles:['start'],deadline:1,routes:['enrolled','deferred','alternative','invalidated']},
  adolescence_boundary:{roles:['start','resolve'],deadline:2,routes:['agreed','coexist','exited','trust_failure']},
  adult_child_boundary:{roles:['start','resolve'],deadline:2,routes:['independent','coexist','support_exit','entangled']},
  first_remote_contract:{roles:['start'],deadline:1,routes:['accepted','trial','declined','invalidated']},
  platform_dependence:{roles:['start','resolve'],deadline:2,routes:['independent','coexist','exited','invalidated']},
  overseas_visa:{roles:['start','resolve'],deadline:2,routes:['approved','limited','withdrawn','invalidated']},
  establish_base:{roles:['start','resolve'],deadline:3,routes:['rooted','dual','returned','invalidated']}
};
for(const type of['gambling','alcohol','gaming','shopping','medication'])for(const[kind,routes]of[['formation',['stopped','exposed','dependent','uncontrolled']],['treatment',['recovery','continuing','support_exit','uncontrolled']],['relapse',['recovery_reset','treatment_return','lapse_only','relapse']]])episodeExpectations[`habit_${type}_${kind}`]={roles:['start','resolve'],deadline:2,routes};
const catalogEpisodeIds=new Set(['relationship_start','marriage_crisis','divorce','reconciliation','late_companionship','becoming_parent','adoption_process','school_entry','adolescence_boundary','adult_child_boundary','first_remote_contract','platform_dependence','overseas_visa','establish_base']);
for(const[id,expected]of Object.entries(episodeExpectations)){
  const events=(kinds.decision||[]).filter(event=>event.episode?.id===id).sort((a,b)=>a.episode.phase-b.episode.phase);
  const catalog=data.episodeCatalog[id];
  if(catalogEpisodeIds.has(id)){
    check(Boolean(catalog?.label&&catalog?.deadline&&catalog?.invalidated),`${id}: catalog closure copy is incomplete`);
    check(Array.isArray(catalog?.abandonedRoutes)&&catalog.abandonedRoutes.every(route=>events.some(event=>event.choices.some(choice=>choice.route===route))),`${id}: catalog contains an unknown abandoned route`);
  }
  check(JSON.stringify(events.map(event=>event.episode.role))===JSON.stringify(expected.roles),`${id}: roles are incomplete`);
  check(events.every(event=>event.episode.deadlineYears===expected.deadline),`${id}: deadline is incorrect`);
  check(JSON.stringify(events.at(-1)?.choices.map(choice=>choice.route))===JSON.stringify(expected.routes),`${id}: endings are incomplete`);
}

for(const event of kinds.beat||[]){
  if(event.track==='employment')check(hasPredicate(event,'employment.status','eq','employed'),`${event.id}: workplace beat can hit nonworker`);
  if(event.track==='public')check(hasPredicate(event,'employment.employerType','eq','public'),`${event.id}: public-service beat can hit other sectors`);
  if(event.track==='remote')check(hasPredicate(event,'employment.arrangement')||hasPredicate(event,'mobility.mode'),`${event.id}: remote beat lacks remote state`);
  if(event.track==='business')check(hasPredicate(event,'business.status'),`${event.id}: business beat can occur after closure`);
  if(event.track==='leisure')check(hasPredicate(event,'activity.mode'),`${event.id}: leisure beat can hit active worker`);
  if(event.track==='habits'){check(hasPredicate(event,'habits.risk','gte',1),`${event.id}: addiction beat has no exposure state`);check(habitTypes.slice(1).some(type=>hasPredicate(event,'habits.type','eq',type)),`${event.id}: addiction beat has no exact type gate`);check(hasPredicate(event,'habits.stage','in'),`${event.id}: addiction beat has no stage gate`)}
  if(event.track==='children'&&event.actors?.length){check(hasPredicate(event,'relationships.childCount','gte',1),`${event.id}: child actor lacks child count gate`);check(event.actors.some(actor=>actor.relationAny?.includes('child')&&Number.isFinite(actor.ageMin)&&Number.isFinite(actor.ageMax)),`${event.id}: child scene lacks actual child age`)}
  if(event.track==='partnership'&&event.actors?.length)check(event.actors.some(actor=>actor.relation==='partner'),`${event.id}: partner scene lacks partner actor`);
  if(event.track==='health'&&event.effects.some(effect=>effect.type==='healthIncident'))check(hasPredicate(event,'health.status'),`${event.id}: health incident lacks current-health gate`);
  if(event.track==='health'&&event.effects.some(effect=>effect.type==='healthRecovery'))check(hasPredicate(event,'health.status'),`${event.id}: recovery beat can occur while healthy`);
  if(event.track==='finance'&&/还款|催收|法院|债务/.test(event.text))check(hasPredicate(event,'finance.totalDebt')||hasPredicate(event,'finance.hasArrears'),`${event.id}: debt scene lacks actual debt state`);
}
for(const decision of kinds.decision||[]){if(decision.track==='remote'&&decision.arc?.node===1)check(hasPredicate(decision,'capabilities.portableSkill','gte',1),`${decision.id}: remote start lacks portable skill`);if(decision.track==='business'&&decision.arc?.node===1)check(hasPredicate(decision,'finance.available','gte',5000),`${decision.id}: business start lacks funding`);if(decision.track==='children'&&decision.arc?.node>2){check(hasPredicate(decision,'relationships.childCount','gte',1),`${decision.id}: child continuation lacks child state`);check(decision.actors.some(actor=>actor.relationAny?.includes('child')&&Number.isFinite(actor.ageMin)),`${decision.id}: child decision lacks actual child age`)}if(decision.track==='health'&&decision.episode?.role==='start')check(hasPredicate(decision,'health.status')||hasPredicate(decision,'health.conditionSeverity'),`${decision.id}: healthy person can start illness episode`);if(decision.track==='habits'){const match=/^habit_(.+)_(formation|treatment|relapse)$/.exec(decision.episode?.id||''),type=match?.[1],kind=match?.[2];check(Boolean(match),`${decision.id}: addiction decision lacks typed episode`);if(kind==='formation'&&decision.episode.role==='start'){check(hasPredicate(decision,'habits.type','eq','none')&&hasPredicate(decision,'habits.stage','eq','none'),`${decision.id}: addiction formation can overwrite an active type`);check(decision.choices.every(choice=>!choice.effects.some(effect=>effect.type==='set'&&effect.target==='habits.stage'&&['dependent','uncontrolled'].includes(effect.value))),`${decision.id}: first contact directly diagnoses dependence`)}else check(hasPredicate(decision,'habits.type','eq',type),`${decision.id}: addiction episode lacks exact type gate`);if(kind==='treatment'&&decision.episode.role==='start')check(hasPredicate(decision,'habits.stage','in',['dependent','uncontrolled']),`${decision.id}: treatment starts before control or function is impaired`);if(kind==='relapse'&&decision.episode.role==='start')check(hasPredicate(decision,'habits.stage','eq','recovery')&&hasPredicate(decision,'habits.recoveryYears','gte',1),`${decision.id}: relapse starts outside established recovery`);if(type==='medication'&&kind==='formation'&&decision.episode.role==='start')check(hasPredicate(decision,'health.status')||hasPredicate(decision,'health.currentCondition'),`${decision.id}: medication route lacks a real treatment gate`)}if(/普高|职校/.test(decision.prompt))check(decision.ageMin>=13&&decision.ageMax<=18,`${decision.id}: secondary-school choice is outside adolescence`);if(/退休|返聘/.test(decision.prompt))check(decision.ageMin>=50,`${decision.id}: retirement choice is too young`);if(/青春期/.test(decision.prompt))check(decision.actors.some(actor=>actor.ageMin>=10&&actor.ageMax<=20),`${decision.id}: adolescent child has no matching age`);if(/成年孩子|兼职收入/.test(decision.prompt))check(decision.actors.some(actor=>actor.ageMin>=18),`${decision.id}: adult-child choice lacks adult actor`)}

const secretTexts=new Set();for(const secret of data.familySecrets){check(secret.age>=15&&secret.age<=65,`${secret.id}: reveal age outside range`);check(secret.familyClasses.length===2,`${secret.id}: family affinity missing`);check(!secretTexts.has(secret.text),`${secret.id}: duplicate secret text`);secretTexts.add(secret.text);inspectCommands(secret.effects,secret.id)}
for(const family of data.familyArchetypes){for(const field of['parentCount','siblingRange','housingOptions','assetRange','debtRange','parentJobs','advantages','risks'])check(family[field]!==undefined,`${family.id}: missing ${field}`);check(family.parentCount>=1&&family.parentCount<=2,`${family.id}: invalid parent count`);check(family.siblingRange[0]<=family.siblingRange[1],`${family.id}: invalid sibling range`)}
const cardNames=new Set(),cardTexts=new Set(),cardAges=new Map([0,18,35,55].map(age=>[age,0])),deadCardCapabilities=new Set(['evidence','network','cashBuffer','boundary','learning','riskSense','creativity','careSkill','negotiation']);
for(const card of data.cards){
  keys(card,['id','kind','drawAge','displayName','text','mechanic','effects','contentRevision'],card.id);inspectCommands(card.effects,card.id);check(card.contentRevision===15,`${card.id}: stale revision`);
  check(cardAges.has(card.drawAge),`${card.id}: invalid draw age`);cardAges.set(card.drawAge,(cardAges.get(card.drawAge)||0)+1);
  check(card.kind===(card.drawAge===0?'innate':'stage'),`${card.id}: kind does not match draw age`);
  check(!/[·・]\s*(起步|转折|中段|回稳|余生)|你更容易在|保留一个可用选项/.test(`${card.displayName}${card.text}`),`${card.id}: leaks generated card language`);
  check(!cardNames.has(card.displayName),`${card.id}: duplicate display name`);cardNames.add(card.displayName);
  check(!cardTexts.has(card.text),`${card.id}: duplicate card text`);cardTexts.add(card.text);
  if(deadCardCapabilities.has(card.mechanic))check(card.effects.some(effect=>effect.type==='add'&&effect.target!==`capabilities.${card.mechanic}`),`${card.id}: card mechanic has no practical state effect`);
}
check(cardAges.get(0)===12,'birth card pool must contain 12 cards');for(const age of[18,35,55])check(cardAges.get(age)===20,`age ${age} card pool must contain 20 cards`);
for(const profile of data.endingProfiles){check(profile.signals.length===2,`${profile.id}: ending must require two facts`);check(['常见','少见','罕见','极罕','传奇'].includes(profile.rarity),`${profile.id}: invalid rarity`);check(data.endingTitles.filter(title=>title.profileId===profile.id).length===4,`${profile.id}: needs four curated titles`)}
for(const entry of data.codex){const rule=entry.unlockRules||{};check(rule.outcomeTagsAny?.length||rule.stateAny?.length||rule.stateAll?.length,`${entry.id}: missing structured unlock`);for(const predicate of[...(rule.stateAny||[]),...(rule.stateAll||[])]){check(pathAllowed(predicate.path),`${entry.id}: invalid state path`);check(ops.includes(predicate.op),`${entry.id}: invalid state op`)}}
check(Object.keys(data.realityRules).sort().join(',')==='debt,education,employment,family,franchise,platform,retirement','reality rules are incomplete');
check(!JSON.stringify(data).includes('beatEffects'),'generated data leaks generic beatEffects');
check(!JSON.stringify(data).includes('[object Object]'),'generated data contains object rendering artifact');

const report={version:data.version,schemaVersion:data.schemaVersion,contentRevision:data.contentRevision,events:Object.fromEntries(Object.entries(kinds).map(([kind,events])=>[kind,events.length])),cards:data.cards.length,families:data.familyArchetypes.length,secrets:data.familySecrets.length,endings:{profiles:data.endingProfiles.length,titles:data.endingTitles.length},codex:data.codex.length,tracks:Object.fromEntries(tracks.map(track=>[track,data.trackCoverage[track]])),failures};
console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
