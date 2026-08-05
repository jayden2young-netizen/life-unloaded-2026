const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.FAMILY_EDUCATION_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-v0.6.6-family-education');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
const phase=(id,number)=>decisions.find(event=>event.episode?.id===id&&event.episode.phase===number);
fs.mkdirSync(OUT,{recursive:true});

async function snapshot(page){return page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())}
async function textState(page){return page.evaluate(()=>JSON.parse(window.render_game_to_text()))}
async function fit(page,label){
  const result=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth,sheets:[...document.querySelectorAll('.choice-sheet,.drawer')].map(node=>node.getBoundingClientRect()),buttons:[...document.querySelectorAll('.choice-sheet button')].map(node=>node.getBoundingClientRect())}));
  assert.ok(result.scrollWidth<=result.innerWidth+1,`${label}: horizontal overflow`);
  for(const box of[...result.sheets,...result.buttons])assert.ok(box.left>=-1&&box.right<=result.innerWidth+1,`${label}: element outside viewport`);
}
async function openPlayable(page){
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  await page.locator('[data-act="new"]').click();
  await page.locator('[data-act="birth-next"]').click();
  await page.locator('[data-act="random-attributes"]').click();
  await page.locator('[data-act="attributes-done"]').click();
  await page.locator('[data-card]').first().click();
  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({cardAges:[0,18,35,55]}));
}
async function enterPhase(page,event,patch={},options={}){
  await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,...value}),patch);
  assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),event.id),event.id);
  const before=await snapshot(page);
  assert.equal(before.sceneQueue[0].kind,'situation');
  if(options.situationMatch)assert.match(await page.locator('body').innerText(),options.situationMatch);
  if(options.situationScreenshot){
    await page.waitForTimeout(300);
    await page.screenshot({path:path.join(OUT,options.situationScreenshot),fullPage:true});
  }
  await page.locator('[data-act="episode-next"]').click();
  let choice=await snapshot(page);
  assert.equal(choice.age,before.age);
  assert.equal(choice.sceneQueue[0].kind,'choice');
  if(options.reloadChoice){
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    choice=await snapshot(page);
    assert.equal(choice.age,before.age);
    assert.equal(choice.sceneQueue[0].kind,'choice');
    assert.equal(choice.currentDecision.id,event.id);
  }
  return before.age;
}
async function chooseAndFinish(page,index,{reload=false}={}){
  const before=await snapshot(page);
  await page.locator(`[data-choice="${index}"]:not([disabled])`).click();
  let result=await snapshot(page);
  assert.equal(result.age,before.age);
  assert.equal(result.sceneQueue[0].kind,'result');
  assert.equal(result.timeline.length,before.timeline.length);
  if(reload){
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    result=await snapshot(page);
    assert.equal(result.age,before.age);
    assert.equal(result.sceneQueue[0].kind,'result');
    assert.equal(result.timeline.length,before.timeline.length);
  }
  await page.locator('[data-act="episode-next"]').click();
  const finished=await snapshot(page);
  if(before.currentDecision.episode.ageAdvanceYears===0)assert.ok([before.age,before.age+1].includes(finished.age));
  else assert.equal(finished.age,before.age+1);
  assert.equal(finished.timeline.length,before.timeline.length+1);
  return finished;
}
async function advanceToPhase(page,id,number){
  await page.waitForTimeout(220);
  for(let guard=0;guard<8;guard++){
    const run=await snapshot(page);
    if(run.phase==='episode'&&run.currentDecision?.episode?.id===id&&run.currentDecision.episode.phase===number){
      assert.equal(run.sceneQueue[0].kind,'situation');
      await page.locator('[data-act="episode-next"]').click();
      const choice=await snapshot(page);
      assert.equal(choice.age,run.age);
      assert.equal(choice.sceneQueue[0].kind,'choice');
      return run.age;
    }
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
  }
  assert.fail(`${id} phase ${number} did not advance naturally`);
}

(async()=>{
  assert.deepEqual([data.version,data.schemaVersion,data.contentRevision],['0.6.6',11,24]);
  assert.equal(data.events.filter(event=>event.id.startsWith('origin_context_')).length,24);
  assert.ok(data.familyArchetypes.find(family=>family.name==='医护家庭').parentJobs.every(job=>/护士|医生|医技|医院/.test(job)));
  assert.ok(data.familyArchetypes.find(family=>family.name==='平台劳动家庭').parentJobs.every(job=>/平台|骑手|网约车|电商|直播/.test(job)));
  assert.deepEqual(decisions.filter(event=>event.episode?.id==='undergraduate_application').map(event=>event.episode.role),['start','continue','continue','resolve']);
  assert.ok(decisions.filter(event=>event.episode?.id==='undergraduate_application').every(event=>event.episode.ageAdvanceYears===0));
  assert.ok(decisions.filter(event=>event.episode?.id==='undergraduate_application').every(event=>event.requirements.all.some(rule=>rule.path==='education.fullTimeUndergraduateClosed'&&rule.op==='eq'&&rule.value===false)));
  assert.ok(phase('undergraduate_application',1).requirements.all.some(rule=>rule.path==='education.fullTimeUndergraduateClosed'&&rule.op==='eq'&&rule.value===false));
  assert.ok(phase('undergraduate_application',1).requirements.all.some(rule=>rule.path==='age'&&rule.op==='lt'&&rule.value===30));
  assert.ok(phase('undergraduate_application',3).choices[3].requirements.all.some(rule=>rule.path==='education.extraApplicationYearUsed'&&rule.op==='eq'&&rule.value===false));
  assert.deepEqual(phase('undergraduate_application',4).choices.map(choice=>choice.route),['domestic_enrolled','overseas_enrolled','vocational_exit','work_exit']);
  assert.ok(phase('postgraduate_application',1).requirements.any.some(rule=>rule.path==='education.graduateApplicationIntent'&&rule.op==='in'));
assert.match(phase('postgraduate_application',1).situation,/本科走到最后两年/);
  assert.doesNotMatch(phase('postgraduate_application',1).situation,/本科这一段结束了/);
  assert.deepEqual(
    decisions.filter(event=>event.episode?.id==='undergraduate_application').map(event=>event.ageMin),
    [17,18,19,19]
  );
  assert.deepEqual(
    decisions.filter(event=>event.episode?.id==='undergraduate_domestic').map(event=>event.ageMin),
    [20,20,21,22]
  );
  assert.deepEqual(
    decisions.filter(event=>event.episode?.id==='postgraduate_application').map(event=>event.ageMin),
    [21,22,23,23]
  );
  assert.deepEqual(
    decisions.filter(event=>event.episode?.id==='postgraduate_domestic').map(event=>event.ageMin),
    [24,24,25]
  );
  const relationshipStart=phase('relationship_start',1),familyPlan=phase('becoming_parent',1),familyReview=phase('becoming_parent',2),pregnancyStart=phase('pregnancy_decision',1),pregnancyReview=phase('pregnancy_decision',2),adoptionStart=phase('adoption_process',1),adoptionResolve=phase('adoption_process',3);
  assert.deepEqual(familyPlan.choices.map(choice=>choice.route),['planned','deferred','childfree']);
  assert.ok(familyPlan.requirements.all.some(rule=>rule.path==='relationships.familyPlanningOffered'&&rule.value===true));
  assert.ok(!familyPlan.requirements.all.some(rule=>rule.path==='relationships.childCount'));
  assert.ok(familyReview.requirements.all.some(rule=>rule.path==='relationships.unplannedConceptionChecked'&&rule.value===true));
  assert.ok(!familyReview.choices[0].effects.some(command=>command.type==='resolveConception'));
  assert.deepEqual(pregnancyStart.choices.map(choice=>choice.route),['continued','terminated','deferred']);
  assert.equal(pregnancyStart.episode.ageAdvanceYears,0);
  assert.equal(pregnancyStart.choices[0].consequences[0].delayMin,1);
  assert.equal(pregnancyStart.choices[0].consequences[0].priority,100);
  assert.equal(pregnancyStart.choices[1].consequences.length,0);
  assert.equal(pregnancyStart.choices[2].consequences.length,0);
  assert.deepEqual(pregnancyReview.choices.map(choice=>choice.route),['continued','terminated']);
  assert.equal(adoptionStart.actors.length,0);
  assert.match(adoptionStart.situation,/单身收养申请/);
  assert.ok(adoptionStart.requirements.all.some(rule=>rule.path==='relationships.childCount'&&rule.op==='lte'&&rule.value===1));
  assert.ok(adoptionStart.requirements.all.some(rule=>rule.path==='relationships.activePartnerId'&&rule.op==='eq'&&rule.value===null));
  assert.ok(adoptionResolve.choices[0].effects.some(effect=>effect.type==='createPerson'&&effect.relation==='adoptedChild'));
  const prenatal=data.events.find(event=>event.kind==='beat'&&event.track==='children'&&event.text.includes('产检单'));
  assert.ok(prenatal.requirements.all.some(rule=>rule.path==='relationships.pregnancyStatus'&&rule.op==='in'));
  assert.ok(!prenatal.requirements.all.some(rule=>rule.path==='relationships.parenthoodIntent'));
  for(const event of data.events.filter(event=>event.kind==='beat'&&event.track==='children'&&event.id!==prenatal.id)){
    assert.ok(event.requirements.all.some(rule=>rule.path==='relationships.childCount'&&rule.op==='gte'&&rule.value===1));
    assert.ok(event.actors.some(actor=>actor.slot==='child'&&actor.mustExist!==false));
  }
  assert.equal(familyPlan.choices[0].cardInteraction.primaryMechanic,'cashBuffer');
  assert.equal(familyPlan.choices[2].cardInteraction.primaryMechanic,'boundary');
  assert.equal(adoptionStart.choices[0].cardInteraction.primaryMechanic,'evidence');
  for(const event of decisions.filter(event=>['becoming_parent','pregnancy_decision','adoption_process'].includes(event.episode?.id))){
    for(const choice of event.choices){
      const interaction=choice.cardInteraction;
      if(!interaction)continue;
      assert.ok(!(interaction.activeRequirements||interaction.activeShowWhen),'family cards must not change option eligibility');
      assert.ok(interaction.patch.every(command=>!['createPerson','resolveConception'].includes(command.type)),'family cards must not create children or resolve probability');
    }
  }
  const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(CHROME)?CHROME:undefined});
  const errors=[];
  try{
    let context=await browser.newContext({viewport:{width:360,height:773}});
    let page=await context.newPage();
    page.setDefaultTimeout(9000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    const oldSave={schemaVersion:8,gameVersion:'0.5.9',meta:{histories:[{title:'v0.5.9完整人生',age:82}],codex:['codex_01'],settings:{haptic:false},stats:{runs:9},seen:{events:{beat_001:2},cards:{},families:{},endings:{}},recentSeeds:['v059-finished']},run:{schemaVersion:8,gameVersion:'0.5.9',contentRevision:16,phase:'playing',age:17,education:{status:'completed',level:2}}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.deepEqual([migrated.schemaVersion,migrated.gameVersion,migrated.run],[11,'0.6.6',null]);
    assert.equal(migrated.meta.histories[0].title,'v0.5.9完整人生');
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,9);
    assert.deepEqual(migrated.meta.recentSeeds,['v059-finished']);
    assert.equal(migrated.meta.seen.events.beat_001,undefined);
    await context.close();

    context=await browser.newContext({viewport:{width:360,height:773}});
    page=await context.newPage();
    page.setDefaultTimeout(9000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);
    let run=await snapshot(page);
    assert.ok(run.originHousehold.context&&run.development&&Number.isFinite(run.education.readiness));
    assert.ok(run.originHousehold.people.filter(person=>['father','mother'].includes(person.relation)).every(parent=>parent.occupation&&parent.occupationImpact&&Number.isFinite(parent.educationExposure)));
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({relationships:{partnerStatus:'none',activePartnerId:null}}));
    const singleRelationshipWeight=await page.evaluate(id=>window.__LIFE_DEBUG__.eventWeight(id),relationshipStart.id);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({relationships:{partnerStatus:'dating'}}));
    const partneredRelationshipWeight=await page.evaluate(id=>window.__LIFE_DEBUG__.eventWeight(id),relationshipStart.id);
    assert.ok(singleRelationshipWeight>partneredRelationshipWeight*2,'single relationship start should receive a targeted weight boost');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({relationships:{partnerStatus:'none',activePartnerId:null}}));

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:14,education:{status:'enrolled',level:2,path:'middleSchool'},employment:{status:'none'},yearStarted:false,yearQueue:[],usedEvents:[],decisionHistory:[],timeline:[]}));
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.education.status,'completed');
    await enterPhase(page,phase('secondary_diversion',1),{age:14,education:{status:'completed',level:2,path:'middleSchool'},employment:{status:'none'},usedEvents:[],decisionHistory:[]});
    run=await chooseAndFinish(page,2);
    assert.notEqual(run.employment.status,'employed');
    assert.equal(run.activity.mode,'seeking');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:17,education:{status:'enrolled',level:3,path:'highSchool'},employment:{status:'none'},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,yearQueue:[],usedEvents:[],decisionHistory:[],timeline:[]}));
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.education.status,'completed');

    const unsafeContext={...run.originHousehold.context,resourceTier:'strained',resources:25,emotionalSafety:30,parentPresence:55};
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({age:2,originHousehold:{context:value},yearStarted:false,yearQueue:[],usedEvents:[],timeline:[]}),unsafeContext);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.timeline.at(-1).id,'origin_context_2_strained_unsafe');
    assert.ok(run.development.traumaLoad>0);

    const presentContext={...unsafeContext,resourceTier:'comfortable',resources:88,educationCapital:85,educationBudget:88,parentPresence:82,caregiverAvailability:80,emotionalSafety:78,housingStability:82};
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({age:7,originHousehold:{context:value},yearStarted:false,yearQueue:[],usedEvents:[],timeline:[]}),presentContext);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.timeline.at(-1).id,'origin_context_7_comfortable_present');

    const comfortableUnsafe={...presentContext,emotionalSafety:32};
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({age:7,originHousehold:{context:value},yearStarted:false,yearQueue:[],usedEvents:[],timeline:[]}),comfortableUnsafe);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.timeline.at(-1).id,'origin_context_7_comfortable_unsafe');

    await enterPhase(page,phase('secondary_diversion',1),{age:15,attrs:{intellect:1},education:{status:'completed',level:2,path:'middleSchool'},development:{learningHabit:15,attendance:55,teacherSupport:25,peerSupport:30,selfAdvocacy:20,careLoad:65,traumaLoad:55,routeKnowledge:10,languagePreparation:0,routeExposure:[]}});
    let rendered=await textState(page);
    const academic=rendered.run.decision.choices.find(choice=>choice.index===0);
    assert.equal(academic.visible,true);
    assert.equal(academic.enabled,false);
    assert.match(academic.reason,/成绩|出勤|准备/);
    assert.equal(rendered.run.decision.choices.some(choice=>choice.index===3),false);
    const beforeLocked=await snapshot(page);
    await page.evaluate(()=>document.querySelector('[data-choice="0"]').click());
    assert.equal((await snapshot(page)).sceneQueue[0].kind,beforeLocked.sceneQueue[0].kind);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({development:{routeExposure:['alternativeSchool']}}));
    rendered=await textState(page);
    assert.equal(rendered.run.decision.choices.some(choice=>choice.index===3),true);
    await page.setViewportSize({width:360,height:640});
    await fit(page,'secondary-locked-360x640');
    await page.waitForTimeout(900);
    await page.screenshot({path:path.join(OUT,'01-secondary-locked-360x640.png'),fullPage:true});

    const strongEducation={status:'completed',level:3,path:'highSchool',applicationIntent:'none',applicationRoute:'none',applicationAttemptCount:0,extraApplicationYearUsed:false,gaokaoAttemptCount:0,overseasUndergradAttemptCount:0,lastApplicationOutcome:'none',gapYears:0,fullTimeUndergraduateClosed:false,timelineOffsetYears:0,applicationStatus:'none',domesticOffer:false,overseasOffer:false,fundingStatus:'none',entryPermitReady:false,enrollmentRegion:'none'};
    const strongDevelopment={learningHabit:90,attendance:96,teacherSupport:85,peerSupport:75,selfAdvocacy:80,careLoad:5,traumaLoad:4,routeKnowledge:88,languagePreparation:82,routeExposure:['overseas','scholarship']};
    await page.setViewportSize({width:360,height:773});
    await enterPhase(page,phase('undergraduate_application',1),{age:18,attrs:{intellect:10},originHousehold:{context:presentContext},education:strongEducation,development:strongDevelopment,episodes:{undergraduate_application:{status:'inactive'}},usedEvents:[]},{reloadChoice:true});
    run=await chooseAndFinish(page,0);
    assert.equal(run.education.applicationIntent,'domestic');
    await advanceToPhase(page,'undergraduate_application',2);
    assert.equal((await textState(page)).run.decision.choices.find(choice=>choice.index===0).enabled,true);
    run=await chooseAndFinish(page,0);
    assert.equal(run.education.domesticOffer,true);
    assert.equal(run.education.applicationStatus,'offered');
    assert.equal(run.episodes.undergraduate_application.phase,3);
    await advanceToPhase(page,'undergraduate_application',3);
    await page.setViewportSize({width:320,height:568});
    await fit(page,'domestic-funding-320x568');
    run=await chooseAndFinish(page,0,{reload:true});
    assert.equal(run.education.domesticEntryReady,true);
    await page.setViewportSize({width:360,height:773});
    await advanceToPhase(page,'undergraduate_application',4);
    run=await chooseAndFinish(page,0);
    assert.equal(run.education.status,'enrolled');
    assert.equal(run.education.enrollmentRegion,'domestic');
    assert.equal(run.education.nextStage,'undergraduate');
    assert.equal(run.episodes.undergraduate_application.status,'resolved');

    const usedWithoutUndergrad=run.usedEvents.filter(id=>!decisions.some(event=>event.id===id&&event.episode?.id==='undergraduate_application'));
    const overseasDevelopment={...strongDevelopment,routeExposure:['overseas']};
    await enterPhase(page,phase('undergraduate_application',1),{age:18,attrs:{intellect:10},originHousehold:{context:presentContext},education:{...strongEducation},development:overseasDevelopment,episodes:{undergraduate_application:{status:'inactive'}},usedEvents:usedWithoutUndergrad});
    rendered=await textState(page);
    assert.equal(rendered.run.decision.choices.find(choice=>choice.index===2).enabled,true);
    run=await chooseAndFinish(page,2);
    assert.equal(run.education.applicationIntent,'overseas');
    await advanceToPhase(page,'undergraduate_application',2);
    run=await chooseAndFinish(page,1);
    assert.equal(run.education.overseasOffer,true,JSON.stringify({
      readiness:run.education.readiness,
      achievement:run.education.achievement,
      overseasPrepared:run.education.overseasPrepared,
      overseasOfferReady:run.education.overseasOfferReady,
      route:run.education.applicationRoute,
      attempts:run.education.applicationAttemptCount,
      outcome:run.education.lastApplicationOutcome
    }));
    assert.ok(['direct','conditional'].includes(run.education.overseasOfferType));
    await advanceToPhase(page,'undergraduate_application',3);
    rendered=await textState(page);
    assert.equal(rendered.run.decision.choices.find(choice=>choice.index===1).enabled,true);
    assert.equal(rendered.run.decision.choices.some(choice=>choice.index===2),false);
    run=await chooseAndFinish(page,1);
    assert.equal(run.education.entryPermitReady,false);
    assert.equal(run.education.overseasDepartureReady,true);
    assert.equal(run.education.overseasEntryReady,false);
    await advanceToPhase(page,'undergraduate_application',4);
    run=await chooseAndFinish(page,1);
    assert.equal(run.education.entryPermitReady,true);
    assert.equal(run.education.overseasEntryReady,true);
    assert.equal(run.education.status,'enrolled');
    assert.equal(run.education.enrollmentRegion,'overseas');
    assert.equal(run.education.applicationStatus,'enrolled');
    assert.equal(run.education.nextStage,'undergraduate');

    await page.locator('[data-act="open-drawer"]').click();
    await fit(page,'overseas-drawer-360x773');
    const drawer=await page.locator('.drawer').innerText();
    assert.match(drawer,/成长与教育/);
    assert.match(drawer,/海外本科在读/);
    await page.waitForTimeout(900);
    await page.screenshot({path:path.join(OUT,'02-overseas-enrolled-drawer-360x773.png'),fullPage:true});
    await page.locator('.drawer [data-act="close-drawer"]').click();

    const poorContext={...presentContext,resources:20,educationBudget:10};
    await enterPhase(page,phase('undergraduate_application',3),{age:19,cards:[],originHousehold:{context:poorContext,assets:0,debt:50000},finance:{cash:0},education:{...strongEducation,domesticOffer:true,domesticOfferType:'admitted',applicationStatus:'offered'},development:{...strongDevelopment,routeExposure:[]},episodes:{undergraduate_application:{status:'active',phase:3,startedAt:18,nextPhaseAge:19,deadlineAge:22,route:'domestic_submitted',boundActors:{},commitments:[],closureReason:null}}});
    rendered=await textState(page);
    const domesticFunding=rendered.run.decision.choices.find(choice=>choice.index===0);
    assert.equal(domesticFunding.visible,true);
    assert.equal(domesticFunding.enabled,false);
    assert.match(domesticFunding.reason,/费用|资助/);
    run=await chooseAndFinish(page,3);
    assert.equal(run.education.nextStage,'reapply');
    assert.equal(run.education.extraApplicationYearUsed,true);
    assert.equal(run.education.gapYears,1);
    assert.equal(run.education.timelineOffsetYears,1);
    assert.equal(run.education.entryPermitReady,false);

    const lowLocation={...run.location,mods:{...run.location.mods,education:0}};
    const marginalDevelopment={learningHabit:55,attendance:86,teacherSupport:48,peerSupport:50,selfAdvocacy:52,careLoad:2,traumaLoad:2,routeKnowledge:55,languagePreparation:0,routeExposure:[]};
    await enterPhase(page,phase('undergraduate_application',2),{seed:'retry-seed-2',age:18,location:lowLocation,attrs:{intellect:2},originHousehold:{context:{...presentContext,educationBudget:45}},education:{...strongEducation,applicationIntent:'domestic'},development:marginalDevelopment,episodes:{undergraduate_application:{status:'active',phase:2,startedAt:17,nextPhaseAge:18,deadlineAge:22,route:'domestic_plan',boundActors:{},commitments:[],closureReason:null}},usedEvents:usedWithoutUndergrad,decisionHistory:[]});
    run=await snapshot(page);
    assert.equal(run.education.domesticEligible,true);
    assert.equal(run.education.domesticOfferReady,false);
    run=await chooseAndFinish(page,0,{reload:true});
    assert.equal(run.education.applicationStatus,'notAdmitted');
    assert.equal(run.education.nextStage,'reapply');
    assert.equal(run.education.applicationAttemptCount,1);
    assert.equal(run.education.gaokaoAttemptCount,1);
    assert.equal(run.education.lastApplicationOutcome,'notAdmitted');
    assert.equal(run.episodes.undergraduate_application.status,'active');
    await advanceToPhase(page,'undergraduate_application',3);
    run=await chooseAndFinish(page,3);
    assert.equal(run.education.extraApplicationYearUsed,true);
    assert.equal(run.age,20);
    await advanceToPhase(page,'undergraduate_application',4);
    run=await snapshot(page);
    assert.equal(run.education.applicationAttemptCount,2);
    assert.equal(run.education.gaokaoAttemptCount,2);
    assert.equal(run.education.extraApplicationYearUsed,true);
    assert.equal(run.education.applicationRoute,'domestic');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const restoredRetry=await snapshot(page);
    assert.equal(restoredRetry.education.applicationAttemptCount,2);
    assert.equal(restoredRetry.education.lastApplicationOutcome,run.education.lastApplicationOutcome);

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:30,education:{status:'completed',level:3,fullTimeUndergraduateClosed:false}}));
    assert.equal((await snapshot(page)).education.fullTimeUndergraduateClosed,true);

    const partner={id:'family_partner',relation:'partner',bornAt:2,alive:true,status:'living',bond:62,legalStatus:'none'};
    const child={id:'existing_child',relation:'child',bornAt:26,alive:true,status:'living',bond:60,legalStatus:'biological'};
    await page.evaluate(({partner,child})=>window.__LIFE_DEBUG__.patchRun({seed:'seed-0',age:30,people:[partner,child],relationships:{partnerStatus:'partnered',activePartnerId:partner.id,familyPlanningOffered:false,familyPlanningClosed:false,childCount:1},cardAges:[0,18,35,55],yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,episodes:{},usedEvents:[],decisionHistory:[],timeline:[]}),{partner,child});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.familyPlanningOffered,true);
    assert.equal(run.relationships.familyPlanningClosed,true);
    assert.equal(run.relationships.childCount,1);

    await page.evaluate(({partner,child})=>window.__LIFE_DEBUG__.patchRun({seed:'seed-1',age:30,people:[partner,child],relationships:{partnerStatus:'partnered',activePartnerId:partner.id,familyPlanningOffered:false,familyPlanningClosed:false,familyPlanningDeferred:false,plannedConceptionResolved:false,unplannedConceptionChecked:false,pregnancyStatus:'none',pregnancyDecision:'none',pregnancyDecisionDeferred:false},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,episodes:{},usedEvents:[],decisionHistory:[],timeline:[]}),{partner,child});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.familyPlanningOffered,true);
    assert.equal(run.relationships.familyPlanningClosed,false);
    assert.equal(run.relationships.childCount,1,'existing child must not block family planning');

    const deferredEpisode={status:'active',phase:2,startedAt:30,nextPhaseAge:31,deadlineAge:33,route:'deferred',boundActors:{partner:{kind:'person',id:partner.id,alive:true}},commitments:[],closureReason:null};
    await page.evaluate(({partner,deferredEpisode})=>window.__LIFE_DEBUG__.patchRun({seed:'seed-8',age:31,people:[partner],relationships:{partnerStatus:'partnered',activePartnerId:partner.id,familyPlanningOffered:true,familyPlanningClosed:false,familyPlanningDeferred:true,plannedConceptionResolved:false,unplannedConceptionChecked:false,pregnancyStatus:'none'},episodes:{becoming_parent:deferredEpisode},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}),{partner,deferredEpisode});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.unplannedConceptionChecked,true);
    assert.equal(run.relationships.pregnancyStatus,'confirmed');
    assert.equal(run.episodes.becoming_parent.status,'resolved');

    await page.evaluate(({partner,deferredEpisode})=>window.__LIFE_DEBUG__.patchRun({seed:'seed-0',age:31,people:[partner],relationships:{partnerStatus:'partnered',activePartnerId:partner.id,familyPlanningOffered:true,familyPlanningClosed:false,familyPlanningDeferred:true,plannedConceptionResolved:false,unplannedConceptionChecked:false,pregnancyStatus:'none'},episodes:{becoming_parent:deferredEpisode},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}),{partner,deferredEpisode});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.unplannedConceptionChecked,true);
    assert.equal(run.relationships.pregnancyStatus,'none');
    assert.equal(run.episodes.becoming_parent.status,'active');
    await enterPhase(page,familyReview,{}, {reloadChoice:true});
    run=await chooseAndFinish(page,0,{reload:true});
    assert.equal(run.relationships.parenthoodIntent,'planned');
    assert.equal(run.relationships.plannedConceptionResolved,false);
    assert.equal(run.relationships.pregnancyStatus,'none');
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.plannedConceptionResolved,true);
    assert.notEqual(run.relationships.pregnancyStatus,'none');

    const highBoundEpisode={status:'active',phase:2,startedAt:23,nextPhaseAge:24,deadlineAge:26,route:'planned',boundActors:{partner:{kind:'person',id:partner.id,alive:true}},commitments:[],closureReason:null};
    await page.evaluate(({partner,highBoundEpisode})=>window.__LIFE_DEBUG__.patchRun({seed:'bound-107',age:24,people:[partner],health:{physical:75},relationships:{partnerStatus:'partnered',activePartnerId:partner.id,familyPlanningOffered:true,familyPlanningClosed:false,familyPlanningDeferred:false,plannedConceptionResolved:false,pregnancyStatus:'none'},episodes:{becoming_parent:highBoundEpisode},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}),{partner,highBoundEpisode});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.pregnancyStatus,'confirmed','90% upper boundary must accept roll 89');

    const lowBoundEpisode={status:'active',phase:2,startedAt:38,nextPhaseAge:39,deadlineAge:41,route:'planned',boundActors:{partner:{kind:'person',id:partner.id,alive:true}},commitments:[],closureReason:null};
    await page.evaluate(({partner,lowBoundEpisode})=>window.__LIFE_DEBUG__.patchRun({seed:'bound-30',age:39,people:[partner],health:{physical:49},relationships:{partnerStatus:'partnered',activePartnerId:partner.id,familyPlanningOffered:true,familyPlanningClosed:false,familyPlanningDeferred:false,plannedConceptionResolved:false,pregnancyStatus:'none'},episodes:{becoming_parent:lowBoundEpisode},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}),{partner,lowBoundEpisode});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.pregnancyStatus,'notPregnant','50% lower boundary must reject roll 52');

    await page.evaluate(partner=>window.__LIFE_DEBUG__.patchRun({seed:'seed-6',age:31,people:[],relationships:{partnerStatus:'none',activePartnerId:null,familyPlanningOffered:true,familyPlanningClosed:false,familyPlanningDeferred:false,plannedConceptionResolved:false,pregnancyStatus:'none'},episodes:{becoming_parent:{status:'active',phase:2,startedAt:30,nextPhaseAge:31,deadlineAge:33,route:'planned',boundActors:{partner:{kind:'person',id:partner.id,alive:true}},commitments:[],closureReason:null}},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}),partner);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.pregnancyStatus,'none','a former partner cannot trigger a new conception');
    assert.equal(run.relationships.plannedConceptionResolved,false);
    assert.equal(run.episodes.becoming_parent.closureReason,'invalidated');

    await page.evaluate(({partner,child})=>window.__LIFE_DEBUG__.patchRun({seed:'seed-6',age:30,people:[partner,child],relationships:{partnerStatus:'partnered',activePartnerId:partner.id,familyPlanningOffered:true,familyPlanningClosed:false,familyPlanningDeferred:false,plannedConceptionResolved:false,unplannedConceptionChecked:false,pregnancyStatus:'none',pregnancyDecision:'none',pregnancyDecisionDeferred:false,parenthoodIntent:'undecided'},yearStarted:true,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,episodes:{},usedEvents:[],decisionHistory:[],timeline:[],scheduledConsequences:[],usedConsequences:[]}),{partner,child});
    await enterPhase(page,familyPlan,{}, {reloadChoice:true});
    run=await chooseAndFinish(page,0,{reload:true});
    assert.equal(run.relationships.parenthoodIntent,'planned');
    assert.equal(run.relationships.pregnancyStatus,'none');
    assert.equal(run.relationships.childCount,1);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.plannedConceptionResolved,true);
    assert.equal(run.relationships.pregnancyStatus,'confirmed');
    assert.equal(run.episodes.becoming_parent.status,'resolved');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({scheduledConsequences:[],usedConsequences:[]}));

    await enterPhase(page,pregnancyStart,{}, {reloadChoice:true});
    await fit(page,'pregnancy-choice-360x773');
    await page.waitForTimeout(300);
    await page.screenshot({path:path.join(OUT,'03-pregnancy-choice-360x773.png'),fullPage:true});
    const pregnancyAge=(await snapshot(page)).age;
    run=await chooseAndFinish(page,2,{reload:true});
    assert.equal(run.age,pregnancyAge);
    assert.equal(run.relationships.pregnancyDecisionDeferred,true);
    assert.equal(run.scheduledConsequences.length,0);
    await enterPhase(page,pregnancyReview,{}, {reloadChoice:true});
    run=await chooseAndFinish(page,0,{reload:true});
    assert.equal(run.relationships.pregnancyStatus,'continued');
    assert.equal(run.scheduledConsequences.length,1);
    assert.equal(run.scheduledConsequences[0].dueAge,pregnancyAge+1);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.pregnancyStatus,'completed');
    assert.equal(run.relationships.childCount,2);
    const childCountAfterBirth=run.relationships.childCount;
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    assert.equal((await snapshot(page)).relationships.childCount,childCountAfterBirth,'birth consequence repeated after reload');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:31,people:[],relationships:{activePartnerId:null,partnerStatus:'none',pregnancyStatus:'confirmed',pregnancyDecision:'none',pregnancyDecisionDeferred:false},episodes:{},yearStarted:true,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[],scheduledConsequences:[],usedConsequences:[]}));
    await enterPhase(page,pregnancyStart,{}, {reloadChoice:true});
    run=await chooseAndFinish(page,1,{reload:true});
    assert.equal(run.relationships.pregnancyStatus,'terminated');
    assert.equal(run.relationships.childCount,0);
    assert.equal(run.scheduledConsequences.length,0);
    assert.ok(!(await page.evaluate(id=>window.__LIFE_DEBUG__.eligibleIds('beat').includes(id),prenatal.id)),'terminated pregnancy must not expose prenatal beat');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({seed:'adopt-0',age:30,people:[],relationships:{partnerStatus:'none',activePartnerId:null,adoptionOffered:false,adoptionStatus:'none'},episodes:{},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}));
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.adoptionOffered,true);
    assert.equal(run.relationships.adoptionStatus,'notOffered');

    await page.evaluate(child=>window.__LIFE_DEBUG__.patchRun({seed:'adopt-2',age:30,people:[child],relationships:{partnerStatus:'none',activePartnerId:null,adoptionOffered:false,adoptionStatus:'none'},episodes:{},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}),child);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.adoptionStatus,'offered','one existing child remains eligible for single adoption');

    const secondChild={...child,id:'existing_child_2'};
    await page.evaluate(({child,secondChild})=>window.__LIFE_DEBUG__.patchRun({seed:'adopt-2',age:30,people:[child,secondChild],relationships:{partnerStatus:'none',activePartnerId:null,adoptionOffered:false,adoptionStatus:'none'},episodes:{},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}),{child,secondChild});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.adoptionOffered,false,'two existing children block the single-adoption entry');

    await page.evaluate(partner=>window.__LIFE_DEBUG__.patchRun({seed:'adopt-2',age:30,people:[partner],relationships:{partnerStatus:'partnered',activePartnerId:partner.id,familyPlanningOffered:true,familyPlanningClosed:true,adoptionOffered:false,adoptionStatus:'none'},episodes:{},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}),partner);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    assert.equal((await snapshot(page)).relationships.adoptionOffered,false,'valid partner blocks the single-adoption entry');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({seed:'seed-0',age:30,people:[],relationships:{partnerStatus:'none',activePartnerId:null,adoptionOffered:false,adoptionStatus:'none',pregnancyStatus:'terminated'},episodes:{},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[],scheduledConsequences:[],usedConsequences:[]}));
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.adoptionOffered,true);
    assert.equal(run.relationships.adoptionStatus,'offered');
    await enterPhase(page,adoptionStart,{}, {reloadChoice:true,situationMatch:/单身收养申请/,situationScreenshot:'04-adoption-entry-360x773.png'});
    run=await chooseAndFinish(page,0,{reload:true});
    assert.equal(run.relationships.adoptionStatus,'assessing');
    const newPartner={...partner,id:'new_partner'};
    await page.evaluate(newPartner=>window.__LIFE_DEBUG__.patchRun({people:[newPartner],relationships:{activePartnerId:newPartner.id,partnerStatus:'dating'},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null}),newPartner);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.relationships.adoptionStatus,'invalidated');
    assert.equal(run.sceneQueue[0].forced,true);
    assert.match(run.sceneQueue[0].text,/单身收养/);

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:32,people:[],relationships:{activePartnerId:null,partnerStatus:'none',adoptionOffered:true,adoptionStatus:'matching',childCount:0},episodes:{},yearStarted:true,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[]}));
    await enterPhase(page,adoptionResolve,{}, {reloadChoice:true});
    await page.setViewportSize({width:320,height:568});
    await fit(page,'adoption-four-choices-320x568');
    await page.waitForTimeout(300);
    await page.screenshot({path:path.join(OUT,'05-adoption-four-choices-320x568.png'),fullPage:true});
    run=await chooseAndFinish(page,0,{reload:true});
    assert.equal(run.relationships.adoptionStatus,'completed');
    assert.equal(run.relationships.childCount,1);
    assert.ok(run.people.some(person=>person.relation==='adoptedChild'));
    await page.setViewportSize({width:360,height:773});

    for(const [choice,status] of [[1,'waiting'],[2,'withdrawn']]){
      await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:32,people:[],relationships:{activePartnerId:null,partnerStatus:'none',adoptionOffered:true,adoptionStatus:'matching'},episodes:{},yearStarted:true,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],decisionHistory:[],timeline:[],scheduledConsequences:[],usedConsequences:[]}));
      await enterPhase(page,adoptionResolve,{}, {reloadChoice:true});
      run=await chooseAndFinish(page,choice,{reload:true});
      assert.equal(run.relationships.adoptionStatus,status);
      assert.equal(run.relationships.childCount,0);
      if(status==='waiting'){
        const waitingPartner={...partner,id:'waiting_partner'};
        await page.evaluate(waitingPartner=>window.__LIFE_DEBUG__.patchRun({people:[waitingPartner],relationships:{activePartnerId:waitingPartner.id,partnerStatus:'dating'},yearStarted:false,yearQueue:[],phase:'playing',sceneQueue:[],currentDecision:null}),waitingPartner);
        await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
        run=await snapshot(page);
        assert.equal(run.relationships.adoptionStatus,'invalidated');
        assert.match(run.sceneQueue[0].text,/单身收养/);
      }
    }

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,migration:'schema-8-run-cleared-meta-preserved-indexed-seen-reset',familyMilestones:['strained-unsafe','comfortable-present','comfortable-unsafe'],familyPlanning:['opportunity-hit','opportunity-miss','existing-child-eligible','planned-conception','deferred-unplanned-hit','deferred-review','50-90-bounds'],pregnancy:['same-age-review','continued-birth-once','terminated-no-child','reload-safe'],adoption:['offer-hit','offer-miss','zero-or-one-child','two-child-blocked','partner-blocked','partner-invalidation','registered-completion','waiting','withdrawn'],gating:['core-visible-locked','special-hidden-until-exposed','domestic-funding-locked','scholarship-hidden'],routes:['domestic-enrolled','overseas-enrolled','not-admitted','deferred'],phaseScheduling:'natural-after-start',sameAgeCards:true,refreshRestored:['choice','result'],timelinePerPhase:1,viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
