// Compatibility entry point for existing local and CI commands.
import './v5-validate.mjs';
process.exit(0);

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const failures=[];const check=(value,message)=>{if(!value)failures.push(message)};
const kinds=Object.groupBy(data.events,event=>event.kind);const cards=Object.values(data.cards).flat();
const allowedRoots=['version','gameVersion','schemaVersion','contentRevision','stages','locations','familyArchetypes','familySecrets','attributes','desires','mainConflicts','cards','events','endingProfiles','endingTitles','endingFragments','codex'];
const checkKeys=(object,allowed,label)=>{for(const key of Object.keys(object||{}))check(allowed.includes(key),`${label}: unconsumed field ${key}`)};

check(data.version==='0.4.1','data version must be 0.4.1');check(data.gameVersion==='0.4.1','data gameVersion must be 0.4.1');
check(data.schemaVersion===6,'schemaVersion must be 6');check(data.contentRevision===5,'contentRevision must be 5');
check(JSON.stringify(Object.keys(data).sort())===JSON.stringify(allowedRoots.sort()),'unknown or dead root data field');
check((kinds.beat||[]).length===400,'annual beats must be 400');check((kinds.decision||[]).length===100,'decisions must be 100');
check((kinds.echo||[]).length===80,'echoes must be 80');check((kinds.blackSwan||[]).length===20,'black swans must be 20');check(data.events.length===600,'total events must be 600');
check(cards.length===72&&data.cards.innate.length===24&&data.cards.stage.length===36&&data.cards.adversity.length===12,'card counts changed');
check(data.familyArchetypes.length===30,'families must be 30');check(data.familySecrets.length===44,'family secrets must be 44');check(data.codex.length===30,'codex must be 30');

for(const item of data.locations)checkKeys(item,['id','name','weight','note','mods'],item.id);for(const item of data.familyArchetypes)checkKeys(item,['id','name','weight','note','familyClass','locationAffinity','advantages','hiddenRisks','lateEcho','dnaMods','advantageTags','riskTags','contentRevision'],item.id);
for(const item of data.familySecrets)checkKeys(item,['id','name','age','text','effects','icon','theme','familyClasses','contentRevision'],item.id);for(const item of Object.values(data.attributes))checkKeys(item,['name','icon','desc'],'attribute');for(const item of Object.values(data.desires))checkKeys(item,['name','min','max'],'desire');for(const item of data.mainConflicts)checkKeys(item,['id','name','desireKeys','themes'],item.id);
for(const item of cards)checkKeys(item,['id','displayName','effectHint','omenIcon','mechanic','effects','contentRevision'],item.id);for(const item of data.endingProfiles)checkKeys(item,['id','signals','minSignals'],item.id);for(const item of data.endingTitles)checkKeys(item,['id','title','profileId','contentRevision'],item.id);for(const item of Object.values(data.endingFragments).flat())checkKeys(item,['id','text','requirements','contentRevision'],item.id);for(const item of data.codex)checkKeys(item,['id','name','text','category','lockedHint','unlockRules','contentRevision'],item.id);

const eventKeys={beat:['id','kind','stage','ageMin','ageMax','icon','text','theme','tone','intensity','relevantAttrs','requirements','effects','weight','contentRevision','storyline'],decision:['id','kind','stage','ageMin','ageMax','icon','prompt','theme','intensity','relevantAttrs','requirements','weight','contentRevision','choices','storyline'],echo:['id','sourceDecisionId','kind','stage','ageMin','ageMax','icon','text','theme','intensity','requirements','choiceOutcomes','effects','contentRevision','storyline'],blackSwan:['id','kind','stage','ageMin','ageMax','icon','text','theme','swanBand','intensity','requirements','effects','weight','contentRevision']};
const requirementKeys=['facts','factsAny','memoriesAny','locationAny','familyAny','conflictAny','desireTopAny','outcomeTagsAny','outcomeTagsAll','resourceMin','resourceMax','storyline'],factKeys=['childrenMin','childrenMax','childAgeAny','relationshipAny','jobAny','jobNone','skillsMin','digitalExperienceMin','siblingMin','housingAny','arrangementAny','sectorAny','mobilityModeAny','businessModeAny','businessStatusAny','flagsAll','flagsNone'];
const effectKeys=['resources','employment','lifeFacts','pressures','relationships','desires','flagsAdd','outcomeTagsAdd','scheduleEcho','familyFinance','mobility','business','storylineAdvance'];
const inspectEffects=(effects,label)=>{checkKeys(effects,effectKeys,label);checkKeys(effects.resources,['cash','assets','debt','health','spirit','relation'],label);checkKeys(effects.employment,['status','career','sector','arrangement','schedule','scheduleDelta'],label);checkKeys(effects.employment?.schedule,['stability','splitGapHours','timezoneLoad'],label);checkKeys(effects.employment?.scheduleDelta,['stability','splitGapHours','timezoneLoad'],label);checkKeys(effects.pressures,['money','family','career','body','loneliness'],label);checkKeys(effects.relationships,['partnerStatus','partnerBond','parentsBond','network','addChild','childBond'],label);checkKeys(effects.familyFinance,['boundary','businessStress','transparency','reportingPressure'],label);checkKeys(effects.mobility,['mode','visaPressure','platformDependence','rootlessness'],label);checkKeys(effects.business,['mode','status','capitalInvested','brandLockin','operatingSkill','sunkCost'],label);checkKeys(effects.storylineAdvance,['id','nextStep','status','route','delayMin','delayMax'],label);checkKeys(effects.scheduleEcho,['eventId','delayMin','delayMax','chance'],label);for(const[key,value]of Object.entries(effects.resources||{})){if(['health','spirit','relation'].includes(key))check(Math.abs(value)<=15,`${label}: oversized ${key} effect`);if(key==='cash'&&value)check(Math.abs(value)>=800&&Math.abs(value)<=60000,`${label}: cash effect outside economic scale`);if(['assets','debt'].includes(key)&&Math.abs(value)>=50000)check(Math.abs(value)>=80000&&Math.abs(value)<=500000,`${label}: long-term finance outside economic scale`)}for(const value of Object.values(effects.pressures||{}))check(Math.abs(value)<=15,`${label}: oversized pressure effect`);for(const value of Object.values(effects.relationships||{}))if(typeof value==='number')check(Math.abs(value)<=15,`${label}: oversized relationship effect`)};

const eventIds=new Set(),choiceIds=new Set(),memoryKeys=new Set(),allOutcomeTags=new Set();
const stageOverlap=event=>(event.stage||[]).some(stage=>{const range=data.stages[stage];return range&&Math.max(range[0],event.ageMin)<=Math.min(range[1],event.ageMax)});
for(const event of data.events){
  checkKeys(event,eventKeys[event.kind]||[],event.id);checkKeys(event.requirements,requirementKeys,event.id);checkKeys(event.requirements?.facts,factKeys,event.id);for(const facts of event.requirements?.factsAny||[])checkKeys(facts,factKeys,`${event.id}:factsAny`);checkKeys(event.requirements?.storyline,['id','statusAny','stepMin','stepMax','routeAny'],event.id);checkKeys(event.storyline,['id','step','role','priority'],event.id);
  check(!eventIds.has(event.id),`${event.id}: duplicate event id`);eventIds.add(event.id);
  check(Number.isFinite(event.ageMin)&&Number.isFinite(event.ageMax)&&event.ageMin<=event.ageMax,`${event.id}: invalid age range`);
  check(stageOverlap(event),`${event.id}: stage and age never overlap`);check(event.contentRevision===5,`${event.id}: stale content revision`);
  const visibleText=event.text||event.prompt||'';for(const match of visibleText.matchAll(/(\d{1,3})岁/g)){const age=Number(match[1]);check(age>=event.ageMin&&age<=event.ageMax,`${event.id}: explicit age ${age} is outside ${event.ageMin}-${event.ageMax}`)}
  if(event.kind!=='decision'){check(Object.keys(event.effects||{}).length>0,`${event.id}: no effects`);inspectEffects(event.effects||{},event.id)}
  const facts=event.requirements?.facts||{};if(facts.childrenMin)check(event.ageMax>=26+(facts.childAgeAny?.[0]||0),`${event.id}: child gate is unreachable at this age`);
  const fullScene=[event.text,event.prompt,...(event.choices||[]).flatMap(choice=>[choice.text,choice.resultText])].filter(Boolean).join(' ');if(event.kind!=='echo'&&/弟妹/.test(fullScene))check(facts.siblingMin>=1,`${event.id}: sibling scene lacks sibling gate`);if(/孩子.*兼职.*旅行|兼职.*旅行.*孩子/.test(fullScene))check(facts.childrenMin>=1&&facts.childAgeAny?.[0]>=18,`${event.id}: intergenerational mirror lacks an adult-child gate`);
  for(const tag of event.effects?.outcomeTagsAdd||[])allOutcomeTags.add(tag);
}

const signatures=new Set();
for(const decision of kinds.decision||[]){
  check(decision.choices.length>=2&&decision.choices.length<=4,`${decision.id}: invalid choices`);const signature=decision.choices.map(x=>x.text).join('|');check(!signatures.has(signature),`${decision.id}: reused choice set`);signatures.add(signature);
  const facts=decision.requirements?.facts||{},prompt=decision.prompt,scene=[prompt,...decision.choices.flatMap(choice=>[choice.text,choice.resultText])].join(' ');
  if(/伴侣|婚姻纪念日|恋人|现任|婚房/.test(prompt)&&!/一位新朋友|朋友或伴侣|伴侣或朋友/.test(prompt))check(facts.relationshipAny?.length,`${decision.id}: partner scene lacks relationship gate`);
  if(/孩子|子女|带孙|孙辈/.test(scene)&&!/想要孩子|没有子女/.test(prompt))check(facts.childrenMin>=1,`${decision.id}: child scene lacks child gate`);
  if(/没有子女/.test(prompt))check(facts.childrenMax===0,`${decision.id}: childless scene lacks zero-child gate`);
  if(/^公司|^领导|^单位|裁员名单|外包合同|劝退自己带出的徒弟/.test(prompt))check(JSON.stringify(facts.jobAny)==='["employed"]',`${decision.id}: corporate scene is not employed-only`);
  if(/新工作涨薪/.test(prompt))check(JSON.stringify(facts.jobAny)==='["employed"]',`${decision.id}: job-change scene is not employed-only`);
  if(decision.storyline?.id==='splitShift'&&decision.storyline.step===1)check(JSON.stringify(facts.jobAny)==='["employed"]',`${decision.id}: split-shift start is not employed-only`);
  if(decision.storyline?.id==='remoteNomad'&&decision.storyline.step===1)check((decision.requirements.factsAny||[]).some(x=>x.skillsMin>=1)&&(decision.requirements.factsAny||[]).some(x=>x.digitalExperienceMin>=1),`${decision.id}: remote start lacks portable-skill gate`);
  if(decision.storyline?.id==='franchise'&&decision.storyline.step===1){check(facts.jobNone?.includes('student'),`${decision.id}: franchise start allows students`);check(Number(decision.requirements.resourceMin?.cash)>=5000,`${decision.id}: franchise start lacks a funding gate`)}
  const outcomeSignatures=new Set();for(const choice of decision.choices){checkKeys(choice,['id','text','resultText','consequenceHints','effects','memoryKey'],choice.id);check(!choiceIds.has(choice.id),`${choice.id}: duplicate choice`);choiceIds.add(choice.id);check(choice.memoryKey,`${choice.id}: missing memory key`);memoryKeys.add(choice.memoryKey);check(Object.keys(choice.effects||{}).length>0,`${choice.id}: no effects`);inspectEffects(choice.effects||{},choice.id);for(const tag of choice.effects?.outcomeTagsAdd||[])allOutcomeTags.add(tag);outcomeSignatures.add(JSON.stringify((choice.effects?.outcomeTagsAdd||[]).filter(tag=>tag!==decision.theme).sort()))}check(outcomeSignatures.size>=2,`${decision.id}: choices do not create distinct outcome paths`);
}

for(const beat of kinds.beat||[]){
  const facts=beat.requirements?.facts||{};
  if(beat.ageMax>=19&&/孩子|子女|带孙|孙辈/.test(beat.text)&&!/没有子女/.test(beat.text))check(facts.childrenMin>=1,`${beat.id}: child beat lacks child gate`);
  if(/没有子女/.test(beat.text))check(facts.childrenMax===0,`${beat.id}: childless beat lacks zero-child gate`);
  if(/换工作涨了薪/.test(beat.text))check(JSON.stringify(facts.jobAny)==='["employed"]',`${beat.id}: job-change beat is not employed-only`);
}

const decisionMap=new Map((kinds.decision||[]).map(event=>[event.id,event])),echoMap=new Map((kinds.echo||[]).map(event=>[event.id,event]));
const civilFollowup=decisionMap.get('decision_037');check(civilFollowup?.requirements?.memoriesAny?.includes('decision_036_c2')&&civilFollowup.requirements.memoriesAny.includes('decision_036_c3'),'civil-service follow-up is not linked to the opening choice');
check(Object.values(echoMap.get('echo_037')?.choiceOutcomes||{}).some(outcome=>outcome.effects?.outcomeTagsAdd?.includes('publicCareer')),'civil-service chain has no public-career result');
for(const [id,childRange] of [['decision_054',[6,12]],['decision_065',[12,18]],['decision_073',[18,30]],['decision_080',[25,45]],['decision_086',[25,55]]]){
  const decision=decisionMap.get(id),facts=decision?.requirements?.facts||{};check(JSON.stringify(facts.childAgeAny)===JSON.stringify(childRange),`${id}: child-chain age gate is wrong`);
  check(decision.storyline?.id==='childLife',`${id}: child chain is not using the generic storyline contract`);
  if(Number(id.slice(-3))<=80)for(const choice of decision.choices)check(choice.effects?.scheduleEcho?.chance===1,`${choice.id}: child-chain echo is not guaranteed`);
}

const featuredStorylines=['familyMoney','splitShift','remoteNomad','franchise'];
const storylineEvents=data.events.filter(event=>featuredStorylines.includes(event.storyline?.id));
check(storylineEvents.filter(event=>event.kind==='beat').length===48,'featured storylines must replace 48 annual beats');check(storylineEvents.filter(event=>event.kind==='decision').length===16,'featured storylines must replace 16 decisions');check(storylineEvents.filter(event=>event.kind==='echo').length===16,'featured storylines must replace 16 echoes');
for(const id of featuredStorylines){
  const beats=storylineEvents.filter(event=>event.kind==='beat'&&event.storyline.id===id),decisionsForLine=storylineEvents.filter(event=>event.kind==='decision'&&event.storyline.id===id).sort((a,b)=>a.storyline.step-b.storyline.step),echoesForLine=storylineEvents.filter(event=>event.kind==='echo'&&event.storyline.id===id);
  check(beats.length===12,`${id}: annual beats must be 12`);check(decisionsForLine.length===4,`${id}: decisions must be 4`);check(echoesForLine.length===4,`${id}: echoes must be 4`);check(JSON.stringify(decisionsForLine.map(x=>x.storyline.step))==='[1,2,3,4]',`${id}: decision steps skip or repeat`);check(decisionsForLine[0]?.storyline.role==='start'&&decisionsForLine.at(-1)?.storyline.role==='resolve',`${id}: storyline roles do not open and resolve`);
  const intensityForLine=Object.groupBy(beats,x=>x.intensity);check((intensityForLine.low||[]).length===4&&((intensityForLine.medium||[]).length===5)&&(intensityForLine.high||[]).length===3,`${id}: annual intensity must be 4 low / 5 medium / 3 high`);
  for(const beat of beats)check([...beat.text].length>=12&&[...beat.text].length<=32,`${beat.id}: storyline beat must be 12-32 Chinese characters`);
  for(const decision of decisionsForLine){const echo=echoMap.get(`echo_${decision.id.slice(-3)}`);check(echo?.sourceDecisionId===decision.id,`${decision.id}: missing paired echo`);check(Object.keys(echo?.choiceOutcomes||{}).length===decision.choices.length,`${decision.id}: echo does not cover every choice`);for(const choice of decision.choices){const advance=choice.effects?.storylineAdvance;check(advance?.id===id&&advance.route&&Number.isFinite(advance.nextStep),`${choice.id}: missing storyline advance`);check(choice.effects?.scheduleEcho?.chance===1,`${choice.id}: storyline echo is not guaranteed`);const outcome=echo?.choiceOutcomes?.[choice.memoryKey];check(outcome?.text&&outcome.text!==echo.text,`${choice.id}: echo is not choice-specific`);check(outcome?.effects?.storylineAdvance?.id===id,`${choice.id}: echo does not preserve storyline state`);check((outcome?.effects?.outcomeTagsAdd||[]).some(tag=>tag!==id&&tag!=='echo'),`${choice.id}: echo lacks a branch outcome tag`)}}
}
for(const event of data.events){const variants=[event.effects,...(event.choices||[]).map(choice=>choice.effects),...Object.values(event.choiceOutcomes||{}).map(outcome=>outcome.effects)].filter(Boolean);for(const effects of variants){if(effects.employment?.arrangement==='splitShift')check(!['student','retired','unemployed','careLeave'].includes(effects.employment.status),`${event.id}: split shift assigned to a non-employed state`);if(effects.mobility?.mode==='overseasNomad')check(event.storyline?.id==='remoteNomad',`${event.id}: overseas nomad state bypasses the remote storyline`);if(effects.business?.status==='operating')check(event.storyline?.id==='franchise',`${event.id}: operating business bypasses the franchise storyline`)}}

for(const echo of kinds.echo||[]){
  check(eventIds.has(echo.sourceDecisionId),`${echo.id}: unknown source decision`);check(Object.keys(echo.effects||{}).length>0,`${echo.id}: empty effect`);check(Object.keys(echo.choiceOutcomes||{}).length>=2,`${echo.id}: lacks choice-specific outcomes`);
  for(const key of echo.requirements?.memoriesAny||[])check(memoryKeys.has(key),`${echo.id}: unknown memory ${key}`);
  for(const [key,outcome]of Object.entries(echo.choiceOutcomes||{})){checkKeys(outcome,['text','effects'],`${echo.id}:${key}`);inspectEffects(outcome.effects||{},`${echo.id}:${key}`);for(const tag of outcome.effects?.outcomeTagsAdd||[])allOutcomeTags.add(tag)}
}
for(const decision of(kinds.decision||[]).slice(0,80))for(const choice of decision.choices)check(choice.effects?.scheduleEcho?.eventId,`${choice.id}: echo was not scheduled`);

const swanBands=Object.groupBy(kinds.blackSwan||[],x=>x.swanBand);check((swanBands.childhood||[]).length===2,'childhood swans must be 2');check((swanBands.youth||[]).length===5,'youth swans must be 5');check((swanBands.work||[]).length===8,'work swans must be 8');check((swanBands.elder||[]).length===5,'elder swans must be 5');
for(const swan of kinds.blackSwan||[]){check(Object.keys(swan.effects||{}).length>0,`${swan.id}: empty effect`);check(swan.intensity==='high',`${swan.id}: not high intensity`)}
const swanValence=Object.groupBy(kinds.blackSwan||[],x=>x.effects.outcomeTagsAdd?.find(tag=>/^swan/.test(tag)));check((swanValence.swanGain||[]).length===8,'positive swans must be 8');check((swanValence.swanLoss||[]).length===8,'negative swans must be 8');check((swanValence.swanMixed||[]).length===4,'mixed swans must be 4');

for(const secret of data.familySecrets){check(secret.age>=15&&secret.age<=65,`${secret.id}: reveal age outside 15-65`);check(secret.text&&Object.keys(secret.effects||{}).length>0,`${secret.id}: empty secret`);inspectEffects(secret.effects||{},secret.id);check(secret.familyClasses?.length,`${secret.id}: no family affinity`);check(secret.contentRevision===5,`${secret.id}: stale secret`)}
for(const family of data.familyArchetypes){check(!('chainAffinity'in family),`${family.id}: dead chainAffinity`);check(family.advantageTags?.length&&family.riskTags?.length,`${family.id}: family mechanics missing`)}
for(const card of cards)inspectEffects(card.effects||{},card.id);

check(data.endingProfiles.length===16,'ending profiles must be 16');for(const profile of data.endingProfiles){check(profile.signals.length>=2&&profile.minSignals===2,`${profile.id}: ending needs two signals`);check(data.endingTitles.filter(x=>x.profileId===profile.id).length===4,`${profile.id}: must own four titles`);for(const signal of profile.signals)check(allOutcomeTags.has(signal)||signal==='recovery',`${profile.id}: unreachable signal ${signal}`)}
for(const[group,fragments]of Object.entries(data.endingFragments)){check(fragments.length===16,`${group}: fragments must be 16`);for(const fragment of fragments){check(typeof fragment.text==='string'&&fragment.text.length>0&&!fragment.text.includes('[object Object]'),`${fragment.id}: fragment text must be a string`);checkKeys(fragment.requirements,['locationAny','conflictAny','outcomeTagsAny','outcomeTagsAll','endingProfileAny','storyline'],fragment.id);checkKeys(fragment.requirements?.storyline,['id','statusAny'],fragment.id);check(Object.keys(fragment.requirements||{}).length>0,`${fragment.id}: ungrounded fragment`)}}
const storylineFragments=Object.values(data.endingFragments).flat().filter(fragment=>fragment.requirements.storyline);check(storylineFragments.length===12,'storyline ending fragments must be 12');for(const id of featuredStorylines){const fragments=storylineFragments.filter(fragment=>fragment.requirements.storyline.id===id);check(fragments.length===3,`${id}: ending fragments must be 3`);for(const fragment of fragments)check((fragment.requirements.outcomeTagsAll||[]).length>=1,`${fragment.id}: storyline ending is not tied to a concrete outcome`)}
const rewrittenCodex=new Map(data.codex.map(entry=>[entry.name,entry]));for(const name of['家庭共同财务','碎片化工时','远程漂流','快招加盟'])check(rewrittenCodex.get(name)?.unlockRules?.outcomeTagsAny?.length,`${name}: rewritten codex entry missing`);
for(const entry of data.codex){const tags=entry.unlockRules?.outcomeTagsAny||[];check(tags.length>0,`${entry.id}: missing unlock rule`);check(tags.some(tag=>allOutcomeTags.has(tag)||['retired','familySecret'].includes(tag)),`${entry.id}: unlock rule has no playable source`)}

const beatJobPools=new Set((kinds.beat||[]).flatMap(event=>event.requirements?.facts?.jobAny||[]));for(const status of['student','employed','gig','selfEmployed','unemployed','retired','careLeave'])check(beatJobPools.has(status),`${status}: missing independent annual event pool`);
const employmentTransitions=new Set(data.events.flatMap(event=>[event.effects,...(event.choices||[]).map(choice=>choice.effects)].filter(Boolean).map(effects=>effects.employment?.status)).filter(Boolean));for(const status of['employed','gig','selfEmployed','unemployed','retired','careLeave'])check(employmentTransitions.has(status),`${status}: unreachable employment state`);
const partnerTransitions=new Set(data.events.flatMap(event=>[event.effects,...(event.choices||[]).map(choice=>choice.effects)].filter(Boolean).map(effects=>effects.relationships?.partnerStatus)).filter(Boolean));for(const status of['none','dating','partnered','married','separated','divorced','widowed'])check(partnerTransitions.has(status),`${status}: unreachable partner state`);

const intensity=Object.groupBy(kinds.beat||[],x=>x.intensity);check((intensity.low||[]).length===200,'low beats must be 200');check((intensity.medium||[]).length===144,'medium beats must be 144');check((intensity.high||[]).length===56,'high beats must be 56');
for(const beat of kinds.beat||[]){const cash=Math.abs(Number(beat.effects?.resources?.cash)||0);if(!cash)continue;const [min,max]=beat.intensity==='low'?[1000,3000]:beat.intensity==='medium'?[5000,15000]:[20000,60000];check(cash>=min&&cash<=max,`${beat.id}: ${beat.intensity} cash effect outside scale`)}
check(!JSON.stringify(data).includes('__fn__'),'data contains executable marker');
const report={version:data.version,schemaVersion:data.schemaVersion,contentRevision:data.contentRevision,events:Object.fromEntries(Object.entries(kinds).map(([key,value])=>[key,value.length])),cards:cards.length,families:data.familyArchetypes.length,secrets:data.familySecrets.length,endings:{profiles:data.endingProfiles.length,titles:data.endingTitles.length,fragments:Object.values(data.endingFragments).flat().length},codex:data.codex.length,intensity:{low:intensity.low.length,medium:intensity.medium.length,high:intensity.high.length},failures};
console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
